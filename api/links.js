import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import {
  allowCors,
  getFirebaseAdmin,
  handleApiError,
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
  if (!["GET", "POST", "PATCH", "DELETE"].includes(request.method)) {
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  try {
    const user = await requireUser(request);
    const { db } = await getFirebaseAdmin();
    const host = (process.env.SHORT_LINK_HOST || "go.consolaktif.com.tr")
      .trim()
      .toLowerCase();
    const baseUrl =
      process.env.SHORT_LINK_BASE_URL || "https://go.consolaktif.com.tr";

    // 1. GET: List user's links
    if (request.method === "GET") {
      const snapshot = await db
        .collection("links")
        .where("ownerId", "==", user.uid)
        .limit(100)
        .get();

      const userLinks = snapshot.docs
        .map((item) => {
          const data = item.data();
          return {
            id: item.id,
            ...data,
            shortUrl: `${baseUrl}/${data.slug}`,
          };
        })
        .sort(
          (first, second) =>
            (second.createdAt?.toMillis?.() || 0) -
            (first.createdAt?.toMillis?.() || 0),
        );
      return sendJson(response, 200, { links: userLinks });
    }

    // 2. DELETE: Delete a link
    if (request.method === "DELETE") {
      const { id, slug } = request.body || request.query || {};
      const targetId = id || (slug ? `${host}__${slug}` : null);
      if (!targetId) {
        return sendJson(response, 400, { error: "Link ID or slug is required" });
      }

      const linkRef = db.collection("links").doc(targetId);
      const existing = await linkRef.get();
      if (!existing.exists) {
        return sendJson(response, 404, { error: "Link not found" });
      }

      if (existing.data().ownerId !== user.uid) {
        return sendJson(response, 403, { error: "Permission denied" });
      }

      await linkRef.delete();
      return sendJson(response, 200, { success: true, id: targetId });
    }

    // 3. PATCH: Update status, title, or tags
    if (request.method === "PATCH") {
      const { id, slug, status, title, tag, password, expiresAt } = request.body || {};
      const targetId = id || (slug ? `${host}__${slug}` : null);
      if (!targetId) {
        return sendJson(response, 400, { error: "Link ID or slug is required" });
      }

      const linkRef = db.collection("links").doc(targetId);
      const existing = await linkRef.get();
      if (!existing.exists) {
        return sendJson(response, 404, { error: "Link not found" });
      }

      if (existing.data().ownerId !== user.uid) {
        return sendJson(response, 403, { error: "Permission denied" });
      }

      const updates = { updatedAt: FieldValue.serverTimestamp() };
      if (status !== undefined) updates.status = status;
      if (title !== undefined) updates.title = title;
      if (tag !== undefined) updates.tag = tag;
      if (password !== undefined) updates.password = password;
      if (expiresAt !== undefined) updates.expiresAt = expiresAt;

      await linkRef.update(updates);
      const updatedSnapshot = await linkRef.get();
      return sendJson(response, 200, {
        link: {
          id: targetId,
          ...updatedSnapshot.data(),
          shortUrl: `${baseUrl}/${updatedSnapshot.data().slug}`,
        },
      });
    }

    // 4. POST: Create a new link
    const { destination, slug: requestedSlug, title, tag, password, expiresAt } =
      request.body || {};
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
    if (slug.length < 3) {
      return sendJson(response, 400, {
        error: "Slug must contain at least 3 characters",
      });
    }

    const id = `${host}__${slug}`;
    const linkRef = db.collection("links").doc(id);
    const existing = await linkRef.get();
    if (existing.exists) {
      return sendJson(response, 409, { error: "This slug is already in use" });
    }

    const link = {
      ownerId: user.uid,
      domain: host,
      slug,
      title: title || destinationUrl.hostname,
      tag: tag || "",
      password: password || "",
      expiresAt: expiresAt || "",
      destination: destinationUrl.toString(),
      status: "active",
      clickCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await linkRef.set(link);
    const savedLink = await linkRef.get();

    return sendJson(response, 201, {
      link: {
        id,
        ...savedLink.data(),
        shortUrl: `${baseUrl}/${slug}`,
      },
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}

export const config = { runtime: "nodejs" };
