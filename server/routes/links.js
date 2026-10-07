import { FieldValue } from "firebase-admin/firestore";
import { audit } from "../lib/audit.js";
import { httpError } from "../lib/http.js";
import { invalidateLinkCache } from "../lib/linkCache.js";
import {
  LINK_ID_PATTERN, canonicalHost, generateSlug, linkDocId, parseLinkFields, serializeLink, validateSlug,
} from "../lib/links.js";
import { consume } from "../lib/rateLimit.js";
import { checkReputation } from "../lib/reputation.js";
import { isReservedSlug } from "../lib/reserved.js";
import { dispatch } from "../lib/webhooks.js";
import { requireRole } from "../lib/workspace.js";
import { waitUntil } from "@vercel/functions";

const PAGE_DEFAULT = 200;
const PAGE_MAX = 500;
const CREATE_PER_MINUTE = 60;
const BULK_MAX = 100;
const IMPORT_MAX = 200;

const later = (promise) => waitUntil(Promise.resolve(promise).catch(() => {}));

function toEventLink(id, data) {
  const l = serializeLink(id, data);
  return { id: l.id, slug: l.slug, shortUrl: l.shortUrl, destination: l.destination, title: l.title, tags: l.tags, folder: l.folder || "", status: l.status };
}

async function loadOwned(ctx, id) {
  if (typeof id !== "string" || !LINK_ID_PATTERN.test(id)) throw httpError(400, "Geçerli bir bağlantı kimliği gerekli.");
  const ref = ctx.db.collection("links").doc(id);
  const snap = await ref.get();
  // Same answer for "missing" and "someone else's": no existence oracle.
  if (!snap.exists || snap.data().ownerId !== ctx.workspace.id) throw httpError(404, "Bağlantı bulunamadı.");
  return { ref, data: snap.data() };
}

async function resolveDomain(ctx, requested) {
  const host = canonicalHost();
  const wanted = String(requested || host).trim().toLowerCase();
  if (wanted === host) return host;
  const snap = await ctx.db.collection("domains").doc(wanted).get();
  if (!snap.exists || snap.data().ownerId !== ctx.workspace.id || snap.data().status !== "verified") {
    throw httpError(400, "Bu alan adı çalışma alanınızda doğrulanmış değil.");
  }
  return wanted;
}

async function list(ctx) {
  const limit = Math.min(Math.max(parseInt(ctx.query.limit, 10) || PAGE_DEFAULT, 1), PAGE_MAX);
  let q = ctx.db.collection("links").where("ownerId", "==", ctx.workspace.id).orderBy("createdAt", "desc").limit(limit + 1);
  if (ctx.query.cursor) {
    if (!LINK_ID_PATTERN.test(String(ctx.query.cursor))) throw httpError(400, "Geçersiz sayfa imleci.");
    const cur = await ctx.db.collection("links").doc(String(ctx.query.cursor)).get();
    if (cur.exists && cur.data().ownerId === ctx.workspace.id) q = q.startAfter(cur);
  }
  const snap = await q.get();
  const docs = snap.docs.slice(0, limit);
  return { body: { links: docs.map((d) => serializeLink(d.id, d.data())), nextCursor: snap.docs.length > limit ? docs[docs.length - 1].id : null } };
}

async function createOne(ctx, body, state) {
  const { plan } = state;
  const fields = parseLinkFields(body, plan.plan, { requireDestination: true });
  const hostname = fields._hostname;
  delete fields._hostname;

  const rep = await checkReputation(fields.destination);
  if (!rep.ok) throw httpError(400, rep.error);

  if (state.count >= plan.plan.maxLinks) {
    throw httpError(402, `Plan kotanıza (${plan.plan.maxLinks} link) ulaştınız. Lütfen paketinizi yükseltin.`, { code: "limit_reached", limit: plan.plan.maxLinks });
  }

  const domain = await resolveDomain(ctx, body.domain);
  let customSlug = null;
  if (typeof body.slug === "string" && body.slug.trim()) {
    const checked = validateSlug(body.slug, { host: domain });
    if (!checked.ok) throw httpError(400, checked.error);
    customSlug = checked.slug;
  }

  const doc = {
    ownerId: ctx.workspace.id,
    createdBy: ctx.principal.uid,
    domain,
    title: hostname,
    notes: "", folder: "", tags: [], tag: "", password: "", expiresAt: "", maxClicks: null, redirectType: 307, og: null, targets: null,
    status: "active",
    clickCount: 0,
    ...fields,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (!doc.title) doc.title = hostname;

  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = customSlug || generateSlug(attempt < 5 ? 8 : 10);
    if (!customSlug && domain === canonicalHost() && isReservedSlug(slug)) continue;
    const id = linkDocId(slug, domain);
    try {
      // create() fails atomically if the document exists: concurrent requests for one slug cannot both win.
      await ctx.db.collection("links").doc(id).create({ ...doc, slug });
      state.count += 1;
      const saved = (await ctx.db.collection("links").doc(id).get()).data();
      later(dispatch(ctx.db, ctx.workspace.id, "link.created", toEventLink(id, saved)));
      return serializeLink(id, saved);
    } catch (error) {
      if (error.code === 6 || /ALREADY_EXISTS/.test(String(error.message))) {
        if (customSlug) throw httpError(409, `"${slug}" bağlantı adı zaten kullanımda. Lütfen farklı bir ad seçin.`, { code: "slug_taken" });
        continue;
      }
      throw error;
    }
  }
  throw httpError(503, "Benzersiz bir bağlantı adı üretilemedi. Lütfen tekrar deneyin.");
}

async function prepareCreate(ctx, weight = 1) {
  requireRole(ctx, "editor");
  const limiter = await consume(ctx.db, "create", ctx.principal.uid, CREATE_PER_MINUTE, 60);
  if (!limiter.ok || limiter.count + weight - 1 > CREATE_PER_MINUTE * 3) {
    throw Object.assign(httpError(429, "Çok hızlı link oluşturuyorsunuz. Lütfen biraz bekleyin."), { retryAfter: limiter.retryAfter });
  }
  const plan = await ctx.plan();
  const count = (await ctx.db.collection("links").where("ownerId", "==", ctx.workspace.id).count().get()).data().count;
  return { plan, count };
}

async function create(ctx) {
  const state = await prepareCreate(ctx);
  const link = await createOne(ctx, ctx.body, state);
  await audit(ctx, "link.create", link.id, { destination: link.destination });
  return { status: 201, body: { link } };
}

async function update(ctx) {
  requireRole(ctx, "editor");
  const { ref, data: existing } = await loadOwned(ctx, ctx.body.id);
  if (existing.status === "disabled") throw httpError(403, "Bu bağlantı kötüye kullanım nedeniyle devre dışı bırakıldı.", { code: "disabled" });
  const { plan } = await ctx.plan();
  const fields = parseLinkFields(ctx.body, plan);
  delete fields._hostname;
  if (fields.destination) {
    const rep = await checkReputation(fields.destination);
    if (!rep.ok) throw httpError(400, rep.error);
  }
  await ref.update({ ...fields, updatedAt: FieldValue.serverTimestamp() });
  invalidateLinkCache(ref.id);
  const saved = (await ref.get()).data();
  later(dispatch(ctx.db, ctx.workspace.id, "link.updated", toEventLink(ref.id, saved)));
  await audit(ctx, "link.update", ref.id, { fields: Object.keys(fields) });
  return { body: { link: serializeLink(ref.id, saved) } };
}

async function remove(ctx) {
  requireRole(ctx, "editor");
  const id = ctx.query.id || ctx.body.id;
  const { ref, data } = await loadOwned(ctx, id);
  await ref.delete();
  invalidateLinkCache(id);
  later(dispatch(ctx.db, ctx.workspace.id, "link.deleted", toEventLink(id, data)));
  await audit(ctx, "link.delete", id);
  return { body: { success: true, id } };
}

async function bulk(ctx) {
  requireRole(ctx, "editor");
  const { action, ids, tags, folder } = ctx.body;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > BULK_MAX) throw httpError(400, `1 ile ${BULK_MAX} arasında bağlantı seçin.`);
  if (!["delete", "pause", "resume", "set_tags", "set_folder"].includes(action)) throw httpError(400, "Geçersiz toplu işlem.");

  let patch = null;
  if (action === "pause") patch = { status: "paused" };
  if (action === "resume") patch = { status: "active" };
  if (action === "set_folder") patch = parseLinkFields({ folder }, (await ctx.plan()).plan);
  if (action === "set_tags") patch = parseLinkFields({ tags }, (await ctx.plan()).plan);

  const results = [];
  for (const id of [...new Set(ids)]) {
    try {
      const { ref, data } = await loadOwned(ctx, id);
      if (action === "delete") {
        await ref.delete();
        later(dispatch(ctx.db, ctx.workspace.id, "link.deleted", toEventLink(id, data)));
      } else {
        if (data.status === "disabled") throw httpError(403, "Devre dışı bırakılmış bağlantı değiştirilemez.");
        await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
      }
      invalidateLinkCache(id);
      results.push({ id, ok: true });
    } catch (error) {
      results.push({ id, ok: false, error: error.message });
    }
  }
  await audit(ctx, `link.bulk_${action}`, `${results.filter((r) => r.ok).length} bağlantı`);
  return { body: { results, succeeded: results.filter((r) => r.ok).length } };
}

async function importRows(ctx) {
  const { plan } = await ctx.plan();
  if (!plan.features.importExport) {
    throw httpError(403, "İçe aktarma Starter ve üzeri paketlerde kullanılabilir.", { code: "plan_required", feature: "importExport", requiredPlan: "starter" });
  }
  const rows = ctx.body.rows;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > IMPORT_MAX) throw httpError(400, `Tek seferde 1 ile ${IMPORT_MAX} satır içe aktarılabilir.`);
  const state = await prepareCreate(ctx, rows.length);
  const results = [];
  for (const [index, row] of rows.entries()) {
    try {
      const link = await createOne(ctx, row || {}, state);
      results.push({ row: index + 1, ok: true, id: link.id, shortUrl: link.shortUrl });
    } catch (error) {
      results.push({ row: index + 1, ok: false, error: error.message });
    }
  }
  await audit(ctx, "link.import", `${results.filter((r) => r.ok).length}/${rows.length}`);
  return { body: { results, created: results.filter((r) => r.ok).length } };
}

export async function handle(ctx) {
  const [sub] = ctx.segments;
  if (sub === "bulk" && ctx.method === "POST") return bulk(ctx);
  if (sub === "import" && ctx.method === "POST") return importRows(ctx);
  if (sub) return undefined;
  if (ctx.method === "GET") return list(ctx);
  if (ctx.method === "POST") return create(ctx);
  if (ctx.method === "PATCH") return update(ctx);
  if (ctx.method === "DELETE") return remove(ctx);
  throw httpError(405, "Method not allowed");
}
