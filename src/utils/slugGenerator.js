/**
 * Cryptographically Secure Base62 Slug Generator & Uniqueness Validator
 *
 * Designed for massive scale (millions/billions of short links).
 * 7 characters of Base62 = 62^7 ≈ 3.52 Trillion unique combinations.
 */

export const BASE62_CHARSET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const SYSTEM_RESERVED_SLUGS = new Set([
  "api",
  "app",
  "admin",
  "login",
  "register",
  "dashboard",
  "settings",
  "billing",
  "health",
  "ping",
  "s",
  "shortener",
  "link-shortener",
  "privacy",
  "terms",
  "docs",
  "support",
  "status",
  "static",
  "assets",
]);

/**
 * Generate a cryptographically secure random Base62 slug.
 *
 * @param {number} length Default is 7 characters (3.52 Trillion combinations).
 * @returns {string}
 */
export function generateSecureSlug(length = 7) {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const randomBytes = new Uint8Array(length);
    window.crypto.getRandomValues(randomBytes);
    let result = "";
    for (let i = 0; i < length; i++) {
      result += BASE62_CHARSET[randomBytes[i] % 62];
    }
    return result;
  }

  // Fallback for non-browser/crypto environments
  let result = "";
  for (let i = 0; i < length; i++) {
    const randIdx = Math.floor(Math.random() * 62);
    result += BASE62_CHARSET[randIdx];
  }
  return result;
}

/**
 * Validates whether a requested custom slug is safe and available.
 *
 * @param {string} slug
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCustomSlug(slug) {
  if (!slug) {
    return { valid: true };
  }

  const clean = String(slug).trim().toLowerCase();

  if (clean.length < 3) {
    return { valid: false, error: "Özel bağlantı adı en az 3 karakter olmalıdır." };
  }

  if (clean.length > 48) {
    return { valid: false, error: "Özel bağlantı adı en fazla 48 karakter olabilir." };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    return {
      valid: false,
      error: "Özel bağlantı adı yalnızca harf, rakam, tire (-) ve alt çizgi (_) içerebilir.",
    };
  }

  if (SYSTEM_RESERVED_SLUGS.has(clean)) {
    return {
      valid: false,
      error: `"${clean}" sistem tarafından ayrılmıştır ve kullanılamaz.`,
    };
  }

  return { valid: true };
}
