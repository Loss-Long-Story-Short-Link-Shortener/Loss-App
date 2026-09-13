import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export function ToastContainer() {
  const { toasts, dismissToast } = useAuth();

  if (!toasts.length) return null;

  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item ${toast.type}`}>
          {toast.type === "success" && <CheckCircle2 size={16} color="#10b981" />}
          {toast.type === "error" && <AlertCircle size={16} color="#ef4444" />}
          {toast.type === "info" && <Info size={16} color="#3b82f6" />}
          <span>{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              marginLeft: "8px",
              color: "var(--text-muted)",
              display: "flex",
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
