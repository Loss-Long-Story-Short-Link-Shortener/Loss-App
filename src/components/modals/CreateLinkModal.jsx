import { useState, useMemo } from "react";
import {
  Link2,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Shield,
  Calendar,
  Layers,
} from "lucide-react";
import { Modal } from "../common/Modal";
import { useAuth } from "../../context/AuthContext";
import { sanitizeSlug, isValidUrl, normalizeUrl } from "../../utils/formatters";

export function CreateLinkModal({ isOpen, onClose, onOpenUpgradeModal }) {
  const { addLink, currentTier, showToast } = useAuth();

  const [activeTab, setActiveTab] = useState("general"); // general | utm | security
  const [destinationUrl, setDestinationUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkTag, setLinkTag] = useState("");

  // UTM parameters
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmTerm, setUtmTerm] = useState("");

  // Security
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  // Submission state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdLink, setCreatedLink] = useState(null);
  const [copied, setCopied] = useState(false);

  // Live preview URL calculation
  const computedDestination = useMemo(() => {
    if (!destinationUrl.trim()) return "";
    let base = normalizeUrl(destinationUrl.trim());
    try {
      const url = new URL(base);
      if (utmSource) url.searchParams.set("utm_source", utmSource);
      if (utmMedium) url.searchParams.set("utm_medium", utmMedium);
      if (utmCampaign) url.searchParams.set("utm_campaign", utmCampaign);
      if (utmTerm) url.searchParams.set("utm_term", utmTerm);
      return url.toString();
    } catch {
      return base;
    }
  }, [destinationUrl, utmSource, utmMedium, utmCampaign, utmTerm]);

  const cleanSlug = useMemo(() => sanitizeSlug(customSlug), [customSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!destinationUrl.trim() || !isValidUrl(destinationUrl)) {
      setError("Lütfen geçerli bir hedef URL girin (ör: https://siteniz.com).");
      return;
    }

    if (currentTier === "free" && (password || expiresAt)) {
      setError("Şifre ve son kullanma tarihi sadece Pro ve Enterprise planlarda geçerlidir.");
      onOpenUpgradeModal();
      return;
    }

    setBusy(true);
    try {
      const payload = {
        destination: computedDestination,
        slug: cleanSlug || undefined,
        title: linkTitle.trim() || undefined,
        tag: linkTag.trim() || undefined,
        password: password || undefined,
        expiresAt: expiresAt || undefined,
      };

      const result = await addLink(payload);
      setCreatedLink(result);

      // Auto copy
      try {
        await navigator.clipboard.writeText(result.shortUrl);
        setCopied(true);
      } catch {
        // Fallback
      }
    } catch (err) {
      setError(err.message || "Link oluşturulurken bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    setCreatedLink(null);
    setDestinationUrl("");
    setCustomSlug("");
    setLinkTitle("");
    setLinkTag("");
    setUtmSource("");
    setUtmMedium("");
    setUtmCampaign("");
    setUtmTerm("");
    setPassword("");
    setExpiresAt("");
    setError("");
    setCopied(false);
    setActiveTab("general");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Yeni Kısa Link Oluştur"
      subtitle="Hedef bağlantınızı kısaltın, UTM etiketleri ve şifre koruması ekleyin."
      maxWidth="560px"
    >
      {createdLink ? (
        <div style={{ padding: "16px 0", textAlign: "center" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "var(--success-light)",
              color: "var(--success)",
              fontSize: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            ✓
          </div>
          <h3
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "20px",
              color: "var(--text-primary)",
              marginBottom: "8px",
            }}
          >
            Kısa Bağlantınız Hazır!
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              marginBottom: "20px",
            }}
          >
            Bağlantı otomatik olarak panoya kopyalandı. Hemen paylaşabilirsiniz:
          </p>

          <div
            style={{
              background: "var(--bg-surface-subtle)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              padding: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "24px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "14px",
                color: "var(--primary)",
                fontWeight: 600,
              }}
            >
              {createdLink.shortUrl}
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(createdLink.shortUrl);
                  setCopied(true);
                  showToast("Kopyalandı!", "success");
                }}
              >
                {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                {copied ? "Kopyalandı" : "Kopyala"}
              </button>
              <a
                href={createdLink.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-subtle btn-sm"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button className="btn btn-secondary" onClick={handleClose}>
              Kapat
            </button>
            <button className="btn btn-primary" onClick={handleReset}>
              <Link2 size={15} /> Başka Bir Link Kısalt
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Modal Tab Navigation */}
          <div className="modal-tabs">
            <button
              type="button"
              className={`modal-tab-btn ${activeTab === "general" ? "active" : ""}`}
              onClick={() => setActiveTab("general")}
            >
              Genel Ayarlar
            </button>
            <button
              type="button"
              className={`modal-tab-btn ${activeTab === "utm" ? "active" : ""}`}
              onClick={() => setActiveTab("utm")}
            >
              UTM Builder
            </button>
            <button
              type="button"
              className={`modal-tab-btn ${activeTab === "security" ? "active" : ""}`}
              onClick={() => setActiveTab("security")}
            >
              Güvenlik & Bitiş
            </button>
          </div>

          {/* TAB 1: GENERAL */}
          {activeTab === "general" && (
            <div>
              <div className="form-group">
                <label className="form-label">
                  Hedef URL <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="https://siteniz.com/uzun-ve-karmasik-sayfa-adresi"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="form-group">
                  <label className="form-label">Alan Adı</label>
                  <select className="select-box" disabled>
                    <option>loss.tr</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Özel Slug <span className="form-label-hint">(İsteğe bağlı)</span>
                  </label>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="ornek: yaz-firsati"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="form-group">
                  <label className="form-label">
                    Bağlantı Başlığı <span className="form-label-hint">(Panelde görünür)</span>
                  </label>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="Kampanya Landing Page"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Etiket (Tag)</label>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="Pazarlama, Lansman vb."
                    value={linkTag}
                    onChange={(e) => setLinkTag(e.target.value)}
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div
                style={{
                  background: "var(--bg-surface-subtle)",
                  border: "1px dashed var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 14px",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  marginTop: "8px",
                }}
              >
                <span>Önizleme Kısa Link: </span>
                <strong style={{ color: "var(--primary)", fontFamily: "var(--font-mono)" }}>
                  https://loss.tr/{cleanSlug || "[otomatik-slug]"}
                </strong>
              </div>
            </div>
          )}

          {/* TAB 2: UTM BUILDER */}
          {activeTab === "utm" && (
            <div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                Google Analytics, Meta veya reklam panellerinde tıklamaları kanal bazında takip etmek için UTM parametrelerini doldurun.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="form-group">
                  <label className="form-label">UTM Source</label>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="instagram, newsletter, google"
                    value={utmSource}
                    onChange={(e) => setUtmSource(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">UTM Medium</label>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="cpc, story, bio, email"
                    value={utmMedium}
                    onChange={(e) => setUtmMedium(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="form-group">
                  <label className="form-label">UTM Campaign</label>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="eylul-indirimleri"
                    value={utmCampaign}
                    onChange={(e) => setUtmCampaign(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">UTM Term / Content</label>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="cta-button-blue"
                    value={utmTerm}
                    onChange={(e) => setUtmTerm(e.target.value)}
                  />
                </div>
              </div>

              {computedDestination && (
                <div
                  style={{
                    background: "var(--bg-surface-subtle)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-secondary)",
                    wordBreak: "break-all",
                  }}
                >
                  <strong>Nihai Hedef:</strong> {computedDestination}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SECURITY & EXPIRATION */}
          {activeTab === "security" && (
            <div>
              {currentTier === "free" && (
                <div
                  style={{
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    borderRadius: "var(--radius-sm)",
                    padding: "12px",
                    marginBottom: "16px",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                  }}
                >
                  ⚡ <strong>Pro Özellik:</strong> Şifreli ve süreli bağlantılar Pro veya Enterprise paketlerde aktiftir.
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Shield size={14} /> Şifre Koruması
                  </span>
                </label>
                <input
                  type="password"
                  className="input-text"
                  placeholder="Bağlantıyı şifreleyin"
                  value={password}
                  disabled={currentTier === "free"}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Calendar size={14} /> Son Geçerlilik Tarihi
                  </span>
                </label>
                <input
                  type="date"
                  className="input-text"
                  value={expiresAt}
                  disabled={currentTier === "free"}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                color: "var(--danger)",
                fontSize: "12px",
                background: "var(--danger-light)",
                padding: "8px 12px",
                borderRadius: "var(--radius-xs)",
                marginTop: "12px",
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              İptal
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              <Link2 size={16} />
              {busy ? "Kısaltılıyor..." : "Kısa Link Oluştur"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
