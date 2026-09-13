import { useState } from "react";
import { Link2, Sparkles, ArrowRight, Settings2, ShieldCheck } from "lucide-react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, firebaseConfigured, googleProvider, signInWithPopup } from "../firebase";
import { useAuth } from "../context/AuthContext";

export function AuthPage() {
  const { loginWithDemo } = useAuth();
  const [mode, setMode] = useState("sign-in"); // sign-in | sign-up
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!firebaseConfigured || !auth) {
      setError("Firebase henüz yapılandırılmamış. Demo Modu ile hemen giriş yapabilirsiniz.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      if (mode === "sign-in") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(
        err.code?.replace("auth/", "").replaceAll("-", " ") || "Giriş yapılamadı"
      );
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!firebaseConfigured || !auth) {
      setError("Firebase henüz yapılandırılmamış. Demo Modu ile hemen giriş yapabilirsiniz.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(
        err.code?.replace("auth/", "").replaceAll("-", " ") || "Google girişi iptal edildi"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Hero Sidebar */}
      <div className="auth-sidebar-hero">
        <div className="auth-hero-glow" />

        <div className="brand-lockup" style={{ padding: 0 }}>
          <div className="brand-mark">
            <Link2 size={20} strokeWidth={2.5} />
          </div>
          <div className="brand-text">
            <strong style={{ color: "#fff" }}>
              Long Story
              <br />
              <span>Short</span>
            </strong>
          </div>
        </div>

        <div className="auth-hero-quote">
          <h1>
            Her tıklamayı
            <br />
            anlamlı kılın.
          </h1>
          <p>
            Trafik yönlendirmelerini, kitleleri ve dönüşümleri takip eden kurumsal düzeyde modern link yönetim platformu.
          </p>
        </div>

        <div className="auth-stat-box">
          <div className="auth-stat-item">
            <strong>2.4B+</strong>
            <span>Yönlendirilen Bağlantı</span>
          </div>
          <div className="auth-stat-item">
            <strong>99.9%</strong>
            <span>Kesintisiz Çalışma Süresi</span>
          </div>
          <div className="auth-stat-item">
            <strong>&lt;15ms</strong>
            <span>Ultra Hızlı Yönlendirme</span>
          </div>
        </div>
      </div>

      {/* Right Login / Sign Up Card */}
      <div className="auth-form-card">
        <div className="auth-heading">
          <div className="page-kicker">
            <Sparkles size={13} /> Güvenli Çalışma Alanı
          </div>
          <h2>
            {mode === "sign-in" ? "Çalışma Alanına Giriş" : "Yeni Hesap Oluşturun"}
          </h2>
          <p>Tüm kısa bağlantılarınızı tek noktadan profesyonelce yönetin.</p>
        </div>

        {/* 1-Click Demo Access Box */}
        <div className="demo-access-banner">
          <div className="demo-access-text">
            <strong>Tek Tıkla Demo Çalışma Alanı</strong>
            <span>Kurulum yapmadan tüm özellikleri anında deneyimleyin.</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={loginWithDemo}>
            İncele <ArrowRight size={13} />
          </button>
        </div>

        {/* Google Sign In */}
        <button
          className="google-auth-btn"
          onClick={handleGoogleAuth}
          disabled={busy}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Google ile Devam Et
        </button>

        <div className="auth-divider">
          <span>veya e-posta ile</span>
        </div>

        <form onSubmit={handleEmailAuth}>
          <div className="form-group">
            <label className="form-label">E-posta Adresi</label>
            <input
              type="email"
              className="input-text"
              placeholder="siz@sirketiniz.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Şifre</label>
            <input
              type="password"
              className="input-text"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div
              style={{
                color: "var(--danger)",
                fontSize: "12px",
                background: "var(--danger-light)",
                padding: "8px 12px",
                borderRadius: "var(--radius-xs)",
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "11px" }}
            disabled={busy}
          >
            {busy ? "İşleniyor..." : mode === "sign-in" ? "Giriş Yap" : "Hesap Oluştur"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            fontSize: "13px",
            color: "var(--text-secondary)",
            marginTop: "20px",
          }}
        >
          {mode === "sign-in" ? "Hesabınız yok mu?" : "Zaten hesabınız var mı?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              setError("");
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--primary)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {mode === "sign-in" ? "Hesap Oluşturun" : "Giriş Yapın"}
          </button>
        </p>
      </div>
    </div>
  );
}
