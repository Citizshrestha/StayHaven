import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

// Regression tests for reception property scoping, IDOR and status rules (QA session 03).
test('reception endpoints are scoped to the caller\'s hotels and enforce booking/room rules', { timeout: 600000 }, async () => {
  await withEphemeralWalletDatabase(async () => {
    const { walletFixtures } = await import('./helpers/walletFixtures.js');
    const { Hotel } = await import('../models/hotel.schema.js');
    const { Room } = await import('../models/room.schema.js');
    const { Guest } = await import('../models/guest.schema.js');
    const { Booking } = await import('../models/booking.schema.js');
    const { ActivityLog } = await import('../models/activityLog.schema.js');
    const reception = await import('../controllers/receptionController.js');
    const scope = await import('../controllers/receptionScope.js');
    const fx = await walletFixtures();

    const hotelInfo = (company, name) => ({
      company, owner: fx.user._id, name, description: 'fixture', category: 'Hotel', starRating: 3,
      location: { city: 'Kathmandu', country: 'Nepal', address: name }, contact: { phone: '9800000000', email: 'h@example.test' },
      images: ['https://reception-tests.invalid/h.jpg'], priceRange: { min: 1000, max: 1000 },
    });
    const h1 = fx.hotel;
    const h2 = await Hotel.create(hotelInfo(fx.company, 'Sibling Hotel'));
    const companyB = new mongoose.Types.ObjectId();
    const hb = await Hotel.create(hotelInfo(companyB, 'Other Company Hotel'));
    const roomH2 = await Room.create({ hotel: h2._id, company: fx.company, roomName: 'H2', roomNumber: 'H2-1', type: 'double', price: 1000, status: 'available' });
    const roomB = await Room.create({ hotel: hb._id, company: companyB, roomName: 'B', roomNumber: 'B-1', type: 'double', price: 1000, status: 'available' });
    const guestH2 = await Guest.create({ hotel: h2._id, company: fx.company, fullName: 'Sibling Guest', guestId: 'G-H2-1' });
    const guestB = await Guest.create({ hotel: hb._id, company: companyB, fullName: 'Foreign Guest', guestId: 'G-B-1' });
    const day = 86400000;
    const now = Date.now();
    const mk = (o) => Booking.create({ user: fx.user._id, hotel: h1._id, company: fx.company, room: fx.room._id, guest: fx.guest._id,
      guests: { adults: 1 }, totalAmount: 1130, currency: 'NPR', guestInfo: { name: 'Fixture Guest' }, ...o });
    const cancelled = await mk({ status: 'Cancelled', checkIn: new Date(now), checkOut: new Date(now + day) });
    const future = await mk({ status: 'Confirmed', checkIn: new Date(now + 5 * day), checkOut: new Date(now + 6 * day) });
    const pending = await mk({ status: 'Pending', checkIn: new Date(now), checkOut: new Date(now + day) });
    const today = await mk({ status: 'Confirmed', checkIn: new Date(now), checkOut: new Date(now + day) });
    await Booking.create({ user: fx.user._id, hotel: h2._id, company: fx.company, room: roomH2._id, guest: guestH2._id,
      guests: { adults: 1 }, totalAmount: 1, guestInfo: { name: 'Sibling Booking' }, checkIn: new Date(now), checkOut: new Date(now + day), status: 'Confirmed' });
    await Booking.create({ user: fx.user._id, hotel: hb._id, company: companyB, room: roomB._id, guest: guestB._id,
      guests: { adults: 1 }, totalAmount: 1, guestInfo: { name: 'Foreign Booking' }, checkIn: new Date(now), checkOut: new Date(now + day), status: 'Confirmed' });
    await ActivityLog.create({ hotel: hb._id, company: companyB, entityType: 'booking', entityId: 'x', action: 'x', description: 'FOREIGN-ACTIVITY' });

    const staff = (role, company, props) => ({ _id: new mongoose.Types.ObjectId(), fullname: `Test ${role}`, companyRole: role,
      role: { name: role }, company, assignedProperties: props });
    const recep1 = staff('receptionist', fx.company, [h1._id]);
    const manager1 = staff('manager', fx.company, [h1._id]);
    const ownerA = staff('owner', fx.company, [h1._id]);
    const ownerB = staff('owner', companyB, [hb._id]);
    const recepB = staff('receptionist', companyB, [hb._id]);

    // Run attachReceptionScope (as the router does) and then the handler.
    async function call(handler, user, { params = {}, query = {}, body = {} } = {}) {
      const req = { user, params, query, body, _scopedHotelId: undefined };
      if (user.companyRole === 'receptionist') req._scopedHotelId = query.hotelId || String(user.assignedProperties[0]);
      let status = 200;
      let payload;
      const res = { status(code) { status = code; return this; }, json(data) { payload = data; return this; } };
      let passed = false;
      await scope.attachReceptionScope(req, res, (err) => { if (err) throw err; passed = true; });
      if (!passed) return { status, payload };
      let nexted = false;
      await handler(req, res, () => { nexted = true; });
      return { status, payload, nexted };
    }
    const text = (r) => JSON.stringify(r.payload);

    // Lists only contain the scoped hotel.
    const list = await call(reception.getReservations, recep1, { query: { limit: '100' } });
    assert.equal(list.status, 200);
    assert.ok(text(list).includes('Wallet Test Guest'));
    assert.ok(!text(list).includes('Sibling Guest'), 'sibling hotel bookings must not leak to a receptionist');
    assert.ok(!text(list).includes('Foreign Guest'));
    const activity = await call(reception.getActivityLog, recep1, { query: { limit: '100000' } });
    assert.ok(!text(activity).includes('FOREIGN-ACTIVITY'));
    // Owners see every hotel of their company, and only those.
    const ownerList = await call(reception.getReservations, ownerA, { query: { limit: '100' } });
    assert.ok(text(ownerList).includes('Sibling Guest'));
    assert.ok(!text(ownerList).includes('Foreign Guest'));
    const ownerH2 = await call(reception.getReservations, ownerA, { query: { hotelId: String(h2._id) } });
    assert.ok(text(ownerH2).includes('Sibling Guest') && !text(ownerH2).includes('Wallet Test Guest'));

    // Foreign ?hotelId values are rejected before any handler runs.
    assert.equal((await call(reception.getReservations, ownerB, { query: { hotelId: String(h1._id) } })).status, 403);
    assert.equal((await call(reception.getDashboardSummary, manager1, { query: { hotelId: String(h2._id) } })).status, 403);
    assert.equal((await call(reception.getReservations, ownerA, { query: { hotelId: 'not-an-id' } })).status, 403);

    // IDOR: ids from another hotel/company behave as not found.
    assert.equal((await call(reception.getGuestById, recepB, { params: { id: String(fx.guest._id) } })).status, 404);
    assert.equal((await call(reception.getGuestById, recep1, { params: { id: String(guestH2._id) } })).status, 404);
    assert.equal((await call(reception.getGuestById, recep1, { params: { id: 'zzz' } })).status, 404);
    assert.equal((await call(reception.updateGuestStatus, recepB, { params: { id: String(fx.guest._id) }, body: { isActive: false } })).status, 404);
    assert.equal((await Guest.findById(fx.guest._id)).isActive !== false, true, 'foreign write must not change the guest');
    assert.equal((await call(reception.updateRoomStatus, recepB, { params: { id: String(fx.room._id) }, body: { status: 'maintenance' } })).status, 404);
    assert.equal((await Room.findById(fx.room._id)).status, 'available');
    assert.equal((await call(reception.capturePayment, ownerB, { body: { bookingId: String(today._id), amount: 5 } })).status, 404);
    assert.equal((await call(reception.validateCheckIn, ownerB, { params: { bookingId: String(today._id) } })).status, 404);

    // Validation and status rules.
    assert.equal((await call(reception.updateRoomStatus, recep1, { params: { id: String(fx.room._id) }, body: { status: 'bogus' } })).status, 400);
    assert.equal((await call(reception.getGuestsList, recep1, { query: { search: '(' } })).status, 200, 'regex metacharacters are escaped');
    const dotStar = await call(reception.getGuestsList, recep1, { query: { search: '.*' } });
    assert.equal(dotStar.payload.data.length, 0, '".*" is matched literally');
    assert.equal((await call(reception.validateCheckIn, recep1, { params: { bookingId: String(cancelled._id) } })).status, 409);
    assert.equal((await call(reception.validateCheckIn, recep1, { params: { bookingId: String(future._id) } })).status, 409);
    assert.equal((await call(reception.performCheckOut, recep1, { params: { bookingId: String(pending._id) } })).status, 409);
    await Room.updateOne({ _id: fx.room._id }, { status: 'cleaning' });
    assert.equal((await call(reception.validateCheckIn, recep1, { params: { bookingId: String(today._id) } })).status, 409, 'a room being cleaned is not ready');
    await Room.updateOne({ _id: fx.room._id }, { status: 'available' });
    const ok = await call(reception.validateCheckIn, recep1, { params: { bookingId: String(today._id) } });
    assert.equal(ok.nexted, true, 'a confirmed same-day arrival into a clean room passes validation');
    assert.equal((await call(reception.performCheckIn, recep1, { params: { bookingId: String(today._id) } })).status, 200);
    assert.equal((await call(reception.updateRoomStatus, recep1, { params: { id: String(fx.room._id) }, body: { status: 'available' } })).status, 409,
      'a room with a checked-in guest cannot be marked available');

    // Reports no longer fabricate the previous occupancy.
    const reports = await call(reception.getReportsOverview, recep1);
    assert.equal(reports.status, 200);
    assert.notEqual(reports.payload.data.occupancy.previous, Math.max(0, reports.payload.data.occupancy.current - 6));

    // Hotel-local day boundaries (Asia/Kathmandu is UTC+05:45).
    const { start, end } = scope.dayRange('Asia/Kathmandu', 0, new Date('2026-01-01T00:00:00Z'));
    assert.equal(start.toISOString(), '2025-12-31T18:15:00.000Z');
    assert.equal(end.toISOString(), '2026-01-01T18:14:59.999Z');
    assert.equal(scope.escapeRegex('a.b*(c)'), 'a\\.b\\*\\(c\\)');
  });
});
