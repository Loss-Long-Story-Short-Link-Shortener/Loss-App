import { FieldValue } from "firebase-admin/firestore";
import {
  allowCors,
  getFirebaseAdmin,
  handleApiError,
  httpError,
  requireUser,
  sendJson,
} from "./_firebase.js";
import { invalidateLinkCache } from "./_lib/linkCache.js";
import {
  LINK_ID_PATTERN,
  canonicalHost,
  cleanText,
  generateSlug,
  linkDocId,
  serializeLink,
  validateExpiry,
  validateSlug,
} from "./_lib/links.js";
import { hashPassword, validatePasswordInput } from "./_lib/password.js";
import { getUserPlan } from "./_lib/plans.js";
import { consume } from "./_lib/rateLimit.js";
import { isReservedSlug } from "./_lib/reserved.js";
import { validateDestination } from "./_lib/urlSafety.js";

const PAGE_DEFAULT = 200;
const PAGE_MAX = 500;
const ALLOWED_STATUS = new Set(["active", "paused"]);
const CREATE_PER_MINUTE = 30;

function parseBody(request) {
  const body = request.body;
  if (body && typeof body === "object") return body;
  if (typeof body === "string" && body) {
    try {
      return JSON.parse(body);
    } catch {
      throw httpError(400, "İstek gövdesi geçerli JSON olmalıdır.");
    }
  }
  return {};
}

function resolveTargetId(input) {
  const { id, slug } = input;
  const target = id || (slug ? linkDocId(String(slug).toLowerCase()) : null);
  if (!target || typeof target !== "string" || !LINK_ID_PATTERN.test(target)) {
    throw httpError(400, "Geçerli bir bağlantı kimliği gerekli.");
  }
  return target;
}

/** Load a link and make sure the caller owns it. 404 for both missing and foreign links (no enumeration). */
async function loadOwnedLink(db, id, uid) {
  const ref = db.collection("links").doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data().ownerId !== uid) throw httpError(404, "Bağlantı bulunamadı.");
  return { ref, data: snap.data() };
}

async function listLinks(db, uid, query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || PAGE_DEFAULT, 1), PAGE_MAX);
  let q = db
    .collection("links")
    .where("ownerId", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(limit + 1);

  if (query.cursor) {
    if (!LINK_ID_PATTERN.test(String(query.cursor))) throw httpError(400, "Geçersiz sayfa imleci.");
    const cursorSnap = await db.collection("links").doc(String(query.cursor)).get();
    if (cursorSnap.exists && cursorSnap.data().ownerId === uid) q = q.startAfter(cursorSnap);
  }

  const snapshot = await q.get();
  const docs = snapshot.docs.slice(0, limit);
  return {
    links: docs.map((d) => serializeLink(d.id, d.data())),
    nextCursor: snapshot.docs.length > limit ? docs[docs.length - 1].id : null,
  };
}

async function createLink(db, user, body) {
  const destination = validateDestination(body.destination);
  if (!destination.ok) throw httpError(400, destination.error);

  const password = validatePasswordInput(body.password);
  if (!password.ok) throw httpError(400, password.error);
  const expiry = validateExpiry(body.expiresAt);
  if (!expiry.ok) throw httpError(400, expiry.error);

  const requestedSlug = typeof body.slug === "string" ? body.slug.trim() : "";
  let customSlug = null;
  if (requestedSlug) {
    const checked = validateSlug(requestedSlug);
    if (!checked.ok) throw httpError(400, checked.error);
    customSlug = checked.slug;
  }

  const limiter = await consume(db, "create", user.uid, CREATE_PER_MINUTE, 60);
  if (!limiter.ok) {
    throw Object.assign(httpError(429, "Çok hızlı link oluşturuyorsunuz. Lütfen biraz bekleyin."), {
      retryAfter: limiter.retryAfter,
    });
  }

  const { tier, plan } = await getUserPlan(db, user.uid);
  const countSnap = await db.collection("links").where("ownerId", "==", user.uid).count().get();
  if (countSnap.data().count >= plan.maxLinks) {
    throw httpError(402, `Plan kotanıza (${plan.maxLinks} link) ulaştınız. Lütfen paketinizi yükseltin.`);
  }

  const host = canonicalHost();
  const baseDoc = {
    ownerId: user.uid,
    domain: host,
    title: cleanText(body.title, 120) || destination.hostname,
    tag: cleanText(body.tag, 40),
    password: password.value ? hashPassword(password.value) : "",
    expiresAt: expiry.value,
    destination: destination.url,
    status: "active",
    clickCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  // create() fails atomically if the document exists, so concurrent requests
  // for the same slug cannot both succeed.
  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = customSlug || generateSlug(attempt < 5 ? 8 : 10);
    if (!customSlug && isReservedSlug(slug)) continue;
    const id = linkDocId(slug, host);
    try {
      await db.collection("links").doc(id).create({ ...baseDoc, slug });
      const saved = await db.collection("links").doc(id).get();
      return { link: serializeLink(id, saved.data()), tier };
    } catch (error) {
      if (error.code === 6 || /ALREADY_EXISTS/.test(String(error.message))) {
        if (customSlug) throw httpError(409, `"${slug}" bağlantı adı zaten kullanımda. Lütfen farklı bir ad seçin.`);
        continue;
      }
      throw error;
    }
  }
  throw httpError(503, "Benzersiz bir bağlantı adı üretilemedi. Lütfen tekrar deneyin.");
}

async function updateLink(db, user, body) {
  const id = resolveTargetId(body);
  const { ref } = await loadOwnedLink(db, id, user.uid);
  const updates = { updatedAt: FieldValue.serverTimestamp() };

  if (body.destination !== undefined) {
    const destination = validateDestination(body.destination);
    if (!destination.ok) throw httpError(400, destination.error);
    updates.destination = destination.url;
  }
  if (body.status !== undefined) {
    if (!ALLOWED_STATUS.has(body.status)) throw httpError(400, "Geçersiz bağlantı durumu.");
    updates.status = body.status;
  }
  if (body.title !== undefined) updates.title = cleanText(body.title, 120);
  if (body.tag !== undefined) updates.tag = cleanText(body.tag, 40);
  if (body.password !== undefined) {
    // "••••••" is the masked placeholder the client echoes back; treat it as "unchanged".
    if (body.password !== "••••••") {
      const password = validatePasswordInput(body.password);
      if (!password.ok) throw httpError(400, password.error);
      updates.password = password.value ? hashPassword(password.value) : "";
    }
  }
  if (body.expiresAt !== undefined) {
    const expiry = validateExpiry(body.expiresAt);
    if (!expiry.ok) throw httpError(400, expiry.error);
    updates.expiresAt = expiry.value;
  }

  await ref.update(updates);
  invalidateLinkCache(id);
  const saved = await ref.get();
  return { link: serializeLink(id, saved.data()) };
}

export default async function handler(request, response) {
  allowCors(response, request);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (!["GET", "POST", "PATCH", "DELETE"].includes(request.method)) {
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  try {
    const user = await requireUser(request);
    const { db } = await getFirebaseAdmin();

    if (request.method === "GET") {
      return sendJson(response, 200, await listLinks(db, user.uid, request.query || {}));
    }

    if (request.method === "DELETE") {
      const id = resolveTargetId({ ...(request.query || {}), ...parseBody(request) });
      const { ref } = await loadOwnedLink(db, id, user.uid);
      await ref.delete();
      invalidateLinkCache(id);
      return sendJson(response, 200, { success: true, id });
    }

    const body = parseBody(request);
    if (request.method === "PATCH") return sendJson(response, 200, await updateLink(db, user, body));

    const result = await createLink(db, user, body);
    return sendJson(response, 201, result);
  } catch (error) {
    if (error.retryAfter) response.setHeader("Retry-After", String(error.retryAfter));
    return handleApiError(response, error);
  }
}

export const config = { runtime: "nodejs" };
