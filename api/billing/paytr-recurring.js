import { createHmac, timingSafeEqual } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "../../server/lib/firebase.js";
import { handleApiError, sendJson } from "../../server/lib/http.js";
import { PLANS } from "../../server/lib/plans.js";

const PERIOD_DAYS = { monthly: 30, annual: 365 };
const MAX_FAILED_ATTEMPTS = 3;

function authorized(request) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false; // fail closed: never expose a charging endpoint without a secret
  const given = Buffer.from(request.headers.authorization || "");
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

/**
 * Daily job (Vercel Cron sends GET with `Authorization: Bearer $CRON_SECRET`).
 * Charges subscriptions whose period has ended, honours cancel-at-period-end,
 * and downgrades after repeated failures.
 */
export default async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed" });
  if (!authorized(request)) return sendJson(response, 401, { error: "Yetkisiz erişim." });

  try {
    const { db } = await getFirebaseAdmin();
    const merchantId = process.env.PAYTR_MERCHANT_ID || "";
    const merchantKey = process.env.PAYTR_MERCHANT_KEY || "";
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT || "";
    if (!merchantId || !merchantKey || !merchantSalt) {
      return sendJson(response, 503, { error: "PayTR yapılandırılmamış." });
    }

    const due = await db
      .collection("users")
      .where("subscription.status", "in", ["active", "past_due"])
      .where("subscription.nextBillingAt", "<=", Timestamp.now())
      .limit(200)
      .get();

    const results = [];
    for (const doc of due.docs) {
      const user = doc.data();
      const sub = user.subscription || {};

      if (sub.cancelAtPeriodEnd) {
        await doc.ref.update({ tier: "free", "subscription.status": "canceled" });
        results.push({ uid: doc.id, status: "canceled" });
        continue;
      }

      const plan = PLANS[sub.tier];
      if (!plan?.monthly || !sub.ctoken || !sub.utoken || !user.email) continue;

      const priceTl = sub.billingPeriod === "annual" ? plan.annual : plan.monthly;
      const amountKurus = priceTl * 100;
      const merchantOid = `LOSSREC${doc.id.slice(0, 8).replace(/[^A-Za-z0-9]/g, "")}${Date.now()}`;
      const paytrToken = createHmac("sha256", merchantKey)
        .update(`${merchantId}${user.email}${amountKurus}${merchantOid}${merchantSalt}`)
        .digest("base64");

      try {
        const res = await fetch("https://www.paytr.com/odeme", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            merchant_id: merchantId,
            merchant_oid: merchantOid,
            email: user.email,
            payment_amount: String(amountKurus),
            paytr_token: paytrToken,
            utoken: sub.utoken,
            ctoken: sub.ctoken,
            user_ip: "127.0.0.1",
            currency: "TL",
          }).toString(),
          signal: AbortSignal.timeout(20000),
        });
        const data = await res.json().catch(() => ({}));

        if (data.status === "success") {
          const days = PERIOD_DAYS[sub.billingPeriod] || 30;
          await doc.ref.update({
            "subscription.status": "active",
            "subscription.lastPaymentAt": FieldValue.serverTimestamp(),
            "subscription.nextBillingAt": Timestamp.fromMillis(Date.now() + days * 86400_000),
            "subscription.failedAttempts": 0,
          });
          await db.collection("orders").doc(merchantOid).set({
            uid: doc.id, tier: sub.tier, billingPeriod: sub.billingPeriod || "monthly",
            amountKurus, status: "paid", recurring: true, createdAt: FieldValue.serverTimestamp(),
          });
          results.push({ uid: doc.id, status: "success" });
        } else {
          const failedAttempts = (sub.failedAttempts || 0) + 1;
          const expired = failedAttempts >= MAX_FAILED_ATTEMPTS;
          await doc.ref.update({
            "subscription.status": expired ? "canceled" : "past_due",
            "subscription.failedAttempts": failedAttempts,
            "subscription.lastFailedAt": FieldValue.serverTimestamp(),
            "subscription.nextBillingAt": Timestamp.fromMillis(Date.now() + 86400_000),
            ...(expired ? { tier: "free" } : {}),
          });
          results.push({ uid: doc.id, status: expired ? "canceled" : "past_due" });
        }
      } catch (error) {
        console.error("Recurring charge error", doc.id, error);
        results.push({ uid: doc.id, status: "error" });
      }
    }

    return sendJson(response, 200, { processed: results.length, results });
  } catch (error) {
    return handleApiError(response, error);
  }
}

export const config = { runtime: "nodejs" };
