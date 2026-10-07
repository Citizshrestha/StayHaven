import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

// Parity net for the three order-creation paths. Every path must price lines
// from the hotel's own menu and apply the same line rules:
//   QR      guestController.createGuestOrder
//   Portal  guestDashboardController.placeOrder
//   Staff   orderController.createOrder
test('order pricing parity across QR, portal and staff paths', { timeout: 600000 }, async t => {
  await withEphemeralWalletDatabase(async db => {
    const { User } = await import('../models/user.schema.js');
    const { Hotel } = await import('../models/hotel.schema.js');
    const { HotelTable } = await import('../models/hotelTable.schema.js');
    const { Room } = await import('../models/room.schema.js');
    const { Guest } = await import('../models/guest.schema.js');
    const { Booking } = await import('../models/booking.schema.js');
    const { MenuItem } = await import('../models/menuItem.schema.js');
    const guest = await import('../controllers/guestController.js');
    const portal = await import('../controllers/guestDashboardController.js');
    const staff = await import('../controllers/orderController.js');
    const { priceMenuLines } = await import('../services/orderPricing.js');
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));

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

    let seq = 0;
    const key = () => `price-${Date.now()}-${++seq}-abcdefgh`;

    await db.reset();
    const company = new mongoose.Types.ObjectId();
    const owner = await User.create({ fullname: 'Owner', username: 'p-owner', email: 'p-owner@x.test', password: 'isolated-tests-only' });
    const base = {
      company, owner: owner._id, description: 'fixture', category: 'Hotel', starRating: 3,
      location: { city: 'Kathmandu', address: 'Test Street' }, contact: { phone: '9800000000', email: 'h@x.test' },
      images: ['https://tests.invalid/h.jpg'], priceRange: { min: 1, max: 2 }, status: 'approved', isActive: true,
    };
    const hotel = await Hotel.create({ ...base, name: 'Price Hotel' });
    const other = await Hotel.create({ ...base, name: 'Other', company: new mongoose.Types.ObjectId() });
    const table = await HotelTable.create({ hotel: hotel._id, company, tableNumber: '1' });
    const room = await Room.create({ hotel: hotel._id, company, roomName: 'Double', roomNumber: '101', type: 'double',
      price: 1000, status: 'occupied', capacity: { adults: 2, children: 0 }, maxGuests: 2 });
    const momo = await MenuItem.create({ hotel: hotel._id, name: 'Momo', category: 'Snacks', price: 300 });
    const soldOut = await MenuItem.create({ hotel: hotel._id, name: 'Soup', category: 'Snacks', price: 150, isAvailable: false });
    const foreign = await MenuItem.create({ hotel: other._id, name: 'Cheap', category: 'Snacks', price: 1 });
    const guestUser = await User.create({ fullname: 'Portal Guest', username: 'p-guest', email: 'p-guest@x.test', password: 'isolated-tests-only', contact: '9800000002' });
    const guestDoc = await Guest.create({ hotel: hotel._id, company, fullName: 'Portal Guest', email: 'p-guest@x.test', phone: '9800000002' });
    await Booking.create({ user: guestUser._id, hotel: hotel._id, company, room: room._id, guest: guestDoc._id,
      checkIn: new Date(Date.now() - 86400000), checkOut: new Date(Date.now() + 86400000), guests: { adults: 1, children: 0 },
      totalAmount: 1130, currency: 'NPR', status: 'Checked-In', paymentStatus: 'unpaid' });
    const mkStaff = (role) => User.create({ fullname: role, username: `p-${role}`, email: `p-${role}@x.test`, password: 'isolated-tests-only',
      companyRole: role, company, assignedProperties: [hotel._id], isActive: true });
    const waiter = await mkStaff('waiter');
    const manager = await mkStaff('manager');

    const paths = {
      qr: async (items) => {
        const r = await call(guest.createGuestOrder, { body: {
          hotelId: String(hotel._id), tableToken: table.uniqueToken, orderType: 'dineIn', customerName: 'Asha',
          guestSessionId: 'GUEST-12345678-1234-1234-1234-123456789012', idempotencyKey: key(), items,
        } });
        return { status: r.status, order: r.body.order, message: r.body.message };
      },
      portal: async (items) => {
        const r = await call(portal.placeOrder, { user: guestUser, body: { hotelId: String(hotel._id), orderType: 'roomService', items } });
        return { status: r.status, order: r.body.data, message: r.body.message };
      },
      staff: async (items, user = waiter) => {
        const r = await call(staff.createOrder, { user, body: {
          hotelId: String(hotel._id), orderType: 'dineIn', tableId: String(table._id), items, idempotencyKey: key(),
        } });
        return { status: r.status, order: r.body.order, message: r.body.message };
      },
    };

    for (const [name, place] of Object.entries(paths)) {
      await t.test(`${name}: lines are priced from this hotel's menu`, async () => {
        const ok = await place([{ menuItem: String(momo._id), quantity: 2, price: 1, name: 'Free' }]);
        assert.equal(ok.status, 201, ok.message);
        assert.equal(ok.order.totalPrice, 600);
        assert.equal(ok.order.items[0].price, 300);
        assert.equal(ok.order.items[0].name, 'Momo');
      });

      await t.test(`${name}: foreign, unavailable and malformed lines are refused`, async () => {
        assert.equal((await place([{ menuItem: String(foreign._id), quantity: 1 }])).status, 404, 'other hotel item');
        assert.equal((await place([{ menuItem: String(soldOut._id), quantity: 1 }])).status, 400, 'unavailable');
        assert.equal((await place([{ menuItem: 'not-an-id', quantity: 1 }])).status, 400, 'bad id');
        for (const quantity of [0, 1.5, '2', -1, 999]) {
          assert.equal((await place([{ menuItem: String(momo._id), quantity }])).status, 400, `quantity ${quantity}`);
        }
        assert.equal((await place([{ menuItem: String(momo._id), quantity: 1, notes: 'x'.repeat(201) }])).status, 400, 'long note');
        assert.equal((await place(Array.from({ length: 51 }, () => ({ menuItem: String(momo._id), quantity: 1 })))).status, 400, 'too many lines');
        assert.equal((await place([])).status, 400, 'empty');
      });
    }

    await t.test('open-priced custom lines: refused for guests and waiters, allowed for managers', async () => {
      const custom = [{ name: 'Birthday cake', price: 800, quantity: 1 }];
      assert.equal((await paths.qr(custom)).status, 400);
      assert.equal((await paths.portal(custom)).status, 400);
      assert.equal((await paths.staff(custom, waiter)).status, 403);
      const managerRes = await paths.staff(custom, manager);
      assert.equal(managerRes.status, 201, managerRes.message);
      assert.equal(managerRes.order.totalPrice, 800);
    });

    await t.test('priceMenuLines prices in one query and rounds to paisa', async () => {
      const cheap = await MenuItem.create({ hotel: hotel._id, name: 'Candy', category: 'Snacks', price: 33.33 });
      const { items, totalPrice } = await priceMenuLines({
        hotelId: hotel._id,
        items: [{ menuItem: String(cheap._id), quantity: 3 }, { menuItem: String(cheap._id), quantity: 1, notes: ' no sugar ' }],
      });
      assert.equal(totalPrice, 133.32);
      assert.equal(items.length, 2);
      assert.equal(items[1].notes, 'no sugar');
    });
  });
});
