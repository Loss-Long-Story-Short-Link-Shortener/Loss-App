import { useState, useEffect } from "react";
import {
  Link2,
  Check,
  ExternalLink,
  Save,
  Globe,
  Tag,
  Loader2,
} from "lucide-react";
import { Modal } from "../common/Modal";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { isValidUrl, normalizeUrl } from "../../utils/formatters";
import { getShortUrl } from "../../constants/domains";

export function EditLinkModal({ isOpen, onClose, link }) {
  const { updateLink, showToast } = useAuth();
  const { t, locale } = useLanguage();

  const [destination, setDestination] = useState("");
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (link) {
      setDestination(link.destination || "");
      setTitle(link.title || "");
      setTag(link.tag || "");
      setError("");
    }
  }, [link]);

  if (!link) return null;

  const shortUrl = link.shortUrl || getShortUrl(link.slug);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const raw = destination.trim();
    if (!raw || !isValidUrl(raw)) {
      setError(
        locale === "tr"
          ? "Lütfen geçerli bir internet adresi girin (örn: https://siteniz.com)."
          : "Please enter a valid destination URL (e.g. https://your-site.com).",
      );
      return;
    }

    setBusy(true);
    try {
      const normalized = normalizeUrl(raw);
      const ok = await updateLink(link.id, {
        destination: normalized,
        title: title.trim() || undefined,
        tag: tag.trim() || undefined,
      });

      if (ok) {
        onClose();
      }
    } catch (err) {
      setError(
        err.message ||
          (locale === "tr"
            ? "Güncelleme sırasında bir hata oluştu."
            : "An error occurred while updating."),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.modals.editTitle}
      subtitle={t.modals.editSubtitle}
      maxWidth="500px"
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
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

        {/* Short Link Display (Fixed) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text-muted)",
              letterSpacing: "0.05em",
            }}
          >
            {locale === "tr"
              ? "KISA BAĞLANTI (SABİT KALACAK)"
              : "SHORT LINK (NEVER CHANGES)"}
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--bg-surface-subtle)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: "14px",
              color: "var(--text-primary)",
              fontWeight: 600,
            }}
          >
            <span>{shortUrl}</span>
            <span
              style={{
                fontSize: "11px",
                color: "#10b981",
                background: "rgba(16, 185, 129, 0.15)",
                padding: "2px 6px",
                borderRadius: "4px",
                marginLeft: "auto",
                fontWeight: 600,
              }}
            >
              {locale === "tr" ? "Değişmez" : "Fixed"}
            </span>
          </div>
        </div>

        {/* Destination URL Input (Editable) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            {t.modals.destUrlLabel}{" "}
            <span style={{ color: "var(--primary)" }}>*</span>
          </label>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              className="input-text"
              style={{ width: "100%", paddingLeft: "36px" }}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="https://yeni-kampanya.com/hedef"
              required
            />
            <Globe
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {t.modals.editWarning}
          </span>
        </div>

        {/* Title Input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            {t.modals.titleLabel}
          </label>
          <input
            type="text"
            className="input-text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.modals.titlePlaceholder}
          />
        </div>

        {/* Tag Input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            {t.modals.tagLabel}
          </label>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              className="input-text"
              style={{ width: "100%", paddingLeft: "36px" }}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder={t.modals.tagPlaceholder}
            />
            <Tag
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "8px",
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            {t.common.cancel}
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={15} className="spin" /> {t.common.submitting}
              </>
            ) : (
              <>
                <Save size={15} />
                <span>{t.modals.saveChanges}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
