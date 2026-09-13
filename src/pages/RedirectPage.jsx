import { useState, useEffect } from "react";
import { Link2, Lock, ArrowRight, AlertCircle, Globe2 } from "lucide-react";
import { storage } from "../utils/storage";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";

export function RedirectPage({ slug, onGoHome }) {
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [favErr, setFavErr] = useState(false);

  useEffect(() => {
    let active = true;

    async function resolveSlug() {
      const rawLinks = storage.getDemoLinks() || [];
      let found = rawLinks.find(
        (l) => l.slug?.toLowerCase() === slug?.toLowerCase()
      );

      // If not in local storage, query Firestore
      if (!found && db) {
        try {
          const candidateKeys = [
            `loss.tr__${slug}`,
            `go.loss.tr__${slug}`,
            `loss.consolaktif.com.tr__${slug}`,
            `go.consolaktif.com.tr__${slug}`,
          ];
          for (const key of candidateKeys) {
            const snap = await getDoc(doc(db, "links", key));
            if (snap.exists()) {
              const data = snap.data();
              found = {
                id: snap.id,
                ...data,
                slug,
                shortUrl: `https://loss.tr/${slug}`,
              };
              break;
            }
          }
        } catch (err) {
          console.warn("Firestore lookup failed:", err);
        }
      }

      if (!active) return;

      if (found) {
        setLink(found);

        if (!found.password) {
          // Increment click count
          if (rawLinks.some((l) => l.id === found.id)) {
            const updated = rawLinks.map((l) =>
              l.id === found.id ? { ...l, clickCount: (l.clickCount || 0) + 1 } : l
            );
            storage.setDemoLinks(updated);
          }
          if (db && found.id) {
            try {
              updateDoc(doc(db, "links", found.id), {
                clickCount: increment(1),
              }).catch(() => {});
            } catch {}
          }

          // Instant natural redirect
          const timer = setTimeout(() => {
            window.location.replace(found.destination);
          }, 180);

          return () => clearTimeout(timer);
        }
      }
      setLoading(false);
    }

    resolveSlug();

    return () => {
      active = false;
    };
  }, [slug]);

  const handlePasswordSubmit = (e) => {
    e?.preventDefault();
    if (!link) return;
    if (passwordInput === link.password) {
      setPasswordError(false);
      setUnlocked(true);

      // Increment click count
      const rawLinks = storage.getDemoLinks() || [];
      const updated = rawLinks.map((l) =>
        l.id === link.id ? { ...l, clickCount: (l.clickCount || 0) + 1 } : l
      );
      storage.setDemoLinks(updated);

      window.location.replace(link.destination);
    } else {
      setPasswordError(true);
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

  // Active Instant Redirect Screen (Clean Dub.co / Bitly Style)
  if (link && (!link.password || unlocked)) {
    const targetDomain = getDomainName(link.destination);
    const favicon = getFaviconUrl(link.destination);

    return (
      <div className="redirect-clean-wrap">
        {/* Top Loading Bar */}
        <div className="redirect-top-bar" />

        <div className="redirect-clean-card">
          <div className="redirect-target-avatar">
            {!favErr && favicon ? (
              <img
                src={favicon}
                alt=""
                onError={() => setFavErr(true)}
              />
            ) : (
              <Globe2 size={22} color="#60a5fa" />
            )}
          </div>

          <h2 className="redirect-clean-title">
            {targetDomain} adresine yönlendiriliyorsunuz...
          </h2>
          <p className="redirect-clean-dest" title={link.destination}>
            {link.destination}
          </p>

          <a
            href={link.destination}
            className="redirect-manual-link"
          >
            Otomatik açılmazsa tıklayın <ArrowRight size={13} />
          </a>
        </div>
      </div>
    );
  }

  // Password Protected State (Clean & Minimal)
  if (link && link.password && !unlocked) {
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
              <div
                style={{
                  color: "#ef4444",
                  fontSize: "12px",
                  marginBottom: "12px",
                }}
              >
                Hatalı parola girdiniz.
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Bağlantıyı Aç <ArrowRight size={14} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 404 Not Found (Clean)
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
