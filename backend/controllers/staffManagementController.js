import mongoose from 'mongoose';
import { User } from '../models/user.schema.js';
import { Role } from '../models/role.schema.js';
import { Hotel } from '../models/hotel.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const workerRoles = new Set(['chief', 'waiter', 'receptionist', 'housekeeping', 'maintenance']);
const managerRoles = new Set(['owner', 'admin']);
const propertyManagerRoles = new Set(['manager', 'hoteladmin']);
const editableRoles = new Set([...workerRoles, 'manager']);
const departmentFor = (role) => ({
  receptionist: 'Front Office', manager: 'Front Office', chief: 'Food & Beverage',
  waiter: 'Food & Beverage', housekeeping: 'Housekeeping', maintenance: 'Maintenance',
})[role] || 'General';

const actorRole = (user) => user?.role?.name || user?.companyRole;
const idOf = (value) => String(value?._id || value || '');
const sameId = (a, b) => idOf(a) === idOf(b);

const allowedTarget = (actor, staff) => {
  if (sameId(actor._id, staff._id)) return false;
  if (!editableRoles.has(staff.companyRole || staff.role?.name)) return false;
  return !propertyManagerRoles.has(actorRole(actor)) || workerRoles.has(staff.companyRole || staff.role?.name);
};

async function propertyForActor(req, res) {
  const propertyId = req.params.propertyId;
  if (!mongoose.isValidObjectId(propertyId) || !req.user?.company) {
    res.status(400).json({ success: false, message: 'Valid property and company are required' });
    return null;
  }
  const hotel = await Hotel.findOne({ _id: propertyId, company: req.user.company }).select('_id name');
  if (!hotel) {
    res.status(404).json({ success: false, message: 'Property not found or access denied' });
    return null;
  }
  if (propertyManagerRoles.has(actorRole(req.user)) && !req.user.assignedProperties?.some((item) => sameId(item, hotel._id))) {
    res.status(403).json({ success: false, message: 'You are not assigned to this property' });
    return null;
  }
  return hotel;
}

async function managedStaff(req, res, hotel) {
  if (!mongoose.isValidObjectId(req.params.staffId)) {
    res.status(400).json({ success: false, message: 'Invalid staff member' });
    return null;
  }
  const staff = await User.findOne({
    _id: req.params.staffId,
    company: req.user.company,
    assignedProperties: hotel._id,
    staffRemovedAt: null,
  }).populate('role', 'name');
  if (!staff) {
    res.status(404).json({ success: false, message: 'Staff member not found for this property' });
    return null;
  }
  if (!allowedTarget(req.user, staff)) {
    res.status(403).json({ success: false, message: 'This staff member cannot be managed from here' });
    return null;
  }
  return staff;
}

const publicStaff = (staff, actor) => ({
  _id: staff._id,
  name: staff.fullname,
  email: staff.email,
  contact: staff.contact || '',
  role: staff.companyRole || staff.role?.name || 'staff',
  department: departmentFor(staff.companyRole || staff.role?.name),
  isActive: staff.isActive === true,
  accountStatus: staff.accountStatus,
  joinDate: staff.createdAt,
  canManage: allowedTarget(actor, staff),
});

export const listManagedStaff = asyncHandler(async (req, res) => {
  const hotel = await propertyForActor(req, res);
  if (!hotel) return;
  const staff = await User.find({
    company: req.user.company,
    assignedProperties: hotel._id,
    companyRole: { $in: [...editableRoles] },
    staffRemovedAt: null,
  }).select('fullname email contact role companyRole isActive accountStatus createdAt').populate('role', 'name').sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: staff.map((member) => publicStaff(member, req.user)) });
});

export const editManagedStaff = asyncHandler(async (req, res) => {
  const hotel = await propertyForActor(req, res);
  if (!hotel) return;
  const staff = await managedStaff(req, res, hotel);
  if (!staff) return;
  const fullname = typeof req.body.fullname === 'string' ? req.body.fullname.trim() : '';
  const roleName = typeof req.body.role === 'string' ? req.body.role.trim().toLowerCase() : '';
  const contact = req.body.contact === undefined ? staff.contact : req.body.contact;
  if (fullname.length < 2 || fullname.length > 120 || !editableRoles.has(roleName) ||
      (roleName === 'manager' && !managerRoles.has(actorRole(req.user))) ||
      typeof contact !== 'string' || contact.length > 40) {
    return res.status(400).json({ success: false, message: 'Valid name, permitted role and contact are required' });
  }
  const role = await Role.findOne({ name: roleName });
  if (!role) return res.status(400).json({ success: false, message: 'Role is not configured' });
  staff.fullname = fullname;
  staff.contact = contact.trim();
  if (staff.companyRole !== roleName) {
    staff.companyRole = roleName;
    staff.role = role._id;
    staff.refreshToken = null;
  }
  await staff.save();
  res.json({ success: true, staff: publicStaff(staff, req.user) });
});

export const changeManagedStaffStatus = asyncHandler(async (req, res) => {
  const hotel = await propertyForActor(req, res);
  if (!hotel) return;
  const staff = await managedStaff(req, res, hotel);
  if (!staff) return;
  if (typeof req.body.isActive !== 'boolean') {
    return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
  }
  if (req.body.isActive && staff.accountStatus === 'invited') {
    return res.status(409).json({ success: false, message: 'The staff member must complete their invitation before activation' });
  }
  staff.isActive = req.body.isActive;
  staff.accountStatus = req.body.isActive ? 'active' : 'deactivated';
  if (!req.body.isActive) staff.refreshToken = null;
  await staff.save();
  res.json({ success: true, staff: publicStaff(staff, req.user) });
});

export const removeManagedStaff = asyncHandler(async (req, res) => {
  const hotel = await propertyForActor(req, res);
  if (!hotel) return;
  const staff = await managedStaff(req, res, hotel);
  if (!staff) return;
  staff.isActive = false;
  staff.accountStatus = 'deactivated';
  staff.staffRemovedAt = new Date();
  staff.refreshToken = null;
  staff.inviteToken = null;
  staff.inviteTokenExpireAt = null;
  await staff.save();
  res.json({ success: true, message: 'Staff access removed; historical records were preserved' });
});
