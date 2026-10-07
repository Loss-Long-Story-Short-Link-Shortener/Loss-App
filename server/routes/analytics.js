import { httpError } from "../lib/http.js";
import { LINK_ID_PATTERN } from "../lib/links.js";

// Upper bound on documents read per request: keeps one analytics view from
// becoming arbitrarily expensive on a viral link. `truncated` tells the UI.
const MAX_EVENTS = 20000;

const tally = (map, key) => { map[key] = (map[key] || 0) + 1; };
const top = (map, limit = 8) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, count]) => ({ name, count }));

export async function handle(ctx) {
  if (ctx.method !== "GET") throw httpError(405, "Method not allowed");
  const { db, workspace } = ctx;
  const { plan } = await ctx.plan();
  const days = Math.min(Math.max(parseInt(ctx.query.days, 10) || 30, 1), plan.analyticsDays);
  const since = new Date(Date.now() - days * 86400_000);

  let query;
  let linkId = null;
  if (ctx.query.scope === "workspace") {
    query = db.collectionGroup("clicks").where("ownerId", "==", workspace.id).where("createdAt", ">=", since);
  } else {
    linkId = String(ctx.query.id || "");
    if (!LINK_ID_PATTERN.test(linkId)) throw httpError(400, "Geçerli bir bağlantı kimliği gerekli.");
    const link = await db.collection("links").doc(linkId).get();
    if (!link.exists || link.data().ownerId !== workspace.id) throw httpError(404, "Bağlantı bulunamadı.");
    query = db.collection("links").doc(linkId).collection("clicks").where("createdAt", ">=", since);
  }

  const snap = await query.orderBy("createdAt", "desc").limit(MAX_EVENTS).get();

  const series = {};
  for (let i = 0; i < days; i++) series[new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10)] = 0;
  const devices = {}, browsers = {}, systems = {}, countries = {}, cities = {}, referrers = {}, sources = {}, perLink = {};
  const visitors = new Set();
  const recent = [];

  for (const doc of snap.docs) {
    const c = doc.data();
    const when = c.createdAt?.toDate?.();
    const day = when?.toISOString().slice(0, 10);
    if (day in series) series[day] += 1;
    if (c.visitorHash) visitors.add(`${day}:${c.visitorHash}`);
    tally(devices, c.device || "unknown");
    tally(browsers, c.browser || "Other");
    tally(systems, c.os || "Other");
    tally(countries, c.country || "XX");
    if (c.city) tally(cities, `${c.city}${c.country ? `, ${c.country}` : ""}`);
    tally(referrers, c.referer || "direct");
    tally(sources, c.source || "link");
    if (!linkId && c.linkId) perLink[c.linkId] = (perLink[c.linkId] || 0) + 1;
    if (recent.length < 12) recent.push({ at: when?.getTime() ?? null, country: c.country || "XX", city: c.city || "", device: c.device, browser: c.browser, referer: c.referer, source: c.source || "link", linkId: c.linkId || linkId });
  }

  return {
    body: {
      scope: linkId ? "link" : "workspace",
      id: linkId,
      days,
      maxDays: plan.analyticsDays,
      totalClicks: snap.size,
      uniqueVisitors: visitors.size,
      truncated: snap.size >= MAX_EVENTS,
      timeseries: Object.entries(series).sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, clicks]) => ({ date, clicks })),
      devices: top(devices), browsers: top(browsers), systems: top(systems), countries: top(countries),
      cities: top(cities), referrers: top(referrers), sources: top(sources),
      topLinks: linkId ? [] : top(perLink, 10).map(({ name, count }) => ({ id: name, count })),
      recent,
    },
  };
}
