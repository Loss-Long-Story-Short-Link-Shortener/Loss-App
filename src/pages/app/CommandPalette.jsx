import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, CreditCard, FileClock, Globe, KeyRound, Link2, Moon, Plus, QrCode, Search, Settings, Users } from "../../ui/icons";
import { useI18n } from "../../lib/i18n";
import { useRouter } from "../../lib/router";
import { useLinks } from "../../state/links";
import { usePlan } from "../../state/plan";
import { useTheme } from "../../state/theme";

/** ⌘K / Ctrl+K quick switcher: jump to a page, create a link or open a link. */
export default function CommandPalette({ open, onClose, onNew }) {
  const { t } = useI18n();
  const { navigate } = useRouter();
  const { links } = useLinks();
  const { atLeast } = usePlan();
  const { resolved, setMode } = useTheme();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { if (open) { setQ(""); setIndex(0); setTimeout(() => inputRef.current?.focus(), 0); } }, [open]);

  const items = useMemo(() => {
    const commands = [
      ...(atLeast("editor") ? [{ id: "new", icon: Plus, label: t("Yeni bağlantı oluştur", "Create new link"), run: onNew }] : []),
      { id: "links", icon: Link2, label: t("Bağlantılar", "Links"), run: () => navigate("/app") },
      { id: "analytics", icon: BarChart3, label: t("Analizler", "Analytics"), run: () => navigate("/app/analytics") },
      { id: "qr", icon: QrCode, label: t("QR kodları", "QR codes"), run: () => navigate("/app/qr") },
      { id: "domains", icon: Globe, label: t("Alan adları", "Domains"), run: () => navigate("/app/domains") },
      { id: "dev", icon: KeyRound, label: t("Geliştirici (API, webhooks)", "Developers (API, webhooks)"), run: () => navigate("/app/developers") },
      { id: "team", icon: Users, label: t("Takım", "Team"), run: () => navigate("/app/team") },
      { id: "audit", icon: FileClock, label: t("Denetim kaydı", "Audit log"), run: () => navigate("/app/audit") },
      { id: "billing", icon: CreditCard, label: t("Plan ve faturalama", "Plan & billing"), run: () => navigate("/app/billing") },
      { id: "settings", icon: Settings, label: t("Ayarlar", "Settings"), run: () => navigate("/app/settings") },
      { id: "theme", icon: Moon, label: resolved === "dark" ? t("Açık temaya geç", "Switch to light theme") : t("Koyu temaya geç", "Switch to dark theme"), run: () => setMode(resolved === "dark" ? "light" : "dark") },
    ];
    const needle = q.trim().toLowerCase();
    const cmd = needle ? commands.filter((c) => c.label.toLowerCase().includes(needle)) : commands;
    const found = needle
      ? links.filter((l) => [l.title, l.slug, l.destination, ...(l.tags || [])].some((v) => String(v || "").toLowerCase().includes(needle))).slice(0, 8)
          .map((l) => ({ id: l.id, icon: Link2, label: l.title || l.slug, hint: l.shortUrl.replace(/^https?:\/\//, ""), run: () => navigate(`/app/links/${encodeURIComponent(l.id)}`) }))
      : [];
    return [...found, ...cmd];
  }, [q, links, t, navigate, onNew, resolved, setMode, atLeast]);

  useEffect(() => { setIndex(0); }, [q]);
  if (!open) return null;

  const run = (item) => { onClose(); item?.run(); };
  const onKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); run(items[index]); }
  };

  return (
    <div className="overlay palette-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label={t("Hızlı arama", "Quick search")} onKeyDown={onKey}>
        <div className="palette-input"><Search size={17} aria-hidden />
          <input ref={inputRef} role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={items[index] ? `pal-${items[index].id}` : undefined} placeholder={t("Bağlantı ara veya bir komut yaz…", "Search links or type a command…")} value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="kbd">Esc</span></div>
        <ul id="palette-list" role="listbox" className="palette-list">
          {items.length === 0 && <li className="palette-empty">{t("Sonuç yok", "No results")}</li>}
          {items.map((item, i) => (
            <li key={item.id} id={`pal-${item.id}`} role="option" aria-selected={i === index} className={i === index ? "active" : ""} onMouseEnter={() => setIndex(i)} onClick={() => run(item)}>
              <item.icon size={16} aria-hidden /><span className="truncate">{item.label}</span>{item.hint && <small className="mono truncate">{item.hint}</small>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
