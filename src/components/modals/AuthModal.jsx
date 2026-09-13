import { useState } from "react";
import { Link2, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { Modal } from "../common/Modal";
import { auth, firebaseConfigured, googleProvider, signInWithPopup } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

export function AuthModal({ isOpen, onClose, reason }) {
  const { loginWithDemo, showToast } = useAuth();
  const [mode, setMode] = useState("sign-in");
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
        showToast("Giriş yapıldı ✦", "success");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast("Hesap oluşturuldu ✦", "success");
      }
      onClose();
    } catch (err) {
      setError(
        err.code?.replace("auth/", "").replaceAll("-", " ") || "İşlem başarısız oldu"
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
      showToast("Google ile giriş yapıldı ✦", "success");
      onClose();
    } catch (err) {
      setError(
        err.code?.replace("auth/", "").replaceAll("-", " ") || "Google girişi iptal edildi"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "sign-in" ? "Hesabınıza Giriş Yapın" : "Yeni Hesap Oluşturun"}
      subtitle={reason || "Bağlantılarınızı buluta kaydetmek ve tüm araçlara erişmek için giriş yapın."}
      maxWidth="460px"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* 1-Click Demo Login Banner */}
        <div className="demo-access-banner" style={{ margin: "0 0 8px 0" }}>
          <div className="demo-access-text">
            <strong>Tek Tıkla Demo Girişi</strong>
            <span>Hesap açmadan tüm Pro özellikleri test edin.</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={loginWithDemo}>
            Giriş Yap <ArrowRight size={13} />
          </button>
        </div>

        {/* Google button */}
        <button className="google-auth-btn" onClick={handleGoogleAuth} disabled={busy}>
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

        <div className="auth-divider" style={{ margin: "12px 0" }}>
          <span>veya e-posta ile</span>
        </div>

        <form onSubmit={handleEmailAuth}>
          <div className="form-group">
            <label className="form-label">E-posta</label>
            <input
              type="email"
              required
              className="input-text"
              placeholder="siz@sirket.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Şifre</label>
            <input
              type="password"
              required
              minLength={6}
              className="input-text"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                marginBottom: "14px",
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
            {busy ? "İşleniyor..." : mode === "sign-in" ? "Giriş Yap" : "Hesap Aç"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-secondary)", marginTop: "12px" }}>
          {mode === "sign-in" ? "Hesabınız yok mu?" : "Zaten hesabınız var mı?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              setError("");
            }}
            style={{ background: "transparent", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}
          >
            {mode === "sign-in" ? "Hesap Oluşturun" : "Giriş Yapın"}
          </button>
        </p>
      </div>
    </Modal>
  );
}
