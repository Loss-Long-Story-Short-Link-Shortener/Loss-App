import { Link2 } from "lucide-react";
import { LinkRow } from "./LinkRow";
import { EmptyState } from "../common/EmptyState";
import { useLanguage } from "../../context/LanguageContext";

export function LinksTable({
  links,
  onOpenQr,
  onEditRequest,
  onDeleteRequest,
  onOpenCreateModal,
}) {
  const { t } = useLanguage();
  const lt = t.linksTable || {};

  if (!links || links.length === 0) {
    return (
      <EmptyState
        icon={Link2}
        title={lt.emptyTitle || "Henüz bir bağlantı bulunmuyor"}
        description={lt.emptyDesc || "İlk kısa bağlantınızı oluşturarak tıklamaları ve ziyaretçilerinizi takip etmeye başlayın."}
        actionLabel={t.common?.newLinkBtn || "Hemen Link Kısalt"}
        onAction={onOpenCreateModal}
      />
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>{lt.colLink || "Bağlantı Detayı & Başlık"}</th>
            <th>{lt.colClicks || "Tıklamalar"}</th>
            <th>{lt.colStatus || "Durum"}</th>
            <th>{lt.colTags || "Korumalar & Etiketler"}</th>
            <th>{lt.colDate || "Tarih"}</th>
            <th style={{ textAlign: "right" }}>{lt.colActions || "İşlemler"}</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <LinkRow
              key={link.id || link.slug}
              link={link}
              onOpenQr={onOpenQr}
              onEditRequest={onEditRequest}
              onDeleteRequest={onDeleteRequest}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
