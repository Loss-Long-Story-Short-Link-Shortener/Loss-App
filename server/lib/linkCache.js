// Per-instance LRU-ish cache for hot redirects. Serverless instances do not
// share memory, so edits/deletes become visible everywhere within TTL at worst.
const CACHE = new Map();
const MAX_ENTRIES = 5000;
export const LINK_TTL_MS = 30 * 1000;
export const MISS_TTL_MS = 30 * 1000;

export function getCached(key) {
  const entry = CACHE.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return undefined;
  }
  return entry.value; // object, or null for a cached miss
}

export function setCached(key, value, ttl = LINK_TTL_MS) {
  if (CACHE.size >= MAX_ENTRIES) {
    CACHE.delete(CACHE.keys().next().value);
  }
  CACHE.set(key, { value, expiresAt: Date.now() + ttl });
}

export function invalidateLinkCache(key) {
  CACHE.delete(key);
}
