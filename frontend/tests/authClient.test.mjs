import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

const storage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
};
function harness(post) {
  const localStorage = storage(), sessionStorage = storage(), clients = [];
  const axios = { post, create: (options) => {
    const client = async (config) => ({ config });
    client.options = options;
    client.interceptors = {
      request: { use: (success) => { client.request = success; } },
      response: { use: (_success, failure) => { client.failure = failure; } },
    };
    clients.push(client);
    return client;
  } };
  const imports = { axios, '../utils/csrf': { setupCsrfInterceptor() {}, addCsrfHeader: async () => ({ 'X-CSRF-Token': 'csrf' }) }, '../utils/apiConfig': { getApiBaseUrl: () => 'https://api.example' } };
  const module = { exports: {} };
  const { code } = transformSync(readFileSync(new URL('../src/core/api/client.js', import.meta.url), 'utf8'), { format: 'cjs' });
  const window = { location: { pathname: '/guest-dashboard', href: '' } };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => imports[name], URL, localStorage, sessionStorage, window });
  const config = (url, headers = {}) => clients[0].request({ url, baseURL: 'https://api.example', headers });
  const fail = (config) => clients[0].failure({ config, response: { status: 401 } });
  return { ...module.exports, localStorage, sessionStorage, clients, config, fail, window };
}
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

test('staff tables and explicit hotel authorization stay separate from a simultaneous guest session', () => {
  const h = harness();
  h.localStorage.setItem('accessToken', 'guest');
  h.sessionStorage.setItem('staffAccessToken', 'staff');
  assert.equal(h.config('/api/v1/tables').headers.Authorization, 'Bearer staff');
  assert.equal(h.config('/api/v1/rooms').headers.Authorization, 'Bearer staff');
  assert.equal(h.config('/api/v1/guest/portal/bookings').headers.Authorization, 'Bearer guest');
  const hotel = h.config('/api/v1/hotels/123', { Authorization: 'Bearer staff' });
  assert.equal(hotel.headers.Authorization, 'Bearer staff');
  assert.equal(hotel._authScope, 'staff');
  h.sessionStorage.removeItem('staffAccessToken');
  assert.equal(h.config('/api/v1/staff/me').headers.Authorization, undefined);
});

test('concurrent staff requests share a rotation while guest refresh has a separate promise', async () => {
  const calls = [], resolvers = [];
  const h = harness((...args) => { calls.push(args); return new Promise((resolve) => resolvers.push(resolve)); });
  h.localStorage.setItem('accessToken', 'guest-old');
  h.sessionStorage.setItem('staffAccessToken', 'staff-old');
  const staff = h.config('/api/v1/staff/me');
  const pending = [h.fail(staff), h.fail(h.config('/api/v1/tables')), h.fail(h.config('/api/v1/guest/portal/profile'))];
  await flush();
  assert.equal(calls.length, 2);
  assert.equal(calls[0][2].headers['X-CSRF-Token'], 'csrf');
  resolvers[0]({ data: { accessToken: 'staff-new' } });
  resolvers[1]({ data: { accessToken: 'guest-new' } });
  const results = await Promise.all(pending);
  assert.equal(results[0].config.headers.Authorization, 'Bearer staff-new');
  assert.equal(results[1].config.headers.Authorization, 'Bearer staff-new');
  assert.equal(results[2].config.headers.Authorization, 'Bearer guest-new');
  assert.equal(h.localStorage.getItem('accessToken'), 'guest-new');
  assert.equal(h.sessionStorage.getItem('staffAccessToken'), 'staff-new');
});

test('refresh does not revive a session after logout', async () => {
  let finish;
  const h = harness(() => new Promise((resolve) => { finish = resolve; }));
  h.sessionStorage.setItem('staffAccessToken', 'old');
  const pending = h.refreshSession('staff');
  await flush();
  h.sessionStorage.removeItem('staffAccessToken');
  finish({ data: { accessToken: 'new' } });
  await assert.rejects(pending, /session changed/);
  assert.equal(h.sessionStorage.getItem('staffAccessToken'), null);
});

test('temporary refresh errors preserve login and malformed errors preserve original failure', async () => {
  const networkError = new Error('offline');
  const h = harness(async () => { throw networkError; });
  h.localStorage.setItem('accessToken', 'guest');
  await assert.rejects(h.fail(h.config('/api/v1/guest/portal/profile')), /offline/);
  assert.equal(h.localStorage.getItem('accessToken'), 'guest');
  assert.equal(h.window.location.href, '');
  await assert.rejects(h.clients[0].failure(networkError), /offline/);
});

test('failed staff refresh clears only staff identity and payment return does not navigate away', async () => {
  const h = harness(async () => { throw { response: { status: 401 } }; });
  h.localStorage.setItem('accessToken', 'guest');
  h.sessionStorage.setItem('staffAccessToken', 'staff');
  const request = h.config('/api/v1/staff/me');
  request.preservePaymentReturn = true;
  await assert.rejects(h.fail(request));
  assert.equal(h.sessionStorage.getItem('staffAccessToken'), null);
  assert.equal(h.localStorage.getItem('accessToken'), 'guest');
  assert.equal(h.window.location.href, '');
});

test('hotel-admin clients share refresh and use versioned base URLs correctly', async () => {
  const h = harness(async () => ({ data: { accessToken: 'new' } }));
  h.sessionStorage.setItem('staffAccessToken', 'old');
  const admin = h.createApiClient({ authScope: 'staff', baseURL: 'https://api.example/api/v1' });
  const config = admin.request({ baseURL: admin.options.baseURL, url: '/rooms', headers: {} });
  assert.equal(config.headers.Authorization, 'Bearer old');
  const result = await admin.failure({ config, response: { status: 401 } });
  assert.equal(result.config.headers.Authorization, 'Bearer new');
});
