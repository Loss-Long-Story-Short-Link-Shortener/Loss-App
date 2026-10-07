// Server-side plan definitions. The server is the source of truth for limits;
// the client's copy (src/constants/tiers.js) is only used for display.
// Prices are in TRY (whole lira).

export const PLANS = {
  free: { maxLinks: 25, passwordProtection: false, expiry: false },
  starter: { maxLinks: 500, passwordProtection: false, expiry: true, monthly: 399, annual: 3990, name: "Loss Starter Planı" },
  pro: { maxLinks: 2500, passwordProtection: true, expiry: true, monthly: 899, annual: 8990, name: "Loss Pro Team Planı" },
  agency: { maxLinks: 15000, passwordProtection: true, expiry: true, monthly: 2499, annual: 24990, name: "Loss Agency / Scale Planı" },
};

export function normalizeTier(tier) {
  return Object.prototype.hasOwnProperty.call(PLANS, tier) ? tier : "free";
}

/**
 * Resolve the effective tier for a user. Only subscriptions in good standing
 * (active / past_due grace period) grant a paid tier.
 */
export async function getUserPlan(db, uid) {
  const snap = await db.collection("users").doc(uid).get();
  const data = snap.exists ? snap.data() : {};
  const status = data.subscription?.status;
  const paid = status === "active" || status === "past_due";
  const tier = paid ? normalizeTier(data.tier) : "free";
  return { tier, plan: PLANS[tier], subscription: data.subscription || null };
}
