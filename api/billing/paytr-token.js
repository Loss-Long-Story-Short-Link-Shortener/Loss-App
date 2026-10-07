import { createHmac, randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { allowCors, getFirebaseAdmin, handleApiError, httpError, requireUser, sendJson } from "../_firebase.js";
import { baseUrl } from "../_lib/links.js";
import { PLANS } from "../_lib/plans.js";
import { clientIp, consume } from "../_lib/rateLimit.js";

/**
 * POST /api/billing/paytr-token  { tier, billingPeriod }
 * Creates a pending order on the server and returns a PayTR iFrame token.
 * The amount is always derived from the server-side price list.
 */
export default async function handler(request, response) {
  allowCors(response, request);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed" });

  try {
    const user = await requireUser(request);
    const { tier, billingPeriod = "monthly" } = (typeof request.body === "object" && request.body) || {};

    const plan = tier !== "free" ? PLANS[tier] : null;
    if (!plan || !plan.monthly) throw httpError(400, "Geçersiz abonelik paketi seçildi.");
    if (!["monthly", "annual"].includes(billingPeriod)) throw httpError(400, "Geçersiz fatura dönemi.");
    if (!user.email) throw httpError(400, "Ödeme için hesabınızda doğrulanmış bir e-posta adresi olmalıdır.");

    const merchantId = process.env.PAYTR_MERCHANT_ID || "";
    const merchantKey = process.env.PAYTR_MERCHANT_KEY || "";
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT || "";
    if (!merchantId || !merchantKey || !merchantSalt) {
      throw httpError(503, "Ödeme sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.");
    }

    const { db } = await getFirebaseAdmin();
    const limiter = await consume(db, "checkout", user.uid, 10, 3600);
    if (!limiter.ok) throw httpError(429, "Çok fazla ödeme denemesi. Lütfen daha sonra tekrar deneyin.");

    const priceTl = billingPeriod === "annual" ? plan.annual : plan.monthly;
    const paymentAmountKurus = priceTl * 100;
    // PayTR requires an alphanumeric merchant_oid (no separators).
    const merchantOid = `LOSS${randomBytes(12).toString("hex")}`;

    await db.collection("orders").doc(merchantOid).set({
      uid: user.uid,
      tier,
      billingPeriod,
      amountKurus: paymentAmountKurus,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });

    const userIp = clientIp(request);
    const userBasket = Buffer.from(JSON.stringify([[plan.name, priceTl.toFixed(2), 1]])).toString("base64");
    const noInstallment = "1";
    const maxInstallment = "0";
    const currency = "TL";
    const testMode = process.env.PAYTR_TEST_MODE === "1" ? "1" : "0";

    const hashStr = `${merchantId}${userIp}${merchantOid}${user.email}${paymentAmountKurus}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}${merchantSalt}`;
    const paytrToken = createHmac("sha256", merchantKey).update(hashStr).digest("base64");

    const params = new URLSearchParams({
      merchant_id: merchantId,
      user_ip: userIp,
      merchant_oid: merchantOid,
      email: user.email,
      payment_amount: String(paymentAmountKurus),
      paytr_token: paytrToken,
      user_basket: userBasket,
      debug_on: testMode,
      no_installment: noInstallment,
      max_installment: maxInstallment,
      user_name: user.name || user.email,
      user_address: "Türkiye",
      user_phone: "08500000000",
      merchant_ok_url: `${baseUrl()}/payment-result.html?status=success`,
      merchant_fail_url: `${baseUrl()}/payment-result.html?status=failed`,
      timeout_limit: "30",
      currency,
      test_mode: testMode,
      store_card: "1",
      utoken: user.uid,
    });

    const paytrRes = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });
    const paytrData = await paytrRes.json().catch(() => ({}));

    if (paytrData.status !== "success" || !paytrData.token) {
      console.error("PayTR get-token failed:", paytrData.reason);
      await db.collection("orders").doc(merchantOid).update({ status: "token_failed" });
      throw httpError(502, "Ödeme oturumu başlatılamadı. Lütfen daha sonra tekrar deneyin.");
    }

    return sendJson(response, 200, {
      token: paytrData.token,
      iframeUrl: `https://www.paytr.com/odeme/guvenli/${paytrData.token}`,
      merchantOid,
      tier,
      billingPeriod,
    });
  } catch (error) {
    return handleApiError(response, error);
  }
}

export const config = { runtime: "nodejs" };
