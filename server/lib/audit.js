import { FieldValue } from "firebase-admin/firestore";

/** Append an audit record. Never throws: auditing must not break the action. */
export async function audit(ctx, action, target = "", meta = {}) {
  try {
    await ctx.db.collection("audit").add({
      workspaceId: ctx.workspace.id,
      actor: { uid: ctx.principal.uid, email: ctx.principal.email || null },
      via: ctx.principal.via,
      action,
      target: String(target).slice(0, 200),
      meta,
      at: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.warn("audit write failed", error.message);
  }
}
