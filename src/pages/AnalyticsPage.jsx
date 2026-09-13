import {
  MousePointerClick,
  Users,
  Percent,
  ShieldCheck,
  Globe2,
  Share2,
  Smartphone,
} from "lucide-react";
import { StatCard } from "../components/common/StatCard";
import { useAuth } from "../context/AuthContext";
import { formatNumber } from "../utils/formatters";
import { MOCK_ANALYTICS } from "../api/mockData";

export function AnalyticsPage() {
  const { totalClicks } = useAuth();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Trafik & Kitle Analitiği</h1>
          <p className="page-subtitle">
            Tüm bağlantılarınızın coğrafi dağılımı, yönlendiren kaynakları ve cihaz metrikleri.
          </p>
        </div>
      </div>

      {/* Analytics Stat Cards */}
      <div className="stats-grid">
        <StatCard
          title="Toplam Tıklama"
          value={formatNumber(totalClicks || MOCK_ANALYTICS.totalClicks)}
          change="Canlı"
          trend="up"
          icon={MousePointerClick}
          note="Kaydedilen yönlendirmeler"
        />
        <StatCard
          title="Tekil Ziyaretçi"
          value={formatNumber(MOCK_ANALYTICS.uniqueVisitors)}
          change="+14.2%"
          trend="up"
          icon={Users}
          note="Farklı IP ve tarayıcılar"
        />
        <StatCard
          title="Tahmini Dönüşüm"
          value={MOCK_ANALYTICS.averageConversionRate}
          change="Ortalama"
          trend="neutral"
          icon={Percent}
          note="Hedef sayfaya ulaşanlar"
        />
        <StatCard
          title="Bot & Güvenlik Koruması"
          value="%100"
          change="Aktif"
          trend="up"
          icon={ShieldCheck}
          note="Anti-bot ve spam filtresi"
        />
      </div>

      {/* Grid: Countries + Referrers */}
      <div className="dashboard-grid">
        {/* Geographic Distribution */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Globe2 size={16} /> Ülkelere Göre Dağılım
                </span>
              </h2>
              <p className="panel-desc">Ziyaretçilerin bağlandığı ülkeler</p>
            </div>
          </div>

          <table className="geo-table">
            <tbody>
              {MOCK_ANALYTICS.countries.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="country-cell">
                      <span style={{ fontSize: "16px" }}>{item.flag}</span>
                      <span>{item.country}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {formatNumber(item.clicks)} tık
                  </td>
                  <td style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "12px" }}>
                    {item.share}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Traffic Channels / Referrers */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Share2 size={16} /> Trafik Kaynakları (Referrers)
                </span>
              </h2>
              <p className="panel-desc">Bağlantılara tıklanan platformlar</p>
            </div>
          </div>

          <div style={{ padding: "16px 20px" }}>
            <div className="device-list">
              {MOCK_ANALYTICS.referrers.map((item, idx) => (
                <div key={idx}>
                  <div className="device-item-header">
                    <span>{item.source}</span>
                    <span>
                      {formatNumber(item.count)} ({item.share})
                    </span>
                  </div>
                  <div className="device-progress-bar">
                    <div
                      className="device-progress-fill"
                      style={{
                        width: item.share,
                        backgroundColor: "var(--primary)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
