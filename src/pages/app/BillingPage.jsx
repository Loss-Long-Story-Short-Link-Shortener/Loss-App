import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Loader2, Minus, ShieldCheck } from "../../ui/icons";
import { Alert, Badge, Button, Modal, Switch } from "../../ui";
import { api } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";
import { planLabel } from "../../lib/plans";
import { useI18n } from "../../lib/i18n";
import { useAuth } from "../../state/auth";
import { usePlan } from "../../state/plan";
import { useToast } from "../../state/toast";
import { useConfirm } from "../../ui/Confirm";

const ORDER = ["free", "starter", "pro", "agency"];
const FEATURE_ROWS = [
  ["password", "Parola koruması", "Password protection"], ["expiry", "Son kullanma tarihi", "Link expiry"], ["clickLimit", "Tıklama limiti", "Click limits"],
  ["targeting", "Cihaz & ülke hedefleme", "Device & country targeting"], ["socialPreview", "Sosyal önizleme kartı", "Social preview cards"], ["importExport", "CSV içe/dışa aktarma", "CSV import/export"],
  ["api", "REST API", "REST API"], ["webhooks", "Webhooks", "Webhooks"], ["audit", "Denetim kaydı", "Audit log"], ["team", "Takım çalışma alanları", "Team workspaces"],
];

function Checkout({ tier, period, onClose, onPaid }) {
  const { t } = useI18n();
  const { refreshMe } = useAuth();
  const [state, setState] = useState({ status: "loading", url: "", error: "" });
  const started = useRef(false);
  useEffect(() => {
    if (!tier || started.current) return;
    started.current = true;
    api.billing.checkout(tier, period).then((d) => setState({ status: "pay", url: d.iframeUrl, error: "" })).catch((e) => setState({ status: "error", url: "", error: e.message }));
  }, [tier, period]);
  // The plan changes only when PayTR's signed server-to-server notification arrives.
  useEffect(() => {
    if (state.status !== "pay") return;
    const started = Date.now();
    const id = setInterval(async () => {
      if (Date.now() - started > 15 * 60_000) return clearInterval(id);
      const me = await refreshMe();
      if (me?.tier === tier) { clearInterval(id); setState((s) => ({ ...s, status: "paid" })); onPaid(); }
    }, 3000);
    return () => clearInterval(id);
  }, [state.status, tier, refreshMe, onPaid]);

  return (
    <div className="stack">
      {state.status === "loading" && <div className="empty" role="status"><Loader2 className="spin" /><p>{t("Güvenli ödeme formu hazırlanıyor…", "Preparing the secure payment form…")}</p></div>}
      {state.status === "error" && <Alert tone="danger" icon={AlertCircle}>{state.error}</Alert>}
      {state.status === "pay" && <><iframe title="PayTR" src={state.url} style={{ width: "100%", height: 520, border: "1px solid var(--border)", borderRadius: 8, background: "#fff" }} /><p className="hint"><ShieldCheck size={13} style={{ display: "inline", verticalAlign: "-2px" }} /> {t("Kart bilgileriniz Loss sunucularına ulaşmaz; ödeme PayTR üzerinde işlenir. Onaylanınca bu pencere otomatik güncellenir.", "Card details never reach Loss servers; PayTR processes the payment. This window updates automatically once it is confirmed.")}</p></>}
      {state.status === "paid" && <Alert tone="success" icon={Check}>{t("Ödemeniz alındı, planınız aktif.", "Payment received - your plan is active.")}</Alert>}
    </div>
  );
}

export default function BillingPage() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const { me, isDemo, refreshMe, user } = useAuth();
  const { plan } = usePlan();
  const [annual, setAnnual] = useState(true);
  const [checkout, setCheckout] = useState(null);
  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState(false);
  const plans = me?.plans || {};
  const sub = me?.subscription;
  const current = me?.tier || "free";
  const personal = me?.workspace?.personal;

  useEffect(() => { if (!isDemo) api.billing.orders().then((d) => setOrders(d.orders)).catch(() => {}); }, [isDemo, current]);

  const act = async (fn, msg) => { setBusy(true); try { await fn(); await refreshMe(); toast.success(msg); } catch (e) { toast.error(e.message); } finally { setBusy(false); } };

  return (
    <>
      <div className="page-head"><div><h1>{t("Plan ve faturalama", "Plan & billing")}</h1><p>{t("Planınızı yönetin, ödemelerinizi görün. İstediğiniz zaman iptal edebilirsiniz.", "Manage your plan and see your payments. Cancel any time.")}</p></div>
        <div className="row"><span className={!annual ? "" : "muted"}>{t("Aylık", "Monthly")}</span><Switch checked={annual} onChange={setAnnual} label={t("Yıllık faturalama", "Annual billing")} /><span className={annual ? "" : "muted"}>{t("Yıllık", "Annual")} <Badge tone="success">{t("2 ay ücretsiz", "2 months free")}</Badge></span></div></div>

      {!personal && <div style={{ marginBottom: 16 }}><Alert tone="info">{t("Bu çalışma alanı, sahibinin planını kullanır. Faturalama kişisel çalışma alanından yönetilir.", "This workspace uses its owner's plan. Billing is managed from the personal workspace.")}</Alert></div>}
      {isDemo && <div style={{ marginBottom: 16 }}><Alert tone="warning">{t("Demo çalışma alanında ödeme yapılamaz. Planları inceleyebilirsiniz.", "Payments are disabled in the demo workspace, but you can explore the plans.")}</Alert></div>}

      {sub && current !== "free" && (
        <div className="card card-pad row between wrap" style={{ marginBottom: 20 }}>
          <div><strong>{planLabel(current, lang)}</strong> <Badge tone={sub.status === "past_due" ? "danger" : sub.cancelAtPeriodEnd ? "warning" : "success"} dot>{sub.status === "past_due" ? t("Ödeme alınamadı", "Payment failed") : sub.cancelAtPeriodEnd ? t("İptal edildi", "Cancelled") : t("Aktif", "Active")}</Badge>
            <div className="hint" style={{ marginTop: 4 }}>{sub.cancelAtPeriodEnd ? t("Erişiminiz {d} tarihine kadar sürer.", "Access continues until {d}.", { d: formatDate(sub.nextBillingAt, lang) }) : t("Sonraki yenileme: {d}", "Next renewal: {d}", { d: formatDate(sub.nextBillingAt, lang) })}</div></div>
          {personal && (sub.cancelAtPeriodEnd
            ? <Button loading={busy} onClick={() => act(() => api.billing.resume(), t("Abonelik devam ediyor", "Subscription resumed"))}>{t("Aboneliği sürdür", "Resume subscription")}</Button>
            : <Button variant="danger-ghost" loading={busy} onClick={async () => { if (await confirm({ title: t("Abonelik iptal edilsin mi?", "Cancel subscription?"), body: t("Planınız ödediğiniz dönemin sonuna kadar aktif kalır; ardından ücretsiz plana dönersiniz.", "Your plan stays active until the end of the paid period, then you return to the free plan."), confirmLabel: t("Aboneliği iptal et", "Cancel subscription"), danger: true })) act(() => api.billing.cancel(), t("Abonelik iptal edildi", "Subscription cancelled")); }}>{t("Aboneliği iptal et", "Cancel subscription")}</Button>)}
        </div>
      )}

      <div className="plan-grid">
        {ORDER.map((id) => {
          const p = plans[id];
          if (!p) return null;
          const isCurrent = id === current;
          const price = id === "free" ? 0 : annual ? Math.round(p.annual / 12) : p.monthly;
          return (
            <div key={id} className={`plan ${isCurrent ? "current" : ""} ${id === "pro" ? "featured" : ""}`}>
              <div className="row between"><h2>{planLabel(id, lang)}</h2>{isCurrent ? <Badge tone="accent">{t("Mevcut", "Current")}</Badge> : id === "pro" ? <Badge>{t("Popüler", "Popular")}</Badge> : null}</div>
              <div className="price">{formatMoney(price, lang)}<small> / {t("ay", "mo")}</small></div>
              {id !== "free" && annual && <p className="hint" style={{ marginTop: -8 }}>{t("Yıllık {x} faturalanır", "Billed {x} yearly", { x: formatMoney(p.annual, lang) })}</p>}
              {isCurrent || id === "free" ? <Button block disabled>{isCurrent ? t("Mevcut planınız", "Your current plan") : t("Ücretsiz", "Free")}</Button>
                : <Button block variant={id === "pro" ? "primary" : "secondary"} disabled={isDemo || !personal || ORDER.indexOf(id) < ORDER.indexOf(current)} onClick={() => setCheckout({ tier: id, period: annual ? "annual" : "monthly" })}>{ORDER.indexOf(id) < ORDER.indexOf(current) ? t("Mevcut planınızdan düşük", "Below your plan") : t("{n} planına geç", "Choose {n}", { n: planLabel(id, lang) })}</Button>}
              <ul>
                <li><Check size={15} aria-hidden /> <span><strong>{p.maxLinks.toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}</strong> {t("bağlantı", "links")}</span></li>
                <li><Check size={15} aria-hidden /> <span>{p.analyticsDays === 365 ? t("1 yıl analiz geçmişi", "1 year of analytics") : t("30 gün analiz geçmişi", "30 days of analytics")}</span></li>
                <li className={p.domains ? "" : "off"}>{p.domains ? <Check size={15} aria-hidden /> : <Minus size={15} aria-hidden />} <span>{p.domains ? t("{n} özel alan adı", p.domains === 1 ? "1 custom domain" : "{n} custom domains", { n: p.domains }) : t("Özel alan adı yok", "No custom domains")}</span></li>
                <li className={p.members > 1 ? "" : "off"}>{p.members > 1 ? <Check size={15} aria-hidden /> : <Minus size={15} aria-hidden />} <span>{p.members > 1 ? t("{n} takım üyesi", "{n} team seats", { n: p.members }) : t("Tek kullanıcı", "Single user")}</span></li>
                {FEATURE_ROWS.map(([key, tr, en]) => <li key={key} className={p.features?.[key] ? "" : "off"}>{p.features?.[key] ? <Check size={15} aria-hidden /> : <Minus size={15} aria-hidden />}<span>{lang === "tr" ? tr : en}</span></li>)}
              </ul>
            </div>
          );
        })}
      </div>

      {orders.length > 0 && (
        <div className="section"><h2>{t("Ödeme geçmişi", "Payment history")}</h2>
          <div className="card table-wrap"><table className="table"><thead><tr><th>{t("Tarih", "Date")}</th><th>{t("Plan", "Plan")}</th><th>{t("Tutar", "Amount")}</th><th>{t("Durum", "Status")}</th></tr></thead><tbody>
            {orders.map((o) => <tr key={o.id}><td>{formatDate(o.createdAt, lang)}</td><td>{planLabel(o.tier, lang)} {o.recurring && <span className="tag">{t("yenileme", "renewal")}</span>}</td><td>{formatMoney(o.amountTl, lang)}</td><td><Badge tone={o.status === "paid" ? "success" : o.status === "pending" ? "warning" : "danger"}>{o.status}</Badge></td></tr>)}
          </tbody></table></div></div>
      )}

      <Modal open={Boolean(checkout)} onClose={() => setCheckout(null)} className="wide" title={t("Güvenli ödeme", "Secure checkout")} subtitle={checkout ? `${planLabel(checkout.tier, lang)} · ${formatMoney(checkout.period === "annual" ? plans[checkout.tier].annual : plans[checkout.tier].monthly, lang)} / ${checkout.period === "annual" ? t("yıl", "year") : t("ay", "month")}` : ""}>
        {checkout && <Checkout tier={checkout.tier} period={checkout.period} onClose={() => setCheckout(null)} onPaid={() => toast.success(t("Planınız aktif edildi", "Your plan is active"))} />}
      </Modal>
    </>
  );
}
