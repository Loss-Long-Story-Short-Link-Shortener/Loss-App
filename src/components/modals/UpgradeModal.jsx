import { useState } from "react";
import { Zap, Check, Sparkles, ShieldCheck } from "lucide-react";
import { Modal } from "../common/Modal";
import { TIERS } from "../../constants/tiers";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { PaytrModal } from "./PaytrModal";

export function UpgradeModal({ isOpen, onClose }) {
  const { currentTier } = useAuth();
  const { t } = useLanguage();
  const [paytrTargetTier, setPaytrTargetTier] = useState(null);

  const u = t.upgradeModal || {};

  const handleUpgrade = (tierKey) => {
    setPaytrTargetTier(tierKey);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={u.title || "Kapasite & Planınızı Yükseltin"}
      subtitle={u.subtitle || "Aktif link sınırlarını kaldırın, özel markalı alan adları ve dinamik QR stüdyosunu açın."}
      maxWidth="600px"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Highlight Pro Team feature list */}
        <div
          style={{
            background: "rgba(56, 189, 248, 0.06)",
            border: "1px solid rgba(56, 189, 248, 0.2)",
            borderRadius: "var(--radius-md)",
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
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
              }}
            >
              <Sparkles size={16} /> {u.proTitle || "Pro Team Ayrıcalıkları"}
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#10b981",
                background: "rgba(16, 185, 129, 0.15)",
                padding: "2px 8px",
                borderRadius: "10px",
              }}
            >
              {u.proBadge || "EN ÇOK TERCİH EDİLEN"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              fontSize: "13px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={14} color="#10b981" /> {u.feat1 || "2,500 Aktif Link Kapasitesi"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={14} color="#10b981" /> {u.feat2 || "Sınırsız Ziyaretçi Yönlendirmesi"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={14} color="#10b981" /> {u.feat3 || "3 Özel Domain (link.sirketiniz.com)"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={14} color="#10b981" /> {u.feat4 || "Canlı Hedef Değiştirme (QR Sabit Kalır)"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={14} color="#10b981" /> {u.feat5 || "300 DPI Ultra HD Baskı QR Kodu"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={14} color="#10b981" /> {u.feat6 || "5 Kişilik Ekip Çalışma Alanı"}
            </div>
          </div>
        </div>

        {/* Plan Select Options */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.3fr 1fr",
            gap: "10px",
            marginTop: "8px",
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: "12px 8px", fontSize: "12px", flexDirection: "column", gap: "4px" }}
            onClick={() => handleUpgrade("starter")}
          >
            <strong>Starter</strong>
            <span>₺399 / ay</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: "12px 8px", fontSize: "13px", flexDirection: "column", gap: "4px" }}
            onClick={() => handleUpgrade("pro")}
          >
            <strong>Pro Team</strong>
            <span>₺899 / ay</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: "12px 8px", fontSize: "12px", flexDirection: "column", gap: "4px" }}
            onClick={() => handleUpgrade("agency")}
          >
            <strong>Agency / Scale</strong>
            <span>₺2.499 / ay</span>
          </button>
        </div>

        <div
          style={{
            fontSize: "11.5px",
            color: "var(--text-muted)",
            textAlign: "center",
            marginTop: "4px",
          }}
        >
          {u.notice || "Tüm ödemeler PayTR güvencesiyle 256-bit SSL korumalı olarak tahsil edilir. İptal anında geçerlidir."}
        </div>
      </div>

      {paytrTargetTier && (
        <PaytrModal
          isOpen={Boolean(paytrTargetTier)}
          onClose={() => {
            setPaytrTargetTier(null);
            onClose();
          }}
          tierKey={paytrTargetTier}
          billingPeriod="monthly"
        />
      )}
    </Modal>
  );
}
