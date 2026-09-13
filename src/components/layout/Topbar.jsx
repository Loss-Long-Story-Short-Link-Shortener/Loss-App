import { useState } from "react";
import {
  Menu,
  Sun,
  Moon,
  LogIn,
  LogOut,
  CreditCard,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export function Topbar({
  onOpenMobile,
  onOpenCreateModal,
  onSelectPage,
}) {
  const { user, theme, setTheme, requireAuth, signOutUser } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

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
              className="user-avatar-circle"
              style={{ width: "30px", height: "30px", cursor: "pointer", border: "none" }}
              onClick={() => setProfileOpen((prev) => !prev)}
            >
              {(user.displayName || user.email || "U").slice(0, 2).toUpperCase()}
            </button>

            {profileOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: "200px",
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "var(--shadow-lg)",
                  padding: "6px",
                  zIndex: 50,
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
                onMouseLeave={() => setProfileOpen(false)}
              >
                <div style={{ padding: "6px 8px 8px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "4px" }}>
                  <strong style={{ display: "block", fontSize: "12px", color: "var(--text-primary)" }}>
                    {user.displayName || "Kullanıcı"}
                  </strong>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user.email}
                  </span>
                </div>

                <button
                  className="btn btn-subtle btn-sm"
                  style={{ justifyContent: "flex-start" }}
                  onClick={() => {
                    onSelectPage("Billing");
                    setProfileOpen(false);
                  }}
                >
                  <CreditCard size={13} /> Paketler
                </button>


                <button
                  className="btn btn-subtle btn-sm"
                  style={{ justifyContent: "flex-start", color: "var(--danger)" }}
                  onClick={() => {
                    signOutUser();
                    setProfileOpen(false);
                  }}
                >
                  <LogOut size={13} /> Çıkış Yap
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
