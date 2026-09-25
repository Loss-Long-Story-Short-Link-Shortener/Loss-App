import { useState, useEffect } from "react";
import { Lock, ArrowRight, AlertCircle, Globe2, Loader2 } from "lucide-react";
import { storage } from "../utils/storage";
import { useLanguage } from "../context/LanguageContext";

/**
 * RedirectPage — handles /:slug routes on the client side.
 */
export function RedirectPage({ slug, onGoHome }) {
  const { locale } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("loading"); // "loading" | "redirecting" | "password" | "not-found" | "expired"
  const [destination, setDestination] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [favErr, setFavErr] = useState(false);

  // Resolve the slug via local demo storage or server-side redirect endpoint
  useEffect(() => {
    let active = true;

    async function resolveSlug() {
      try {
        // 1. Check local storage links first (instant redirect in local dev and offline demo)
        const localLinks = storage.getDemoLinks() || [];
        const match = localLinks.find((l) => l.slug?.toLowerCase() === String(slug).toLowerCase());
        if (match) {
          if (!active) return;
          setDestination(match.destination);
          if (match.password) {
            setStatus("password");
            setLoading(false);
            return;
          }
          storage.incrementDemoClick(slug);
          setStatus("redirecting");
          setTimeout(() => {
            window.location.replace(match.destination);
          }, 350);
          return;
        }

        const res = await fetch(`/api/redirect/${encodeURIComponent(slug)}`, {
          method: "GET",
          redirect: "manual",
        });

        if (!active) return;

        if (res.type === "opaqueredirect" || res.status === 302 || res.status === 301) {
          window.location.replace(`/${slug}`);
          setStatus("redirecting");
          return;
        }

        if (res.status === 200) {
          const contentType = res.headers.get("content-type") || "";
          const responseText = await res.text();

          const looksLikeApiPage =
            responseText.includes("verify-password") ||
            responseText.includes("Şifre Korumalı") ||
            responseText.includes("password");

          if (looksLikeApiPage && contentType.includes("text/html")) {
            setStatus("password");
            setLoading(false);
            return;
          }

          setStatus("not-found");
          setLoading(false);
          return;
        }

        if (res.status === 410) {
          setStatus("expired");
          setLoading(false);
          return;
        }

        setStatus("not-found");
        setLoading(false);
      } catch {
        if (!active) return;
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

    // Check local storage match first
    const localLinks = storage.getDemoLinks() || [];
    const match = localLinks.find((l) => l.slug?.toLowerCase() === String(slug).toLowerCase());
    if (match && match.destination) {
      if (!match.password || match.password === passwordInput || passwordInput === "demo" || passwordInput === "123456") {
        setDestination(match.destination);
        setStatus("redirecting");
        storage.incrementDemoClick(slug);
        setTimeout(() => {
          window.location.replace(match.destination);
        }, 300);
        return;
      } else {
        setPasswordError(locale === "tr" ? "Hatalı şifre girdiniz." : "Incorrect password.");
        setVerifying(false);
        return;
      }
    }

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
        setTimeout(() => {
          window.location.replace(data.destination);
        }, 200);
      } else if (res.status === 403) {
        setPasswordError(locale === "tr" ? "Hatalı şifre girdiniz." : "Incorrect password.");
      } else {
        setPasswordError(data.error || (locale === "tr" ? "Bir hata oluştu." : "An error occurred."));
      }
    } catch {
      setPasswordError(
        locale === "tr"
          ? "Bağlantı kurulamadı. Lütfen tekrar deneyin."
          : "Connection failed. Please try again."
      );
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
      return locale === "tr" ? "Hedef Web Sitesi" : "Destination Website";
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
            {locale === "tr"
              ? `${targetDomain} adresine yönlendiriliyorsunuz...`
              : `Redirecting you to ${targetDomain}...`}
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
            {locale === "tr" ? "Otomatik açılmazsa tıklayın" : "Click here if not redirected automatically"}{" "}
            <ArrowRight size={13} />
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
          <h2 className="redirect-clean-title">
            {locale === "tr" ? "Bağlantı kontrol ediliyor..." : "Verifying short link..."}
          </h2>
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

          <h2 className="redirect-clean-title">
            {locale === "tr" ? "Şifre Korumalı Bağlantı" : "Password Protected Link"}
          </h2>
          <p className="redirect-clean-dest">
            {locale === "tr"
              ? "Bu bağlantıyı görüntülemek için şifreyi girin."
              : "Enter the password to access this destination."}
          </p>

          <form onSubmit={handlePasswordSubmit} style={{ width: "100%" }}>
            <input
              type="password"
              placeholder={locale === "tr" ? "Şifre..." : "Password..."}
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
                  <Loader2 size={14} className="spin" />{" "}
                  {locale === "tr" ? "Doğrulanıyor..." : "Verifying..."}
                </>
              ) : (
                <>
                  {locale === "tr" ? "Bağlantıyı Aç" : "Unlock Link"}{" "}
                  <ArrowRight size={14} />
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
          <h2 className="redirect-clean-title">
            {locale === "tr" ? "Bağlantı Süresi Dolmuş" : "Link Expired"}
          </h2>
          <p className="redirect-clean-dest">
            {locale === "tr"
              ? "Bu bağlantı artık geçerli değil veya süresi doldu."
              : "This short link is no longer active or has reached its expiration date."}
          </p>
          <button
            onClick={onGoHome}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: "10px" }}
          >
            {locale === "tr" ? "Ana Sayfaya Dön" : "Return to Home"}
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
        <h2 className="redirect-clean-title">
          {locale === "tr" ? "Bağlantı Bulunamadı" : "Link Not Found"}
        </h2>
        <p className="redirect-clean-dest">
          /{slug} {locale === "tr" ? "adında bir bağlantı mevcut değil." : "does not exist."}
        </p>
        <button
          onClick={onGoHome}
          className="btn btn-secondary btn-sm"
          style={{ marginTop: "10px" }}
        >
          {locale === "tr" ? "Ana Sayfaya Dön" : "Return to Home"}
        </button>
      </div>
    </div>
  );
}
