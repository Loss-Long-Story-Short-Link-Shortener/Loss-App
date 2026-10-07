// Minimal server-rendered pages for the redirect endpoint. Every dynamic
// value is HTML-escaped or passed through a data attribute.

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const STYLES = `
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;background:#0b1020;color:#f1f5f9;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.card{max-width:400px;width:100%;text-align:center;padding:32px 28px;background:#111827;border:1px solid #243049;border-radius:12px}
h1{font-size:19px;font-weight:700;margin-bottom:8px}
p{font-size:14px;color:#a3b2c7;line-height:1.55;margin-bottom:20px}
a.btn,button{display:inline-block;width:100%;padding:11px;background:#38bdf8;color:#06101f;border:0;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none}
a.btn:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid #fff;outline-offset:2px}
input{width:100%;padding:11px 14px;margin-bottom:12px;background:#0b1020;border:1px solid #33425f;border-radius:8px;color:#fff;font-size:14px}
.err{display:none;margin-bottom:12px;padding:8px;border-radius:6px;background:rgba(239,68,68,.12);color:#fca5a5;font-size:13px}
.code{font-size:12px;color:#64748b;margin-bottom:10px;letter-spacing:.08em}
`;

function shell(title, body, scriptSrc = "") {
  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<title>${escapeHtml(title)} - loss.tr</title><style>${STYLES}</style></head>
<body><main class="card">${body}</main>${scriptSrc ? `<script src="${escapeHtml(scriptSrc)}"></script>` : ""}</body></html>`;
}

export function statusPage(code, title, message) {
  return shell(
    title,
    `<div class="code">${escapeHtml(code)}</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a class="btn" href="/">loss.tr ana sayfa</a>`,
  );
}

export function passwordPage(slug) {
  return shell(
    "Şifreli Bağlantı",
    `<h1>Şifreli Bağlantı</h1>
<p>Bu bağlantıya erişmek için parolayı girin.</p>
<form id="f" data-slug="${escapeHtml(slug)}">
<label for="pw" style="display:block;text-align:left;font-size:13px;margin-bottom:6px;color:#a3b2c7">Parola</label>
<input type="password" id="pw" autocomplete="off" autofocus required maxlength="128"/>
<div class="err" id="err" role="alert"></div>
<button type="submit">Bağlantıyı aç</button></form>`,
    "/unlock.js",
  );
}

export function ogPage({ title, description, image, url, destination }) {
  const tags = [
    ["og:type", "website"], ["og:url", url], ["og:title", title], ["og:description", description], ["og:image", image],
    ["twitter:card", image ? "summary_large_image" : "summary"], ["twitter:title", title], ["twitter:description", description], ["twitter:image", image],
  ].filter(([, v]) => v);
  const meta = tags.map(([k, v]) => `<meta property="${escapeHtml(k)}" name="${escapeHtml(k)}" content="${escapeHtml(v)}"/>`).join("\n");
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/><title>${escapeHtml(title)}</title>
<meta name="robots" content="noindex,nofollow"/>
${meta}</head><body><a href="${escapeHtml(destination)}">${escapeHtml(title)}</a></body></html>`;
}
