import { randomInt } from "node:crypto";
import { isReservedSlug } from "./reserved.js";

export const SLUG_PATTERN = /^[a-z0-9_-]{3,48}$/;
export const LINK_ID_PATTERN = /^[a-z0-9.-]{3,100}__[A-Za-z0-9_-]{1,48}$/;
const AUTO_SLUG_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

export function canonicalHost() {
  return (process.env.SHORT_LINK_HOST || "loss.tr").trim().toLowerCase();
}

export function baseUrl() {
  return (process.env.SHORT_LINK_BASE_URL || `https://${canonicalHost()}`).replace(/\/$/, "");
}

export function linkDocId(slug, host = canonicalHost()) {
  return `${host}__${slug}`;
}

/** 8 lowercase base36 chars ≈ 2.8e12 combinations; case-insensitive so lookups are unambiguous. */
export function generateSlug(length = 8) {
  let out = "";
  for (let i = 0; i < length; i++) out += AUTO_SLUG_ALPHABET[randomInt(AUTO_SLUG_ALPHABET.length)];
  return out;
}

/** @returns {{ ok: true, slug: string } | { ok: false, error: string }} */
export function validateSlug(value) {
  const slug = String(value ?? "").trim().toLowerCase();
  if (slug.length < 3) return { ok: false, error: "Özel bağlantı adı en az 3 karakter olmalıdır." };
  if (slug.length > 48) return { ok: false, error: "Özel bağlantı adı en fazla 48 karakter olabilir." };
  if (!SLUG_PATTERN.test(slug)) {
    return { ok: false, error: "Özel bağlantı adı yalnızca harf, rakam, tire (-) ve alt çizgi (_) içerebilir." };
  }
  if (isReservedSlug(slug)) {
    return { ok: false, error: "Bu bağlantı adı sistem tarafından ayrılmıştır ve kullanılamaz." };
  }
  return { ok: true, slug };
}

export function cleanText(value, max) {
  if (value === undefined || value === null) return "";
  // eslint-disable-next-line no-control-regex
  return String(value).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

/** Parse the several shapes `expiresAt` has been stored in. Returns ms or null. */
export function expiryMillis(value) {
  if (!value) return null;
  let ms = null;
  if (typeof value === "string") ms = new Date(value).getTime();
  else if (typeof value === "number") ms = value;
  else if (typeof value.toMillis === "function") ms = value.toMillis();
  return Number.isFinite(ms) ? ms : null;
}

export function isExpired(link, now = Date.now()) {
  const ms = expiryMillis(link?.expiresAt);
  return ms !== null && now > ms;
}

/** Validate an optional expiry input. Empty string clears it. */
export function validateExpiry(value) {
  if (value === undefined || value === null || value === "") return { ok: true, value: "" };
  const ms = typeof value === "string" ? new Date(value).getTime() : NaN;
  if (!Number.isFinite(ms)) return { ok: false, error: "Geçersiz son kullanma tarihi." };
  if (ms <= Date.now()) return { ok: false, error: "Son kullanma tarihi gelecekte olmalıdır." };
  return { ok: true, value: new Date(ms).toISOString() };
}

/** Public representation of a link document (never leaks the password hash). */
export function serializeLink(id, data) {
  const { password, ...rest } = data;
  return {
    id,
    ...rest,
    password: password ? "••••••" : "",
    hasPassword: Boolean(password),
    shortUrl: `${baseUrl()}/${data.slug}`,
  };
}
