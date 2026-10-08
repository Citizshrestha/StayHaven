import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

// QA session 06 (superadmin) regressions: platform-only access for the user /
// hotel admin handlers, escalation and session revocation, mass assignment,
// payout double-submit and concurrent approval, refund transitions, settings
// validation + audit trail, CMS link validation, and no credential leaks.
test('superadmin platform APIs: access, money, validation, audit', { timeout: 600000 }, async () => {
  await withEphemeralWalletDatabase(async () => {
    const previous = { a: process.env.JWT_ACCESS_SECRET, s: process.env.JWT_SECRET };
    process.env.JWT_ACCESS_SECRET = 'superadmin-test-access-secret-never-for-production';
    let server;
    try {
      const express = (await import('express')).default;
      const jwt = (await import('jsonwebtoken')).default;
      const { User } = await import('../models/user.schema.js');
      const { Role } = await import('../models/role.schema.js');
      const { Hotel } = await import('../models/hotel.schema.js');
      const { Booking } = await import('../models/booking.schema.js');
      const { Refund } = await import('../models/refund.model.js');
      const { Payout } = await import('../models/payout.model.js');
      const { AuditLog } = await import('../models/auditLog.model.js');
      await import('../models/company.schema.js');
      await import('../models/room.schema.js');
      const { errorHandler } = await import('../middleware/errorHandler.js');
      const userRoutes = (await import('../routes/userRoutes.js')).default;
      const superadminRoutes = (await import('../routes/superadminRoutes.js')).default;
      const financeRoutes = (await import('../routes/finance.routes.js')).default;
      const systemRoutes = (await import('../routes/systemConfig.routes.js')).default;
      const contentRoutes = (await import('../routes/content/index.js')).default;
      await Payout.init();

      const app = express();
      app.use(express.json());
      app.use('/api/v1/users', userRoutes);
      app.use('/api/v1/superadmin', superadminRoutes);
      app.use('/api/v1/superadmin/finance', financeRoutes);
      app.use('/api/v1/superadmin/system', systemRoutes);
      app.use('/api/v1/content', contentRoutes);
      app.use(errorHandler);
      server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
      const base = `http://127.0.0.1:${server.address().port}`;

      const roles = Object.fromEntries(await Promise.all(['superadmin', 'admin', 'owner', 'guest', 'waiter'].map(async (name) => [name, await Role.create({ name })])));
      const company = new mongoose.Types.ObjectId();
      await mongoose.connection.collection('companies').insertOne({ _id: company, name: 'SA Co' });
      let seq = 0;
      const make = (role, extra = {}) => User.create({ fullname: `SA ${role} ${++seq}`, username: `sa-${role}-${seq}`, email: `${role}-${seq}@sa.test`,
        password: 'Superadmin@1234', role: roles[role]._id, isActive: true, accountStatus: 'active', ...extra });
      const sa = await make('superadmin');
      const sa2 = await make('superadmin');
      const admin = await make('admin', { company, companyRole: 'admin' });
      const guest = await make('guest', { refreshToken: 'guest-refresh-token-value' });
      const hotel = await Hotel.create({ company, owner: admin._id, name: 'SA Hotel', description: 'fixture', category: 'Hotel', starRating: 3,
        location: { city: 'Kathmandu', country: 'Nepal', address: 'x' }, contact: { phone: '9800000000', email: 'h@sa.test' },
        images: ['https://sa-tests.invalid/h.jpg'], priceRange: { min: 1, max: 2 }, status: 'approved', isActive: true });
      const day = 86400000;
      const amounts = [3390.5, 4520, 2260.25];
      const bookings = [];
      for (const [i, totalAmount] of amounts.entries()) {
        const checkIn = new Date(Date.now() - (5 + i) * day);
        bookings.push(await Booking.create({ user: guest._id, hotel: hotel._id, company, room: new mongoose.Types.ObjectId(), guest: new mongoose.Types.ObjectId(),
          checkIn, checkOut: new Date(checkIn.getTime() + 2 * day), guests: { adults: 1, children: 0 }, totalAmount, currency: 'NPR', status: 'Checked-Out', paymentStatus: 'paid' }));
      }

      const token = (user) => jwt.sign({ id: String(user._id), type: 'access' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
      const api = async (user, method, path, body) => {
        const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
          body: body === undefined ? undefined : JSON.stringify(body) });
        const text = await res.text();
        let data; try { data = JSON.parse(text); } catch { data = text; }
        return { status: res.status, data, text };
      };

      // A company "admin" can't reach platform-wide user/hotel management or finance.
      for (const [method, path, body] of [
        ['GET', '/api/v1/users/admin/all'],
        ['PATCH', `/api/v1/users/admin/${guest._id}`, { role: 'superadmin' }],
        ['POST', `/api/v1/users/admin/${guest._id}/reset-password`, {}],
        ['GET', '/api/v1/superadmin/finance/overview'],
        ['PUT', '/api/v1/superadmin/system/settings', { globalCommissionRate: 1 }],
      ]) {
        assert.equal((await api(admin, method, path, body)).status, 403, `admin ${method} ${path}`);
        assert.equal((await api(null, method, path, body)).status, 401, `anon ${method} ${path}`);
      }
      assert.equal((await User.findById(guest._id).populate('role')).role.name, 'guest', 'escalation via admin must not apply');

      // Input hardening and escalation guards.
      assert.equal((await api(sa, 'GET', '/api/v1/users/admin/all?search=(((&limit=abc&page=-1')).status, 200);
      assert.equal((await api(sa, 'GET', '/api/v1/users/admin/not-an-id')).status, 400);
      assert.equal((await api(sa, 'PATCH', `/api/v1/users/admin/${guest._id}`, { role: 'emperor' })).status, 400);
      assert.equal((await api(sa, 'PATCH', `/api/v1/users/admin/${guest._id}`, { companyRole: 'owner' })).status, 400);
      assert.equal((await api(sa, 'PATCH', `/api/v1/users/admin/${guest._id}`, { email: sa2.email })).status, 409);
      assert.equal((await api(sa, 'PATCH', `/api/v1/users/admin/${sa._id}`, { role: 'guest' })).status, 400, 'no self-demotion');
      assert.equal((await api(sa, 'DELETE', `/api/v1/users/admin/${sa2._id}`)).status, 403);
      await new Promise((r) => setTimeout(r, 1100));
      const changed = await api(sa, 'PATCH', `/api/v1/users/admin/${guest._id}`, { role: 'waiter', password: 'Hacked@1234', company: String(company) });
      assert.equal(changed.status, 200);
      const after = await User.findById(guest._id);
      assert.ok(after.passwordChangedAt && after.refreshToken === null, 'role change revokes sessions');
      assert.equal(after.company, null, 'company is not mass-assignable');
      assert.equal(await after.matchPassword('Hacked@1234'), false, 'password is not mass-assignable');
      assert.ok(await AuditLog.exists({ action: 'update_user', admin: sa._id }));
      const reset = await api(sa, 'POST', `/api/v1/users/admin/${guest._id}/reset-password`, {});
      assert.equal(reset.status, 200);
      assert.equal(reset.data.debug, undefined, 'reset OTP is never echoed');

      // Booking list never leaks credentials.
      const list = await api(sa, 'GET', '/api/v1/superadmin/bookings?limit=5');
      assert.equal(list.status, 200);
      assert.doesNotMatch(list.text, /\$2[aby]\$|refreshToken|resetOtp|inviteToken|"password"/);

      // Payouts: exact paisa, one per hotel+period under double submit, overlap refused.
      await api(sa, 'PUT', '/api/v1/superadmin/system/settings', { globalCommissionRate: 12.5 });
      const from = new Date(Date.now() - 30 * day).toISOString();
      const to = new Date().toISOString();
      const created = await Promise.all([1, 2].map(() => api(sa, 'POST', '/api/v1/superadmin/finance/payouts', { hotelId: String(hotel._id), periodFrom: from, periodTo: to })));
      const ok = created.filter((r) => r.status === 200);
      assert.equal(ok.length, 1, 'double-submit creates one payout');
      assert.ok(created.some((r) => r.status === 409));
      const payout = ok[0].data.data;
      const grossP = amounts.reduce((s, a) => s + Math.round(a * 100), 0);
      const commP = Math.round(grossP * 12.5 / 100);
      const taxP = Math.round(commP * 13 / 100);
      assert.equal(payout.grossRevenue, grossP / 100);
      assert.equal(payout.platformCommission, commP / 100);
      assert.equal(payout.netPayout, (grossP - commP - taxP) / 100);
      assert.equal((await api(sa, 'POST', '/api/v1/superadmin/finance/payouts', { hotelId: String(hotel._id), periodFrom: new Date(Date.now() - 3 * day).toISOString(), periodTo: to })).status, 409);
      assert.equal((await api(sa, 'POST', '/api/v1/superadmin/finance/payouts', { hotelId: 'zzz', periodFrom: from, periodTo: to })).status, 400);
      assert.equal((await api(sa, 'POST', '/api/v1/superadmin/finance/payouts', { hotelId: String(hotel._id), periodFrom: to, periodTo: from })).status, 400);
      assert.equal((await api(sa, 'PUT', `/api/v1/superadmin/finance/payouts/${payout._id}/status`, { status: 'processing' })).status, 200);
      const paid = await Promise.all([sa, sa2].map((u) => api(u, 'PUT', `/api/v1/superadmin/finance/payouts/${payout._id}/status`, { status: 'completed', transactionRef: 'REF-1' })));
      assert.deepEqual(paid.map((r) => r.status).sort(), [200, 409], 'concurrent mark-paid succeeds once');
      assert.equal((await api(sa, 'PUT', `/api/v1/superadmin/finance/payouts/${payout._id}/status`, { status: 'pending' })).status, 400);

      // Refunds: validated amounts and enforced transitions.
      const refund = await Refund.create({ booking: bookings[0]._id, hotel: hotel._id, guest: guest._id, amount: 100, reason: 'other' });
      assert.equal((await api(sa, 'PUT', `/api/v1/superadmin/finance/refunds/${refund._id}/status`, { status: 'processed' })).status, 400);
      assert.equal((await api(sa, 'PUT', `/api/v1/superadmin/finance/refunds/${refund._id}/status`, { status: 'banana' })).status, 400);
      assert.equal((await api(sa, 'PUT', `/api/v1/superadmin/finance/refunds/${refund._id}/status`, { status: 'approved' })).status, 200);
      assert.equal((await api(sa, 'POST', '/api/v1/superadmin/finance/refunds', { bookingId: String(bookings[1]._id), amount: -5, reason: 'other' })).status, 400);
      assert.equal((await api(sa, 'POST', '/api/v1/superadmin/finance/refunds', { bookingId: String(bookings[1]._id), amount: 'abc', reason: 'other' })).status, 400);

      // Settings: whitelist, ranges, audit trail.
      assert.equal((await api(sa, 'PUT', '/api/v1/superadmin/system/settings', { globalCommissionRate: 500 })).status, 400);
      assert.equal((await api(sa, 'PUT', '/api/v1/superadmin/system/maintenance', { enabled: 'yes' })).status, 400);
      await api(sa, 'PUT', '/api/v1/superadmin/system/settings', { currency: 'NRS', maintenanceMode: true, khaltiConfig: { secretKey: 'pwned' } });
      const settings = await api(sa, 'GET', '/api/v1/superadmin/system/settings');
      assert.equal(settings.data.data.maintenanceMode, false, 'maintenance only via its own endpoint');
      assert.equal(settings.data.data.khaltiConfig?.secretKey, undefined);
      assert.ok(await AuditLog.exists({ action: 'update_platform_settings' }), 'settings changes are audit-logged');
      assert.equal((await api(sa, 'PUT', '/api/v1/superadmin/system/maintenance', { enabled: false })).status, 200);
      assert.ok(await AuditLog.exists({ action: 'disable_maintenance_mode' }));

      // CMS: links that leave the site or run script are refused.
      const banner = { title: 'QA', subtitle: 'x', ctaText: 'Go' };
      const good = await api(sa, 'POST', '/api/v1/content/hero-banners', { ...banner, ctaLink: '/hotels', createdBy: String(guest._id) });
      assert.equal(good.status, 201);
      assert.equal(String(good.data.data.createdBy), String(sa._id), 'createdBy is server-owned');
      for (const ctaLink of ['//evil.example', 'javascript:alert(1)', '/\\evil.example']) {
        assert.equal((await api(sa, 'POST', '/api/v1/content/hero-banners', { ...banner, ctaLink })).status, 400, ctaLink);
      }
      assert.equal((await api(admin, 'POST', '/api/v1/content/hero-banners', { ...banner, ctaLink: '/' })).status, 403);
      assert.equal((await api(sa, 'POST', '/api/v1/content/footer', { quickLinks: [{ label: 'x', href: 'javascript:alert(1)' }] })).status, 400);
    } finally {
      if (server) await new Promise((r) => server.close(r));
      process.env.JWT_ACCESS_SECRET = previous.a;
      if (previous.a === undefined) delete process.env.JWT_ACCESS_SECRET;
    }
  });
});
