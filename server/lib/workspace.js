import { httpError } from "./http.js";

export const ROLES = ["viewer", "editor", "admin", "owner"];
const rank = (role) => ROLES.indexOf(role);

/**
 * The workspace a request acts on. A user's personal workspace id equals their
 * uid (no document needed), so every pre-existing link — which has
 * ownerId = uid — already belongs to it. Team workspaces have ids "ws_…" and
 * store links with ownerId = workspace id.
 */
export async function resolveWorkspace(db, principal, requested) {
  if (principal.via === "apikey") {
    const id = principal.workspaceId;
    if (id === principal.uid) return { id, role: principal.role, planOwnerId: id, name: "Kişisel", personal: true };
    const snap = await db.collection("workspaces").doc(id).get();
    if (!snap.exists) throw httpError(404, "Çalışma alanı bulunamadı.");
    return { id, role: principal.role, planOwnerId: snap.data().ownerId, name: snap.data().name, personal: false };
  }

  if (!requested || requested === principal.uid) {
    return { id: principal.uid, role: "owner", planOwnerId: principal.uid, name: "Kişisel", personal: true };
  }
  if (!/^ws_[a-z0-9]{6,40}$/.test(requested)) throw httpError(400, "Geçersiz çalışma alanı.");
  const snap = await db.collection("workspaces").doc(requested).get();
  const role = snap.exists ? snap.data().members?.[principal.uid] : null;
  // Same answer for "missing" and "not a member": no enumeration.
  if (!role) throw httpError(404, "Çalışma alanı bulunamadı.");
  return { id: requested, role, planOwnerId: snap.data().ownerId, name: snap.data().name, personal: false };
}

export function requireRole(ctx, minimum) {
  if (rank(ctx.workspace.role) < rank(minimum)) {
    throw httpError(403, "Bu işlem için yetkiniz yok.", { code: "forbidden", requiredRole: minimum });
  }
}
