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
import { useLanguage } from "../../context/LanguageContext";
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
  const { t, locale } = useLanguage();

  const c = t.common || {};
  const s = t.studio || {};
  const a = t.analytics || {};
  const b = t.billing || {};

  const userInitials = (
    user?.displayName
      ? user.displayName.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2)
      : (user?.email || "U").slice(0, 2)
  ).toUpperCase();

  const handleNavClick = (pageId, requiresLogin = false) => {
    if (requiresLogin && !user) {
      requireAuth(
        locale === "tr"
          ? `${pageId} bölümünü kullanmak için giriş yapmalısınız.`
          : `Please sign in to access ${pageId}.`
      );
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
            title="loss.tr"
          >
            <div className="sidebar-brand-icon">
              <img src="/loss.png" alt="loss.tr" />
            </div>
            <span className="sidebar-app-name">loss.tr</span>
          </div>
        )}

        <button
          className="sidebar-toggle-btn"
          onClick={onToggleCollapse}
          title={
            collapsed
              ? locale === "tr" ? "Menüyü Genişlet" : "Expand Sidebar"
              : locale === "tr" ? "Menüyü Daralt" : "Collapse Sidebar"
          }
          aria-label={collapsed ? "Expand" : "Collapse"}
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
        title={c.newLinkBtn || "Yeni Link Kısalt"}
      >
        <Plus size={16} strokeWidth={2.2} />
        {!collapsed && <span>{c.newLinkBtn || "Yeni Link Kısalt"}</span>}
      </button>

      {/* Recents list */}
      {!collapsed && links.length > 0 && (
        <div className="sidebar-recents-section">
          <p className="sidebar-section-title">
            {locale === "tr" ? "GEÇMİŞ BAĞLANTILAR" : "RECENT SHORT LINKS"}
          </p>
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
        {!collapsed && (
          <p className="sidebar-section-title">
            {locale === "tr" ? "ARAÇLAR" : "NAVIGATION"}
          </p>
        )}
        <div className="sidebar-nav-list">
          <button
            className={`sidebar-nav-btn ${activePage === "Overview" ? "active" : ""}`}
            onClick={() => handleNavClick("Overview")}
            title={locale === "tr" ? "Link Stüdyosu" : "Link Studio"}
          >
            <Link2 size={16} />
            {!collapsed && <span>{locale === "tr" ? "Link Stüdyosu" : "Link Studio"}</span>}
          </button>

          <button
            className={`sidebar-nav-btn ${activePage === "Analytics" ? "active" : ""}`}
            onClick={() => handleNavClick("Analytics", true)}
            title={a.title || "Analizler"}
          >
            <BarChart3 size={16} />
            {!collapsed && <span>{a.title || "Analizler"}</span>}
            {!collapsed && !user && (
              <span className="sidebar-nav-badge">
                {locale === "tr" ? "Giriş" : "Sign In"}
              </span>
            )}
          </button>

          <button
            className={`sidebar-nav-btn ${activePage === "Billing" ? "active" : ""}`}
            onClick={() => handleNavClick("Billing")}
            title={b.title || "Paketler"}
          >
            <CreditCard size={16} />
            {!collapsed && <span>{b.title || "Paketler"}</span>}
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
              title={locale === "tr" ? "Profil ve Ayarlar" : "Profile & Settings"}
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
                    {user.email || "loss.tr"}
                  </span>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                className="sidebar-logout-btn"
                onClick={signOutUser}
                title={c.logout || "Çıkış Yap"}
                aria-label={c.logout || "Çıkış Yap"}
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        ) : (
          <button
            className="sidebar-bottom-btn"
            style={{ width: "100%", justifyContent: "center", background: "var(--bg-surface-subtle)" }}
            onClick={() =>
              requireAuth(
                locale === "tr"
                  ? "Bağlantılarınızı hesabınıza bağlamak için giriş yapın."
                  : "Sign in to save your short links to your account."
              )
            }
            title={c.login || "Giriş Yap / Kaydol"}
          >
            <LogIn size={15} />
            {!collapsed && <span>{c.login || "Giriş Yap / Kaydol"}</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
