import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

/**
 * Accessible modal with:
 *  - ESC key to close
 *  - Click-outside-to-close (backdrop click)
 *  - Focus trap (Tab/Shift+Tab cycles within modal)
 *  - ARIA attributes for screen readers
 *  - Body scroll lock while open
 */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "520px",
  hideHeader = false,
}) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // ── Focus trap & keyboard handling ──────────────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Tab trap
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;

    // Save previous focus and move focus into modal
    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    // Focus first focusable element after render
    requestAnimationFrame(() => {
      if (modalRef.current) {
        const first = modalRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (first) first.focus();
      }
    });

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      // Restore previous focus
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Modal"}
    >
      <div
        ref={modalRef}
        className="modal-card"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {!hideHeader && (
          <div className="modal-header">
            <div>
              <h3 className="modal-title" id="modal-title">
                {title}
              </h3>
              {subtitle && (
                <p className="modal-subtitle" id="modal-subtitle">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Kapat"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div
          className={
            hideHeader ? "modal-body modal-body-no-header" : "modal-body"
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
