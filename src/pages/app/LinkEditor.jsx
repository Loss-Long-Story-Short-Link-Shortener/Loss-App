import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ExternalLink, Globe, Lock, Plus, Shuffle, Smartphone, Trash2, Share2, Tags, Megaphone, ShieldCheck, Settings2 } from "../../ui/icons";
import { Alert, Button, CopyField, Field, Input, Modal, Select, Switch, UpgradeNote } from "../../ui";
import { applyUtm, hostOf, isValidUrl, normalizeUrl } from "../../lib/format";
import { useI18n } from "../../lib/i18n";
import { Link } from "../../lib/router";
import { useLinks } from "../../state/links";
import { usePlan } from "../../state/plan";
import { useToast } from "../../state/toast";
import { api } from "../../lib/api";
import { QrPreview } from "./qr";
import { useConfirm } from "../../ui/Confirm";

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"];
const POPULAR = ["TR", "DE", "US", "GB", "FR", "NL", "IT", "ES", "RU", "AZ", "SA", "AE"];
const randomSlug = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");

function readUtm(url) {
  try {
    const u = new URL(url);
    return Object.fromEntries(UTM_KEYS.map((k) => [k, u.searchParams.get(`utm_${k}`) || ""]));
  } catch {
    return Object.fromEntries(UTM_KEYS.map((k) => [k, ""]));
  }
}

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Section({ icon: Icon, title, badge, children, defaultOpen }) {
  return (
    <details className="editor-section" open={defaultOpen}>
      <summary><Icon size={16} aria-hidden /> {title} {badge}<ChevronDown size={16} className="chev" aria-hidden /></summary>
      <div className="editor-body">{children}</div>
    </details>
  );
}

export function LinkEditor({ open, onClose, link, initial }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const { create, update } = useLinks();
  const { can, me, atLeast } = usePlan();
  const editing = Boolean(link);
  const [domains, setDomains] = useState([]);

  const blank = useMemo(() => ({
    destination: initial?.destination || "", domain: me?.baseUrl ? new URL(me.baseUrl).host : "loss.tr", slug: initial?.slug || "", title: "", tags: "", folder: "", notes: "",
    password: "", expiresAt: "", maxClicks: "", fallbackUrl: "", redirectType: "307", utm: Object.fromEntries(UTM_KEYS.map((k) => [k, ""])),
    ios: "", android: "", geo: [], og: { title: "", description: "", image: "" },
  }), [initial, me?.baseUrl]);

  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [formError, setFormError] = useState(null);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const baseline = useRef("");

  useEffect(() => {
    if (!open) return;
    setCreated(null); setErrors({}); setFormError(null); setPasswordTouched(false);
    if (link) {
      setF({
        destination: link.destination, domain: link.domain, slug: link.slug, title: link.title || "", tags: (link.tags || []).join(", "), folder: link.folder || "", notes: link.notes || "",
        password: link.hasPassword ? "••••••" : "", expiresAt: toLocalInput(link.expiresAt), maxClicks: link.maxClicks ? String(link.maxClicks) : "", fallbackUrl: link.fallbackUrl || "", redirectType: String(link.redirectType || 307),
        utm: readUtm(link.destination), ios: link.targets?.ios || "", android: link.targets?.android || "", geo: link.targets?.geo || [],
        og: { title: link.og?.title || "", description: link.og?.description || "", image: link.og?.image || "" },
      });
    } else setF(blank);
    baseline.current = "";
  }, [open, link, blank]);

  // Remember the pristine state once the form has been populated, to detect unsaved edits.
  useEffect(() => { if (open && !baseline.current) baseline.current = JSON.stringify(f); }, [open, f]);
  const dirty = open && !created && Boolean(baseline.current) && JSON.stringify(f) !== baseline.current;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const requestClose = async () => {
    if (dirty && !(await confirm({ title: t("Kaydedilmemiş değişiklikler", "Unsaved changes"), body: t("Çıkarsanız bu değişiklikler kaybolur.", "If you leave, these changes are lost."), confirmLabel: t("Çık", "Discard"), cancelLabel: t("Düzenlemeye devam et", "Keep editing"), danger: true }))) return;
    onClose();
  };

  useEffect(() => {
    if (!open || editing) return;
    api.domains.list().then((d) => setDomains(d.domains.filter((x) => x.status === "verified"))).catch(() => setDomains([]));
  }, [open, editing]);

  const set = (patch) => {
    setF((s) => ({ ...s, ...patch }));
    setErrors((e) => { const n = { ...e }; for (const k of Object.keys(patch)) delete n[k]; return n; });
  };
  const setUtm = (k, v) => setF((s) => ({ ...s, utm: { ...s.utm, [k]: v } }));
  const canonical = me?.baseUrl ? new URL(me.baseUrl).host : "loss.tr";
  const gated = (feature) => !can(feature);

  const finalDestination = useMemo(() => (f.destination ? applyUtm(f.destination, f.utm) : ""), [f.destination, f.utm]);

  const validate = () => {
    const e = {};
    if (!f.destination.trim()) e.destination = t("Hedef URL gerekli.", "Destination URL is required.");
    else if (!isValidUrl(f.destination)) e.destination = t("Geçerli bir adres girin (örn. https://siteniz.com/sayfa).", "Enter a valid address (e.g. https://yoursite.com/page).");
    if (!editing && f.slug && !/^[a-zA-Z0-9_-]{3,48}$/.test(f.slug)) e.slug = t("3-48 karakter; harf, rakam, - ve _ kullanın.", "3-48 characters; letters, numbers, - and _ only.");
    if (f.maxClicks && (!Number.isInteger(Number(f.maxClicks)) || Number(f.maxClicks) < 1)) e.maxClicks = t("1 veya daha büyük bir sayı girin.", "Enter a number of 1 or more.");
    if (f.expiresAt && new Date(f.expiresAt).getTime() <= Date.now()) e.expiresAt = t("Tarih gelecekte olmalı.", "The date must be in the future.");
    if (f.password && f.password !== "••••••" && f.password.length < 4) e.password = t("Parola en az 4 karakter olmalı.", "Password must be at least 4 characters.");
    setErrors(e);
    const order = { destination: "le-dest", slug: "le-slug", password: "le-pw", expiresAt: "le-exp", maxClicks: "le-max" };
    const firstKey = Object.keys(order).find((k) => e[k]);
    if (firstKey) setTimeout(() => document.getElementById(order[firstKey])?.focus(), 0);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => {
    const body = {
      destination: normalizeUrl(finalDestination), title: f.title.trim(), notes: f.notes.trim(), folder: f.folder.trim(),
      tags: f.tags.split(",").map((x) => x.trim()).filter(Boolean),
    };
    if (!editing) {
      if (f.slug.trim()) body.slug = f.slug.trim();
      if (f.domain && f.domain !== canonical) body.domain = f.domain;
    }
    if (!gated("password") && (editing ? passwordTouched : f.password)) body.password = f.password;
    if (!gated("expiry")) body.expiresAt = f.expiresAt ? new Date(f.expiresAt).toISOString() : "";
    if (!gated("clickLimit")) body.maxClicks = f.maxClicks ? Number(f.maxClicks) : null;
    if (!gated("expiry")) body.fallbackUrl = f.fallbackUrl.trim() ? normalizeUrl(f.fallbackUrl.trim()) : "";
    if (!gated("redirectType")) body.redirectType = Number(f.redirectType);
    if (!gated("socialPreview")) body.og = f.og.title || f.og.description || f.og.image ? f.og : null;
    if (!gated("targeting")) body.targets = f.ios || f.android || f.geo.length ? { ios: f.ios, android: f.android, geo: f.geo.filter((g) => g.country && g.url) } : null;
    return body;
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const body = buildPayload();
      if (editing) {
        await update(link.id, body);
        toast.success(t("Bağlantı güncellendi", "Link updated"));
        onClose();
      } else {
        setCreated(await create(body));
      }
    } catch (err) {
      if (err.code === "plan_required" || err.code === "limit_reached") setFormError(err);
      else if (err.code === "slug_taken") setErrors({ slug: err.message });
      else setFormError(err);
    } finally {
      setBusy(false);
    }
  };

  const lockBadge = (feature, plan) => gated(feature) && <span className="badge accent"><Lock size={11} /> {plan}</span>;

  if (created) {
    return (
      <Modal open={open} onClose={onClose} title={t("Bağlantınız hazır", "Your link is ready")} subtitle={t("Kopyalayın, paylaşın veya QR koduna dönüştürün.", "Copy it, share it, or turn it into a QR code.")}
        footer={<><Button onClick={onClose}>{t("Kapat", "Close")}</Button><Link to={`/app/links/${encodeURIComponent(created.id)}`} className="btn btn-primary" onClick={onClose}>{t("Bağlantı detayı", "Link details")}</Link></>}>
        <div className="stack">
          <div className="row" style={{ alignItems: "center", gap: 8 }}><Check size={18} color="var(--success)" aria-hidden /><strong>{created.title}</strong></div>
          <CopyField value={created.shortUrl} />
          <div className="row wrap" style={{ alignItems: "flex-start", gap: 16 }}>
            <QrPreview value={`${created.shortUrl}?qr=1`} size={148} />
            <div className="stack" style={{ flex: 1, minWidth: 180, gap: 8 }}>
              <a className="btn btn-secondary btn-sm" href={created.shortUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> {t("Bağlantıyı aç", "Open link")}</a>
              {navigator.share && <Button size="sm" icon={Share2} onClick={() => navigator.share({ url: created.shortUrl, title: created.title }).catch(() => {})}>{t("Paylaş", "Share")}</Button>}
              <p className="hint">{t("QR kod bağlantıdaki hedefi kullanır; basıldıktan sonra hedefi değiştirebilirsiniz.", "The QR code points at the short link, so you can change the destination after printing.")}</p>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  const preview = `${editing ? f.domain : f.domain}/${f.slug || "…"}`;

  return (
    <Modal open={open} onClose={requestClose} className="wide" title={editing ? t("Bağlantıyı düzenle", "Edit link") : t("Yeni bağlantı", "New link")}
      subtitle={editing ? <span className="mono">{link.shortUrl}</span> : t("Hedefi girin; gerisi isteğe bağlı.", "Enter a destination - everything else is optional.")}
      footer={<><Button onClick={requestClose}>{t("Vazgeç", "Cancel")}</Button><Button variant="primary" loading={busy} onClick={submit} disabled={!atLeast("editor")}>{editing ? t("Kaydet", "Save") : t("Bağlantı oluştur", "Create link")}</Button></>}>
      <form onSubmit={submit} className="stack" noValidate>
        {formError && (
          formError.code === "plan_required" || formError.code === "limit_reached"
            ? <UpgradeNote>{formError.message}</UpgradeNote>
            : <Alert tone="danger">{formError.message}</Alert>
        )}
        <Field label={t("Hedef URL", "Destination URL")} htmlFor="le-dest" error={errors.destination}>
          <Input id="le-dest" data-autofocus value={f.destination} onChange={(e) => set({ destination: e.target.value })} placeholder="https://ornek.com/sayfa…" type="url" inputMode="url" aria-invalid={Boolean(errors.destination)} />
        </Field>

        {!editing ? (
          <Field label={t("Kısa bağlantı", "Short link")} htmlFor="le-slug" error={errors.slug} hint={t("Boş bırakırsanız rastgele bir ad üretilir.", "Leave empty to generate a random name.")}>
            <div className="row" style={{ gap: 8 }}>
              <div className="input-group" style={{ flex: 1, minWidth: 0 }}>
                {domains.length ? (
                  <Select aria-label={t("Alan adı", "Domain")} value={f.domain} onChange={(e) => set({ domain: e.target.value })} style={{ width: "auto", maxWidth: 170, borderRadius: "8px 0 0 8px", borderRight: 0 }}>
                    <option value={canonical}>{canonical}</option>
                    {domains.map((d) => <option key={d.host} value={d.host}>{d.host}</option>)}
                  </Select>
                ) : <span className="addon">{canonical}/</span>}
                <Input id="le-slug" value={f.slug} onChange={(e) => set({ slug: e.target.value.replace(/\s/g, "-") })} placeholder="yaz-kampanya…" autoComplete="off" aria-invalid={Boolean(errors.slug)} />
              </div>
              <Button size="sm" icon={Shuffle} onClick={() => set({ slug: randomSlug() })} aria-label={t("Rastgele ad üret", "Generate random name")} />
            </div>
          </Field>
        ) : null}

        <div className="grid-2">
          <Field label={t("Başlık", "Title")} htmlFor="le-title" optional><Input id="le-title" value={f.title} onChange={(e) => set({ title: e.target.value })} maxLength={120} placeholder={hostOf(f.destination) || t("Örn. Yaz kampanyası…", "e.g. Summer campaign…")} /></Field>
          <Field label={t("Klasör", "Folder")} htmlFor="le-folder" optional><Input id="le-folder" value={f.folder} onChange={(e) => set({ folder: e.target.value })} maxLength={40} placeholder={t("Örn. Yaz 2026…", "e.g. Summer 2026…")} /></Field>
        </div>
        <Field label={t("Etiketler", "Tags")} htmlFor="le-tags" optional hint={t("Virgülle ayırın, en fazla 10.", "Comma-separated, up to 10.")}><Input id="le-tags" value={f.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="instagram, kampanya…" /></Field>

        <div>
          <Section icon={Megaphone} title={t("UTM parametreleri", "UTM parameters")}>
            <div className="grid-2">
              {UTM_KEYS.map((k) => (
                <Field key={k} label={`utm_${k}`} htmlFor={`utm-${k}`}><Input id={`utm-${k}`} className="mono" value={f.utm[k]} onChange={(e) => setUtm(k, e.target.value)} autoComplete="off" /></Field>
              ))}
            </div>
            {f.destination && finalDestination !== f.destination && <p className="hint mono" style={{ wordBreak: "break-all" }}>{finalDestination}</p>}
          </Section>

          <Section icon={ShieldCheck} title={t("Koruma ve sınırlar", "Protection & limits")} badge={lockBadge("password", "Pro")}>
            {gated("password") && <UpgradeNote>{t("Parola, son kullanma tarihi ve tıklama limiti Pro ve üzeri paketlerde.", "Password, expiry and click limits are available on Pro and above.")}</UpgradeNote>}
            <Field label={t("Parola", "Password")} htmlFor="le-pw" error={errors.password} hint={editing && link.hasPassword ? t("Değiştirmek için yeni parola yazın; kaldırmak için alanı boşaltın.", "Type a new password to change it; clear the field to remove it.") : t("Ziyaretçiler bağlantıyı açmadan önce parolayı girer.", "Visitors must enter it before the link opens.")}>
              <Input id="le-pw" type="text" autoComplete="off" disabled={gated("password")} value={f.password} onChange={(e) => { setPasswordTouched(true); set({ password: e.target.value }); }} onFocus={(e) => { if (f.password === "••••••") { set({ password: "" }); setPasswordTouched(true); } e.target.select?.(); }} />
            </Field>
            <div className="grid-2">
              <Field label={t("Son kullanma tarihi", "Expires at")} htmlFor="le-exp" error={errors.expiresAt}><Input id="le-exp" type="datetime-local" disabled={gated("expiry")} value={f.expiresAt} onChange={(e) => set({ expiresAt: e.target.value })} /></Field>
              <Field label={t("Yedek hedef", "Fallback destination")} htmlFor="le-fb" hint={t("Süre veya tıklama limiti dolunca ziyaretçiler hata sayfası yerine buraya gider.", "When the link expires or hits its limit, visitors go here instead of seeing an error page.")}><Input id="le-fb" disabled={gated("expiry")} value={f.fallbackUrl} onChange={(e) => set({ fallbackUrl: e.target.value })} placeholder="https://ornek.com…" /></Field>
              <Field label={t("Tıklama limiti", "Click limit")} htmlFor="le-max" error={errors.maxClicks} hint={t("Limit dolunca bağlantı kapanır.", "The link closes once it is reached.")}><Input id="le-max" type="number" min="1" disabled={gated("clickLimit")} value={f.maxClicks} onChange={(e) => set({ maxClicks: e.target.value })} /></Field>
            </div>
          </Section>

          <Section icon={Smartphone} title={t("Cihaz ve ülke hedefleme", "Device & country targeting")} badge={lockBadge("targeting", "Pro")}>
            {gated("targeting") && <UpgradeNote>{t("Hedefleme Pro ve üzeri paketlerde kullanılabilir.", "Targeting is available on Pro and above.")}</UpgradeNote>}
            <div className="grid-2">
              <Field label="iOS" htmlFor="le-ios"><Input id="le-ios" disabled={gated("targeting")} value={f.ios} onChange={(e) => set({ ios: e.target.value })} placeholder="https://apps.apple.com/…" /></Field>
              <Field label="Android" htmlFor="le-and"><Input id="le-and" disabled={gated("targeting")} value={f.android} onChange={(e) => set({ android: e.target.value })} placeholder="https://play.google.com/…" /></Field>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              <span className="label">{t("Ülkeye göre hedef", "Country rules")}</span>
              {f.geo.map((g, i) => (
                <div className="row" key={i} style={{ gap: 8 }}>
                  <Input list="countries" aria-label={t("Ülke kodu", "Country code")} style={{ width: 84 }} maxLength={2} disabled={gated("targeting")} value={g.country} onChange={(e) => set({ geo: f.geo.map((x, j) => (j === i ? { ...x, country: e.target.value.toUpperCase() } : x)) })} placeholder="DE" />
                  <Input aria-label="URL" disabled={gated("targeting")} value={g.url} onChange={(e) => set({ geo: f.geo.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} placeholder="https://example.de" />
                  <Button size="sm" variant="ghost" icon={Trash2} aria-label={t("Kuralı sil", "Remove rule")} onClick={() => set({ geo: f.geo.filter((_, j) => j !== i) })} />
                </div>
              ))}
              <datalist id="countries">{POPULAR.map((c) => <option key={c} value={c} />)}</datalist>
              <div><Button size="sm" icon={Plus} disabled={gated("targeting") || f.geo.length >= 20} onClick={() => set({ geo: [...f.geo, { country: "", url: "" }] })}>{t("Kural ekle", "Add rule")}</Button></div>
            </div>
          </Section>

          <Section icon={Share2} title={t("Sosyal medya önizlemesi", "Social preview")} badge={lockBadge("socialPreview", "Starter")}>
            {gated("socialPreview") && <UpgradeNote>{t("Özel önizleme kartı Starter ve üzeri paketlerde.", "Custom preview cards are available on Starter and above.")}</UpgradeNote>}
            <Field label={t("Başlık", "Title")} htmlFor="og-t"><Input id="og-t" maxLength={90} disabled={gated("socialPreview")} value={f.og.title} onChange={(e) => set({ og: { ...f.og, title: e.target.value } })} /></Field>
            <Field label={t("Açıklama", "Description")} htmlFor="og-d"><Input id="og-d" maxLength={200} disabled={gated("socialPreview")} value={f.og.description} onChange={(e) => set({ og: { ...f.og, description: e.target.value } })} /></Field>
            <Field label={t("Görsel URL (https)", "Image URL (https)")} htmlFor="og-i"><Input id="og-i" disabled={gated("socialPreview")} value={f.og.image} onChange={(e) => set({ og: { ...f.og, image: e.target.value } })} placeholder="https://ornek.com…" /></Field>
            <p className="hint">{t("WhatsApp, X, LinkedIn, Slack gibi uygulamalar bağlantıyı paylaşırken bu kartı gösterir. Ziyaretçiler doğrudan hedefe gider.", "Apps like WhatsApp, X, LinkedIn and Slack show this card when the link is shared. Visitors still go straight to the destination.")}</p>
          </Section>

          <Section icon={Settings2} title={t("Gelişmiş", "Advanced")}>
            <Field label={t("Yönlendirme türü", "Redirect type")} htmlFor="le-rt" hint={t("307 varsayılandır. 301 kalıcı taşıma içindir (SEO); tarayıcılar önbelleğe alabilir.", "307 is the default. 301 is for permanent moves (SEO); browsers may cache it.")}>
              <Select id="le-rt" value={f.redirectType} disabled={gated("redirectType")} onChange={(e) => set({ redirectType: e.target.value })}>
                <option value="307">307 - {t("Geçici (önerilen)", "Temporary (recommended)")}</option>
                <option value="302">302 - {t("Bulundu", "Found")}</option>
                <option value="301">301 - {t("Kalıcı", "Permanent")}</option>
              </Select>
            </Field>
            <Field label={t("Not", "Notes")} htmlFor="le-notes" optional><textarea id="le-notes" className="textarea" maxLength={500} value={f.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
          </Section>
        </div>

        {!editing && <div className="short-preview"><Globe size={16} aria-hidden /> <span>{preview}</span></div>}
      </form>
    </Modal>
  );
}
