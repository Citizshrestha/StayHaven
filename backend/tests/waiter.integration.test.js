import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

// Waiter calls and table assignments must be scoped to the hotels the signed-in user works at.
test('waiter calls and table assignments are hotel-scoped and race-safe', { timeout: 600000 }, async () => {
  await withEphemeralWalletDatabase(async () => {
    const { walletFixtures } = await import('./helpers/walletFixtures.js');
    const { User } = await import('../models/user.schema.js');
    await import('../models/company.schema.js');
    const { Hotel } = await import('../models/hotel.schema.js');
    const { WaiterCall } = await import('../models/waitercall.schema.js');
    const { TableAssignment } = await import('../models/tableAssignment.schema.js');
    const calls = await import('../controllers/waitercall.controller.js');
    const assign = await import('../controllers/tableAssignment.controller.js');

    const fixture = await walletFixtures();
    const hotelA = fixture.hotel;
    const hotelB = await Hotel.create({
      company: new mongoose.Types.ObjectId(), owner: fixture.stranger._id, name: 'Other Company Hotel',
      description: 'Isolation fixture', category: 'Hotel', starRating: 3,
      location: { city: 'Pokhara', country: 'Nepal', address: 'Lake Road' },
      contact: { phone: '9800000002', email: 'other-hotel@example.test' }, images: ['https://wallet-tests.invalid/b.jpg'],
      priceRange: { min: 1000, max: 1000 }, status: 'approved', isActive: true, totalRooms: 1, availableRooms: 1,
    });
    const mkUser = (name, role, hotel, company = fixture.company) => User.create({
      fullname: name, username: name, email: `${name}@example.test`, password: 'test-password', companyRole: role,
      company, assignedProperties: [hotel._id], accountStatus: 'active', isActive: true,
    });
    const waiterA = await mkUser('waiter-a', 'waiter', hotelA);
    const waiterA2 = await mkUser('waiter-a2', 'waiter', hotelA);
    const manager = await mkUser('manager-a', 'manager', hotelA);
    const foreignWaiter = await mkUser('waiter-b', 'waiter', hotelB, hotelB.company);
    const reqUser = (u, role = u.companyRole) => ({ ...u.toObject(), _id: u._id, role: { name: role }, assignedProperties: u.assignedProperties.map(_id => ({ _id })), fullname: u.fullname });
    const guest = { ...reqUser(waiterA, 'guest'), assignedProperties: [], company: null };

    async function call(handler, { user, params = {}, body = {}, query = {} }) {
      let status = 200; let payload; let raised;
      await handler({ user, params, body, query }, {
        status(code) { status = code; return this; },
        json(data) { payload = data; return this; },
      }, error => { raised = error; });
      if (raised) return { status: raised.status || 500, payload: { message: raised.message } };
      return { status, payload };
    }
    const A = String(hotelA._id); const B = String(hotelB._id);

    // Waiter calls: hotel scoping
    const created = await call(calls.createWaiterCall, { user: reqUser(waiterA), body: { hotelId: A, roomNumber: '101', priority: 'urgent', status: 'resolved', assignedTo: String(waiterA2._id) } });
    assert.equal(created.status, 201);
    assert.equal(created.payload.call.status, 'open', 'client cannot set status');
    assert.equal(created.payload.call.assignedTo, undefined, 'client cannot set assignee');
    const callId = String(created.payload.call._id);
    assert.equal((await call(calls.createWaiterCall, { user: reqUser(waiterA), body: { hotelId: B, roomNumber: '1' } })).status, 403);
    assert.equal((await call(calls.createWaiterCall, { user: guest, body: { hotelId: A, roomNumber: '1' } })).status, 403);
    assert.equal((await call(calls.createWaiterCall, { user: reqUser(waiterA), body: { hotelId: A, roomNumber: '1', priority: 'nuclear' } })).status, 400);
    assert.equal((await call(calls.createWaiterCall, { user: reqUser(waiterA), body: { hotelId: A, roomNumber: '1', description: 'x'.repeat(501) } })).status, 400);
    assert.equal((await call(calls.getActiveWaiterCalls, { user: reqUser(foreignWaiter), query: { hotelId: A } })).status, 403);
    assert.equal((await call(calls.getActiveWaiterCalls, { user: guest, query: { hotelId: A } })).status, 403);
    assert.equal((await call(calls.getWaiterCallHistory, { user: reqUser(foreignWaiter), query: { hotelId: A } })).status, 403);
    assert.equal((await call(calls.getActiveWaiterCalls, { user: reqUser(waiterA), query: { hotelId: { $ne: null } } })).status, 400);
    const listed = await call(calls.getActiveWaiterCalls, { user: reqUser(waiterA), query: {} });
    assert.equal(listed.status, 200, 'defaults to the first assigned hotel');
    assert.equal(listed.payload.calls.length, 1);

    // Priority order: urgent first even though "medium" sorts after "high" alphabetically
    await call(calls.createWaiterCall, { user: reqUser(waiterA), body: { hotelId: A, roomNumber: '102', priority: 'medium' } });
    await call(calls.createWaiterCall, { user: reqUser(waiterA), body: { hotelId: A, roomNumber: '103', priority: 'high' } });
    await call(calls.createWaiterCall, { user: reqUser(waiterA), body: { hotelId: A, roomNumber: '104', priority: 'low' } });
    const ordered = await call(calls.getActiveWaiterCalls, { user: reqUser(waiterA), query: { hotelId: A } });
    assert.deepEqual(ordered.payload.calls.map(c => c.priority), ['urgent', 'high', 'medium', 'low']);

    // Acknowledge: cross-hotel denied, atomic claim, second waiter gets 409
    assert.equal((await call(calls.acknowledgeWaiterCall, { user: reqUser(foreignWaiter), params: { callId }, body: { hotelId: A } })).status, 403);
    assert.equal((await call(calls.acknowledgeWaiterCall, { user: reqUser(foreignWaiter), params: { callId }, body: {} })).status, 404, 'without a hotel it resolves to the caller\'s own hotel, where the call does not exist');
    assert.equal((await call(calls.acknowledgeWaiterCall, { user: reqUser(waiterA), params: { callId: 'nope' }, body: {} })).status, 404);
    const race = await Promise.all([
      call(calls.acknowledgeWaiterCall, { user: reqUser(waiterA), params: { callId }, body: {} }),
      call(calls.acknowledgeWaiterCall, { user: reqUser(waiterA2), params: { callId }, body: {} }),
    ]);
    assert.deepEqual(race.map(r => r.status).sort(), [200, 409], 'exactly one waiter wins a simultaneous acknowledge');
    const taken = await WaiterCall.findById(callId);
    assert.equal(taken.status, 'acknowledged');
    const winner = race[0].status === 200 ? waiterA : waiterA2;
    const loser = race[0].status === 200 ? waiterA2 : waiterA;
    assert.equal(String(taken.assignedTo), String(winner._id));

    // Resolve: not by another waiter, allowed for the assignee and supervisors, never twice, never cross-hotel
    assert.equal((await call(calls.resolveWaiterCall, { user: reqUser(foreignWaiter), params: { callId }, body: { hotelId: A } })).status, 403);
    assert.equal((await call(calls.resolveWaiterCall, { user: reqUser(loser), params: { callId }, body: {} })).status, 403);
    assert.equal((await call(calls.resolveWaiterCall, { user: reqUser(winner), params: { callId }, body: { notes: 'x'.repeat(501) } })).status, 400);
    assert.equal((await call(calls.resolveWaiterCall, { user: reqUser(winner), params: { callId }, body: { notes: 'done' } })).status, 200);
    assert.equal((await call(calls.resolveWaiterCall, { user: reqUser(winner), params: { callId }, body: {} })).status, 409);
    const other = (await WaiterCall.findOne({ roomNumber: '102' }));
    await call(calls.acknowledgeWaiterCall, { user: reqUser(waiterA), params: { callId: String(other._id) }, body: {} });
    assert.equal((await call(calls.resolveWaiterCall, { user: reqUser(manager), params: { callId: String(other._id) }, body: {} })).status, 200, 'a manager can close a call another waiter is handling');

    // Table assignments
    const asg = (user, body) => call(assign.assignTables, { user, body });
    assert.equal((await asg(reqUser(manager), { hotelId: B, waiterId: String(foreignWaiter._id), tables: ['T1'] })).status, 403);
    assert.equal((await asg(reqUser(manager), { hotelId: A, waiterId: String(foreignWaiter._id), tables: ['T1'] })).status, 404, 'staff of another hotel cannot be assigned');
    assert.equal((await asg(reqUser(manager), { hotelId: A, waiterId: { $ne: null }, tables: ['T1'] })).status, 400);
    assert.equal((await asg(reqUser(manager), { hotelId: A, waiterId: String(waiterA._id), tables: Array.from({ length: 500 }, (_, i) => `T${i}`) })).status, 400);
    assert.equal((await asg(reqUser(manager), { hotelId: A, waiterId: String(waiterA._id), tables: ['T1'], shift: 'brunch' })).status, 400);
    const okAsg = await asg(reqUser(manager), { hotelId: A, waiterId: String(waiterA._id), waiterName: 'Spoofed', tables: ['T1', 'T2', 'T1'], rooms: ['101'] });
    assert.equal(okAsg.status, 201);
    assert.equal(okAsg.payload.data.waiterName, waiterA.fullname, 'waiter name comes from the user record, not the client');
    assert.deepEqual([...okAsg.payload.data.tables], ['T1', 'T2']);

    const mine = await call(assign.getMyAssignment, { user: reqUser(waiterA), query: {} });
    assert.equal(mine.status, 200);
    assert.deepEqual([...mine.payload.data.tables], ['T1', 'T2'], 'a waiter sees their own tables without passing a hotel id');
    assert.equal((await call(assign.getMyAssignment, { user: reqUser(waiterA), query: { hotelId: B } })).status, 403);
    assert.equal((await call(assign.lookupAssignedWaiter, { user: reqUser(waiterA2), query: { table: 'T1' } })).payload.data.waiterId.toString(), String(waiterA._id));
    assert.equal((await call(assign.lookupAssignedWaiter, { user: reqUser(foreignWaiter), query: { table: 'T1', hotelId: A } })).status, 403);
    assert.equal((await call(assign.lookupAssignedWaiter, { user: reqUser(waiterA), query: { table: { $ne: 'x' } } })).status, 400);
    assert.equal((await call(assign.getTableAssignments, { user: reqUser(manager), query: { hotelId: B } })).status, 403);

    // Bulk: a bad entry must not wipe the existing assignments
    const bad = await call(assign.bulkUpdateAssignments, { user: reqUser(manager), body: { hotelId: A, assignments: [{ waiterId: String(waiterA._id), tables: ['T9'] }, { waiterId: 'nope', tables: ['T8'] }] } });
    assert.equal(bad.status, 400);
    assert.equal(await TableAssignment.countDocuments({ hotel: A, isActive: true }), 1);
    const dup = await call(assign.bulkUpdateAssignments, { user: reqUser(manager), body: { hotelId: A, assignments: [{ waiterId: String(waiterA._id), tables: ['T9'] }, { waiterId: String(waiterA._id), tables: ['T8'] }] } });
    assert.equal(dup.status, 400);
    const bulk = await call(assign.bulkUpdateAssignments, { user: reqUser(manager), body: { hotelId: A, assignments: [{ waiterId: String(waiterA._id), tables: ['T3'] }, { waiterId: String(waiterA2._id), rooms: ['102'] }] } });
    assert.equal(bulk.status, 200);
    assert.equal(await TableAssignment.countDocuments({ hotel: A, isActive: true }), 2);

    // Remove: scoped to the manager's hotel
    const foreignAsg = await TableAssignment.create({ hotel: B, waiter: foreignWaiter._id, waiterName: 'x', tables: ['T1'] });
    assert.equal((await call(assign.removeAssignment, { user: reqUser(manager), params: { assignmentId: String(foreignAsg._id) }, query: {} })).status, 404);
    assert.equal((await TableAssignment.findById(foreignAsg._id)).isActive, true);
    assert.equal((await call(assign.removeAssignment, { user: reqUser(manager), params: { assignmentId: String(foreignAsg._id) }, query: { hotelId: B } })).status, 403);
    assert.equal((await call(assign.removeAssignment, { user: reqUser(manager), params: { assignmentId: 'nope' }, query: {} })).status, 404);
  });
});
