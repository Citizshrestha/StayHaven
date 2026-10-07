import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

// QA session 01 regressions: staff login roles/redirects, staff-only routers,
// logout with an expired access token, concurrent refresh, cookie-auth CSRF.
test('staff session lifecycle and staff-only API gate', { timeout: 600000 }, async () => {
  await withEphemeralWalletDatabase(async () => {
    const previous = { a: process.env.JWT_ACCESS_SECRET, r: process.env.JWT_REFRESH_SECRET, e: process.env.JWT_EXPIRE };
    process.env.JWT_ACCESS_SECRET = 'platform-auth-access-secret-never-for-production';
    process.env.JWT_REFRESH_SECRET = 'platform-auth-refresh-secret-never-for-production';
    try {
      const jwt = (await import('jsonwebtoken')).default;
      const { User } = await import('../models/user.schema.js');
      const { Role } = await import('../models/role.schema.js');
      const { Hotel } = await import('../models/hotel.schema.js');
      await import('../models/company.schema.js');
      const staff = await import('../controllers/staffController.js');
      const { protect, requireStaffRole } = await import('../middleware/authMiddleware.js');
      const { STAFF_HOME_ROUTES } = await import('../utils/staffRoleRoutes.js');

      const company = new mongoose.Types.ObjectId();
      await mongoose.connection.collection('companies').insertOne({ _id: company, name: 'Platform Co' });
      const roles = Object.fromEntries(await Promise.all(['hoteladmin', 'manager', 'admin', 'waiter', 'guest'].map(async (name) => [name, await Role.create({ name })])));
      const owner = new mongoose.Types.ObjectId();
      const hotel = await Hotel.create({ company, owner, name: 'Platform Hotel', description: 'fixture', category: 'Hotel', starRating: 3,
        location: { city: 'Kathmandu', country: 'Nepal', address: 'x' }, contact: { phone: '9800000000', email: 'h@example.test' },
        images: ['https://platform-tests.invalid/h.jpg'], priceRange: { min: 1, max: 2 }, status: 'approved', isActive: true });
      const make = (name, extra = {}) => User.create({ fullname: `Platform ${name}`, username: `platform-${name}`, email: `${name}@platform.test`,
        password: 'Platform@1234', role: roles[name]._id, companyRole: name === 'guest' ? undefined : name, company: name === 'guest' ? undefined : company,
        assignedProperties: name === 'guest' ? [] : [hotel._id], accountStatus: 'active', isActive: true, ...extra });
      const users = { hoteladmin: await make('hoteladmin'), manager: await make('manager'), admin: await make('admin'), waiter: await make('waiter'), guest: await make('guest') };

      const call = async (handler, { body = {}, cookies = {}, headers = {}, method = 'POST', user } = {}) => {
        let status = 200, payload, error, nextCalled = false;
        const issued = {};
        const req = { body, cookies, headers, method, user, params: {}, query: {} };
        await handler(req, {
          status(code) { status = code; return this; }, json(data) { payload = data; return this; },
          cookie(name, value) { issued[name] = value; return this; },
        }, (err) => { error = err; nextCalled = !err; });
        if (error) throw error;
        return { status, payload, cookies: issued, nextCalled, req };
      };

      // hoteladmin can sign in; every role gets a real dashboard route.
      for (const role of ['hoteladmin', 'manager', 'admin', 'waiter']) {
        const res = await call(staff.staffLogin, { body: { email: `${role}@platform.test`, password: 'Platform@1234' } });
        assert.equal(res.status, 200, `${role} staff login`);
        assert.equal(res.payload.redirectPath, STAFF_HOME_ROUTES[role]);
        assert.notEqual(res.payload.redirectPath, '/dashboard');
        assert.notEqual(res.payload.redirectPath, '/manager-dashboard');
      }

      // Guest accounts are rejected by staff-only routers.
      const guestToken = jwt.sign({ id: String(users.guest._id), type: 'access' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
      const authed = await call(protect, { method: 'GET', headers: { authorization: `Bearer ${guestToken}` } });
      assert.equal(authed.nextCalled, true);
      assert.equal((await call(requireStaffRole, { user: authed.req.user })).status, 403);
      const waiterToken = jwt.sign({ id: String(users.waiter._id), type: 'access' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
      const waiterReq = await call(protect, { method: 'GET', headers: { authorization: `Bearer ${waiterToken}` } });
      assert.equal((await call(requireStaffRole, { user: waiterReq.req.user })).nextCalled, true);

      // Cookie-only writes need the CSRF double-submit token; Bearer writes don't.
      const cookieWrite = await call(protect, { method: 'POST', cookies: { accessToken: waiterToken } });
      assert.equal(cookieWrite.status, 403);
      assert.equal(cookieWrite.nextCalled, false);
      const cookieWriteWithCsrf = await call(protect, { method: 'POST', cookies: { accessToken: waiterToken, 'csrf-token': 'abc' }, headers: { 'x-csrf-token': 'abc' } });
      assert.equal(cookieWriteWithCsrf.nextCalled, true);
      assert.equal((await call(protect, { method: 'POST', headers: { authorization: `Bearer ${waiterToken}` } })).nextCalled, true);

      // Concurrent refresh with one cookie: both succeed, the session survives.
      const login = await call(staff.staffLogin, { body: { email: 'waiter@platform.test', password: 'Platform@1234' } });
      const first = login.cookies.refreshToken;
      const [a, b] = await Promise.all([1, 2].map(() => call(staff.refreshAccessToken, { cookies: { refreshToken: first } })));
      assert.deepEqual([a.status, b.status], [200, 200], 'parallel tabs must not force a logout');
      const rotatedCookie = a.cookies.refreshToken || b.cookies.refreshToken;
      assert.ok(rotatedCookie && rotatedCookie !== first);
      assert.equal((await call(staff.refreshAccessToken, { cookies: { refreshToken: rotatedCookie } })).status, 200);

      // Replay of an old token after the grace window revokes the session.
      const current = (await User.findById(users.waiter._id)).refreshToken;
      await User.updateOne({ _id: users.waiter._id }, { $set: { refreshRotatedAt: new Date(Date.now() - 60000) } });
      assert.equal((await call(staff.refreshAccessToken, { cookies: { refreshToken: rotatedCookie } })).status, 401);
      assert.equal((await User.findById(users.waiter._id)).refreshToken, null, 'reuse must revoke');
      assert.equal((await call(staff.refreshAccessToken, { cookies: { refreshToken: current } })).status, 401);

      // Logout with an expired access token still revokes the refresh token.
      const relog = await call(staff.staffLogin, { body: { email: 'waiter@platform.test', password: 'Platform@1234' } });
      const expired = jwt.sign({ id: String(users.waiter._id), type: 'access', exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_ACCESS_SECRET);
      assert.equal((await call(staff.staffLogout, { headers: { authorization: `Bearer ${expired}` } })).status, 200);
      assert.equal((await User.findById(users.waiter._id)).refreshToken, null);
      assert.equal((await call(staff.refreshAccessToken, { cookies: { refreshToken: relog.cookies.refreshToken } })).status, 401);
      // A forged token never identifies anyone.
      await call(staff.staffLogin, { body: { email: 'manager@platform.test', password: 'Platform@1234' } });
      const forged = jwt.sign({ id: String(users.manager._id), type: 'access' }, 'attacker-secret');
      await call(staff.staffLogout, { headers: { authorization: `Bearer ${forged}` } });
      assert.notEqual((await User.findById(users.manager._id)).refreshToken, null);
    } finally {
      for (const [key, value] of [['JWT_ACCESS_SECRET', previous.a], ['JWT_REFRESH_SECRET', previous.r], ['JWT_EXPIRE', previous.e]]) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    }
  });
});
