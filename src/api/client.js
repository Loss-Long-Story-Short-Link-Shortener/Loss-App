/**
 * API client for Long Story Short.
 *
 * Signed-in users talk exclusively to the authenticated backend (/api/*): the
 * server validates URLs, hashes passwords, enforces plan limits and counts
 * clicks. The browser never writes link documents itself.
 *
 * Demo workspace users (no account) keep their links in localStorage only;
 * those links are never sent to a server and never redirect for other people.
 */

import { storage } from "../utils/storage";
import { SHORT_LINK_HOST, getShortUrl } from "../constants/domains";
import { generateSecureSlug, validateCustomSlug } from "../utils/slugGenerator";

/** Backend base URL (empty string = same origin). */
const API_BASE = (import.meta.env.VITE_SHORTENER_API_URL || "")
  .trim()
  .replace(/\/$/, "");

const PAGE_SIZE = 500;
const MAX_PAGES = 10;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readResponse(res) {
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(
      res.ok
        ? "Sunucu yanıtı okunamadı."
        : `Sunucuya ulaşılamadı (${res.status}). Lütfen tekrar deneyin.`,
      res.status,
    );
  }
  if (!res.ok) {
    throw new ApiError(json.error || `İstek başarısız oldu (${res.status})`, res.status);
  }
  return json;
}

async function request(user, path, { method = "GET", body } = {}) {
  let token;
  try {
    token = await user.getIdToken();
  } catch {
    throw new ApiError("Oturum süresi dolmuş. Lütfen tekrar giriş yapın.", 401);
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Ağ bağlantısı kurulamadı. İnternet bağlantınızı kontrol edin.", 0);
  }
  return readResponse(res);
}

const isDemo = (user) => !user || user.isDemo;
const nowStamp = () => ({ seconds: Math.floor(Date.now() / 1000) });

// ─── Demo workspace (localStorage only) ─────────────────────────────────────

function createDemoLink(payload) {
  const existing = storage.getDemoLinks() || [];
  let slug = (payload.slug || "").trim().toLowerCase();

  if (slug) {
    const validation = validateCustomSlug(slug);
    if (!validation.valid) throw new ApiError(validation.error, 400);
    if (existing.some((l) => l.slug?.toLowerCase() === slug)) {
      throw new ApiError(`"${slug}" bağlantı adı zaten kullanımda. Lütfen farklı bir ad seçin.`, 409);
    }
  } else {
    do {
      slug = generateSecureSlug(8).toLowerCase();
    } while (existing.some((l) => l.slug === slug));
  }

  let hostname = "link";
  try {
    hostname = new URL(payload.destination).hostname;
  } catch {
    throw new ApiError("Geçersiz hedef URL.", 400);
  }

  const link = {
    id: `${SHORT_LINK_HOST}__${slug}`,
    domain: SHORT_LINK_HOST,
    slug,
    title: payload.title || hostname,
    tag: payload.tag || "",
    destination: payload.destination,
    shortUrl: getShortUrl(slug),
    status: "active",
    clickCount: 0,
    password: payload.password ? "••••••" : "",
    hasPassword: Boolean(payload.password),
    // Demo links never leave this browser, so the demo password is kept locally to make the unlock page testable.
    demoPassword: payload.password || "",
    expiresAt: payload.expiresAt || "",
    createdAt: nowStamp(),
    updatedAt: nowStamp(),
    isDemo: true,
  };
  storage.setDemoLinks([link, ...existing]);
  return link;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const api = {
  /** All of the user's links (follows server pagination). */
  async getLinks(user) {
    if (isDemo(user)) return storage.getDemoLinks() || [];

    const all = [];
    let cursor = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (cursor) qs.set("cursor", cursor);
      const data = await request(user, `/api/links?${qs}`);
      all.push(...(data.links || []));
      cursor = data.nextCursor;
      if (!cursor) break;
    }
    return all;
  },

  async createLink(user, payload) {
    if (isDemo(user)) return createDemoLink(payload);
    const data = await request(user, "/api/links", { method: "POST", body: payload });
    return data.link;
  },

  async deleteLink(user, linkId) {
    if (isDemo(user)) {
      const remaining = (storage.getDemoLinks() || []).filter((l) => l.id !== linkId);
      storage.setDemoLinks(remaining);
      return { success: true };
    }
    return request(user, "/api/links", { method: "DELETE", body: { id: linkId } });
  },

  /** Returns the saved link so callers can reflect server-normalised values. */
  async updateLink(user, linkId, updates = {}) {
    if (isDemo(user)) {
      const links = (storage.getDemoLinks() || []).map((l) => {
        if (l.id !== linkId) return l;
        const next = { ...l, ...updates, updatedAt: nowStamp() };
        if (updates.password !== undefined) {
          next.hasPassword = Boolean(updates.password);
          next.password = updates.password ? "••••••" : "";
          next.demoPassword = updates.password || "";
        }
        return next;
      });
      storage.setDemoLinks(links);
      return links.find((l) => l.id === linkId);
    }
    const data = await request(user, "/api/links", { method: "PATCH", body: { id: linkId, ...updates } });
    return data.link;
  },

  updateLinkStatus(user, linkId, status) {
    return this.updateLink(user, linkId, { status });
  },

  /** Authoritative plan + usage. */
  getMe(user) {
    return request(user, "/api/me");
  },

  /** Per-link click breakdown (server aggregated). */
  getAnalytics(user, linkId, days = 30) {
    return request(user, `/api/analytics?id=${encodeURIComponent(linkId)}&days=${days}`);
  },

  createPaytrCheckout(user, tier, billingPeriod = "monthly") {
    return request(user, "/api/billing/paytr-token", { method: "POST", body: { tier, billingPeriod } });
  },

  cancelSubscription(user) {
    return request(user, "/api/billing/cancel", { method: "POST", body: {} });
  },
};
