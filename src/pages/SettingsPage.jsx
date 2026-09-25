import { useState } from "react";
import {
  User,
  Sun,
  Moon,
  ShieldCheck,
  Sparkles,
  Globe2,
  Save,
  Check,
  CreditCard,
  Languages,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { TIERS } from "../constants/tiers";
import { SHORT_LINK_HOST } from "../constants/domains";

export function SettingsPage() {
  const {
    user,
    currentTier,
    theme,
    setTheme,
    updateUserProfile,
    links,
    showToast,
  } = useAuth();
  const { t, locale, setLocale } = useLanguage();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const s = t.settings || {};
  const c = t.common || {};

  const tierMeta = TIERS[currentTier] || TIERS.free;
  const userInitials = (user?.displayName || user?.email || "U")
    .slice(0, 2)
    .toUpperCase();

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast(
        locale === "tr" ? "Lütfen bir isim girin" : "Please enter a name",
        "error",
      );
      return;
    }
    setSaving(true);
    try {
      if (updateUserProfile) {
        await updateUserProfile({ displayName: displayName.trim() });
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      showToast(s.saved || "Kaydedildi", "success");
    } catch {
      showToast(
        locale === "tr" ? "Profil kaydedilemedi" : "Could not save profile",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page-wrapper">
      <div className="settings-header">
        <h1 className="settings-title">{s.title || "Ayarlar & Profil"}</h1>
        <p className="settings-subtitle">
          {s.subtitle ||
            "Hesap bilgilerinizi, görünüm tercihlerinizi ve bağlantı ayarlarınızı yönetin."}
        </p>
      </div>

      <div className="settings-grid">
        {/* Profile Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title-group">
              <User size={18} className="settings-card-icon" />
              <div>
                <h2 className="settings-card-title">
                  {s.profileTitle || "Profil Bilgileri"}
                </h2>
                <p className="settings-card-desc">
                  {s.profileDesc ||
                    "Kişisel profilinizi ve görünen adınızı güncelleyin"}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="settings-card-body">
            <div className="settings-profile-row">
              <div className="settings-avatar-preview">{userInitials}</div>
              <div className="settings-avatar-info">
                <span className="settings-avatar-name">
                  {user?.displayName ||
                    (locale === "tr" ? "İsimsiz Kullanıcı" : "Anonymous User")}
                </span>
                <span className="settings-avatar-tier">
                  <Sparkles size={11} /> {tierMeta.name} Plan
                </span>
              </div>
            </div>

            <div className="settings-form-field">
              <label className="settings-label">
                {s.displayName || "Görünen İsim"}
              </label>
              <input
                type="text"
                className="settings-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={s.displayNamePlaceholder || "Adınız Soyadınız"}
              />
            </div>

            <div className="settings-form-field">
              <label className="settings-label">
                {s.email || "E-Posta Adresi"}
              </label>
              <div className="settings-input-with-badge">
                <input
                  type="email"
                  className="settings-input"
                  value={user?.email || "demo@loss.tr"}
                  disabled
                />
                <span className="settings-verified-badge">
                  <ShieldCheck size={13} /> {s.verified || "Doğrulandı"}
                </span>
              </div>
            </div>

            <div className="settings-card-actions">
              <button
                type="submit"
                className={`btn btn-primary ${savedSuccess ? "btn-success" : ""}`}
                disabled={saving}
              >
                {savedSuccess ? (
                  <>
                    <Check size={14} /> {s.saved || "Kaydedildi"}
                  </>
                ) : (
                  <>
                    <Save size={14} />{" "}
                    {saving
                      ? s.saving || "Kaydediliyor..."
                      : s.saveChanges || "Değişiklikleri Kaydet"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Appearance & Theme Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title-group">
              <Sun size={18} className="settings-card-icon" />
              <div>
                <h2 className="settings-card-title">
                  {s.appearanceTitle || "Görünüm & Tema"}
                </h2>
                <p className="settings-card-desc">
                  {s.appearanceDesc || "Uygulamanın renk temasını belirleyin"}
                </p>
              </div>
            </div>
          </div>

          <div className="settings-card-body">
            <div className="settings-theme-switcher-grid">
              <button
                type="button"
                className={`settings-theme-option-card ${theme === "dark" ? "active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                <div className="settings-theme-preview dark">
                  <Moon size={20} />
                </div>
                <div className="settings-theme-info">
                  <span className="settings-theme-label">
                    {s.darkMod || "Koyu Mod"}
                  </span>
                  <span className="settings-theme-sub">
                    {s.darkModDesc || "Derin siyah estetik"}
                  </span>
                </div>
                {theme === "dark" && (
                  <Check size={16} className="settings-theme-check" />
                )}
              </button>

              <button
                type="button"
                className={`settings-theme-option-card ${theme === "light" ? "active" : ""}`}
                onClick={() => setTheme("light")}
              >
                <div className="settings-theme-preview light">
                  <Sun size={20} />
                </div>
                <div className="settings-theme-info">
                  <span className="settings-theme-label">
                    {s.lightMod || "Aydınlık Mod"}
                  </span>
                  <span className="settings-theme-sub">
                    {s.lightModDesc || "Ferah beyaz arayüz"}
                  </span>
                </div>
                {theme === "light" && (
                  <Check size={16} className="settings-theme-check" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Language Selection Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title-group">
              <Languages size={18} className="settings-card-icon" />
              <div>
                <h2 className="settings-card-title">
                  {s.langTitle || "Dil Seçimi"}
                </h2>
                <p className="settings-card-desc">
                  {s.langDesc || "Uygulamanın kullanım dilini belirleyin"}
                </p>
              </div>
            </div>
          </div>

          <div className="settings-card-body">
            <div className="settings-theme-switcher-grid">
              <button
                type="button"
                className={`settings-theme-option-card ${locale === "tr" ? "active" : ""}`}
                onClick={() => setLocale("tr")}
              >
                <div
                  className="settings-theme-preview"
                  style={{
                    background: "rgba(59, 164, 255, 0.1)",
                    color: "#3ba4ff",
                    fontWeight: 800,
                  }}
                >
                  TR
                </div>
                <div className="settings-theme-info">
                  <span className="settings-theme-label">Türkçe</span>
                  <span className="settings-theme-sub">
                    Doğal & akıcı Türkçe
                  </span>
                </div>
                {locale === "tr" && (
                  <Check size={16} className="settings-theme-check" />
                )}
              </button>

              <button
                type="button"
                className={`settings-theme-option-card ${locale === "en" ? "active" : ""}`}
                onClick={() => setLocale("en")}
              >
                <div
                  className="settings-theme-preview"
                  style={{
                    background: "rgba(74, 222, 128, 0.1)",
                    color: "#4ade80",
                    fontWeight: 800,
                  }}
                >
                  EN
                </div>
                <div className="settings-theme-info">
                  <span className="settings-theme-label">English</span>
                  <span className="settings-theme-sub">
                    Natural British / US English
                  </span>
                </div>
                {locale === "en" && (
                  <Check size={16} className="settings-theme-check" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Short Link Preferences */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title-group">
              <Globe2 size={18} className="settings-card-icon" />
              <div>
                <h2 className="settings-card-title">
                  {s.domainTitle || "Bağlantı & Domain Tercihleri"}
                </h2>
                <p className="settings-card-desc">
                  {s.domainDesc || "Varsayılan kısa link yönlendirme ayarları"}
                </p>
              </div>
            </div>
          </div>

          <div className="settings-card-body">
            <div className="settings-form-field">
              <label className="settings-label">
                {s.defaultDomain || "Varsayılan Kısa Link Alan Adı"}
              </label>
              <div className="settings-domain-display">
                <span className="settings-domain-host">
                  https://{SHORT_LINK_HOST}/
                </span>
                <span className="settings-domain-badge">
                  {s.defaultDomainActive || "Varsayılan & Aktif"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Plan & Usage Summary Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title-group">
              <CreditCard size={18} className="settings-card-icon" />
              <div>
                <h2 className="settings-card-title">
                  {s.planTitle || "Abonelik & Kota Durumu"}
                </h2>
                <p className="settings-card-desc">
                  {s.planDesc || "Kullanım limitleri ve aktif paket detayları"}
                </p>
              </div>
            </div>
          </div>

          <div className="settings-card-body">
            <div className="settings-plan-box">
              <div className="settings-plan-top">
                <span className="settings-plan-name">{tierMeta.name}</span>
                <span className="settings-plan-price">
                  {tierMeta.priceMonthly}₺ {t.billing?.perMonth || "/ ay"}
                </span>
              </div>
              <p className="settings-plan-desc">{tierMeta.description}</p>

              <div className="settings-usage-row">
                <span>{s.linkQuota || "Link Kotası:"}</span>
                <strong>
                  {links.length} / {tierMeta.maxLinks} {s.used || "bağlantı"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
