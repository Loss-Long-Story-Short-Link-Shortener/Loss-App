import { FieldValue } from "firebase-admin/firestore";
import { audit } from "../lib/audit.js";
import { generateApiKey, hashKey } from "../lib/auth.js";
import { cleanText } from "../lib/links.js";
import { httpError } from "../lib/http.js";
import { requireRole } from "../lib/workspace.js";

const MAX_KEYS = 10;

export async function handle(ctx) {
  requireRole(ctx, "admin");
  if (ctx.principal.via === "apikey") throw httpError(403, "API anahtarları yalnızca oturum açarak yönetilebilir.");
  const { db, workspace } = ctx;

  if (ctx.method === "GET") {
    const snap = await db.collection("apikeys").where("workspaceId", "==", workspace.id).get();
    return {
      body: {
        keys: snap.docs.map((d) => ({
          id: d.id, name: d.data().name, prefix: d.data().prefix, role: d.data().role,
          createdAt: d.data().createdAt?.toMillis?.() ?? null, lastUsedAt: d.data().lastUsedAt?.toMillis?.() ?? null,
        })),
      },
    };
  }

  if (ctx.method === "POST") {
    const { plan } = await ctx.plan();
    if (!plan.features.api) throw httpError(403, "API erişimi Pro ve üzeri paketlerde kullanılabilir.", { code: "plan_required", feature: "api", requiredPlan: "pro" });
    const existing = await db.collection("apikeys").where("workspaceId", "==", workspace.id).count().get();
    if (existing.data().count >= MAX_KEYS) throw httpError(400, `En fazla ${MAX_KEYS} API anahtarı oluşturabilirsiniz.`);
    const role = ["viewer", "editor"].includes(ctx.body.role) ? ctx.body.role : "editor";
    const name = cleanText(ctx.body.name, 60) || "API anahtarı";
    const key = generateApiKey();
    const id = hashKey(key);
    await db.collection("apikeys").doc(id).set({
      workspaceId: workspace.id, createdBy: ctx.principal.uid, name, prefix: key.slice(0, 10), role, createdAt: FieldValue.serverTimestamp(),
    });
    await audit(ctx, "apikey.create", name);
    // The secret is shown exactly once; only its hash is stored.
    return { status: 201, body: { key, id, name, prefix: key.slice(0, 10), role } };
  }

  if (ctx.method === "DELETE") {
    const id = String(ctx.query.id || ctx.body.id || "");
    const snap = await db.collection("apikeys").doc(id).get();
    if (!/^[a-f0-9]{64}$/.test(id) || !snap.exists || snap.data().workspaceId !== workspace.id) throw httpError(404, "Anahtar bulunamadı.");
    await snap.ref.delete();
    await audit(ctx, "apikey.revoke", snap.data().name);
    return { body: { success: true } };
  }
  return undefined;
}
