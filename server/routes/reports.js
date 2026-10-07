import { FieldValue } from "firebase-admin/firestore";
import { httpError } from "../lib/http.js";
import { cleanText, canonicalHost, linkDocId } from "../lib/links.js";
import { clientIp, consume } from "../lib/rateLimit.js";

const REASONS = ["phishing", "malware", "spam", "illegal", "other"];

/** POST /report — public abuse report for a short link. */
export async function handle(ctx) {
  if (ctx.method !== "POST") throw httpError(405, "Method not allowed");
  const limiter = await consume(ctx.db, "report", clientIp(ctx.request), 5, 3600);
  if (!limiter.ok) throw Object.assign(httpError(429, "Çok fazla bildirim gönderdiniz. Lütfen daha sonra tekrar deneyin."), { retryAfter: limiter.retryAfter });

  const reason = REASONS.includes(ctx.body.reason) ? ctx.body.reason : "other";
  let url;
  try {
    url = new URL(String(ctx.body.url || "").trim());
  } catch {
    throw httpError(400, "Lütfen bildirmek istediğiniz kısa bağlantının tam adresini girin.");
  }
  const slug = url.pathname.replace(/^\/+/, "").split("/")[0].toLowerCase();
  if (!/^[a-z0-9_-]{1,48}$/.test(slug)) throw httpError(400, "Kısa bağlantı adresi tanınamadı.");
  const host = url.hostname.toLowerCase();

  let linkId = null;
  for (const candidate of [linkDocId(slug, host), linkDocId(slug, canonicalHost())]) {
    const snap = await ctx.db.collection("links").doc(candidate).get();
    if (snap.exists) { linkId = candidate; break; }
  }

  await ctx.db.collection("reports").add({
    url: url.toString().slice(0, 300), slug, linkId, reason,
    details: cleanText(ctx.body.details, 1000),
    email: cleanText(ctx.body.email, 200),
    status: "open", createdAt: FieldValue.serverTimestamp(),
  });
  return { status: 201, body: { received: true } };
}
