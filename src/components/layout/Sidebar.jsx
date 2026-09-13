import {
  Link2,
  Plus,
  Settings,
  SlidersHorizontal,
  Key,
  Globe2,
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
            title="Loss Ana Sayfa"
          >
            <div className="sidebar-brand-icon">
              <Link2 size={16} strokeWidth={2.8} />
            </div>
            <span className="sidebar-app-name">Loss</span>
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
            title="Analitik"
          >
            <BarChart3 size={16} />
            {!collapsed && <span>Analitik</span>}
            {!collapsed && !user && <span className="sidebar-nav-badge">Giriş</span>}
          </button>

          <button
            className={`sidebar-nav-btn ${activePage === "Domains" ? "active" : ""}`}
            onClick={() => handleNavClick("Domains", true)}
            title="Özel Domain"
          >
            <Globe2 size={16} />
            {!collapsed && <span>Özel Domain</span>}
            {!collapsed && !user && <span className="sidebar-nav-badge">Giriş</span>}
          </button>

          <button
            className={`sidebar-nav-btn ${activePage === "Integrations" ? "active" : ""}`}
            onClick={() => handleNavClick("Integrations", true)}
            title="REST API"
          >
            <Key size={16} />
            {!collapsed && <span>REST API</span>}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "space-between",
              width: "100%",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", cursor: "pointer" }}
              onClick={() => handleNavClick("Settings")}
              title={user.displayName || user.email}
            >
              <div className="user-avatar-circle" style={{ width: "28px", height: "28px", fontSize: "11px" }}>
                {(user.displayName || user.email || "U").slice(0, 2).toUpperCase()}
              </div>
              {!collapsed && (
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.displayName || user.email?.split("@")[0]}
                </span>
              )}
            </div>

            {!collapsed && (
              <button
                className="icon-btn"
                style={{ width: "26px", height: "26px" }}
                onClick={signOutUser}
                title="Çıkış Yap"
              >
                <LogOut size={13} />
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
