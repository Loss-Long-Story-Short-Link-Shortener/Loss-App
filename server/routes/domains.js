import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { audit } from "../lib/audit.js";
import { VERIFY_PREFIX, attachToVercel, checkDns, cnameTarget, detachFromVercel, invalidateHost, validateHost } from "../lib/hosts.js";
import { httpError } from "../lib/http.js";
import { requireRole } from "../lib/workspace.js";

function present(id, d) {
  return {
    host: id,
    status: d.status,
    verifiedAt: d.verifiedAt?.toMillis?.() ?? null,
    attached: Boolean(d.attached),
    instructions: {
      txt: { name: `${VERIFY_PREFIX}.${id}`, value: d.token },
      cname: { name: id, value: cnameTarget() },
      apexA: "76.76.21.21",
    },
  };
}

async function load(ctx, host) {
  const snap = await ctx.db.collection("domains").doc(host).get();
  // A domain claimed by another workspace looks exactly like a missing one.
  if (!snap.exists || snap.data().ownerId !== ctx.workspace.id) throw httpError(404, "Alan adı bulunamadı.");
  return snap;
}

export async function handle(ctx) {
  const { db, workspace } = ctx;
  const [sub] = ctx.segments;

  if (!sub && ctx.method === "GET") {
    const snap = await db.collection("domains").where("ownerId", "==", workspace.id).get();
    return { body: { domains: snap.docs.map((d) => present(d.id, d.data())), cnameTarget: cnameTarget() } };
  }

  if (!sub && ctx.method === "POST") {
    requireRole(ctx, "admin");
    const checked = validateHost(ctx.body.host);
    if (!checked.ok) throw httpError(400, checked.error);
    const { plan } = await ctx.plan();
    const existing = await db.collection("domains").where("ownerId", "==", workspace.id).count().get();
    if (plan.domains === 0) throw httpError(403, "Özel alan adı Starter ve üzeri paketlerde kullanılabilir.", { code: "plan_required", feature: "domains", requiredPlan: "starter" });
    if (existing.data().count >= plan.domains) throw httpError(402, `Planınız en fazla ${plan.domains} alan adına izin veriyor.`, { code: "limit_reached", limit: plan.domains });

    const token = `loss-${randomBytes(12).toString("hex")}`;
    try {
      await db.collection("domains").doc(checked.host).create({
        ownerId: workspace.id, createdBy: ctx.principal.uid, status: "pending", token, attached: false, createdAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      if (error.code === 6 || /ALREADY_EXISTS/.test(String(error.message))) throw httpError(409, "Bu alan adı zaten başka bir hesapta kayıtlı.");
      throw error;
    }
    await audit(ctx, "domain.add", checked.host);
    return { status: 201, body: { domain: present(checked.host, (await db.collection("domains").doc(checked.host).get()).data()) } };
  }

  if (sub === "verify" && ctx.method === "POST") {
    requireRole(ctx, "admin");
    const host = String(ctx.body.host || "").toLowerCase();
    const snap = await load(ctx, host);
    const d = snap.data();
    if (d.status === "verified") return { body: { domain: present(host, d), checks: { owned: true, routed: true } } };
    const checks = await checkDns(host, d.token);
    if (!checks.owned) return { body: { domain: present(host, d), checks, verified: false } };
    const vercel = await attachToVercel(host);
    await snap.ref.update({ status: "verified", verifiedAt: FieldValue.serverTimestamp(), attached: vercel.attached });
    invalidateHost(host);
    await audit(ctx, "domain.verify", host);
    const fresh = (await snap.ref.get()).data();
    return { body: { domain: present(host, fresh), checks, verified: true, attach: vercel } };
  }

  if (!sub && ctx.method === "DELETE") {
    requireRole(ctx, "admin");
    const host = String(ctx.query.host || ctx.body.host || "").toLowerCase();
    const snap = await load(ctx, host);
    const used = await db.collection("links").where("ownerId", "==", workspace.id).where("domain", "==", host).limit(1).get();
    if (!used.empty) throw httpError(409, "Bu alan adına bağlı bağlantılar var. Önce onları silin veya taşıyın.");
    await snap.ref.delete();
    invalidateHost(host);
    await detachFromVercel(host);
    await audit(ctx, "domain.remove", host);
    return { body: { success: true } };
  }
  return undefined;
}
