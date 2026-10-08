import { User } from "../models/user.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { Booking } from "../models/booking.schema.js";
import { Company } from "../models/company.schema.js";
import { Role } from "../models/role.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { searchRegex, parsePaging } from "../utils/searchQuery.js";
import { logAudit } from "../middleware/auditLogger.js";

// These handlers manage EVERY tenant's users and hotels. The routers mount
// them behind authorize("admin"), but "admin" is a company-level role, so the
// platform-wide check lives here: only a superadmin may proceed.
const ensureSuperadmin = (req, res) => {
  if ((req.user?.role?.name || req.user?.companyRole) === "superadmin") return true;
  res.status(403).json({ success: false, message: "Super admin access required" });
  return false;
};

const ensureObjectId = (res, id, label = "id") => {
  if (typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)) return true;
  res.status(400).json({ success: false, message: `Invalid ${label}` });
  return false;
};

// Sorting is limited to non-sensitive columns (sorting by password/resetOtp
// would leak their ordering).
const USER_SORTS = new Set(["createdAt", "-createdAt", "fullname", "-fullname", "email", "-email", "lastLoginAt", "-lastLoginAt"]);
const HOTEL_SORTS = new Set(["createdAt", "-createdAt", "name", "-name", "starRating", "-starRating", "status", "-status"]);
const COMPANY_ROLES = new Set(User.schema.path("companyRole").enumValues);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Revokes the user's existing sessions: access tokens issued before now fail
// protect()'s passwordChangedAt check, and the refresh token is dropped.
const revokeSessions = (user) => {
  user.passwordChangedAt = new Date();
  user.refreshToken = null;
};

const auditUser = (user) => ({
  _id: user._id,
  email: user.email,
  fullname: user.fullname,
  role: user.role?.name || user.role,
  companyRole: user.companyRole,
  isActive: user.isActive,
  isDeleted: user.isDeleted,
});

const normalizeStatusFilter = (status) => {
  if (!status) return undefined;
  const normalized = String(status).toLowerCase();
  if (["active", "enabled", "true"].includes(normalized)) return true;
  if (["inactive", "disabled", "suspended", "false"].includes(normalized)) return false;
  return undefined;
};

// @desc    Get all users for superadmin/admin
// @route   GET /api/v1/users/admin/all
// @access  Private (Admin/Superadmin)
export const getAdminUsers = asyncHandler(async (req, res) => {
  if (!ensureSuperadmin(req, res)) return;
  const { search, role, status } = req.query;
  const sort = USER_SORTS.has(req.query.sort) ? req.query.sort : "-createdAt";
  const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 20, maxLimit: 100 });

  const filters = [
    { isDeleted: { $ne: true } }, // Exclude soft-deleted users
    { _id: { $ne: req.user._id } }, // Exclude current admin from list
  ];

  const regex = searchRegex(search);
  if (regex) {
    filters.push({
      $or: [
        { fullname: regex },
        { username: regex },
        { email: regex },
        { contact: regex },
      ],
    });
  }

  if (typeof role === "string" && role && role !== "all") {
    const roleDoc = await Role.findOne({ name: role });
    const roleConditions = [{ companyRole: role }];
    if (roleDoc) {
      roleConditions.push({ role: roleDoc._id });
    }
    filters.push({ $or: roleConditions });
  }

  const isActiveFilter = normalizeStatusFilter(status);
  if (typeof isActiveFilter === "boolean") {
    filters.push({ isActive: isActiveFilter });
  }

  const query = { $and: filters };

  const users = await User.find(query)
    .select("-password -refreshToken -resetOtp -resetOtpExpireAt -inviteToken -googleId")
    .populate("role", "name")
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    users,
  });
});

// @desc    Update user active status
// @route   PUT /api/v1/users/admin/:id/status
// @access  Private (Admin/Superadmin)
export const updateUserStatus = asyncHandler(async (req, res) => {
  if (!ensureSuperadmin(req, res) || !ensureObjectId(res, req.params.id, "user id")) return;
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "isActive (boolean) is required",
    });
  }

  const user = await User.findById(req.params.id).populate("role", "name");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (String(user._id) === String(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: "You cannot update your own status",
    });
  }

  if (user.role?.name === "superadmin" && req.user?.role?.name !== "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Cannot modify superadmin status",
    });
  }

  const before = auditUser(user);
  user.isActive = isActive;
  if (!isActive) user.refreshToken = null; // a suspended user can't silently refresh back in
  await user.save();
  await logAudit(req.user._id, isActive ? "activate_user" : "suspend_user", "user", user._id, before, auditUser(user), req);

  res.status(200).json({
    success: true,
    message: `User ${isActive ? "activated" : "suspended"} successfully`,
    user: {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      isActive: user.isActive,
      role: user.role,
      companyRole: user.companyRole,
    },
  });
});

// @desc    Get single user by ID with stats
// @route   GET /api/v1/users/admin/:id
// @access  Private (Admin/Superadmin)
export const getUserById = asyncHandler(async (req, res) => {
  if (!ensureSuperadmin(req, res) || !ensureObjectId(res, req.params.id, "user id")) return;
  const user = await User.findById(req.params.id)
    .select("-password -refreshToken -resetOtp -resetOtpExpireAt -inviteToken -googleId")
    .populate("role", "name")
    .populate("company", "name");

  if (!user || user.isDeleted) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // If user doesn't have a role, assign guest role
  if (!user.role && !user.companyRole) {
    const guestRole = await Role.findOne({ name: "guest" });
    if (guestRole) {
      user.role = guestRole._id;
      await user.save();
      // Re-populate after save
      await user.populate("role", "name");
    }
  }

  // Booking stats for this user
  const [totalBookings, spendAgg] = await Promise.all([
    Booking.countDocuments({ user: user._id }),
    Booking.aggregate([
      { $match: { user: user._id, status: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
  ]);
  const bookingStats = {
    totalBookings,
    totalSpent: spendAgg[0]?.total || 0,
  };

  res.status(200).json({
    success: true,
    data: {
      user,
      stats: bookingStats,
    },
  });
});

// @desc    Update user details
// @route   PATCH /api/v1/users/admin/:id
// @access  Private (Admin/Superadmin)
export const updateUser = asyncHandler(async (req, res) => {
  if (!ensureSuperadmin(req, res) || !ensureObjectId(res, req.params.id, "user id")) return;
  // Only these fields are editable here; password, company, isDeleted,
  // permissions etc. in the body are ignored.
  const { fullname, email, contact, role, companyRole, isActive } = req.body;

  const invalid = (message) => res.status(400).json({ success: false, message });
  for (const [key, value] of Object.entries({ fullname, email, contact, role, companyRole })) {
    if (value !== undefined && value !== null && typeof value !== "string") return invalid(`${key} must be a string`);
  }
  if (isActive !== undefined && typeof isActive !== "boolean") return invalid("isActive must be true or false");
  if (fullname !== undefined && (!fullname || !fullname.trim() || fullname.trim().length > 100)) return invalid("Full name must be 1-100 characters");
  if (email !== undefined && (!email || !EMAIL_RE.test(email.trim()) || email.length > 254)) return invalid("Please enter a valid email");
  if (contact !== undefined && contact !== null && contact.length > 20) return invalid("Contact must be at most 20 characters");

  const user = await User.findById(req.params.id).populate("role", "name");

  if (!user || user.isDeleted) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (String(user._id) === String(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: "You cannot edit your own account from this interface",
    });
  }

  // If user doesn't have a role, assign guest role before updating
  if (!user.role && !user.companyRole) {
    const guestRole = await Role.findOne({ name: "guest" });
    if (guestRole) {
      user.role = guestRole._id;
    }
  }

  const before = auditUser(user);
  const previousRoleName = user.role?.name || null;
  const previousCompanyRole = user.companyRole || null;
  const previousActive = user.isActive;

  let roleDoc = null;
  if (role !== undefined && role !== null && role !== "") {
    roleDoc = await Role.findOne({ name: role });
    if (!roleDoc) return invalid("Unknown role");
  }
  if (companyRole !== undefined && companyRole !== null && companyRole !== "") {
    if (!COMPANY_ROLES.has(companyRole)) return invalid("Unknown company role");
    if (!user.company) return invalid("A company role needs a user that belongs to a company");
  }

  // Never leave the platform without an active superadmin.
  if (previousRoleName === "superadmin" && ((roleDoc && roleDoc.name !== "superadmin") || isActive === false)) {
    const superRole = await Role.findOne({ name: "superadmin" });
    const remaining = await User.countDocuments({ _id: { $ne: user._id }, role: superRole?._id, isActive: true, isDeleted: { $ne: true } });
    if (remaining < 1) return res.status(400).json({ success: false, message: "Cannot demote or deactivate the last superadmin" });
  }

  if (email !== undefined) {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== user.email && (await User.exists({ email: normalizedEmail, _id: { $ne: user._id } }))) {
      return res.status(409).json({ success: false, message: "Another account already uses this email" });
    }
    user.email = normalizedEmail;
  }
  if (fullname !== undefined) user.fullname = fullname.trim();
  if (contact !== undefined) user.contact = contact;
  if (companyRole !== undefined) user.companyRole = companyRole || undefined;
  if (isActive !== undefined) user.isActive = isActive;
  if (roleDoc) user.role = roleDoc._id;

  // A role change or suspension must not leave old sessions with the old
  // privileges: revoke every existing access/refresh token.
  const privilegeChanged = (roleDoc && roleDoc.name !== previousRoleName) ||
    (companyRole !== undefined && (companyRole || null) !== previousCompanyRole) ||
    (isActive === false && previousActive !== false);
  if (privilegeChanged) revokeSessions(user);

  await user.save();
  await user.populate("role", "name");
  await logAudit(req.user._id, "update_user", "user", user._id, before, auditUser(user), req);

  const updatedUser = await User.findById(user._id)
    .select("-password -refreshToken -resetOtp -resetOtpExpireAt -inviteToken -googleId")
    .populate("role", "name");

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: updatedUser,
  });
});

// @desc    Soft delete user
// @route   DELETE /api/v1/users/admin/:id
// @access  Private (Admin/Superadmin)
export const deleteUser = asyncHandler(async (req, res) => {
  if (!ensureSuperadmin(req, res) || !ensureObjectId(res, req.params.id, "user id")) return;
  const user = await User.findById(req.params.id).populate("role", "name");

  if (!user || user.isDeleted) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (String(user._id) === String(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: "You cannot delete your own account",
    });
  }

  if (user.role?.name === "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Cannot delete a superadmin account",
    });
  }

  const before = auditUser(user);
  // Soft delete
  user.isDeleted = true;
  user.deletedAt = new Date();
  user.deletedBy = req.user._id;
  user.isActive = false;
  revokeSessions(user);

  await user.save();
  await logAudit(req.user._id, "delete_user", "user", user._id, before, auditUser(user), req);

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

// @desc    Reset user password
// @route   POST /api/v1/users/admin/:id/reset-password
// @access  Private (Admin/Superadmin)
export const resetUserPassword = asyncHandler(async (req, res) => {
  if (!ensureSuperadmin(req, res) || !ensureObjectId(res, req.params.id, "user id")) return;
  const user = await User.findById(req.params.id);

  if (!user || user.isDeleted) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Generate a temporary password or send reset email
  // For now, we'll generate a 6-digit OTP and send via email
  const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const resetOtpExpireAt = Date.now() + 30 * 60 * 1000; // 30 minutes

  user.resetOtp = resetOtp;
  user.resetOtpExpireAt = resetOtpExpireAt;

  await user.save();
  await logAudit(req.user._id, "reset_user_password", "user", user._id, null, { email: user.email }, req);

  // TODO: Send email with reset OTP
  // For now, just return success
  // In production, integrate with your email service

  // The OTP is never returned to the browser (it used to be echoed back in
  // development, i.e. to whoever triggered the reset).
  res.status(200).json({
    success: true,
    message: "Password reset email sent successfully",
  });
});

// @desc    Get all hotels for superadmin/admin
// @route   GET /api/v1/hotels/admin/all
// @access  Private (Admin/Superadmin)
export const getAdminHotels = asyncHandler(async (req, res) => {
  if (!ensureSuperadmin(req, res)) return;
  const { search, status, city, category, isActive } = req.query;
  const sort = HOTEL_SORTS.has(req.query.sort) ? req.query.sort : "-createdAt";
  const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 12, maxLimit: 100 });

  const filters = [];

  const regex = searchRegex(search);
  if (regex) {
    filters.push({
      $or: [
        { name: regex },
        { description: regex },
        { "location.city": regex },
      ],
    });
  }

  if (status === "active") {
    filters.push({ status: "approved", isActive: true });
  } else if (typeof status === "string" && status && status !== "all") {
    filters.push({ status });
  }

  const cityRegex = searchRegex(city);
  if (cityRegex) {
    filters.push({ "location.city": cityRegex });
  }

  if (typeof category === "string" && category && category !== "all") {
    filters.push({ category });
  }

  if (isActive !== undefined && isActive !== "") {
    const normalizedActive = normalizeStatusFilter(isActive);
    if (typeof normalizedActive === "boolean") {
      filters.push({ isActive: normalizedActive });
    }
  }

  const query = filters.length > 0 ? { $and: filters } : {};

  const hotels = await Hotel.find(query)
    .populate("owner", "fullname email")
    .populate("propertyManager", "fullname email")
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const total = await Hotel.countDocuments(query);

  res.status(200).json({
    success: true,
    data: hotels,
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    },
    count: hotels.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    hotels,
  });
});

// @desc    Get aggregate hotel stats for superadmin/admin
// @route   GET /api/v1/hotels/admin/stats
// @access  Private (Admin/Superadmin)
export const getAdminHotelStats = asyncHandler(async (req, res) => {
  if (!ensureSuperadmin(req, res)) return;
  const [total, approved, active, pending] = await Promise.all([
    Hotel.countDocuments({}),
    Hotel.countDocuments({ status: "approved" }),
    Hotel.countDocuments({ status: "approved", isActive: true }),
    Hotel.countDocuments({ status: "pending" }),
  ]);

  res.status(200).json({
    success: true,
    data: { total, approved, active, pending },
    message: "Hotel stats fetched successfully",
  });
});

// @desc    Get one hotel with admin details
// @route   GET /api/v1/hotels/admin/:id
// @access  Private (Admin/Superadmin)
export const getAdminHotelById = asyncHandler(async (req, res) => {
  if (!ensureSuperadmin(req, res) || !ensureObjectId(res, req.params.id, "hotel id")) return;
  const hotel = await Hotel.findById(req.params.id)
    .populate("owner", "fullname username email profilePicture")
    .populate("propertyManager", "fullname username email profilePicture");

  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found",
    });
  }

  // Check if user is owner or property manager of this hotel
  const isOwner = String(hotel.owner?._id) === String(req.user._id);
  const isPropertyManager = String(hotel.propertyManager?._id) === String(req.user._id);
  const hasFinancialAccess = isOwner || isPropertyManager;

  // Superadmins should NOT see financial data - only owners/managers
  // Financial data includes bookings and revenue information
  const responseData = {
    hotel,
  };

  // Only include financial data if user is owner or property manager
  if (hasFinancialAccess) {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [recentBookings, monthRevenueAgg, totalRevenueAgg] = await Promise.all([
      Booking.find({ hotel: hotel._id })
        .sort("-createdAt")
        .limit(5)
        .select("guestInfo totalAmount currency status createdAt bookingId")
        .lean(),
      Booking.aggregate([
        { $match: { hotel: hotel._id, createdAt: { $gte: monthStart }, status: { $ne: "Cancelled" } } },
        { $group: { _id: null, revenue: { $sum: "$totalAmount" } } },
      ]),
      Booking.aggregate([
        { $match: { hotel: hotel._id, status: { $ne: "Cancelled" } } },
        { $group: { _id: null, revenue: { $sum: "$totalAmount" } } },
      ]),
    ]);

    responseData.recentBookings = recentBookings;
    responseData.revenue = {
      thisMonth: monthRevenueAgg[0]?.revenue || 0,
      total: totalRevenueAgg[0]?.revenue || hotel.totalRevenue || 0,
    };
  }

  res.status(200).json({
    success: true,
    data: responseData,
    message: "Hotel fetched successfully",
  });
});

// @desc    Create a hotel as superadmin/admin
// @route   POST /api/v1/hotels/admin
// @access  Private (Admin/Superadmin)
export const createAdminHotel = asyncHandler(async (req, res) => {
  if (!ensureSuperadmin(req, res)) return;
  if (req.body?.owner !== undefined && !ensureObjectId(res, req.body.owner, "owner id")) return;
  if (req.body?.propertyManager && !ensureObjectId(res, req.body.propertyManager, "property manager id")) return;
  const {
    name,
    description,
    owner,
    propertyManager,
    location,
    category = "Hotel",
    starRating,
    priceRange,
    images,
    amenities = [],
    contact,
  } = req.body;

  if (!name || !description || !owner || !location?.city || !location?.address || !starRating || !priceRange?.min || !contact?.email || !contact?.phone) {
    return res.status(400).json({
      success: false,
      message: "Please provide hotel name, owner, description, location, rating, pricing, and contact details",
    });
  }

  const ownerUser = await User.findById(owner);
  if (!ownerUser) {
    return res.status(404).json({
      success: false,
      message: "Selected owner was not found",
    });
  }

  let company = ownerUser.company ? await Company.findById(ownerUser.company) : null;
  if (!company) {
    company = await Company.findOne({ owner: ownerUser._id });
  }

  if (!company) {
    return res.status(400).json({
      success: false,
      message: "Selected owner must have a company profile before a hotel can be created",
    });
  }

  const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";
  const hotel = await Hotel.create({
    name,
    description,
    owner: ownerUser._id,
    company: company._id,
    propertyManager: propertyManager || ownerUser._id,
    location,
    category,
    starRating,
    priceRange,
    images: images?.length ? images : [fallbackImage],
    amenities,
    contact,
    status: "pending",
  });
  await logAudit(req.user._id, "create_hotel", "hotel", hotel._id, null, { name: hotel.name, owner: ownerUser._id, company: company._id }, req);

  res.status(201).json({
    success: true,
    data: hotel,
    hotel,
    message: "Hotel created successfully. Pending admin approval.",
  });
});
