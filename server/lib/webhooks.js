import { createHmac, randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

export const WEBHOOK_EVENTS = ["link.created", "link.updated", "link.deleted", "link.clicked"];
const CACHE = new Map();
const TTL = 60 * 1000;

export function sign(secret, timestamp, body) {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

export function invalidateWebhooks(workspaceId) {
  CACHE.delete(workspaceId);
}

async function activeHooks(db, workspaceId) {
  const hit = CACHE.get(workspaceId);
  if (hit && Date.now() < hit.expires) return hit.hooks;
  const snap = await db.collection("webhooks").where("workspaceId", "==", workspaceId).where("active", "==", true).get();
  const hooks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  CACHE.set(workspaceId, { hooks, expires: Date.now() + TTL });
  return hooks;
}

export async function deliver(hook, event) {
  const body = JSON.stringify(event);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const res = await fetch(hook.url, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Loss-Webhooks/1.0",
      "X-Loss-Event": event.type,
      "X-Loss-Delivery": event.id,
      "X-Loss-Timestamp": timestamp,
      "X-Loss-Signature": sign(hook.secret, timestamp, body),
    },
    body,
    signal: AbortSignal.timeout(5000),
  });
  return res.status;
}

/** Fire-and-forget delivery to every active subscriber. Never throws. */
export async function dispatch(db, workspaceId, type, data) {
  try {
    const hooks = (await activeHooks(db, workspaceId)).filter((h) => h.events?.includes(type) || h.events?.includes("*"));
    if (!hooks.length) return;
    const event = { id: randomUUID(), type, createdAt: new Date().toISOString(), data };
    await Promise.allSettled(
      hooks.map(async (hook) => {
        let status = 0;
        try {
          status = await deliver(hook, event);
        } catch {
          status = 0;
        }
        if (type !== "link.clicked") {
          await db.collection("webhooks").doc(hook.id).update({
            lastDelivery: { status, type, at: FieldValue.serverTimestamp() },
          }).catch(() => {});
        }
      }),
    );
  } catch (error) {
    console.warn("webhook dispatch failed", error.message);
  }
}
