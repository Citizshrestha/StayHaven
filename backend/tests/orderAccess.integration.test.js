import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

// QA session 01 regressions for the shared orders core: per-hotel scope for
// floor staff, owner tenancy, per-role status transitions, same-status no-op,
// literal search, safe paging, cancel error propagation and bill escaping.
test('orders core: tenancy, transitions and input hardening', { timeout: 600000 }, async () => {
  await withEphemeralWalletDatabase(async () => {
    const { User } = await import('../models/user.schema.js');
    const { Hotel } = await import('../models/hotel.schema.js');
    const { Order } = await import('../models/order.schema.js');
    const staff = await import('../controllers/orderController.js');
    const { generateBillEmailHTML } = await import('../services/notificationService.js');
    const { searchRegex, parsePaging } = await import('../utils/searchQuery.js');

    const call = (handler, req) => new Promise((resolve, reject) => {
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { resolve({ status: this.statusCode, body }); return this; },
      };
      handler({ params: {}, query: {}, body: {}, get: () => 'test', ip: '127.0.0.1', ...req }, res, (err) => {
        if (err) resolve({ status: err.statusCode || err.status || (err.name === 'CastError' ? 404 : 500), body: { message: err.message }, error: err });
        else reject(new Error('next() without error'));
      });
    });

    const companyA = new mongoose.Types.ObjectId();
    const companyB = new mongoose.Types.ObjectId();
    let seq = 0;
    const person = (role, company, hotels, extra = {}) => User.create({
      fullname: `${role} ${++seq}`, username: `${role}-${seq}`, email: `${role}-${seq}@orders.test`, password: 'isolated-tests-only',
      companyRole: role, company, assignedProperties: hotels, isActive: true, ...extra,
    });
    const ownerA = await person('owner', companyA, []);
    const base = { description: 'fixture', category: 'Hotel', starRating: 3, location: { city: 'Kathmandu', address: 'x' },
      contact: { phone: '9800000000', email: 'h@orders.test' }, images: ['https://orders-tests.invalid/h.jpg'],
      priceRange: { min: 1, max: 2 }, status: 'approved', isActive: true };
    const a1 = await Hotel.create({ ...base, name: 'A1', company: companyA, owner: ownerA._id, restaurantBilling: { taxRate: 10, serviceChargeRate: 5 } });
    const a2 = await Hotel.create({ ...base, name: 'A2', company: companyA, owner: ownerA._id });
    const b1 = await Hotel.create({ ...base, name: 'B1', company: companyB, owner: new mongoose.Types.ObjectId() });
    ownerA.assignedProperties = [a1._id, a2._id];
    await ownerA.save();
    const waiterA1 = await person('waiter', companyA, [a1._id]);
    const chiefA1 = await person('chief', companyA, [a1._id]);
    const managerA1 = await person('manager', companyA, [a1._id]);
    const ownerB = await person('owner', companyB, [b1._id]);

    const order = (hotel, extra = {}) => Order.create({ hotel: hotel._id, orderType: 'takeaway', customerName: 'Asha',
      items: [{ name: 'Momo', quantity: 2, price: 100 }], totalPrice: 200, status: 'pending', ...extra });
    const oA1 = await order(a1);
    const oA2 = await order(a2);
    const oB1 = await order(b1);

    // Floor staff only see their assigned hotel; owners only their company.
    assert.equal((await call(staff.getOrders, { user: waiterA1, query: { hotelId: String(a1._id) } })).status, 200);
    assert.equal((await call(staff.getOrders, { user: waiterA1, query: { hotelId: String(a2._id) } })).status, 403, 'same-company other hotel');
    assert.equal((await call(staff.getOrders, { user: managerA1, query: { hotelId: String(a2._id) } })).status, 403);
    assert.equal((await call(staff.getOrders, { user: ownerA, query: { hotelId: String(a2._id) } })).status, 200);
    assert.equal((await call(staff.getOrders, { user: ownerB, query: { hotelId: String(a1._id) } })).status, 403, 'owner of another company');
    assert.equal((await call(staff.getOrderById, { user: waiterA1, params: { orderId: String(oA2._id) } })).status, 404);
    assert.equal((await call(staff.getOrderById, { user: ownerA, params: { orderId: String(oB1._id) } })).status, 404);
    assert.equal((await call(staff.updateOrderStatus, { user: waiterA1, params: { orderId: String(oA2._id) }, body: { status: 'cancelled', cancelReason: 'x' } })).status, 404);

    // Search is literal; bad paging falls back to defaults.
    const searched = await call(staff.getOrders, { user: waiterA1, query: { hotelId: String(a1._id), search: '(((', limit: 'abc', page: '-1' } });
    assert.equal(searched.status, 200);
    assert.equal(searched.body.page, 1);
    assert.equal(searched.body.limit, 100);
    assert.equal(searchRegex('a.b').test('axb'), false);
    assert.deepEqual(parsePaging({ page: ['2'], limit: '9999' }), { page: 1, limit: 200, skip: 0 });

    // Per-role transitions: waiter cannot skip the kitchen; chief cannot serve.
    const move = (user, o, status, cancelReason) => call(staff.updateOrderStatus, { user, params: { orderId: String(o._id) }, body: { status, cancelReason } });
    assert.equal((await move(waiterA1, oA1, 'delivered')).status, 403);
    assert.equal((await move(waiterA1, oA1, 'preparing')).status, 403);
    assert.equal((await move(chiefA1, oA1, 'preparing')).status, 200);
    const same = await move(chiefA1, oA1, 'preparing');
    assert.equal(same.status, 200);
    assert.equal(same.body.unchanged, true);
    assert.equal((await move(chiefA1, oA1, 'delivered')).status, 403);
    assert.equal((await move(chiefA1, oA1, 'ready')).status, 200);
    assert.equal((await move(waiterA1, oA1, 'delivered')).status, 200);
    assert.deepEqual(staff.allowedNextStatuses('manager', 'pending'), ['confirmed', 'preparing', 'ready', 'delivered']);

    // Cancel: non-string reason → 400; bad id → 404 through next(), never an unhandled rejection.
    const oA1b = await order(a1);
    assert.equal((await call(staff.cancelOrder, { user: managerA1, params: { orderId: String(oA1b._id) }, body: { reason: { $gt: '' } } })).status, 400);
    assert.equal((await call(staff.cancelOrder, { user: managerA1, params: { orderId: 'not-an-id' }, body: { reason: 'Guest left' } })).status, 404);
    assert.equal((await call(staff.cancelOrder, { user: managerA1, params: { orderId: String(oA1b._id) }, body: { reason: 'Guest left' } })).status, 200);

    // Bill email escapes user-controlled text and shows the configured VAT.
    const html = generateBillEmailHTML({ orderNumber: 1, hotelName: '<b>H</b>', hotelAddress: '', hotelPhone: '', location: 'Table 1',
      customerName: '<img src=x onerror=alert(1)>', items: [{ name: '<script>x</script>', quantity: 1, price: 1, total: 1 }],
      subtotal: 1, tax: 0.1, taxRate: 10, total: 1.1, date: new Date() });
    assert.ok(!html.includes('<img src=x'));
    assert.ok(!html.includes('<script>x'));
    assert.ok(html.includes('VAT (10%)'));
  });
});
