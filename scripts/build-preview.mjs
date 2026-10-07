// Builds the app as ONE self-contained HTML file in demo mode (hash routing,
// no backend). Used for static previews; not part of the production build.
//   node scripts/build-preview.mjs [outfile]
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const out = resolve(process.argv[2] || "dist-preview/preview.html");
const dir = resolve("dist-preview-tmp");
process.env.VITE_HASH_ROUTER = "1";

await build({
  plugins: [react()],
  base: "./",
  logLevel: "warn",
  define: { "import.meta.env.VITE_HASH_ROUTER": JSON.stringify("1") },
  build: { outDir: dir, emptyOutDir: true, assetsInlineLimit: 100_000_000, cssCodeSplit: false, rollupOptions: { output: { inlineDynamicImports: true } } },
});

const assets = readdirSync(join(dir, "assets"));
const js = readFileSync(join(dir, "assets", assets.find((f) => f.endsWith(".js"))), "utf8").replace(/<\/script/gi, "<\\/script");
const css = readFileSync(join(dir, "assets", assets.find((f) => f.endsWith(".css"))), "utf8");
let html = readFileSync(join(dir, "index.html"), "utf8");
html = html
  .replace(/<title>[\s\S]*?<\/title>/, "<title>Loss Demo</title>")
  .replace(/<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/, "")
  .replace(/<link rel="stylesheet"[^>]*href="\.\/assets\/[^"]*"[^>]*>/, "")
  .replace(/<link[^>]*rel="(?:icon|apple-touch-icon|manifest)"[^>]*>/g, "")
  .replace("</head>", () => `<style>${css}</style></head>`)
  .replace("</body>", () => `<script type="module">${js}</script></body>`);
writeFileSync(out, html);
rmSync(dir, { recursive: true, force: true });
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
