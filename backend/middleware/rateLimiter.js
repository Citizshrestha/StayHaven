import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { createClient } from "redis";
import { RedisStore } from "rate-limit-redis";
import { createLogger } from "../utils/logger.js";

const isDev = process.env.NODE_ENV !== "production";
const logger = createLogger("RateLimiter");

/**
 * Rate Limiter Middleware
 *
 * In development: very relaxed limits so you can login/refresh freely.
 * In production: tighter limits to protect against brute force.
 *
 * M-5: in-memory counters (express-rate-limit's default) reset on restart
 * and aren't shared across instances, which weakens protection once you run
 * more than one server process. If REDIS_URL is set, every limiter below
 * uses a Redis-backed store instead; if it's not set, behavior is unchanged
 * (default in-memory store) — this is purely opt-in.
 */

let redisClient = null;
if (process.env.REDIS_URL) {
  redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on("error", (err) => {
    logger.error("Redis rate-limit store error", { error: err.message });
  });
  redisClient.connect().catch((err) => {
    logger.error("Failed to connect Redis rate-limit store", { error: err.message });
  });
}

// Each limiter gets its own key prefix so they don't share counters in Redis.
const redisStore = (prefix) =>
  redisClient
    ? new RedisStore({
        prefix: `rl:${prefix}:`,
        sendCommand: (...args) => redisClient.sendCommand(args),
      })
    : undefined;

// Auth endpoints (login, onboard) — generous in dev, strict in prod
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 20,   // dev: unlimited-ish | prod: 20 attempts per 15 min
  store: redisStore("auth"),
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
  store: redisStore("password-reset"),
  message: {
    success: false,
    message:
      "Too many password reset requests. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API — high enough for dashboards with polling/auto-refresh
// For real-time order management: ~1 request/second = 900 requests/15min per user
// With 5 concurrent users = 4500 requests/15min
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 10000 : 5000, // dev: 10k | prod: 5000 requests per 15min (~5.5 req/sec)
  store: redisStore("api"),
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
  store: redisStore("sensitive-op"),
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
  store: redisStore("otp"),
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
  store: redisStore("signup"),
  message: {
    success: false,
    message: "Too many registration attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Reception dashboard — generous for polling but protect against abuse
// Reception staff need frequent updates for bookings, check-ins, orders
export const receptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 5000 : 2000, // dev: 5000 | prod: 2000 requests per 15 min (~2.2 req/sec)
  store: redisStore("reception"),
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
  store: redisStore("reception-write"),
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
  store: redisStore("batch"),
  message: {
    success: false,
    message: "Too many batch operations. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment operations limiter - strict for security
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 100 : 5, // dev: 100 | prod: 5 payment operations per hour per IP
  store: redisStore("payment"),
  message: {
    success: false,
    message: "Too many payment attempts. Please try again after 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Export operations limiter — protect against resource-intensive exports
export const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 50 : 10, // dev: 50 | prod: 10 exports per 15 min
  store: redisStore("export"),
  message: {
    success: false,
    message: "Too many export requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Guest dashboard limiter — authenticated guest portal (read-heavy + occasional writes)
export const guestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 5000 : 3000, // dev: 5000 | prod: 3000 requests per 15 min (~3.3 req/sec)
  store: redisStore("guest"),
  message: {
    success: false,
    message: "Too many requests from your guest session. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Booking operations limiter — prevent booking spam
export const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 100 : 10, // dev: 100 | prod: 10 booking operations per hour per user
  store: redisStore("booking"),
  message: {
    success: false,
    message: "Too many booking requests. Please try again after 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General write operations limiter — for all POST/PUT/DELETE endpoints.
// Keyed per authenticated user (it always runs after protect()); the old
// per-IP key made every waiter/chef behind one hotel Wi-Fi share 100 writes/h,
// which a single busy dinner service exhausts.
export const writeOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 1000 : 600, // prod: 600 write operations per hour per user
  keyGenerator: (req) => (req.user?._id ? `user:${req.user._id}` : ipKeyGenerator(req.ip || "")),
  store: redisStore("write-op"),
  message: {
    success: false,
    message: "Too many write operations. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Guest QR order creation — anonymous guests. Keyed on the client IP plus the
// scanned table/room token. The previous key was the client-supplied
// guestSessionId alone, which a script could rotate per request to bypass
// the limit entirely. IP+token still lets several parties on shared
// restaurant Wi-Fi order independently (different tables = different keys)
// while a party can add drinks/desserts without hitting the cap.
export const guestOrderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: isDev ? 200 : 10, // dev: 200 | prod: 10 orders per 10 min per device-network + table
  store: redisStore("guest-order"),
  keyGenerator: (req, res) => {
    const token = req.body?.tableToken || req.body?.roomToken;
    const scope = typeof token === "string" ? token.slice(0, 40) : "none";
    // express-rate-limit v8: ipKeyGenerator takes the IP string (and
    // normalises IPv6 to its /56 subnet), not (req, res).
    return `${ipKeyGenerator(req.ip || "")}:${scope}`;
  },
  message: {
    success: false,
    message: "Too many orders placed. Please wait a few minutes before ordering again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Anonymous room-QR service requests (housekeeping, maintenance, ...).
// Same IP + scanned-token keying as guest orders.
export const guestRequestLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: isDev ? 200 : 8, // prod: 8 requests per 30 min per device-network + room
  store: redisStore("guest-request"),
  keyGenerator: (req) => {
    const token = req.body?.roomToken;
    const scope = typeof token === "string" ? token.slice(0, 40) : "none";
    return `${ipKeyGenerator(req.ip || "")}:${scope}`;
  },
  message: {
    success: false,
    message: "Too many requests from this room. Please call the front desk if it's urgent.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
