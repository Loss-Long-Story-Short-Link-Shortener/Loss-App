import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  auth,
  firebaseConfigured,
  googleProvider,
  signInWithPopup,
} from "../firebase";
import { api } from "../api/client";
import { storage } from "../utils/storage";
import { TIERS } from "../constants/tiers";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState("");

  const [theme, setThemeState] = useState(() => {
    const saved = storage.getTheme();
    if (!saved || saved === "light") {
      storage.setTheme("dark");
      return "dark";
    }
    return saved;
  });
  // Plan information is owned by the server (/api/me); the client only displays it.
  const [plan, setPlan] = useState({ tier: "free", subscription: null });
  const currentTier = plan.tier;
  const [billingPeriod, setBillingPeriod] = useState("monthly");

  const [links, setLinks] = useState([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState("");
  const [toasts, setToasts] = useState([]);

  // Toast dispatch
  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Theme change
  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    storage.setTheme(newTheme);
    document.documentElement.dataset.theme = newTheme;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Auth gate helper: if not authenticated, prompts AuthModal
  const requireAuth = useCallback(
    (reason = "Bu özelliği kullanmak için giriş yapmalısınız.") => {
      if (!user) {
        setAuthModalReason(reason);
        setAuthModalOpen(true);
        return false;
      }
      return true;
    },
    [user],
  );

  // Firebase auth listener
  useEffect(() => {
    const restoreDemo = () =>
      storage.isDemoUser()
        ? {
            uid: "demo_admin_01",
            email: "demo@loss.tr",
            displayName: "Demo Yönetici",
            isDemo: true,
          }
        : null;

    if (!firebaseConfigured || !auth) {
      // Local development without Firebase: demo workspace only.
      setUser(restoreDemo());
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || restoreDemo());
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch the user's links and plan. A request counter discards responses
  // that arrive after the user changed (sign-out / account switch).
  const requestRef = useRef(0);
  const refreshLinks = useCallback(async () => {
    const requestId = ++requestRef.current;
    if (!user) {
      setLinks([]);
      setLinksError("");
      setPlan({ tier: "free", subscription: null });
      return;
    }
    setLinksLoading(true);
    try {
      const [fetched, me] = await Promise.all([
        api.getLinks(user),
        user.isDemo ? null : api.getMe(user).catch(() => null),
      ]);
      if (requestId !== requestRef.current) return;
      setLinks(fetched);
      setLinksError("");
      if (me) setPlan({ tier: me.tier, subscription: me.subscription });
    } catch (err) {
      if (requestId !== requestRef.current) return;
      console.error("Linkler yüklenemedi:", err);
      setLinksError(err.message || "Bağlantılar yüklenemedi.");
    } finally {
      if (requestId === requestRef.current) setLinksLoading(false);
    }
  }, [user]);

  /** Re-read plan after a payment or cancellation. Returns the fresh plan. */
  const refreshPlan = useCallback(async () => {
    if (!user || user.isDemo) return null;
    const me = await api.getMe(user);
    setPlan({ tier: me.tier, subscription: me.subscription });
    return me;
  }, [user]);

  useEffect(() => {
    refreshLinks();
  }, [refreshLinks]);

  // Actions
  const addLink = useCallback(
    async (payload) => {
      if (!user) {
        // Guests cannot own links (a link that only exists in this browser
        // would never resolve for anyone else). Remember the request and
        // finish it automatically after sign-in.
        try {
          sessionStorage.setItem(
            "loss_pending_link",
            JSON.stringify({ url: payload.destination, slug: payload.slug }),
          );
        } catch {
          /* storage unavailable */
        }
        setAuthModalReason("Kısa bağlantıyı oluşturmak için giriş yapın. Girdiğiniz adres sizin için saklandı.");
        setAuthModalOpen(true);
        const error = new Error("Bağlantıyı oluşturmak için giriş yapın veya ücretsiz hesap açın.");
        error.code = "auth-required";
        throw error;
      }
      // UX pre-check only; the server enforces the real limit.
      const tierMeta = TIERS[currentTier] || TIERS.free;
      if (links.length >= tierMeta.maxLinks) {
        throw new Error(
          `Plan kotanıza (${tierMeta.maxLinks} link) ulaştınız. Lütfen paketinizi yükseltin.`,
        );
      }
      const created = await api.createLink(user, payload);
      setLinks((prev) => [created, ...prev]);
      showToast("Kısa bağlantı hazır! ✦", "success");
      return created;
    },
    [user, links, currentTier, showToast],
  );

  // Progressive Onboarding: Automatically claim pending link created in hero sandbox upon login
  useEffect(() => {
    if (!user || user.isDemo) return;
    try {
      if (typeof window === "undefined") return;
      const pendingRaw = sessionStorage.getItem("loss_pending_link");
      if (pendingRaw) {
        sessionStorage.removeItem("loss_pending_link");
        const pending = JSON.parse(pendingRaw);
        if (pending?.url) {
          addLink({
            destination: pending.url,
            slug: pending.slug || undefined,
          })
            .then(() => {
              refreshLinks();
              showToast(
                "✦ Harika! Önizlemedeki link hesabınıza aktarıldı.",
                "success",
              );
            })
            .catch((err) => {
              showToast(err.message || "Bağlantı oluşturulamadı.", "error");
            });
        }
      }
    } catch (err) {
      console.warn("Pending claim check error:", err);
    }
  }, [user, addLink, showToast, refreshLinks]);

  const removeLink = useCallback(
    async (linkId) => {
      await api.deleteLink(user, linkId);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      showToast("Bağlantı silindi", "info");
    },
    [user, showToast],
  );

  const updateLink = useCallback(
    async (linkId, updates) => {
      try {
        const saved = await api.updateLink(user, linkId, updates);
        setLinks((prev) =>
          prev.map((l) => (l.id === linkId ? { ...l, ...updates, ...saved } : l)),
        );
        showToast("Bağlantı başarıyla güncellendi ✦", "success");
        return true;
      } catch (err) {
        showToast(err.message || "Güncelleme başarısız oldu", "error");
        return false;
      }
    },
    [user, showToast],
  );

  const toggleLinkStatus = useCallback(
    async (linkId, currentStatus) => {
      const nextStatus = currentStatus === "paused" ? "active" : "paused";
      try {
        await api.updateLinkStatus(user, linkId, nextStatus);
        setLinks((prev) =>
          prev.map((l) => (l.id === linkId ? { ...l, status: nextStatus } : l)),
        );
        showToast(
          nextStatus === "active"
            ? "Bağlantı yayında"
            : "Bağlantı duraklatıldı",
          "info",
        );
        return true;
      } catch (err) {
        showToast(err.message || "Bağlantı durumu güncellenemedi", "error");
        return false;
      }
    },
    [user, showToast],
  );

  const loginWithDemo = useCallback(() => {
    const demoUser = {
      uid: "demo_admin_01",
      email: "demo@loss.tr",
      displayName: "Demo Yönetici",
      isDemo: true,
    };
    storage.setDemoUser(true);
    setUser(demoUser);
    setAuthModalOpen(false);
    showToast("Demo çalışma alanına giriş yapıldı ✦", "success");
  }, [showToast]);

  const updateUserProfile = useCallback(
    async ({ displayName }) => {
      if (auth?.currentUser) {
        try {
          await updateProfile(auth.currentUser, { displayName });
        } catch (err) {
          console.warn("Profile update warning:", err);
        }
      }
      setUser((prev) => (prev ? { ...prev, displayName } : prev));
      showToast("Profil bilgileri kaydedildi ✦", "success");
    },
    [showToast],
  );

  const signOutUser = useCallback(async () => {
    storage.setDemoUser(false);
    setUser(null);
    if (auth) {
      try {
        await signOut(auth);
      } catch {
        // Fallback
      }
    }
    showToast("Oturum kapatıldı", "info");
  }, [showToast]);

  const totalClicks = useMemo(() => {
    return links.reduce((sum, l) => sum + (Number(l.clickCount) || 0), 0);
  }, [links]);

  const value = {
    user,
    authLoading,
    authModalOpen,
    setAuthModalOpen,
    authModalReason,
    requireAuth,
    firebaseConfigured,
    theme,
    setTheme,
    currentTier,
    plan,
    refreshPlan,
    billingPeriod,
    setBillingPeriod,
    links,
    linksLoading,
    linksError,
    totalClicks,
    refreshLinks,
    addLink,
    updateLink,
    removeLink,
    toggleLinkStatus,
    toasts,
    showToast,
    dismissToast,
    loginWithDemo,
    updateUserProfile,
    signOutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
