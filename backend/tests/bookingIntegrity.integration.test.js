import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

test('booking isolation, extensions and inventory holds', { timeout: 600000 }, async t => {
  await withEphemeralWalletDatabase(async () => {
    const { Booking } = await import('../models/booking.schema.js');
    const { Room } = await import('../models/room.schema.js');
    const { Hotel } = await import('../models/hotel.schema.js');
    const { User } = await import('../models/user.schema.js');
    const { Invoice } = await import('../models/invoice.schema.js');
    const handlers = await import('../controllers/bookingController.js');
    const extensions = await import('../controllers/extendBookingHandler.js');
    const call = (handler, req) => new Promise(resolve => handler({ params: {}, query: {}, body: {}, ...req }, {
      statusCode: 200, status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ status: this.statusCode, body }); },
    }, error => resolve({ status: error.statusCode || error.status || 500, body: { message: error.message } })));
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    const company = new mongoose.Types.ObjectId();
    const user = await User.create({ fullname: 'Test Guest', username: 'booking-guest', email: 'booking@tests.invalid', password: 'local-fixture-only' });
    const hotel = await Hotel.create({ name: 'Booking Hotel', company, owner: user._id, description: 'fixture', category: 'Hotel', starRating: 3,
      location: { city: 'Kathmandu', address: 'Test Street' }, contact: { phone: '9800000000', email: 'h@tests.invalid' },
      images: ['https://tests.invalid/h.jpg'], priceRange: { min: 1, max: 2 }, status: 'approved', isActive: true });
    const room = await Room.create({ hotel: hotel._id, company, roomName: 'Double', roomNumber: '101', type: 'double',
      price: 1000, status: 'available', capacity: { adults: 2, children: 0 }, maxGuests: 2 });
    const day = n => new Date(Date.now() + n * 86400000);
    const base = { user: user._id, hotel: hotel._id, company, room: room._id, guests: { adults: 1 },
      checkIn: day(2), checkOut: day(4), totalAmount: 2240, status: 'Confirmed', paymentStatus: 'paid', paidAmount: 2240 };
    const booking = await Booking.create(base);
    const owner = { _id: user._id, companyRole: 'owner', company };
    await t.test('companyless staff cannot read another booking', async () => {
      const response = await call(handlers.getBookingById, { user: { _id: new mongoose.Types.ObjectId(), companyRole: 'receptionist' }, params: { id: String(booking._id) } });
      assert.equal(response.status, 403, response.body.message);
    });
    await t.test('partial date edits fail explicitly', async () => {
      const response = await call(handlers.modifyBooking, { user: owner, params: { id: String(booking._id) }, body: { checkOut: day(5).toISOString() } });
      assert.equal(response.status, 400, response.body.message);
    });
    await t.test('extensions reject strings and fractional nights', async () => {
      for (const additionalNights of ['2', 1.5, -1]) {
        const response = await call(extensions.extendBooking, { user, params: { id: String(booking._id) }, body: { additionalNights } });
        assert.equal(response.status, 400, response.body.message);
      }
    });
    const hold = await Booking.create({ ...base, checkIn: day(4), checkOut: day(6), status: 'Pending', paymentHoldExpiresAt: day(1) });
    await t.test('live payment holds prevent extension', async () => {
      const response = await call(extensions.extendBooking, { user, params: { id: String(booking._id) }, body: { additionalNights: 1 } });
      assert.equal(response.status, 409, response.body.message);
    });
    await t.test('expired holds release inventory and added nights reopen paid balances', async () => {
      hold.paymentHoldExpiresAt = day(-1); await hold.save();
      const invoice = await Invoice.create({ hotel: hotel._id, company, booking: booking._id, guest: new mongoose.Types.ObjectId(),
        charges: { room: 2000, extras: 0, taxRate: 12, tax: 240, total: 2240 }, paid: 2240, balance: 0, status: 'paid' });
      const response = await call(extensions.extendBooking, { user, params: { id: String(booking._id) }, body: { additionalNights: 1 } });
      assert.equal(response.status, 200, response.body.message);
      const updated = await Booking.findById(booking._id);
      assert.equal(updated.totalAmount, 3360);
      assert.equal(updated.paymentStatus, 'partial');
      assert.equal(updated.durationNights, 3);
      const billed = await Invoice.findById(invoice._id);
      assert.equal(billed.balance, 1120);
      assert.equal(billed.status, 'partial');
    });
    await t.test('booking references remain unique across companies', async () => {
      const copies = await Promise.all([1, 2, 3].map(() => Booking.create({ ...base, company: new mongoose.Types.ObjectId() })));
      assert.equal(new Set(copies.map(item => item.bookingId)).size, 3);
    });
  });
});
