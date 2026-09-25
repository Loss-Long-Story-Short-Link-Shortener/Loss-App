import { randomBytes, createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import {
  allowCors,
  getFirebaseAdmin,
  handleApiError,
  requireUser,
  sendJson,
} from "./_firebase.js";
import { invalidateLinkCache } from "./redirect/[slug].js";

// ─── Helpers ────────────────────────────────────────────────────────────────

const BASE62_CHARSET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function createSlug(length = 7) {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += BASE62_CHARSET[bytes[i] % 62];
  }
  return result;
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
  "s",
  "shortener",
  "link-shortener",
]);

// Tier limits (Active Links Capacity mirrored from constants/tiers.js)
const TIER_LIMITS = {
  free: 25,
  starter: 500,
  pro: 2500,
  agency: 15000,
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
  return (request.headers["x-forwarded-host"] || request.headers.host || "")
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
        return sendJson(response, 400, {
          error: "Link ID or slug is required",
        });
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
      invalidateLinkCache(targetId);
      return sendJson(response, 200, { success: true, id: targetId });
    }

    // ── PATCH: Update status, destination, title, tag, password, expiresAt ───
    if (request.method === "PATCH") {
      const { id, slug, destination, status, title, tag, password, expiresAt } =
        request.body || {};
      const targetId = id || (slug ? `${host}__${slug}` : null);
      if (!targetId) {
        return sendJson(response, 400, {
          error: "Link ID or slug is required",
        });
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

      if (destination !== undefined) {
        let destinationUrl;
        try {
          destinationUrl = new URL(destination.trim());
          if (!["http:", "https:"].includes(destinationUrl.protocol)) {
            throw new Error("Invalid protocol");
          }
        } catch {
          return sendJson(response, 400, {
            error:
              "Geçersiz hedef URL. Lütfen geçerli bir http veya https adresi girin.",
          });
        }

        if (
          BLOCKED_DESTINATION_HOSTS.has(destinationUrl.hostname.toLowerCase())
        ) {
          return sendJson(response, 400, {
            error:
              "Bu hedef adresi güvenlik politikaları nedeniyle kullanılamaz.",
          });
        }
        updates.destination = destinationUrl.toString();
      }

      if (status !== undefined) updates.status = status;
      if (title !== undefined) updates.title = title;
      if (tag !== undefined) updates.tag = tag;
      // Hash new password; empty string removes protection
      if (password !== undefined) {
        updates.password = password ? hashPassword(password) : "";
      }
      if (expiresAt !== undefined) updates.expiresAt = expiresAt;

      await linkRef.update(updates);
      invalidateLinkCache(targetId);
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
    const {
      destination,
      slug: requestedSlug,
      title,
      tag,
      password,
      expiresAt,
    } = request.body || {};

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

    // Validate and normalize slug or auto-generate unique slug
    let slug = normalizeSlug(requestedSlug);
    if (slug) {
      if (slug.length < 3) {
        return sendJson(response, 400, {
          error: "Özel bağlantı adı en az 3 karakter olmalıdır.",
        });
      }

      if (RESERVED_SLUGS.has(slug)) {
        return sendJson(response, 400, {
          error:
            "Bu bağlantı adı sistem tarafından ayrılmıştır ve kullanılamaz.",
        });
      }

      // Check slug uniqueness for requested custom slug
      const id = `${host}__${slug}`;
      const linkRef = db.collection("links").doc(id);
      const existing = await linkRef.get();
      if (existing.exists) {
        return sendJson(response, 409, {
          error: `"${slug}" bağlantı adı zaten kullanımda. Lütfen farklı bir ad seçin.`,
        });
      }
    } else {
      // Auto-generate high-entropy Base62 slug with collision avoidance loop
      let attempts = 0;
      let uniqueFound = false;
      while (!uniqueFound && attempts < 10) {
        attempts++;
        const candidate = createSlug(7);
        if (RESERVED_SLUGS.has(candidate)) continue;
        const candidateId = `${host}__${candidate}`;
        const candidateDoc = await db
          .collection("links")
          .doc(candidateId)
          .get();
        if (!candidateDoc.exists) {
          slug = candidate;
          uniqueFound = true;
        }
      }
      if (!slug) {
        slug = createSlug(8);
      }
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

    const id = `${host}__${slug}`;

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
