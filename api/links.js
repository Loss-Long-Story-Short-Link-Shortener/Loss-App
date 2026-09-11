import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import {
  allowCors,
  getFirebaseAdmin,
  requireUser,
  sendJson,
} from "./_firebase.js";

function createSlug() {
  return randomBytes(4).toString("base64url").slice(0, 7);
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export default async function handler(request, response) {
  allowCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (!["GET", "POST"].includes(request.method))
    return sendJson(response, 405, { error: "Method not allowed" });

  try {
    const user = await requireUser(request);
    const { db } = getFirebaseAdmin();
    const host = (process.env.SHORT_LINK_HOST || "go.consolaktif.com.tr")
      .trim()
      .toLowerCase();

    if (request.method === "GET") {
      const snapshot = await db
        .collection("links")
        .where("ownerId", "==", user.uid)
        .limit(100)
        .get();
      const userLinks = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort(
          (first, second) =>
            (second.createdAt?.toMillis?.() || 0) -
            (first.createdAt?.toMillis?.() || 0),
        );
      return sendJson(response, 200, { links: userLinks });
    }

    const { destination, slug: requestedSlug } = request.body || {};
    let destinationUrl;
    try {
      destinationUrl = new URL(destination);
    } catch {
      return sendJson(response, 400, {
        error: "Destination must be a valid URL",
      });
    }

    if (!/^https?:$/.test(destinationUrl.protocol)) {
      return sendJson(response, 400, {
        error: "Only HTTP and HTTPS destinations are supported",
      });
    }

    const slug = normalizeSlug(requestedSlug) || createSlug();
    if (slug.length < 3)
      return sendJson(response, 400, {
        error: "Slug must contain at least 3 characters",
      });

    const id = `${host}__${slug}`;
    const linkRef = db.collection("links").doc(id);
    const existing = await linkRef.get();
    if (existing.exists)
      return sendJson(response, 409, { error: "This slug is already in use" });

    const link = {
      ownerId: user.uid,
      domain: host,
      slug,
      destination: destinationUrl.toString(),
      status: "active",
      clickCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await linkRef.set(link);
    const savedLink = await linkRef.get();

    const baseUrl =
      process.env.SHORT_LINK_BASE_URL || "https://go.consolaktif.com.tr";
    return sendJson(response, 201, {
      link: {
        id,
        ...savedLink.data(),
        shortUrl: `${baseUrl}/${slug}`,
      },
    });
  } catch (error) {
    console.error(error);
    return sendJson(response, error.statusCode || 500, {
      error: error.statusCode
        ? error.message
        : "Unable to process link request",
    });
  }
}
