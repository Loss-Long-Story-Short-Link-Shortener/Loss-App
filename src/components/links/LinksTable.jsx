import { Link2 } from "lucide-react";
import { LinkRow } from "./LinkRow";
import { EmptyState } from "../common/EmptyState";

export function LinksTable({
  links,
  onOpenQr,
  onDeleteRequest,
  onOpenCreateModal,
}) {
  if (!links || links.length === 0) {
    return (
      <EmptyState
        icon={Link2}
        title="Henüz bir bağlantı bulunmuyor"
        description="İlk kısa bağlantınızı oluşturarak tıklamaları, kitleleri ve dönüşümleri takip etmeye başlayın."
        actionLabel="Hemen Link Kısalt"
        onAction={onOpenCreateModal}
      />
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Bağlantı Detayı & Başlık</th>
            <th>Tıklamalar</th>
            <th>Durum</th>
            <th>Korumalar & Etiketler</th>
            <th>Tarih</th>
            <th style={{ textAlign: "right" }}>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <LinkRow
              key={link.id || link.slug}
              link={link}
              onOpenQr={onOpenQr}
              onDeleteRequest={onDeleteRequest}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
