import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  Copy,
  Link2,
  QrCode,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { QrCodeSvg } from "../components/common/QrCodeSvg";
import { isValidUrl, normalizeUrl } from "../utils/formatters";
import { getShortUrl } from "../constants/domains";

export function HomePage({ onNavigate, onOpenQr }) {
  const { addLink, showToast } = useAuth();
  const { locale } = useLanguage();
  const [destination, setDestination] = useState("");
  const [createdLink, setCreatedLink] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const isTurkish = locale === "tr";
  const shortUrl = createdLink
    ? getShortUrl(createdLink.slug)
    : getShortUrl("ornek");

  const copyLink = async () => {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setIsCopied(true);
      showToast(
        isTurkish
          ? "Kısa bağlantı panoya kopyalandı"
          : "Short link copied to clipboard",
        "success",
      );
      window.setTimeout(() => setIsCopied(false), 1800);
    } catch {
      showToast(
        isTurkish ? "Bağlantı kopyalanamadı" : "Could not copy the link",
        "error",
      );
    }
  };

  const createLink = async (event) => {
    event.preventDefault();
    const value = destination.trim();
    if (!value) {
      showToast(
        isTurkish ? "Önce bir web adresi girin" : "Enter a web address first",
        "warning",
      );
      return;
    }
    if (!isValidUrl(value)) {
      showToast(
        isTurkish
          ? "Geçerli bir http veya https adresi girin"
          : "Enter a valid http or https address",
        "warning",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const link = await addLink({ destination: normalizeUrl(value) });
      setCreatedLink(link);
      showToast(
        isTurkish ? "Bağlantınız hazır" : "Your link is ready",
        "success",
      );
    } catch (error) {
      showToast(
        error.message ||
          (isTurkish ? "Bağlantı oluşturulamadı" : "Could not create the link"),
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="loss-home">
      <section className="loss-home-hero">
        <div className="loss-home-hero-copy">
          <div className="loss-home-brand-lockup">
            <img src="/loss.png" alt="loss.tr" />
            <span>loss.tr</span>
          </div>
          <p className="loss-home-eyebrow">
            <span className="loss-home-eyebrow-dot" />{" "}
            {isTurkish
              ? "Link altyapısı, sadeleştirilmiş"
              : "Link infrastructure, simplified"}
          </p>
          <h1>
            {isTurkish
              ? "Her bağlantı için daha net bir yol."
              : "A clearer path for every link."}
          </h1>
          <p className="loss-home-lead">
            {isTurkish
              ? "Kısa bağlantılar, dinamik QR kodlar ve ölçülebilir kampanyalar. Hepsi tek bir çalışma alanında, gereksiz karmaşa olmadan."
              : "Short links, dynamic QR codes, and measurable campaigns. One focused workspace without the clutter."}
          </p>
          <div className="loss-home-actions">
            <button
              type="button"
              className="loss-home-primary"
              onClick={() => onNavigate("Shortener")}
            >
              {isTurkish ? "Stüdyoyu aç" : "Open the studio"}{" "}
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="loss-home-secondary"
              onClick={() => onNavigate("QRCodes")}
            >
              <QrCode size={16} /> {isTurkish ? "QR oluştur" : "Create a QR"}
            </button>
          </div>
          <div className="loss-home-trust-line">
            <ShieldCheck size={15} />{" "}
            {isTurkish
              ? "Linkleriniz çalışmaya devam eder. Analitik sınırları yönlendirmeyi durdurmaz."
              : "Your links keep working. Analytics limits never stop a redirect."}
          </div>
        </div>

        <div
          className="loss-home-studio"
          aria-label={
            isTurkish ? "Hızlı link oluşturucu" : "Quick link creator"
          }
        >
          <div className="loss-home-studio-header">
            <div>
              <span className="loss-home-studio-kicker">LOSS STUDIO</span>
              <strong>
                {isTurkish ? "Bir bağlantı oluştur" : "Create a link"}
              </strong>
            </div>
            <span className="loss-home-live">
              <span /> {isTurkish ? "Hazır" : "Ready"}
            </span>
          </div>
          <form onSubmit={createLink}>
            <label htmlFor="home-destination">
              {isTurkish ? "Hedef web adresi" : "Destination URL"}
            </label>
            <div className="loss-home-input-row">
              <Link2 size={17} />
              <input
                id="home-destination"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="https://ornek.com/kampanya"
                type="url"
              />
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "..." : <ArrowRight size={18} />}
              </button>
            </div>
          </form>
          <div className="loss-home-studio-note">
            <Sparkles size={14} />{" "}
            {isTurkish
              ? "Özel slug, UTM ve güvenlik kuralları sonraki adımda eklenebilir."
              : "Add a custom slug, UTM tags, and protection next."}
          </div>

          <div className={`loss-home-result ${createdLink ? "is-ready" : ""}`}>
            <div className="loss-home-result-qr">
              <QrCodeSvg value={shortUrl} size={112} id="home-preview-qr" />
            </div>
            <div className="loss-home-result-content">
              <span className="loss-home-result-label">
                {createdLink
                  ? isTurkish
                    ? "Yayınlandı"
                    : "Live now"
                  : isTurkish
                    ? "Önizleme"
                    : "Preview"}
              </span>
              <strong>{shortUrl}</strong>
              <span>
                {createdLink
                  ? createdLink.destination
                  : isTurkish
                    ? "Sonuç burada görünecek"
                    : "Your result will appear here"}
              </span>
              <div className="loss-home-result-actions">
                <button
                  type="button"
                  onClick={copyLink}
                  disabled={!createdLink}
                >
                  <Copy size={14} />{" "}
                  {isCopied
                    ? isTurkish
                      ? "Kopyalandı"
                      : "Copied"
                    : isTurkish
                      ? "Kopyala"
                      : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => createdLink && onOpenQr(createdLink)}
                  disabled={!createdLink}
                >
                  <QrCode size={14} /> QR
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="loss-home-proof"
        aria-label={isTurkish ? "Ürün özellikleri" : "Product capabilities"}
      >
        <div>
          <Zap size={18} />
          <strong>{isTurkish ? "Hızlı yönlendirme" : "Fast redirects"}</strong>
          <span>
            {isTurkish
              ? "Her tıklamada düşük gecikme"
              : "Low latency on every click"}
          </span>
        </div>
        <div>
          <QrCode size={18} />
          <strong>{isTurkish ? "Dinamik QR" : "Dynamic QR"}</strong>
          <span>
            {isTurkish
              ? "Baskıdan sonra hedefi değiştirin"
              : "Change destinations after print"}
          </span>
        </div>
        <div>
          <Check size={18} />
          <strong>{isTurkish ? "Kontrol sizde" : "You stay in control"}</strong>
          <span>
            {isTurkish
              ? "Linkleri tek çalışma alanında yönetin"
              : "Manage links in one workspace"}
          </span>
        </div>
      </section>

      <section className="loss-home-features" id="ozellikler">
        <div className="loss-home-section-heading">
          <span className="loss-home-section-label">
            02 / {isTurkish ? "Ürün" : "Product"}
          </span>
          <h2>
            {isTurkish
              ? "Tek bir link, üç güçlü çalışma alanı."
              : "One link, three focused workspaces."}
          </h2>
          <p>
            {isTurkish
              ? "Kısaltma, QR ve ölçüm akışlarını ayrı araçlara bölmeden yönetin."
              : "Manage shortening, QR, and measurement without splitting your workflow across tools."}
          </p>
        </div>
        <div className="loss-home-feature-grid">
          <article>
            <Link2 size={20} />
            <h3>{isTurkish ? "Kısa bağlantılar" : "Short links"}</h3>
            <p>
              {isTurkish
                ? "Hedefi sonradan değiştirebileceğiniz, markanıza uygun ve paylaşmaya hazır bağlantılar."
                : "Branded links you can update later, without changing the address people already use."}
            </p>
            <button type="button" onClick={() => onNavigate("Shortener")}>
              {isTurkish ? "Link oluştur" : "Create a link"}{" "}
              <ArrowRight size={14} />
            </button>
          </article>
          <article>
            <QrCode size={20} />
            <h3>{isTurkish ? "Dinamik QR" : "Dynamic QR"}</h3>
            <p>
              {isTurkish
                ? "Baskıya gönderdikten sonra bile aynı QR kodun hedefini güncelleyin."
                : "Change the destination after printing while the QR code stays exactly the same."}
            </p>
            <button type="button" onClick={() => onNavigate("QRCodes")}>
              {isTurkish ? "QR stüdyosunu aç" : "Open QR studio"}{" "}
              <ArrowRight size={14} />
            </button>
          </article>
          <article>
            <BarChart3 size={20} />
            <h3>{isTurkish ? "Kampanya ölçümü" : "Campaign insight"}</h3>
            <p>
              {isTurkish
                ? "Tıklamaları, kaynakları ve cihazları tek bakışta izleyerek neyin işe yaradığını görün."
                : "See clicks, sources, and devices in one place so you know what is working."}
            </p>
            <button type="button" onClick={() => onNavigate("Analytics")}>
              {isTurkish ? "Analizleri incele" : "View analytics"}{" "}
              <ArrowRight size={14} />
            </button>
          </article>
        </div>
      </section>

      <section className="loss-home-workflow" id="hiz-ve-altyapi">
        <div className="loss-home-workflow-copy">
          <span className="loss-home-section-label">
            03 / {isTurkish ? "Akış" : "Workflow"}
          </span>
          <h2>
            {isTurkish
              ? "İlk linkten canlı rapora üç adım."
              : "From first link to live insight in three steps."}
          </h2>
        </div>
        <div className="loss-home-steps">
          <div>
            <b>01</b>
            <span>{isTurkish ? "Hedefi ekleyin" : "Add a destination"}</span>
            <p>
              {isTurkish
                ? "Web adresini girin ve paylaşılabilir bağlantınızı oluşturun."
                : "Enter a web address and create a link ready to share."}
            </p>
          </div>
          <div>
            <b>02</b>
            <span>{isTurkish ? "Dağıtın" : "Distribute it"}</span>
            <p>
              {isTurkish
                ? "Linki kampanyalarda veya düzenlenebilir QR kodunuzda kullanın."
                : "Use it in campaigns or in a QR code you can update later."}
            </p>
          </div>
          <div>
            <b>03</b>
            <span>{isTurkish ? "Öğrenin" : "Learn from it"}</span>
            <p>
              {isTurkish
                ? "Tıklama ve kaynak verilerini çalışma alanınızdan takip edin."
                : "Track clicks and sources from the same workspace."}
            </p>
          </div>
        </div>
      </section>

      <section className="loss-home-pricing" id="fiyatlandirma">
        <div>
          <span className="loss-home-section-label">
            04 / {isTurkish ? "Başlangıç" : "Get started"}
          </span>
          <h2>
            {isTurkish
              ? "İhtiyacınız büyüdükçe çalışma alanınızı büyütün."
              : "Grow your workspace as your needs grow."}
          </h2>
          <p>
            {isTurkish
              ? "Temel link yönetimiyle başlayın. Gelişmiş yönlendirme, alan adı ve ekip özelliklerini ihtiyaç duyduğunuzda ekleyin."
              : "Start with the essentials. Add advanced routing, domains, and team controls when you need them."}
          </p>
        </div>
        <button type="button" onClick={() => onNavigate("Billing")}>
          {isTurkish ? "Paketleri incele" : "View plans"}{" "}
          <ArrowRight size={16} />
        </button>
      </section>

      <section className="loss-home-next">
        <div>
          <span className="loss-home-section-label">
            01 / {isTurkish ? "Çalışma alanı" : "Workspace"}
          </span>
          <h2>
            {isTurkish
              ? "Kampanyalarınızı daha az araçla yönetin."
              : "Run campaigns with fewer tools."}
          </h2>
        </div>
        <button type="button" onClick={() => onNavigate("Shortener")}>
          {isTurkish ? "Çalışma alanını incele" : "Explore the workspace"}{" "}
          <ArrowRight size={16} />
        </button>
      </section>
    </div>
  );
}
