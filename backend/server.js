import "./config/environment.js";

// Validate environment variables before proceeding
import { validateEnvironmentOrExit } from "./utils/envValidator.js";
validateEnvironmentOrExit();

import express from "express";
import net from "net";
import { createServer } from "http";
import connectDB from "./config/db.js";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import hotelRoutes from "./routes/hotelRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import { Role } from "./models/role.schema.js";
import { User } from "./models/user.schema.js";
import staffRoutes from "./routes/staffRoutes.js";
import tableRoutes from "./routes/tableRoutes.js";
import diningRoutes from "./routes/diningRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import guestRoutes from "./routes/guestRoutes.js";
import guestDashboardRoutes from "./routes/guestDashboardRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import publicBookingRoutes from "./routes/publicBookingRoutes.js";
import seedRoutes from "./routes/seedRoutes.js";
import receptionRoutes from "./routes/receptionRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import superadminRoutes from "./routes/superadminRoutes.js";
import financeRoutes from "./routes/finance.routes.js";
import reviewModerationRoutes from "./routes/reviewModeration.routes.js";
import testimonialsRoutes from "./routes/testimonials.routes.js";
import systemConfigRoutes from "./routes/systemConfig.routes.js";
import contentRoutes from "./routes/content/index.js";
import profileRoutes from "./routes/profileRoutes.js";
import walletPaymentRoutes from "./routes/walletPaymentRoutes.js";
import { startWalletReconciliation } from "./services/walletReconciliation.js";
import { handleStripeWebhook } from "./controllers/paymentController.js";
import cookieParser from "cookie-parser";
import { initCloudinary } from "./config/cloudinary.js";
import { initSocket } from "./config/socket.js";
import { checkMaintenanceMode, getMaintenanceStatus } from "./middleware/maintenanceMode.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { auditMiddleware } from "./middleware/auditLogger.js";
import { generateCsrfToken } from "./middleware/csrf.js";
import { sanitizeMongoOperators } from "./middleware/sanitization.js";
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler, captureException } from "./config/sentry.js";
import mongoose from "mongoose";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { createLogger } from "./utils/logger.js";

const logger = createLogger('Server');

// Initialize cloudinary with env vars
initCloudinary();

const app = express();
// Configure only the known number of reverse-proxy hops; never blindly trust
// client-supplied forwarding headers. Direct deployments keep the secure default.
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 0));

// Initialize Sentry BEFORE any other middleware
initSentry(app);
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// Initialize Socket.io
const io = initSocket(httpServer);

// Database connection is established in bootstrapServer() before roles are
// seeded and before the HTTP server starts accepting requests.

// Seed roles
const seedRoles = async () => {
  const roles = [
    "admin",
    "staff",
    "guest",
    "owner",
    "chief",
    "waiter",
    "manager",
    "hoteladmin",
    "receptionist",
    "housekeeping",
    "maintenance",
    "superadmin",
  ];
  try {
    for (let roleName of roles) {
      if (!(await Role.findOne({ name: roleName }))) {
        await new Role({ name: roleName }).save();
        logger.debug(`Role '${roleName}' created`);
      }
    }
    logger.info("All roles seeded successfully");
    await seedSuperAdmin();
  } catch (err) {
    logger.error("Error seeding roles", { error: err.message });
  }
};

// C-3: no hardcoded credential. Seeding is skipped unless both env vars are
// explicitly set, so a fresh checkout never ships a known superadmin password.
const seedSuperAdmin = async () => {
  try {
    const email = process.env.SUPERADMIN_EMAIL;
    const password = process.env.SUPERADMIN_PASSWORD;

    if (!email || !password) {
      logger.warn(
        "SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD not set — skipping superadmin seed. " +
        "Set both in .env to bootstrap the first superadmin account."
      );
      return;
    }

    const superadminRole = await Role.findOne({ name: "superadmin" });
    if (!superadminRole) {
      logger.error("superadmin role not found during superadmin seeding");
      return;
    }

    let superadminUser = await User.findOne({ email });
    if (!superadminUser) {
      superadminUser = new User({
        fullname: "StayHaven Super Admin",
        username: "superadmin",
        email,
        password, // hashed by the User pre-save hook
        role: superadminRole._id,
        accountStatus: "active",
        isActive: true
      });
      await superadminUser.save();
      logger.info("Default superadmin user seeded successfully");
    } else {
      logger.debug("Superadmin user already exists");
    }
  } catch (err) {
    logger.error("Error seeding superadmin", { error: err.message });
  }
};

// ═══════════════════════════════════════════
// Security Middleware
// ═══════════════════════════════════════════

// CORS — MUST come FIRST before helmet and other middleware
const CORS_ORIGINS = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((s) => s.trim())
  : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];

logger.info(`CORS configured for origins: ${CORS_ORIGINS.join(", ")}`);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (CORS_ORIGINS.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        logger.warn(`CORS rejected origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "Idempotency-Key"],
    exposedHeaders: ["Set-Cookie"],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

// Helmet — sets secure HTTP headers (XSS protection, content security policy, etc.)
// L-3: this backend is a JSON API (the frontend is a separately-hosted SPA),
// so it barely serves HTML/JS to a browser DOM — Helmet's same-origin-only
// default CSP is safe here without needing to allowlist the frontend's own
// third-party asset domains (Cloudinary, Google, payment gateways, etc.),
// which this server never renders. Still off in dev to match prior behavior.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resource loading for frontend
    contentSecurityPolicy:
      process.env.NODE_ENV === "production"
        ? { useDefaults: true } // same-origin-only defaults; this API serves ~no HTML
        : false, // Disable CSP in dev (frontend served separately)
  })
);

// Stripe webhook — MUST be registered with a raw body parser BEFORE the
// global express.json() wrapper below, and MUST fully handle its own
// response (never call next() into the rest of the middleware chain).
// Stripe's signature verification (stripe.webhooks.constructEvent) needs
// the exact raw request bytes; once express.json() parses the body into
// an object, that raw form is gone and signature verification either
// throws or (if the secret check were ever relaxed) would have nothing
// trustworthy left to verify. Registering it here, ahead of every other
// body-touching middleware, is the only reliable way to get the raw body.
app.post(
  "/api/v1/reception/payments/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

// General API rate limiting (100 req / 15 min per IP)
app.use("/api/", apiLimiter);

// Request timeout middleware - 30 seconds for all requests
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    logger.warn('Request timeout', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    res.status(408).json({
      success: false,
      message: 'Request timeout. Please try again.',
    });
  });

  res.setTimeout(30000, () => {
    logger.warn('Response timeout', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
  });

  next();
});

// Audit logging — attaches req.audit helper to every request
app.use(auditMiddleware);

// Cookie parser and body parsers
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Wrap express.json so we can immediately handle malformed JSON and avoid uncaught exceptions
app.use((req, res, next) => {
  express.json()(req, res, (err) => {
    if (err) {
      // Malformed JSON — respond immediately
      return res.status(400).json({
        success: false,
        message:
          "Malformed JSON in request body. Remove body for GET requests or send valid JSON.",
      });
    }
    next();
  });
});

// JSON/body parse error handler - returns JSON instead of HTML stack trace
app.use((err, req, res, next) => {
  // body-parser / express.json throws SyntaxError for malformed JSON
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message:
        "Malformed JSON in request body. Remove body for GET requests or send valid JSON.",
    });
  }

  // Some parsers set err.type === 'entity.parse.failed'
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message:
        "Invalid JSON body. Please send valid JSON or remove the request body for GET requests.",
    });
  }

  // Otherwise pass error to the next handler
  next(err);
});

// H-1: strip NoSQL operator keys ($ne, $where, etc.) from every request,
// globally — not just the routers that opt into sanitizeAll(). Must run
// after body parsing so req.body actually exists yet.
app.use(sanitizeMongoOperators);

const DEFAULT_PORT = 3000;
const PORT_FROM_ENV = process.env.PORT ? Number(process.env.PORT) : null;

const findAvailablePort = (preferredPort) =>
  new Promise((resolve, reject) => {
    const tester = net.createServer();

    tester.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(findAvailablePort(preferredPort + 1));
        return;
      }
      reject(err);
    });

    tester.once("listening", () => {
      const { port } = tester.address();
      tester.close(() => resolve(port));
    });

    tester.listen(preferredPort, "::");
  });

// routes
app.get("/", (req, res) => {
  res.send(`Welcome to Hotel Booking and Order Management System`);
});

// CSRF token endpoint (public, no authentication required)
app.get("/api/v1/csrf-token", generateCsrfToken, (req, res) => {
  res.json({
    success: true,
    csrfToken: req.csrfToken,
  });
});

// Public maintenance status (always available, even during maintenance)
app.get("/api/v1/public/maintenance-status", getMaintenanceStatus);

// Maintenance mode middleware (blocks guest-facing APIs only)
app.use(checkMaintenanceMode);

// Health check endpoints (no authentication required)
app.use("/health", healthRoutes);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/payments", walletPaymentRoutes);
app.use("/api/v1/hotels", hotelRoutes);
app.use("/api/v1/company", companyRoutes);
app.use("/api/v1/staff/dining", diningRoutes); // Restaurant tabs, payments, receipts (authenticated)
app.use("/api/v1/staff", staffRoutes);
app.use("/api/v1/tables", tableRoutes);      // HotelTable management (authenticated)
app.use("/api/v1/rooms", roomRoutes);        // Room QR management (authenticated)
app.use("/api/v1/bookings", bookingRoutes);  // Booking management (authenticated)
app.use("/api/v1/public/bookings", publicBookingRoutes); // Public booking with payment (no auth)
app.use("/api/v1/seed", seedRoutes);         // Seed test data (admin only)
app.use("/api/v1/guest", guestRoutes);       // Guest QR scanning (public)
app.use("/api/v1/guest/portal", guestDashboardRoutes); // Guest dashboard (authenticated)
app.use("/api/v1/reception", receptionRoutes); // Reception dashboard APIs (authenticated)
app.use("/api/v1/webhooks", webhookRoutes);    // Payment gateway webhooks (public)
app.use("/api/v1/feedback", feedbackRoutes);   // Feedback submission (public + admin)
app.use("/api/v1/superadmin", superadminRoutes); // Super Admin platform management (superadmin only)
app.use("/api/v1/superadmin/finance", financeRoutes); // Super Admin finance module
app.use("/api/v1/superadmin/reviews", reviewModerationRoutes); // Super Admin review moderation
app.use("/api/v1/superadmin/system", systemConfigRoutes); // Super Admin system configuration
app.use("/api/v1/content", contentRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/v1/testimonials", testimonialsRoutes); // Public testimonials endpoint

// ═══════════════════════════════════════════
// Error Handling Middleware (MUST BE LAST)
// ═══════════════════════════════════════════

// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler());

// 404 handler for undefined routes
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

// start server - use httpServer instead of app for Socket.io support
const startServer = async () => {
  let portToUse = PORT_FROM_ENV ?? DEFAULT_PORT;

  if (!PORT_FROM_ENV) {
    portToUse = await findAvailablePort(DEFAULT_PORT);
    if (portToUse !== DEFAULT_PORT) {
      logger.warn(`Port ${DEFAULT_PORT} is in use. Starting backend on available port ${portToUse} instead.`);
    }
  }

  // Bind failures (EADDRINUSE, EACCES) arrive as an 'error' event on the
  // server — listen() itself never throws them. With no 'error' listener
  // attached, Node re-raises them as an uncaughtException, which used to fall
  // through to gracefulShutdown() and emit a stack trace plus two misleading
  // follow-on errors ("Server is not running." from closing a server that
  // never bound, then the 10s force-exit). Awaiting the bind here routes the
  // failure to startServer's own catch, where it can be reported once.
  await new Promise((resolve, reject) => {
    const onError = (err) => {
      httpServer.removeListener("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      httpServer.removeListener("error", onError);
      resolve();
    };

    httpServer.once("error", onError);
    httpServer.once("listening", onListening);
    httpServer.listen(portToUse);
  });

  logger.info(`Server is running on port ${portToUse}`);
  logger.info("WebSocket server ready for connections");
};

let stopWalletReconciliation = null;
let shuttingDown = false;

// Establish dependencies in order. The previous fire-and-forget startup let
// Express report itself ready while MongoDB was still failing in the
// background, and role seeding raced Mongoose's initial connection.
const bootstrapServer = async () => {
  const databaseConnected = await connectDB();

  if (databaseConnected) {
    await seedRoles();
  } else {
    logger.warn("Skipping role seeding because MongoDB is unavailable");
  }

  await startServer();
  stopWalletReconciliation = startWalletReconciliation();
};

bootstrapServer().catch((err) => {
  const attemptedPort = err?.port ?? PORT_FROM_ENV ?? DEFAULT_PORT;

  if (err?.code === "EADDRINUSE") {
    // An explicitly configured PORT is honored as-is instead of being shifted
    // to a free one: the frontend's dev proxy / VITE_API_URL is pinned to it,
    // so a silent fallback would trade a loud failure for a confusing one.
    logger.error(
      `Port ${attemptedPort} is already in use — another backend instance is still running. ` +
      `Stop it and restart. ` +
      `Windows: netstat -ano | findstr :${attemptedPort}  then  taskkill /PID <pid> /F. ` +
      `macOS/Linux: lsof -ti tcp:${attemptedPort} | xargs kill. ` +
      `Or pick a different PORT in Backend/.env (and update the frontend API URL to match).`
    );
  } else if (err?.code === "EACCES") {
    logger.error(
      `Not permitted to bind port ${attemptedPort}. Use a port above 1023, or grant the process the privilege to bind it.`
    );
  } else {
    logger.error("Failed to start server", { error: err?.message, stack: err?.stack });
  }

  // Nothing ever bound, so there are no connections to drain — bypass
  // gracefulShutdown entirely and just release the background timer.
  shuttingDown = true;
  try {
    stopWalletReconciliation?.();
  } catch {
    /* best effort during a failed startup */
  }
  process.exit(1);
});

// ═══════════════════════════════════════════
// Process-level crash handling & graceful shutdown

const gracefulShutdown = (reason, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  // Guarded: this runs from the uncaughtException path too, where the process
  // may be mid-startup and the timer never installed. A throw here would mask
  // the original error and skip the rest of the shutdown.
  try {
    stopWalletReconciliation?.();
  } catch (err) {
    logger.error("Error stopping wallet reconciliation", { error: err.message });
  }

  logger.info(`Shutting down (${reason})`);

  let closeFailed = false;

  // Force-exit if graceful shutdown hangs on a stuck connection.
  const forceExitTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  // Whether the HTTP server ever bound. Checked up front because socket.io's
  // close() also closes the HTTP server it was attached to, so by the time the
  // HTTP step runs, httpServer.listening is already false either way.
  const wasListening = httpServer.listening;

  // Stop Socket.io first so no new realtime connections are accepted while
  // in-flight HTTP requests drain.
  const closeSocketIo = () =>
    new Promise((resolve) => {
      if (!io) return resolve();
      try {
        io.close(() => resolve());
      } catch (err) {
        logger.error("Error while closing Socket.io", { error: err.message });
        resolve();
      }
    });

  // Only close the HTTP server if it is still open. Calling close() on a
  // server that never bound (startup failed) or that socket.io already closed
  // produces a "Server is not running." error unrelated to the real failure.
  const closeHttpServer = () =>
    new Promise((resolve) => {
      if (!httpServer.listening) {
        if (wasListening) logger.info("HTTP server closed");
        return resolve();
      }

      httpServer.close((err) => {
        if (err) {
          closeFailed = true;
          logger.error("Error while closing HTTP server", { error: err.message });
        } else {
          logger.info("HTTP server closed");
        }
        resolve();
      });
    });

  // readyState 0 means the connection was never established (or is already
  // closed) — nothing to close, and asking mongoose to close in that state
  // can never settle, which is what kept tripping the force-exit timer when
  // startup failed before the DB was up. Mid-connect states get a bounded
  // wait rather than an open-ended one.
  const closeMongo = () => {
    if (mongoose.connection.readyState === 0) return Promise.resolve();

    return Promise.race([
      mongoose.connection.close(false).then(() => logger.info("MongoDB connection closed")),
      new Promise((resolve) => {
        setTimeout(() => {
          logger.warn("Timed out closing MongoDB connection — continuing shutdown");
          resolve();
        }, 5000).unref();
      }),
    ]).catch((closeErr) => logger.error("Error closing MongoDB connection", { error: closeErr.message }));
  };

  closeSocketIo()
    .then(closeHttpServer)
    .then(closeMongo)
    .finally(() => {
      clearTimeout(forceExitTimer);
      process.exit(closeFailed ? 1 : exitCode);
    });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error("Unhandled promise rejection", { error: error.message, stack: error.stack });
  captureException(error, { type: "unhandledRejection" });
  gracefulShutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error: error.message, stack: error.stack });
  captureException(error, { type: "uncaughtException" });
  gracefulShutdown("uncaughtException", 1);
});
