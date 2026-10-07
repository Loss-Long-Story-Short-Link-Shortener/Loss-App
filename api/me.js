import { allowCors, getFirebaseAdmin, handleApiError, requireUser, sendJson } from "./_firebase.js";
import { getUserPlan } from "./_lib/plans.js";

/** GET /api/me — the authoritative plan and usage for the signed-in user. */
export default async function handler(request, response) {
  allowCors(response, request);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed" });

  try {
    const user = await requireUser(request);
    const { db } = await getFirebaseAdmin();
    const [{ tier, plan, subscription }, count] = await Promise.all([
      getUserPlan(db, user.uid),
      db.collection("links").where("ownerId", "==", user.uid).count().get(),
    ]);
    return sendJson(response, 200, {
      tier,
      maxLinks: plan.maxLinks,
      linkCount: count.data().count,
      subscription: subscription
        ? {
            status: subscription.status || null,
            billingPeriod: subscription.billingPeriod || null,
            nextBillingAt: subscription.nextBillingAt?.toMillis?.() ?? null,
            cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
          }
        : null,
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}

export const config = { runtime: "nodejs" };
