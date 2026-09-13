import { useState } from "react";
import { Link2, Copy, Check, ExternalLink, Sliders, ArrowRight, Loader2 } from "lucide-react";
import { Modal } from "../common/Modal";
import { useAuth } from "../../context/AuthContext";
import { sanitizeSlug, isValidUrl, normalizeUrl } from "../../utils/formatters";

export function CreateLinkModal({ isOpen, onClose }) {
  const { addLink, showToast } = useAuth();

  const [destinationUrl, setDestinationUrl] = useState("");
  const [showSlug, setShowSlug] = useState(false);
  const [customSlug, setCustomSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdLink, setCreatedLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const cleanSlug = sanitizeSlug(customSlug);

  const handleClose = () => {
    setDestinationUrl("");
    setCustomSlug("");
    setShowSlug(false);
    setError("");
    setCreatedLink(null);
    setCopied(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const raw = destinationUrl.trim();
    if (!raw || !isValidUrl(raw)) {
      setError("Lütfen geçerli bir URL girin (ör: https://siteniz.com).");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        destination: normalizeUrl(raw),
        slug: cleanSlug || undefined,
      };

      const result = await addLink(payload);
      setCreatedLink(result);

      try {
        await navigator.clipboard.writeText(result.shortUrl || `https://loss.tr/${result.slug}`);
        setCopied(true);
        showToast("Kısa link oluşturuldu ve panoya kopyalandı ✦", "success");
      } catch {}
    } catch (err) {
      setError(err.message || "Link oluşturulurken bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  };

  const shortDisplayUrl = createdLink?.shortUrl || (createdLink ? `https://loss.tr/${createdLink.slug}` : "");

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdLink ? "Kısa Linkiniz Hazır!" : "Yeni Link Kısalt"}
      subtitle={createdLink ? "Bağlantı panoya kopyalandı." : "Hedef bağlantınızı yapıştırın ve anında kısaltın."}
      maxWidth="480px"
    >
      {createdLink ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "4px" }}>
          <div
            style={{
              background: "var(--bg-surface-subtle)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "14px",
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
                  showToast("Panoya kopyalandı ✦", "success");
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                <span>{copied ? "Kopyalandı" : "Kopyala"}</span>
              </button>
              <a
                href={shortDisplayUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-subtle btn-sm"
                title="Aç"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Kapat
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setCreatedLink(null);
                setDestinationUrl("");
                setCustomSlug("");
                setShowSlug(false);
              }}
            >
              <Link2 size={14} /> Yeni Bir Link
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {error && (
            <div
              style={{
                background: "var(--danger-light)",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
                padding: "10px 14px",
                borderRadius: "var(--radius-xs)",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Hedef URL</label>
            <input
              type="url"
              className="input-text"
              placeholder="https://siteniz.com/uzun-baglanti-adresi..."
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              autoFocus
              disabled={busy}
              style={{ fontSize: "14px", padding: "11px 14px" }}
            />
          </div>

          {!showSlug ? (
            <button
              type="button"
              className="lss-suggestion-btn"
              style={{ alignSelf: "flex-start", marginTop: "2px" }}
              onClick={() => setShowSlug(true)}
            >
              <Sliders size={13} />
              <span>+ Özel Slug Belirle (İsteğe Bağlı)</span>
            </button>
          ) : (
            <div className="form-group" style={{ marginBottom: 0, marginTop: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Özel Bağlantı Adı</label>
                <button
                  type="button"
                  className="linear-dismiss-btn"
                  onClick={() => {
                    setShowSlug(false);
                    setCustomSlug("");
                  }}
                >
                  İptal
                </button>
              </div>
              <div className="inline-slug-group" style={{ padding: "4px 8px" }}>
                <span className="inline-domain-label">loss.tr /</span>
                <input
                  type="text"
                  className="inline-slug-input"
                  placeholder="ozel-adiniz"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  disabled={busy}
                />
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={busy}>
              İptal
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || !destinationUrl.trim()}>
              {busy ? (
                <>
                  <Loader2 size={15} className="spin" /> Kısaltılıyor...
                </>
              ) : (
                <>
                  <Link2 size={15} /> Kısalt
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
