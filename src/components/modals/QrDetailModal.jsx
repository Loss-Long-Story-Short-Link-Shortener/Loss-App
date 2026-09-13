import { useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { Modal } from "../common/Modal";
import { QrCodeSvg, downloadQrPng, downloadQrSvg } from "../common/QrCodeSvg";
import { useAuth } from "../../context/AuthContext";

export function QrDetailModal({ isOpen, onClose, link }) {
  const { showToast } = useAuth();
  const [fgColor, setFgColor] = useState("#0f172a");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [ecLevel, setEcLevel] = useState("L");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shortUrl =
    link?.shortUrl ||
    (link ? `https://loss.tr/${link.slug}` : "https://loss.tr/9lthwz");
  const qrId = `qr-modal-${link?.slug || "link"}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      showToast("Link kopyalandı ✦", "success");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast("Kopyalanamadı", "error");
    }
  };

  const handleDownloadSvg = () => {
    downloadQrSvg(qrId, `${link?.slug || "link"}-qr.svg`);
    showToast("SVG QR Kodu İndirildi", "success");
  };

  const handleDownloadPng = () => {
    downloadQrPng(qrId, `${link?.slug || "link"}-qr.png`, 1000);
    showToast("HD PNG QR Kodu İndirildi", "success");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} hideHeader maxWidth="560px">
      <div
        style={{
          background: "#1f2a35",
          borderRadius: "18px",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 30px 60px rgba(0,0,0,0.38)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px 14px",
            background: "rgba(255,255,255,0.02)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "#f8fafc",
              letterSpacing: "-0.04em",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            www.youtube.com
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.06)",
              color: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            background: "#222d39",
            padding: "20px 20px 0",
          }}
        >
          <div
            style={{ fontSize: "15px", color: "#e2e8f0", marginBottom: "18px" }}
          >
            Kısa bağlantınız için taranabilir dinamik QR kod
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "0 0 10px",
            }}
          >
            <div
              style={{
                background: bgColor,
                borderRadius: "16px",
                padding: "18px",
                display: "inline-flex",
                boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
              }}
            >
              <QrCodeSvg
                id={qrId}
                value={shortUrl}
                size={180}
                fgColor={fgColor}
                bgColor={bgColor}
                errorCorrectionLevel={ecLevel}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "10px",
              paddingBottom: "18px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(15,23,42,0.75)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "999px",
                padding: "8px 12px",
                color: "#60a5fa",
                fontFamily: "'JetBrains Mono', monospace",
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
                  color: "#93c5fd",
                  display: "flex",
                  cursor: "pointer",
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#2a313b",
            padding: "18px 20px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "18px",
            }}
          >
            <span
              style={{ color: "#f8fafc", fontSize: "14px", fontWeight: 600 }}
            >
              Görünüm:
            </span>
            <div
              style={{
                display: "flex",
                gap: "6px",
                background: "rgba(15,23,42,0.35)",
                padding: "4px",
                borderRadius: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => setEcLevel("L")}
                style={{
                  border: "none",
                  background: ecLevel === "L" ? "#2563eb" : "transparent",
                  color: ecLevel === "L" ? "#ffffff" : "#dfe5eb",
                  borderRadius: "8px",
                  padding: "7px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ✦ Sade (Önerilen)
              </button>
              <button
                type="button"
                onClick={() => setEcLevel("M")}
                style={{
                  border: "none",
                  background: ecLevel === "M" ? "#2563eb" : "transparent",
                  color: ecLevel === "M" ? "#ffffff" : "#dfe5eb",
                  borderRadius: "8px",
                  padding: "7px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Standart
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "24px",
              marginBottom: "18px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#edf2f7",
                fontSize: "12px",
              }}
            >
              <span>Ön Renk:</span>
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                style={{
                  width: "28px",
                  height: "28px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              />
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#edf2f7",
                fontSize: "12px",
              }}
            >
              <span>Arka Plan:</span>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                style={{
                  width: "28px",
                  height: "28px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              onClick={handleDownloadSvg}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "#f8fafc",
                fontWeight: 700,
                fontSize: "14px",
                padding: "12px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <Download size={15} /> Vektörel SVG
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              style={{
                flex: 1,
                border: "none",
                background: "linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)",
                color: "#ffffff",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "14px",
                padding: "12px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <Download size={15} /> HD PNG (Baskı)
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
