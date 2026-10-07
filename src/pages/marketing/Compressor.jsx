import { useEffect, useMemo, useState } from "react";
import { isValidUrl, normalizeUrl } from "../../lib/format";
import { useI18n } from "../../lib/i18n";

/** Each address is split where an editor would cut: host, path, then every parameter. */
const EXAMPLES = [
  { parts: ["https://www.markaniz.com", "/koleksiyon/yaz-2026/urun/keten-gomlek", "?utm_source=instagram", "&utm_medium=story", "&utm_campaign=yaz_indirimi_2026", "&ref=influencer_ayse", "&fbclid=IwAR0x9kQ"], slug: "yaz" },
  { parts: ["https://docs.google.com", "/forms/d/e/1FAIpQLSdq8Nw3xKpZ2vT7mHaB9cYrJ1uEoLxP5sQ0Wk", "/viewform", "?usp=sf_link", "&entry.2005620554=bayi"], slug: "anket" },
  { parts: ["https://maps.google.com", "/maps/place/Karaköy+Lokantası", "/@41.0225,28.9743,17z", "/data=!3m1!4b1!4m6!3m5!1s0x14cab9"], slug: "adres" },
];
const HOLD = 1900, STRIKE = 140, SHOW = 2800;

/** Splits what the visitor typed at the same places the examples are cut, and suggests a short name for it. */
function fromInput(raw) {
  if (!isValidUrl(raw)) return null;
  try {
    const u = new URL(normalizeUrl(raw));
    const parts = [u.origin];
    const path = u.pathname === "/" ? "" : u.pathname;
    if (path) parts.push(path);
    [...u.searchParams].forEach(([k, v], n) => parts.push(`${n ? "&" : "?"}${k}${v ? `=${v}` : ""}`));
    if (u.hash) parts.push(u.hash);
    const seg = path.split("/").filter(Boolean).pop() || u.hostname.replace(/^www\./, "").split(".")[0];
    const slug = (seg.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 10) || "link");
    return { parts, slug };
  } catch { return null; }
}

/**
 * The brand idea as an editor's pass: the long address is struck out piece by piece,
 * then the short link is highlighted. With `liveUrl` it edits what the visitor typed.
 * Decorative (aria-hidden); the caption states the result.
 */
export default function Compressor({ liveUrl = "" }) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState("long");
  const [typed, setTyped] = useState(null);
  const still = useMemo(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);

  useEffect(() => {
    const id = setTimeout(() => setTyped(fromInput(liveUrl)), 380);
    return () => clearTimeout(id);
  }, [liveUrl]);

  const live = Boolean(typed);
  const ex = typed || EXAMPLES[i];
  const key = live ? ex.parts.join("") : `ex${i}`;
  const long = ex.parts.join("");
  const short = `loss.tr/${ex.slug}`;

  useEffect(() => { setPhase("long"); }, [key]);
  useEffect(() => {
    if (still) return;
    if (live && phase === "short") return;
    const wait = phase === "long" ? (live ? 500 : HOLD) : phase === "strike" ? ex.parts.length * STRIKE + 500 : SHOW;
    const id = setTimeout(() => {
      if (phase === "long") setPhase("strike");
      else if (phase === "strike") setPhase("short");
      else { setI((n) => (n + 1) % EXAMPLES.length); setPhase("long"); }
    }, wait);
    return () => clearTimeout(id);
  }, [phase, still, ex, live]);

  const saved = Math.max(0, Math.round((1 - short.length / long.length) * 100));
  const state = still ? "short" : phase;

  return (
    <figure className="cmp" data-phase={state} data-live={live || undefined}>
      <div className="cmp-top" aria-hidden>
        <span>{live ? t("sizin adresiniz", "your address") : t("taslak", "draft")}</span>
        <span className="cmp-n"><b>{state === "short" ? short.length : long.length}</b> {t("karakter", "characters")}</span>
      </div>
      <div className="cmp-body" aria-hidden translate="no">
        <p className="cmp-long" key={key}>{ex.parts.map((p, k) => <span key={k} className="seg" style={{ "--k": k }}>{p}</span>)}</p>
        <p className="cmp-short"><span>loss.tr/</span><b className="mk">{ex.slug}</b></p>
      </div>
      <figcaption className="cmp-foot">
        <span aria-hidden>{live ? t("Önizleme. Gerçek adı siz seçersiniz.", "Preview. You pick the real name.") : t("Aynı yer, aynı sayfa.", "Same place, same page.")}</span>
        {saved > 0 && <span className="cmp-saved mk-chip" aria-hidden>−{saved}%</span>}
        <span className="sr-only">{t(`Örnek: ${long.length} karakterlik bir adres ${short} olur.`, `Example: a ${long.length} character address becomes ${short}.`)}</span>
      </figcaption>
    </figure>
  );
}
