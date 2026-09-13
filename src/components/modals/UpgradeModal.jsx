import { Zap, Check, Sparkles } from "lucide-react";
import { Modal } from "../common/Modal";
import { TIERS } from "../../constants/tiers";
import { useAuth } from "../../context/AuthContext";

export function UpgradeModal({ isOpen, onClose }) {
  const { currentTier, setCurrentTier, showToast } = useAuth();

  const handleUpgrade = (tierKey) => {
    setCurrentTier(tierKey);
    showToast(`${TIERS[tierKey].name} paketi aktif edildi!`, "success");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Planınızı Yükseltin"
      subtitle="Sınırları kaldırarak özel alan adları, şifreleme ve yüksek trafik kapasitesine erişin."
      maxWidth="580px"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Highlight Pro feature list */}
        <div
          style={{
            background: "var(--primary-light)",
            border: "1px solid rgba(37, 99, 235, 0.25)",
            borderRadius: "var(--radius-md)",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--primary)",
              fontWeight: 700,
              fontSize: "14px",
              marginBottom: "12px",
            }}
          >
            <Sparkles size={16} /> Growth Pro Planı Ayrıcalıkları:
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={14} color="#10b981" /> <strong>1,500 Adet</strong> Kısa Link
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={14} color="#10b981" /> <strong>100,000</strong> Aylık Tıklama
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={14} color="#10b981" /> <strong>3 Özel Domain</strong> Bağlama
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={14} color="#10b981" /> <strong>Şifreli & Süreli</strong> Linkler
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={14} color="#10b981" /> <strong>UTM Builder</strong> & Analitik
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={14} color="#10b981" /> <strong>Vektörel QR</strong> İndirme
            </div>
          </div>
        </div>

        {/* Plan Actions */}
        <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1, padding: "12px" }}
            onClick={() => handleUpgrade("pro")}
          >
            <Zap size={15} /> Pro'ya Yükselt ($19 / ay)
          </button>
          <button
            className="btn btn-secondary"
            style={{ flex: 1, padding: "12px" }}
            onClick={() => handleUpgrade("enterprise")}
          >
            Enterprise ($59 / ay)
          </button>
        </div>
      </div>
    </Modal>
  );
}
