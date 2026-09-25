import { createHmac } from "node:crypto";
import {
  allowCors,
  getFirebaseAdmin,
  handleApiError,
  requireUser,
  sendJson,
} from "../_firebase.js";

const TIER_PRICES_TRY = {
  starter: { monthly: 399, annual: 3990, name: "Loss Starter Planı" },
  pro: { monthly: 899, annual: 8990, name: "Loss Pro Team Planı" },
  agency: { monthly: 2499, annual: 24990, name: "Loss Agency / Scale Planı" },
};

export default async function handler(request, response) {
  allowCors(response);

  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }

  if (request.method !== "POST") {
    return response.status(405).send("Method not allowed");
  }

  try {
    const user = await requireUser(request);
    const { tier = "starter", billingPeriod = "monthly" } = request.body || {};

    const planMeta = TIER_PRICES_TRY[tier];
    if (!planMeta) {
      return sendJson(response, 400, {
        error: "Geçersiz abonelik paketi seçildi.",
      });
    }

    const priceTl =
      billingPeriod === "annual" ? planMeta.annual : planMeta.monthly;
    const paymentAmountKurus = priceTl * 100; // PayTR requires amount in kuruş

    const merchantId = process.env.PAYTR_MERCHANT_ID || "";
    const merchantKey = process.env.PAYTR_MERCHANT_KEY || "";
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT || "";

    const userIp =
      request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      request.socket.remoteAddress ||
      "127.0.0.1";

    const merchantOid = `loss_${user.uid.slice(0, 10)}_${tier}_${Date.now()}`;
    const userBasket = Buffer.from(
      JSON.stringify([[planMeta.name, priceTl.toFixed(2), 1]]),
    ).toString("base64");

    const noInstallment = "1"; // Recurring subscriptions don't allow installments
    const maxInstallment = "0";
    const currency = "TL";
    const testMode = process.env.PAYTR_TEST_MODE || "1";

    // If PayTR credentials are not set (e.g. local development / test), return dev simulation
    if (!merchantId || !merchantKey || !merchantSalt) {
      return sendJson(response, 200, {
        isDemoSimulation: true,
        merchantOid,
        tier,
        billingPeriod,
        amountTl: priceTl,
        message:
          "PayTR API anahtarları henüz girilmediği için test ortamı simülasyonu sağlandı.",
      });
    }

    // Official PayTR HMAC-SHA256 Hash calculation:
    // hash_str = merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode + merchant_salt
    const hashStr = `${merchantId}${userIp}${merchantOid}${user.email}${paymentAmountKurus}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}${merchantSalt}`;
    const paytrToken = createHmac("sha256", merchantKey)
      .update(hashStr)
      .digest("base64");

    const callbackUrl =
      process.env.PAYTR_CALLBACK_URL ||
      `${process.env.SHORT_LINK_BASE_URL || "https://panel.loss.tr"}/api/billing/paytr-callback`;

    const postParams = new URLSearchParams({
      merchant_id: merchantId,
      user_ip: userIp,
      merchant_oid: merchantOid,
      email: user.email || "musteri@loss.tr",
      payment_amount: String(paymentAmountKurus),
      paytr_token: paytrToken,
      user_basket: userBasket,
      debug_on: testMode === "1" ? "1" : "0",
      no_installment: noInstallment,
      max_installment: maxInstallment,
      user_name: user.name || "Loss Müşterisi",
      user_address: "Türkiye",
      user_phone: "08500000000",
      merchant_ok_url: `${process.env.SHORT_LINK_BASE_URL || "https://panel.loss.tr"}/billing?payment=success`,
      merchant_fail_url: `${process.env.SHORT_LINK_BASE_URL || "https://panel.loss.tr"}/billing?payment=failed`,
      timeout_limit: "30",
      currency: currency,
      test_mode: testMode,
      // Card storage for recurring subscription
      store_card: "1",
      utoken: user.uid,
    });

    const paytrRes = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: postParams.toString(),
    });

    const paytrData = await paytrRes.json();

    if (paytrData.status === "failed") {
      return sendJson(response, 400, {
        error: paytrData.reason || "PayTR ödeme oturumu başlatılamadı.",
      });
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
