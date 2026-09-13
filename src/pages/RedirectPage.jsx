import { useState, useEffect, useRef } from "react";
import {
  Lock,
  ArrowRight,
  AlertCircle,
  Globe2,
  ShieldCheck,
  Pause,
  Play,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { storage } from "../utils/storage";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

export function RedirectPage({ slug, onGoHome }) {
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState(false);

  // Password Protection
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [favErr, setFavErr] = useState(false);

  const hasIncrementedRef = useRef(false);

  // 1. Resolve Link from LocalStorage or Firestore
  useEffect(() => {
    let active = true;

    async function resolveSlug() {
      setLoading(true);

      // A) Check Local Storage
      const rawLinks = storage.getDemoLinks() || [];
      let found = rawLinks.find(
        (l) => l.slug?.toLowerCase() === slug?.toLowerCase()
      );

      // B) Query Firestore if not found locally
      if (!found && db) {
        try {
          const candidateKeys = [
            `loss.tr__${slug}`,
            `loss.tr__${slug.toLowerCase()}`,
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

          // Secondary Fallback: Query by slug field across collection
          if (!found) {
            const q = query(
              collection(db, "links"),
              where("slug", "==", slug.toLowerCase())
            );
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              const d = querySnap.docs[0];
              found = {
                id: d.id,
                ...d.data(),
                slug,
                shortUrl: `https://loss.tr/${slug}`,
              };
            }
          }
        } catch (err) {
          console.warn("Firestore lookup failed:", err);
        }
      }

      if (!active) return;

      if (found) {
        setLink(found);
      }
      setLoading(false);
    }

    resolveSlug();

    return () => {
      active = false;
    };
  }, [slug]);

  // Record click count
  const recordClick = (linkItem) => {
    if (!linkItem || hasIncrementedRef.current) return;
    hasIncrementedRef.current = true;

    try {
      const rawLinks = storage.getDemoLinks() || [];
      if (rawLinks.some((l) => l.id === linkItem.id)) {
        const updated = rawLinks.map((l) =>
          l.id === linkItem.id
            ? { ...l, clickCount: (l.clickCount || 0) + 1 }
            : l
        );
        storage.setDemoLinks(updated);
      }

      if (db && linkItem.id) {
        updateDoc(doc(db, "links", linkItem.id), {
          clickCount: increment(1),
        }).catch(() => {});
      }
    } catch {}
  };

  // 2. Countdown Timer
  useEffect(() => {
    if (loading || !link) return;
    if (link.password && !unlocked) return;
    if (paused) return;

    if (countdown <= 0) {
      recordClick(link);
      window.location.replace(link.destination);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          recordClick(link);
          window.location.replace(link.destination);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, link, unlocked, paused, countdown]);

  const handleInstantGo = () => {
    if (!link) return;
    recordClick(link);
    window.location.replace(link.destination);
  };

  const handlePasswordSubmit = (e) => {
    e?.preventDefault();
    if (!link) return;
    if (passwordInput === link.password) {
      setPasswordError(false);
      setUnlocked(true);
      setCountdown(3);
    } else {
      setPasswordError(true);
    }
  };

  const handleCopyDest = async () => {
    if (!link?.destination) return;
    try {
      await navigator.clipboard.writeText(link.destination);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
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

  // -------------------------------------------------------------
  // Render: 1. Loading State
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="redirect-clean-wrap">
        <div className="redirect-brand-badge" onClick={onGoHome}>
          <img src="/loss.png" alt="Long Story Short" />
          <span className="redirect-brand-name">Long Story Short</span>
        </div>

        <div className="redirect-clean-card">
          <div
            className="redirect-target-avatar"
            style={{ borderColor: "rgba(59, 130, 246, 0.4)" }}
          >
            <Loader2 size={24} className="spin" color="#3b82f6" />
          </div>

          <h2 className="redirect-clean-title">Bağlantı Doğrulanıyor...</h2>
          <p className="redirect-clean-dest" style={{ marginBottom: "12px" }}>
            /{slug} aranıyor ve güvenlik taraması yapılıyor
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Render: 2. Password Protected State
  // -------------------------------------------------------------
  if (link && link.password && !unlocked) {
    return (
      <div className="redirect-clean-wrap">
        <div className="redirect-brand-badge" onClick={onGoHome}>
          <img src="/loss.png" alt="Long Story Short" />
          <span className="redirect-brand-name">Long Story Short</span>
        </div>

        <div className="redirect-clean-card">
          <div
            className="redirect-target-avatar"
            style={{ color: "#eab308", borderColor: "rgba(234, 179, 8, 0.4)" }}
          >
            <Lock size={22} />
          </div>

          <h2 className="redirect-clean-title">Parola Korumalı Bağlantı</h2>
          <p className="redirect-clean-dest" style={{ marginBottom: "18px" }}>
            Bu bağlantıyı görüntülemek için parolayı girin
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
                Hatalı parola girdiniz. Lütfen tekrar deneyin.
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

  // -------------------------------------------------------------
  // Render: 3. Active Valid Redirect Page (With Countdown & Go Now)
  // -------------------------------------------------------------
  if (link) {
    const targetDomain = getDomainName(link.destination);
    const favicon = getFaviconUrl(link.destination);
    // Calculate progress (3s => 0% to 100%)
    const progressPercent = Math.max(0, Math.min(100, ((3 - countdown) / 3) * 100));

    return (
      <div className="redirect-clean-wrap">
        {/* Brand Header */}
        <div className="redirect-brand-badge" onClick={onGoHome}>
          <img src="/loss.png" alt="Long Story Short" />
          <span className="redirect-brand-name">Long Story Short</span>
        </div>

        {/* Center Interstitial Card */}
        <div className="redirect-clean-card">
          <div className="redirect-target-avatar">
            {!favErr && favicon ? (
              <img
                src={favicon}
                alt=""
                onError={() => setFavErr(true)}
              />
            ) : (
              <Globe2 size={24} color="#60a5fa" />
            )}
          </div>

          <h1 className="redirect-clean-title">
            {targetDomain} adresine yönlendiriliyorsunuz
          </h1>

          <div className="redirect-security-badge">
            <ShieldCheck size={13} /> Güvenli Bağlantı Doğrulandı (SSL)
          </div>

          <div className="redirect-clean-dest" title={link.destination}>
            {link.destination}
          </div>

          {/* Progress Bar */}
          <div className="redirect-progress-track">
            <div
              className="redirect-progress-bar"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Countdown / Status text */}
          <div className="redirect-countdown-text">
            {paused ? (
              <span>Otomatik yönlendirme duraklatıldı.</span>
            ) : (
              <span>
                <strong>{countdown}</strong> saniye içinde yönlendirileceksiniz...
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="redirect-actions-row">
            <button
              className="btn btn-primary"
              onClick={handleInstantGo}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Hemen Git <ArrowRight size={14} />
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => setPaused((p) => !p)}
              style={{ padding: "0 14px", justifyContent: "center" }}
              title={paused ? "Yönlendirmeyi Devam Ettir" : "Yönlendirmeyi Durdur"}
            >
              {paused ? <Play size={13} /> : <Pause size={13} />}
              <span>{paused ? "Devam Et" : "Durdur"}</span>
            </button>
          </div>

          <div style={{ marginTop: "16px" }}>
            <button
              type="button"
              className="redirect-manual-link"
              onClick={handleCopyDest}
            >
              {copied ? (
                <>
                  <Check size={12} color="#10b981" /> Hedef Adres Kopyalandı
                </>
              ) : (
                <>
                  <Copy size={12} /> Hedef Adresi Kopyala
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="redirect-footer-note">
          Long Story Short ile güvenli bağlantı yönlendirmesi •{" "}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onGoHome();
            }}
          >
            Kendi Linkinizi Kısaltın
          </a>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Render: 4. 404 Not Found State
  // -------------------------------------------------------------
  return (
    <div className="redirect-clean-wrap">
      <div className="redirect-brand-badge" onClick={onGoHome}>
        <img src="/loss.png" alt="Long Story Short" />
        <span className="redirect-brand-name">Long Story Short</span>
      </div>

      <div className="redirect-clean-card">
        <div
          className="redirect-target-avatar"
          style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.4)" }}
        >
          <AlertCircle size={22} />
        </div>

        <h2 className="redirect-clean-title">Bağlantı Bulunamadı</h2>
        <p className="redirect-clean-dest" style={{ marginBottom: "20px" }}>
          /{slug} adında bir bağlantı mevcut değil veya silinmiş olabilir.
        </p>

        <button
          onClick={onGoHome}
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Ana Sayfaya Dön & Yeni Link Kısalt
        </button>
      </div>

      <div className="redirect-footer-note">
        Long Story Short • loss.tr
      </div>
    </div>
  );
}
