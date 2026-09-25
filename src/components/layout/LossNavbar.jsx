import { useState } from "react";
import {
  Sparkles,
  Sun,
  Moon,
  LogIn,
  LogOut,
  User,
  Settings,
  BarChart3,
  QrCode,
  CreditCard,
  Menu,
  X,
  ChevronDown,
  Globe,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

export function LossNavbar({
  activePage,
  onSelectPage,
  onOpenCreateModal,
  onToggleSidebar,
}) {
  const { user, theme, setTheme, requireAuth, signOutUser } = useAuth();
  const { locale, toggleLanguage, t } = useLanguage();
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userInitials = (
    user?.displayName
      ? user.displayName.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2)
      : (user?.email || "U").slice(0, 2)
  ).toUpperCase();

  const handleNav = (pageName, anchorId = null) => {
    setMobileMenuOpen(false);
    if (anchorId && activePage === "Overview") {
      const el = document.getElementById(anchorId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    onSelectPage(pageName);
    if (anchorId) {
      setTimeout(() => {
        const el = document.getElementById(anchorId);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 150);
    }
  };

  return (
    <header className="loss-navbar-container">
      <nav className="loss-navbar">
        {/* Brand */}
        <div
          className="loss-brand"
          onClick={() => handleNav("Overview")}
          role="button"
          tabIndex={0}
        >
          <div className="loss-brand-logo-glow">
            <img src="/loss.png" alt="loss.tr" className="loss-brand-img" />
          </div>
          <div className="loss-brand-text">
            <span className="loss-brand-name">loss.tr</span>
          </div>
        </div>

        {/* Desktop Links - Context Aware & Minimal */}
        <div className="loss-nav-links">
          {activePage === "Overview" ? (
            <>
              <button
                className="loss-nav-item"
                onClick={() => handleNav("Overview", "ozellikler")}
              >
                {t.nav.features}
              </button>

              <button
                className="loss-nav-item"
                onClick={() => handleNav("Overview", "hiz-ve-altyapi")}
              >
                {t.nav.performance}
              </button>

              <button
                className="loss-nav-item"
                onClick={() => handleNav("Overview", "fiyatlandirma")}
              >
                {t.nav.pricing}
                <span className="loss-new-badge">PRO</span>
              </button>
            </>
          ) : activePage === "Shortener" ? (
            <>
              <button
                className="loss-nav-item"
                onClick={() => handleNav("Overview")}
              >
                {locale === "tr" ? "Ana Sayfa" : "Home"}
              </button>

              <button
                className="loss-nav-item active"
                onClick={() => handleNav("Shortener")}
              >
                {locale === "tr" ? "Link Kısaltıcı" : "Shortener"}
              </button>

              <button
                className="loss-nav-item"
                onClick={() => handleNav("Links")}
              >
                {t.nav.myLinks}
              </button>

              <button
                className="loss-nav-item"
                onClick={() => handleNav("QRCodes")}
              >
                {locale === "tr" ? "QR Stüdyosu" : "QR Studio"}
              </button>
            </>
          ) : (
            <>
              <button
                className="loss-nav-item"
                onClick={() => handleNav("Overview")}
              >
                {locale === "tr" ? "Ana Sayfa" : "Home"}
              </button>

              <button
                className="loss-nav-item"
                onClick={() => handleNav("Shortener")}
              >
                {locale === "tr" ? "Kısaltıcı Stüdyosu" : "Shortener Studio"}
              </button>

              <button
                className={`loss-nav-item ${activePage === "Links" ? "active" : ""}`}
                onClick={() => handleNav("Links")}
              >
                {t.nav.myLinks}
              </button>

              <button
                className={`loss-nav-item ${activePage === "Billing" ? "active" : ""}`}
                onClick={() => handleNav("Billing")}
              >
                {t.nav.pricing}
              </button>
            </>
          )}
        </div>

        {/* Right CTA / Auth Controls */}
        <div className="loss-nav-right">
          {/* Language Switcher */}
          <button
            className="loss-icon-pill"
            onClick={toggleLanguage}
            title={locale === "tr" ? "Switch to English" : "Türkçe'ye Geç"}
            aria-label="Dil Değiştir"
            style={{
              fontWeight: 700,
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              color: "var(--primary)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              background: "rgba(56, 189, 248, 0.08)",
            }}
          >
            {locale === "tr" ? "EN" : "TR"}
          </button>

          {/* Theme Switcher */}
          <button
            className="loss-icon-pill"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? t.nav.themeLight : t.nav.themeDark}
            aria-label="Tema Değiştir"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {user ? (
            <div className="loss-user-menu-wrapper">
              <button
                className="loss-user-pill"
                onClick={() => setProfileDropdown((v) => !v)}
                title={user.displayName || user.email}
              >
                <div className="loss-user-avatar">{userInitials}</div>
                <ChevronDown size={13} className="loss-user-chevron" />
              </button>

              {profileDropdown && (
                <div className="loss-dropdown-menu">
                  <div className="loss-dropdown-header">
                    <span className="dropdown-title">{user.displayName || "Kullanıcı"}</span>
                    <span className="dropdown-subtitle">{user.email}</span>
                  </div>
                  <div className="loss-dropdown-divider" />
                  <button
                    className="loss-dropdown-item"
                    onClick={() => {
                      setProfileDropdown(false);
                      handleNav("Links");
                    }}
                  >
                    <BarChart3 size={15} />
                    <span>{t.common.links}</span>
                  </button>
                  <button
                    className="loss-dropdown-item"
                    onClick={() => {
                      setProfileDropdown(false);
                      handleNav("Settings");
                    }}
                  >
                    <Settings size={15} />
                    <span>{t.common.settings}</span>
                  </button>
                  <div className="loss-dropdown-divider" />
                  <button
                    className="loss-dropdown-item danger"
                    onClick={() => {
                      setProfileDropdown(false);
                      signOutUser();
                    }}
                  >
                    <LogOut size={15} />
                    <span>{t.common.logout}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="loss-login-btn"
              onClick={() => requireAuth()}
            >
              {t.common.login}
            </button>
          )}

          {/* Primary Action Button - Cleanly hidden on Shortener page to remove clutter */}
          {activePage === "Overview" ? (
            <button
              className="loss-cta-pill-button"
              onClick={() => handleNav("Shortener")}
            >
              <div className="shine-pulse-layer" />
              <span className="cta-text">
                <Sparkles size={13} />
                <span>{t.common.shortenBtn} →</span>
              </span>
            </button>
          ) : activePage === "Shortener" ? null : (
            <button
              className="loss-cta-pill-button"
              onClick={onOpenCreateModal}
            >
              <div className="shine-pulse-layer" />
              <span className="cta-text">
                <Sparkles size={13} />
                <span>+ {t.common.newLinkBtn}</span>
              </span>
            </button>
          )}

          {/* Mobile Hamburger */}
          <button
            className="loss-mobile-hamburger"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Menü"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer - Streamlined */}
      {mobileMenuOpen && (
        <div className="loss-mobile-drawer">
          <button
            className={`loss-mobile-link ${activePage === "Overview" ? "active" : ""}`}
            onClick={() => handleNav("Overview")}
          >
            Ana Sayfa (Tanıtım)
          </button>
          <button
            className={`loss-mobile-link ${activePage === "Shortener" ? "active" : ""}`}
            onClick={() => handleNav("Shortener")}
          >
            ⚡ Link Kısaltma Stüdyosu
          </button>
          <button
            className="loss-mobile-link"
            onClick={() => handleNav("Overview", "ozellikler")}
          >
            Özellikler
          </button>
          <button
            className={`loss-mobile-link ${activePage === "Links" ? "active" : ""}`}
            onClick={() => handleNav("Links")}
          >
            Linklerim
          </button>
          <button
            className={`loss-mobile-link ${activePage === "Billing" ? "active" : ""}`}
            onClick={() => handleNav("Billing")}
          >
            Fiyatlandırma (PRO)
          </button>

          <div className="loss-mobile-footer">
            {user ? (
              <button
                className="loss-mobile-btn secondary"
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOutUser();
                }}
              >
                Çıkış Yap ({user.email?.split("@")[0]})
              </button>
            ) : (
              <button
                className="loss-mobile-btn secondary"
                onClick={() => {
                  setMobileMenuOpen(false);
                  requireAuth();
                }}
              >
                Giriş Yap / Kaydol
              </button>
            )}
            <button
              className="loss-mobile-btn primary"
              onClick={() => {
                setMobileMenuOpen(false);
                handleNav("Shortener");
              }}
            >
              Kısaltıcıyı Başlat →
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
