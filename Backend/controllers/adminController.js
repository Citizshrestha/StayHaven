import { User } from "../models/user.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { Booking } from "../models/booking.schema.js";
import { Company } from "../models/company.schema.js";
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

  if (status === "active") {
    filters.push({ status: "approved", isActive: true });
  } else if (status && status !== "all") {
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
    data: hotels,
    pagination: {
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      limit: Number(limit),
    },
    count: hotels.length,
    total,
    totalPages: Math.ceil(total / Number(limit)),
    currentPage: Number(page),
    hotels,
  });
});

// @desc    Get aggregate hotel stats for superadmin/admin
// @route   GET /api/v1/hotels/admin/stats
// @access  Private (Admin/Superadmin)
export const getAdminHotelStats = asyncHandler(async (req, res) => {
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

  res.status(201).json({
    success: true,
    data: hotel,
    hotel,
    message: "Hotel created successfully. Pending admin approval.",
  });
});
