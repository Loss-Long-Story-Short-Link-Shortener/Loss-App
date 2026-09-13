import { useState } from "react";
import { Copy, Check, Eye, EyeOff, RefreshCw, Key } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function IntegrationsPage() {
  const { showToast } = useAuth();
  const [apiKey, setApiKey] = useState("lss_live_9a87d612e4f00912bc8127361a");
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedKey(true);
      showToast("API Anahtarı kopyalandı", "success");
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      showToast("Kopyalanamadı", "error");
    }
  };

  const handleRegenerate = () => {
    const newKey = `lss_live_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
    setApiKey(newKey);
    showToast("Yeni API Anahtarı üretildi ✦", "success");
  };

  const curlCode = `# Yeni Kısa Link Oluşturma (POST /api/links)
curl -X POST https://go.consolaktif.com.tr/api/links \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "destination": "https://siteniz.com/uzun-adres",
    "slug": "ozel-takma-ad",
    "title": "Kampanya Linki"
  }'`;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Geliştirici REST API & Entegrasyonlar</h1>
          <p className="page-subtitle">
            Kendi web sitenizden veya uygulamalarınızdan programatik olarak bağlantı oluşturun ve verileri senkronize edin.
          </p>
        </div>
      </div>

      {/* API Key Panel */}
      <div className="panel" style={{ marginBottom: "28px" }}>
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Key size={16} /> Gizli API Anahtarınız (Bearer Token)
              </span>
            </h2>
            <p className="panel-desc">
              Bu anahtarı sunucu taraflı isteklerinizde kimlik doğrulama için kullanın.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleRegenerate}>
            <RefreshCw size={13} /> Yeni Anahtar Üret
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", maxWidth: "560px" }}>
            <input
              type={showKey ? "text" : "password"}
              readOnly
              className="input-text"
              value={apiKey}
              style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}
            />
            <button
              className="icon-btn"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? "Gizle" : "Göster"}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button className="btn btn-secondary" onClick={handleCopyKey}>
              {copiedKey ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              {copiedKey ? "Kopyalandı" : "Kopyala"}
            </button>
          </div>
        </div>
      </div>

      {/* Code Snippet */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Örnek cURL İsteği</h2>
            <p className="panel-desc">Terminal üzerinden hızlı API çağrısı testi</p>
          </div>
        </div>

        <div style={{ padding: "0 24px 24px" }}>
          <div className="code-block-wrap">
            <button
              className="code-copy-btn"
              onClick={async () => {
                await navigator.clipboard.writeText(curlCode);
                setCopiedCode(true);
                showToast("Kod kopyalandı", "success");
                setTimeout(() => setCopiedCode(false), 2000);
              }}
            >
              {copiedCode ? "Kopyalandı ✓" : "Kopyala"}
            </button>
            <pre style={{ margin: 0 }}>{curlCode}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
