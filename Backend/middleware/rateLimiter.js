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
