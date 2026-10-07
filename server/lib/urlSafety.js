// Destination URL validation for a public link shortener.
//
// A shortener is an abuse target, so we reject destinations that are
// obviously dangerous or pointless: non-http(s) schemes, URLs with embedded
// credentials (classic phishing trick: https://paypal.com@evil.tld), loopback /
// private-network / link-local hosts, our own hosts (redirect loops) and
// chains through other public shorteners.

export const MAX_DESTINATION_LENGTH = 2048;

const SHORTENER_HOSTS = new Set([
  "bit.ly", "bitly.com", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
  "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at", "tiny.cc", "rb.gy",
  "short.io", "t.ly",
]);

function ownHosts() {
  const hosts = new Set(["loss.tr", "go.loss.tr", "panel.loss.tr"]);
  for (const name of ["SHORT_LINK_HOST", "PANEL_HOST"]) {
    const value = (process.env[name] || "").trim().toLowerCase();
    if (value) hosts.add(value);
  }
  return hosts;
}

function isPrivateIPv4(host) {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateHost(host) {
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (/\.(local|internal|lan|home|corp|intranet)$/.test(host)) return true;
  if (isPrivateIPv4(host)) return true;
  if (host.startsWith("[")) {
    // IPv6 literal: only allow public-looking globals (2000::/3).
    const inner = host.slice(1, -1);
    return !/^[23]/.test(inner);
  }
  // Pure-numeric / hex hosts that browsers expand to IPv4 (e.g. 2130706433).
  if (/^(0x[0-9a-f]+|\d+)$/i.test(host)) return true;
  return false;
}

/**
 * @param {unknown} input
 * @returns {{ ok: true, url: string, hostname: string } | { ok: false, error: string }}
 */
export function validateDestination(input) {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return { ok: false, error: "Hedef URL gerekli." };
  if (raw.length > MAX_DESTINATION_LENGTH) {
    return { ok: false, error: `Hedef URL en fazla ${MAX_DESTINATION_LENGTH} karakter olabilir.` };
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\s]/.test(raw)) {
    return { ok: false, error: "Hedef URL boşluk veya kontrol karakteri içeremez." };
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "Geçersiz hedef URL. Lütfen http:// veya https:// ile başlayan bir adres girin." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Yalnızca http ve https adresleri kısaltılabilir." };
  }
  if (url.username || url.password) {
    return { ok: false, error: "Kullanıcı adı / parola içeren URL'ler desteklenmez." };
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || (!hostname.includes(".") && !hostname.startsWith("["))) {
    return { ok: false, error: "Hedef URL geçerli bir alan adı içermelidir." };
  }
  if (isPrivateHost(hostname)) {
    return { ok: false, error: "Yerel veya özel ağ adresleri kısaltılamaz." };
  }

  const own = ownHosts();
  for (const host of own) {
    if (hostname === host || hostname.endsWith(`.${host}`)) {
      return { ok: false, error: "Bu alan adına yönlendiren bağlantı oluşturulamaz." };
    }
  }
  if (SHORTENER_HOSTS.has(hostname)) {
    return { ok: false, error: "Başka bir link kısaltma servisine yönlendirme yapılamaz." };
  }

  return { ok: true, url: url.toString(), hostname };
}

/** Cheap re-check used at redirect time for documents written before validation existed. */
export function isSafeRedirectTarget(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}
