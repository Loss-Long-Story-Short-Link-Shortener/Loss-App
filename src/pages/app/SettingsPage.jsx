import { useState } from "react";
import { Download, Monitor, Moon, Sun, Trash2 } from "../../ui/icons";
import { Alert, Button, Field, Input } from "../../ui";
import { api } from "../../lib/api";
import { downloadFile } from "../../lib/format";
import { useI18n } from "../../lib/i18n";
import { useRouter } from "../../lib/router";
import { useAuth } from "../../state/auth";
import { useTheme } from "../../state/theme";
import { useToast } from "../../state/toast";
import { updateProfile } from "firebase/auth";

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const toast = useToast();
  const { navigate } = useRouter();
  const { user, isDemo, signOutUser, me } = useAuth();
  const { mode, setMode } = useTheme();
  const [name, setName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const saveName = async () => {
    setSaving(true);
    try { if (!isDemo) await updateProfile(user, { displayName: name.trim() }); toast.success(t("Kaydedildi", "Saved")); } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const exportData = async () => {
    try { downloadFile(`loss-verilerim-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await api.account.export(), null, 2), "application/json"); } catch (e) { toast.error(e.message); }
  };

  const del = async () => {
    setDeleting(true); setError("");
    try { await api.account.remove(); await signOutUser(); navigate("/"); } catch (e) { setError(e.message); setDeleting(false); }
  };

  return (
    <>
      <div className="page-head"><div><h1>{t("Ayarlar", "Settings")}</h1><p>{t("Profil, görünüm ve verileriniz.", "Profile, appearance and your data.")}</p></div></div>
      <div className="stack" style={{ maxWidth: 720, gap: 20 }}>
        <div className="card">
          <div className="card-head"><h2>{t("Profil", "Profile")}</h2></div>
          <div className="card-body stack">
            <Field label={t("Ad", "Name")} htmlFor="s-name"><Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} disabled={isDemo} /></Field>
            <Field label={t("E-posta", "Email")} htmlFor="s-email"><Input id="s-email" value={user?.email || ""} readOnly disabled /></Field>
            <div><Button variant="primary" loading={saving} disabled={isDemo || name.trim() === (user?.displayName || "")} onClick={saveName}>{t("Kaydet", "Save")}</Button></div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>{t("Görünüm ve dil", "Appearance & language")}</h2></div>
          <div className="card-body stack">
            <div><span className="label" style={{ marginBottom: 8 }}>{t("Tema", "Theme")}</span>
              <div className="segmented" role="group" aria-label={t("Tema", "Theme")}>
                <button type="button" aria-pressed={mode === "light"} onClick={() => setMode("light")}><Sun size={13} style={{ display: "inline", marginRight: 5, verticalAlign: "-2px" }} />{t("Açık", "Light")}</button>
                <button type="button" aria-pressed={mode === "dark"} onClick={() => setMode("dark")}><Moon size={13} style={{ display: "inline", marginRight: 5, verticalAlign: "-2px" }} />{t("Koyu", "Dark")}</button>
                <button type="button" aria-pressed={mode === "system"} onClick={() => setMode("system")}><Monitor size={13} style={{ display: "inline", marginRight: 5, verticalAlign: "-2px" }} />{t("Sistem", "System")}</button>
              </div></div>
            <div><span className="label" style={{ marginBottom: 8 }}>{t("Dil", "Language")}</span>
              <div className="segmented" role="group" aria-label={t("Dil", "Language")}><button type="button" aria-pressed={lang === "tr"} onClick={() => setLang("tr")}>Türkçe</button><button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button></div></div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div><h2>{t("Verileriniz", "Your data")}</h2><p>{t("KVKK / GDPR kapsamında verilerinizi indirebilir veya hesabınızı silebilirsiniz.", "Under KVKK / GDPR you can download your data or delete your account.")}</p></div></div>
          <div className="card-body stack">
            <div><Button icon={Download} onClick={exportData}>{t("Verilerimi indir (JSON)", "Download my data (JSON)")}</Button></div>
            <hr className="divider" />
            <div className="stack">
              <strong style={{ color: "var(--danger)" }}>{t("Hesabı sil", "Delete account")}</strong>
              <p className="hint">{t("Tüm bağlantılarınız, alan adlarınız, anahtarlarınız ve sahibi olduğunuz çalışma alanları kalıcı olarak silinir. Aktif aboneliğiniz varsa önce iptal etmelisiniz. Bu işlem geri alınamaz.", "All your links, domains, keys and workspaces you own are permanently deleted. Cancel any active subscription first. This cannot be undone.")}</p>
              {error && <Alert tone="danger">{error}</Alert>}
              {isDemo ? <Alert tone="info">{t("Demo hesabı silinemez; “Demodan çık” yeterlidir.", "A demo account cannot be deleted; just exit the demo.")}</Alert> : (
                <div className="row wrap"><Input aria-label={t("Onay için DELETE yazın", "Type DELETE to confirm")} style={{ maxWidth: 220 }} placeholder="DELETE" value={confirm} onChange={(e) => setConfirm(e.target.value)} /><Button variant="danger" icon={Trash2} loading={deleting} disabled={confirm !== "DELETE"} onClick={del}>{t("Hesabımı kalıcı olarak sil", "Permanently delete my account")}</Button></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
