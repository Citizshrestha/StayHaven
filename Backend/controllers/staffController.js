import { User } from "../models/user.schema.js";
import { Role } from "../models/role.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { Company } from "../models/company.schema.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateAccessToken, generateRefreshToken } from "../utils/tokenUtils.js";
import { JWT } from "google-auth-library";


export const staffLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  // Find user with role 
  const user = await User.findOne({ email: email.toLowerCase() })
    .populate('role')
    .populate('company')
    .populate('assignedProperties');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  // Check password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  // Check if user has a staff role (kitchen or waiter)
  const allowedRoles = ['kitchen', 'waiter', 'manager', 'admin', 'owner'];
  if (!user.role || !allowedRoles.includes(user.role.name)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Staff account required.",
    });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: "Account is deactivated. Contact your manager.",
    });
  }

  // Check if user belongs to a company
  if (!user.company) {
    return res.status(403).json({
      success: false,
      message: "No company assigned. Contact your administrator.",
    });
  }

  // Check if user has assigned properties (hotel)
  if (!user.assignedProperties || user.assignedProperties.length === 0) {
    return res.status(403).json({
      success: false,
      message: "No property assigned. Contact your manager.",
    });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

    // Set access token cookie
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Set refresh token cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Save refresh token to database (for rotation)
  user.refreshToken = refreshToken;
  await user.save();

  // Determine redirect path based on role
  let redirectPath = '/';
  switch (user.role.name) {
    case 'kitchen':
      redirectPath = '/kitchen-dashboard';
      break;
    case 'waiter':
      redirectPath = '/waiter-dashboard';
      break;
    case 'manager':
      redirectPath = '/manager-dashboard';
      break;
    case 'receptionist':
      redirectPath = '/reception-dashboard';
      break;
    default:
      redirectPath = '/dashboard';
  }

  return res.status(200).json({
    success: true,
    message: "Login successful",
    accessToken,
    user: {
      _id: user._id,
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      role: user.role.name,
      company: {
        _id: user.company._id,
        name: user.company.name,
      },
      assignedProperties: user.assignedProperties.map(prop => ({
        _id: prop._id,
        name: prop.name,
      })),
      // Current active property (first one or selected)
      activeProperty: user.assignedProperties[0] ? {
        _id: user.assignedProperties[0]._id,
        name: user.assignedProperties[0].name,
      } : null,
    },
    redirectPath,
  });
});


export const getStaffProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('role')
    .populate('company')
    .populate('assignedProperties')
    .select('-password -resetOtp -resetOtpExpireAt');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    user: {
      _id: user._id,
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      role: user.role?.name,
      company: user.company ? {
        _id: user.company._id,
        name: user.company.name,
      } : null,
      assignedProperties: user.assignedProperties?.map(prop => ({
        _id: prop._id,
        name: prop.name,
      })) || [],
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
  });
});

// @desc    Register new staff member (by Manager/Admin)
// @route   POST /api/staff/register
// @access  Private (Manager/Admin only)
export const registerStaff = asyncHandler(async (req, res) => {
  const { fullname, username, email, password, role, propertyId } = req.body;

  // Validate required fields
  if (!fullname || !username || !email || !password || !role || !propertyId) {
    return res.status(400).json({
      success: false,
      message: "All fields are required: fullname, username, email, password, role, propertyId",
    });
  }

  // Check if registering user has permission (must be manager, admin, or owner)
  const allowedToRegister = ['manager', 'admin', 'owner'];
  if (!allowedToRegister.includes(req.user.role.name)) {
    return res.status(403).json({
      success: false,
      message: "Only managers, admins, or owners can register staff",
    });
  }

  // Validate role
  const allowedRoles = ['kitchen', 'waiter', 'receptionist'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: `Invalid role. Allowed roles: ${allowedRoles.join(', ')}`,
    });
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "Email already registered",
    });
  }

  // Check if username already exists
  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    return res.status(400).json({
      success: false,
      message: "Username already taken",
    });
  }

  // Verify property exists and belongs to the same company
  const property = await Hotel.findById(propertyId);
  if (!property) {
    return res.status(404).json({
      success: false,
      message: "Property not found",
    });
  }

  // Check if property belongs to the same company as the registering user
  if (property.company.toString() !== req.user.company.toString()) {
    return res.status(403).json({
      success: false,
      message: "Property does not belong to your company",
    });
  }

  // Get or create the role
  let staffRole = await Role.findOne({ name: role });
  if (!staffRole) {
    staffRole = await Role.create({ name: role });
  }

  // Create new staff user
  const newStaff = await User.create({
    fullname,
    username,
    email: email.toLowerCase(),
    password,
    role: staffRole._id,
    company: req.user.company,
    companyRole: role,
    assignedProperties: [propertyId],
    isActive: true,
  });

  return res.status(201).json({
    success: true,
    message: `${role.charAt(0).toUpperCase() + role.slice(1)} staff registered successfully`,
    staff: {
      _id: newStaff._id,
      fullname: newStaff.fullname,
      username: newStaff.username,
      email: newStaff.email,
      role: role,
      assignedProperty: property.name,
    },
  });
});


export const getPropertyStaff = asyncHandler(async (req, res) => {
  const { propertyId } = req.params;

  // Check if user has permission
  const allowedRoles = ['manager', 'admin', 'owner'];
  if (!allowedRoles.includes(req.user.role.name)) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  // Verify property belongs to user's company
  const property = await Hotel.findById(propertyId);
  if (!property || property.company.toString() !== req.user.company.toString()) {
    return res.status(403).json({
      success: false,
      message: "Property not found or access denied",
    });
  }

  // Get all staff assigned to this property
  const staff = await User.find({
    assignedProperties: propertyId,
    company: req.user.company,
  })
    .populate('role')
    .select('-password -resetOtp -resetOtpExpireAt');

  return res.status(200).json({
    success: true,
    count: staff.length,
    staff: staff.map(s => ({
      _id: s._id,
      fullname: s.fullname,
      username: s.username,
      email: s.email,
      role: s.role?.name,
      isActive: s.isActive,
      createdAt: s.createdAt,
    })),
  });
});

// @desc    Update staff status (activate/deactivate)
// @route   PATCH /api/staff/:staffId/status
// @access  Private (Manager/Admin only)
export const updateStaffStatus = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const { isActive } = req.body;

  // Check if user has permission
  const allowedRoles = ['manager', 'admin', 'owner'];
  if (!allowedRoles.includes(req.user.role.name)) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  // Find staff member
  const staff = await User.findById(staffId).populate('role');
  if (!staff) {
    return res.status(404).json({
      success: false,
      message: "Staff member not found",
    });
  }

  // Check if staff belongs to same company
  if (staff.company.toString() !== req.user.company.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  // Update status
  staff.isActive = isActive;
  await staff.save();

  return res.status(200).json({
    success: true,
    message: `Staff ${isActive ? 'activated' : 'deactivated'} successfully`,
    staff: {
      _id: staff._id,
      fullname: staff.fullname,
      isActive: staff.isActive,
    },
  });
});

export const staffLogout = asyncHandler(async (req, res) => {
  
  if (req.user){
    // clear refresh token in db
    await User.findByIdAndUpdate(req.user._id, {
      refreshToken: null
    });
  }
  res.cookie("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    expires: new Date(0),
  });

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});


export const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken){
    return res.status(401).json({
       success: false,
       message: "No Refresh Token Provided",
    });
  }

  let decoded;
    try{
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    }catch(err){
      return res.status(401).json({
        success: false,
        message: "Invalid or Expired Refresh Token",
      });
    }

    const user = await User.findById(decoded.id);
    if (!user  || user.refreshToken !== refreshToken){
      // token reused detected! so invalidate all token for this user
      if (user){
        user.refreshToken = null;
        await user.save();
      }
      return  res.status(401).json({
        success: false,
        message: "Invalid Refresh Token. Please Login Again",
      });
    }
})