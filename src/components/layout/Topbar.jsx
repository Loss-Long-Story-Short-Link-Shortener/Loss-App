import { useState } from "react";
import {
  Menu,
  Sun,
  Moon,
  Sparkles,
  Bell,
  CreditCard,
  Key,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export function Topbar({
  activePage,
  onOpenMobile,
  onOpenCreateModal,
  onOpenUpgradeModal,
  onSelectPage,
}) {
  const { user, isDemo, theme, setTheme, currentTier, signOutUser } = useAuth();
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

        <div className="breadcrumb">
          <span>Çalışma Alanı</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{activePage}</span>
        </div>

        {isDemo && (
          <span className="demo-mode-indicator" title="Test ve Önizleme Modu">
            <span className="status-dot-pulse" style={{ background: "#f59e0b" }} />
            Demo Modu
          </span>
        )}
      </div>

      <div className="topbar-right">
        {currentTier === "free" && (
          <button
            className="btn btn-sm"
            style={{
              background: "linear-gradient(135deg, #2563eb, #6366f1)",
              color: "#fff",
              border: "none",
            }}
            onClick={onOpenUpgradeModal}
          >
            <Sparkles size={14} /> Planı Yükselt
          </button>
        )}

        {/* Theme Toggle */}
        <button
          className="icon-btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Tema Değiştir"
          title={theme === "dark" ? "Aydınlık Temaya Geç" : "Koyu Temaya Geç"}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Profile Dropdown */}
        <div style={{ position: "relative" }}>
          <button
            className="user-avatar-circle"
            style={{ cursor: "pointer", border: "none" }}
            onClick={() => setProfileOpen((prev) => !prev)}
            aria-label="Kullanıcı Menüsü"
          >
            {(user?.displayName || user?.email || "U").slice(0, 2).toUpperCase()}
          </button>

          {profileOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "220px",
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-lg)",
                padding: "8px",
                zIndex: 50,
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
              onMouseLeave={() => setProfileOpen(false)}
            >
              <div
                style={{
                  padding: "8px",
                  borderBottom: "1px solid var(--border-subtle)",
                  marginBottom: "4px",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    fontSize: "13px",
                    color: "var(--text-primary)",
                  }}
                >
                  {user?.displayName || "Yönetici"}
                </strong>
                <span
                  style={{
                    display: "block",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user?.email}
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
                <CreditCard size={14} /> Abonelik & Paket
              </button>

              <button
                className="btn btn-subtle btn-sm"
                style={{ justifyContent: "flex-start" }}
                onClick={() => {
                  onSelectPage("Integrations");
                  setProfileOpen(false);
                }}
              >
                <Key size={14} /> API & Token
              </button>

              <button
                className="btn btn-subtle btn-sm"
                style={{ justifyContent: "flex-start", color: "var(--danger)" }}
                onClick={() => {
                  signOutUser();
                  setProfileOpen(false);
                }}
              >
                <LogOut size={14} /> Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
