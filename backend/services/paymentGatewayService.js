/**
 * Nepal gateway adapters. No runtime mocks, credential defaults or secret logging.
 * Official endpoint/schema references:
 * https://docs.khalti.com/khalti-epayment/
 * https://developer.esewa.com.np/pages/Epay
 */
import crypto from "crypto";
import stripeLib from "stripe";

const CONFIG = { stripe: { secretKey: () => process.env.STRIPE_SECRET_KEY || "" } };
let _stripe = null;
let _stripeOverride = null; // test-only injection; see __setStripeClientForTests below.
const getStripe = () => {
  if (_stripeOverride) return _stripeOverride;
  if (!validCredential(CONFIG.stripe.secretKey(), 20)) fail("STRIPE is not configured");
  if (!_stripe) {
    _stripe = stripeLib(CONFIG.stripe.secretKey());
  }
  return _stripe;
};

/**
 * TEST-ONLY seam: substitutes the Stripe SDK client so tests can exercise
 * this module's own amount/currency/settled-state logic against a scripted
 * fake paymentIntents.create/retrieve, without a network call to Stripe or
 * a real secret key. Never called from production code paths. Pass
 * undefined/null to restore normal behavior (bypasses the credential check
 * entirely while set, so callers must always reset it in a test's cleanup).
 */
export function __setStripeClientForTests(client) {
  _stripeOverride = client || null;
}

const TIMEOUT_MS = 8000;
const FORM_FIELDS = "total_amount,transaction_uuid,product_code";
const CALLBACK_FIELDS = "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names";
const KHALTI_STATUSES = new Set([
  "Completed", "Pending", "Initiated", "Refunded", "Partially Refunded",
  "Expired", "User canceled",
]);
const ESEWA_STATUSES = new Set([
  "COMPLETE", "PENDING", "FULL_REFUND", "PARTIAL_REFUND",
  "CANCELED", "NOT_FOUND", "AMBIGUOUS",
]);
// Public documentation examples, never accepted as production credentials.
const ESEWA_PUBLIC_SECRET = "8gBm/:&EnhH.1/q";
const KHALTI_PUBLIC_KEYS = new Set([
  "05bf95cc57244045b8df5fad06748dab",
  "live_secret_key_68791341fdd94846a146f0457ff7b455",
]);

function fail(message) { throw new Error(message); }
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function validCredential(value, minimum) {
  return typeof value === "string" && value.length >= minimum && value.length <= 512 &&
    // eslint-disable-next-line no-control-regex -- rejecting control characters is the point: they must never reach a credential header.
    !/[\s<>\u0000-\u001f\u007f]/.test(value) &&
    !/your[_-]|replace|placeholder|change[_-]?me|example|dummy|not[_-]?set|insert[_-]|todo/i.test(value) &&
    !/^(.)\1+$/.test(value) &&
    !/^(secret|test|sandbox|production|default|test_secret_key|live_secret_key)$/i.test(value);
}
function gatewayConfig(gateway) {
  const prefix = gateway.toUpperCase();
  const env = process.env[prefix + "_ENV"];
  const secret = process.env[prefix + "_SECRET_KEY"];
  if (!["sandbox", "production"].includes(env) ||
      !validCredential(secret, gateway === "khalti" ? 20 : 12)) {
    fail(prefix + " is not configured");
  }
  if (gateway === "khalti") {
    if (KHALTI_PUBLIC_KEYS.has(secret)) fail("KHALTI is not configured");
    return {
      env, secret,
      baseUrl: env === "production" ? "https://khalti.com/api/v2" : "https://dev.khalti.com/api/v2",
    };
  }
  const productCode = process.env.ESEWA_PRODUCT_CODE;
  if (!validCredential(productCode, 1) || !/^[a-zA-Z0-9_-]{1,100}$/.test(productCode) ||
      (env === "production" && (productCode.toUpperCase() === "EPAYTEST" || secret === ESEWA_PUBLIC_SECRET))) {
    fail("ESEWA is not configured");
  }
  return {
    env, secret, productCode,
    formUrl: (env === "production" ? "https://epay.esewa.com.np" : "https://rc-epay.esewa.com.np") + "/api/epay/main/v2/form",
    statusUrl: (env === "production" ? "https://esewa.com.np" : "https://rc.esewa.com.np") + "/api/epay/transaction/status/",
  };
}

// Decimal parsing avoids rounding sub-paisa amounts or accepting JS coercions.
// Numeric 0.1 + 0.2 is deliberately rejected: callers must supply exact currency.
function toPaisa(value, allowZero = false) {
  if ((typeof value !== "number" && typeof value !== "string") ||
      (typeof value === "number" && (!Number.isFinite(value) || Object.is(value, -0)))) {
    fail("Invalid NPR amount");
  }
  const decimal = String(value);
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(decimal) || decimal.length > 20) {
    fail("Invalid NPR amount");
  }
  const [whole, fraction = ""] = decimal.split(".");
  const paisa = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (paisa > BigInt(Number.MAX_SAFE_INTEGER) || paisa < (allowZero ? 0n : 1n)) {
    fail("Invalid NPR amount");
  }
  const result = Number(paisa);
  // Normalized NPR numbers must also round-trip without losing a paisa.
  if (Math.round((result / 100) * 100) !== result) fail("Invalid NPR amount");
  return result;
}
function paisaInteger(value, allowZero = false) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1) ||
      toPaisa(value / 100, allowZero) !== value) fail("Invalid gateway amount");
  return value;
}
function nprText(paisa) {
  return String(Math.floor(paisa / 100)) + "." + String(paisa % 100).padStart(2, "0");
}
function reference(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9-]{1,200}$/.test(value)) {
    fail("Invalid payment reference");
  }
  return value;
}
function attemptReference(orderId) {
  // Persist this reference per attempt. Supplied UUIDs are used verbatim.
  // Legacy alphanumeric/hyphen order IDs remain accepted; never reuse an attempt.
  return orderId === undefined ? crypto.randomUUID() : reference(orderId);
}
function urls(config) {
  const result = {};
  // Only operator-configured URLs are trusted. Never derive callbacks from
  // request Host/Origin/Forwarded headers or a client-supplied redirect URL.
  // CLIENT_URL may be the app's comma-separated CORS list; use its first entry.
  // Payment-specific overrides must each be a single URL and fail if invalid.
  for (const name of ["SERVER_URL", "CLIENT_URL"]) {
    try {
      const legacy = name === "CLIENT_URL" ? process.env[name]?.split(",")[0] : process.env[name];
      const value = (process.env["PAYMENT_" + name] ?? legacy ?? "").trim();
      if (!value || /[\s,\\]/.test(value)) throw new Error();
      const url = new URL(value);
      if (!["https:", "http:"].includes(url.protocol) ||
          (config.env === "production" && url.protocol !== "https:") ||
          url.username || url.password || url.search || url.hash) throw new Error();
      result[name] = url.href.replace(/\/$/, "");
    } catch { fail("Invalid payment redirect configuration"); }
  }
  return result;
}

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, { ...options, redirect: "error", signal: controller.signal });
        const data = await response.json();
        if (!isRecord(data)) throw new Error();
        return { status: response.status, data };
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error());
        }, TIMEOUT_MS);
      }),
    ]);
  } catch {
    // Never propagate provider bodies, URLs, request headers or original errors.
    fail("Payment gateway request failed");
  } finally { clearTimeout(timer); }
}
function postKhalti(config, path, body) {
  return requestJson(config.baseUrl + path, {
    method: "POST",
    headers: { Authorization: "Key " + config.secret, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function requireSuccess(status) {
  if (!Number.isInteger(status) || status < 200 || status >= 300) {
    fail("Payment gateway rejected the request");
  }
}
function requireInitiationSuccess(status, data) {
  // Only recognized provider rejections prove no checkout was created. All
  // other failures are ambiguous; callers must retain the attempt for review.
  const validationFields = ["return_url", "website_url", "amount", "purchase_order_id",
    "purchase_order_name", "customer_info", "amount_breakdown", "product_details"];
  const validationRejected = [400, 422].includes(status) && data.error_key === "validation_error" &&
    validationFields.some(field => Array.isArray(data[field]) && data[field].length > 0 &&
      data[field].every(message => typeof message === "string" && message.trim().length > 0));
  const authRejected = [401, 403].includes(status) &&
    (data.status_code === undefined || data.status_code === status) &&
    ["Invalid token.", "Authentication credentials were not provided."].includes(data.detail);
  if (validationRejected || authRejected) {
    const error = new Error("Payment gateway rejected the request");
    error.code = "GATEWAY_REJECTED";
    error.definitive = true;
    throw error;
  }
  requireSuccess(status);
}
function expectedAmount(expected) {
  if (!isRecord(expected)) fail("Invalid expected payment");
  if (expected.amount !== undefined && expected.totalAmount !== undefined &&
      toPaisa(expected.amount) !== toPaisa(expected.totalAmount)) fail("Conflicting expected amount");
  const value = expected.totalAmount ?? expected.amount;
  return value === undefined ? undefined : toPaisa(value);
}

/**
 * Input amount is NPR; orderId is an optional, persisted unique attempt UUID.
 * Returns { pidx, paymentUrl, expiresAt, expiresIn, orderId }.
 */
export async function initiateKhaltiPayment({ amount, orderId, orderName, customer } = {}) {
  const config = gatewayConfig("khalti");
  const paisa = toPaisa(amount);
  if (paisa < 1000) fail("Khalti requires at least NPR 10");
  const ref = attemptReference(orderId);
  const redirect = urls(config);
  if (orderName !== undefined &&
      (typeof orderName !== "string" || !orderName.trim() || orderName.length > 200)) {
    fail("Invalid order name");
  }
  const payload = {
    return_url: redirect.SERVER_URL + "/api/v1/webhooks/khalti/verify",
    website_url: redirect.CLIENT_URL,
    amount: paisa,
    purchase_order_id: ref,
    purchase_order_name: orderName || "Payment #" + ref,
  };
  if (customer !== undefined) {
    if (!isRecord(customer)) fail("Invalid customer");
    const info = {};
    for (const field of ["name", "email", "phone"]) {
      if (customer[field] !== undefined) {
        if (typeof customer[field] !== "string" || !customer[field].trim() ||
            customer[field].length > 254 ||
            // eslint-disable-next-line no-control-regex -- rejecting control characters is the point: they must never reach the gateway payload.
            /[\u0000-\u001f]/.test(customer[field])) fail("Invalid customer");
        info[field] = customer[field];
      }
    }
    if (Object.keys(info).length) payload.customer_info = info;
  }
  const { status, data } = await postKhalti(config, "/epayment/initiate/", payload);
  requireInitiationSuccess(status, data);
  reference(data.pidx);
  let paymentUrl;
  try {
    paymentUrl = new URL(data.payment_url);
    const hosts = config.env === "production" ? ["pay.khalti.com"] : ["test-pay.khalti.com", "dev.khalti.com"];
    if (paymentUrl.protocol !== "https:" || !hosts.includes(paymentUrl.hostname) ||
        paymentUrl.port || paymentUrl.username || paymentUrl.password) throw new Error();
  } catch { fail("Invalid gateway response"); }
  if (typeof data.expires_at !== "string" || !Number.isFinite(Date.parse(data.expires_at)) ||
      !Number.isSafeInteger(data.expires_in) || data.expires_in <= 0) fail("Invalid gateway response");
  return {
    pidx: data.pidx, paymentUrl: paymentUrl.href,
    expiresAt: data.expires_at, expiresIn: data.expires_in, orderId: ref,
  };
}

/**
 * Always lookup with the merchant credential; never consume redirect status/amount.
 * pidx MUST come from the persisted attempt. Optional expected = { amount } or
 * { totalAmount } (NPR) enforces the stored amount. Khalti lookup does not return
 * purchase_order_id or merchant ID: callers must bind the stored pidx to the order.
 * Existing one-argument callers must compare totalAmount with their stored amount.
 */
export async function verifyKhaltiPayment(pidx, expected = {}) {
  const config = gatewayConfig("khalti");
  reference(pidx);
  const expectedPaisa = expectedAmount(expected);
  const { status, data } = await postKhalti(config, "/epayment/lookup/", { pidx });
  // Khalti documents these terminal lookup states with HTTP 400.
  if (!(status === 400 && ["Expired", "User canceled"].includes(data.status))) requireSuccess(status);
  if (data.pidx !== pidx || !KHALTI_STATUSES.has(data.status) ||
      typeof data.refunded !== "boolean") fail("Invalid gateway response");
  const paisa = paisaInteger(data.total_amount);
  const fee = paisaInteger(data.fee, true);
  if (expectedPaisa !== undefined && paisa !== expectedPaisa) fail("Payment amount mismatch");
  const transactionId = data.transaction_id == null ? "" : reference(data.transaction_id);
  if (data.status === "Completed" && (!transactionId || data.refunded)) fail("Invalid gateway response");
  // Preserve raw's documented fields only; discard arbitrary provider metadata.
  const raw = {
    pidx, status: data.status, transaction_id: transactionId || null,
    total_amount: paisa, fee, refunded: data.refunded,
  };
  return {
    status: data.status, transactionId, pidx, totalAmount: paisa / 100,
    fee: fee / 100, refunded: data.refunded, raw,
  };
}

/** Preserve the connection-check export without treating every HTTP response as success. */
export async function checkKhaltiConnection() {
  try {
    const config = gatewayConfig("khalti");
    const { status, data } = await postKhalti(config, "/epayment/lookup/", { pidx: crypto.randomUUID() });
    // Only the documented authenticated "Not found" response proves connectivity.
    if ((status === 400 || status === 404) &&
        data.error_key === "validation_error" && data.detail === "Not found.") return { connected: true };
    return { connected: false, error: "Khalti connection could not be verified" };
  } catch { return { connected: false, error: "Khalti connection could not be verified" }; }
}

function generateEsewaSignature(message, secret) {
  return crypto.createHmac("sha256", secret).update(message).digest("base64");
}

/** Returns { formData, formUrl, transactionUuid }; amount/taxAmount are NPR. */
export function generateEsewaPaymentData({ amount, taxAmount = 0, orderId } = {}) {
  const config = gatewayConfig("esewa");
  const net = toPaisa(amount);
  const tax = toPaisa(taxAmount, true);
  const total = paisaInteger(net + tax);
  // The caller owns and persists the attempt UUID before requesting checkout.
  // Never invent or append a reference that the server cannot map back to it.
  if (typeof orderId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
    fail("Invalid merchant reference UUID");
  }
  const transactionUuid = orderId;
  const redirect = urls(config);
  const failureUrl = new URL(redirect.SERVER_URL + "/api/v1/webhooks/esewa/failure");
  failureUrl.search = new URLSearchParams({ reference: transactionUuid }).toString();
  const formData = {
    amount: nprText(net), tax_amount: nprText(tax), total_amount: nprText(total),
    transaction_uuid: transactionUuid, product_code: config.productCode,
    product_service_charge: "0", product_delivery_charge: "0",
    success_url: redirect.SERVER_URL + "/api/v1/webhooks/esewa/verify",
    failure_url: failureUrl.href, signed_field_names: FORM_FIELDS,
  };
  formData.signature = generateEsewaSignature(
    FORM_FIELDS.split(",").map((field) => field + "=" + formData[field]).join(","), config.secret,
  );
  return { formData, formUrl: config.formUrl, transactionUuid };
}
function decodeBase64(value, maxLength) {
  if (typeof value !== "string" || !value.length || value.length > maxLength ||
      value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) fail("Invalid callback");
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) fail("Invalid callback");
  return bytes;
}
function matchEsewaExpected(data, expected) {
  const paisa = expectedAmount(expected);
  if (expected.transactionUuid !== undefined && expected.orderId !== undefined &&
      expected.transactionUuid !== expected.orderId) fail("Conflicting expected reference");
  const ref = expected.transactionUuid ?? expected.orderId;
  if ((ref !== undefined && data.transactionUuid !== reference(ref)) ||
      (expected.productCode !== undefined && data.productCode !== expected.productCode) ||
      (paisa !== undefined && toPaisa(data.totalAmount) !== paisa) ||
      (expected.transactionCode !== undefined && data.transactionCode !== expected.transactionCode)) {
    fail("Payment details mismatch");
  }
}

/**
 * Synchronous signature/schema check for compatibility; verified means signature
 * integrity ONLY, never settlement. requiresLookup is always true. Before crediting,
 * call checkEsewaTransactionStatus with the persisted attempt UUID and stored NPR
 * amount; require COMPLETE and refId === data.transactionCode.
 * Optional expected = { transactionUuid (or orderId), totalAmount (or amount),
 * productCode, transactionCode } binds the callback to the stored attempt.
 */
export function verifyEsewaCallback(encodedData, expected = {}) {
  try {
    const config = gatewayConfig("esewa");
    const bytes = decodeBase64(encodedData, 16384);
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const data = JSON.parse(decoded);
    const keys = CALLBACK_FIELDS.split(",").concat("signature");
    // JSON.parse silently keeps the last duplicate key. Reject ambiguous wire
    // schemas, including escaped duplicate names, before verifying their HMAC.
    const wireKeys = [...decoded.matchAll(/"(?:[^"\\]|\\.)*"/g)]
      .filter(match => decoded.slice(match.index + match[0].length).trimStart().startsWith(":"))
      .map(match => JSON.parse(match[0]));
    if (!isRecord(data) || Object.keys(data).length !== keys.length ||
        wireKeys.length !== keys.length || new Set(wireKeys).size !== keys.length ||
        !keys.every((field) => Object.hasOwn(data, field)) ||
        data.signed_field_names !== CALLBACK_FIELDS || data.status !== "COMPLETE" ||
        data.product_code !== config.productCode) fail("Invalid callback");
    reference(data.transaction_uuid);
    reference(data.transaction_code);
    const paisa = toPaisa(data.total_amount);
    const signature = decodeBase64(data.signature, 44);
    const signatureInput = CALLBACK_FIELDS.split(",").map((field) => field + "=" + data[field]).join(",");
    const actual = crypto.createHmac("sha256", config.secret).update(signatureInput).digest();
    if (signature.length !== actual.length || !crypto.timingSafeEqual(signature, actual)) fail("Invalid callback");
    const normalized = {
      transactionCode: data.transaction_code, status: data.status,
      totalAmount: paisa / 100, transactionUuid: data.transaction_uuid,
      productCode: data.product_code,
    };
    matchEsewaExpected(normalized, expected);
    return { verified: true, requiresLookup: true, data: normalized };
  } catch {
    return { verified: false, requiresLookup: true, error: "eSewa callback verification failed" };
  }
}

/**
 * Server lookup matching persisted transactionUuid, merchant and NPR totalAmount.
 * Optional expected = { refId } also binds the lookup to the signed callback code.
 * Only COMPLETE is a settled payment; all other statuses must withhold fulfillment.
 */
export async function checkEsewaTransactionStatus(transactionUuid, totalAmount, expected = {}) {
  const config = gatewayConfig("esewa");
  reference(transactionUuid);
  const paisa = toPaisa(totalAmount);
  if (!isRecord(expected)) fail("Invalid expected payment");
  if (expected.refId !== undefined) reference(expected.refId);
  const url = new URL(config.statusUrl);
  url.search = new URLSearchParams({
    product_code: config.productCode, total_amount: nprText(paisa), transaction_uuid: transactionUuid,
  }).toString();
  const { status, data } = await requestJson(url.href);
  requireSuccess(status);
  if (!ESEWA_STATUSES.has(data.status) || data.transaction_uuid !== transactionUuid ||
      data.product_code !== config.productCode || toPaisa(data.total_amount) !== paisa) {
    fail("Payment details mismatch");
  }
  const refId = data.ref_id == null ? null : reference(data.ref_id);
  if ((data.status === "COMPLETE" && !refId) ||
      (expected.refId !== undefined && refId !== expected.refId)) fail("Payment reference mismatch");
  return {
    status: data.status, refId, productCode: config.productCode,
    transactionUuid, totalAmount: paisa / 100,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// STRIPE  —  Card Payments via Payment Intents
// ═══════════════════════════════════════════════════════════════════════

// Only two-decimal currencies are accepted, so "minor unit" is always 1/100.
// A zero-decimal currency (JPY) or a three-decimal one (KWD) would make
// amount/100 silently wrong by 100x or 10x, so they are refused outright
// rather than converted with a table nobody maintains.
const STRIPE_CURRENCIES = new Set(["npr", "usd", "eur", "gbp", "inr"]);

function stripeCurrency(value) {
  if (typeof value !== "string" || !STRIPE_CURRENCIES.has(value.toLowerCase())) {
    fail("Unsupported payment currency");
  }
  return value.toLowerCase();
}

/**
 * Live/test mode is derived from the key itself, never from NODE_ENV: a
 * production deploy holding a test key must report test mode truthfully
 * instead of claiming live because NODE_ENV happens to say "production".
 */
export function stripeMode(secretKey = CONFIG.stripe.secretKey()) {
  if (/^(sk|rk)_live_/.test(secretKey)) return "live";
  if (/^(sk|rk)_test_/.test(secretKey)) return "test";
  return "unknown";
}

function assertStripeEnvironment() {
  if (process.env.NODE_ENV === "production" && stripeMode() !== "live") {
    fail("STRIPE is not configured for production (test or unrecognized secret key)");
  }
}

function stripeReference(value) {
  // Stripe object ids are ASCII-safe; reject anything else before it reaches
  // an API path or a database lookup key.
  if (typeof value !== "string" || !/^pi_[A-Za-z0-9_]{8,250}$/.test(value)) {
    fail("Invalid payment reference");
  }
  return value;
}

/**
 * Create a Stripe Payment Intent for card payments.
 *
 * Amount is a decimal currency string/number (e.g. "1250.00"), converted to
 * minor units with the same exact-decimal parser the wallet gateways use, so
 * a float like 0.1 + 0.2 can never reach Stripe as 30.000000000000004.
 *
 * @param {Object} opts
 * @param {number|string} opts.amount    – Amount in major units
 * @param {string} opts.currency         – Default "npr"
 * @param {Object} opts.metadata         – { bookingId, ... }
 * @param {string} [opts.idempotencyKey] – Stripe-side duplicate-charge guard
 * @returns {{ clientSecret, paymentIntentId, amount, amountMinor, currency, mode }}
 */
export async function createStripePaymentIntent({ amount, currency = "npr", metadata = {}, idempotencyKey, cardOnly = false } = {}) {
  const stripe = getStripe();
  assertStripeEnvironment();
  const code = stripeCurrency(currency);
  const minor = toPaisa(amount);
  if (!isRecord(metadata)) fail("Invalid payment metadata");
  if (idempotencyKey !== undefined && !/^[A-Za-z0-9_.:-]{16,255}$/.test(String(idempotencyKey))) {
    fail("Invalid idempotency key");
  }

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: minor,
      currency: code,
      metadata,
      ...(cardOnly ? { payment_method_types: ["card"] } : { automatic_payment_methods: { enabled: true } }),
    },
    // Retrying a create with the same key returns the original intent rather
    // than opening a second chargeable one for the same booking.
    idempotencyKey === undefined ? undefined : { idempotencyKey: String(idempotencyKey) },
  );

  if (typeof paymentIntent?.id !== "string" || typeof paymentIntent?.client_secret !== "string") {
    fail("Invalid gateway response");
  }
  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: minor / 100,
    amountMinor: minor,
    currency: code,
    mode: stripeMode(),
    simulated: false,
  };
}

/**
 * Verify a Stripe Payment Intent server-side.
 *
 * `expected` binds the intent to the stored order before any caller can treat
 * it as settled. Without the currency bind, an intent denominated in a weaker
 * currency (amount 5000 "vnd" against an NPR 5000 booking) would pass a bare
 * numeric amount comparison while settling a fraction of the real price.
 *
 * @param {string} paymentIntentId
 * @param {{ amount?: number|string, currency?: string, minorAmount?: number }} [expected]
 * @returns {{ status, amount, amountMinor, currency, mode, settled, raw }}
 */
export async function verifyStripePayment(paymentIntentId, expected = {}) {
  const stripe = getStripe();
  assertStripeEnvironment();
  stripeReference(paymentIntentId);
  if (!isRecord(expected)) fail("Invalid expected payment");

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (!isRecord(pi) || pi.id !== paymentIntentId || typeof pi.status !== "string") {
    fail("Invalid gateway response");
  }
  const code = stripeCurrency(pi.currency);
  const minor = paisaInteger(pi.amount, true);
  // amount_received is what Stripe actually captured; a succeeded intent that
  // captured less than it requested must not be credited at full price.
  const receivedMinor = pi.amount_received === undefined
    ? minor : paisaInteger(pi.amount_received, true);

  if (expected.currency !== undefined && code !== stripeCurrency(expected.currency)) {
    fail("Payment currency mismatch");
  }
  const expectedMinor = expected.minorAmount !== undefined
    ? paisaInteger(expected.minorAmount)
    : expected.amount === undefined ? undefined : toPaisa(expected.amount);
  if (expectedMinor !== undefined && minor !== expectedMinor) fail("Payment amount mismatch");

  const settled = pi.status === "succeeded" &&
    (expectedMinor === undefined ? receivedMinor >= minor : receivedMinor >= expectedMinor);
  return {
    status: pi.status,
    amount: minor / 100,
    amountMinor: minor,
    amountReceivedMinor: receivedMinor,
    currency: code,
    mode: stripeMode(),
    settled,
    raw: { id: pi.id, status: pi.status, amount: minor, amount_received: receivedMinor, currency: code },
  };
}

// Public availability reflects the same local prerequisites as initiation.
// enabled is configuration readiness, not a live credential/connectivity probe.
export function getPaymentGatewayConfig() {
  function publicConfig(gateway) {
    try {
      const config = gatewayConfig(gateway);
      urls(config);
      return {
        enabled: true, environment: config.env, testMode: config.env === "sandbox",
        ...(gateway === "esewa" ? { formUrl: config.formUrl } : {}),
      };
    } catch {
      return {
        enabled: false,
        environment: ["sandbox", "production"].includes(process.env[gateway.toUpperCase() + "_ENV"])
          ? process.env[gateway.toUpperCase() + "_ENV"] : null,
        testMode: process.env[gateway.toUpperCase() + "_ENV"] === "sandbox",
        ...(gateway === "esewa" ? { formUrl: null } : {}),
      };
    }
  }
  return {
    khalti: publicConfig("khalti"),
    esewa: publicConfig("esewa"),
    stripe: (() => {
      const secret = CONFIG.stripe.secretKey();
      const mode = stripeMode(secret);
      const publishable = process.env.STRIPE_PUBLISHABLE_KEY || "";
      // A test secret paired with a live publishable key (or the reverse) makes
      // the browser collect cards against one account while the server verifies
      // against another: every payment then looks unverifiable. Refuse to
      // advertise the gateway at all in that state.
      const publishableMode = /^pk_live_/.test(publishable) ? "live"
        : /^pk_test_/.test(publishable) ? "test" : "unknown";
      const mismatched = publishableMode !== "unknown" && mode !== "unknown" && publishableMode !== mode;
      return {
        enabled: validCredential(secret, 20) && mode !== "unknown" && !mismatched &&
          (process.env.NODE_ENV !== "production" || mode === "live"),
        environment: mode === "live" ? "production" : mode === "test" ? "sandbox" : null,
        mode,
        testMode: mode === "test",
        keyMismatch: mismatched,
        publishableKey: mismatched ? "" : publishable,
      };
    })(),
  };
}
