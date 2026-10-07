// Public copy of the plan matrix for marketing pages. The authoritative copy
// lives in server/lib/plans.js (a test keeps the two in sync).
export const PUBLIC_PLANS = [
  { id: "free", name: "Ücretsiz", nameEn: "Free", monthly: 0, annual: 0, maxLinks: 25, domains: 0, members: 1, analyticsDays: 30, features: [] },
  { id: "starter", name: "Starter", nameEn: "Starter", monthly: 399, annual: 3990, maxLinks: 500, domains: 1, members: 1, analyticsDays: 365, features: ["socialPreview", "redirectType", "importExport"] },
  { id: "pro", name: "Pro Team", nameEn: "Pro Team", monthly: 899, annual: 8990, maxLinks: 2500, domains: 3, members: 5, analyticsDays: 365, features: ["socialPreview", "redirectType", "importExport", "expiry", "password", "clickLimit", "targeting", "api", "webhooks", "audit", "team"], popular: true },
  { id: "agency", name: "Agency / Scale", nameEn: "Agency / Scale", monthly: 2499, annual: 24990, maxLinks: 15000, domains: 15, members: 25, analyticsDays: 365, features: ["socialPreview", "redirectType", "importExport", "expiry", "password", "clickLimit", "targeting", "api", "webhooks", "audit", "team"] },
];

export function planLabel(id, lang) {
  const p = PUBLIC_PLANS.find((x) => x.id === id);
  return p ? (lang === "tr" ? p.name : p.nameEn) : id;
}

export const FEATURE_LABELS = {
  password: ["Parola koruması", "Password protection"], expiry: ["Son kullanma tarihi", "Link expiry"], clickLimit: ["Tıklama limiti", "Click limits"],
  targeting: ["Cihaz ve ülke hedefleme", "Device & country targeting"], socialPreview: ["Sosyal önizleme kartı", "Social preview cards"], redirectType: ["301 / 302 / 307 seçimi", "301 / 302 / 307 choice"],
  importExport: ["CSV içe/dışa aktarma", "CSV import/export"], api: ["REST API ve anahtarlar", "REST API & keys"], webhooks: ["Webhooks", "Webhooks"], audit: ["Denetim kaydı", "Audit log"], team: ["Takım çalışma alanları", "Team workspaces"],
};
