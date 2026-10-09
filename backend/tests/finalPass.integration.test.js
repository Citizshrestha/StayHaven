import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

// QA session 01 final pass: kitchen order fields/filters, hotel moderation
// (reason, audit, escaped email, no owner secrets), string audit ids, and the
// reception invoice not adding tax on top of the quoted total.
test('final platform pass: orders, hotel moderation, audit ids, reception invoice', { timeout: 600000 }, async (t) => {
  await withEphemeralWalletDatabase(async () => {
    const { User } = await import('../models/user.schema.js');
    const { Hotel } = await import('../models/hotel.schema.js');
    const { Order } = await import('../models/order.schema.js');
    const { AuditLog } = await import('../models/auditLog.model.js');
    const { logAudit } = await import('../middleware/auditLogger.js');
    const { transporter } = await import('../config/nodemailer.js');
    const orders = await import('../controllers/orderController.js');
    const hotels = await import('../controllers/hotelController.js');
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

    // Never talk to a real SMTP server from tests; capture the message instead.
    const sent = [];
    transporter.sendMail = async (options) => { sent.push(options); return { messageId: 'test' }; };

    const call = (handler, req) => new Promise((resolve) => {
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { resolve({ status: this.statusCode, body: JSON.parse(JSON.stringify(body)) }); return this; },
      };
      handler({ params: {}, query: {}, body: {}, get: () => 'test', ip: '127.0.0.1', ...req }, res,
        (err) => resolve({ status: err?.status || err?.statusCode || 500, body: { message: err?.message } }));
    });

    const company = new mongoose.Types.ObjectId();
    const owner = await User.create({ fullname: '<b>Owner</b>', username: 'final-owner', email: 'owner@final.test', password: 'isolated-tests-only',
      companyRole: 'owner', company, isActive: true });
    // Superadmin is a Role (not a companyRole); handlers only read these fields.
    const superadmin = { _id: new mongoose.Types.ObjectId(), email: 'super@final.test', role: { name: 'superadmin' } };
    const hotel = await Hotel.create({ name: '<img src=x onerror=alert(1)>', company, owner: owner._id, description: 'fixture', category: 'Hotel', starRating: 3,
      location: { city: 'Kathmandu', address: 'x' }, contact: { phone: '9800000000', email: 'h@final.test' },
      images: ['https://final-tests.invalid/h.jpg'], priceRange: { min: 1, max: 2 }, status: 'pending', isActive: true });
    owner.assignedProperties = [hotel._id];
    await owner.save();
    const chief = await User.create({ fullname: 'Chef', username: 'final-chief', email: 'chief@final.test', password: 'isolated-tests-only',
      companyRole: 'chief', company, assignedProperties: [hotel._id], isActive: true });

    await t.test('kitchen: active-status filter and preparing/ready timestamps (REQ-kitchen-3/4)', async () => {
      const make = (status, minutesAgo) => Order.create({ hotel: hotel._id, orderType: 'takeaway', customerName: 'Asha', notes: 'Allergy: NO PEANUTS',
        items: [{ name: 'Momo', quantity: 1, price: 100 }], totalPrice: 100, status, createdAt: new Date(Date.now() - minutesAgo * 60000) });
      const oldPreparing = await make('preparing', 600);
      await make('delivered', 5);
      await make('cancelled', 4);
      const pending = await make('pending', 1);
      const active = await call(orders.getOrders, { user: chief, query: { hotelId: String(hotel._id), status: 'pending,confirmed,preparing,ready' } });
      assert.equal(active.status, 200);
      assert.deepEqual(active.body.orders.map((o) => o.status).sort(), ['pending', 'preparing']);
      assert.ok(active.body.orders.some((o) => o._id === String(oldPreparing._id)));
      assert.equal(active.body.orders[0].notes, 'Allergy: NO PEANUTS');
      const bad = await call(orders.getOrders, { user: chief, query: { hotelId: String(hotel._id), status: 'pending,$where' } });
      assert.equal(bad.status, 400);
      const single = await call(orders.getOrders, { user: chief, query: { hotelId: String(hotel._id), status: 'delivered' } });
      assert.equal(single.body.orders.length, 1);

      const move = (status) => call(orders.updateOrderStatus, { user: chief, params: { orderId: String(pending._id) }, body: { status } });
      assert.equal((await move('preparing')).status, 200);
      assert.equal((await move('ready')).status, 200);
      const stored = await Order.findById(pending._id).lean();
      assert.ok(stored.startedPreparingAt instanceof Date);
      assert.ok(stored.readyAt instanceof Date);
      assert.ok(stored.readyAt >= stored.startedPreparingAt);
    });

    await t.test('hotel rejection keeps the reason, audits, escapes email and hides owner secrets (REQ-superadmin-2/3)', async () => {
      const rejected = await call(hotels.updateHotelStatus, { user: superadmin, params: { id: String(hotel._id) },
        body: { status: 'rejected', reason: '<script>alert(1)</script> missing licence' } });
      assert.equal(rejected.status, 200, rejected.body.message);
      assert.equal(rejected.body.hotel.statusReason, '<script>alert(1)</script> missing licence');
      assert.ok(rejected.body.hotel.statusChangedAt);
      assert.equal(rejected.body.hotel.owner.password, undefined, 'owner password hash must not be returned');
      assert.equal(rejected.body.hotel.owner.email, 'owner@final.test');
      const mail = sent.at(-1);
      assert.ok(mail, 'owner notified');
      assert.ok(!mail.html.includes('<img src=x'), 'hotel name escaped');
      assert.ok(!mail.html.includes('<script>'), 'reason escaped');
      assert.ok(!mail.html.includes('<b>Owner</b>'), 'owner name escaped');
      assert.ok(mail.html.includes('&lt;script&gt;'));
      const audit = await AuditLog.findOne({ action: 'reject_hotel' }).lean();
      assert.equal(String(audit.resourceId), String(hotel._id));
      assert.equal(audit.after.status, 'rejected');

      const nonText = await call(hotels.updateHotelStatus, { user: superadmin, params: { id: String(hotel._id) }, body: { status: 'rejected', reason: { $gt: '' } } });
      assert.equal(nonText.status, 400);

      const approved = await call(hotels.updateHotelStatus, { user: superadmin, params: { id: String(hotel._id) }, body: { status: 'approved' } });
      assert.equal(approved.status, 200);
      assert.equal(approved.body.hotel.statusReason, undefined, 'approval clears the old rejection reason');
      assert.ok(await AuditLog.exists({ action: 'approve_hotel' }));
    });

    await t.test('guest tokens cannot list tables or rooms (REQ-guest-6)', async () => {
      const tables = await import('../controllers/hotelTableController.js');
      const rooms = await import('../controllers/roomController.js');
      const guestUser = { _id: new mongoose.Types.ObjectId(), role: { name: 'guest' } };
      assert.equal((await call(tables.getTables, { user: guestUser, query: { hotelId: String(hotel._id) } })).status, 403);
      assert.equal((await call(rooms.getRooms, { user: guestUser, query: { hotelId: String(hotel._id) } })).status, 403);
      assert.equal((await call(tables.getTables, { user: chief, query: { hotelId: String(hotel._id) } })).status, 200);
    });

    await t.test('audit entries keyed by a string id are stored (REQ-superadmin-4)', async () => {
      await logAudit(superadmin._id, 'update_platform_settings', 'platformSettings', 'singleton', null, { maintenance: false }, { user: superadmin, get: () => 'test' });
      const entry = await AuditLog.findOne({ action: 'update_platform_settings' }).lean();
      assert.ok(entry, 'string resourceId no longer fails validation');
      assert.equal(entry.resourceId, 'singleton');
    });

    await t.test('reception payment invoice uses the quoted total, no extra 13% (REQ-public-7)', async () => {
      const { Booking } = await import('../models/booking.schema.js');
      const { Room } = await import('../models/room.schema.js');
      const { Guest } = await import('../models/guest.schema.js');
      const { Invoice } = await import('../models/invoice.schema.js');
      const payments = await import('../controllers/paymentController.js');
      const receptionist = await User.create({ fullname: 'Desk', username: 'final-desk', email: 'desk@final.test', password: 'isolated-tests-only',
        companyRole: 'receptionist', company, assignedProperties: [hotel._id], isActive: true });
      const room = await Room.create({ hotel: hotel._id, company, roomName: 'Double', roomNumber: '201', type: 'double',
        price: 1000, status: 'available', capacity: { adults: 2, children: 0 }, maxGuests: 2 });
      const guest = await Guest.create({ hotel: hotel._id, company, fullName: 'Walk In' });
      const day = (n) => new Date(Date.now() + n * 86400000);
      const booking = await Booking.create({ user: owner._id, guest: guest._id, hotel: hotel._id, company, room: room._id, guests: { adults: 1 },
        checkIn: day(1), checkOut: day(3), totalAmount: 2240, status: 'Confirmed', paymentStatus: 'unpaid',
        priceBreakdown: { subtotalPaisa: 200000, taxPaisa: 24000, totalPaisa: 224000, taxRate: 12 } });
      const paid = await call(payments.confirmPayment, { user: receptionist, body: { bookingId: String(booking._id), amount: 2240, method: 'cash' } });
      assert.equal(paid.status, 200, paid.body.message);
      const invoice = await Invoice.findOne({ booking: booking._id }).lean();
      assert.equal(invoice.charges.total, 2240);
      assert.equal(invoice.charges.room, 2000);
      assert.equal(invoice.charges.tax, 240);
      assert.equal(invoice.balance, 0);
      assert.equal(invoice.status, 'paid');
      assert.equal(paid.body.data.remainingBalance, 0);
    });
  });
});
