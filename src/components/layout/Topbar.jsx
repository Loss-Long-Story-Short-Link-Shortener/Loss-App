import { useState, useCallback } from "react";
import {
  Menu,
  Sun,
  Moon,
  LogIn,
  LogOut,
  CreditCard,
  Settings2,
  Sparkles,
  Globe2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useClickOutside } from "../../hooks/useClickOutside";

export function Topbar({
  onOpenMobile,
  onOpenCreateModal,
  onSelectPage,
}) {
  const { user, currentTier, theme, setTheme, requireAuth, signOutUser } = useAuth();
  const { locale, toggleLanguage, t } = useLanguage();
  const [profileOpen, setProfileOpen] = useState(false);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  const profileRef = useClickOutside(closeProfile, profileOpen);

  const c = t.common || {};
  const s = t.settings || {};
  const b = t.billing || {};

  const userInitials = (user?.displayName || user?.email || "U")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="mobile-menu-btn"
          onClick={onOpenMobile}
          aria-label={locale === "tr" ? "Menüyü Aç" : "Open Menu"}
        >
          <Menu size={18} />
        </button>
      </div>

      <div className="topbar-right">
        {/* Language Switcher Pill */}
        <button
          className="loss-nav-lang-btn"
          onClick={toggleLanguage}
          title={locale === "tr" ? "Switch to English" : "Türkçe'ye Geç"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "20px",
            padding: "5px 10px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            color: "var(--text-primary)",
          }}
        >
          <Globe2 size={13} style={{ opacity: 0.8 }} />
          <span>{locale === "tr" ? "TR" : "EN"}</span>
        </button>

        {/* Theme Toggle */}
        <button
          className="icon-btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={locale === "tr" ? "Tema Değiştir" : "Toggle Theme"}
          title={
            theme === "dark"
              ? locale === "tr"
                ? "Aydınlık Moda Geç"
                : "Switch to Light Mode"
              : locale === "tr"
              ? "Koyu Moda Geç"
              : "Switch to Dark Mode"
          }
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User profile or Login CTA */}
        {user ? (
          <div style={{ position: "relative" }}>
            <button
              className={`topbar-avatar-btn ${profileOpen ? "active" : ""}`}
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-label="Profil Menüsü"
              title={user.displayName || user.email}
            >
              <span className="topbar-avatar-text">{userInitials}</span>
            </button>

            {profileOpen && (
              <div ref={profileRef} className="topbar-profile-dropdown">
                {/* Profile Header */}
                <div className="dropdown-user-header">
                  <div className="dropdown-user-avatar">{userInitials}</div>
                  <div className="dropdown-user-details">
                    <span className="dropdown-user-name">
                      {user.displayName || (locale === "tr" ? "Kullanıcı" : "User")}
                    </span>
                    <span className="dropdown-user-email" title={user.email}>
                      {user.email}
                    </span>
                  </div>
                  <span className="dropdown-tier-chip">
                    {currentTier?.toUpperCase() || "FREE"}
                  </span>
                </div>

                <div className="dropdown-divider" />

                {/* Navigation Items */}
                <div className="dropdown-items-group">
                  <button
                    className="dropdown-menu-item"
                    onClick={() => {
                      onSelectPage("Settings");
                      setProfileOpen(false);
                    }}
                  >
                    <Settings2 size={15} />
                    <span>{s.title || "Ayarlar & Profil"}</span>
                  </button>

                  <button
                    className="dropdown-menu-item"
                    onClick={() => {
                      onSelectPage("Billing");
                      setProfileOpen(false);
                    }}
                  >
                    <CreditCard size={15} />
                    <span>{b.title || "Paketler & Plan"}</span>
                  </button>
                </div>

                <div className="dropdown-divider" />

                <button
                  className="dropdown-menu-item danger"
                  onClick={() => {
                    signOutUser();
                    setProfileOpen(false);
                  }}
                >
                  <LogOut size={15} />
                  <span>{c.logout || "Çıkış Yap"}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            onClick={() =>
              requireAuth(
                locale === "tr"
                  ? "Bağlantılarınızı buluta kaydetmek için giriş yapın."
                  : "Sign in to save your short links to the cloud."
              )
            }
          >
            <LogIn size={13} /> {c.login || "Giriş Yap"}
          </button>
        )}
      </div>
    </header>
  );
}
