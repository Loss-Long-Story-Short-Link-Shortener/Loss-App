import { waitUntil } from "@vercel/functions";
import { allowCors, getFirebaseAdmin, handleApiError, httpError, sendJson } from "./_firebase.js";
import { buildClick, recordClick } from "./_lib/clicks.js";
import { canonicalHost, isExpired, linkDocId } from "./_lib/links.js";
import { hashPassword, needsRehash, verifyPassword } from "./_lib/password.js";
import { clientIp, consume, memoryLimit } from "./_lib/rateLimit.js";
import { isSafeRedirectTarget } from "./_lib/urlSafety.js";

const ATTEMPTS_PER_WINDOW = 5;
const WINDOW_SECONDS = 300;

/**
 * POST /api/verify-password   { slug, password }
 * Public endpoint used by the password interstitial. Attempts are limited per
 * (IP, link) and per link so passwords cannot be brute-forced.
 */
export default async function handler(request, response) {
  allowCors(response, request);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed" });

  try {
    const body = typeof request.body === "object" && request.body ? request.body : {};
    const slug = String(body.slug || "").trim().toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[a-z0-9_-]{1,48}$/.test(slug) || !password || password.length > 128) {
      throw httpError(400, "Bağlantı adı ve parola gerekli.");
    }

    const ip = clientIp(request);
    if (!memoryLimit(`pw:${ip}`, 30, 60_000).ok) throw httpError(429, "Çok fazla deneme. Lütfen biraz bekleyin.");

    const { db } = await getFirebaseAdmin();
    const [perIp, perLink] = await Promise.all([
      consume(db, "pw-ip", `${ip}:${slug}`, ATTEMPTS_PER_WINDOW, WINDOW_SECONDS),
      // A distributed attacker rotating IPs still hits the per-link ceiling.
      consume(db, "pw-link", slug, ATTEMPTS_PER_WINDOW * 6, WINDOW_SECONDS),
    ]);
    if (!perIp.ok || !perLink.ok) {
      response.setHeader("Retry-After", String(Math.max(perIp.retryAfter, perLink.retryAfter)));
      throw httpError(429, "Çok fazla hatalı deneme. Lütfen birkaç dakika sonra tekrar deneyin.");
    }

    const id = linkDocId(slug, canonicalHost());
    const ref = db.collection("links").doc(id);
    const snapshot = await ref.get();
    // Same message for missing links and wrong passwords: no enumeration oracle.
    if (!snapshot.exists || !snapshot.data().password) throw httpError(403, "Parola hatalı.");

    const link = snapshot.data();
    if (link.status !== "active") throw httpError(410, "Bu bağlantı artık yayında değil.");
    if (isExpired(link)) throw httpError(410, "Bu bağlantının süresi dolmuş.");
    if (!verifyPassword(password, link.password)) throw httpError(403, "Parola hatalı.");
    if (!isSafeRedirectTarget(link.destination)) throw httpError(410, "Bu bağlantının hedefi geçersiz.");

    waitUntil(
      Promise.allSettled([
        recordClick(db, id, buildClick(request, link.ownerId, { unlocked: true })),
        needsRehash(link.password) ? ref.update({ password: hashPassword(password) }) : null,
      ]),
    );

    return sendJson(response, 200, { destination: link.destination });
  } catch (error) {
    return handleApiError(response, error);
  }
}

export const config = { runtime: "nodejs" };
