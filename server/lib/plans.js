// Server-side plan matrix. The server is the source of truth: the UI only
// reflects what /api/me returns. Prices are whole TRY.

export const FEATURES = [
  "expiry", "password", "clickLimit", "targeting", "socialPreview", "redirectType",
  "importExport", "api", "webhooks", "audit", "team",
];

const none = Object.fromEntries(FEATURES.map((f) => [f, false]));
const on = (...keys) => ({ ...none, ...Object.fromEntries(keys.map((k) => [k, true])) });

export const PLANS = {
  free: {
    id: "free", name: "Ücretsiz", maxLinks: 25, domains: 0, members: 1, analyticsDays: 30,
    features: on(),
  },
  starter: {
    id: "starter", name: "Starter", maxLinks: 500, domains: 1, members: 1, analyticsDays: 365,
    monthly: 399, annual: 3990, label: "Loss Starter Planı",
    features: on("socialPreview", "redirectType", "importExport"),
  },
  pro: {
    id: "pro", name: "Pro Team", maxLinks: 2500, domains: 3, members: 5, analyticsDays: 365,
    monthly: 899, annual: 8990, label: "Loss Pro Team Planı",
    features: on("socialPreview", "redirectType", "importExport", "expiry", "password", "clickLimit", "targeting", "api", "webhooks", "audit", "team"),
  },
  agency: {
    id: "agency", name: "Agency / Scale", maxLinks: 15000, domains: 15, members: 25, analyticsDays: 365,
    monthly: 2499, annual: 24990, label: "Loss Agency / Scale Planı",
    features: on(...FEATURES),
  },
};

const ORDER = ["free", "starter", "pro", "agency"];

export function normalizeTier(tier) {
  return Object.prototype.hasOwnProperty.call(PLANS, tier) ? tier : "free";
}

export function minimumTierFor(feature) {
  return ORDER.find((t) => PLANS[t].features[feature]) || "agency";
}

/** Effective plan for an account. Only subscriptions in good standing grant a paid tier. */
export async function getPlan(db, planOwnerId) {
  const snap = await db.collection("users").doc(planOwnerId).get();
  const data = snap.exists ? snap.data() : {};
  const status = data.subscription?.status;
  const paid = status === "active" || status === "past_due";
  const tier = paid ? normalizeTier(data.tier) : "free";
  return { tier, plan: PLANS[tier], subscription: data.subscription || null };
}

/** Back-compat name used by older call sites/tests. */
export const getUserPlan = getPlan;
