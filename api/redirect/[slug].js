import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin, allowCors } from "../_firebase.js";

export default async function handler(request, response) {
  allowCors(response);
  if (request.method !== "GET" && request.method !== "HEAD") {
    return response.status(405).send("Method not allowed");
  }

  const rawSlug = String(request.query.slug || "").trim();
  const lowerSlug = rawSlug.toLowerCase();

  const requestHost = (
    request.headers["x-forwarded-host"] ||
    request.headers.host ||
    "go.consolaktif.com.tr"
  )
    .split(",")[0]
    .trim()
    .toLowerCase();
  const configuredHost = (
    process.env.SHORT_LINK_HOST || "go.consolaktif.com.tr"
  )
    .trim()
    .toLowerCase();

  if (!rawSlug || rawSlug.length > 48)
    return response.status(404).send("Link not found");

  try {
    const { db } = await getFirebaseAdmin();
    const candidateHosts = [
      ...new Set([
        configuredHost,
        requestHost,
        "go.consolaktif.com.tr",
        "loss.consolaktif.com.tr",
      ]),
    ];
    const candidateSlugs = [...new Set([rawSlug, lowerSlug])];

    let linkRef;
    let linkSnapshot;

    // 1. Try direct document key lookup across candidate hosts and slug casings
    for (const host of candidateHosts) {
      for (const s of candidateSlugs) {
        const candidateRef = db.collection("links").doc(`${host}__${s}`);
        const candidateSnapshot = await candidateRef.get();
        if (candidateSnapshot.exists) {
          linkRef = candidateRef;
          linkSnapshot = candidateSnapshot;
          break;
        }
      }
      if (linkSnapshot?.exists) break;
    }

    // 2. Fallback query by slug field across collection
    if (!linkSnapshot?.exists) {
      for (const s of candidateSlugs) {
        const querySnap = await db
          .collection("links")
          .where("slug", "==", s)
          .limit(1)
          .get();
        if (!querySnap.empty) {
          linkSnapshot = querySnap.docs[0];
          linkRef = linkSnapshot.ref;
          break;
        }
      }
    }

    if (!linkSnapshot?.exists)
      return response.status(404).send("Link not found");

    const link = linkSnapshot.data();
    if (link.status !== "active")
      return response.status(410).send("Link is no longer active");

    await Promise.all([
      linkRef.update({
        clickCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      }),
      linkRef.collection("clicks").add({
        createdAt: FieldValue.serverTimestamp(),
        userAgent: request.headers["user-agent"] || null,
        referer: request.headers.referer || null,
      }),
    ]);

    return response.redirect(302, link.destination);
  } catch (error) {
    console.error(error);
    return response.status(500).send("Unable to redirect link");
  }
}

export const config = { runtime: "nodejs" };
