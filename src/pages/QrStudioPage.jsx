import { useState } from "react";
import { QrCode, Download, ExternalLink, Sparkles } from "lucide-react";
import {
  QrCodeSvg,
  downloadQrSvg,
  downloadQrPng,
} from "../components/common/QrCodeSvg";
import { EmptyState } from "../components/common/EmptyState";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { SHORT_LINK_BASE_URL, getShortUrl } from "../constants/domains";

export function QrStudioPage({ onOpenCreateModal, onOpenQr }) {
  const { links, showToast } = useAuth();
  const { t, locale } = useLanguage();
  const [customText, setCustomText] = useState(SHORT_LINK_BASE_URL);
  const [ecLevel, setEcLevel] = useState("L");

  const qs = t.qrStudio || {};
  const c = t.common || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {qs.title || "Dinamik QR Kod Stüdyosu"}
          </h1>
          <p className="page-subtitle">
            {qs.subtitle ||
              "Tüm bağlantılarınız için standartlara uygun, taranabilir vektörel SVG ve yüksek çözünürlüklü PNG QR kodlar."}
          </p>
        </div>
      </div>

      {/* Interactive live generator card */}
      <div className="panel" style={{ marginBottom: "28px" }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Sparkles size={16} />{" "}
                {qs.instantTitle || "Anında QR Kod Test & İndirme"}
              </span>
            </h2>
            <p className="panel-desc">
              {qs.instantSubtitle ||
                "Herhangi bir metin veya bağlantı girip anında taranabilir QR kodunuzu oluşturun."}
            </p>
          </div>
        </div>

        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            gap: "24px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
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
              errorCorrectionLevel={ecLevel}
            />
          </div>

          <div style={{ flex: 1, minWidth: "260px" }}>
            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label className="form-label">
                {qs.contentLabel || "QR Kod İçeriği / URL"}
              </label>
              <input
                type="text"
                className="input-text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="https://siteniz.com"
              />
            </div>

            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label
                className="form-label"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  {qs.densityLabel || "QR Detay / Karmaşıklık Düzeyi"}
                </span>
                <span
                  style={{
                    color: "var(--primary)",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  {ecLevel === "L"
                    ? qs.densitySimple || "✦ Sade (Linke Özel Minimum Kare)"
                    : ecLevel === "M"
                      ? qs.densityStandard || "Standart"
                      : qs.densityHigh || "Yüksek Koruma"}
                </span>
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className={`btn btn-sm ${ecLevel === "L" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setEcLevel("L")}
                  style={{ fontSize: "11px", padding: "4px 10px" }}
                >
                  {qs.densitySimple || "Sade (Önerilen)"}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${ecLevel === "M" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setEcLevel("M")}
                  style={{ fontSize: "11px", padding: "4px 10px" }}
                >
                  {qs.densityStandard || "Standart"}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${ecLevel === "H" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setEcLevel("H")}
                  style={{ fontSize: "11px", padding: "4px 10px" }}
                >
                  {qs.densityHigh || "Yüksek"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  downloadQrSvg("live-studio-qr", "custom-qr.svg");
                  showToast(
                    locale === "tr" ? "SVG indirildi" : "SVG downloaded",
                    "success",
                  );
                }}
              >
                <Download size={14} /> {qs.downloadSvg || "Vektörel SVG İndir"}
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  downloadQrPng("live-studio-qr", "custom-qr-300dpi.png", 2400);
                  showToast(
                    locale === "tr"
                      ? "300 DPI HD PNG indirildi"
                      : "300 DPI HD PNG downloaded",
                    "success",
                  );
                }}
              >
                <Download size={14} />{" "}
                {qs.downloadPng || "300 DPI HD PNG (Baskı)"}
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
        {qs.existingTitle || "Mevcut Linklerin QR Kodları"} ({links.length})
      </h3>

      {links.length > 0 ? (
        <div className="qr-grid">
          {links.map((link) => {
            const shortUrl = link.shortUrl || getShortUrl(link.slug);
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
                    {qs.customize || "Özelleştir"}
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => {
                      downloadQrPng(qrCardId, `${link.slug}-300dpi.png`, 2400);
                      showToast(
                        locale === "tr"
                          ? "300 DPI HD PNG indirildi"
                          : "300 DPI HD PNG downloaded",
                        "success",
                      );
                    }}
                    title="300 DPI HD PNG"
                  >
                    <Download size={13} /> HD PNG
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={QrCode}
          title={qs.emptyTitle || "Henüz link bulunmuyor"}
          description={
            qs.emptyDesc ||
            "QR kod galerisini görüntülemek için önce bir kısa bağlantı oluşturun."
          }
          actionLabel={c.newLinkBtn || "Link Kısalt"}
          onAction={onOpenCreateModal}
        />
      )}
    </div>
  );
}
