import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile,
} from "firebase/auth";
import { auth, firebaseConfigured } from "../firebase";
import { api, setSession } from "../lib/api";
import { resetDemo } from "../lib/demo";

const AuthContext = createContext(null);
const DEMO_KEY = "loss_demo_active";
const WS_KEY = "loss_workspace";
const DEMO_USER = { uid: "demo", email: "demo@loss.tr", displayName: "Demo Kullanıcı", isDemo: true };

const readFlag = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const writeFlag = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* ignore */ } };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState("");
  const [workspaceId, setWorkspaceId] = useState(() => readFlag(WS_KEY) || "");
  const userRef = useRef(null);
  userRef.current = user;

  // Firebase session
  useEffect(() => {
    if (readFlag(DEMO_KEY) === "1") {
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }
    if (!firebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
      setLoading(false);
    });
  }, []);

  // Keep the API client pointed at the current user and workspace.
  useEffect(() => {
    if (!user) setSession({});
    else if (user.isDemo) setSession({ demo: true });
    else setSession({ getToken: () => user.getIdToken(), workspaceId });
  }, [user, workspaceId]);

  const refreshMe = useCallback(async () => {
    if (!userRef.current) return null;
    try {
      const data = await api.me();
      setMe(data);
      setMeError("");
      return data;
    } catch (error) {
      // A stale workspace id (removed from team) falls back to the personal workspace.
      if (error.status === 404 && workspaceId) {
        writeFlag(WS_KEY, null);
        setWorkspaceId("");
        return null;
      }
      setMeError(error.message);
      return null;
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!user) { setMe(null); return; }
    // Wait until setSession ran for this user/workspace.
    const id = setTimeout(refreshMe, 0);
    return () => clearTimeout(id);
  }, [user, workspaceId, refreshMe]);

  const switchWorkspace = useCallback((id) => {
    const next = id && id !== user?.uid ? id : "";
    writeFlag(WS_KEY, next || null);
    setWorkspaceId(next);
  }, [user]);

  const actions = useMemo(() => ({
    async signInEmail(email, password) { await signInWithEmailAndPassword(auth, email, password); },
    async signUpEmail(email, password, name) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
    },
    async signInGoogle() { await signInWithPopup(auth, new GoogleAuthProvider()); },
    async resetPassword(email) { await sendPasswordResetEmail(auth, email); },
    startDemo() { resetDemo(); writeFlag(DEMO_KEY, "1"); setUser(DEMO_USER); },
    async signOutUser() {
      writeFlag(DEMO_KEY, null);
      writeFlag(WS_KEY, null);
      setWorkspaceId("");
      setMe(null);
      if (auth && !userRef.current?.isDemo) await signOut(auth).catch(() => {});
      setUser(null);
    },
  }), []);

  const value = useMemo(() => ({
    user, loading, me, meError, refreshMe, workspaceId, switchWorkspace, firebaseConfigured,
    isDemo: Boolean(user?.isDemo), ...actions,
  }), [user, loading, me, meError, refreshMe, workspaceId, switchWorkspace, actions]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function authErrorMessage(code, lang) {
  const tr = lang === "tr";
  switch (code) {
    case "auth/invalid-credential": case "auth/wrong-password": case "auth/user-not-found": case "auth/invalid-login-credentials":
      return tr ? "E-posta veya parola hatalı." : "Incorrect email or password.";
    case "auth/invalid-email": return tr ? "Geçerli bir e-posta adresi girin." : "Enter a valid email address.";
    case "auth/email-already-in-use": return tr ? "Bu e-posta ile kayıt oluşturulamadı. Giriş yapmayı deneyin." : "We couldn't create an account with this email. Try signing in.";
    case "auth/weak-password": return tr ? "Parola en az 6 karakter olmalıdır." : "Password must be at least 6 characters.";
    case "auth/too-many-requests": return tr ? "Çok fazla deneme. Lütfen biraz bekleyin." : "Too many attempts. Please wait a moment.";
    case "auth/network-request-failed": return tr ? "Ağ bağlantısı kurulamadı." : "Network error.";
    case "auth/popup-closed-by-user": case "auth/cancelled-popup-request": return tr ? "Giriş penceresi kapatıldı." : "The sign-in window was closed.";
    case "auth/popup-blocked": return tr ? "Tarayıcı açılır pencereyi engelledi." : "The browser blocked the popup.";
    default: return tr ? "İşlem başarısız oldu. Lütfen tekrar deneyin." : "Something went wrong. Please try again.";
  }
}
