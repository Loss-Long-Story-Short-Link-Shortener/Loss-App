import { useAuth } from "./auth";

/** Capabilities of the active workspace's plan, as reported by the server. */
export function usePlan() {
  const { me } = useAuth();
  const plan = me?.plan;
  const role = me?.workspace?.role || "viewer";
  const rank = ["viewer", "editor", "admin", "owner"];
  return {
    me, plan, role,
    ready: Boolean(plan),
    can: (feature) => Boolean(plan?.features?.[feature]),
    atLeast: (min) => rank.indexOf(role) >= rank.indexOf(min),
    linkUsage: me ? { used: me.usage.links, max: plan.maxLinks } : null,
  };
}

export const PLAN_NAMES = { free: "Ücretsiz", starter: "Starter", pro: "Pro Team", agency: "Agency / Scale" };
