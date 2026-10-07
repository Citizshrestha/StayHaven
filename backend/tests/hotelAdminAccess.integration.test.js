import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

// Regression tests for hotel-admin tenancy (rooms, tables, menu, seed) and
// the room/table/menu validation added on qa/hoteladmin.
test('hotel-admin endpoints are tenant- and property-scoped and validate input', { timeout: 600000 }, async () => {
  await withEphemeralWalletDatabase(async () => {
    const { walletFixtures } = await import('./helpers/walletFixtures.js');
    await import('../models/company.schema.js');
    const { Hotel } = await import('../models/hotel.schema.js');
    const { Room } = await import('../models/room.schema.js');
    const { HotelTable } = await import('../models/hotelTable.schema.js');
    const { MenuItem } = await import('../models/menuItem.schema.js');
    const rooms = await import('../controllers/roomController.js');
    const tables = await import('../controllers/hotelTableController.js');
    const menu = await import('../controllers/menuController.js');
    const { assertHotelAccess } = await import('../controllers/hotelAdminAccess.js');

    const fx = await walletFixtures();
    const companyA = fx.company;
    const companyB = new mongoose.Types.ObjectId();
    const hotelA = fx.hotel;
    const hotelA2 = await Hotel.create({ ...hotelA.toObject(), _id: undefined, name: 'Second A Hotel' });
    const hotelB = await Hotel.create({ ...hotelA.toObject(), _id: undefined, name: 'Company B Hotel', company: companyB, owner: new mongoose.Types.ObjectId() });

    const as = (role, company, hotels, extra = {}) => ({
      _id: new mongoose.Types.ObjectId(), role: { name: role }, company, assignedProperties: hotels.map((h) => h._id), ...extra,
    });
    const ownerA = as('owner', companyA, [hotelA]);
    const ownerB = as('owner', companyB, [hotelB]);
    const ownerNoCompany = as('owner', null, []);
    const managerA1 = as('manager', companyA, [hotelA]);
    const adminA = as('admin', companyA, [hotelA]);
    const hoteladminA = as('hoteladmin', companyA, [hotelA]);
    const waiterA = as('waiter', companyA, [hotelA]);
    const superadmin = as('superadmin', null, []);
    const guest = as('guest', null, []);

    async function call(handler, user, { params = {}, body = {}, query = {} } = {}) {
      let status = 200; let payload; let raised;
      await handler({ params, body, query, user }, {
        status(code) { status = code; return this; },
        json(data) { payload = data; return this; },
      }, (error) => { raised = error; });
      if (raised) return { status: raised.status || 500, payload: { message: raised.message } };
      return { status, payload };
    }

    // ── assertHotelAccess ──
    const access = async (user, hotel, opts) => assertHotelAccess({ user }, hotel._id, opts).then(() => 200, (e) => e.status);
    assert.equal(await access(ownerA, hotelA), 200);
    assert.equal(await access(ownerA, hotelA2), 200, 'owner reaches every hotel of their company');
    assert.equal(await access(ownerB, hotelA), 403, 'owner of another company is rejected');
    assert.equal(await access(ownerNoCompany, hotelA), 403, 'null company no longer skips the check');
    assert.equal(await access(managerA1, hotelA2), 403, 'manager limited to assigned properties');
    assert.equal(await access(adminA, hotelA), 200, 'admin is a company-scoped hotel admin');
    assert.equal(await access(hoteladminA, hotelA), 200);
    assert.equal(await access(superadmin, hotelA), 403);
    assert.equal(await access(guest, hotelA), 403);
    assert.equal(await access(waiterA, hotelA, { roles: ['owner', 'manager'] }), 403, 'role restriction applies');
    assert.equal(await assertHotelAccess({ user: ownerA }, 'abc').then(() => 200, (e) => e.status), 404);

    // ── Rooms ──
    const roomBody = { hotelId: String(hotelA._id), roomNumber: '201', roomName: 'Deluxe', type: 'double', price: 2500 };
    assert.equal((await call(rooms.createRoom, ownerB, { body: roomBody })).status, 403);
    assert.equal((await call(rooms.createRoom, waiterA, { body: roomBody })).status, 403);
    assert.equal((await call(rooms.createRoom, ownerA, { body: { ...roomBody, type: 'Standard' } })).status, 400);
    assert.equal((await call(rooms.createRoom, ownerA, { body: { ...roomBody, price: -1 } })).status, 400);
    assert.equal((await call(rooms.createRoom, ownerA, { body: { ...roomBody, maxGuests: 0 } })).status, 400);
    assert.equal((await call(rooms.createRoom, ownerA, { body: { ...roomBody, status: 'occupied' } })).status, 400);
    const created = await call(rooms.createRoom, hoteladminA, { body: { ...roomBody, rating: 1, company: String(companyB) } });
    assert.equal(created.status, 201);
    assert.equal(String(created.payload.room.company), String(companyA), 'company comes from the hotel');
    assert.equal(created.payload.room.rating, 4, 'rating is not client-assignable');
    assert.equal((await call(rooms.createRoom, ownerA, { body: { ...roomBody, roomNumber: ' 201 ' } })).status, 400, 'duplicate after trim');
    const roomId = String(created.payload.room._id);
    assert.equal((await call(rooms.updateRoom, ownerA, { params: { id: roomId }, body: { rating: 5, hotel: String(hotelB._id) } })).status, 200);
    const stored = await Room.findById(roomId);
    assert.equal(stored.rating, 4);
    assert.equal(String(stored.hotel), String(hotelA._id));
    assert.equal((await call(rooms.updateRoom, ownerB, { params: { id: roomId }, body: { roomName: 'x' } })).status, 403);
    assert.equal((await call(rooms.getRoomById, ownerA, { params: { id: 'abc' } })).status, 404);
    await fx.booking({ room: stored._id, status: 'Checked-In' });
    assert.equal((await call(rooms.updateRoom, ownerA, { params: { id: roomId }, body: { status: 'maintenance' } })).status, 400, 'no manual status change while a guest is checked in');
    const list = await call(rooms.getRooms, waiterA, { query: { hotelId: String(hotelA._id) } });
    assert.equal(list.status, 200);
    assert.ok(list.payload.rooms.every((r) => !r.uniqueToken && !r.qrCodeImage), 'QR secrets stripped for non-admin roles');
    assert.equal((await call(rooms.getRooms, ownerB, { query: { hotelId: String(hotelA._id) } })).status, 403);

    // ── Tables ──
    assert.equal((await call(tables.getTables, ownerB, { query: { hotelId: String(hotelA._id) } })).status, 403);
    assert.equal((await call(tables.getTables, superadmin, { query: { hotelId: String(hotelA._id) } })).status, 403);
    const t = await call(tables.createTable, ownerA, { body: { hotelId: String(hotelA._id), tableNumber: ' a1 ', capacity: '02', status: 'reserved' } });
    assert.equal(t.status, 201);
    assert.equal(t.payload.table.tableNumber, 'A1');
    assert.equal(t.payload.table.capacity, 2);
    assert.equal(t.payload.table.status, 'reserved');
    assert.equal((await call(tables.createTable, ownerA, { body: { hotelId: String(hotelA._id), tableNumber: 'A1' } })).status, 400);
    for (const capacity of [0, 51, 2.5, 'x']) {
      assert.equal((await call(tables.createTable, ownerA, { body: { hotelId: String(hotelA._id), tableNumber: 'C9', capacity } })).status, 400, `capacity ${capacity}`);
    }
    const tableId = String(t.payload.table._id);
    const oldToken = t.payload.table.uniqueToken;
    const regen = await call(tables.generateTableQR, ownerA, { params: { id: tableId }, body: { regenerate: true } });
    assert.notEqual(regen.payload.table.uniqueToken, oldToken, 'regenerate issues a new token');
    assert.equal((await call(tables.generateTableQR, ownerB, { params: { id: tableId }, body: {} })).status, 403);
    assert.equal((await call(tables.updateTableStatus, waiterA, { params: { id: tableId }, body: { status: 'occupied' } })).status, 200);
    assert.equal((await call(tables.deleteTable, managerA1, { params: { id: tableId } })).status, 403);
    const batchBody = { hotelId: String(hotelA._id), startNumber: 1, count: 3, prefix: 'B' };
    assert.equal((await call(tables.batchCreateTables, ownerA, { body: { ...batchBody, count: 51 } })).status, 400);
    assert.equal((await call(tables.batchCreateTables, ownerA, { body: { ...batchBody, startNumber: 0 } })).status, 400);
    assert.equal((await call(tables.batchCreateTables, ownerA, { body: batchBody })).payload.createdCount, 3);
    const again = await call(tables.batchCreateTables, ownerA, { body: batchBody });
    assert.equal(again.payload.createdCount, 0);
    assert.equal(again.payload.skippedCount, 3);
    assert.equal(await HotelTable.countDocuments({ hotel: hotelA._id }), 4);

    // ── Menu ──
    const item = await MenuItem.create({ hotel: hotelA._id, name: 'Momo', category: 'Lunch', price: 0 });
    assert.equal((await call(menu.getMenuItems, ownerB, { query: { hotelId: String(hotelA._id) } })).status, 403);
    assert.equal((await call(menu.updateMenuItem, ownerB, { params: { itemId: String(item._id) }, body: { name: 'x' } })).status, 403);
    assert.equal((await call(menu.bulkToggleAvailability, ownerB, { body: { hotelId: String(hotelA._id), isAvailable: false } })).status, 403);
    assert.equal((await call(menu.updateMenuItem, ownerA, { params: { itemId: String(item._id) }, body: { price: 0, name: 'Momo 2' } })).status, 200);
    assert.equal((await call(menu.updateMenuItem, ownerA, { params: { itemId: String(item._id) }, body: { preparationTime: 4 } })).status, 400);
    assert.equal((await call(menu.updateMenuItem, ownerA, { params: { itemId: String(item._id) }, body: { name: 'n'.repeat(101) } })).status, 400);
    assert.equal((await call(menu.updateMenuItem, ownerA, { params: { itemId: 'abc' }, body: { name: 'x' } })).status, 404);
    assert.equal((await call(menu.createMenuItem, waiterA, { body: { hotelId: String(hotelA._id), name: 'x', category: 'Lunch', price: 1 } })).status, 403);
  });
});
