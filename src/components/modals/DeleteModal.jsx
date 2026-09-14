import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "../common/Modal";
import { useAuth } from "../../context/AuthContext";

export function DeleteModal({ isOpen, onClose, link }) {
  const { removeLink } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!link) return null;

  const handleDelete = async () => {
    setBusy(true);
    try {
      await removeLink(link.id, link);
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
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text-primary)" }}>
            {link.shortUrl || `https://loss.tr/${link.slug}`}
          </strong>{" "}
          adresi kalıcı olarak silinecek. Bu işlem geri alınamaz.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
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
