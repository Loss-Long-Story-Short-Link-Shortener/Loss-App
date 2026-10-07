import { useMemo, useState } from "react";
import { ArrowLeft, Calendar, Copy, ExternalLink, Folder, Globe, Lock, MousePointerClick, Pause, Pencil, Play, QrCode, Smartphone, Trash2 } from "../../ui/icons";
import { Alert, Badge, Button, CopyField, EmptyState } from "../../ui";
import { formatDate, formatDateTime, formatNumber, toMillis } from "../../lib/format";
import { useI18n } from "../../lib/i18n";
import { Link, useQueryState, useRouter } from "../../lib/router";
import { useLinks } from "../../state/links";
import { usePlan } from "../../state/plan";
import { useToast } from "../../state/toast";
import { useEditor } from "./AppShell";
import { Insights, RangePicker, RetentionNote } from "./Insights";
import { StatusBadge } from "./LinksPage";
import { QrPreview } from "./qr";

export default function LinkDetailPage({ params }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { navigate } = useRouter();
  const { links, loading, update, remove } = useLinks();
  const { atLeast, plan } = usePlan();
  const editor = useEditor();
  const [daysParam, setDaysParam] = useQueryState("days", "30");
  const days = Number(daysParam) || 30;
  const setDays = (d) => setDaysParam(String(d));
  const [confirm, setConfirm] = useState(false);
  const link = useMemo(() => links.find((l) => l.id === params.id), [links, params.id]);
  const max = plan?.analyticsDays || 30;
  const canEdit = atLeast("editor");

  if (loading && !link) return <div role="status" className="muted">…</div>;
  if (!link) return (
    <div className="card"><EmptyState icon={Globe} title={t("Bağlantı bulunamadı", "Link not found")} action={<Link to="/app" className="btn btn-secondary"><ArrowLeft size={15} /> {t("Bağlantılara dön", "Back to links")}</Link>}>{t("Silinmiş olabilir veya bu çalışma alanında değil.", "It may have been deleted or belongs to another workspace.")}</EmptyState></div>
  );

  const rows = [
    [t("Hedef", "Destination"), <a href={link.destination} target="_blank" rel="noreferrer" style={{ wordBreak: "break-all" }}>{link.destination}</a>],
    [t("Oluşturuldu", "Created"), formatDateTime(link.createdAt, lang)],
    link.folder && [t("Klasör", "Folder"), <span className="row" style={{ gap: 6 }}><Folder size={14} /> {link.folder}</span>],
    link.tags?.length > 0 && [t("Etiketler", "Tags"), <span className="row wrap" style={{ gap: 4 }}>{link.tags.map((x) => <span key={x} className="tag">{x}</span>)}</span>],
    link.expiresAt && [t("Son kullanma", "Expires"), formatDateTime(link.expiresAt, lang)],
    link.maxClicks && [t("Tıklama limiti", "Click limit"), `${formatNumber(link.clickCount || 0, lang)} / ${formatNumber(link.maxClicks, lang)}`],
    link.hasPassword && [t("Koruma", "Protection"), <span className="row" style={{ gap: 6 }}><Lock size={14} /> {t("Parola gerekli", "Password required")}</span>],
    [t("Yönlendirme", "Redirect"), link.redirectType || 307],
    link.targets && [t("Hedefleme", "Targeting"), [link.targets.ios && "iOS", link.targets.android && "Android", ...(link.targets.geo || []).map((g) => g.country)].filter(Boolean).join(", ")],
    link.og && [t("Sosyal önizleme", "Social preview"), link.og.title || "✓"],
    link.notes && [t("Not", "Notes"), link.notes],
  ].filter(Boolean);

  return (
    <>
      <Link to="/app" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><ArrowLeft size={15} /> {t("Bağlantılar", "Links")}</Link>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <div className="row wrap" style={{ gap: 10 }}><h1 style={{ wordBreak: "break-word" }}>{link.title || link.slug}</h1><StatusBadge link={link} /></div>
          <p className="mono" style={{ marginTop: 6 }}>{link.shortUrl}</p>
        </div>
        <div className="page-actions">
          <a className="btn btn-secondary" href={link.shortUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> {t("Aç", "Open")}</a>
          <Link className="btn btn-secondary" to={`/app/qr?link=${encodeURIComponent(link.id)}`}><QrCode size={15} /> QR</Link>
          {canEdit && link.status !== "disabled" && <Button icon={link.status === "paused" ? Play : Pause} onClick={async () => { try { await update(link.id, { status: link.status === "paused" ? "active" : "paused" }); } catch (e) { toast.error(e.message); } }}>{link.status === "paused" ? t("Yayına al", "Resume") : t("Duraklat", "Pause")}</Button>}
          {canEdit && <Button icon={Pencil} variant="primary" onClick={() => editor.openEdit(link)} disabled={link.status === "disabled"}>{t("Düzenle", "Edit")}</Button>}
        </div>
      </div>

      {link.status === "disabled" && <div style={{ marginBottom: 16 }}><Alert tone="danger">{t("Bu bağlantı kötüye kullanım bildirimi nedeniyle devre dışı bırakıldı.", "This link was disabled following an abuse report.")}</Alert></div>}

      <div className="qr-layout">
        <div className="stack" style={{ gap: 16 }}>
          <div className="row between wrap"><h2 style={{ fontSize: 15 }}>{t("Performans", "Performance")}</h2><RangePicker days={Math.min(days, max)} setDays={setDays} max={max} /></div>
          <RetentionNote max={max} />
          <Insights params={{ id: link.id, days: Math.min(days, max) }} />
        </div>
        <div className="stack" style={{ gap: 16 }}>
          <div className="card card-pad stack">
            <CopyField value={link.shortUrl} />
            <div className="row" style={{ justifyContent: "center", padding: "6px 0" }}><QrPreview value={`${link.shortUrl}?qr=1`} size={168} /></div>
            <Link to={`/app/qr?link=${encodeURIComponent(link.id)}`} className="btn btn-secondary btn-block"><QrCode size={15} /> {t("QR kodunu özelleştir", "Customise QR code")}</Link>
          </div>
          <div className="card">
            <div className="card-head"><h2>{t("Ayrıntılar", "Details")}</h2></div>
            <dl style={{ padding: "6px 20px 14px", margin: 0 }}>
              {rows.map(([k, v]) => <div key={k} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 13.5 }}><dt className="muted">{k}</dt><dd style={{ margin: 0, minWidth: 0 }}>{v}</dd></div>)}
            </dl>
          </div>
          {canEdit && (
            <div className="card card-pad">
              <h2 style={{ fontSize: 14, marginBottom: 6 }}>{t("Tehlikeli bölge", "Danger zone")}</h2>
              <p className="hint" style={{ marginBottom: 12 }}>{t("Silinen bağlantı geri getirilemez; basılı QR kodları çalışmaz.", "A deleted link cannot be restored; printed QR codes stop working.")}</p>
              {confirm ? (
                <div className="row wrap"><Button variant="danger" size="sm" onClick={async () => { try { await remove(link.id); toast.success(t("Silindi", "Deleted")); navigate("/app"); } catch (e) { toast.error(e.message); } }}>{t("Evet, sil", "Yes, delete")}</Button><Button size="sm" onClick={() => setConfirm(false)}>{t("Vazgeç", "Cancel")}</Button></div>
              ) : <Button variant="danger-ghost" size="sm" icon={Trash2} onClick={() => setConfirm(true)}>{t("Bağlantıyı sil", "Delete link")}</Button>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
