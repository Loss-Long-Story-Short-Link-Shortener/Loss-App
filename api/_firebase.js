import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const requiredEnv = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

export function getFirebaseAdmin() {
  if (!requiredEnv.every((name) => process.env[name])) {
    throw new Error(
      `Missing server environment variable: ${requiredEnv.join(", ")}`,
    );
  }

  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
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

  const { auth } = getFirebaseAdmin();
  return auth.verifyIdToken(token);
}

export function sendJson(response, statusCode, payload) {
  response
    .status(statusCode)
    .setHeader("Content-Type", "application/json")
    .json(payload);
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
