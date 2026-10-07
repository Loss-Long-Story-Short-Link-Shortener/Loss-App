import { FieldValue } from "firebase-admin/firestore";
import { httpError } from "../lib/http.js";
import { invalidateLinkCache } from "../lib/linkCache.js";
import { LINK_ID_PATTERN } from "../lib/links.js";

function isAdmin(uid) {
  return (process.env.ADMIN_UIDS || "").split(",").map((s) => s.trim()).filter(Boolean).includes(uid);
}

/** Moderation endpoints, restricted to ADMIN_UIDS. */
export async function handle(ctx) {
  // 404 (not 403) so the existence of the admin surface is not revealed.
  if (ctx.principal.via !== "firebase" || !isAdmin(ctx.principal.uid)) throw httpError(404, "Bulunamadı.");
  const { db } = ctx;
  const [sub, id, action] = ctx.segments;

  if (sub === "reports" && !id && ctx.method === "GET") {
    const snap = await db.collection("reports").where("status", "==", "open").orderBy("createdAt", "desc").limit(100).get();
    return { body: { reports: snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toMillis?.() ?? null })) } };
  }

  if (sub === "reports" && id && action === "resolve" && ctx.method === "POST") {
    const ref = db.collection("reports").doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw httpError(404, "Rapor bulunamadı.");
    const { decision } = ctx.body;
    if (!["disable", "dismiss"].includes(decision)) throw httpError(400, "Geçersiz karar.");
    const linkId = snap.data().linkId;
    if (decision === "disable" && linkId && LINK_ID_PATTERN.test(linkId)) {
      await db.collection("links").doc(linkId).update({ status: "disabled", disabledAt: FieldValue.serverTimestamp(), disabledReason: snap.data().reason });
      invalidateLinkCache(linkId);
    }
    await ref.update({ status: decision === "disable" ? "actioned" : "dismissed", resolvedBy: ctx.principal.uid, resolvedAt: FieldValue.serverTimestamp() });
    return { body: { success: true } };
  }

  if (sub === "links" && id && action === "disable" && ctx.method === "POST") {
    if (!LINK_ID_PATTERN.test(id)) throw httpError(400, "Geçersiz kimlik.");
    await db.collection("links").doc(id).update({ status: "disabled", disabledAt: FieldValue.serverTimestamp(), disabledReason: "admin" });
    invalidateLinkCache(id);
    return { body: { success: true } };
  }
  return undefined;
}
