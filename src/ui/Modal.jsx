import { useEffect, useId, useRef } from "react";
import { X } from "./icons";
import { useI18n } from "../lib/i18n";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open dialogs, topmost last: only the topmost one reacts to Escape/Tab (e.g. a confirm over an editor).
const stack = [];

function useDialog(open, onClose) {
  const ref = useRef(null);
  const previous = useRef(null);
  useEffect(() => {
    if (!open) return;
    previous.current = document.activeElement;
    const token = {};
    stack.push(token);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      (el.querySelector("[data-autofocus]") || el.querySelector(FOCUSABLE))?.focus();
    });
    const onKey = (e) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !ref.current) return;
      const items = [...ref.current.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(token), 1);
      document.body.style.overflow = prevOverflow;
      previous.current?.focus?.();
    };
  }, [open, onClose]);
  return ref;
}

function Shell({ open, onClose, title, subtitle, children, footer, className, side }) {
  const { t } = useI18n();
  const id = useId();
  const ref = useDialog(open, onClose);
  const down = useRef(false);
  if (!open) return null;
  return (
    <div
      className={`overlay ${side ? "side" : ""}`}
      onMouseDown={(e) => { down.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (down.current && e.target === e.currentTarget) onClose(); }}
    >
      <div ref={ref} className={`${side ? "drawer" : "modal"} ${className || ""}`} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`}>
        <div className={side ? "drawer-head" : "modal-head"}>
          <div style={{ minWidth: 0 }}>
            <h2 id={`${id}-t`}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t("Kapat", "Close")}><X size={18} /></button>
        </div>
        <div className={side ? "drawer-body" : "modal-body"}>{children}</div>
        {footer && <div className={side ? "drawer-foot" : "modal-foot"}>{footer}</div>}
      </div>
    </div>
  );
}

export const Modal = (props) => <Shell {...props} />;
export const Drawer = (props) => <Shell {...props} side />;
