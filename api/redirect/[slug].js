import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin, allowCors } from "../_firebase.js";

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

  try {
    const { db } = await getFirebaseAdmin();
    const host = (process.env.SHORT_LINK_HOST || "loss.tr")
      .trim()
      .toLowerCase();

    // 1. Try canonical document key (fast path)
    const canonicalId = `${host}__${lowerSlug}`;
    let linkRef = db.collection("links").doc(canonicalId);
    let linkSnapshot = await linkRef.get();

    // 2. If not found with lowercase, try original casing
    if (!linkSnapshot.exists && rawSlug !== lowerSlug) {
      const altRef = db.collection("links").doc(`${host}__${rawSlug}`);
      const altSnapshot = await altRef.get();
      if (altSnapshot.exists) {
        linkRef = altRef;
        linkSnapshot = altSnapshot;
      }
    }

    // 3. Last resort: query by slug field
    if (!linkSnapshot.exists) {
      const querySnap = await db
        .collection("links")
        .where("slug", "==", lowerSlug)
        .limit(1)
        .get();
      if (!querySnap.empty) {
        linkSnapshot = querySnap.docs[0];
        linkRef = linkSnapshot.ref;
      }
    }

    if (!linkSnapshot.exists) {
      return response.status(404).send("Link not found");
    }

    const link = linkSnapshot.data();

    // Check if the link is active
    if (link.status !== "active") {
      return response.status(410).send("Link is no longer active");
    }

    // Check if the link has expired
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
        return response.status(410).send("This link has expired");
      }
    }

    // If password-protected, return a hint page instead of redirecting.
    // The actual unlock happens via POST /api/verify-password.
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
  <title>Şifre Korumalı Bağlantı — Long Story Short</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0a;color:#fff;font-family:system-ui,-apple-system,sans-serif}
    .card{max-width:380px;width:90%;text-align:center;padding:32px 24px}
    .icon{font-size:32px;margin-bottom:16px}
    h1{font-size:18px;margin-bottom:8px}
    p{font-size:13px;color:#888;margin-bottom:20px}
    input{width:100%;padding:10px 14px;background:#111;border:1px solid #333;border-radius:8px;color:#fff;font-size:14px;text-align:center;outline:none;margin-bottom:12px}
    input:focus{border-color:#3b82f6}
    button{width:100%;padding:10px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
    button:hover{background:#2563eb}
    .err{color:#ef4444;font-size:12px;margin-bottom:12px;display:none}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔒</div>
    <h1>Parola Korumalı Bağlantı</h1>
    <p>Bu bağlantıyı görüntülemek için parolayı girin.</p>
    <form id="f">
      <input type="password" id="pw" placeholder="Parola..." autofocus required/>
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
      }catch{errEl.textContent='Bir hata oluştu';errEl.style.display='block'}
    });
  </script>
</body>
</html>`);
    }

    // ── Non-blocking click tracking ──────────────────────────────────
    // Send the redirect immediately, track the click fire-and-forget
    response.redirect(302, link.destination);

    // Fire-and-forget: don't await these
    linkRef
      .update({
        clickCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      })
      .catch(() => {});

    linkRef
      .collection("clicks")
      .add({
        createdAt: FieldValue.serverTimestamp(),
        userAgent: request.headers["user-agent"] || null,
        referer: request.headers.referer || null,
      })
      .catch(() => {});
  } catch (error) {
    console.error(error);
    return response.status(500).send("Unable to redirect link");
  }
}

export const config = { runtime: "nodejs" };
