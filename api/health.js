import { getFirebaseAdmin, handleApiError, sendJson } from "./_firebase.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  try {
    const { db } = await getFirebaseAdmin();
    await db.collection("_health").limit(1).get();
    return sendJson(response, 200, { ok: true, firebase: "connected" });
  } catch (error) {
    return handleApiError(response, error);
  }
}

export const config = { runtime: "nodejs" };
