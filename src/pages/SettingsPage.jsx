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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { TIERS } from "../constants/tiers";

export function SettingsPage() {
  const { user, currentTier, theme, setTheme, updateUserProfile, links, showToast } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const tierMeta = TIERS[currentTier] || TIERS.free;
  const userInitials = (user?.displayName || user?.email || "U")
    .slice(0, 2)
    .toUpperCase();

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast("Lütfen bir isim girin", "error");
      return;
    }
    setSaving(true);
    try {
      if (updateUserProfile) {
        await updateUserProfile({ displayName: displayName.trim() });
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch {
      showToast("Profil kaydedilemedi", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page-wrapper">
      <div className="settings-header">
        <h1 className="settings-title">Ayarlar & Profil</h1>
        <p className="settings-subtitle">
          Hesap bilgilerinizi, görünüm tercihlerinizi ve bağlantı ayarlarınızı yönetin.
        </p>
      </div>

      <div className="settings-grid">
        {/* Profile Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title-group">
              <User size={18} className="settings-card-icon" />
              <div>
                <h2 className="settings-card-title">Profil Bilgileri</h2>
                <p className="settings-card-desc">Kişisel profilinizi ve görünen adınızı güncelleyin</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="settings-card-body">
            <div className="settings-profile-row">
              <div className="settings-avatar-preview">
                {userInitials}
              </div>
              <div className="settings-avatar-info">
                <span className="settings-avatar-name">{user?.displayName || "İsimsiz Kullanıcı"}</span>
                <span className="settings-avatar-tier">
                  <Sparkles size={11} /> {tierMeta.name} Plan
                </span>
              </div>
            </div>

            <div className="settings-form-field">
              <label className="settings-label">Görünen İsim</label>
              <input
                type="text"
                className="settings-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Adınız Soyadınız"
              />
            </div>

            <div className="settings-form-field">
              <label className="settings-label">E-Posta Adresi</label>
              <div className="settings-input-with-badge">
                <input
                  type="email"
                  className="settings-input"
                  value={user?.email || "demo@loss.tr"}
                  disabled
                />
                <span className="settings-verified-badge">
                  <ShieldCheck size={13} /> Doğrulandı
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
                    <Check size={14} /> Kaydedildi
                  </>
                ) : (
                  <>
                    <Save size={14} /> {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
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
                <h2 className="settings-card-title">Görünüm & Tema</h2>
                <p className="settings-card-desc">Uygulamanın renk temasını belirleyin</p>
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
                  <span className="settings-theme-label">Koyu Mod</span>
                  <span className="settings-theme-sub">Derin siyah estetik</span>
                </div>
                {theme === "dark" && <Check size={16} className="settings-theme-check" />}
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
                  <span className="settings-theme-label">Aydınlık Mod</span>
                  <span className="settings-theme-sub">Ferah beyaz arayüz</span>
                </div>
                {theme === "light" && <Check size={16} className="settings-theme-check" />}
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
                <h2 className="settings-card-title">Bağlantı & Domain Tercihleri</h2>
                <p className="settings-card-desc">Varsayılan kısa link yönlendirme ayarları</p>
              </div>
            </div>
          </div>

          <div className="settings-card-body">
            <div className="settings-form-field">
              <label className="settings-label">Varsayılan Kısa Link Alan Adı</label>
              <div className="settings-domain-display">
                <span className="settings-domain-host">https://loss.tr/</span>
                <span className="settings-domain-badge">Varsayılan & Aktif</span>
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
                <h2 className="settings-card-title">Abonelik & Kota Durumu</h2>
                <p className="settings-card-desc">Kullanım limitleri ve aktif paket detayları</p>
              </div>
            </div>
          </div>

          <div className="settings-card-body">
            <div className="settings-plan-box">
              <div className="settings-plan-top">
                <span className="settings-plan-name">{tierMeta.name} Paket</span>
                <span className="settings-plan-price">{tierMeta.priceMonthly}₺ / ay</span>
              </div>
              <p className="settings-plan-desc">{tierMeta.description}</p>
              
              <div className="settings-usage-row">
                <span>Link Kotası:</span>
                <strong>{links.length} / {tierMeta.maxLinks} bağlantı</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
