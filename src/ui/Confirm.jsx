import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Button, Modal } from ".";
import { useI18n } from "../lib/i18n";

const ConfirmContext = createContext(null);

/** In-page replacement for window.confirm: `if (await confirm({ title, body, danger })) …` */
export function ConfirmProvider({ children }) {
  const { t } = useI18n();
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve;
    setState(options);
  }), []);

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  };

  const value = useMemo(() => confirm, [confirm]);
  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal open={Boolean(state)} onClose={() => close(false)} title={state?.title || ""}
        footer={<><Button onClick={() => close(false)}>{state?.cancelLabel || t("Vazgeç", "Cancel")}</Button><Button variant={state?.danger ? "danger" : "primary"} onClick={() => close(true)} data-autofocus>{state?.confirmLabel || t("Onayla", "Confirm")}</Button></>}>
        {state?.body && <p style={{ color: "var(--text-2)" }}>{state.body}</p>}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
