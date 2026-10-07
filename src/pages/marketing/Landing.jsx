import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "../../ui/icons";
import { Alert, Button, CopyField } from "../../ui";
import { Reveal } from "../../ui/Reveal";
import { api } from "../../lib/api";
import { isValidUrl, normalizeUrl } from "../../lib/format";
import { useI18n } from "../../lib/i18n";
import { Link, useRouter } from "../../lib/router";
import { useAuth } from "../../state/auth";
import { Page } from "./Layout";
import { PlanCards } from "./Pricing";

import analytics from "../../assets/shots/analytics-dark.webp";
import domains from "../../assets/shots/domains-dark.webp";
import editor from "../../assets/shots/editor-dark.webp";
import links from "../../assets/shots/links-dark.webp";
import qr from "../../assets/shots/qr-dark.webp";

const SHOTS = { links, analytics, qr, domains, editor };

/** Real screenshot of the product (demo data). */
function Shot({ name, alt, priority, className = "" }) {
  return (
    <img className={`shot ${className}`} src={SHOTS[name]} width="1600" height="1000" alt={alt}
      loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" />
  );
}

function Hero() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isValidUrl(url)) { setError(t("Geçerli bir adres girin, örneğin https://siteniz.com/sayfa", "Enter a valid address, for example https://yoursite.com/page")); document.getElementById("hero-url")?.focus(); return; }
    const destination = normalizeUrl(url);
    if (!user) {
      // Links belong to accounts: remember the URL and finish after sign-up.
      try { sessionStorage.setItem("loss_pending", JSON.stringify({ destination })); } catch { /* ignore */ }
      navigate("/register?next=/app");
      return;
    }
    setBusy(true);
    try { setResult(await api.links.create({ destination })); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <section className="hx">
      <div className="hx-bg" aria-hidden />
      <div className="hx-in lp-wrap">
        <Link to="/features" className="hx-badge">{t("Çerezsiz analiz, özel alan adı, dinamik QR", "Cookieless analytics, custom domains, dynamic QR")} <ArrowRight size={13} aria-hidden /></Link>
        <h1>{t("Uzun lafın", "Long story")} <span className="grad">{t("kısası.", "short.")}</span></h1>
        <p className="hx-sub">{t("Markalı kısa bağlantılar, baskıdan sonra bile hedefi değişen QR kodlar ve ziyaretçiyi izlemeyen analiz.", "Branded short links, QR codes you can redirect after printing, and analytics that never track visitors.")}</p>
        {result ? (
          <div className="hx-result stack">
            <Alert tone="success" icon={Check}>{t("Bağlantınız hazır.", "Your link is ready.")}</Alert>
            <CopyField value={result.shortUrl} />
            <div className="row wrap"><Link to="/app" className="btn btn-primary">{t("Panelde aç", "Open in dashboard")} <ArrowRight size={15} aria-hidden /></Link><Button onClick={() => { setResult(null); setUrl(""); }}>{t("Yeni bağlantı", "Another link")}</Button></div>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="hx-form" noValidate>
              <label htmlFor="hero-url" className="sr-only">{t("Kısaltılacak adres", "URL to shorten")}</label>
              <input id="hero-url" name="url" type="url" className="input" placeholder={t("Uzun bir adres yapıştırın: https://…", "Paste a long URL: https://…")} value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" autoComplete="off" spellCheck={false} aria-invalid={Boolean(error)} aria-describedby={error ? "hero-err" : undefined} />
              <Button type="submit" variant="primary" size="lg" loading={busy}>{t("Kısalt", "Shorten")}</Button>
            </form>
            {error && <p id="hero-err" className="field-error" role="alert">{error}</p>}
            <p className="hx-meta">{t("Kredi kartı gerekmez. 25 bağlantı ücretsiz.", "No credit card. 25 links free.")} <Link to="/login">{t("Hesapsız demoyu dene", "Try the demo without an account")}</Link></p>
          </>
        )}
        <div className="hx-stage">
          <div className="win">
            <div className="win-bar" aria-hidden><i /><i /><i /><span>loss.tr/app</span></div>
            <Shot name="links" priority alt={t("Loss paneli: bağlantı listesi, tıklama sayıları, klasörler ve etiketler", "Loss dashboard: link list with click counts, folders and tags")} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** A quiet line of real capabilities, not logos we do not have. */
function Strip() {
  const { t } = useI18n();
  const items = [t("Çerezsiz analiz", "Cookieless analytics"), t("Özel alan adı", "Custom domains"), t("Dinamik QR kodlar", "Dynamic QR codes"), "301 / 302 / 307", t("Cihaz ve ülke hedefleme", "Device and country routing"), t("REST API", "REST API"), t("HMAC imzalı webhooks", "HMAC-signed webhooks"), t("Takım rolleri", "Team roles"), t("CSV içe ve dışa aktarma", "CSV import and export"), t("Denetim kaydı", "Audit log")];
  return (
    <section className="strip" aria-label={t("Öne çıkan yetenekler", "Capabilities")}>
      <div className="strip-track">
        {[0, 1].map((n) => <ul key={n} aria-hidden={n === 1 || undefined}>{items.map((x) => <li key={x}>{x}</li>)}</ul>)}
      </div>
    </section>
  );
}

const CURL = `curl -X POST https://loss.tr/api/v1/links \\
  -H "Authorization: Bearer $LOSS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "destination": "https://shop.example/yaz",
        "slug": "yaz", "tags": ["kampanya"] }'

{ "link": { "shortUrl": "https://loss.tr/yaz" } }`;

/** Interactive tour of the product: tabs on the left, the real screen on the right, auto-advancing until the visitor takes over. */
function Showcase() {
  const { t } = useI18n();
  const tabs = [
    { id: "analytics", title: t("Analiz", "Analytics"), text: t("Ülke, şehir, cihaz, kaynak ve QR taramaları. IP adresi saklanmaz.", "Country, city, device, referrer and QR scans. No IP address is stored."), shot: "analytics", alt: t("Analiz sayfası: günlük tıklama grafiği, ülke ve kaynak dağılımı", "Analytics page: daily click chart with country and referrer breakdowns") },
    { id: "qr", title: t("QR kodlar", "QR codes"), text: t("Kod kısa bağlantıya işaret eder. Hedefi değiştirin, afişi yeniden basmayın.", "The code points at the short link. Change the destination, skip the reprint."), shot: "qr", alt: t("QR stüdyosu: renk, desen ve logo seçenekleri, SVG ve PNG indirme", "QR studio with colour, pattern and logo options, SVG and PNG download") },
    { id: "domains", title: t("Alan adları", "Domains"), text: t("go.markaniz.com gibi alan adınızı iki DNS kaydıyla doğrulayın.", "Verify a domain like go.brand.com with two DNS records."), shot: "domains", alt: t("Alan adları sayfası: doğrulanmış özel alan adı", "Domains page showing a verified custom domain") },
    { id: "editor", title: t("Hedefleme ve koruma", "Routing and protection"), text: t("iOS, Android ve ülke kuralları; parola, son kullanma tarihi ve tıklama limiti.", "iOS, Android and country rules, plus password, expiry and click limit."), shot: "editor", alt: t("Bağlantı düzenleyici: hedefleme, UTM ve koruma bölümleri", "Link editor with targeting, UTM and protection sections") },
    { id: "api", title: t("API ve webhooks", "API and webhooks"), text: t("REST API ve HMAC imzalı olaylar. Anahtarlar tek bir çalışma alanına bağlıdır.", "REST API and HMAC-signed events. Keys are bound to one workspace.") },
  ];
  const DURATION = 6500;
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  const still = useRef(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (hold || still.current) return;
    const id = setTimeout(() => setI((n) => (n + 1) % tabs.length), DURATION);
    return () => clearTimeout(id);
  }, [i, hold, tabs.length]);
  const onKey = (e) => {
    if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(e.key)) return;
    e.preventDefault(); setHold(true);
    const next = (i + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    setI(next); document.getElementById(`sc-tab-${tabs[next].id}`)?.focus();
  };
  return (
    <section className="lp-section lp-wrap" aria-labelledby="sc-title">
      <Reveal>
        <h2 id="sc-title" className="lp-h2">{t("Kısaltmak başlangıç.", "Shortening is the start.")} <span>{t("Gerisini panel halleder.", "The dashboard handles the rest.")}</span></h2>
      </Reveal>
      <Reveal className="sc" delay={80}>
        <div className="sc-tabs" role="tablist" aria-orientation="vertical" onKeyDown={onKey}>
          {tabs.map((tab, k) => (
            <button key={tab.id} id={`sc-tab-${tab.id}`} role="tab" type="button" aria-selected={k === i} aria-controls={`sc-panel-${tab.id}`} tabIndex={k === i ? 0 : -1}
              className="sc-tab" onClick={() => { setHold(true); setI(k); }}>
              <span className="sc-tab-title">{tab.title}</span>
              <span className="sc-tab-text">{tab.text}</span>
              <span className="sc-bar" aria-hidden><span key={`${i}-${hold}`} style={k === i && !hold && !still.current ? { animation: `sc-fill ${DURATION}ms linear forwards` } : k === i ? { transform: "scaleX(1)" } : undefined} /></span>
            </button>
          ))}
        </div>
        <div className="sc-stage">
          {tabs.map((tab, k) => (
            <div key={tab.id} id={`sc-panel-${tab.id}`} role="tabpanel" aria-labelledby={`sc-tab-${tab.id}`} className="sc-panel" data-on={k === i || undefined} aria-hidden={k !== i}>
              {tab.shot ? <div className="win"><Shot name={tab.shot} alt={tab.alt} /></div> : <pre className="codeblock sc-code" translate="no"><code>{CURL}</code></pre>}
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/** What actually happens to a click, in the order it happens. */
function Privacy() {
  const { t } = useI18n();
  const steps = [
    { k: t("Tıklama gelir", "A click arrives"), v: "203.0.113.7", note: t("IP adresi yalnızca bellekte, bir an", "The IP exists only in memory, briefly"), tone: "raw" },
    { k: t("Günlük tuzla özetlenir", "Hashed with a daily salt"), v: "a91f3c…e07b", note: t("Tek yönlü; ertesi gün tuz değişir", "One-way; the salt rotates every day"), tone: "hash" },
    { k: t("Yalnızca sayaç saklanır", "Only counters are stored"), v: "+1 · TR · mobil · instagram", note: t("Ham IP hiçbir yere yazılmaz", "The raw IP is never written anywhere"), tone: "kept" },
  ];
  return (
    <section className="lp-section lp-wrap pv" aria-labelledby="pv-title">
      <Reveal className="pv-copy">
        <h2 id="pv-title" className="lp-h2">{t("Ziyaretçiyi tanımadan sayın.", "Count visitors without knowing them.")}</h2>
        <p className="lp-lede">{t("Loss çerez kullanmaz. Tekil ziyaretçi, her gün değişen tuzla üretilen tek yönlü bir özetten hesaplanır; günler arasında kimse eşleştirilemez ve çerez bandı gerekmez.", "Loss uses no cookies. Unique visitors come from a one-way hash with a salt that rotates daily; nobody can be matched across days and no cookie banner is needed.")}</p>
        <ul className="lp-checks">
          {[t("Botlar ve önizleme istekleri sayılmaz", "Bots and preview fetches are not counted"), t("Verilerinizi dilediğinizde indirin veya silin", "Export or delete your data at any time")].map((x) => <li key={x}><Check size={16} aria-hidden /> {x}</li>)}
        </ul>
      </Reveal>
      <Reveal className="pv-flow" delay={100}>
        <ol>
          {steps.map((s, k) => (
            <li key={s.k} className={`pv-step ${s.tone}`}>
              <span className="pv-n" aria-hidden>{k + 1}</span>
              <div><div className="pv-k">{s.k}</div><code className="pv-v" translate="no">{s.v}</code><div className="pv-note">{s.note}</div></div>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}

function Flow() {
  const { t } = useI18n();
  const rows = [
    [t("Yapıştırın", "Paste"), t("Uzun adresi girin. İsterseniz özel ad ve UTM ekleyin.", "Enter the long URL. Add a custom slug and UTMs if you like.")],
    [t("Paylaşın", "Share"), t("Kısa bağlantıyı kopyalayın ya da QR kodunu SVG olarak indirin.", "Copy the short link or download its QR code as SVG.")],
    [t("Ölçün", "Measure"), t("Tıklamaları izleyin. Hedefi gerektiğinde, aynı adreste değiştirin.", "Watch the clicks. Change the destination whenever needed, on the same address.")],
  ];
  return (
    <section className="lp-section lp-wrap" aria-labelledby="flow-title">
      <Reveal><h2 id="flow-title" className="lp-h2">{t("Üç adımda yayında.", "Live in three steps.")}</h2></Reveal>
      <ol className="flow">
        {rows.map(([h, p], k) => (
          <Reveal as="li" key={h} className="flow-step" delay={k * 90}>
            <span className="flow-n" aria-hidden>0{k + 1}</span>
            <h3>{h}</h3><p>{p}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

export default function Landing() {
  const { t } = useI18n();
  return (
    <Page>
      <Hero />
      <Strip />
      <Showcase />
      <Privacy />
      <Flow />
      <section className="lp-section lp-wrap" aria-labelledby="p-title">
        <Reveal><h2 id="p-title" className="lp-h2">{t("Açık fiyat. Ücretsiz başlayın.", "Plain pricing. Start free.")}</h2></Reveal>
        <PlanCards cta />
      </section>
      <Faq />
      <section className="lp-wrap lp-cta-wrap">
        <Reveal className="cta">
          <h2>{t("İlk bağlantınızı bir dakikada oluşturun.", "Create your first link in a minute.")}</h2>
          <p>{t("Kredi kartı gerekmez. Dilediğiniz zaman yükseltin.", "No credit card. Upgrade whenever you like.")}</p>
          <div className="row wrap"><Link to="/register" className="btn btn-primary btn-lg">{t("Ücretsiz başla", "Start free")}</Link><Link to="/developers" className="btn btn-secondary btn-lg">{t("API dokümantasyonu", "API documentation")}</Link></div>
        </Reveal>
      </section>
    </Page>
  );
}

export function Faq() {
  const { t } = useI18n();
  const items = [
    [t("Basılı bir QR kodun hedefini sonradan değiştirebilir miyim?", "Can I change a printed QR code's destination later?"), t("Evet. QR kod kısa bağlantınıza işaret eder; panelden hedefi değiştirdiğinizde basılı kod aynı kalır ve yeni adrese gider.", "Yes. The QR code points at your short link; when you change the destination in the dashboard the printed code stays the same and goes to the new address.")],
    [t("Ziyaretçi verileri toplanıyor mu?", "Do you collect visitor data?"), t("Çerez kullanmıyoruz ve IP adreslerini saklamıyoruz. Ülke, cihaz, tarayıcı ve kaynak gibi toplu istatistikler tutuyoruz; tekil ziyaretçi sayısı günlük değişen tek yönlü bir özetten hesaplanır.", "We use no cookies and store no IP addresses. We keep aggregate stats like country, device, browser and referrer; unique visitors are computed from a one-way hash that changes daily.")],
    [t("Kendi alan adımı kullanabilir miyim?", "Can I use my own domain?"), t("Evet. Starter ve üzeri paketlerde alan adınızı ekler, DNS TXT kaydıyla doğrularsınız. Starter 1, Pro 3, Agency 15 alan adı içerir.", "Yes. On Starter and above you add your domain and verify it with a DNS TXT record. Starter includes 1, Pro 3 and Agency 15 domains.")],
    [t("Bağlantılarım süresiz çalışır mı?", "Do my links work forever?"), t("Siz silmediğiniz, duraklatmadığınız veya bir son kullanma tarihi ya da tıklama limiti belirlemediğiniz sürece çalışır. Ücretsiz planda 25 bağlantı hakkı vardır.", "Yes, unless you delete or pause them or set an expiry date or click limit. The free plan includes 25 links.")],
    [t("Aboneliği nasıl iptal ederim?", "How do I cancel?"), t("Plan ve faturalama sayfasından tek tıkla. Ödediğiniz dönemin sonuna kadar planınız aktif kalır; ardından ücretsiz plana dönersiniz.", "With one click in Plan & billing. Your plan stays active until the end of the paid period, then you return to the free plan.")],
    [t("Kötüye kullanıma karşı ne yapıyorsunuz?", "How do you prevent abuse?"), t("Hedefler doğrulanır (özel ağ adresleri ve kimlik bilgili URL'ler reddedilir), oluşturma hız sınırlıdır, kara liste ve isteğe bağlı güvenlik taraması uygulanır; herkes /abuse sayfasından bildirim yapabilir.", "Destinations are validated (private addresses and URLs with credentials are rejected), creation is rate limited, blocklists and optional safety scanning apply, and anyone can report a link on /abuse.")],
  ];
  return (
    <section className="lp-section lp-wrap lp-faq" aria-labelledby="faq-title">
      <h2 id="faq-title" className="lp-h2">{t("Sık sorulan sorular", "Frequently asked questions")}</h2>
      <div className="mk-faq">{items.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
    </section>
  );
}
