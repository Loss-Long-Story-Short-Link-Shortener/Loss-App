import { useMemo, useRef, useState } from "react";
import { Check, AlertCircle, BarChart3, Copy, Download, ExternalLink, Folder, Link2, Lock, MoreHorizontal, Pause, Pencil, Play, Plus, QrCode, RefreshCw, Search, Trash2, Upload, Clock, Copy as Dup, Tag, X } from "../../ui/icons";
import { Globe, Users } from "../../ui/icons";
import { Alert, Badge, Button, EmptyState, Field, Input, Menu, MenuItem, Modal, Select, Skeleton, UpgradeNote } from "../../ui";
import { copyText, downloadFile, formatDate, formatNumber, hostOf, isValidUrl, normalizeUrl, parseCsv, timeAgo, toCsv, toMillis } from "../../lib/format";
import { useI18n } from "../../lib/i18n";
import { Link, useQueryState, useRouter } from "../../lib/router";
import { api } from "../../lib/api";
import { CountUp } from "../../ui/motion";
import { useAuth } from "../../state/auth";
import { useLinks } from "../../state/links";
import { usePlan } from "../../state/plan";
import { useToast } from "../../state/toast";
import { useEditor } from "./AppShell";

const PAGE = 50;

export function StatusBadge({ link }) {
  const { t } = useI18n();
  const expired = link.expiresAt && toMillis(link.expiresAt) < Date.now();
  const limited = link.maxClicks && (link.clickCount || 0) >= link.maxClicks;
  if (link.status === "disabled") return <Badge tone="danger" dot>{t("Devre dışı", "Disabled")}</Badge>;
  if (expired) return <Badge tone="warning" dot>{t("Süresi doldu", "Expired")}</Badge>;
  if (limited) return <Badge tone="warning" dot>{t("Limit doldu", "Limit reached")}</Badge>;
  if (link.status === "paused") return <Badge dot>{t("Duraklatıldı", "Paused")}</Badge>;
  return <Badge tone="success" dot>{t("Yayında", "Live")}</Badge>;
}

export function Favicon({ link }) {
  const letter = (hostOf(link.destination)[0] || link.slug?.[0] || "?").toUpperCase();
  return <span className="favicon" aria-hidden>{letter}</span>;
}

function DeleteDialog({ links, onClose, onConfirm }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  if (!links.length) return null;
  const many = links.length > 1;
  return (
    <Modal open onClose={onClose} title={many ? t("{n} bağlantı silinsin mi?", "Delete {n} links?", { n: links.length }) : t("Bağlantı silinsin mi?", "Delete this link?")}
      footer={<><Button onClick={onClose}>{t("Vazgeç", "Cancel")}</Button><Button variant="danger" loading={busy} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}>{t("Sil", "Delete")}</Button></>}>
      <p style={{ color: "var(--text-2)" }}>
        {many ? t("Seçili bağlantılar ve tıklama geçmişleri kalıcı olarak silinir.", "The selected links and their click history will be permanently deleted.")
          : t("Bu bağlantı kalıcı olarak silinir; kısa adresi artık çalışmaz ve basılı QR kodları hata verir. Bu işlem geri alınamaz.", "This link will be permanently deleted. Its short address stops working, including any printed QR codes. This cannot be undone.")}
      </p>
      {!many && <p className="mono" style={{ marginTop: 10, wordBreak: "break-all" }}>{links[0].shortUrl}</p>}
    </Modal>
  );
}

function ImportModal({ open, onClose }) {
  const { t } = useI18n();
  const toast = useToast();
  const { reload } = useLinks();
  const { can } = usePlan();
  const [rows, setRows] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const onFile = async (file) => {
    setError(""); setResult(null);
    if (!file) return;
    if (file.size > 1_000_000) { setError(t("Dosya 1 MB'dan büyük olamaz.", "The file must be under 1 MB.")); return; }
    const table = parseCsv(await file.text());
    if (table.length < 2) { setError(t("Dosyada veri satırı bulunamadı.", "No data rows found.")); return; }
    const head = table[0].map((h) => h.trim().toLowerCase());
    const col = (...names) => head.findIndex((h) => names.includes(h));
    const di = col("destination", "url", "hedef", "hedef url");
    if (di < 0) { setError(t('"destination" (veya "url") sütunu gerekli.', 'A "destination" (or "url") column is required.')); return; }
    const si = col("slug", "short", "kısa ad"), ti = col("title", "başlık"), gi = col("tags", "etiketler"), fi = col("folder", "klasör");
    const parsed = table.slice(1).map((r) => ({
      destination: normalizeUrl(r[di] || ""), ...(si >= 0 && r[si] ? { slug: r[si].trim() } : {}), ...(ti >= 0 && r[ti] ? { title: r[ti] } : {}),
      ...(gi >= 0 && r[gi] ? { tags: r[gi].split(/[|,]/).map((x) => x.trim()).filter(Boolean) } : {}), ...(fi >= 0 && r[fi] ? { folder: r[fi] } : {}),
    })).filter((r) => r.destination);
    if (parsed.length > 1000) { setError(t("En fazla 1000 satır içe aktarılabilir.", "At most 1000 rows can be imported.")); return; }
    setRows(parsed);
  };

  const run = async () => {
    setBusy(true); setError("");
    const results = [];
    try {
      for (let i = 0; i < rows.length; i += 200) {
        const res = await api.links.import(rows.slice(i, i + 200));
        results.push(...res.results.map((r) => ({ ...r, row: r.row + i })));
      }
    } catch (e) {
      setError(e.message);
    }
    setResult(results);
    await reload();
    setBusy(false);
    const ok = results.filter((r) => r.ok).length;
    if (ok) toast.success(t("{n} bağlantı içe aktarıldı", "{n} links imported", { n: ok }));
  };

  const failed = result?.filter((r) => !r.ok) || [];
  return (
    <Modal open={open} onClose={() => { setRows([]); setResult(null); setError(""); onClose(); }} title={t("CSV'den içe aktar", "Import from CSV")} subtitle={t("İlk satır sütun adlarını içermelidir.", "The first row must contain column names.")}
      footer={<><Button onClick={onClose}>{t("Kapat", "Close")}</Button>{!result && <Button variant="primary" loading={busy} disabled={!rows.length || !can("importExport")} onClick={run}>{t("{n} satırı içe aktar", "Import {n} rows", { n: rows.length })}</Button>}</>}>
      <div className="stack">
        {!can("importExport") && <UpgradeNote>{t("İçe/dışa aktarma Starter ve üzeri paketlerde.", "Import/export is available on Starter and above.")}</UpgradeNote>}
        {error && <Alert tone="danger" icon={AlertCircle}>{error}</Alert>}
        <p className="hint">{t("Sütunlar: destination (zorunlu), slug, title, tags (| ile ayırın), folder.", "Columns: destination (required), slug, title, tags (separate with |), folder.")}</p>
        <Button icon={Download} size="sm" onClick={() => downloadFile("loss-ornek.csv", toCsv([["destination", "slug", "title", "tags", "folder"], ["https://example.com/urun", "urun", "Ürün sayfası", "kampanya|yaz", "Yaz 2026"]]), "text/csv")}>{t("Örnek CSV indir", "Download sample CSV")}</Button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="input" style={{ padding: 6, height: "auto" }} onChange={(e) => onFile(e.target.files?.[0])} aria-label="CSV" />
        {rows.length > 0 && !result && <Alert tone="info">{t("{n} satır hazır.", "{n} rows ready.", { n: rows.length })}</Alert>}
        {result && (
          <>
            <Alert tone={failed.length ? "warning" : "success"}>{t("{ok} başarılı, {bad} hatalı.", "{ok} succeeded, {bad} failed.", { ok: result.length - failed.length, bad: failed.length })}</Alert>
            {failed.length > 0 && <ul className="stack" style={{ gap: 4, maxHeight: 160, overflow: "auto", fontSize: 13 }}>{failed.slice(0, 50).map((r) => <li key={r.row}><strong>{t("Satır", "Row")} {r.row + 1}:</strong> {r.error}</li>)}</ul>}
          </>
        )}
      </div>
    </Modal>
  );
}

export default function LinksPage() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { navigate } = useRouter();
  const { links, loading, error, reload, update, remove, bulk } = useLinks();
  const { isDemo } = useAuth();
  const { atLeast, can, linkUsage } = usePlan();
  const editor = useEditor();

  // Filters live in the URL so a filtered view can be bookmarked and shared.
  const [q, setQ] = useQueryState("q", "");
  const [status, setStatus] = useQueryState("status", "all");
  const [folder, setFolder] = useQueryState("folder", "all");
  const [tag, setTag] = useQueryState("tag", "all");
  const [sort, setSort] = useQueryState("sort", "newest");
  const [visible, setVisible] = useState(PAGE);
  const [selected, setSelected] = useState(() => new Set());
  const [toDelete, setToDelete] = useState([]);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkModal, setBulkModal] = useState(null);
  const [bulkValue, setBulkValue] = useState("");
  const canEdit = atLeast("editor");

  const folders = useMemo(() => [...new Set(links.map((l) => l.folder).filter(Boolean))].sort(), [links]);
  const tags = useMemo(() => [...new Set(links.flatMap((l) => l.tags || []))].sort(), [links]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = links.filter((l) => {
      if (needle && ![l.slug, l.title, l.destination, l.notes, ...(l.tags || [])].some((v) => String(v || "").toLowerCase().includes(needle))) return false;
      if (folder !== "all" && (folder === "none" ? l.folder : l.folder !== folder)) return false;
      if (tag !== "all" && !(l.tags || []).includes(tag)) return false;
      if (status === "active" && l.status !== "active") return false;
      if (status === "paused" && l.status !== "paused") return false;
      if (status === "protected" && !l.hasPassword) return false;
      return true;
    });
    const by = { newest: (a, b) => (toMillis(b.createdAt) || 0) - (toMillis(a.createdAt) || 0), oldest: (a, b) => (toMillis(a.createdAt) || 0) - (toMillis(b.createdAt) || 0), clicks: (a, b) => (b.clickCount || 0) - (a.clickCount || 0), title: (a, b) => (a.title || a.slug).localeCompare(b.title || b.slug) };
    return list.sort(by[sort]);
  }, [links, q, status, folder, tag, sort]);

  const shown = filtered.slice(0, visible);
  const totalClicks = links.reduce((s, l) => s + (l.clickCount || 0), 0);
  const activeCount = links.filter((l) => l.status === "active").length;
  const topLink = [...links].sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0))[0];
  const allSelected = shown.length > 0 && shown.every((l) => selected.has(l.id));

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(shown.map((l) => l.id)));
  const guard = async (fn, ok) => { try { await fn(); if (ok) toast.success(ok); } catch (e) { toast.error(e.message); } };

  const togglePause = (l) => guard(() => update(l.id, { status: l.status === "paused" ? "active" : "paused" }), l.status === "paused" ? t("Bağlantı yayında", "Link is live") : t("Bağlantı duraklatıldı", "Link paused"));
  const doBulk = (action, extra, msg) => guard(async () => { const res = await bulk(action, [...selected], extra); setSelected(new Set()); if (res.succeeded < selected.size) toast.error(t("{n} bağlantı işlenemedi", "{n} links could not be processed", { n: selected.size - res.succeeded })); }, msg);

  const exportCsv = () => {
    const rows = [["short_url", "destination", "title", "tags", "folder", "status", "clicks", "created"], ...filtered.map((l) => [l.shortUrl, l.destination, l.title, (l.tags || []).join("|"), l.folder || "", l.status, l.clickCount || 0, new Date(toMillis(l.createdAt) || 0).toISOString()])];
    downloadFile(`loss-links-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows), "text/csv");
  };

  const rowMenu = (l) => (
    <Menu label={t("Bağlantı işlemleri", "Link actions")} trigger={({ toggle: tg, props }) => <button type="button" className="icon-btn" onClick={tg} {...props} aria-label={`${t("İşlemler", "Actions")}: ${l.title || l.slug}`}><MoreHorizontal size={17} /></button>}>
      <MenuItem icon={Copy} onClick={async () => { (await copyText(l.shortUrl)) ? toast.success(t("Panoya kopyalandı", "Copied to clipboard")) : toast.error(t("Kopyalanamadı", "Could not copy")); }}>{t("Kısa bağlantıyı kopyala", "Copy short link")}</MenuItem>
      <a className="menu-item" href={l.shortUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> {t("Bağlantıyı aç", "Open link")}</a>
      <MenuItem icon={BarChart3} onClick={() => navigate(`/app/links/${encodeURIComponent(l.id)}`)}>{t("İstatistikler", "Statistics")}</MenuItem>
      <MenuItem icon={QrCode} onClick={() => navigate(`/app/qr?link=${encodeURIComponent(l.id)}`)}>{t("QR kodu", "QR code")}</MenuItem>
      {canEdit && <>
        <div className="menu-sep" />
        <MenuItem icon={Pencil} onClick={() => editor.openEdit(l)} disabled={l.status === "disabled"}>{t("Düzenle", "Edit")}</MenuItem>
        <MenuItem icon={Dup} onClick={() => editor.openNew({ destination: l.destination })}>{t("Çoğalt", "Duplicate")}</MenuItem>
        {l.status !== "disabled" && <MenuItem icon={l.status === "paused" ? Play : Pause} onClick={() => togglePause(l)}>{l.status === "paused" ? t("Yayına al", "Resume") : t("Duraklat", "Pause")}</MenuItem>}
        <div className="menu-sep" />
        <MenuItem icon={Trash2} danger onClick={() => setToDelete([l])}>{t("Sil", "Delete")}</MenuItem>
      </>}
    </Menu>
  );

  const meta = (l) => (
    <>
      {l.hasPassword && <span title={t("Parola korumalı", "Password protected")}><Lock size={13} aria-label={t("Parola korumalı", "Password protected")} /></span>}
      {l.expiresAt && <span title={t("Son kullanma tarihi var", "Has an expiry date")}><Clock size={13} aria-label={t("Son kullanma tarihi var", "Has an expiry date")} /></span>}
      {l.domain && l.domain !== "loss.tr" && <Badge>{l.domain}</Badge>}
    </>
  );

  const title = (l) => (
    <div className="link-main">
      <Favicon link={l} />
      <div className="link-text">
        <Link to={`/app/links/${encodeURIComponent(l.id)}`} className="link-title truncate" style={{ maxWidth: 420 }}>{l.title || l.slug}</Link>
        <span className="link-short"><a href={l.shortUrl} target="_blank" rel="noreferrer" className="truncate">{l.shortUrl.replace(/^https?:\/\//, "")}</a></span>
        <span className="link-dest truncate" title={l.destination}>→ {l.destination}</span>
        {(l.tags?.length > 0 || l.folder) && (
          <div className="link-tags">
            {l.folder && <span className="tag"><Folder size={11} style={{ marginRight: 4 }} aria-hidden />{l.folder}</span>}
            {(l.tags || []).slice(0, 4).map((x) => <span key={x} className="tag">{x}</span>)}
            {(l.tags || []).length > 4 && <span className="tag">+{l.tags.length - 4}</span>}
          </div>
        )}
      </div>
    </div>
  );

  const firstRun = !loading && !error && links.length === 0;
  const [onboardHidden, setOnboardHidden] = useState(() => { try { return localStorage.getItem("loss_onboard_hidden") === "1"; } catch { return false; } });
  const showOnboard = !loading && !error && links.length > 0 && links.length < 4 && !onboardHidden && canEdit;

  return (
    <>
      <div className="page-head">
        <div><h1>{t("Bağlantılar", "Links")}</h1><p>{t("Kısa bağlantılarınızı oluşturun, düzenleyin ve performanslarını izleyin.", "Create, edit and track your short links.")}</p></div>
        <div className="page-actions">
          <Button icon={Upload} onClick={() => setImportOpen(true)} disabled={!canEdit}>{t("İçe aktar", "Import")}</Button>
          <Button icon={Download} onClick={exportCsv} disabled={!links.length}>{t("Dışa aktar", "Export")}</Button>
          <Button variant="primary" icon={Plus} onClick={() => editor.openNew()} disabled={!canEdit}>{t("Yeni bağlantı", "New link")}</Button>
        </div>
      </div>

      {linkUsage && linkUsage.used >= linkUsage.max && <div style={{ marginBottom: 16 }}><UpgradeNote>{t("Bağlantı kotanız doldu ({n}). Yeni bağlantı için planınızı yükseltin.", "You have reached your link quota ({n}). Upgrade to create more.", { n: linkUsage.max })}</UpgradeNote></div>}

      {showOnboard && (
        <div className="card onboard">
          <div className="card-head"><div><h2>{t("Başlarken", "Getting started")}</h2><p>{t("Loss'tan en iyi şekilde yararlanmak için birkaç adım.", "A few steps to get the most out of Loss.")}</p></div>
            <Button size="sm" variant="ghost" onClick={() => { setOnboardHidden(true); try { localStorage.setItem("loss_onboard_hidden", "1"); } catch { /* ignore */ } }}>{t("Gizle", "Dismiss")}</Button></div>
          <ol>
            <li className="done"><span className="step-title"><Check size={16} color="var(--success)" aria-hidden /> {t("İlk bağlantını oluştur", "Create your first link")}</span><p>{t("Tamamlandı. Hedefi dilediğiniz an değiştirebilirsiniz.", "Done. You can change the destination any time.")}</p></li>
            <li><span className="step-title"><QrCode size={16} aria-hidden /> {t("QR kodu indir", "Download a QR code")}</span><p>{t("Baskıya hazır SVG veya PNG; taramalar ayrı raporlanır.", "Print-ready SVG or PNG; scans are reported separately.")}</p><Link className="btn btn-secondary btn-sm" to="/app/qr">{t("QR stüdyosu", "QR studio")}</Link></li>
            <li><span className="step-title"><Globe size={16} aria-hidden /> {t("Kendi alan adını bağla", "Connect your domain")}</span><p>{t("go.markaniz.com gibi markalı bağlantılar güven verir.", "Branded links like go.brand.com build trust.")}</p><Link className="btn btn-secondary btn-sm" to="/app/domains">{t("Alan adları", "Domains")}</Link></li>
            <li><span className="step-title"><Users size={16} aria-hidden /> {t("Takımını davet et", "Invite your team")}</span><p>{t("Rollerle ortak çalışma alanı oluşturun.", "Create a shared workspace with roles.")}</p><Link className="btn btn-secondary btn-sm" to="/app/team">{t("Takım", "Team")}</Link></li>
          </ol>
        </div>
      )}

      {!firstRun && (
        <div className="stats" style={{ marginBottom: 20 }}>
          <div className="stat"><div className="stat-label">{t("Toplam bağlantı", "Total links")}</div><div className="stat-value"><CountUp value={links.length} /></div><div className="stat-sub">{t("{n} yayında", "{n} live", { n: activeCount })}</div></div>
          <div className="stat"><div className="stat-label">{t("Toplam tıklama", "Total clicks")}</div><div className="stat-value"><CountUp value={totalClicks} /></div><div className="stat-sub">{t("tüm zamanlar", "all time")}</div></div>
          <div className="stat"><div className="stat-label">{t("En çok tıklanan", "Top link")}</div><div className="stat-value truncate" style={{ fontSize: 17, marginTop: 10 }}>{topLink?.clickCount ? `/${topLink.slug}` : "-"}</div><div className="stat-sub">{topLink?.clickCount ? t("{n} tıklama", "{n} clicks", { n: formatNumber(topLink.clickCount, lang) }) : t("Henüz tıklama yok", "No clicks yet")}</div></div>
          <div className="stat"><div className="stat-label">{t("Klasör / etiket", "Folders / tags")}</div><div className="stat-value">{folders.length} / {tags.length}</div><div className="stat-sub">{t("düzen için", "for organising")}</div></div>
        </div>
      )}

      <div className="card">
        {error && <div style={{ padding: 16 }}><Alert tone="danger" icon={AlertCircle} action={<Button size="sm" icon={RefreshCw} onClick={reload}>{t("Tekrar dene", "Retry")}</Button>}>{error}</Alert></div>}

        {!firstRun && (
          <div className="toolbar">
            <div className="input-icon"><Search size={15} aria-hidden /><Input type="search" aria-label={t("Bağlantı ara", "Search links")} placeholder={t("Başlık, kısa ad, hedef veya etiket ara…", "Search title, slug, destination or tag…")} autoComplete="off" spellCheck={false} value={q} onChange={(e) => { setQ(e.target.value); setVisible(PAGE); }} /></div>
            <Select aria-label={t("Durum", "Status")} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">{t("Tüm durumlar", "All statuses")}</option><option value="active">{t("Yayında", "Live")}</option><option value="paused">{t("Duraklatılmış", "Paused")}</option><option value="protected">{t("Parola korumalı", "Password protected")}</option>
            </Select>
            {folders.length > 0 && <Select aria-label={t("Klasör", "Folder")} value={folder} onChange={(e) => setFolder(e.target.value)}><option value="all">{t("Tüm klasörler", "All folders")}</option><option value="none">{t("Klasörsüz", "No folder")}</option>{folders.map((f) => <option key={f} value={f}>{f}</option>)}</Select>}
            {tags.length > 0 && <Select aria-label={t("Etiket", "Tag")} value={tag} onChange={(e) => setTag(e.target.value)}><option value="all">{t("Tüm etiketler", "All tags")}</option>{tags.map((x) => <option key={x} value={x}>{x}</option>)}</Select>}
            <Select aria-label={t("Sırala", "Sort")} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">{t("En yeni", "Newest")}</option><option value="oldest">{t("En eski", "Oldest")}</option><option value="clicks">{t("En çok tıklanan", "Most clicks")}</option><option value="title">{t("Başlığa göre", "Title A-Z")}</option>
            </Select>
          </div>
        )}

        {selected.size > 0 && (
          <div className="bulkbar" role="region" aria-label={t("Toplu işlemler", "Bulk actions")}>
            <span>{t("{n} seçili", "{n} selected", { n: selected.size })}</span>
            <Button size="sm" icon={Pause} onClick={() => doBulk("pause", {}, t("Seçili bağlantılar duraklatıldı", "Selected links paused"))}>{t("Duraklat", "Pause")}</Button>
            <Button size="sm" icon={Play} onClick={() => doBulk("resume", {}, t("Seçili bağlantılar yayında", "Selected links are live"))}>{t("Yayına al", "Resume")}</Button>
            <Button size="sm" icon={Tag} onClick={() => { setBulkValue(""); setBulkModal("set_tags"); }}>{t("Etiketle", "Tag")}</Button>
            <Button size="sm" icon={Folder} onClick={() => { setBulkValue(""); setBulkModal("set_folder"); }}>{t("Klasöre taşı", "Move to folder")}</Button>
            <Button size="sm" variant="danger-ghost" icon={Trash2} onClick={() => setToDelete(links.filter((l) => selected.has(l.id)))}>{t("Sil", "Delete")}</Button>
            <Button size="sm" variant="ghost" icon={X} onClick={() => setSelected(new Set())}>{t("Seçimi kaldır", "Clear")}</Button>
          </div>
        )}

        {loading && links.length === 0 && (
          <div style={{ padding: 20 }} role="status" aria-label={t("Yükleniyor", "Loading")}>
            {[0, 1, 2, 3].map((i) => <div key={i} className="row" style={{ padding: "12px 0", gap: 14 }}><Skeleton w={32} h={32} /><div style={{ flex: 1 }} className="stack"><Skeleton w="40%" /><Skeleton w="65%" h={11} /></div></div>)}
          </div>
        )}

        {firstRun && (
          <EmptyState icon={Link2} title={t("İlk bağlantınızı oluşturun", "Create your first link")}
            action={<div className="row wrap" style={{ justifyContent: "center" }}><Button variant="primary" icon={Plus} onClick={() => editor.openNew()} disabled={!canEdit}>{t("Bağlantı oluştur", "Create link")}</Button><Button icon={Upload} onClick={() => setImportOpen(true)} disabled={!canEdit}>{t("CSV'den içe aktar", "Import CSV")}</Button></div>}>
            {t("Uzun bir adresi yapıştırın, kısa ve takip edilebilir bir bağlantı alın. QR kod, analiz ve UTM etiketleri hazır gelir.", "Paste a long URL and get a short, trackable link. QR codes, analytics and UTM tags come built in.")}
          </EmptyState>
        )}

        {!loading && links.length > 0 && filtered.length === 0 && (
          <EmptyState icon={Search} title={t("Eşleşen bağlantı yok", "No matching links")} action={<Button onClick={() => { setQ(""); setStatus("all"); setFolder("all"); setTag("all"); }}>{t("Filtreleri temizle", "Clear filters")}</Button>}>{t("Aramanızı veya filtrelerinizi değiştirmeyi deneyin.", "Try a different search or filters.")}</EmptyState>
        )}

        {shown.length > 0 && (
          <>
            <div className="table-wrap link-table">
              <table className="table">
                <thead><tr>
                  <th style={{ width: 40 }}><input type="checkbox" className="check" checked={allSelected} onChange={toggleAll} aria-label={t("Tümünü seç", "Select all")} disabled={!canEdit} /></th>
                  <th>{t("Bağlantı", "Link")}</th><th className="num">{t("Tıklama", "Clicks")}</th><th>{t("Durum", "Status")}</th><th>{t("Oluşturuldu", "Created")}</th><th><span className="sr-only">{t("İşlemler", "Actions")}</span></th>
                </tr></thead>
                <tbody>
                  {shown.map((l) => (
                    <tr key={l.id} className={selected.has(l.id) ? "selected" : ""}>
                      <td><input type="checkbox" className="check" checked={selected.has(l.id)} onChange={() => toggle(l.id)} aria-label={`${t("Seç", "Select")}: ${l.title || l.slug}`} disabled={!canEdit} /></td>
                      <td style={{ maxWidth: 520 }}>{title(l)}</td>
                      <td className="num"><strong>{formatNumber(l.clickCount || 0, lang)}</strong></td>
                      <td><div className="row" style={{ gap: 8 }}><StatusBadge link={l} />{meta(l)}</div></td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--text-3)" }}>{formatDate(l.createdAt, lang)}</td>
                      <td><div className="row-actions">{rowMenu(l)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="link-cards">
              {shown.map((l) => (
                <div className="link-card" key={l.id}>
                  <input type="checkbox" className="check" checked={selected.has(l.id)} onChange={() => toggle(l.id)} aria-label={`${t("Seç", "Select")}: ${l.title || l.slug}`} disabled={!canEdit} style={{ marginTop: 8 }} />
                  <div className="link-text">{title(l)}<div className="link-card-meta"><strong style={{ color: "var(--text)" }}>{formatNumber(l.clickCount || 0, lang)} {t("tık", "clicks")}</strong><StatusBadge link={l} />{meta(l)}</div></div>
                  {rowMenu(l)}
                </div>
              ))}
            </div>
            <div className="list-footer">
              <span>{t("{n} bağlantıdan {m} tanesi gösteriliyor", "Showing {m} of {n} links", { n: filtered.length, m: shown.length })}</span>
              {filtered.length > shown.length && <Button size="sm" onClick={() => setVisible((v) => v + PAGE)}>{t("Daha fazla göster", "Show more")}</Button>}
            </div>
          </>
        )}
      </div>

      <DeleteDialog links={toDelete} onClose={() => setToDelete([])} onConfirm={async () => {
        try {
          if (toDelete.length === 1) await remove(toDelete[0].id);
          else await bulk("delete", toDelete.map((l) => l.id));
          setSelected(new Set()); setToDelete([]); toast.success(t("Silindi", "Deleted"));
        } catch (e) { toast.error(e.message); }
      }} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <Modal open={Boolean(bulkModal)} onClose={() => setBulkModal(null)} title={bulkModal === "set_tags" ? t("Etiketleri ayarla", "Set tags") : t("Klasöre taşı", "Move to folder")} subtitle={t("{n} bağlantı etkilenecek.", "{n} links will be changed.", { n: selected.size })}
        footer={<><Button onClick={() => setBulkModal(null)}>{t("Vazgeç", "Cancel")}</Button><Button variant="primary" onClick={async () => { const m = bulkModal; setBulkModal(null); await doBulk(m, m === "set_tags" ? { tags: bulkValue.split(",").map((x) => x.trim()).filter(Boolean) } : { folder: bulkValue.trim() }, t("Güncellendi", "Updated")); }}>{t("Uygula", "Apply")}</Button></>}>
        <Field label={bulkModal === "set_tags" ? t("Etiketler (virgülle)", "Tags (comma-separated)") : t("Klasör adı", "Folder name")} hint={t("Mevcut değerlerin yerine geçer. Boş bırakırsanız temizlenir.", "Replaces existing values. Leave empty to clear.")}>
          <Input data-autofocus value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} />
        </Field>
      </Modal>
    </>
  );
}
