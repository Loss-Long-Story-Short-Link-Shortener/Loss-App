import { createHmac, randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { httpError } from "../lib/http.js";
import { baseUrl } from "../lib/links.js";
import { PLANS } from "../lib/plans.js";
import { clientIp, consume } from "../lib/rateLimit.js";

/** Billing always acts on the signed-in user's own account, never on a team workspace. */
export async function handle(ctx) {
  const { db, principal } = ctx;
  if (principal.via !== "firebase") throw httpError(403, "Faturalandırma yalnızca oturum açarak yönetilebilir.");
  const [sub] = ctx.segments;

  if (sub === "orders" && ctx.method === "GET") {
    const snap = await db.collection("orders").where("uid", "==", principal.uid).orderBy("createdAt", "desc").limit(50).get();
    return {
      body: {
        orders: snap.docs.map((d) => ({
          id: d.id, tier: d.data().tier, billingPeriod: d.data().billingPeriod, amountTl: d.data().amountKurus / 100,
          status: d.data().status, recurring: Boolean(d.data().recurring), createdAt: d.data().createdAt?.toMillis?.() ?? null,
        })),
      },
    };
  }

  if (sub === "cancel" && ctx.method === "POST") {
    const ref = db.collection("users").doc(principal.uid);
    const snap = await ref.get();
    const status = snap.data()?.subscription?.status;
    if (status !== "active" && status !== "past_due") throw httpError(400, "İptal edilecek aktif bir abonelik bulunmuyor.");
    await ref.update({ "subscription.cancelAtPeriodEnd": true });
    return { body: { success: true } };
  }

  if (sub === "resume" && ctx.method === "POST") {
    const ref = db.collection("users").doc(principal.uid);
    const snap = await ref.get();
    if (!snap.data()?.subscription?.cancelAtPeriodEnd) throw httpError(400, "Devam ettirilecek bir iptal bulunmuyor.");
    await ref.update({ "subscription.cancelAtPeriodEnd": false });
    return { body: { success: true } };
  }

  if (sub === "token" && ctx.method === "POST") {
    const { tier, billingPeriod = "monthly" } = ctx.body;
    const plan = tier !== "free" ? PLANS[tier] : null;
    if (!plan || !plan.monthly) throw httpError(400, "Geçersiz abonelik paketi seçildi.");
    if (!["monthly", "annual"].includes(billingPeriod)) throw httpError(400, "Geçersiz fatura dönemi.");
    if (!principal.email) throw httpError(400, "Ödeme için hesabınızda bir e-posta adresi olmalıdır.");

    const merchantId = process.env.PAYTR_MERCHANT_ID || "";
    const merchantKey = process.env.PAYTR_MERCHANT_KEY || "";
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT || "";
    if (!merchantId || !merchantKey || !merchantSalt) throw httpError(503, "Ödeme sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.");

    const limiter = await consume(db, "checkout", principal.uid, 10, 3600);
    if (!limiter.ok) throw httpError(429, "Çok fazla ödeme denemesi. Lütfen daha sonra tekrar deneyin.");

    const priceTl = billingPeriod === "annual" ? plan.annual : plan.monthly;
    const paymentAmountKurus = priceTl * 100;
    const merchantOid = `LOSS${randomBytes(12).toString("hex")}`; // PayTR requires alphanumeric
    await db.collection("orders").doc(merchantOid).set({
      uid: principal.uid, tier, billingPeriod, amountKurus: paymentAmountKurus, status: "pending", createdAt: FieldValue.serverTimestamp(),
    });

    const userIp = clientIp(ctx.request);
    const userBasket = Buffer.from(JSON.stringify([[plan.label, priceTl.toFixed(2), 1]])).toString("base64");
    const testMode = process.env.PAYTR_TEST_MODE === "1" ? "1" : "0";
    const hashStr = `${merchantId}${userIp}${merchantOid}${principal.email}${paymentAmountKurus}${userBasket}1${0}TL${testMode}${merchantSalt}`;
    const paytrToken = createHmac("sha256", merchantKey).update(hashStr).digest("base64");

    const params = new URLSearchParams({
      merchant_id: merchantId, user_ip: userIp, merchant_oid: merchantOid, email: principal.email,
      payment_amount: String(paymentAmountKurus), paytr_token: paytrToken, user_basket: userBasket, debug_on: testMode,
      no_installment: "1", max_installment: "0", user_name: principal.name || principal.email, user_address: "Türkiye", user_phone: "08500000000",
      merchant_ok_url: `${baseUrl()}/payment-result.html?status=success`, merchant_fail_url: `${baseUrl()}/payment-result.html?status=failed`,
      timeout_limit: "30", currency: "TL", test_mode: testMode, store_card: "1", utoken: principal.uid,
    });

    const res = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString(), signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => ({}));
    if (data.status !== "success" || !data.token) {
      console.error("PayTR get-token failed:", data.reason);
      await db.collection("orders").doc(merchantOid).update({ status: "token_failed" });
      throw httpError(502, "Ödeme oturumu başlatılamadı. Lütfen daha sonra tekrar deneyin.");
    }
    return { body: { token: data.token, iframeUrl: `https://www.paytr.com/odeme/guvenli/${data.token}`, merchantOid, tier, billingPeriod } };
  }
  return undefined;
}
