import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { LinksTable } from "../components/links/LinksTable";
import { LinkFilters } from "../components/links/LinkFilters";
import { useAuth } from "../context/AuthContext";

export function LinksPage({ onOpenCreateModal, onOpenQr, onDeleteRequest }) {
  const { links } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

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
          return (a.title || a.slug || "").localeCompare(b.title || b.slug || "");
        }
        // newest default
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
  }, [links, searchQuery, statusFilter, sortBy]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tüm Bağlantılar</h1>
          <p className="page-subtitle">
            Çalışma alanınızdaki tüm bağlantıları inceleyin, filtreleyin ve yönetin.
          </p>
        </div>

        <button className="btn btn-primary" onClick={onOpenCreateModal}>
          <Plus size={16} /> Yeni Link Kısalt
        </button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              Bağlantı Listesi ({filteredLinks.length})
            </h2>
            <p className="panel-desc">
              Slug, başlık ve yönlendirme adresine göre filtreleyebilirsiniz.
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
        />
      </div>
    </div>
  );
}
