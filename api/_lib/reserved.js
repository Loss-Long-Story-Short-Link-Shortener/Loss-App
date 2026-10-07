// Slugs that must never be claimable as short links because they collide with
// application routes, API paths or well-known files. Keep in sync with
// src/utils/slugGenerator.js (SYSTEM_RESERVED_SLUGS).
export const RESERVED_SLUGS = new Set([
  "api", "app", "admin", "login", "logout", "register", "signup", "signin",
  "dashboard", "settings", "billing", "pricing", "links", "link", "analytics",
  "qr", "qrcodes", "domains", "health", "ping", "_health", "s", "short",
  "shortener", "link-shortener", "kisalt", "privacy", "terms", "docs",
  "support", "status", "static", "assets", "help", "about", "contact",
  "blog", "account", "auth", "robots", "robots-txt", "sitemap", "sitemap-xml",
  "favicon", "loss", "index", "www", "mail", "root", "null", "undefined",
]);

export function isReservedSlug(slug) {
  return RESERVED_SLUGS.has(String(slug || "").toLowerCase());
}
