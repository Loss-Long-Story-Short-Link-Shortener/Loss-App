import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { audit } from "../lib/audit.js";
import { httpError } from "../lib/http.js";
import { baseUrl, cleanText } from "../lib/links.js";
import { getPlan } from "../lib/plans.js";
import { ROLES } from "../lib/workspace.js";

const rank = (r) => ROLES.indexOf(r);
const INVITE_TTL_MS = 7 * 86400_000;
const INVITABLE = ["viewer", "editor", "admin"];

async function loadMembership(ctx, id) {
  if (!/^ws_[a-z0-9]{6,40}$/.test(id || "")) throw httpError(404, "Çalışma alanı bulunamadı.");
  const snap = await ctx.db.collection("workspaces").doc(id).get();
  const role = snap.exists ? snap.data().members?.[ctx.principal.uid] : null;
  if (!role) throw httpError(404, "Çalışma alanı bulunamadı.");
  return { snap, ws: snap.data(), role };
}

const need = (role, min) => {
  if (rank(role) < rank(min)) throw httpError(403, "Bu işlem için yetkiniz yok.", { code: "forbidden", requiredRole: min });
};

function members(ws) {
  return Object.entries(ws.members || {}).map(([uid, role]) => ({ uid, role, email: ws.profiles?.[uid]?.email || "", name: ws.profiles?.[uid]?.name || "" }));
}

export async function handle(ctx) {
  const { db, principal } = ctx;
  if (principal.via === "apikey") throw httpError(403, "Takım yönetimi yalnızca oturum açarak yapılabilir.");
  const [id, sub, subId] = ctx.segments;

  if (!id && ctx.method === "GET") {
    const snap = await db.collection("workspaces").where("memberIds", "array-contains", principal.uid).get();
    return { body: { workspaces: snap.docs.map((d) => ({ id: d.id, name: d.data().name, role: d.data().members[principal.uid], members: d.data().memberIds.length })) } };
  }

  if (!id && ctx.method === "POST") {
    const { plan } = await getPlan(db, principal.uid);
    if (!plan.features.team) throw httpError(403, "Takım çalışma alanları Pro ve üzeri paketlerde kullanılabilir.", { code: "plan_required", feature: "team", requiredPlan: "pro" });
    const owned = await db.collection("workspaces").where("ownerId", "==", principal.uid).count().get();
    if (owned.data().count >= 5) throw httpError(400, "En fazla 5 çalışma alanı oluşturabilirsiniz.");
    const name = cleanText(ctx.body.name, 60);
    if (name.length < 2) throw httpError(400, "Çalışma alanı adı en az 2 karakter olmalıdır.");
    const wsId = `ws_${randomBytes(8).toString("hex")}`;
    await db.collection("workspaces").doc(wsId).set({
      name, ownerId: principal.uid, members: { [principal.uid]: "owner" }, memberIds: [principal.uid],
      profiles: { [principal.uid]: { email: principal.email || "", name: principal.name || "" } }, createdAt: FieldValue.serverTimestamp(),
    });
    return { status: 201, body: { workspace: { id: wsId, name, role: "owner" } } };
  }

  const { snap, ws, role } = await loadMembership(ctx, id);

  if (!sub && ctx.method === "GET") {
    const invites = role !== "viewer" && rank(role) >= rank("admin")
      ? (await db.collection("invites").where("workspaceId", "==", id).get()).docs.filter((d) => !d.data().usedAt).map((d) => ({ token: d.id, email: d.data().email, role: d.data().role, expiresAt: d.data().expiresAt, url: `${baseUrl()}/invite/${d.id}` }))
      : [];
    const { plan } = await getPlan(db, ws.ownerId);
    return { body: { workspace: { id, name: ws.name, role, ownerId: ws.ownerId, seatLimit: plan.members }, members: members(ws), invites } };
  }

  if (!sub && ctx.method === "PATCH") {
    need(role, "admin");
    const name = cleanText(ctx.body.name, 60);
    if (name.length < 2) throw httpError(400, "Çalışma alanı adı en az 2 karakter olmalıdır.");
    await snap.ref.update({ name });
    return { body: { success: true } };
  }

  if (!sub && ctx.method === "DELETE") {
    need(role, "owner");
    const links = await db.collection("links").where("ownerId", "==", id).get();
    for (const d of links.docs) await (db.recursiveDelete ? db.recursiveDelete(d.ref) : d.ref.delete());
    for (const col of ["domains", "apikeys", "webhooks"]) {
      const field = col === "domains" ? "ownerId" : "workspaceId";
      const rows = await db.collection(col).where(field, "==", id).get();
      for (const d of rows.docs) await d.ref.delete();
    }
    await snap.ref.delete();
    return { body: { success: true } };
  }

  if (sub === "invites" && ctx.method === "POST") {
    need(role, "admin");
    const email = String(ctx.body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw httpError(400, "Geçerli bir e-posta adresi girin.");
    const inviteRole = INVITABLE.includes(ctx.body.role) ? ctx.body.role : "editor";
    if (rank(inviteRole) >= rank(role) && role !== "owner") throw httpError(403, "Kendi rolünüzden yüksek bir rol veremezsiniz.");
    const { plan } = await getPlan(db, ws.ownerId);
    const pending = (await db.collection("invites").where("workspaceId", "==", id).get()).docs.filter((d) => !d.data().usedAt).length;
    if (ws.memberIds.length + pending >= plan.members) throw httpError(402, `Planınız en fazla ${plan.members} üyeye izin veriyor.`, { code: "limit_reached", limit: plan.members });
    const token = randomBytes(24).toString("hex");
    await db.collection("invites").doc(token).set({ workspaceId: id, email, role: inviteRole, invitedBy: principal.uid, expiresAt: Date.now() + INVITE_TTL_MS, createdAt: FieldValue.serverTimestamp() });
    ctx.workspace = { id, role, planOwnerId: ws.ownerId, name: ws.name };
    await audit(ctx, "team.invite", email, { role: inviteRole });
    return { status: 201, body: { token, url: `${baseUrl()}/invite/${token}`, email, role: inviteRole } };
  }

  if (sub === "invites" && ctx.method === "DELETE") {
    need(role, "admin");
    const inv = await db.collection("invites").doc(String(subId || "")).get();
    if (!inv.exists || inv.data().workspaceId !== id) throw httpError(404, "Davet bulunamadı.");
    await inv.ref.delete();
    return { body: { success: true } };
  }

  if (sub === "members" && ctx.method === "PATCH") {
    need(role, "admin");
    const target = ws.members[subId];
    if (!target) throw httpError(404, "Üye bulunamadı.");
    if (target === "owner") throw httpError(403, "Sahibin rolü değiştirilemez.");
    if (!INVITABLE.includes(ctx.body.role)) throw httpError(400, "Geçersiz rol.");
    if (role !== "owner" && (rank(target) >= rank(role) || rank(ctx.body.role) >= rank(role))) throw httpError(403, "Bu rolü değiştirme yetkiniz yok.");
    await snap.ref.update({ [`members.${subId}`]: ctx.body.role });
    return { body: { success: true } };
  }

  if (sub === "members" && ctx.method === "DELETE") {
    const self = subId === principal.uid;
    if (!self) need(role, "admin");
    const target = ws.members[subId];
    if (!target) throw httpError(404, "Üye bulunamadı.");
    if (target === "owner") throw httpError(403, "Sahip çalışma alanından çıkarılamaz.");
    if (!self && role !== "owner" && rank(target) >= rank(role)) throw httpError(403, "Bu üyeyi çıkarma yetkiniz yok.");
    await snap.ref.update({ [`members.${subId}`]: FieldValue.delete(), [`profiles.${subId}`]: FieldValue.delete(), memberIds: FieldValue.arrayRemove(subId) });
    return { body: { success: true } };
  }
  return undefined;
}

/** POST /invites/accept { token } */
export async function handleInvites(ctx) {
  const [action] = ctx.segments;
  if (action !== "accept" || ctx.method !== "POST") return undefined;
  const { db, principal } = ctx;
  if (principal.via === "apikey") throw httpError(403, "Davetler yalnızca oturum açarak kabul edilebilir.");
  const token = String(ctx.body.token || "");
  if (!/^[a-f0-9]{48}$/.test(token)) throw httpError(404, "Davet bulunamadı veya süresi dolmuş.");
  const ref = db.collection("invites").doc(token);
  const snap = await ref.get();
  const inv = snap.exists ? snap.data() : null;
  if (!inv || inv.usedAt || inv.expiresAt < Date.now()) throw httpError(404, "Davet bulunamadı veya süresi dolmuş.");
  if (!principal.email || principal.email.toLowerCase() !== inv.email) {
    throw httpError(403, `Bu davet ${inv.email} adresi için oluşturuldu. Lütfen o hesapla giriş yapın.`, { code: "email_mismatch" });
  }
  const wsRef = db.collection("workspaces").doc(inv.workspaceId);
  const ws = await wsRef.get();
  if (!ws.exists) throw httpError(404, "Çalışma alanı artık mevcut değil.");
  await wsRef.update({
    [`members.${principal.uid}`]: inv.role,
    [`profiles.${principal.uid}`]: { email: principal.email, name: principal.name || "" },
    memberIds: FieldValue.arrayUnion(principal.uid),
  });
  await ref.update({ usedAt: Date.now(), usedBy: principal.uid });
  return { body: { workspace: { id: inv.workspaceId, name: ws.data().name, role: inv.role } } };
}
