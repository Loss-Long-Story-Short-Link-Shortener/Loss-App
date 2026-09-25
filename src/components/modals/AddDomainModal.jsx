import { useState } from "react";
import { Globe2, Check, ArrowRight } from "lucide-react";
import { Modal } from "../common/Modal";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

export function AddDomainModal({ isOpen, onClose }) {
  const { currentTier, showToast } = useAuth();
  const { locale, t } = useLanguage();
  const [domainName, setDomainName] = useState("");
  const [step, setStep] = useState(1);

  const c = t.common || {};

  const handleAdd = (e) => {
    e.preventDefault();
    if (!domainName.trim()) return;
    setStep(2);
  };

  const handleComplete = () => {
    showToast(
      locale === "tr"
        ? `${domainName} alan adı başarıyla eklendi ve DNS doğrulaması başlatıldı!`
        : `${domainName} was added successfully and DNS verification initiated!`,
      "success"
    );
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
      title={
        locale === "tr" ? "Yeni Özel Alan Adı Ekle" : "Connect Custom Domain"
      }
      subtitle={
        locale === "tr"
          ? "Kendi markanıza ait alt alan adını (örn: link.markaniz.com) bağlayın."
          : "Connect your branded custom subdomain (e.g. link.yourbrand.com)."
      }
      maxWidth="520px"
    >
      {step === 1 ? (
        <form onSubmit={handleAdd}>
          <div className="form-group">
            <label className="form-label">
              {locale === "tr"
                ? "Alan Adı (Subdomain önerilir)"
                : "Domain Name (Subdomain recommended)"}
            </label>
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
            💡 <strong>{locale === "tr" ? "İpucu:" : "Tip:"}</strong>{" "}
            {locale === "tr"
              ? "Alan adınızı ekledikten sonra DNS sağlayıcınızdan (Cloudflare, GoDaddy, Natro vb.) bir CNAME kaydı eklemeniz gerekecektir."
              : "After adding your domain, add a CNAME record at your DNS provider (Cloudflare, GoDaddy, Namecheap, etc.)."}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {c.cancel || "İptal"}
            </button>
            <button type="submit" className="btn btn-primary">
              {locale === "tr" ? "İlerle" : "Next"} <ArrowRight size={15} />
            </button>
          </div>
        </form>
      ) : (
        <div>
          <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>
            {locale === "tr"
              ? "DNS Yapılandırma Talimatı:"
              : "DNS Configuration Instructions:"}
          </h4>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
            {locale === "tr" ? (
              <>
                <strong>{domainName}</strong> alan adı için DNS panelinizde aşağıdaki CNAME kaydını oluşturun:
              </>
            ) : (
              <>
                Create the following CNAME record in your DNS provider for <strong>{domainName}</strong>:
              </>
            )}
          </p>

          <table className="dns-table" style={{ width: "100%", marginBottom: "20px" }}>
            <thead>
              <tr>
                <th>{locale === "tr" ? "Kayıt Türü" : "Type"}</th>
                <th>{locale === "tr" ? "Ad / Host" : "Host / Name"}</th>
                <th>{locale === "tr" ? "Değer / Hedef" : "Target / Value"}</th>
                <th>TTL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>CNAME</td>
                <td>{domainName.split(".")[0] || "@"}</td>
                <td>cname.loss.tr</td>
                <td>{locale === "tr" ? "Otomatik" : "Auto"}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button className="btn btn-primary" onClick={handleComplete}>
              <Check size={15} />{" "}
              {locale === "tr" ? "Kaydı Doğrula & Kaydet" : "Verify & Save Record"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
