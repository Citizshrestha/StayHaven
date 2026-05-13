/**
 * CSRF Protection Middleware
 *
 * Implements Double Submit Cookie pattern for CSRF protection.
 * This is a modern alternative to the deprecated csurf package.
 *
 * How it works:
 * 1. Server generates a random CSRF token and sends it in both:
 *    - A cookie (csrf-token)
 *    - Response body (for client to store)
 * 2. Client includes the token in a custom header (X-CSRF-Token) for state-changing requests
 * 3. Server validates that cookie token matches header token
 *
 * This prevents CSRF because:
 * - Attacker sites can't read cookies from other domains (Same-Origin Policy)
 * - Attacker sites can't set custom headers on cross-origin requests
 */

import crypto from 'crypto';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('CSRF');

// Generate a cryptographically secure random token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Middleware to generate and set CSRF token
 * Call this on routes that need to provide a CSRF token to the client
 */
export const generateCsrfToken = (req, res, next) => {
  const token = generateToken();

  // Set token in cookie (httpOnly for security)
  res.cookie('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' required for cross-site cookies with secure
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Also provide token in response for client to include in headers
  req.csrfToken = token;

  next();
};

/**
 * Middleware to validate CSRF token on state-changing requests
 * Apply this to POST, PUT, PATCH, DELETE routes that need CSRF protection
 */
export const validateCsrfToken = (req, res, next) => {
  // Skip CSRF validation for safe methods (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF validation in development mode (optional - remove in production)
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_CSRF === 'true') {
    return next();
  }

  // Get token from cookie
  const cookieToken = req.cookies['csrf-token'];

  // Get token from header (client must send this)
  const headerToken = req.headers['x-csrf-token'] || req.headers['csrf-token'];

  // Validate tokens exist
  if (!cookieToken) {
    logger.warn('CSRF validation failed: No token in cookie', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing. Please refresh the page and try again.',
      code: 'CSRF_TOKEN_MISSING',
    });
  }

  if (!headerToken) {
    logger.warn('CSRF validation failed: No token in header', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    return res.status(403).json({
      success: false,
      message: 'CSRF token not provided in request header.',
      code: 'CSRF_TOKEN_NOT_PROVIDED',
    });
  }

  // Validate tokens match (constant-time comparison to prevent timing attacks)
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    logger.warn('CSRF validation failed: Token mismatch', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token. Please refresh the page and try again.',
      code: 'CSRF_TOKEN_INVALID',
    });
  }

  // Token is valid
  next();
};

/**
 * Middleware to validate Origin/Referer headers
 * Additional layer of CSRF protection
 */
export const validateOrigin = (req, res, next) => {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get allowed origins from environment
  const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

  // Get origin from request
  const origin = req.headers.origin || req.headers.referer;

  if (!origin) {
    // No origin header - could be a same-origin request or API client
    // Allow it but log for monitoring
    logger.debug('Request without origin header', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    return next();
  }

  // Check if origin is allowed
  const isAllowed = allowedOrigins.some(allowed => {
    try {
      const allowedUrl = new URL(allowed);
      const requestUrl = new URL(origin);
      return allowedUrl.origin === requestUrl.origin;
    } catch (err) {
      return false;
    }
  });

  if (!isAllowed) {
    logger.warn('Origin validation failed', {
      origin,
      allowedOrigins,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    return res.status(403).json({
      success: false,
      message: 'Request origin not allowed.',
      code: 'ORIGIN_NOT_ALLOWED',
    });
  }

  next();
};

/**
 * Combined CSRF protection middleware
 * Validates both token and origin
 */
export const csrfProtection = [validateOrigin, validateCsrfToken];

export default {
  generateCsrfToken,
  validateCsrfToken,
  validateOrigin,
  csrfProtection,
};
