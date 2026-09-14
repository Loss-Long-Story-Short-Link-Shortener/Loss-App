/**
 * LocalStorage wrapper with safe fallbacks.
 */

const STORAGE_KEYS = {
  THEME: "lss_theme",
  TIER: "lss_current_tier",
  DEMO_LINKS: "lss_demo_links",
  CUSTOM_DOMAIN: "lss_custom_domain",
  DEMO_USER: "lss_demo_user_active",
};

export const storage = {
  getTheme() {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.THEME) || "dark";
    } catch {
      return "dark";
    }
  },
  setTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {}
  },

  getTier() {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.TIER) || "free";
    } catch {
      return "free";
    }
  },
  setTier(tier) {
    try {
      window.localStorage.setItem(STORAGE_KEYS.TIER, tier);
    } catch {}
  },

  getDemoLinks() {
    try {
      const data = window.localStorage.getItem(STORAGE_KEYS.DEMO_LINKS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  },
  setDemoLinks(links) {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.DEMO_LINKS,
        JSON.stringify(links || []),
      );
    } catch (e) {
      console.error("Storage error:", e);
    }
  },

  incrementDemoClick(slug) {
    try {
      const links = this.getDemoLinks();
      const idx = links.findIndex(
        (l) => l.slug?.toLowerCase() === slug.toLowerCase()
      );
      if (idx !== -1) {
        links[idx].clickCount = (links[idx].clickCount || 0) + 1;
        this.setDemoLinks(links);
      }
    } catch {}
  },

  isDemoUser() {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.DEMO_USER) === "true";
    } catch {
      return false;
    }
  },
  setDemoUser(active) {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.DEMO_USER,
        active ? "true" : "false",
      );
    } catch {}
  },
};
