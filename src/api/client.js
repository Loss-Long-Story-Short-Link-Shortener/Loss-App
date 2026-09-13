/**
 * Unified API Client for Long Story Short
 * Communicates with backend Vercel/Node functions or falls back to local storage in demo mode.
 */

import { INITIAL_DEMO_LINKS } from "./mockData";
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

export const api = {
  async getLinks(user) {
    // If demo mode or no active Firebase user
    if (!user || user.isDemo) {
      const stored = storage.getDemoLinks();
      if (!stored) {
        storage.setDemoLinks(INITIAL_DEMO_LINKS);
        return INITIAL_DEMO_LINKS;
      }
      return stored;
    }

    // Real Firebase user
    const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api/links`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await readResponse(res);
    return data.links || [];
  },

  async createLink(user, payload) {
    if (!user || user.isDemo) {
      const existing = (storage.getDemoLinks() || INITIAL_DEMO_LINKS);
      const host = "go.consolaktif.com.tr";
      const slug = payload.slug || Math.random().toString(36).substring(2, 8);
      
      const newLink = {
        id: `${host}__${slug}`,
        domain: host,
        slug,
        title: payload.title || new URL(payload.destination).hostname,
        tag: payload.tag || "",
        destination: payload.destination,
        shortUrl: `https://${host}/${slug}`,
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
      const existing = (storage.getDemoLinks() || INITIAL_DEMO_LINKS);
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
      const existing = (storage.getDemoLinks() || INITIAL_DEMO_LINKS);
      const updated = existing.map((l) =>
        l.id === linkId ? { ...l, status, updatedAt: { seconds: Math.floor(Date.now() / 1000) } } : l
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
