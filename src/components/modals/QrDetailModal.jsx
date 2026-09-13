import { useEffect, useState } from "react";
import {
  Download,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  X,
} from "lucide-react";
import { Modal } from "../common/Modal";
import { QrCodeSvg, downloadQrSvg, downloadQrPng } from "../common/QrCodeSvg";
import { useAuth } from "../../context/AuthContext";

const patternOptions = [
  { id: "square", label: "Square" },
  { id: "dots", label: "Dots" },
  { id: "rounded", label: "Rounded" },
];

const frameOptions = [
  { id: "none", label: "None" },
  { id: "scan", label: "Scan" },
  { id: "clean", label: "Clean" },
];

const colorPresets = [
  "#000000",
  "#f43f5e",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#0f172a",
];

export function QrDetailModal({ isOpen, onClose, link }) {
  const { showToast } = useAuth();
  const [mode, setMode] = useState("short");
  const [inputUrl, setInputUrl] = useState("https://example.com/my-long-url");
  const [fgColor, setFgColor] = useState("#0f172a");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [ecLevel, setEcLevel] = useState("L");
  const [pattern, setPattern] = useState("square");
  const [frame, setFrame] = useState("none");
  const [copied, setCopied] = useState(false);

  const shortUrl =
    link?.shortUrl ||
    (link && `https://loss.tr/${link.slug}`) ||
    "https://loss.tr/9lthwz";
  const baseUrl = inputUrl.trim() || shortUrl;

  useEffect(() => {
    if (link && !inputUrl.trim()) {
      setInputUrl(shortUrl);
    }
  }, [link, shortUrl, inputUrl]);

  const qrId = `qr-modal-${link?.slug || "code"}`;

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
    downloadQrSvg(qrId, `${link?.slug || "link"}-qr.svg`);
    showToast("SVG QR Kodu İndirildi", "success");
  };

  const handleDownloadPng = () => {
    downloadQrPng(qrId, `${link?.slug || "link"}-qr.png`, 1000);
    showToast("Yüksek Çözünürlüklü PNG İndirildi", "success");
  };

  const previewFrameStyle = {
    background: bgColor,
    padding: frame === "none" ? "22px" : "16px",
    borderRadius:
      frame === "clean" ? "18px" : frame === "scan" ? "16px" : "12px",
    boxShadow: "0 12px 28px rgba(10, 10, 16, 0.18)",
    border: frame === "none" ? "none" : `2px solid ${fgColor}22`,
    width: "fit-content",
    maxWidth: "100%",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} hideHeader maxWidth="980px">
      <div
        style={{
          background: "#1f2a35",
          borderRadius: "22px",
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
          minHeight: "640px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(2, 4, 9, 0.42)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#202b36",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
              padding: "4px",
            }}
          >
            <button
              type="button"
              onClick={() => setMode("short")}
              style={{
                border: "none",
                background: mode === "short" ? "#ffffff" : "transparent",
                color: mode === "short" ? "#0f172a" : "#d4d7dc",
                fontWeight: 700,
                fontSize: "14px",
                borderRadius: "10px",
                padding: "10px 18px",
                cursor: "pointer",
                boxShadow:
                  mode === "short" ? "0 4px 12px rgba(15,23,42,0.12)" : "none",
              }}
            >
              Short Link
            </button>
            <button
              type="button"
              onClick={() => setMode("qr")}
              style={{
                border: "none",
                background: mode === "qr" ? "#ffffff" : "transparent",
                color: mode === "qr" ? "#0f172a" : "#d4d7dc",
                fontWeight: 700,
                fontSize: "14px",
                borderRadius: "10px",
                padding: "10px 18px",
                cursor: "pointer",
                boxShadow:
                  mode === "qr" ? "0 4px 12px rgba(15,23,42,0.12)" : "none",
              }}
            >
              QR Code
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "#f7f7f7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.55fr 0.9fr",
            gap: "30px",
            padding: "28px 28px 24px",
            background: "#f3f4f6",
            flex: 1,
            alignItems: "stretch",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h2
              style={{
                fontSize: "38px",
                lineHeight: 1.08,
                color: "#0f172a",
                letterSpacing: "-0.06em",
                marginBottom: "22px",
                fontWeight: 700,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Create a QR Code
            </h2>

            <div style={{ marginBottom: "22px" }}>
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "12px",
                }}
              >
                1. Enter your URL destination
              </div>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://example.com/my-long-url"
                style={{
                  width: "100%",
                  padding: "15px 16px",
                  borderRadius: "12px",
                  border: "1px solid #d7dbe2",
                  fontSize: "16px",
                  color: "#1f2937",
                  background: "#fff",
                  outline: "none",
                  boxShadow: "inset 0 1px 0 rgba(15,23,42,0.02)",
                }}
              />
            </div>

            <div style={{ marginBottom: "22px" }}>
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "14px",
                }}
              >
                2. Select a style (optional)
              </div>

              <div style={{ display: "flex", gap: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    minWidth: "120px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#4b5563",
                      marginBottom: "2px",
                    }}
                  >
                    Pattern
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    {patternOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPattern(option.id)}
                        style={{
                          width: "86px",
                          height: "74px",
                          borderRadius: "14px",
                          border:
                            option.id === pattern
                              ? "2px solid #111827"
                              : "1px solid #d7d9df",
                          background: "#ffffff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "12px",
                        }}
                      >
                        <QrCodeSvg
                          id={`pattern-${option.id}`}
                          value={baseUrl}
                          size={48}
                          fgColor="#0f172a"
                          bgColor="#ffffff"
                          errorCorrectionLevel={ecLevel}
                          padding={option.id === "dots" ? 3 : 2}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    minWidth: "120px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#4b5563",
                      marginBottom: "2px",
                    }}
                  >
                    Corners
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    {frameOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setFrame(option.id)}
                        style={{
                          width: "86px",
                          height: "74px",
                          borderRadius: "14px",
                          border:
                            option.id === frame
                              ? "2px solid #111827"
                              : "1px solid #d7d9df",
                          background: "#ffffff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius:
                              option.id === "none"
                                ? "6px"
                                : option.id === "scan"
                                  ? "10px"
                                  : "8px",
                            border: "2px solid #111827",
                            background:
                              option.id === "none" ? "#fff" : "transparent",
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "14px",
                }}
              >
                3. Choose your color (optional)
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFgColor(color)}
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      border:
                        fgColor === color
                          ? "2px solid #111827"
                          : "1px solid rgba(17,24,39,0.2)",
                      background: color,
                      cursor: "pointer",
                      padding: 0,
                    }}
                    aria-label={`Select ${color}`}
                  />
                ))}
                <label
                  style={{
                    display: "inline-flex",
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    border: "1px solid rgba(17,24,39,0.2)",
                    overflow: "hidden",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                    }}
                  />
                </label>
              </div>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "14px",
                }}
              >
                4. Select a frame (optional)
              </div>
              <div
                style={{ display: "flex", gap: "12px", alignItems: "center" }}
              >
                <button
                  type="button"
                  onClick={() => setFrame("none")}
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "12px",
                    border:
                      frame === "none"
                        ? "2px solid #111827"
                        : "1px solid #d7d9df",
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={26} color="#111827" />
                </button>
                <button
                  type="button"
                  onClick={() => setFrame("clean")}
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "12px",
                    border:
                      frame === "clean"
                        ? "2px solid #111827"
                        : "1px solid #d7d9df",
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      border: "2px solid #111827",
                      borderRadius: "6px",
                    }}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setFrame("scan")}
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "12px",
                    border:
                      frame === "scan"
                        ? "2px solid #111827"
                        : "1px solid #d7d9df",
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      border: "2px solid #111827",
                      borderRadius: "10px",
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              alignItems: "center",
              borderLeft: "1px solid rgba(17,24,39,0.08)",
              paddingLeft: "20px",
            }}
          >
            <div
              style={{
                background: "#f7f7f7",
                borderRadius: "18px",
                padding: "18px 18px 12px",
                width: "100%",
                maxWidth: "320px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minHeight: "360px",
              }}
            >
              <div style={previewFrameStyle}>
                <QrCodeSvg
                  id={qrId}
                  value={baseUrl}
                  size={180}
                  fgColor={fgColor}
                  bgColor={bgColor}
                  errorCorrectionLevel={ecLevel}
                  padding={pattern === "dots" ? 3 : 2}
                />
              </div>

              <div
                style={{
                  marginTop: "18px",
                  fontSize: "13px",
                  color: "#475569",
                }}
              >
                Note: This is a standard QR Code preview.
              </div>

              <button
                type="button"
                onClick={() => {
                  const targetUrl = baseUrl || shortUrl;
                  if (targetUrl) {
                    const normalized = /^https?:\/\//i.test(targetUrl)
                      ? targetUrl
                      : `https://${targetUrl}`;
                    const activeQr = document.getElementById(qrId);
                    if (activeQr) {
                      downloadQrPng(
                        qrId,
                        `${link?.slug || "qr"}-code.png`,
                        1000,
                      );
                      showToast("HD PNG QR Kodu hazırlandı", "success");
                    } else {
                      showToast("QR kod hazır değil", "error");
                    }
                  }
                }}
                style={{
                  width: "100%",
                  marginTop: "18px",
                  border: "none",
                  background:
                    "linear-gradient(90deg, #2563eb 0%, #204cff 100%)",
                  color: "#fff",
                  borderRadius: "12px",
                  padding: "14px 18px",
                  fontWeight: 700,
                  fontSize: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                Get your QR Code for free <ArrowRight size={18} />
              </button>

              <div
                style={{
                  marginTop: "14px",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                No credit card required.
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  marginTop: "20px",
                  width: "100%",
                }}
              >
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    style={{
                      flex: 1,
                      background: "#ffffff",
                      borderRadius: "10px",
                      border: "1px solid rgba(17,24,39,0.08)",
                      padding: "10px 8px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      ◉
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        marginTop: "4px",
                      }}
                    >
                      Leader
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
