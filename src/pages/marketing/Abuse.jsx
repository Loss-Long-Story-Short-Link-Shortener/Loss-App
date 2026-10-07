import { useState } from "react";
import { Check } from "../../ui/icons";
import { Alert, Button, Field, Input, Select } from "../../ui";
import { api } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { Page } from "./Layout";

export default function Abuse() {
  const { t } = useI18n();
  const [f, setF] = useState({ url: "", reason: "phishing", details: "", email: "" });
  const [state, setState] = useState({ status: "idle", error: "" });
  const submit = async (e) => {
    e.preventDefault();
    setState({ status: "busy", error: "" });
    try { await api.report(f); setState({ status: "done", error: "" }); } catch (err) { setState({ status: "idle", error: err.message }); }
  };
  return (
    <Page narrow>
      <div style={{ padding: "56px 0 80px", maxWidth: 560 }}>
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>{t("Kötüye kullanım bildir", "Report abuse")}</h1>
        <p className="muted" style={{ marginBottom: 24 }}>{t("Kimlik avı, zararlı yazılım, spam veya yasa dışı içerik barındırdığını düşündüğünüz bir loss.tr bağlantısını bildirin. Bildirimler incelenir; ihlal tespit edilen bağlantılar devre dışı bırakılır.", "Report a loss.tr link you believe leads to phishing, malware, spam or illegal content. Reports are reviewed and violating links are disabled.")}</p>
        {state.status === "done" ? <Alert tone="success" icon={Check}>{t("Bildiriminiz alındı, teşekkürler. İnceleyeceğiz.", "Thanks - your report was received and will be reviewed.")}</Alert> : (
          <form className="stack" onSubmit={submit}>
            {state.error && <Alert tone="danger">{state.error}</Alert>}
            <Field label={t("Kısa bağlantı adresi", "Short link address")} htmlFor="ab-url"><Input id="ab-url" required placeholder="https://loss.tr/abc123" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></Field>
            <Field label={t("Neden", "Reason")} htmlFor="ab-reason"><Select id="ab-reason" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>
              <option value="phishing">{t("Kimlik avı / dolandırıcılık", "Phishing / fraud")}</option><option value="malware">{t("Zararlı yazılım", "Malware")}</option><option value="spam">Spam</option><option value="illegal">{t("Yasa dışı içerik", "Illegal content")}</option><option value="other">{t("Diğer", "Other")}</option></Select></Field>
            <Field label={t("Ayrıntılar", "Details")} htmlFor="ab-d" optional><textarea id="ab-d" className="textarea" maxLength={1000} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field>
            <Field label={t("E-postanız", "Your email")} htmlFor="ab-e" optional hint={t("Yalnızca gerekirse sizinle iletişime geçmek için.", "Only used if we need to follow up.")}><Input id="ab-e" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <div><Button type="submit" variant="primary" loading={state.status === "busy"}>{t("Bildir", "Submit report")}</Button></div>
          </form>
        )}
      </div>
    </Page>
  );
}
