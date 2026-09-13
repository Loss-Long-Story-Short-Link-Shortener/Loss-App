import { useState } from "react";
import {
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Pause,
  Play,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { formatDate, formatNumber } from "../../utils/formatters";
import { useAuth } from "../../context/AuthContext";

export function LinkRow({
  link,
  onOpenQr,
  onDeleteRequest,
}) {
  const { toggleLinkStatus, showToast } = useAuth();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const shortUrl = link.shortUrl || `https://loss.tr/${link.slug}`;

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      showToast("Kısa link panoya kopyalandı ✦", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Kopyalanamadı", "error");
    }
  };

  const isPaused = link.status === "paused";

  return (
    <tr>
      {/* Link and title */}
      <td>
        <div className="link-cell">
          <button
            className="link-qr-icon-btn"
            onClick={() => onOpenQr(link)}
            title="QR Kodu Görüntüle"
          >
            <QrCode size={16} />
          </button>

          <div className="link-text-content">
            <strong>{link.title || link.slug}</strong>
            <div className="link-short-url-row">
              <a href={shortUrl} target="_blank" rel="noreferrer">
                {shortUrl}
              </a>
              <button
                className="copy-mini-btn"
                onClick={handleCopy}
                title="Panoya Kopyala"
              >
                {copied ? (
                  <Check size={13} color="#10b981" />
                ) : (
                  <Copy size={13} />
                )}
              </button>
            </div>
            <span className="link-destination-preview" title={link.destination}>
              → {link.destination}
            </span>
          </div>
        </div>
      </td>

      {/* Clicks */}
      <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
        {formatNumber(link.clickCount || 0)}
      </td>

      {/* Status */}
      <td>
        <span className={`status-pill ${isPaused ? "paused" : "active"}`}>
          <span className="status-pill-dot" />
          {isPaused ? "Duraklatıldı" : "Aktif"}
        </span>
      </td>

      {/* Tags & Security */}
      <td>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {link.password && (
            <span className="tag-badge secured" title="Şifre Korumalı">
              <Lock size={11} /> Şifreli
            </span>
          )}
          {link.tag ? (
            <span className="tag-badge">{link.tag}</span>
          ) : (
            <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>—</span>
          )}
        </div>
      </td>

      {/* Date */}
      <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
        {formatDate(link.createdAt)}
      </td>

      {/* Actions dropdown */}
      <td style={{ textAlign: "right", position: "relative" }}>
        <button
          className="icon-btn"
          style={{ width: "30px", height: "30px" }}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <MoreHorizontal size={16} />
        </button>

        {menuOpen && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 4px)",
              background: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow-lg)",
              padding: "6px",
              zIndex: 30,
              minWidth: "160px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              className="btn btn-subtle btn-sm"
              style={{ justifyContent: "flex-start" }}
              onClick={() => {
                onOpenQr(link);
                setMenuOpen(false);
              }}
            >
              <QrCode size={13} /> QR Kodu Aç
            </button>

            <a
              href={shortUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-subtle btn-sm"
              style={{ justifyContent: "flex-start" }}
              onClick={() => setMenuOpen(false)}
            >
              <ExternalLink size={13} /> Bağlantıyı Test Et
            </a>

            <button
              className="btn btn-subtle btn-sm"
              style={{ justifyContent: "flex-start" }}
              onClick={() => {
                toggleLinkStatus(link.id, link.status);
                setMenuOpen(false);
              }}
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
              {isPaused ? "Aktife Al" : "Duraklat"}
            </button>

            <button
              className="btn btn-subtle btn-sm"
              style={{ justifyContent: "flex-start", color: "var(--danger)" }}
              onClick={() => {
                onDeleteRequest(link);
                setMenuOpen(false);
              }}
            >
              <Trash2 size={13} /> Bağlantıyı Sil
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
