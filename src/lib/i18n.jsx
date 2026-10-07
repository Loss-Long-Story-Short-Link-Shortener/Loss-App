import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const I18nContext = createContext(null);
const KEY = "loss_lang";

function initial() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "tr" || saved === "en") return saved;
  } catch { /* ignore */ }
  return (navigator.language || "tr").toLowerCase().startsWith("en") ? "en" : "tr";
}

/**
 * Copy lives next to the markup: t("Türkçe", "English"). `{name}` placeholders
 * are filled from the optional third argument.
 */
export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initial);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  }, []);
  const t = useCallback((tr, en, vars) => {
    const s = lang === "tr" ? tr : en;
    return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`)) : s;
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** English plural helper: plural(n, "domain") → "1 domain" / "3 domains". */
export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const useI18n = () => useContext(I18nContext);
