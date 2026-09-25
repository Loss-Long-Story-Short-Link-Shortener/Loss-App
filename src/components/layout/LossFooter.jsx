import { Heart } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export function LossFooter({ onSelectPage }) {
  const { locale, t } = useLanguage();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="loss-footer">
      <div className="loss-footer-inner">
        <div className="footer-top-grid">
          {/* Brand Info */}
          <div className="footer-brand-col">
            <div className="footer-brand-row" onClick={scrollToTop} style={{ cursor: "pointer" }}>
              <img src="/loss.png" alt="loss.tr" className="footer-logo-img" />
              <span className="footer-brand-title">loss.tr</span>
            </div>
            <p className="footer-brand-tagline">
              {locale === "tr"
                ? "Hızlı, güvenli, gizlilik odaklı ve dinamik QR kodlu bağlantı yönetim platformu."
                : "Fast, secure, privacy-friendly short link and dynamic QR code management platform."}
            </p>
            <div className="footer-badge-made">
              <span>{locale === "tr" ? "Açık Web için özenle geliştirildi" : "Built with care for the open web"}</span>
              <Heart size={13} fill="#ef4444" color="#ef4444" />
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="footer-links-grid">
            <div className="footer-col">
              <h4 className="footer-col-heading">{locale === "tr" ? "Ürün" : "Product"}</h4>
              <button className="footer-link" onClick={() => { onSelectPage("Shortener"); scrollToTop(); }}>
                {locale === "tr" ? "Link Kısaltıcı" : "Link Shortener"}
              </button>
              <button className="footer-link" onClick={() => { onSelectPage("QRCodes"); scrollToTop(); }}>
                {locale === "tr" ? "Dinamik QR Stüdyosu" : "Dynamic QR Studio"}
              </button>
              <button className="footer-link" onClick={() => { onSelectPage("Analytics"); scrollToTop(); }}>
                {locale === "tr" ? "Ziyaretçi Analitiği" : "Visitor Analytics"}
              </button>
              <button className="footer-link" onClick={() => { onSelectPage("Billing"); scrollToTop(); }}>
                {locale === "tr" ? "Fiyatlandırma" : "Pricing"}
              </button>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-heading">{locale === "tr" ? "Yönetim" : "Workspace"}</h4>
              <button className="footer-link" onClick={() => { onSelectPage("Links"); scrollToTop(); }}>
                {locale === "tr" ? "Tüm Linklerim" : "My Links"}
              </button>
              <button className="footer-link" onClick={() => { onSelectPage("Settings"); scrollToTop(); }}>
                {locale === "tr" ? "Hesap Ayarları" : "Account Settings"}
              </button>
              <button className="footer-link" onClick={() => { onSelectPage("Billing"); scrollToTop(); }}>
                {locale === "tr" ? "Abonelik & Fatura" : "Billing & Invoices"}
              </button>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-heading">{locale === "tr" ? "Gizlilik & Güvenlik" : "Trust & Security"}</h4>
              <span className="footer-link-static">{locale === "tr" ? "Gizlilik Politikası" : "Privacy Policy"}</span>
              <span className="footer-link-static">{locale === "tr" ? "Kullanım Koşulları" : "Terms of Service"}</span>
              <span className="footer-link-static">{locale === "tr" ? "Çerezsiz Analitik" : "Cookie-Free Analytics"}</span>
              <span className="footer-link-static">PayTR 256-Bit SSL</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <p className="footer-copy-text">
            © {new Date().getFullYear()} loss.tr. {locale === "tr" ? "Tüm hakları saklıdır." : "All rights reserved."}
          </p>

          <div className="footer-social-icons">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="social-icon-btn"
              title="GitHub"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              className="social-icon-btn"
              title="Twitter / X"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
