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
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useClickOutside } from "../../hooks/useClickOutside";

export function Topbar({
  onOpenMobile,
  onOpenCreateModal,
  onSelectPage,
}) {
  const { user, currentTier, theme, setTheme, requireAuth, signOutUser } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  const profileRef = useClickOutside(closeProfile, profileOpen);

  const userInitials = (user?.displayName || user?.email || "U")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="mobile-menu-btn"
          onClick={onOpenMobile}
          aria-label="Menüyü Aç"
        >
          <Menu size={18} />
        </button>
      </div>

      <div className="topbar-right">
        {/* Theme Toggle */}
        <button
          className="icon-btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Tema Değiştir"
          title={theme === "dark" ? "Aydınlık Moda Geç" : "Koyu Moda Geç"}
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
                      {user.displayName || "Kullanıcı"}
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
                    <span>Ayarlar & Profil</span>
                  </button>

                  <button
                    className="dropdown-menu-item"
                    onClick={() => {
                      onSelectPage("Billing");
                      setProfileOpen(false);
                    }}
                  >
                    <CreditCard size={15} />
                    <span>Paketler & Plan</span>
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
                  <span>Çıkış Yap</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => requireAuth("Bağlantılarınızı buluta kaydetmek için giriş yapın.")}
          >
            <LogIn size={13} /> Giriş Yap
          </button>
        )}
      </div>
    </header>
  );
}
