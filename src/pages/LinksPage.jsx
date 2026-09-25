import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { LinksTable } from "../components/links/LinksTable";
import { LinkFilters } from "../components/links/LinkFilters";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export function LinksPage({
  onOpenCreateModal,
  onOpenQr,
  onDeleteRequest,
  onEditRequest,
}) {
  const { links } = useAuth();
  const { t } = useLanguage();

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

        <LinksTable
          links={filteredLinks}
          onOpenQr={onOpenQr}
          onDeleteRequest={onDeleteRequest}
          onOpenCreateModal={onOpenCreateModal}
          onEditRequest={onEditRequest}
        />
      </div>
    </div>
  );
}
