import {
  LayoutDashboard,
  Link2,
  BarChart3,
  QrCode,
  Globe2,
  CreditCard,
  Key,
  Settings2,
} from "lucide-react";

export const PRIMARY_NAV_ITEMS = [
  {
    id: "Overview",
    label: "Genel Bakış",
    icon: LayoutDashboard,
    description: "Tüm kısaltılmış bağlantılarınızın canlı performans tablosu.",
  },
  {
    id: "Links",
    label: "Bağlantılar",
    icon: Link2,
    description: "Çalışma alanınızdaki tüm bağlantıları inceleyin, filtreleyin ve yönetin.",
    showCount: true,
  },
  {
    id: "Analytics",
    label: "Analitik",
    icon: BarChart3,
    description: "Tıklama, coğrafi kitle ve yönlendirme kaynaklarını ölçümleyin.",
  },
  {
    id: "QRCodes",
    label: "QR Stüdyosu",
    icon: QrCode,
    description: "Dinamik linkleriniz için vektörel ve renkli QR kodlar oluşturun.",
  },
];

export const SECONDARY_NAV_ITEMS = [
  {
    id: "Domains",
    label: "Özel Alan Adları",
    icon: Globe2,
    description: "Kısa linkleriniz için kurumsal markanıza ait özel alan adlarını bağlayın.",
  },
  {
    id: "Billing",
    label: "Paketler & Fatura",
    icon: CreditCard,
    description: "Abonelik planınızı ve kullanım kotalarınızı buradan yönetin.",
    proBadge: true,
  },
  {
    id: "Integrations",
    label: "API & Geliştirici",
    icon: Key,
    description: "REST API üzerinden harici yazılımlarla entegrasyon kurun.",
  },
  {
    id: "Settings",
    label: "Ayarlar",
    icon: Settings2,
    description: "Çalışma alanı tercihleri, kullanıcı profili ve güvenlik yapılandırması.",
  },
];
