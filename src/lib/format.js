export function formatNumber(n, lang = "tr", compact = false) {
  const value = Number(n) || 0;
  return new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-US", compact ? { notation: "compact", maximumFractionDigits: 1 } : {}).format(value);
}

export function toMillis(value) {
  if (!value) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value.seconds === "number") return value.seconds * 1000;
  if (typeof value._seconds === "number") return value._seconds * 1000;
  if (typeof value.toMillis === "function") return value.toMillis();
  return null;
}

export function formatDate(value, lang = "tr", opts = { day: "numeric", month: "short", year: "numeric" }) {
  const ms = toMillis(value);
  if (ms === null) return "-";
  return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-GB", opts).format(ms);
}

export function formatDateTime(value, lang = "tr") {
  return formatDate(value, lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(value, lang = "tr") {
  const ms = toMillis(value);
  if (ms === null) return "-";
  const diff = (ms - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang === "tr" ? "tr" : "en", { numeric: "auto" });
  const steps = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, secs] of steps) if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  return rtf.format(Math.round(diff), "second");
}

export function formatMoney(tl, lang = "tr") {
  return new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-US", { style: "currency", currency: "TRY", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(tl);
}

export function countryName(code, lang = "tr") {
  if (!code || code === "XX") return lang === "tr" ? "Bilinmiyor" : "Unknown";
  try {
    return new Intl.DisplayNames([lang === "tr" ? "tr" : "en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

export function flag(code) {
  if (!/^[A-Z]{2}$/.test(code || "")) return "🌐";
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    el.remove();
    return ok;
  }
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function normalizeUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function isValidUrl(input) {
  try {
    const u = new URL(normalizeUrl(input));
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

export function downloadFile(name, content, type = "text/plain") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Minimal CSV parser/serializer (RFC 4180 quoting). */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  const src = String(text).replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === "," || c === ";") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

export function toCsv(rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

/** Append UTM parameters to a URL, replacing existing utm_* values. */
export function applyUtm(url, utm) {
  try {
    const u = new URL(normalizeUrl(url));
    for (const key of ["source", "medium", "campaign", "term", "content"]) {
      const value = (utm?.[key] || "").trim();
      if (value) u.searchParams.set(`utm_${key}`, value);
      else u.searchParams.delete(`utm_${key}`);
    }
    return u.toString();
  } catch {
    return url;
  }
}
