import { useState } from "react";
import { Check, X, Sparkles, CreditCard, ShieldCheck } from "lucide-react";
import { TIERS } from "../constants/tiers";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { PaytrModal } from "../components/modals/PaytrModal";

export function BillingPage() {
  const { currentTier, setCurrentTier, billingPeriod, setBillingPeriod, showToast } =
    useAuth();
  const { t, locale } = useLanguage();

  const [paytrModalOpen, setPaytrModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState("pro");

  const b = t.billing || {};
  const p = t.pricing || {};

  const handleSelectTier = (tierKey) => {
    if (tierKey === "free") {
      setCurrentTier("free");
      showToast(b.freeSwitched || "Ücretsiz plana geçildi", "info");
      return;
    }
    setSelectedTier(tierKey);
    setPaytrModalOpen(true);
  };

  return (
    <div>
      <div className="page-header" style={{ textAlign: "center", display: "block" }}>
        <h1 className="page-title" style={{ marginBottom: "8px" }}>
          {b.title || "Abonelik & Paket Seçenekleri"}
        </h1>
        <p className="page-subtitle" style={{ maxWidth: "560px", margin: "0 auto" }}>
          {b.subtitle ||
            "Ekibinizin veya işletmenizin ihtiyaçlarına uygun plana geçerek link ve trafik kotalarınızı artırın."}
        </p>
      </div>

      {/* Monthly / Annual switch */}
      <div className="billing-cycle-switch">
        <span
          style={{
            fontSize: "13px",
            fontWeight: billingPeriod === "monthly" ? 700 : 500,
            color: billingPeriod === "monthly" ? "var(--text-primary)" : "var(--text-muted)",
          }}
        >
          {b.monthly || "Aylık Fatura"}
        </span>

        <button
          className={`switch-pill ${billingPeriod === "annual" ? "active" : ""}`}
          onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "annual" : "monthly")}
          aria-label="Fatura Dönemi Değiştir"
        >
          <span className="switch-thumb" />
        </button>

        <span
          style={{
            fontSize: "13px",
            fontWeight: billingPeriod === "annual" ? 700 : 500,
            color: billingPeriod === "annual" ? "var(--text-primary)" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {b.annual || "Yıllık Fatura"}
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "var(--radius-full)",
              background: "var(--success-light)",
              color: "var(--success)",
            }}
          >
            {b.annualDiscount || "%20 İndirim"}
          </span>
        </span>
      </div>

      {/* Pricing Cards Grid */}
      <div className="pricing-grid">
        {Object.entries(TIERS).map(([tierKey, tier]) => {
          const isCurrent = currentTier === tierKey;
          const isPro = tierKey === "pro";
          const price =
            billingPeriod === "monthly"
              ? tier.priceMonthly
              : Math.round(tier.priceAnnual / 12);

          const tierLocalizedName =
            tierKey === "free"
              ? p.freeName || tier.name
              : tierKey === "starter"
              ? p.starterName || tier.name
              : tierKey === "pro"
              ? p.proName || tier.name
              : p.agencyName || tier.name;

          const tierLocalizedDesc =
            tierKey === "free"
              ? p.freeDesc || tier.description
              : tierKey === "starter"
              ? p.starterDesc || tier.description
              : tierKey === "pro"
              ? p.proDesc || tier.description
              : p.agencyDesc || tier.description;

          return (
            <div
              key={tierKey}
              className={`pricing-card ${isPro ? "featured" : ""}`}
            >
              {isPro && (
                <div className="pricing-featured-badge">
                  <Sparkles size={12} style={{ display: "inline", marginRight: "3px" }} />
                  {b.popular || "Popüler Tercih"}
                </div>
              )}

              <div className="pricing-plan-name">{tierLocalizedName}</div>
              <div className="pricing-plan-desc">{tierLocalizedDesc}</div>

              <div className="pricing-price-row">
                <span className="pricing-price-num">
                  {tier.priceMonthly === 0 ? "₺0" : `${tier.currency || "₺"}${price}`}
                </span>
                <span className="pricing-price-period">{b.perMonth || "/ ay"}</span>
              </div>

              <button
                className={`btn ${isCurrent ? "btn-secondary" : isPro ? "btn-primary" : "btn-secondary"}`}
                style={{ width: "100%", padding: "10px" }}
                disabled={isCurrent}
                onClick={() => handleSelectTier(tierKey)}
              >
                {isCurrent
                  ? b.currentPlan || "Mevcut Paketiniz"
                  : `${tierLocalizedName} ${b.switchTo || "Paketine Geç"}`}
              </button>

              <ul className="pricing-features-list">
                {tier.features.map((feat, i) => (
                  <li key={i} className="pricing-feature-item">
                    <Check size={15} color="#10b981" style={{ flexShrink: 0 }} />
                    <span>{feat}</span>
                  </li>
                ))}
                {tier.disabled &&
                  tier.disabled.map((feat, i) => (
                    <li key={i} className="pricing-feature-item disabled">
                      <X size={15} style={{ flexShrink: 0 }} />
                      <span>{feat}</span>
                    </li>
                  ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: "center", marginTop: "32px", color: "var(--text-muted)", fontSize: "12.5px" }}>
        <ShieldCheck size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px", color: "#10b981" }} />
        {b.paytrGuarantee || "Tüm ödemeler PayTR güvencesiyle 256-bit SSL korumalı olarak tahsil edilir. İstediğiniz an tek tıkla iptal edebilirsiniz."}
      </div>

      <PaytrModal
        isOpen={paytrModalOpen}
        onClose={() => setPaytrModalOpen(false)}
        tierKey={selectedTier}
        billingPeriod={billingPeriod}
      />
    </div>
  );
}
