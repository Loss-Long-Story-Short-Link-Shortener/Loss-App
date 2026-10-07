import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { audit } from "../lib/audit.js";
import { httpError } from "../lib/http.js";
import { cleanText } from "../lib/links.js";
import { validateDestination } from "../lib/urlSafety.js";
import { WEBHOOK_EVENTS, deliver, invalidateWebhooks } from "../lib/webhooks.js";
import { requireRole } from "../lib/workspace.js";

const MAX_HOOKS = 10;

function present(id, d) {
  return {
    id, url: d.url, events: d.events, active: d.active, secretPrefix: String(d.secret || "").slice(0, 10),
    lastDelivery: d.lastDelivery ? { status: d.lastDelivery.status, type: d.lastDelivery.type, at: d.lastDelivery.at?.toMillis?.() ?? null } : null,
  };
}

function parseInput(body, { partial } = {}) {
  const out = {};
  if (!partial || body.url !== undefined) {
    const r = validateDestination(body.url);
    if (!r.ok || !r.url.startsWith("https://")) throw httpError(400, "Webhook adresi geçerli bir https adresi olmalıdır.");
    out.url = r.url;
  }
  if (!partial || body.events !== undefined) {
    const events = Array.isArray(body.events) ? body.events : [];
    if (!events.length || !events.every((e) => WEBHOOK_EVENTS.includes(e))) throw httpError(400, "Geçerli en az bir olay seçin.");
    out.events = [...new Set(events)];
  }
  if (body.active !== undefined) out.active = Boolean(body.active);
  return out;
}

export async function handle(ctx) {
  requireRole(ctx, "admin");
  const { db, workspace } = ctx;
  const { plan } = await ctx.plan();
  if (!plan.features.webhooks) throw httpError(403, "Webhook'lar Pro ve üzeri paketlerde kullanılabilir.", { code: "plan_required", feature: "webhooks", requiredPlan: "pro" });
  const [sub, action] = ctx.segments;

  if (!sub && ctx.method === "GET") {
    const snap = await db.collection("webhooks").where("workspaceId", "==", workspace.id).get();
    return { body: { webhooks: snap.docs.map((d) => present(d.id, d.data())), events: WEBHOOK_EVENTS } };
  }

  if (!sub && ctx.method === "POST") {
    const count = (await db.collection("webhooks").where("workspaceId", "==", workspace.id).count().get()).data().count;
    if (count >= MAX_HOOKS) throw httpError(400, `En fazla ${MAX_HOOKS} webhook tanımlayabilirsiniz.`);
    const input = parseInput(ctx.body);
    const secret = `whsec_${randomBytes(24).toString("hex")}`;
    const ref = await db.collection("webhooks").add({ workspaceId: workspace.id, createdBy: ctx.principal.uid, ...input, active: true, secret, createdAt: FieldValue.serverTimestamp() });
    invalidateWebhooks(workspace.id);
    await audit(ctx, "webhook.create", input.url);
    return { status: 201, body: { webhook: present(ref.id, { ...input, active: true, secret }), secret } };
  }

  if (sub) {
    const snap = await db.collection("webhooks").doc(sub).get();
    if (!snap.exists || snap.data().workspaceId !== workspace.id) throw httpError(404, "Webhook bulunamadı.");
    if (!action && ctx.method === "PATCH") {
      await snap.ref.update(parseInput(ctx.body, { partial: true }));
      invalidateWebhooks(workspace.id);
      return { body: { webhook: present(sub, (await snap.ref.get()).data()) } };
    }
    if (!action && ctx.method === "DELETE") {
      await snap.ref.delete();
      invalidateWebhooks(workspace.id);
      await audit(ctx, "webhook.delete", snap.data().url);
      return { body: { success: true } };
    }
    if (action === "test" && ctx.method === "POST") {
      let status = 0;
      try {
        status = await deliver(snap.data(), { id: "test", type: "ping", createdAt: new Date().toISOString(), data: { message: "Loss webhook testi" } });
      } catch {
        status = 0;
      }
      return { body: { status, ok: status >= 200 && status < 300 } };
    }
  }
  return undefined;
}
