import { useState, useEffect } from "react";
import { Lock, ArrowRight, AlertCircle, Globe2, Loader2 } from "lucide-react";

/**
 * RedirectPage — handles /:slug routes on the client side.
 *
 * For most links the server-side redirect (/api/redirect/[slug]) handles
 * the 302 before this page even loads.  This component is a fallback for:
 *   - Password-protected links (server returns an HTML form, but this
 *     React page is used when the SPA detects the slug in App.jsx)
 *   - 404 / expired links
 *
 * SECURITY:
 *   - Passwords are NEVER exposed to the client.
 *   - Password verification happens server-side via POST /api/verify-password.
 *   - Click tracking happens only on the server (no client-side duplication).
 */
export function RedirectPage({ slug, onGoHome }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("loading"); // "loading" | "redirecting" | "password" | "not-found" | "expired"
  const [destination, setDestination] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [favErr, setFavErr] = useState(false);

  // Resolve the slug via the server-side redirect endpoint
  useEffect(() => {
    let active = true;

    async function resolveSlug() {
      try {
        // Use a HEAD/GET request to the redirect API to check if the link exists.
        // The server will either:
        //   - 302 redirect (browser follows it — but since we use fetch, we can intercept)
        //   - 200 with HTML (password-protected)
        //   - 404 / 410 (not found / expired)
        const res = await fetch(`/api/redirect/${encodeURIComponent(slug)}`, {
          method: "GET",
          redirect: "manual", // Don't follow redirects — we want to read the Location header
        });

        if (!active) return;

        if (res.type === "opaqueredirect" || res.status === 302 || res.status === 301) {
          // Server is redirecting — the link works.
          // Just let the browser navigate naturally.
          window.location.replace(`/${slug}`);
          setStatus("redirecting");
          return;
        }

        if (res.status === 200) {
          // Password-protected link — BUT only if the server returned the
          // actual password-hint page (text/html from the API), NOT the SPA
          // index.html fallback (which Vite / Vercel also returns as 200).
          const contentType = res.headers.get("content-type") || "";
          const responseText = await res.text();

          // If the response is a JSON or contains our API's password hint markup,
          // treat as password-protected. Otherwise it's the SPA fallback — 404.
          const looksLikeApiPage =
            responseText.includes("verify-password") ||
            responseText.includes("Şifre Korumalı") ||
            responseText.includes("password");

          if (looksLikeApiPage && contentType.includes("text/html")) {
            setStatus("password");
            setLoading(false);
            return;
          }

          // Fallback: it was the SPA's index.html — treat as not found
          setStatus("not-found");
          setLoading(false);
          return;
        }

        if (res.status === 410) {
          setStatus("expired");
          setLoading(false);
          return;
        }

        // 404 or any other error
        setStatus("not-found");
        setLoading(false);
      } catch {
        if (!active) return;
        // Network error — try direct navigation as fallback
        window.location.replace(`/api/redirect/${encodeURIComponent(slug)}`);
      }
    }

    resolveSlug();
    return () => { active = false; };
  }, [slug]);

  // Handle password form submission
  const handlePasswordSubmit = async (e) => {
    e?.preventDefault();
    if (!passwordInput.trim() || verifying) return;

    setVerifying(true);
    setPasswordError("");

    try {
      const res = await fetch("/api/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.toLowerCase(), password: passwordInput }),
      });

      const data = await res.json();

      if (res.ok && data.destination) {
        setDestination(data.destination);
        setStatus("redirecting");
        // Redirect after a brief moment so user sees the "redirecting" state
        setTimeout(() => {
          window.location.replace(data.destination);
        }, 200);
      } else if (res.status === 403) {
        setPasswordError("Hatalı parola girdiniz.");
      } else {
        setPasswordError(data.error || "Bir hata oluştu.");
      }
    } catch {
      setPasswordError("Bağlantı kurulamadı. Lütfen tekrar deneyin.");
    } finally {
      setVerifying(false);
    }
  };

  const getFaviconUrl = (url) => {
    try {
      const hostname = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    } catch {
      return null;
    }
  };

  const getDomainName = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return "Hedef Web Sitesi";
    }
  };

  // ── Redirecting state ──────────────────────────────────────────────────
  if (status === "redirecting") {
    const targetDomain = destination ? getDomainName(destination) : slug;
    const favicon = destination ? getFaviconUrl(destination) : null;

    return (
      <div className="redirect-clean-wrap">
        <div className="redirect-top-bar" />
        <div className="redirect-clean-card">
          <div className="redirect-target-avatar">
            {!favErr && favicon ? (
              <img src={favicon} alt="" onError={() => setFavErr(true)} />
            ) : (
              <Globe2 size={22} color="#60a5fa" />
            )}
          </div>
          <h2 className="redirect-clean-title">
            {targetDomain} adresine yönlendiriliyorsunuz...
          </h2>
          {destination && (
            <p className="redirect-clean-dest" title={destination}>
              {destination}
            </p>
          )}
          <a
            href={destination || `/api/redirect/${encodeURIComponent(slug)}`}
            className="redirect-manual-link"
          >
            Otomatik açılmazsa tıklayın <ArrowRight size={13} />
          </a>
        </div>
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading || status === "loading") {
    return (
      <div className="redirect-clean-wrap">
        <div className="redirect-top-bar" />
        <div className="redirect-clean-card">
          <Loader2 size={24} className="spin" style={{ color: "#60a5fa", marginBottom: "12px" }} />
          <h2 className="redirect-clean-title">Bağlantı kontrol ediliyor...</h2>
        </div>
      </div>
    );
  }

  // ── Password protected ─────────────────────────────────────────────────
  if (status === "password") {
    return (
      <div className="redirect-clean-wrap">
        <div className="redirect-clean-card">
          <div
            className="redirect-target-avatar"
            style={{ color: "#eab308", borderColor: "rgba(234, 179, 8, 0.3)" }}
          >
            <Lock size={20} />
          </div>

          <h2 className="redirect-clean-title">Parola Korumalı Bağlantı</h2>
          <p className="redirect-clean-dest">
            Bu bağlantıyı görüntülemek için parolayı girin.
          </p>

          <form onSubmit={handlePasswordSubmit} style={{ width: "100%" }}>
            <input
              type="password"
              placeholder="Parola..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
              disabled={verifying}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#0d0d0d",
                border: passwordError
                  ? "1px solid #ef4444"
                  : "1px solid rgba(255, 255, 255, 0.14)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none",
                marginBottom: "12px",
                textAlign: "center",
              }}
            />

            {passwordError && (
              <div style={{ color: "#ef4444", fontSize: "12px", marginBottom: "12px" }}>
                {passwordError}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              disabled={verifying || !passwordInput.trim()}
            >
              {verifying ? (
                <>
                  <Loader2 size={14} className="spin" /> Doğrulanıyor...
                </>
              ) : (
                <>
                  Bağlantıyı Aç <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Expired ────────────────────────────────────────────────────────────
  if (status === "expired") {
    return (
      <div className="redirect-clean-wrap">
        <div className="redirect-clean-card">
          <div
            className="redirect-target-avatar"
            style={{ color: "#f59e0b", borderColor: "rgba(245, 158, 11, 0.3)" }}
          >
            <AlertCircle size={20} />
          </div>
          <h2 className="redirect-clean-title">Bağlantı Süresi Dolmuş</h2>
          <p className="redirect-clean-dest">
            Bu bağlantı artık geçerli değil.
          </p>
          <button
            onClick={onGoHome}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: "10px" }}
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  // ── 404 Not Found ──────────────────────────────────────────────────────
  return (
    <div className="redirect-clean-wrap">
      <div className="redirect-clean-card">
        <div
          className="redirect-target-avatar"
          style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }}
        >
          <AlertCircle size={20} />
        </div>
        <h2 className="redirect-clean-title">Bağlantı Bulunamadı</h2>
        <p className="redirect-clean-dest">
          /{slug} adında bir bağlantı mevcut değil.
        </p>
        <button
          onClick={onGoHome}
          className="btn btn-secondary btn-sm"
          style={{ marginTop: "10px" }}
        >
          Ana Sayfaya Dön
        </button>
      </div>
    </div>
  );
}
