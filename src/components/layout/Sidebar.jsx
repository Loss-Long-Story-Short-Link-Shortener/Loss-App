import { Link2, Sparkles, ChevronDown, LogOut } from "lucide-react";
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from "../../constants/navigation";
import { TIERS } from "../../constants/tiers";
import { useAuth } from "../../context/AuthContext";
import { formatNumber } from "../../utils/formatters";

export function Sidebar({
  activePage,
  onSelectPage,
  onOpenCreateModal,
  onOpenUpgradeModal,
  mobileOpen,
  onCloseMobile,
}) {
  const { user, currentTier, links, totalClicks, signOutUser } = useAuth();
  const tierMeta = TIERS[currentTier] || TIERS.free;

  const usagePercent = Math.min(
    100,
    Math.round((links.length / (tierMeta.maxLinks || 50)) * 100)
  );

  return (
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      {/* Brand Lockup */}
      <div className="brand-lockup">
        <div className="brand-mark">
          <Link2 size={20} strokeWidth={2.5} />
        </div>
        <div className="brand-text">
          <strong>
            Long Story
            <br />
            <span>Short</span>
          </strong>
        </div>
      </div>

      {/* Workspace Card */}
      <div className="workspace-card" onClick={() => onSelectPage("Settings")}>
        <div className="workspace-badge-icon">
          {currentTier === "enterprise" ? "👑" : currentTier === "pro" ? "⚡" : "🚀"}
        </div>
        <div className="workspace-meta">
          <span className="workspace-eyebrow">{tierMeta.name}</span>
          <span className="workspace-name">Ana Çalışma Alanı</span>
        </div>
        <ChevronDown size={14} color="var(--text-muted)" />
      </div>

      {/* Primary Navigation */}
      <div className="nav-group">
        <p className="nav-title">Çalışma Alanı</p>
        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-button ${isActive ? "active" : ""}`}
              onClick={() => {
                onSelectPage(item.id);
                onCloseMobile();
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.showCount && links.length > 0 && (
                <span className="nav-badge">{links.length}</span>
              )}
            </button>
          );
        })}

        <p className="nav-title nav-title-spaced">Yönetim & Ayarlar</p>
        {SECONDARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-button ${isActive ? "active" : ""}`}
              onClick={() => {
                onSelectPage(item.id);
                onCloseMobile();
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.proBadge && currentTier === "free" && (
                <span className="nav-pro-pill">PRO</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer with Usage & Profile */}
      <div className="sidebar-footer">
        <div className="plan-usage-box">
          <div className="usage-header">
            <span>Link Kotası</span>
            <span>
              {links.length} / {tierMeta.maxLinks}
            </span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="usage-desc">
            <strong>{formatNumber(totalClicks)}</strong> toplam tıklama
          </p>

          {currentTier === "free" ? (
            <button className="upgrade-btn" onClick={onOpenUpgradeModal}>
              <Sparkles size={13} color="#2563eb" /> Pro'ya Yükselt
            </button>
          ) : (
            <button
              className="upgrade-btn"
              onClick={() => onSelectPage("Billing")}
            >
              Planı Yönet
            </button>
          )}
        </div>

        {/* User profile row */}
        <div className="user-profile-row" onClick={signOutUser} title="Çıkış Yap">
          <div className="user-avatar-circle">
            {(user?.displayName || user?.email || "U").slice(0, 2).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="user-name">
              {user?.displayName || "Yönetici"}
            </span>
            <span className="user-email">{user?.email}</span>
          </div>
          <LogOut size={16} color="var(--text-muted)" />
        </div>
      </div>
    </aside>
  );
}
