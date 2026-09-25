import { useState, useEffect, useRef, useMemo } from "react";
import {
  Link2,
  Sparkles,
  Copy,
  Check,
  QrCode,
  SlidersHorizontal,
  ExternalLink,
  Clock,
  Trash2,
  Lock,
  X,
  Loader2,
  Globe2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Edit3,
  Clipboard,
  Search,
  Activity,
  Layers,
  CheckCircle2,
  Sliders,
  Calendar,
  Tag,
  Smartphone,
  Download,
  Share2,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import {
  isValidUrl,
  normalizeUrl,
  formatTimeAgo,
  formatNumber,
} from "../utils/formatters";
import { QrCodeSvg } from "../components/common/QrCodeSvg";
import { validateCustomSlug } from "../utils/slugGenerator";
import { getShortUrl, SHORT_LINK_HOST } from "../constants/domains";

export function ShortenerStudioPage({
  initialUrl = "",
  onOpenCreateModal,
  onOpenQr,
  onEditRequest,
  onDeleteRequest,
  onNavigate,
}) {
  const { user, links, addLink, deleteLink, requireAuth, showToast } = useAuth();
  const { t, locale } = useLanguage();

  // Active Tab: "shortener" | "qr" | "utm" | "security" | "links"
  const [activeTab, setActiveTab] = useState("shortener");

  // Core Link Creation Form States
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [customSlug, setCustomSlug] = useState("");
  const [showCustomSlug, setShowCustomSlug] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkTag, setLinkTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [createdLink, setCreatedLink] = useState(null);
  const [activePreset, setActivePreset] = useState("");
  const inputRef = useRef(null);

  // Tab 2: QR Studio States
  const [qrUrl, setQrUrl] = useState("https://loss.tr/ornek");
  const [qrFgColor, setQrFgColor] = useState("#0f172a");
  const [qrBgColor, setQrBgColor] = useState("#ffffff");
  const [qrSize, setQrSize] = useState(160);

  // Tab 3: UTM Campaign States
  const [utmBaseUrl, setUtmBaseUrl] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [utmContent, setUtmContent] = useState("");

  // Tab 4: Security & Rules States
  const [secUrl, setSecUrl] = useState("");
  const [secSlug, setSecSlug] = useState("");
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [enableExpiration, setEnableExpiration] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [iosRedirect, setIosRedirect] = useState("");
  const [androidRedirect, setAndroidRedirect] = useState("");

  // Tab 5: Links Search
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (initialUrl) {
      setInputUrl(initialUrl);
      setUtmBaseUrl(initialUrl);
      setSecUrl(initialUrl);
    }
  }, [initialUrl]);

  // Quick Presets
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
    setShowCustomSlug(true);
    setCreatedLink(null);
  };

  // Metrics summary
  const totalClicks = useMemo(() => {
    return links.reduce((sum, l) => sum + (Number(l.clickCount) || 0), 0);
  }, [links]);

  const slugValidation = useMemo(() => {
    if (!customSlug.trim()) return { valid: true };
    return validateCustomSlug(customSlug.trim());
  }, [customSlug]);

  const getFaviconUrl = (url) => {
    try {
      const hostname = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch {
      return null;
    }
  };

  // Compiled UTM Destination
  const computedUtmUrl = useMemo(() => {
    const raw = utmBaseUrl.trim();
    if (!raw || !isValidUrl(raw)) return raw;
    try {
      const u = new URL(normalizeUrl(raw));
      if (utmSource.trim()) u.searchParams.set("utm_source", utmSource.trim());
      if (utmMedium.trim()) u.searchParams.set("utm_medium", utmMedium.trim());
      if (utmCampaign.trim()) u.searchParams.set("utm_campaign", utmCampaign.trim());
      if (utmTerm.trim()) u.searchParams.set("utm_term", utmTerm.trim());
      if (utmContent.trim()) u.searchParams.set("utm_content", utmContent.trim());
      return u.toString();
    } catch {
      return raw;
    }
  }, [utmBaseUrl, utmSource, utmMedium, utmCampaign, utmTerm, utmContent]);

  // Handlers
  const handleQuickShorten = async (e) => {
    e?.preventDefault();
    const raw = inputUrl.trim();
    if (busy) return;

    if (!raw) {
      showToast(
        locale === "tr"
          ? "Lütfen önce kısaltmak istediğiniz bir internet adresi girin."
          : "Please enter a web address to shorten first.",
        "warning",
      );
      inputRef.current?.focus();
      return;
    }

    if (!isValidUrl(raw)) {
      showToast(
        locale === "tr"
          ? "Lütfen geçerli bir internet adresi girin (örn: https://siteniz.com)"
          : "Please enter a valid web address (e.g. https://your-site.com)",
        "warning",
      );
      return;
    }

    if (showCustomSlug && customSlug.trim()) {
      const val = validateCustomSlug(customSlug.trim());
      if (!val.valid) {
        showToast(val.error, "warning");
        return;
      }
    }

    setBusy(true);

    try {
      await new Promise((r) => setTimeout(r, 200));
      const destination = normalizeUrl(raw);
      const payload = {
        destination,
        slug:
          showCustomSlug && customSlug.trim()
            ? customSlug.trim().toLowerCase()
            : undefined,
        title: linkTitle.trim() || undefined,
        tag: linkTag.trim() || undefined,
      };

      const result = await addLink(payload);
      setCreatedLink(result);
      setQrUrl(getShortUrl(result.slug));

      // Auto-copy
      const finalUrl = getShortUrl(result.slug);
      try {
        await navigator.clipboard.writeText(finalUrl);
        setCopiedId(result.id || "new");
        setTimeout(() => setCopiedId(null), 2500);
        showToast(
          locale === "tr"
            ? "Kısa link hazır ve panoya kopyalandı! ✦"
            : "Short link created and copied to clipboard! ✦",
          "success",
        );
      } catch {
        showToast(
          locale === "tr" ? "Kısa bağlantı oluşturuldu! ✦" : "Short link ready! ✦",
          "success",
        );
      }
    } catch (err) {
      showToast(
        err.message ||
          (locale === "tr"
            ? "Link kısaltılamadı. Lütfen tekrar deneyin."
            : "Could not shorten link. Please try again."),
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  // UTM Shorten Action
  const handleShortenUtm = async (e) => {
    e?.preventDefault();
    if (!computedUtmUrl || !isValidUrl(computedUtmUrl)) {
      showToast(
        locale === "tr"
          ? "Lütfen geçerli bir hedef URL girin."
          : "Please enter a valid target URL.",
        "warning",
      );
      return;
    }
    setBusy(true);
    try {
      const payload = {
        destination: computedUtmUrl,
        title: utmCampaign ? `Kampanya: ${utmCampaign}` : undefined,
        tag: "UTM",
      };
      const result = await addLink(payload);
      setCreatedLink(result);
      setQrUrl(getShortUrl(result.slug));
      showToast(
        locale === "tr"
          ? "UTM etiketli kısa bağlantı hazır! ✦"
          : "UTM tagged short link created! ✦",
        "success",
      );
      setActiveTab("shortener");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  // Security Shorten Action
  const handleShortenSecurity = async (e) => {
    e?.preventDefault();
    const raw = secUrl.trim();
    if (!raw || !isValidUrl(raw)) {
      showToast(
        locale === "tr"
          ? "Lütfen geçerli bir hedef URL girin."
          : "Please enter a valid URL.",
        "warning",
      );
      return;
    }
    setBusy(true);
    try {
      const payload = {
        destination: normalizeUrl(raw),
        slug: secSlug.trim() ? secSlug.trim().toLowerCase() : undefined,
        password: enablePassword && password.trim() ? password.trim() : undefined,
        expiresAt: enableExpiration && expiresAt ? expiresAt : undefined,
        tag: enablePassword ? "Şifreli" : "Korumalı",
      };
      const result = await addLink(payload);
      setCreatedLink(result);
      setQrUrl(getShortUrl(result.slug));
      showToast(
        locale === "tr"
          ? "Korumalı bağlantınız hazır! ✦"
          : "Protected link created! ✦",
        "success",
      );
      setActiveTab("shortener");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text.trim());
        setActivePreset("");
        showToast(
          locale === "tr" ? "Panodan yapıştırıldı!" : "Pasted from clipboard!",
          "success",
        );
      }
    } catch {}
  };

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
      showToast(
        locale === "tr"
          ? "Bağlantı panoya kopyalandı ✦"
          : "Link copied to clipboard ✦",
        "success",
      );
    } catch {
      showToast("Kopyalanamadı", "warning");
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

  // Filtered links for Tab 5
  const filteredLinks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return links;
    return links.filter(
      (l) =>
        (l.slug && l.slug.toLowerCase().includes(q)) ||
        (l.title && l.title.toLowerCase().includes(q)) ||
        (l.destination && l.destination.toLowerCase().includes(q)),
    );
  }, [links, searchQuery]);

  // Active display calculation for Preview Card
  const activeSlug = customSlug.trim() || (createdLink ? createdLink.slug : "ornek-link");
  const activeDisplayUrl = createdLink
    ? getShortUrl(createdLink.slug)
    : getShortUrl(activeSlug);
  const activeDestination = createdLink
    ? createdLink.destination
    : inputUrl.trim() || "https://siteniz.com/uzun-hedef-adresi";

  // Savings metric
  const origLen = activeDestination.length || 1;
  const shortLen = activeDisplayUrl.length;
  const savingsPct =
    origLen > shortLen
      ? Math.round(((origLen - shortLen) / origLen) * 100)
      : 0;

  return (
    <div className="loss-dash-workspace">
      {/* ── Unified Dashboard Header with Integrated Stats ───────────────────── */}
      <div className="loss-dash-header">
        <div className="loss-dash-title-group">
          <h1 className="loss-dash-title">
            <span>{locale === "tr" ? "Link & QR" : "Link & QR"}</span>
            <span className="gradient-text">
              {locale === "tr" ? "Çalışma Alanı" : "Workspace"}
            </span>
          </h1>
          <p className="loss-dash-subtitle">
            {locale === "tr"
              ? "Akıllı yönlendirmeler, dinamik QR kodlar ve kampanya etiketlerini tek panelden yönetin."
              : "Manage smart redirects, dynamic QR codes, and UTM campaigns from a unified studio."}
          </p>
        </div>

        {/* Minimalist Stat Badges */}
        <div className="loss-dash-stat-pills">
          <div className="loss-dash-stat-pill">
            <Link2 size={13} color="#38bdf8" />
            <span>{locale === "tr" ? "Bağlantı:" : "Links:"}</span>
            <strong>{links.length}</strong>
          </div>

          <div className="loss-dash-stat-pill emerald">
            <Activity size={13} color="#34d399" />
            <span>{locale === "tr" ? "Tıklama:" : "Clicks:"}</span>
            <strong>{formatNumber(totalClicks)}</strong>
          </div>

          <div className="loss-dash-stat-pill blue">
            <Zap size={13} color="#38bdf8" />
            <span>Global Edge:</span>
            <strong>11ms</strong>
          </div>
        </div>
      </div>

      {/* ── SEGMENTED WORKSPACE TABS (Apple/Linear Style) ────────────────────── */}
      <div className="loss-dash-tabs-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "shortener"}
          className={`loss-dash-tab-btn ${activeTab === "shortener" ? "active" : ""}`}
          onClick={() => setActiveTab("shortener")}
        >
          <span className="loss-dash-tab-icon">
            <Link2 size={15} />
          </span>
          <span>{locale === "tr" ? "Link Kısalt" : "URL Shortener"}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "qr"}
          className={`loss-dash-tab-btn ${activeTab === "qr" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("qr");
            if (createdLink) setQrUrl(getShortUrl(createdLink.slug));
            else if (inputUrl.trim()) setQrUrl(inputUrl.trim());
          }}
        >
          <span className="loss-dash-tab-icon">
            <QrCode size={15} />
          </span>
          <span>{locale === "tr" ? "Dinamik QR Kod" : "QR Studio"}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "utm"}
          className={`loss-dash-tab-btn ${activeTab === "utm" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("utm");
            if (inputUrl.trim() && !utmBaseUrl) setUtmBaseUrl(inputUrl.trim());
          }}
        >
          <span className="loss-dash-tab-icon">
            <Tag size={15} />
          </span>
          <span>{locale === "tr" ? "UTM Kampanya" : "UTM Builder"}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "security"}
          className={`loss-dash-tab-btn ${activeTab === "security" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("security");
            if (inputUrl.trim() && !secUrl) setSecUrl(inputUrl.trim());
            if (customSlug.trim() && !secSlug) setSecSlug(customSlug.trim());
          }}
        >
          <span className="loss-dash-tab-icon">
            <Lock size={15} />
          </span>
          <span>{locale === "tr" ? "Güvenlik & Süre" : "Protection"}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "links"}
          className={`loss-dash-tab-btn ${activeTab === "links" ? "active" : ""}`}
          onClick={() => setActiveTab("links")}
        >
          <span className="loss-dash-tab-icon">
            <Layers size={15} />
          </span>
          <span>{locale === "tr" ? "Tüm Bağlantılar" : "My Links"}</span>
          <span className="loss-dash-tab-badge">{links.length}</span>
        </button>
      </div>

      {/* ── TAB 1: URL SHORTENER WORKSTATION ──────────────────────────────────── */}
      {activeTab === "shortener" && (
        <div className="loss-dash-panel">
          <div className="loss-dash-work-grid">
            {/* Left Console Card */}
            <div className="loss-dash-card">
              <div className="loss-dash-card-header">
                <div>
                  <div className="loss-dash-card-title">
                    <Sparkles size={16} color="#38bdf8" />
                    <span>
                      {locale === "tr" ? "Hızlı Link Kısaltıcı" : "Smart Link Shortener"}
                    </span>
                  </div>
                  <div className="loss-dash-card-subtitle">
                    {locale === "tr"
                      ? "Hedef web adresini girin, dilerseniz özel isim belirleyin."
                      : "Enter target URL with instant custom slug support."}
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="loss-dash-presets-row" style={{ marginBottom: 0 }}>
                  {presets.slice(0, 3).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`loss-dash-preset-chip ${activePreset === p.id ? "active" : ""}`}
                      onClick={() => handleSelectPreset(p)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleQuickShorten}>
                {/* Target URL Field */}
                <div className="loss-dash-field">
                  <label className="loss-dash-label">
                    <span>{locale === "tr" ? "Hedef Web Adresi *" : "Target Web Address *"}</span>
                    <span className="loss-dash-label-hint">https://...</span>
                  </label>
                  <div className="loss-dash-input-wrap">
                    <Link2 size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
                    <input
                      ref={inputRef}
                      type="text"
                      className="loss-dash-text-input"
                      placeholder="https://siteniz.com/karmasik-ve-uzun-sayfa-adresi"
                      value={inputUrl}
                      onChange={(e) => {
                        setInputUrl(e.target.value);
                        setActivePreset("");
                      }}
                      disabled={busy}
                      autoComplete="off"
                    />
                    {!inputUrl ? (
                      <button
                        type="button"
                        className="loss-dash-inline-btn"
                        onClick={handlePasteFromClipboard}
                      >
                        <Clipboard size={12} />
                        <span>{locale === "tr" ? "Yapıştır" : "Paste"}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="loss-dash-clear-btn"
                        onClick={() => setInputUrl("")}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Custom Slug Field (Inline & Editable) */}
                <div className="loss-dash-field">
                  <label className="loss-dash-label">
                    <span>{locale === "tr" ? "Özel Bağlantı İsmi (İsteğe Bağlı)" : "Custom Slug Alias (Optional)"}</span>
                    <span className="loss-dash-label-hint">
                      {slugValidation.valid ? (
                        <span style={{ color: "#34d399", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                          <CheckCircle2 size={12} /> {locale === "tr" ? "Uygun" : "Valid"}
                        </span>
                      ) : (
                        <span style={{ color: "#f87171" }}>{slugValidation.error}</span>
                      )}
                    </span>
                  </label>
                  <div className="loss-dash-slug-row">
                    <span className="loss-dash-slug-prefix">{SHORT_LINK_HOST} /</span>
                    <input
                      type="text"
                      className="loss-dash-slug-input-field"
                      placeholder="ozel-kampanya-adi"
                      value={customSlug}
                      onChange={(e) => {
                        setCustomSlug(
                          e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                        );
                        setShowCustomSlug(true);
                      }}
                    />
                    {customSlug && (
                      <button
                        type="button"
                        className="loss-dash-clear-btn"
                        onClick={() => setCustomSlug("")}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Optional Title & Tag Inputs (Compact Row) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "18px" }}>
                  <div>
                    <label className="loss-dash-label" style={{ marginBottom: "6px" }}>
                      <span>{locale === "tr" ? "Bağlantı Başlığı" : "Title"}</span>
                    </label>
                    <div className="loss-dash-input-wrap" style={{ height: "42px" }}>
                      <input
                        type="text"
                        className="loss-dash-text-input"
                        placeholder={locale === "tr" ? "Örn: Instagram Kampanyası" : "e.g. Summer Promo"}
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="loss-dash-label" style={{ marginBottom: "6px" }}>
                      <span>{locale === "tr" ? "Kategori / Etiket" : "Category / Tag"}</span>
                    </label>
                    <div className="loss-dash-input-wrap" style={{ height: "42px" }}>
                      <input
                        type="text"
                        className="loss-dash-text-input"
                        placeholder={locale === "tr" ? "Örn: Sosyal Medya, Lansman" : "e.g. Social, Launch"}
                        value={linkTag}
                        onChange={(e) => setLinkTag(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  className="loss-dash-primary-btn"
                  disabled={busy || !inputUrl.trim()}
                >
                  {busy ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>{locale === "tr" ? "Kısa Link Optimize Ediliyor..." : "Optimizing & Shortening..."}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>{locale === "tr" ? "Hemen Kısalt ve QR Üret" : "Shorten & Generate QR"}</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Live Preview Sidecar Card */}
            <div className="loss-dash-preview-card">
              <div className="loss-dash-preview-top">
                <span className="loss-dash-preview-tag">
                  <Activity size={13} />
                  <span>{createdLink ? "CANLI BAĞLANTI" : "CANLI ÖNİZLEME"}</span>
                </span>
                <span style={{ fontSize: "11px", color: "#34d399", fontWeight: 700 }}>
                  ● 11ms Global Edge
                </span>
              </div>

              {/* Dynamic QR Box */}
              <div className="loss-dash-qr-canvas-center">
                <div className="loss-dash-qr-white-frame">
                  <QrCodeSvg
                    value={activeDisplayUrl}
                    size={130}
                    id="sidecar-qr"
                  />
                </div>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                  {locale === "tr" ? "Dinamik Vektörel QR Kod" : "Dynamic Vector QR"}
                </span>
              </div>

              {/* Link Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div
                  className="loss-dash-preview-short-url"
                  onClick={() => handleCopy(activeDisplayUrl, "preview")}
                  title={locale === "tr" ? "Kopyalamak için tıklayın" : "Click to copy"}
                >
                  {activeDisplayUrl}
                </div>

                <div className="loss-dash-preview-dest" title={activeDestination}>
                  ➔ {activeDestination}
                </div>

                {savingsPct > 0 && (
                  <div style={{ textAlign: "center", marginTop: "4px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        background: "rgba(52, 211, 153, 0.15)",
                        color: "#34d399",
                        border: "1px solid rgba(52, 211, 153, 0.3)",
                        padding: "2px 10px",
                        borderRadius: "999px",
                        fontWeight: 700,
                      }}
                    >
                      -%{savingsPct} {locale === "tr" ? "Karakter Tasarrufu" : "Savings"}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="loss-dash-preview-actions">
                <button
                  type="button"
                  className={`loss-dash-action-pill primary ${copiedId === "preview" || copiedId === (createdLink?.id || "new") ? "copied" : ""}`}
                  onClick={() => handleCopy(activeDisplayUrl, "preview")}
                >
                  {copiedId === "preview" || copiedId === (createdLink?.id || "new") ? (
                    <>
                      <Check size={14} />
                      <span>{locale === "tr" ? "Kopyalandı!" : "Copied!"}</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>{locale === "tr" ? "Kopyala" : "Copy"}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="loss-dash-action-pill"
                  onClick={() =>
                    onOpenQr(
                      createdLink || {
                        slug: activeSlug,
                        destination: activeDestination,
                        shortUrl: activeDisplayUrl,
                      },
                    )
                  }
                >
                  <QrCode size={14} />
                  <span>{locale === "tr" ? "QR İndir" : "Download QR"}</span>
                </button>

                <a
                  href={activeDisplayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="loss-dash-action-pill"
                >
                  <ExternalLink size={14} />
                  <span>{locale === "tr" ? "Test Et" : "Test Link"}</span>
                </a>

                <button
                  type="button"
                  className="loss-dash-action-pill"
                  onClick={() => {
                    setCreatedLink(null);
                    setInputUrl("");
                    setCustomSlug("");
                    setLinkTitle("");
                    setLinkTag("");
                  }}
                >
                  <RefreshCw size={13} />
                  <span>{locale === "tr" ? "Sıfırla" : "Reset"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: QR STUDIO WORKSTATION ─────────────────────────────────────── */}
      {activeTab === "qr" && (
        <div className="loss-dash-panel">
          <div className="loss-dash-work-grid">
            <div className="loss-dash-card">
              <div className="loss-dash-card-header">
                <div>
                  <div className="loss-dash-card-title">
                    <QrCode size={16} color="#38bdf8" />
                    <span>{locale === "tr" ? "Dinamik QR Kod Stüdyosu" : "Dynamic QR Code Studio"}</span>
                  </div>
                  <div className="loss-dash-card-subtitle">
                    {locale === "tr"
                      ? "Herhangi bir bağlantı veya metin için yüksek çözünürlüklü vektörel QR kod üretin."
                      : "Create high-res SVG & PNG QR codes for any destination."}
                  </div>
                </div>
              </div>

              {/* QR URL Input */}
              <div className="loss-dash-field">
                <label className="loss-dash-label">
                  <span>{locale === "tr" ? "QR Kodun Yönleneceği Adres" : "Destination URL / Content"}</span>
                </label>
                <div className="loss-dash-input-wrap">
                  <Globe2 size={16} color="#38bdf8" />
                  <input
                    type="text"
                    className="loss-dash-text-input"
                    value={qrUrl}
                    onChange={(e) => setQrUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Color Customization Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
                <div>
                  <label className="loss-dash-label">
                    <span>{locale === "tr" ? "Ön Plan Rengi" : "Foreground Color"}</span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                    <input
                      type="color"
                      value={qrFgColor}
                      onChange={(e) => setQrFgColor(e.target.value)}
                      style={{ width: "36px", height: "36px", border: "none", borderRadius: "8px", cursor: "pointer", background: "transparent" }}
                    />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "#cbd5e1" }}>
                      {qrFgColor}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="loss-dash-label">
                    <span>{locale === "tr" ? "Arka Plan Rengi" : "Background Color"}</span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                    <input
                      type="color"
                      value={qrBgColor}
                      onChange={(e) => setQrBgColor(e.target.value)}
                      style={{ width: "36px", height: "36px", border: "none", borderRadius: "8px", cursor: "pointer", background: "transparent" }}
                    />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "#cbd5e1" }}>
                      {qrBgColor}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pre-fill from existing user links */}
              {links.length > 0 && (
                <div className="loss-dash-field">
                  <label className="loss-dash-label">
                    <span>{locale === "tr" ? "Mevcut Kısa Bağlantılarımdan Seç" : "Select from My Short Links"}</span>
                  </label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                    {links.slice(0, 4).map((l) => (
                      <button
                        key={l.id || l.slug}
                        type="button"
                        className="loss-dash-preset-chip"
                        onClick={() => setQrUrl(getShortUrl(l.slug))}
                      >
                        {SHORT_LINK_HOST}/{l.slug}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right QR Canvas Showcase */}
            <div className="loss-dash-preview-card" style={{ alignItems: "center" }}>
              <span className="loss-dash-preview-tag">
                <QrCode size={14} />
                <span>QR ÖNİZLEME & İNDİR</span>
              </span>

              <div
                style={{
                  background: qrBgColor,
                  padding: "16px",
                  borderRadius: "16px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                }}
              >
                <QrCodeSvg
                  value={qrUrl || "https://loss.tr"}
                  size={160}
                  fgColor={qrFgColor}
                  bgColor={qrBgColor}
                  id="tab-qr-canvas"
                />
              </div>

              <div style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", maxWidth: "260px" }}>
                <div style={{ fontWeight: 700, color: "#fff" }}>Vektörel SVG & Baskı Kalitesi</div>
                <div>Baskı sonrası bile hedefi panelden güncelleyebilirsiniz.</div>
              </div>

              <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "8px" }}>
                <button
                  type="button"
                  className="loss-dash-action-pill primary"
                  style={{ flex: 1 }}
                  onClick={() =>
                    onOpenQr({
                      slug: "qr-studio",
                      destination: qrUrl,
                      shortUrl: qrUrl,
                    })
                  }
                >
                  <Download size={14} />
                  <span>{locale === "tr" ? "Yüksek Çözünürlük İndir" : "Download High-Res"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: UTM CAMPAIGN BUILDER ──────────────────────────────────────── */}
      {activeTab === "utm" && (
        <div className="loss-dash-panel">
          <div className="loss-dash-card">
            <div className="loss-dash-card-header">
              <div>
                <div className="loss-dash-card-title">
                  <Tag size={16} color="#38bdf8" />
                  <span>{locale === "tr" ? "UTM Kampanya Etiketi Oluşturucu" : "UTM Campaign Builder"}</span>
                </div>
                <div className="loss-dash-card-subtitle">
                  {locale === "tr"
                    ? "Google Analytics, Meta Ads ve e-bültenler için eksiksiz takip linkleri hazırlayın."
                    : "Generate compliant campaign tracking tags for Google Analytics & Meta."}
                </div>
              </div>

              {/* 1-Click Platform Presets */}
              <div className="loss-dash-presets-row" style={{ marginBottom: 0 }}>
                <button
                  type="button"
                  className="loss-dash-preset-chip"
                  onClick={() => {
                    setUtmSource("google");
                    setUtmMedium("cpc");
                    setUtmCampaign("yaz-indirimi");
                  }}
                >
                  Google Ads
                </button>
                <button
                  type="button"
                  className="loss-dash-preset-chip"
                  onClick={() => {
                    setUtmSource("instagram");
                    setUtmMedium("paid_social");
                    setUtmCampaign("reels-kampanya");
                  }}
                >
                  Instagram Ads
                </button>
                <button
                  type="button"
                  className="loss-dash-preset-chip"
                  onClick={() => {
                    setUtmSource("newsletter");
                    setUtmMedium("email");
                    setUtmCampaign("haftalik-bulten");
                  }}
                >
                  E-Bülten
                </button>
                <button
                  type="button"
                  className="loss-dash-preset-chip"
                  onClick={() => {
                    setUtmSource("tiktok");
                    setUtmMedium("influencer");
                    setUtmCampaign("sponsor-video");
                  }}
                >
                  TikTok
                </button>
              </div>
            </div>

            <form onSubmit={handleShortenUtm}>
              {/* Base URL */}
              <div className="loss-dash-field">
                <label className="loss-dash-label">
                  <span>{locale === "tr" ? "Hedef Web Adresi *" : "Base Destination URL *"}</span>
                </label>
                <div className="loss-dash-input-wrap">
                  <Globe2 size={16} color="#38bdf8" />
                  <input
                    type="text"
                    className="loss-dash-text-input"
                    placeholder="https://siteniz.com/urun-sayfasi"
                    value={utmBaseUrl}
                    onChange={(e) => setUtmBaseUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* UTM Grid */}
              <div className="loss-dash-utm-grid">
                <div className="loss-dash-field">
                  <label className="loss-dash-label">
                    <span>Campaign Source (utm_source) *</span>
                    <span className="loss-dash-label-hint">google, instagram, newsletter</span>
                  </label>
                  <div className="loss-dash-input-wrap">
                    <input
                      type="text"
                      className="loss-dash-text-input"
                      placeholder="google"
                      value={utmSource}
                      onChange={(e) => setUtmSource(e.target.value)}
                    />
                  </div>
                </div>

                <div className="loss-dash-field">
                  <label className="loss-dash-label">
                    <span>Campaign Medium (utm_medium) *</span>
                    <span className="loss-dash-label-hint">cpc, email, social, banner</span>
                  </label>
                  <div className="loss-dash-input-wrap">
                    <input
                      type="text"
                      className="loss-dash-text-input"
                      placeholder="cpc"
                      value={utmMedium}
                      onChange={(e) => setUtmMedium(e.target.value)}
                    />
                  </div>
                </div>

                <div className="loss-dash-field">
                  <label className="loss-dash-label">
                    <span>Campaign Name (utm_campaign) *</span>
                    <span className="loss-dash-label-hint">yaz_firsati_2026</span>
                  </label>
                  <div className="loss-dash-input-wrap">
                    <input
                      type="text"
                      className="loss-dash-text-input"
                      placeholder="yaz_firsati_2026"
                      value={utmCampaign}
                      onChange={(e) => setUtmCampaign(e.target.value)}
                    />
                  </div>
                </div>

                <div className="loss-dash-field">
                  <label className="loss-dash-label">
                    <span>Campaign Term (utm_term)</span>
                    <span className="loss-dash-label-hint">ayakkabi+indirim</span>
                  </label>
                  <div className="loss-dash-input-wrap">
                    <input
                      type="text"
                      className="loss-dash-text-input"
                      placeholder="anahtar_kelime"
                      value={utmTerm}
                      onChange={(e) => setUtmTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Live Compiled UTM URL Box */}
              <div className="loss-dash-utm-preview-box">
                <div style={{ color: "#38bdf8", fontWeight: 700, marginBottom: "4px" }}>
                  🔍 Üretilen Tam Parametreli URL:
                </div>
                <div>{computedUtmUrl || "https://siteniz.com?utm_source=...&utm_medium=..."}</div>
              </div>

              <div style={{ marginTop: "18px" }}>
                <button
                  type="submit"
                  className="loss-dash-primary-btn"
                  disabled={busy || !computedUtmUrl || !isValidUrl(computedUtmUrl)}
                >
                  <Sparkles size={16} />
                  <span>{locale === "tr" ? "UTM'li Linki Kısalt ve Kaydet" : "Shorten UTM Link"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB 4: SECURITY & GOVERNANCE WORKSTATION ──────────────────────────── */}
      {activeTab === "security" && (
        <div className="loss-dash-panel">
          <div className="loss-dash-card">
            <div className="loss-dash-card-header">
              <div>
                <div className="loss-dash-card-title">
                  <Lock size={16} color="#38bdf8" />
                  <span>{locale === "tr" ? "Gelişmiş Güvenlik, Parola & Süre Kuralları" : "Security & Governance Rules"}</span>
                </div>
                <div className="loss-dash-card-subtitle">
                  {locale === "tr"
                    ? "Linklerinizi parola ile şifreleyin veya belirli bir tarihte otomatik kapanacak şekilde ayarlayın."
                    : "Add password gates and expiration timers to your smart links."}
                </div>
              </div>
            </div>

            <form onSubmit={handleShortenSecurity}>
              {/* Target URL */}
              <div className="loss-dash-field">
                <label className="loss-dash-label">
                  <span>{locale === "tr" ? "Hedef URL *" : "Destination URL *"}</span>
                </label>
                <div className="loss-dash-input-wrap">
                  <Globe2 size={16} color="#38bdf8" />
                  <input
                    type="text"
                    className="loss-dash-text-input"
                    placeholder="https://siteniz.com/gizli-belge"
                    value={secUrl}
                    onChange={(e) => setSecUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Protection Toggle Card */}
              <div className="loss-dash-switch-card">
                <div className="loss-dash-switch-info">
                  <span className="loss-dash-switch-title">
                    <Lock size={15} color="#f472b6" />
                    <span>{locale === "tr" ? "Parola Koruması (Password Gate)" : "Password Protection"}</span>
                  </span>
                  <span className="loss-dash-switch-desc">
                    {locale === "tr"
                      ? "Ziyaretçiler hedef sayfaya gitmeden önce bu parolayı girmek zorunda kalır."
                      : "Users must enter this password to access the destination."}
                  </span>
                </div>
                <label className="loss-switch">
                  <input
                    type="checkbox"
                    checked={enablePassword}
                    onChange={(e) => setEnablePassword(e.target.checked)}
                  />
                  <span className="loss-switch-slider" />
                </label>
              </div>

              {enablePassword && (
                <div className="loss-dash-field" style={{ animation: "slideDown 0.2s ease" }}>
                  <label className="loss-dash-label">
                    <span>{locale === "tr" ? "Erişim Parolası Belirleyin" : "Set Access Password"}</span>
                  </label>
                  <div className="loss-dash-input-wrap">
                    <input
                      type={showPasswordText ? "text" : "password"}
                      className="loss-dash-text-input"
                      placeholder="Güçlü bir parola girin"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="loss-dash-clear-btn"
                      onClick={() => setShowPasswordText((v) => !v)}
                    >
                      {showPasswordText ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Expiration Date Toggle Card */}
              <div className="loss-dash-switch-card">
                <div className="loss-dash-switch-info">
                  <span className="loss-dash-switch-title">
                    <Calendar size={15} color="#fbbf24" />
                    <span>{locale === "tr" ? "Zaman Aşımı / Son Geçerlilik Tarihi" : "Link Expiration Date"}</span>
                  </span>
                  <span className="loss-dash-switch-desc">
                    {locale === "tr"
                      ? "Tarih ve saat dolduğunda yönlendirme otomatik olarak durdurulur."
                      : "Link stops redirecting automatically after this date/time."}
                  </span>
                </div>
                <label className="loss-switch">
                  <input
                    type="checkbox"
                    checked={enableExpiration}
                    onChange={(e) => setEnableExpiration(e.target.checked)}
                  />
                  <span className="loss-switch-slider" />
                </label>
              </div>

              {enableExpiration && (
                <div className="loss-dash-field" style={{ animation: "slideDown 0.2s ease" }}>
                  <label className="loss-dash-label">
                    <span>{locale === "tr" ? "Kapanma Tarihi ve Saati" : "Expiration Date & Time"}</span>
                  </label>
                  <div className="loss-dash-input-wrap">
                    <input
                      type="datetime-local"
                      className="loss-dash-text-input"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginTop: "20px" }}>
                <button
                  type="submit"
                  className="loss-dash-primary-btn"
                  disabled={busy || !secUrl.trim() || !isValidUrl(secUrl.trim())}
                >
                  <ShieldCheck size={16} />
                  <span>{locale === "tr" ? "Korumalı Bağlantıyı Oluştur" : "Create Protected Link"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB 5: ALL USER SHORT LINKS MANAGER ──────────────────────────────── */}
      {activeTab === "links" && (
        <div className="loss-dash-panel">
          <div className="loss-dash-card">
            <div className="loss-dash-links-topbar">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Layers size={18} color="#38bdf8" />
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>
                  {locale === "tr" ? "Kayıtlı Tüm Bağlantılarınız" : "All Your Links"}
                </span>
                <span className="loss-dash-tab-badge">{filteredLinks.length}</span>
              </div>

              {/* Search Bar */}
              <div className="loss-dash-search-box">
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  className="loss-dash-search-input"
                  placeholder={
                    locale === "tr"
                      ? "Slug, başlık veya hedef ara..."
                      : "Search by slug, title or destination..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            {filteredLinks.length === 0 ? (
              <div className="loss-dash-empty-state">
                <div className="loss-dash-empty-state-icon">
                  <Link2 size={24} />
                </div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>
                  {searchQuery
                    ? `"${searchQuery}" ile eşleşen bağlantı bulunamadı`
                    : locale === "tr"
                      ? "Henüz bir bağlantı oluşturmadınız"
                      : "No links created yet"}
                </div>
                <div style={{ fontSize: "13px", color: "#94a3b8", maxWidth: "400px" }}>
                  {searchQuery
                    ? "Arama filtrenizi temizleyin veya farklı bir kelime arayın."
                    : "Hemen 'Link Kısalt' sekmesine giderek ilk akıllı bağlantınızı ve QR kodunuzu oluşturun."}
                </div>
                {!searchQuery && (
                  <button
                    type="button"
                    className="loss-dash-action-pill primary"
                    onClick={() => setActiveTab("shortener")}
                    style={{ marginTop: "8px" }}
                  >
                    <Sparkles size={14} />
                    <span>{locale === "tr" ? "İlk Linkini Kısalt" : "Shorten First Link"}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="loss-dash-links-feed">
                {filteredLinks.map((link) => {
                  const shortUrl = getShortUrl(link.slug);
                  const isCopied = copiedId === link.id;
                  const fav = getFaviconUrl(link.destination);

                  return (
                    <div key={link.id || link.slug} className="loss-dash-item-card">
                      <div className="loss-dash-item-left">
                        <div className="loss-dash-item-favicon">
                          {fav ? (
                            <img
                              src={fav}
                              alt=""
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <Globe2 size={16} color="#38bdf8" />
                          )}
                        </div>

                        <div className="loss-dash-item-info">
                          <div className="loss-dash-item-title-row">
                            <span
                              className="loss-dash-item-short"
                              onClick={() => handleCopy(shortUrl, link.id)}
                              title="Kopyalamak için tıklayın"
                            >
                              {shortUrl}
                            </span>

                            {link.tag && (
                              <span className="loss-dash-item-tag">{link.tag}</span>
                            )}

                            {link.password && (
                              <span
                                style={{
                                  fontSize: "10.5px",
                                  color: "#f472b6",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                              >
                                <Lock size={10} />
                                <span>{locale === "tr" ? "Şifreli" : "Protected"}</span>
                              </span>
                            )}

                            {link.expiresAt && (
                              <span
                                style={{
                                  fontSize: "10.5px",
                                  color: "#fbbf24",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                              >
                                <Calendar size={10} />
                                <span>{locale === "tr" ? "Süreli" : "Timed"}</span>
                              </span>
                            )}
                          </div>

                          <div className="loss-dash-item-dest" title={link.destination}>
                            {link.destination}
                          </div>
                        </div>
                      </div>

                      <div className="loss-dash-item-right">
                        <div className="loss-dash-item-clicks">
                          <Activity size={12} />
                          <span>{link.clickCount || 0} {locale === "tr" ? "Tık" : "Clicks"}</span>
                        </div>

                        <span className="loss-dash-item-time">
                          {formatTimeAgo(link.createdAt)}
                        </span>

                        <div className="loss-dash-item-actions">
                          <button
                            type="button"
                            className="loss-dash-icon-btn"
                            onClick={() => handleCopy(shortUrl, link.id)}
                            title={locale === "tr" ? "Kopyala" : "Copy"}
                          >
                            {isCopied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                          </button>

                          <button
                            type="button"
                            className="loss-dash-icon-btn"
                            onClick={() => onOpenQr(link)}
                            title={locale === "tr" ? "QR Kod" : "QR Code"}
                          >
                            <QrCode size={14} />
                          </button>

                          {onEditRequest && (
                            <button
                              type="button"
                              className="loss-dash-icon-btn"
                              onClick={() => onEditRequest(link)}
                              title={locale === "tr" ? "Hedefi Güncelle" : "Edit Target"}
                            >
                              <Edit3 size={14} />
                            </button>
                          )}

                          <a
                            href={shortUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="loss-dash-icon-btn"
                            title={locale === "tr" ? "Aç" : "Open"}
                          >
                            <ExternalLink size={14} />
                          </a>

                          <button
                            type="button"
                            className="loss-dash-icon-btn danger"
                            onClick={() => handleDelete(link)}
                            title={locale === "tr" ? "Sil" : "Delete"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
