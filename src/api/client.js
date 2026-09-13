/**
 * Unified API Client for Long Story Short
 * Communicates with backend Vercel/Node functions or local storage.
 * Strictly zero fake/mock links: only links created by the user are stored.
 */

import { storage } from "../utils/storage";
import { db } from "../firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

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
    // If real Firebase user and db is connected
    if (user && !user.isDemo && db && !API_BASE) {
      try {
        const q = query(collection(db, "links"), where("ownerId", "==", user.uid));
        const snap = await getDocs(q);
        const userLinks = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            shortUrl: `https://loss.tr/${data.slug}`,
          };
        });
        if (userLinks.length > 0) {
          return userLinks;
        }
      } catch (err) {
        console.warn("Firestore query error:", err);
      }
    }

    // If backend API URL is configured
    if (user && !user.isDemo && API_BASE) {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/api/links`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await readResponse(res);
        return data.links || [];
      } catch (err) {
        console.warn("Backend API unavailable, using local library:", err.message);
      }
    }

    // Fallback to local storage
    const stored = storage.getDemoLinks();
    const cleaned = cleanStoredLinks(stored || []);
    if (stored && cleaned.length !== stored.length) {
      storage.setDemoLinks(cleaned);
    }
    return cleaned;
  },

  async createLink(user, payload) {
    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    const host = "loss.tr";

    let slug = (payload.slug || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");
    if (!slug) {
      slug = Math.random().toString(36).substring(2, 8);
    }

    const existing = cleanStoredLinks(storage.getDemoLinks() || []);
    if (existing.some((l) => l.slug?.toLowerCase() === slug)) {
      throw new Error(
        `"${slug}" özel bağlantı adı zaten kullanımda. Lütfen farklı bir ad seçin.`
      );
    }

    const shortUrl = `https://${host}/${slug}`;

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

    // Save to Firestore so it works everywhere for real
    if (db) {
      try {
        const linkData = {
          ownerId: user?.uid || "guest",
          domain: host,
          slug,
          title: newLink.title,
          tag: newLink.tag || "",
          destination: newLink.destination,
          status: "active",
          clickCount: 0,
          password: newLink.password || "",
          expiresAt: newLink.expiresAt || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await Promise.all([
          setDoc(doc(db, "links", `loss.tr__${slug}`), linkData),
          setDoc(doc(db, "links", `loss.consolaktif.com.tr__${slug}`), linkData),
          setDoc(doc(db, "links", `go.consolaktif.com.tr__${slug}`), linkData),
        ]);
      } catch (err) {
        console.warn("Firestore sync warning:", err);
      }
    }

    const updated = [newLink, ...existing];
    storage.setDemoLinks(updated);
    return newLink;
  },

  async deleteLink(user, linkId) {
    const existing = cleanStoredLinks(storage.getDemoLinks() || []);
    const updated = existing.filter((l) => l.id !== linkId);
    storage.setDemoLinks(updated);

    // Delete from Firestore across candidate hosts
    if (db) {
      try {
        const slug = linkId.includes("__") ? linkId.split("__").pop() : linkId;
        await Promise.all([
          deleteDoc(doc(db, "links", `loss.tr__${slug}`)),
          deleteDoc(doc(db, "links", `loss.consolaktif.com.tr__${slug}`)),
          deleteDoc(doc(db, "links", `go.consolaktif.com.tr__${slug}`)),
        ]);
      } catch (err) {
        console.warn("Firestore delete warning:", err);
      }
    }

    return { success: true };
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
