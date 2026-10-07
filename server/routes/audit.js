import { httpError } from "../lib/http.js";
import { requireRole } from "../lib/workspace.js";

export async function handle(ctx) {
  if (ctx.method !== "GET") throw httpError(405, "Method not allowed");
  requireRole(ctx, "admin");
  const { plan } = await ctx.plan();
  if (!plan.features.audit) throw httpError(403, "Denetim kaydı Pro ve üzeri paketlerde kullanılabilir.", { code: "plan_required", feature: "audit", requiredPlan: "pro" });
  const limit = Math.min(Math.max(parseInt(ctx.query.limit, 10) || 100, 1), 200);
  const snap = await ctx.db.collection("audit").where("workspaceId", "==", ctx.workspace.id).orderBy("at", "desc").limit(limit).get();
  return {
    body: {
      entries: snap.docs.map((d) => {
        const e = d.data();
        return { id: d.id, action: e.action, target: e.target, meta: e.meta || {}, actor: e.actor?.email || e.actor?.uid || "", via: e.via, at: e.at?.toMillis?.() ?? null };
      }),
    },
  };
}
