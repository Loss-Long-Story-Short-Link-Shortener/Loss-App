import {
  LayoutDashboard,
  Link2,
  BarChart3,
  QrCode,
  CreditCard,
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
    label: "Analizler",
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
    id: "Billing",
    label: "Paketler & Fatura",
    icon: CreditCard,
    description: "Abonelik planınızı ve kullanım kotalarınızı buradan yönetin.",
    proBadge: true,
  },
  {
    id: "Settings",
    label: "Ayarlar",
    icon: Settings2,
    description: "Çalışma alanı tercihleri, kullanıcı profili ve güvenlik yapılandırması.",
  },
];
