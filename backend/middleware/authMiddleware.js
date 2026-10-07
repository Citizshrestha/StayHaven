// middleware/auth.js
import jwt from 'jsonwebtoken';
import { User } from '../models/user.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAccessTokenSecret } from '../utils/tokenUtils.js';
import { STAFF_ROLES } from '../utils/staffRoleRoutes.js';
import { validateCsrfToken } from './csrf.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const protect = asyncHandler(async (req, res, next) => {
  // Router-level and route-level protect() may both run; verify only once.
  if (req.authVerified && req.user) return next();

  let token;
  let fromCookie = false;

  // Check for token in Authorization header first
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Fallback: check for token in cookies
  else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
    fromCookie = true;
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

    const decoded = jwt.verify(token, accessSecret, { algorithms: ["HS256"] });

    // M-3: reject refresh tokens (or any non-access token) presented here —
    // without this, a leaked refresh token could otherwise be replayed as
    // an access token whenever both secrets happen to match.
    if (decoded.type !== "access") {
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid token type",
      });
    }

    req.user = await User.findById(decoded.id)
      .select('-password')
      .populate('role')
      .populate('assignedProperties', '_id name')
      .populate('company', '_id name');

    if (req.user?.passwordChangedAt && decoded.iat < Math.floor(req.user.passwordChangedAt.getTime() / 1000)) {
      return res.status(401).json({ success: false, message: 'Session expired. Please sign in again.' });
    }
    if (!req.user) {
      console.error("Auth Middleware - User not found for ID:", decoded.id);
      throw Object.assign(new Error('User not found'), { status: 401 });
    }
    if (req.user.isActive === false || req.user.isDeleted || req.user.accountStatus === 'deactivated') {
      return res.status(403).json({ success: false, message: 'This staff account is deactivated' });
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

  req.authVerified = true;
  // Ambient-credential (cookie-only) writes need the double-submit CSRF token;
  // Bearer requests can't be forged cross-site and are unaffected.
  if (fromCookie && UNSAFE_METHODS.has(req.method)) return validateCsrfToken(req, res, next);
  next();
});

// Every hotel-staff role (incl. roles without a dashboard yet) plus superadmin.
const STAFF_API_ROLES = new Set([...STAFF_ROLES, 'kitchen', 'housekeeping', 'maintenance']);

// Staff-only routers: a guest account's access token (same JWT format, same
// User collection) must not reach staff APIs that only call protect().
export const requireStaffRole = (req, res, next) => {
  const role = req.user?.role?.name || req.user?.companyRole;
  if (!role || !STAFF_API_ROLES.has(role)) {
    return res.status(403).json({ success: false, message: 'Staff account required' });
  }
  next();
};

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
