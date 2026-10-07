import { forwardRef, useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, Copy, Loader2, Lock, Sparkles } from "./icons";
import { copyText } from "../lib/format";
import { useI18n } from "../lib/i18n";
import { useToast } from "../state/toast";
import { Link } from "../lib/router";

export { Modal, Drawer } from "./Modal";

export function Button({ variant = "secondary", size, block, loading, icon: Icon, children, className = "", ...rest }) {
  return (
    <button type="button" {...rest} disabled={rest.disabled || loading} className={`btn btn-${variant} ${size ? `btn-${size}` : ""} ${block ? "btn-block" : ""} ${className}`}>
      {loading ? <Loader2 size={15} className="spin" aria-hidden /> : Icon ? <Icon size={size === "sm" ? 14 : 16} aria-hidden /> : null}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, htmlFor, optional }) {
  const { t } = useI18n();
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}{optional && <span className="muted" style={{ fontWeight: 400 }}>{t("(isteğe bağlı)", "(optional)")}</span>}</label>}
      {children}
      {error ? <span className="field-error" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

/** Identifier-like inputs: no spellcheck, no password-manager triggers, `name` defaults to `id`. */
export const Input = forwardRef(function Input({ className = "", ...rest }, ref) {
  return <input ref={ref} className={`input ${className}`} spellCheck={false} autoComplete="off" name={rest.name ?? rest.id} {...rest} />;
});

export function Select({ className = "", children, ...rest }) {
  return <select className={`select ${className}`} {...rest}>{children}</select>;
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="switch" onClick={() => onChange(!checked)} style={disabled ? { opacity: 0.5 } : undefined} />
  );
}

export function Badge({ tone, dot, children }) {
  return <span className={`badge ${tone || ""}`}>{dot && <span className="dot" />}{children}</span>;
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && <div className="empty-icon"><Icon size={22} aria-hidden /></div>}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ w = "100%", h = 14, style }) {
  return <div className="skeleton" style={{ width: w, height: h, ...style }} aria-hidden />;
}

export function CopyButton({ text, label, size = "sm", variant = "secondary" }) {
  const { t } = useI18n();
  const toast = useToast();
  const [done, setDone] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const onClick = async () => {
    const ok = await copyText(text);
    if (!ok) { toast.error(t("Kopyalanamadı", "Could not copy")); return; }
    setDone(true);
    toast.success(t("Panoya kopyalandı", "Copied to clipboard"));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1800);
  };
  return (
    <Button className={done ? "copied" : ""} size={size} variant={variant} onClick={onClick} icon={done ? Check : Copy} aria-label={label || t("Kopyala", "Copy")}>
      {label || t("Kopyala", "Copy")}
    </Button>
  );
}

export function CopyField({ value }) {
  return (
    <div className="copy-field">
      <code translate="no">{value}</code>
      <CopyButton text={value} />
    </div>
  );
}

/** Small anchored dropdown. Closes on outside click and Escape. */
export function Menu({ trigger, children, align = "right", label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === "Escape") { close(); ref.current?.querySelector("button")?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close]);
  return (
    <span className="menu-anchor" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o), props: { "aria-haspopup": "true", "aria-expanded": open, "aria-label": label } })}
      {open && <div className={`menu ${align === "right" ? "right" : ""}`} onClick={close}>{children}</div>}
    </span>
  );
}

export function MenuItem({ icon: Icon, danger, children, ...rest }) {
  return (
    <button type="button" className={`menu-item ${danger ? "danger" : ""}`} {...rest}>
      {Icon && <Icon size={15} aria-hidden />}{children}
    </button>
  );
}

export function Alert({ tone = "info", icon: Icon, children, action }) {
  return (
    <div className={`alert ${tone}`} role={tone === "danger" ? "alert" : undefined}>
      {Icon && <Icon size={16} aria-hidden />}
      <div className="alert-body">{children}</div>
      {action}
    </div>
  );
}

/** Shown where a feature needs a higher plan. */
export function UpgradeNote({ children }) {
  const { t } = useI18n();
  return (
    <Alert tone="info" icon={Lock} action={<Link to="/app/billing" className="btn btn-primary btn-sm"><Sparkles size={13} />{t("Planı yükselt", "Upgrade")}</Link>}>
      {children}
    </Alert>
  );
}

export function Logo({ size = 28, text = true }) {
  const id = useId();
  return (
    <span className="logo" aria-label="loss.tr" translate="no">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden role="img">
        <title id={id}>loss.tr</title>
        <rect width="32" height="32" rx="8" fill="var(--ink)" />
        <rect x="7" y="8.5" width="18" height="3.4" rx="1.7" fill="var(--on-ink)" />
        <rect x="7" y="14.3" width="12" height="3.4" rx="1.7" fill="var(--on-ink)" opacity=".7" />
        <rect x="7" y="20.1" width="6" height="3.4" rx="1.7" fill="var(--accent)" />
      </svg>
      {text && <span className="logo-text">loss<span>.tr</span></span>}
    </span>
  );
}
