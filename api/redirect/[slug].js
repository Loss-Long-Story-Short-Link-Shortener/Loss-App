import { waitUntil } from "@vercel/functions";
import { getFirebaseAdmin } from "../../server/lib/firebase.js";
import { buildClick, isBot, parseUserAgent, recordClick } from "../../server/lib/clicks.js";
import { requestHost, resolveLinkDomain } from "../../server/lib/hosts.js";
import { applyHeaders } from "../../server/lib/http.js";
import { MISS_TTL_MS, getCached, setCached } from "../../server/lib/linkCache.js";
import { isExpired, linkDocId, shortUrlFor } from "../../server/lib/links.js";
import { ogPage, passwordPage, statusPage } from "../../server/lib/pages.js";
import { clientIp, memoryLimit } from "../../server/lib/rateLimit.js";
import { isSafeRedirectTarget } from "../../server/lib/urlSafety.js";
import { dispatch } from "../../server/lib/webhooks.js";

const SLUG_SHAPE = /^[A-Za-z0-9_-]{1,48}$/;
const MISS_LIMIT = 60; // per-instance throttle on lookups that miss: makes slug scanning expensive
const SOCIAL_BOT = /facebookexternalhit|facebot|twitterbot|slackbot|linkedinbot|whatsapp|telegrambot|discordbot|pinterest|skypeuripreview|redditbot|embedly/i;

async function resolveLink(db, domain, slug) {
  const lower = slug.toLowerCase();
  const key = linkDocId(lower, domain);
  const cached = getCached(key);
  if (cached !== undefined) return cached;

  const links = db.collection("links");
  let snap = await links.doc(key).get();
  // Links created before slugs were normalised may be stored with mixed case.
  if (!snap.exists && slug !== lower) snap = await links.doc(linkDocId(slug, domain)).get();

  const result = snap.exists ? { id: snap.id, data: snap.data() } : null;
  setCached(key, result, result ? undefined : MISS_TTL_MS);
  return result;
}

function sendPage(response, status, html) {
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Robots-Tag", "noindex, nofollow");
  return response.status(status).send(html);
}

function sendFallback(response, url) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Robots-Tag", "noindex, nofollow");
  return response.redirect(302, url);
}

const notFound = (response) =>
  sendPage(response, 404, statusPage("404", "Bağlantı bulunamadı", "Aradığınız kısa bağlantı mevcut değil veya kaldırılmış."));

/** Device / country targeting: first matching geo rule, then OS rule, else the default destination. */
export function pickDestination(link, request) {
  const t = link.targets;
  if (!t) return link.destination;
  const country = String(request.headers["x-vercel-ip-country"] || request.headers["cf-ipcountry"] || "").toUpperCase();
  const geo = (t.geo || []).find((rule) => rule.country === country);
  if (geo && isSafeRedirectTarget(geo.url)) return geo.url;
  const { os } = parseUserAgent(request.headers["user-agent"] || "");
  if (os === "iOS" && t.ios && isSafeRedirectTarget(t.ios)) return t.ios;
  if (os === "Android" && t.android && isSafeRedirectTarget(t.android)) return t.android;
  return link.destination;
}

export default async function handler(request, response) {
  applyHeaders(response, request);
  if (request.method !== "GET" && request.method !== "HEAD") {
    return sendPage(response, 405, statusPage("405", "Desteklenmeyen istek", "Bu adres yalnızca GET isteklerini kabul eder."));
  }

  const slug = String(request.query.slug || "").trim();
  if (!SLUG_SHAPE.test(slug)) return notFound(response);

  let db;
  let link;
  let domain;
  try {
    ({ db } = await getFirebaseAdmin());
    domain = await resolveLinkDomain(db, requestHost(request));
    link = domain ? await resolveLink(db, domain, slug) : null;
  } catch (error) {
    console.error("Link lookup failed:", error);
    return sendPage(response, 503, statusPage("503", "Geçici bir sorun oluştu", "Bağlantı şu anda çözümlenemiyor. Lütfen birkaç saniye sonra tekrar deneyin."));
  }

  if (!link) {
    if (!memoryLimit(`miss:${clientIp(request)}`, MISS_LIMIT, 60_000).ok) {
      response.setHeader("Retry-After", "60");
      return sendPage(response, 429, statusPage("429", "Çok fazla istek", "Kısa bir süre sonra tekrar deneyin."));
    }
    return notFound(response);
  }

  const { id, data } = link;
  if (data.status === "disabled") {
    return sendPage(response, 410, statusPage("410", "Bağlantı kaldırıldı", "Bu bağlantı, kötüye kullanım bildirimi nedeniyle devre dışı bırakıldı."));
  }
  if (data.status !== "active") {
    return sendPage(response, 410, statusPage("410", "Bağlantı yayında değil", "Bu bağlantı sahibi tarafından duraklatılmış veya yayından kaldırılmış."));
  }
  // An expired or exhausted link can send visitors to a fallback destination instead of an error page.
  const fallback = data.fallbackUrl && isSafeRedirectTarget(data.fallbackUrl) ? data.fallbackUrl : null;
  if (isExpired(data)) {
    if (fallback) return sendFallback(response, fallback);
    return sendPage(response, 410, statusPage("410", "Bağlantının süresi dolmuş", "Bu bağlantının geçerlilik süresi sona ermiştir."));
  }
  if (data.maxClicks && (data.clickCount || 0) >= data.maxClicks) {
    if (fallback) return sendFallback(response, fallback);
    return sendPage(response, 410, statusPage("410", "Tıklama limiti doldu", "Bu bağlantı için belirlenen tıklama limitine ulaşıldı."));
  }
  if (!isSafeRedirectTarget(data.destination)) {
    return sendPage(response, 410, statusPage("410", "Bağlantı geçersiz", "Bu bağlantının hedefi güvenli olmadığı için açılamıyor."));
  }

  const userAgent = request.headers["user-agent"] || "";
  // Social crawlers get the custom preview card instead of a redirect.
  if (data.og && SOCIAL_BOT.test(userAgent)) {
    return sendPage(response, 200, ogPage({
      title: data.og.title || data.title || "", description: data.og.description || "", image: data.og.image || "",
      url: shortUrlFor(data), destination: data.destination,
    }));
  }

  if (data.password) return sendPage(response, 200, passwordPage(slug.toLowerCase()));

  const destination = pickDestination(data, request);

  // Count real visits only: not HEAD probes, link-preview fetchers or bots.
  if (request.method === "GET" && !isBot(userAgent)) {
    const source = request.query.qr ? "qr" : "link";
    const click = buildClick(request, data.ownerId, { source });
    waitUntil(
      recordClick(db, id, click)
        .then(() => dispatch(db, data.ownerId, "link.clicked", {
          id, slug: data.slug, shortUrl: shortUrlFor(data), destination, country: click.country, device: click.device, source,
        }))
        .catch((error) => console.error("Click logging failed:", error)),
    );
  }

  // no-store: every click reaches us (accurate analytics, instant edits/pauses).
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Robots-Tag", "noindex, nofollow");
  response.redirect([301, 302, 307].includes(data.redirectType) ? data.redirectType : 307, destination);
}

export const config = { runtime: "nodejs" };
