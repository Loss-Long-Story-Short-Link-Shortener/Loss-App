import { useState, useMemo, useEffect } from "react";
import {
  Link2,
  Sparkles,
  ArrowRight,
  Check,
  Copy,
  QrCode,
  ExternalLink,
  Zap,
  Globe2,
  BarChart3,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Activity,
  Terminal,
  Printer,
  CheckCircle2,
  ShieldAlert,
  SlidersHorizontal,
  Loader2,
  X,
  Lock,
  ShieldCheck,
  Clock,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { isValidUrl, normalizeUrl, formatTimeAgo } from "../utils/formatters";
import { validateCustomSlug } from "../utils/slugGenerator";
import { QrCodeSvg } from "../components/common/QrCodeSvg";
import { getShortUrl, SHORT_LINK_HOST } from "../constants/domains";

export function OverviewPage({
  onOpenCreateModal,
  onOpenQr,
  onNavigate,
  onDeleteRequest,
}) {
  const { user, links, addLink, deleteLink, requireAuth, showToast } = useAuth();
  const { t, locale } = useLanguage();

  // Functional Shortener States
  const [inputUrl, setInputUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [showCustomSlug, setShowCustomSlug] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createdLink, setCreatedLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [activePreset, setActivePreset] = useState("");

  // Pricing Billing Cycle (Monthly vs Yearly)
  const [yearlyBilling, setYearlyBilling] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  // Dynamic Rotating Words for "Made For" Section (Upscayl Style)
  const madeForWords = useMemo(
    () =>
      locale === "tr"
        ? [
            "Pazarlamacılar",
            "İçerik Üreticileri",
            "E-Ticaret Devleri",
            "Geliştiriciler",
            "Büyüyen Ajanslar",
            "Sizin İçin",
          ]
        : [
            "Marketers",
            "Content Creators",
            "E-Commerce Brands",
            "Developers",
            "Growing Agencies",
            "You",
          ],
    [locale],
  );

  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % madeForWords.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [madeForWords]);

  // Clean Quick Presets
  const presets = [
    {
      id: "ecommerce",
      label: "🛍️ E-Ticaret Kampanyası",
      url: "https://shop.loss.tr/sezon-indirimleri?utm_source=tiktok&utm_medium=reel&utm_campaign=yaz2026",
      slug: "yaz-firsati",
    },
    {
      id: "instagram",
      label: "📷 Instagram Bio",
      url: "https://instagram.com/loss.app/yaz-lansmani?ref=campaign",
      slug: "bio-link",
    },
    {
      id: "youtube",
      label: "🎬 YouTube Lansmanı",
      url: "https://youtube.com/watch?v=loss-cloud-v2-features&feature=em-upload",
      slug: "video-izle",
    },
    {
      id: "app",
      label: "📱 App Store İndirme",
      url: "https://apps.apple.com/app/loss-smart-redirect/id987654321",
      slug: "app-indir",
    },
  ];

  const handleSelectPreset = (p) => {
    setActivePreset(p.id);
    setInputUrl(p.url);
    setCustomSlug(p.slug);
    setCreatedLink(null);
  };

  const getFaviconUrl = (url) => {
    try {
      const hostname = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch {
      return null;
    }
  };

  // Real Shorten Handler
  const handleQuickShorten = async (e) => {
    e?.preventDefault();
    const raw = inputUrl.trim();
    if (busy) return;

    if (!raw) {
      showToast(
        locale === "tr"
          ? "Lütfen önce kısaltmak istediğiniz bir web adresi girin."
          : "Please enter a web URL to shorten first.",
        "warning",
      );
      return;
    }

    if (!isValidUrl(raw)) {
      showToast(
        locale === "tr"
          ? "Lütfen geçerli bir internet adresi girin (örn: https://siteniz.com)"
          : "Please enter a valid URL (e.g. https://your-site.com)",
        "warning",
      );
      return;
    }

    if (showCustomSlug && customSlug.trim()) {
      const validation = validateCustomSlug(customSlug.trim());
      if (!validation.valid) {
        showToast(validation.error, "warning");
        return;
      }
    }

    setBusy(true);

    try {
      await new Promise((r) => setTimeout(r, 350));
      const destination = normalizeUrl(raw);
      const payload = {
        destination,
        slug: customSlug.trim() || undefined,
      };

      const newLink = await addLink(payload);
      setCreatedLink(newLink);

      // Auto-copy the working short link
      const shortUrl = getShortUrl(newLink.slug);
      try {
        await navigator.clipboard.writeText(shortUrl);
        setCopied(true);
        showToast(
          locale === "tr"
            ? "Kısa link oluşturuldu ve panoya kopyalandı ✦"
            : "Short link created and copied to clipboard ✦",
          "success",
        );
        setTimeout(() => setCopied(false), 2500);
      } catch {}
    } catch (err) {
      showToast(
        err.message ||
          (locale === "tr" ? "Link kısaltılamadı" : "Failed to shorten link"),
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLink = async (link) => {
    try {
      const url = getShortUrl(link.slug);
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id || link.slug);
      showToast(
        locale === "tr"
          ? "Kısa link panoya kopyalandı ✦"
          : "Short link copied to clipboard ✦",
        "success",
      );
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      showToast("Kopyalanamadı", "error");
    }
  };

  const handleOpenQr = (link) => {
    if (onOpenQr) {
      onOpenQr({
        id: link.id || "preview-qr",
        slug: link.slug,
        shortUrl: getShortUrl(link.slug),
        destination: link.destination || inputUrl,
        title: link.title || (locale === "tr" ? "Dinamik QR Kod" : "Dynamic QR Code"),
      });
    }
  };

  const handleDelete = (link) => {
    if (onDeleteRequest) {
      onDeleteRequest(link);
    } else if (deleteLink && link.id) {
      deleteLink(link.id);
      showToast(locale === "tr" ? "Bağlantı silindi" : "Link deleted", "info");
    }
  };

  // Fallback demo slug when not created yet
  const activeSlug = useMemo(() => {
    const s = customSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "");
    return s || "yaz-firsati";
  }, [customSlug]);

  const previewDisplayUrl = getShortUrl(activeSlug);
  const activeDisplayUrl = createdLink ? getShortUrl(createdLink.slug) : previewDisplayUrl;
  const activeDestination = createdLink ? createdLink.destination : (inputUrl.trim() || presets[0].url);

  // Character Savings Metric
  const origLen = activeDestination.length || 1;
  const shortLen = activeDisplayUrl.length;
  const savingsPct =
    origLen > shortLen
      ? Math.round(((origLen - shortLen) / origLen) * 100)
      : 0;

  return (
    <div className="loss-landing-v2">
      {/* ----------------------------------------------------------
          HERO SECTION (Upscayl Luminous & Spacious)
          ---------------------------------------------------------- */}
      <section className="loss-v2-hero">
        {/* Upscayl Exact 1px Orbital Ring & Soft Cosmic Glow */}
        <div className="loss-hero-orbital-backdrop" aria-hidden="true">
          <div className="loss-celestial-core-glow" />
          <div className="loss-celestial-ring" />
        </div>

        <div
          className="loss-v2-container"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Status Badge with Pulsing Emerald Glow */}
          <div className="loss-v2-badge">
            <span className="loss-v2-badge-dot" />
            <span>
              {locale === "tr"
                ? "YENİ: LOSS 2.0 ÇIKTI! • IŞIK HIZINDA EDGE YÖNLENDİRME"
                : "NEW: LOSS 2.0 IS OUT! • SUB-15MS EDGE REDIRECTS"}
            </span>
          </div>

          {/* Upscayl High-Contrast Hero Headline */}
          <h1 className="loss-v2-hero-title upscayl-style">
            {locale === "tr" ? (
              <>
                <span className="loss-title-light">Uzun Hikayelerden</span>
                <br />
                <span className="loss-title-bold">Akıllı Bağlantılara</span>
              </>
            ) : (
              <>
                <span className="loss-title-light">From Long Stories to</span>
                <br />
                <span className="loss-title-bold">Instant Action</span>
              </>
            )}
          </h1>

          {/* Clean Subheading without broken tags */}
          <p className="loss-v2-hero-subtext">
            {locale === "tr"
              ? "Karmaşık URL ve basılı QR kodlarınızı ışık hızında dönüştürün. Hedefinizi baskıdan sonra bile dilediğiniz an tek tıkla güncelleyin."
              : "Supercharge your long URLs and dynamic QR codes with sub-15ms edge speed. Update destinations anytime, anywhere."}
          </p>

          {/* Upscayl CTA Capsule with Dual Gradient Wings */}
          <div className="loss-cta-capsule-row">
            <div className="loss-capsule-divider left" />
            <div className="loss-capsule-box">
              <a href="#ozellikler" className="loss-capsule-text" style={{ textDecoration: "none" }}>
                {locale === "tr"
                  ? "Özellikleri Keşfet"
                  : "Explore Features"}
              </a>
              <button
                type="button"
                className="loss-shine-btn"
                onClick={() => onNavigate("Shortener")}
              >
                <span>{locale === "tr" ? "Hemen Başlayın" : "Get Started"}</span>
              </button>
            </div>
            <div className="loss-capsule-divider right" />
          </div>

          {/* ----------------------------------------------------------
              THE CENTERPIECE: FUNCTIONAL LOSS SHORTENER HUB
              ---------------------------------------------------------- */}
          <div className="loss-showcase-hub">
            {/* Compressing Loading State */}
            {busy ? (
              <div className="loss-compressing-banner">
                <Loader2 size={18} className="spin" />
                <span>
                  {locale === "tr"
                    ? "Bağlantı optimize ediliyor ve kısaltılıyor..."
                    : "Optimizing & creating smart edge link..."}
                </span>
                <span className="loss-compressing-pulse" />
              </div>
            ) : (
              <>
                {/* Main Unified Input Form */}
                <form onSubmit={handleQuickShorten} className="loss-hero-input-row">
                  <Link2 size={18} color="#38bdf8" style={{ flexShrink: 0 }} />
                  <input
                    type="text"
                    className="loss-hero-input-field"
                    placeholder={
                      locale === "tr"
                        ? "Kısaltmak istediğiniz uzun internet adresini buraya yapıştırın..."
                        : "Paste any long URL to shorten..."
                    }
                    value={inputUrl}
                    onChange={(e) => {
                      setInputUrl(e.target.value);
                      setActivePreset("");
                    }}
                    disabled={busy}
                  />

                  {inputUrl && (
                    <button
                      type="button"
                      className="loss-slug-close-btn"
                      onClick={() => setInputUrl("")}
                      title={locale === "tr" ? "Temizle" : "Clear"}
                      style={{ marginRight: "4px" }}
                    >
                      <X size={14} />
                    </button>
                  )}

                  <button
                    type="submit"
                    className="loss-hero-shorten-btn"
                    disabled={busy || !inputUrl.trim()}
                  >
                    <Sparkles size={15} />
                    <span>
                      {locale === "tr" ? "Hemen Kısalt" : "Shorten Now"}
                    </span>
                  </button>
                </form>

                {/* Inline Custom Slug Subrow */}
                {showCustomSlug && (
                  <div className="loss-slug-subrow">
                    <span className="loss-slug-prefix">loss.tr /</span>
                    <input
                      type="text"
                      className="loss-slug-input"
                      placeholder={
                        locale === "tr"
                          ? "istediğiniz-ozel-ad (ör: kampanya)"
                          : "custom-slug (e.g. campaign)"
                      }
                      value={customSlug}
                      onChange={(e) =>
                        setCustomSlug(
                          e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleQuickShorten();
                        }
                      }}
                      autoFocus
                    />
                    {customSlug && (
                      <button
                        type="button"
                        className="loss-slug-close-btn"
                        onClick={() => setCustomSlug("")}
                        title={locale === "tr" ? "Temizle" : "Clear"}
                      >
                        <X size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="loss-slug-close-btn"
                      onClick={() => {
                        setShowCustomSlug(false);
                        setCustomSlug("");
                      }}
                      title={locale === "tr" ? "Kapat" : "Close"}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Interactive Tools Bar (Custom Slug Toggle & Advanced Modal) */}
                <div className="loss-tools-bar">
                  <div className="loss-tools-left">
                    <button
                      type="button"
                      className={`loss-tool-btn ${showCustomSlug ? "active" : ""}`}
                      onClick={() => setShowCustomSlug((prev) => !prev)}
                      title={
                        locale === "tr"
                          ? "Özel bağlantı takısı belirle"
                          : "Set custom link slug"
                      }
                    >
                      <SlidersHorizontal size={13} />
                      <span>{locale === "tr" ? "Özel Link" : "Custom Slug"}</span>
                      {customSlug && <span className="loss-tool-active-dot" />}
                    </button>

                    <button
                      type="button"
                      className="loss-tool-btn"
                      onClick={() =>
                        onOpenCreateModal
                          ? onOpenCreateModal({
                              initialUrl: inputUrl.trim(),
                              initialSlug: customSlug.trim(),
                            })
                          : onNavigate("Shortener")
                      }
                      title={
                        locale === "tr"
                          ? "Parola, UTM, Zaman Aşımı ve Cihaz Hedefleme"
                          : "Password, UTM, Expiration & Device Targeting"
                      }
                    >
                      <Lock size={12} />
                      <span>
                        {locale === "tr"
                          ? "Gelişmiş Seçenekler (UTM, Şifre)"
                          : "Advanced Options (UTM, Pass)"}
                      </span>
                    </button>
                  </div>

                  {/* Preset Examples */}
                  <div className="loss-presets-row" style={{ marginBottom: 0 }}>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "rgba(240, 240, 245, 0.4)",
                        fontWeight: 600,
                        marginRight: "4px",
                      }}
                    >
                      {locale === "tr" ? "Hızlı Örnekler:" : "Try Example:"}
                    </span>
                    {presets.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`loss-preset-pill ${activePreset === p.id ? "active" : ""}`}
                        onClick={() => handleSelectPreset(p)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Live Transformation Card (Interactive Result View) */}
            <div className="loss-transformation-card" style={{ marginTop: "14px" }}>
              {/* Dynamic QR with Glowing Radar Scan Line */}
              <div
                className="loss-qr-container"
                title={
                  locale === "tr"
                    ? "QR Kodunu İncele ve İndir"
                    : "Inspect & Download QR Code"
                }
                onClick={() =>
                  handleOpenQr(
                    createdLink || {
                      slug: activeSlug,
                      destination: activeDestination,
                    },
                  )
                }
                style={{ cursor: "pointer" }}
              >
                <div className="loss-qr-radar-beam" />
                <QrCodeSvg
                  value={activeDisplayUrl}
                  size={100}
                  id="hero-live-qr"
                />
              </div>

              {/* Transformation Details */}
              <div className="loss-trans-details">
                {/* Created Status Indicator if newly created */}
                {createdLink && (
                  <div className="loss-created-badge-row">
                    <span className="loss-created-status">
                      <CheckCircle2 size={14} color="#34d399" />
                      <span>
                        {locale === "tr"
                          ? "Kısa Bağlantı Hazır & Yayında"
                          : "Smart Link is Live & Ready"}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="loss-dismiss-btn"
                      onClick={() => {
                        setCreatedLink(null);
                        setInputUrl("");
                        setCustomSlug("");
                      }}
                    >
                      <X size={13} />
                      <span>{locale === "tr" ? "Yeni Link" : "New Link"}</span>
                    </button>
                  </div>
                )}

                {/* Original Destination (Muted Strikethrough) */}
                <div
                  className="loss-trans-original"
                  title={activeDestination}
                >
                  {activeDestination}
                </div>

                {/* Short Target Link with Savings Badge & Edge TTL */}
                <div className="loss-trans-target-row">
                  <span
                    className="loss-trans-link"
                    onClick={() =>
                      handleCopyLink(
                        createdLink || { slug: activeSlug, id: "preview" },
                      )
                    }
                    style={{ cursor: "pointer" }}
                    title={locale === "tr" ? "Kopyalamak için tıklayın" : "Click to copy"}
                  >
                    {activeDisplayUrl}
                  </span>

                  {savingsPct > 0 && (
                    <span className="loss-trans-savings">
                      -%{savingsPct} {t.hero?.charSavings || "Tasarruf"}
                    </span>
                  )}

                  <span
                    style={{
                      fontSize: "11px",
                      color: "#38bdf8",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Activity size={12} />
                    <span>11ms TTL</span>
                  </span>
                </div>

                {/* Quick 1-Click Action Pills */}
                <div className="loss-trans-actions">
                  <button
                    type="button"
                    className={`loss-action-pill-btn ${copied || copiedId === (createdLink?.id || "preview") ? "copied" : ""}`}
                    onClick={() =>
                      handleCopyLink(
                        createdLink || { slug: activeSlug, id: "preview" },
                      )
                    }
                  >
                    {copied || copiedId === (createdLink?.id || "preview") ? (
                      <Check size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                    <span>
                      {copied || copiedId === (createdLink?.id || "preview")
                        ? t.common?.copied || "Kopyalandı"
                        : t.hero?.copyBtn || "Kopyala"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="loss-action-pill-btn"
                    onClick={() =>
                      handleOpenQr(
                        createdLink || {
                          slug: activeSlug,
                          destination: activeDestination,
                        },
                      )
                    }
                  >
                    <QrCode size={14} />
                    <span>{locale === "tr" ? "QR İndir" : "Download QR"}</span>
                  </button>

                  <a
                    href={
                      activeDestination.startsWith("http")
                        ? activeDestination
                        : `https://${activeDestination}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="loss-action-pill-btn"
                  >
                    <ExternalLink size={14} />
                    <span>{t.common?.test || "Test Et"}</span>
                  </a>
                </div>

                {/* Guest Account Claim Box */}
                {!user && createdLink && (
                  <div className="loss-guest-claim-box">
                    <span>
                      {locale === "tr"
                        ? "💡 Bu bağlantıyı hesabınıza bağlayarak ömür boyu tıklama analitiğini ve QR kodunu yönetin."
                        : "💡 Claim this link to track lifetime click analytics and manage dynamic QR."}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        requireAuth(
                          locale === "tr"
                            ? "Bağlantınızı hesabınıza kaydetmek için giriş yapın."
                            : "Log in to save link to your account.",
                        )
                      }
                    >
                      {locale === "tr" ? "Giriş Yap / Kaydol" : "Log In / Sign Up"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Core Feature Capabilities Strip */}
          <div className="loss-capabilities-strip">
            <span className="loss-capability-chip">
              <Zap size={13} color="#38bdf8" />
              <span>Sub-15ms Global Edge</span>
            </span>
            <span className="loss-capability-chip">
              <QrCode size={13} color="#c084fc" />
              <span>Dinamik QR Kodlar</span>
            </span>
            <span className="loss-capability-chip">
              <Globe2 size={13} color="#34d399" />
              <span>Özel Alan Adı</span>
            </span>
            <span className="loss-capability-chip">
              <Lock size={13} color="#f472b6" />
              <span>Parola Koruması</span>
            </span>
            <span className="loss-capability-chip">
              <Clock size={13} color="#fbbf24" />
              <span>Zaman Ayarlı Linkler</span>
            </span>
            <span className="loss-capability-chip">
              <BarChart3 size={13} color="#38bdf8" />
              <span>Çerezsiz KVKK Analitik</span>
            </span>
            <span className="loss-capability-chip">
              <Smartphone size={13} color="#a78bfa" />
              <span>Cihaz & UTM Hedefleme</span>
            </span>
          </div>

          {/* ----------------------------------------------------------
              RECENT ACTIVE LINKS HUB (If user has created links)
              ---------------------------------------------------------- */}
          {links && links.length > 0 && (
            <div className="loss-recent-hub">
              <div className="loss-recent-hub-header">
                <div className="loss-recent-hub-title">
                  <Zap size={15} color="#38bdf8" />
                  <span>
                    {locale === "tr"
                      ? `Son Oluşturulan Bağlantılarınız (${links.length})`
                      : `Your Recent Active Links (${links.length})`}
                  </span>
                </div>
                <button
                  type="button"
                  className="loss-recent-hub-viewall"
                  onClick={() => onNavigate("Links")}
                >
                  <span>{locale === "tr" ? "Tümünü Gör" : "View All"}</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <div className="loss-recent-list">
                {links.slice(0, 3).map((l) => {
                  const shortUrl = getShortUrl(l.slug);
                  const fav = getFaviconUrl(l.destination);
                  const isCopied = copiedId === l.id;

                  return (
                    <div key={l.id || l.slug} className="loss-recent-row">
                      <div className="loss-recent-info">
                        {fav ? (
                          <img
                            src={fav}
                            alt=""
                            className="loss-recent-favicon"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="loss-recent-favicon" style={{ background: "#334155" }} />
                        )}

                        <div className="loss-recent-text">
                          <span className="loss-recent-slug">
                            {shortUrl}
                          </span>
                          <span className="loss-recent-dest" title={l.destination}>
                            {l.destination}
                          </span>
                        </div>
                      </div>

                      <div className="loss-recent-meta">
                        <span className="loss-recent-clicks">
                          <Activity size={11} />
                          <span>{l.clicks || 0} {locale === "tr" ? "Tık" : "Clicks"}</span>
                        </span>

                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {formatTimeAgo(l.createdAt)}
                        </span>

                        <div className="loss-recent-actions">
                          <button
                            type="button"
                            className="loss-recent-action-btn"
                            onClick={() => handleCopyLink(l)}
                            title={locale === "tr" ? "Kopyala" : "Copy"}
                          >
                            {isCopied ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                          </button>

                          <button
                            type="button"
                            className="loss-recent-action-btn"
                            onClick={() => handleOpenQr(l)}
                            title="QR Kod"
                          >
                            <QrCode size={13} />
                          </button>

                          <a
                            href={shortUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="loss-recent-action-btn"
                            title={locale === "tr" ? "Aç" : "Open"}
                          >
                            <ExternalLink size={13} />
                          </a>

                          <button
                            type="button"
                            className="loss-recent-action-btn delete"
                            onClick={() => handleDelete(l)}
                            title={locale === "tr" ? "Sil" : "Delete"}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------
          "AS SEEN ON" MARQUEE (Upscayl Monochrome Style)
          ---------------------------------------------------------- */}
      <section className="loss-seen-on-section">
        <div className="loss-v2-container">
          <p className="loss-seen-on-title">
            {locale === "tr"
              ? "AS SEEN ON & TRUSTED BY MODERN TEAMS"
              : "AS SEEN ON & TRUSTED BY 25,000+ CREATORS"}
          </p>

          <div className="loss-marquee-wrapper">
            <div className="loss-marquee-track">
              {[...Array(2)].map((_, loopIdx) => (
                <div
                  key={loopIdx}
                  style={{ display: "flex", gap: "54px", alignItems: "center" }}
                >
                  <span className="loss-marquee-item">PRODUCT HUNT</span>
                  <span className="loss-marquee-item">TECHCRUNCH</span>
                  <span className="loss-marquee-item">HACKER NEWS</span>
                  <span className="loss-marquee-item">INDIE HACKERS</span>
                  <span className="loss-marquee-item">GITHUB TRENDING</span>
                  <span className="loss-marquee-item">DEV.TO</span>
                  <span className="loss-marquee-item">PRODUCTLED</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------
          THE 3 SIGNATURE EDITORIAL CARDS (Upscayl Glowing Washes)
          ---------------------------------------------------------- */}
      <section className="loss-editorial-section" id="ozellikler">
        <div className="loss-v2-container">
          <div className="loss-v2-section-header">
            <div className="loss-v2-section-tag">
              {locale === "tr" ? "NEDEN LOSS?" : "WHY LOSS?"}
            </div>
            <h2 className="loss-v2-section-title">
              {locale === "tr"
                ? "Dönüşümünüzü Artıran 3 Temel Güç"
                : "Three Core Superpowers for Your Links"}
            </h2>
            <p className="loss-v2-section-desc">
              {locale === "tr"
                ? "Eski tip, hantal link araçları markanıza zarar verir. Loss ile her temas noktası prestij kazanır."
                : "Legacy link tools slow down your users and lock your print assets. Loss gives you complete freedom."}
            </p>
          </div>

          <div className="loss-editorial-grid">
            {/* Card 1: Messy Links Kill Conversion (Vibrant Indigo Wash) */}
            <div className="loss-editorial-card indigo">
              <div className="loss-editorial-info">
                <span className="loss-editorial-badge">
                  {locale === "tr" ? "01 • GÜVEN VE DÖNÜŞÜM" : "01 • TRUST & CTR"}
                </span>
                <h3 className="loss-editorial-title">
                  {locale === "tr"
                    ? "180 Karakterlik Dağınık Linkler Tıklamaları Öldürür"
                    : "Messy 180-Character URLs Kill Your Conversion Rates"}
                </h3>
                <p className="loss-editorial-text">
                  {locale === "tr"
                    ? "Upuzun, anlaşılmaz ve şüpheli görünen UTM parametreli adresler kullanıcıları korkutur. loss.tr/ozel-isim ile oluşturulan prestijli linkler, tıklama oranlarını ortalama %34 artırır."
                    : "Long, cluttered links loaded with tracking tags look untrustworthy and break on mobile apps. Clean, branded links like loss.tr/summer-sale elevate click-through rates by up to 34%."}
                </p>
              </div>

              <div className="loss-editorial-visual">
                <div className="loss-editorial-preview-box">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "14px",
                      paddingBottom: "10px",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      fontSize: "12px",
                      color: "#f87171",
                      fontWeight: 700,
                    }}
                  >
                    <ShieldAlert size={16} />
                    <span>
                      {locale === "tr"
                        ? "Eski Tip Dağınık Link (Düşük Güven)"
                        : "Ugly Legacy Link (Low Trust)"}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.4)",
                      fontFamily: "var(--font-mono, monospace)",
                      lineHeight: "1.5",
                      wordBreak: "break-all",
                      marginBottom: "16px",
                    }}
                  >
                    https://shop.com/store/item-9823487?utm_source=ig&utm_medium=bio&utm_campaign=blackfri2026&aff=9928374
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "8px",
                      paddingTop: "10px",
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                      fontSize: "12px",
                      color: "#4ade80",
                      fontWeight: 700,
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>
                      {locale === "tr"
                        ? "Loss Akıllı Bağlantı (+%34 CTR)"
                        : "Loss Branded Link (+34% CTR)"}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "#38bdf8",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    loss.tr/yaz-indirimi
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Printed Static QR Nightmare (Vibrant Sky Blue Wash, Reverse) */}
            <div className="loss-editorial-card blue reverse">
              <div className="loss-editorial-info">
                <span className="loss-editorial-badge">
                  {locale === "tr"
                    ? "02 • BASILI MATERYAL"
                    : "02 • PRINT ASSETS"}
                </span>
                <h3 className="loss-editorial-title">
                  {locale === "tr"
                    ? "Basılmış 10.000 Broşürdeki Statik QR Kodu Değiştiremezsiniz"
                    : "You Can't Change a Static QR Code Once It's Printed"}
                </h3>
                <p className="loss-editorial-text">
                  {locale === "tr"
                    ? "Restoran menüleriniz, fuar stantlarınız veya ambalajlarınız basıldıktan sonra web sitesi adresi değişirse statik kodlar çöp olur. Dynamic QR ile QR görseli hiç değişmez; yönlendiği sayfayı panelinizden 2 saniyede güncellersiniz."
                    : "If you print 10,000 flyers or restaurant menus with a static QR code and the link changes, your entire print budget is lost. With Loss Dynamic QR, the printed image stays identical while the target updates in seconds."}
                </p>
              </div>

              <div className="loss-editorial-visual">
                <div className="loss-editorial-preview-box">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "12px",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        color: "#38bdf8",
                        fontWeight: 700,
                      }}
                    >
                      <Printer size={15} />
                      <span>
                        {locale === "tr" ? "Baskı Güvencesi" : "Print Guarantee"}
                      </span>
                    </span>
                    <span className="loss-trans-savings">
                      %100 Değiştirilebilir
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "14px",
                      alignItems: "center",
                      background: "rgba(255,255,255,0.03)",
                      padding: "12px",
                      borderRadius: "10px",
                    }}
                  >
                    <div
                      style={{
                        background: "#fff",
                        padding: "6px",
                        borderRadius: "8px",
                      }}
                    >
                      <QrCodeSvg
                        value="https://loss.tr/menu"
                        size={64}
                        id="editorial-qr"
                      />
                    </div>
                    <div style={{ fontSize: "12.5px", lineHeight: "1.4" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#fff",
                          marginBottom: "3px",
                        }}
                      >
                        {locale === "tr"
                          ? "Sabit Kalan QR Görseli"
                          : "Evergreen QR Code"}
                      </div>
                      <div style={{ color: "rgba(240,240,245,0.5)" }}>
                        {locale === "tr"
                          ? "Baskı Tarihi: 12 Mart"
                          : "Print Date: March 12"}
                      </div>
                      <div style={{ color: "#34d399", fontWeight: 700 }}>
                        {locale === "tr"
                          ? "Hedef: 2 Saniyede Güncellendi ✦"
                          : "Destination: Updated in 2s ✦"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Instant Edge Redirects & Privacy (Vibrant Purple Wash) */}
            <div className="loss-editorial-card violet">
              <div className="loss-editorial-info">
                <span className="loss-editorial-badge">
                  {locale === "tr"
                    ? "03 • KÜRESEL EDGE AĞI"
                    : "03 • CLOUD ENGINE"}
                </span>
                <h3 className="loss-editorial-title">
                  {locale === "tr"
                    ? "loss.tr ile Kontrol Sizde: Işık Hızında, Dinamik ve Özgür"
                    : "Complete Control with loss.tr: Sub-15ms, Dynamic, Cookieless"}
                </h3>
                <p className="loss-editorial-text">
                  {locale === "tr"
                    ? "Sub-15ms küresel edge yönlendirmeler, özel markalı alan adları, dinamik QR kodlar ve KVKK/GDPR uyumlu çerezsiz analitik. Linklerinizi ve basılı materyallerinizi akıllı bir büyüme motoruna dönüştürün."
                    : "Sub-15ms edge routing across 300+ global edge locations, custom branded domains, dynamic QR codes, and zero-cookie GDPR compliant analytics."}
                </p>
              </div>

              <div className="loss-editorial-visual">
                <div className="loss-editorial-preview-box">
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#c084fc",
                      marginBottom: "12px",
                    }}
                  >
                    ⚡ Küresel Edge Yönlendirme Ağı
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      <span>📍 İstanbul Edge (IST)</span>
                      <span style={{ color: "#34d399", fontWeight: 700 }}>
                        9ms TTL
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      <span>📍 Frankfurt Edge (FRA)</span>
                      <span style={{ color: "#34d399", fontWeight: 700 }}>
                        14ms TTL
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      <span>📍 Londra Edge (LHR)</span>
                      <span style={{ color: "#34d399", fontWeight: 700 }}>
                        12ms TTL
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------
          GIANT KINETIC TYPOGRAPHY MARQUEE (Upscayl Syne Ticker)
          ---------------------------------------------------------- */}
      <div className="loss-giant-marquee-section">
        <div className="loss-giant-marquee-track">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="loss-giant-marquee-text">
              LOSS • LONG STORY SHORT • INSTANT REDIRECTS • DYNAMIC QR • CLOUD
              ENGINE •
            </span>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------------
          "LOSS IS MADE FOR" SECTION (Upscayl Dynamic Headline)
          ---------------------------------------------------------- */}
      <section className="loss-made-for-section">
        <div className="loss-v2-container">
          <h4 className="loss-made-for-subtitle">
            {locale === "tr" ? "Loss kimler için tasarlandı?" : "Loss is made for"}
          </h4>
          <div className="loss-made-for-headline">
            <span key={wordIndex} className="loss-made-for-word">
              {madeForWords[wordIndex]}
            </span>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------
          UPSCAYL SIGNATURE BENTO GRID (Cloud Features Grid)
          ---------------------------------------------------------- */}
      <section className="loss-bento-section">
        <div className="loss-v2-container">
          <div className="loss-v2-section-header">
            <div className="loss-v2-section-tag">
              {locale === "tr" ? "HER ŞEY TEK ÇATIDA" : "ALL-IN-ONE ENGINE"}
            </div>
            <h2 className="loss-v2-section-title">
              {locale === "tr"
                ? "Modern Link ve QR İhtiyaçlarınız İçin Eksiksiz Güç"
                : "Engineered for Extreme Speed & Total Control"}
            </h2>
            <p className="loss-v2-section-desc">
              {locale === "tr"
                ? "Tıklama anından raporlama ekranına kadar en pürüzsüz deneyim."
                : "From the millisecond of click to GDPR-compliant telemetry, built with precision."}
            </p>
          </div>

          <div className="loss-bento-grid">
            {/* Bento 1: Sub-15ms Edge Routing (Col Span 2) */}
            <div
              className="loss-bento-card col-span-2"
              onClick={() => onNavigate("Shortener")}
            >
              <div
                className="loss-bento-bg-gradient"
                style={{
                  background:
                    "radial-gradient(circle at top right, rgba(56,189,248,0.35), transparent 60%)",
                }}
              />
              <div className="loss-bento-content">
                <div className="loss-bento-icon">
                  <Zap size={22} color="#38bdf8" />
                </div>
                <h3 className="loss-bento-title">
                  {locale === "tr"
                    ? "Sub-15ms Küresel Edge Yönlendirmeleri"
                    : "Sub-15ms Global Edge Redirects"}
                </h3>
                <p className="loss-bento-desc">
                  {locale === "tr"
                    ? "Ziyaretçileriniz beyaz ekranda beklemez. 300'den fazla küresel CDN noktasıyla yönlendirme anında tamamlanır."
                    : "Powered by a globally distributed edge mesh. Zero white-screen delay, ultra-low TTFB, maximum retention."}
                </p>
              </div>
              <div className="loss-bento-action">
                <span>{locale === "tr" ? "Detayları İncele" : "Learn more"}</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Bento 2: Dynamic QR Codes (Col Span 1) */}
            <div
              className="loss-bento-card col-span-1"
              onClick={() => onNavigate("QRCodes")}
            >
              <div
                className="loss-bento-bg-gradient"
                style={{
                  background:
                    "radial-gradient(circle at top right, rgba(168,85,247,0.35), transparent 60%)",
                }}
              />
              <div className="loss-bento-content">
                <div className="loss-bento-icon">
                  <QrCode size={22} color="#c084fc" />
                </div>
                <h3 className="loss-bento-title">
                  {locale === "tr" ? "Dinamik QR Kodlar" : "Dynamic Vector QR"}
                </h3>
                <p className="loss-bento-desc">
                  {locale === "tr"
                    ? "Baskıdan sonra bile hedef URL'yi tek tıkla değiştirin. Matbaa kalitesinde 300 DPI SVG/PNG."
                    : "Change the target URL anytime without reprinting. Export in crisp 300 DPI vector SVG."}
                </p>
              </div>
              <div className="loss-bento-action">
                <span>{locale === "tr" ? "Detayları İncele" : "Learn more"}</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Bento 3: Cookieless GDPR Analytics (Col Span 1) */}
            <div
              className="loss-bento-card col-span-1"
              onClick={() => onNavigate("Analytics")}
            >
              <div
                className="loss-bento-bg-gradient"
                style={{
                  background:
                    "radial-gradient(circle at top right, rgba(52,211,153,0.35), transparent 60%)",
                }}
              />
              <div className="loss-bento-content">
                <div className="loss-bento-icon">
                  <BarChart3 size={22} color="#34d399" />
                </div>
                <h3 className="loss-bento-title">
                  {locale === "tr" ? "Çerezsiz Canlı Analitik" : "Zero-Cookie Analytics"}
                </h3>
                <p className="loss-bento-desc">
                  {locale === "tr"
                    ? "Can sıkıcı çerez pencereleri yok. KVKK & GDPR uyumlu, anlık coğrafi ve cihaz haritası."
                    : "No annoying cookie banners. 100% GDPR compliant real-time geolocation & device insights."}
                </p>
              </div>
              <div className="loss-bento-action">
                <span>{locale === "tr" ? "Detayları İncele" : "Learn more"}</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Bento 4: Custom Branded Domains (Col Span 2) */}
            <div
              className="loss-bento-card col-span-2"
              onClick={() => onNavigate("Settings")}
            >
              <div
                className="loss-bento-bg-gradient"
                style={{
                  background:
                    "radial-gradient(circle at top right, rgba(56,189,248,0.35), transparent 60%)",
                }}
              />
              <div className="loss-bento-content">
                <div className="loss-bento-icon">
                  <Globe2 size={22} color="#38bdf8" />
                </div>
                <h3 className="loss-bento-title">
                  {locale === "tr"
                    ? "Özel Markalı Alan Adları & Aliaslar"
                    : "Custom Branded Domains & Slugs"}
                </h3>
                <p className="loss-bento-desc">
                  {locale === "tr"
                    ? "Kendi alan adınızı (link.sirketiniz.com) bağlayın veya loss.tr/ozel-isim ile marka bilinirliğinizi %34 artırın."
                    : "Connect your own domain or use custom short slugs to establish maximum brand trust and boost engagement by 34%."}
                </p>
              </div>
              <div className="loss-bento-action">
                <span>{locale === "tr" ? "Detayları İncele" : "Learn more"}</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Bento 5: Developer API & Webhook (Col Span 1) */}
            <div
              className="loss-bento-card col-span-1"
              onClick={() => onNavigate("Shortener")}
            >
              <div
                className="loss-bento-bg-gradient"
                style={{
                  background:
                    "radial-gradient(circle at top right, rgba(244,114,182,0.35), transparent 60%)",
                }}
              />
              <div className="loss-bento-content">
                <div className="loss-bento-icon">
                  <Terminal size={22} color="#f472b6" />
                </div>
                <h3 className="loss-bento-title">
                  {locale === "tr" ? "Geliştirici API & Webhook" : "Developer REST API"}
                </h3>
                <p className="loss-bento-desc">
                  {locale === "tr"
                    ? "2 satır kodla sistemlerinize bağlayın. Her tıklamada anlık webhook bildirimleri alın."
                    : "Integrate with 2 lines of code. Real-time webhook notifications on every redirect."}
                </p>
              </div>
              <div className="loss-bento-action">
                <span>{locale === "tr" ? "Detayları İncele" : "Learn more"}</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Bento 6: Smart Device Deep Linking (Col Span 1) */}
            <div
              className="loss-bento-card col-span-1"
              onClick={() => onNavigate("Shortener")}
            >
              <div
                className="loss-bento-bg-gradient"
                style={{
                  background:
                    "radial-gradient(circle at top right, rgba(251,146,60,0.35), transparent 60%)",
                }}
              />
              <div className="loss-bento-content">
                <div className="loss-bento-icon">
                  <Smartphone size={22} color="#fb923c" />
                </div>
                <h3 className="loss-bento-title">
                  {locale === "tr" ? "Akıllı Cihaz Hedefleme" : "Smart Device Targeting"}
                </h3>
                <p className="loss-bento-desc">
                  {locale === "tr"
                    ? "Tek kısa linkle iOS kullanıcılarını App Store'a, Android kullanıcılarını Play Store'a otomatik yönlendirin."
                    : "Intelligently direct iOS users to App Store, Android to Google Play, and web to your landing page."}
                </p>
              </div>
              <div className="loss-bento-action">
                <span>{locale === "tr" ? "Detayları İncele" : "Learn more"}</span>
                <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------
          SPEED & RELIABILITY COMPARISON MATRIX
          ---------------------------------------------------------- */}
      <section className="loss-v2-matrix-section" id="hiz-ve-altyapi">
        <div className="loss-v2-container">
          <div className="loss-v2-section-header">
            <div className="loss-v2-section-tag">{t.speed.sectionTag}</div>
            <h2 className="loss-v2-section-title">{t.speed.sectionTitle}</h2>
            <p className="loss-v2-section-desc">{t.speed.sectionSubtitle}</p>
          </div>

          <div className="loss-v2-matrix-grid">
            {/* Loss Matrix Card */}
            <div className="loss-v2-matrix-card highlight">
              <div className="loss-v2-matrix-card-header">
                <span className="loss-v2-matrix-label">
                  {t.speed.lossTitle}
                </span>
                <span className="loss-trans-savings">
                  {locale === "tr" ? "Işık Hızında" : "Lightning Fast"}
                </span>
              </div>
              <div className="loss-v2-matrix-number">{t.speed.lossLatency}</div>
              <ul className="loss-v2-matrix-list">
                <li className="loss-v2-matrix-item positive">
                  <Check size={16} color="#34d399" />
                  <span>{t.speed.lossPoint1}</span>
                </li>
                <li className="loss-v2-matrix-item positive">
                  <Check size={16} color="#34d399" />
                  <span>{t.speed.lossPoint2}</span>
                </li>
                <li className="loss-v2-matrix-item positive">
                  <Check size={16} color="#34d399" />
                  <span>{t.speed.lossPoint3}</span>
                </li>
              </ul>
            </div>

            {/* Legacy Competitor Matrix Card */}
            <div className="loss-v2-matrix-card">
              <div className="loss-v2-matrix-card-header">
                <span className="loss-v2-matrix-label">
                  {t.speed.legacyTitle}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#f87171",
                    fontWeight: 600,
                  }}
                >
                  {locale === "tr" ? "Yavaş & Hantal" : "Slow & Outdated"}
                </span>
              </div>
              <div className="loss-v2-matrix-number">
                {t.speed.legacyLatency}
              </div>
              <ul className="loss-v2-matrix-list">
                <li className="loss-v2-matrix-item">
                  <span style={{ color: "#f87171", fontWeight: "bold" }}>
                    ✕
                  </span>
                  <span>{t.speed.legacyPoint1}</span>
                </li>
                <li className="loss-v2-matrix-item">
                  <span style={{ color: "#f87171", fontWeight: "bold" }}>
                    ✕
                  </span>
                  <span>{t.speed.legacyPoint2}</span>
                </li>
                <li className="loss-v2-matrix-item">
                  <span style={{ color: "#f87171", fontWeight: "bold" }}>
                    ✕
                  </span>
                  <span>{t.speed.legacyPoint3}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------
          UPSCAYL-STYLE DOUBLE-ROW TESTIMONIALS MARQUEE
          ---------------------------------------------------------- */}
      <section className="loss-testimonials-section">
        <div className="loss-v2-container">
          <div className="loss-v2-section-header">
            <div className="loss-v2-section-tag">
              {locale === "tr" ? "KULLANICI DENEYİMLERİ" : "SOCIAL PROOF"}
            </div>
            <h2 className="loss-v2-section-title">
              {locale === "tr"
                ? "İnsanlar Loss'u Neden Çok Seviyor?"
                : "Loved by Founders, Marketers & Creators"}
            </h2>
          </div>

          <div className="loss-testimonials-container">
            {/* Row 1: Forward Direction */}
            <div className="loss-test-track">
              {[...Array(2)].map((_, loopIdx) => (
                <div key={loopIdx} style={{ display: "flex", gap: "16px" }}>
                  <div className="loss-test-card">
                    <p className="loss-test-quote">
                      "Basılı menülerimiz için Loss'un Dinamik QR özelliği
                      hayatımızı kurtardı. Fiyat güncellemesi yaptığımızda baskı
                      maliyetimiz sıfıra indi."
                    </p>
                    <div className="loss-test-author">
                      <div className="loss-test-avatar">EK</div>
                      <div>
                        <div className="loss-test-name">Emre Kaya</div>
                        <div className="loss-test-role">Restoran İşletmecisi</div>
                      </div>
                    </div>
                  </div>

                  <div className="loss-test-card">
                    <p className="loss-test-quote">
                      "Yönlendirme hızı inanılmaz. Eski link servisinde
                      ziyaretçilerimiz 1 saniyeden fazla bekliyordu, Loss ile 10
                      milisaniyede hedefteler."
                    </p>
                    <div className="loss-test-author">
                      <div className="loss-test-avatar">SB</div>
                      <div>
                        <div className="loss-test-name">Selin Bilgin</div>
                        <div className="loss-test-role">E-Ticaret Direktörü</div>
                      </div>
                    </div>
                  </div>

                  <div className="loss-test-card">
                    <p className="loss-test-quote">
                      "Çerezsiz takip özelliği sayesinde KVKK onay penceresi
                      olmadan tam olarak hangi platformdan ne kadar tıklama
                      aldığımızı görebiliyoruz."
                    </p>
                    <div className="loss-test-author">
                      <div className="loss-test-avatar">AY</div>
                      <div>
                        <div className="loss-test-name">Ali Yılmaz</div>
                        <div className="loss-test-role">Dijital Pazarlama</div>
                      </div>
                    </div>
                  </div>

                  <div className="loss-test-card">
                    <p className="loss-test-quote">
                      "Kendi domainimizi bağlamak 2 dakika sürdü. Müşterilerimize
                      artık kendi markamızın linkleriyle kampanya
                      gönderebiliyoruz."
                    </p>
                    <div className="loss-test-author">
                      <div className="loss-test-avatar">MC</div>
                      <div>
                        <div className="loss-test-name">Murat Can</div>
                        <div className="loss-test-role">Ajans Kurucusu</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Row 2: Reverse Direction */}
            <div className="loss-test-track reverse">
              {[...Array(2)].map((_, loopIdx) => (
                <div key={loopIdx} style={{ display: "flex", gap: "16px" }}>
                  <div className="loss-test-card">
                    <p className="loss-test-quote">
                      "The TTFB speed on Cloudflare edge is unmatched. Our ads
                      now see a measurable 18% lift in conversion because users
                      never bounce."
                    </p>
                    <div className="loss-test-author">
                      <div className="loss-test-avatar">JD</div>
                      <div>
                        <div className="loss-test-name">Jack Davis</div>
                        <div className="loss-test-role">Growth Lead</div>
                      </div>
                    </div>
                  </div>

                  <div className="loss-test-card">
                    <p className="loss-test-quote">
                      "Finally a shortener with state-of-the-art UI and zero
                      bloat. The vector SVG exports for our billboard campaign
                      were crystal sharp."
                    </p>
                    <div className="loss-test-author">
                      <div className="loss-test-avatar">ET</div>
                      <div>
                        <div className="loss-test-name">Elena Taylor</div>
                        <div className="loss-test-role">Creative Producer</div>
                      </div>
                    </div>
                  </div>

                  <div className="loss-test-card">
                    <p className="loss-test-quote">
                      "REST API entegrasyonuyla her gün binlerce dinamik
                      bağlantıyı otomatik üretiyoruz. Kesintisiz altyapı için tek
                      tercihimiz."
                    </p>
                    <div className="loss-test-author">
                      <div className="loss-test-avatar">KD</div>
                      <div>
                        <div className="loss-test-name">Kaan Demir</div>
                        <div className="loss-test-role">CTO, SaaS Startup</div>
                      </div>
                    </div>
                  </div>

                  <div className="loss-test-card">
                    <p className="loss-test-quote">
                      "Clean design, zero cookies, instant updates. Easily the
                      most premium link platform we have ever tested."
                    </p>
                    <div className="loss-test-author">
                      <div className="loss-test-avatar">MZ</div>
                      <div>
                        <div className="loss-test-name">Max Zeller</div>
                        <div className="loss-test-role">Tech Reviewer</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------
          TRANSPARENT PRICING GRID
          ---------------------------------------------------------- */}
      <section className="loss-v2-pricing-section" id="fiyatlandirma">
        <div className="loss-v2-container">
          <div className="loss-v2-section-header">
            <div className="loss-v2-section-tag">{t.pricing.sectionTag}</div>
            <h2 className="loss-v2-section-title">{t.pricing.sectionTitle}</h2>
            <p className="loss-v2-section-desc">{t.pricing.sectionSubtitle}</p>
          </div>

          {/* Billing Cycle Switcher */}
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div className="loss-v2-billing-toggle-wrap">
              <span
                className={`loss-v2-toggle-btn ${!yearlyBilling ? "active" : ""}`}
                onClick={() => setYearlyBilling(false)}
              >
                {t.pricing.monthlyBilling}
              </span>
              <div
                className={`loss-v2-toggle-switch ${yearlyBilling ? "yearly" : ""}`}
                onClick={() => setYearlyBilling(!yearlyBilling)}
              >
                <div className="loss-v2-toggle-thumb" />
              </div>
              <span
                className={`loss-v2-toggle-btn ${yearlyBilling ? "active" : ""}`}
                onClick={() => setYearlyBilling(true)}
              >
                {t.pricing.annualBilling}
              </span>
              <span className="loss-trans-savings">
                {t.pricing.annualDiscountBadge}
              </span>
            </div>
          </div>

          {/* 4 Plans Grid */}
          <div className="loss-v2-pricing-grid">
            {/* 1. Free Plan */}
            <div className="loss-v2-pricing-card">
              <h3 className="loss-v2-plan-name">{t.pricing.freeName}</h3>
              <p className="loss-v2-plan-desc">{t.pricing.freeDesc}</p>
              <div className="loss-v2-plan-price-box">
                <span className="loss-v2-plan-price">
                  {t.pricing.freePrice}
                </span>
                <span className="loss-v2-plan-period">
                  {locale === "tr" ? "/ ömür boyu" : "/ forever"}
                </span>
              </div>
              <button
                type="button"
                className="loss-v2-plan-btn outline"
                onClick={() => onNavigate("Shortener")}
              >
                {t.common.shortenBtn}
              </button>
              <ul className="loss-v2-features-list">
                {t.pricing.freeFeatures.map((feat, idx) => (
                  <li key={idx} className="loss-v2-feature-item">
                    <Check size={16} className="loss-v2-feature-check" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. Starter Plan */}
            <div className="loss-v2-pricing-card">
              <h3 className="loss-v2-plan-name">{t.pricing.starterName}</h3>
              <p className="loss-v2-plan-desc">{t.pricing.starterDesc}</p>
              <div className="loss-v2-plan-price-box">
                <span className="loss-v2-plan-price">
                  {yearlyBilling
                    ? t.pricing.starterAnnualPrice
                    : t.pricing.starterPrice}
                </span>
                <span className="loss-v2-plan-period">
                  {t.pricing.perMonth}
                </span>
              </div>
              <button
                type="button"
                className="loss-v2-plan-btn outline"
                onClick={() => onNavigate("Billing")}
              >
                {t.pricing.upgradeBtn}
              </button>
              <ul className="loss-v2-features-list">
                {t.pricing.starterFeatures.map((feat, idx) => (
                  <li key={idx} className="loss-v2-feature-item">
                    <Check size={16} className="loss-v2-feature-check" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. Pro Team Plan (Featured) */}
            <div className="loss-v2-pricing-card featured">
              <div className="loss-v2-popular-pill">{t.common.popular}</div>
              <h3 className="loss-v2-plan-name">{t.pricing.proName}</h3>
              <p className="loss-v2-plan-desc">{t.pricing.proDesc}</p>
              <div className="loss-v2-plan-price-box">
                <span className="loss-v2-plan-price">
                  {yearlyBilling
                    ? t.pricing.proAnnualPrice
                    : t.pricing.proPrice}
                </span>
                <span className="loss-v2-plan-period">
                  {t.pricing.perMonth}
                </span>
              </div>
              <button
                type="button"
                className="loss-v2-plan-btn primary"
                onClick={() => onNavigate("Billing")}
              >
                {t.pricing.upgradeBtn}
              </button>
              <ul className="loss-v2-features-list">
                {t.pricing.proFeatures.map((feat, idx) => (
                  <li key={idx} className="loss-v2-feature-item">
                    <Check size={16} className="loss-v2-feature-check" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 4. Agency / Scale Plan */}
            <div className="loss-v2-pricing-card">
              <h3 className="loss-v2-plan-name">{t.pricing.agencyName}</h3>
              <p className="loss-v2-plan-desc">{t.pricing.agencyDesc}</p>
              <div className="loss-v2-plan-price-box">
                <span className="loss-v2-plan-price">
                  {yearlyBilling
                    ? t.pricing.agencyAnnualPrice
                    : t.pricing.agencyPrice}
                </span>
                <span className="loss-v2-plan-period">
                  {t.pricing.perMonth}
                </span>
              </div>
              <button
                type="button"
                className="loss-v2-plan-btn outline"
                onClick={() => onNavigate("Billing")}
              >
                {t.pricing.upgradeBtn}
              </button>
              <ul className="loss-v2-features-list">
                {t.pricing.agencyFeatures.map((feat, idx) => (
                  <li key={idx} className="loss-v2-feature-item">
                    <Check size={16} className="loss-v2-feature-check" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
              marginTop: "32px",
              fontSize: "13px",
              color: "var(--loss-text-muted)",
            }}
          >
            {t.pricing.paytrNotice}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------
          FAQ SECTION (Accordion)
          ---------------------------------------------------------- */}
      <section className="loss-v2-faq-section" id="sss">
        <div className="loss-v2-container">
          <div className="loss-v2-section-header">
            <div className="loss-v2-section-tag">{t.faq.title}</div>
            <h2 className="loss-v2-section-title">{t.faq.subtitle}</h2>
          </div>

          <div className="loss-v2-faq-grid">
            {[
              { q: t.faq.q1, a: t.faq.a1, id: 1 },
              { q: t.faq.q2, a: t.faq.a2, id: 2 },
              { q: t.faq.q3, a: t.faq.a3, id: 3 },
              { q: t.faq.q4, a: t.faq.a4, id: 4 },
            ].map((faqItem) => (
              <div
                key={faqItem.id}
                className="loss-v2-faq-card"
                onClick={() =>
                  setOpenFaq(openFaq === faqItem.id ? null : faqItem.id)
                }
                style={{ cursor: "pointer" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <h3 className="loss-v2-faq-question" style={{ margin: 0 }}>
                    {faqItem.q}
                  </h3>
                  {openFaq === faqItem.id ? (
                    <ChevronUp size={18} color="#38bdf8" />
                  ) : (
                    <ChevronDown size={18} color="rgba(240,240,245,0.4)" />
                  )}
                </div>
                {(openFaq === faqItem.id || true) && (
                  <p
                    className="loss-v2-faq-answer"
                    style={{
                      marginTop: "10px",
                      opacity:
                        openFaq === faqItem.id || openFaq === null ? 1 : 0.6,
                    }}
                  >
                    {faqItem.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------
          UPSCAYL "PSST... GIVE IT A TRY" MINIMALIST FINAL CTA
          ---------------------------------------------------------- */}
      <section className="loss-psst-cta">
        <h2 className="loss-psst-title">
          <span className="dim">Psst... </span>
          {locale === "tr" ? "Hemen deneyin, " : "Give it a try, "}
          <br />
          <span className="dim">
            {locale === "tr" ? "tamamen ücretsiz 🤫" : "it's free 🤫"}
          </span>
        </h2>
        <button
          type="button"
          className="loss-psst-btn"
          onClick={() => onNavigate("Shortener")}
        >
          <span>
            {locale === "tr"
              ? "Hemen Başlayın, Pişman Olmayacaksınız ;)"
              : "Get Started, We don't bite ;)"}
          </span>
          <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}
