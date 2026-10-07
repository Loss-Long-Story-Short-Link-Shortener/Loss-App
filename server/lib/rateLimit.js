import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

// ── Per-instance limiter ──────────────────────────────────────────────────
// Cheap first line of defence. State lives in one serverless instance, so on
// its own it is NOT a global limit — use consume() for limits that matter.
const buckets = new Map();

export function memoryLimit(key, limit, windowMs) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset <= now) {
    if (buckets.size > 10000) buckets.clear();
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  bucket.count += 1;
  const ok = bucket.count <= limit;
  return { ok, remaining: Math.max(0, limit - bucket.count), retryAfter: ok ? 0 : Math.ceil((bucket.reset - now) / 1000) };
}

// ── Durable limiter (Firestore) ───────────────────────────────────────────
// Fixed-window counter shared by every instance. Use for low-volume sensitive
// operations (password attempts, link creation) — it costs a transaction.
export async function consume(db, scope, identifier, limit, windowSec) {
  const windowId = Math.floor(Date.now() / (windowSec * 1000));
  const digest = createHash("sha256").update(`${scope}:${identifier}`).digest("hex").slice(0, 32);
  const ref = db.collection("rate_limits").doc(`${scope}_${digest}_${windowId}`);
  const count = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = (snap.exists ? snap.data().count : 0) + 1;
    tx.set(ref, {
      count: next,
      // Enable a Firestore TTL policy on `expiresAt` to garbage-collect these.
      expiresAt: new Date((windowId + 2) * windowSec * 1000),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return next;
  });
  const retryAfter = Math.max(1, Math.ceil(((windowId + 1) * windowSec * 1000 - Date.now()) / 1000));
  return { ok: count <= limit, count, retryAfter };
}

export function clientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  const first = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "";
  return request.headers["x-real-ip"] || first || request.socket?.remoteAddress || "unknown";
}
