import { useMemo } from "react";
import {
  MousePointerClick,
  Link2,
  CheckCircle2,
  PauseCircle,
  ExternalLink,
  BarChart3,
  TrendingUp,
  Clock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { formatNumber, formatTimeAgo } from "../utils/formatters";
import { getShortUrl } from "../constants/domains";

export function AnalyticsPage() {
  const { links } = useAuth();
  const { t } = useLanguage();

  const a = t.analytics || {};

  // Aggregations from user's actual links
  const totalClicks = useMemo(() => {
    return links.reduce((sum, l) => sum + (Number(l.clickCount) || 0), 0);
  }, [links]);

  const activeLinks = useMemo(() => {
    return links.filter((l) => l.status === "active");
  }, [links]);

  const pausedLinks = useMemo(() => {
    return links.filter((l) => l.status === "paused");
  }, [links]);

  const sortedLinks = useMemo(() => {
    return [...links].sort(
      (x, y) => (Number(y.clickCount) || 0) - (Number(x.clickCount) || 0),
    );
  }, [links]);

  const topLink =
    sortedLinks.length > 0 && (Number(sortedLinks[0].clickCount) || 0) > 0
      ? sortedLinks[0]
      : null;

  const avgClicksPerLink =
    links.length > 0 ? (totalClicks / links.length).toFixed(1) : "0";

  const handleOpenLink = (link) => {
    window.open(`/${link.slug}`, "_blank");
  };

  return (
    <div className="analytics-page-container">
      {/* Page Header */}
      <div className="analytics-header-row">
        <div>
          <h1 className="analytics-page-title">
            {a.title || "Ziyaretçi Analizleri"}
          </h1>
          <p className="analytics-page-desc">
            {a.subtitle ||
              "Bağlantılarınızın gerçek zamanlı tıklama performansını ve durumlarını net grafiklerle izleyin."}
          </p>
        </div>

        <div className="analytics-status-tag">
          <span className="live-dot" />
          <span>{a.realtimeBadge || "Gerçek Zamanlı Veri"}</span>
        </div>
      </div>

      {/* 4 Real Metric KPI Cards */}
      <div className="analytics-kpi-grid">
        <div className="analytics-kpi-card highlight">
          <div className="kpi-top">
            <span className="kpi-label">
              {a.totalClicks || "Toplam Tıklama"}
            </span>
            <div className="kpi-icon-wrap blue">
              <MousePointerClick size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{formatNumber(totalClicks)}</span>
          </div>
          <span className="kpi-note">
            {a.totalClicksDesc || "Tüm linklerinize gelen gerçek tıklamalar"}
          </span>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">
              {a.totalLinks || "Toplam Bağlantı"}
            </span>
            <div className="kpi-icon-wrap purple">
              <Link2 size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{links.length}</span>
          </div>
          <span className="kpi-note">
            {a.totalLinksDesc || "Oluşturulan toplam kısa link"}
          </span>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">
              {a.activeLinks || "Yayında (Aktif)"}
            </span>
            <div className="kpi-icon-wrap green">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{activeLinks.length}</span>
          </div>
          <span className="kpi-note">
            {a.activeLinksDesc || "Ziyaretçilere açık olan linkler"}
          </span>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">
              {a.avgClicks || "Ortalama Tıklama"}
            </span>
            <div className="kpi-icon-wrap cyan">
              <BarChart3 size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{avgClicksPerLink}</span>
          </div>
          <span className="kpi-note">
            {a.avgClicksDesc || "Bağlantı başına ortalama ziyaret"}
          </span>
        </div>
      </div>

      {/* Top Clicked Link Card */}
      {topLink && (
        <div className="analytics-highlight-banner">
          <div className="highlight-banner-left">
            <div className="highlight-badge">
              <TrendingUp size={13} />{" "}
              {a.topLinkBadge || "En Çok Tıklanan Bağlantı"}
            </div>
            <strong className="highlight-title">
              {getShortUrl(topLink.slug)}
            </strong>
            <span className="highlight-dest" title={topLink.destination}>
              {topLink.destination}
            </span>
          </div>
          <div className="highlight-banner-right">
            <div className="highlight-clicks-box">
              <span className="highlight-clicks-num">
                {formatNumber(topLink.clickCount)}
              </span>
              <span className="highlight-clicks-label">
                {a.realClicks || "Gerçek Tıklama"}
              </span>
            </div>
            <button
              type="button"
              className="highlight-open-btn"
              onClick={() => handleOpenLink(topLink)}
              title="Bağlantıyı Test Et"
            >
              <ExternalLink size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Link Breakdown Table */}
      <div className="analytics-panel-card" style={{ marginTop: "20px" }}>
        <div className="panel-card-head">
          <div className="head-title-row">
            <BarChart3 size={16} className="head-icon blue" />
            <h3>{a.tableTitle || "Bağlantı Bazlı Tıklama Dağılımı"}</h3>
          </div>
          <span className="head-badge">
            {links.length} {a.tableBadge || "Kayıtlı Link"}
          </span>
        </div>

        <div className="panel-card-content" style={{ padding: "0" }}>
          {links.length === 0 ? (
            <div className="top-links-empty">
              <Link2
                size={28}
                style={{ color: "var(--text-muted)", marginBottom: "10px" }}
              />
              <p
                style={{
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "4px",
                }}
              >
                {a.emptyTitle || "Henüz bağlantınız bulunmuyor"}
              </p>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {a.emptyDesc ||
                  "Kısaltıcı üzerinden link oluşturduğunuzda tıklamalar burada listelenecektir."}
              </span>
            </div>
          ) : (
            <div className="analytics-real-table-wrapper">
              <table className="analytics-real-table">
                <thead>
                  <tr>
                    <th style={{ width: "38%" }}>
                      {a.colShort || "Kısa Bağlantı"}
                    </th>
                    <th style={{ width: "32%" }}>
                      {a.colDest || "Hedef Adres"}
                    </th>
                    <th style={{ width: "15%", textAlign: "center" }}>
                      {a.colStatus || "Durum"}
                    </th>
                    <th style={{ width: "15%", textAlign: "right" }}>
                      {a.colClicks || "Tıklama"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLinks.map((link) => {
                    const clicks = Number(link.clickCount) || 0;
                    const sharePct =
                      totalClicks > 0
                        ? Math.round((clicks / totalClicks) * 100)
                        : 0;

                    return (
                      <tr key={link.id || link.slug}>
                        <td>
                          <div className="table-link-cell">
                            <span
                              className="table-link-slug"
                              onClick={() => handleOpenLink(link)}
                              title="Tıkla ve test et"
                            >
                              {getShortUrl(link.slug)}
                            </span>
                            <span className="table-link-date">
                              <Clock size={11} />{" "}
                              {formatTimeAgo(link.createdAt)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className="table-link-dest"
                            title={link.destination}
                          >
                            {link.destination}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            className={`table-status-pill ${
                              link.status === "active" ? "active" : "paused"
                            }`}
                          >
                            {link.status === "active"
                              ? a.statusActive || "Yayında"
                              : a.statusPaused || "Duraklatıldı"}
                          </span>
                        </td>
                        <td>
                          <div className="table-clicks-cell">
                            <strong className="table-clicks-num">
                              {clicks}
                            </strong>
                            {totalClicks > 0 && (
                              <div className="table-clicks-share-row">
                                <div className="table-share-track">
                                  <div
                                    className="table-share-fill"
                                    style={{
                                      width: `${Math.max(4, sharePct)}%`,
                                    }}
                                  />
                                </div>
                                <span className="table-share-text">
                                  %{sharePct}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
