import { AuditLog } from "../models/auditLog.model.js";

const SENSITIVE_FIELDS = [
  "password",
  "secretKey",
  "apiSecret",
  "webhookSecret",
  "pass",
  "token",
];

const maskSensitiveData = (obj) => {
  if (!obj || typeof obj !== "object") return obj;

  const masked = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in masked) {
    if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      masked[key] = "***MASKED***";
    } else if (typeof masked[key] === "object" && masked[key] !== null) {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }

  return masked;
};

export const logAudit = async (adminId, action, resource, resourceId, before, after, req) => {
  try {
    const maskedBefore = before ? maskSensitiveData(before) : null;
    const maskedAfter = after ? maskSensitiveData(after) : null;

    let severity = "info";
    if (action.includes("delete") || action.includes("suspend")) {
      severity = "warning";
    }
    if (action.includes("maintenance") || resource === "platformSettings") {
      severity = "critical";
    }

    const auditLog = new AuditLog({
      admin: adminId,
      adminEmail: req?.user?.email || "system",
      action,
      resource,
      resourceId,
      before: maskedBefore,
      after: maskedAfter,
      ip: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get("user-agent"),
      severity,
    });

    await auditLog.save();
  } catch (error) {
    // Silent fail - don't block operations if audit logging fails
  }
};

// Middleware that attaches audit helper to request object
export const auditMiddleware = (req, res, next) => {
  req.audit = async (action, resource, resourceId, before, after) => {
    const adminId = req.user?._id || null;
    await logAudit(adminId, action, resource, resourceId, before, after, req);
  };
  next();
};
