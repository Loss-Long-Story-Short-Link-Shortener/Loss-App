import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin, allowCors } from "../_firebase.js";

export default async function handler(request, response) {
  allowCors(response);
  if (request.method !== "GET" && request.method !== "HEAD") {
    return response.status(405).send("Method not allowed");
  }

  const rawSlug = String(request.query.slug || "").trim();
  const lowerSlug = rawSlug.toLowerCase();

  const requestHost = (
    request.headers["x-forwarded-host"] ||
    request.headers.host ||
    "loss.tr"
  )
    .split(",")[0]
    .trim()
    .toLowerCase();
  const configuredHost = (
    process.env.SHORT_LINK_HOST || "loss.tr"
  )
    .trim()
    .toLowerCase();

  if (!rawSlug || rawSlug.length > 48)
    return response.status(404).send("Link not found");

  try {
    const { db } = await getFirebaseAdmin();
    const candidateHosts = [
      ...new Set([
        configuredHost,
        requestHost,
        "loss.tr",
        "go.loss.tr",
        "loss.consolaktif.com.tr",
        "go.consolaktif.com.tr",
      ]),
    ];
    const candidateSlugs = [...new Set([rawSlug, lowerSlug])];

    let linkRef;
    let linkSnapshot;

    // 1. Try direct document key lookup across candidate hosts and slug casings
    for (const host of candidateHosts) {
      for (const s of candidateSlugs) {
        const candidateRef = db.collection("links").doc(`${host}__${s}`);
        const candidateSnapshot = await candidateRef.get();
        if (candidateSnapshot.exists) {
          linkRef = candidateRef;
          linkSnapshot = candidateSnapshot;
          break;
        }
      }
      if (linkSnapshot?.exists) break;
    }

    // 2. Fallback query by slug field across collection
    if (!linkSnapshot?.exists) {
      for (const s of candidateSlugs) {
        const querySnap = await db
          .collection("links")
          .where("slug", "==", s)
          .limit(1)
          .get();
        if (!querySnap.empty) {
          linkSnapshot = querySnap.docs[0];
          linkRef = linkSnapshot.ref;
          break;
        }
      }
    }

    if (!linkSnapshot?.exists) {
      return response.redirect(302, `https://${requestHost}/?r=${encodeURIComponent(rawSlug)}`);
    }

    const link = linkSnapshot.data();
    if (link.status !== "active") {
      return response.status(410).send("Link is no longer active");
    }

    await Promise.all([
      linkRef.update({
        clickCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      }),
      linkRef.collection("clicks").add({
        createdAt: FieldValue.serverTimestamp(),
        userAgent: request.headers["user-agent"] || null,
        referer: request.headers.referer || null,
      }),
    ]);

    // Password protected links require the interactive unlock screen in the SPA
    if (link.password) {
      return response.redirect(302, `https://${requestHost}/?r=${encodeURIComponent(rawSlug)}`);
    }

    // Direct programmatic redirect
    if (request.query.direct === "1") {
      return response.redirect(302, link.destination);
    }

    // Branded Long Story Short redirect page
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    return response.status(200).send(
      renderRedirectPage({
        destination: link.destination,
        slug: rawSlug,
        brandHost: requestHost,
      })
    );
  } catch (error) {
    console.error(error);
    return response.redirect(302, `https://${requestHost}/?r=${encodeURIComponent(rawSlug)}`);
  }
}

function renderRedirectPage({ destination, slug, brandHost = "loss.tr" }) {
  let targetDomain = "Hedef Web Sitesi";
  try {
    targetDomain = new URL(destination).hostname;
  } catch {}

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${targetDomain}&sz=64`;

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${targetDomain} — Long Story Short</title>
  <meta http-equiv="refresh" content="2;url=${destination}" />
  <link rel="icon" type="image/png" href="/loss.png" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 50% 15%, rgba(37, 99, 235, 0.12), transparent 60%), #0a0a0a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #ffffff;
      padding: 24px 20px;
    }
    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
      text-decoration: none;
    }
    .brand-badge img { width: 28px; height: 28px; object-fit: contain; }
    .brand-name { font-size: 16px; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
    .card {
      width: 100%;
      max-width: 440px;
      background: #141414;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 34px 28px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .avatar {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: #1a1a1a;
      border: 1px solid rgba(255, 255, 255, 0.14);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }
    .avatar img { width: 28px; height: 28px; object-fit: contain; border-radius: 6px; }
    .title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    .security-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 3px 10px;
      border-radius: 9999px;
      margin-bottom: 16px;
    }
    .dest-box {
      font-size: 13px;
      color: #a1a1aa;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: monospace;
      background: #0d0d0d;
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 8px 14px;
      border-radius: 8px;
      width: 100%;
      margin-bottom: 22px;
    }
    .progress-track {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .progress-bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      animation: fillProgress 2s linear forwards;
    }
    @keyframes fillProgress {
      from { width: 0%; }
      to { width: 100%; }
    }
    .countdown-text {
      font-size: 13px;
      color: #a1a1aa;
      margin-bottom: 22px;
    }
    .countdown-text strong { color: #fff; }
    .btn-go {
      width: 100%;
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 12px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .btn-go:hover { background: #1d4ed8; }
    .footer-note {
      margin-top: 24px;
      font-size: 12px;
      color: #71717a;
    }
    .footer-note a { color: #3b82f6; text-decoration: none; }
    .footer-note a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <a class="brand-badge" href="/">
    <img src="/loss.png" alt="Long Story Short" />
    <span class="brand-name">Long Story Short</span>
  </a>

  <div class="card">
    <div class="avatar">
      <img src="${faviconUrl}" alt="" onerror="this.style.display='none'" />
    </div>

    <h1 class="title">${targetDomain} adresine yönlendiriliyorsunuz</h1>

    <div class="security-badge">✓ Güvenli Bağlantı Doğrulandı (SSL)</div>

    <div class="dest-box" title="${destination}">${destination}</div>

    <div class="progress-track">
      <div class="progress-bar"></div>
    </div>

    <div class="countdown-text" id="countdown-label">
      2 saniye içinde yönlendirileceksiniz...
    </div>

    <a href="${destination}" class="btn-go" id="go-btn">
      Hemen Git &rarr;
    </a>
  </div>

  <div class="footer-note">
    Long Story Short ile güvenli yönlendirme &bull; <a href="/">Kendi Linkinizi Kısaltın</a>
  </div>

  <script>
    var count = 2;
    var timer = setInterval(function() {
      count--;
      var el = document.getElementById('countdown-label');
      if (el && count > 0) {
        el.innerText = count + ' saniye içinde yönlendirileceksiniz...';
      }
      if (count <= 0) {
        clearInterval(timer);
        window.location.replace('${destination}');
      }
    }, 1000);
  </script>
</body>
</html>`;
}

export const config = { runtime: "nodejs" };
