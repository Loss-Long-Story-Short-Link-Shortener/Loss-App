import { FieldValue } from "firebase-admin/firestore";
import { createHash } from "crypto";
import { getFirebaseAdmin, allowCors } from "../_firebase.js";

// ── In-Memory Fast Edge Cache (LRU-like, 30s TTL) ───────────────────────────
const LINK_CACHE = new Map();
const MAX_CACHE_ENTRIES = 5000;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

function getCachedLink(key) {
  const entry = LINK_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    LINK_CACHE.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedLink(key, data) {
  if (LINK_CACHE.size >= MAX_CACHE_ENTRIES) {
    // Evict oldest entry
    const firstKey = LINK_CACHE.keys().next().value;
    if (firstKey) LINK_CACHE.delete(firstKey);
  }
  LINK_CACHE.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateLinkCache(key) {
  LINK_CACHE.delete(key);
}

// ── GDPR Daily Rotating Salt Generator ─────────────────────────────────────
function getDailySalt() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const secret = process.env.SALT_SECRET || "loss_gdpr_salt_secret_v2";
  return createHash("sha256").update(`${today}::${secret}`).digest("hex");
}

// ── Lightweight User-Agent & Device Parsers ─────────────────────────────────
function parseUserAgent(ua = "") {
  const s = ua.toLowerCase();

  // Device
  let device = "desktop";
  if (/ipad|tablet|(android(?!.*mobile))/i.test(s)) {
    device = "tablet";
  } else if (
    /mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(s)
  ) {
    device = "mobile";
  }

  // OS
  let os = "Other";
  if (s.includes("windows")) os = "Windows";
  else if (s.includes("iphone") || s.includes("ipad") || s.includes("ios"))
    os = "iOS";
  else if (s.includes("mac os") || s.includes("macintosh")) os = "macOS";
  else if (s.includes("android")) os = "Android";
  else if (s.includes("linux")) os = "Linux";

  // Browser
  let browser = "Other";
  if (s.includes("edg/")) browser = "Edge";
  else if (s.includes("chrome") && !s.includes("edg/")) browser = "Chrome";
  else if (s.includes("safari") && !s.includes("chrome")) browser = "Safari";
  else if (s.includes("firefox")) browser = "Firefox";
  else if (s.includes("opr") || s.includes("opera")) browser = "Opera";

  return { device, os, browser };
}

function parseReferrer(ref = "") {
  if (!ref) return "direct";
  try {
    const url = new URL(ref);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("instagram.com")) return "instagram.com";
    if (
      host.includes("twitter.com") ||
      host.includes("x.com") ||
      host.includes("t.co")
    )
      return "x.com";
    if (host.includes("linkedin.com")) return "linkedin.com";
    if (host.includes("facebook.com")) return "facebook.com";
    if (host.includes("youtube.com") || host.includes("youtu.be"))
      return "youtube.com";
    if (host.includes("google.")) return "google.com";
    if (host.includes("tiktok.com")) return "tiktok.com";
    return host;
  } catch {
    return "other";
  }
}

export default async function handler(request, response) {
  allowCors(response);
  if (request.method !== "GET" && request.method !== "HEAD") {
    return response.status(405).send("Method not allowed");
  }

  const rawSlug = String(request.query.slug || "").trim();
  const lowerSlug = rawSlug.toLowerCase();

  if (!rawSlug || rawSlug.length > 48) {
    return response.status(404).send("Link not found");
  }

  const host = (process.env.SHORT_LINK_HOST || "loss.tr").trim().toLowerCase();
  const canonicalId = `${host}__${lowerSlug}`;

  let link = null;
  let linkDocId = canonicalId;

  // 1. Check in-memory fast edge cache (< 3ms)
  const cached = getCachedLink(canonicalId);
  if (cached) {
    link = cached;
  } else {
    try {
      const { db } = await getFirebaseAdmin();

      // 2. Fetch canonical document
      let linkRef = db.collection("links").doc(canonicalId);
      let linkSnapshot = await linkRef.get();

      // 3. Fallback: try case-sensitive or slug query
      if (!linkSnapshot.exists && rawSlug !== lowerSlug) {
        const altRef = db.collection("links").doc(`${host}__${rawSlug}`);
        const altSnapshot = await altRef.get();
        if (altSnapshot.exists) {
          linkSnapshot = altSnapshot;
          linkDocId = `${host}__${rawSlug}`;
        }
      }

      if (!linkSnapshot.exists) {
        const querySnap = await db
          .collection("links")
          .where("slug", "==", lowerSlug)
          .limit(1)
          .get();
        if (!querySnap.empty) {
          linkSnapshot = querySnap.docs[0];
          linkDocId = linkSnapshot.id;
        }
      }

      if (linkSnapshot && linkSnapshot.exists) {
        link = linkSnapshot.data();
        setCachedLink(canonicalId, link);
      }
    } catch (err) {
      console.error("Firestore lookup error:", err);
    }
  }

  if (!link) {
    return response.status(404).send("Link not found");
  }

  // 4. Status Check
  if (link.status !== "active") {
    return response
      .status(410)
      .send("Bu bağlantı yayından kaldırılmış veya duraklatılmıştır.");
  }

  // 5. Expiration Check
  if (link.expiresAt) {
    let expiryTime;
    if (typeof link.expiresAt === "string") {
      expiryTime = new Date(link.expiresAt).getTime();
    } else if (link.expiresAt?.toMillis) {
      expiryTime = link.expiresAt.toMillis();
    } else if (typeof link.expiresAt === "number") {
      expiryTime = link.expiresAt;
    }

    if (expiryTime && !isNaN(expiryTime) && Date.now() > expiryTime) {
      return response
        .status(410)
        .send("Bu bağlantının geçerlilik süresi dolmuştur.");
    }
  }

  // 6. Password Protection Challenge
  if (link.password) {
    const baseUrl = (
      process.env.SHORT_LINK_BASE_URL || "https://loss.tr"
    ).replace(/\/$/, "");
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    return response.status(200).send(`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Şifreli Bağlantı — loss.tr</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#090d16;color:#f8fafc;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif}
    .card{max-width:390px;width:90%;text-align:center;padding:36px 28px;background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,0.5)}
    .icon{width:48px;height:48px;margin:0 auto 16px;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.25);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#38bdf8;font-size:22px}
    h1{font-size:18px;font-weight:700;margin-bottom:6px;letter-spacing:-0.02em}
    p{font-size:13px;color:#94a3b8;margin-bottom:22px;line-height:1.5}
    input{width:100%;padding:11px 14px;background:#090d16;border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;font-size:14px;text-align:center;outline:none;margin-bottom:12px;transition:border-color .15s}
    input:focus{border-color:#38bdf8}
    button{width:100%;padding:11px;background:#38bdf8;color:#090d16;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .15s}
    button:hover{opacity:.9}
    .err{color:#ef4444;font-size:12.5px;margin-bottom:12px;display:none;padding:6px;background:rgba(239,68,68,0.1);border-radius:6px}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔒</div>
    <h1>Şifreli Bağlantı</h1>
    <p>Bu bağlantıya erişebilmek için belirlenen parolayı girmelisiniz.</p>
    <form id="f">
      <input type="password" id="pw" placeholder="Erişim Şifresi" autofocus required/>
      <div class="err" id="err">Hatalı parola girdiniz.</div>
      <button type="submit">Bağlantıyı Aç →</button>
    </form>
  </div>
  <script>
    document.getElementById('f').addEventListener('submit',async e=>{
      e.preventDefault();
      const pw=document.getElementById('pw').value;
      const errEl=document.getElementById('err');
      errEl.style.display='none';
      try{
        const r=await fetch('${baseUrl}/api/verify-password',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({slug:'${lowerSlug}',password:pw})
        });
        const d=await r.json();
        if(r.ok&&d.destination){window.location.replace(d.destination)}
        else{errEl.textContent=d.error||'Hatalı parola';errEl.style.display='block'}
      }catch{errEl.textContent='Bir bağlantı hatası oluştu';errEl.style.display='block'}
    });
  </script>
</body>
</html>`);
  }

  // 7. GDPR-Compliant Zero Raw IP Visitor Hashing
  const rawIp =
    request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    request.socket.remoteAddress ||
    "127.0.0.1";
  const userAgentStr = request.headers["user-agent"] || "";
  const salt = getDailySalt();
  const ownerId = link.ownerId || "guest";

  // Daily rotating cryptographic hash (Never store rawIp!)
  const visitorHash = createHash("sha256")
    .update(`${rawIp}:${userAgentStr}:${salt}:${ownerId}`)
    .digest("hex")
    .substring(0, 16);

  const { device, os, browser } = parseUserAgent(userAgentStr);
  const country = (
    request.headers["x-vercel-ip-country"] ||
    request.headers["cf-ipcountry"] ||
    "TR"
  ).toUpperCase();
  const referer = parseReferrer(request.headers.referer || "");

  // 8. Instant HTTP 307 Redirect (Temporary Redirect guarantees every click hits edge)
  response.setHeader(
    "Cache-Control",
    "public, max-age=10, s-maxage=30, stale-while-revalidate=60",
  );
  response.setHeader("X-Redirect-Engine", "Loss-Edge-v2");
  response.setHeader("X-Privacy-Standard", "GDPR-DailySalt-ZeroRawIP");
  response.redirect(307, link.destination);

  // 9. Asynchronous Click Logging (Non-blocking fire-and-forget)
  getFirebaseAdmin()
    .then(({ db }) => {
      const linkRef = db.collection("links").doc(linkDocId);

      // Increment total clicks
      linkRef
        .update({
          clickCount: FieldValue.increment(1),
          lastClickedAt: FieldValue.serverTimestamp(),
        })
        .catch(() => {});

      // Record GDPR-anonymized click event
      linkRef
        .collection("clicks")
        .add({
          createdAt: FieldValue.serverTimestamp(),
          visitorHash, // Anonymized via daily rotating salt
          device,
          os,
          browser,
          country,
          referer,
        })
        .catch(() => {});
    })
    .catch(() => {});
}

export const config = { runtime: "nodejs" };
