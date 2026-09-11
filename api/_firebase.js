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

  if (!token) {
    const error = new Error("Missing Firebase ID token");
    error.statusCode = 401;
    throw error;
  }

  try {
    const { auth } = await getFirebaseAdmin();
    return await auth.verifyIdToken(token);
  } catch (error) {
    error.statusCode =
      error.code === "auth/id-token-expired" ||
      error.code === "auth/invalid-id-token"
        ? 401
        : 500;
    throw error;
  }
}

export function sendJson(response, statusCode, payload) {
  response
    .status(statusCode)
    .setHeader("Content-Type", "application/json")
    .json(payload);
}

export function handleApiError(response, error) {
  console.error("API error", error);
  return sendJson(response, error.statusCode || 500, {
    error:
      error.statusCode === 401
        ? "Your session is invalid or expired"
        : error.message || "Server configuration error",
  });
}

export function allowCors(response) {
  response.setHeader(
    "Access-Control-Allow-Origin",
    process.env.FRONTEND_ORIGIN || "*",
  );
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type",
  );
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}
