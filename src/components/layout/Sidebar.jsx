import {
  Link2,
  Plus,
  Settings,
  SlidersHorizontal,
  CreditCard,
  BarChart3,
  LogIn,
  LogOut,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { formatTimeAgo } from "../../utils/formatters";

export function Sidebar({
  activePage,
  onSelectPage,
  onOpenCreateModal,
  mobileOpen,
  onCloseMobile,
  collapsed = false,
  onToggleCollapse,
}) {
  const { user, links, requireAuth, signOutUser } = useAuth();

  const userInitials = (
    user?.displayName
      ? user.displayName.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2)
      : (user?.email || "U").slice(0, 2)
  ).toUpperCase();

  const handleNavClick = (pageId, requiresLogin = false) => {
    if (requiresLogin && !user) {
      requireAuth(`${pageId} bölümünü kullanmak için giriş yapmalısınız.`);
      return;
    }
    onSelectPage(pageId);
    onCloseMobile();
  };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
      {/* Top: Logo + Brand + Collapse Toggle */}
      <div className="sidebar-top-header">
        {!collapsed && (
          <div
            className="sidebar-brand-group"
            onClick={() => {
              onSelectPage("Overview");
              onCloseMobile();
            }}
            style={{ cursor: "pointer" }}
            title="Long Story Short"
          >
            <div className="sidebar-brand-icon">
              <img src="/loss.png" alt="Long Story Short" />
            </div>
            <span className="sidebar-app-name">Long Story Short</span>
          </div>
        )}

        <button
          className="sidebar-toggle-btn"
          onClick={onToggleCollapse}
          title={collapsed ? "Menüyü Genişlet" : "Menüyü Daralt"}
          aria-label={collapsed ? "Menüyü Genişlet" : "Menüyü Daralt"}
          style={collapsed ? { margin: "0 auto" } : {}}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <button
        className="sidebar-new-btn"
        onClick={() => {
          onOpenCreateModal();
          onCloseMobile();
        }}
        title="Yeni Link Kısalt"
      >
        <Plus size={16} strokeWidth={2.2} />
        {!collapsed && <span>Yeni Link Kısalt</span>}
      </button>

      {/* Recents list (Chat history style) */}
      {!collapsed && links.length > 0 && (
        <div className="sidebar-recents-section">
          <p className="sidebar-section-title">GEÇMİŞ BAĞLANTILAR</p>
          <div className="sidebar-recents-list">
            {links.slice(0, 5).map((link) => (
              <div
                key={link.id || link.slug}
                className="sidebar-recent-item"
                onClick={() => {
                  onSelectPage("Overview");
                  onCloseMobile();
                }}
                title={link.destination}
              >
                <strong className="sidebar-recent-title">
                  {link.title || link.slug}
                </strong>
                <span className="sidebar-recent-meta">
                  {formatTimeAgo(link.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workspace Menu */}
      <div className="sidebar-nav-section">
        {!collapsed && <p className="sidebar-section-title">ARAÇLAR</p>}
        <div className="sidebar-nav-list">
          <button
            className={`sidebar-nav-btn ${activePage === "Overview" ? "active" : ""}`}
            onClick={() => handleNavClick("Overview")}
            title="Kısaltıcı"
          >
            <Link2 size={16} />
            {!collapsed && <span>Kısaltıcı</span>}
          </button>

          <button
            className={`sidebar-nav-btn ${activePage === "Analytics" ? "active" : ""}`}
            onClick={() => handleNavClick("Analytics", true)}
            title="Analizler"
          >
            <BarChart3 size={16} />
            {!collapsed && <span>Analizler</span>}
            {!collapsed && !user && <span className="sidebar-nav-badge">Giriş</span>}
          </button>


          <button
            className={`sidebar-nav-btn ${activePage === "Billing" ? "active" : ""}`}
            onClick={() => handleNavClick("Billing")}
            title="Paketler"
          >
            <CreditCard size={16} />
            {!collapsed && <span>Paketler</span>}
          </button>
        </div>
      </div>

      {/* Bottom bar: User Profile or Login CTA */}
      <div className="sidebar-bottom-bar">
        {user ? (
          <div className="sidebar-user-card">
            <div
              className="sidebar-user-info-btn"
              onClick={() => handleNavClick("Settings")}
              title="Profil ve Ayarlar"
            >
              <div className="sidebar-user-avatar">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="sidebar-user-avatar-img" />
                ) : (
                  userInitials
                )}
              </div>
              {!collapsed && (
                <div className="sidebar-user-texts">
                  <span className="sidebar-user-name">
                    {user.displayName || user.email?.split("@")[0]}
                  </span>
                  <span className="sidebar-user-email">
                    {user.email || "Hesap"}
                  </span>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                className="sidebar-logout-btn"
                onClick={signOutUser}
                title="Çıkış Yap"
                aria-label="Çıkış Yap"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        ) : (
          <button
            className="sidebar-bottom-btn"
            style={{ width: "100%", justifyContent: "center", background: "var(--bg-surface-subtle)" }}
            onClick={() => requireAuth("Bağlantılarınızı hesabınıza bağlamak için giriş yapın.")}
            title="Giriş Yap / Kaydol"
          >
            <LogIn size={15} />
            {!collapsed && <span>Giriş Yap / Kaydol</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
