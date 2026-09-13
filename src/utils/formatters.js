/**
 * Utility formatters for numbers, dates, slugs and URLs
 */

export function formatNumber(num) {
  if (num === null || num === undefined) return "0";
  const n = Number(num);
  if (isNaN(n)) return "0";
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (n >= 1_000) {
    return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return n.toLocaleString("tr-TR");
}

export function formatDate(timestamp) {
  if (!timestamp) return "Yeni";
  let date;
  if (typeof timestamp === "object" && timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else if (typeof timestamp === "number" || typeof timestamp === "string") {
    date = new Date(timestamp);
  } else {
    return "Yeni";
  }

  if (isNaN(date.getTime())) return "Yeni";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatTimeAgo(timestamp) {
  if (!timestamp) return "az önce";
  let time;
  if (typeof timestamp === "object" && timestamp.seconds) {
    time = timestamp.seconds * 1000;
  } else {
    time = new Date(timestamp).getTime();
  }

  const diffMs = Date.now() - time;
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;
  if (hours < 24) return `${hours} saat önce`;
  if (days < 30) return `${days} gün önce`;
  return formatDate(timestamp);
}

export function sanitizeSlug(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function normalizeUrl(input) {
  let trimmed = String(input || "").trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

export function isValidUrl(input) {
  try {
    const url = new URL(normalizeUrl(input));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
