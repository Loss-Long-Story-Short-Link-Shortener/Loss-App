import { useEffect, useState } from "react";
import { Check, Copy, Download, X, Printer, ExternalLink } from "lucide-react";
import { Modal } from "../common/Modal";
import { QrCodeSvg, downloadQrPng, downloadQrSvg } from "../common/QrCodeSvg";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { getShortUrl } from "../../constants/domains";

export function QrDetailModal({ isOpen, onClose, link }) {
  const { showToast } = useAuth();
  const { t, locale } = useLanguage();

  const PRESET_THEMES = [
    {
      name: locale === "tr" ? "Klasik" : "Classic",
      fg: "#09090b",
      bg: "#ffffff",
    },
    { name: "Dark", fg: "#f8fafc", bg: "#090d16" },
    { name: "Electric Blue", fg: "#3ba4ff", bg: "#030b14" },
    { name: "Emerald", fg: "#10b981", bg: "#ffffff" },
  ];

  const [fgColor, setFgColor] = useState("#09090b");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [ecLevel, setEcLevel] = useState("L");
  const [showLogo, setShowLogo] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFgColor("#09090b");
    setBgColor("#ffffff");
    setEcLevel("L");
    setShowLogo(false);
    setCopied(false);
  }, [isOpen, link?.slug]);

  if (!isOpen) return null;

  const shortUrl = link?.slug
    ? link.shortUrl || getShortUrl(link.slug)
    : getShortUrl("sample");
  const qrId = `qr-modal-${link?.slug || "link"}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      showToast(t.common.copiedToast, "success");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast(locale === "tr" ? "Kopyalanamadı" : "Failed to copy", "error");
    }
  };

  const handleDownloadSvg = () => {
    downloadQrSvg(qrId, `${link?.slug || "loss-qr"}.svg`);
    showToast(
      locale === "tr" ? "Vektörel SVG indirildi ✦" : "Vector SVG downloaded ✦",
      "success",
    );
  };

  const handleDownloadUltraPng = () => {
    downloadQrPng(qrId, `${link?.slug || "loss-qr"}-baski.png`, 2400);
    showToast(
      locale === "tr"
        ? "Baskı için yüksek kalite PNG indirildi ✦"
        : "Print-ready HD PNG downloaded ✦",
      "success",
    );
  };

  const handleDownloadStandardPng = () => {
    downloadQrPng(qrId, `${link?.slug || "loss-qr"}-web.png`, 800);
    showToast(
      locale === "tr" ? "Web PNG indirildi" : "Web PNG downloaded",
      "success",
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} hideHeader maxWidth="760px">
      <div
        className="qr-editor-modal"
        style={{
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "minmax(230px, 0.85fr) minmax(320px, 1.15fr)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "rgba(255, 255, 255, 0.02)",
            borderBottom: "1px solid var(--border-subtle)",
            gridColumn: "1 / -1",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  margin: 0,
                }}
              >
                {link?.title ||
                  (link?.slug ? `loss.tr/${link.slug}` : t.modals.qrTitle)}
              </h2>
              <span
                style={{
                  fontSize: "10.5px",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {locale === "tr" ? "DİNAMİK QR" : "DYNAMIC QR"}
              </span>
            </div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {t.modals.qrSubtitle}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              background: "transparent",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* QR Preview Section */}
        <div
          style={{
            padding: "24px 20px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "rgba(0, 0, 0, 0.25)",
          }}
        >
          <div
            style={{
              background: bgColor,
              borderRadius: "14px",
              padding: "18px",
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <QrCodeSvg
              id={qrId}
              value={shortUrl}
              size={190}
              fgColor={fgColor}
              bgColor={bgColor}
              errorCorrectionLevel={ecLevel}
              showCenterLogo={showLogo}
              centerLogoUrl="/loss.png"
            />
          </div>

          {/* Short URL Pill with copy */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--bg-surface-subtle)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "999px",
              padding: "6px 14px",
              marginTop: "16px",
              color: "var(--primary)",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
            }}
          >
            <span>{shortUrl}</span>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                display: "flex",
                cursor: "pointer",
                padding: "2px",
              }}
              title={t.common.copy}
            >
              {copied ? (
                <Check size={13} color="#10b981" />
              ) : (
                <Copy size={13} />
              )}
            </button>
            <a
              href={shortUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--text-muted)", display: "flex" }}
              title={t.common.test}
            >
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Customization Toolbar */}
        <div
          style={{
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Preset Palettes */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              {t.modals.qrPalette}
            </span>
            <div
              style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              {PRESET_THEMES.map((theme) => {
                const isActive = fgColor === theme.fg && bgColor === theme.bg;
                return (
                  <button
                    key={theme.name}
                    type="button"
                    onClick={() => {
                      setFgColor(theme.fg);
                      setBgColor(theme.bg);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: isActive
                        ? "1px solid var(--primary)"
                        : "1px solid var(--border-subtle)",
                      background: isActive
                        ? "rgba(59, 164, 255, 0.12)"
                        : "rgba(255, 255, 255, 0.02)",
                      color: isActive
                        ? "var(--primary)"
                        : "var(--text-secondary)",
                      fontSize: "11px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: "9px",
                        height: "9px",
                        borderRadius: "50%",
                        background: theme.fg,
                        border: "1px solid rgba(255,255,255,0.2)",
                        display: "inline-block",
                      }}
                    />
                    {theme.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Density & Logo Toggles */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            {/* Error correction */}
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                {t.modals.qrDensity}
              </label>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => setEcLevel("L")}
                  className={`btn btn-sm ${ecLevel === "L" ? "btn-primary" : "btn-secondary"}`}
                  style={{ flex: 1, fontSize: "11px", padding: "4px" }}
                >
                  {t.modals.qrDensitySimple}
                </button>
                <button
                  type="button"
                  onClick={() => setEcLevel("M")}
                  className={`btn btn-sm ${ecLevel === "M" ? "btn-primary" : "btn-secondary"}`}
                  style={{ flex: 1, fontSize: "11px", padding: "4px" }}
                >
                  {t.modals.qrDensityStandard}
                </button>
                <button
                  type="button"
                  onClick={() => setEcLevel("H")}
                  className={`btn btn-sm ${ecLevel === "H" ? "btn-primary" : "btn-secondary"}`}
                  style={{ flex: 1, fontSize: "11px", padding: "4px" }}
                >
                  {t.modals.qrDensityHigh}
                </button>
              </div>
            </div>

            {/* Logo embedding toggle */}
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                {locale === "tr" ? "Marka Logosu" : "Brand Logo"}
              </label>
              <button
                type="button"
                onClick={() => setShowLogo((v) => !v)}
                className={`btn btn-sm ${showLogo ? "btn-primary" : "btn-secondary"}`}
                style={{ width: "100%", fontSize: "11px", padding: "4px 8px" }}
              >
                {showLogo
                  ? locale === "tr"
                    ? "✓ Merkez Logosu Aktif"
                    : "✓ Logo Active"
                  : `+ ${t.modals.qrLogoToggle}`}
              </button>
            </div>
          </div>

          {/* Natural Print Guarantee Note */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              padding: "10px 12px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(59, 164, 255, 0.05)",
              border: "1px solid rgba(59, 164, 255, 0.18)",
              fontSize: "11.5px",
              color: "var(--text-secondary)",
              lineHeight: 1.45,
            }}
          >
            <Printer
              size={15}
              style={{
                color: "var(--primary)",
                flexShrink: 0,
                marginTop: "2px",
              }}
            />
            <div>
              <strong style={{ color: "var(--text-primary)" }}>
                {locale === "tr"
                  ? "Basılı Materyal Güvencesi: "
                  : "Printed Material Guarantee: "}
              </strong>
              {locale === "tr"
                ? "Menüleriniz veya afişleriniz basılmış olsa bile bu QR kod her zaman çalışır. Hedef web sayfasını panelinizden istediğiniz zaman güncelleyebilirsiniz."
                : "This QR code continues working forever on your printed materials. You can change where it points anytime from your dashboard."}
            </div>
          </div>

          {/* Download Export Buttons */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.3fr 1fr",
              gap: "8px",
              marginTop: "4px",
            }}
          >
            <button
              type="button"
              onClick={handleDownloadSvg}
              className="btn btn-secondary"
              style={{ fontSize: "12px", padding: "10px 8px" }}
            >
              <Download size={13} /> {t.modals.downloadSvg}
            </button>

            <button
              type="button"
              onClick={handleDownloadUltraPng}
              className="btn btn-primary"
              style={{ fontSize: "12px", padding: "10px 8px" }}
            >
              <Download size={13} /> {t.modals.downloadPng}
            </button>

            <button
              type="button"
              onClick={handleDownloadStandardPng}
              className="btn btn-secondary"
              style={{ fontSize: "12px", padding: "10px 8px" }}
            >
              <Download size={13} /> {t.modals.downloadWebPng}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
