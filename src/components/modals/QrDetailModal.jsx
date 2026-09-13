import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Copy, Download, X } from "lucide-react";
import { Modal } from "../common/Modal";
import { QrCodeSvg, downloadQrPng, downloadQrSvg } from "../common/QrCodeSvg";
import { useAuth } from "../../context/AuthContext";

const patternOptions = [{ id: "square" }, { id: "dots" }, { id: "rounded" }];

const frameOptions = [{ id: "none" }, { id: "clean" }, { id: "scan" }];

const colorPresets = [
  "#000000",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#0f172a",
];

export function QrDetailModal({ isOpen, onClose, link }) {
  const { showToast } = useAuth();

  const shortUrl =
    link?.shortUrl ||
    (link ? `https://loss.tr/${link.slug}` : "https://loss.tr/9lthwz");
  const [destination, setDestination] = useState(shortUrl);
  const [fgColor, setFgColor] = useState("#0f172a");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [pattern, setPattern] = useState("square");
  const [frame, setFrame] = useState("none");
  const [ecLevel, setEcLevel] = useState("L");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (link) {
      setDestination(shortUrl);
    }
  }, [link, shortUrl]);

  const qrId = useMemo(() => `qr-modal-${link?.slug || "link"}`, [link]);

  const normalizedDestination = useMemo(() => {
    const value = destination.trim();
    if (!value) return shortUrl;
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }, [destination, shortUrl]);

  const previewFrameStyle = {
    background: bgColor,
    padding: frame === "none" ? "18px" : "14px",
    borderRadius:
      frame === "clean" ? "18px" : frame === "scan" ? "16px" : "12px",
    boxShadow: "0 12px 28px rgba(10, 10, 16, 0.2)",
    border: frame === "none" ? "none" : `2px solid ${fgColor}22`,
    width: "fit-content",
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      showToast("Link kopyalandı ✦", "success");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      showToast("Kopyalanamadı", "error");
    }
  };

  const handleDownloadSvg = () => {
    const id = qrId;
    downloadQrSvg(id, `${link?.slug || "custom"}-qr.svg`);
    showToast("SVG indirildi", "success");
  };

  const handleDownloadPng = () => {
    const id = qrId;
    downloadQrPng(id, `${link?.slug || "custom"}-qr.png`, 1000);
    showToast("HD PNG indirildi", "success");
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} hideHeader maxWidth="980px">
      <div
        style={{
          background: "#1c2734",
          borderRadius: "22px",
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
          boxShadow: "0 30px 60px rgba(2, 6, 23, 0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 22px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div
            style={{
              display: "flex",
              background: "#202b36",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "14px",
              padding: "4px",
              gap: "4px",
            }}
          >
            <button
              type="button"
              style={{
                border: "none",
                background: "#ffffff",
                color: "#0f172a",
                borderRadius: "10px",
                padding: "10px 18px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Short Link
            </button>
            <button
              type="button"
              style={{
                border: "none",
                background: "transparent",
                color: "#dfe6ee",
                borderRadius: "10px",
                padding: "10px 18px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              QR Code
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.45fr 0.85fr",
            background: "#f3f4f6",
            gap: "28px",
            padding: "28px 26px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "40px",
                lineHeight: 1.1,
                letterSpacing: "-0.06em",
                color: "#0f172a",
                marginBottom: "20px",
                fontWeight: 700,
              }}
            >
              Create a QR Code
            </h2>

            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "10px",
                }}
              >
                1. Enter your URL destination
              </div>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="https://example.com/my-long-url"
                style={{
                  width: "100%",
                  border: "1px solid #d7dbe2",
                  background: "#ffffff",
                  color: "#0f172a",
                  borderRadius: "12px",
                  padding: "15px 16px",
                  fontSize: "16px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: "22px" }}>
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "12px",
                }}
              >
                2. Select a style (optional)
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "18px",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ minWidth: "120px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#4b5563",
                      marginBottom: "8px",
                    }}
                  >
                    Pattern
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    {patternOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPattern(option.id)}
                        style={{
                          width: "82px",
                          height: "72px",
                          borderRadius: "12px",
                          border:
                            pattern === option.id
                              ? "2px solid #111827"
                              : "1px solid #d6d9df",
                          background: "#ffffff",
                          padding: "10px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <QrCodeSvg
                          id={`pattern-${option.id}`}
                          value={normalizedDestination}
                          size={46}
                          fgColor="#0f172a"
                          bgColor="#ffffff"
                          errorCorrectionLevel={ecLevel}
                          padding={option.id === "dots" ? 3 : 2}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ minWidth: "120px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#4b5563",
                      marginBottom: "8px",
                    }}
                  >
                    Corners
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    {frameOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setFrame(option.id)}
                        style={{
                          width: "82px",
                          height: "72px",
                          borderRadius: "12px",
                          border:
                            frame === option.id
                              ? "2px solid #111827"
                              : "1px solid #d6d9df",
                          background: "#ffffff",
                          padding: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            border: "2px solid #111827",
                            borderRadius:
                              option.id === "none"
                                ? "6px"
                                : option.id === "scan"
                                  ? "10px"
                                  : "8px",
                            background:
                              option.id === "none" ? "#ffffff" : "transparent",
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "22px" }}>
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "12px",
                }}
              >
                3. Choose your color (optional)
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFgColor(color)}
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      background: color,
                      border:
                        fgColor === color
                          ? "2px solid #111827"
                          : "1px solid rgba(15,23,42,0.18)",
                      cursor: "pointer",
                    }}
                    aria-label={`Select QR color ${color}`}
                  />
                ))}
                <label
                  style={{
                    display: "inline-flex",
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "1px solid rgba(15,23,42,0.18)",
                    cursor: "pointer",
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

            <div>
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#111827",
                  marginBottom: "10px",
                }}
              >
                4. Select a frame (optional)
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setFrame("none")}
                  style={{
                    width: "54px",
                    height: "54px",
                    borderRadius: "12px",
                    border:
                      frame === "none"
                        ? "2px solid #111827"
                        : "1px solid #d6d9df",
                    background: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={24} color="#111827" />
                </button>
                <button
                  type="button"
                  onClick={() => setFrame("clean")}
                  style={{
                    width: "54px",
                    height: "54px",
                    borderRadius: "12px",
                    border:
                      frame === "clean"
                        ? "2px solid #111827"
                        : "1px solid #d6d9df",
                    background: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
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
                    width: "54px",
                    height: "54px",
                    borderRadius: "12px",
                    border:
                      frame === "scan"
                        ? "2px solid #111827"
                        : "1px solid #d6d9df",
                    background: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
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
              alignItems: "center",
              paddingTop: "10px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "340px",
                background: "#f7f7f7",
                borderRadius: "18px",
                padding: "18px 18px 12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={previewFrameStyle}>
                <QrCodeSvg
                  id={qrId}
                  value={normalizedDestination}
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
                onClick={handleDownloadPng}
                style={{
                  marginTop: "18px",
                  width: "100%",
                  border: "none",
                  borderRadius: "12px",
                  background:
                    "linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "17px",
                  padding: "14px 18px",
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
                  marginTop: "12px",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                No credit card required.
              </div>

              <div
                style={{
                  marginTop: "18px",
                  width: "100%",
                  display: "flex",
                  gap: "10px",
                }}
              >
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    style={{
                      flex: 1,
                      background: "#ffffff",
                      border: "1px solid rgba(15,23,42,0.08)",
                      borderRadius: "10px",
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

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            borderTop: "1px solid rgba(15,23,42,0.08)",
            padding: "18px 24px",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#eef2ff",
              borderRadius: "14px",
              padding: "9px 12px",
              color: "#1d4ed8",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <span>{shortUrl}</span>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                border: "none",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#1d4ed8",
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={handleDownloadSvg}
              style={{
                border: "1px solid #d7dbe2",
                background: "#ffffff",
                color: "#0f172a",
                borderRadius: "12px",
                padding: "10px 16px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Download size={15} /> SVG
            </button>
            <button
              type="button"
              onClick={handleDownloadPng}
              style={{
                border: "none",
                background: "#2563eb",
                color: "#fff",
                borderRadius: "12px",
                padding: "10px 16px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Download size={15} /> PNG
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
