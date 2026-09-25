import { createHmac } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin, sendJson, handleApiError, allowCors } from "../_firebase.js";

const TIER_PRICES_TRY = {
  starter: { monthly: 399, annual: 3990 },
  pro: { monthly: 899, annual: 8990 },
  agency: { monthly: 2499, annual: 24990 },
};

/**
 * PayTR Non-3DS Recurring Payment Execution Endpoint
 * Invoked by cron or background scheduler to charge tokenized cards (utoken + ctoken)
 */
export default async function handler(request, response) {
  allowCors(response);

  // Security: protect cron endpoint with CRON_SECRET or Admin authorization
  const authHeader = request.headers.authorization || "";
  const cronSecret = process.env.CRON_SECRET || "";
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return sendJson(response, 401, { error: "Yetkisiz erişim." });
  }

  try {
    const { db } = await getFirebaseAdmin();
    const merchantId = process.env.PAYTR_MERCHANT_ID || "";
    const merchantKey = process.env.PAYTR_MERCHANT_KEY || "";
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT || "";

    if (!merchantId || !merchantKey || !merchantSalt) {
      return sendJson(response, 200, {
        message: "PayTR anahtarları yapılandırılmadığı için simülasyon modunda çalışıldı.",
      });
    }

    // Find all active subscriptions
    const activeSubsSnap = await db
      .collection("users")
      .where("subscription.status", "in", ["active", "past_due"])
      .get();

    const results = [];

    for (const doc of activeSubsSnap.docs) {
      const userData = doc.data();
      const sub = userData.subscription;

      if (!sub || !sub.ctoken || !sub.utoken || sub.tier === "free") continue;

      const planMeta = TIER_PRICES_TRY[sub.tier];
      if (!planMeta) continue;

      const priceTl = sub.billingPeriod === "annual" ? planMeta.annual : planMeta.monthly;
      const paymentAmountKurus = priceTl * 100;
      const merchantOid = `loss_rec_${doc.id.slice(0, 8)}_${Date.now()}`;

      // Calculate token for Direct Card Payment API
      const hashStr = `${merchantId}${userData.email || "musteri@loss.tr"}${paymentAmountKurus}${merchantOid}${merchantSalt}`;
      const paytrToken = createHmac("sha256", merchantKey).update(hashStr).digest("base64");

      const params = new URLSearchParams({
        merchant_id: merchantId,
        merchant_oid: merchantOid,
        email: userData.email || "musteri@loss.tr",
        payment_amount: String(paymentAmountKurus),
        paytr_token: paytrToken,
        utoken: sub.utoken,
        ctoken: sub.ctoken,
        user_ip: "127.0.0.1",
        currency: "TL",
      });

      try {
        const paytrRes = await fetch("https://www.paytr.com/odeme", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        });

        const paytrData = await paytrRes.json();

        if (paytrData.status === "success") {
          await doc.ref.update({
            "subscription.status": "active",
            "subscription.lastPaymentAt": FieldValue.serverTimestamp(),
            "subscription.failedAttempts": 0,
          });
          results.push({ userId: doc.id, status: "success", merchantOid });
        } else {
          const failedAttempts = (sub.failedAttempts || 0) + 1;
          const isGraceExpired = failedAttempts >= 3;

          await doc.ref.update({
            "subscription.status": isGraceExpired ? "canceled" : "past_due",
            "subscription.failedAttempts": failedAttempts,
            "subscription.lastFailedAt": FieldValue.serverTimestamp(),
            tier: isGraceExpired ? "free" : userData.tier,
          });
          results.push({ userId: doc.id, status: "failed", error: paytrData.reason });
        }
      } catch (reqErr) {
        results.push({ userId: doc.id, status: "error", error: reqErr.message });
      }
    }

    return sendJson(response, 200, {
      processed: results.length,
      results,
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}

export const config = { runtime: "nodejs" };
