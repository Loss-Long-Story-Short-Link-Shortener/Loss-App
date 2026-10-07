import { ArrowRight } from "../../ui/icons";
import { useI18n } from "../../lib/i18n";
import { Link } from "../../lib/router";
import { Page } from "./Layout";

export default function Features() {
  const { t } = useI18n();
  const groups = [
    [t("Oluşturun ve düzenleyin", "Create & organise"), [
      [t("Özel ve rastgele adlar", "Custom & random slugs"), t("3-48 karakterlik özel adlar ya da 8 karakterlik rastgele adlar. Ayrılmış adlar ve çakışmalar anında bildirilir.", "Custom 3-48 character slugs or random 8-character ones. Reserved names and clashes are reported instantly.")],
      [t("Klasör, etiket ve arama", "Folders, tags & search"), t("Binlerce bağlantıyı klasörler, etiketler, durum filtreleri ve anlık aramayla yönetin.", "Manage thousands of links with folders, tags, status filters and instant search.")],
      [t("Toplu işlemler", "Bulk actions"), t("Seçili bağlantıları duraklatın, yayına alın, etiketleyin, taşıyın veya silin.", "Pause, resume, tag, move or delete many links at once.")],
      [t("CSV içe/dışa aktarma", "CSV import / export"), t("Yüzlerce bağlantıyı tek seferde içe aktarın; satır bazlı hata raporu alın. Listenizi CSV olarak indirin.", "Import hundreds of links at once with per-row error reports. Export your list as CSV.")],
      [t("UTM oluşturucu", "UTM builder"), t("utm_source, medium, campaign, term ve content alanlarını doldurun; hedef adres otomatik güncellenir.", "Fill in utm_source, medium, campaign, term and content; the destination updates automatically.")],
    ]],
    [t("Marka ve QR", "Brand & QR"), [
      [t("Özel alan adları", "Custom domains"), t("go.markaniz.com gibi alan adlarını DNS TXT kaydıyla doğrulayın; her alan adının kendi ad alanı vardır.", "Verify domains like go.brand.com with a DNS TXT record; each domain has its own slug namespace.")],
      [t("Dinamik QR kodlar", "Dynamic QR codes"), t("Renk, desen, kenar boşluğu ve merkez logo. SVG ve PNG indirme. Taramalar ayrı raporlanır.", "Colour, pattern, quiet zone and centre logo. SVG and PNG download. Scans are reported separately.")],
      [t("Sosyal önizleme kartları", "Social preview cards"), t("WhatsApp, X, LinkedIn ve Slack'te görünecek başlık, açıklama ve görseli belirleyin.", "Set the title, description and image shown in WhatsApp, X, LinkedIn and Slack.")],
    ]],
    [t("Akıllı yönlendirme", "Smart routing"), [
      [t("Cihaz ve ülke hedefleme", "Device & country targeting"), t("iOS, Android ve ülkeye göre farklı hedefler; uygulama mağazası yönlendirmeleri için idealdir.", "Different destinations by iOS, Android and country - ideal for app-store routing.")],
      [t("Parola, süre ve tıklama limiti", "Password, expiry & click limit"), t("Erişimi parola, son kullanma tarihi veya tıklama sayısıyla sınırlayın.", "Restrict access by password, expiry date or number of clicks.")],
      [t("301 / 302 / 307", "301 / 302 / 307"), t("Yönlendirme türünü seçin. Varsayılan 307'dir: her tıklama sayılır ve değişiklikler anında yayılır.", "Pick the redirect type. The default is 307: every click is counted and edits apply instantly.")],
    ]],
    [t("Analiz", "Analytics"), [
      [t("Ayrıntılı kırılımlar", "Detailed breakdowns"), t("Zaman serisi, ülke, şehir, cihaz, tarayıcı, işletim sistemi, kaynak ve QR/bağlantı ayrımı.", "Time series, country, city, device, browser, OS, referrer and QR vs link.")],
      [t("Gizlilik odaklı", "Privacy-first"), t("Çerez yok, ham IP yok. Botlar ve önizleme istekleri sayılmaz.", "No cookies, no raw IPs. Bots and preview fetches aren't counted.")],
    ]],
    [t("Ekipler ve geliştiriciler", "Teams & developers"), [
      [t("Çalışma alanları ve roller", "Workspaces & roles"), t("Görüntüleyici, Editör, Yönetici ve Sahip rolleri; davet bağlantılarıyla üye ekleyin.", "Viewer, Editor, Admin and Owner roles; add members with invite links.")],
      [t("Denetim kaydı", "Audit log"), t("Kim neyi ne zaman değiştirdi - arayüz ve API işlemleri dahil.", "Who changed what and when - including UI and API actions.")],
      [t("REST API ve webhooks", "REST API & webhooks"), t("Salt okunur veya yazılabilir API anahtarları; HMAC imzalı webhook olayları.", "Read-only or read/write API keys; HMAC-signed webhook events.")],
    ]],
    [t("Güvenlik", "Security"), [
      [t("Hedef doğrulama", "Destination validation"), t("Yalnızca http(s); kimlik bilgili, yerel/özel ağ ve diğer kısaltıcılara giden adresler reddedilir.", "http(s) only; URLs with credentials, local/private addresses and other shorteners are rejected.")],
      [t("Hız sınırları ve kötüye kullanım", "Rate limits & abuse"), t("Oluşturma ve parola denemeleri sınırlıdır; herkese açık bildirim formu ve moderasyon aracı vardır.", "Creation and password attempts are limited; there is a public report form and moderation tooling.")],
    ]],
  ];
  return (
    <Page>
      <section className="mk-container ft-page">
        <header className="ft-head">
          <h1>{t("Özellikler", "Features")}</h1>
          <p>{t("Bir link platformundan beklediğiniz her şey; sade, hızlı ve güvenli.", "Everything you expect from a link platform: simple, fast and secure.")}</p>
        </header>
        {groups.map(([title, items]) => (
          <div key={title} className="ft-group">
            <h2>{title}</h2>
            <dl>{items.map(([h, p]) => <div key={h} className="ft-row"><dt>{h}</dt><dd>{p}</dd></div>)}</dl>
          </div>
        ))}
        <p className="ft-cta"><Link to="/register" className="btn btn-primary btn-lg">{t("Ücretsiz başla", "Start free")} <ArrowRight size={16} /></Link></p>
      </section>
    </Page>
  );
}
