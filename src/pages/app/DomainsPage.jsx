import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Globe, Loader2, Plus, RefreshCw, Trash2 } from "../../ui/icons";
import { Alert, Badge, Button, CopyButton, EmptyState, Field, Input, Modal, UpgradeNote } from "../../ui";
import { api } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { useAuth } from "../../state/auth";
import { usePlan } from "../../state/plan";
import { useToast } from "../../state/toast";

function DnsRecords({ d, cname }) {
  const { t } = useI18n();
  const rec = d.instructions;
  if (!rec) return null;
  const rows = [
    ["TXT", rec.txt.name, rec.txt.value, t("Sahipliği doğrular", "Proves ownership")],
    ["CNAME", rec.cname.name, rec.cname.value, t("Trafiği yönlendirir (alt alan adı için)", "Routes traffic (subdomains)")],
  ];
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="table-wrap"><table className="dns-table"><thead><tr><th>{t("Tür", "Type")}</th><th>{t("Ad / Host", "Name / Host")}</th><th>{t("Değer", "Value")}</th><th /></tr></thead>
        <tbody>{rows.map(([type, name, value, why]) => <tr key={type}><td><strong>{type}</strong><div className="muted">{why}</div></td><td className="mono">{name}</td><td className="mono">{value}</td><td><CopyButton text={value} label={t("Değeri kopyala", "Copy value")} /></td></tr>)}</tbody></table></div>
      <p className="hint">{t("Kök alan adı (örn. markaniz.com) için CNAME yerine A kaydı kullanın:", "For an apex domain (e.g. brand.com) use an A record instead of CNAME:")} <code>{rec.apexA}</code></p>
    </div>
  );
}

export default function DomainsPage() {
  const { t } = useI18n();
  const toast = useToast();
  const { isDemo } = useAuth();
  const { plan, can, atLeast, me } = usePlan();
  const [data, setData] = useState({ domains: [], cnameTarget: "" });
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [host, setHost] = useState("");
  const [busy, setBusy] = useState("");
  const [checks, setChecks] = useState({});
  const [toRemove, setToRemove] = useState(null);

  const load = useCallback(async () => {
    try { setData(await api.domains.list()); setState("ready"); } catch (e) { setError(e.message); setState("error"); }
  }, []);
  useEffect(() => { load(); }, [load, me?.workspace?.id]);

  const allowed = plan?.domains || 0;
  const canAdmin = atLeast("admin");

  const add = async () => {
    setBusy("add"); setError("");
    try { await api.domains.add(host); setAdding(false); setHost(""); await load(); toast.success(t("Alan adı eklendi. DNS kayıtlarını oluşturun.", "Domain added. Now create the DNS records.")); }
    catch (e) { setError(e.message); } finally { setBusy(""); }
  };
  const verify = async (h) => {
    setBusy(h);
    try {
      const res = await api.domains.verify(h);
      setChecks((c) => ({ ...c, [h]: res.checks }));
      if (res.verified) toast.success(t("Alan adı doğrulandı", "Domain verified"));
      else toast.error(t("TXT kaydı henüz bulunamadı. DNS yayılımı birkaç dakika sürebilir.", "TXT record not found yet. DNS can take a few minutes to propagate."));
      await load();
    } catch (e) { toast.error(e.message); } finally { setBusy(""); }
  };
  const remove = async () => {
    try { await api.domains.remove(toRemove); setToRemove(null); await load(); toast.success(t("Alan adı kaldırıldı", "Domain removed")); } catch (e) { toast.error(e.message); setToRemove(null); }
  };

  return (
    <>
      <div className="page-head">
        <div><h1>{t("Alan adları", "Domains")}</h1><p>{t("Kısa bağlantılarınızı kendi markanızın alan adıyla yayınlayın (örn. go.markaniz.com/kampanya).", "Serve short links from your own brand domain (e.g. go.brand.com/campaign).")}</p></div>
        <div className="page-actions"><Button variant="primary" icon={Plus} disabled={!canAdmin || !allowed || data.domains.length >= allowed} onClick={() => { setError(""); setAdding(true); }}>{t("Alan adı ekle", "Add domain")}</Button></div>
      </div>
      {!allowed && <div style={{ marginBottom: 16 }}><UpgradeNote>{t("Özel alan adı Starter (1), Pro (3) ve Agency (15) paketlerinde kullanılabilir.", "Custom domains are available on Starter (1), Pro (3) and Agency (15).")}</UpgradeNote></div>}
      {allowed > 0 && <p className="hint" style={{ marginBottom: 12 }}>{t("{n} / {m} alan adı kullanılıyor", "{n} of {m} domains used", { n: data.domains.length, m: allowed })}</p>}

      {state === "loading" && <div className="card card-pad row" role="status"><Loader2 className="spin" size={18} /> {t("Yükleniyor…", "Loading…")}</div>}
      {state === "error" && <Alert tone="danger" icon={AlertCircle} action={<Button size="sm" icon={RefreshCw} onClick={load}>{t("Tekrar dene", "Retry")}</Button>}>{error}</Alert>}
      {state === "ready" && data.domains.length === 0 && allowed > 0 && (
        <div className="card"><EmptyState icon={Globe} title={t("Henüz alan adı yok", "No domains yet")} action={<Button variant="primary" icon={Plus} disabled={!canAdmin} onClick={() => setAdding(true)}>{t("Alan adı ekle", "Add domain")}</Button>}>{t("Güvenilir, markalı bağlantılar tıklama güvenini artırır. Ekledikten sonra iki DNS kaydı oluşturmanız yeterli.", "Branded links build click-through trust. After adding, you only need to create two DNS records.")}</EmptyState></div>
      )}

      <div className="stack">
        {data.domains.map((d) => (
          <div className="card" key={d.host}>
            <div className="card-head">
              <div className="row" style={{ gap: 10, minWidth: 0 }}><Globe size={18} aria-hidden /><h2 className="truncate mono" style={{ fontSize: 15 }}>{d.host}</h2>
                {d.status === "verified" ? <Badge tone="success" dot>{t("Doğrulandı", "Verified")}</Badge> : <Badge tone="warning" dot>{t("Doğrulama bekliyor", "Pending verification")}</Badge>}</div>
              <div className="row">
                {d.status !== "verified" && <Button size="sm" variant="primary" icon={RefreshCw} loading={busy === d.host} disabled={!canAdmin} onClick={() => verify(d.host)}>{t("Şimdi doğrula", "Verify now")}</Button>}
                <Button size="sm" variant="danger-ghost" icon={Trash2} disabled={!canAdmin} onClick={() => setToRemove(d.host)} aria-label={`${t("Kaldır", "Remove")}: ${d.host}`} />
              </div>
            </div>
            <div className="card-body stack">
              {d.status === "verified" ? (
                <>
                  <div className="row" style={{ gap: 8, color: "var(--success)" }}><CheckCircle2 size={16} /> <span>{t("Hazır. Bağlantı oluştururken bu alan adını seçebilirsiniz.", "Ready. Pick this domain when creating a link.")}</span></div>
                  {!d.attached && <Alert tone="info">{t("TLS sertifikası için alan adının barındırma sağlayıcınızda (Vercel → Domains) da tanımlı olması gerekir.", "For TLS, the domain must also be added at your hosting provider (Vercel → Domains).")}</Alert>}
                </>
              ) : (
                <>
                  {checks[d.host] && !checks[d.host].owned && <Alert tone="warning" icon={Clock}>{t("TXT kaydı henüz görünmüyor. Kaydı ekledikten sonra yayılması birkaç dakika sürebilir.", "The TXT record is not visible yet. Propagation can take a few minutes after you add it.")}</Alert>}
                  <ol className="steps">
                    <li><strong>{t("DNS kayıtlarını ekleyin", "Add the DNS records")}</strong><div style={{ marginTop: 8 }}><DnsRecords d={d} /></div></li>
                    <li><strong>{t("“Şimdi doğrula”ya basın", "Press “Verify now”")}</strong><p className="hint">{t("Sahiplik TXT kaydıyla doğrulanır; doğrulamadan sonra bağlantı oluştururken kullanılabilir.", "Ownership is checked via the TXT record; afterwards you can use it for new links.")}</p></li>
                  </ol>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title={t("Alan adı ekle", "Add a domain")} subtitle={t("Sahip olduğunuz bir alan adı veya alt alan adı.", "A domain or subdomain you own.")}
        footer={<><Button onClick={() => setAdding(false)}>{t("Vazgeç", "Cancel")}</Button><Button variant="primary" loading={busy === "add"} disabled={!host.trim()} onClick={add}>{t("Ekle", "Add")}</Button></>}>
        <div className="stack">
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label={t("Alan adı", "Domain")} htmlFor="dom-host" hint={t("Alt alan adı önerilir: go.markaniz.com", "A subdomain is recommended: go.brand.com")}><Input id="dom-host" data-autofocus value={host} onChange={(e) => setHost(e.target.value)} placeholder="go.markaniz.com" autoComplete="off" onKeyDown={(e) => { if (e.key === "Enter") add(); }} /></Field>
        </div>
      </Modal>
      <Modal open={Boolean(toRemove)} onClose={() => setToRemove(null)} title={t("Alan adı kaldırılsın mı?", "Remove this domain?")} footer={<><Button onClick={() => setToRemove(null)}>{t("Vazgeç", "Cancel")}</Button><Button variant="danger" onClick={remove}>{t("Kaldır", "Remove")}</Button></>}>
        <p style={{ color: "var(--text-2)" }}><span className="mono">{toRemove}</span> {t("kaldırılır. Bu alan adına bağlı bağlantı varsa önce onları silmeniz gerekir.", "will be removed. If links still use it you must delete or move them first.")}</p>
      </Modal>
    </>
  );
}
