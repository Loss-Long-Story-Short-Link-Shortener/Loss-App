import { Check, X, Sparkles, CreditCard } from "lucide-react";
import { TIERS } from "../constants/tiers";
import { useAuth } from "../context/AuthContext";

export function BillingPage() {
  const { currentTier, setCurrentTier, billingPeriod, setBillingPeriod, showToast } =
    useAuth();

  const handleSelectTier = (tierKey) => {
    setCurrentTier(tierKey);
    showToast(`${TIERS[tierKey].name} planına başarıyla geçildi!`, "success");
  };

  return (
    <div>
      <div className="page-header" style={{ textAlign: "center", display: "block" }}>
        <h1 className="page-title" style={{ marginBottom: "8px" }}>
          Abonelik & Paket Seçenekleri
        </h1>
        <p className="page-subtitle" style={{ maxWidth: "560px", margin: "0 auto" }}>
          Ekibinizin veya işletmenizin ihtiyaçlarına uygun plana geçerek link ve trafik kotalarınızı artırın.
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
          Aylık Fatura
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
          Yıllık Fatura
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
            %20 İndirim
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

          return (
            <div
              key={tierKey}
              className={`pricing-card ${isPro ? "featured" : ""}`}
            >
              {isPro && (
                <div className="pricing-featured-badge">
                  <Sparkles size={12} style={{ display: "inline", marginRight: "3px" }} />
                  Popüler Tercih
                </div>
              )}

              <div className="pricing-plan-name">{tier.name}</div>
              <div className="pricing-plan-desc">{tier.description}</div>

              <div className="pricing-price-row">
                <span className="pricing-price-num">${price}</span>
                <span className="pricing-price-period">/ ay</span>
              </div>

              <button
                className={`btn ${isCurrent ? "btn-secondary" : isPro ? "btn-primary" : "btn-secondary"}`}
                style={{ width: "100%", padding: "10px" }}
                disabled={isCurrent}
                onClick={() => handleSelectTier(tierKey)}
              >
                {isCurrent ? "Mevcut Paketiniz" : `${tier.name} Paketine Geç`}
              </button>

              <ul className="pricing-features-list">
                {tier.features.map((feat, i) => (
                  <li key={i} className="pricing-feature-item">
                    <Check size={15} color="#10b981" style={{ flexShrink: 0 }} />
                    <span>{feat}</span>
                  </li>
                ))}
                {tier.disabled.map((feat, i) => (
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
    </div>
  );
}
