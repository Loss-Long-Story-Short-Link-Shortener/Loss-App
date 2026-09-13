import { useState } from "react";
import { QrCode, Download, ExternalLink, Sparkles } from "lucide-react";
import { QrCodeSvg, downloadQrSvg, downloadQrPng } from "../components/common/QrCodeSvg";
import { EmptyState } from "../components/common/EmptyState";
import { useAuth } from "../context/AuthContext";

export function QrStudioPage({ onOpenCreateModal, onOpenQr }) {
  const { links, showToast } = useAuth();
  const [customText, setCustomText] = useState("https://loss.tr");

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dinamik QR Kod Stüdyosu</h1>
          <p className="page-subtitle">
            Tüm bağlantılarınız için standartlara uygun, taranabilir vektörel SVG ve yüksek çözünürlüklü PNG QR kodlar.
          </p>
        </div>
      </div>

      {/* Interactive live generator card */}
      <div className="panel" style={{ marginBottom: "28px" }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={16} /> Anında QR Kod Test & İndirme
              </span>
            </h2>
            <p className="panel-desc">
              Herhangi bir metin veya bağlantı girip anında taranabilir QR kodunuzu oluşturun.
            </p>
          </div>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              background: "#ffffff",
              padding: "12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <QrCodeSvg
              id="live-studio-qr"
              value={customText}
              size={140}
              fgColor="#0f172a"
              bgColor="#ffffff"
            />
          </div>

          <div style={{ flex: 1, minWidth: "260px" }}>
            <div className="form-group">
              <label className="form-label">QR Kod İçeriği / URL</label>
              <input
                type="text"
                className="input-text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="https://siteniz.com"
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  downloadQrSvg("live-studio-qr", "custom-qr.svg");
                  showToast("SVG indirildi", "success");
                }}
              >
                <Download size={14} /> Vektörel SVG İndir
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  downloadQrPng("live-studio-qr", "custom-qr.png", 1000);
                  showToast("HD PNG indirildi", "success");
                }}
              >
                <Download size={14} /> HD PNG İndir (Baskı)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of existing links */}
      <h3
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "18px",
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: "16px",
        }}
      >
        Mevcut Linklerin QR Kodları ({links.length})
      </h3>

      {links.length > 0 ? (
        <div className="qr-grid">
          {links.map((link) => {
            const shortUrl = link.shortUrl || `https://loss.tr/${link.slug}`;
            const qrCardId = `qr-card-${link.slug || "item"}`;
            return (
              <div key={link.id || link.slug} className="qr-card">
                <div className="qr-preview-box">
                  <QrCodeSvg
                    id={qrCardId}
                    value={shortUrl}
                    size={130}
                    fgColor="#0f172a"
                    bgColor="#ffffff"
                  />
                </div>

                <div className="qr-card-title" title={link.title || link.slug}>
                  {link.title || link.slug}
                </div>
                <div className="qr-card-url" title={shortUrl}>
                  {shortUrl}
                </div>

                <div style={{ display: "flex", gap: "6px", width: "100%" }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => onOpenQr(link)}
                  >
                    Özelleştir
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => {
                      downloadQrPng(qrCardId, `${link.slug}-qr.png`, 1000);
                      showToast("PNG indirildi", "success");
                    }}
                    title="PNG İndir"
                  >
                    <Download size={13} /> İndir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={QrCode}
          title="Henüz link bulunmuyor"
          description="QR kod galerisini görüntülemek için önce bir kısa bağlantı oluşturun."
          actionLabel="Link Kısalt"
          onAction={onOpenCreateModal}
        />
      )}
    </div>
  );
}
