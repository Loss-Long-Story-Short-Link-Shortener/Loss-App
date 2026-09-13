import { useState } from "react";
import { Globe2, Check, ArrowRight } from "lucide-react";
import { Modal } from "../common/Modal";
import { useAuth } from "../../context/AuthContext";

export function AddDomainModal({ isOpen, onClose }) {
  const { currentTier, showToast } = useAuth();
  const [domainName, setDomainName] = useState("");
  const [step, setStep] = useState(1);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!domainName.trim()) return;
    setStep(2);
  };

  const handleComplete = () => {
    showToast(`${domainName} alan adı başarıyla eklendi ve DNS doğrulaması başlatıldı!`, "success");
    setDomainName("");
    setStep(1);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setStep(1);
        onClose();
      }}
      title="Yeni Özel Alan Adı Ekle"
      subtitle="Kendi markanıza ait alt alan adını (örn: link.markaniz.com) bağlayın."
      maxWidth="520px"
    >
      {step === 1 ? (
        <form onSubmit={handleAdd}>
          <div className="form-group">
            <label className="form-label">Alan Adı (Subdomain önerilir)</label>
            <input
              type="text"
              className="input-text"
              placeholder="link.sirketiniz.com"
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div
            style={{
              background: "var(--bg-surface-subtle)",
              padding: "12px",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              color: "var(--text-secondary)",
              lineHeight: "1.5",
              marginBottom: "20px",
            }}
          >
            💡 <strong>İpucu:</strong> Alan adınızı ekledikten sonra DNS sağlayıcınızdan (Cloudflare, GoDaddy, Natro vb.) bir <code>CNAME</code> kaydı eklemeniz gerekecektir.
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              İptal
            </button>
            <button type="submit" className="btn btn-primary">
              İlerle <ArrowRight size={15} />
            </button>
          </div>
        </form>
      ) : (
        <div>
          <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>
            DNS Yapılandırma Talimatı:
          </h4>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
            <strong>{domainName}</strong> alan adı için DNS panelinizde aşağıdaki CNAME kaydını oluşturun:
          </p>

          <table className="dns-table" style={{ width: "100%", marginBottom: "20px" }}>
            <thead>
              <tr>
                <th>Kayıt Türü</th>
                <th>Ad / Host</th>
                <th>Değer / Hedef</th>
                <th>TTL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>CNAME</td>
                <td>{domainName.split(".")[0] || "@"}</td>
                <td>cname.loss.tr</td>
                <td>Otomatik</td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button className="btn btn-primary" onClick={handleComplete}>
              <Check size={15} /> Kaydı Doğrula & Kaydet
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
