import { useState } from "react";
import { Check, X, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import { TIERS } from "../constants/tiers";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { PaytrModal } from "../components/modals/PaytrModal";

export function BillingPage() {
  const { user, currentTier, plan, refreshPlan, billingPeriod, setBillingPeriod, showToast } =
    useAuth();
  const { t, locale } = useLanguage();

  const [paytrModalOpen, setPaytrModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState("pro");

  const b = t.billing || {};
  const p = t.pricing || {};

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const subscription = plan?.subscription;
  const renewalDate = subscription?.nextBillingAt
    ? new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "long" }).format(subscription.nextBillingAt)
    : null;

  const handleSelectTier = (tierKey) => {
    if (tierKey === "free") {
      // Downgrading means cancelling the paid subscription at period end.
      if (currentTier !== "free" && !subscription?.cancelAtPeriodEnd) setConfirmCancel(true);
      return;
    }
    setSelectedTier(tierKey);
    setPaytrModalOpen(true);
  };

  const handleCancel = async () => {
    setCancelBusy(true);
    try {
      await api.cancelSubscription(user);
      await refreshPlan();
      setConfirmCancel(false);
      showToast(
        locale === "tr"
          ? "Aboneliğiniz iptal edildi; dönem sonuna kadar erişiminiz sürer."
          : "Subscription cancelled. You keep access until the period ends.",
        "info",
      );
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setCancelBusy(false);
    }
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

      {subscription && currentTier !== "free" && (
        <div className="billing-status" role="status">
          <strong>{TIERS[currentTier]?.name}</strong>{" "}
          {subscription.cancelAtPeriodEnd
            ? locale === "tr"
              ? `· İptal edildi, erişim ${renewalDate || "dönem sonuna"} kadar sürer.`
              : `· Cancelled, access continues until ${renewalDate || "the period ends"}.`
            : renewalDate
              ? locale === "tr"
                ? `· Sonraki yenileme: ${renewalDate}`
                : `· Renews on ${renewalDate}`
              : ""}
          {subscription.status === "past_due" && (
            <span className="billing-status-warn">
              {locale === "tr" ? " Son ödeme alınamadı; kartınızı kontrol edin." : " Last payment failed; please check your card."}
            </span>
          )}
        </div>
      )}

      {confirmCancel && (
        <div className="billing-status billing-confirm" role="alertdialog" aria-label="Abonelik iptali">
          <span>
            {locale === "tr"
              ? "Aboneliği iptal etmek istediğinizden emin misiniz? Ödediğiniz dönemin sonuna kadar paketiniz aktif kalır."
              : "Cancel your subscription? Your plan stays active until the end of the paid period."}
          </span>
          <span className="billing-confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmCancel(false)} disabled={cancelBusy}>
              {locale === "tr" ? "Vazgeç" : "Keep plan"}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleCancel} disabled={cancelBusy}>
              {cancelBusy ? <Loader2 size={14} className="spin" /> : locale === "tr" ? "Aboneliği iptal et" : "Cancel subscription"}
            </button>
          </span>
        </div>
      )}

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
                disabled={isCurrent || (tierKey === "free" && (currentTier === "free" || subscription?.cancelAtPeriodEnd))}
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
