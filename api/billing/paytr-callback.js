import { createHmac } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../_firebase.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).send("Method not allowed");
  }

  // PayTR sends application/x-www-form-urlencoded
  const body = request.body || {};
  const merchantOid = body.merchant_oid || "";
  const status = body.status || "";
  const totalAmount = body.total_amount || "";
  const hash = body.hash || "";
  const failedReasonMsg = body.failed_reason_msg || "";
  const utoken = body.utoken || "";
  const ctoken = body.ctoken || "";

  const merchantKey = process.env.PAYTR_MERCHANT_KEY || "";
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT || "";

  // 1. Verify HMAC-SHA256 signature
  // Official PayTR formula: hash_str = merchant_oid + merchant_salt + status + total_amount
  const hashStr = `${merchantOid}${merchantSalt}${status}${totalAmount}`;
  const computedHash = createHmac("sha256", merchantKey).update(hashStr).digest("base64");

  if (hash !== computedHash) {
    console.error("PAYTR callback bad hash rejection:", { merchantOid, hash, computedHash });
    return response.status(400).send("PAYTR notification failed: bad hash");
  }

  try {
    const { db } = await getFirebaseAdmin();

    // 2. Extract User ID and Plan from merchantOid (format: loss_{uidPrefix}_{tier}_{timestamp})
    // Also check pending orders or transactions collection if created
    const parts = merchantOid.split("_");
    const planTier = parts[2] || "starter";

    if (status === "success") {
      // Find user by scanning or by stored transaction ID
      // If merchantOid contains user identifier:
      const userRefQuery = await db
        .collection("users")
        .where("subscription.pendingOid", "==", merchantOid)
        .limit(1)
        .get();

      let targetUserRef = null;

      if (!userRefQuery.empty) {
        targetUserRef = userRefQuery.docs[0].ref;
      } else {
        // Fallback: search by uid prefix
        const uidPrefix = parts[1];
        if (uidPrefix) {
          const allUsers = await db.collection("users").get();
          for (const doc of allUsers.docs) {
            if (doc.id.startsWith(uidPrefix)) {
              targetUserRef = doc.ref;
              break;
            }
          }
        }
      }

      if (targetUserRef) {
        await targetUserRef.set(
          {
            tier: planTier,
            subscription: {
              status: "active",
              tier: planTier,
              utoken: utoken || null,
              ctoken: ctoken || null,
              lastPaymentAt: FieldValue.serverTimestamp(),
              lastPaymentAmountKurus: totalAmount,
              merchantOid,
              failedAttempts: 0,
            },
          },
          { merge: true }
        );
      }

      // Record transaction ledger
      await db.collection("transactions").add({
        merchantOid,
        status: "success",
        totalAmount,
        tier: planTier,
        utoken: utoken || null,
        ctoken: ctoken || null,
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      console.warn("PayTR payment failed:", { merchantOid, failedReasonMsg });
      await db.collection("transactions").add({
        merchantOid,
        status: "failed",
        failedReasonMsg,
        totalAmount,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // 3. Official PayTR requirement: respond ONLY with the exact literal string "OK"
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    return response.status(200).send("OK");
  } catch (err) {
    console.error("PayTR callback processing error:", err);
    return response.status(500).send("Database error");
  }
}

export const config = { runtime: "nodejs" };
