import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

// Walk-in dining end to end: QR table orders, staff dine-in + takeaway,
// tabs, split payments, closing, table lifecycle and tenant isolation.
// Runs against an isolated in-memory replica set (see ephemeralWalletDatabase.js).
test('restaurant tabs against an owned ephemeral replica set', { timeout: 600000 }, async t => {
  await withEphemeralWalletDatabase(async db => {
    const { User } = await import('../models/user.schema.js');
    const { Hotel } = await import('../models/hotel.schema.js');
    const { HotelTable } = await import('../models/hotelTable.schema.js');
    const { MenuItem } = await import('../models/menuItem.schema.js');
    const { Order } = await import('../models/order.schema.js');
    const { DiningSession } = await import('../models/diningSession.schema.js');
    const { PaymentTransaction } = await import('../models/paymentTransaction.schema.js');
    const guest = await import('../controllers/guestController.js');
    const staff = await import('../controllers/orderController.js');
    const dining = await import('../controllers/diningController.js');
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));

    // Calls an asyncHandler-wrapped controller and returns { status, body }.
    const call = (handler, req) => new Promise((resolve, reject) => {
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { resolve({ status: this.statusCode, body }); return this; },
      };
      handler({ params: {}, query: {}, body: {}, get: () => 'test', ip: '127.0.0.1', ...req }, res, err => {
        if (err) resolve({ status: err.statusCode || err.status || 500, body: { success: false, message: err.message } });
        else reject(new Error('next() called without error'));
      });
    });

    let keySeq = 0;
    const key = (p = 'k') => `${p}-${Date.now()}-${++keySeq}-abcdefgh`;

    async function fixtures() {
      const company = new mongoose.Types.ObjectId();
      const owner = await User.create({ fullname: 'Owner', username: `owner${keySeq}`, email: `owner${keySeq}@x.test`, password: 'isolated-tests-only' });
      const hotelBase = {
        company, owner: owner._id, description: 'fixture', category: 'Hotel', starRating: 3,
        location: { city: 'Kathmandu', address: 'Test Street' }, contact: { phone: '9800000000', email: 'h@x.test' },
        images: ['https://tests.invalid/h.jpg'], priceRange: { min: 1, max: 2 }, status: 'approved', isActive: true,
      };
      const hotel = await Hotel.create({ ...hotelBase, name: 'Tab Hotel', restaurantBilling: { taxRate: 13, serviceChargeRate: 10 } });
      const otherHotel = await Hotel.create({ ...hotelBase, name: 'Other Hotel', company: new mongoose.Types.ObjectId() });
      const table = await HotelTable.create({ hotel: hotel._id, company, tableNumber: '5' });
      const table2 = await HotelTable.create({ hotel: hotel._id, company, tableNumber: '6' });
      const momo = await MenuItem.create({ hotel: hotel._id, name: 'Momo', category: 'Snacks', price: 300 });
      const tea = await MenuItem.create({ hotel: hotel._id, name: 'Tea', category: 'Drinks', price: 100 });
      const foreign = await MenuItem.create({ hotel: otherHotel._id, name: 'Cheap', category: 'Snacks', price: 1 });
      const mkStaff = (role, name) => User.create({
        fullname: name, username: `${role}${keySeq}${name}`, email: `${role}${keySeq}${name}@x.test`, password: 'isolated-tests-only',
        companyRole: role, company, assignedProperties: [hotel._id], isActive: true,
      });
      const waiter = await mkStaff('waiter', 'Wendy');
      const manager = await mkStaff('manager', 'Mona');
      const chef = await mkStaff('chief', 'Chef');
      const outsider = await User.create({
        fullname: 'Outsider', username: `out${keySeq}`, email: `out${keySeq}@x.test`, password: 'isolated-tests-only',
        companyRole: 'waiter', company: otherHotel.company, assignedProperties: [otherHotel._id], isActive: true,
      });
      return { hotel, otherHotel, table, table2, momo, tea, foreign, waiter, manager, chef, outsider };
    }

    const scenario = (name, run) => t.test(name, async () => {
      await db.reset();
      await run(await fixtures());
    });

    const qrOrder = (f, device, items, extra = {}) => call(guest.createGuestOrder, { body: {
      hotelId: String(f.hotel._id), tableToken: f.table.uniqueToken, orderType: 'dineIn',
      customerName: 'Asha', guestSessionId: device, idempotencyKey: key('qr'), items, ...extra,
    } });
    const setStatus = (f, orderId, status, user = f.chef, cancelReason) =>
      call(staff.updateOrderStatus, { params: { orderId: String(orderId) }, body: { status, cancelReason }, user });
    const pay = (f, sessionId, body, user = f.waiter) =>
      call(dining.postPayment, { params: { id: String(sessionId) }, body: { idempotencyKey: key('pay'), ...body }, user });
    const DEV_A = 'GUEST-11111111-1111-1111-1111-111111111111';
    const DEV_B = 'GUEST-22222222-2222-2222-2222-222222222222';

    await scenario('QR orders from two phones share one tab; the table becomes occupied', async f => {
      const first = await qrOrder(f, DEV_A, [{ menuItem: String(f.momo._id), quantity: 2 }]);
      assert.equal(first.status, 201, first.body.message);
      const second = await qrOrder(f, DEV_B, [{ menuItem: String(f.tea._id), quantity: 1 }]);
      assert.equal(second.status, 201);

      const tabs = await DiningSession.find({ table: f.table._id });
      assert.equal(tabs.length, 1);
      assert.deepEqual([...tabs[0].guestSessionIds].sort(), [DEV_A, DEV_B]);
      const orders = await Order.find({ session: tabs[0]._id });
      assert.equal(orders.length, 2);
      assert.ok(orders.every(o => String(o.table) === String(f.table._id)));
      assert.equal((await HotelTable.findById(f.table._id)).status, 'occupied');

      // 700 subtotal + 10% service (70) + 13% VAT on 770 (100.10) = 870.10
      const tab = await call(guest.getTableTab, { params: { token: f.table.uniqueToken }, query: { guestSessionId: DEV_B } });
      assert.equal(tab.body.data.active, true);
      assert.equal(tab.body.data.tab.totals.total, 870.1);
      assert.equal(tab.body.data.tab.orders.length, 2);
    });

    await scenario('concurrent first orders on an empty table converge on one tab', async f => {
      const results = await Promise.all([0, 1, 2, 3, 4].map(i =>
        qrOrder(f, `GUEST-3333333${i}-3333-3333-3333-333333333333`, [{ menuItem: String(f.tea._id), quantity: 1 }])));
      assert.ok(results.every(r => r.status === 201), JSON.stringify(results.map(r => r.body.message)));
      assert.equal(await DiningSession.countDocuments({ table: f.table._id, isActive: true }), 1);
      assert.equal(await Order.countDocuments({ table: f.table._id, session: { $exists: true } }), 5);
    });

    await scenario('a device that did not order cannot read the tab; priority cannot be forced', async f => {
      await qrOrder(f, DEV_A, [{ menuItem: String(f.momo._id), quantity: 1 }], { priority: 'high' });
      const stranger = await call(guest.getTableTab, { params: { token: f.table.uniqueToken }, query: { guestSessionId: DEV_B } });
      assert.equal(stranger.body.data.active, false);
      assert.equal(stranger.body.data.tab, undefined);
      assert.equal((await Order.findOne({ table: f.table._id })).priority, 'normal');
    });

    await scenario('split payment with cash change, idempotent retry, no overpayment, close frees the table', async f => {
      const o1 = await qrOrder(f, DEV_A, [{ menuItem: String(f.momo._id), quantity: 2 }]);
      const staffOrder = await call(staff.createOrder, { user: f.waiter, body: {
        hotelId: String(f.hotel._id), orderType: 'dineIn', tableId: String(f.table._id),
        items: [{ menuItem: String(f.tea._id), quantity: 1 }], idempotencyKey: key('staff'),
      } });
      assert.equal(staffOrder.status, 201, staffOrder.body.message);
      const tab = await DiningSession.findOne({ table: f.table._id, isActive: true });
      assert.equal(String(staffOrder.body.order.session), String(tab._id));

      // Kitchen still working → cannot close.
      const early = await call(dining.postClose, { params: { id: String(tab._id) }, user: f.waiter });
      assert.equal(early.status, 409);

      const over = await pay(f, tab._id, { method: 'card', amount: 5000, reference: 'CARD1234' });
      assert.equal(over.status, 400);

      const cardKey = key('card');
      const card = await pay(f, tab._id, { method: 'card', amount: 500, idempotencyKey: cardKey });
      assert.equal(card.status, 201, card.body.message);
      const retry = await pay(f, tab._id, { method: 'card', amount: 500, idempotencyKey: cardKey });
      assert.equal(retry.body.data.duplicate, true);
      assert.equal(await PaymentTransaction.countDocuments({ diningSession: tab._id }), 1);

      const wallet = await pay(f, tab._id, { method: 'esewa', amount: 10 });
      assert.equal(wallet.status, 400, 'wallet payments need a reference');

      // Balance 870.10 − 500 = 370.10; customer hands over 500 cash.
      const cash = await pay(f, tab._id, { method: 'cash', tendered: 500 });
      assert.equal(cash.status, 201, cash.body.message);
      assert.equal(cash.body.data.payment.amount, 370.1);
      assert.equal(cash.body.data.payment.change, 129.9);
      assert.equal(cash.body.data.session.status, 'open', 'kitchen orders still open, so not auto-closed');

      for (const id of [o1.body.order._id, staffOrder.body.order._id]) {
        for (const s of ['confirmed', 'preparing', 'ready']) assert.equal((await setStatus(f, id, s)).status, 200);
      }
      const closed = await call(dining.postClose, { params: { id: String(tab._id) }, user: f.waiter });
      assert.equal(closed.status, 200, closed.body.message);
      assert.equal(closed.body.data.session.status, 'closed');
      assert.equal(closed.body.data.session.receiptNumber, 1);
      const settled = await Order.find({ session: tab._id });
      assert.ok(settled.every(o => o.paymentStatus === 'paid' && o.status === 'delivered'));
      assert.equal((await HotelTable.findById(f.table._id)).status, 'available');
      assert.equal(await PaymentTransaction.countDocuments({ diningSession: tab._id, status: 'captured' }), 2);

      // Closing again is a no-op; the first device now sees "settled".
      assert.equal((await call(dining.postClose, { params: { id: String(tab._id) }, user: f.waiter })).status, 200);
      const after = await call(guest.getTableTab, { params: { token: f.table.uniqueToken }, query: { guestSessionId: DEV_A } });
      assert.equal(after.body.data.active, false);
      assert.equal(after.body.data.lastClosed.receiptNumber, 1);

      // The next party starts a fresh tab and never sees the previous bill.
      await qrOrder(f, DEV_B, [{ menuItem: String(f.tea._id), quantity: 1 }]);
      const next = await DiningSession.findOne({ table: f.table._id, isActive: true });
      assert.notEqual(String(next._id), String(tab._id));
      assert.equal(next.totals.orderCount, 1);

      const report = await call(dining.getReport, { query: { hotelId: String(f.hotel._id) }, user: f.manager });
      assert.equal(report.body.data.tabs, 1);
      assert.equal(report.body.data.total, 870.1);
      assert.equal(report.body.data.open.count, 1);
    });

    await scenario('paying the full balance on a served tab closes it automatically', async f => {
      const o = await qrOrder(f, DEV_A, [{ menuItem: String(f.tea._id), quantity: 1 }]);
      await setStatus(f, o.body.order._id, 'ready');
      const tab = await DiningSession.findOne({ table: f.table._id, isActive: true });
      const res = await pay(f, tab._id, { method: 'khalti', reference: 'KHALTI-TXN-1' });
      assert.equal(res.status, 201, res.body.message);
      assert.equal(res.body.data.session.status, 'closed');
    });

    await scenario('takeaway needs a name and settles on its own tab', async f => {
      const nameless = await call(staff.createOrder, { user: f.waiter, body: {
        hotelId: String(f.hotel._id), orderType: 'takeaway', items: [{ menuItem: String(f.momo._id), quantity: 1 }],
      } });
      assert.equal(nameless.status, 400);
      const res = await call(staff.createOrder, { user: f.waiter, body: {
        hotelId: String(f.hotel._id), orderType: 'takeaway', customerName: 'Bikash', customerPhone: '9812345678',
        items: [{ menuItem: String(f.momo._id), quantity: 1 }],
      } });
      assert.equal(res.status, 201, res.body.message);
      const tab = await DiningSession.findById(res.body.order.session);
      assert.equal(tab.type, 'takeaway');
      assert.equal(tab.customerName, 'Bikash');
      const legacy = await call(staff.confirmPayment, { params: { orderId: String(res.body.order._id) }, body: { paymentMethod: 'cash' }, user: f.waiter });
      assert.equal(legacy.status, 409, 'tab orders cannot be paid one-by-one');
    });

    await scenario('staff pricing and tenant isolation', async f => {
      const base = { hotelId: String(f.hotel._id), orderType: 'dineIn', tableId: String(f.table._id) };
      const foreign = await call(staff.createOrder, { user: f.waiter, body: { ...base, items: [{ menuItem: String(f.foreign._id), quantity: 1 }] } });
      assert.equal(foreign.status, 404, "another hotel's menu item must not be accepted");
      const custom = await call(staff.createOrder, { user: f.waiter, body: { ...base, items: [{ name: 'Free lunch', price: 0, quantity: 1 }] } });
      assert.equal(custom.status, 403);
      const managerCustom = await call(staff.createOrder, { user: f.manager, body: { ...base, items: [{ name: 'Cake', price: 800, quantity: 1 }] } });
      assert.equal(managerCustom.status, 201, managerCustom.body.message);

      const phantom = await call(staff.createOrder, { user: f.waiter, body: {
        hotelId: String(f.hotel._id), orderType: 'dineIn', tableNumber: '99', items: [{ menuItem: String(f.tea._id), quantity: 1 }],
      } });
      assert.equal(phantom.status, 400, 'unknown table numbers are rejected once tables exist');

      // Editing cannot re-price a menu line.
      const edit = await call(staff.updateOrder, { user: f.waiter, params: { orderId: String(managerCustom.body.order._id) },
        body: { items: [{ menuItem: String(f.momo._id), name: 'Momo', price: 1, quantity: 2 }] } });
      assert.equal(edit.status, 200, edit.body.message);
      assert.equal(edit.body.order.totalPrice, 600);

      const tabId = String(managerCustom.body.order.session);
      const outsider = await call(dining.getSession, { params: { id: tabId }, user: f.outsider });
      assert.equal(outsider.status, 403);
      const outsiderStatus = await setStatus(f, managerCustom.body.order._id, 'confirmed', f.outsider);
      assert.equal(outsiderStatus.status, 404);

      // The public tracking endpoint never returns staff orders.
      const leak = await call(guest.getGuestOrderStatus, { params: { orderId: String(managerCustom.body.order._id) }, query: {} });
      assert.equal(leak.status, 404);
    });

    await scenario('discount, transfer, cancel-after-payment guard and void', async f => {
      const o = await qrOrder(f, DEV_A, [{ menuItem: String(f.momo._id), quantity: 2 }]);
      const tab = await DiningSession.findOne({ table: f.table._id, isActive: true });

      const waiterDiscount = await call(dining.postDiscount, { params: { id: String(tab._id) }, body: { kind: 'percent', value: 10, reason: 'Regular' }, user: f.waiter });
      assert.equal(waiterDiscount.status, 200, 'route guard restricts discounts; the controller alone still validates');
      const noReason = await call(dining.postDiscount, { params: { id: String(tab._id) }, body: { kind: 'percent', value: 10 }, user: f.manager });
      assert.equal(noReason.status, 400);

      const moved = await call(dining.postTransfer, { params: { id: String(tab._id) }, body: { tableId: String(f.table2._id) }, user: f.waiter });
      assert.equal(moved.status, 200, moved.body.message);
      assert.equal(moved.body.data.session.tableNumber, '6');
      assert.equal((await HotelTable.findById(f.table._id)).status, 'available');
      assert.equal((await HotelTable.findById(f.table2._id)).status, 'occupied');
      assert.equal((await Order.findById(o.body.order._id)).tableNumber, '6');

      const paid = await pay(f, tab._id, { method: 'cash', amount: 200 });
      assert.equal(paid.status, 201);
      const cancel = await setStatus(f, o.body.order._id, 'cancelled', f.manager, 'Guest left');
      assert.equal(cancel.status, 409, 'cannot cancel below what was already collected');
      const voidPaid = await call(dining.postVoid, { params: { id: String(tab._id) }, body: { reason: 'Mistake' }, user: f.manager });
      assert.equal(voidPaid.status, 409);

      // A separate unpaid tab can be voided once its orders are cancelled.
      const o2 = await qrOrder(f, DEV_B, [{ menuItem: String(f.tea._id), quantity: 1 }]);
      const tab2 = await DiningSession.findOne({ table: f.table._id, isActive: true });
      assert.equal((await call(dining.postVoid, { params: { id: String(tab2._id) }, body: { reason: 'Walked out' }, user: f.manager })).status, 409);
      assert.equal((await setStatus(f, o2.body.order._id, 'cancelled', f.manager, 'Walked out')).status, 200);
      const voided = await call(dining.postVoid, { params: { id: String(tab2._id) }, body: { reason: 'Walked out' }, user: f.manager });
      assert.equal(voided.status, 200, voided.body.message);
      assert.equal(voided.body.data.session.status, 'void');
      assert.equal((await HotelTable.findById(f.table._id)).status, 'available');
    });

    const refund = (f, sessionId, body, user = f.manager) =>
      call(dining.postRefund, { params: { id: String(sessionId) }, body: { idempotencyKey: key('rf'), reason: 'Kitchen ran out', ...body }, user });

    await scenario('refund on an open tab unblocks cancelling a paid order, then the tab can be voided', async f => {
      const o = await qrOrder(f, DEV_A, [{ menuItem: String(f.momo._id), quantity: 2 }]);
      const tab = await DiningSession.findOne({ table: f.table._id, isActive: true });
      // 600 + 10% service (60) + 13% VAT on 660 (85.80) = 745.80
      const paid = await pay(f, tab._id, { method: 'cash', tendered: 1000 });
      assert.equal(paid.status, 201, paid.body.message);
      assert.equal(paid.body.data.payment.amount, 745.8);
      assert.equal((await setStatus(f, o.body.order._id, 'cancelled', f.manager, 'Out of stock')).status, 409);

      const noReason = await refund(f, tab._id, { paymentId: String(paid.body.data.payment._id), reason: '' });
      assert.equal(noReason.status, 400);
      const tooMuch = await refund(f, tab._id, { paymentId: String(paid.body.data.payment._id), amount: 9999 });
      assert.equal(tooMuch.status, 400);

      const rfKey = key('rf');
      const full = await refund(f, tab._id, { paymentId: String(paid.body.data.payment._id), idempotencyKey: rfKey });
      assert.equal(full.status, 201, full.body.message);
      assert.equal(full.body.data.session.totals.refunded, 745.8);
      assert.equal(full.body.data.session.totals.balance, 745.8);
      const again = await refund(f, tab._id, { paymentId: String(paid.body.data.payment._id), idempotencyKey: rfKey });
      assert.equal(again.body.data.duplicate, true);
      const exhausted = await refund(f, tab._id, { paymentId: String(paid.body.data.payment._id) });
      assert.equal(exhausted.status, 409);

      assert.equal((await setStatus(f, o.body.order._id, 'cancelled', f.manager, 'Out of stock')).status, 200);
      const voided = await call(dining.postVoid, { params: { id: String(tab._id) }, body: { reason: 'Nothing served' }, user: f.manager });
      assert.equal(voided.status, 200, voided.body.message);
      assert.equal(await PaymentTransaction.countDocuments({ diningSession: tab._id, type: 'capture' }), 1);
      assert.equal(await PaymentTransaction.countDocuments({ diningSession: tab._id, type: 'refund', status: 'refunded' }), 1);
    });

    await scenario('refund after a tab is closed keeps the receipt and is netted in the day report', async f => {
      const o = await qrOrder(f, DEV_A, [{ menuItem: String(f.tea._id), quantity: 1 }]);
      await setStatus(f, o.body.order._id, 'ready');
      const tab = await DiningSession.findOne({ table: f.table._id, isActive: true });
      const paid = await pay(f, tab._id, { method: 'khalti', reference: 'KHALTI-TXN-9' });
      assert.equal(paid.body.data.session.status, 'closed');
      const receiptTotal = paid.body.data.session.totals.total;

      const partial = await refund(f, tab._id, { paymentId: String(paid.body.data.payment._id), amount: 50, reason: 'Cold tea' });
      assert.equal(partial.status, 201, partial.body.message);
      const after = partial.body.data.session;
      assert.equal(after.status, 'closed');
      assert.equal(after.totals.total, receiptTotal, 'receipt is not re-priced');
      assert.equal(after.totals.refunded, 50);
      assert.equal(after.refunds[0].afterClose, true);
      assert.equal((await Order.findById(o.body.order._id)).paymentStatus, 'paid');

      await refund(f, tab._id, { paymentId: String(paid.body.data.payment._id), reason: 'Goodwill' });
      assert.equal((await Order.findById(o.body.order._id)).paymentStatus, 'refunded');

      const report = await call(dining.getReport, { query: { hotelId: String(f.hotel._id) }, user: f.manager });
      const khalti = report.body.data.payments.find(p => p.method === 'khalti');
      assert.equal(khalti.amount, receiptTotal);
      assert.equal(khalti.refunded, receiptTotal);
      assert.equal(khalti.net, 0);
      assert.equal(report.body.data.netCollected, 0);
      assert.equal(report.body.data.total, receiptTotal, 'sales still show the receipt');
    });

    await scenario('maintenance tables refuse QR orders; requesting the bill needs an open tab', async f => {
      const noTab = await call(guest.requestBill, { body: { tableToken: f.table.uniqueToken, hotelId: String(f.hotel._id) } });
      assert.equal(noTab.status, 409);
      await HotelTable.updateOne({ _id: f.table._id }, { status: 'maintenance' });
      const blocked = await qrOrder(f, DEV_A, [{ menuItem: String(f.tea._id), quantity: 1 }]);
      assert.equal(blocked.status, 409);
    });
  });
});
