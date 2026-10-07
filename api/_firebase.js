const requiredEnv = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL"];

function getPrivateKey() {
  if (process.env.FIREBASE_PRIVATE_KEY_BASE64?.trim()) {
    const encoded = process.env.FIREBASE_PRIVATE_KEY_BASE64.trim().replace(
      /^"|"$/g,
      "",
    );
    return Buffer.from(encoded, "base64").toString("utf8").trim();
  }

  return (process.env.FIREBASE_PRIVATE_KEY || "")
    .replace(/^"|"$/g, "")
    .replace(/\\n/g, "\n")
    .trim();
}

export async function getFirebaseAdmin() {
  const missing = requiredEnv.filter((name) => !process.env[name]?.trim());
  if (missing.length) {
    throw new Error(
      `Missing server environment variable: ${missing.join(", ")}`,
    );
  }

  const privateKey = getPrivateKey();
  if (
    !privateKey.includes("BEGIN PRIVATE KEY") ||
    !privateKey.includes("END PRIVATE KEY")
  ) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY is not a valid service-account private key",
    );
  }

  const [{ cert, getApps, initializeApp }, { getAuth }, { getFirestore }] =
    await Promise.all([
      import("firebase-admin/app"),
      import("firebase-admin/auth"),
      import("firebase-admin/firestore"),
    ]);

  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });

  return {
    auth: getAuth(app),
    db: getFirestore(app),
  };
}

export async function requireUser(request) {
  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) throw httpError(401, "Missing Firebase ID token");

  const { auth } = await getFirebaseAdmin();
  try {
    return await auth.verifyIdToken(token);
  } catch (error) {
    // Any verification failure (expired, malformed, wrong project, revoked)
    // means the caller is not authenticated.
    console.warn("ID token rejected:", error.code || error.message);
    throw httpError(401, "Invalid session");
  }
}

export function sendJson(response, statusCode, payload) {
  response.setHeader("Cache-Control", "no-store");
  response
    .status(statusCode)
    .setHeader("Content-Type", "application/json")
    .json(payload);
}

/**
 * Convert any thrown error to a safe JSON response. Errors that carry an
 * explicit statusCode < 500 were raised on purpose and their message is safe
 * to show; everything else is logged server-side and replaced with a generic
 * message so configuration details never leak.
 */
export function handleApiError(response, error) {
  console.error("API error", error);
  const status = error.statusCode || 500;
  let message = "Sunucu hatası. Lütfen daha sonra tekrar deneyin.";
  if (status === 401) message = "Oturumunuz geçersiz veya süresi dolmuş.";
  else if (status < 500 && error.expose !== false) message = error.message;
  return sendJson(response, status, { error: message });
}

export function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function allowedOrigins() {
  return (process.env.FRONTEND_ORIGIN || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

/**
 * Apply security headers and CORS. Same-origin requests need no CORS headers;
 * cross-origin requests are only allowed from FRONTEND_ORIGIN (never "*").
 */
export function allowCors(response, request) {
  const origin = request?.headers?.origin;
  const allowed = allowedOrigins();
  if (origin && allowed.includes(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    response.setHeader("Access-Control-Max-Age", "600");
  }
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}
