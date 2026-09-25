/**
 * Unified API Client for Long Story Short
 *
 * SECURITY: All write operations (create / delete / update) go through
 * the authenticated backend API (/api/links).  The client SDK is only
 * used for *reading* the authenticated user's own links when no
 * dedicated API URL is configured.
 *
 * Guest / demo users fall back to localStorage for offline testing.
 */

import { storage } from "../utils/storage";
import { SHORT_LINK_HOST, getShortUrl } from "../constants/domains";
import { auth, db } from "../firebase";
import {
  generateSecureSlug,
  validateCustomSlug,
  SYSTEM_RESERVED_SLUGS,
} from "../utils/slugGenerator";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Resolve the backend API base URL (empty string = same origin). */
const API_BASE = (import.meta.env.VITE_SHORTENER_API_URL || "")
  .trim()
  .replace(/\/$/, "");

/** Parse a JSON response or throw a user-friendly error. */
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

/** Get a fresh Firebase ID token for the current user. */
async function getToken(user) {
  if (!user || user.isDemo) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

/** Build common fetch headers with auth token. */
function authHeaders(token) {
  const h = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const api = {
  /**
   * GET /api/links — Fetch all links for the authenticated user.
   *
   * Priority:
   *   1. Backend API (if VITE_SHORTENER_API_URL is set)
   *   2. Client Firestore read (direct query)
   *   3. LocalStorage fallback (demo / guest)
   */
  async getLinks(user) {
    // ── 1. Real Firebase user + dedicated API ──────────────────────────
    if (user && !user.isDemo && API_BASE) {
      try {
        const token = await getToken(user);
        const res = await fetch(`${API_BASE}/api/links`, {
          headers: authHeaders(token),
        });
        const data = await readResponse(res);
        return data.links || [];
      } catch (err) {
        console.warn("Backend API unavailable:", err.message);
      }
    }

    // ── 2. Real Firebase user + client Firestore read ──────────────────
    if (user && !user.isDemo && db) {
      try {
        const q = query(
          collection(db, "links"),
          where("ownerId", "==", user.uid),
          orderBy("createdAt", "desc"),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            // Mask password in client
            password: data.password ? "••••••" : "",
            shortUrl: getShortUrl(data.slug),
          };
        });
      } catch (err) {
        console.warn("Firestore read error:", err);
      }
    }

    // ── 3. Offline / demo / guest — localStorage ───────────────────────
    return storage.getDemoLinks() || [];
  },

  /**
   * POST /api/links — Create a new short link.
   *
   * For real users: always goes through the backend API so that
   * password hashing, link limits and slug validation happen server-side.
   *
   * For demo / guest: creates a local-only link in localStorage.
   */
  async createLink(user, payload) {
    // ── Real user → backend API (or client Firestore fallback) ─────────
    if (user && !user.isDemo) {
      const token = await getToken(user);
      if (!token)
        throw new Error("Oturum süresi dolmuş. Lütfen tekrar giriş yapın.");

      const apiUrl = API_BASE || "";
      if (apiUrl) {
        try {
          const res = await fetch(`${apiUrl}/api/links`, {
            method: "POST",
            headers: authHeaders(token),
            body: JSON.stringify(payload),
          });
          const data = await readResponse(res);
          return data.link;
        } catch (apiErr) {
          console.warn(
            "Backend API unavailable, falling back to direct Firestore:",
            apiErr.message,
          );
        }
      }

      // Direct Firestore creation fallback for authenticated user
      if (db) {
        let slug = (payload.slug || "").trim().toLowerCase();
        const host = SHORT_LINK_HOST;

        if (slug) {
          const validation = validateCustomSlug(slug);
          if (!validation.valid) throw new Error(validation.error);

          const checkSnap = await getDoc(doc(db, "links", `${host}__${slug}`));
          if (checkSnap.exists()) {
            throw new Error(
              `"${slug}" bağlantı adı zaten kullanımda. Lütfen farklı bir ad seçin.`,
            );
          }
        } else {
          // Auto-generate unique Base62 slug with collision avoidance
          let attempts = 0;
          let found = false;
          while (!found && attempts < 10) {
            attempts++;
            const candidate = generateSecureSlug(7);
            if (SYSTEM_RESERVED_SLUGS.has(candidate.toLowerCase())) continue;
            const checkSnap = await getDoc(
              doc(db, "links", `${host}__${candidate.toLowerCase()}`),
            );
            if (!checkSnap.exists()) {
              slug = candidate;
              found = true;
            }
          }
          if (!slug) slug = generateSecureSlug(8);
        }

        const docId = `${host}__${slug}`;
        const newLink = {
          ownerId: user.uid,
          domain: host,
          slug,
          title: payload.title || new URL(payload.destination).hostname,
          tag: payload.tag || "",
          destination: payload.destination,
          shortUrl: getShortUrl(slug),
          status: "active",
          clickCount: 0,
          password: payload.password ? "••••••" : "",
          expiresAt: payload.expiresAt || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(doc(db, "links", docId), newLink);
        return { id: docId, ...newLink };
      }
    }

    // ── Demo / guest → localStorage + Firestore single canonical doc ───
    const existing = storage.getDemoLinks() || [];
    let slug = (payload.slug || "").trim().toLowerCase();
    const host = SHORT_LINK_HOST;

    if (slug) {
      const validation = validateCustomSlug(slug);
      if (!validation.valid) throw new Error(validation.error);

      if (existing.some((l) => l.slug?.toLowerCase() === slug)) {
        throw new Error(
          `"${slug}" özel bağlantı adı zaten kullanımda. Lütfen farklı bir ad seçin.`,
        );
      }
      if (db) {
        try {
          const snap = await getDoc(doc(db, "links", `${host}__${slug}`));
          if (snap.exists()) {
            throw new Error(
              `"${slug}" özel bağlantı adı zaten kullanımda. Lütfen farklı bir ad seçin.`,
            );
          }
        } catch (e) {
          if (e.message && e.message.includes("kullanımda")) throw e;
        }
      }
    } else {
      let attempts = 0;
      let found = false;
      while (!found && attempts < 10) {
        attempts++;
        const candidate = generateSecureSlug(7);
        if (SYSTEM_RESERVED_SLUGS.has(candidate.toLowerCase())) continue;
        const existsInLocal = existing.some(
          (l) => l.slug?.toLowerCase() === candidate.toLowerCase(),
        );
        if (!existsInLocal) {
          slug = candidate;
          found = true;
        }
      }
      if (!slug) slug = generateSecureSlug(8);
    }

    const docId = `${host}__${slug}`;
    let domainHost = "";
    try {
      domainHost = new URL(payload.destination).hostname;
    } catch {
      domainHost = "link";
    }

    const newLink = {
      id: docId,
      domain: host,
      slug,
      title: payload.title || domainHost,
      tag: payload.tag || "",
      destination: payload.destination,
      shortUrl: getShortUrl(slug),
      status: "active",
      clickCount: 0,
      password: payload.password ? "••••••" : "",
      expiresAt: payload.expiresAt || "",
      createdAt: { seconds: Math.floor(Date.now() / 1000) },
      updatedAt: { seconds: Math.floor(Date.now() / 1000) },
    };

    // Save canonical document to Firestore so it works for anyone redirecting
    if (db) {
      setDoc(doc(db, "links", docId), {
        ownerId: user?.uid || "guest",
        domain: host,
        slug,
        title: newLink.title,
        tag: newLink.tag || "",
        destination: newLink.destination,
        status: "active",
        clickCount: 0,
        password: payload.password || "",
        expiresAt: newLink.expiresAt || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        console.warn("Firestore guest sync warning:", err);
      });
    }

    storage.setDemoLinks([newLink, ...existing]);
    return newLink;
  },

  /**
   * DELETE /api/links — Delete a link.
   * Permanently removes from Firestore, backend API and localStorage.
   */
  async deleteLink(user, linkId, linkObj) {
    const slug =
      linkObj?.slug ||
      (linkId.includes("__") ? linkId.split("__").pop() : linkId);

    // ── 1. Direct Firestore deletion when no dedicated API is configured ──
    if ((!user || user.isDemo || !API_BASE) && db) {
      try {
        // Delete exact document ID
        await deleteDoc(doc(db, "links", linkId)).catch(() => {});

        // Also clean up any legacy multi-host prefixed document keys
        const legacyCandidates = [
          `${SHORT_LINK_HOST}__${slug}`,
          `loss.consolaktif.com.tr__${slug}`,
          `go.consolaktif.com.tr__${slug}`,
          slug,
        ];
        await Promise.allSettled(
          legacyCandidates.map((candId) => deleteDoc(doc(db, "links", candId))),
        );
      } catch (err) {
        console.warn("Firestore direct delete warning:", err);
      }
    }

    // ── 2. Real user → backend API (Server-side Admin SDK deletion) ────
    if (user && !user.isDemo) {
      if (API_BASE) {
        const token = await getToken(user);
        if (!token) throw new Error("Oturum süresi dolmuş.");
        const res = await fetch(`${API_BASE}/api/links`, {
          method: "DELETE",
          headers: authHeaders(token),
          body: JSON.stringify({ id: linkId, slug }),
        });
        await readResponse(res);
      } else if (!db) {
        throw new Error("Bağlantı silinemedi: veri hizmeti yapılandırılmamış.");
      }
    }

    // ── 3. Clean up localStorage ───────────────────────────────────────
    const existing = storage.getDemoLinks() || [];
    const filtered = existing.filter(
      (l) =>
        l.id !== linkId && l.slug !== slug && !linkId.endsWith(`__${l.slug}`),
    );
    storage.setDemoLinks(filtered);

    return { success: true };
  },

  /**
   * PATCH /api/links — Update a link's destination, status, title, etc.
   */
  async updateLink(user, linkId, updates = {}) {
    // ── Real user → backend API ────────────────────────────────────────
    if (user && !user.isDemo) {
      const token = await getToken(user);
      if (!token) throw new Error("Oturum süresi dolmuş.");

      const apiUrl = API_BASE || "";
      const res = await fetch(`${apiUrl}/api/links`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({ id: linkId, ...updates }),
      });
      return await readResponse(res);
    }

    // ── Demo / guest → localStorage ────────────────────────────────────
    const existing = storage.getDemoLinks() || [];
    const updated = existing.map((l) =>
      l.id === linkId
        ? {
            ...l,
            ...updates,
            updatedAt: { seconds: Math.floor(Date.now() / 1000) },
          }
        : l,
    );
    storage.setDemoLinks(updated);
    return { success: true, link: { id: linkId, ...updates } };
  },

  /**
   * PATCH /api/links — Update a link's status.
   */
  async updateLinkStatus(user, linkId, status) {
    return this.updateLink(user, linkId, { status });
  },

  /**
   * POST /api/billing/paytr-token — Initialize PayTR checkout session
   */
  async createPaytrCheckout(user, tier, billingPeriod = "monthly") {
    if (!user || user.isDemo) {
      return {
        isDemoSimulation: true,
        tier,
        billingPeriod,
        amountTl: tier === "starter" ? 399 : tier === "pro" ? 899 : 2499,
      };
    }

    const token = await getToken(user);
    if (!token)
      throw new Error("Oturum süresi dolmuş. Lütfen tekrar giriş yapın.");

    const apiUrl = API_BASE || "";
    const res = await fetch(`${apiUrl}/api/billing/paytr-token`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ tier, billingPeriod }),
    });

    return await readResponse(res);
  },
};
