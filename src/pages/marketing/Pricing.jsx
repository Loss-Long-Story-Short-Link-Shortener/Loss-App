import { useState } from "react";
import { Check, Minus } from "../../ui/icons";
import { Badge, Switch } from "../../ui";
import { formatMoney } from "../../lib/format";
import { useI18n } from "../../lib/i18n";
import { FEATURE_LABELS, PUBLIC_PLANS } from "../../lib/plans";
import { Link } from "../../lib/router";
import { Faq } from "./Landing";
import { Page } from "./Layout";

export function PlanCards({ cta, level = 3 }) {
  const H = `h${level}`;
  const { t, lang } = useI18n();
  const [annual, setAnnual] = useState(true);
  return (
    <>
      <div className="row" style={{ justifyContent: "center", marginBottom: 24 }}>
        <span className={annual ? "muted" : ""}>{t("Aylık", "Monthly")}</span>
        <Switch checked={annual} onChange={setAnnual} label={t("Yıllık faturalama", "Annual billing")} />
        <span className={annual ? "" : "muted"}>{t("Yıllık", "Annual")} <Badge tone="success">{t("2 ay ücretsiz", "2 months free")}</Badge></span>
      </div>
      <div className="plan-grid">
        {PUBLIC_PLANS.map((p) => {
          const price = p.monthly === 0 ? 0 : annual ? Math.round(p.annual / 12) : p.monthly;
          return (
            <div key={p.id} className={`plan ${p.popular ? "featured" : ""}`}>
              <div className="row between"><H>{lang === "tr" ? p.name : p.nameEn}</H>{p.popular && <Badge>{t("Popüler", "Popular")}</Badge>}</div>
              <div className="price">{formatMoney(price, lang)}<small> / {t("ay", "mo")}</small></div>
              {p.monthly > 0 && annual && <p className="hint" style={{ marginTop: -8 }}>{t("Yıllık {x} faturalanır", "Billed {x} yearly", { x: formatMoney(p.annual, lang) })}</p>}
              {cta && <Link to="/register" className={`btn ${p.popular ? "btn-primary" : "btn-secondary"} btn-block`}>{p.monthly === 0 ? t("Ücretsiz başla", "Start free") : t("{n} ile başla", "Get {n}", { n: lang === "tr" ? p.name : p.nameEn })}</Link>}
              <ul>
                <li><Check size={15} aria-hidden /><span><strong>{p.maxLinks.toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}</strong> {t("bağlantı", "links")}</span></li>
                <li><Check size={15} aria-hidden /><span>{p.analyticsDays === 365 ? t("1 yıl analiz geçmişi", "1 year of analytics") : t("30 gün analiz geçmişi", "30 days of analytics")}</span></li>
                <li className={p.domains ? "" : "off"}>{p.domains ? <Check size={15} aria-hidden /> : <Minus size={15} aria-hidden />}<span>{p.domains ? t("{n} özel alan adı", p.domains === 1 ? "1 custom domain" : "{n} custom domains", { n: p.domains }) : t("Özel alan adı yok", "No custom domains")}</span></li>
                <li className={p.members > 1 ? "" : "off"}>{p.members > 1 ? <Check size={15} aria-hidden /> : <Minus size={15} aria-hidden />}<span>{p.members > 1 ? t("{n} takım üyesi", "{n} team seats", { n: p.members }) : t("Tek kullanıcı", "Single user")}</span></li>
                <li><Check size={15} aria-hidden /><span>{t("Dinamik QR kodlar, UTM, klasör/etiket", "Dynamic QR, UTM, folders/tags")}</span></li>
                {Object.entries(FEATURE_LABELS).filter(([k]) => p.features.includes(k)).slice(0, 6).map(([k, [tr, en]]) => <li key={k}><Check size={15} aria-hidden /><span>{lang === "tr" ? tr : en}</span></li>)}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function Pricing() {
  const { t, lang } = useI18n();
  const rows = [
    [t("Bağlantı sayısı", "Links"), (p) => p.maxLinks.toLocaleString(lang === "tr" ? "tr-TR" : "en-US")],
    [t("Analiz geçmişi", "Analytics history"), (p) => (p.analyticsDays === 365 ? t("1 yıl", "1 year") : t("30 gün", "30 days"))],
    [t("Özel alan adı", "Custom domains"), (p) => p.domains || <Minus size={15} />],
    [t("Takım üyesi", "Team seats"), (p) => (p.members > 1 ? p.members : <Minus size={15} />)],
    ...Object.entries(FEATURE_LABELS).map(([k, [tr, en]]) => [lang === "tr" ? tr : en, (p) => (p.features.includes(k) ? <Check size={16} color="var(--success)" aria-label={t("Dahil", "Included")} /> : <Minus size={15} color="var(--text-3)" aria-label={t("Dahil değil", "Not included")} />)]),
  ];
  return (
    <Page>
      <section className="mk-container mk-section" style={{ paddingTop: 56 }}>
        <div className="mk-section-head"><h1>{t("Fiyatlandırma", "Pricing")}</h1><p>{t("Tüm planlarda dinamik QR kodlar, UTM oluşturucu, klasör/etiket ve çerezsiz analiz bulunur. Fiyatlar KDV hariç, TL cinsindendir.", "Every plan includes dynamic QR codes, the UTM builder, folders/tags and cookieless analytics. Prices are in TRY, excluding VAT.")}</p></div>
        <PlanCards cta level={2} />
        <h2 style={{ marginTop: 56, marginBottom: 16, fontSize: 22 }}>{t("Planları karşılaştırın", "Compare plans")}</h2>
        <div className="card table-wrap">
          <table className="table"><thead><tr><th><span className="sr-only">{t("Özellik", "Feature")}</span></th>{PUBLIC_PLANS.map((p) => <th key={p.id}>{lang === "tr" ? p.name : p.nameEn}</th>)}</tr></thead>
            <tbody>{rows.map(([label, cell]) => <tr key={label}><th scope="row" style={{ background: "transparent", color: "var(--text)", fontWeight: 500 }}>{label}</th>{PUBLIC_PLANS.map((p) => <td key={p.id}>{cell(p)}</td>)}</tr>)}</tbody></table>
        </div>
      </section>
      <Faq />
    </Page>
  );
}
