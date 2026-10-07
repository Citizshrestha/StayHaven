import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

// Room QR service requests → reception queue → status back to the phone.
test('room QR service requests against an owned ephemeral replica set', { timeout: 600000 }, async t => {
  await withEphemeralWalletDatabase(async db => {
    const { User } = await import('../models/user.schema.js');
    const { Hotel } = await import('../models/hotel.schema.js');
    const { Room } = await import('../models/room.schema.js');
    const { Guest } = await import('../models/guest.schema.js');
    const { Booking } = await import('../models/booking.schema.js');
    const { GuestRequest } = await import('../models/guestRequest.schema.js');
    const rooms = await import('../controllers/roomRequestController.js');
    const reception = await import('../controllers/receptionController.js');
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));

    const call = (handler, req) => new Promise((resolve, reject) => {
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { resolve({ status: this.statusCode, body }); return this; },
      };
      Promise.resolve(handler({ params: {}, query: {}, body: {}, get: () => 'test', ip: '127.0.0.1', ...req }, res, err => {
        if (err) resolve({ status: err.statusCode || err.status || 500, body: { success: false, message: err.message } });
        else reject(new Error('next() called without error'));
      })).catch(reject);
    });

    let seq = 0;
    async function fixtures() {
      seq += 1;
      const company = new mongoose.Types.ObjectId();
      const owner = await User.create({ fullname: 'Owner', username: `rq-owner${seq}`, email: `rq-owner${seq}@x.test`, password: 'isolated-tests-only' });
      const hotel = await Hotel.create({
        company, owner: owner._id, name: 'Request Hotel', description: 'fixture', category: 'Hotel', starRating: 3,
        location: { city: 'Kathmandu', address: 'Test Street' }, contact: { phone: '9800000000', email: 'h@x.test' },
        images: ['https://tests.invalid/h.jpg'], priceRange: { min: 1, max: 2 }, status: 'approved', isActive: true,
      });
      const room = await Room.create({ hotel: hotel._id, company, roomName: 'Double', roomNumber: '204', type: 'double',
        price: 1000, status: 'occupied', capacity: { adults: 2, children: 0 }, maxGuests: 2 });
      const desk = await User.create({ fullname: 'Desk', username: `rq-desk${seq}`, email: `rq-desk${seq}@x.test`, password: 'isolated-tests-only',
        companyRole: 'receptionist', company, assignedProperties: [hotel._id], isActive: true });
      const outsider = await User.create({ fullname: 'Outsider', username: `rq-out${seq}`, email: `rq-out${seq}@x.test`, password: 'isolated-tests-only',
        companyRole: 'receptionist', company: new mongoose.Types.ObjectId(), assignedProperties: [new mongoose.Types.ObjectId()], isActive: true });
      return { company, hotel, room, desk, outsider };
    }
    const scenario = (name, run) => t.test(name, async () => { await db.reset(); await run(await fixtures()); });

    const PHONE_A = 'GUEST-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const PHONE_B = 'GUEST-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const raise = (f, body) => call(rooms.createRoomRequest, { body: {
      roomToken: f.room.uniqueToken, hotelId: String(f.hotel._id), guestSessionId: PHONE_A, ...body,
    } });

    await scenario('a housekeeping request lands in the reception queue and is de-duplicated', async f => {
      const res = await raise(f, { kind: 'housekeeping', details: 'After 2 pm please' });
      assert.equal(res.status, 201, res.body.message);
      const saved = await GuestRequest.findById(res.body.data._id);
      assert.equal(saved.source, 'room_qr');
      assert.equal(saved.category, 'Amenities');
      assert.equal(saved.roomNumber, '204');
      assert.equal(saved.verifiedStay, false);
      assert.match(saved.description, /Room cleaning — After 2 pm please/);

      const again = await raise(f, { kind: 'housekeeping' });
      assert.equal(again.status, 200);
      assert.equal(again.body.duplicate, true);
      assert.equal(await GuestRequest.countDocuments({ room: f.room._id }), 1);

      const queue = await call(reception.getGuestRequests, { user: f.desk });
      assert.equal(queue.body.data.length, 1);
    });

    await scenario('validation: unknown kind, maintenance without details, wrong token', async f => {
      assert.equal((await raise(f, { kind: 'spa' })).status, 400);
      assert.equal((await raise(f, { kind: 'maintenance' })).status, 400);
      assert.equal((await raise(f, { kind: 'housekeeping', roomToken: 'RM-NOPE' })).status, 404);
      assert.equal((await raise(f, { kind: 'housekeeping', guestSessionId: 'not-a-session' })).status, 400);
      const ok = await raise(f, { kind: 'maintenance', details: 'AC not cooling', urgent: true });
      assert.equal(ok.status, 201);
      assert.equal(ok.body.data.urgency, 'urgent');
    });

    await scenario('a checked-in booking marks the stay verified; only the raising phone sees its requests', async f => {
      const guest = await Guest.create({ hotel: f.hotel._id, company: f.company, fullName: 'Sita', email: 's@x.test', phone: '9800000001' });
      const checkIn = new Date(Date.now() - 86400000);
      await Booking.create({ user: f.desk._id, hotel: f.hotel._id, company: f.company, room: f.room._id, guest: guest._id,
        checkIn, checkOut: new Date(Date.now() + 86400000), guests: { adults: 1, children: 0 },
        totalAmount: 1130, currency: 'NPR', status: 'Checked-In', paymentStatus: 'unpaid' });
      const res = await raise(f, { kind: 'amenities' });
      assert.equal(res.status, 201);
      const saved = await GuestRequest.findById(res.body.data._id);
      assert.equal(saved.verifiedStay, true);
      assert.ok(saved.booking);

      const mine = await call(rooms.getRoomRequests, { params: { token: f.room.uniqueToken }, query: { guestSessionId: PHONE_A } });
      assert.equal(mine.body.data.length, 1);
      const theirs = await call(rooms.getRoomRequests, { params: { token: f.room.uniqueToken }, query: { guestSessionId: PHONE_B } });
      assert.equal(theirs.body.data.length, 0);
    });

    await scenario('reception can only act on its own hotel queue', async f => {
      const res = await raise(f, { kind: 'concierge', details: 'Taxi at 7' });
      const id = String(res.body.data._id);
      const foreign = await call(reception.resolveGuestRequest, { params: { id }, user: f.outsider });
      assert.equal(foreign.status, 404);
      assert.equal((await GuestRequest.findById(id)).status, 'open');

      const assigned = await call(reception.assignGuestRequest, { params: { id }, body: {}, user: f.desk });
      assert.equal(assigned.status, 200, assigned.body.message);
      const resolved = await call(reception.resolveGuestRequest, { params: { id }, user: f.desk });
      assert.equal(resolved.status, 200);
      assert.equal((await GuestRequest.findById(id)).status, 'resolved');
    });
  });
});
