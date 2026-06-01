import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import dotenv from "dotenv";
dotenv.config();

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
import contentRoutes from "./routes/content/index.js";
import cookieParser from "cookie-parser";
import { initCloudinary } from "./config/cloudinary.js";
import { initSocket } from "./config/socket.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { auditMiddleware } from "./middleware/auditLogger.js";
import { generateCsrfToken } from "./middleware/csrf.js";
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from "./config/sentry.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { createLogger } from "./utils/logger.js";

const logger = createLogger('Server');

// Initialize cloudinary with env vars
initCloudinary();

const app = express();

// Initialize Sentry BEFORE any other middleware
initSentry(app);
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// Initialize Socket.io
initSocket(httpServer);

// Connect to DB
connectDB();

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

const seedSuperAdmin = async () => {
  try {
    const superadminRole = await Role.findOne({ name: "superadmin" });
    if (!superadminRole) {
      logger.error("superadmin role not found during superadmin seeding");
      return;
    }

    const email = "superadmin@stayhaven.com";
    let superadminUser = await User.findOne({ email });
    if (!superadminUser) {
      superadminUser = new User({
        fullname: "StayHaven Super Admin",
        username: "superadmin",
        email: email,
        password: "Superadmin@1234",
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
seedRoles();

// ═══════════════════════════════════════════
// Security Middleware
// ═══════════════════════════════════════════

// Helmet — sets secure HTTP headers (XSS protection, content security policy, etc.)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resource loading for frontend
    contentSecurityPolicy: false, // Disable CSP in dev (frontend served separately)
  })
);

// CORS — must come before rate limiter so preflight OPTIONS requests are handled
const CORS_ORIGINS = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((s) => s.trim())
  : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];

app.use(
  cors({
    origin: CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  })
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

// Health check endpoints (no authentication required)
app.use("/health", healthRoutes);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/hotels", hotelRoutes);
app.use("/api/v1/company", companyRoutes);
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
app.use("/api/v1/content", contentRoutes);
app.use("/api/content", contentRoutes);

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

  httpServer.listen(portToUse, () => {
    logger.info(`Server is running on port ${portToUse}`);
    logger.info("WebSocket server ready for connections");
  });
};

startServer().catch((err) => {
  logger.error("Failed to start server", { error: err.message, stack: err.stack });
  process.exit(1);
});
// trigger restart
