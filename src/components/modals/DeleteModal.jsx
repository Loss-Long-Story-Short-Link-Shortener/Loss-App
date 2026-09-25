import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "../common/Modal";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { getShortUrl } from "../../constants/domains";

export function DeleteModal({ isOpen, onClose, link }) {
  const { removeLink, showToast } = useAuth();
  const { t, locale } = useLanguage();
  const [busy, setBusy] = useState(false);

  if (!link) return null;

  const d = t.deleteModal || {};

  const handleDelete = async () => {
    setBusy(true);
    try {
      await removeLink(link.id, link);
      onClose();
    } catch (err) {
      showToast(
        err.message ||
          t.common?.deleteFailed ||
          (locale === "tr"
            ? "Bağlantı silinemedi."
            : "Could not delete the link."),
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={d.title || "Bağlantıyı Sil"}
      subtitle={d.subtitle || "Bu işlem geri alınamaz."}
      maxWidth="440px"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <p
          style={{
            fontSize: "13.5px",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "var(--text-primary)" }}>
            {link.shortUrl || getShortUrl(link.slug)}
          </strong>{" "}
          {d.confirmText ||
            "adresi kalıcı olarak silinecek. Bu işlem geri alınamaz."}
        </p>

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
        >
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            {d.cancel || "İptal"}
          </button>
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={busy}
          >
            <Trash2 size={15} />{" "}
            {busy
              ? d.deleting || "Siliniyor..."
              : d.confirm || "Evet, Bağlantıyı Sil"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
