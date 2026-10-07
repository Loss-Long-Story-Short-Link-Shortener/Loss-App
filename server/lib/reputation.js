// Destination reputation checks. Both are optional and fail open so an outage
// of the reputation service never blocks legitimate users.

function blockedDomains() {
  return (process.env.BLOCKED_DOMAINS || "").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
}

/** @returns {Promise<{ ok: true } | { ok: false, error: string }>} */
export async function checkReputation(urlString) {
  let host;
  try {
    host = new URL(urlString).hostname.toLowerCase();
  } catch {
    return { ok: true };
  }
  if (blockedDomains().some((d) => host === d || host.endsWith(`.${d}`))) {
    return { ok: false, error: "Bu alan adı kötüye kullanım nedeniyle engellenmiştir." };
  }
  const key = process.env.WEB_RISK_API_KEY;
  if (!key) return { ok: true };
  try {
    const params = new URLSearchParams({ uri: urlString, key });
    for (const t of ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"]) params.append("threatTypes", t);
    const res = await fetch(`https://webrisk.googleapis.com/v1/uris:search?${params}`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return { ok: true };
    const data = await res.json();
    if (data.threat) return { ok: false, error: "Bu adres güvenlik taramasında zararlı olarak işaretlendi." };
  } catch {
    /* fail open */
  }
  return { ok: true };
}
