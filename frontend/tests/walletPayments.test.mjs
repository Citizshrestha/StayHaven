import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { transformSync } from 'esbuild';

const source = (file) => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
const storage = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key), key: (index) => [...data.keys()][index], get length() { return data.size; } };
};
function load(file, imports, globals = {}, extra = '') {
  const module = { exports: {} };
  const { code } = transformSync(source(file) + extra, { loader: 'jsx', format: 'cjs', jsx: 'automatic' });
  vm.runInNewContext(code, { module, exports: module.exports, require: (id) => {
    if (!(id in imports)) throw new Error(`Unexpected import: ${id}`);
    return imports[id];
  }, console, URL, URLSearchParams, AbortController, ...globals });
  return module.exports;
}
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

test('checkout UUID survives payload key order, reload and uncertainty; terminal completion rotates it', async () => {
  const sessionStorage = storage();
  const localStorage = storage();
  localStorage.setItem('userId', 'owner');
  const globals = { sessionStorage, localStorage, crypto: webcrypto, TextEncoder };
  const api = () => load('core/api/services/publicBooking.service.js', { '../client': {} }, globals);
  const first = api();
  const key = await first.getCheckoutIdempotencyKey('invoice:1', { amount: 10, paymentMethod: 'esewa' });
  assert.match(key, /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i);
  const reloaded = api();
  assert.equal(await reloaded.getCheckoutIdempotencyKey('invoice:1', { paymentMethod: 'esewa', amount: 10 }), key);
  reloaded.rememberPaymentAttempt(key, 'a'.repeat(24));
  reloaded.completePaymentCheckout('b'.repeat(24));
  assert.equal(await reloaded.getCheckoutIdempotencyKey('invoice:1', { amount: 10, paymentMethod: 'esewa' }), key);
  reloaded.completePaymentCheckout('a'.repeat(24));
  assert.notEqual(await reloaded.getCheckoutIdempotencyKey('invoice:1', { amount: 10, paymentMethod: 'esewa' }), key);
  localStorage.setItem('userId', 'other-owner');
  assert.notEqual(await api().getCheckoutIdempotencyKey('invoice:1', { amount: 10, paymentMethod: 'esewa' }), key);
});

test('wallet API reads authenticated endpoints and verifies by POST; guest retries send the same UUID', async () => {
  const calls = [];
  const client = Object.fromEntries(['get', 'post'].map((method) => [method, async (...args) => {
    calls.push([method, ...args]); return { data: { success: true, data: { status: 'pending' } } };
  }]));
  const api = load('core/api/services/publicBooking.service.js', { '../client': client });
  await api.getPaymentGatewayConfig();
  await api.getPaymentAttempt('abc');
  await api.verifyPaymentAttempt('abc');
  await api.getBookingDetails('booking');
  assert.deepEqual(calls.map((call) => call.slice(0, 2)), [
    ['get', '/api/v1/payments/config'], ['get', '/api/v1/payments/abc'],
    ['post', '/api/v1/payments/abc/verify'], ['get', '/api/v1/public/bookings/booking'],
  ]);
  assert.equal(calls[1][2].preservePaymentReturn, true);
  const guest = load('features/guest/dashboard/guestDashboardApi.js', {
    '../../../core/api/client': client, '../../../core/api/services/publicBooking.service': api,
  });
  const key = webcrypto.randomUUID();
  await guest.payOrder('invoice', { paymentMethod: 'khalti' }, key);
  await guest.payOrder('invoice', { paymentMethod: 'khalti' }, key);
  assert.equal(calls.at(-1)[3].headers['Idempotency-Key'], key);
  assert.equal(calls.at(-2)[3].headers['Idempotency-Key'], key);
});

test('redirects reject script URLs and credentials and use validated HTTPS', () => {
  const destinations = [];
  const api = load('core/api/services/publicBooking.service.js', { '../client': {} }, { window: { location: { assign: (url) => destinations.push(url) } } });
  for (const paymentUrl of ['javascript:alert(1)', 'http://pay.example', 'https://user:secret@pay.example']) {
    assert.throws(() => api.redirectToWalletPayment({ redirectType: 'url', paymentUrl }));
  }
  api.redirectToWalletPayment({ redirectType: 'url', paymentUrl: 'https://pay.example/checkout' });
  assert.deepEqual(destinations, ['https://pay.example/checkout']);
});

function callbackHarness(query, paymentApi) {
  const slots = [], effects = [], timers = new Map(), navigations = [];
  let cursor = 0, timerId = 0, now = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (value) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect(fn, deps) { const i = cursor++; const previous = slots[i]; if (!previous || deps.some((dep, j) => dep !== previous.deps[j])) { previous?.cleanup?.(); slots[i] = { deps }; effects.push(() => { slots[i].cleanup = fn(); }); } },
  };
  const navigate = (...args) => navigations.push(args);
  const jsx = (type, props) => ({ type, props });
  const Component = load('features/public/payment/PaymentCallback.jsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-router-dom': { useNavigate: () => navigate, useSearchParams: () => [new URLSearchParams(query)] },
    'lucide-react': {}, '../../../core/api/services/publicBooking.service': paymentApi,
  }, {
    setTimeout: (fn, delay) => { timers.set(++timerId, { fn, time: now + delay }); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  }).default;
  const render = () => { cursor = 0; const tree = Component(); while (effects.length) effects.shift()(); return tree; };
  const advance = async () => { const next = [...timers.entries()].sort((a, b) => a[1].time - b[1].time)[0]; if (!next) return false; timers.delete(next[0]); now = next[1].time; next[1].fn(); await flush(); return true; };
  return { render, advance, navigations, timers };
}
const attempt = 'a'.repeat(24);
const apiDefaults = { completePaymentCheckout() {}, verifyPaymentAttempt: async () => ({ success: true }), getBookingDetails: async () => ({ _id: 'b'.repeat(24) }) };

test('legacy success query never produces success or calls a payment API', async () => {
  let reads = 0;
  const h = callbackHarness('status=success', { ...apiDefaults, getPaymentAttempt: async () => { reads++; } });
  h.render(); await flush();
  assert.equal(reads, 0);
  assert.match(JSON.stringify(h.render()), /missing a valid payment reference/);
  assert.equal(h.navigations.length, 0);
});

test('pending polls are bounded, stay uncertain, and never finish a checkout', async () => {
  let reads = 0, completed = 0;
  const h = callbackHarness(`attempt=${attempt}`, { ...apiDefaults,
    getPaymentAttempt: async () => { reads++; return { status: 'pending', targetType: 'invoice' }; },
    completePaymentCheckout: () => completed++,
  });
  h.render(); await flush();
  for (let i = 0; i < 20 && await h.advance(); i++);
  assert.equal(reads, 12);
  assert.equal(completed, 0);
  assert.equal(h.navigations.length, 0);
  assert.match(JSON.stringify(h.render()), /Payment pending/);
  assert.equal(h.timers.size, 0);
});

test('stored booking success loads owner details before opening confirmation', async () => {
  const h = callbackHarness(`attempt=${attempt}`, { ...apiDefaults, getPaymentAttempt: async () => ({ status: 'succeeded', targetType: 'booking', targetId: 'b'.repeat(24) }) });
  h.render(); await flush(); await h.advance();
  assert.equal(h.navigations[0][0], '/booking-confirmed');
  assert.equal(h.navigations[0][1].state.bookingId, 'b'.repeat(24));
});

test('owner/auth errors show a safe sign-in resume and no server error text', async () => {
  const h = callbackHarness(`attempt=${attempt}`, { ...apiDefaults, getPaymentAttempt: async () => { throw { response: { status: 401, data: { message: 'SECRET INTERNAL ERROR' } } }; } });
  h.render(); await flush();
  const tree = h.render();
  assert.match(JSON.stringify(tree), /Sign in to check this payment/);
  assert.doesNotMatch(JSON.stringify(tree), /SECRET/);
  assert.equal(h.timers.size, 0);
});

test('successful payment remains successful when booking details are unavailable', async () => {
  const h = callbackHarness(`attempt=${attempt}`, { ...apiDefaults,
    getPaymentAttempt: async () => ({ status: 'succeeded', targetType: 'booking', targetId: 'b'.repeat(24) }),
    getBookingDetails: async () => { throw new Error('private diagnostics'); },
  });
  h.render(); await flush();
  assert.match(JSON.stringify(h.render()), /Payment successful/);
  assert.equal(h.navigations.length, 0);
});
