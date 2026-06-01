// middleware/auth.js
import jwt from 'jsonwebtoken';
import { User } from '../models/user.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAccessTokenSecret } from '../utils/tokenUtils.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header first
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Fallback: check for token in cookies
  else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token",
    });
  }

  try {
    const accessSecret = getAccessTokenSecret();
    if (!accessSecret) {
      throw Object.assign(new Error('JWT access secret is not configured'), { status: 500 });
    }

    const decoded = jwt.verify(token, accessSecret);

    req.user = await User.findById(decoded.id)
      .select('-password')
      .populate('role')
      .populate('assignedProperties', '_id name')
      .populate('company', '_id name');

    if (!req.user) {
      console.error("Auth Middleware - User not found for ID:", decoded.id);
      throw Object.assign(new Error('User not found'), { status: 401 });
    }
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token expired',
      });
    }
    // If it's the "User not found" error thrown above, rethrow it
    if (error.status === 401) {
      throw error;
    }
    throw error;
  }

  next();
});

export const authorize = (...roles) => {
  return asyncHandler(async (req, res, next) => {
    const userRole = req.user?.role?.name || req.user?.companyRole;

    // Superadmin bypasses all role checks — platform-level administrator
    if (userRole === 'superadmin') {
      return next();
    }

    if (!userRole || !roles.includes(userRole)) {
      throw Object.assign(new Error(`User role '${userRole || 'unknown'}' is not authorized`), {
        status: 403,
      });
    }
    next();
  });
};