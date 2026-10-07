import { allowCors, getFirebaseAdmin, handleApiError, httpError, requireUser, sendJson } from "../_firebase.js";

/** POST /api/billing/cancel — stop renewal; the paid plan stays active until the period ends. */
export default async function handler(request, response) {
  allowCors(response, request);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed" });

  try {
    const user = await requireUser(request);
    const { db } = await getFirebaseAdmin();
    const ref = db.collection("users").doc(user.uid);
    const snap = await ref.get();
    const status = snap.data()?.subscription?.status;
    if (status !== "active" && status !== "past_due") throw httpError(400, "İptal edilecek aktif bir abonelik bulunmuyor.");
    await ref.update({ "subscription.cancelAtPeriodEnd": true });
    return sendJson(response, 200, { success: true });
  } catch (error) {
    return handleApiError(response, error);
  }
}

export const config = { runtime: "nodejs" };
