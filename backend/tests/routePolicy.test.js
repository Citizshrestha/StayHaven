import test from 'node:test';
import assert from 'node:assert/strict';

// QA session 01 final pass: route-level role policy and request validation.
// No database: only the protect/authorize prefix of each route and the
// express-validator chains are executed.

// Runs the first `count` handlers of a route (protect, authorize) for a user
// with the given role and returns the HTTP status they produce (200 = passed).
const policy = async (router, method, path, role, count = 2) => {
  const layer = router.stack.find((l) => l.route && l.route.path === path && l.route.methods[method]);
  assert.ok(layer, `${method.toUpperCase()} ${path} is registered`);
  const req = { method: method.toUpperCase(), authVerified: true, user: { _id: 'u1', role: { name: role } }, headers: {}, cookies: {}, body: {}, params: {}, query: {} };
  for (const { handle } of layer.route.stack.slice(0, count)) {
    const outcome = await new Promise((resolve) => {
      const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json() { resolve({ status: this.statusCode }); return this; } };
      handle(req, res, (err) => resolve(err ? { status: err.status || err.statusCode || 500 } : null));
    });
    if (outcome) return outcome.status;
  }
  return 200;
};

const runValidators = async (chains, body) => {
  const req = { body, params: {}, query: {}, headers: {} };
  let result = { status: 200 };
  for (const chain of chains) {
    await new Promise((resolve) => {
      const res = { status(code) { result.status = code; return this; }, json(data) { result.body = data; resolve(); return this; } };
      Promise.resolve(chain(req, res, () => resolve())).catch(resolve);
    });
    if (result.status !== 200) break;
  }
  return result;
};

test('chief cannot edit orders, confirm payments or send bills (REQ-kitchen-1)', async () => {
  const { default: staffRoutes } = await import('../routes/staffRoutes.js');
  const routes = [
    ['put', '/orders/:orderId'],
    ['post', '/orders/:orderId/confirm-payment'],
    ['post', '/orders/:orderId/send-bill'],
    ['post', '/orders/:orderId/retry-bill'],
  ];
  for (const [method, path] of routes) {
    assert.equal(await policy(staffRoutes, method, path, 'chief'), 403, `chief ${method} ${path}`);
    assert.equal(await policy(staffRoutes, method, path, 'waiter'), 200, `waiter ${method} ${path}`);
    assert.equal(await policy(staffRoutes, method, path, 'manager'), 200, `manager ${method} ${path}`);
  }
  // The kitchen still advances status.
  assert.equal(await policy(staffRoutes, 'put', '/orders/:orderId/status', 'chief'), 200);
});

test('hotel moderation routes are superadmin-only (REQ-superadmin-1)', async () => {
  const { default: hotelRoutes } = await import('../routes/hotelRoutes.js');
  for (const path of ['/:id/status', '/:id/approve', '/:id/reject', '/:id/featured']) {
    for (const role of ['admin', 'owner', 'hoteladmin', 'manager', 'guest']) {
      assert.equal(await policy(hotelRoutes, 'patch', path, role), 403, `${role} PATCH ${path}`);
    }
    assert.equal(await policy(hotelRoutes, 'patch', path, 'superadmin'), 200, `superadmin PATCH ${path}`);
  }
});

test('signup email check is rate-limited (REQ-guest-1)', async () => {
  const { default: authRoutes } = await import('../routes/authRoutes.js');
  const { accountCheckLimiter } = await import('../middleware/rateLimiter.js');
  const layer = authRoutes.stack.find((l) => l.route?.path === '/check' && l.route.methods.get);
  assert.ok(layer.route.stack.some((l) => l.handle === accountCheckLimiter));
});

test('payment limiter is keyed per signed-in user, not per IP (REQ-public-9)', async () => {
  const { paymentLimiter } = await import('../middleware/rateLimiter.js');
  const hit = (userId) => new Promise((resolve) => {
    const headers = {};
    const req = { ip: '203.0.113.7', method: 'POST', headers: {}, app: { get: () => false }, user: { _id: userId } };
    const res = {
      statusCode: 200, headersSent: false,
      setHeader(k, v) { headers[k] = v; }, getHeader(k) { return headers[k]; }, append() {},
      status(code) { this.statusCode = code; return this; },
      send() { resolve(this.statusCode); return this; }, json() { resolve(this.statusCode); return this; },
    };
    paymentLimiter(req, res, () => resolve(200));
  });
  // Development limit is 100/h per key; one guest exhausting it on a shared
  // IP must not block another guest on the same IP.
  let last;
  for (let i = 0; i < 101; i += 1) last = await hit('guest-a');
  assert.equal(last, 429);
  assert.equal(await hit('guest-b'), 200);
});

test('booking validation treats empty optional fields as not provided (REQ-public-1)', async () => {
  const { bookingValidation } = await import('../middleware/validation.js');
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString();
  const base = { hotelId: '507f1f77bcf86cd799439011', roomId: '507f1f77bcf86cd799439012', checkIn: day(2), checkOut: day(4), paymentMethod: 'card' };
  const empty = await runValidators(bookingValidation.create, { ...base, guestName: '', guestEmail: '', guestPhone: '', specialRequests: '' });
  assert.equal(empty.status, 200, JSON.stringify(empty.body));
  const bad = await runValidators(bookingValidation.create, { ...base, guestEmail: 'not-an-email' });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.errors[0].field, 'guestEmail');
});

test('SMTP transport fails fast (REQ-public-6)', async () => {
  const { transporter } = await import('../config/nodemailer.js');
  assert.equal(transporter.options.connectionTimeout, 10000);
  assert.equal(transporter.options.greetingTimeout, 10000);
  assert.equal(transporter.options.socketTimeout, 15000);
});
