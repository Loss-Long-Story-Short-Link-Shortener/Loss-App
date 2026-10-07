import { createHash, randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "./firebase.js";
import { httpError } from "./http.js";

export const KEY_PREFIX = "loss_";
const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function hashKey(key) {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey() {
  const bytes = randomBytes(40);
  let body = "";
  for (let i = 0; i < 40; i++) body += BASE62[bytes[i] % 62];
  return `${KEY_PREFIX}${body}`;
}

const lastUsedWrites = new Map();

/**
 * Identify the caller. Returns:
 *   { uid, email, name, via: "firebase" | "apikey", workspaceId?, role? }
 * API keys are bound to one workspace and role; Firebase users choose a
 * workspace per request (X-Workspace header).
 */
export async function authenticate(request) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw httpError(401, "Missing credentials");

  const { auth, db } = await getFirebaseAdmin();

  if (token.startsWith(KEY_PREFIX)) {
    const id = hashKey(token);
    const snap = await db.collection("apikeys").doc(id).get();
    if (!snap.exists) throw httpError(401, "Invalid API key");
    const key = snap.data();
    const now = Date.now();
    if (!lastUsedWrites.get(id) || now - lastUsedWrites.get(id) > 10 * 60 * 1000) {
      lastUsedWrites.set(id, now);
      snap.ref.update({ lastUsedAt: FieldValue.serverTimestamp() }).catch(() => {});
    }
    return { uid: key.createdBy, email: null, name: `API key ${key.prefix}…`, via: "apikey", workspaceId: key.workspaceId, role: key.role || "editor", keyId: id };
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email || null, name: decoded.name || null, via: "firebase" };
  } catch (error) {
    console.warn("ID token rejected:", error.code || error.message);
    throw httpError(401, "Invalid session");
  }
}
