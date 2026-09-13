import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Modal } from "../common/Modal";
import { useAuth } from "../../context/AuthContext";

export function DeleteModal({ isOpen, onClose, link }) {
  const { removeLink } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!link) return null;

  const handleDelete = async () => {
    setBusy(true);
    try {
      await removeLink(link.id);
      onClose();
    } catch {
      // Handled in context
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bağlantıyı Sil"
      subtitle="Bu işlem geri alınamaz."
      maxWidth="440px"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            background: "var(--danger-light)",
            padding: "14px",
            borderRadius: "var(--radius-sm)",
            color: "var(--danger)",
            fontSize: "13px",
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong>Bu link kalıcı olarak silinecek:</strong>
            <p style={{ marginTop: "4px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
              {link.shortUrl || `https://loss.tr/${link.slug}`}
            </p>
          </div>
        </div>

        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Mevcut ziyaretçiler yönlendirilmeyecek ve bağlantı üzerinden kaydedilen tıklama istatistikleri silinecektir.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
            İptal
          </button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={busy}>
            <Trash2 size={15} /> {busy ? "Siliniyor..." : "Evet, Bağlantıyı Sil"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
