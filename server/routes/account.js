import { FieldValue } from "firebase-admin/firestore";
import { audit } from "../lib/audit.js";
import { getFirebaseAdmin } from "../lib/firebase.js";
import { httpError } from "../lib/http.js";
import { serializeLink } from "../lib/links.js";

async function deleteWhere(db, col, field, value) {
  const snap = await db.collection(col).where(field, "==", value).get();
  for (const d of snap.docs) await (db.recursiveDelete ? db.recursiveDelete(d.ref) : d.ref.delete());
  return snap.size;
}

export async function handle(ctx) {
  const { db, principal } = ctx;
  if (principal.via !== "firebase") throw httpError(403, "Hesap işlemleri yalnızca oturum açarak yapılabilir.");
  const [sub] = ctx.segments;
  const uid = principal.uid;

  // KVKK / GDPR data portability.
  if (sub === "export" && ctx.method === "GET") {
    const [links, domains, hooks, keys, memberships, orders] = await Promise.all([
      db.collection("links").where("ownerId", "==", uid).get(),
      db.collection("domains").where("ownerId", "==", uid).get(),
      db.collection("webhooks").where("workspaceId", "==", uid).get(),
      db.collection("apikeys").where("workspaceId", "==", uid).get(),
      db.collection("workspaces").where("memberIds", "array-contains", uid).get(),
      db.collection("orders").where("uid", "==", uid).get(),
    ]);
    return {
      body: {
        exportedAt: new Date().toISOString(),
        user: { uid, email: principal.email },
        links: links.docs.map((d) => serializeLink(d.id, d.data())),
        domains: domains.docs.map((d) => ({ host: d.id, status: d.data().status })),
        webhooks: hooks.docs.map((d) => ({ url: d.data().url, events: d.data().events })),
        apiKeys: keys.docs.map((d) => ({ name: d.data().name, prefix: d.data().prefix })),
        workspaces: memberships.docs.map((d) => ({ id: d.id, name: d.data().name, role: d.data().members[uid] })),
        orders: orders.docs.map((d) => ({ id: d.id, tier: d.data().tier, amountKurus: d.data().amountKurus, status: d.data().status })),
      },
    };
  }

  if (!sub && ctx.method === "DELETE") {
    if (ctx.body.confirm !== "DELETE") throw httpError(400, 'Onay için "DELETE" yazın.');
    const userSnap = await db.collection("users").doc(uid).get();
    const status = userSnap.exists ? userSnap.data().subscription?.status : null;
    if ((status === "active" || status === "past_due") && !userSnap.data().subscription?.cancelAtPeriodEnd) {
      throw httpError(409, "Önce aboneliğinizi iptal edin.", { code: "subscription_active" });
    }
    await audit(ctx, "account.delete", uid);
    await deleteWhere(db, "links", "ownerId", uid);
    await deleteWhere(db, "domains", "ownerId", uid);
    await deleteWhere(db, "webhooks", "workspaceId", uid);
    await deleteWhere(db, "apikeys", "workspaceId", uid);
    const owned = await db.collection("workspaces").where("ownerId", "==", uid).get();
    for (const ws of owned.docs) {
      await deleteWhere(db, "links", "ownerId", ws.id);
      await ws.ref.delete();
    }
    const memberOf = await db.collection("workspaces").where("memberIds", "array-contains", uid).get();
    for (const ws of memberOf.docs) {
      if (ws.data().ownerId !== uid) await ws.ref.update({ [`members.${uid}`]: FieldValue.delete(), [`profiles.${uid}`]: FieldValue.delete(), memberIds: FieldValue.arrayRemove(uid) });
    }
    await db.collection("users").doc(uid).delete().catch(() => {});
    const { auth } = await getFirebaseAdmin();
    await auth.deleteUser(uid).catch((e) => console.warn("deleteUser failed", e.message));
    return { body: { success: true } };
  }
  return undefined;
}
