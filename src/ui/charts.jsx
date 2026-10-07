import { useMemo, useState } from "react";
import { countryName, formatNumber } from "../lib/format";
import { useI18n } from "../lib/i18n";

/** Responsive SVG area chart with keyboard-free hover tooltip and a table fallback for screen readers. */
export function AreaChart({ data, height = 220 }) {
  const { lang, t } = useI18n();
  const [hover, setHover] = useState(null);
  const W = 800, H = height, PAD = { l: 8, r: 8, t: 12, b: 24 };

  const model = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.clicks));
    const nice = max <= 4 ? 4 : Math.ceil(max / 4 / 10 ** Math.floor(Math.log10(max / 4))) * 10 ** Math.floor(Math.log10(max / 4)) * 4;
    const x = (i) => PAD.l + (data.length <= 1 ? 0 : (i / (data.length - 1)) * (W - PAD.l - PAD.r));
    const y = (v) => PAD.t + (1 - v / nice) * (H - PAD.t - PAD.b);
    const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.clicks).toFixed(1)}`).join(" ");
    const area = `${line} L${x(data.length - 1).toFixed(1)},${H - PAD.b} L${x(0).toFixed(1)},${H - PAD.b} Z`;
    return { nice, x, y, line, area };
  }, [data, H]);

  const ticks = [0, 0.5, 1].map((f) => Math.round(model.nice * f));
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const fmtDate = (d) => new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "short" }).format(new Date(d));

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(ratio * (data.length - 1)))));
  };

  const h = hover === null ? null : data[hover];
  return (
    <figure className="chart" style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("Günlük tıklama grafiği", "Daily clicks chart")} preserveAspectRatio="none" style={{ width: "100%", height }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.l} x2={W - PAD.r} y1={model.y(tick)} y2={model.y(tick)} stroke="var(--border)" strokeDasharray={tick ? "3 4" : "0"} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
        <path d={model.area} fill="var(--accent)" style={{ opacity: "var(--area-o)" }} />
        <path d={model.line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {h && <line x1={model.x(hover)} x2={model.x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--text-3)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="chart-axis" aria-hidden>
        {data.map((d, i) => (i % labelEvery === 0 ? <span key={d.date} style={{ left: `${(i / Math.max(1, data.length - 1)) * 100}%` }}>{fmtDate(d.date)}</span> : null))}
      </div>
      <div className="chart-ticks" aria-hidden>{[...ticks].reverse().map((tk) => <span key={tk}>{formatNumber(tk, lang, tk >= 10000)}</span>)}</div>
      {h && (
        <div className="chart-tip" style={{ left: `${(hover / Math.max(1, data.length - 1)) * 100}%` }}>
          <strong>{formatNumber(h.clicks, lang)}</strong>
          <span>{fmtDate(h.date)}</span>
        </div>
      )}
      <table className="sr-only">
        <caption>{t("Günlük tıklamalar", "Daily clicks")}</caption>
        <tbody>{data.map((d) => <tr key={d.date}><th scope="row">{d.date}</th><td>{d.clicks}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

/** Horizontal bars for a breakdown; `kind="country"` adds flags and localized names. */
export function BarList({ rows, total, kind, empty }) {
  const { lang, t } = useI18n();
  if (!rows?.length) return <p className="muted" style={{ padding: "8px 0" }}>{empty || t("Henüz veri yok", "No data yet")}</p>;
  const sum = total || rows.reduce((s, r) => s + r.count, 0) || 1;
  const label = (r) => {
    if (kind === "country") return <><span className="cc" aria-hidden>{r.name === "XX" ? "?" : r.name}</span> {countryName(r.name, lang)}</>;
    if (r.name === "direct") return t("Doğrudan", "Direct");
    if (r.name === "link") return t("Bağlantı", "Link");
    if (r.name === "qr") return t("QR kod", "QR code");
    if (r.name === "mobile") return t("Mobil", "Mobile");
    if (r.name === "desktop") return t("Masaüstü", "Desktop");
    if (r.name === "tablet") return t("Tablet", "Tablet");
    return r.name;
  };
  return (
    <ul className="barlist">
      {rows.map((r) => {
        const pct = Math.round((r.count / sum) * 100);
        return (
          <li key={r.name}>
            <div className="barlist-row">
              <span className="truncate">{label(r)}</span>
              <span className="barlist-num">{formatNumber(r.count, lang)} <small>{pct}%</small></span>
            </div>
            <div className="barlist-bar" aria-hidden><span style={{ width: `${Math.max(2, pct)}%` }} /></div>
          </li>
        );
      })}
    </ul>
  );
}

export function Sparkline({ values, width = 80, height = 24 }) {
  if (!values?.length) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * width},${height - 2 - (v / max) * (height - 4)}`).join(" ");
  return <svg width={width} height={height} aria-hidden><polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" /></svg>;
}
