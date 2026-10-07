// Slugs that must never be claimable on the canonical host because they
// collide with application routes, API paths or well-known files.
export const RESERVED_SLUGS = new Set([
  "api", "app", "admin", "login", "logout", "register", "signup", "signin",
  "dashboard", "settings", "billing", "pricing", "links", "link", "analytics",
  "qr", "qrcodes", "domains", "health", "ping", "_health", "s", "short",
  "shortener", "link-shortener", "kisalt", "privacy", "terms", "docs",
  "support", "status", "static", "assets", "help", "about", "contact",
  "blog", "account", "auth", "robots", "robots-txt", "sitemap", "sitemap-xml",
  "favicon", "loss", "index", "www", "mail", "root", "null", "undefined",
  "abuse", "report", "features", "developers", "team", "invite", "unlock",
  "payment-result", "site", "webmanifest", "og-image", "icon", "apple-touch-icon",
]);

export function isReservedSlug(slug) {
  return RESERVED_SLUGS.has(String(slug || "").toLowerCase());
}
