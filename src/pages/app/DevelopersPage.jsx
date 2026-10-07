import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BookOpen, KeyRound, Plus, Trash2, Webhook, Send, Eye, EyeOff } from "../../ui/icons";
import { Alert, Badge, Button, CopyField, EmptyState, Field, Input, Modal, Select, Switch, UpgradeNote } from "../../ui";
import { api } from "../../lib/api";
import { formatDateTime, timeAgo } from "../../lib/format";
import { useI18n } from "../../lib/i18n";
import { Link, useQueryState } from "../../lib/router";
import { usePlan } from "../../state/plan";
import { useToast } from "../../state/toast";
import { useConfirm } from "../../ui/Confirm";

function Keys() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const { can, atLeast, me } = usePlan();
  const [keys, setKeys] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("editor");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.keys.list().then((d) => setKeys(d.keys)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load, me?.workspace?.id]);

  const create = async () => {
    setBusy(true);
    try { const res = await api.keys.create(name || "API", role); setSecret(res.key); setOpen(false); setName(""); load(); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="card">
      <div className="card-head"><div><h2>{t("API anahtarları", "API keys")}</h2><p>{t("REST API'ye programatik erişim. Anahtar yalnızca bir kez gösterilir.", "Programmatic access to the REST API. A key is shown only once.")}</p></div>
        <Button variant="primary" size="sm" icon={Plus} disabled={!can("api") || !atLeast("admin")} onClick={() => setOpen(true)}>{t("Anahtar oluştur", "Create key")}</Button></div>
      {!can("api") && <div style={{ padding: 16 }}><UpgradeNote>{t("API erişimi Pro ve üzeri paketlerde.", "API access is available on Pro and above.")}</UpgradeNote></div>}
      {error && <div style={{ padding: 16 }}><Alert tone="danger" icon={AlertCircle}>{error}</Alert></div>}
      {keys?.length === 0 && can("api") && <EmptyState icon={KeyRound} title={t("Henüz anahtar yok", "No keys yet")}>{t("Bağlantıları kendi uygulamanızdan oluşturmak için bir anahtar üretin.", "Create a key to manage links from your own application.")}</EmptyState>}
      {keys?.map((k) => (
        <div className="list-row" key={k.id}>
          <KeyRound size={18} color="var(--text-3)" aria-hidden />
          <div className="grow"><div className="title">{k.name}</div><div className="sub"><span className="mono">{k.prefix}…</span> · {k.role === "viewer" ? t("salt okunur", "read-only") : t("okuma/yazma", "read/write")} · {k.lastUsedAt ? t("son kullanım {x}", "last used {x}", { x: timeAgo(k.lastUsedAt, lang) }) : t("hiç kullanılmadı", "never used")}</div></div>
          <Button size="sm" variant="danger-ghost" icon={Trash2} disabled={!atLeast("admin")} onClick={async () => { if (!(await confirm({ title: t("Anahtar iptal edilsin mi?", "Revoke this key?"), body: t("Bu anahtarı kullanan uygulamalar çalışmayı durdurur.", "Applications using it will stop working."), confirmLabel: t("İptal et", "Revoke"), danger: true }))) return; try { await api.keys.revoke(k.id); load(); toast.success(t("Anahtar iptal edildi", "Key revoked")); } catch (e) { toast.error(e.message); } }}>{t("İptal et", "Revoke")}</Button>
        </div>
      ))}
      <Modal open={open} onClose={() => setOpen(false)} title={t("API anahtarı oluştur", "Create API key")} footer={<><Button onClick={() => setOpen(false)}>{t("Vazgeç", "Cancel")}</Button><Button variant="primary" loading={busy} onClick={create}>{t("Oluştur", "Create")}</Button></>}>
        <div className="stack">
          <Field label={t("Ad", "Name")} htmlFor="key-name"><Input id="key-name" data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Örn. Üretim sunucusu", "e.g. Production server")} maxLength={60} /></Field>
          <Field label={t("İzin", "Permission")} htmlFor="key-role"><Select id="key-role" value={role} onChange={(e) => setRole(e.target.value)}><option value="editor">{t("Okuma ve yazma", "Read & write")}</option><option value="viewer">{t("Salt okunur", "Read-only")}</option></Select></Field>
        </div>
      </Modal>
      <Modal open={Boolean(secret)} onClose={() => setSecret("")} title={t("Anahtarınızı şimdi kopyalayın", "Copy your key now")} subtitle={t("Güvenlik nedeniyle bir daha gösterilmez.", "For security it will not be shown again.")} footer={<Button variant="primary" onClick={() => setSecret("")}>{t("Kopyaladım", "I've copied it")}</Button>}>
        <div className="stack"><CopyField value={secret} /><Alert tone="warning">{t("Anahtarı gizli tutun; kaynak koduna veya istemci uygulamalarına koymayın.", "Keep it secret; never put it in source code or client-side apps.")}</Alert></div>
      </Modal>
    </div>
  );
}

function Hooks() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const { can, atLeast, me } = usePlan();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState(["link.created", "link.clicked"]);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.webhooks.list().then(setData).catch((e) => { if (e.code !== "plan_required") setError(e.message); setData({ webhooks: [], events: [] }); }), []);
  useEffect(() => { load(); }, [load, me?.workspace?.id]);

  const create = async () => {
    setBusy(true); setError("");
    try { const res = await api.webhooks.create({ url, events }); setSecret(res.secret); setOpen(false); setUrl(""); load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="card">
      <div className="card-head"><div><h2>Webhooks</h2><p>{t("Olaylar gerçekleştiğinde sunucunuza imzalı HTTPS isteği gönderilir.", "We send signed HTTPS requests to your server when events happen.")}</p></div>
        <Button variant="primary" size="sm" icon={Plus} disabled={!can("webhooks") || !atLeast("admin")} onClick={() => { setError(""); setOpen(true); }}>{t("Webhook ekle", "Add webhook")}</Button></div>
      {!can("webhooks") && <div style={{ padding: 16 }}><UpgradeNote>{t("Webhook'lar Pro ve üzeri paketlerde.", "Webhooks are available on Pro and above.")}</UpgradeNote></div>}
      {data?.webhooks.length === 0 && can("webhooks") && <EmptyState icon={Webhook} title={t("Henüz webhook yok", "No webhooks yet")}>{t("Tıklamaları ve bağlantı değişikliklerini kendi sistemlerinize aktarın.", "Stream clicks and link changes into your own systems.")}</EmptyState>}
      {data?.webhooks.map((h) => (
        <div className="list-row" key={h.id}>
          <Webhook size={18} color="var(--text-3)" aria-hidden />
          <div className="grow"><div className="title mono truncate" style={{ fontSize: 13.5 }}>{h.url}</div>
            <div className="sub">{h.events.join(", ")} · {h.lastDelivery ? <>{t("son teslimat", "last delivery")}: <Badge tone={h.lastDelivery.status >= 200 && h.lastDelivery.status < 300 ? "success" : "danger"}>{h.lastDelivery.status || "ERR"}</Badge> {timeAgo(h.lastDelivery.at, lang)}</> : t("henüz teslimat yok", "no deliveries yet")}</div></div>
          <Switch checked={h.active} label={t("Etkin", "Active")} disabled={!atLeast("admin")} onChange={async (v) => { try { await api.webhooks.update(h.id, { active: v }); load(); } catch (e) { toast.error(e.message); } }} />
          <Button size="sm" icon={Send} onClick={async () => { try { const r = await api.webhooks.test(h.id); r.ok ? toast.success(t("Test başarılı ({s})", "Test succeeded ({s})", { s: r.status })) : toast.error(t("Sunucunuz {s} döndürdü", "Your server returned {s}", { s: r.status || "ERR" })); } catch (e) { toast.error(e.message); } }}>{t("Test", "Test")}</Button>
          <Button size="sm" variant="danger-ghost" icon={Trash2} disabled={!atLeast("admin")} aria-label={t("Sil", "Delete")} onClick={async () => { if (!(await confirm({ title: t("Webhook silinsin mi?", "Delete this webhook?"), body: h.url, confirmLabel: t("Sil", "Delete"), danger: true }))) return; try { await api.webhooks.remove(h.id); load(); } catch (e) { toast.error(e.message); } }} />
        </div>
      ))}
      <Modal open={open} onClose={() => setOpen(false)} title={t("Webhook ekle", "Add webhook")} footer={<><Button onClick={() => setOpen(false)}>{t("Vazgeç", "Cancel")}</Button><Button variant="primary" loading={busy} onClick={create}>{t("Ekle", "Add")}</Button></>}>
        <div className="stack">
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label={t("Uç nokta URL", "Endpoint URL")} htmlFor="wh-url" hint={t("https ile başlamalı.", "Must start with https.")}><Input id="wh-url" data-autofocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.sirketiniz.com/loss-webhook" /></Field>
          <fieldset style={{ border: 0, padding: 0 }}><legend className="label" style={{ marginBottom: 8 }}>{t("Olaylar", "Events")}</legend>
            {(data?.events?.length ? data.events : ["link.created", "link.updated", "link.deleted", "link.clicked"]).map((ev) => (
              <label key={ev} className="row" style={{ padding: "5px 0", gap: 10 }}><input type="checkbox" className="check" checked={events.includes(ev)} onChange={(e) => setEvents((l) => (e.target.checked ? [...l, ev] : l.filter((x) => x !== ev)))} /> <code>{ev}</code></label>
            ))}
          </fieldset>
        </div>
      </Modal>
      <Modal open={Boolean(secret)} onClose={() => setSecret("")} title={t("İmza anahtarı", "Signing secret")} subtitle={t("Bu anahtarla isteklerin Loss'tan geldiğini doğrularsınız. Bir daha gösterilmez.", "Use it to verify requests come from Loss. It will not be shown again.")} footer={<Button variant="primary" onClick={() => setSecret("")}>{t("Kopyaladım", "I've copied it")}</Button>}>
        <CopyField value={secret} />
      </Modal>
    </div>
  );
}

export default function DevelopersPage() {
  const { t } = useI18n();
  const [tab, setTab] = useQueryState("tab", "keys");
  return (
    <>
      <div className="page-head">
        <div><h1>{t("Geliştirici", "Developers")}</h1><p>{t("Loss'u kendi ürününüze ve iş akışlarınıza bağlayın.", "Connect Loss to your product and workflows.")}</p></div>
        <div className="page-actions"><Link to="/developers" className="btn btn-secondary"><BookOpen size={15} /> {t("API dokümantasyonu", "API documentation")}</Link></div>
      </div>
      <div className="tabs" role="tablist" style={{ marginBottom: 16 }}>
        <button role="tab" className="tab" aria-selected={tab === "keys"} onClick={() => setTab("keys")}>{t("API anahtarları", "API keys")}</button>
        <button role="tab" className="tab" aria-selected={tab === "hooks"} onClick={() => setTab("hooks")}>Webhooks</button>
      </div>
      {tab === "keys" ? <Keys /> : <Hooks />}
    </>
  );
}
