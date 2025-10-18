// controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.schema.js';
import { Role } from '../models/role.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateAccessToken, generateRefreshToken } from '../utils/tokenUtils.js';

// @route   POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, roleName = 'guest', contact, roomNumber } = req.body;

  // Validation
  if (!name || !email || !password) {
    throw Object.assign(new Error('Please provide name, email, and password'), { status: 400 });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw Object.assign(new Error('User with this email already exists'), { status: 400 });
  }

  // Validate and find role
  const validRoles = ['admin', 'staff', 'guest'];
  if (!validRoles.includes(roleName)) {
    throw Object.assign(new Error('Invalid role'), { status: 400 });
  }
  const role = await Role.findOne({ name: roleName });
  if (!role) {
    throw Object.assign(new Error(`Role '${roleName}' not found`), { status: 400 });
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: role._id,
    contact: contact || undefined,
    roomNumber: roomNumber || undefined,
  });

  // Generate tokens
  const accessToken = generateAccessToken(user._id, role.name);
  const refreshToken = generateRefreshToken(user._id);

  // Return user data
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: role.name,
        contact: user.contact,
        roomNumber: user.roomNumber,
        isActive: user.isActive,
      },
      accessToken,
      refreshToken,
    },
  });
});

// @route   POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw Object.assign(new Error('Please provide email and password'), { status: 400 });
  }

  // Find user and populate role
  const user = await User.findOne({ email }).populate('role');
  if (!user) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  // Check if user is active
  if (!user.isActive) {
    throw Object.assign(new Error('Your account has been deactivated. Please contact support.'), { status: 403 });
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id, user.role.name);
  const refreshToken = generateRefreshToken(user._id);

  // Return user data
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        contact: user.contact,
        roomNumber: user.roomNumber,
        isActive: user.isActive,
      },
      accessToken,
      refreshToken,
    },
  });
});

// @route   POST /api/auth/refresh
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw Object.assign(new Error('No refresh token provided'), { status: 400 });
  }

  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const user = await User.findById(decoded.id).populate('role');
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 401 });
  }

  const accessToken = generateAccessToken(user._id, user.role.name);
  res.json({ success: true, accessToken });
});

// @route   GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password').populate('role');
  res.json({ success: true, data: user });
});