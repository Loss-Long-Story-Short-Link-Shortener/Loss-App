import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Mail, Plus, Trash2, Users } from "../../ui/icons";
import { Alert, Badge, Button, CopyField, EmptyState, Field, Input, Modal, Select, UpgradeNote } from "../../ui";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { useI18n } from "../../lib/i18n";
import { useAuth } from "../../state/auth";
import { usePlan } from "../../state/plan";
import { useToast } from "../../state/toast";
import { roleLabel } from "./AppShell";
import { useConfirm } from "../../ui/Confirm";

const ROLE_HELP = {
  viewer: ["Bağlantıları ve analizleri görür.", "Can view links and analytics."],
  editor: ["Bağlantı oluşturur, düzenler, siler.", "Can create, edit and delete links."],
  admin: ["Ayrıca alan adı, API anahtarı, webhook ve üyeleri yönetir.", "Also manages domains, API keys, webhooks and members."],
};

export default function TeamPage() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { user, me, switchWorkspace, refreshMe } = useAuth();
  const { can } = usePlan();
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.team.list().then((d) => setList(d.workspaces)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const personalCan = me?.workspace?.personal ? can("team") : true;
  const create = async () => {
    setBusy(true); setError("");
    try { const { workspace } = await api.team.create(name); setCreating(false); setName(""); await refreshMe(); await load(); switchWorkspace(workspace.id); toast.success(t("Çalışma alanı oluşturuldu", "Workspace created")); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const current = me?.workspace;
  const inTeam = current && !current.personal;

  return (
    <>
      <div className="page-head">
        <div><h1>{t("Takım", "Team")}</h1><p>{t("Ortak çalışma alanları oluşturun, üyeleri rollerle davet edin.", "Create shared workspaces and invite members with roles.")}</p></div>
        <div className="page-actions"><Button variant="primary" icon={Plus} disabled={me?.workspace?.personal && !can("team")} onClick={() => { setError(""); setCreating(true); }}>{t("Çalışma alanı oluştur", "Create workspace")}</Button></div>
      </div>
      {me?.workspace?.personal && !can("team") && <div style={{ marginBottom: 16 }}><UpgradeNote>{t("Takım çalışma alanları Pro (5 üye) ve Agency (25 üye) paketlerinde.", "Team workspaces are available on Pro (5 seats) and Agency (25 seats).")}</UpgradeNote></div>}
      {error && !creating && <Alert tone="danger" icon={AlertCircle}>{error}</Alert>}

      {inTeam && <Members id={current.id} myUid={user.uid} />}

      <div className="section">
        <h2>{t("Çalışma alanlarınız", "Your workspaces")}</h2>
        <div className="card">
          <div className="list-row"><span className="ws-avatar">K</span><div className="grow"><div className="title">{t("Kişisel", "Personal")}</div><div className="sub">{t("Yalnızca siz", "Only you")}</div></div>{current?.personal ? <Badge tone="accent">{t("Etkin", "Active")}</Badge> : <Button size="sm" onClick={() => switchWorkspace("")}>{t("Geç", "Switch")}</Button>}</div>
          {list?.map((w) => (
            <div className="list-row" key={w.id}><span className="ws-avatar">{w.name[0]?.toUpperCase()}</span><div className="grow"><div className="title">{w.name}</div><div className="sub">{roleLabel(w.role, t)} · {w.members} {t("üye", "members")}</div></div>
              {current?.id === w.id ? <Badge tone="accent">{t("Etkin", "Active")}</Badge> : <Button size="sm" onClick={() => switchWorkspace(w.id)}>{t("Geç", "Switch")}</Button>}</div>
          ))}
        </div>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title={t("Çalışma alanı oluştur", "Create workspace")} subtitle={t("Bağlantılar, alan adları ve anahtarlar çalışma alanına aittir.", "Links, domains and keys belong to the workspace.")}
        footer={<><Button onClick={() => setCreating(false)}>{t("Vazgeç", "Cancel")}</Button><Button variant="primary" loading={busy} disabled={name.trim().length < 2} onClick={create}>{t("Oluştur", "Create")}</Button></>}>
        <div className="stack">{error && <Alert tone="danger">{error}</Alert>}<Field label={t("Ad", "Name")} htmlFor="ws-name"><Input id="ws-name" data-autofocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={t("Örn. Pazarlama Ekibi", "e.g. Marketing team")} onKeyDown={(e) => { if (e.key === "Enter" && name.trim().length > 1) create(); }} /></Field></div>
      </Modal>
    </>
  );
}

function Members({ id, myUid }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const { switchWorkspace, refreshMe } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [invite, setInvite] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => api.team.get(id).then(setData).catch((e) => setError(e.message)), [id]);
  useEffect(() => { setData(null); load(); }, [load]);
  if (error) return <Alert tone="danger" icon={AlertCircle}>{error}</Alert>;
  if (!data) return <div className="card card-pad muted" role="status">…</div>;

  const myRole = data.workspace.role;
  const admin = myRole === "admin" || myRole === "owner";
  const send = async () => {
    setBusy(true); setError("");
    try { setInvite(await api.team.invite(id, email, role)); setInviting(false); setEmail(""); load(); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="card">
        <div className="card-head"><div><h2>{data.workspace.name}</h2><p>{data.members.length} / {data.workspace.seatLimit} {t("üye", "seats")}</p></div>
          <Button size="sm" variant="primary" icon={Mail} disabled={!admin} onClick={() => setInviting(true)}>{t("Üye davet et", "Invite member")}</Button></div>
        {data.members.map((m) => (
          <div className="list-row" key={m.uid}>
            <span className="avatar" aria-hidden>{(m.name || m.email || "?")[0].toUpperCase()}</span>
            <div className="grow"><div className="title">{m.name || m.email}{m.uid === myUid && <span className="muted"> ({t("siz", "you")})</span>}</div><div className="sub">{m.email}</div></div>
            {m.role === "owner" || !admin || m.uid === myUid ? <Badge>{roleLabel(m.role, t)}</Badge> : (
              <Select aria-label={t("Rol", "Role")} style={{ width: 150 }} value={m.role} onChange={async (e) => { try { await api.team.setRole(id, m.uid, e.target.value); load(); } catch (er) { toast.error(er.message); } }}>
                <option value="viewer">{roleLabel("viewer", t)}</option><option value="editor">{roleLabel("editor", t)}</option><option value="admin">{roleLabel("admin", t)}</option>
              </Select>
            )}
            {(m.uid === myUid && m.role !== "owner") || (admin && m.role !== "owner" && m.uid !== myUid) ? (
              <Button size="sm" variant="danger-ghost" onClick={async () => { if (!(await confirm({ title: m.uid === myUid ? t("Çalışma alanından ayrılın?", "Leave this workspace?") : t("Üye çıkarılsın mı?", "Remove this member?"), body: m.email, confirmLabel: m.uid === myUid ? t("Ayrıl", "Leave") : t("Çıkar", "Remove"), danger: true }))) return; try { await api.team.removeMember(id, m.uid); if (m.uid === myUid) { switchWorkspace(""); await refreshMe(); } else load(); } catch (e) { toast.error(e.message); } }}>{m.uid === myUid ? t("Ayrıl", "Leave") : t("Çıkar", "Remove")}</Button>
            ) : null}
          </div>
        ))}
      </div>

      {data.invites.length > 0 && (
        <div className="section"><h2>{t("Bekleyen davetler", "Pending invites")}</h2>
          <div className="card">{data.invites.map((i) => (
            <div className="list-row" key={i.token}><Mail size={18} color="var(--text-3)" aria-hidden /><div className="grow"><div className="title">{i.email}</div><div className="sub">{roleLabel(i.role, t)} · {t("son geçerlilik", "expires")} {formatDate(i.expiresAt, lang)}</div></div>
              <Button size="sm" onClick={async () => { await navigator.clipboard?.writeText(i.url); toast.success(t("Davet bağlantısı kopyalandı", "Invite link copied")); }}>{t("Bağlantıyı kopyala", "Copy link")}</Button>
              <Button size="sm" variant="danger-ghost" icon={Trash2} aria-label={t("Daveti iptal et", "Revoke invite")} onClick={async () => { try { await api.team.revokeInvite(id, i.token); load(); } catch (e) { toast.error(e.message); } }} /></div>
          ))}</div></div>
      )}

      {myRole === "owner" && (
        <div className="section"><div className="card card-pad"><h2 style={{ fontSize: 14, marginBottom: 6 }}>{t("Tehlikeli bölge", "Danger zone")}</h2><p className="hint" style={{ marginBottom: 12 }}>{t("Çalışma alanı silinince tüm bağlantılar, alan adları, anahtarlar ve webhook'lar kalıcı olarak silinir.", "Deleting the workspace permanently removes all links, domains, keys and webhooks.")}</p>
          {confirmDelete ? <div className="row wrap"><Button variant="danger" size="sm" onClick={async () => { try { await api.team.remove(id); switchWorkspace(""); await refreshMe(); toast.success(t("Çalışma alanı silindi", "Workspace deleted")); } catch (e) { toast.error(e.message); } }}>{t("Evet, kalıcı olarak sil", "Yes, delete permanently")}</Button><Button size="sm" onClick={() => setConfirmDelete(false)}>{t("Vazgeç", "Cancel")}</Button></div> : <Button size="sm" variant="danger-ghost" icon={Trash2} onClick={() => setConfirmDelete(true)}>{t("Çalışma alanını sil", "Delete workspace")}</Button>}</div></div>
      )}

      <Modal open={inviting} onClose={() => setInviting(false)} title={t("Üye davet et", "Invite a member")} subtitle={t("Davet bağlantısı 7 gün geçerlidir; yalnızca bu e-posta adresiyle açılabilir.", "The invite link is valid for 7 days and only works for this email address.")}
        footer={<><Button onClick={() => setInviting(false)}>{t("Vazgeç", "Cancel")}</Button><Button variant="primary" loading={busy} disabled={!email.includes("@")} onClick={send}>{t("Davet oluştur", "Create invite")}</Button></>}>
        <div className="stack">
          <Field label={t("E-posta", "Email")} htmlFor="inv-email"><Input id="inv-email" type="email" data-autofocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ad@sirket.com" /></Field>
          <Field label={t("Rol", "Role")} htmlFor="inv-role" hint={ROLE_HELP[role][lang === "tr" ? 0 : 1]}><Select id="inv-role" value={role} onChange={(e) => setRole(e.target.value)}><option value="viewer">{roleLabel("viewer", t)}</option><option value="editor">{roleLabel("editor", t)}</option><option value="admin">{roleLabel("admin", t)}</option></Select></Field>
        </div>
      </Modal>
      <Modal open={Boolean(invite)} onClose={() => setInvite(null)} title={t("Davet hazır", "Invite ready")} subtitle={t("Bu bağlantıyı davet ettiğiniz kişiye iletin (e-posta otomatik gönderilmez).", "Send this link to the person you invited (no email is sent automatically).")} footer={<Button variant="primary" onClick={() => setInvite(null)}>{t("Tamam", "Done")}</Button>}>
        {invite && <CopyField value={invite.url} />}
      </Modal>
    </>
  );
}
