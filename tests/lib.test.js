import test from "node:test";
import assert from "node:assert/strict";
import { validateDestination, isSafeRedirectTarget } from "../server/lib/urlSafety.js";
import { hashPassword, verifyPassword, needsRehash, validatePasswordInput } from "../server/lib/password.js";
import { validateSlug, generateSlug, isExpired, validateExpiry, serializeLink } from "../server/lib/links.js";
import { memoryLimit } from "../server/lib/rateLimit.js";
import { escapeHtml, passwordPage } from "../server/lib/pages.js";
import { parseUserAgent, parseReferrer, isBot } from "../server/lib/clicks.js";
import { createHash } from "node:crypto";

test("destination: accepts normal https and http URLs", () => {
  assert.equal(validateDestination("https://example.com/a?b=1#c").ok, true);
  assert.equal(validateDestination("  http://example.org  ").url, "http://example.org/");
});

test("destination: rejects dangerous schemes", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,hi", "file:///etc/passwd", "ftp://example.com", "vbscript:x"]) {
    assert.equal(validateDestination(url).ok, false, url);
  }
});

test("destination: rejects embedded credentials, loopback, private and numeric hosts", () => {
  for (const url of [
    "https://paypal.com@evil.example/login",
    "http://localhost:3000",
    "http://127.0.0.1/admin",
    "http://10.0.0.5",
    "http://192.168.1.1",
    "http://169.254.169.254/latest/meta-data",
    "http://2130706433/",
    "http://0x7f000001/",
    "http://[::1]/",
    "http://printer.local/",
    "http://intranet/",
  ]) {
    assert.equal(validateDestination(url).ok, false, url);
  }
});

test("destination: rejects own hosts, other shorteners, whitespace and oversize input", () => {
  assert.equal(validateDestination("https://loss.tr/abc").ok, false);
  assert.equal(validateDestination("https://sub.loss.tr/abc").ok, false);
  assert.equal(validateDestination("https://bit.ly/abc").ok, false);
  assert.equal(validateDestination("https://example.com/a b").ok, false);
  assert.equal(validateDestination("https://example.com/" + "a".repeat(2100)).ok, false);
  assert.equal(validateDestination("").ok, false);
  assert.equal(validateDestination(undefined).ok, false);
  assert.equal(validateDestination({}).ok, false);
});

test("redirect-time target check", () => {
  assert.equal(isSafeRedirectTarget("https://example.com"), true);
  assert.equal(isSafeRedirectTarget("javascript:alert(1)"), false);
  assert.equal(isSafeRedirectTarget("https://u:p@example.com"), false);
  assert.equal(isSafeRedirectTarget(undefined), false);
});

test("password: scrypt round trip, wrong password, uniqueness", () => {
  const a = hashPassword("hunter22");
  assert.ok(a.startsWith("scrypt$"));
  assert.equal(verifyPassword("hunter22", a), true);
  assert.equal(verifyPassword("hunter23", a), false);
  assert.notEqual(a, hashPassword("hunter22"));
  assert.equal(needsRehash(a), false);
});

test("password: legacy sha256 hashes still verify and are flagged for rehash", () => {
  const salt = "00112233445566778899aabbccddeeff";
  const legacy = `${salt}:${createHash("sha256").update(salt + "secret").digest("hex")}`;
  assert.equal(verifyPassword("secret", legacy), true);
  assert.equal(verifyPassword("nope", legacy), false);
  assert.equal(needsRehash(legacy), true);
  assert.equal(verifyPassword("x", ""), false);
  assert.equal(verifyPassword("x", "garbage"), false);
});

test("password input validation", () => {
  assert.deepEqual(validatePasswordInput(""), { ok: true, value: "" });
  assert.equal(validatePasswordInput("abc").ok, false);
  assert.equal(validatePasswordInput("a".repeat(129)).ok, false);
  assert.equal(validatePasswordInput(1234).ok, false);
  assert.equal(validatePasswordInput("good-pass").ok, true);
});

test("slug validation: reserved, short, invalid chars, normalisation", () => {
  assert.deepEqual(validateSlug("My-Link_1"), { ok: true, slug: "my-link_1" });
  assert.equal(validateSlug("ab").ok, false);
  assert.equal(validateSlug("a".repeat(49)).ok, false);
  assert.equal(validateSlug("has space").ok, false);
  assert.equal(validateSlug("../etc").ok, false);
  assert.equal(validateSlug("a/b").ok, false);
  for (const reserved of ["api", "billing", "links", "settings", "admin", "analytics"]) {
    assert.equal(validateSlug(reserved).ok, false, reserved);
  }
});

test("generated slugs are lowercase base36 and distinct", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const s = generateSlug();
    assert.match(s, /^[0-9a-z]{8}$/);
    seen.add(s);
  }
  assert.equal(seen.size, 500);
});

test("expiry handling", () => {
  assert.equal(isExpired({ expiresAt: "" }), false);
  assert.equal(isExpired({}), false);
  assert.equal(isExpired({ expiresAt: new Date(Date.now() - 1000).toISOString() }), true);
  assert.equal(isExpired({ expiresAt: new Date(Date.now() + 60000).toISOString() }), false);
  assert.equal(isExpired({ expiresAt: { toMillis: () => Date.now() - 5 } }), true);
  assert.equal(isExpired({ expiresAt: "not a date" }), false);
  assert.equal(validateExpiry("").ok, true);
  assert.equal(validateExpiry("garbage").ok, false);
  assert.equal(validateExpiry(new Date(Date.now() - 1000).toISOString()).ok, false);
  assert.equal(validateExpiry(new Date(Date.now() + 60000).toISOString()).ok, true);
});

test("serializeLink never leaks the password hash", () => {
  const out = serializeLink("loss.tr__abc", { slug: "abc", password: "scrypt$aa$bb", ownerId: "u1" });
  assert.equal(out.password, "••••••");
  assert.equal(out.hasPassword, true);
  assert.ok(!JSON.stringify(out).includes("scrypt$"));
  assert.equal(serializeLink("x", { slug: "abc", password: "" }).hasPassword, false);
});

test("memory rate limiter blocks after the limit and reports retryAfter", () => {
  const key = `t-${Math.random()}`;
  for (let i = 0; i < 3; i++) assert.equal(memoryLimit(key, 3, 60000).ok, true);
  const blocked = memoryLimit(key, 3, 60000);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfter > 0);
});

test("html escaping in server pages", () => {
  assert.equal(escapeHtml(`<script>"'&`), "&lt;script&gt;&quot;&#39;&amp;");
  const html = passwordPage(`x"><script>alert(1)</script>`);
  assert.ok(!html.includes("<script>alert(1)"));
});

test("user agent, referrer and bot parsing", () => {
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  assert.deepEqual(parseUserAgent(iphone), { device: "mobile", os: "iOS", browser: "Safari" });
  const chrome = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
  assert.deepEqual(parseUserAgent(chrome), { device: "desktop", os: "Windows", browser: "Chrome" });
  assert.equal(parseReferrer(""), "direct");
  assert.equal(parseReferrer("https://www.linkedin.com/feed"), "linkedin.com");
  assert.equal(parseReferrer("not a url"), "other");
  assert.equal(isBot("Googlebot/2.1"), true);
  assert.equal(isBot("facebookexternalhit/1.1"), true);
  assert.equal(isBot(""), true);
  assert.equal(isBot(chrome), false);
});
