import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { clientIp } from "./rateLimit.js";

const BOT_PATTERN =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|curl\/|wget|python-requests|go-http-client|node-fetch|axios|monitor|uptime|lighthouse|pingdom/i;

export function isBot(userAgent = "") {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

export function parseUserAgent(ua = "") {
  const s = ua.toLowerCase();

  let device = "desktop";
  if (/ipad|tablet|(android(?!.*mobile))/i.test(s)) device = "tablet";
  else if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(s)) device = "mobile";

  let os = "Other";
  if (s.includes("windows")) os = "Windows";
  else if (s.includes("iphone") || s.includes("ipad") || s.includes("ios")) os = "iOS";
  else if (s.includes("mac os") || s.includes("macintosh")) os = "macOS";
  else if (s.includes("android")) os = "Android";
  else if (s.includes("linux")) os = "Linux";

  let browser = "Other";
  if (s.includes("edg/")) browser = "Edge";
  else if (s.includes("opr/") || s.includes("opera")) browser = "Opera";
  else if (s.includes("chrome") || s.includes("crios")) browser = "Chrome";
  else if (s.includes("safari")) browser = "Safari";
  else if (s.includes("firefox") || s.includes("fxios")) browser = "Firefox";

  return { device, os, browser };
}

export function parseReferrer(ref = "") {
  if (!ref) return "direct";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "").toLowerCase();
    if (host.endsWith("instagram.com")) return "instagram.com";
    if (host === "t.co" || host.endsWith("twitter.com") || host === "x.com") return "x.com";
    if (host.endsWith("linkedin.com") || host === "lnkd.in") return "linkedin.com";
    if (host.endsWith("facebook.com") || host === "fb.me") return "facebook.com";
    if (host.endsWith("youtube.com") || host === "youtu.be") return "youtube.com";
    if (/(^|\.)google\./.test(host)) return "google.com";
    if (host.endsWith("tiktok.com")) return "tiktok.com";
    return host.slice(0, 80);
  } catch {
    return "other";
  }
}

// Daily rotating salt: visitor hashes cannot be linked across days.
export function dailySalt(date = new Date()) {
  const secret =
    process.env.SALT_SECRET ||
    createHash("sha256")
      .update(`${process.env.FIREBASE_PRIVATE_KEY_BASE64 || process.env.FIREBASE_PRIVATE_KEY || "loss"}`)
      .digest("hex");
  return createHash("sha256").update(`${date.toISOString().slice(0, 10)}::${secret}`).digest("hex");
}

export function buildClick(request, ownerId, extra = {}) {
  const userAgent = request.headers["user-agent"] || "";
  const visitorHash = createHash("sha256")
    .update(`${clientIp(request)}:${userAgent}:${dailySalt()}:${ownerId || ""}`)
    .digest("hex")
    .slice(0, 16);
  const countryHeader = request.headers["x-vercel-ip-country"] || request.headers["cf-ipcountry"] || "";
  const rawCity = request.headers["x-vercel-ip-city"] || "";
  let city = "";
  try {
    city = decodeURIComponent(rawCity).slice(0, 60);
  } catch {
    city = "";
  }
  const lang = String(request.headers["accept-language"] || "").split(",")[0].split(";")[0].trim().slice(0, 12).toLowerCase();
  return {
    ownerId: ownerId || "",
    visitorHash,
    city,
    lang,
    ...parseUserAgent(userAgent),
    country: /^[A-Za-z]{2}$/.test(countryHeader) ? countryHeader.toUpperCase() : "XX",
    referer: parseReferrer(request.headers.referer || ""),
    ...extra,
  };
}

export async function recordClick(db, linkId, click) {
  const ref = db.collection("links").doc(linkId);
  await Promise.allSettled([
    ref.update({ clickCount: FieldValue.increment(1), lastClickedAt: FieldValue.serverTimestamp() }),
    ref.collection("clicks").add({ ...click, linkId, createdAt: FieldValue.serverTimestamp() }),
  ]);
}
