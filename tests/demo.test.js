import test from "node:test";
import assert from "node:assert/strict";

// Minimal browser storage for the demo backend.
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const { demoRequest, resetDemo } = await import("../src/lib/demo.js");

test("demo API mirrors the real API shapes for the core flows", async () => {
  resetDemo();
  const me = await demoRequest("GET", "me");
  assert.equal(me.isDemo, true);
  assert.equal(me.plans.agency.features.api, true);
  assert.equal(me.plans.free.features.api, false);

  const before = (await demoRequest("GET", "links")).links.length;
  const created = await demoRequest("POST", "links", { body: { destination: "https://example.com/x", slug: "demo-x", tags: ["A", "a", "b"] } });
  assert.equal(created.link.shortUrl, "https://loss.tr/demo-x");
  assert.deepEqual(created.link.tags, ["a", "b"]);
  await assert.rejects(demoRequest("POST", "links", { body: { destination: "https://example.com/y", slug: "demo-x" } }), /zaten kullanımda/);
  await assert.rejects(demoRequest("POST", "links", { body: { destination: "javascript:alert(1)" } }), /http/);
  await assert.rejects(demoRequest("POST", "links", { body: { destination: "https://example.com", slug: "api" } }), /ayrılmış/);

  const upd = await demoRequest("PATCH", "links", { body: { id: created.link.id, status: "paused" } });
  assert.equal(upd.link.status, "paused");
  const bulk = await demoRequest("POST", "links/bulk", { body: { action: "delete", ids: [created.link.id, "nope"] } });
  assert.equal(bulk.succeeded, 1);
  assert.equal((await demoRequest("GET", "links")).links.length, before);

  const a = await demoRequest("GET", "analytics", { query: { scope: "workspace", days: "30" } });
  assert.equal(a.timeseries.length, 30);
  assert.ok(a.totalClicks > 0 && a.countries.length > 0);
  await assert.rejects(demoRequest("POST", "billing/token", { body: { tier: "pro" } }), /Demo/);
});

test("demo state persists across reloads of the module cache", async () => {
  resetDemo();
  await demoRequest("POST", "links", { body: { destination: "https://example.com/persist", slug: "persist-me" } });
  assert.match(store.get("loss_demo_v2"), /persist-me/);
});
