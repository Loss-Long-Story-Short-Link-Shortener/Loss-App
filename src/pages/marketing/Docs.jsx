import { CopyButton } from "../../ui";
import { useI18n } from "../../lib/i18n";
import { Link, jump } from "../../lib/router";
import { Page } from "./Layout";

function Code({ children, lang = "bash" }) {
  const text = String(children).replace(/^\n/, "").replace(/\s+$/, "");
  return (
    <div style={{ position: "relative", margin: "12px 0" }}>
      <pre className="codeblock" aria-label={lang}><code>{text}</code></pre>
      <div style={{ position: "absolute", top: 8, right: 8 }}><CopyButton text={text} size="sm" /></div>
    </div>
  );
}

function Endpoint({ method, path, children }) {
  const tone = { GET: "success", POST: "accent", PATCH: "warning", DELETE: "danger" }[method];
  return (
    <div className="doc-endpoint"><span className={`badge ${tone}`} style={{ fontFamily: "var(--mono)" }}>{method}</span> <code>{path}</code>{children && <p>{children}</p>}</div>
  );
}

export default function Docs() {
  const { t } = useI18n();
  const nav = [["intro", t("Giriş", "Introduction")], ["auth", t("Kimlik doğrulama", "Authentication")], ["links", t("Bağlantılar", "Links")], ["analytics", t("Analiz", "Analytics")], ["domains", t("Alan adları", "Domains")], ["webhooks", "Webhooks"], ["errors", t("Hatalar ve limitler", "Errors & limits")]];
  return (
    <Page>
      <div className="mk-container docs-layout" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <nav className="docs-nav" aria-label={t("Dokümantasyon", "Documentation")}>{nav.map(([id, label]) => <a key={id} href={`#${id}`} onClick={jump(id)}>{label}</a>)}</nav>
        <article className="docs">
          <section id="intro"><h1>{t("API dokümantasyonu", "API documentation")}</h1>
            <p>{t("Loss REST API'si JSON kullanır. Tüm istekler HTTPS üzerinden yapılır. API erişimi Pro ve üzeri paketlerde kullanılabilir.", "The Loss REST API speaks JSON over HTTPS. API access is available on Pro and above.")}</p>
            <Code>{`Base URL: https://loss.tr/api/v1`}</Code></section>

          <section id="auth"><h2>{t("Kimlik doğrulama", "Authentication")}</h2>
            <p>{t("Panelde Geliştirici → API anahtarları bölümünden bir anahtar oluşturun ve Bearer başlığıyla gönderin. Anahtar tek bir çalışma alanına bağlıdır; “salt okunur” anahtarlar yalnızca GET isteklerine izin verir.", "Create a key under Developers → API keys and send it as a Bearer token. A key is bound to one workspace; read-only keys only allow GET.")}</p>
            <Code>{`curl https://loss.tr/api/v1/links \\
  -H "Authorization: Bearer loss_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"`}</Code></section>

          <section id="links"><h2>{t("Bağlantılar", "Links")}</h2>
            <Endpoint method="GET" path="/links?limit=200&cursor=…">{t("Bağlantıları yeniden eskiye listeler. nextCursor boş değilse bir sonraki sayfa için cursor olarak gönderin (limit en çok 500).", "Lists links newest first. If nextCursor is set pass it as cursor for the next page (limit up to 500).")}</Endpoint>
            <Endpoint method="POST" path="/links">{t("Bağlantı oluşturur.", "Creates a link.")}</Endpoint>
            <Code lang="json">{`curl -X POST https://loss.tr/api/v1/links \\
  -H "Authorization: Bearer $LOSS_KEY" -H "Content-Type: application/json" \\
  -d '{
    "destination": "https://example.com/kampanya?utm_source=newsletter",
    "slug": "kampanya",
    "title": "Yaz kampanyası",
    "tags": ["newsletter", "yaz"],
    "folder": "Yaz 2026"
  }'`}</Code>
            <Code lang="json">{`{
  "link": {
    "id": "loss.tr__kampanya",
    "slug": "kampanya",
    "shortUrl": "https://loss.tr/kampanya",
    "destination": "https://example.com/kampanya?utm_source=newsletter",
    "status": "active",
    "clickCount": 0,
    "tags": ["newsletter", "yaz"]
  }
}`}</Code>
            <table className="dns-table"><thead><tr><th>{t("Alan", "Field")}</th><th>{t("Açıklama", "Description")}</th></tr></thead><tbody>
              {[["destination *", t("http(s) hedef adres (en çok 2048 karakter)", "http(s) destination (max 2048 chars)")], ["slug", t("3-48 karakter; boşsa rastgele", "3-48 chars; random if empty")], ["domain", t("Doğrulanmış özel alan adınız", "One of your verified custom domains")], ["title, notes, folder, tags[]", t("Düzenleme alanları", "Organisation fields")],
                ["password", t("Pro+: 4-128 karakter", "Pro+: 4-128 chars")], ["expiresAt", t("Pro+: gelecekte bir ISO tarih", "Pro+: future ISO date")], ["maxClicks", t("Pro+: tıklama limiti", "Pro+: click limit")], ["redirectType", t("Starter+: 301 | 302 | 307", "Starter+: 301 | 302 | 307")],
                ["og {title, description, image}", t("Starter+: sosyal önizleme", "Starter+: social preview")], ["targets {ios, android, geo[]}", t("Pro+: hedefleme", "Pro+: targeting")]].map(([a, b]) => <tr key={a}><td className="mono">{a}</td><td>{b}</td></tr>)}</tbody></table>
            <Endpoint method="PATCH" path="/links">{t("Gövdede id ve değişecek alanlar. slug ve domain değiştirilemez.", "Send id plus the fields to change. slug and domain are immutable.")}</Endpoint>
            <Endpoint method="DELETE" path="/links?id=loss.tr__kampanya">{t("Bağlantıyı ve tıklama geçmişini siler.", "Deletes the link and its click history.")}</Endpoint>
            <Endpoint method="POST" path="/links/bulk">{t("action: delete | pause | resume | set_tags | set_folder, ids: en çok 100.", "action: delete | pause | resume | set_tags | set_folder, ids: up to 100.")}</Endpoint>
            <Endpoint method="POST" path="/links/import">{t("Starter+: rows[] (en çok 200); satır başına sonuç döner.", "Starter+: rows[] (up to 200); returns a result per row.")}</Endpoint></section>

          <section id="analytics"><h2>{t("Analiz", "Analytics")}</h2>
            <Endpoint method="GET" path="/analytics?id=loss.tr__kampanya&days=30">{t("Tek bağlantı için zaman serisi ve kırılımlar. scope=workspace ile tüm çalışma alanı. days en çok planınızın geçmişi kadardır (30 / 365).", "Time series and breakdowns for one link. Use scope=workspace for the whole workspace. days is capped by your plan's history (30 / 365).")}</Endpoint>
            <Code lang="json">{`{
  "totalClicks": 1204, "uniqueVisitors": 861,
  "timeseries": [{ "date": "2026-10-01", "clicks": 38 }, …],
  "countries": [{ "name": "TR", "count": 802 }, …],
  "referrers": [{ "name": "instagram.com", "count": 410 }, …],
  "devices": [...], "browsers": [...], "systems": [...], "sources": [{ "name": "qr", "count": 96 }]
}`}</Code></section>

          <section id="domains"><h2>{t("Alan adları", "Domains")}</h2>
            <Endpoint method="GET" path="/domains" />
            <Endpoint method="POST" path="/domains">{`{ "host": "go.markaniz.com" }`}</Endpoint>
            <Endpoint method="POST" path="/domains/verify">{`{ "host": "go.markaniz.com" }`}</Endpoint>
            <Endpoint method="DELETE" path="/domains?host=go.markaniz.com" />
            <p>{t("Ekledikten sonra yanıttaki TXT kaydını (_loss-verify.<host>) oluşturun ve /domains/verify çağırın.", "After adding, create the TXT record from the response (_loss-verify.<host>) and call /domains/verify.")}</p></section>

          <section id="webhooks"><h2>Webhooks</h2>
            <p>{t("Olaylar: link.created, link.updated, link.deleted, link.clicked. Her istek şu başlıkları taşır: X-Loss-Event, X-Loss-Delivery, X-Loss-Timestamp, X-Loss-Signature.", "Events: link.created, link.updated, link.deleted, link.clicked. Each request carries X-Loss-Event, X-Loss-Delivery, X-Loss-Timestamp and X-Loss-Signature headers.")}</p>
            <Code lang="json">{`{
  "id": "5f1c…", "type": "link.clicked", "createdAt": "2026-10-07T09:12:44.000Z",
  "data": { "id": "loss.tr__kampanya", "slug": "kampanya", "shortUrl": "https://loss.tr/kampanya",
            "destination": "https://example.com/…", "country": "TR", "device": "mobile", "source": "qr" }
}`}</Code>
            <p>{t("İmzayı doğrulayın: HMAC-SHA256(secret, `${timestamp}.${ham gövde}`). Zaman damgası 5 dakikadan eskiyse reddedin.", "Verify the signature: HMAC-SHA256(secret, `${timestamp}.${raw body}`). Reject timestamps older than 5 minutes.")}</p>
            <Code lang="js">{`import { createHmac, timingSafeEqual } from "node:crypto";

export function verify(rawBody, headers, secret) {
  const ts = headers["x-loss-timestamp"];
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(\`\${ts}.\${rawBody}\`).digest("hex");
  const given = headers["x-loss-signature"] || "";
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}`}</Code>
            <p>{t("Sunucunuz 5 saniye içinde 2xx döndürmelidir. Webhook adresleri https olmalı ve genel ağda erişilebilir olmalıdır.", "Your server must answer 2xx within 5 seconds. Webhook URLs must be https and publicly reachable.")}</p></section>

          <section id="errors"><h2>{t("Hatalar ve limitler", "Errors & limits")}</h2>
            <p>{t("Hatalar uygun HTTP durum koduyla ve şu biçimde döner:", "Errors use the right HTTP status and look like this:")}</p>
            <Code lang="json">{`{ "error": "Plan kotanıza (25 link) ulaştınız.", "code": "limit_reached", "limit": 25 }`}</Code>
            <table className="dns-table"><thead><tr><th>HTTP</th><th>code</th><th>{t("Anlamı", "Meaning")}</th></tr></thead><tbody>
              {[["400", "-", t("Geçersiz girdi", "Invalid input")], ["401", "-", t("Eksik veya geçersiz anahtar", "Missing or invalid key")], ["402", "limit_reached", t("Plan kotası doldu", "Plan quota reached")], ["403", "plan_required", t("Özellik daha yüksek bir plan gerektirir (feature, requiredPlan alanları)", "Feature needs a higher plan (feature, requiredPlan fields)")], ["403", "forbidden", t("Rolünüz yetersiz (salt okunur anahtar vb.)", "Insufficient role (e.g. read-only key)")], ["404", "-", t("Bulunamadı (başkasına ait kaynaklar da 404 döner)", "Not found (resources owned by others also return 404)")], ["409", "slug_taken", t("Kısa ad kullanımda", "Slug already taken")], ["429", "-", t("Hız sınırı; Retry-After başlığına bakın", "Rate limited; see Retry-After")]].map(([a, b, c]) => <tr key={a + b}><td>{a}</td><td className="mono">{b}</td><td>{c}</td></tr>)}</tbody></table>
            <p style={{ marginTop: 12 }}>{t("Limitler: anahtar başına dakikada 300 istek; bağlantı oluşturma dakikada 60.", "Limits: 300 requests/minute per key; link creation 60/minute.")}</p>
            <p><Link to="/abuse" style={{ textDecoration: "underline" }}>{t("Kötüye kullanım bildirimi", "Report abuse")}</Link></p></section>
        </article>
      </div>
    </Page>
  );
}
