import { useEffect, useMemo, useState } from "react";
import { Download, QrCode } from "../../ui/icons";
import { Alert, Button, EmptyState, Field, Input, Select, Switch } from "../../ui";
import { downloadFile } from "../../lib/format";
import { useI18n } from "../../lib/i18n";
import { useRouter } from "../../lib/router";
import { useLinks } from "../../state/links";
import { useToast } from "../../state/toast";
import { QrPreview, qrSvgString, svgToPng } from "./qr";

const PRESETS = [["#111111", "#ffffff"], ["#2f5bff", "#ffffff"], ["#0b7a52", "#ffffff"], ["#7a1fa2", "#ffffff"], ["#ffffff", "#111111"]];

function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export default function QrPage() {
  const { t } = useI18n();
  const toast = useToast();
  const { params } = useRouter();
  const { links, loading } = useLinks();
  const [linkId, setLinkId] = useState(params.get("link") || "");
  const [custom, setCustom] = useState("");
  const [fg, setFg] = useState("#111111");
  const [bg, setBg] = useState("#ffffff");
  const [shape, setShape] = useState("square");
  const [margin, setMargin] = useState(2);
  const [logo, setLogo] = useState(false);
  const [track, setTrack] = useState(true);

  useEffect(() => { if (!linkId && links.length) setLinkId(links[0].id); }, [linkId, links]);
  const link = links.find((l) => l.id === linkId);
  const value = custom.trim() || (link ? (track ? `${link.shortUrl}?qr=1` : link.shortUrl) : "");
  const ratio = contrast(fg, bg);
  const svg = useMemo(() => (value ? qrSvgString(value, { fg, bg, shape, margin, logo, size: 1024 }) : ""), [value, fg, bg, shape, margin, logo]);
  const name = (link?.slug || "qr").replace(/[^a-z0-9_-]/gi, "");

  if (!loading && !links.length && !custom) {
    return (<><div className="page-head"><div><h1>{t("QR kodları", "QR codes")}</h1></div></div><div className="card"><EmptyState icon={QrCode} title={t("QR kod için önce bir bağlantı oluşturun", "Create a link first")}>{t("QR kod kısa bağlantınıza işaret eder; böylece baskıdan sonra hedefi değiştirebilir ve taramaları ayrı izleyebilirsiniz.", "The QR code points at your short link, so you can change the destination after printing and track scans separately.")}</EmptyState></div></>);
  }

  return (
    <>
      <div className="page-head"><div><h1>{t("QR kodları", "QR codes")}</h1><p>{t("Dinamik QR kod: hedefi değiştirseniz de basılı kod aynı kalır. Taramalar ayrıca raporlanır.", "Dynamic QR: change the destination any time without reprinting. Scans are reported separately.")}</p></div></div>
      <div className="qr-layout">
        <div className="card card-pad stack">
          <Field label={t("Bağlantı", "Link")} htmlFor="qr-link">
            <Select id="qr-link" value={linkId} onChange={(e) => { setLinkId(e.target.value); setCustom(""); }}>
              {links.map((l) => <option key={l.id} value={l.id}>{(l.title || l.slug).slice(0, 50)} - {l.shortUrl.replace(/^https?:\/\//, "")}</option>)}
            </Select>
          </Field>
          <div className="row between"><label className="label" htmlFor="qr-track">{t("Taramaları ayrı izle (?qr=1)", "Track scans separately (?qr=1)")}</label><Switch checked={track} onChange={setTrack} label={t("Taramaları ayrı izle", "Track scans separately")} /></div>
          <Field label={t("Veya herhangi bir metin / URL (statik QR)", "Or any text / URL (static QR)")} htmlFor="qr-custom" optional hint={t("Statik QR kodların hedefi sonradan değiştirilemez ve izlenemez.", "Static QR codes cannot be changed later and are not tracked.")}><Input id="qr-custom" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="https://ornek.com…" /></Field>
          <hr className="divider" />
          <div className="stack" style={{ gap: 10 }}>
            <span className="label">{t("Renkler", "Colours")}</span>
            <div className="row wrap" style={{ gap: 10 }}>
              {PRESETS.map(([a, b]) => <button key={a + b} type="button" className="swatch" aria-label={`${a} / ${b}`} aria-pressed={fg === a && bg === b} style={{ background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }} onClick={() => { setFg(a); setBg(b); }} />)}
              <label className="row" style={{ gap: 6, fontSize: 13 }}>{t("Ön", "Fg")}<input type="color" value={fg} onChange={(e) => setFg(e.target.value)} aria-label={t("Ön plan rengi", "Foreground colour")} /></label>
              <label className="row" style={{ gap: 6, fontSize: 13 }}>{t("Arka", "Bg")}<input type="color" value={bg} onChange={(e) => setBg(e.target.value)} aria-label={t("Arka plan rengi", "Background colour")} /></label>
            </div>
            {ratio < 3 && <Alert tone="warning">{t("Renk kontrastı düşük; bazı kamera uygulamaları kodu okuyamayabilir. Koyu desen ve açık zemin önerilir.", "Low colour contrast: some scanners may fail. Use a dark pattern on a light background.")}</Alert>}
            {fg.toLowerCase() > bg.toLowerCase() && ratio >= 3 && <p className="hint">{t("Ters renkli kodlar bazı eski okuyucularda çalışmaz.", "Inverted codes do not work in some older scanners.")}</p>}
          </div>
          <div className="grid-2">
            <Field label={t("Desen", "Pattern")} htmlFor="qr-shape"><Select id="qr-shape" value={shape} onChange={(e) => setShape(e.target.value)}><option value="square">{t("Kare", "Square")}</option><option value="rounded">{t("Yuvarlatılmış", "Rounded")}</option><option value="dots">{t("Noktalar", "Dots")}</option></Select></Field>
            <Field label={t("Kenar boşluğu", "Quiet zone")} htmlFor="qr-margin"><Select id="qr-margin" value={margin} onChange={(e) => setMargin(Number(e.target.value))}>{[1, 2, 3, 4].map((m) => <option key={m} value={m}>{m}</option>)}</Select></Field>
          </div>
          <div className="row between"><label className="label" htmlFor="qr-logo">{t("Ortada logo", "Centre logo")}</label><Switch checked={logo} onChange={setLogo} label={t("Ortada logo", "Centre logo")} /></div>
        </div>

        <div className="card card-pad stack" style={{ alignItems: "center", position: "sticky", top: 16 }}>
          {value ? <QrPreview value={value} size={240} fg={fg} bg={bg} shape={shape} margin={margin} logo={logo} /> : <p className="muted">-</p>}
          <p className="hint mono" style={{ wordBreak: "break-all", textAlign: "center" }}>{value}</p>
          <div className="row wrap" style={{ justifyContent: "center" }}>
            <Button variant="primary" icon={Download} disabled={!svg} onClick={async () => { try { downloadFile(`${name}.png`, await svgToPng(svg, 1024)); } catch { toast.error(t("PNG oluşturulamadı", "Could not create PNG")); } }}>PNG</Button>
            <Button icon={Download} disabled={!svg} onClick={() => downloadFile(`${name}.svg`, svg, "image/svg+xml")}>SVG</Button>
          </div>
          <p className="hint" style={{ textAlign: "center" }}>{t("Baskı için SVG (vektör) önerilir. Basmadan önce telefonla test edin.", "Use SVG (vector) for print. Always test with a phone before printing.")}</p>
        </div>
      </div>
    </>
  );
}
