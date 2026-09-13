import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
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
  const [isDemo, setIsDemo] = useState(false);

  const [theme, setThemeState] = useState(() => storage.getTheme());
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

  // Firebase auth listener & demo detection
  useEffect(() => {
    // If not configured or user chose demo mode previously
    if (!firebaseConfigured || storage.isDemoUser()) {
      const demoUser = {
        uid: "demo_admin_user_01",
        email: "demo@consolaktif.com.tr",
        displayName: "Demo Yönetici",
        isDemo: true,
      };
      setUser(demoUser);
      setIsDemo(true);
      setAuthLoading(false);
      return;
    }

    if (!auth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsDemo(false);
        storage.setDemoUser(false);
      } else {
        setUser(null);
        setIsDemo(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch links whenever user changes
  const refreshLinks = useCallback(async () => {
    if (!user) return;
    setLinksLoading(true);
    try {
      const fetched = await api.getLinks(user);
      setLinks(fetched);
    } catch (err) {
      console.error("Linkler alınırken hata:", err);
      showToast("Linkler yüklenirken bir sorun oluştu", "error");
    } finally {
      setLinksLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    if (user) {
      refreshLinks();
    } else {
      setLinks([]);
    }
  }, [user, refreshLinks]);

  // Actions
  const addLink = useCallback(
    async (payload) => {
      const tierMeta = TIERS[currentTier] || TIERS.free;
      if (links.length >= tierMeta.maxLinks) {
        throw new Error(
          `Plan kotanıza (${tierMeta.maxLinks} link) ulaştınız. Lütfen paketinizi yükseltin.`
        );
      }
      const created = await api.createLink(user, payload);
      setLinks((prev) => [created, ...prev]);
      showToast("Kısa link başarıyla oluşturuldu!", "success");
      return created;
    },
    [user, links, currentTier, showToast]
  );

  const removeLink = useCallback(
    async (linkId) => {
      await api.deleteLink(user, linkId);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      showToast("Bağlantı silindi", "info");
    },
    [user, showToast]
  );

  const toggleLinkStatus = useCallback(
    async (linkId, currentStatus) => {
      const nextStatus = currentStatus === "paused" ? "active" : "paused";
      await api.updateLinkStatus(user, linkId, nextStatus);
      setLinks((prev) =>
        prev.map((l) => (l.id === linkId ? { ...l, status: nextStatus } : l))
      );
      showToast(
        nextStatus === "active" ? "Bağlantı aktif edildi" : "Bağlantı duraklatıldı",
        "info"
      );
    },
    [user, showToast]
  );

  const loginWithDemo = useCallback(() => {
    const demoUser = {
      uid: "demo_admin_user_01",
      email: "demo@consolaktif.com.tr",
      displayName: "Demo Yönetici",
      isDemo: true,
    };
    storage.setDemoUser(true);
    setIsDemo(true);
    setUser(demoUser);
    showToast("Demo çalışma alanına giriş yapıldı ✦", "success");
  }, [showToast]);

  const signOutUser = useCallback(async () => {
    storage.setDemoUser(false);
    setIsDemo(false);
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
    isDemo,
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
    removeLink,
    toggleLinkStatus,
    toasts,
    showToast,
    dismissToast,
    loginWithDemo,
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
