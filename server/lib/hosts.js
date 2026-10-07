// Custom-domain host handling shared by the redirect and API layers.
import dns from "node:dns/promises";
import { canonicalHost } from "./links.js";
import { validateDestination } from "./urlSafety.js";

const CACHE = new Map();
const TTL = 60 * 1000;

export function requestHost(request) {
  return String(request.headers["x-forwarded-host"] || request.headers.host || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
}

function isOwnHost(host) {
  if (host === canonicalHost() || host === `www.${canonicalHost()}`) return true;
  if (host === "localhost" || host.endsWith(".vercel.app")) return true;
  return (process.env.ALIAS_HOSTS || "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean).includes(host);
}

export function invalidateHost(host) {
  CACHE.delete(host);
}

/** Map the Host header to the "domain" namespace links are stored under, or null when unknown. */
export async function resolveLinkDomain(db, host) {
  if (!host || isOwnHost(host)) return canonicalHost();
  const hit = CACHE.get(host);
  if (hit && Date.now() < hit.expires) return hit.value;
  const snap = await db.collection("domains").doc(host).get();
  const value = snap.exists && snap.data().status === "verified" ? host : null;
  CACHE.set(host, { value, expires: Date.now() + TTL });
  return value;
}

const HOST_PATTERN = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function validateHost(input) {
  const host = String(input || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!HOST_PATTERN.test(host)) return { ok: false, error: "Geçerli bir alan adı girin (örn. go.sirketiniz.com)." };
  if (isOwnHost(host) || host.endsWith(`.${canonicalHost()}`)) return { ok: false, error: "Bu alan adı kullanılamaz." };
  const probe = validateDestination(`https://${host}/`);
  if (!probe.ok) return { ok: false, error: "Bu alan adı kullanılamaz." };
  return { ok: true, host };
}

export const VERIFY_PREFIX = "_loss-verify";
export const cnameTarget = () => process.env.CUSTOM_DOMAIN_CNAME_TARGET || "cname.vercel-dns.com";

const withTimeout = (promise, ms = 4000) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("dns timeout")), ms))]);

/** Check ownership (TXT) and routing (CNAME/A). */
export async function checkDns(host, token) {
  let owned = false;
  try {
    const records = await withTimeout(dns.resolveTxt(`${VERIFY_PREFIX}.${host}`));
    owned = records.some((chunks) => chunks.join("") === token);
  } catch {
    owned = false;
  }
  let routed = false;
  try {
    const cnames = await withTimeout(dns.resolveCname(host));
    routed = cnames.some((c) => c.replace(/\.$/, "").toLowerCase() === cnameTarget());
  } catch {
    try {
      const a = await withTimeout(dns.resolve4(host));
      routed = a.includes("76.76.21.21");
    } catch {
      routed = false;
    }
  }
  return { owned, routed };
}

/** Optionally attach the domain to the Vercel project so TLS is provisioned automatically. */
export async function attachToVercel(host) {
  const token = process.env.VERCEL_API_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;
  if (!token || !project) return { attached: false, reason: "manual" };
  const team = process.env.VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : "";
  try {
    const res = await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(project)}/domains${team}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: host }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok || res.status === 409) return { attached: true };
    return { attached: false, reason: `vercel_${res.status}` };
  } catch {
    return { attached: false, reason: "vercel_unreachable" };
  }
}

export async function detachFromVercel(host) {
  const token = process.env.VERCEL_API_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;
  if (!token || !project) return;
  const team = process.env.VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : "";
  await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(project)}/domains/${encodeURIComponent(host)}${team}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  }).catch(() => {});
}
