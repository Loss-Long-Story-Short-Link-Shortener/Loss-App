import { useState, useMemo, useEffect } from "react";
import {
  Link2,
  Copy,
  Check,
  ExternalLink,
  Sliders,
  QrCode,
  Tag,
  FileText,
  Lock,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
} from "lucide-react";
import { Modal } from "../common/Modal";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { sanitizeSlug, isValidUrl, normalizeUrl } from "../../utils/formatters";
import { validateCustomSlug } from "../../utils/slugGenerator";
import { getShortUrl, SHORT_LINK_HOST } from "../../constants/domains";

export function CreateLinkModal({
  isOpen,
  onClose,
  onOpenQr,
  onOpenUpgradeModal,
  initialUrl = "",
  initialSlug = "",
}) {
  const { addLink, showToast } = useAuth();
  const { t, locale } = useLanguage();

  // Basic Form Fields
  const [destinationUrl, setDestinationUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");

  // Custom Slug Fields
  const [showSlug, setShowSlug] = useState(false);
  const [customSlug, setCustomSlug] = useState("");

  // UTM Campaign Fields
  const [showUtm, setShowUtm] = useState(false);
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [utmContent, setUtmContent] = useState("");

  // Advanced Governance Fields
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  // UI state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdLink, setCreatedLink] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || createdLink) return;
    setDestinationUrl(initialUrl);
    setCustomSlug(initialSlug);
    setShowSlug(Boolean(initialSlug));
    setError("");
  }, [isOpen, initialUrl, initialSlug, createdLink]);

  // Validate custom slug in real time
  const slugValidation = useMemo(() => {
    if (!customSlug.trim()) return { valid: true };
    return validateCustomSlug(customSlug.trim());
  }, [customSlug]);

  // Merge base destination with UTM parameters
  const computedDestinationUrl = useMemo(() => {
    const raw = destinationUrl.trim();
    if (!raw || !isValidUrl(raw)) return raw;

    try {
      const url = new URL(normalizeUrl(raw));
      if (utmSource.trim())
        url.searchParams.set("utm_source", utmSource.trim());
      if (utmMedium.trim())
        url.searchParams.set("utm_medium", utmMedium.trim());
      if (utmCampaign.trim())
        url.searchParams.set("utm_campaign", utmCampaign.trim());
      if (utmTerm.trim()) url.searchParams.set("utm_term", utmTerm.trim());
      if (utmContent.trim())
        url.searchParams.set("utm_content", utmContent.trim());
      return url.toString();
    } catch {
      return raw;
    }
  }, [destinationUrl, utmSource, utmMedium, utmCampaign, utmTerm, utmContent]);

  const handleApplyPreset = (source, medium, campaign) => {
    setShowUtm(true);
    setUtmSource(source);
    setUtmMedium(medium);
    setUtmCampaign(campaign);
  };

  const handleResetUtm = () => {
    setUtmSource("");
    setUtmMedium("");
    setUtmCampaign("");
    setUtmTerm("");
    setUtmContent("");
  };

  const handleResetForm = () => {
    setDestinationUrl("");
    setTitle("");
    setTag("");
    setCustomSlug("");
    setShowSlug(false);
    setShowUtm(false);
    handleResetUtm();
    setShowAdvanced(false);
    setPassword("");
    setExpiresAt("");
    setError("");
    setCreatedLink(null);
    setCopied(false);
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const raw = destinationUrl.trim();
    if (!raw || !isValidUrl(raw)) {
      setError(
        locale === "tr"
          ? "Lütfen geçerli bir hedef web adresi girin (örn: https://siteniz.com)."
          : "Please enter a valid destination URL (e.g. https://your-site.com).",
      );
      return;
    }

    if (showSlug && customSlug.trim()) {
      const val = validateCustomSlug(customSlug.trim());
      if (!val.valid) {
        setError(val.error);
        return;
      }
    }

    setBusy(true);
    try {
      const payload = {
        destination: computedDestinationUrl,
        slug:
          showSlug && customSlug.trim()
            ? sanitizeSlug(customSlug.trim())
            : undefined,
        title: title.trim() || undefined,
        tag: tag.trim() || undefined,
        password: password.trim() || undefined,
        expiresAt: expiresAt || undefined,
      };

      const result = await addLink(payload);
      setCreatedLink(result);

      const workingLinkUrl = result.shortUrl || getShortUrl(result.slug);

      try {
        await navigator.clipboard.writeText(workingLinkUrl);
        setCopied(true);
        showToast(t.common.copiedToast, "success");
      } catch {}
    } catch (err) {
      setError(
        err.message ||
          (locale === "tr"
            ? "Link oluşturulurken bir hata oluştu."
            : "An error occurred while creating the short link."),
      );
    } finally {
      setBusy(false);
    }
  };

  const shortDisplayUrl = createdLink
    ? createdLink.shortUrl || getShortUrl(createdLink.slug)
    : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdLink ? t.modals.successTitle : t.modals.createTitle}
      subtitle={
        createdLink ? t.modals.successSubtitle : t.modals.createSubtitle
      }
      maxWidth={createdLink ? "520px" : "560px"}
    >
      {createdLink ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            paddingTop: "4px",
          }}
        >
          {/* Result Card */}
          <div
            style={{
              background: "var(--bg-surface-subtle)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "15px",
                  color: "var(--primary)",
                  fontWeight: 600,
                  wordBreak: "break-all",
                }}
              >
                {shortDisplayUrl}
              </span>

              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(shortDisplayUrl);
                    setCopied(true);
                    showToast(t.common.copiedToast, "success");
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? (
                    <Check size={13} color="#10b981" />
                  ) : (
                    <Copy size={13} />
                  )}
                  <span>{copied ? t.common.copied : t.common.copy}</span>
                </button>
                <a
                  href={shortDisplayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-subtle btn-sm"
                  title={t.common.test}
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: "10px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span
                  style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                >
                  {locale === "tr" ? "Hedef:" : "Destination:"}
                </span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "360px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {createdLink.destination}
                </span>
              </div>
              {createdLink.title && (
                <div>
                  <span
                    style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                  >
                    {locale === "tr" ? "Başlık: " : "Title: "}
                  </span>
                  {createdLink.title}
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "8px",
            }}
          >
            {onOpenQr ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onClose();
                  onOpenQr(createdLink);
                }}
              >
                <QrCode size={14} /> {t.modals.openQrBtn}
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
              >
                {t.modals.finish}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleResetForm}
              >
                <Link2 size={14} /> {t.modals.shortenAnother}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          {error && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                padding: "10px 14px",
                borderRadius: "var(--radius-xs)",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          {/* 1. Destination URL */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label
              className="form-label"
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span>
                {t.modals.destUrlLabel}{" "}
                <span style={{ color: "var(--primary)" }}>*</span>
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontWeight: 400,
                }}
              >
                {computedDestinationUrl !== destinationUrl.trim() &&
                  (locale === "tr" ? "Etiketler eklendi" : "Tags applied")}
              </span>
            </label>
            <input
              type="url"
              className="input-text"
              placeholder={t.modals.destUrlPlaceholder}
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              autoFocus
              disabled={busy}
              style={{ fontSize: "14px", padding: "11px 14px" }}
            />
          </div>

          {/* 2. Optional Title & Tag */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: "10px",
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "12px" }}>
                <FileText
                  size={12}
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: "4px",
                  }}
                />
                {t.modals.titleLabel}
              </label>
              <input
                type="text"
                className="input-text"
                placeholder={t.modals.titlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={busy}
                style={{ fontSize: "13px", padding: "8px 10px" }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "12px" }}>
                <Tag
                  size={12}
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: "4px",
                  }}
                />
                {t.modals.tagLabel}
              </label>
              <input
                type="text"
                className="input-text"
                placeholder={t.modals.tagPlaceholder}
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                disabled={busy}
                style={{ fontSize: "13px", padding: "8px 10px" }}
              />
            </div>
          </div>

          {/* 3. Custom Slug Toggle & Input */}
          {!showSlug ? (
            <button
              type="button"
              className="lss-suggestion-btn"
              style={{
                alignSelf: "flex-start",
                marginTop: "2px",
                fontSize: "12.5px",
              }}
              onClick={() => setShowSlug(true)}
            >
              <Sliders size={13} />
              <span>{t.modals.customSlugPrompt}</span>
            </button>
          ) : (
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <label
                  className="form-label"
                  style={{ marginBottom: 0, fontSize: "12px" }}
                >
                  {t.modals.customSlugLabel}
                </label>
                <button
                  type="button"
                  className="linear-dismiss-btn"
                  onClick={() => {
                    setShowSlug(false);
                    setCustomSlug("");
                  }}
                >
                  {t.common.cancel}
                </button>
              </div>

              <div className="inline-slug-group" style={{ padding: "4px 8px" }}>
                <span className="inline-domain-label">{SHORT_LINK_HOST} /</span>
                <input
                  type="text"
                  className="inline-slug-input"
                  placeholder="ozel-isim"
                  value={customSlug}
                  onChange={(e) =>
                    setCustomSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                    )
                  }
                  disabled={busy}
                />
              </div>

              {customSlug.trim() && (
                <div style={{ fontSize: "11.5px" }}>
                  {slugValidation.valid ? (
                    <span
                      style={{
                        color: "#10b981",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Check size={12} /> {t.modals.customSlugValid}
                    </span>
                  ) : (
                    <span style={{ color: "#ef4444" }}>
                      {slugValidation.error}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. UTM Campaign Tags & Presets */}
          <div
            style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              background: "rgba(255, 255, 255, 0.01)",
            }}
          >
            <button
              type="button"
              onClick={() => setShowUtm((v) => !v)}
              style={{
                width: "100%",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-primary)",
                fontSize: "12.5px",
                fontWeight: 500,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Sparkles size={13} color="var(--primary)" />
                <span>{t.modals.utmToggle}</span>
                {(utmSource || utmCampaign) && (
                  <span
                    style={{
                      background: "rgba(56, 189, 248, 0.15)",
                      color: "var(--primary)",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      fontSize: "10px",
                      fontWeight: 600,
                    }}
                  >
                    {locale === "tr" ? "Aktif" : "Active"}
                  </span>
                )}
              </div>
              {showUtm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showUtm && (
              <div
                style={{
                  padding: "12px 14px",
                  borderTop: "1px solid var(--border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {/* Presets Chips */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{ fontSize: "11px", color: "var(--text-muted)" }}
                  >
                    {locale === "tr" ? "Hızlı Seçim:" : "Presets:"}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "11px", padding: "3px 8px" }}
                    onClick={() =>
                      handleApplyPreset("instagram", "social", "insta_post")
                    }
                  >
                    Instagram
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "11px", padding: "3px 8px" }}
                    onClick={() =>
                      handleApplyPreset("google", "cpc", "search_ads")
                    }
                  >
                    Google Ads
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "11px", padding: "3px 8px" }}
                    onClick={() =>
                      handleApplyPreset(
                        "newsletter",
                        "email",
                        "weekly_bulletin",
                      )
                    }
                  >
                    {locale === "tr" ? "E-Bülten" : "Newsletter"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "11px", padding: "3px 8px" }}
                    onClick={() =>
                      handleApplyPreset(
                        "tiktok",
                        "short_video",
                        "viral_campaign",
                      )
                    }
                  >
                    TikTok
                  </button>
                  {(utmSource || utmMedium || utmCampaign) && (
                    <button
                      type="button"
                      className="btn btn-subtle btn-sm"
                      style={{
                        fontSize: "11px",
                        padding: "3px 8px",
                        color: "var(--danger)",
                      }}
                      onClick={handleResetUtm}
                    >
                      <X size={11} /> {locale === "tr" ? "Temizle" : "Reset"}
                    </button>
                  )}
                </div>

                {/* Grid of UTM inputs */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      {t.modals.utmSource}
                    </label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="instagram, google"
                      value={utmSource}
                      onChange={(e) => setUtmSource(e.target.value)}
                      style={{ fontSize: "12px", padding: "6px 8px" }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      {t.modals.utmMedium}
                    </label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="story, bio, cpc, email"
                      value={utmMedium}
                      onChange={(e) => setUtmMedium(e.target.value)}
                      style={{ fontSize: "12px", padding: "6px 8px" }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      {t.modals.utmCampaign}
                    </label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="yaz_indirimi_2026"
                      value={utmCampaign}
                      onChange={(e) => setUtmCampaign(e.target.value)}
                      style={{ fontSize: "12px", padding: "6px 8px" }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      {t.modals.utmContent}
                    </label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="banner_v1"
                      value={utmContent}
                      onChange={(e) => setUtmContent(e.target.value)}
                      style={{ fontSize: "12px", padding: "6px 8px" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. Security & Expiry Options */}
          <div
            style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              background: "rgba(255, 255, 255, 0.01)",
            }}
          >
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              style={{
                width: "100%",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-primary)",
                fontSize: "12.5px",
                fontWeight: 500,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Lock size={13} style={{ color: "#94a3b8" }} />
                <span>{t.modals.securityToggle}</span>
                {(password || expiresAt) && (
                  <span
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      fontSize: "10px",
                      fontWeight: 600,
                    }}
                  >
                    {locale === "tr" ? "Korumalı" : "Protected"}
                  </span>
                )}
              </div>
              {showAdvanced ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>

            {showAdvanced && (
              <div
                style={{
                  padding: "12px 14px",
                  borderTop: "1px solid var(--border-subtle)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "11px",
                      color: "var(--text-secondary)",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    <Lock
                      size={11}
                      style={{
                        display: "inline",
                        verticalAlign: "middle",
                        marginRight: "3px",
                      }}
                    />
                    {t.modals.passwordLabel}
                  </label>
                  <input
                    type="password"
                    className="input-text"
                    placeholder={
                      locale === "tr"
                        ? "Şifre belirleyin..."
                        : "Set password..."
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ fontSize: "12px", padding: "6px 8px" }}
                  />
                  <span
                    style={{
                      fontSize: "10px",
                      color: "var(--text-muted)",
                      marginTop: "3px",
                      display: "block",
                    }}
                  >
                    {t.modals.passwordHint}
                  </span>
                </div>

                <div>
                  <label
                    style={{
                      fontSize: "11px",
                      color: "var(--text-secondary)",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    <Calendar
                      size={11}
                      style={{
                        display: "inline",
                        verticalAlign: "middle",
                        marginRight: "3px",
                      }}
                    />
                    {t.modals.expiryLabel}
                  </label>
                  <input
                    type="datetime-local"
                    className="input-text"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    style={{ fontSize: "12px", padding: "6px 8px" }}
                  />
                  <span
                    style={{
                      fontSize: "10px",
                      color: "var(--text-muted)",
                      marginTop: "3px",
                      display: "block",
                    }}
                  >
                    {t.modals.expiryHint}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Submit Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={busy}
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                busy ||
                !destinationUrl.trim() ||
                (showSlug && !slugValidation.valid)
              }
            >
              {busy ? (
                <>
                  <Loader2 size={15} className="spin" /> {t.common.submitting}
                </>
              ) : (
                <>
                  <Link2 size={15} /> {t.modals.submitShorten}
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
