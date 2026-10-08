import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

// Session 08 (public site) regression tests: what the public can read, what a booking
// is priced at, who can see a booking, and that a card payment confirms exactly once.

const call = (handler, req) => new Promise((resolve) => {
  const res = {
    statusCode: 200, headers: {},
    status(code) { this.statusCode = code; return this; },
    set(k, v) { this.headers[String(k).toLowerCase()] = v; return this; },
    setHeader(k, v) { this.headers[String(k).toLowerCase()] = v; return this; },
    json(body) { resolve({ status: this.statusCode, body, headers: this.headers }); },
    send(body) { resolve({ status: this.statusCode, body, headers: this.headers }); },
  };
  handler({ params: {}, query: {}, body: {}, get: () => undefined, ...req }, res,
    (error) => resolve({ status: error.statusCode || error.status || 500, body: { message: error.message }, headers: res.headers }));
});

test('public hotel API never leaks private data and lists only bookable hotels', { timeout: 600000 }, async (t) => {
  await withEphemeralWalletDatabase(async (db) => {
    const hotels = await import('../controllers/hotelController.js');
    const { Hotel } = await import('../models/hotel.schema.js');
    const { Room } = await import('../models/room.schema.js');
    const { Booking } = await import('../models/booking.schema.js');
    const { Review } = await import('../models/review.model.js');
    const { walletFixtures } = await import('./helpers/walletFixtures.js');
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
    await db.reset();
    const f = await walletFixtures();
    await Hotel.updateOne({ _id: f.hotel._id }, { $set: { totalRevenue: 987654, 'bankTransferAccount.accountNumber': 'SECRETACCT99999' } });
    await Room.updateOne({ _id: f.room._id }, { $set: { uniqueToken: 'RM-SECRETTOKEN0001', qrCodeData: 'https://x.invalid/guest/room/RM-SECRETTOKEN0001' } });
    const hidden = ['pending', 'suspended', 'rejected'];
    for (const status of hidden) {
      await Hotel.create({ ...f.hotel.toObject(), _id: new mongoose.Types.ObjectId(), name: `Hidden ${status}`, status });
    }
    await Hotel.create({ ...f.hotel.toObject(), _id: new mongoose.Types.ObjectId(), name: 'Hidden inactive', isActive: false });
    const maintenance = await Room.create({ hotel: f.hotel._id, company: f.company, roomName: 'Broken', roomNumber: '999', type: 'double', price: 10, status: 'maintenance' });

    await t.test('list hides pending/suspended/rejected/inactive hotels and private fields', async () => {
      const r = await call(hotels.getAllHotels, { query: { limit: '50' } });
      assert.equal(r.status, 200);
      assert.deepEqual(r.body.hotels.map((h) => h.name), ['Ephemeral Hotel']);
      const raw = JSON.stringify(r.body);
      for (const secret of ['SECRETACCT99999', 'wallet@example.test', 'owner', 'company', 'totalRevenue', 'bankTransferAccount', 'restaurantBilling']) {
        assert.ok(!raw.includes(secret), `public list leaked ${secret}`);
      }
    });

    await t.test('detail returns rooms without QR tokens/internal fields and hides maintenance rooms', async () => {
      const r = await call(hotels.getHotelById, { params: { id: String(f.hotel._id) } });
      assert.equal(r.status, 200);
      const raw = JSON.stringify(r.body);
      for (const secret of ['RM-SECRETTOKEN0001', 'uniqueToken', 'qrCodeData', 'qrCodeImage', 'reservationVersion', 'SECRETACCT99999', 'wallet@example.test']) {
        assert.ok(!raw.includes(secret), `public detail leaked ${secret}`);
      }
      assert.equal(r.body.hotel.bankTransferEnabled, true);
      assert.deepEqual(r.body.hotel.rooms.map((x) => x.roomNumber), ['101']);
      assert.ok(!r.body.hotel.rooms.some((x) => String(x._id) === String(maintenance._id)));
    });

    await t.test('non-bookable hotels are 404', async () => {
      for (const h of await Hotel.find({ name: /^Hidden/ })) {
        const r = await call(hotels.getHotelById, { params: { id: String(h._id) } });
        assert.equal(r.status, 404, h.name);
      }
    });

    await t.test('regex/NoSQL/typing hostile search input never throws', async () => {
      for (const query of [
        { destination: '(((' }, { city: '(a+)+$' }, { search: '[' }, { search: ['a', 'b'] }, { amenities: ['wifi', { $ne: 1 }] },
        { starRating: 'abc' }, { minPrice: 'x', maxPrice: '[]' }, { minRating: 'NaN' }, { sort: '$where' }, { sort: 'owner' },
        { limit: 'abc', page: '-1' }, { limit: '100000' }, { category: { $ne: 'Hotel' } },
      ]) {
        const r = await call(hotels.getAllHotels, { query });
        assert.equal(r.status, 200, JSON.stringify(query));
        assert.ok(r.body.hotels.length <= 50);
      }
    });

    await t.test('pagination metadata counts every match, not the current page', async () => {
      for (let i = 0; i < 4; i += 1) await Hotel.create({ ...f.hotel.toObject(), _id: new mongoose.Types.ObjectId(), name: `Extra ${i}` });
      const r = await call(hotels.getAllHotels, { query: { limit: '2', page: '2' } });
      assert.equal(r.body.total, 5);
      assert.equal(r.body.totalPages, 3);
      assert.equal(r.body.currentPage, 2);
      assert.equal(r.body.count, 2);
      await Hotel.deleteMany({ name: /^Extra/ });
    });

    await t.test('date search and room availability ignore expired holds and respect live ones', async () => {
      const day = (n) => new Date(Date.now() + n * 86400000);
      const stay = { checkIn: day(20).toISOString(), checkOut: day(22).toISOString() };
      const base = { user: f.user._id, hotel: f.hotel._id, company: f.company, room: f.room._id, guests: { adults: 1 }, checkIn: day(20), checkOut: day(22), totalAmount: 1, status: 'Pending', paymentStatus: 'unpaid' };
      const live = await Booking.create({ ...base, paymentHoldExpiresAt: day(1) });
      let r = await call(hotels.getHotelAvailability, { params: { id: String(f.hotel._id) }, query: stay });
      assert.deepEqual(r.body.rooms.map((x) => x.available), [false]);
      assert.deepEqual(Object.keys(r.body.rooms[0]).sort(), ['available', 'roomId'], 'availability exposes booleans only');
      r = await call(hotels.getAllHotels, { query: stay });
      assert.equal(r.body.total, 0, 'a hotel whose only room is held is not offered for those dates');
      await Booking.updateOne({ _id: live._id }, { $set: { paymentHoldExpiresAt: day(-1) } });
      r = await call(hotels.getHotelAvailability, { params: { id: String(f.hotel._id) }, query: stay });
      assert.deepEqual(r.body.rooms.map((x) => x.available), [true]);
      r = await call(hotels.getAllHotels, { query: stay });
      assert.equal(r.body.total, 1);
      r = await call(hotels.getHotelAvailability, { params: { id: String(f.hotel._id) }, query: { checkIn: stay.checkOut, checkOut: stay.checkIn } });
      assert.equal(r.status, 400);
      await Booking.deleteMany({});
    });

    await t.test('reviews: only approved ones, reviewer shown as first name + initial, no ids/emails', async () => {
      const mk = (moderationStatus, comment, rating = 5) => Review.create({ hotel: f.hotel._id, booking: new mongoose.Types.ObjectId(), guest: f.user._id, rating, comment, moderationStatus });
      await mk('approved', 'Lovely stay', 5); await mk('approved', 'Okay', 3);
      await mk('pending', 'PENDING-TEXT'); await mk('rejected', 'REJECTED-TEXT'); await mk('flagged', 'FLAGGED-TEXT');
      const r = await call(hotels.getHotelReviews, { params: { id: String(f.hotel._id) }, query: {} });
      assert.equal(r.status, 200);
      assert.equal(r.body.total, 2);
      assert.deepEqual(r.body.distribution, { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 });
      const raw = JSON.stringify(r.body);
      for (const s of ['PENDING-TEXT', 'REJECTED-TEXT', 'FLAGGED-TEXT', 'wallet@example.test', String(f.user._id)]) assert.ok(!raw.includes(s), s);
      assert.ok(r.body.reviews.every((x) => x.name === 'Wallet G.'), JSON.stringify(r.body.reviews.map((x) => x.name)));
    });

    await t.test('bank transfer instructions: only for a hotel that configured them', async () => {
      let r = await call(hotels.getBankTransferDetails, { params: { id: String(f.hotel._id) } });
      assert.equal(r.body.enabled, true);
      assert.equal(r.body.account.accountNumber, 'SECRETACCT99999');
      assert.equal(r.headers['cache-control'], 'no-store');
      await Hotel.updateOne({ _id: f.hotel._id }, { $set: { 'bankTransferAccount.enabled': false } });
      r = await call(hotels.getBankTransferDetails, { params: { id: String(f.hotel._id) } });
      assert.deepEqual(r.body, { success: true, enabled: false });
    });
  });
});

test('booking creation prices on the server, holds inventory, and card payment confirms once', { timeout: 600000 }, async (t) => {
  const previous = { sk: process.env.STRIPE_SECRET_KEY, pk: process.env.STRIPE_PUBLISHABLE_KEY };
  process.env.STRIPE_SECRET_KEY = 'sk_test_abcdefghijklmnopqrstuvwxyz0123456789';
  process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_abcdefghijklmnopqrstuvwxyz0123456789';
  const gateway = await import('../services/paymentGatewayService.js');
  const intents = new Map();
  const cancelled = [];
  let created = 0;
  gateway.__setStripeClientForTests({ paymentIntents: {
    create: async (request) => {
      created += 1;
      const id = `pi_publicbooking${String(created).padStart(4, '0')}`;
      const intent = { id, client_secret: `${id}_secret_test`, amount: request.amount, amount_received: 0, currency: request.currency, status: 'requires_payment_method' };
      intents.set(id, intent);
      return intent;
    },
    retrieve: async (id) => intents.get(id),
    cancel: async (id) => { cancelled.push(id); return { id, status: 'canceled' }; },
  } });
  const succeed = (id, patch = {}) => Object.assign(intents.get(id), { status: 'succeeded', amount_received: intents.get(id).amount, ...patch });
  try {
    await withEphemeralWalletDatabase(async (db) => {
      const pub = await import('../controllers/publicBookingController.js');
      const web = await import('../controllers/webhookController.js');
      const bookings = await import('../controllers/bookingController.js');
      const { Booking } = await import('../models/booking.schema.js');
      const { Invoice } = await import('../models/invoice.schema.js');
      const { PaymentTransaction } = await import('../models/paymentTransaction.schema.js');
      const { Room } = await import('../models/room.schema.js');
      const { walletFixtures } = await import('./helpers/walletFixtures.js');
      const { ownBooking } = await import('../controllers/walletPaymentController.js');
      await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
      const setup = async () => { await db.reset(); intents.clear(); created = 0; return walletFixtures(); };
      const day = (n) => new Date(Date.now() + n * 86400000).toISOString();
      const bank = (extra = {}) => ({ accountName: 'Payer Name', accountNumber: '123456789', bankName: 'Test Bank', transactionId: `TXN-${Math.random().toString(36).slice(2, 10)}`, ...extra });

      await t.test('client-sent price/status/currency fields are ignored; the server quote wins', async () => {
        const f = await setup();
        const r = await call(pub.createBookingWithPayment, { user: f.user, body: {
          hotelId: String(f.hotel._id), roomId: String(f.room._id), checkIn: day(10), checkOut: day(12), guests: { adults: 2, children: 0 },
          paymentMethod: 'bank-transfer', bankTransferDetails: bank(),
          totalAmount: 1, price: 1, amount: 1, currency: 'USD', paidAmount: 999999, paymentStatus: 'paid', status: 'Confirmed',
        } });
        assert.equal(r.status, 200, r.body.message);
        const stored = await Booking.findById(r.body.data.booking._id);
        assert.equal(stored.totalAmount, 2240, '2 nights x Rs. 1000 + 12% fee');
        assert.equal(stored.currency, 'NPR');
        assert.equal(stored.status, 'Pending');
        assert.equal(stored.paymentStatus, 'unpaid');
        assert.ok(!stored.paidAmount, 'a client cannot pre-pay a booking');
      });

      await t.test('every unpaid online booking holds its room for a limited time only', async () => {
        const f = await setup();
        const make = async (method, extra) => call(pub.createBookingWithPayment, { user: f.user, body: {
          hotelId: String(f.hotel._id), roomId: String(f.room._id), checkIn: day(10), checkOut: day(11), guests: { adults: 1 }, paymentMethod: method, ...extra } });
        const b = await make('bank-transfer', { bankTransferDetails: bank() });
        assert.equal(b.status, 200, b.body.message);
        const stored = await Booking.findById(b.body.data.booking._id);
        const hours = (stored.paymentHoldExpiresAt - Date.now()) / 3600000;
        assert.ok(hours > 40 && hours <= 48.01, `bank-transfer hold should be ~48h, got ${hours}`);
        await Booking.deleteMany({});
        const c = await make('card', {});
        assert.equal(c.status, 200, c.body.message);
        const card = await Booking.findById(c.body.booking._id);
        const cardHours = (card.paymentHoldExpiresAt - Date.now()) / 3600000;
        assert.ok(cardHours > 0.9 && cardHours <= 1.01, `card hold should be ~1h, got ${cardHours}`);
      });

      await t.test('a reused bank-transfer reference is a clean 409, not a database error', async () => {
        const f = await setup();
        const ref = bank();
        const make = (n) => call(pub.createBookingWithPayment, { user: f.user, body: {
          hotelId: String(f.hotel._id), roomId: String(f.room._id), checkIn: day(10 + n * 5), checkOut: day(11 + n * 5), guests: { adults: 1 }, paymentMethod: 'bank-transfer', bankTransferDetails: ref } });
        assert.equal((await make(0)).status, 200);
        const again = await make(1);
        assert.equal(again.status, 409);
        assert.doesNotMatch(again.body.message, /E11000|duplicate key|index/i);
        assert.equal(await Booking.countDocuments({}), 1, 'the failed attempt must not leave a held booking behind');
      });

      await t.test('invalid inventory requests are rejected', async () => {
        const f = await setup();
        const other = await Room.create({ hotel: new mongoose.Types.ObjectId(), company: f.company, roomName: 'X', roomNumber: '1', type: 'double', price: 1, status: 'available' });
        await Room.create({ hotel: f.hotel._id, company: f.company, roomName: 'M', roomNumber: '102', type: 'double', price: 1, status: 'maintenance' });
        const maintenance = await Room.findOne({ roomNumber: '102' });
        const send = (extra) => call(pub.createBookingWithPayment, { user: f.user, body: {
          hotelId: String(f.hotel._id), roomId: String(f.room._id), checkIn: day(10), checkOut: day(11), guests: { adults: 1 }, paymentMethod: 'bank-transfer', bankTransferDetails: bank(), ...extra } });
        for (const [name, extra, status] of [
          ['room of another hotel', { roomId: String(other._id) }, 404], ['maintenance room', { roomId: String(maintenance._id) }, 404],
          ['past stay', { checkIn: day(-4), checkOut: day(-2) }, 400], ['inverted stay', { checkIn: day(5), checkOut: day(3) }, 400],
          ['400 nights', { checkIn: day(10), checkOut: day(410) }, 400], ['over capacity', { guests: { adults: 9, children: 0 } }, 400],
          ['unknown method', { paymentMethod: 'bitcoin' }, 400],
        ]) {
          const r = await send(extra);
          assert.equal(r.status, status, `${name}: ${r.body.message}`);
        }
        await f.hotel.updateOne({ status: 'suspended' });
        assert.equal((await send({})).status, 409, 'suspended hotels cannot be booked');
        assert.equal(await Booking.countDocuments({}), 0);
      });

      await t.test('two guests racing for one room: exactly one booking wins', async () => {
        const f = await setup();
        const guestB = f.stranger;
        const send = (user) => call(pub.createBookingWithPayment, { user, body: {
          hotelId: String(f.hotel._id), roomId: String(f.room._id), checkIn: day(10), checkOut: day(12), guests: { adults: 1 }, paymentMethod: 'bank-transfer', bankTransferDetails: bank() } });
        const results = await Promise.all([send(f.user), send(guestB), send(f.user), send(guestB)]);
        assert.equal(results.filter((r) => r.status === 200).length, 1, results.map((r) => `${r.status}:${r.body.message}`).join(' | '));
        assert.equal(await Booking.countDocuments({}), 1);
      });

      await t.test('a booking is private to its guest (confirmation details, PDF, record, payment status)', async () => {
        const f = await setup();
        const created = await call(pub.createBookingWithPayment, { user: f.user, body: {
          hotelId: String(f.hotel._id), roomId: String(f.room._id), checkIn: day(10), checkOut: day(11), guests: { adults: 1 }, paymentMethod: 'bank-transfer', bankTransferDetails: bank() } });
        const id = created.body.data.booking._id;
        const stranger = await call(ownBooking, { user: f.stranger, params: { bookingId: String(id) } });
        assert.equal(stranger.status, 404, 'another guest gets 404, not 403, so ids cannot be probed');
        const owner = await new Promise((resolve) => ownBooking({ user: f.user, params: { bookingId: String(id) } }, { set() {} }, (e) => resolve(e || 'next')));
        assert.equal(owner, 'next');
        const asStranger = await call(bookings.getBookingById, { user: f.stranger, params: { id: String(id) } });
        assert.equal(asStranger.status, 403);
        const asOwner = await call(bookings.getBookingById, { user: f.user, params: { id: String(id) } });
        assert.equal(asOwner.status, 200);
        const raw = JSON.stringify(asOwner.body);
        assert.ok(!/"password"|refreshToken|resetOtp|inviteToken/.test(raw), 'booking payload must not embed credential fields');
        assert.equal(asOwner.body.booking.user.email, f.user.email);
      });

      await t.test('confirmation PDF renders and tells the truth about an unpaid booking', async () => {
        const f = await setup();
        const b = await f.booking({ priceBreakdown: { subtotalPaisa: 200000, taxPaisa: 24000, totalPaisa: 224000, taxRate: 12 }, totalAmount: 2240, confirmationCode: 'SH123456' });
        const r = await call(pub.generateBookingConfirmationPDF, { params: { bookingId: String(b._id) } });
        assert.equal(r.status, 200);
        assert.equal(r.headers['content-type'], 'application/pdf');
        assert.equal(Buffer.from(r.body).subarray(0, 4).toString(), '%PDF');
      });

      await t.test('restarting a card checkout releases the guest\'s own earlier hold and cancels its intent; others stay blocked', async () => {
        const f = await setup();
        cancelled.length = 0;
        const card = (user) => call(pub.createBookingWithPayment, { user, body: {
          hotelId: String(f.hotel._id), roomId: String(f.room._id), checkIn: day(10), checkOut: day(12), guests: { adults: 1 }, paymentMethod: 'card' } });
        const first = await card(f.user);
        assert.equal(first.status, 200, first.body.message);
        const second = await card(f.user);
        assert.equal(second.status, 200, `a retry must not be blocked by the guest's own hold: ${second.body.message}`);
        assert.notEqual(second.body.booking._id, first.body.booking._id);
        await new Promise((resolve) => setTimeout(resolve, 100));
        assert.deepEqual(cancelled, ['pi_publicbooking0001']);
        assert.ok((await Booking.findById(first.body.booking._id)).paymentHoldExpiresAt <= new Date());
        const stranger = await card(f.stranger);
        assert.ok(stranger.status >= 400 && stranger.status < 500, 'another guest is still blocked by the live hold');
        // A submitted bank transfer may already have money in flight, so a later card attempt never releases it.
        await Booking.deleteMany({});
        const bankBooking = await call(pub.createBookingWithPayment, { user: f.user, body: {
          hotelId: String(f.hotel._id), roomId: String(f.room._id), checkIn: day(10), checkOut: day(12), guests: { adults: 1 }, paymentMethod: 'bank-transfer', bankTransferDetails: bank() } });
        assert.equal(bankBooking.status, 200);
        const afterBank = await card(f.user);
        assert.ok(afterBank.status >= 400 && afterBank.status < 500, 'the pending bank transfer keeps its hold');
        assert.ok((await Booking.findById(bankBooking.body.data.booking._id)).paymentHoldExpiresAt > new Date());
      });

      await t.test('card: forged, partial, wrong-currency and foreign confirmations never confirm a booking', async () => {
        const f = await setup();
        const create = await call(pub.createBookingWithPayment, { user: f.user, body: {
          hotelId: String(f.hotel._id), roomId: String(f.room._id), checkIn: day(10), checkOut: day(12), guests: { adults: 1 }, paymentMethod: 'card' } });
        assert.equal(create.status, 200, create.body.message);
        const piId = [...intents.keys()][0];
        assert.equal(intents.get(piId).amount, 224000, 'Stripe is asked for the server quote in paisa');
        assert.equal(intents.get(piId).currency, 'npr');
        const verify = (user, id = piId) => call(web.verifyStripeCardPayment, { user, body: { paymentIntentId: id } });
        const stored = () => Booking.findOne({ paymentReference: piId });

        assert.equal((await verify(f.user, 'pi_doesnotexist0001')).status, 404);
        assert.equal((await verify(f.user, { $ne: null })).status, 400);
        let r = await verify(f.user);
        assert.equal(r.status, 400, 'requires_payment_method is not a payment');
        assert.equal((await stored()).paymentStatus, 'unpaid');
        succeed(piId, { amount_received: 100000 });
        assert.equal((await verify(f.user)).status, 400, 'a partial capture cannot confirm the full price');
        succeed(piId, { currency: 'usd' });
        assert.equal((await verify(f.user)).status, 400, 'a different currency cannot satisfy an NPR booking');
        succeed(piId, { currency: 'npr' });
        assert.equal((await verify(f.stranger)).status, 403, 'another guest cannot confirm this booking');
        assert.equal((await stored()).paymentStatus, 'unpaid');
        assert.equal(await PaymentTransaction.countDocuments({ booking: (await stored())._id, status: 'captured' }), 0);
      });

      await t.test('card: client verify + duplicate webhooks/replays -> exactly one confirmed booking, one payment, a correct invoice', async () => {
        const f = await setup();
        const create = await call(pub.createBookingWithPayment, { user: f.user, body: {
          hotelId: String(f.hotel._id), roomId: String(f.room._id), checkIn: day(10), checkOut: day(12), guests: { adults: 1 }, paymentMethod: 'card' } });
        const piId = [...intents.keys()][0];
        succeed(piId);
        const outcomes = await Promise.all([
          web.finalizeStripeBookingPayment(piId, { expectedUserId: f.user._id }), web.finalizeStripeBookingPayment(piId),
          web.finalizeStripeBookingPayment(piId), call(web.verifyStripeCardPayment, { user: f.user, body: { paymentIntentId: piId } }),
        ]);
        assert.ok(outcomes.every((o) => o.ok === true || o.body?.success === true), JSON.stringify(outcomes.map((o) => o.reason || o.body?.message)));
        assert.equal(outcomes.filter((o) => o.ok && !o.alreadyProcessed).length, 1, 'only one finalizer performs the transition');
        const booking = await Booking.findById(create.body.booking._id);
        assert.equal(booking.status, 'Confirmed');
        assert.equal(booking.paymentStatus, 'paid');
        assert.equal(booking.paidAmount, 2240);
        assert.equal(await Booking.countDocuments({ status: 'Confirmed' }), 1);
        assert.equal(await PaymentTransaction.countDocuments({ booking: booking._id, status: 'captured' }), 1);
        const invoices = await Invoice.find({ booking: booking._id });
        assert.equal(invoices.length, 1);
        assert.equal(invoices[0].charges.total, 2240, 'the invoice total is the quoted total, with no extra tax on top');
        assert.equal(invoices[0].charges.tax, 240);
        assert.equal(invoices[0].balance, 0);
        assert.equal(invoices[0].status, 'paid');
        const replay = await web.finalizeStripeBookingPayment(piId);
        assert.equal(replay.alreadyProcessed, true);
        assert.equal(await PaymentTransaction.countDocuments({ booking: booking._id }), 1);
      });

      await t.test('card: a late payment can neither reopen a cancelled booking nor double-book a room another guest now holds', async () => {
        const f = await setup();
        const create = await call(pub.createBookingWithPayment, { user: f.user, body: {
          hotelId: String(f.hotel._id), roomId: String(f.room._id), checkIn: day(10), checkOut: day(12), guests: { adults: 1 }, paymentMethod: 'card' } });
        const piId = [...intents.keys()][0];
        const mine = await Booking.findById(create.body.booking._id);
        succeed(piId);
        // The card hold lapses; another guest takes the room and confirms.
        await Booking.updateOne({ _id: mine._id }, { $set: { paymentHoldExpiresAt: new Date(Date.now() - 1000) } });
        await f.booking({ checkIn: mine.checkIn, checkOut: mine.checkOut, status: 'Confirmed', paymentStatus: 'paid', user: f.stranger._id });
        const late = await call(web.verifyStripeCardPayment, { user: f.user, body: { paymentIntentId: piId } });
        assert.equal(late.status, 409);
        assert.equal(late.body.reason, 'room_unavailable_after_payment');
        assert.equal((await Booking.findById(mine._id)).paymentStatus, 'unpaid', 'the booking is NOT confirmed on top of another guest');
        assert.equal(await PaymentTransaction.countDocuments({ booking: mine._id }), 0);
        // Cancelled bookings stay cancelled.
        await Booking.deleteMany({ _id: { $ne: mine._id } });
        await Booking.updateOne({ _id: mine._id }, { $set: { status: 'Cancelled' } });
        const afterCancel = await web.finalizeStripeBookingPayment(piId);
        assert.deepEqual([afterCancel.ok, afterCancel.reason], [false, 'booking_not_claimable']);
        assert.equal((await Booking.findById(mine._id)).status, 'Cancelled');
      });
    });
  } finally {
    gateway.__setStripeClientForTests(null);
    for (const [key, value] of [['STRIPE_SECRET_KEY', previous.sk], ['STRIPE_PUBLISHABLE_KEY', previous.pk]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
