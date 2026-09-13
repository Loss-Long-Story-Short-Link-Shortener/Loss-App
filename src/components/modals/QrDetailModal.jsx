import { useState } from "react";
import { Download, Copy, Check, ExternalLink } from "lucide-react";
import { Modal } from "../common/Modal";
import { QrCodeSvg, downloadQrSvg, downloadQrPng } from "../common/QrCodeSvg";
import { useAuth } from "../../context/AuthContext";

export function QrDetailModal({ isOpen, onClose, link }) {
  const { showToast } = useAuth();
  const [fgColor, setFgColor] = useState("#0f172a");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [copied, setCopied] = useState(false);

  if (!link) return null;
  const shortUrl = link.shortUrl || `https://go.consolaktif.com.tr/${link.slug}`;
  const qrId = `qr-modal-${link.slug || "code"}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      showToast("Link kopyalandı ✦", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Kopyalanamadı", "error");
    }
  };

  const handleDownloadSvg = () => {
    downloadQrSvg(qrId, `${link.slug || "link"}-qr.svg`);
    showToast("SVG QR Kodu İndirildi", "success");
  };

  const handleDownloadPng = () => {
    downloadQrPng(qrId, `${link.slug || "link"}-qr.png`, 1000);
    showToast("Yüksek Çözünürlüklü PNG İndirildi", "success");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={link.title || link.slug}
      subtitle="Kısa bağlantınız için taranabilir dinamik QR kod"
      maxWidth="480px"
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* QR Visual */}
        <div
          style={{
            background: bgColor,
            padding: "20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-sm)",
            marginBottom: "16px",
          }}
        >
          <QrCodeSvg
            id={qrId}
            value={shortUrl}
            size={180}
            fgColor={fgColor}
            bgColor={bgColor}
          />
        </div>

        {/* Short URL badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--bg-surface-subtle)",
            padding: "8px 14px",
            borderRadius: "var(--radius-full)",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            color: "var(--primary)",
            marginBottom: "20px",
          }}
        >
          <span>{shortUrl}</span>
          <button
            onClick={handleCopy}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
            }}
          >
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
          </button>
        </div>

        {/* Color controls */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            width: "100%",
            justifyContent: "center",
            marginBottom: "24px",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
            <span>Ön Renk:</span>
            <input
              type="color"
              value={fgColor}
              onChange={(e) => setFgColor(e.target.value)}
              style={{ width: "32px", height: "32px", border: "none", borderRadius: "4px", cursor: "pointer" }}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
            <span>Arka Plan:</span>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              style={{ width: "32px", height: "32px", border: "none", borderRadius: "4px", cursor: "pointer" }}
            />
          </label>
        </div>

        {/* Download buttons */}
        <div style={{ display: "flex", gap: "10px", width: "100%" }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleDownloadSvg}>
            <Download size={15} /> Vektörel SVG
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleDownloadPng}>
            <Download size={15} /> HD PNG (Baskı)
          </button>
        </div>
      </div>
    </Modal>
  );
}
