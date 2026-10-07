import { useEffect, useRef, useState } from "react";
import { formatNumber } from "../lib/format";
import { useI18n } from "../lib/i18n";

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const finePointer = () => typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

/** Number that counts up once on mount (ease-out, 700ms). Static for reduced motion and when the value later changes. */
export function CountUp({ value, compact = false }) {
  const { lang } = useI18n();
  const [shown, setShown] = useState(() => (reduced() ? value : 0));
  const first = useRef(true);
  useEffect(() => {
    if (!first.current || reduced() || !Number.isFinite(value)) { setShown(value); first.current = false; return; }
    first.current = false;
    const t0 = performance.now(), dur = 700;
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span aria-label={formatNumber(value, lang, compact)}>{formatNumber(shown, lang, compact)}</span>;
}

/** Splits a headline into words that rise in one after another. The full text stays on the element for assistive tech. */
export function Words({ text }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>{text.split(" ").map((w, i, arr) => <span key={i} className={`w ${i === arr.length - 1 ? "last mk" : ""}`} style={{ "--w": i }}>{w}{" "}</span>)}</span>
    </>
  );
}
