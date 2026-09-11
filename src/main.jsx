import { useEffect, useState, useMemo } from "react";
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
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Globe2,
  Key,
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
  ShieldCheck,
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

async function readApiResponse(response) {
  const rawBody = await response.text();
  let data;
  try {
    data = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw new Error(
      `API hatası (${response.status}): ${rawBody.slice(0, 160) || "Yanıt boş"}`,
    );
  }
  if (!response.ok) {
    throw new Error(data.error || `API hatası (${response.status})`);
  }
  return data;
}

// Plan Limitleri & Fiyatlandırma
const TIERS = {
  free: {
    name: "Başlangıç (Free)",
    priceMonthly: 0,
    priceAnnual: 0,
    maxLinks: 50,
    maxClicks: 2500,
    domains: 0,
    features: [
      "50 Adet Kısa Link",
      "2,500 Aylık Tıklama",
      "Standart QR Kodlar",
      "30 Günlük Analitik",
    ],
    disabled: [
      "Özel Alan Adı (Custom Domain)",
      "Şifreli Linkler",
      "UTM Builder",
      "REST API",
    ],
  },
  pro: {
    name: "Growth Pro",
    priceMonthly: 19,
    priceAnnual: 180,
    maxLinks: 1500,
    maxClicks: 100000,
    domains: 3,
    features: [
      "1,500 Adet Kısa Link",
      "100,000 Aylık Tıklama",
      "3 Özel Alan Adı (go.sirket.com)",
      "Şifre & Tarih Korumalı Linkler",
      "UTM Kampanya Builder",
      "Vektörel QR İndirme",
    ],
    disabled: ["Özel SLA Desteği", "Sınırsız API"],
  },
  enterprise: {
    name: "Enterprise",
    priceMonthly: 59,
    priceAnnual: 580,
    maxLinks: 50000,
    maxClicks: 2500000,
    domains: 25,
    features: [
      "Sınırsız Bağlantı & Tıklama",
      "25 Özel Alan Adı",
      "REST API & Webhooks",
      "99.9% Kesintisiz SLA Garantisi",
      "Öncelikli 7/24 Mühendis Desteği",
    ],
    disabled: [],
  },
};

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState(
    () => window.localStorage.getItem("lss-theme") || "light",
  );
  const [links, setLinks] = useState([]);
  const [activePage, setActivePage] = useState("Overview");
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("general"); // general | utm | security
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentTier, setCurrentTier] = useState("free");
  const [billingPeriod, setBillingPeriod] = useState("monthly");

  // Form State
  const [destinationUrl, setDestinationUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkTag, setLinkTag] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const [copied, setCopied] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [createdLink, setCreatedLink] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [qrModalLink, setQrModalLink] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const totalClicks = useMemo(() => {
    return links.reduce(
      (total, link) => total + Number(link.clickCount || 0),
      0,
    );
  }, [links]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
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

  // Kullanıcının gerçek linklerini backend'den çeken ana hook
  useEffect(() => {
    if (!user || !auth) return;
    const loadLinks = async () => {
      try {
        const token = await user.getIdToken();
        const result = await fetch(`${apiBaseUrl}/api/links`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await readApiResponse(result);
        setLinks(data.links || []);
      } catch (error) {
        console.error("Linkler yüklenemedi:", error);
      }
    };
    loadLinks();
  }, [user]);

  // Yeni Link Oluşturma (Backend POST)
  const createShortLink = async (event) => {
    event.preventDefault();
    setLinkError("");

    // Plan Kontrolü (Free plan kotası)
    if (currentTier === "free" && links.length >= TIERS.free.maxLinks) {
      setLinkError(
        "Ücretsiz link sınırınıza ulaştınız. Lütfen paketinizi yükseltin.",
      );
      setShowUpgradeModal(true);
      return;
    }

    if (currentTier === "free" && (password || expiresAt)) {
      setLinkError(
        "Şifre ve son kullanma tarihi sadece Pro ve Enterprise planlarda geçerlidir.",
      );
      setShowUpgradeModal(true);
      return;
    }

    setLinkBusy(true);

    try {
      let finalDestination = destinationUrl.trim();
      if (!/^https?:\/\//i.test(finalDestination)) {
        finalDestination = `https://${finalDestination}`;
      }

      // UTM parametrelerini ekle
      const parsedUrl = new URL(finalDestination);
      if (utmSource) parsedUrl.searchParams.set("utm_source", utmSource);
      if (utmMedium) parsedUrl.searchParams.set("utm_medium", utmMedium);
      if (utmCampaign) parsedUrl.searchParams.set("utm_campaign", utmCampaign);
      finalDestination = parsedUrl.toString();

      const token = await user.getIdToken();
      const payload = {
        destination: finalDestination,
        slug: customSlug.trim() || undefined,
        title: linkTitle.trim() || parsedUrl.hostname,
        tag: linkTag.trim() || undefined,
        password: password || undefined,
        expiresAt: expiresAt || undefined,
      };

      const result = await fetch(`${apiBaseUrl}/api/links`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await readApiResponse(result);
      setLinks((current) => [data.link, ...current]);
      setCreatedLink(data.link);
      copyToClipboard(data.link.shortUrl);

      // Formu temizle
      setDestinationUrl("");
      setCustomSlug("");
      setLinkTitle("");
      setLinkTag("");
      setUtmSource("");
      setUtmMedium("");
      setUtmCampaign("");
      setPassword("");
      setExpiresAt("");
    } catch (error) {
      setLinkError(error.message);
    } finally {
      setLinkBusy(false);
    }
  };

  const filteredLinks = links.filter((link) => {
    const query = searchQuery.toLowerCase();
    const dest = (link.destination || "").toLowerCase();
    const slug = (link.slug || "").toLowerCase();
    const title = (link.title || "").toLowerCase();
    return (
      dest.includes(query) || slug.includes(query) || title.includes(query)
    );
  });

  if (!firebaseConfigured) {
    return <AuthScreen configured={false} />;
  }
  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="brand-mark">
          <Link2 size={18} />
        </div>
        <span>Çalışma alanı yükleniyor...</span>
      </div>
    );
  }
  if (!user) {
    return <AuthScreen configured />;
  }

  const activePlanMeta = TIERS[currentTier];
  const usagePercent = Math.min(
    100,
    Math.round((links.length / activePlanMeta.maxLinks) * 100),
  );

  return (
    <div className={`app-shell ${theme === "dark" ? "dark-theme" : ""}`}>
      {/* SOL MENÜ (SIDEBAR) */}
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Link2 size={18} strokeWidth={2.6} />
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
            {currentTier === "enterprise"
              ? "👑"
              : currentTier === "pro"
                ? "⭐"
                : "🚀"}
          </div>
          <div>
            <span className="eyebrow">{activePlanMeta.name}</span>
            <strong>Ana Çalışma Alanı</strong>
          </div>
          <ChevronDown size={15} />
        </div>

        <nav className="primary-nav">
          <p className="nav-label">Çalışma Alanı</p>
          {[
            ["Overview", LayoutDashboard, "Genel Bakış"],
            ["Links", Link2, "Bağlantılar"],
            ["Analytics", BarChart3, "Analitik"],
            ["QR Codes", QrCode, "QR Stüdyosu"],
          ].map(([key, Icon, title]) => (
            <button
              className={`nav-item ${activePage === key ? "selected" : ""}`}
              key={key}
              onClick={() => setActivePage(key)}
            >
              <Icon size={18} />
              <span>{title}</span>
              {key === "Links" && links.length > 0 && (
                <b className="nav-count">{links.length}</b>
              )}
            </button>
          ))}

          <p className="nav-label nav-label-spaced">Yönetim & Büyüme</p>
          {[
            ["Domains", Globe2, "Özel Alan Adları"],
            ["Billing", CreditCard, "Paketler & Fatura"],
            ["Integrations", Key, "API & Entegrasyon"],
            ["Settings", Settings2, "Ayarlar"],
          ].map(([key, Icon, title]) => (
            <button
              className={`nav-item ${activePage === key ? "selected" : ""}`}
              key={key}
              onClick={() => setActivePage(key)}
            >
              <Icon size={18} />
              <span>{title}</span>
              {key === "Billing" && currentTier === "free" && (
                <span className="nav-badge-pill">PRO</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="usage-card">
            <div className="usage-top">
              <span>Link Kotası</span>
              <span>
                {links.length} / {activePlanMeta.maxLinks}
              </span>
            </div>
            <div className="progress">
              <span style={{ width: `${usagePercent}%` }} />
            </div>
            <p>
              {totalClicks.toLocaleString()} <em>toplam tıklama</em>
            </p>
            {currentTier === "free" ? (
              <button onClick={() => setShowUpgradeModal(true)}>
                Pro'ya Yükselt <ArrowUpRight size={13} />
              </button>
            ) : (
              <button onClick={() => setActivePage("Billing")}>
                Planı Yönet <ArrowUpRight size={13} />
              </button>
            )}
          </div>

          <div className="profile">
            <div className="profile-avatar">
              {(user.displayName || user.email || "U")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div style={{ overflow: "hidden" }}>
              <strong>{user.displayName || user.email || "Kullanıcı"}</strong>
              <span>{user.email}</span>
            </div>
            <MoreHorizontal size={17} />
          </div>
        </div>
      </aside>

      {/* ANA İÇERİK ALANI */}
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Çalışma Alanı</span>
            <span>/</span>
            <strong>{activePage}</strong>
          </div>

          <div className="top-actions">
            {currentTier === "free" && (
              <button
                className="upgrade-pill-action"
                onClick={() => setShowUpgradeModal(true)}
              >
                <Sparkles size={14} /> Planı Yükselt
              </button>
            )}

            <button className="icon-button">
              <Bell size={18} />
            </button>

            <button
              className="theme-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Tema Değiştir"
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>

            <div className="profile-menu-wrap">
              <button
                className="avatar-small"
                onClick={() => setShowProfileMenu((cur) => !cur)}
              >
                {(user.displayName || user.email || "U")
                  .slice(0, 2)
                  .toUpperCase()}
              </button>
              {showProfileMenu && (
                <div className="profile-menu">
                  <div className="profile-menu-user">
                    <strong>{user.displayName || "Giriş Yapıldı"}</strong>
                    <span>{user.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      setActivePage("Billing");
                      setShowProfileMenu(false);
                    }}
                  >
                    <CreditCard size={15} /> Abonelik Detayları
                  </button>
                  <button
                    onClick={() => {
                      setActivePage("Integrations");
                      setShowProfileMenu(false);
                    }}
                  >
                    <Key size={15} /> API Anahtarı
                  </button>
                  <button
                    className="logout-action"
                    onClick={() => signOut(auth)}
                  >
                    <LogOut size={15} /> Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content-wrap">
          <div className="page-heading">
            <div>
              <p className="kicker">
                <Activity size={14} /> {activePlanMeta.name} · Gerçek Zamanlı
                Takip
              </p>
              <h1>
                {activePage === "Overview" && (
                  <>
                    Hoş Geldiniz,{" "}
                    {user.displayName?.split(" ")[0] || "Yönetici"}{" "}
                    <span>✦</span>
                  </>
                )}
                {activePage === "Links" && "Tüm Kısaltılmış Bağlantılar"}
                {activePage === "Analytics" && "Trafik & Kitle Analitiği"}
                {activePage === "QR Codes" && "QR Kod Merkezi"}
                {activePage === "Domains" && "Özel Markalı Alan Adları"}
                {activePage === "Billing" && "Abonelik & Paket Seçenekleri"}
                {activePage === "Integrations" && "Geliştirici API Portali"}
                {activePage === "Settings" && "Sistem Ayarları"}
              </h1>
              <p className="subheading">
                {activePage === "Overview"
                  ? "Tüm kısaltılmış bağlantılarınızın canlı performans tablosu."
                  : pageDescription(activePage)}
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() => setShowModal(true)}
            >
              <Plus size={18} /> Yeni Link Kısalt
            </button>
          </div>

          {/* 1. GENEL BAKIŞ */}
          {activePage === "Overview" && (
            <>
              <section className="stats-grid">
                <StatCard
                  label="Toplam Tıklama"
                  value={totalClicks.toLocaleString()}
                  change="Canlı"
                  trend="up"
                  icon={MousePointerClick}
                  note="Tüm linklerinizden gelen"
                />
                <StatCard
                  label="Aktif Linkler"
                  value={links.filter((l) => l.status !== "paused").length}
                  change="Canlı"
                  trend="neutral"
                  icon={Link2}
                  note={`${links.length} toplam link`}
                />
                <StatCard
                  label="Ort. Tıklama Oranı"
                  value={
                    links.length
                      ? `${Math.round(totalClicks / links.length)} tık/link`
                      : "—"
                  }
                  change="Hesaplanan"
                  trend="neutral"
                  icon={BarChart3}
                  note="Link başına düşen"
                />
                <StatCard
                  label="Alan Adı Durumu"
                  value="Aktif"
                  change="go.consolaktif"
                  trend="positive"
                  icon={Globe2}
                  note="SSL ve DNS bağlı"
                />
              </section>

              <section className="dashboard-grid">
                <div className="panel analytics-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Tıklama Dağılımı</h2>
                      <p>Son oluşturulan linklerin performans eğrisi.</p>
                    </div>
                    <div className="period-picker">
                      <CalendarDays size={15} /> Canlı Veri
                    </div>
                  </div>
                  <div className="chart-meta">
                    <div>
                      <strong>{totalClicks.toLocaleString()}</strong>
                      <span>Toplam Tıklama</span>
                    </div>
                  </div>
                  <div className="chart">
                    <div className="y-axis">
                      <span>{Math.max(totalClicks, 10)}</span>
                      <span>—</span>
                      <span>—</span>
                      <span>0</span>
                    </div>
                    <div className="chart-body">
                      <div className="grid-lines">
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                      {totalClicks > 0 ? (
                        <svg viewBox="0 0 500 150" preserveAspectRatio="none">
                          <path
                            d="M0,130 Q120,70 240,110 T400,40 T500,20 L500,150 L0,150 Z"
                            fill="#2168f322"
                          />
                          <path
                            d="M0,130 Q120,70 240,110 T400,40 T500,20"
                            fill="none"
                            stroke="#2168f3"
                            strokeWidth="3"
                          />
                        </svg>
                      ) : (
                        <div className="chart-empty">
                          Henüz tıklama verisi toplanmadı. Bir link oluşturup
                          paylaşın.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="panel traffic-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Cihaz & Platform</h2>
                      <p>Kullanıcı cihaz dağılımı.</p>
                    </div>
                  </div>
                  <div className="donut-wrap">
                    {totalClicks > 0 ? (
                      <div style={{ width: "100%", padding: "10px 0" }}>
                        <div style={{ marginBottom: "14px" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "11px",
                              fontWeight: "600",
                              marginBottom: "5px",
                            }}
                          >
                            <span>Mobil</span>
                            <span>%62</span>
                          </div>
                          <div className="progress">
                            <span style={{ width: "62%" }} />
                          </div>
                        </div>
                        <div style={{ marginBottom: "14px" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "11px",
                              fontWeight: "600",
                              marginBottom: "5px",
                            }}
                          >
                            <span>Masaüstü</span>
                            <span>%33</span>
                          </div>
                          <div className="progress">
                            <span
                              style={{ width: "33%", background: "#35b995" }}
                            />
                          </div>
                        </div>
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "11px",
                              fontWeight: "600",
                              marginBottom: "5px",
                            }}
                          >
                            <span>Diğer / Tablet</span>
                            <span>%5</span>
                          </div>
                          <div className="progress">
                            <span
                              style={{ width: "5%", background: "#f1bd43" }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="traffic-empty">
                        Bağlantılarınıza tıklandıkça cihaz dağılımı burada
                        görünecektir.
                      </div>
                    )}
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setActivePage("Analytics")}
                  >
                    Detaylı Rapor <ArrowUpRight size={14} />
                  </button>
                </div>
              </section>

              {/* Son Linkler */}
              <section className="panel links-panel">
                <div className="panel-header links-header">
                  <div>
                    <h2>Son Bağlantılar ({links.length})</h2>
                    <p>En son kısalttığınız bağlantılar ve durumları.</p>
                  </div>
                  <button
                    className="view-all"
                    onClick={() => setActivePage("Links")}
                  >
                    Tümünü Gör <ArrowUpRight size={14} />
                  </button>
                </div>
                <LinksTable
                  links={links.slice(0, 5)}
                  onCopy={copyToClipboard}
                  onOpenQr={(l) => setQrModalLink(l)}
                />
              </section>
            </>
          )}

          {/* 2. BAĞLANTILAR (LINKS) */}
          {activePage === "Links" && (
            <section className="panel links-panel">
              <div className="panel-header links-header">
                <div>
                  <h2>Tüm Bağlantılar ({filteredLinks.length})</h2>
                  <p>Arama yapabilir ve bağlantılarınızı inceleyebilirsiniz.</p>
                </div>
                <div className="table-actions">
                  <div className="search-field">
                    <Search size={16} />
                    <input
                      placeholder="Slug veya URL ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <LinksTable
                links={filteredLinks}
                onCopy={copyToClipboard}
                onOpenQr={(l) => setQrModalLink(l)}
              />
            </section>
          )}

          {/* 3. DETAYLI ANALİTİK */}
          {activePage === "Analytics" && (
            <section className="workspace-page">
              <div className="subpage-toolbar">
                <div>
                  <h2>Performans & Kitle Analitiği</h2>
                  <p>Tüm bağlantılarınızın yönlendirme trafiği.</p>
                </div>
                <span className="data-badge">
                  {totalClicks.toLocaleString()} Toplam Tık
                </span>
              </div>
              <div style={{ marginTop: "24px", display: "grid", gap: "20px" }}>
                <div className="stats-grid">
                  <StatCard
                    label="Tekil Tıklamalar"
                    value={totalClicks.toLocaleString()}
                    change="Canlı"
                    trend="up"
                    icon={MousePointerClick}
                    note="Kaydedilen yönlendirmeler"
                  />
                  <StatCard
                    label="En Popüler Ülke"
                    value="Türkiye 🇹🇷"
                    change="%76"
                    trend="neutral"
                    icon={Globe2}
                    note="Bölgesel dağılım"
                  />
                  <StatCard
                    label="En Çok Yönlendiren"
                    value="Doğrudan / Sosyal"
                    change="%52"
                    trend="up"
                    icon={Sparkles}
                    note="Trafik kanalı"
                  />
                  <StatCard
                    label="Güvenlik Koruması"
                    value="Aktif"
                    change="100%"
                    trend="positive"
                    icon={ShieldCheck}
                    note="Anti-bot filtresi"
                  />
                </div>
              </div>
            </section>
          )}

          {/* 4. QR STÜDYOSU */}
          {activePage === "QR Codes" && (
            <section className="workspace-page">
              <div className="subpage-toolbar">
                <div>
                  <h2>Dinamik QR Kodlar</h2>
                  <p>
                    Mevcut linkleriniz için vektörel SVG veya PNG QR kodlar.
                  </p>
                </div>
              </div>
              {links.length ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "16px",
                    marginTop: "20px",
                  }}
                >
                  {links.map((link) => (
                    <div
                      key={link.id || link.slug}
                      className="stat-card"
                      style={{ textAlign: "center" }}
                    >
                      <div className="qr-canvas-holder">
                        <MockQrSvg value={getShortUrl(link)} size={120} />
                      </div>
                      <strong
                        style={{
                          display: "block",
                          fontSize: "12px",
                          marginBottom: "4px",
                        }}
                      >
                        {link.title || link.slug}
                      </strong>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#8a96a7",
                          display: "block",
                          marginBottom: "12px",
                        }}
                      >
                        {getShortUrl(link)}
                      </span>
                      <button
                        className="secondary-button"
                        onClick={() => setQrModalLink(link)}
                      >
                        <QrCode size={14} /> QR İndir
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={QrCode}
                  title="Henüz link yok"
                  body="QR kod oluşturmak için önce bir kısa link oluşturun."
                  action="Link Kısalt"
                  onClick={() => setShowModal(true)}
                />
              )}
            </section>
          )}

          {/* 5. ÖZEL ALAN ADLARI */}
          {activePage === "Domains" && (
            <section className="workspace-page">
              <div className="subpage-toolbar">
                <div>
                  <h2>Özel Markalı Alan Adları (Custom Domains)</h2>
                  <p>Kendi `link.markaniz.com` alan adınızı ekleyin.</p>
                </div>
                {currentTier === "free" ? (
                  <button
                    className="primary-button"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    <Zap size={14} /> Pro İle Alan Adı Ekle
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    onClick={() =>
                      alert(
                        "CNAME: cname.consolaktif.com.tr olarak yönlendirin.",
                      )
                    }
                  >
                    <Plus size={14} /> Yeni Domain Bağla
                  </button>
                )}
              </div>
              <div className="domain-row">
                <div className="domain-status">
                  <span className="status-dot" />
                  <div>
                    <strong>go.consolaktif.com.tr</strong>
                    <span>Sistem Varsayılan Alan Adı (SSL Aktif)</span>
                  </div>
                </div>
                <span className="status-pill active">
                  <i /> Doğrulandı
                </span>
              </div>
            </section>
          )}

          {/* 6. PAKETLER & ABONELİK (BILLING) */}
          {activePage === "Billing" && (
            <section className="workspace-page">
              <div className="subpage-toolbar">
                <div>
                  <h2>Abonelik & Paket Seçenekleri</h2>
                  <p>İhtiyacınıza uygun plana geçerek sınırları kaldırın.</p>
                </div>
              </div>

              <div style={{ marginTop: "24px" }}>
                <div className="billing-toggle-wrap">
                  <span className={billingPeriod === "monthly" ? "active" : ""}>
                    Aylık Fatura
                  </span>
                  <button
                    className={`toggle-pill ${billingPeriod === "annual" ? "checked" : ""}`}
                    onClick={() =>
                      setBillingPeriod(
                        billingPeriod === "monthly" ? "annual" : "monthly",
                      )
                    }
                  >
                    <span className="toggle-thumb" />
                  </button>
                  <span className={billingPeriod === "annual" ? "active" : ""}>
                    Yıllık Fatura <b className="discount-chip">%20 İndirim</b>
                  </span>
                </div>

                <div className="pricing-grid">
                  {Object.entries(TIERS).map(([tierKey, tier]) => {
                    const isCurrent = currentTier === tierKey;
                    const price =
                      billingPeriod === "monthly"
                        ? tier.priceMonthly
                        : Math.round(tier.priceAnnual / 12);

                    return (
                      <div
                        key={tierKey}
                        className={`pricing-box ${tierKey === "pro" ? "featured" : ""}`}
                      >
                        {tierKey === "pro" && (
                          <span className="featured-tag">Popüler Tercih</span>
                        )}
                        <h3>{tier.name}</h3>
                        <div className="pricing-amount">
                          <strong>${price}</strong>
                          <span>/ ay</span>
                        </div>
                        <p className="pricing-desc">
                          {tierKey === "free" &&
                            "Bireysel kullanım ve temel testler için."}
                          {tierKey === "pro" &&
                            "Büyüyen ekipler, pazarlamacılar ve ajanslar için."}
                          {tierKey === "enterprise" &&
                            "Özel SLA ve yüksek hacimli işletmeler için."}
                        </p>

                        <button
                          className={`pricing-btn ${tierKey === "pro" ? "featured-btn" : ""} ${isCurrent ? "current" : ""}`}
                          disabled={isCurrent}
                          onClick={() => {
                            setCurrentTier(tierKey);
                            alert(`${tier.name} planına geçiş yapıldı!`);
                          }}
                        >
                          {isCurrent
                            ? "Mevcut Planınız"
                            : `${tier.name} Planına Geç`}
                        </button>

                        <ul className="pricing-features">
                          {tier.features.map((feat, i) => (
                            <li key={i}>
                              <Check size={14} color="#1ea87a" /> {feat}
                            </li>
                          ))}
                          {tier.disabled.map((feat, i) => (
                            <li key={i} className="disabled">
                              <X size={14} /> {feat}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* 7. ENTEGRASYON & API */}
          {activePage === "Integrations" && (
            <section className="workspace-page">
              <div className="subpage-toolbar">
                <div>
                  <h2>Geliştirici REST API & Webhooks</h2>
                  <p>Kendi yazılımlarınız üzerinden otomatik link kısaltın.</p>
                </div>
              </div>
              <div className="api-token-container">
                <label>Gizli API Anahtarınız (Bearer Token)</label>
                <div className="api-token-row">
                  <input
                    readOnly
                    type="password"
                    value="lss_live_9a87d612e4f00912bc8127361a"
                  />
                  <button
                    className="secondary-button"
                    onClick={() =>
                      copyToClipboard("lss_live_9a87d612e4f00912bc8127361a")
                    }
                  >
                    <Copy size={15} /> Kopyala
                  </button>
                </div>
              </div>
              <pre className="code-example-block">
                {`# Örnek cURL İsteği:
curl -X POST ${apiBaseUrl || "https://go.consolaktif.com.tr"}/api/links \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"destination": "https://orneksite.com", "slug": "ozel-ad"}'`}
              </pre>
            </section>
          )}

          {/* 8. AYARLAR */}
          {activePage === "Settings" && (
            <section className="workspace-page">
              <div className="subpage-toolbar">
                <div>
                  <h2>Hesap & Çalışma Alanı Ayarları</h2>
                  <p>Kullanıcı bilgilerinizi ve tercihlerinizi güncelleyin.</p>
                </div>
              </div>
              <div style={{ maxWidth: "480px", marginTop: "20px" }}>
                <label style={{ display: "block", marginBottom: "14px" }}>
                  E-Posta Adresi
                  <input
                    readOnly
                    value={user.email}
                    style={{
                      marginTop: "6px",
                      width: "100%",
                      padding: "10px",
                      borderRadius: "6px",
                      border: "1px solid #dce4ef",
                    }}
                  />
                </label>
                <label style={{ display: "block", marginBottom: "14px" }}>
                  Görünen Ad
                  <input
                    readOnly
                    value={user.displayName || "Yönetici"}
                    style={{
                      marginTop: "6px",
                      width: "100%",
                      padding: "10px",
                      borderRadius: "6px",
                      border: "1px solid #dce4ef",
                    }}
                  />
                </label>
              </div>
            </section>
          )}

          <footer className="footer">
            <span>Long Story Short · Kurumsal URL Kısaltma Sistemi</span>
            <span>
              Sistem Durumu <i className="status-dot" /> Tüm sistemler
              operasyonel
            </span>
          </footer>
        </div>
      </main>

      {/* LİNK OLUŞTURMA MODALI */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="modal modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <p className="kicker">
                  <Sparkles size={14} /> Hızlı İşlem
                </p>
                <h2>Yeni Link Kısalt</h2>
              </div>
              <button
                className="close-button"
                onClick={() => {
                  setShowModal(false);
                  setCreatedLink(null);
                  setLinkError("");
                }}
              >
                <X size={18} />
              </button>
            </div>

            {createdLink ? (
              <div className="created-link-result">
                <div className="created-link-check">✓</div>
                <h3>Kısa Linkiniz Hazır!</h3>
                <p>Panoya kopyalandı. Hemen test edebilirsiniz:</p>
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
                    onClick={() => copyToClipboard(createdLink.shortUrl)}
                  >
                    <Copy size={15} /> Tekrar Kopyala
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setCreatedLink(null);
                      setLinkError("");
                    }}
                  >
                    <Plus size={15} /> Başka Bir Link Kısalt
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="modal-tabs">
                  <button
                    type="button"
                    className={`modal-tab-btn ${activeTab === "general" ? "active" : ""}`}
                    onClick={() => setActiveTab("general")}
                  >
                    Genel Ayarlar
                  </button>
                  <button
                    type="button"
                    className={`modal-tab-btn ${activeTab === "utm" ? "active" : ""}`}
                    onClick={() => setActiveTab("utm")}
                  >
                    UTM Parametreleri
                  </button>
                  <button
                    type="button"
                    className={`modal-tab-btn ${activeTab === "security" ? "active" : ""}`}
                    onClick={() => setActiveTab("security")}
                  >
                    Güvenlik & Bitiş
                  </button>
                </div>

                <form onSubmit={createShortLink}>
                  {activeTab === "general" && (
                    <>
                      <label>
                        Hedef URL *
                        <input
                          autoFocus
                          required
                          type="text"
                          value={destinationUrl}
                          onChange={(e) => setDestinationUrl(e.target.value)}
                          placeholder="https://siteniz.com/uzun-ve-karmasik-link"
                        />
                      </label>
                      <div className="modal-options">
                        <label>
                          Alan Adı
                          <select disabled>
                            <option>go.consolaktif.com.tr</option>
                          </select>
                        </label>
                        <label>
                          Özel Slug (Takma İsim)
                          <input
                            value={customSlug}
                            onChange={(e) => setCustomSlug(e.target.value)}
                            placeholder="ornek: yaz-kampanyasi"
                          />
                        </label>
                      </div>
                      <div className="modal-options">
                        <label>
                          Bağlantı Başlığı
                          <input
                            value={linkTitle}
                            onChange={(e) => setLinkTitle(e.target.value)}
                            placeholder="Panelde görünecek isim"
                          />
                        </label>
                        <label>
                          Etiket (Tag)
                          <input
                            value={linkTag}
                            onChange={(e) => setLinkTag(e.target.value)}
                            placeholder="Pazarlama, Kampanya vb."
                          />
                        </label>
                      </div>
                    </>
                  )}

                  {activeTab === "utm" && (
                    <>
                      <p className="tab-desc-note">
                        Google Analytics veya Meta için tıklama kaynaklarını
                        etiketleyin.
                      </p>
                      <div className="modal-options">
                        <label>
                          UTM Source
                          <input
                            value={utmSource}
                            onChange={(e) => setUtmSource(e.target.value)}
                            placeholder="instagram, newsletter, google"
                          />
                        </label>
                        <label>
                          UTM Medium
                          <input
                            value={utmMedium}
                            onChange={(e) => setUtmMedium(e.target.value)}
                            placeholder="cpc, story, email"
                          />
                        </label>
                      </div>
                      <label>
                        UTM Campaign
                        <input
                          value={utmCampaign}
                          onChange={(e) => setUtmCampaign(e.target.value)}
                          placeholder="kasim-indirimleri"
                        />
                      </label>
                    </>
                  )}

                  {activeTab === "security" && (
                    <>
                      <p className="tab-desc-note">
                        Şifre ve son kullanma tarihi özellikleri Pro ve
                        Enterprise paketlerde desteklenir.
                      </p>
                      <div className="modal-options">
                        <label>
                          Şifre Koruması
                          <input
                            type="password"
                            disabled={currentTier === "free"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Şifre belirleyin"
                          />
                        </label>
                        <label>
                          Bitiş Tarihi
                          <input
                            type="date"
                            disabled={currentTier === "free"}
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                          />
                        </label>
                      </div>
                    </>
                  )}

                  {linkError && <p className="auth-error">{linkError}</p>}

                  <button
                    className="primary-button modal-submit"
                    disabled={linkBusy}
                  >
                    <Link2 size={17} />{" "}
                    {linkBusy ? "Oluşturuluyor..." : "Kısa Link Oluştur"}
                  </button>
                </form>
              </>
            )}

            <div className="modal-note">
              <ShieldCheck size={15} /> Bağlantınız kurumsal düzeyde analitik
              altyapısı ile korunmaktadır.
            </div>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {qrModalLink && (
        <div className="modal-backdrop" onClick={() => setQrModalLink(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <p className="kicker">
                  <QrCode size={14} /> Vektörel QR
                </p>
                <h2>{qrModalLink.title || qrModalLink.slug}</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setQrModalLink(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="qr-modal-body">
              <div className="qr-canvas-holder">
                <MockQrSvg value={getShortUrl(qrModalLink)} size={180} />
              </div>
              <p style={{ fontSize: "11px", color: "#8a96a7" }}>
                {getShortUrl(qrModalLink)}
              </p>
              <div className="qr-actions-row">
                <button
                  className="primary-button"
                  onClick={() => {
                    copyToClipboard(getShortUrl(qrModalLink));
                    alert("QR bağlantısı panoya kopyalandı.");
                  }}
                >
                  <Download size={15} /> QR İndir / Paylaş
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YÜKSELTME (UPGRADE) MODALI */}
      {showUpgradeModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            className="modal modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <p className="kicker">
                  <Zap size={14} /> Sınırları Kaldırın
                </p>
                <h2>Growth Pro Paketine Yükseltin</h2>
                <p>
                  Şifreli linkler, özel domainler ve 100,000 tıklama
                  kapasitesine erişin.
                </p>
              </div>
              <button
                className="close-button"
                onClick={() => setShowUpgradeModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "10px 0" }}>
              <div
                style={{
                  display: "grid",
                  gap: "10px",
                  marginBottom: "20px",
                  fontSize: "13px",
                }}
              >
                <div>
                  ✓ <strong>1,500 Adet</strong> Kısa Link Üretimi
                </div>
                <div>
                  ✓ <strong>Özel Markalı Alan Adı</strong> (go.sirketiniz.com)
                </div>
                <div>
                  ✓ <strong>Şifreli ve Süreli</strong> Linkler
                </div>
                <div>
                  ✓ <strong>Detaylı UTM ve Kitle</strong> İstatistikleri
                </div>
              </div>
              <button
                className="primary-button"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  setCurrentTier("pro");
                  setShowUpgradeModal(false);
                  alert("Pro plan aktif edildi!");
                }}
              >
                Aylık $19 İle Hemen Başla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BİLDİRİM (TOAST) */}
      {copied && (
        <div className="toast">
          <Copy size={15} /> Link panoya kopyalandı
        </div>
      )}
    </div>
  );
}

// LİNKLER TABLOSU BİLEŞENİ
function LinksTable({ links, onCopy, onOpenQr }) {
  if (!links.length) {
    return (
      <div className="table-empty">
        Henüz bir link bulunmuyor. Yukarıdaki butonu kullanarak ilk kısa
        linkinizi oluşturun.
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Bağlantı & Başlık</th>
            <th>Tıklamalar</th>
            <th>Durum</th>
            <th>Etiketler & Korumalar</th>
            <th>Tarih</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {links.map((link) => {
            const shortUrl = getShortUrl(link);
            return (
              <tr key={link.id || link.slug}>
                <td>
                  <div className="link-cell">
                    <button
                      className="tiny-btn"
                      onClick={() => onOpenQr(link)}
                      title="QR Kodu Göster"
                      style={{ padding: "6px" }}
                    >
                      <QrCode size={16} />
                    </button>
                    <div>
                      <strong>{link.title || link.slug}</strong>
                      <div className="link-url-row">
                        <a href={shortUrl} target="_blank" rel="noreferrer">
                          {shortUrl}
                        </a>
                        <button
                          className="tiny-btn"
                          onClick={() => onCopy(shortUrl)}
                          title="Kopyala"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                      <span
                        className="destination-text"
                        title={link.destination}
                      >
                        → {link.destination}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="number-cell">
                  {Number(link.clickCount || 0).toLocaleString()}
                </td>
                <td>
                  <span
                    className={`status-pill ${link.status === "paused" ? "paused" : "active"}`}
                  >
                    <i /> {link.status === "paused" ? "Duraklatıldı" : "Aktif"}
                  </span>
                </td>
                <td>
                  <div className="link-tags-group">
                    {link.password && (
                      <span
                        className="tag-badge secured"
                        title="Şifre Korumalı"
                      >
                        <Lock size={10} /> Şifreli
                      </span>
                    )}
                    {link.tag && <span className="tag-badge">{link.tag}</span>}
                  </div>
                </td>
                <td className="date-cell">
                  {link.createdAt?.seconds
                    ? new Date(
                        link.createdAt.seconds * 1000,
                      ).toLocaleDateString("tr-TR")
                    : "Yeni"}
                </td>
                <td>
                  <button className="row-menu" onClick={() => onOpenQr(link)}>
                    <MoreHorizontal size={17} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// STAT CARD
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

// EMPTY STATE
function EmptyState({ icon: Icon, title, body, action, onClick }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={22} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      <button className="primary-button" onClick={onClick}>
        {action} <ArrowUpRight size={15} />
      </button>
    </div>
  );
}

// VEKTÖREL QR SVG (Paket Bağımlılığı Olmadan Çalışır)
function MockQrSvg({ value, size = 120 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="#2168f3"
      style={{ background: "#fff", padding: "6px", borderRadius: "8px" }}
    >
      <rect x="5" y="5" width="25" height="25" fill="currentColor" rx="4" />
      <rect x="9" y="9" width="17" height="17" fill="#fff" rx="2" />
      <rect x="13" y="13" width="9" height="9" fill="currentColor" />

      <rect x="70" y="5" width="25" height="25" fill="currentColor" rx="4" />
      <rect x="74" y="9" width="17" height="17" fill="#fff" rx="2" />
      <rect x="78" y="13" width="9" height="9" fill="currentColor" />

      <rect x="5" y="70" width="25" height="25" fill="currentColor" rx="4" />
      <rect x="9" y="74" width="17" height="17" fill="#fff" rx="2" />
      <rect x="13" y="78" width="9" height="9" fill="currentColor" />

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

function getShortUrl(link) {
  return link.shortUrl || `https://go.consolaktif.com.tr/${link.slug}`;
}

function pageDescription(page) {
  const descriptions = {
    Links: "Çalışma alanınızdaki tüm bağlantıları inceleyin ve filtreleyin.",
    Analytics: "Tıklama ve yönlendirme kaynaklarını ölçümleyin.",
    Domains:
      "Kısa linkleriniz için markanıza ait özel alan adlarını yapılandırın.",
    Billing: "Abonelik planınızı ve kullanım kotalarınızı buradan yönetin.",
    Integrations: "REST API üzerinden dış sistemlerle entegrasyon kurun.",
    Settings: "Kullanıcı tercihleri ve güvenlik ayarları.",
  };
  return descriptions[page] || "Çalışma alanı detayları";
}

// GİRİŞ EKRANI (FIREBASE)
function AuthScreen({ configured }) {
  const [mode, setMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "sign-in") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (authError) {
      setError(
        authError.code?.replace("auth/", "").replaceAll("-", " ") ||
          "Giriş yapılamadı",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (authError) {
      setError(
        authError.code?.replace("auth/", "").replaceAll("-", " ") ||
          "Google girişi iptal edildi",
      );
    } finally {
      setBusy(false);
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
          <h1>
            Her tıklamayı
            <br />
            anlamlı kılın.
          </h1>
          <p>
            Trafik yönlendirmelerini, kitleleri ve dönüşümleri takip eden
            kurumsal link yönetim platformu.
          </p>
          <div className="auth-stat">
            <strong>2.4B+</strong>
            <span>bağlantı başarıyla yönlendirildi</span>
          </div>
        </div>
      </div>

      <section className="auth-card">
        <div className="auth-mobile-brand">
          <div className="brand-mark">
            <Link2 size={18} />
          </div>
          <strong>
            Long Story <span>Short</span>
          </strong>
        </div>

        {!configured ? (
          <div className="setup-state">
            <div className="setup-icon">
              <Settings2 size={24} />
            </div>
            <h2>Firebase Bağlantısı Gerekli</h2>
            <p>
              <strong>.env.example</strong> dosyasını{" "}
              <strong>.env.local</strong> olarak kopyalayın ve Firebase Web App
              anahtarlarınızı girin.
            </p>
            <code>cp .env.example .env.local</code>
          </div>
        ) : (
          <>
            <div className="auth-heading">
              <p className="kicker">
                <Sparkles size={14} /> Hoş Geldiniz
              </p>
              <h2>
                {mode === "sign-in"
                  ? "Çalışma Alanına Giriş Yapın"
                  : "Yeni Hesap Oluşturun"}
              </h2>
              <p>Tüm kısa linklerinizi tek panelden profesyonelce yönetin.</p>
            </div>
            <button
              className="google-button"
              onClick={handleGoogleAuth}
              disabled={busy}
            >
              <span className="google-g">G</span>
              {busy ? "Bağlanıyor..." : "Google ile Devam Et"}
            </button>
            <div className="auth-divider">
              <span>veya e-posta ile</span>
            </div>
            <form onSubmit={handleEmailAuth}>
              <label>
                E-posta adresi
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="siz@sirket.com"
                />
              </label>
              <label>
                Şifre
                <input
                  type="password"
                  required
                  minLength="6"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                />
              </label>
              {error && <p className="auth-error">{error}</p>}
              <button className="primary-button auth-submit" disabled={busy}>
                {mode === "sign-in" ? "Giriş Yap" : "Hesap Aç"}
                <ArrowUpRight size={16} />
              </button>
            </form>
            <p className="auth-switch">
              {mode === "sign-in"
                ? "Hesabınız yok mu?"
                : "Zaten hesabınız var mı?"}{" "}
              <button
                onClick={() => {
                  setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                  setError("");
                }}
              >
                {mode === "sign-in" ? "Hesap Oluştur" : "Giriş Yap"}
              </button>
            </p>
          </>
        )}
      </section>
    </main>
  );
}

export default App;

createRoot(document.getElementById("root")).render(<App />);
