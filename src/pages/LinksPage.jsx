import { useState, useMemo, useEffect } from "react";
import { Plus, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { LinksTable } from "../components/links/LinksTable";
import { LinkFilters } from "../components/links/LinkFilters";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const PAGE_SIZE = 50;

export function LinksPage({
  onOpenCreateModal,
  onOpenQr,
  onDeleteRequest,
  onEditRequest,
  onViewAnalytics,
}) {
  const { links, linksLoading, linksError, refreshLinks } = useAuth();
  const { t, locale } = useLanguage();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const lt = t.linksTable || {};

  // Filtering & Sorting logic
  const filteredLinks = useMemo(() => {
    return links
      .filter((link) => {
        // Search query
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          (link.slug && link.slug.toLowerCase().includes(q)) ||
          (link.title && link.title.toLowerCase().includes(q)) ||
          (link.destination && link.destination.toLowerCase().includes(q)) ||
          (link.tag && link.tag.toLowerCase().includes(q));

        // Status filter
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && link.status !== "paused") ||
          (statusFilter === "paused" && link.status === "paused");

        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "clicks") {
          return (Number(b.clickCount) || 0) - (Number(a.clickCount) || 0);
        }
        if (sortBy === "title") {
          return (a.title || a.slug || "").localeCompare(
            b.title || b.slug || "",
          );
        }
        // newest default
        const toTimestamp = (value) => {
          if (!value) return 0;
          if (typeof value === "object" && typeof value.seconds === "number") {
            return value.seconds * 1000;
          }
          const timestamp = new Date(value).getTime();
          return Number.isNaN(timestamp) ? 0 : timestamp;
        };
        const aTime = toTimestamp(a.createdAt);
        const bTime = toTimestamp(b.createdAt);
        return bTime - aTime;
      });
  }, [links, searchQuery, statusFilter, sortBy]);

  // Reset pagination whenever the result set changes.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, statusFilter, sortBy]);

  const visibleLinks = filteredLinks.slice(0, visibleCount);
  const remaining = filteredLinks.length - visibleLinks.length;
  const firstLoad = linksLoading && links.length === 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{lt.title || "Tüm Bağlantılar"}</h1>
          <p className="page-subtitle">
            {lt.subtitle ||
              "Çalışma alanınızdaki tüm bağlantıları inceleyin, filtreleyin ve yönetin."}
          </p>
        </div>

        <button className="btn btn-primary" onClick={onOpenCreateModal}>
          <Plus size={16} /> {t.common?.newLinkBtn || "Yeni Link Kısalt"}
        </button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              {lt.title || "Bağlantı Listesi"} ({filteredLinks.length})
            </h2>
            <p className="panel-desc">
              {lt.subtitle ||
                "Slug, başlık ve yönlendirme adresine göre filtreleyebilirsiniz."}
            </p>
          </div>
        </div>

        <div style={{ padding: "16px 20px 0" }}>
          <LinkFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </div>

        {linksError && (
          <div className="inline-alert" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{linksError}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={refreshLinks}>
              <RefreshCw size={13} /> {locale === "tr" ? "Tekrar dene" : "Retry"}
            </button>
          </div>
        )}

        {firstLoad ? (
          <div className="inline-loading" role="status">
            <Loader2 size={18} className="spin" aria-hidden="true" />
            {locale === "tr" ? "Bağlantılar yükleniyor…" : "Loading links…"}
          </div>
        ) : links.length > 0 && filteredLinks.length === 0 ? (
          <div className="inline-loading">
            {locale === "tr"
              ? "Aramanızla eşleşen bağlantı bulunamadı."
              : "No links match your search."}
          </div>
        ) : (
          <LinksTable
            links={visibleLinks}
            onOpenQr={onOpenQr}
            onDeleteRequest={onDeleteRequest}
            onOpenCreateModal={onOpenCreateModal}
            onEditRequest={onEditRequest}
            onViewAnalytics={onViewAnalytics}
          />
        )}

        {remaining > 0 && (
          <div className="load-more-row">
            <button type="button" className="btn btn-secondary" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
              {locale === "tr" ? `Daha fazla göster (${remaining} kaldı)` : `Show more (${remaining} left)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
