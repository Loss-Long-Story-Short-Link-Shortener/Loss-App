import { Globe2, Plus, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SHORT_LINK_HOST } from "../constants/domains";

export function DomainsPage({ onOpenAddDomainModal, onOpenUpgradeModal }) {
  const { currentTier } = useAuth();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Özel Markalı Alan Adları</h1>
          <p className="page-subtitle">
            Kısa linklerinizi kendi markanıza ait domain üzerinden sunarak
            tıklama oranlarınızı %39'a kadar artırın.
          </p>
        </div>

        {currentTier === "free" ? (
          <button className="btn btn-primary" onClick={onOpenUpgradeModal}>
            <Zap size={15} /> Pro İle Alan Adı Ekle
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onOpenAddDomainModal}>
            <Plus size={16} /> Yeni Alan Adı Ekle
          </button>
        )}
      </div>

      {/* Default Domain Card */}
      <div className="domain-row">
        <div className="domain-info">
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-xs)",
              background: "var(--primary-light)",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Globe2 size={18} />
          </div>
          <div>
            <div className="domain-name">{SHORT_LINK_HOST}</div>
            <div className="domain-sub">
              Sistem Varsayılan Alan Adı · Otomatik SSL Aktif
            </div>
          </div>
        </div>

        <span className="status-pill active">
          <span className="status-pill-dot" /> Doğrulandı
        </span>
      </div>

      {/* CNAME instructions */}
      <div className="dns-instruction-box">
        <div className="dns-instruction-title">
          <ShieldCheck
            size={18}
            color="var(--primary)"
            style={{ verticalAlign: "middle", marginRight: "6px" }}
          />
          Kendi Alan Adınızı Nasıl Bağlarsınız?
        </div>
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            lineHeight: "1.5",
          }}
        >
          Markanıza ait bir alt alan adını (örn: <code>go.sirketiniz.com</code>{" "}
          veya <code>link.sirketiniz.com</code>) bağlamak için DNS panelinizde
          aşağıdaki CNAME kaydını tanımlamanız yeterlidir:
        </p>

        <table className="dns-table">
          <thead>
            <tr>
              <th>Kayıt Türü</th>
              <th>Host / Ad</th>
              <th>Hedef / Değer</th>
              <th>SSL Durumu</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>CNAME</td>
              <td>go (veya link)</td>
              <td>cname.loss.tr</td>
              <td>Otomatik Let's Encrypt SSL</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
