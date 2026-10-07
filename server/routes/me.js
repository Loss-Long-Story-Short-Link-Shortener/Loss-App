import { httpError } from "../lib/http.js";
import { baseUrl } from "../lib/links.js";
import { PLANS } from "../lib/plans.js";

export async function handle(ctx) {
  if (ctx.method !== "GET") throw httpError(405, "Method not allowed");
  const { db, principal, workspace } = ctx;
  const { tier, plan, subscription } = await ctx.plan();

  const [count, memberships, domainSnap] = await Promise.all([
    db.collection("links").where("ownerId", "==", workspace.id).count().get(),
    db.collection("workspaces").where("memberIds", "array-contains", principal.uid).get(),
    db.collection("domains").where("ownerId", "==", workspace.id).get(),
  ]);

  const workspaces = [
    { id: principal.uid, name: "Kişisel", role: "owner", personal: true },
    ...memberships.docs.map((d) => ({ id: d.id, name: d.data().name, role: d.data().members?.[principal.uid], personal: false })),
  ];

  return {
    body: {
      user: { uid: principal.uid, email: principal.email, name: principal.name },
      tier,
      plan: { id: plan.id, name: plan.name, maxLinks: plan.maxLinks, domains: plan.domains, members: plan.members, analyticsDays: plan.analyticsDays, features: plan.features },
      usage: { links: count.data().count, domains: domainSnap.size },
      workspace: { id: workspace.id, name: workspace.name, role: workspace.role, personal: workspace.personal },
      workspaces,
      baseUrl: baseUrl(),
      plans: Object.fromEntries(Object.values(PLANS).map((p) => [p.id, { name: p.name, monthly: p.monthly || 0, annual: p.annual || 0, maxLinks: p.maxLinks, domains: p.domains, members: p.members, analyticsDays: p.analyticsDays, features: p.features }])),
      subscription: subscription
        ? {
            status: subscription.status || null,
            billingPeriod: subscription.billingPeriod || null,
            nextBillingAt: subscription.nextBillingAt?.toMillis?.() ?? null,
            cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
          }
        : null,
    },
  };
}
