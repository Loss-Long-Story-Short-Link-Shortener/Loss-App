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
