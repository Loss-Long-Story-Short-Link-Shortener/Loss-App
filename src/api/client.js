/**
 * Unified API Client for Long Story Short
 * Communicates with backend Vercel/Node functions or local storage.
 * Strictly zero fake/mock links: only links created by the user are stored.
 */

import { storage } from "../utils/storage";

const API_BASE = (import.meta.env.VITE_SHORTENER_API_URL || "")
  .trim()
  .replace(/\/$/, "");

async function readResponse(res) {
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Sunucu yanıtı okunamadı (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(json.error || `İstek başarısız oldu (${res.status})`);
  }
  return json;
}

// Filter out any stale mock demo links from older sessions
function cleanStoredLinks(links) {
  if (!Array.isArray(links)) return [];
  const fakeSlugs = new Set([
    "yaz-kampanyasi",
    "yeni-urun-lansmani",
    "yatirimci-sunumu",
    "newsletter-eylul",
    "discord-toplulugu",
  ]);
  return links.filter((l) => !fakeSlugs.has(l.slug));
}

export const api = {
  async getLinks(user) {
    // If guest or demo mode
    if (!user || user.isDemo) {
      const stored = storage.getDemoLinks();
      const cleaned = cleanStoredLinks(stored || []);
      if (stored && cleaned.length !== stored.length) {
        storage.setDemoLinks(cleaned);
      }
      return cleaned;
    }

    // Real Firebase user
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/links`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readResponse(res);
      return data.links || [];
    } catch (err) {
      console.warn("Backend API unavailable, using local library:", err.message);
      const stored = storage.getDemoLinks();
      return cleanStoredLinks(stored || []);
    }
  },

  async createLink(user, payload) {
    if (!user || user.isDemo) {
      const existing = cleanStoredLinks(storage.getDemoLinks() || []);
      const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");
      const host = isLocal ? window.location.host : "go.consolaktif.com.tr";

      let slug = (payload.slug || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");
      if (!slug) {
        slug = Math.random().toString(36).substring(2, 8);
      }

      // Check if custom slug is already used
      if (existing.some((l) => l.slug?.toLowerCase() === slug)) {
        throw new Error(
          `"${slug}" özel bağlantı adı zaten kullanımda. Lütfen farklı bir ad seçin.`
        );
      }

      const shortUrl = `${isLocal ? window.location.origin : "https://" + host}/${slug}`;

      const newLink = {
        id: `${host}__${slug}`,
        domain: host,
        slug,
        title: payload.title || new URL(payload.destination).hostname,
        tag: payload.tag || "",
        destination: payload.destination,
        shortUrl,
        status: "active",
        clickCount: 0,
        password: payload.password || "",
        expiresAt: payload.expiresAt || "",
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        updatedAt: { seconds: Math.floor(Date.now() / 1000) },
      };

      const updated = [newLink, ...existing];
      storage.setDemoLinks(updated);
      return newLink;
    }

    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api/links`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await readResponse(res);
    return data.link;
  },

  async deleteLink(user, linkId) {
    if (!user || user.isDemo) {
      const existing = cleanStoredLinks(storage.getDemoLinks() || []);
      const updated = existing.filter((l) => l.id !== linkId);
      storage.setDemoLinks(updated);
      return { success: true };
    }

    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api/links`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: linkId }),
    });
    return await readResponse(res);
  },

  async updateLinkStatus(user, linkId, status) {
    if (!user || user.isDemo) {
      const existing = cleanStoredLinks(storage.getDemoLinks() || []);
      const updated = existing.map((l) =>
        l.id === linkId
          ? {
              ...l,
              status,
              updatedAt: { seconds: Math.floor(Date.now() / 1000) },
            }
          : l
      );
      storage.setDemoLinks(updated);
      return { success: true, status };
    }

    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api/links`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: linkId, status }),
    });
    return await readResponse(res);
  },
};
