/**
 * LocalStorage wrapper with safe fallbacks.
 * Forces dark mode and ensures zero fake links exist.
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
    return window.localStorage.getItem(STORAGE_KEYS.THEME) || "dark";
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
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      // Clean any old fake demo slugs
      const fakeSlugs = new Set([
        "yaz-kampanyasi",
        "yeni-urun-lansmani",
        "yatirimci-sunumu",
        "newsletter-eylul",
        "discord-toplulugu",
      ]);
      const cleaned = parsed.filter((l) => !fakeSlugs.has(l.slug));
      if (cleaned.length !== parsed.length) {
        window.localStorage.setItem(STORAGE_KEYS.DEMO_LINKS, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
    }
  },
  setDemoLinks(links) {
    try {
      window.localStorage.setItem(STORAGE_KEYS.DEMO_LINKS, JSON.stringify(links || []));
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
