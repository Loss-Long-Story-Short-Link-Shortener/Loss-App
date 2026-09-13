import { useAuth } from "../context/AuthContext";

export function SettingsPage() {
  const { user, currentTier, showToast } = useAuth();

  const handleSave = (e) => {
    e.preventDefault();
    showToast("Ayarlar kaydedildi", "success");
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ayarlar & Profil</h1>
          <p className="page-subtitle">
            Hesap bilgilerinizi, varsayılan alan adınızı ve çalışma alanı tercihlerinizi yapılandırın.
          </p>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: "680px" }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Profil & Hesap Bilgileri</h2>
            <p className="panel-desc">Giriş yapılan hesap bilgileri</p>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ padding: "20px 24px" }}>
          <div className="form-group">
            <label className="form-label">E-Posta Adresi</label>
            <input
              type="email"
              readOnly
              className="input-text"
              value={user?.email || "demo@loss.tr"}
              disabled
            />
          </div>

          <div className="form-group">
            <label className="form-label">Görünen İsim</label>
            <input
              type="text"
              readOnly
              className="input-text"
              value={user?.displayName || "Yönetici"}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Varsayılan Kısa Link Alan Adı</label>
            <select className="select-box" defaultValue="loss.tr">
              <option value="loss.tr">loss.tr (Varsayılan)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Aktif Paket</label>
            <input
              type="text"
              readOnly
              className="input-text"
              value={currentTier.toUpperCase()}
              disabled
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: "12px" }}>
            Değişiklikleri Kaydet
          </button>
        </form>
      </div>
    </div>
  );
}
