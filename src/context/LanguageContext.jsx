import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { translations } from "../locales/translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("lss_locale");
        if (saved === "tr" || saved === "en") return saved;
        // Check browser language
        const navLang = navigator.language || navigator.userLanguage || "";
        if (navLang.startsWith("tr")) return "tr";
        return "en";
      } catch {
        return "tr";
      }
    }
    return "tr";
  });

  const setLocale = useCallback((newLocale) => {
    const valid = newLocale === "en" ? "en" : "tr";
    setLocaleState(valid);
    try {
      window.localStorage.setItem("lss_locale", valid);
      document.documentElement.lang = valid;
    } catch {}
  }, []);

  const toggleLanguage = useCallback(() => {
    setLocale(locale === "tr" ? "en" : "tr");
  }, [locale, setLocale]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const t = translations[locale] || translations.tr;

  return (
    <LanguageContext.Provider value={{ locale, setLocale, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
