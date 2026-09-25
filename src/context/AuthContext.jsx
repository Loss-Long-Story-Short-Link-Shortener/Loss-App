import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
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
  const [currentTier, setCurrentTierState] = useState(() => storage.getTier());
  const [billingPeriod, setBillingPeriod] = useState("monthly");

  const [links, setLinks] = useState([]);
  const [linksLoading, setLinksLoading] = useState(false);
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

  // Tier change
  const setCurrentTier = useCallback((tier) => {
    setCurrentTierState(tier);
    storage.setTier(tier);
  }, []);

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
    if (!firebaseConfigured || !auth) {
      // Offline/local guest mode by default
      const savedUser = storage.isDemoUser()
        ? {
            uid: "demo_user",
            email: "demo@loss.tr",
            displayName: "Demo Kullanıcı",
          }
        : null;
      setUser(savedUser);
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch links (user's real links or guest localStorage links)
  const refreshLinks = useCallback(async () => {
    setLinksLoading(true);
    try {
      const fetched = await api.getLinks(user);
      setLinks(fetched);
    } catch (err) {
      console.error("Linkler yüklenemedi:", err);
    } finally {
      setLinksLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshLinks();
  }, [user, refreshLinks]);

  // Actions
  const addLink = useCallback(
    async (payload) => {
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
            title: "Önizleme Bağlantısı",
            tag: "Hero Claim",
          })
            .then(() => {
              showToast(
                "✦ Harika! Önizlemedeki link hesabınıza aktarıldı.",
                "success",
              );
            })
            .catch((err) => {
              console.warn("Otomatik link sahiplenme hatası:", err.message);
            });
        }
      }
    } catch (err) {
      console.warn("Pending claim check error:", err);
    }
  }, [user, addLink, showToast]);

  const removeLink = useCallback(
    async (linkId, linkObj) => {
      const targetLink = linkObj || links.find((l) => l.id === linkId);
      await api.deleteLink(user, linkId, targetLink);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      showToast("Bağlantı silindi", "info");
    },
    [user, links, showToast],
  );

  const updateLink = useCallback(
    async (linkId, updates) => {
      try {
        await api.updateLink(user, linkId, updates);
        setLinks((prev) =>
          prev.map((l) => (l.id === linkId ? { ...l, ...updates } : l)),
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
    setCurrentTier,
    billingPeriod,
    setBillingPeriod,
    links,
    linksLoading,
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
