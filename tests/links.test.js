import test from "node:test";
import assert from "node:assert/strict";
import { call, db, tick, upgrade } from "./harness.js";

const post = (user, body, extra = {}) => call("POST", "links", { user, body, ...extra });

test("authentication is required; bad tokens are rejected", async () => {
  assert.equal((await call("GET", "links")).statusCode, 401);
  assert.equal((await call("GET", "links", { user: "bad" })).statusCode, 401);
  assert.equal((await call("GET", "nope", { user: "alice" })).statusCode, 404);
  assert.equal((await call("GET", "v1/links", { user: "alice" })).statusCode, 200); // /api/v1 alias
});

test("create validates destination, slug, expiry and passwords", async () => {
  assert.equal((await post("alice", { destination: "javascript:alert(1)" })).statusCode, 400);
  assert.equal((await post("alice", { destination: "https://example.com", slug: "api" })).statusCode, 400);
  assert.equal((await post("alice", { destination: "https://example.com", slug: "a b" })).statusCode, 400);
  assert.equal((await post("alice", { destination: "https://loss.tr/x" })).statusCode, 400);
  assert.equal((await post("alice", { destination: "https://example.com", maxClicks: -3 })).statusCode, 400);
  assert.equal((await post("alice", { destination: "https://example.com", redirectType: 418 })).statusCode, 400);
  assert.equal((await post("alice", { destination: "https://example.com", tags: Array.from({ length: 11 }, (_, i) => `t${i}`) })).statusCode, 400);
});

test("create: auto slug, custom slug, tags/folder/notes, duplicate, no hash leak", async () => {
  const auto = await post("alice", { destination: "https://example.com/page", tags: ["Promo", "promo", " Q4 "], folder: "Kampanya", notes: "not" });
  assert.equal(auto.statusCode, 201);
  assert.match(auto.body.link.slug, /^[a-z0-9]{8}$/);
  assert.deepEqual(auto.body.link.tags, ["promo", "q4"]);
  assert.equal(auto.body.link.folder, "Kampanya");

  upgrade("alice", "pro");
  const custom = await post("alice", { destination: "https://example.com", slug: "Promo-2026", password: "s3cret!" });
  assert.equal(custom.statusCode, 201);
  assert.equal(custom.body.link.slug, "promo-2026");
  assert.equal(custom.body.link.password, "••••••");
  assert.ok(db.store.docs.get("links/loss.tr__promo-2026").password.startsWith("scrypt$"));
  assert.ok(!JSON.stringify(custom.body).includes("scrypt$"));
  assert.equal((await post("bob", { destination: "https://example.com", slug: "promo-2026" })).statusCode, 409);
});

test("plan gating: paid features are refused on free with a structured error", async () => {
  for (const [field, value, feature] of [
    ["password", "secret1", "password"],
    ["expiresAt", new Date(Date.now() + 86400000).toISOString(), "expiry"],
    ["maxClicks", 10, "clickLimit"],
    ["targets", { ios: "https://apps.apple.com/app/x" }, "targeting"],
    ["og", { title: "T" }, "socialPreview"],
    ["redirectType", 301, "redirectType"],
    ["fallbackUrl", "https://example.com/over", "expiry"],
  ]) {
    const res = await post("freebie", { destination: "https://example.com", [field]: value });
    assert.equal(res.statusCode, 403, field);
    assert.equal(res.body.code, "plan_required");
    assert.equal(res.body.feature, feature);
  }
  upgrade("payer", "pro");
  const ok = await post("payer", {
    destination: "https://example.com", maxClicks: 5, redirectType: 302, expiresAt: new Date(Date.now() + 86400000).toISOString(),
    targets: { ios: "https://apps.apple.com/app/x", geo: [{ country: "de", url: "https://example.de" }] },
    og: { title: "Başlık", description: "Açıklama", image: "https://example.com/i.png" },
  });
  assert.equal(ok.statusCode, 201);
  assert.equal(ok.body.link.targets.geo[0].country, "DE");
  const withFb = await post("payer", { destination: "https://example.com", fallbackUrl: "https://example.com/over" });
  assert.equal(withFb.body.link.fallbackUrl, "https://example.com/over");
  assert.equal((await post("payer", { destination: "https://example.com", fallbackUrl: "javascript:x" })).statusCode, 400);
  assert.equal((await post("payer", { destination: "https://example.com", og: { image: "http://insecure.example/i.png" } })).statusCode, 400);
});

test("create: concurrent requests for one slug yield exactly one winner", async () => {
  const results = await Promise.all(["u1", "u2", "u3", "u4", "u5"].map((u) => post(u, { destination: "https://example.com", slug: "race-slug" })));
  assert.equal(results.filter((r) => r.statusCode === 201).length, 1);
  assert.equal(results.filter((r) => r.statusCode === 409).length, 4);
});

test("create: server-side plan limit; unsubscribed paid tiers grant nothing", async () => {
  for (let i = 0; i < 25; i++) db.seed(`links/loss.tr__carol${i}`, { ownerId: "carol", slug: `carol${i}`, createdAt: new Date(i) });
  const blocked = await post("carol", { destination: "https://example.com" });
  assert.equal(blocked.statusCode, 402);
  assert.equal(blocked.body.code, "limit_reached");
  upgrade("carol", "starter");
  assert.equal((await post("carol", { destination: "https://example.com" })).statusCode, 201);
  for (let i = 0; i < 25; i++) db.seed(`links/loss.tr__dave${i}`, { ownerId: "dave", slug: `dave${i}`, createdAt: new Date(i) });
  db.seed("users/dave", { tier: "agency", subscription: { status: "canceled" } });
  assert.equal((await post("dave", { destination: "https://example.com" })).statusCode, 402);
});

test("list is scoped to the caller, paginates and exposes shortUrl", async () => {
  const res = await call("GET", "links", { user: "carol", query: { limit: "10" } });
  assert.equal(res.body.links.length, 10);
  assert.ok(res.body.nextCursor);
  assert.ok(res.body.links.every((l) => l.ownerId === "carol" && l.shortUrl.startsWith("https://loss.tr/")));
  const next = await call("GET", "links", { user: "carol", query: { limit: "10", cursor: res.body.nextCursor } });
  assert.ok(next.body.links.every((l) => !res.body.links.some((p) => p.id === l.id)));
});

test("IDOR: strangers get 404 on update/delete/analytics; ids are validated", async () => {
  const id = "loss.tr__promo-2026";
  assert.equal((await call("PATCH", "links", { user: "mallory", body: { id, destination: "https://evil.example" } })).statusCode, 404);
  assert.equal((await call("DELETE", "links", { user: "mallory", query: { id } })).statusCode, 404);
  assert.equal((await call("GET", "analytics", { user: "mallory", query: { id } })).statusCode, 404);
  assert.equal(db.store.docs.get(`links/${id}`).destination, "https://example.com/");
  assert.equal((await call("DELETE", "links", { user: "mallory", query: { id: "links/x/clicks/y" } })).statusCode, 400);
});

test("update: owner edits, invalid input rejected, masked password is a no-op, slug immutable", async () => {
  const id = "loss.tr__promo-2026";
  const hash = db.store.docs.get(`links/${id}`).password;
  const ok = await call("PATCH", "links", { user: "alice", body: { id, destination: "https://example.net/new", status: "paused", title: "New", slug: "hacked" } });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body.link.destination, "https://example.net/new");
  assert.equal(ok.body.link.slug, "promo-2026");
  assert.equal((await call("PATCH", "links", { user: "alice", body: { id, status: "disabled" } })).statusCode, 400);
  assert.equal((await call("PATCH", "links", { user: "alice", body: { id, destination: "file:///etc/passwd" } })).statusCode, 400);
  await call("PATCH", "links", { user: "alice", body: { id, password: "••••••" } });
  assert.equal(db.store.docs.get(`links/${id}`).password, hash);
  assert.equal((await call("PATCH", "links", { user: "alice", body: { id, password: "" } })).body.link.hasPassword, false);
  await call("PATCH", "links", { user: "alice", body: { id, status: "active" } });
});

test("bulk actions: pause/resume/tags/folder/delete only touch owned links", async () => {
  const a = (await post("bulky", { destination: "https://example.com/a" })).body.link.id;
  const b = (await post("bulky", { destination: "https://example.com/b" })).body.link.id;
  const foreign = "loss.tr__promo-2026";
  const res = await call("POST", "links/bulk", { user: "bulky", body: { action: "pause", ids: [a, b, foreign] } });
  assert.equal(res.body.succeeded, 2);
  assert.equal(res.body.results.find((r) => r.id === foreign).ok, false);
  assert.equal(db.store.docs.get(`links/${a}`).status, "paused");
  await call("POST", "links/bulk", { user: "bulky", body: { action: "set_tags", ids: [a, b], tags: ["x", "y"] } });
  assert.deepEqual(db.store.docs.get(`links/${b}`).tags, ["x", "y"]);
  await call("POST", "links/bulk", { user: "bulky", body: { action: "set_folder", ids: [a], folder: "F1" } });
  assert.equal(db.store.docs.get(`links/${a}`).folder, "F1");
  assert.equal((await call("POST", "links/bulk", { user: "bulky", body: { action: "explode", ids: [a] } })).statusCode, 400);
  assert.equal((await call("POST", "links/bulk", { user: "bulky", body: { action: "pause", ids: [] } })).statusCode, 400);
  await call("POST", "links/bulk", { user: "bulky", body: { action: "delete", ids: [a, b] } });
  assert.equal(db.store.docs.has(`links/${a}`), false);
  assert.ok(db.store.docs.has(`links/${foreign}`));
});

test("import: gated to paid plans, validates every row, reports per-row results", async () => {
  const rows = [{ destination: "https://example.com/1", slug: "imp-one" }, { destination: "not a url" }, { destination: "https://example.com/3", tags: ["a"] }];
  assert.equal((await call("POST", "links/import", { user: "freebie", body: { rows } })).statusCode, 403);
  upgrade("importer", "starter");
  const res = await call("POST", "links/import", { user: "importer", body: { rows } });
  assert.equal(res.body.created, 2);
  assert.equal(res.body.results[1].ok, false);
  assert.equal(res.body.results[0].shortUrl, "https://loss.tr/imp-one");
  assert.equal((await call("POST", "links/import", { user: "importer", body: { rows: [] } })).statusCode, 400);
});

test("delete removes the link; redirect no longer resolves", async () => {
  const { callRedirect } = await import("./harness.js");
  const del = await call("DELETE", "links", { user: "alice", query: { id: "loss.tr__promo-2026" } });
  assert.equal(del.statusCode, 200);
  await tick();
  assert.equal((await callRedirect("promo-2026")).statusCode, 404);
});
