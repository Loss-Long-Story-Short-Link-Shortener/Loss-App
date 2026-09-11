import React, { useEffect, useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Globe2,
  Key,
  Layers,
  LayoutDashboard,
  Link2,
  ListFilter,
  Lock,
  LogOut,
  MoreHorizontal,
  MousePointerClick,
  Plus,
  QrCode,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import {
  auth,
  firebaseConfigured,
  googleProvider,
  signInWithPopup,
} from "./firebase";
import "./styles.css";

const apiBaseUrl = (import.meta.env.VITE_SHORTENER_API_URL || "")
  .trim()
  .replace(/\/$/, "");

// Plan Tanımları ve Limitleri
const PLANS = {
  free: {
    name: "Starter",
    priceMonth: 0,
    priceYear: 0,
    maxLinks: 25,
    maxClicks: 1000,
    customDomains: 0,
    features: [
      "25 Aktif Link",
      "Temel İstatistikler",
      "Standart QR Kod",
      "Topluluk Desteği",
    ],
    lockedFeatures: [
      "Özel Alan Adı (Custom Domain)",
      "Şifre Korumalı Linkler",
      "UTM Parametreleri",
      "API Erişimi",
    ],
  },
  pro: {
    name: "Growth Pro",
    badge: "En Popüler",
    priceMonth: 19,
    priceYear: 180,
    maxLinks: 2500,
    maxClicks: 50000,
    customDomains: 3,
    features: [
      "2,500 Aktif Link",
      "Gelişmiş Coğrafi & Cihaz Analitiği",
      "3 Özel Domain Ekleme",
      "Şifreli & Süreli Linkler",
      "Dinamik QR Kod İndirme",
      "Öncelikli Destek",
    ],
    lockedFeatures: ["API & Webhook Erişimi", "SSO & Çoklu Ekip"],
  },
  enterprise: {
    name: "Enterprise",
    priceMonth: 59,
    priceYear: 590,
    maxLinks: 100000,
    maxClicks: 1000000,
    customDomains: 20,
    features: [
      "Sınırsız Link & Tıklama",
      "20 Özel Domain",
      "REST API & Webhooks",
      "Özel Ekip Rolleri",
      "99.9% SLA & 7/24 Telefon Desteği",
      "Özel SSL Sertifikaları",
    ],
    lockedFeatures: [],
  },
};

const INITIAL_DEMO_LINKS = [
  {
    id: "lss-1",
    title: "Yaz Kampanyası Landing Page",
    destination:
      "https://consolaktif.com.tr/kampanyalar/yaz-2026?utm_source=instagram",
    slug: "yaz26",
    shortUrl: "https://go.consolaktif.com.tr/yaz26",
    clickCount: 1420,
    status: "active",
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    tags: ["Pazarlama", "Instagram"],
    password: "",
    expiresAt: "2026-10-31",
    devices: { mobile: 68, desktop: 28, tablet: 4 },
  },
  {
    id: "lss-2",
    title: "Şirket Tanıtım Sunumu 2026 PDF",
    destination: "https://drive.google.com/file/d/181283hjasd8912/view",
    slug: "sunum",
    shortUrl: "https://go.consolaktif.com.tr/sunum",
    clickCount: 384,
    status: "active",
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    tags: ["Satış", "Pitch"],
    password: "••••••••",
    expiresAt: "",
    devices: { mobile: 22, desktop: 74, tablet: 4 },
  },
];

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState(
    () => window.localStorage.getItem("lss-theme") || "light",
  );
  const [links, setLinks] = useState(INITIAL_DEMO_LINKS);
  const [activePage, setActivePage] = useState("Overview");

  // Modallar
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState("general"); // general | utm | security
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [activeQrLink, setActiveQrLink] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Abonelik Durumu
  const [subscription, setSubscription] = useState("free"); // free | pro | enterprise
  const [billingCycle, setBillingCycle] = useState("monthly"); // monthly | annual

  // Form Değerleri
  const [linkForm, setLinkForm] = useState({
    destination: "",
    slug: "",
    title: "",
    tag: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    password: "",
    expiresAt: "",
    iosRedirect: "",
    androidRedirect: "",
  });
  const [linkError, setLinkError] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [createdLink, setCreatedLink] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Arama & Filtreleme
  const [searchQuery, setSearchQuery] = useState("");

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2200);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("lss-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
  }, []);

  const totalClicks = useMemo(() => {
    return links.reduce((sum, l) => sum + Number(l.clickCount || 0), 0);
  }, [links]);

  const filteredLinks = useMemo(() => {
    return links.filter(
      (l) =>
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.destination.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [links, searchQuery]);

  // Yeni Link Oluşturma
  const handleCreateLink = async (e) => {
    e.preventDefault();
    setLinkError("");

    // Free plan limiti kontrolü
    if (subscription === "free" && links.length >= PLANS.free.maxLinks) {
      setLinkError(
        "Ücretsiz link sınırına ulaştınız. Lütfen paketinizi yükseltin.",
      );
      setShowPricingModal(true);
      return;
    }

    // Free planda parola kontrolü
    if (subscription === "free" && (linkForm.password || linkForm.expiresAt)) {
      setLinkError("Şifreli ve süreli linkler Pro pakete özeldir.");
      setShowPricingModal(true);
      return;
    }

    setLinkBusy(true);

    try {
      let finalUrl = linkForm.destination.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = `https://${finalUrl}`;
      }

      // UTM ekleme
      const urlObj = new URL(finalUrl);
      if (linkForm.utmSource)
        urlObj.searchParams.set("utm_source", linkForm.utmSource);
      if (linkForm.utmMedium)
        urlObj.searchParams.set("utm_medium", linkForm.utmMedium);
      if (linkForm.utmCampaign)
        urlObj.searchParams.set("utm_campaign", linkForm.utmCampaign);
      finalUrl = urlObj.toString();

      const slug =
        linkForm.slug.trim() || Math.random().toString(36).substring(2, 8);
      const shortUrl = `https://go.consolaktif.com.tr/${slug}`;

      const newLinkObj = {
        id: `link-${Date.now()}`,
        title: linkForm.title || urlObj.hostname,
        destination: finalUrl,
        slug,
        shortUrl,
        clickCount: 0,
        status: "active",
        createdAt: new Date().toISOString(),
        tags: linkForm.tag ? [linkForm.tag] : ["Genel"],
        password: linkForm.password,
        expiresAt: linkForm.expiresAt,
        devices: { mobile: 50, desktop: 45, tablet: 5 },
      };

      setLinks((prev) => [newLinkObj, ...prev]);
      setCreatedLink(newLinkObj);
      await navigator.clipboard?.writeText(shortUrl);
      triggerToast("Kısa link panoya kopyalandı!");

      // Formu temizle
      setLinkForm({
        destination: "",
        slug: "",
        title: "",
        tag: "",
        utmSource: "",
        utmMedium: "",
        utmCampaign: "",
        password: "",
        expiresAt: "",
        iosRedirect: "",
        androidRedirect: "",
      });
    } catch (err) {
      setLinkError(err.message || "Geçersiz URL girdiniz.");
    } finally {
      setLinkBusy(false);
    }
  };

  const deleteLink = (id) => {
    if (confirm("Bu bağlantıyı silmek istediğinizden emin misiniz?")) {
      setLinks(links.filter((l) => l.id !== id));
      triggerToast("Bağlantı silindi.");
    }
  };

  const toggleLinkStatus = (id) => {
    setLinks(
      links.map((l) => {
        if (l.id === id) {
          return { ...l, status: l.status === "active" ? "paused" : "active" };
        }
        return l;
      }),
    );
  };

  if (!firebaseConfigured && !user) {
    // Firebase ayarlı değilse bile sistemi test edebilmek için demo hesabı açma olanağı
  }

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="brand-mark animate-pulse">
          <Link2 size={24} />
        </div>
        <span>Long Story Short yükleniyor...</span>
      </div>
    );
  }

  if (!user && firebaseConfigured) {
    return <AuthScreen />;
  }

  const currentPlanMeta = PLANS[subscription];
  const usageRatio = Math.min(
    100,
    Math.round((links.length / currentPlanMeta.maxLinks) * 100),
  );

  return (
    <div className={`app-shell ${theme === "dark" ? "dark-theme" : ""}`}>
      {/* SOL MENÜ (SIDEBAR) */}
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Link2 size={19} strokeWidth={2.7} />
          </div>
          <div>
            <strong>
              Long Story
              <br />
              <span>Short</span>
            </strong>
          </div>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">
            {subscription === "enterprise"
              ? "👑"
              : subscription === "pro"
                ? "⭐"
                : "🚀"}
          </div>
          <div>
            <span className="eyebrow">{currentPlanMeta.name} Plan</span>
            <strong>Ana Çalışma Alanı</strong>
          </div>
          <ChevronDown size={15} />
        </div>

        <nav className="primary-nav">
          <p className="nav-label">Çalışma Alanı</p>
          {[
            ["Overview", LayoutDashboard, "Genel Bakış"],
            ["Links", Link2, "Bağlantılar"],
            ["Analytics", BarChart3, "Detaylı Analitik"],
            ["QR Codes", QrCode, "QR Stüdyosu"],
          ].map(([key, Icon, label]) => (
            <button
              className={`nav-item ${activePage === key ? "selected" : ""}`}
              key={key}
              onClick={() => setActivePage(key)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {key === "Links" && links.length > 0 && (
                <b className="nav-count">{links.length}</b>
              )}
            </button>
          ))}

          <p className="nav-label nav-label-spaced">Yönetim & Büyüme</p>
          {[
            ["Domains", Globe2, "Özel Domainler"],
            ["Billing", CreditCard, "Paketler & Fatura"],
            ["API", Key, "API & Entegrasyon"],
          ].map(([key, Icon, label]) => (
            <button
              className={`nav-item ${activePage === key ? "selected" : ""}`}
              key={key}
              onClick={() => setActivePage(key)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {key === "Billing" && subscription === "free" && (
                <span className="nav-pro-badge">PRO</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {/* Kota Kartı */}
          <div className="usage-card">
            <div className="usage-top">
              <span>Link Kotası</span>
              <span>
                {links.length} / {currentPlanMeta.maxLinks}
              </span>
            </div>
            <div className="progress">
              <span style={{ width: `${usageRatio}%` }} />
            </div>
            <p>
              {totalClicks.toLocaleString()} <em>aylık tıklama</em>
            </p>
            {subscription === "free" ? (
              <button
                onClick={() => setShowPricingModal(true)}
                className="upgrade-btn-highlight"
              >
                <Zap size={13} /> Pro'ya Yükselt (%20 İndirim)
              </button>
            ) : (
              <button onClick={() => setActivePage("Billing")}>
                Aboneliği Yönet <ArrowUpRight size={13} />
              </button>
            )}
          </div>

          <div className="profile">
            <div className="profile-avatar">
              {(user?.displayName || user?.email || "Admin")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div style={{ overflow: "hidden" }}>
              <strong>{user?.displayName || "Pro Kullanıcı"}</strong>
              <span>{user?.email || "admin@consolaktif.com.tr"}</span>
            </div>
            <button
              className="icon-button"
              onClick={() => signOut(auth || {})}
              title="Çıkış Yap"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ANA İÇERİK (MAIN CONTENT) */}
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Çalışma Alanı</span>
            <span>/</span>
            <strong>{activePage}</strong>
          </div>

          <div className="top-actions">
            {subscription === "free" && (
              <button
                className="primary-pill-btn"
                onClick={() => setShowPricingModal(true)}
              >
                <Sparkles size={14} /> Planı Yükselt
              </button>
            )}

            <button
              className="theme-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Tema değiştir"
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>

            <div className="profile-menu-wrap">
              <button
                className="avatar-small"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                {(user?.email || "U").slice(0, 1).toUpperCase()}
              </button>
              {showProfileMenu && (
                <div className="profile-menu">
                  <div className="profile-menu-user">
                    <strong>{user?.displayName || "Hesabım"}</strong>
                    <span>{user?.email || "Giriş yapıldı"}</span>
                  </div>
                  <button
                    onClick={() => {
                      setActivePage("Billing");
                      setShowProfileMenu(false);
                    }}
                  >
                    <CreditCard size={14} /> Abonelik Planım
                  </button>
                  <button
                    onClick={() => {
                      setActivePage("API");
                      setShowProfileMenu(false);
                    }}
                  >
                    <Key size={14} /> Geliştirici API Anahtarı
                  </button>
                  <button
                    className="logout-action"
                    onClick={() => signOut(auth || {})}
                  >
                    <LogOut size={14} /> Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content-wrap">
          {/* Üst Başlık & Buton */}
          <div className="page-heading">
            <div>
              <p className="kicker">
                <Activity size={14} /> {currentPlanMeta.name} TIER · BULUT
                ALTYAPISI
              </p>
              <h1>
                {activePage === "Overview" && "Performans & İstatistikler"}
                {activePage === "Links" && "Tüm Kısaltılmış Linkler"}
                {activePage === "Analytics" && "Kitle & Trafik Analitiği"}
                {activePage === "QR Codes" && "Dinamik QR Kod Stüdyosu"}
                {activePage === "Domains" && "Özel Markalı Alan Adları"}
                {activePage === "Billing" && "Abonelik & Fiyatlandırma"}
                {activePage === "API" && "REST API & Geliştirici Portali"}
              </h1>
              <p className="subheading">
                Hedef kitlenize yönelen tüm trafiği gerçek zamanlı yönetin ve
                ölçümleyin.
              </p>
            </div>
            <button
              className="primary-button"
              onClick={() => setShowModal(true)}
            >
              <Plus size={18} /> Yeni Link Oluştur
            </button>
          </div>

          {/* 1. GENEL BAKIŞ (OVERVIEW) */}
          {activePage === "Overview" && (
            <>
              <section className="stats-grid">
                <StatCard
                  label="Toplam Tıklama"
                  value={totalClicks.toLocaleString()}
                  change="+24.8%"
                  trend="up"
                  icon={MousePointerClick}
                  note="Son 30 güne göre"
                />
                <StatCard
                  label="Aktif Linkler"
                  value={links.filter((l) => l.status === "active").length}
                  change="Canlı"
                  trend="neutral"
                  icon={Link2}
                  note={`${links.length} toplam link`}
                />
                <StatCard
                  label="Ort. Tıklanma Oranı (CTR)"
                  value="14.2%"
                  change="+2.1%"
                  trend="up"
                  icon={BarChart3}
                  note="Tüm kampanyalar"
                />
                <StatCard
                  label="En Çok Trafik Çeken Ülke"
                  value="Türkiye 🇹🇷"
                  change="%74"
                  trend="neutral"
                  icon={Globe2}
                  note="İkinci: Almanya %12"
                />
              </section>

              {/* Görsel Alan Grafiği & Cihaz Dağılımı */}
              <section className="dashboard-grid">
                <div className="panel analytics-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Haftalık Tıklama Trendi</h2>
                      <p>Son 7 gündeki tekil yönlendirme hacmi.</p>
                    </div>
                    <div className="period-picker">
                      <CalendarDays size={14} /> Bu Hafta
                    </div>
                  </div>

                  {/* Vektör Grafik Çizimi */}
                  <div className="modern-chart-box">
                    <svg viewBox="0 0 500 150" className="chart-svg">
                      <defs>
                        <linearGradient
                          id="chartGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#2168f3"
                            stopOpacity="0.4"
                          />
                          <stop
                            offset="100%"
                            stopColor="#2168f3"
                            stopOpacity="0.0"
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,130 Q70,90 140,110 T280,45 T420,70 T500,20 L500,150 L0,150 Z"
                        fill="url(#chartGrad)"
                      />
                      <path
                        d="M0,130 Q70,90 140,110 T280,45 T420,70 T500,20"
                        fill="none"
                        stroke="#2168f3"
                        strokeWidth="3"
                      />
                    </svg>
                    <div className="chart-days-row">
                      <span>Pzt</span>
                      <span>Sal</span>
                      <span>Çar</span>
                      <span>Per</span>
                      <span>Cum</span>
                      <span>Cmt</span>
                      <span>Paz</span>
                    </div>
                  </div>
                </div>

                {/* Cihaz Dağılım Paneli */}
                <div className="panel traffic-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Cihaz Dağılımı</h2>
                      <p>Kullanıcıların bağlandığı platformlar.</p>
                    </div>
                  </div>
                  <div className="device-stat-bars">
                    <div className="device-bar-item">
                      <div className="device-title">
                        <Smartphone size={16} /> Mobil
                        <strong>%64</strong>
                      </div>
                      <div className="progress mini">
                        <span style={{ width: "64%" }} />
                      </div>
                    </div>
                    <div className="device-bar-item">
                      <div className="device-title">
                        <Laptop size={16} /> Masaüstü
                        <strong>%31</strong>
                      </div>
                      <div className="progress mini">
                        <span style={{ width: "31%", background: "#35b995" }} />
                      </div>
                    </div>
                    <div className="device-bar-item">
                      <div className="device-title">
                        <Layers size={16} /> Tablet & Diğer
                        <strong>%5</strong>
                      </div>
                      <div className="progress mini">
                        <span style={{ width: "5%", background: "#f1bd43" }} />
                      </div>
                    </div>
                  </div>
                  <div className="plan-perk-note">
                    <ShieldCheck size={14} /> Bot filtreleme ve IP spoofing
                    koruması devrede.
                  </div>
                </div>
              </section>

              {/* Son Linkler Tablosu */}
              <LinksTable
                links={links.slice(0, 5)}
                onDelete={deleteLink}
                onToggleStatus={toggleLinkStatus}
                onOpenQr={(l) => setActiveQrLink(l)}
                onCopy={(url) => {
                  navigator.clipboard?.writeText(url);
                  triggerToast("Link panoya kopyalandı!");
                }}
              />
            </>
          )}

          {/* 2. BAĞLANTILAR (LINKS) */}
          {activePage === "Links" && (
            <div className="panel links-panel">
              <div className="panel-header links-header">
                <div>
                  <h2>Bağlantı Kitaplığı ({filteredLinks.length})</h2>
                  <p>
                    Arama yapabilir, durumları duraklatabilir veya QR kodlarını
                    alabilirsiniz.
                  </p>
                </div>
                <div className="table-actions">
                  <div className="search-field">
                    <Search size={15} />
                    <input
                      placeholder="Slug veya hedef URL ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <LinksTable
                links={filteredLinks}
                onDelete={deleteLink}
                onToggleStatus={toggleLinkStatus}
                onOpenQr={(l) => setActiveQrLink(l)}
                onCopy={(url) => {
                  navigator.clipboard?.writeText(url);
                  triggerToast("Link panoya kopyalandı!");
                }}
              />
            </div>
          )}

          {/* 3. DETAYLI ANALİTİK (ANALYTICS) */}
          {activePage === "Analytics" && (
            <div className="analytics-view">
              <div className="stats-grid">
                <StatCard
                  label="Tekil Ziyaretçi"
                  value="1,120"
                  change="+18%"
                  trend="up"
                  icon={Users}
                  note="Bot olmayan gerçek kişiler"
                />
                <StatCard
                  label="Hemen Çıkma Oranı"
                  value="%24.1"
                  change="-3.4%"
                  trend="up"
                  icon={TrendingUp}
                  note="Hedefe başarıyla ulaştı"
                />
                <StatCard
                  label="En Çok Yönlendiren"
                  value="Instagram"
                  change="%42"
                  trend="neutral"
                  icon={Sparkles}
                  note="Sosyal medya trafiği"
                />
                <StatCard
                  label="En Hızlı Gün"
                  value="Cuma"
                  change="412 tık"
                  trend="up"
                  icon={CalendarDays}
                  note="Pik saati: 20:00 - 22:00"
                />
              </div>

              <div className="dashboard-grid">
                <div className="panel">
                  <h2>En İyi Yönlendirme Kaynakları (Referrers)</h2>
                  <div className="referrer-list">
                    {[
                      { name: "Instagram / Stories", count: 742, pct: 45 },
                      {
                        name: "Doğrudan / WhatsApp / SMS",
                        count: 420,
                        pct: 28,
                      },
                      { name: "Google Arama", count: 210, pct: 15 },
                      { name: "LinkedIn & X (Twitter)", count: 180, pct: 12 },
                    ].map((ref, idx) => (
                      <div key={idx} className="ref-row">
                        <span>{ref.name}</span>
                        <div className="ref-bar-wrap">
                          <div
                            className="ref-bar"
                            style={{ width: `${ref.pct}%` }}
                          />
                        </div>
                        <strong>
                          {ref.count} tık ({ref.pct}%)
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <h2>Ülke Dağılımı</h2>
                  <div className="country-list">
                    {[
                      { flag: "🇹🇷", country: "Türkiye", clicks: 1240 },
                      { flag: "🇩🇪", country: "Almanya", clicks: 190 },
                      {
                        flag: "🇺🇸",
                        country: "Amerika Birleşik Devletleri",
                        clicks: 88,
                      },
                      { flag: "🇦🇿", country: "Azerbaycan", clicks: 54 },
                      { flag: "🇬🇧", country: "Birleşik Krallık", clicks: 32 },
                    ].map((c, i) => (
                      <div key={i} className="country-row">
                        <span>
                          {c.flag} {c.country}
                        </span>
                        <b>{c.clicks} ziyaret</b>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. QR STÜDYOSU (QR CODES) */}
          {activePage === "QR Codes" && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Dinamik QR Kod Yönetimi</h2>
                  <p>
                    Tüm linkleriniz için anında yüksek çözünürlüklü vektörel QR
                    kodlar üretin.
                  </p>
                </div>
              </div>
              <div className="qr-grid">
                {links.map((link) => (
                  <div key={link.id} className="qr-card">
                    <div className="qr-preview-box">
                      <MockQrSVG value={link.shortUrl} size={130} />
                    </div>
                    <h4>{link.title}</h4>
                    <p>{link.shortUrl}</p>
                    <div className="qr-card-actions">
                      <button
                        className="secondary-button"
                        onClick={() => setActiveQrLink(link)}
                      >
                        <QrCode size={14} /> Özelleştir & İndir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. ÖZEL DOMAINLER (DOMAINS) */}
          {activePage === "Domains" && (
            <div className="panel">
              <div className="subpage-toolbar">
                <div>
                  <h2>Özel Markalı Alan Adları</h2>
                  <p>
                    Kendi `link.sirketiniz.com` gibi kurumsal domaininizi
                    bağlayın.
                  </p>
                </div>
                {subscription === "free" ? (
                  <button
                    className="primary-button"
                    onClick={() => setShowPricingModal(true)}
                  >
                    <Zap size={15} /> Pro İle Domain Ekle
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    onClick={() =>
                      triggerToast("DNS CNAME doğrulama servisi çalıştırıldı.")
                    }
                  >
                    <Plus size={15} /> Yeni Domain Bağla
                  </button>
                )}
              </div>

              <div className="domains-list-styled">
                <div className="domain-box-item active">
                  <div className="domain-info">
                    <div className="status-dot online" />
                    <div>
                      <strong>go.consolaktif.com.tr</strong>
                      <span>
                        Sistem Tarafından Sağlanan Birincil Domain (SSL Aktif)
                      </span>
                    </div>
                  </div>
                  <span className="badge-verified">Doğrulandı</span>
                </div>

                <div className="domain-box-item">
                  <div className="domain-info">
                    <div className="status-dot pending" />
                    <div>
                      <strong>link.markaniz.com</strong>
                      <span>
                        Özel CNAME Kaydı: `cname.consolaktif.com.tr` (Bekliyor)
                      </span>
                    </div>
                  </div>
                  {subscription === "free" ? (
                    <button
                      className="secondary-button"
                      onClick={() => setShowPricingModal(true)}
                    >
                      Kilidi Aç (Pro)
                    </button>
                  ) : (
                    <button className="secondary-button">DNS Doğrula</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 6. PAKETLER & ABONELİK (PRICING & BILLING) */}
          {activePage === "Billing" && (
            <div className="billing-view">
              <div className="billing-header-center">
                <h2>Büyüyen İşletmeniz İçin Şeffaf Planlar</h2>
                <p>
                  İster bireysel projelerinizde kullanın, ister milyonlarca link
                  yöneten kurumsal bir marka olun.
                </p>

                <div className="billing-toggle-container">
                  <span className={billingCycle === "monthly" ? "active" : ""}>
                    Aylık Ödeme
                  </span>
                  <button
                    className={`toggle-switch ${billingCycle === "annual" ? "checked" : ""}`}
                    onClick={() =>
                      setBillingCycle(
                        billingCycle === "monthly" ? "annual" : "monthly",
                      )
                    }
                  >
                    <span className="toggle-slider" />
                  </button>
                  <span className={billingCycle === "annual" ? "active" : ""}>
                    Yıllık Ödeme <b className="save-badge">%20 Tasarruf Edin</b>
                  </span>
                </div>
              </div>

              <div className="pricing-cards-grid">
                {Object.entries(PLANS).map(([planKey, plan]) => {
                  const isCurrent = subscription === planKey;
                  const price =
                    billingCycle === "monthly"
                      ? plan.priceMonth
                      : Math.round(plan.priceYear / 12);

                  return (
                    <div
                      key={planKey}
                      className={`pricing-card ${planKey === "pro" ? "featured" : ""}`}
                    >
                      {plan.badge && (
                        <span className="featured-badge">{plan.badge}</span>
                      )}
                      <h3>{plan.name}</h3>
                      <div className="pricing-cost">
                        <strong>${price}</strong>
                        <span>/ ay</span>
                      </div>
                      <p className="pricing-desc">
                        {planKey === "free" &&
                          "Küçük denemeler ve bireysel içerik üreticileri için."}
                        {planKey === "pro" &&
                          "Pazarlamacılar ve büyümek isteyen profesyonel ekipler için."}
                        {planKey === "enterprise" &&
                          "Özel altyapı ve sınırsız SLA isteyen büyük şirketler için."}
                      </p>

                      <button
                        className={`pricing-action-btn ${isCurrent ? "current" : planKey === "pro" ? "highlight" : ""}`}
                        disabled={isCurrent}
                        onClick={() => {
                          setSubscription(planKey);
                          triggerToast(`${plan.name} paketine geçiş yapıldı!`);
                        }}
                      >
                        {isCurrent
                          ? "Mevcut Planınız"
                          : `${plan.name} Planına Geç`}
                      </button>

                      <div className="plan-divider" />

                      <ul className="plan-features-list">
                        {plan.features.map((feat, i) => (
                          <li key={i}>
                            <Check size={16} className="text-success" /> {feat}
                          </li>
                        ))}
                        {plan.lockedFeatures.map((lfeat, i) => (
                          <li key={i} className="feature-locked">
                            <X size={16} /> {lfeat}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 7. API & GELİŞTİRİCİ (API) */}
          {activePage === "API" && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>REST API & Entegrasyonlar</h2>
                  <p>
                    Uygulamalarınızdan link oluşturmak için API anahtarınızı
                    kullanın.
                  </p>
                </div>
              </div>

              <div className="api-key-box">
                <label>Gizli API Anahtarınız (Bearer Token)</label>
                <div className="api-input-wrap">
                  <input
                    readOnly
                    type="password"
                    value="lss_live_9981248719238bca87612f0012e87a"
                  />
                  <button
                    className="secondary-button"
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        "lss_live_9981248719238bca87612f0012e87a",
                      );
                      triggerToast("API Key kopyalandı!");
                    }}
                  >
                    <Copy size={15} /> Kopyala
                  </button>
                </div>
                <small>
                  Bu anahtarı istemci taraflı (frontend) kodlarda herkese açık
                  paylaşmayın.
                </small>
              </div>

              <div className="code-snippet-box">
                <p>cURL ile Örnek Link Kısaltma İsteği:</p>
                <pre>
                  {`curl -X POST https://api.consolaktif.com.tr/v1/links \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"destination": "https://siteniz.com/urun", "slug": "ozel-kampanya"}'`}
                </pre>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="footer">
            <span>
              Long Story Short · Kurumsal URL Yönetim Platformu © 2026
            </span>
            <span>
              Sistem Durumu: <i className="status-dot online" /> 99.99%
              Erişilebilirlik
            </span>
          </footer>
        </div>
      </main>

      {/* GELİŞMİŞ LİNK OLUŞTURMA MODALI */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <p className="kicker">
                  <Sparkles size={14} /> Gelişmiş Yönlendirme
                </p>
                <h2>Yeni Akıllı Link Kısalt</h2>
              </div>
              <button
                className="close-button"
                onClick={() => {
                  setShowModal(false);
                  setCreatedLink(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            {createdLink ? (
              <div className="created-link-result">
                <div className="created-link-check">✓</div>
                <h3>Kısa Linkiniz Başarıyla Hazır!</h3>
                <p>
                  Panonuza kopyalandı, test etmek için hemen tıklayabilirsiniz:
                </p>
                <a
                  className="created-link-url"
                  href={createdLink.shortUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {createdLink.shortUrl}
                  <ExternalLink size={16} />
                </a>
                <div className="created-link-actions">
                  <button
                    className="secondary-button"
                    onClick={() => {
                      navigator.clipboard?.writeText(createdLink.shortUrl);
                      triggerToast("Kopyalandı!");
                    }}
                  >
                    <Copy size={15} /> Tekrar Kopyala
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setActiveQrLink(createdLink);
                      setShowModal(false);
                    }}
                  >
                    <QrCode size={15} /> QR Kodu Gör
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setCreatedLink(null);
                    }}
                  >
                    <Plus size={15} /> Bir Tane Daha Yap
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Modal Sekmeleri */}
                <div className="modal-nav-tabs">
                  <button
                    type="button"
                    className={modalTab === "general" ? "active" : ""}
                    onClick={() => setModalTab("general")}
                  >
                    Genel Ayarlar
                  </button>
                  <button
                    type="button"
                    className={modalTab === "utm" ? "active" : ""}
                    onClick={() => setModalTab("utm")}
                  >
                    UTM Kampanya Builder
                  </button>
                  <button
                    type="button"
                    className={modalTab === "security" ? "active" : ""}
                    onClick={() => setModalTab("security")}
                  >
                    Hedefleme & Şifreleme
                  </button>
                </div>

                <form onSubmit={handleCreateLink}>
                  {modalTab === "general" && (
                    <div className="modal-tab-pane">
                      <label>
                        Hedef URL (Uzun Bağlantı)*
                        <input
                          autoFocus
                          required
                          type="text"
                          placeholder="https://orneksite.com/cok-uzun-ve-karmasik-kampanya-adresi"
                          value={linkForm.destination}
                          onChange={(e) =>
                            setLinkForm({
                              ...linkForm,
                              destination: e.target.value,
                            })
                          }
                        />
                      </label>

                      <div className="modal-options">
                        <label>
                          Alan Adı
                          <select defaultValue="go.consolaktif.com.tr">
                            <option value="go.consolaktif.com.tr">
                              go.consolaktif.com.tr
                            </option>
                            <option
                              value="link.markaniz.com"
                              disabled={subscription === "free"}
                            >
                              link.markaniz.com{" "}
                              {subscription === "free" ? "(Pro)" : ""}
                            </option>
                          </select>
                        </label>
                        <label>
                          Özel Slug (Takma İsim)
                          <input
                            placeholder="ornek: yaz-indirimi"
                            value={linkForm.slug}
                            onChange={(e) =>
                              setLinkForm({ ...linkForm, slug: e.target.value })
                            }
                          />
                        </label>
                      </div>

                      <div className="modal-options">
                        <label>
                          Bağlantı Başlığı (Opsiyonel)
                          <input
                            placeholder="Panelde görünecek açıklayıcı isim"
                            value={linkForm.title}
                            onChange={(e) =>
                              setLinkForm({
                                ...linkForm,
                                title: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Etiket (Tag)
                          <input
                            placeholder="Örn: Satış, Sosyal Medya, Ads"
                            value={linkForm.tag}
                            onChange={(e) =>
                              setLinkForm({ ...linkForm, tag: e.target.value })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {modalTab === "utm" && (
                    <div className="modal-tab-pane">
                      <p className="tab-info-note">
                        Google Analytics veya Meta reklamlarında tıklamaları
                        ayrıştırmak için kampanya parametreleri tanımlayın.
                      </p>
                      <div className="modal-options">
                        <label>
                          UTM Source
                          <input
                            placeholder="Örn: instagram, newsletter, google"
                            value={linkForm.utmSource}
                            onChange={(e) =>
                              setLinkForm({
                                ...linkForm,
                                utmSource: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          UTM Medium
                          <input
                            placeholder="Örn: cpc, banner, bio, story"
                            value={linkForm.utmMedium}
                            onChange={(e) =>
                              setLinkForm({
                                ...linkForm,
                                utmMedium: e.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                      <label>
                        UTM Campaign
                        <input
                          placeholder="Örn: kasim-indirimi-2026"
                          value={linkForm.utmCampaign}
                          onChange={(e) =>
                            setLinkForm({
                              ...linkForm,
                              utmCampaign: e.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                  )}

                  {modalTab === "security" && (
                    <div className="modal-tab-pane">
                      {subscription === "free" && (
                        <div
                          className="pro-lock-banner"
                          onClick={() => setShowPricingModal(true)}
                        >
                          <Zap size={16} /> Şifre ve Bitiş Süresi Özellikleri{" "}
                          <strong>Pro Pakette</strong> Geçerlidir.
                        </div>
                      )}
                      <div className="modal-options">
                        <label>
                          Şifre Koruması
                          <input
                            type="password"
                            placeholder="Tıklayanların girmesi gereken şifre"
                            disabled={subscription === "free"}
                            value={linkForm.password}
                            onChange={(e) =>
                              setLinkForm({
                                ...linkForm,
                                password: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Son Kullanma Tarihi
                          <input
                            type="date"
                            disabled={subscription === "free"}
                            value={linkForm.expiresAt}
                            onChange={(e) =>
                              setLinkForm({
                                ...linkForm,
                                expiresAt: e.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {linkError && <p className="auth-error">{linkError}</p>}

                  <button
                    className="primary-button modal-submit"
                    disabled={linkBusy}
                  >
                    <Link2 size={16} />{" "}
                    {linkBusy ? "Oluşturuluyor..." : "Kısa Linki Tamamla"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* QR KOD ÖZELLEŞTİRME MODALI */}
      {activeQrLink && (
        <div className="modal-backdrop" onClick={() => setActiveQrLink(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <p className="kicker">
                  <QrCode size={14} /> Vektörel QR Stüdyosu
                </p>
                <h2>{activeQrLink.title}</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setActiveQrLink(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="qr-modal-body">
              <div className="qr-large-preview">
                <MockQrSVG value={activeQrLink.shortUrl} size={200} />
              </div>
              <p className="qr-link-caption">{activeQrLink.shortUrl}</p>
              <div className="qr-download-buttons">
                <button
                  className="primary-button"
                  onClick={() => {
                    triggerToast(
                      "PNG formatında yüksek çözünürlüklü QR indirildi.",
                    );
                  }}
                >
                  <Download size={15} /> PNG Olarak İndir
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    triggerToast("Vektörel SVG QR indirildi.");
                  }}
                >
                  SVG Olarak Al
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HIZLI PAKET YÜKSELTME MODALI (UPGRADE MODAL) */}
      {showPricingModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowPricingModal(false)}
        >
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <p className="kicker">
                  <Zap size={14} /> Sınırları Kaldırın
                </p>
                <h2>Growth Pro Planına Yükseltin</h2>
                <p>
                  Daha fazla link, özel domainler ve şifreli bağlantı
                  özellikleri kazanın.
                </p>
              </div>
              <button
                className="close-button"
                onClick={() => setShowPricingModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="quick-upgrade-content">
              <div className="upgrade-perks">
                <div>
                  ✓ <strong>2,500 Aktif Link</strong> oluşturma hakkı
                </div>
                <div>
                  ✓ <strong>Özel Markalı Domain</strong> (link.sirketiniz.com)
                </div>
                <div>
                  ✓ <strong>Şifreli Bağlantılar</strong> & Süreli Linkler
                </div>
                <div>
                  ✓ <strong>Detaylı Ülke ve UTM Analitiği</strong>
                </div>
              </div>

              <div className="checkout-action-box">
                <div className="checkout-price">
                  <span>Yıllık faturalandırmada sadece</span>
                  <strong>
                    $15 <em>/ ay</em>
                  </strong>
                </div>
                <button
                  className="primary-button"
                  onClick={() => {
                    setSubscription("pro");
                    setShowPricingModal(false);
                    triggerToast("Tebrikler! Pro paketiniz aktif edildi.");
                  }}
                >
                  Hemen Pro'ya Geçin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bildirim Toast'u */}
      {toastMessage && (
        <div className="toast">
          <Check size={16} /> {toastMessage}
        </div>
      )}
    </div>
  );
}

// LİNKLER TABLOSU BİLEŞENİ
function LinksTable({ links, onDelete, onToggleStatus, onOpenQr, onCopy }) {
  if (!links.length) {
    return (
      <div className="table-empty">
        Arama kriterinize uygun veya oluşturulmuş link bulunamadı.
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Bağlantı & Başlık</th>
            <th>Tıklama</th>
            <th>Durum</th>
            <th>Özellikler</th>
            <th>Oluşturulma</th>
            <th style={{ textAlign: "right" }}>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr key={link.id}>
              <td>
                <div className="link-cell">
                  <button
                    className="qr-icon-btn"
                    title="QR Kodu Göster"
                    onClick={() => onOpenQr(link)}
                  >
                    <QrCode size={16} />
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <strong>{link.title}</strong>
                    <div className="link-url-row">
                      <a href={link.shortUrl} target="_blank" rel="noreferrer">
                        {link.shortUrl}
                      </a>
                      <button
                        className="tiny-copy-btn"
                        onClick={() => onCopy(link.shortUrl)}
                        title="Panoya Kopyala"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <span
                      className="destination-preview"
                      title={link.destination}
                    >
                      → {link.destination}
                    </span>
                  </div>
                </div>
              </td>
              <td className="number-cell">
                <span className="click-counter">
                  {Number(link.clickCount || 0).toLocaleString()}
                </span>
              </td>
              <td>
                <button
                  className={`status-pill ${link.status}`}
                  onClick={() => onToggleStatus(link.id)}
                  title="Durumu değiştirmek için tıkla"
                >
                  <i /> {link.status === "active" ? "Aktif" : "Duraklatıldı"}
                </button>
              </td>
              <td>
                <div className="link-perks-icons">
                  {link.password && (
                    <span title="Şifre Korumalı">
                      <Lock size={13} />
                    </span>
                  )}
                  {link.expiresAt && (
                    <span title="Süreli Link">
                      <Clock size={13} />
                    </span>
                  )}
                  {link.tags?.map((t, idx) => (
                    <span key={idx} className="link-tag-bubble">
                      {t}
                    </span>
                  ))}
                </div>
              </td>
              <td className="date-cell">
                {new Date(link.createdAt).toLocaleDateString("tr-TR")}
              </td>
              <td style={{ textAlign: "right" }}>
                <button
                  className="row-delete-btn"
                  onClick={() => onDelete(link.id)}
                  title="Linki Sil"
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// İSTATİSTİK KARTI
function StatCard({ label, value, change, trend, icon: Icon, note }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-icon">
          <Icon size={17} />
        </span>
        <span className="stat-label">{label}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      <div className="stat-bottom">
        <span className={trend === "up" ? "positive" : "neutral"}>
          {trend === "up" && <ArrowUpRight size={14} />}
          {change}
        </span>
        <span>{note}</span>
      </div>
    </div>
  );
}

// BASİT SVG QR KOD ÜRETİCİSİ (Harici Kütüphane Bağımlılığı Olmadan Çalışır)
function MockQrSVG({ value, size = 120 }) {
  // Gerçek QR görünümü hissi veren vektörel desen
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="#2168f3"
      style={{ background: "#fff", padding: "8px", borderRadius: "8px" }}
    >
      {/* Köşe Pozisyon Kareleri */}
      <rect x="5" y="5" width="25" height="25" fill="currentColor" rx="4" />
      <rect x="9" y="9" width="17" height="17" fill="#fff" rx="2" />
      <rect x="13" y="13" width="9" height="9" fill="currentColor" />

      <rect x="70" y="5" width="25" height="25" fill="currentColor" rx="4" />
      <rect x="74" y="9" width="17" height="17" fill="#fff" rx="2" />
      <rect x="78" y="13" width="9" height="9" fill="currentColor" />

      <rect x="5" y="70" width="25" height="25" fill="currentColor" rx="4" />
      <rect x="9" y="74" width="17" height="17" fill="#fff" rx="2" />
      <rect x="13" y="78" width="9" height="9" fill="currentColor" />

      {/* Rastgele Görünümlü Veri Blokları */}
      <rect x="36" y="10" width="6" height="6" />
      <rect x="48" y="14" width="8" height="6" />
      <rect x="36" y="24" width="18" height="6" />
      <rect x="10" y="38" width="6" height="18" />
      <rect x="22" y="44" width="12" height="6" />
      <rect x="40" y="40" width="20" height="20" rx="3" />
      <rect x="70" y="40" width="10" height="6" />
      <rect x="85" y="40" width="8" height="12" />
      <rect x="68" y="60" width="12" height="12" />
      <rect x="38" y="70" width="16" height="8" />
      <rect x="40" y="85" width="8" height="10" />
      <rect x="60" y="80" width="14" height="14" />
      <rect x="80" y="80" width="12" height="8" />
    </svg>
  );
}

// GİRİŞ & KAYIT EKRANI
function AuthScreen() {
  const [mode, setMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    try {
      if (mode === "sign-in") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message || "Giriş yapılamadı");
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-visual">
        <div className="auth-visual-brand">
          <div className="brand-mark">
            <Link2 size={19} />
          </div>
          <strong>
            Long Story
            <br />
            <span>Short</span>
          </strong>
        </div>
        <div className="auth-quote">
          <span>“</span>
          <h1>Her paylaşımı kârlı bir tıklamaya dönüştürün.</h1>
          <p>
            Yüksek hacimli bağlantılar, anlık analitikler ve kurumsal alan adı
            entegrasyonu.
          </p>
        </div>
      </div>

      <section className="auth-card">
        <div className="auth-heading">
          <h2>
            {mode === "sign-in"
              ? "Çalışma Alanına Giriş Yap"
              : "Yeni Hesap Oluştur"}
          </h2>
          <p>Linklerinizi tek bir çatı altından güvenle yönetin.</p>
        </div>
        <button
          className="google-button"
          onClick={() => signInWithPopup(auth, googleProvider)}
        >
          <span className="google-g">G</span> Google ile Hızlı Devam Et
        </button>
        <div className="auth-divider">
          <span>veya e-posta ile</span>
        </div>
        <form onSubmit={handleEmailAuth}>
          <label>
            E-posta Adresi
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ad@sirketiniz.com"
            />
          </label>
          <label>
            Şifre
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button className="primary-button auth-submit">
            {mode === "sign-in" ? "Giriş Yap" : "Hesap Aç"}
          </button>
        </form>
        <p className="auth-switch">
          {mode === "sign-in" ? "Hesabınız yok mu?" : "Zaten üye misiniz?"}{" "}
          <button
            onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          >
            {mode === "sign-in" ? "Hemen Kaydol" : "Giriş Yap"}
          </button>
        </p>
      </section>
    </main>
  );
}

export default App;
createRoot(document.getElementById("root")).render(<App />);
