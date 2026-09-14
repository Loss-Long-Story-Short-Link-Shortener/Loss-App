import { randomBytes, createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import {
  allowCors,
  getFirebaseAdmin,
  handleApiError,
  requireUser,
  sendJson,
} from "./_firebase.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createSlug() {
  return randomBytes(4).toString("hex").slice(0, 6);
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

/**
 * Hash a password with SHA-256 + random salt.
 * Stored as "salt:hash" so we can verify later.
 */
function hashPassword(plaintext) {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(salt + plaintext)
    .digest("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plaintext password against a "salt:hash" stored value.
 */
export function verifyPassword(plaintext, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, expectedHash] = stored.split(":");
  const hash = createHash("sha256")
    .update(salt + plaintext)
    .digest("hex");
  return hash === expectedHash;
}

// Domains that should never be used as redirect destinations
const BLOCKED_DESTINATION_HOSTS = new Set([
  "loss.tr",
  "go.loss.tr",
  "loss.consolaktif.com.tr",
  "go.consolaktif.com.tr",
]);

// Reserved slugs that cannot be claimed
const RESERVED_SLUGS = new Set([
  "api",
  "app",
  "admin",
  "login",
  "register",
  "dashboard",
  "settings",
  "billing",
  "health",
  "ping",
  "_health",
]);

// Tier limits (mirrored from frontend constants/tiers.js)
const TIER_LIMITS = {
  free: 50,
  pro: 1500,
  enterprise: 50000,
};

function getCanonicalHost() {
  return (process.env.SHORT_LINK_HOST || "loss.tr").trim().toLowerCase();
}

function getBaseUrl(requestHost) {
  const host =
    requestHost && !requestHost.includes("localhost")
      ? requestHost
      : getCanonicalHost();
  const configuredBase = (
    process.env.SHORT_LINK_BASE_URL || "https://loss.tr"
  ).replace(/\/$/, "");
  return requestHost && !requestHost.includes("localhost")
    ? `https://${host}`
    : configuredBase;
}

function getRequestHost(request) {
  return (
    request.headers["x-forwarded-host"] ||
    request.headers.host ||
    ""
  )
    .split(",")[0]
    .trim()
    .toLowerCase();
}

// ─── Handler ────────────────────────────────────────────────────────────────

export default async function handler(request, response) {
  allowCors(response);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (!["GET", "POST", "PATCH", "DELETE"].includes(request.method)) {
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  try {
    const user = await requireUser(request);
    const { db } = await getFirebaseAdmin();
    const host = getCanonicalHost();
    const requestHost = getRequestHost(request);
    const baseUrl = getBaseUrl(requestHost);

    // ── GET: List user's links ─────────────────────────────────────────
    if (request.method === "GET") {
      const snapshot = await db
        .collection("links")
        .where("ownerId", "==", user.uid)
        .orderBy("createdAt", "desc")
        .limit(200)
        .get();

      const userLinks = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          ...data,
          // Never expose the raw password hash to the client
          password: data.password ? "••••••" : "",
          shortUrl: `${baseUrl}/${data.slug}`,
        };
      });

      return sendJson(response, 200, { links: userLinks });
    }

    // ── DELETE: Delete a link ──────────────────────────────────────────
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

    // ── PATCH: Update status, title, tag, password, expiresAt ─────────
    if (request.method === "PATCH") {
      const { id, slug, status, title, tag, password, expiresAt } =
        request.body || {};
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
      // Hash new password; empty string removes protection
      if (password !== undefined) {
        updates.password = password ? hashPassword(password) : "";
      }
      if (expiresAt !== undefined) updates.expiresAt = expiresAt;

      await linkRef.update(updates);
      const updatedSnapshot = await linkRef.get();
      const updatedData = updatedSnapshot.data();

      return sendJson(response, 200, {
        link: {
          id: targetId,
          ...updatedData,
          password: updatedData.password ? "••••••" : "",
          shortUrl: `${baseUrl}/${updatedData.slug}`,
        },
      });
    }

    // ── POST: Create a new link ────────────────────────────────────────
    const { destination, slug: requestedSlug, title, tag, password, expiresAt } =
      request.body || {};

    // Validate destination URL
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

    // Block self-referencing redirects (open redirect prevention)
    if (BLOCKED_DESTINATION_HOSTS.has(destinationUrl.hostname.toLowerCase())) {
      return sendJson(response, 400, {
        error: "Cannot create a short link pointing to this domain",
      });
    }

    // Validate and normalize slug
    const slug = normalizeSlug(requestedSlug) || createSlug();
    if (slug.length < 3) {
      return sendJson(response, 400, {
        error: "Slug must contain at least 3 characters",
      });
    }

    if (RESERVED_SLUGS.has(slug)) {
      return sendJson(response, 400, {
        error: "This slug is reserved and cannot be used",
      });
    }

    // ── Server-side link limit check ───────────────────────────────────
    // Count the user's existing links
    const countSnapshot = await db
      .collection("links")
      .where("ownerId", "==", user.uid)
      .count()
      .get();
    const currentCount = countSnapshot.data().count || 0;

    // Default to free tier limit; a real billing system would look up the user's tier
    const maxLinks = TIER_LIMITS.free;
    if (currentCount >= maxLinks) {
      return sendJson(response, 429, {
        error: `Plan kotanıza (${maxLinks} link) ulaştınız. Lütfen paketinizi yükseltin.`,
      });
    }

    // Check slug uniqueness
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
      password: password ? hashPassword(password) : "",
      expiresAt: expiresAt || "",
      destination: destinationUrl.toString(),
      status: "active",
      clickCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await linkRef.set(link);

    return sendJson(response, 201, {
      link: {
        id,
        ...link,
        password: link.password ? "••••••" : "",
        shortUrl: `${baseUrl}/${slug}`,
      },
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}

export const config = { runtime: "nodejs" };
