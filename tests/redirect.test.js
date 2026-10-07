import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { call, callRedirect, db, dnsState, tick, upgrade, webhookCalls } from "./harness.js";
import { hashPassword } from "../server/lib/password.js";

const FB = { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1" };
const seed = (slug, extra = {}) => db.seed(`links/loss.tr__${slug}`, { ownerId: "x", slug, domain: "loss.tr", status: "active", destination: "https://example.com/", clickCount: 0, ...extra });

test("307 to destination, human click logged with qr source; bots and HEAD ignored", async () => {
  seed("basic1", { destination: "https://example.net/new" });
  const res = await callRedirect("basic1");
  assert.equal(res.statusCode, 307);
  assert.equal(res.headers.location, "https://example.net/new");
  assert.equal(res.headers["cache-control"], "no-store");
  await callRedirect("basic1", { query: { qr: "1" }, headers: { "x-vercel-ip-country": "DE", "x-vercel-ip-city": "Berlin", "accept-language": "de-DE,de;q=0.9" } });
  await callRedirect("basic1", { headers: { "user-agent": "Googlebot/2.1" } });
  await callRedirect("basic1", { method: "HEAD" });
  await tick();
  assert.equal(db.store.docs.get("links/loss.tr__basic1").clickCount, 2);
  const clicks = [...db.store.docs.entries()].filter(([p]) => p.startsWith("links/loss.tr__basic1/clicks/")).map(([, v]) => v);
  const qr = clicks.find((c) => c.source === "qr");
  assert.equal(qr.country, "DE");
  assert.equal(qr.city, "Berlin");
  assert.equal(qr.lang, "de-de");
  assert.equal(qr.ownerId, "x");
  assert.ok(!JSON.stringify(clicks).includes("1.2.3.4"));
});

test("redirect type honoured; case-insensitive; unknown/malformed/XSS slugs", async () => {
  seed("moved1", { redirectType: 301 });
  assert.equal((await callRedirect("moved1")).statusCode, 301);
  assert.equal((await callRedirect("MOVED1")).statusCode, 301);
  assert.equal((await callRedirect("does-not-exist")).statusCode, 404);
  const xss = await callRedirect(`x"><script>alert(1)</script>`);
  assert.equal(xss.statusCode, 404);
  assert.ok(!String(xss.body).includes("<script>alert"));
  assert.equal((await callRedirect("a/b")).statusCode, 404);
  db.seed("links/loss.tr__AbC123", { ownerId: "x", slug: "AbC123", status: "active", destination: "https://example.com/legacy" });
  assert.equal((await callRedirect("AbC123")).headers.location, "https://example.com/legacy");
});

test("paused, expired, disabled, click-limit and unsafe destinations are 410", async () => {
  seed("paused1", { status: "paused" });
  seed("expired1", { expiresAt: "2000-01-01T00:00:00.000Z" });
  seed("disabled1", { status: "disabled" });
  seed("limited1", { maxClicks: 2, clickCount: 2 });
  seed("evil1", { destination: "javascript:alert(1)" });
  for (const s of ["paused1", "expired1", "disabled1", "limited1", "evil1"]) {
    const res = await callRedirect(s);
    assert.equal(res.statusCode, 410, s);
    assert.equal(res.headers.location, undefined);
  }
  seed("limited2", { maxClicks: 2, clickCount: 1 });
  assert.equal((await callRedirect("limited2")).statusCode, 307);

  // A fallback destination replaces the error page for expired / exhausted links.
  seed("fb-expired", { expiresAt: "2000-01-01T00:00:00.000Z", fallbackUrl: "https://example.com/sale-over" });
  seed("fb-limit", { maxClicks: 1, clickCount: 1, fallbackUrl: "https://example.com/sold-out" });
  seed("fb-evil", { expiresAt: "2000-01-01T00:00:00.000Z", fallbackUrl: "javascript:alert(1)" });
  const fbx = await callRedirect("fb-expired");
  assert.equal(fbx.statusCode, 302);
  assert.equal(fbx.headers.location, "https://example.com/sale-over");
  assert.equal((await callRedirect("fb-limit")).headers.location, "https://example.com/sold-out");
  assert.equal((await callRedirect("fb-evil")).statusCode, 410);
});

test("device and country targeting", async () => {
  seed("target1", { targets: { ios: "https://apps.apple.com/app/x", android: "https://play.google.com/store/apps/x", geo: [{ country: "DE", url: "https://example.de/" }] } });
  assert.equal((await callRedirect("target1", { headers: FB })).headers.location, "https://apps.apple.com/app/x");
  assert.equal((await callRedirect("target1", { headers: { "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel) Mobile Chrome/120" } })).headers.location, "https://play.google.com/store/apps/x");
  assert.equal((await callRedirect("target1")).headers.location, "https://example.com/");
  assert.equal((await callRedirect("target1", { headers: { ...FB, "x-vercel-ip-country": "DE" } })).headers.location, "https://example.de/"); // geo beats OS
});

test("social crawlers receive the custom preview card, humans are redirected", async () => {
  seed("card1", { title: "Fallback", og: { title: "Büyük Kampanya", description: "Detay <b>", image: "https://example.com/i.png" } });
  const bot = await callRedirect("card1", { headers: { "user-agent": "facebookexternalhit/1.1" } });
  assert.equal(bot.statusCode, 200);
  assert.match(bot.body, /og:title/);
  assert.match(bot.body, /Büyük Kampanya/);
  assert.ok(!bot.body.includes("<b>"));
  assert.equal((await callRedirect("card1")).statusCode, 307);
});

test("password links: interstitial, unlock, lockout, expiry, legacy hash upgrade", async () => {
  seed("locked", { destination: "https://example.com/secret", password: hashPassword("open-sesame") });
  const page = await callRedirect("locked");
  assert.equal(page.statusCode, 200);
  assert.ok(String(page.body).includes('id="f"'));
  assert.ok(!String(page.body).includes("example.com/secret"));

  const unlock = (password, ip, slug = "locked") => call("POST", "verify-password", { body: { slug, password }, headers: { "x-real-ip": ip } });
  assert.equal((await unlock("nope", "9.9.9.9")).statusCode, 403);
  assert.equal((await unlock("nope", "9.9.9.9", "no-such-link")).statusCode, 403); // indistinguishable
  const good = await unlock("open-sesame", "8.8.8.8");
  assert.equal(good.body.destination, "https://example.com/secret");

  const codes = [];
  for (let i = 0; i < 8; i++) codes.push((await unlock(`guess${i}`, "7.7.7.7")).statusCode);
  assert.ok(codes.includes(429));
  assert.equal((await unlock("open-sesame", "7.7.7.7")).statusCode, 429);

  seed("lockedexp", { expiresAt: "2000-01-01T00:00:00.000Z", password: hashPassword("pw12") });
  assert.equal((await unlock("pw12", "6.6.6.6", "lockedexp")).statusCode, 410);

  const salt = "aabbccddeeff00112233445566778899";
  seed("legacypw", { password: `${salt}:${createHash("sha256").update(`${salt}oldpass`).digest("hex")}` });
  assert.equal((await unlock("oldpass", "5.5.5.5", "legacypw")).statusCode, 200);
  await tick();
  assert.ok(db.store.docs.get("links/loss.tr__legacypw").password.startsWith("scrypt$"));
});

test("custom domains: only verified domains resolve, per-domain slug namespace", async () => {
  upgrade("domo", "starter");
  const added = await call("POST", "domains", { user: "domo", body: { host: "Go.Example.com" } });
  assert.equal(added.statusCode, 201);
  const { token } = db.store.docs.get("domains/go.example.com");
  assert.equal(added.body.domain.instructions.txt.value, token);

  // Unverified: links on the domain can't be created and the host serves nothing.
  assert.equal((await call("POST", "links", { user: "domo", body: { destination: "https://example.com", domain: "go.example.com" } })).statusCode, 400);
  assert.equal((await callRedirect("anything", { headers: { host: "go.example.com" } })).statusCode, 404);

  assert.equal((await call("POST", "domains/verify", { user: "domo", body: { host: "go.example.com" } })).body.verified, false);
  dnsState.txt["_loss-verify.go.example.com"] = token;
  const ver = await call("POST", "domains/verify", { user: "domo", body: { host: "go.example.com" } });
  assert.equal(ver.body.verified, true);

  const link = await call("POST", "links", { user: "domo", body: { destination: "https://example.com/dom", domain: "go.example.com", slug: "hello" } });
  assert.equal(link.statusCode, 201);
  assert.equal(link.body.link.shortUrl, "https://go.example.com/hello");
  // same slug on the canonical host is a different link
  assert.equal((await call("POST", "links", { user: "domo", body: { destination: "https://example.com/can", slug: "hello" } })).statusCode, 201);

  assert.equal((await callRedirect("hello", { headers: { host: "go.example.com" } })).headers.location, "https://example.com/dom");
  assert.equal((await callRedirect("hello")).headers.location, "https://example.com/can");
  assert.equal((await callRedirect("hello", { headers: { host: "evil.example.org" } })).statusCode, 404);
});

test("click events are delivered to webhooks", async () => {
  upgrade("hooker", "pro");
  const hook = await call("POST", "webhooks", { user: "hooker", body: { url: "https://hooks.example.com/in", events: ["link.clicked", "link.created"] } });
  assert.equal(hook.statusCode, 201);
  const link = await call("POST", "links", { user: "hooker", body: { destination: "https://example.com/wh", slug: "wh-test" } });
  await tick();
  await callRedirect("wh-test");
  await tick();
  const created = webhookCalls.find((c) => c.body.type === "link.created");
  const clicked = webhookCalls.find((c) => c.body.type === "link.clicked");
  assert.equal(created.body.data.slug, "wh-test");
  assert.equal(clicked.body.data.id, link.body.link.id);
  assert.match(created.headers["X-Loss-Signature"], /^sha256=[a-f0-9]{64}$/);
  const { sign } = await import("../server/lib/webhooks.js");
  assert.equal(created.headers["X-Loss-Signature"], sign(hook.body.secret, created.headers["X-Loss-Timestamp"], JSON.stringify(created.body)));
});
