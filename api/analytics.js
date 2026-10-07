import { allowCors, getFirebaseAdmin, handleApiError, httpError, requireUser, sendJson } from "./_firebase.js";
import { LINK_ID_PATTERN } from "./_lib/links.js";

const MAX_DAYS = 90;
// Upper bound on documents read per request so a viral link cannot make one
// analytics view arbitrarily expensive. `truncated` tells the UI when hit.
const MAX_EVENTS = 20000;

function tally(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function top(map, limit = 8) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

/** GET /api/analytics?id=<linkId>&days=30 — per-link click breakdown. */
export default async function handler(request, response) {
  allowCors(response, request);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed" });

  try {
    const user = await requireUser(request);
    const id = String(request.query.id || "");
    if (!LINK_ID_PATTERN.test(id)) throw httpError(400, "Geçerli bir bağlantı kimliği gerekli.");
    const days = Math.min(Math.max(parseInt(request.query.days, 10) || 30, 1), MAX_DAYS);

    const { db } = await getFirebaseAdmin();
    const linkRef = db.collection("links").doc(id);
    const link = await linkRef.get();
    if (!link.exists || link.data().ownerId !== user.uid) throw httpError(404, "Bağlantı bulunamadı.");

    const since = new Date(Date.now() - days * 86400_000);
    const snap = await linkRef
      .collection("clicks")
      .where("createdAt", ">=", since)
      .orderBy("createdAt", "desc")
      .select("createdAt", "visitorHash", "device", "browser", "os", "country", "referer")
      .limit(MAX_EVENTS)
      .get();

    const series = {};
    for (let i = 0; i < days; i++) series[new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10)] = 0;
    const devices = {}, browsers = {}, systems = {}, countries = {}, referrers = {};
    const visitors = new Set();

    for (const doc of snap.docs) {
      const c = doc.data();
      const day = c.createdAt?.toDate?.().toISOString().slice(0, 10);
      if (day in series) series[day] += 1;
      if (c.visitorHash) visitors.add(`${day}:${c.visitorHash}`);
      tally(devices, c.device || "unknown");
      tally(browsers, c.browser || "Other");
      tally(systems, c.os || "Other");
      tally(countries, c.country || "XX");
      tally(referrers, c.referer || "direct");
    }

    return sendJson(response, 200, {
      id,
      days,
      totalClicks: snap.size,
      uniqueVisitors: visitors.size,
      truncated: snap.size >= MAX_EVENTS,
      timeseries: Object.entries(series)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, clicks]) => ({ date, clicks })),
      devices: top(devices),
      browsers: top(browsers),
      systems: top(systems),
      countries: top(countries),
      referrers: top(referrers),
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}

export const config = { runtime: "nodejs" };
