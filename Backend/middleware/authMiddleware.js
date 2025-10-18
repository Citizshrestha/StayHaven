// middleware/auth.js
import jwt from 'jsonwebtoken';
import { User } from '../models/user.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = await User.findById(decoded.id).select('-password').populate('role');
    if (!req.user) {
      throw Object.assign(new Error('User not found'), { status: 401 });
    }
    next();
  } else {
    throw Object.assign(new Error('No access token provided, token missing'), { status: 401 });
  }
});

export const authorize = (...roles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role.name)) {
      throw Object.assign(new Error(`User role '${req.user?.role?.name || 'unknown'}' is not authorized`), {
        status: 403,
      });
    }
    next();
  });
};