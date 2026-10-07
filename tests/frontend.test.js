import test from "node:test";
import assert from "node:assert/strict";
import { applyUtm, isValidUrl, normalizeUrl, parseCsv, toCsv, formatNumber, flag, toMillis } from "../src/lib/format.js";
import { PUBLIC_PLANS } from "../src/lib/plans.js";
import { PLANS } from "../server/lib/plans.js";

test("public plan copy matches the authoritative server plan matrix", () => {
  for (const p of PUBLIC_PLANS) {
    const s = PLANS[p.id];
    assert.equal(p.maxLinks, s.maxLinks, `${p.id} maxLinks`);
    assert.equal(p.domains, s.domains, `${p.id} domains`);
    assert.equal(p.members, s.members, `${p.id} members`);
    assert.equal(p.analyticsDays, s.analyticsDays, `${p.id} analyticsDays`);
    assert.equal(p.monthly, s.monthly || 0, `${p.id} monthly`);
    assert.equal(p.annual, s.annual || 0, `${p.id} annual`);
    assert.deepEqual([...p.features].sort(), Object.entries(s.features).filter(([, v]) => v).map(([k]) => k).sort(), `${p.id} features`);
  }
});

test("annual price is exactly ten months (the advertised '2 months free')", () => {
  for (const p of PUBLIC_PLANS.filter((x) => x.monthly)) assert.equal(p.annual, p.monthly * 10);
});

test("URL helpers", () => {
  assert.equal(normalizeUrl(" example.com/a "), "https://example.com/a");
  assert.equal(normalizeUrl("http://x.io"), "http://x.io");
  assert.equal(isValidUrl("example.com"), true);
  assert.equal(isValidUrl("javascript:alert(1)"), false);
  assert.equal(isValidUrl("localhost"), false);
  assert.equal(isValidUrl(""), false);
});

test("UTM builder adds, replaces and removes parameters", () => {
  assert.equal(applyUtm("https://a.com/p", { source: "news", campaign: "x y" }), "https://a.com/p?utm_source=news&utm_campaign=x+y");
  assert.equal(applyUtm("https://a.com/p?utm_source=old&k=1", { source: "new" }), "https://a.com/p?utm_source=new&k=1");
  assert.equal(applyUtm("https://a.com/p?utm_source=old", { source: "" }), "https://a.com/p");
});

test("CSV round-trips quotes, commas and newlines; tolerates ; and BOM", () => {
  const rows = [["destination", "title"], ["https://a.com/?x=1,2", 'He said "hi"'], ["https://b.com", "line1\nline2"]];
  assert.deepEqual(parseCsv(toCsv(rows)), rows);
  assert.deepEqual(parseCsv("﻿a;b\r\n1;2\r\n"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(parseCsv("a,b\n\n\n1,2"), [["a", "b"], ["1", "2"]]);
});

test("misc formatters", () => {
  assert.equal(formatNumber(1234, "en"), "1,234");
  assert.equal(flag("TR"), "🇹🇷");
  assert.equal(flag("zz1"), "🌐");
  assert.equal(toMillis({ seconds: 5 }), 5000);
  assert.equal(toMillis("not a date"), null);
});
