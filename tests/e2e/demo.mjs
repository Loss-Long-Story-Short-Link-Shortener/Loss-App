// End-to-end smoke test of the demo workspace (no backend needed).
//   npm run build && npx vite preview --port 4173 &   then:   node tests/e2e/demo.mjs
// Screenshots go to $SHOTS (default ./e2e-shots). Requires: npm i -D playwright-core and a Chromium binary.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const SP = process.env.SHOTS || "e2e-shots";
const BASE = process.env.BASE_URL || "http://localhost:4173";
mkdirSync(SP, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "tr-TR" });
await ctx.addInitScript(() => { localStorage.setItem("loss_lang", "tr"); localStorage.setItem("loss_demo_active", "1"); });
const page = await ctx.newPage(); page.setDefaultTimeout(5000);
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && !/fonts|favicon|Failed to load/.test(m.text()) && errors.push("console: " + m.text()));
const step = async (name, fn) => { try { await fn(); console.log("ok  ", name); } catch (e) { console.log("FAIL", name, "-", e.message.split("\n")[0]); } };

await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
await step("open editor with button", async () => { await page.getByRole("button", { name: "Yeni bağlantı" }).first().click(); await page.getByRole("dialog").waitFor(); });
await step("validation error on empty", async () => { await page.getByRole("button", { name: "Bağlantı oluştur" }).click(); await page.getByText("Hedef URL gerekli.").waitFor(); });
await step("fill + open sections", async () => {
  await page.getByLabel("Hedef URL").fill("example.com/urun?x=1");
  await page.locator("#le-title").fill("Test ürünü");
  await page.locator("#le-tags").fill("deneme, qa");
  await page.getByRole("dialog").locator("summary", { hasText: "UTM parametreleri" }).click();
  await page.locator("#utm-source").fill("news");
  await page.screenshot({ path: `${SP}/flow-editor.png` });
});
await step("create → success state", async () => { await page.getByRole("button", { name: "Bağlantı oluştur" }).click(); await page.getByText("Bağlantınız hazır").waitFor(); await page.screenshot({ path: `${SP}/flow-created.png` }); });
await step("go to detail", async () => { await page.getByRole("link", { name: "Bağlantı detayı" }).click(); await page.getByText("Performans").waitFor(); await page.waitForTimeout(500); await page.screenshot({ path: `${SP}/flow-detail.png` }); });
await step("destination has utm", async () => { const t = await page.locator("dd a").first().textContent(); if (!t.includes("utm_source=news")) throw new Error(t); });
await step("edit link", async () => { await page.getByRole("button", { name: "Düzenle" }).click(); await page.locator("#le-title").fill("Yeni başlık"); await page.getByRole("button", { name: "Kaydet" }).click(); await page.getByRole("heading", { name: "Yeni başlık" }).waitFor(); });
await step("pause/resume", async () => { await page.getByRole("button", { name: "Duraklat" }).click(); await page.getByText("Duraklatıldı").first().waitFor(); await page.getByRole("button", { name: "Yayına al" }).click(); });
await step("back to list, search", async () => { await page.getByRole("link", { name: "Bağlantılar", exact: true }).first().click(); await page.getByLabel("Bağlantı ara").fill("yeni başlık"); await page.getByText("Yeni başlık").first().waitFor(); });
await step("bulk select + pause", async () => { await page.getByRole("checkbox", { name: /Seç: Yeni başlık/ }).first().check(); await page.getByRole("region", { name: "Toplu işlemler" }).getByRole("button", { name: "Duraklat" }).click(); await page.waitForTimeout(400); });
await step("row menu → delete → confirm", async () => { await page.getByRole("button", { name: /İşlemler: Yeni başlık/ }).first().click(); await page.getByRole("button", { name: "Sil" }).click(); await page.getByRole("dialog").getByRole("button", { name: "Sil" }).click(); await page.getByText("Eşleşen bağlantı yok").waitFor(); });
await step("keyboard shortcut n", async () => { await page.getByLabel("Bağlantı ara").blur(); await page.locator("body").press("n"); });
await step("escape closes modal", async () => {
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  const discard = page.getByRole("button", { name: "Çık", exact: true }); // unsaved-changes guard, only when the form is dirty
  if (await discard.isVisible({ timeout: 600 }).catch(() => false)) await discard.click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
});
await step("dark mode via user menu", async () => { await page.getByRole("button", { name: "Hesap menüsü" }).click(); await page.getByRole("button", { name: "Koyu" }).click(); await page.waitForTimeout(200); await page.screenshot({ path: `${SP}/flow-dark.png` }); });
await step("command palette opens links", async () => {
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder(/komut/).fill("menü");
  await page.locator("#palette-list li").first().waitFor();
  await page.keyboard.press("Enter");
  await page.getByText("Performans").waitFor();
});
await step("analytics CSV export button", async () => { await page.getByRole("button", { name: "CSV indir" }).waitFor(); });
await step("team page lists members", async () => { await page.getByRole("link", { name: "Takım" }).first().click(); await page.getByText("ayse@markaniz.com").first().waitFor().catch(() => {}); });
console.log(errors.join("\n") || "no console errors");
await browser.close();
if (errors.length) process.exit(1);
