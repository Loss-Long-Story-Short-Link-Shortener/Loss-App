import { Component } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

/**
 * Global Error Boundary — catches unhandled React rendering errors
 * and shows a friendly recovery UI instead of a white screen.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            background: "var(--bg-app, #0a0a0a)",
            color: "var(--text-primary, #fff)",
            padding: "24px",
            textAlign: "center",
            gap: "16px",
          }}
        >
          <AlertCircle size={36} color="#ef4444" />
          <h2 style={{ fontSize: "18px", fontWeight: 700 }}>
            Beklenmeyen bir hata oluştu
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-secondary, #888)",
              maxWidth: "400px",
            }}
          >
            Uygulama beklenmeyen bir sorunla karşılaştı. Sayfayı yenileyerek
            devam edebilirsiniz.
          </p>
          {this.state.error?.message && (
            <code
              style={{
                fontSize: "11px",
                color: "#ef4444",
                background: "rgba(239, 68, 68, 0.1)",
                padding: "8px 14px",
                borderRadius: "6px",
                maxWidth: "500px",
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
            </code>
          )}
          <button
            onClick={this.handleReload}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 20px",
              background: "var(--primary, #3b82f6)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              marginTop: "8px",
            }}
          >
            <RefreshCw size={14} />
            Sayfayı Yenile
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
