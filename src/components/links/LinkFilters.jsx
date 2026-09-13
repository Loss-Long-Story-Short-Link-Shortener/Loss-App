import { Search, Filter } from "lucide-react";

export function LinkFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
}) {
  return (
    <div className="filter-bar">
      <div className="search-input-wrap">
        <Search size={16} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Slug, başlık veya hedef URL ara..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: "8px", marginLeft: "auto", flexWrap: "wrap" }}>
        <select
          className="select-box"
          style={{ width: "auto", minWidth: "130px" }}
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
        >
          <option value="all">Tüm Durumlar</option>
          <option value="active">Yalnızca Aktif</option>
          <option value="paused">Duraklatılanlar</option>
        </select>

        <select
          className="select-box"
          style={{ width: "auto", minWidth: "150px" }}
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="newest">En Yeni Oluşturulan</option>
          <option value="clicks">En Çok Tıklanan</option>
          <option value="title">Başlığa Göre (A-Z)</option>
        </select>
      </div>
    </div>
  );
}
