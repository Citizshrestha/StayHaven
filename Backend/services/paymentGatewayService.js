/**
 * Payment Gateway Service
 * 
 * Production-level integration for:
 * - Khalti (epayment v2 API)
 * - eSewa (epay v2 API with HMAC-SHA256)
 * - Stripe (card payments via Payment Intents)
 * 
 * All secrets stay server-side. Frontend never sees API keys.
 */

import crypto from "crypto";
import stripeLib from "stripe";

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

const CONFIG = {
  khalti: {
    secretKey: () => process.env.KHALTI_SECRET_KEY || "",
    baseUrl: () => {
      // If using live key, use live URL; otherwise use test URL
      const secretKey = process.env.KHALTI_SECRET_KEY || "";
      const isLiveKey = secretKey.startsWith("live_");
      return isLiveKey
        ? "https://khalti.com/api/v2"
        : "https://a.khalti.com/api/v2";
    },
  },
  esewa: {
    secretKey: () => process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q",
    productCode: () => process.env.ESEWA_PRODUCT_CODE || "EPAYTEST",
    baseUrl: () =>
      process.env.NODE_ENV === "production"
        ? "https://epay.esewa.com.np"
        : "https://rc-epay.esewa.com.np",
    statusUrl: () =>
      process.env.NODE_ENV === "production"
        ? "https://esewa.com.np"
        : "https://rc.esewa.com.np",
  },
  stripe: {
    secretKey: () => process.env.STRIPE_SECRET_KEY || "",
  },
  clientUrl: () => process.env.CLIENT_URL || "http://localhost:5173",
};

// Lazy-init Stripe
let _stripe = null;
const getStripe = () => {
  if (!_stripe && CONFIG.stripe.secretKey()) {
    _stripe = stripeLib(CONFIG.stripe.secretKey());
  }
  return _stripe;
};

// ═══════════════════════════════════════════════════════════════════════
// KHALTI  —  epayment v2
// ═══════════════════════════════════════════════════════════════════════

/**
 * Initiate a Khalti payment.
 * Server-side POST to Khalti → returns { pidx, payment_url }
 * Frontend redirects user to payment_url.
 *
 * @param {Object} opts
 * @param {number} opts.amount        – Amount in NPR (we convert to paisa internally)
 * @param {string} opts.orderId       – Our internal order/invoice ID
 * @param {string} opts.orderName     – Human-readable order label
 * @param {Object} opts.customer      – { name, email, phone }
 * @returns {{ pidx: string, paymentUrl: string }}
 */
export async function initiateKhaltiPayment({ amount, orderId, orderName, customer }) {
  const secretKey = CONFIG.khalti.secretKey();
  if (!secretKey) throw new Error("Khalti secret key is not configured");

  const amountInPaisa = Math.round(amount * 100);
  const baseUrl = CONFIG.khalti.baseUrl();
  const returnUrl = `${CONFIG.clientUrl()}/guest-dashboard/billing?payment_status=khalti&orderId=${orderId}`;

  const payload = {
    return_url: returnUrl,
    website_url: CONFIG.clientUrl(),
    amount: amountInPaisa,
    purchase_order_id: orderId,
    purchase_order_name: orderName || `Payment #${orderId}`,
    customer_info: {
      name: customer?.name || "Guest",
      email: customer?.email || "guest@example.com",
      phone: customer?.phone || "9800000000",
    },
  };

  console.log("Khalti payment initiation:", {
    baseUrl,
    amount: amountInPaisa,
    orderId,
    returnUrl,
  });

  const response = await fetch(`${baseUrl}/epayment/initiate/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Khalti initiate error:", {
      status: response.status,
      statusText: response.statusText,
      data,
      payload,
    });
    throw new Error(data?.detail || data?.message || `Khalti API error: ${response.status}`);
  }

  return {
    pidx: data.pidx,
    paymentUrl: data.payment_url,
    expiresAt: data.expires_at,
    expiresIn: data.expires_in,
  };
}

/**
 * Verify/lookup a Khalti payment using pidx.
 * Called by callback handler after user returns from Khalti.
 *
 * @param {string} pidx
 * @returns {{ status: string, transactionId: string, ... }}
 */
export async function verifyKhaltiPayment(pidx) {
  const secretKey = CONFIG.khalti.secretKey();
  if (!secretKey) throw new Error("Khalti secret key is not configured");

  const response = await fetch(`${CONFIG.khalti.baseUrl()}/epayment/lookup/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pidx }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Khalti lookup error:", data);
    throw new Error(data?.detail || data?.message || "Khalti payment verification failed");
  }

  return {
    status: data.status, // "Completed", "Pending", "Initiated", "Refunded", "Expired", "User canceled"
    transactionId: data.transaction_id || "",
    pidx: data.pidx,
    totalAmount: data.total_amount ? data.total_amount / 100 : 0, // Convert back from paisa to NPR
    fee: data.fee ? data.fee / 100 : 0,
    refunded: data.refunded || false,
    raw: data,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// eSEWA  —  epay v2 (HMAC-SHA256 signed form)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate HMAC-SHA256 signature for eSewa.
 * Input string format: "total_amount={total_amount},transaction_uuid={uuid},product_code={code}"
 */
function generateEsewaSignature(message, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(message);
  return hmac.digest("base64");
}

/**
 * Generate eSewa payment form data.
 * Frontend submits this as a POST form to eSewa.
 *
 * @param {Object} opts
 * @param {number} opts.amount         – Net amount in NPR
 * @param {number} opts.taxAmount      – Tax amount (default 0)
 * @param {string} opts.orderId        – Our internal order ID (used as transaction_uuid)
 * @returns {{ formUrl, formData }}
 */
export function generateEsewaPaymentData({ amount, taxAmount = 0, orderId }) {
  const secret = CONFIG.esewa.secretKey();
  const productCode = CONFIG.esewa.productCode();
  const totalAmount = amount + taxAmount;

  // transaction_uuid must be alphanumeric + hyphen only
  const transactionUuid = `${orderId}-${Date.now()}`;

  const successUrl = `${CONFIG.clientUrl()}/guest/dashboard?tab=billing&payment_status=esewa&orderId=${orderId}`;
  const failureUrl = `${CONFIG.clientUrl()}/guest/dashboard?tab=billing&payment_status=esewa_failed&orderId=${orderId}`;

  // Generate signature
  const signedFieldNames = "total_amount,transaction_uuid,product_code";
  const signatureInput = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  const signature = generateEsewaSignature(signatureInput, secret);

  const formData = {
    amount: String(amount),
    tax_amount: String(taxAmount),
    total_amount: String(totalAmount),
    transaction_uuid: transactionUuid,
    product_code: productCode,
    product_service_charge: "0",
    product_delivery_charge: "0",
    success_url: successUrl,
    failure_url: failureUrl,
    signed_field_names: signedFieldNames,
    signature,
  };

  const formUrl = `${CONFIG.esewa.baseUrl()}/api/epay/main/v2/form`;

  return { formUrl, formData, transactionUuid };
}

/**
 * Verify eSewa payment callback.
 * After successful payment, eSewa redirects to success_url with Base64-encoded response body.
 *
 * @param {string} encodedData – Base64-encoded response from eSewa
 * @returns {{ verified: boolean, data: Object }}
 */
export function verifyEsewaCallback(encodedData) {
  try {
    const decoded = Buffer.from(encodedData, "base64").toString("utf-8");
    const data = JSON.parse(decoded);

    // Verify signature
    const secret = CONFIG.esewa.secretKey();
    const signedFields = data.signed_field_names;

    if (!signedFields) {
      return { verified: false, data, error: "Missing signed_field_names" };
    }

    const fieldNames = signedFields.split(",");
    const signatureInput = fieldNames.map((f) => `${f}=${data[f]}`).join(",");
    const expectedSignature = generateEsewaSignature(signatureInput, secret);

    if (expectedSignature !== data.signature) {
      console.error("eSewa signature mismatch:", { expected: expectedSignature, received: data.signature });
      return { verified: false, data, error: "Signature verification failed" };
    }

    return {
      verified: true,
      data: {
        transactionCode: data.transaction_code,
        status: data.status, // "COMPLETE"
        totalAmount: parseFloat(data.total_amount) || 0,
        transactionUuid: data.transaction_uuid,
        productCode: data.product_code,
      },
    };
  } catch (err) {
    console.error("eSewa callback parse error:", err);
    return { verified: false, error: err.message };
  }
}

/**
 * Check eSewa transaction status (server-to-server).
 *
 * @param {string} transactionUuid
 * @param {number} totalAmount
 * @returns {{ status, refId }}
 */
export async function checkEsewaTransactionStatus(transactionUuid, totalAmount) {
  const productCode = CONFIG.esewa.productCode();
  const url = `${CONFIG.esewa.statusUrl()}/api/epay/transaction/status/?product_code=${productCode}&total_amount=${totalAmount}&transaction_uuid=${transactionUuid}`;

  const response = await fetch(url);
  const data = await response.json();

  return {
    status: data.status, // "COMPLETE", "PENDING", "FULL_REFUND", "PARTIAL_REFUND", "CANCELED", "NOT_FOUND", "AMBIGUOUS"
    refId: data.ref_id,
    productCode: data.product_code,
    transactionUuid: data.transaction_uuid,
    totalAmount: data.total_amount,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// STRIPE  —  Card Payments via Payment Intents
// ═══════════════════════════════════════════════════════════════════════

/**
 * Create a Stripe Payment Intent for card payments.
 *
 * @param {Object} opts
 * @param {number} opts.amount     – Amount in NPR
 * @param {string} opts.currency   – Default "npr"
 * @param {Object} opts.metadata   – { orderId, customerEmail, ... }
 * @returns {{ clientSecret, paymentIntentId, amount, currency }}
 */
export async function createStripePaymentIntent({ amount, currency = "usd", metadata = {} }) {
  const stripe = getStripe();

  if (!stripe) {
    // Development fallback — simulate
    return {
      clientSecret: `sim_secret_${Date.now()}`,
      paymentIntentId: `sim_pi_${Date.now()}`,
      amount,
      currency,
      simulated: true,
    };
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe uses cents/smallest currency unit
    currency,
    metadata,
    automatic_payment_methods: { enabled: true },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount,
    currency,
    simulated: false,
  };
}

/**
 * Verify a Stripe Payment Intent status.
 *
 * @param {string} paymentIntentId
 * @returns {{ status, amount }}
 */
export async function verifyStripePayment(paymentIntentId) {
  const stripe = getStripe();

  if (!stripe) {
    // Development — treat simulated intents as succeeded
    return { status: "succeeded", amount: 0, simulated: true };
  }

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  return {
    status: pi.status,
    amount: pi.amount / 100,
    currency: pi.currency,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITY: Get Payment Gateway Config (sent to frontend for UI)
// ═══════════════════════════════════════════════════════════════════════

export function getPaymentGatewayConfig() {
  return {
    khalti: {
      enabled: !!CONFIG.khalti.secretKey(),
      testMode: process.env.NODE_ENV !== "production",
    },
    esewa: {
      enabled: true, // eSewa uses test credentials by default
      testMode: process.env.NODE_ENV !== "production",
      formUrl: `${CONFIG.esewa.baseUrl()}/api/epay/main/v2/form`,
    },
    stripe: {
      enabled: !!CONFIG.stripe.secretKey(),
      testMode: process.env.NODE_ENV !== "production",
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    },
  };
}
