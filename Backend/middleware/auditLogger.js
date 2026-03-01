/**
 * Audit Logger Middleware
 *
 * Logs security-relevant events for monitoring and compliance:
 * - Login attempts (success/failure)
 * - Logout events
 * - Password changes/resets
 * - Account lockouts
 * - Privilege escalation attempts
 *
 * In production, these logs should be forwarded to a centralized logging
 * service (e.g., ELK, Datadog, CloudWatch). For now, structured console output.
 */

const LOG_LEVELS = {
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
  SECURITY: "SECURITY",
};

/**
 * Format and output an audit log entry
 */
const logAuditEvent = ({
  level = LOG_LEVELS.INFO,
  event,
  userId = null,
  email = null,
  ip,
  userAgent,
  details = {},
}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    userId,
    email,
    ip,
    userAgent: userAgent ? userAgent.substring(0, 120) : null,
    ...details,
  };

  // Structured log output — easy to parse by log aggregators
  const prefix =
    level === LOG_LEVELS.SECURITY
      ? "🔒"
      : level === LOG_LEVELS.WARN
      ? "⚠️"
      : level === LOG_LEVELS.ERROR
      ? "❌"
      : "📋";

  console.log(`${prefix} [AUDIT] ${JSON.stringify(entry)}`);
};

/**
 * Extract request metadata for logging
 */
const getRequestMeta = (req) => ({
  ip: req.ip || req.connection?.remoteAddress || "unknown",
  userAgent: req.headers["user-agent"] || "unknown",
});

/**
 * Middleware that attaches audit logging functions to the request object.
 * Controllers call req.audit.logEvent() to record events.
 */
export const auditMiddleware = (req, res, next) => {
  const meta = getRequestMeta(req);

  req.audit = {
    /**
     * Log a successful login
     */
    loginSuccess: (userId, email) => {
      logAuditEvent({
        level: LOG_LEVELS.INFO,
        event: "LOGIN_SUCCESS",
        userId,
        email,
        ...meta,
      });
    },

    /**
     * Log a failed login attempt
     */
    loginFailure: (email, reason = "Invalid credentials") => {
      logAuditEvent({
        level: LOG_LEVELS.WARN,
        event: "LOGIN_FAILURE",
        email,
        ...meta,
        details: { reason },
      });
    },

    /**
     * Log an account lockout due to brute force
     */
    accountLocked: (email, lockDuration) => {
      logAuditEvent({
        level: LOG_LEVELS.SECURITY,
        event: "ACCOUNT_LOCKED",
        email,
        ...meta,
        details: { lockDuration },
      });
    },

    /**
     * Log a logout event
     */
    logout: (userId) => {
      logAuditEvent({
        level: LOG_LEVELS.INFO,
        event: "LOGOUT",
        userId,
        ...meta,
      });
    },

    /**
     * Log a password change
     */
    passwordChanged: (userId) => {
      logAuditEvent({
        level: LOG_LEVELS.SECURITY,
        event: "PASSWORD_CHANGED",
        userId,
        ...meta,
      });
    },

    /**
     * Log a password reset request
     */
    passwordResetRequested: (email) => {
      logAuditEvent({
        level: LOG_LEVELS.INFO,
        event: "PASSWORD_RESET_REQUESTED",
        email,
        ...meta,
      });
    },

    /**
     * Log a completed password reset
     */
    passwordResetCompleted: (userId) => {
      logAuditEvent({
        level: LOG_LEVELS.SECURITY,
        event: "PASSWORD_RESET_COMPLETED",
        userId,
        ...meta,
      });
    },

    /**
     * Log an unauthorized access attempt
     */
    unauthorizedAccess: (userId, resource) => {
      logAuditEvent({
        level: LOG_LEVELS.SECURITY,
        event: "UNAUTHORIZED_ACCESS",
        userId,
        ...meta,
        details: { resource },
      });
    },

    /**
     * Generic audit event logger
     */
    logEvent: (event, level = LOG_LEVELS.INFO, details = {}) => {
      logAuditEvent({
        level,
        event,
        userId: req.user?._id || null,
        email: req.user?.email || null,
        ...meta,
        details,
      });
    },
  };

  next();
};

export default auditMiddleware;
