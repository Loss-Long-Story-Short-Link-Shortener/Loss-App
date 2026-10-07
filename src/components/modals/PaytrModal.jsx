import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Lock, Check, Loader2, AlertCircle } from "lucide-react";
import { Modal } from "../common/Modal";
import { TIERS } from "../../constants/tiers";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Real PayTR checkout. The server creates an order and a PayTR iFrame token;
 * the plan is only upgraded when PayTR's signed server-to-server notification
 * arrives, so this modal polls /api/me until the new tier shows up.
 */
export function PaytrModal({ isOpen, onClose, tierKey = "pro", billingPeriod = "monthly" }) {
  const { user, requireAuth, refreshPlan, showToast } = useAuth();
  const { locale } = useLanguage();
  const tr = locale === "tr";

  const [phase, setPhase] = useState("idle"); // idle | loading | pay | paid | error
  const [iframeUrl, setIframeUrl] = useState("");
  const [error, setError] = useState("");
  const startedFor = useRef("");

  const tier = TIERS[tierKey] || TIERS.pro;
  const total = billingPeriod === "annual" ? tier.priceAnnual : tier.priceMonthly;
  const canPay = Boolean(user) && !user.isDemo;

  // Create the checkout session when the modal opens.
  useEffect(() => {
    if (!isOpen) {
      startedFor.current = "";
      setPhase("idle");
      setIframeUrl("");
      setError("");
      return;
    }
    const key = `${tierKey}:${billingPeriod}`;
    if (!canPay || startedFor.current === key) return;
    startedFor.current = key;

    setPhase("loading");
    api
      .createPaytrCheckout(user, tierKey, billingPeriod)
      .then((data) => {
        if (startedFor.current !== key) return;
        setIframeUrl(data.iframeUrl);
        setPhase("pay");
      })
      .catch((err) => {
        if (startedFor.current !== key) return;
        setError(err.message || (tr ? "Ödeme oturumu başlatılamadı." : "Could not start checkout."));
        setPhase("error");
      });
  }, [isOpen, canPay, user, tierKey, billingPeriod, tr]);

  // Wait for the server-confirmed upgrade.
  useEffect(() => {
    if (phase !== "pay") return;
    const startedAt = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        clearInterval(timer);
        return;
      }
      try {
        const me = await refreshPlan();
        if (me?.tier === tierKey) {
          clearInterval(timer);
          setPhase("paid");
          showToast(tr ? `${tier.name} paketiniz aktif edildi ✦` : `Your ${tier.name} plan is active ✦`, "success");
        }
      } catch {
        /* transient network error: keep polling */
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [phase, refreshPlan, tierKey, tier.name, showToast, tr]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tr ? "Güvenli Ödeme" : "Secure Checkout"}
      subtitle={`${tier.name} · ₺${total.toLocaleString("tr-TR")} / ${billingPeriod === "annual" ? (tr ? "yıl" : "year") : tr ? "ay" : "month"}`}
      maxWidth="560px"
    >
      {!canPay && (
        <div className="checkout-state">
          <Lock size={22} aria-hidden="true" />
          <p>
            {user?.isDemo
              ? tr
                ? "Demo çalışma alanında ödeme yapılamaz. Paket satın almak için gerçek bir hesapla giriş yapın."
                : "Payments are not available in the demo workspace. Sign in with a real account to upgrade."
              : tr
                ? "Paket satın almak için önce giriş yapmalısınız."
                : "Please sign in before purchasing a plan."}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onClose();
              requireAuth(tr ? "Paket satın almak için giriş yapın." : "Sign in to upgrade your plan.");
            }}
          >
            {tr ? "Giriş yap" : "Sign in"}
          </button>
        </div>
      )}

      {canPay && phase === "loading" && (
        <div className="checkout-state" role="status">
          <Loader2 size={22} className="spin" aria-hidden="true" />
          <p>{tr ? "Güvenli ödeme formu hazırlanıyor…" : "Preparing the secure payment form…"}</p>
        </div>
      )}

      {canPay && phase === "error" && (
        <div className="checkout-state" role="alert">
          <AlertCircle size={22} aria-hidden="true" />
          <p>{error}</p>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {tr ? "Kapat" : "Close"}
          </button>
        </div>
      )}

      {canPay && phase === "pay" && (
        <>
          <iframe className="checkout-frame" src={iframeUrl} title="PayTR" />
          <p className="checkout-note">
            <ShieldCheck size={14} aria-hidden="true" />
            {tr
              ? "Kart bilgileriniz Loss sunucularına ulaşmaz; ödeme PayTR üzerinde işlenir. Ödeme onaylanınca bu pencere otomatik güncellenir."
              : "Card details never reach Loss servers; the payment is processed by PayTR. This window updates automatically once it is confirmed."}
          </p>
        </>
      )}

      {canPay && phase === "paid" && (
        <div className="checkout-state" role="status">
          <Check size={22} aria-hidden="true" />
          <p>{tr ? "Ödemeniz alındı ve paketiniz aktif." : "Payment received. Your plan is active."}</p>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {tr ? "Devam et" : "Continue"}
          </button>
        </div>
      )}
    </Modal>
  );
}
