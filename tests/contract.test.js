import test from "node:test";
import assert from "node:assert/strict";

// The demo backend must return the same shapes as the real API, otherwise the UI
// could work in demo mode and break in production (or vice versa).
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const { call, callRedirect, db, upgrade, tick } = await import("./harness.js");
const { demoRequest, resetDemo } = await import("../src/lib/demo.js");

const keys = (o) => Object.keys(o).sort();
const missing = (real, demo) => keys(real).filter((k) => !(k in demo));

test("contract: /me", async () => {
  upgrade("cuser", "agency");
  const real = (await call("GET", "me", { user: "cuser" })).body;
  resetDemo();
  const demo = await demoRequest("GET", "me");
  assert.deepEqual(missing(real, demo), [], "demo /me lacks keys");
  assert.deepEqual(missing(real.plan, demo.plan), []);
  assert.deepEqual(missing(real.usage, demo.usage), []);
  assert.deepEqual(missing(real.workspace, demo.workspace), []);
  assert.deepEqual(keys(real.plans.pro), keys(demo.plans.pro));
  assert.deepEqual(real.plans.pro.features, demo.plans.pro.features);
  assert.deepEqual(missing(real.workspaces[0], demo.workspaces[0]), []);
});

test("contract: link objects carry every field the UI reads", async () => {
  const real = (await call("POST", "links", { user: "cuser", body: { destination: "https://example.com/c", slug: "contract-1", tags: ["a"], folder: "F" } })).body.link;
  const demo = (await demoRequest("POST", "links", { body: { destination: "https://example.com/c", slug: "contract-1", tags: ["a"], folder: "F" } })).link;
  const uiFields = ["id", "slug", "domain", "shortUrl", "destination", "title", "tags", "folder", "notes", "status", "clickCount", "hasPassword", "expiresAt", "maxClicks", "redirectType", "og", "targets", "createdAt", "ownerId"];
  for (const f of uiFields) {
    assert.ok(f in real, `real link lacks ${f}`);
    assert.ok(f in demo, `demo link lacks ${f}`);
  }
  assert.equal(typeof real.shortUrl, typeof demo.shortUrl);
});

test("contract: analytics, domains, keys, webhooks, bulk, import, team, audit", async () => {
  const seed = (await call("GET", "links", { user: "cuser" })).body.links[0];
  await callRedirect("contract-1");
  await tick();
  const realA = (await call("GET", "analytics", { user: "cuser", query: { id: seed.id, days: "7" } })).body;
  const demoA = await demoRequest("GET", "analytics", { query: { id: (await demoRequest("GET", "links")).links[0].id, days: "7" } });
  assert.deepEqual(missing(realA, demoA), [], "analytics");
  const realW = (await call("GET", "analytics", { user: "cuser", query: { scope: "workspace", days: "7" } })).body;
  assert.deepEqual(missing(realW, await demoRequest("GET", "analytics", { query: { scope: "workspace", days: "7" } })), [], "workspace analytics");
  assert.deepEqual(missing(realA.recent[0], demoA.recent[0]), [], "recent event");

  const realD = await call("POST", "domains", { user: "cuser", body: { host: "go.contract.example" } });
  const demoD = await demoRequest("POST", "domains", { body: { host: "go.contract.example" } });
  assert.deepEqual(missing(realD.body.domain, demoD.domain), [], "domain");
  assert.deepEqual(missing(realD.body.domain.instructions, demoD.domain.instructions), []);
  assert.deepEqual(missing((await call("GET", "domains", { user: "cuser" })).body, await demoRequest("GET", "domains")), []);

  const realK = (await call("POST", "keys", { user: "cuser", body: { name: "k" } })).body;
  const demoK = await demoRequest("POST", "keys", { body: { name: "k" } });
  assert.deepEqual(missing(realK, demoK), [], "key create");
  assert.deepEqual(missing((await call("GET", "keys", { user: "cuser" })).body.keys[0], (await demoRequest("GET", "keys")).keys[0]), [], "key list");

  const realH = (await call("POST", "webhooks", { user: "cuser", body: { url: "https://hooks.example.com/c", events: ["link.created"] } })).body;
  const demoH = await demoRequest("POST", "webhooks", { body: { url: "https://hooks.example.com/c", events: ["link.created"] } });
  assert.deepEqual(missing(realH, demoH), [], "webhook create");
  assert.deepEqual(missing((await call("GET", "webhooks", { user: "cuser" })).body.webhooks[0], (await demoRequest("GET", "webhooks")).webhooks[0]), [], "webhook list");

  const a = (await call("POST", "links", { user: "cuser", body: { destination: "https://example.com/b1" } })).body.link.id;
  const realB = (await call("POST", "links/bulk", { user: "cuser", body: { action: "pause", ids: [a] } })).body;
  const demoB = await demoRequest("POST", "links/bulk", { body: { action: "pause", ids: [(await demoRequest("GET", "links")).links[0].id] } });
  assert.deepEqual(missing(realB, demoB), [], "bulk");
  const realI = (await call("POST", "links/import", { user: "cuser", body: { rows: [{ destination: "https://example.com/i1" }] } })).body;
  const demoI = await demoRequest("POST", "links/import", { body: { rows: [{ destination: "https://example.com/i1" }] } });
  assert.deepEqual(missing(realI.results[0], demoI.results[0]), [], "import row");

  const ws = (await call("POST", "workspaces", { user: "cuser|c@x.com", body: { name: "Contract" } })).body.workspace;
  const realT = (await call("GET", `workspaces/${ws.id}`, { user: "cuser|c@x.com" })).body;
  const demoT = await demoRequest("GET", "workspaces/ws_demo");
  assert.deepEqual(missing(realT, demoT), [], "workspace detail");
  assert.deepEqual(missing(realT.members[0], demoT.members[0]), [], "member");
  const inv = (await call("POST", `workspaces/${ws.id}/invites`, { user: "cuser", body: { email: "n@x.com", role: "editor" } })).body;
  assert.deepEqual(missing(inv, await demoRequest("POST", "workspaces/ws_demo/invites", { body: { email: "n@x.com" } })), [], "invite");

  const realAud = (await call("GET", "audit", { user: "cuser" })).body.entries[0];
  const demoAud = (await demoRequest("GET", "audit")).entries[0];
  assert.deepEqual(missing(realAud, demoAud), [], "audit entry");
  assert.ok(db);
});
