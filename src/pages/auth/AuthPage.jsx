import Compressor from "../marketing/Compressor";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "../../ui/icons";
import { Alert, Button, Field, Input, Logo } from "../../ui";
import { useI18n } from "../../lib/i18n";
import { Link, useRouter } from "../../lib/router";
import { authErrorMessage, useAuth } from "../../state/auth";
import { useToast } from "../../state/toast";

function GoogleMark() {
  return (<svg width="16" height="16" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>);
}

export default function AuthPage({ mode }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { navigate, params } = useRouter();
  const { user, loading, signInEmail, signUpEmail, signInGoogle, resetPassword, startDemo, firebaseConfigured } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const register = mode === "register";

  useEffect(() => { if (!loading && user) navigate(params.get("next") || "/app", { replace: true }); }, [loading, user, navigate, params]);

  const run = async (kind, fn) => {
    setBusy(kind); setError("");
    try { await fn(); } catch (e) { setError(authErrorMessage(e.code, lang)); } finally { setBusy(""); }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!firebaseConfigured) { setError(t("Kimlik doğrulama yapılandırılmamış. Demo çalışma alanını deneyebilirsiniz.", "Authentication is not configured. You can try the demo workspace.")); return; }
    run("email", () => (register ? signUpEmail(email.trim(), password, name.trim()) : signInEmail(email.trim(), password)));
  };

  return (
    <div className="auth-page">
      <aside className="auth-side" data-theme="dark">
        <Link to="/"><Logo /></Link>
        <div>
          <h2>{t("Kısa bağlantılar.", "Short links.")} <span className="grad">{t("Net veriler.", "Clear data.")}</span></h2>
          <div className="auth-art"><Compressor /></div>
          <ul>
            {[t("Markalı alan adları ve dinamik QR kodlar", "Branded domains and dynamic QR codes"), t("Çerezsiz, KVKK dostu analiz", "Cookieless, privacy-friendly analytics"), t("Takım rolleri, API ve webhooks", "Team roles, API and webhooks")].map((x) => <li key={x}><Check size={18} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} /> {x}</li>)}
          </ul>
        </div>
        <span style={{ fontSize: 12.5, opacity: 0.7 }}>© {new Date().getFullYear()} loss.tr</span>
      </aside>
      <main className="auth-main">
        <div className="auth-card stack" style={{ gap: 16 }}>
          <Link to="/" className="auth-mobile-logo"><Logo size={26} /></Link>
          <div><h1>{register ? t("Hesap oluşturun", "Create your account") : t("Tekrar hoş geldiniz", "Welcome back")}</h1>
            <p className="muted">{register ? t("Ücretsiz başlayın; kredi kartı gerekmez.", "Start free - no credit card required.") : t("Hesabınıza giriş yapın.", "Sign in to your account.")}</p></div>
          {error && <Alert tone="danger">{error}</Alert>}
          <Button size="lg" block loading={busy === "google"} disabled={!firebaseConfigured} onClick={() => run("google", signInGoogle)}><GoogleMark /> {t("Google ile devam et", "Continue with Google")}</Button>
          <div className="auth-or">{t("veya e-posta ile", "or with email")}</div>
          <form className="stack" onSubmit={submit} noValidate>
            {register && <Field label={t("Ad Soyad", "Full name")} htmlFor="a-name"><Input id="a-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></Field>}
            <Field label={t("E-posta", "Email")} htmlFor="a-email"><Input id="a-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label={t("Parola", "Password")} htmlFor="a-pw" hint={register ? t("En az 6 karakter.", "At least 6 characters.") : undefined}><Input id="a-pw" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            <Button type="submit" variant="primary" size="lg" block loading={busy === "email"}>{register ? t("Hesap oluştur", "Create account") : t("Giriş yap", "Sign in")}</Button>
            {!register && <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "center" }} onClick={() => { if (!email) { setError(t("Önce e-posta adresinizi yazın.", "Enter your email first.")); return; } run("reset", async () => { await resetPassword(email.trim()); toast.success(t("Parola sıfırlama e-postası gönderildi (hesap varsa).", "Password reset email sent (if the account exists).")); }); }}>{t("Parolamı unuttum", "Forgot password")}</button>}
          </form>
          <p style={{ textAlign: "center", fontSize: 13.5 }}>{register ? <>{t("Zaten hesabınız var mı?", "Already have an account?")} <Link to="/login" style={{ color: "var(--accent-text)", fontWeight: 600 }}>{t("Giriş yapın", "Sign in")}</Link></> : <>{t("Hesabınız yok mu?", "No account yet?")} <Link to="/register" style={{ color: "var(--accent-text)", fontWeight: 600 }}>{t("Ücretsiz kaydolun", "Sign up free")}</Link></>}</p>
          <div className="auth-or">{t("ya da", "or")}</div>
          <Button block onClick={() => { startDemo(); navigate("/app"); }}>{t("Hesapsız demoyu dene", "Try the demo without an account")}</Button>
          <p className="hint" style={{ textAlign: "center" }}>{t("Devam ederek", "By continuing you accept the")} <Link to="/terms" style={{ textDecoration: "underline" }}>{t("Kullanım Koşulları", "Terms")}</Link> {t("ve", "and")} <Link to="/privacy" style={{ textDecoration: "underline" }}>{t("Gizlilik Politikası", "Privacy Policy")}</Link>{t("'nı kabul edersiniz.", ".")}</p>
        </div>
      </main>
    </div>
  );
}
