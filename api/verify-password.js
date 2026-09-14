import { FieldValue } from "firebase-admin/firestore";
import {
  allowCors,
  getFirebaseAdmin,
  handleApiError,
  sendJson,
} from "./_firebase.js";
import { verifyPassword } from "./links.js";

/**
 * POST /api/verify-password
 * Body: { slug: string, password: string }
 * Returns: { destination: string } on success, or 403/404 error.
 *
 * This endpoint is public (no auth required) — it serves redirect-page
 * visitors who need to unlock a password-protected link.
 */
export default async function handler(request, response) {
  allowCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "POST") {
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  try {
    const { slug, password } = request.body || {};
    if (!slug || !password) {
      return sendJson(response, 400, {
        error: "slug and password are required",
      });
    }

    const { db } = await getFirebaseAdmin();
    const host = (process.env.SHORT_LINK_HOST || "loss.tr")
      .trim()
      .toLowerCase();

    // Look up the link by canonical ID
    const linkRef = db.collection("links").doc(`${host}__${slug}`);
    const snapshot = await linkRef.get();

    if (!snapshot.exists) {
      return sendJson(response, 404, { error: "Link not found" });
    }

    const link = snapshot.data();

    if (link.status !== "active") {
      return sendJson(response, 410, { error: "Link is no longer active" });
    }

    if (!link.password) {
      // Link is not password-protected — just return the destination
      return sendJson(response, 200, { destination: link.destination });
    }

    // Verify the password hash
    if (!verifyPassword(password, link.password)) {
      return sendJson(response, 403, { error: "Incorrect password" });
    }

    // Increment click count (fire-and-forget)
    linkRef
      .update({
        clickCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      })
      .catch(() => {});

    // Record click event (fire-and-forget)
    linkRef
      .collection("clicks")
      .add({
        createdAt: FieldValue.serverTimestamp(),
        userAgent: request.headers["user-agent"] || null,
        referer: request.headers.referer || null,
        type: "password-unlock",
      })
      .catch(() => {});

    return sendJson(response, 200, { destination: link.destination });
  } catch (error) {
    return handleApiError(response, error);
  }
}

export const config = { runtime: "nodejs" };
