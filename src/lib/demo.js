// Demo workspace: a browser-only stand-in for the REST API so the whole product
// can be explored without an account. Shapes mirror the real API. Nothing here
// ever leaves the browser, and demo short links do not resolve for anyone else.

import { PUBLIC_PLANS } from "./plans.js";

const KEY = "loss_demo_v2";
const BASE = "https://loss.tr";
const DAY = 86400_000;

function rng(seed) {
  let a = [...String(seed)].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 7);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const slugChars = "abcdefghijklmnopqrstuvwxyz0123456789";
const slug8 = () => Array.from({ length: 8 }, () => slugChars[Math.floor(Math.random() * 36)]).join("");
const uid = () => Math.random().toString(36).slice(2, 10);

function seedState() {
  const now = Date.now();
  const mk = (slug, title, destination, clicks, extra = {}) => ({
    id: `loss.tr__${slug}`, ownerId: "demo", createdBy: "demo", domain: "loss.tr", slug, title, destination, notes: "", folder: "", tags: [], tag: "",
    hasPassword: false, password: "", expiresAt: "", maxClicks: null, redirectType: 307, og: null, targets: null, status: "active", clickCount: clicks,
    createdAt: { seconds: Math.floor((now - (extra.age ?? 3) * DAY) / 1000) }, updatedAt: { seconds: Math.floor(now / 1000) }, shortUrl: `${BASE}/${slug}`, ...extra,
  });
  const links = [
    mk("yaz-kampanya", "Yaz kampanyası açılış sayfası", "https://shop.example.com/sezon-indirimleri?utm_source=instagram&utm_medium=bio&utm_campaign=yaz26", 18420, { tags: ["kampanya", "instagram"], folder: "Yaz 2026", age: 21 }),
    mk("menu", "Restoran QR menüsü", "https://restoran.example.com/menu", 9310, { tags: ["qr", "baskı"], folder: "Restoran", age: 60 }),
    mk("uygulama", "Mobil uygulamayı indir", "https://example.com/uygulama", 6204, { tags: ["uygulama"], folder: "Ürün", age: 45, targets: { ios: "https://apps.apple.com/app/id000000", android: "https://play.google.com/store/apps/details?id=com.example", geo: [] } }),
    mk("bulten", "Haftalık bülten aboneliği", "https://example.com/bulten", 2760, { tags: ["e-posta"], folder: "Pazarlama", age: 30 }),
    mk("lansman", "Ürün lansmanı etkinliği", "https://etkinlik.example.com/lansman-2026", 1984, { tags: ["etkinlik"], folder: "Yaz 2026", age: 9, expiresAt: new Date(now + 12 * DAY).toISOString(), og: { title: "Lansman 2026 - yerinizi ayırtın", description: "Yeni ürünümüzü ilk görenlerden olun.", image: "https://images.example.com/lansman.png" } }),
    mk("ozel-teklif", "Bayilere özel teklif", "https://example.com/bayi/teklif", 640, { tags: ["bayi"], folder: "Satış", hasPassword: true, password: "••••••", age: 14 }),
    mk("katalog", "2026 ürün kataloğu (PDF)", "https://cdn.example.com/katalog-2026.pdf", 512, { tags: ["katalog"], folder: "Satış", age: 80 }),
    mk("destek", "Destek merkezi", "https://destek.example.com", 388, { tags: ["destek"], folder: "Ürün", age: 120 }),
    mk("anket", "Müşteri memnuniyet anketi", "https://forms.example.com/anket", 205, { tags: ["anket"], folder: "Pazarlama", status: "paused", age: 18 }),
    mk("basin", "Basın kiti", "https://example.com/basin-kiti.zip", 96, { tags: ["basın"], age: 200 }),
  ];
  return {
    version: 2, plan: "agency", links,
    domains: [{ host: "go.markaniz.com", status: "verified", verifiedAt: now - 10 * DAY, attached: true, token: "loss-demo", instructions: null }],
    keys: [{ id: "k1", name: "Üretim sunucusu", prefix: "loss_demo1", role: "editor", createdAt: now - 12 * DAY, lastUsedAt: now - 3600_000 }],
    webhooks: [{ id: "w1", url: "https://hooks.markaniz.com/loss", events: ["link.created", "link.clicked"], active: true, secretPrefix: "whsec_demo", lastDelivery: { status: 200, type: "link.clicked", at: now - 1800_000 } }],
    members: [
      { uid: "demo", role: "owner", email: "demo@loss.tr", name: "Demo Kullanıcı" },
      { uid: "u2", role: "admin", email: "ayse@markaniz.com", name: "Ayşe Yılmaz" },
      { uid: "u3", role: "editor", email: "mert@markaniz.com", name: "Mert Kaya" },
    ],
    invites: [{ token: "demo-invite", email: "zeynep@markaniz.com", role: "viewer", expiresAt: now + 5 * DAY, url: `${BASE}/invite/demo-invite` }],
    audit: [
      { id: "a1", action: "link.create", target: "loss.tr__yaz-kampanya", actor: "ayse@markaniz.com", via: "firebase", at: now - 2 * DAY, meta: {} },
      { id: "a2", action: "domain.verify", target: "go.markaniz.com", actor: "demo@loss.tr", via: "firebase", at: now - 10 * DAY, meta: {} },
      { id: "a3", action: "apikey.create", target: "Üretim sunucusu", actor: "demo@loss.tr", via: "firebase", at: now - 12 * DAY, meta: {} },
      { id: "a4", action: "link.update", target: "loss.tr__menu", actor: "mert@markaniz.com", via: "apikey", at: now - 5 * DAY, meta: { fields: ["destination"] } },
    ],
    orders: [],
  };
}

let state = null;
function load() {
  if (state) return state;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    state = raw?.version === 2 ? raw : seedState();
  } catch {
    state = seedState();
  }
  return state;
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}
export function resetDemo() {
  state = seedState();
  save();
}

const fail = (status, error, extra = {}) => Object.assign(new Error(error), { status, extra });
const log = (action, target, meta = {}) => { load().audit.unshift({ id: uid(), action, target, actor: "demo@loss.tr", via: "firebase", at: Date.now(), meta }); };

const PLAN = {
  free: { id: "free", name: "Ücretsiz", maxLinks: 25, domains: 0, members: 1, analyticsDays: 30 },
  agency: { id: "agency", name: "Agency / Scale", maxLinks: 15000, domains: 15, members: 25, analyticsDays: 365 },
};
const ALL = ["expiry", "password", "clickLimit", "targeting", "socialPreview", "redirectType", "importExport", "api", "webhooks", "audit", "team"];

function analytics(link, days, workspaceLinks) {
  const links = link ? [link] : workspaceLinks;
  const total = links.reduce((s, l) => s + (l.clickCount || 0), 0);
  const window = Math.min(days, 365);
  // Recent traffic is assumed heavier than old traffic; scale to the selected window.
  const share = Math.min(1, 0.35 + window / 120);
  const clicks = Math.round(total * share);
  const r = rng(link ? link.id : "workspace");
  const weights = Array.from({ length: window }, (_, i) => (0.6 + r() * 0.8) * (0.7 + (i / window) * 0.6) * (1 + Math.sin(i / 2.2) * 0.25));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const timeseries = weights.map((w, i) => ({ date: new Date(Date.now() - (window - 1 - i) * DAY).toISOString().slice(0, 10), clicks: Math.round((clicks * w) / sum) }));
  const split = (names, ratios) => names.map((name, i) => ({ name, count: Math.round(clicks * ratios[i]) })).filter((x) => x.count > 0);
  return {
    scope: link ? "link" : "workspace", id: link?.id || null, days: window, maxDays: 365, totalClicks: clicks, uniqueVisitors: Math.round(clicks * 0.71), truncated: false,
    timeseries,
    devices: split(["mobile", "desktop", "tablet"], [0.64, 0.31, 0.05]),
    browsers: split(["Chrome", "Safari", "Edge", "Firefox", "Other"], [0.46, 0.32, 0.09, 0.06, 0.07]),
    systems: split(["Android", "iOS", "Windows", "macOS", "Linux"], [0.34, 0.3, 0.2, 0.12, 0.04]),
    countries: split(["TR", "DE", "NL", "US", "GB", "FR"], [0.62, 0.11, 0.06, 0.08, 0.05, 0.04]),
    cities: split(["İstanbul, TR", "Ankara, TR", "İzmir, TR", "Berlin, DE", "Amsterdam, NL"], [0.28, 0.12, 0.08, 0.07, 0.04]),
    referrers: split(["instagram.com", "direct", "google.com", "x.com", "linkedin.com", "facebook.com"], [0.34, 0.26, 0.16, 0.1, 0.08, 0.06]),
    sources: split(["link", "qr"], [0.78, 0.22]),
    topLinks: link ? [] : [...workspaceLinks].sort((a, b) => b.clickCount - a.clickCount).slice(0, 10).map((l) => ({ id: l.id, count: Math.round(l.clickCount * share) })),
    recent: Array.from({ length: 10 }, (_, i) => {
      const l = links[i % links.length];
      return { at: Date.now() - (i + 1) * 340_000, country: ["TR", "TR", "DE", "TR", "NL"][i % 5], city: ["İstanbul", "Ankara", "Berlin", "İzmir", "Amsterdam"][i % 5], device: ["mobile", "desktop", "mobile"][i % 3], browser: ["Chrome", "Safari", "Edge"][i % 3], referer: ["instagram.com", "direct", "google.com"][i % 3], source: i % 4 === 0 ? "qr" : "link", linkId: l.id };
    }),
  };
}

function parseFields(body, existing = {}) {
  const f = {};
  if (body.destination !== undefined) {
    let u;
    try { u = new URL(body.destination); } catch { throw fail(400, "Geçersiz hedef URL. Lütfen http:// veya https:// ile başlayan bir adres girin."); }
    if (!/^https?:$/.test(u.protocol)) throw fail(400, "Yalnızca http ve https adresleri kısaltılabilir.");
    f.destination = u.toString();
  }
  for (const k of ["title", "notes", "folder"]) if (body[k] !== undefined) f[k] = String(body[k]).slice(0, k === "notes" ? 500 : 120);
  if (body.tags !== undefined) {
    f.tags = [...new Set((Array.isArray(body.tags) ? body.tags : String(body.tags).split(",")).map((t) => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 10);
    f.tag = f.tags[0] || "";
  }
  if (body.status !== undefined) { if (!["active", "paused"].includes(body.status)) throw fail(400, "Geçersiz bağlantı durumu."); f.status = body.status; }
  if (body.password !== undefined && body.password !== "••••••") { f.hasPassword = Boolean(body.password); f.password = body.password ? "••••••" : ""; }
  if (body.expiresAt !== undefined) {
    if (body.expiresAt && new Date(body.expiresAt).getTime() <= Date.now()) throw fail(400, "Son kullanma tarihi gelecekte olmalıdır.");
    f.expiresAt = body.expiresAt ? new Date(body.expiresAt).toISOString() : "";
  }
  if (body.maxClicks !== undefined) f.maxClicks = body.maxClicks ? Number(body.maxClicks) : null;
  if (body.fallbackUrl !== undefined) f.fallbackUrl = body.fallbackUrl || "";
  if (body.redirectType !== undefined) f.redirectType = Number(body.redirectType);
  if (body.og !== undefined) f.og = body.og && (body.og.title || body.og.description || body.og.image) ? body.og : null;
  if (body.targets !== undefined) f.targets = body.targets && (body.targets.ios || body.targets.android || body.targets.geo?.length) ? body.targets : null;
  return { ...existing, ...f };
}

function createLink(body) {
  const s = load();
  const base = parseFields({ ...body, destination: body.destination });
  if (!base.destination) throw fail(400, "Hedef URL gerekli.");
  if (s.links.length >= PLAN.agency.maxLinks) throw fail(402, "Plan kotanıza ulaştınız.", { code: "limit_reached" });
  const domain = body.domain || "loss.tr";
  let slug = String(body.slug || "").trim().toLowerCase();
  if (slug) {
    if (!/^[a-z0-9_-]{3,48}$/.test(slug)) throw fail(400, "Özel bağlantı adı 3-48 karakter olmalı ve yalnızca harf, rakam, tire (-) ve alt çizgi (_) içermelidir.");
    if (domain === "loss.tr" && ["api", "app", "login", "admin", "pricing", "features", "developers"].includes(slug)) throw fail(400, "Bu bağlantı adı sistem tarafından ayrılmıştır ve kullanılamaz.");
    if (s.links.some((l) => l.id === `${domain}__${slug}`)) throw fail(409, `"${slug}" bağlantı adı zaten kullanımda. Lütfen farklı bir ad seçin.`, { code: "slug_taken" });
  } else {
    do slug = slug8(); while (s.links.some((l) => l.id === `${domain}__${slug}`));
  }
  const link = {
    id: `${domain}__${slug}`, ownerId: "demo", createdBy: "demo", domain, slug, notes: "", folder: "", tags: [], tag: "", hasPassword: false, password: "", expiresAt: "", maxClicks: null,
    redirectType: 307, og: null, targets: null, status: "active", clickCount: 0, ...base,
    title: base.title || new URL(base.destination).hostname,
    createdAt: { seconds: Math.floor(Date.now() / 1000) }, updatedAt: { seconds: Math.floor(Date.now() / 1000) },
    shortUrl: domain === "loss.tr" ? `${BASE}/${slug}` : `https://${domain}/${slug}`, isDemo: true,
  };
  s.links.unshift(link);
  log("link.create", link.id, { destination: link.destination });
  return link;
}

export async function demoRequest(method, path, { body = {}, query = {} } = {}) {
  await new Promise((r) => setTimeout(r, 120)); // keeps loading states honest in the demo
  const s = load();
  const [root, a, b] = path.split("/").filter(Boolean);
  const ok = (data, status = 200) => ({ status, ...data });

  if (root === "me") {
    return ok({
      user: { uid: "demo", email: "demo@loss.tr", name: "Demo Kullanıcı" }, tier: s.plan,
      plan: { ...PLAN.agency, features: Object.fromEntries(ALL.map((f) => [f, true])) },
      usage: { links: s.links.length, domains: s.domains.length },
      workspace: { id: "demo", name: "Kişisel", role: "owner", personal: true },
      workspaces: [{ id: "demo", name: "Kişisel", role: "owner", personal: true }, { id: "ws_demo", name: "Marka Ekibi", role: "owner", personal: false }],
      baseUrl: BASE, subscription: null, isDemo: true,
      plans: Object.fromEntries(PUBLIC_PLANS.map((p) => [p.id, { name: p.name, monthly: p.monthly, annual: p.annual, maxLinks: p.maxLinks, domains: p.domains, members: p.members, analyticsDays: p.analyticsDays, features: Object.fromEntries(ALL.map((f) => [f, p.features.includes(f)])) }])),
    });
  }

  if (root === "links") {
    if (a === "bulk" && method === "POST") {
      const results = [];
      for (const id of body.ids || []) {
        const i = s.links.findIndex((l) => l.id === id);
        if (i < 0) { results.push({ id, ok: false, error: "Bağlantı bulunamadı." }); continue; }
        if (body.action === "delete") s.links.splice(i, 1);
        else if (body.action === "pause") s.links[i].status = "paused";
        else if (body.action === "resume") s.links[i].status = "active";
        else if (body.action === "set_tags") Object.assign(s.links[i], parseFields({ tags: body.tags }, s.links[i]));
        else if (body.action === "set_folder") s.links[i].folder = String(body.folder || "");
        results.push({ id, ok: true });
      }
      log(`link.bulk_${body.action}`, `${results.length} bağlantı`);
      save();
      return ok({ results, succeeded: results.filter((r) => r.ok).length });
    }
    if (a === "import" && method === "POST") {
      const results = (body.rows || []).map((row, i) => {
        try { const l = createLink(row); return { row: i + 1, ok: true, id: l.id, shortUrl: l.shortUrl }; } catch (e) { return { row: i + 1, ok: false, error: e.message }; }
      });
      save();
      return ok({ results, created: results.filter((r) => r.ok).length });
    }
    if (method === "GET") return ok({ links: s.links, nextCursor: null });
    if (method === "POST") { const link = createLink(body); save(); return ok({ link }, 201); }
    if (method === "PATCH") {
      const i = s.links.findIndex((l) => l.id === body.id);
      if (i < 0) throw fail(404, "Bağlantı bulunamadı.");
      s.links[i] = { ...parseFields(body, s.links[i]), updatedAt: { seconds: Math.floor(Date.now() / 1000) } };
      log("link.update", body.id, { fields: Object.keys(body).filter((k) => k !== "id") });
      save();
      return ok({ link: s.links[i] });
    }
    if (method === "DELETE") {
      const id = query.id || body.id;
      const i = s.links.findIndex((l) => l.id === id);
      if (i < 0) throw fail(404, "Bağlantı bulunamadı.");
      s.links.splice(i, 1);
      log("link.delete", id);
      save();
      return ok({ success: true, id });
    }
  }

  if (root === "analytics") {
    const days = Math.max(1, Math.min(Number(query.days) || 30, 365));
    if (query.scope === "workspace") return ok(analytics(null, days, s.links));
    const link = s.links.find((l) => l.id === query.id);
    if (!link) throw fail(404, "Bağlantı bulunamadı.");
    return ok(analytics(link, days, s.links));
  }

  if (root === "domains") {
    if (method === "GET") return ok({ domains: s.domains.map((d) => ({ ...d, instructions: { txt: { name: `_loss-verify.${d.host}`, value: d.token || "loss-demo" }, cname: { name: d.host, value: "cname.vercel-dns.com" }, apexA: "76.76.21.21" } })), cnameTarget: "cname.vercel-dns.com" });
    if (method === "POST" && a === "verify") {
      const d = s.domains.find((x) => x.host === body.host);
      if (!d) throw fail(404, "Alan adı bulunamadı.");
      d.status = "verified"; d.verifiedAt = Date.now(); d.attached = true;
      log("domain.verify", d.host); save();
      return ok({ domain: d, verified: true, checks: { owned: true, routed: true } });
    }
    if (method === "POST") {
      const host = String(body.host || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host)) throw fail(400, "Geçerli bir alan adı girin (örn. go.sirketiniz.com).");
      if (s.domains.some((d) => d.host === host)) throw fail(409, "Bu alan adı zaten kayıtlı.");
      const d = { host, status: "pending", verifiedAt: null, attached: false, token: `loss-${uid()}${uid()}` };
      s.domains.push(d); log("domain.add", host); save();
      return ok({ domain: { ...d, instructions: { txt: { name: `_loss-verify.${host}`, value: d.token }, cname: { name: host, value: "cname.vercel-dns.com" }, apexA: "76.76.21.21" } } }, 201);
    }
    if (method === "DELETE") {
      const host = query.host || body.host;
      if (s.links.some((l) => l.domain === host)) throw fail(409, "Bu alan adına bağlı bağlantılar var. Önce onları silin veya taşıyın.");
      s.domains = s.domains.filter((d) => d.host !== host); log("domain.remove", host); save();
      return ok({ success: true });
    }
  }

  if (root === "keys") {
    if (method === "GET") return ok({ keys: s.keys });
    if (method === "POST") {
      const key = `loss_demo${uid()}${uid()}${uid()}${uid()}`;
      const rec = { id: uid(), name: body.name || "API anahtarı", prefix: key.slice(0, 10), role: body.role || "editor", createdAt: Date.now(), lastUsedAt: null };
      s.keys.push(rec); log("apikey.create", rec.name); save();
      return ok({ ...rec, key }, 201);
    }
    if (method === "DELETE") { s.keys = s.keys.filter((k) => k.id !== (query.id || body.id)); save(); return ok({ success: true }); }
  }

  if (root === "webhooks") {
    const events = ["link.created", "link.updated", "link.deleted", "link.clicked"];
    if (method === "GET") return ok({ webhooks: s.webhooks, events });
    if (method === "POST" && !a) {
      if (!/^https:\/\//.test(body.url || "")) throw fail(400, "Webhook adresi geçerli bir https adresi olmalıdır.");
      if (!body.events?.length) throw fail(400, "Geçerli en az bir olay seçin.");
      const secret = `whsec_demo${uid()}${uid()}${uid()}`;
      const rec = { id: uid(), url: body.url, events: body.events, active: true, secretPrefix: secret.slice(0, 10), lastDelivery: null };
      s.webhooks.push(rec); log("webhook.create", rec.url); save();
      return ok({ webhook: rec, secret }, 201);
    }
    const hook = s.webhooks.find((h) => h.id === a);
    if (!hook) throw fail(404, "Webhook bulunamadı.");
    if (b === "test") return ok({ status: 200, ok: true });
    if (method === "PATCH") { Object.assign(hook, body); save(); return ok({ webhook: hook }); }
    if (method === "DELETE") { s.webhooks = s.webhooks.filter((h) => h.id !== a); save(); return ok({ success: true }); }
  }

  if (root === "workspaces") {
    if (!a && method === "GET") return ok({ workspaces: [{ id: "ws_demo", name: "Marka Ekibi", role: "owner", members: s.members.length }] });
    if (!a && method === "POST") return ok({ workspace: { id: "ws_demo", name: body.name, role: "owner" } }, 201);
    if (a && !b && method === "GET") return ok({ workspace: { id: a, name: "Marka Ekibi", role: "owner", ownerId: "demo", seatLimit: 25 }, members: s.members, invites: s.invites });
    if (b === "invites" && method === "POST") {
      const token = uid() + uid();
      const inv = { token, email: body.email, role: body.role || "editor", expiresAt: Date.now() + 7 * DAY, url: `${BASE}/invite/${token}` };
      s.invites.push(inv); log("team.invite", body.email); save();
      return ok(inv, 201);
    }
    if (b === "invites" && method === "DELETE") { s.invites = s.invites.filter((i) => i.token !== path.split("/")[3]); save(); return ok({ success: true }); }
    if (b === "members" && method === "PATCH") { const m = s.members.find((x) => x.uid === path.split("/")[3]); if (m) m.role = body.role; save(); return ok({ success: true }); }
    if (b === "members" && method === "DELETE") { s.members = s.members.filter((x) => x.uid !== path.split("/")[3]); save(); return ok({ success: true }); }
  }

  if (root === "audit") return ok({ entries: s.audit.slice(0, 100) });
  if (root === "billing") {
    if (a === "orders") return ok({ orders: [] });
    throw fail(403, "Demo çalışma alanında ödeme yapılamaz. Gerçek bir hesapla giriş yapın.", { code: "demo" });
  }
  if (root === "account") { if (a === "export") return ok({ exportedAt: new Date().toISOString(), links: s.links }); return ok({ success: true }); }
  if (root === "report") return ok({ received: true }, 201);
  throw fail(404, "Bulunamadı.");
}
