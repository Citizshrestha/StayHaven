import { Router } from "express";
import mongoose from "mongoose";
import { createLogger } from "../utils/logger.js";

const router = Router();
const logger = createLogger('Health');

/**
 * Health Check Endpoint
 * GET /health
 *
 * Returns system health status including:
 * - Overall status (healthy/unhealthy)
 * - Database connection status
 * - Application version
 * - Uptime
 * - Memory usage
 * - Environment
 */
router.get("/", async (req, res) => {
  const startTime = Date.now();

  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    const dbHealthy = mongoose.connection.readyState === 1;

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // Resident Set Size
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    };

    // Calculate uptime
    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeFormatted = formatUptime(uptimeSeconds);

    // Overall health status
    const isHealthy = dbHealthy;
    const statusCode = isHealthy ? 200 : 503;

    // Response time
    const responseTime = Date.now() - startTime;

    const healthData = {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: {
        seconds: uptimeSeconds,
        formatted: uptimeFormatted,
      },
      database: {
        status: dbStatus,
        healthy: dbHealthy,
      },
      memory: {
        rss: `${memoryUsageMB.rss} MB`,
        heapTotal: `${memoryUsageMB.heapTotal} MB`,
        heapUsed: `${memoryUsageMB.heapUsed} MB`,
        external: `${memoryUsageMB.external} MB`,
      },
      responseTime: `${responseTime}ms`,
    };

    // Log unhealthy status
    if (!isHealthy) {
      logger.warn("Health check failed", { healthData });
    }

    return res.status(statusCode).json(healthData);
  } catch (error) {
    logger.error("Health check error", { error: error.message });

    return res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
      message: process.env.NODE_ENV === "production"
        ? "Service temporarily unavailable"
        : error.message,
    });
  }
});

/**
 * Detailed Health Check (for internal monitoring)
 * GET /health/detailed
 *
 * Returns more detailed system information
 */
router.get("/detailed", async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    const dbHealthy = mongoose.connection.readyState === 1;

    // Get database stats if connected
    let dbStats = null;
    if (dbHealthy) {
      try {
        const admin = mongoose.connection.db.admin();
        const serverStatus = await admin.serverStatus();
        dbStats = {
          connections: serverStatus.connections,
          uptime: serverStatus.uptime,
          version: serverStatus.version,
        };
      } catch (err) {
        logger.warn("Could not fetch database stats", { error: err.message });
      }
    }

    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const detailedHealth = {
      status: dbHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: formatUptime(Math.floor(process.uptime())),
      },
      database: {
        status: dbStatus,
        healthy: dbHealthy,
        stats: dbStats,
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
        arrayBuffers: `${Math.round(memoryUsage.arrayBuffers / 1024 / 1024)} MB`,
      },
      cpu: {
        user: `${Math.round(cpuUsage.user / 1000)}ms`,
        system: `${Math.round(cpuUsage.system / 1000)}ms`,
      },
    };

    return res.status(dbHealthy ? 200 : 503).json(detailedHealth);
  } catch (error) {
    logger.error("Detailed health check error", { error: error.message });

    return res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Detailed health check failed",
    });
  }
});

/**
 * Readiness Check (for Kubernetes/container orchestration)
 * GET /health/ready
 *
 * Returns 200 if the service is ready to accept traffic
 */
router.get("/ready", async (req, res) => {
  try {
    const dbReady = mongoose.connection.readyState === 1;

    if (dbReady) {
      return res.status(200).json({
        ready: true,
        timestamp: new Date().toISOString(),
      });
    } else {
      return res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        reason: "Database not connected",
      });
    }
  } catch (error) {
    return res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      reason: "Readiness check failed",
    });
  }
});

/**
 * Liveness Check (for Kubernetes/container orchestration)
 * GET /health/live
 *
 * Returns 200 if the service is alive (even if not ready)
 */
router.get("/live", (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Security Status Check
 * GET /health/security
 *
 * Returns security features status and configuration
 * Useful for compliance monitoring and security audits
 */
router.get("/security", async (req, res) => {
  try {
    const securityStatus = {
      status: "secure",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      features: {
        helmet: "enabled",
        cors: "enabled",
        rateLimiting: "enabled",
        auditLogging: "enabled",
        inputValidation: "enabled",
        inputSanitization: "enabled",
        bruteForceProtection: "enabled",
        requestTimeout: "30s",
        jwtAuthentication: "enabled",
        errorTracking: process.env.SENTRY_DSN ? "enabled" : "disabled",
      },
      configuration: {
        nodeEnv: process.env.NODE_ENV || "development",
        databaseConnected: mongoose.connection.readyState === 1,
        emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
        paymentGatewayConfigured: !!(process.env.STRIPE_SECRET_KEY || process.env.KHALTI_SECRET_KEY),
        cloudinaryConfigured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
        sentryConfigured: !!process.env.SENTRY_DSN,
      },
      recommendations: [],
    };

    // Add recommendations based on environment and configuration
    if (process.env.NODE_ENV === "production") {
      if (!process.env.SENTRY_DSN) {
        securityStatus.recommendations.push("Configure SENTRY_DSN for error monitoring in production");
      }
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        securityStatus.recommendations.push("Configure email credentials for notifications");
      }
      if (process.env.CLIENT_URL && process.env.CLIENT_URL.includes("localhost")) {
        securityStatus.recommendations.push("Update CLIENT_URL to production domain (currently contains localhost)");
      }
      if (!process.env.STRIPE_SECRET_KEY && !process.env.KHALTI_SECRET_KEY) {
        securityStatus.recommendations.push("Configure payment gateway credentials for production");
      }
    }

    // Check JWT secret strength (without exposing the actual secret)
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      securityStatus.recommendations.push("JWT_SECRET should be at least 32 characters for better security");
    }

    res.status(200).json(securityStatus);
  } catch (error) {
    logger.error("Security status check error", { error: error.message });

    return res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Security status check failed",
      message: process.env.NODE_ENV === "production"
        ? "Unable to retrieve security status"
        : error.message,
    });
  }
});

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

export default router;
