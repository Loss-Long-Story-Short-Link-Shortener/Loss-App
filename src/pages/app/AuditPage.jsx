import { useEffect, useState } from "react";
import { AlertCircle, FileClock } from "../../ui/icons";
import { Alert, Badge, EmptyState, Skeleton, UpgradeNote } from "../../ui";
import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { useI18n } from "../../lib/i18n";
import { usePlan } from "../../state/plan";

const LABELS = {
  "link.create": ["Bağlantı oluşturuldu", "Link created"], "link.update": ["Bağlantı güncellendi", "Link updated"], "link.delete": ["Bağlantı silindi", "Link deleted"],
  "link.import": ["CSV içe aktarıldı", "CSV imported"], "link.bulk_delete": ["Toplu silme", "Bulk delete"], "link.bulk_pause": ["Toplu duraklatma", "Bulk pause"], "link.bulk_resume": ["Toplu yayına alma", "Bulk resume"],
  "link.bulk_set_tags": ["Toplu etiketleme", "Bulk tagging"], "link.bulk_set_folder": ["Toplu taşıma", "Bulk move"],
  "domain.add": ["Alan adı eklendi", "Domain added"], "domain.verify": ["Alan adı doğrulandı", "Domain verified"], "domain.remove": ["Alan adı kaldırıldı", "Domain removed"],
  "apikey.create": ["API anahtarı oluşturuldu", "API key created"], "apikey.revoke": ["API anahtarı iptal edildi", "API key revoked"],
  "webhook.create": ["Webhook eklendi", "Webhook added"], "webhook.delete": ["Webhook silindi", "Webhook deleted"], "team.invite": ["Takım daveti", "Team invite"], "account.delete": ["Hesap silindi", "Account deleted"],
};

export default function AuditPage() {
  const { t, lang } = useI18n();
  const { can, atLeast, me } = usePlan();
  const [state, setState] = useState({ status: "loading", entries: [], error: "" });
  useEffect(() => {
    if (!can("audit") || !atLeast("admin")) { setState({ status: "ready", entries: [], error: "" }); return; }
    api.audit().then((d) => setState({ status: "ready", entries: d.entries, error: "" })).catch((e) => setState({ status: "error", entries: [], error: e.message }));
  }, [me?.workspace?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="page-head"><div><h1>{t("Denetim kaydı", "Audit log")}</h1><p>{t("Çalışma alanında kimin neyi ne zaman değiştirdiği.", "Who changed what, and when, in this workspace.")}</p></div></div>
      {!can("audit") && <UpgradeNote>{t("Denetim kaydı Pro ve üzeri paketlerde.", "The audit log is available on Pro and above.")}</UpgradeNote>}
      {can("audit") && !atLeast("admin") && <Alert tone="info">{t("Denetim kaydını yalnızca yöneticiler görebilir.", "Only admins can view the audit log.")}</Alert>}
      {state.status === "error" && <Alert tone="danger" icon={AlertCircle}>{state.error}</Alert>}
      {can("audit") && atLeast("admin") && (
        <div className="card">
          {state.status === "loading" ? <div style={{ padding: 20 }}><Skeleton h={14} style={{ marginBottom: 12 }} /><Skeleton h={14} /></div>
            : state.entries.length === 0 ? <EmptyState icon={FileClock} title={t("Henüz kayıt yok", "No entries yet")}>{t("Yapılan değişiklikler burada listelenir.", "Changes will be listed here.")}</EmptyState>
            : <div className="table-wrap"><table className="table"><thead><tr><th>{t("Olay", "Event")}</th><th>{t("Hedef", "Target")}</th><th>{t("Kullanıcı", "Actor")}</th><th>{t("Zaman", "Time")}</th></tr></thead><tbody>
              {state.entries.map((e) => <tr key={e.id}><td><strong>{(LABELS[e.action] || [e.action, e.action])[lang === "tr" ? 0 : 1]}</strong></td><td className="mono truncate" style={{ maxWidth: 280, fontSize: 12.5 }}>{e.target}</td><td>{e.actor}{e.via === "apikey" && <Badge tone="accent"> API</Badge>}</td><td className="muted" style={{ whiteSpace: "nowrap" }}>{formatDateTime(e.at, lang)}</td></tr>)}
            </tbody></table></div>}
        </div>
      )}
    </>
  );
}
