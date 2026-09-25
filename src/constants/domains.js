const configuredShortLinkHost = (
  import.meta.env.VITE_SHORT_LINK_HOST || "loss.tr"
)
  .trim()
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "")
  .toLowerCase();

export const PANEL_HOST = (import.meta.env.VITE_PANEL_HOST || "panel.loss.tr")
  .trim()
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "")
  .toLowerCase();

export const SHORT_LINK_HOST = configuredShortLinkHost || "loss.tr";
export const SHORT_LINK_BASE_URL = `https://${SHORT_LINK_HOST}`;

export function getShortUrl(slug) {
  return `${SHORT_LINK_BASE_URL}/${String(slug || "").replace(/^\/+/, "")}`;
}
