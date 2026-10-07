import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Loader2 } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { formatNumber } from "../../utils/formatters";

const RANGES = [7, 30, 90];

function countryLabel(code, locale) {
  if (!code || code === "XX") return locale === "tr" ? "Bilinmiyor" : "Unknown";
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

function BreakdownList({ title, rows, total, format = (n) => n }) {
  return (
    <section className="insight-card" aria-label={title}>
      <h4>{title}</h4>
      {rows.length === 0 ? (
        <p className="insight-empty">—</p>
      ) : (
        <ul>
          {rows.map((row) => {
            const pct = total ? Math.round((row.count / total) * 100) : 0;
            return (
              <li key={row.name}>
                <div className="insight-row">
                  <span className="insight-name">{format(row.name)}</span>
                  <span className="insight-count">
                    {formatNumber(row.count)} <small>{pct}%</small>
                  </span>
                </div>
                <div className="insight-bar" aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Per-link click breakdown, aggregated server-side (/api/analytics). */
export function LinkInsights({ initialLinkId }) {
  const { user, links } = useAuth();
  const { locale } = useLanguage();
  const tr = locale === "tr";

  const [linkId, setLinkId] = useState(initialLinkId || "");
  const [days, setDays] = useState(30);
  const [state, setState] = useState({ status: "idle", data: null, error: "" });

  const sortedLinks = useMemo(
    () => [...links].sort((a, b) => (Number(b.clickCount) || 0) - (Number(a.clickCount) || 0)),
    [links],
  );

  // Default to the most-clicked link once links are loaded.
  useEffect(() => {
    if (!linkId && sortedLinks.length > 0) setLinkId(sortedLinks[0].id);
  }, [linkId, sortedLinks]);
  useEffect(() => {
    if (initialLinkId) setLinkId(initialLinkId);
  }, [initialLinkId]);

  const isDemo = !user || user.isDemo;

  useEffect(() => {
    if (!linkId || isDemo) return;
    let active = true;
    setState({ status: "loading", data: null, error: "" });
    api
      .getAnalytics(user, linkId, days)
      .then((data) => active && setState({ status: "ready", data, error: "" }))
      .catch((err) => active && setState({ status: "error", data: null, error: err.message }));
    return () => {
      active = false;
    };
  }, [user, linkId, days, isDemo]);

  if (links.length === 0) return null;

  const { data } = state;
  const peak = data ? Math.max(1, ...data.timeseries.map((d) => d.clicks)) : 1;

  return (
    <div className="analytics-panel-card insights-panel" style={{ marginTop: "20px" }}>
      <div className="panel-card-head">
        <div className="head-title-row">
          <BarChart3 size={16} className="head-icon blue" />
          <h3>{tr ? "Bağlantı Detayı" : "Link details"}</h3>
        </div>
        <div className="insights-controls">
          <label className="sr-only" htmlFor="insights-link">{tr ? "Bağlantı seçin" : "Select link"}</label>
          <select id="insights-link" className="select-box" value={linkId} onChange={(e) => setLinkId(e.target.value)}>
            {sortedLinks.map((l) => (
              <option key={l.id} value={l.id}>
                {(l.title || l.slug).slice(0, 40)} · /{l.slug}
              </option>
            ))}
          </select>
          <div className="insights-ranges" role="group" aria-label={tr ? "Zaman aralığı" : "Time range"}>
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                className={`range-btn ${days === r ? "active" : ""}`}
                aria-pressed={days === r}
                onClick={() => setDays(r)}
              >
                {r}{tr ? " gün" : "d"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-card-content insights-body">
        {isDemo && (
          <p className="insight-note">
            {tr
              ? "Demo çalışma alanındaki bağlantılar yalnızca bu tarayıcıda bulunur; ayrıntılı analiz için gerçek bir hesapla giriş yapın."
              : "Demo links only exist in this browser. Sign in with a real account for detailed analytics."}
          </p>
        )}

        {state.status === "loading" && (
          <div className="inline-loading" role="status">
            <Loader2 size={18} className="spin" aria-hidden="true" /> {tr ? "Analizler yükleniyor…" : "Loading analytics…"}
          </div>
        )}

        {state.status === "error" && (
          <div className="inline-alert" role="alert" style={{ margin: 0 }}>
            <AlertCircle size={16} aria-hidden="true" /> <span>{state.error}</span>
          </div>
        )}

        {state.status === "ready" && data && (
          <>
            <div className="insights-totals">
              <div>
                <strong>{formatNumber(data.totalClicks)}</strong>
                <span>{tr ? "Tıklama" : "Clicks"}</span>
              </div>
              <div>
                <strong>{formatNumber(data.uniqueVisitors)}</strong>
                <span>{tr ? "Günlük tekil ziyaretçi" : "Daily unique visitors"}</span>
              </div>
            </div>

            {data.totalClicks === 0 ? (
              <p className="insight-note">
                {tr
                  ? "Bu aralıkta henüz tıklama yok. Bağlantıyı paylaştığınızda veriler burada görünecek."
                  : "No clicks in this range yet. Data will appear here once the link is shared."}
              </p>
            ) : (
              <>
                {data.truncated && (
                  <p className="insight-note">
                    {tr ? "Çok yüksek hacim nedeniyle en yeni olayların bir kısmı gösteriliyor." : "Showing the most recent events due to very high volume."}
                  </p>
                )}
                <figure className="insights-chart" aria-label={tr ? "Günlük tıklamalar" : "Clicks per day"}>
                  <div className="insights-bars">
                    {data.timeseries.map((d) => (
                      <span
                        key={d.date}
                        className="insights-bar"
                        style={{ height: `${Math.max(2, (d.clicks / peak) * 100)}%` }}
                        title={`${d.date}: ${d.clicks}`}
                      />
                    ))}
                  </div>
                  <figcaption>
                    <span>{data.timeseries[0]?.date}</span>
                    <span>{data.timeseries.at(-1)?.date}</span>
                  </figcaption>
                </figure>

                <div className="insights-grid">
                  <BreakdownList title={tr ? "Ülkeler" : "Countries"} rows={data.countries} total={data.totalClicks} format={(c) => countryLabel(c, locale)} />
                  <BreakdownList title={tr ? "Kaynaklar" : "Referrers"} rows={data.referrers} total={data.totalClicks} format={(r) => (r === "direct" ? (tr ? "Doğrudan" : "Direct") : r)} />
                  <BreakdownList title={tr ? "Cihazlar" : "Devices"} rows={data.devices} total={data.totalClicks} />
                  <BreakdownList title={tr ? "Tarayıcılar" : "Browsers"} rows={data.browsers} total={data.totalClicks} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
