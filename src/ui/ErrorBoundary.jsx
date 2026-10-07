import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("UI error:", error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    const tr = (navigator.language || "tr").toLowerCase().startsWith("tr");
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>{tr ? "Bir şeyler ters gitti" : "Something went wrong"}</h1>
          <p style={{ color: "#666", marginBottom: 18 }}>{tr ? "Sayfayı yenilemeyi deneyin. Sorun sürerse bize bildirin." : "Try reloading the page. If it keeps happening, let us know."}</p>
          <button onClick={() => window.location.reload()} style={{ padding: "10px 18px", borderRadius: 8, border: 0, background: "#2f5bff", color: "#fff", fontWeight: 600, cursor: "pointer" }}>{tr ? "Sayfayı yenile" : "Reload"}</button>
        </div>
      </div>
    );
  }
}
