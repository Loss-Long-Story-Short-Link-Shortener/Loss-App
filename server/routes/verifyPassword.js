import { waitUntil } from "@vercel/functions";
import { buildClick, recordClick } from "../lib/clicks.js";
import { requestHost, resolveLinkDomain } from "../lib/hosts.js";
import { httpError } from "../lib/http.js";
import { isExpired, linkDocId } from "../lib/links.js";
import { hashPassword, needsRehash, verifyPassword } from "../lib/password.js";
import { clientIp, consume, memoryLimit } from "../lib/rateLimit.js";
import { isSafeRedirectTarget } from "../lib/urlSafety.js";

const ATTEMPTS = 5;
const WINDOW = 300;

/** POST /verify-password { slug, password } — public, brute-force limited. */
export async function handle(ctx) {
  if (ctx.method !== "POST") throw httpError(405, "Method not allowed");
  const { db, request } = ctx;
  const slug = String(ctx.body.slug || "").trim().toLowerCase();
  const password = typeof ctx.body.password === "string" ? ctx.body.password : "";
  if (!/^[a-z0-9_-]{1,48}$/.test(slug) || !password || password.length > 128) throw httpError(400, "Bağlantı adı ve parola gerekli.");

  const ip = clientIp(request);
  if (!memoryLimit(`pw:${ip}`, 30, 60_000).ok) throw httpError(429, "Çok fazla deneme. Lütfen biraz bekleyin.");

  const domain = await resolveLinkDomain(db, requestHost(request));
  if (!domain) throw httpError(403, "Parola hatalı.");
  const [perIp, perLink] = await Promise.all([
    consume(db, "pw-ip", `${ip}:${domain}:${slug}`, ATTEMPTS, WINDOW),
    consume(db, "pw-link", `${domain}:${slug}`, ATTEMPTS * 6, WINDOW),
  ]);
  if (!perIp.ok || !perLink.ok) {
    throw Object.assign(httpError(429, "Çok fazla hatalı deneme. Lütfen birkaç dakika sonra tekrar deneyin."), { retryAfter: Math.max(perIp.retryAfter, perLink.retryAfter) });
  }

  const id = linkDocId(slug, domain);
  const ref = db.collection("links").doc(id);
  const snap = await ref.get();
  // Same message for missing links and wrong passwords: no enumeration oracle.
  if (!snap.exists || !snap.data().password) throw httpError(403, "Parola hatalı.");
  const link = snap.data();
  if (link.status !== "active") throw httpError(410, "Bu bağlantı artık yayında değil.");
  if (isExpired(link)) throw httpError(410, "Bu bağlantının süresi dolmuş.");
  if (!verifyPassword(password, link.password)) throw httpError(403, "Parola hatalı.");
  if (!isSafeRedirectTarget(link.destination)) throw httpError(410, "Bu bağlantının hedefi geçersiz.");

  waitUntil(Promise.allSettled([
    recordClick(db, id, buildClick(request, link.ownerId, { unlocked: true, source: "link" })),
    needsRehash(link.password) ? ref.update({ password: hashPassword(password) }) : null,
  ]));
  return { body: { destination: link.destination } };
}
