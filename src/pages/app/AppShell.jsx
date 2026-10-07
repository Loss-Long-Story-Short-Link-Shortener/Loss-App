import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Search, BarChart3, ChevronsUpDown, CreditCard, FileClock, Globe, KeyRound, Link2, LogOut, Menu as MenuIcon, Moon, Plus, QrCode, Settings, Sun, Users, Check, Monitor, Languages, Sparkles } from "../../ui/icons";
import { Button, Logo, Menu, MenuItem, Modal } from "../../ui";
import { useI18n } from "../../lib/i18n";
import { Link, jump, match, useRouter } from "../../lib/router";
import { useAuth } from "../../state/auth";
import { LinksProvider } from "../../state/links";
import { usePlan } from "../../state/plan";
import { useTheme } from "../../state/theme";
import { planLabel } from "../../lib/plans";
import { LinkEditor } from "./LinkEditor";
import { Alert } from "../../ui";
import { AlertCircle } from "../../ui/icons";

import CommandPalette from "./CommandPalette";
import LinksPage from "./LinksPage";
import LinkDetailPage from "./LinkDetailPage";
import AnalyticsPage from "./AnalyticsPage";
import QrPage from "./QrPage";
import DomainsPage from "./DomainsPage";
import DevelopersPage from "./DevelopersPage";
import TeamPage from "./TeamPage";
import AuditPage from "./AuditPage";
import BillingPage from "./BillingPage";
import SettingsPage from "./SettingsPage";

const EditorContext = createContext(null);
export const useEditor = () => useContext(EditorContext);

function initials(name) {
  return (name || "?").split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "?";
}

function WorkspaceSwitcher() {
  const { t } = useI18n();
  const { me, switchWorkspace, user } = useAuth();
  const ws = me?.workspace;
  return (
    <Menu align="left" trigger={({ toggle, props }) => (
      <button type="button" className="ws-switch" onClick={toggle} {...props} aria-label={t("Çalışma alanını değiştir", "Switch workspace")}>
        <span className="ws-avatar">{initials(ws?.name || "K")}</span>
        <span className="ws-name truncate">{ws?.name || "…"}<span className="ws-role">{ws ? roleLabel(ws.role, t) : ""}</span></span>
        <ChevronsUpDown size={15} color="var(--text-3)" aria-hidden />
      </button>
    )}>
      <div className="menu-label">{t("Çalışma alanları", "Workspaces")}</div>
      {(me?.workspaces || []).map((w) => (
        <MenuItem key={w.id} icon={w.id === ws?.id ? Check : undefined} onClick={() => switchWorkspace(w.personal ? "" : w.id)}>
          <span className="truncate">{w.personal ? t("Kişisel", "Personal") : w.name}</span>
        </MenuItem>
      ))}
      <div className="menu-sep" />
      <Link to="/app/team" className="menu-item"><Users size={15} /> {t("Takımı yönet", "Manage team")}</Link>
    </Menu>
  );
}

export function roleLabel(role, t) {
  return { owner: t("Sahip", "Owner"), admin: t("Yönetici", "Admin"), editor: t("Editör", "Editor"), viewer: t("Görüntüleyici", "Viewer") }[role] || role;
}

function UserMenu() {
  const { t, lang, setLang } = useI18n();
  const { user, signOutUser, isDemo } = useAuth();
  const { mode, setMode } = useTheme();
  const { navigate } = useRouter();
  const name = user?.displayName || user?.email || "";
  return (
    <Menu align="left" trigger={({ toggle, props }) => (
      <button type="button" className="user-chip" onClick={toggle} {...props} aria-label={t("Hesap menüsü", "Account menu")}>
        <span className="avatar">{initials(name)}</span>
        <span className="who truncate">{user?.displayName || t("Hesabım", "My account")}<small className="truncate">{user?.email}</small></span>
      </button>
    )}>
      <div className="menu-label">{t("Görünüm", "Appearance")}</div>
      <MenuItem icon={Sun} onClick={() => setMode("light")}>{t("Açık", "Light")}{mode === "light" && <Check size={14} style={{ marginLeft: "auto" }} />}</MenuItem>
      <MenuItem icon={Moon} onClick={() => setMode("dark")}>{t("Koyu", "Dark")}{mode === "dark" && <Check size={14} style={{ marginLeft: "auto" }} />}</MenuItem>
      <MenuItem icon={Monitor} onClick={() => setMode("system")}>{t("Sistem", "System")}{mode === "system" && <Check size={14} style={{ marginLeft: "auto" }} />}</MenuItem>
      <div className="menu-sep" />
      <MenuItem icon={Languages} onClick={() => setLang(lang === "tr" ? "en" : "tr")}>{lang === "tr" ? "English" : "Türkçe"}</MenuItem>
      <MenuItem icon={Settings} onClick={() => navigate("/app/settings")}>{t("Ayarlar", "Settings")}</MenuItem>
      <div className="menu-sep" />
      <MenuItem icon={LogOut} onClick={async () => { await signOutUser(); navigate("/"); }}>{isDemo ? t("Demodan çık", "Exit demo") : t("Çıkış yap", "Sign out")}</MenuItem>
    </Menu>
  );
}

function UsageCard() {
  const { t, lang } = useI18n();
  const { me } = useAuth();
  const { linkUsage, plan } = usePlan();
  if (!linkUsage) return null;
  const pct = Math.min(100, Math.round((linkUsage.used / linkUsage.max) * 100));
  const free = plan.id === "free";
  return (
    <div className="usage-card">
      <div className="row between"><strong>{planLabel(plan.id, lang)}</strong><span className="muted">{linkUsage.used.toLocaleString()} / {linkUsage.max.toLocaleString()}</span></div>
      <div className={`progress ${pct >= 100 ? "danger" : pct >= 80 ? "warn" : ""}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("Bağlantı kotası", "Link quota")}><span style={{ width: `${pct}%` }} /></div>
      {(free || pct >= 80) && me && !me.isDemo && <Link to="/app/billing" className="btn btn-primary btn-sm btn-block" style={{ marginTop: 10 }}><Sparkles size={13} /> {t("Planı yükselt", "Upgrade")}</Link>}
    </div>
  );
}

function Nav({ onNavigate }) {
  const { t } = useI18n();
  const { path } = useRouter();
  const { can } = usePlan();
  const items = [
    ["/app", t("Bağlantılar", "Links"), Link2, (p) => p === "/app" || p.startsWith("/app/links")],
    ["/app/analytics", t("Analizler", "Analytics"), BarChart3],
    ["/app/qr", t("QR kodları", "QR codes"), QrCode],
    ["/app/domains", t("Alan adları", "Domains"), Globe],
  ];
  const workspace = [
    ["/app/developers", t("Geliştirici", "Developers"), KeyRound],
    ["/app/team", t("Takım", "Team"), Users],
    ["/app/audit", t("Denetim kaydı", "Audit log"), FileClock],
  ];
  const account = [
    ["/app/billing", t("Plan ve faturalama", "Plan & billing"), CreditCard],
    ["/app/settings", t("Ayarlar", "Settings"), Settings],
  ];
  const render = ([to, label, Icon, active]) => {
    const on = active ? active(path) : path === to || path.startsWith(`${to}/`);
    return <Link key={to} to={to} className="nav-item" aria-current={on ? "page" : undefined} onClick={onNavigate}><Icon size={17} aria-hidden /> {label}</Link>;
  };
  return (
    <nav className="nav" aria-label={t("Ana gezinme", "Main navigation")}>
      {items.map(render)}
      <div className="nav-label">{t("Çalışma alanı", "Workspace")}</div>
      {workspace.map(render)}
      <div className="nav-label">{t("Hesap", "Account")}</div>
      {account.map(render)}
    </nav>
  );
}

function SidebarContent({ onNavigate }) {
  const { t } = useI18n();
  const editor = useEditor();
  const { atLeast } = usePlan();
  return (
    <>
      <div className="sidebar-top"><Link to="/app" onClick={onNavigate}><Logo /></Link></div>
      <WorkspaceSwitcher />
      <Button variant="primary" icon={Plus} block disabled={!atLeast("editor")} onClick={() => { onNavigate?.(); editor.openNew(); }}>{t("Yeni bağlantı", "New link")}</Button>
      <button type="button" className="search-trigger" onClick={() => { onNavigate?.(); editor.openSearch(); }} aria-label={t("Ara", "Search")}><Search size={15} aria-hidden /> {t("Ara…", "Search…")} <span className="kbd" aria-hidden>⌘K</span></button>
      <Nav onNavigate={onNavigate} />
      <div className="sidebar-bottom"><UsageCard /><UserMenu /></div>
    </>
  );
}

const ROUTES = [
  ["/app", LinksPage], ["/app/links/:id", LinkDetailPage], ["/app/analytics", AnalyticsPage], ["/app/qr", QrPage], ["/app/domains", DomainsPage],
  ["/app/developers", DevelopersPage], ["/app/team", TeamPage], ["/app/audit", AuditPage], ["/app/billing", BillingPage], ["/app/settings", SettingsPage],
];

function Shell() {
  const { t } = useI18n();
  const { path, navigate } = useRouter();
  const { user, loading, isDemo, signOutUser, meError, me } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const [editor, setEditor] = useState({ open: false, link: null, initial: null });
  const [palette, setPalette] = useState(false);

  const api = useMemo(() => ({
    openNew: (initial = null) => setEditor({ open: true, link: null, initial }),
    openEdit: (link) => setEditor({ open: true, link, initial: null }),
    openSearch: () => setPalette(true),
  }), []);

  useEffect(() => { if (!loading && !user) navigate("/login", { replace: true }); }, [loading, user, navigate]);
  // A URL typed into the public hero before signing up opens the editor prefilled.
  useEffect(() => {
    if (!me) return;
    try {
      const raw = sessionStorage.getItem("loss_pending");
      if (!raw) return;
      sessionStorage.removeItem("loss_pending");
      const { destination } = JSON.parse(raw);
      if (destination) api.openNew({ destination });
    } catch { /* ignore */ }
  }, [me, api]);
  useEffect(() => { setDrawer(false); }, [path]);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((o) => !o); return; }
      if (e.target.closest?.("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n" && me?.workspace && me.workspace.role !== "viewer") { e.preventDefault(); api.openNew(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [api, me]);

  if (loading || !user) return <div className="content" role="status"><span className="sr-only">Loading</span></div>;

  let page = null;
  for (const [pattern, Component] of ROUTES) {
    const params = match(pattern, path);
    if (params) { page = <Component params={params} />; break; }
  }

  return (
    <EditorContext.Provider value={api}>
      <a href="#main" onClick={jump("main")} className="skip-link">{t("İçeriğe geç", "Skip to content")}</a>
      <div className="shell">
        <aside className="sidebar"><SidebarContent /></aside>
        <div className="main">
          <header className="topbar">
            <button type="button" className="icon-btn" onClick={() => setDrawer(true)} aria-label={t("Menüyü aç", "Open menu")}><MenuIcon size={20} /></button>
            <Link to="/app"><Logo size={24} /></Link>
            <span style={{ flex: 1 }} />
            <Button variant="primary" size="sm" icon={Plus} onClick={() => api.openNew()}>{t("Yeni", "New")}</Button>
          </header>
          {isDemo && (
            <div className="demo-banner" role="region" aria-label={t("Demo bilgisi", "Demo notice")}>
              <span>{t("Demo çalışma alanı: veriler yalnızca bu tarayıcıda durur, kısa bağlantılar gerçek değildir.", "Demo workspace: data stays in this browser and short links are not real.")}</span>
              <Link to="/register">{t("Ücretsiz hesap aç", "Create a free account")}</Link>
              <button type="button" className="demo-exit" onClick={async () => { await signOutUser(); navigate("/"); }} style={{ textDecoration: "underline" }}>{t("Demodan çık", "Exit demo")}</button>
            </div>
          )}
          <main id="main" className="content" tabIndex={-1}>
            {meError && !me && <Alert tone="danger" icon={AlertCircle}>{meError}</Alert>}
            <div key={path} className="page-in">{page || <p>404</p>}</div>
          </main>
        </div>
      </div>
      {drawer && (
        <div className="overlay left sidebar-drawer" onClick={() => setDrawer(false)}>
          <div className="drawer left" role="dialog" aria-modal="true" aria-label={t("Menü", "Menu")} onClick={(e) => e.stopPropagation()} style={{ padding: "14px 12px", gap: 14, overflowY: "auto" }}>
            <SidebarContent onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}
      <CommandPalette open={palette} onClose={() => setPalette(false)} onNew={() => api.openNew()} />
      <LinkEditor open={editor.open} link={editor.link} initial={editor.initial} onClose={() => setEditor((s) => ({ ...s, open: false }))} />
    </EditorContext.Provider>
  );
}

export default function AppShell() {
  return (
    <LinksProvider>
      <Shell />
    </LinksProvider>
  );
}
