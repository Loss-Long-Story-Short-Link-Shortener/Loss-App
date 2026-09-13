import {
  MousePointerClick,
  Link2,
  BarChart3,
  Globe2,
  Plus,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { StatCard } from "../components/common/StatCard";
import { LinksTable } from "../components/links/LinksTable";
import { useAuth } from "../context/AuthContext";
import { formatNumber } from "../utils/formatters";
import { MOCK_ANALYTICS } from "../api/mockData";

export function OverviewPage({
  onOpenCreateModal,
  onOpenQr,
  onDeleteRequest,
  onNavigate,
}) {
  const { user, links, totalClicks } = useAuth();

  const activeLinksCount = links.filter((l) => l.status !== "paused").length;
  const avgClicksPerLink = links.length
    ? Math.round(totalClicks / links.length)
    : 0;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-kicker">
            <Sparkles size={13} /> Gerçek Zamanlı Performans
          </div>
          <h1 className="page-title">
            Hoş Geldiniz, {user?.displayName?.split(" ")[0] || "Yönetici"} ✦
          </h1>
          <p className="page-subtitle">
            Kısaltılmış bağlantılarınızın anlık performansı ve trafik dağılımı.
          </p>
        </div>

        <button className="btn btn-primary" onClick={onOpenCreateModal}>
          <Plus size={16} /> Yeni Link Kısalt
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title="Toplam Tıklama"
          value={formatNumber(totalClicks)}
          change="Canlı"
          trend="up"
          icon={MousePointerClick}
          note="Tüm yönlendirmeler"
        />
        <StatCard
          title="Aktif Linkler"
          value={activeLinksCount}
          change={`${links.length} toplam`}
          trend="neutral"
          icon={Link2}
          note="Yayında olan bağlantılar"
        />
        <StatCard
          title="Ort. Tıklama Oranı"
          value={links.length ? `${avgClicksPerLink} tık/link` : "—"}
          change="Hesaplanan"
          trend="neutral"
          icon={BarChart3}
          note="Bağlantı başına düşen"
        />
        <StatCard
          title="Alan Adı Durumu"
          value="Aktif"
          change="SSL Bağlı"
          trend="up"
          icon={Globe2}
          note="go.consolaktif.com.tr"
        />
      </div>

      {/* Dashboard Visual Grid */}
      <div className="dashboard-grid">
        {/* Weekly Click Trends Panel */}
        <div className="panel chart-card">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Haftalık Tıklama Eğrisi</h2>
              <p className="panel-desc">Son 7 günlük yönlendirme trafiği</p>
            </div>
            <button
              className="btn btn-subtle btn-sm"
              onClick={() => onNavigate("Analytics")}
            >
              Detaylı Analitik <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="chart-body" style={{ padding: "16px 24px" }}>
            <div className="bar-chart-container">
              {MOCK_ANALYTICS.weeklyClicks.map((item, idx) => {
                const maxVal = 1200;
                const heightPct = Math.round((item.clicks / maxVal) * 100);
                return (
                  <div key={idx} className="bar-col">
                    <span className="bar-val">{item.clicks}</span>
                    <div
                      className="bar-fill"
                      style={{ height: `${heightPct}%` }}
                      title={`${item.day}: ${item.clicks} tıklama`}
                    />
                    <span className="bar-label">{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Device & Platform Breakdown Panel */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Cihaz & Platform</h2>
              <p className="panel-desc">Ziyaretçilerin cihaz dağılımı</p>
            </div>
          </div>

          <div style={{ padding: "16px 24px" }}>
            <div className="device-list">
              {MOCK_ANALYTICS.devices.map((device, i) => (
                <div key={i}>
                  <div className="device-item-header">
                    <span>{device.label}</span>
                    <span>%{device.percentage}</span>
                  </div>
                  <div className="device-progress-bar">
                    <div
                      className="device-progress-fill"
                      style={{
                        width: `${device.percentage}%`,
                        backgroundColor: device.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "16px",
                paddingTop: "14px",
                borderTop: "1px solid var(--border-subtle)",
                fontSize: "12px",
                color: "var(--text-muted)",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Mobil optimizasyonlu yönlendirme</span>
              <strong style={{ color: "var(--success)" }}>%100 Uyumlu</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Links Table Panel */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Son Bağlantılar ({links.length})</h2>
            <p className="panel-desc">En son kısalttığınız bağlantılar ve durumları</p>
          </div>
          {links.length > 5 && (
            <button
              className="btn btn-subtle btn-sm"
              onClick={() => onNavigate("Links")}
            >
              Tümünü Gör ({links.length}) <ArrowUpRight size={14} />
            </button>
          )}
        </div>

        <LinksTable
          links={links.slice(0, 5)}
          onOpenQr={onOpenQr}
          onDeleteRequest={onDeleteRequest}
          onOpenCreateModal={onOpenCreateModal}
        />
      </div>
    </div>
  );
}
