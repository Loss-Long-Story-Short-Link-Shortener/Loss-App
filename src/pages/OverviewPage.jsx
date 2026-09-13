import { useState, useEffect } from "react";
import {
  Link2,
  ArrowUp,
  Sparkles,
  Copy,
  Check,
  QrCode,
  Sliders,
  ExternalLink,
  Clock,
  Trash2,
  Lock,
  X,
  Loader2,
  Globe2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { isValidUrl, normalizeUrl, formatTimeAgo } from "../utils/formatters";
import { QrCodeSvg } from "../components/common/QrCodeSvg";

export function OverviewPage({
  onOpenCreateModal,
  onOpenQr,
  onDeleteRequest,
  onNavigate,
}) {
  const { user, links, addLink, requireAuth, showToast } = useAuth();
  const [inputUrl, setInputUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [createdLink, setCreatedLink] = useState(null);
  const [showInlineQr, setShowInlineQr] = useState(false);
  const [favErr, setFavErr] = useState(false);

  // Automatically clear createdLink card if the link is deleted
  useEffect(() => {
    if (createdLink) {
      const exists = links.some(
        (l) =>
          l.id === createdLink.id ||
          l.slug?.toLowerCase() === createdLink.slug?.toLowerCase()
      );
      if (!exists) {
        setCreatedLink(null);
      }
    }
  }, [links, createdLink]);

  const handleDeleteLink = (link) => {
    if (
      createdLink &&
      (createdLink.id === link.id || createdLink.slug === link.slug)
    ) {
      setCreatedLink(null);
    }
    onDeleteRequest(link);
  };

  // Inline creation options
  const [showCustomSlug, setShowCustomSlug] = useState(false);
  const [customSlug, setCustomSlug] = useState("");

  const [showUtm, setShowUtm] = useState(false);
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [linkPassword, setLinkPassword] = useState("");

  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const getFaviconUrl = (url) => {
    try {
      const hostname = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch {
      return null;
    }
  };

  const getDisplayBaseUrl = () => {
    if (typeof window !== "undefined") {
      if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      ) {
        return "https://loss.tr";
      }
      return window.location.origin;
    }
    return "https://loss.tr";
  };

  const getWorkingUrl = (slug) => {
    return `${getDisplayBaseUrl()}/${slug}`;
  };

  const handleQuickShorten = async (e) => {
    e?.preventDefault();
    const raw = inputUrl.trim();
    if (!raw || busy) return;

    if (!isValidUrl(raw)) {
      showToast("Lütfen geçerli bir URL girin (ör: https://siteniz.com)", "error");
      return;
    }

    let destination = normalizeUrl(raw);

    // Append UTM if provided
    if (utmSource.trim() || utmMedium.trim() || utmCampaign.trim()) {
      try {
        const u = new URL(destination);
        if (utmSource.trim()) u.searchParams.set("utm_source", utmSource.trim());
        if (utmMedium.trim()) u.searchParams.set("utm_medium", utmMedium.trim());
        if (utmCampaign.trim()) u.searchParams.set("utm_campaign", utmCampaign.trim());
        destination = u.toString();
      } catch {}
    }

    setBusy(true);
    setFavErr(false);
    setShowInlineQr(false);

    try {
      await new Promise((r) => setTimeout(r, 460));
      const payload = {
        destination,
        slug: customSlug.trim() || undefined,
        password: linkPassword.trim() || undefined,
      };

      const newLink = await addLink(payload);
      setInputUrl("");
      setCustomSlug("");
      setShowCustomSlug(false);
      setShowUtm(false);
      setShowPassword(false);
      setCreatedLink(newLink);

      // Auto-copy the working short link
      const shortUrl = getWorkingUrl(newLink.slug);
      try {
        await navigator.clipboard.writeText(shortUrl);
        setCopiedId(newLink.id);
        showToast("Kısa link hazır ve panoya kopyalandı ✦", "success");
        setTimeout(() => setCopiedId(null), 3000);
      } catch {}
    } catch (err) {
      showToast(err.message || "Link kısaltılamadı", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLink = async (link) => {
    try {
      const url = getWorkingUrl(link.slug);
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      showToast("Kısa link panoya kopyalandı ✦", "success");
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      showToast("Kopyalanamadı", "error");
    }
  };

  const handleOpenLink = (link) => {
    // Opens redirect handler which always works locally & on production
    window.open(`/${link.slug}`, "_blank");
  };

  // Compression calculation for the created link
  let origLen = 0;
  let shortLen = 0;
  let savingsPercent = 0;
  if (createdLink) {
    origLen = createdLink.destination.length;
    const displayShortUrl = getWorkingUrl(createdLink.slug);
    shortLen = displayShortUrl.length;
    if (origLen > shortLen) {
      savingsPercent = Math.round(((origLen - shortLen) / origLen) * 100);
    }
  }

  return (
    <div className="chatgpt-canvas">
      {/* Top Model / Domain Capsule */}
      <div className="chatgpt-top-pill-wrap">
        <div className="chatgpt-domain-pill">
          <span className="domain-dot" />
          <span>loss.tr</span>
        </div>
      </div>

      {/* Center Hero */}
      <div className="chatgpt-hero-center">
        <div className="chatgpt-brand-icon">
          <Link2 size={28} strokeWidth={2.4} />
        </div>
        <h1 className="chatgpt-hero-title">Neyi kısaltmak istersiniz?</h1>
        <p className="chatgpt-hero-subtitle">
          Bir bağlantı yapıştırın ve anında kısaltın. Kayıt olmadan hemen kullanabilirsiniz.
        </p>

        {/* ChatGPT Style Floating Prompt Box */}
        <form
          onSubmit={handleQuickShorten}
          className={`chatgpt-prompt-box ${busy ? "compressing" : ""}`}
        >
          {busy ? (
            <div className="compressing-text-track">
              <span className="compressing-dot-pulse" />
              <span className="compressing-label">Bağlantı optimize ediliyor ve kısaltılıyor...</span>
            </div>
          ) : (
            <input
              id="chatgpt-main-input"
              type="text"
              className="chatgpt-prompt-input"
              placeholder="Kısaltılacak bağlantıyı buraya yapıştırın..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              autoFocus
              disabled={busy}
            />
          )}

          <button
            type="submit"
            className={`chatgpt-send-btn ${inputUrl.trim() && !busy ? "active" : ""}`}
            disabled={busy || !inputUrl.trim()}
            aria-label="Kısalt"
          >
            {busy ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <ArrowUp size={18} strokeWidth={2.6} />
            )}
          </button>
        </form>

        {/* Inline Advanced Options Expansion Panel */}
        {(showCustomSlug || showUtm || showPassword) && (
          <div className="inline-options-panel">
            {showCustomSlug && (
              <div>
                <div className="inline-panel-header" style={{ marginBottom: "6px" }}>
                  <span className="inline-panel-title">
                    <Sliders size={13} /> Özel Bağlantı Adı (Slug)
                  </span>
                  <button
                    type="button"
                    className="linear-dismiss-btn"
                    onClick={() => {
                      setShowCustomSlug(false);
                      setCustomSlug("");
                    }}
                  >
                    <X size={11} /> İptal
                  </button>
                </div>
                <div className="inline-slug-group">
                  <span className="inline-domain-label">loss.tr /</span>
                  <input
                    type="text"
                    className="inline-slug-input"
                    placeholder="ozel-adiniz (ör: kampanya-2026)"
                    value={customSlug}
                    onChange={(e) =>
                      setCustomSlug(
                        e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "")
                      )
                    }
                    autoFocus
                  />
                </div>
              </div>
            )}

            {showUtm && (
              <div>
                <div className="inline-panel-header" style={{ marginBottom: "6px" }}>
                  <span className="inline-panel-title">
                    <Sparkles size={13} /> UTM Kampanya Parametreleri
                  </span>
                  <button
                    type="button"
                    className="linear-dismiss-btn"
                    onClick={() => {
                      setShowUtm(false);
                      setUtmSource("");
                      setUtmMedium("");
                      setUtmCampaign("");
                    }}
                  >
                    <X size={11} /> İptal
                  </button>
                </div>
                <div className="inline-utm-grid">
                  <div className="inline-utm-field">
                    <span className="inline-utm-label">Kaynak (Source)</span>
                    <input
                      type="text"
                      className="inline-utm-input"
                      placeholder="twitter, google, bio"
                      value={utmSource}
                      onChange={(e) => setUtmSource(e.target.value)}
                    />
                  </div>
                  <div className="inline-utm-field">
                    <span className="inline-utm-label">Araç (Medium)</span>
                    <input
                      type="text"
                      className="inline-utm-input"
                      placeholder="cpc, banner, newsletter"
                      value={utmMedium}
                      onChange={(e) => setUtmMedium(e.target.value)}
                    />
                  </div>
                  <div className="inline-utm-field">
                    <span className="inline-utm-label">Kampanya Adı</span>
                    <input
                      type="text"
                      className="inline-utm-input"
                      placeholder="yaz-indirimi"
                      value={utmCampaign}
                      onChange={(e) => setUtmCampaign(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {showPassword && (
              <div>
                <div className="inline-panel-header" style={{ marginBottom: "6px" }}>
                  <span className="inline-panel-title">
                    <Lock size={13} /> Şifre Koruması
                  </span>
                  <button
                    type="button"
                    className="linear-dismiss-btn"
                    onClick={() => {
                      setShowPassword(false);
                      setLinkPassword("");
                    }}
                  >
                    <X size={11} /> İptal
                  </button>
                </div>
                <div className="inline-slug-group">
                  <Lock size={14} style={{ color: "var(--text-muted)", marginRight: "6px" }} />
                  <input
                    type="password"
                    className="inline-slug-input"
                    placeholder="Ziyaretçiler için kilit parolası..."
                    value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Suggestion Pills */}
        <div className="chatgpt-pill-suggestions">
          <button
            type="button"
            className={`chatgpt-suggestion-btn ${showCustomSlug ? "active" : ""}`}
            onClick={() => setShowCustomSlug((prev) => !prev)}
          >
            <Sliders size={13} />
            <span>{showCustomSlug ? "✓ Özel Slug Açık" : "Özel Slug Belirle"}</span>
          </button>

          <button
            type="button"
            className={`chatgpt-suggestion-btn ${showUtm ? "active" : ""}`}
            onClick={() => setShowUtm((prev) => !prev)}
          >
            <Sparkles size={13} />
            <span>{showUtm ? "✓ UTM Açık" : "UTM Kampanyası Ekle"}</span>
          </button>

          <button
            type="button"
            className={`chatgpt-suggestion-btn ${showPassword ? "active" : ""}`}
            onClick={() => {
              if (requireAuth("Şifreli bağlantı oluşturmak için hesap gereklidir.")) {
                setShowPassword((prev) => !prev);
              }
            }}
          >
            <Lock size={13} />
            <span>{showPassword ? "✓ Şifre Aktif" : "Şifre Koruması"}</span>
          </button>
        </div>

        {/* Linear/Raycast Style Result Card */}
        {createdLink && (
          <div className="linear-transform-card" style={{ marginTop: "18px" }}>
            <div className="linear-card-top">
              <span className="linear-badge-success">
                <Check size={12} strokeWidth={2.8} /> Kısa Link Hazır & Çalışıyor
              </span>
              <button
                className="linear-dismiss-btn"
                onClick={() => setCreatedLink(null)}
                title="Kapat"
              >
                <X size={12} /> Kapat
              </button>
            </div>

            <div className="linear-short-url-row">
              <div
                className="linear-short-url-text"
                onClick={() => handleCopyLink(createdLink)}
                title="Kopyalamak için tıkla"
                style={{ cursor: "pointer" }}
              >
                <span className="linear-short-domain">{getDisplayBaseUrl()}/</span>
                <span className="linear-short-slug">{createdLink.slug}</span>
              </div>

              <div className="linear-actions-group">
                <button
                  className={`linear-copy-pill ${copiedId === createdLink.id ? "copied" : ""}`}
                  onClick={() => handleCopyLink(createdLink)}
                >
                  {copiedId === createdLink.id ? (
                    <>
                      <Check size={13} strokeWidth={2.6} /> Kopyalandı
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> Kopyala
                    </>
                  )}
                </button>

                <button
                  className={`linear-icon-pill ${showInlineQr ? "active" : ""}`}
                  onClick={() => setShowInlineQr((prev) => !prev)}
                  title={showInlineQr ? "QR Gizle" : "QR Kod Önizle"}
                >
                  <QrCode size={14} />
                </button>

                <button
                  className="linear-icon-pill"
                  onClick={() => handleOpenLink(createdLink)}
                  title="Bağlantıyı Test Et / Aç"
                >
                  <ExternalLink size={14} />
                </button>

                <button
                  className="linear-icon-pill"
                  onClick={() => handleDeleteLink(createdLink)}
                  title="Bağlantıyı Sil"
                  style={{ color: "var(--danger)" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="linear-dest-row">
              <div className="linear-dest-left" title={createdLink.destination}>
                {!favErr && getFaviconUrl(createdLink.destination) ? (
                  <img
                    src={getFaviconUrl(createdLink.destination)}
                    alt=""
                    className="linear-dest-favicon"
                    onError={() => setFavErr(true)}
                  />
                ) : (
                  <Globe2 size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                )}
                <span className="linear-dest-url">{createdLink.destination}</span>
              </div>
              {origLen > shortLen && (
                <span className="linear-savings-tag">
                  {origLen} ➔ {shortLen} karakter (%{savingsPercent} tasarruf)
                </span>
              )}
            </div>

            {/* Dynamic Visual Compression Gauge */}
            {origLen > shortLen && (
              <div className="compression-gauge-wrap">
                <div className="compression-gauge-header">
                  <span>BOYUT SIKIŞTIRMA GÖSTERGESİ</span>
                  <span className="compression-gauge-val">%{savingsPercent} Daha Kısa</span>
                </div>
                <div className="compression-gauge-track">
                  <div
                    className="compression-gauge-bar"
                    style={{ width: `${Math.max(14, 100 - savingsPercent)}%` }}
                  />
                </div>
                <div className="compression-gauge-footer">
                  <span>Orijinal: {origLen} bayt</span>
                  <span>Kısa: {shortLen} bayt</span>
                </div>
              </div>
            )}

            {/* Inline Interactive QR Code Preview */}
            {showInlineQr && (
              <div className="linear-inline-qr-wrap">
                <QrCodeSvg
                  value={getWorkingUrl(createdLink.slug)}
                  size={120}
                  fgColor="#0a0a0a"
                  bgColor="#ffffff"
                  id={`inline-qr-${createdLink.slug}`}
                />
                <span className="linear-inline-qr-caption">
                  Kameranızla taratabilirsiniz •{" "}
                  <a
                    href="#qr"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenQr(createdLink);
                    }}
                    style={{ color: "var(--text-primary)", textDecoration: "underline", cursor: "pointer" }}
                  >
                    Büyüt & İndir
                  </a>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feed of Shortened Links (ChatGPT Response Cards) */}
      {links.length > 0 && (
        <div className="chatgpt-feed-container">
          <div className="chatgpt-feed-header">
            <span>Kısaltılan Bağlantılar ({links.length})</span>
            {!user && (
              <button
                className="chatgpt-save-account-btn"
                onClick={() => requireAuth("Bağlantılarınızı buluta yedeklemek için giriş yapın.")}
              >
                <Sparkles size={13} /> Hesabına Kaydet / Giriş Yap
              </button>
            )}
          </div>

          <div className="chatgpt-feed-list">
            {links.map((link) => {
              const displayShortUrl = getWorkingUrl(link.slug);
              const isCopied = copiedId === link.id;

              return (
                <div key={link.id || link.slug} className="chatgpt-link-card">
                  <div className="chatgpt-card-left">
                    <div className="chatgpt-card-url-row">
                      <span
                        className="chatgpt-card-short-url"
                        onClick={() => handleCopyLink(link)}
                        title="Kopyalamak için tıkla"
                        style={{ cursor: "pointer" }}
                      >
                        {displayShortUrl}
                      </span>
                      <button
                        className={`chatgpt-copy-btn ${isCopied ? "copied" : ""}`}
                        onClick={() => handleCopyLink(link)}
                        title="Panoya Kopyala"
                      >
                        {isCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                        <span>{isCopied ? "Kopyalandı" : "Kopyala"}</span>
                      </button>
                    </div>

                    <div className="chatgpt-card-dest-row" title={link.destination}>
                      <img
                        src={getFaviconUrl(link.destination)}
                        alt=""
                        style={{ width: "13px", height: "13px", borderRadius: "2px", flexShrink: 0, objectFit: "contain" }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                      <span className="dest-text">{link.destination}</span>
                    </div>

                    <div className="chatgpt-card-meta-row">
                      <span className="meta-time">
                        <Clock size={12} /> {formatTimeAgo(link.createdAt)}
                      </span>
                      <span className="meta-clicks">
                        {link.clickCount || 0} tıklama
                      </span>
                      {link.password && (
                        <span className="meta-secured">
                          <Lock size={11} /> Şifreli
                        </span>
                      )}
                      {link.tag && <span className="meta-tag">{link.tag}</span>}
                    </div>
                  </div>

                  <div className="chatgpt-card-actions">
                    <button
                      className="chatgpt-action-pill"
                      onClick={() => onOpenQr(link)}
                      title="QR Kod Al"
                    >
                      <QrCode size={14} />
                      <span>QR</span>
                    </button>

                    <button
                      className="chatgpt-action-pill"
                      onClick={() => handleOpenLink(link)}
                      title="Bağlantıyı Aç / Test Et"
                    >
                      <ExternalLink size={14} />
                    </button>

                    <button
                      className="chatgpt-action-pill danger"
                      onClick={() => handleDeleteLink(link)}
                      title="Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
