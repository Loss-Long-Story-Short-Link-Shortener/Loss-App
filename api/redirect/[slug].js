import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin, allowCors } from "../_firebase.js";

export default async function handler(request, response) {
  allowCors(response);
  if (request.method !== "GET" && request.method !== "HEAD") {
    return response.status(405).send("Method not allowed");
  }

  const slug = String(request.query.slug || "").toLowerCase();
  const host = (
    request.headers["x-forwarded-host"] ||
    request.headers.host ||
    "go.consolaktif.com.tr"
  )
    .split(",")[0]
    .trim()
    .toLowerCase();

  if (!slug || slug.length > 48)
    return response.status(404).send("Link not found");

  try {
    const { db } = await getFirebaseAdmin();
    const linkRef = db.collection("links").doc(`${host}__${slug}`);
    const linkSnapshot = await linkRef.get();
    if (!linkSnapshot.exists)
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
