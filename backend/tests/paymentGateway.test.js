import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  generateEsewaPaymentData, initiateKhaltiPayment, verifyKhaltiPayment,
  verifyEsewaCallback, checkEsewaTransactionStatus, getPaymentGatewayConfig,
  checkKhaltiConnection, createStripePaymentIntent, verifyStripePayment,
  stripeMode, __setStripeClientForTests,
} from '../services/paymentGatewayService.js';

// Offline fixtures only: never load .env or use merchant credentials.
const uuid = '478792a1-218c-4228-ae70-2bca81fe316a';
const secret = '8gBm/:&EnhH.1/q'; // eSewa's published sandbox signing key.
const fields = 'transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names';
const envNames = ['KHALTI_ENV', 'KHALTI_SECRET_KEY', 'ESEWA_ENV', 'ESEWA_SECRET_KEY',
  'ESEWA_PRODUCT_CODE', 'SERVER_URL', 'CLIENT_URL', 'PAYMENT_SERVER_URL', 'PAYMENT_CLIENT_URL',
  'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'];
let saved;
const originalFetch = globalThis.fetch;
beforeEach(() => {
  saved = Object.fromEntries(envNames.map(key => [key, process.env[key]]));
  for (const key of envNames) delete process.env[key];
  Object.assign(process.env, {
    KHALTI_ENV: 'sandbox', KHALTI_SECRET_KEY: 'offline-fixture-4a7b8c9d1e2f',
    ESEWA_ENV: 'sandbox', ESEWA_SECRET_KEY: secret, ESEWA_PRODUCT_CODE: 'EPAYTEST',
    SERVER_URL: 'https://merchant.invalid', CLIENT_URL: 'https://shop.invalid',
  });
  globalThis.fetch = async () => { throw new Error('Unexpected network access in offline test'); };
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  __setStripeClientForTests(null); // never let an injected fake leak into another test
  for (const key of envNames) {
    if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
  }
});
// A plausible-looking offline test key: long enough to pass the credential
// check, never a real Stripe secret, and never used against Stripe's API
// because every Stripe test below injects a fake client.
const stripeKey = 'sk_test_4a7b8c9d1e2f3a4b5c6d';
function stripeIntent(over = {}) {
  return {
    id: 'pi_offlinefixture01', client_secret: 'pi_offlinefixture01_secret_abc',
    status: 'succeeded', amount: 125055, amount_received: 125055, currency: 'npr', ...over,
  };
}
// Scripts paymentIntents.create/retrieve and records what the adapter sent.
function stripeStub({ create, retrieve } = {}) {
  const calls = [];
  const answer = (value, ...args) => typeof value === 'function' ? value(...args) : value;
  __setStripeClientForTests({
    paymentIntents: {
      create: async (params, options) => {
        calls.push({ method: 'create', params, options });
        return answer(create, params, options);
      },
      retrieve: async id => {
        calls.push({ method: 'retrieve', id });
        return answer(retrieve, id);
      },
    },
  });
  return calls;
}
function respond(data, status = 200, inspect = () => {}) {
  globalThis.fetch = async (url, options) => {
    inspect(url, options);
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    return { status, json: async () => data };
  };
}
function callback(overrides = {}) {
  const data = { transaction_code: '000AWEO', status: 'COMPLETE', total_amount: '100.25',
    transaction_uuid: uuid, product_code: 'EPAYTEST', signed_field_names: fields, ...overrides };
  data.signature = crypto.createHmac('sha256', secret)
    .update(fields.split(',').map(key => `${key}=${data[key]}`).join(',')).digest('base64');
  return data;
}
const encode = data => Buffer.from(JSON.stringify(data)).toString('base64');
const khalti = overrides => ({ pidx: 'payment123', total_amount: 10025, status: 'Completed',
  transaction_id: 'transaction123', fee: 25, refunded: false, ...overrides });
const esewa = overrides => ({ product_code: process.env.ESEWA_PRODUCT_CODE, transaction_uuid: uuid,
  total_amount: 100.25, status: 'COMPLETE', ref_id: '000AWEO', ...overrides });

test('explicit modes and non-placeholder configuration gate availability', async () => {
  assert.equal(getPaymentGatewayConfig().esewa.enabled, true);
  assert.equal(getPaymentGatewayConfig().khalti.testMode, true);
  for (const mode of ['', 'test', 'live', 'PRODUCTION']) {
    process.env.KHALTI_ENV = mode;
    assert.equal(getPaymentGatewayConfig().khalti.enabled, false);
    await assert.rejects(initiateKhaltiPayment({ amount: 100, orderId: uuid }), /not configured/);
  }
  process.env.KHALTI_ENV = 'sandbox';
  for (const value of ['', 'your_khalti_secret_key_here', 'replace_with_actual_key',
    'live_secret_key', 'xxxxxxxxxxxxxxxxxxxxxxxx', '<merchant-secret-key>']) {
    process.env.KHALTI_SECRET_KEY = value;
    assert.equal(getPaymentGatewayConfig().khalti.enabled, false);
  }
  delete process.env.ESEWA_ENV;
  assert.equal(getPaymentGatewayConfig().esewa.enabled, false);
  assert.throws(() => generateEsewaPaymentData({ amount: 100, orderId: uuid }), /not configured/);
});

test('production rejects public sandbox credentials and insecure redirect configuration', () => {
  process.env.ESEWA_ENV = 'production';
  assert.equal(getPaymentGatewayConfig().esewa.enabled, false);
  process.env.ESEWA_PRODUCT_CODE = 'MERCHANT123';
  assert.equal(getPaymentGatewayConfig().esewa.enabled, false);
  process.env.ESEWA_SECRET_KEY = 'offline-merchant-signing-4a7b8c';
  assert.equal(getPaymentGatewayConfig().esewa.enabled, true);
  process.env.SERVER_URL = 'http://merchant.invalid';
  assert.equal(getPaymentGatewayConfig().esewa.enabled, false);
  process.env.KHALTI_ENV = 'production';
  process.env.KHALTI_SECRET_KEY = '05bf95cc57244045b8df5fad06748dab';
  assert.equal(getPaymentGatewayConfig().khalti.enabled, false);
});

test('eSewa signs exact persisted UUID and routes failure through the backend', () => {
  const result = generateEsewaPaymentData({ amount: '100.20', taxAmount: '0.05', orderId: uuid });
  assert.deepEqual(Object.keys(result).sort(), ['formData', 'formUrl', 'transactionUuid']);
  assert.equal(result.transactionUuid, uuid);
  assert.equal(result.formData.transaction_uuid, uuid);
  assert.equal(result.formUrl, 'https://rc-epay.esewa.com.np/api/epay/main/v2/form');
  assert.equal(result.formData.failure_url, `https://merchant.invalid/api/v1/webhooks/esewa/failure?reference=${uuid}`);
  assert.equal(result.formData.success_url, 'https://merchant.invalid/api/v1/webhooks/esewa/verify');
  assert.equal(result.formData.total_amount, '100.25');
  assert.equal(result.formData.signature, crypto.createHmac('sha256', secret)
    .update(`total_amount=100.25,transaction_uuid=${uuid},product_code=EPAYTEST`).digest('base64'));
  for (const orderId of [undefined, '', 'order-123', uuid + '-123', {}, uuid.replace('4787', 'zzzz')]) {
    assert.throws(() => generateEsewaPaymentData({ amount: 100, orderId }), /reference/);
  }
});

test('invalid and sub-paisa amounts fail before checkout', async () => {
  for (const amount of [0, -1, NaN, Infinity, true, {}, '', '1e2', ' 100', '1.001', '01', 0.1 + 0.2, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => generateEsewaPaymentData({ amount, orderId: uuid }), /amount/);
    await assert.rejects(initiateKhaltiPayment({ amount, orderId: uuid }), /amount/);
  }
  await assert.rejects(initiateKhaltiPayment({ amount: 9.99, orderId: uuid }), /at least/);
});

for (const mode of ['sandbox', 'production']) {
  test(`${mode} uses official Khalti and eSewa endpoints`, async () => {
    process.env.KHALTI_ENV = mode;
    // A live_secret_key label must not select the environment.
    process.env.KHALTI_SECRET_KEY = 'live_secret_key_offline4a7b8c9d';
    respond({ pidx: 'payment123', payment_url: `https://${mode === 'sandbox' ? 'test-pay' : 'pay'}.khalti.com/?pidx=payment123`,
      expires_at: '2030-01-01T00:00:00Z', expires_in: 1800 }, 200, (url, options) => {
      assert.equal(url, `https://${mode === 'sandbox' ? 'dev.khalti.com' : 'khalti.com'}/api/v2/epayment/initiate/`);
      const body = JSON.parse(options.body);
      assert.equal(body.amount, 10025);
      assert.equal(body.purchase_order_id, uuid);
      assert.equal(body.return_url, 'https://merchant.invalid/api/v1/webhooks/khalti/verify');
      assert.equal(options.headers.Authorization, 'Key ' + process.env.KHALTI_SECRET_KEY);
    });
    const result = await initiateKhaltiPayment({ amount: 100.25, orderId: uuid });
    assert.equal(result.pidx, 'payment123');
    assert.equal(result.expiresIn, 1800);
    assert.equal(result.expiresAt, '2030-01-01T00:00:00Z');
    process.env.ESEWA_ENV = mode;
    if (mode === 'production') Object.assign(process.env, {
      ESEWA_PRODUCT_CODE: 'MERCHANT123', ESEWA_SECRET_KEY: 'offline-merchant-signing-4a7b8c',
    });
    assert.equal(generateEsewaPaymentData({ amount: 100.25, orderId: uuid }).formUrl,
      `https://${mode === 'sandbox' ? 'rc-epay' : 'epay'}.esewa.com.np/api/epay/main/v2/form`);
    respond(esewa(), 200, url => {
      const parsed = new URL(url);
      assert.equal(parsed.origin, `https://${mode === 'sandbox' ? 'rc.esewa.com.np' : 'esewa.com.np'}`);
      assert.equal(parsed.pathname, '/api/epay/transaction/status/');
      assert.equal(parsed.searchParams.get('transaction_uuid'), uuid);
      assert.equal(parsed.searchParams.get('total_amount'), '100.25');
      assert.equal(parsed.searchParams.get('product_code'), process.env.ESEWA_PRODUCT_CODE);
    });
    assert.deepEqual(await checkEsewaTransactionStatus(uuid, 100.25), {
      status: 'COMPLETE', refId: '000AWEO', transactionUuid: uuid,
      productCode: process.env.ESEWA_PRODUCT_CODE, totalAmount: 100.25,
    });
  });
}

test('Khalti lookup normalizes NPR and preserves non-success states', async () => {
  for (const status of ['Completed', 'Pending', 'Initiated', 'Refunded', 'Partially Refunded', 'Expired', 'User canceled']) {
    respond(khalti({ status, refunded: status.includes('Refunded'),
      transaction_id: ['Pending', 'Initiated', 'Expired', 'User canceled'].includes(status) ? null : 'transaction123' }),
    ['Expired', 'User canceled'].includes(status) ? 400 : 200, (url, options) => {
      assert.equal(url, 'https://dev.khalti.com/api/v2/epayment/lookup/');
      assert.deepEqual(JSON.parse(options.body), { pidx: 'payment123' });
    });
    const result = await verifyKhaltiPayment('payment123', { amount: 100.25 });
    assert.equal(result.status, status);
    assert.equal(result.pidx, 'payment123');
    assert.equal(result.totalAmount, 100.25);
    assert.equal(result.fee, 0.25);
    assert.equal(result.refunded, status.includes('Refunded'));
  }
});

test('Khalti rejects mismatches, malformed success and unsafe checkout URLs', async () => {
  for (const patch of [{ pidx: 'other' }, { total_amount: 10024 }, { total_amount: '10025' },
    { status: 'Success' }, { refunded: 'false' }, { refunded: true }, { transaction_id: null }, { fee: -1 }]) {
    respond(khalti(patch));
    await assert.rejects(verifyKhaltiPayment('payment123', { amount: 100.25 }));
  }
  for (const payment_url of ['https://evil.invalid/', 'https://test-pay.khalti.com.evil.invalid/',
    'http://test-pay.khalti.com/', 'https://user:password@test-pay.khalti.com/', 'https://pay.khalti.com/']) {
    respond({ pidx: 'payment123', payment_url, expires_at: '2030-01-01', expires_in: 1800 });
    await assert.rejects(initiateKhaltiPayment({ amount: 100.25, orderId: uuid }), /Invalid gateway response/);
  }
});

test('signed eSewa callbacks normalize and bind all expected payment details', () => {
  assert.deepEqual(verifyEsewaCallback(encode(callback()), { transactionUuid: uuid, amount: 100.25 }), {
    verified: true, requiresLookup: true, data: { transactionCode: '000AWEO', status: 'COMPLETE',
      totalAmount: 100.25, transactionUuid: uuid, productCode: 'EPAYTEST' },
  });
  for (const expected of [{ transactionUuid: 'other' }, { productCode: 'other' }, { amount: 100 },
    { transactionCode: 'other' }, { amount: 100, totalAmount: 100.25 },
    { transactionUuid: uuid, orderId: 'other' }, null]) {
    assert.equal(verifyEsewaCallback(encode(callback()), expected).verified, false);
  }
});

test('eSewa rejects tampering, incomplete/reordered signed lists and malformed schemas', () => {
  for (const patch of [{ product_code: 'OTHER' }, { status: 'PENDING' }, { total_amount: true },
    { total_amount: '100.251' }, { transaction_uuid: {} }, { transaction_code: '' }, { extra: 'unsigned' },
    { signed_field_names: 'total_amount' }, { signed_field_names: fields.split(',').reverse().join(',') },
    { signed_field_names: fields + ',status' }]) {
    assert.equal(verifyEsewaCallback(encode(callback(patch))).verified, false);
  }
  for (const patch of [{ total_amount: '999.00' }, { signature: 'AAAA' },
    { signature: Buffer.alloc(32).toString('base64') }, { signature: {} }]) {
    assert.equal(verifyEsewaCallback(encode({ ...callback(), ...patch })).verified, false);
  }
  for (const encoded of ['', 'not base64', 'e30=', encode([]), 'A'.repeat(16388)]) {
    assert.equal(verifyEsewaCallback(encoded).verified, false);
  }
  const json = JSON.stringify(callback());
  for (const duplicate of ['"status":"PENDING",', '"st\\u0061tus":"PENDING",']) {
    const encoded = Buffer.from('{' + duplicate + json.slice(1)).toString('base64');
    assert.equal(verifyEsewaCallback(encoded).verified, false);
  }
});

test('eSewa lookup binds UUID, merchant, amount and optional callback reference', async () => {
  for (const patch of [{ transaction_uuid: 'other' }, { product_code: 'other' }, { total_amount: 99 },
    { status: 'SUCCESS' }, { ref_id: null }, { ref_id: 'other' }]) {
    respond(esewa(patch));
    await assert.rejects(checkEsewaTransactionStatus(uuid, 100.25, { refId: '000AWEO' }));
  }
  for (const status of ['PENDING', 'FULL_REFUND', 'PARTIAL_REFUND', 'CANCELED', 'NOT_FOUND', 'AMBIGUOUS']) {
    respond(esewa({ status, ref_id: null }));
    assert.equal((await checkEsewaTransactionStatus(uuid, 100.25)).status, status);
  }
});

test('HTTP, malformed JSON and transport errors fail closed without provider details', async () => {
  for (const status of [301, 400, 401, 403, 429, 500]) {
    respond({ ...khalti(), secret: 'sensitive-provider-body' }, status);
    await assert.rejects(verifyKhaltiPayment('payment123'), { message: 'Payment gateway rejected the request' });
    respond(esewa(), status);
    await assert.rejects(checkEsewaTransactionStatus(uuid, 100.25), { message: 'Payment gateway rejected the request' });
  }
  for (const fetch of [async () => { throw new Error('sensitive-request-details'); },
    async () => ({ status: 200, json: async () => { throw new Error('sensitive-response'); } }),
    async () => ({ status: 200, json: async () => [] })]) {
    globalThis.fetch = fetch;
    await assert.rejects(verifyKhaltiPayment('payment123'), { message: 'Payment gateway request failed' });
  }
});

test('deadline aborts stalled fetch and stalled response body without real waiting', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const stalledBody of [false, true]) {
    let signal;
    globalThis.fetch = async (_url, options) => {
      signal = options.signal;
      return stalledBody ? { status: 200, json: () => new Promise(() => {}) } : new Promise(() => {});
    };
    const pending = verifyKhaltiPayment('payment123');
    const rejected = assert.rejects(pending, { message: 'Payment gateway request failed' });
    await Promise.resolve();
    t.mock.timers.tick(8000);
    await rejected;
    assert.equal(signal.aborted, true);
  }
});

test('connection checks require documented authenticated not-found response', async () => {
  respond({ detail: 'Not found.', error_key: 'validation_error' }, 404);
  assert.deepEqual(await checkKhaltiConnection(), { connected: true });
  respond({ detail: 'Invalid token.' }, 401);
  assert.equal((await checkKhaltiConnection()).connected, false);
});

test('Stripe exports remain callable but missing credentials never simulate success', async () => {
  assert.equal(getPaymentGatewayConfig().stripe.enabled, false);
  await assert.rejects(createStripePaymentIntent({ amount: 100 }), /STRIPE is not configured/);
  await assert.rejects(verifyStripePayment('sim_pi_123'), /STRIPE is not configured/);
});

test('payment URL overrides take precedence and legacy client lists use their first entry', async () => {
  process.env.CLIENT_URL = ' https://first.invalid/ , https://second.invalid';
  respond({ pidx: 'payment123', payment_url: 'https://test-pay.khalti.com/?pidx=payment123',
    expires_at: '2030-01-01', expires_in: 1800 }, 200, (_url, options) => {
    assert.equal(JSON.parse(options.body).website_url, 'https://first.invalid');
  });
  await initiateKhaltiPayment({ amount: 100, orderId: uuid });
  process.env.PAYMENT_SERVER_URL = 'https://callbacks.invalid/';
  process.env.PAYMENT_CLIENT_URL = 'https://checkout.invalid/';
  respond({ pidx: 'payment123', payment_url: 'https://test-pay.khalti.com/?pidx=payment123',
    expires_at: '2030-01-01', expires_in: 1800 }, 200, (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.website_url, 'https://checkout.invalid');
    assert.equal(body.return_url, 'https://callbacks.invalid/api/v1/webhooks/khalti/verify');
  });
  await initiateKhaltiPayment({ amount: 100, orderId: uuid });
  const { formData } = generateEsewaPaymentData({ amount: 100, orderId: uuid });
  assert.equal(formData.success_url, 'https://callbacks.invalid/api/v1/webhooks/esewa/verify');
  assert.equal(formData.failure_url, `https://callbacks.invalid/api/v1/webhooks/esewa/failure?reference=${uuid}`);
});

test('missing URLs and invalid explicit overrides disable checkout without fallback', () => {
  for (const key of ['PAYMENT_SERVER_URL', 'PAYMENT_CLIENT_URL']) {
    for (const value of ['', 'https://one.invalid,https://two.invalid', 'https://user:pass@site.invalid',
      'https://site.invalid/?redirect=other', 'https://site.invalid/#hash', 'https://site.invalid/with space']) {
      process.env[key] = value;
      assert.equal(getPaymentGatewayConfig().khalti.enabled, false);
      assert.equal(getPaymentGatewayConfig().esewa.enabled, false);
      assert.throws(() => generateEsewaPaymentData({ amount: 100, orderId: uuid }), /redirect configuration/);
    }
    delete process.env[key];
  }
  delete process.env.SERVER_URL;
  assert.equal(getPaymentGatewayConfig().esewa.enabled, false);
  assert.equal(getPaymentGatewayConfig().khalti.enabled, false);
});

test('production disables each public eSewa credential independently and retains explicit testMode', () => {
  process.env.ESEWA_ENV = 'production';
  process.env.ESEWA_SECRET_KEY = 'offline-merchant-signing-4a7b8c';
  assert.equal(getPaymentGatewayConfig().esewa.enabled, false); // EPAYTEST alone
  assert.equal(getPaymentGatewayConfig().esewa.testMode, false);
  process.env.ESEWA_PRODUCT_CODE = 'MERCHANT123';
  process.env.ESEWA_SECRET_KEY = secret;
  assert.equal(getPaymentGatewayConfig().esewa.enabled, false); // public secret alone
  for (const key of ['05bf95cc57244045b8df5fad06748dab', 'live_secret_key_68791341fdd94846a146f0457ff7b455']) {
    process.env.KHALTI_ENV = 'production';
    process.env.KHALTI_SECRET_KEY = key;
    assert.equal(getPaymentGatewayConfig().khalti.enabled, false);
    assert.equal(getPaymentGatewayConfig().khalti.testMode, false);
  }
});

test('eSewa adapter requires merchant product even without expected details', async () => {
  for (const product_code of ['OTHER', undefined, null, 123]) {
    respond(esewa({ product_code }));
    await assert.rejects(checkEsewaTransactionStatus(uuid, 100.25), /Payment details mismatch/);
  }
});

test('Stripe placeholder credentials cannot create or verify fake payments', async () => {
  for (const key of ['your_stripe_secret_key_here', 'sk_test_placeholder_secret', 'xxxxxxxxxxxxxxxxxxxxxxxx']) {
    process.env.STRIPE_SECRET_KEY = key;
    assert.equal(getPaymentGatewayConfig().stripe.enabled, false);
    await assert.rejects(createStripePaymentIntent({ amount: 100 }), /STRIPE is not configured/);
    await assert.rejects(verifyStripePayment('sim_pi_123'), /STRIPE is not configured/);
  }
});

test('only recognized initiation rejections are definitive and redacted', async () => {
  const cases = [
    [400, { error_key: 'validation_error', amount: ['sensitive validation detail'] }],
    [422, { error_key: 'validation_error', return_url: ['sensitive validation detail'] }],
    [401, { detail: 'Invalid token.', status_code: 401 }],
    [403, { detail: 'Authentication credentials were not provided.' }],
  ];
  for (const [status, body] of cases) {
    respond(body, status);
    await assert.rejects(initiateKhaltiPayment({ amount: 100, orderId: uuid }), error => {
      assert.equal(error.message, 'Payment gateway rejected the request');
      assert.equal(error.code, 'GATEWAY_REJECTED');
      assert.equal(error.definitive, true);
      assert.equal(error.cause, undefined);
      assert.equal(JSON.stringify(error).includes('sensitive'), false);
      return true;
    });
    // Identical HTTP errors during lookup must not release the payment attempt.
    await assert.rejects(verifyKhaltiPayment('payment123'), error => {
      assert.equal(error.definitive, undefined);
      assert.equal(error.code, undefined);
      return true;
    });
  }
});

test('unknown initiation outcomes never claim definitive rejection or retry', async t => {
  const ambiguous = error => {
    assert.equal(error.definitive, undefined);
    assert.equal(error.code, undefined);
    assert.equal(error.cause, undefined);
    assert.doesNotMatch(error.message, /sensitive/);
    return true;
  };
  for (const [status, body] of [
    [500, { error_key: 'validation_error', amount: ['sensitive'] }],
    [429, { detail: 'Invalid token.' }], [400, { detail: 'sensitive unknown failure' }],
    [401, { detail: 'sensitive unknown failure' }], [403, { detail: 'sensitive unknown failure' }],
    [422, { error_key: 'validation_error' }], [200, {}],
  ]) {
    let calls = 0;
    respond(body, status, () => { calls++; });
    await assert.rejects(initiateKhaltiPayment({ amount: 100, orderId: uuid }), ambiguous);
    assert.equal(calls, 1);
  }
  for (const fetch of [async () => { throw new Error('sensitive network error'); },
    async () => ({ status: 400, json: async () => { throw new Error('sensitive parse error'); } })]) {
    globalThis.fetch = fetch;
    await assert.rejects(initiateKhaltiPayment({ amount: 100, orderId: uuid }), ambiguous);
  }
  t.mock.timers.enable({ apis: ['setTimeout'] });
  globalThis.fetch = () => new Promise(() => {});
  const pending = assert.rejects(initiateKhaltiPayment({ amount: 100, orderId: uuid }), ambiguous);
  t.mock.timers.tick(8000);
  await pending;
});

test('Stripe initiation converts exact decimals and refuses unsafe money input', async () => {
  process.env.STRIPE_SECRET_KEY = stripeKey;
  const calls = stripeStub({ create: stripeIntent() });
  const result = await createStripePaymentIntent({ amount: '1250.55', metadata: { bookingId: 'b1' } });
  assert.deepEqual(result, {
    clientSecret: 'pi_offlinefixture01_secret_abc', paymentIntentId: 'pi_offlinefixture01',
    amount: 1250.55, amountMinor: 125055, currency: 'npr', mode: 'test', simulated: false,
  });
  // Minor units reach Stripe as an integer, and NPR is the default, never USD.
  assert.equal(calls[0].params.amount, 125055);
  assert.equal(calls[0].params.currency, 'npr');
  assert.equal(calls[0].options, undefined);

  for (const amount of [0.1 + 0.2, 1250.555, -100, 0, '1e3', 'abc', null, undefined, NaN, Infinity, {}]) {
    await assert.rejects(createStripePaymentIntent({ amount }), /Invalid NPR amount/);
  }
  for (const currency of ['jpy', 'kwd', 'vnd', 'NPRX', '', 123, null]) {
    await assert.rejects(createStripePaymentIntent({ amount: 100, currency }), /Unsupported payment currency/);
  }
  for (const metadata of ['x', 42, [], null]) {
    await assert.rejects(createStripePaymentIntent({ amount: 100, metadata }), /Invalid payment metadata/);
  }
});

test('Stripe idempotency keys are validated and forwarded to prevent double charges', async () => {
  process.env.STRIPE_SECRET_KEY = stripeKey;
  const calls = stripeStub({ create: stripeIntent() });
  await createStripePaymentIntent({ amount: 100, idempotencyKey: 'booking-abc-123-attempt-1' });
  assert.deepEqual(calls[0].options, { idempotencyKey: 'booking-abc-123-attempt-1' });
  for (const key of ['short', 'has spaces in it here', 'sym*bols!!not@allowed', 'x'.repeat(256)]) {
    await assert.rejects(createStripePaymentIntent({ amount: 100, idempotencyKey: key }), /Invalid idempotency key/);
  }
});

test('Stripe initiation rejects malformed gateway responses instead of inventing an intent', async () => {
  process.env.STRIPE_SECRET_KEY = stripeKey;
  for (const create of [{}, null, 'ok', { id: 'pi_offlinefixture01' },
    { client_secret: 'pi_x_secret' }, { id: 123, client_secret: 'pi_x_secret' },
    stripeIntent({ client_secret: null })]) {
    stripeStub({ create });
    await assert.rejects(createStripePaymentIntent({ amount: 100 }), /Invalid gateway response/);
  }
});

test('Stripe verification binds the intent to the stored amount and currency', async () => {
  process.env.STRIPE_SECRET_KEY = stripeKey;
  stripeStub({ retrieve: stripeIntent() });
  const ok = await verifyStripePayment('pi_offlinefixture01', { amount: '1250.55', currency: 'NPR' });
  assert.equal(ok.settled, true);
  assert.equal(ok.status, 'succeeded');
  assert.equal(ok.amount, 1250.55);
  assert.equal(ok.amountMinor, 125055);
  assert.equal(ok.currency, 'npr');
  // minorAmount is an equally binding alternative to the decimal amount.
  stripeStub({ retrieve: stripeIntent() });
  assert.equal((await verifyStripePayment('pi_offlinefixture01', { minorAmount: 125055 })).settled, true);

  // Amount tampering: a cheaper intent must never satisfy a costlier booking.
  for (const amount of ['1250.56', '1250.54', '1.00', '99999.99']) {
    stripeStub({ retrieve: stripeIntent() });
    await assert.rejects(verifyStripePayment('pi_offlinefixture01', { amount, currency: 'npr' }),
      /Payment amount mismatch/);
  }
  stripeStub({ retrieve: stripeIntent() });
  await assert.rejects(verifyStripePayment('pi_offlinefixture01', { minorAmount: 125054 }),
    /Payment amount mismatch/);

  // Currency swap: 125055 "usd" is worth far more than NPR 1250.55, and the
  // reverse is worth far less, so a bare numeric compare misses both.
  for (const [actual, expected] of [['usd', 'npr'], ['npr', 'usd'], ['inr', 'gbp']]) {
    stripeStub({ retrieve: stripeIntent({ currency: actual }) });
    await assert.rejects(verifyStripePayment('pi_offlinefixture01', { amount: '1250.55', currency: expected }),
      /Payment currency mismatch/);
  }
  // An unsupported currency is refused outright, from either side of the bind.
  stripeStub({ retrieve: stripeIntent({ currency: 'jpy' }) });
  await assert.rejects(verifyStripePayment('pi_offlinefixture01', { amount: '1250.55' }),
    /Unsupported payment currency/);
  stripeStub({ retrieve: stripeIntent() });
  await assert.rejects(verifyStripePayment('pi_offlinefixture01', { amount: '1250.55', currency: 'jpy' }),
    /Unsupported payment currency/);
  for (const expected of ['x', 42, [], null]) {
    stripeStub({ retrieve: stripeIntent() });
    await assert.rejects(verifyStripePayment('pi_offlinefixture01', expected), /Invalid expected payment/);
  }
});

test('Stripe verification treats unsucceeded and under-captured intents as unsettled', async () => {
  process.env.STRIPE_SECRET_KEY = stripeKey;
  for (const status of ['requires_payment_method', 'requires_action', 'processing',
    'requires_capture', 'canceled', 'requires_confirmation']) {
    stripeStub({ retrieve: stripeIntent({ status }) });
    const result = await verifyStripePayment('pi_offlinefixture01', { amount: '1250.55' });
    assert.equal(result.settled, false, status);
    assert.equal(result.status, status);
  }
  // Partial capture: status says succeeded but the money did not fully arrive.
  for (const amount_received of [0, 100, 125054]) {
    stripeStub({ retrieve: stripeIntent({ amount_received }) });
    const result = await verifyStripePayment('pi_offlinefixture01', { amount: '1250.55' });
    assert.equal(result.settled, false);
    assert.equal(result.amountReceivedMinor, amount_received);
  }
  // Over-capture still settles the bound amount rather than failing the guest.
  stripeStub({ retrieve: stripeIntent({ amount_received: 130000 }) });
  assert.equal((await verifyStripePayment('pi_offlinefixture01', { amount: '1250.55' })).settled, true);
});

test('Stripe verification rejects tampered references and malformed retrievals', async () => {
  process.env.STRIPE_SECRET_KEY = stripeKey;
  for (const bad of ['sim_pi_123', 'pi_short', 'ch_offlinefixture01', 'pi_bad-chars!!',
    'pi_' + 'x'.repeat(251), '', null, 42, {}, 'pi_offlinefixture01 ']) {
    const calls = stripeStub({ retrieve: stripeIntent() });
    await assert.rejects(verifyStripePayment(bad), /Invalid payment reference/);
    assert.equal(calls.length, 0, 'invalid reference must not reach the gateway');
  }
  // A response describing a different intent is a mismatch, not a success.
  for (const retrieve of [null, 'ok', {}, stripeIntent({ id: 'pi_someotherintent9' }),
    stripeIntent({ status: undefined }), stripeIntent({ status: 42 })]) {
    stripeStub({ retrieve });
    await assert.rejects(verifyStripePayment('pi_offlinefixture01'), /Invalid gateway response/);
  }
  for (const amount of [-1, 1250.55, NaN, '125055', null, Number.MAX_SAFE_INTEGER]) {
    stripeStub({ retrieve: stripeIntent({ amount }) });
    await assert.rejects(verifyStripePayment('pi_offlinefixture01'), /Invalid gateway amount|Invalid NPR amount/);
  }
});

test('Stripe mode comes from the key itself and production refuses a test key', async () => {
  assert.equal(stripeMode('sk_live_4a7b8c9d1e2f3a4b5c6d'), 'live');
  assert.equal(stripeMode('rk_live_4a7b8c9d1e2f3a4b5c6d'), 'live');
  assert.equal(stripeMode('sk_test_4a7b8c9d1e2f3a4b5c6d'), 'test');
  assert.equal(stripeMode('rk_test_4a7b8c9d1e2f3a4b5c6d'), 'test');
  for (const key of ['', 'pk_live_abc', 'sk_abc', 'live_secret_key_abc', 'SK_LIVE_abc']) {
    assert.equal(stripeMode(key), 'unknown');
  }
  const savedEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    for (const key of [stripeKey, 'rk_test_4a7b8c9d1e2f3a4b5c6d', 'unrecognized_key_4a7b8c9d1e2f']) {
      process.env.STRIPE_SECRET_KEY = key;
      stripeStub({ create: stripeIntent(), retrieve: stripeIntent() });
      await assert.rejects(createStripePaymentIntent({ amount: 100 }), /not configured for production/);
      await assert.rejects(verifyStripePayment('pi_offlinefixture01'), /not configured for production/);
    }
    // A live key in production is accepted, and reports itself as live.
    process.env.STRIPE_SECRET_KEY = 'sk_live_4a7b8c9d1e2f3a4b5c6d';
    stripeStub({ create: stripeIntent() });
    assert.equal((await createStripePaymentIntent({ amount: 100 })).mode, 'live');
  } finally {
    if (savedEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = savedEnv;
  }
});

test('Stripe availability requires a recognized key pair that agrees on environment', () => {
  process.env.STRIPE_SECRET_KEY = stripeKey;
  let config = getPaymentGatewayConfig().stripe;
  assert.equal(config.enabled, true);
  assert.equal(config.mode, 'test');
  assert.equal(config.testMode, true);
  assert.equal(config.environment, 'sandbox');
  assert.equal(config.keyMismatch, false);

  // A live publishable key beside a test secret would charge nothing real while
  // the UI claims production, so the pair is disabled rather than half-trusted.
  process.env.STRIPE_PUBLISHABLE_KEY = 'pk_live_4a7b8c9d1e2f3a4b5c6d';
  config = getPaymentGatewayConfig().stripe;
  assert.equal(config.enabled, false);
  assert.equal(config.keyMismatch, true);
  assert.equal(config.publishableKey, '');

  process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_4a7b8c9d1e2f3a4b5c6d';
  config = getPaymentGatewayConfig().stripe;
  assert.equal(config.enabled, true);
  assert.equal(config.keyMismatch, false);
  assert.equal(config.publishableKey, 'pk_test_4a7b8c9d1e2f3a4b5c6d');

  delete process.env.STRIPE_PUBLISHABLE_KEY;
  for (const key of ['', 'sk_abc', 'live_secret_key_68791341fdd94846a146f0457ff7b455', 'x'.repeat(30)]) {
    process.env.STRIPE_SECRET_KEY = key;
    const unknown = getPaymentGatewayConfig().stripe;
    assert.equal(unknown.enabled, false);
    assert.equal(unknown.environment, null);
  }
  const savedEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    process.env.STRIPE_SECRET_KEY = stripeKey;
    assert.equal(getPaymentGatewayConfig().stripe.enabled, false); // test key in production
    process.env.STRIPE_SECRET_KEY = 'sk_live_4a7b8c9d1e2f3a4b5c6d';
    assert.equal(getPaymentGatewayConfig().stripe.enabled, true);
    assert.equal(getPaymentGatewayConfig().stripe.environment, 'production');
  } finally {
    if (savedEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = savedEnv;
  }
});
