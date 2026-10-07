import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

test('hotel staff management is property-scoped and revokes access safely', { timeout: 600000 }, async () => {
  await withEphemeralWalletDatabase(async () => {
    const { walletFixtures } = await import('./helpers/walletFixtures.js');
    const { User } = await import('../models/user.schema.js');
    await import('../models/company.schema.js');
    const { Role } = await import('../models/role.schema.js');
    const { Hotel } = await import('../models/hotel.schema.js');
    const management = await import('../controllers/staffManagementController.js');
    const { getStaffList: getReceptionStaffList } = await import('../controllers/receptionController.js');
    const { inviteStaff, resendInvite, registerStaff, getPropertyStaff, getPendingInvites, deleteInvite } = await import('../controllers/staffController.js');
    const { transporter } = await import('../config/nodemailer.js');
    const { protect } = await import('../middleware/authMiddleware.js');
    const { generateAccessToken } = await import('../utils/tokenUtils.js');
    const fixture = await walletFixtures();
    const [managerRole, waiterRole] = await Promise.all([
      Role.create({ name: 'manager' }), Role.create({ name: 'waiter' }),
    ]);
    const actor = { _id: fixture.user._id, company: fixture.company, role: { name: 'manager' }, assignedProperties: [fixture.hotel._id], fullname: 'Test Manager' };
    const worker = await User.create({
      fullname: 'Test Waiter', username: 'staff-test-waiter', email: 'staff-waiter@example.test',
      password: 'test-password', role: waiterRole._id, companyRole: 'waiter', company: fixture.company,
      assignedProperties: [fixture.hotel._id], accountStatus: 'active', isActive: true, refreshToken: 'revoked-by-test',
    });
    const other = await User.create({
      fullname: 'Other Company Staff', username: 'other-company-staff', email: 'other-staff@example.test',
      password: 'test-password', role: waiterRole._id, companyRole: 'waiter', company: new mongoose.Types.ObjectId(),
      assignedProperties: [fixture.hotel._id], accountStatus: 'active', isActive: true,
    });
    const anotherManager = await User.create({
      fullname: 'Another Manager', username: 'other-manager-test', email: 'manager@example.test',
      password: 'test-password', role: managerRole._id, companyRole: 'manager', company: fixture.company,
      assignedProperties: [fixture.hotel._id], accountStatus: 'active', isActive: true,
    });

    async function call(handler, params = {}, body = {}, user = actor) {
      let status = 200;
      let payload;
      let raised;
      await handler({ params, body, user }, {
        status(code) { status = code; return this; },
        json(data) { payload = data; return this; },
      }, error => { raised = error; });
      if (raised) throw raised;
      return { status, payload };
    }
    const propertyId = String(fixture.hotel._id);
    const params = { propertyId, staffId: String(worker._id) };

    const listed = await call(management.listManagedStaff, { propertyId });
    assert.equal(listed.status, 200);
    assert.equal((await call(management.listManagedStaff, { propertyId }, {}, { ...actor, role: { name: 'hoteladmin' } })).status, 200);
    assert.ok(listed.payload.data.some(member => String(member._id) === String(worker._id) && member.isActive));
    assert.ok(!listed.payload.data.some(member => String(member._id) === String(other._id)));
    let receptionPayload;
    await getReceptionStaffList({ user: actor, params: {}, body: {}, query: { companyId: String(other.company), hotelId: propertyId } }, {
      status() { return this; }, json(value) { receptionPayload = value; return this; },
    });
    assert.ok(!receptionPayload.data.some(member => String(member._id) === String(other._id)), 'query companyId must not override authenticated company');
    const receptionWorker = receptionPayload.data.find(member => String(member._id) === String(worker._id));
    assert.equal(receptionWorker.rating, null, 'untracked staff ratings must not be fabricated');
    assert.equal(receptionWorker.tasksCompleted, null, 'untracked task counts must not be fabricated');
    assert.equal((await call(management.editManagedStaff, { propertyId, staffId: String(other._id) }, { fullname: 'Wrong', role: 'waiter' })).status, 404);
    assert.equal((await call(management.changeManagedStaffStatus, { propertyId, staffId: String(anotherManager._id) }, { isActive: false })).status, 403);
    const ownerActor = { ...actor, role: { name: 'owner' } };
    assert.equal((await call(management.changeManagedStaffStatus, { propertyId, staffId: String(anotherManager._id) }, { isActive: false }, ownerActor)).status, 200);
    assert.equal((await User.findById(anotherManager._id)).isActive, false);
    assert.equal((await call(management.changeManagedStaffStatus, { propertyId, staffId: String(anotherManager._id) }, { isActive: true }, ownerActor)).status, 200);
    assert.equal((await call(management.editManagedStaff, params, { fullname: 'Promoted', role: 'manager' })).status, 400);

    const edited = await call(management.editManagedStaff, params, { fullname: 'Senior Waiter', role: 'waiter', contact: '9800000012' });
    assert.equal(edited.status, 200);
    assert.equal((await User.findById(worker._id)).fullname, 'Senior Waiter');
    assert.equal((await call(management.changeManagedStaffStatus, params, { isActive: 'false' })).status, 400);
    const deactivated = await call(management.changeManagedStaffStatus, params, { isActive: false });
    assert.equal(deactivated.status, 200);
    const inactive = await User.findById(worker._id);
    assert.equal(inactive.isActive, false);
    assert.equal(inactive.accountStatus, 'deactivated');
    assert.equal(inactive.refreshToken, null);
    const previousSecret = process.env.JWT_ACCESS_SECRET;
    process.env.JWT_ACCESS_SECRET = 'isolated-staff-integration-secret-not-for-production';
    try {
      const token = generateAccessToken(worker._id);
      let status = 200;
      await protect({ headers: { authorization: `Bearer ${token}` }, cookies: {} }, {
        status(code) { status = code; return this; },
        json() { return this; },
      }, error => { throw error; });
      assert.equal(status, 403, 'existing access tokens must fail immediately after deactivation');
    } finally {
      if (previousSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
      else process.env.JWT_ACCESS_SECRET = previousSecret;
    }
    assert.equal((await call(management.changeManagedStaffStatus, params, { isActive: true })).status, 200);
    assert.equal((await User.findById(worker._id)).isActive, true);

    const removed = await call(management.removeManagedStaff, params);
    assert.equal(removed.status, 200);
    assert.ok((await User.findById(worker._id)).staffRemovedAt);
    assert.equal((await call(management.changeManagedStaffStatus, params, { isActive: true })).status, 404);
    assert.ok(!(await call(management.listManagedStaff, { propertyId })).payload.data.some(member => String(member._id) === String(worker._id)));

    const otherProperty = await Hotel.create({ company: fixture.company, owner: fixture.user._id, name: 'Other Test Hotel',
      description: 'Other property', category: 'Hotel', starRating: 3,
      location: { city: 'Kathmandu', country: 'Nepal', address: 'Other Street' },
      contact: { phone: '9800000000', email: 'other-hotel@example.test' },
      images: ['https://staff-tests.invalid/hotel.jpg'], priceRange: { min: 1000, max: 1000 } });
    assert.equal((await call(management.listManagedStaff, { propertyId: String(otherProperty._id) })).status, 403);
    assert.equal((await call(getPropertyStaff, { propertyId: String(otherProperty._id) })).status, 403);
    assert.equal((await call(registerStaff, {}, {
      fullname: 'Unassigned Staff', username: 'unassigned-staff-test', email: 'unassigned-staff@example.test',
      password: 'test-password', role: 'waiter', propertyId: String(otherProperty._id),
    })).status, 403);
    const otherPropertyInvite = await User.create({
      fullname: 'Other Property Invite', username: 'other-property-invite', email: 'other-property-invite@example.test',
      password: 'test-password', role: waiterRole._id, companyRole: 'waiter', company: fixture.company,
      assignedProperties: [otherProperty._id], accountStatus: 'invited', isActive: false,
    });
    const managerInvite = await User.create({
      fullname: 'Manager Invite', username: 'manager-invite', email: 'manager-invite@example.test',
      password: 'test-password', role: managerRole._id, companyRole: 'manager', company: fixture.company,
      assignedProperties: [fixture.hotel._id], accountStatus: 'invited', isActive: false,
    });
    const visibleInvites = await call(getPendingInvites);
    assert.ok(!visibleInvites.payload.invites.some((invite) => String(invite._id) === String(otherPropertyInvite._id)));
    assert.ok(!visibleInvites.payload.invites.some((invite) => String(invite._id) === String(managerInvite._id)));
    assert.equal((await call(deleteInvite, { staffId: String(otherPropertyInvite._id) })).status, 403);
    assert.equal((await call(deleteInvite, { staffId: String(managerInvite._id) })).status, 403);

    const sendMail = transporter.sendMail;
    transporter.sendMail = async () => ({ messageId: 'isolated-staff-test' });
    try {
      const invited = await call(inviteStaff, {}, { fullname: 'Invited Waiter', email: 'invited@example.test', role: 'waiter', propertyId });
      assert.equal(invited.status, 200);
      assert.equal(invited.payload.emailDelivered, true);
      assert.equal((await User.findOne({ email: 'invited@example.test' })).accountStatus, 'invited');
      assert.equal((await call(management.changeManagedStaffStatus, { propertyId, staffId: String(invited.payload.staff._id) }, { isActive: true })).status, 409);
      transporter.sendMail = async () => { throw new Error('isolated SMTP outage'); };
      const resent = await call(resendInvite, { staffId: String(invited.payload.staff._id) });
      assert.equal(resent.status, 200);
      assert.equal(resent.payload.emailDelivered, false, 'email failures must not be reported as delivered');
      assert.equal((await call(inviteStaff, {}, { fullname: 'Unassigned', email: 'unassigned@example.test', role: 'waiter', propertyId: String(otherProperty._id) })).status, 403);
    } finally {
      transporter.sendMail = sendMail;
    }
  });
});
