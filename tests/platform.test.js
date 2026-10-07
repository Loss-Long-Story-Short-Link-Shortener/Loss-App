import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { call, callRedirect, db, paytrCallback, paytrRecurring, tick, upgrade, mockResponse } from "./harness.js";
import { getPlan } from "../server/lib/plans.js";

test("API keys: pro-only, shown once, hashed at rest, authenticate the REST API, revocable", async () => {
  assert.equal((await call("POST", "keys", { user: "kfree", body: { name: "x" } })).statusCode, 403);
  upgrade("kowner", "pro");
  const created = await call("POST", "keys", { user: "kowner", body: { name: "CI", role: "editor" } });
  assert.equal(created.statusCode, 201);
  const secret = created.body.key;
  assert.match(secret, /^loss_[A-Za-z0-9]{40}$/);
  assert.ok(![...db.store.docs.values()].some((d) => JSON.stringify(d).includes(secret)));
  assert.ok(!JSON.stringify((await call("GET", "keys", { user: "kowner" })).body).includes(secret));

  const made = await call("POST", "links", { key: secret, body: { destination: "https://example.com/api", slug: "via-api" } });
  assert.equal(made.statusCode, 201);
  assert.equal(made.body.link.ownerId, "kowner");
  assert.equal((await call("GET", "links", { key: secret })).body.links.length, 1);
  assert.equal((await call("GET", "keys", { key: secret })).statusCode, 403); // keys cannot manage keys
  assert.equal((await call("GET", "links", { key: "loss_" + "x".repeat(40) })).statusCode, 401);

  // read-only key
  const ro = (await call("POST", "keys", { user: "kowner", body: { name: "ro", role: "viewer" } })).body.key;
  assert.equal((await call("GET", "links", { key: ro })).statusCode, 200);
  assert.equal((await call("POST", "links", { key: ro, body: { destination: "https://example.com" } })).statusCode, 403);

  // downgrade: key stops working
  db.seed("users/kowner", { tier: "pro", subscription: { status: "canceled" } });
  assert.equal((await call("GET", "links", { key: secret })).statusCode, 403);
  upgrade("kowner", "pro");

  assert.equal((await call("DELETE", "keys", { user: "kowner", query: { id: created.body.id } })).statusCode, 200);
  assert.equal((await call("GET", "links", { key: secret })).statusCode, 401);
});

test("webhooks: https only, no private hosts, pro only, secret shown once", async () => {
  assert.equal((await call("GET", "webhooks", { user: "wfree" })).statusCode, 403);
  upgrade("wown", "pro");
  for (const url of ["http://hooks.example.com", "https://localhost/x", "https://10.0.0.1/x", "ftp://x.example.com"]) {
    assert.equal((await call("POST", "webhooks", { user: "wown", body: { url, events: ["link.created"] } })).statusCode, 400, url);
  }
  assert.equal((await call("POST", "webhooks", { user: "wown", body: { url: "https://hooks.example.com/a", events: ["bogus"] } })).statusCode, 400);
  const ok = await call("POST", "webhooks", { user: "wown", body: { url: "https://hooks.example.com/a", events: ["link.created"] } });
  assert.match(ok.body.secret, /^whsec_/);
  assert.ok(!JSON.stringify((await call("GET", "webhooks", { user: "wown" })).body).includes(ok.body.secret));
  assert.equal((await call("POST", `webhooks/${ok.body.webhook.id}/test`, { user: "wown" })).body.ok, true);
  assert.equal((await call("DELETE", `webhooks/${ok.body.webhook.id}`, { user: "stranger" })).statusCode, 403);
});

test("team workspaces: create, invite, accept, roles, isolation, seat limits", async () => {
  assert.equal((await call("POST", "workspaces", { user: "tfree", body: { name: "Ekip" } })).statusCode, 403);
  upgrade("tboss", "pro");
  const ws = (await call("POST", "workspaces", { user: "tboss|boss@acme.com", body: { name: "Acme Ekibi" } })).body.workspace;
  assert.match(ws.id, /^ws_[a-f0-9]{16}$/);

  const inv = await call("POST", `workspaces/${ws.id}/invites`, { user: "tboss", body: { email: "Dev@Acme.com", role: "editor" } });
  assert.equal(inv.statusCode, 201);
  const token = inv.body.token;

  assert.equal((await call("POST", "invites/accept", { user: "tmallory|mal@evil.com", body: { token } })).statusCode, 403); // wrong email
  assert.equal((await call("POST", "invites/accept", { user: "tdev|dev@acme.com", body: { token } })).statusCode, 200);
  assert.equal((await call("POST", "invites/accept", { user: "tdev|dev@acme.com", body: { token } })).statusCode, 404); // single use

  // editor creates a link in the shared workspace; it is invisible in the personal one
  const link = await call("POST", "links", { user: "tdev", workspace: ws.id, body: { destination: "https://example.com/team", slug: "team-link" } });
  assert.equal(link.statusCode, 201);
  assert.equal(link.body.link.ownerId, ws.id);
  assert.equal(link.body.link.createdBy, "tdev");
  assert.equal((await call("GET", "links", { user: "tdev" })).body.links.length, 0);
  assert.equal((await call("GET", "links", { user: "tboss", workspace: ws.id })).body.links.length, 1);

  // non-members cannot even learn the workspace exists
  assert.equal((await call("GET", "links", { user: "tmallory", workspace: ws.id })).statusCode, 404);
  assert.equal((await call("GET", `workspaces/${ws.id}`, { user: "tmallory" })).statusCode, 404);

  // roles: editor can't manage members/keys/domains; viewer can't write
  assert.equal((await call("POST", `workspaces/${ws.id}/invites`, { user: "tdev", body: { email: "x@acme.com" } })).statusCode, 403);
  assert.equal((await call("GET", "keys", { user: "tdev", workspace: ws.id })).statusCode, 403);
  await call("PATCH", `workspaces/${ws.id}/members/tdev`, { user: "tboss", body: { role: "viewer" } });
  assert.equal((await call("POST", "links", { user: "tdev", workspace: ws.id, body: { destination: "https://example.com/x" } })).statusCode, 403);
  assert.equal((await call("GET", "links", { user: "tdev", workspace: ws.id })).statusCode, 200);
  assert.equal((await call("PATCH", `workspaces/${ws.id}/members/tboss`, { user: "tboss", body: { role: "viewer" } })).statusCode, 403); // owner immutable
  assert.equal((await call("DELETE", `workspaces/${ws.id}`, { user: "tdev" })).statusCode, 403);

  // plan limits come from the workspace owner's plan
  assert.equal((await call("GET", "me", { user: "tdev", workspace: ws.id })).body.plan.id, "pro");

  // seats: pro = 5
  for (const n of [1, 2, 3]) await call("POST", `workspaces/${ws.id}/invites`, { user: "tboss", body: { email: `s${n}@acme.com` } });
  assert.equal((await call("POST", `workspaces/${ws.id}/invites`, { user: "tboss", body: { email: "s4@acme.com" } })).statusCode, 402);

  // leaving
  assert.equal((await call("DELETE", `workspaces/${ws.id}/members/tdev`, { user: "tdev" })).statusCode, 200);
  assert.equal((await call("GET", "links", { user: "tdev", workspace: ws.id })).statusCode, 404);
  assert.equal((await call("DELETE", `workspaces/${ws.id}`, { user: "tboss" })).statusCode, 200);
  assert.equal(db.store.docs.has("links/loss.tr__team-link"), false);
});

test("audit log is recorded and pro-gated", async () => {
  assert.equal((await call("GET", "audit", { user: "afree" })).statusCode, 403);
  upgrade("aud", "pro");
  await call("POST", "links", { user: "aud", body: { destination: "https://example.com/a", slug: "audit-me" } });
  await call("DELETE", "links", { user: "aud", query: { id: "loss.tr__audit-me" } });
  const log = await call("GET", "audit", { user: "aud" });
  assert.deepEqual(log.body.entries.map((e) => e.action).sort(), ["link.create", "link.delete"]);
});

test("analytics: per-link and workspace scopes, plan-limited range", async () => {
  upgrade("ana", "pro");
  const link = (await call("POST", "links", { user: "ana", body: { destination: "https://example.com/an", slug: "ana-link" } })).body.link;
  for (const [country, src] of [["TR", "link"], ["TR", "qr"], ["DE", "link"]]) {
    await callRedirect("ana-link", { query: src === "qr" ? { qr: "1" } : {}, headers: { "x-vercel-ip-country": country, referer: "https://www.linkedin.com/feed", "user-agent": `Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36 ${country}${src}` } });
  }
  await tick();
  const one = (await call("GET", "analytics", { user: "ana", query: { id: link.id, days: "7" } })).body;
  assert.equal(one.totalClicks, 3);
  assert.equal(one.countries[0].name, "TR");
  assert.deepEqual(one.sources.map((s) => s.name).sort(), ["link", "qr"]);
  assert.equal(one.referrers[0].name, "linkedin.com");
  assert.equal(one.timeseries.length, 7);
  const all = (await call("GET", "analytics", { user: "ana", query: { scope: "workspace", days: "30" } })).body;
  assert.equal(all.totalClicks, 3);
  assert.equal(all.topLinks[0].id, link.id);
  // free plan is capped at 30 days
  assert.equal((await call("GET", "analytics", { user: "ana2", query: { scope: "workspace", days: "365" } })).body.days, 30);
});

test("abuse reports: public, rate limited, admin can disable the link", async () => {
  db.seed("links/loss.tr__phishy", { ownerId: "baduser", slug: "phishy", domain: "loss.tr", status: "active", destination: "https://example.com/" });
  const rep = (ip) => call("POST", "report", { body: { url: "https://loss.tr/phishy", reason: "phishing", details: "x" }, headers: { "x-real-ip": ip } });
  assert.equal((await rep("2.2.2.2")).statusCode, 201);
  assert.equal((await call("POST", "report", { body: { url: "nonsense" }, headers: { "x-real-ip": "2.2.2.2" } })).statusCode, 400);
  const codes = [];
  for (let i = 0; i < 7; i++) codes.push((await rep("3.3.3.3")).statusCode);
  assert.ok(codes.includes(429));

  assert.equal((await call("GET", "admin/reports", { user: "randomuser" })).statusCode, 404);
  process.env.ADMIN_UIDS = "mod1";
  const list = (await call("GET", "admin/reports", { user: "mod1" })).body.reports;
  assert.equal(list[0].linkId, "loss.tr__phishy");
  assert.equal((await call("POST", `admin/reports/${list[0].id}/resolve`, { user: "mod1", body: { decision: "disable" } })).statusCode, 200);
  assert.equal((await callRedirect("phishy")).statusCode, 410);
  // the owner cannot re-enable a disabled link
  assert.equal((await call("PATCH", "links", { user: "baduser", body: { id: "loss.tr__phishy", status: "active" } })).statusCode, 403);
  delete process.env.ADMIN_UIDS;
});

test("account: export contains no secrets; deletion needs confirmation and removes data", async () => {
  upgrade("gone", "starter");
  await call("POST", "links", { user: "gone", body: { destination: "https://example.com/g", slug: "gone-link", password: undefined } });
  const exp = (await call("GET", "account/export", { user: "gone" })).body;
  assert.equal(exp.links.length, 1);
  assert.ok(!JSON.stringify(exp).includes("scrypt$"));
  assert.equal((await call("DELETE", "account", { user: "gone", body: {} })).statusCode, 400);
  assert.equal((await call("DELETE", "account", { user: "gone", body: { confirm: "DELETE" } })).statusCode, 409); // active subscription
  db.seed("users/gone", { tier: "starter", subscription: { status: "active", cancelAtPeriodEnd: true } });
  assert.equal((await call("DELETE", "account", { user: "gone", body: { confirm: "DELETE" } })).statusCode, 200);
  assert.equal(db.store.docs.has("links/loss.tr__gone-link"), false);
});

test("me reports plan, features and usage", async () => {
  const me = (await call("GET", "me", { user: "newbie" })).body;
  assert.equal(me.tier, "free");
  assert.equal(me.plan.maxLinks, 25);
  assert.equal(me.plan.features.password, false);
  assert.equal(me.workspace.personal, true);
  assert.ok(me.plans.agency.features.audit);
  assert.equal((await call("GET", "me")).statusCode, 401);
});

// ── Billing ────────────────────────────────────────────────────────────────
const KEY = "test-key", SALT = "test-salt";
const sign = (oid, status, amount) => createHmac("sha256", KEY).update(`${oid}${SALT}${status}${amount}`).digest("base64");
async function postRaw(handler, body, headers = {}, method = "POST") {
  const res = mockResponse();
  await handler({ method, body, query: {}, headers, socket: {} }, res);
  return res;
}

test("PayTR callback: refuses without credentials, verifies signature, settles once, checks amount", async () => {
  delete process.env.PAYTR_MERCHANT_KEY; delete process.env.PAYTR_MERCHANT_SALT;
  assert.equal((await postRaw(paytrCallback, { merchant_oid: "X", status: "success", total_amount: "1", hash: createHmac("sha256", "").update("Xsuccess1").digest("base64") })).statusCode, 503);
  process.env.PAYTR_MERCHANT_KEY = KEY; process.env.PAYTR_MERCHANT_SALT = SALT;

  db.seed("orders/LOSSabc", { uid: "erin", tier: "pro", billingPeriod: "annual", amountKurus: 899000, status: "pending" });
  assert.equal((await postRaw(paytrCallback, { merchant_oid: "LOSSabc", status: "success", total_amount: "899000", hash: "forged" })).statusCode, 400);
  assert.equal((await getPlan(db, "erin")).tier, "free");
  const ok = await postRaw(paytrCallback, { merchant_oid: "LOSSabc", status: "success", total_amount: "899000", hash: sign("LOSSabc", "success", "899000"), ctoken: "ct" });
  assert.equal(ok.body, "OK");
  assert.equal((await getPlan(db, "erin")).tier, "pro");
  db.store.docs.get("users/erin").subscription.failedAttempts = 99;
  await postRaw(paytrCallback, { merchant_oid: "LOSSabc", status: "success", total_amount: "899000", hash: sign("LOSSabc", "success", "899000") });
  assert.equal(db.store.docs.get("users/erin").subscription.failedAttempts, 99); // replay is a no-op

  db.seed("orders/LOSSdef", { uid: "frank", tier: "agency", billingPeriod: "monthly", amountKurus: 249900, status: "pending" });
  await postRaw(paytrCallback, { merchant_oid: "LOSSdef", status: "success", total_amount: "100", hash: sign("LOSSdef", "success", "100") });
  assert.equal((await getPlan(db, "frank")).tier, "free");
  assert.equal(db.store.docs.get("orders/LOSSdef").status, "amount_mismatch");
});

test("checkout, cancel/resume and order history", async () => {
  assert.equal((await call("POST", "billing/token", { body: { tier: "pro" } })).statusCode, 401);
  assert.equal((await call("POST", "billing/token", { user: "erin", body: { tier: "free" } })).statusCode, 400);
  assert.equal((await call("POST", "billing/token", { user: "erin", body: { tier: "pro", billingPeriod: "weekly" } })).statusCode, 400);
  delete process.env.PAYTR_MERCHANT_ID;
  assert.equal((await call("POST", "billing/token", { user: "erin", body: { tier: "pro" } })).statusCode, 503);

  assert.equal((await call("POST", "billing/cancel", { user: "nobody" })).statusCode, 400);
  assert.equal((await call("POST", "billing/cancel", { user: "erin" })).statusCode, 200);
  assert.equal((await getPlan(db, "erin")).tier, "pro"); // access until period end
  assert.equal((await call("POST", "billing/resume", { user: "erin" })).statusCode, 200);
  db.seed("orders/LOSSx1", { uid: "erin", tier: "pro", billingPeriod: "monthly", amountKurus: 89900, status: "paid", createdAt: new Date() });
  const orders = (await call("GET", "billing/orders", { user: "erin" })).body.orders;
  assert.ok(orders.some((o) => o.id === "LOSSx1" && o.amountTl === 899));
});

test("recurring job fails closed", async () => {
  delete process.env.CRON_SECRET;
  assert.equal((await postRaw(paytrRecurring, {}, { authorization: "Bearer anything" }, "GET")).statusCode, 401);
  process.env.CRON_SECRET = "s3cret";
  assert.equal((await postRaw(paytrRecurring, {}, { authorization: "Bearer wrong" }, "GET")).statusCode, 401);
  assert.equal((await postRaw(paytrRecurring, {}, {}, "GET")).statusCode, 401);
});
