import { useState } from "react";
import { Menu, X, Languages } from "../../ui/icons";
import { Logo } from "../../ui";
import { useI18n } from "../../lib/i18n";
import { Link, jump, useRouter } from "../../lib/router";
import { useAuth } from "../../state/auth";

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { user } = useAuth();
  const { path } = useRouter();
  const [open, setOpen] = useState(false);
  const links = [["/features", t("Özellikler", "Features")], ["/pricing", t("Fiyatlar", "Pricing")], ["/developers", t("Geliştiriciler", "Developers")]];
  return (
    <header className="mk-header">
      <div className="mk-container mk-header-inner">
        <Link to="/" aria-label="loss.tr"><Logo /></Link>
        <nav className="mk-nav" aria-label={t("Ana gezinme", "Main navigation")}>
          {links.map(([to, label]) => <Link key={to} to={to} aria-current={path === to ? "page" : undefined}>{label}</Link>)}
        </nav>
        <div className="mk-actions">
          <button type="button" className="icon-btn" onClick={() => setLang(lang === "tr" ? "en" : "tr")} aria-label={lang === "tr" ? "Switch to English" : "Türkçeye geç"}><Languages size={17} /><span className="mk-lang">{lang.toUpperCase()}</span></button>
          {user ? <Link to="/app" className="btn btn-primary">{t("Panele git", "Open dashboard")}</Link> : <>
            <Link to="/login" className="btn btn-ghost mk-hide-sm">{t("Giriş yap", "Sign in")}</Link>
            <Link to="/register" className="btn btn-primary">{t("Ücretsiz başla", "Start free")}</Link>
          </>}
          <button type="button" className="icon-btn mk-burger" onClick={() => setOpen((o) => !o)} aria-label={t("Menü", "Menu")} aria-expanded={open}>{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {open && (
        <div className="mk-mobile-nav">
          {links.map(([to, label]) => <Link key={to} to={to} onClick={() => setOpen(false)}>{label}</Link>)}
          {!user && <Link to="/login" onClick={() => setOpen(false)}>{t("Giriş yap", "Sign in")}</Link>}
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const { t } = useI18n();
  const contact = import.meta.env.VITE_CONTACT_EMAIL;
  return (
    <footer className="mk-footer">
      <div className="mk-container mk-footer-grid">
        <div><Logo /><p className="muted" style={{ marginTop: 12, maxWidth: "34ch" }}>{t("Hızlı, güvenli ve gizlilik dostu link yönetimi.", "Fast, secure, privacy-friendly link management.")}</p></div>
        <div><h2 className="mk-foot-title">{t("Ürün", "Product")}</h2><Link to="/features">{t("Özellikler", "Features")}</Link><Link to="/pricing">{t("Fiyatlar", "Pricing")}</Link><Link to="/developers">API</Link></div>
        <div><h2 className="mk-foot-title">{t("Hesap", "Account")}</h2><Link to="/login">{t("Giriş yap", "Sign in")}</Link><Link to="/register">{t("Kaydol", "Sign up")}</Link></div>
        <div><h2 className="mk-foot-title">{t("Yasal", "Legal")}</h2><Link to="/privacy">{t("Gizlilik", "Privacy")}</Link><Link to="/terms">{t("Koşullar", "Terms")}</Link><Link to="/abuse">{t("Kötüye kullanım bildir", "Report abuse")}</Link>{contact && <a href={`mailto:${contact}`}>{contact}</a>}</div>
      </div>
      <div className="mk-wordmark" aria-hidden>loss.tr</div>
      <div className="mk-container mk-footer-bottom">© {new Date().getFullYear()} loss.tr</div>
    </footer>
  );
}

export function Page({ children, narrow }) {
  const { t } = useI18n();
  return (
    <div data-theme="dark" className="mk-shell">
      <a href="#main" onClick={jump("main")} className="skip-link">{t("İçeriğe geç", "Skip to content")}</a>
      <Header />
      <main id="main" tabIndex={-1} className={narrow ? "mk-container mk-narrow" : undefined}>{children}</main>
      <Footer />
    </div>
  );
}
