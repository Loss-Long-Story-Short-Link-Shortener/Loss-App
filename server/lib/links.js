import { randomInt } from "node:crypto";
import { httpError } from "./http.js";
import { hashPassword, validatePasswordInput } from "./password.js";
import { minimumTierFor } from "./plans.js";
import { isReservedSlug } from "./reserved.js";
import { validateDestination } from "./urlSafety.js";

export const SLUG_PATTERN = /^[a-z0-9_-]{3,48}$/;
export const LINK_ID_PATTERN = /^[a-z0-9.-]{3,253}__[A-Za-z0-9_-]{1,48}$/;
const AUTO_SLUG_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

export const STATUSES = ["active", "paused"]; // "disabled" is set only by moderators

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
export function validateSlug(value, { host = canonicalHost() } = {}) {
  const slug = String(value ?? "").trim().toLowerCase();
  if (slug.length < 3) return { ok: false, error: "Özel bağlantı adı en az 3 karakter olmalıdır." };
  if (slug.length > 48) return { ok: false, error: "Özel bağlantı adı en fazla 48 karakter olabilir." };
  if (!SLUG_PATTERN.test(slug)) {
    return { ok: false, error: "Özel bağlantı adı yalnızca harf, rakam, tire (-) ve alt çizgi (_) içerebilir." };
  }
  if (host === canonicalHost() && isReservedSlug(slug)) {
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

export function validateExpiry(value) {
  if (value === undefined || value === null || value === "") return { ok: true, value: "" };
  const ms = typeof value === "string" ? new Date(value).getTime() : NaN;
  if (!Number.isFinite(ms)) return { ok: false, error: "Geçersiz son kullanma tarihi." };
  if (ms <= Date.now()) return { ok: false, error: "Son kullanma tarihi gelecekte olmalıdır." };
  return { ok: true, value: new Date(ms).toISOString() };
}

export function shortUrlFor(data) {
  const host = data.domain || canonicalHost();
  return host === canonicalHost() ? `${baseUrl()}/${data.slug}` : `https://${host}/${data.slug}`;
}

/** Public representation of a link document (never leaks the password hash). */
export function serializeLink(id, data) {
  const { password, ...rest } = data;
  return {
    id,
    ...rest,
    tags: Array.isArray(data.tags) ? data.tags : data.tag ? [data.tag] : [],
    password: password ? "••••••" : "",
    hasPassword: Boolean(password),
    shortUrl: shortUrlFor(data),
  };
}

function gate(plan, feature, label) {
  if (!plan.features[feature]) {
    const tier = minimumTierFor(feature);
    throw httpError(403, `${label} özelliği ${tier === "agency" ? "Agency" : tier === "pro" ? "Pro" : "Starter"} ve üzeri paketlerde kullanılabilir.`, {
      code: "plan_required", feature, requiredPlan: tier,
    });
  }
}

function parseTags(value) {
  if (value === undefined) return undefined;
  const list = Array.isArray(value) ? value : String(value).split(",");
  const tags = [...new Set(list.map((t) => cleanText(t, 30).toLowerCase()).filter(Boolean))];
  if (tags.length > 10) throw httpError(400, "En fazla 10 etiket kullanılabilir.");
  return tags;
}

function parseOg(value, plan) {
  if (value === undefined) return undefined;
  if (!value || (!value.title && !value.description && !value.image)) return null;
  gate(plan, "socialPreview", "Sosyal medya önizlemesi");
  const og = { title: cleanText(value.title, 90), description: cleanText(value.description, 200), image: "" };
  if (value.image) {
    const img = validateDestination(String(value.image));
    if (!img.ok || !img.url.startsWith("https://")) throw httpError(400, "Önizleme görseli geçerli bir https adresi olmalıdır.");
    og.image = img.url;
  }
  return og;
}

function parseTargets(value, plan) {
  if (value === undefined) return undefined;
  const empty = !value || (!value.ios && !value.android && !(value.geo || []).length);
  if (empty) return null;
  gate(plan, "targeting", "Cihaz ve ülke hedefleme");
  const targets = { ios: "", android: "", geo: [] };
  for (const key of ["ios", "android"]) {
    if (value[key]) {
      const r = validateDestination(value[key]);
      if (!r.ok) throw httpError(400, `${key === "ios" ? "iOS" : "Android"} hedefi: ${r.error}`);
      targets[key] = r.url;
    }
  }
  const seen = new Set();
  for (const rule of (value.geo || []).slice(0, 20)) {
    const country = String(rule.country || "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) throw httpError(400, "Ülke kodu 2 harfli olmalıdır (örn. TR).");
    if (seen.has(country)) continue;
    seen.add(country);
    const r = validateDestination(rule.url);
    if (!r.ok) throw httpError(400, `${country} hedefi: ${r.error}`);
    targets.geo.push({ country, url: r.url });
  }
  return targets;
}

/**
 * Validate user input into document fields. Only keys present in `body` are
 * returned, so the same function serves create and partial update.
 */
export function parseLinkFields(body, plan, { requireDestination = false } = {}) {
  const fields = {};

  if (body.destination !== undefined || requireDestination) {
    const dest = validateDestination(body.destination);
    if (!dest.ok) throw httpError(400, dest.error);
    fields.destination = dest.url;
    fields._hostname = dest.hostname;
  }
  if (body.title !== undefined) fields.title = cleanText(body.title, 120);
  if (body.notes !== undefined) fields.notes = cleanText(body.notes, 500);
  if (body.folder !== undefined) fields.folder = cleanText(body.folder, 40);
  const tags = parseTags(body.tags !== undefined ? body.tags : body.tag);
  if (tags !== undefined) {
    fields.tags = tags;
    fields.tag = tags[0] || ""; // legacy single-tag field
  }

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw httpError(400, "Geçersiz bağlantı durumu.");
    fields.status = body.status;
  }

  if (body.password !== undefined && body.password !== "••••••") {
    const pw = validatePasswordInput(body.password);
    if (!pw.ok) throw httpError(400, pw.error);
    if (pw.value) gate(plan, "password", "Şifre koruması");
    fields.password = pw.value ? hashPassword(pw.value) : "";
  }

  if (body.expiresAt !== undefined) {
    const exp = validateExpiry(body.expiresAt);
    if (!exp.ok) throw httpError(400, exp.error);
    if (exp.value) gate(plan, "expiry", "Son kullanma tarihi");
    fields.expiresAt = exp.value;
  }

  if (body.maxClicks !== undefined) {
    if (body.maxClicks === null || body.maxClicks === "") fields.maxClicks = null;
    else {
      const n = Number(body.maxClicks);
      if (!Number.isInteger(n) || n < 1 || n > 1_000_000_000) throw httpError(400, "Tıklama limiti 1 veya daha büyük bir tam sayı olmalıdır.");
      gate(plan, "clickLimit", "Tıklama limiti");
      fields.maxClicks = n;
    }
  }

  if (body.fallbackUrl !== undefined) {
    if (!body.fallbackUrl) fields.fallbackUrl = "";
    else {
      gate(plan, "expiry", "Yedek hedef");
      const fb = validateDestination(body.fallbackUrl);
      if (!fb.ok) throw httpError(400, `Yedek hedef: ${fb.error}`);
      fields.fallbackUrl = fb.url;
    }
  }

  if (body.redirectType !== undefined) {
    const t = Number(body.redirectType);
    if (![301, 302, 307].includes(t)) throw httpError(400, "Yönlendirme türü 301, 302 veya 307 olmalıdır.");
    if (t !== 307) gate(plan, "redirectType", "Yönlendirme türü seçimi");
    fields.redirectType = t;
  }

  const og = parseOg(body.og, plan);
  if (og !== undefined) fields.og = og;
  const targets = parseTargets(body.targets, plan);
  if (targets !== undefined) fields.targets = targets;

  return fields;
}
