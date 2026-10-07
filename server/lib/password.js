import { randomBytes, scryptSync, createHash, timingSafeEqual } from "node:crypto";

// New hashes: "scrypt$<salt hex>$<hash hex>". Legacy hashes ("salt:sha256hex")
// are still verified so existing protected links keep working, and callers can
// upgrade them on the next successful unlock via needsRehash().

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export const MIN_PASSWORD_LENGTH = 4;
export const MAX_PASSWORD_LENGTH = 128;

export function hashPassword(plaintext) {
  const salt = randomBytes(16);
  const hash = scryptSync(String(plaintext), salt, 32, SCRYPT_PARAMS);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function safeEqualHex(a, b) {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && ba.length > 0 && timingSafeEqual(ba, bb);
}

export function verifyPassword(plaintext, stored) {
  if (typeof stored !== "string" || !stored) return false;
  try {
    if (stored.startsWith("scrypt$")) {
      const [, saltHex, hashHex] = stored.split("$");
      const hash = scryptSync(String(plaintext), Buffer.from(saltHex, "hex"), 32, SCRYPT_PARAMS);
      return safeEqualHex(hash.toString("hex"), hashHex);
    }
    if (stored.includes(":")) {
      const [salt, expected] = stored.split(":");
      const hash = createHash("sha256").update(salt + plaintext).digest("hex");
      return safeEqualHex(hash, expected);
    }
  } catch {
    return false;
  }
  return false;
}

export function needsRehash(stored) {
  return typeof stored === "string" && stored !== "" && !stored.startsWith("scrypt$");
}

export function validatePasswordInput(value) {
  if (value === undefined || value === null || value === "") return { ok: true, value: "" };
  if (typeof value !== "string") return { ok: false, error: "Parola geçersiz." };
  if (value.length < MIN_PASSWORD_LENGTH || value.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: `Parola ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} karakter arasında olmalıdır.` };
  }
  return { ok: true, value };
}
