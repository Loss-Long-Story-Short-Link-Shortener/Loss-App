import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  CreditCard,
  Check,
  X,
  Loader2,
  Sparkles,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { Modal } from "../common/Modal";
import { TIERS } from "../../constants/tiers";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

export function PaytrModal({
  isOpen,
  onClose,
  tierKey = "pro",
  billingPeriod = "monthly",
  checkoutData,
  onPaymentSuccess,
}) {
  const { setCurrentTier, showToast } = useAuth();
  const { t, locale } = useLanguage();
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const pm = t.modals || {};
  const c = t.common || {};
  const p = t.pricing || {};

  const tier = TIERS[tierKey] || TIERS.pro;
  const price =
    billingPeriod === "annual" ? Math.round(tier.priceAnnual / 12) : tier.priceMonthly;
  const totalCharge =
    billingPeriod === "annual" ? tier.priceAnnual : tier.priceMonthly;

  const handleSimulatePayment = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setCurrentTier(tierKey);
      if (onPaymentSuccess) onPaymentSuccess(tierKey);
      showToast(
        locale === "tr"
          ? `${tier.name} paketiniz PayTR güvencesiyle başarıyla aktif edildi! ✦`
          : `Your ${tier.name} plan was activated securely via PayTR! ✦`,
        "success"
      );
      onClose();
    }, 900);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} hideHeader maxWidth="560px">
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "rgba(255, 255, 255, 0.02)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(56, 189, 248, 0.1)",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary)",
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {pm.paytrTitle || "PayTR Güvenli Ödeme"}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#10b981",
                  }}
                >
                  256-BIT SSL
                </span>
              </div>
              <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                {pm.paytrSubtitle || "256-Bit SSL Korumalı Lisanslı Ödeme"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={c.close || "Kapat"}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              background: "transparent",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        {checkoutData?.iframeUrl ? (
          /* Actual PayTR iFrame when live merchant keys are configured */
          <div style={{ width: "100%", height: "540px" }}>
            <iframe
              src={checkoutData.iframeUrl}
              title="PayTR Checkout"
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          </div>
        ) : (
          /* High-Fidelity Simulation / Ready Checkout Screen */
          <div style={{ padding: "20px" }}>
            {/* Plan Summary Card */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "16px 18px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--primary)",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {pm.selectedPlan || "SEÇİLEN ABONELİK"}
                  </span>
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      marginTop: "2px",
                    }}
                  >
                    {tier.name}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    ₺{price}{" "}
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        fontWeight: 400,
                      }}
                    >
                      {t.billing?.perMonth || "/ ay"}
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {billingPeriod === "annual"
                      ? locale === "tr"
                        ? `Yıllık ₺${totalCharge} tahsil edilir`
                        : `₺${totalCharge} charged annually`
                      : locale === "tr"
                      ? "Aylık yenilenir"
                      : "Renews monthly"}
                  </span>
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: "10px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                }}
              >
                <div>
                  <Check
                    size={13}
                    color="#10b981"
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginRight: "4px",
                    }}
                  />
                  <strong>{tier.maxLinks.toLocaleString()}</strong>{" "}
                  {locale === "tr" ? "Aktif Link Kapasitesi" : "Active Links"}
                </div>
                <div>
                  <Check
                    size={13}
                    color="#10b981"
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginRight: "4px",
                    }}
                  />
                  <strong>{tier.domains}</strong>{" "}
                  {locale === "tr" ? "Özel Domain" : "Custom Domains"}
                </div>
                <div>
                  <Check
                    size={13}
                    color="#10b981"
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginRight: "4px",
                    }}
                  />
                  {locale === "tr"
                    ? "300 DPI Dinamik QR Kod"
                    : "300 DPI Dynamic QR Code"}
                </div>
                <div>
                  <Check
                    size={13}
                    color="#10b981"
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginRight: "4px",
                    }}
                  />
                  {locale === "tr"
                    ? "Canlı Hedef Değiştirme"
                    : "Live Destination Editing"}
                </div>
              </div>
            </div>

            {/* PayTR Security Highlights */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginBottom: "20px",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Lock size={13} color="#38bdf8" />
                <span>
                  {pm.paytrGuarantee ||
                    "Kart bilgileri Loss sunucularında asla saklanmaz, doğrudan PayTR Vault üzerinde tokenize edilir."}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CreditCard size={13} color="#38bdf8" />
                <span>
                  {pm.paytrGracePeriod ||
                    "Tekrarlayan ödemelerde 3 günlük esneklik süresi (Grace Period) tanımlanır, linkleriniz kesintiye uğramaz."}
                </span>
              </div>
            </div>

            {/* Test Simulation Notice */}
            <div
              style={{
                background: "rgba(56, 189, 248, 0.06)",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                marginBottom: "18px",
                fontSize: "11.5px",
                color: "var(--text-secondary)",
                lineHeight: 1.45,
              }}
            >
              <strong>
                {locale === "tr" ? "PayTR Test Modu: " : "PayTR Test Mode: "}
              </strong>
              {pm.paytrSimNotice ||
                "Canlı PayTR mağaza anahtarlarınız girildiğinde doğrudan güvenli kart formu yüklenecektir."}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={processing}
              >
                {c.cancel || "İptal"}
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSimulatePayment}
                disabled={processing}
                style={{ padding: "10px 20px" }}
              >
                {processing ? (
                  <>
                    <Loader2 size={15} className="spin" />{" "}
                    {locale === "tr"
                      ? "PayTR ile Doğrulanıyor..."
                      : "Verifying with PayTR..."}
                  </>
                ) : (
                  <>
                    <Lock size={14} /> ₺{totalCharge}{" "}
                    {locale === "tr" ? "ile Paketi Başlat" : "Start Plan"}{" "}
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
