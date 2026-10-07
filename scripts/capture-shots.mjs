// Captures the landing-page screenshots from the real UI in demo mode.
//   npx vite --port 5173 &   then   node scripts/capture-shots.mjs
// Requires playwright-core and a Chromium binary (CHROMIUM_PATH). Output: src/assets/shots/*.png → convert with PIL/sharp to webp.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:5173";
const OUT = process.env.OUT || "src/assets/shots";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

for (const theme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5, colorScheme: theme, locale: "tr-TR" });
  await ctx.addInitScript((th) => { localStorage.setItem("loss_lang", "tr"); localStorage.setItem("loss_theme", th); localStorage.setItem("loss_demo_active", "1"); }, theme);
  const page = await ctx.newPage();
  await page.addStyleTag({ content: "" }).catch(() => {});
  const hideBanner = () => page.addStyleTag({ content: ".demo-banner{display:none!important}" });
  const shot = async (name, path, prep) => {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await hideBanner();
    if (prep) await prep();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${name}-${theme}.png` });
  };
  await shot("links", "/app");
  await shot("analytics", "/app/analytics");
  await shot("qr", "/app/qr");
  await shot("domains", "/app/domains");
  await shot("editor", "/app", async () => {
    await page.getByRole("button", { name: "Yeni bağlantı" }).first().click();
    await page.locator("#le-dest").fill("https://uygulama.markaniz.com/indir");
    await page.locator("#le-slug").fill("indir");
    await page.getByRole("dialog").locator("summary", { hasText: "Cihaz ve ülke hedefleme" }).click();
    await page.locator("#le-ios").fill("https://apps.apple.com/tr/app/markaniz/id000000");
    await page.locator("#le-and").fill("https://play.google.com/store/apps/details?id=com.markaniz");
  });
  await ctx.close();
}
await browser.close();
console.log("done");
