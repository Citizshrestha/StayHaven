import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

// QA session 07 regressions for the guest QR flows and the guest portal:
// call-waiter / request-bill de-duplication and input validation, room-QR
// ordering only during a checked-in stay, portal room service only after
// check-in, phone validation, bank-transfer double submit and the legacy
// /profile endpoint's field allow-list and validation.
test('guest QR + portal: dedupe, stay rules and input hardening', { timeout: 600000 }, async () => {
  await withEphemeralWalletDatabase(async () => {
    const { User } = await import('../models/user.schema.js');
    const { Hotel } = await import('../models/hotel.schema.js');
    const { Room } = await import('../models/room.schema.js');
    const { HotelTable } = await import('../models/hotelTable.schema.js');
    const { MenuItem } = await import('../models/menuItem.schema.js');
    const { Booking } = await import('../models/booking.schema.js');
    const { Order } = await import('../models/order.schema.js');
    const { WaiterCall } = await import('../models/waitercall.schema.js');
    const qr = await import('../controllers/guestController.js');
    const portal = await import('../controllers/guestDashboardController.js');
    const profile = await import('../controllers/profileController.js');
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

    const call = (handler, req) => new Promise((resolve, reject) => {
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { resolve({ status: this.statusCode, body }); return this; },
      };
      Promise.resolve(handler({ params: {}, query: {}, body: {}, get: () => 'test', ip: '127.0.0.1', ...req }, res, (err) => {
        if (err) resolve({ status: err.statusCode || err.status || 500, body: { message: err.message } });
        else reject(new Error('next() without error'));
      })).catch(reject);
    });

    const company = new mongoose.Types.ObjectId();
    const owner = await User.create({ fullname: 'Owner', username: 'owner-q', email: 'owner@guestqr.test', password: 'isolated-tests-only', companyRole: 'owner', company });
    const hotel = await Hotel.create({ name: 'QR Hotel', description: 'fixture', category: 'Hotel', starRating: 3, owner: owner._id, company,
      location: { city: 'Kathmandu', address: 'x' }, contact: { phone: '9800000000', email: 'h@guestqr.test' }, images: ['https://guestqr.invalid/h.jpg'],
      priceRange: { min: 1, max: 2 }, status: 'approved', isActive: true });
    const hotelId = String(hotel._id);
    const table = await HotelTable.create({ hotel: hotel._id, company, tableNumber: '7', capacity: 4, isQrActive: true, isActive: true, createdBy: owner._id });
    const room = (n) => Room.create({ hotel: hotel._id, company, roomName: `R${n}`, roomNumber: n, type: 'double', price: 100, isQrActive: true });
    const inHouse = await room('101');
    const vacant = await room('102');
    const item = await MenuItem.create({ hotel: hotel._id, name: 'Tea', category: 'Drinks', price: 100, isAvailable: true });
    const guestA = await User.create({ fullname: 'Guest A', username: 'guest-a', email: 'a@guestqr.test', password: 'isolated-tests-only' });
    const guestB = await User.create({ fullname: 'Guest B', username: 'guest-b', email: 'b@guestqr.test', password: 'isolated-tests-only' });
    const day = 86400000;
    const booking = (user, rm, status, offset) => Booking.create({ user: user._id, hotel: hotel._id, company, room: rm._id, status,
      checkIn: new Date(Date.now() + offset * day), checkOut: new Date(Date.now() + (offset + 2) * day), guests: { adults: 1, children: 0 }, totalAmount: 200 });
    await booking(guestA, inHouse, 'Checked-In', -1);
    await booking(guestB, vacant, 'Confirmed', 3);

    // Call waiter: two simultaneous taps create one call; bad input is a 400, not a 500.
    const body = { tableToken: table.uniqueToken, hotelId, guestSessionId: 'GUEST-1' };
    const [c1, c2] = await Promise.all([call(qr.callWaiter, { body }), call(qr.callWaiter, { body })]);
    assert.deepEqual([c1.status, c2.status].sort(), [200, 201]);
    assert.equal(String(c1.body.callId), String(c2.body.callId));
    assert.equal(await WaiterCall.countDocuments({ requestType: 'assistance' }), 1);
    assert.equal((await call(qr.callWaiter, { body: { ...body, reason: 'x'.repeat(301) } })).status, 400);
    assert.equal((await call(qr.callWaiter, { body: { ...body, reason: { $gt: '' } } })).status, 400);
    assert.equal((await call(qr.callWaiter, { body: { ...body, hotelId: 'x' } })).status, 400);
    assert.equal((await call(qr.callWaiter, { body: { ...body, tableToken: { $ne: null } } })).status, 400);
    assert.equal((await call(qr.requestBill, { body: { ...body, guestName: ['x'] } })).status, 400);
    // A call older than the window (or already handled) lets the guest call again.
    await WaiterCall.updateMany({}, { $set: { status: 'resolved' } });
    assert.equal((await call(qr.callWaiter, { body })).status, 201);

    // Room QR: only a room with a checked-in stay can order room service.
    const roomOrder = (rm, key) => call(qr.createGuestOrder, { body: { hotelId, roomToken: rm.uniqueToken, orderType: 'roomService',
      customerName: 'Room guest', idempotencyKey: key, items: [{ menuItem: String(item._id), quantity: 1 }] } });
    assert.equal((await roomOrder(inHouse, 'idem-1')).status, 201);
    const blocked = await roomOrder(vacant, 'idem-2');
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.code, 'NO_ACTIVE_STAY');
    const info = await call(qr.getRoomByToken, { params: { token: vacant.uniqueToken } });
    assert.equal(info.body.data.room.canOrder, false);
    assert.equal((await call(qr.getRoomByToken, { params: { token: inHouse.uniqueToken } })).body.data.room.canOrder, true);

    // Guest menu omits internal bookkeeping fields.
    const menu = await call(qr.getGuestMenu, { params: { hotelId } });
    assert.equal(menu.body.menuItems[0].__v, undefined);

    // Portal: room service opens at check-in, not at booking confirmation.
    const portalOrder = (user) => call(portal.placeOrder, { user, body: { hotelId, items: [{ menuItem: String(item._id), quantity: 1 }] } });
    assert.equal((await portalOrder(guestA)).status, 201);
    const early = await portalOrder(guestB);
    assert.equal(early.status, 409);
    assert.equal(early.body.code, 'NOT_CHECKED_IN');

    // Portal phone: letters are rejected instead of silently clearing the number.
    assert.equal((await call(portal.updateProfile, { user: guestA, body: { contact: 'abc' } })).status, 400);
    assert.equal((await call(portal.updateProfile, { user: guestA, body: { contact: '+977 980-0000000' } })).status, 200);
    assert.equal((await call(portal.updateProfile, { user: guestA, body: { contact: '' } })).status, 200);

    // Bank transfer: typed fields only, and no second pending transfer for the same bill.
    const owed = await Order.create({ hotel: hotel._id, orderType: 'roomService', roomNumber: '101', customerId: guestA._id, customerName: 'Guest A',
      items: [{ name: 'Tea', quantity: 1, price: 100 }], totalPrice: 100, status: 'delivered', billSent: true, paymentStatus: 'pending' });
    const bank = { accountName: 'Guest A', accountNumber: '1234567', bankName: 'NIC Asia', transactionId: 'TXN12345' };
    const pay = (details) => call(portal.payOrder, { user: guestA, params: { id: String(owed._id) }, body: { paymentMethod: 'bank', bankTransferDetails: details } });
    await Hotel.updateOne({ _id: hotel._id }, { $set: { bankTransferAccount: { enabled: true, accountName: 'QR Hotel', bankName: 'NIC', accountNumber: '999999' } } });
    assert.equal((await pay({ ...bank, accountName: { $gt: '' } })).status, 400);
    assert.equal((await pay(bank)).status, 200);
    assert.equal((await pay(bank)).status, 409);

    // Legacy /profile: allow-listed fields, typed/validated input.
    const me = await call(profile.getProfile, { user: guestA });
    for (const hidden of ['inviteToken', 'googleId', 'loginAttempts', 'lockUntil', 'password', 'refreshToken', 'passwordChangedAt']) {
      assert.equal(me.body.data.toObject()[hidden], undefined, hidden);
    }
    assert.equal((await call(profile.updateProfile, { user: guestA, body: { email: { a: 1 } } })).status, 400);
    assert.equal((await call(profile.updateProfile, { user: guestA, body: { username: ['x'] } })).status, 400);
    assert.equal((await call(profile.updateProfile, { user: guestA, body: { email: 'not-an-email' } })).status, 400);
    assert.equal((await call(profile.updateProfile, { user: guestA, body: { fullname: 'x'.repeat(101) } })).status, 400);
    assert.equal((await call(profile.updateProfile, { user: guestA, body: { fullname: 'Guest Renamed' } })).status, 200);
  });
});
