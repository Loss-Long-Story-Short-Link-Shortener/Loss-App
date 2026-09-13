/**
 * LocalStorage wrapper with fallback
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
    return window.localStorage.getItem(STORAGE_KEYS.THEME) || "light";
  },
  setTheme(theme) {
    window.localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  getTier() {
    return window.localStorage.getItem(STORAGE_KEYS.TIER) || "free";
  },
  setTier(tier) {
    window.localStorage.setItem(STORAGE_KEYS.TIER, tier);
  },

  getDemoLinks() {
    try {
      const data = window.localStorage.getItem(STORAGE_KEYS.DEMO_LINKS);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  setDemoLinks(links) {
    try {
      window.localStorage.setItem(STORAGE_KEYS.DEMO_LINKS, JSON.stringify(links));
    } catch (e) {
      console.error("Storage error:", e);
    }
  },

  isDemoUser() {
    return window.localStorage.getItem(STORAGE_KEYS.DEMO_USER) === "true";
  },
  setDemoUser(active) {
    window.localStorage.setItem(STORAGE_KEYS.DEMO_USER, active ? "true" : "false");
  },
};
