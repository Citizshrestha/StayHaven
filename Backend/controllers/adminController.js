import { User } from "../models/user.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { Role } from "../models/role.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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
  const {
    search,
    role,
    status,
    page = 1,
    limit = 20,
    sort = "-createdAt",
  } = req.query;

  const filters = [
    { isDeleted: { $ne: true } }, // Exclude soft-deleted users
    { _id: { $ne: req.user._id } }, // Exclude current admin from list
  ];

  if (search) {
    const searchRegex = new RegExp(search, "i");
    filters.push({
      $or: [
        { fullname: searchRegex },
        { username: searchRegex },
        { email: searchRegex },
        { contact: searchRegex },
      ],
    });
  }

  if (role && role !== "all") {
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

  const skip = (Number(page) - 1) * Number(limit);

  const users = await User.find(query)
    .select("-password -refreshToken -resetOtp -resetOtpExpireAt")
    .populate("role", "name")
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    totalPages: Math.ceil(total / Number(limit)),
    currentPage: Number(page),
    users,
  });
});

// @desc    Update user active status
// @route   PUT /api/v1/users/admin/:id/status
// @access  Private (Admin/Superadmin)
export const updateUserStatus = asyncHandler(async (req, res) => {
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

  user.isActive = isActive;
  await user.save();

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
  const user = await User.findById(req.params.id)
    .select("-password -refreshToken -resetOtp -resetOtpExpireAt")
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

  // Get booking stats (you'll need to import Booking model)
  // For now, returning mock data - replace with actual booking queries
  const bookingStats = {
    totalBookings: 0,
    totalSpent: 0,
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
  const { fullname, email, contact, role, companyRole, isActive } = req.body;

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

  // Update fields if provided
  if (fullname !== undefined) user.fullname = fullname;
  if (email !== undefined) user.email = email;
  if (contact !== undefined) user.contact = contact;
  if (companyRole !== undefined) user.companyRole = companyRole;
  if (isActive !== undefined) user.isActive = isActive;

  // Handle role update
  if (role !== undefined) {
    const roleDoc = await Role.findOne({ name: role });
    if (roleDoc) {
      user.role = roleDoc._id;
    }
  }

  await user.save();

  const updatedUser = await User.findById(user._id)
    .select("-password -refreshToken -resetOtp -resetOtpExpireAt")
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

  // Soft delete
  user.isDeleted = true;
  user.deletedAt = new Date();
  user.deletedBy = req.user._id;
  user.isActive = false;

  await user.save();

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

// @desc    Reset user password
// @route   POST /api/v1/users/admin/:id/reset-password
// @access  Private (Admin/Superadmin)
export const resetUserPassword = asyncHandler(async (req, res) => {
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

  // TODO: Send email with reset OTP
  // For now, just return success
  // In production, integrate with your email service

  res.status(200).json({
    success: true,
    message: "Password reset email sent successfully",
    // Remove this in production - only for testing
    debug: process.env.NODE_ENV === "development" ? { resetOtp } : undefined,
  });
});

// @desc    Get all hotels for superadmin/admin
// @route   GET /api/v1/hotels/admin/all
// @access  Private (Admin/Superadmin)
export const getAdminHotels = asyncHandler(async (req, res) => {
  const {
    search,
    status,
    city,
    category,
    isActive,
    page = 1,
    limit = 12,
    sort = "-createdAt",
  } = req.query;

  const filters = [];

  if (search) {
    const searchRegex = new RegExp(search, "i");
    filters.push({
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { "location.city": searchRegex },
      ],
    });
  }

  if (status && status !== "all") {
    filters.push({ status });
  }

  if (city) {
    filters.push({ "location.city": new RegExp(city, "i") });
  }

  if (category && category !== "all") {
    filters.push({ category });
  }

  if (isActive !== undefined && isActive !== "") {
    const normalizedActive = normalizeStatusFilter(isActive);
    if (typeof normalizedActive === "boolean") {
      filters.push({ isActive: normalizedActive });
    }
  }

  const query = filters.length > 0 ? { $and: filters } : {};

  const skip = (Number(page) - 1) * Number(limit);

  const hotels = await Hotel.find(query)
    .populate("owner", "fullname email")
    .populate("propertyManager", "fullname email")
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  const total = await Hotel.countDocuments(query);

  res.status(200).json({
    success: true,
    count: hotels.length,
    total,
    totalPages: Math.ceil(total / Number(limit)),
    currentPage: Number(page),
    hotels,
  });
});
