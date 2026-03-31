import rateLimit from "express-rate-limit";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Rate Limiter Middleware
 *
 * In development: very relaxed limits so you can login/refresh freely.
 * In production: tighter limits to protect against brute force.
 */

// Auth endpoints (login, onboard) — generous in dev, strict in prod
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 20,   // dev: unlimited-ish | prod: 20 attempts per 15 min
  message: {
    success: false,
    message:
      "Too many authentication attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // don't count successful logins against the limit
});

// Password reset — stays moderate even in dev (no real need to hammer this)
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 5,
  message: {
    success: false,
    message:
      "Too many password reset requests. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API — high enough for dashboards with polling/auto-refresh
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 5000 : 500, // dev: effectively unlimited | prod: 500/15min
  message: {
    success: false,
    message: "Too many requests. Please slow down and try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for sensitive operations (invite, register staff)
export const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 200 : 20,
  message: {
    success: false,
    message: "Rate limit reached for this operation. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP endpoints — prevent email bombing and brute force
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 50 : 5, // 5 OTP requests per hour in production
  message: {
    success: false,
    message: "Too many OTP requests. Please try again after 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Signup registration — prevent mass account creation
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 100 : 10, // 10 registrations per hour
  message: {
    success: false,
    message: "Too many registration attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Reception dashboard — generous for polling but protect against abuse
export const receptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 2000 : 300, // dev: 2000 | prod: 300 requests per 15 min
  message: {
    success: false,
    message: "Too many reception requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for reception write operations (check-in, payments, etc.)
export const receptionWriteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 100 : 30, // dev: 100 | prod: 30 writes per minute
  message: {
    success: false,
    message: "Too many write operations. Please wait a moment.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests including successful ones
});

// Batch operations limiter — prevent abuse of bulk operations
export const batchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 100 : 20, // dev: 100 | prod: 20 batch operations per hour
  message: {
    success: false,
    message: "Too many batch operations. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment operations limiter
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 100 : 20, // dev: 100 | prod: 20 payment operations per minute
  message: {
    success: false,
    message: "Too many payment attempts. Please wait a moment.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Export operations limiter — protect against resource-intensive exports
export const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 50 : 10, // dev: 50 | prod: 10 exports per 15 min
  message: {
    success: false,
    message: "Too many export requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
