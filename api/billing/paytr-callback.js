import { createHmac, timingSafeEqual } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../../server/lib/firebase.js";

const PERIOD_DAYS = { monthly: 30, annual: 365 };

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * PayTR notification (server-to-server). Must answer exactly "OK" for any
 * authentic notification, otherwise PayTR retries. It is idempotent: orders
 * are only ever settled once.
 */
export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).send("Method not allowed");

  const merchantKey = process.env.PAYTR_MERCHANT_KEY || "";
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT || "";
  // Without credentials the signature below would be forgeable with an empty key.
  if (!merchantKey || !merchantSalt) return response.status(503).send("Payments not configured");

  const body = request.body && typeof request.body === "object" ? request.body : {};
  const { merchant_oid: oid = "", status = "", total_amount: totalAmount = "", hash = "" } = body;

  const expected = createHmac("sha256", merchantKey)
    .update(`${oid}${merchantSalt}${status}${totalAmount}`)
    .digest("base64");
  if (!oid || !safeEqual(hash, expected)) {
    console.error("PayTR callback rejected: bad hash", { oid });
    return response.status(400).send("PAYTR notification failed: bad hash");
  }

  try {
    const { db } = await getFirebaseAdmin();
    const orderRef = db.collection("orders").doc(String(oid));

    await db.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) {
        console.error("PayTR callback for unknown order", { oid });
        return;
      }
      const order = orderSnap.data();
      if (order.status === "paid" || order.status === "failed") return; // already settled

      if (status !== "success") {
        tx.update(orderRef, {
          status: "failed",
          failedReason: String(body.failed_reason_msg || "").slice(0, 200),
          settledAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      if (String(order.amountKurus) !== String(totalAmount)) {
        console.error("PayTR amount mismatch", { oid, expected: order.amountKurus, got: totalAmount });
        tx.update(orderRef, { status: "amount_mismatch", settledAt: FieldValue.serverTimestamp() });
        return;
      }

      const days = PERIOD_DAYS[order.billingPeriod] || 30;
      tx.update(orderRef, { status: "paid", settledAt: FieldValue.serverTimestamp() });
      tx.set(
        db.collection("users").doc(order.uid),
        {
          tier: order.tier,
          subscription: {
            status: "active",
            tier: order.tier,
            billingPeriod: order.billingPeriod,
            utoken: body.utoken || order.uid,
            ctoken: body.ctoken || null,
            merchantOid: oid,
            lastPaymentAt: FieldValue.serverTimestamp(),
            nextBillingAt: Timestamp.fromMillis(Date.now() + days * 86400_000),
            failedAttempts: 0,
            cancelAtPeriodEnd: false,
          },
        },
        { merge: true },
      );
    });

    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    return response.status(200).send("OK");
  } catch (error) {
    console.error("PayTR callback processing error:", error);
    return response.status(500).send("Processing error");
  }
}

export const config = { runtime: "nodejs" };
