import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Lock } from "../../ui/icons";
import { Alert, Skeleton, UpgradeNote } from "../../ui";
import { AreaChart, BarList } from "../../ui/charts";
import { api } from "../../lib/api";
import { countryName, downloadFile, formatNumber, timeAgo, toCsv } from "../../lib/format";
import { useI18n } from "../../lib/i18n";
import { Link } from "../../lib/router";
import { usePlan } from "../../state/plan";
import { useLinks } from "../../state/links";

export function RangePicker({ days, setDays, max }) {
  const { t } = useI18n();
  const options = [7, 30, 90, 365].filter((d) => d <= Math.max(max || 30, 30));
  return (
    <div className="segmented" role="group" aria-label={t("Zaman aralığı", "Time range")}>
      {options.map((d) => <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}>{d === 365 ? t("1 yıl", "1y") : t("{n} gün", "{n}d", { n: d })}</button>)}
    </div>
  );
}

export function useAnalytics(params) {
  const key = JSON.stringify(params);
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, status: s.data ? "refreshing" : "loading" }));
    api.analytics(JSON.parse(key)).then((data) => active && setState({ status: "ready", data, error: "" })).catch((e) => active && setState({ status: "error", data: null, error: e.message }));
    return () => { active = false; };
  }, [key, tick]);
  return { ...state, refresh: () => setTick((n) => n + 1) };
}

function Stat({ label, value, sub }) {
  return <div className="stat"><div className="stat-label">{label}</div><div className="stat-value">{value}</div>{sub && <div className="stat-sub">{sub}</div>}</div>;
}

/** Charts and breakdowns for one link or the whole workspace. */
export function Insights({ params, showTopLinks }) {
  const { t, lang } = useI18n();
  const { links } = useLinks();
  const { state } = { state: useAnalytics(params) };
  const { status, data, error } = state;

  if (status === "loading") {
    return (
      <div className="stack" role="status" aria-label={t("Yükleniyor", "Loading")}>
        <div className="stats">{[0, 1, 2, 3].map((i) => <div key={i} className="stat"><Skeleton w="50%" h={12} /><Skeleton w="40%" h={26} style={{ marginTop: 10 }} /></div>)}</div>
        <div className="card card-pad"><Skeleton h={220} /></div>
      </div>
    );
  }
  if (status === "error") return <Alert tone="danger" icon={AlertCircle}>{error}</Alert>;

  const total = data.totalClicks;
  const qr = data.sources.find((s) => s.name === "qr")?.count || 0;
  const peak = [...data.timeseries].sort((a, b) => b.clicks - a.clicks)[0];
  const byId = Object.fromEntries(links.map((l) => [l.id, l]));
  const topCountry = data.countries[0];

  return (
    <div className="stack" style={{ gap: 16 }}>
      {data.truncated && <Alert tone="warning">{t("Çok yüksek hacim nedeniyle yalnızca en yeni 20.000 olay analiz edildi.", "Due to very high volume only the most recent 20,000 events were analysed.")}</Alert>}
      <div className="stats">
        <Stat label={t("Tıklama", "Clicks")} value={formatNumber(total, lang)} sub={t("son {n} gün", "last {n} days", { n: data.days })} />
        <Stat label={t("Tekil ziyaretçi", "Unique visitors")} value={formatNumber(data.uniqueVisitors, lang)} sub={t("günlük tekil", "daily unique")} />
        <Stat label={t("QR taramaları", "QR scans")} value={formatNumber(qr, lang)} sub={total ? `${Math.round((qr / total) * 100)}% ${t("toplamın", "of total")}` : "-"} />
        <Stat label={t("En iyi ülke", "Top country")} value={topCountry ? <span><span className="cc" aria-hidden>{topCountry.name}</span> {countryName(topCountry.name, lang)}</span> : "-"} sub={peak && peak.clicks ? t("Zirve: {d} ({n})", "Peak: {d} ({n})", { d: peak.date.slice(5), n: peak.clicks }) : undefined} />
      </div>

      <div className="card">
        <div className="card-head"><div><h2>{t("Zaman içinde tıklamalar", "Clicks over time")}</h2></div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadFile(`loss-analytics-${data.days}d.csv`, toCsv([["date", "clicks"], ...data.timeseries.map((d) => [d.date, d.clicks]), [], ["country", "clicks"], ...data.countries.map((c) => [c.name, c.count]), [], ["referrer", "clicks"], ...data.referrers.map((c) => [c.name, c.count]), [], ["device", "clicks"], ...data.devices.map((c) => [c.name, c.count])]), "text/csv")}>{t("CSV indir", "Export CSV")}</button></div>
        <div className="card-body">{total === 0 ? <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>{t("Bu aralıkta tıklama yok. Bağlantıyı paylaştığınızda veriler burada görünür.", "No clicks in this range. Data appears here once the link is shared.")}</p> : <AreaChart data={data.timeseries} />}</div>
      </div>

      {total > 0 && (
        <>
          <div className="grid-cards">
            <div className="card"><div className="card-head"><h2>{t("Ülkeler", "Countries")}</h2></div><div className="card-body"><BarList rows={data.countries} total={total} kind="country" /></div></div>
            <div className="card"><div className="card-head"><h2>{t("Şehirler", "Cities")}</h2></div><div className="card-body"><BarList rows={data.cities} total={total} empty={t("Şehir verisi yok", "No city data")} /></div></div>
            <div className="card"><div className="card-head"><h2>{t("Kaynaklar", "Referrers")}</h2></div><div className="card-body"><BarList rows={data.referrers} total={total} /></div></div>
            <div className="card"><div className="card-head"><h2>{t("Cihazlar", "Devices")}</h2></div><div className="card-body"><BarList rows={data.devices} total={total} /></div></div>
            <div className="card"><div className="card-head"><h2>{t("Tarayıcılar", "Browsers")}</h2></div><div className="card-body"><BarList rows={data.browsers} total={total} /></div></div>
            <div className="card"><div className="card-head"><h2>{t("İşletim sistemleri", "Operating systems")}</h2></div><div className="card-body"><BarList rows={data.systems} total={total} /></div></div>
          </div>

          {showTopLinks && data.topLinks.length > 0 && (
            <div className="card">
              <div className="card-head"><h2>{t("En çok tıklanan bağlantılar", "Top links")}</h2></div>
              <div className="table-wrap"><table className="table"><tbody>
                {data.topLinks.map((row) => { const l = byId[row.id]; return (
                  <tr key={row.id}><td>{l ? <Link to={`/app/links/${encodeURIComponent(l.id)}`} className="link-title">{l.title || l.slug}</Link> : row.id}<div className="mono muted" style={{ fontSize: 12 }}>{l?.shortUrl.replace(/^https?:\/\//, "")}</div></td><td className="num"><strong>{formatNumber(row.count, lang)}</strong></td></tr>
                ); })}
              </tbody></table></div>
            </div>
          )}

          <div className="card">
            <div className="card-head"><div className="row" style={{ gap: 8 }}><span className="live-dot" aria-hidden /><h2>{t("Son etkinlik", "Recent activity")}</h2></div></div>
            <div className="table-wrap"><table className="table"><tbody>
              {data.recent.map((e, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: "nowrap" }}><span className="cc" aria-hidden>{e.country}</span> {e.city ? `${e.city}, ` : ""}{countryName(e.country, lang)}</td>
                  <td>{e.device ? t({ mobile: "Mobil", desktop: "Masaüstü", tablet: "Tablet" }[e.device] || e.device, { mobile: "Mobile", desktop: "Desktop", tablet: "Tablet" }[e.device] || e.device) : "-"} · {e.browser || "-"}</td>
                  <td>{e.referer === "direct" ? t("Doğrudan", "Direct") : e.referer}{e.source === "qr" && <span className="badge accent" style={{ marginLeft: 8 }}>QR</span>}</td>
                  <td className="num muted" style={{ whiteSpace: "nowrap" }}>{timeAgo(e.at, lang)}</td>
                </tr>
              ))}
            </tbody></table></div>
          </div>
        </>
      )}
    </div>
  );
}

export function RetentionNote({ max }) {
  const { t } = useI18n();
  const { plan } = usePlan();
  if (!plan || plan.id !== "free" || max > 30) return null;
  return <UpgradeNote>{t("Ücretsiz planda analiz geçmişi 30 gündür. Starter ve üzerinde 1 yıl.", "Analytics history is 30 days on the free plan, and 1 year on Starter and above.")}</UpgradeNote>;
}
