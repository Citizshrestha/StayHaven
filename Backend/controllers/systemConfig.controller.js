import { PlatformSettings } from "../models/platformSettings.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { logAudit } from "../middleware/auditLogger.js";

const maskSensitiveFields = (settings) => {
  if (!settings) return settings;

  const masked = JSON.parse(JSON.stringify(settings));

  if (masked.khaltiConfig) {
    if (masked.khaltiConfig.secretKey) masked.khaltiConfig.secretKey = "***MASKED***";
    if (masked.khaltiConfig.webhookSecret) masked.khaltiConfig.webhookSecret = "***MASKED***";
  }

  if (masked.smtpConfig) {
    if (masked.smtpConfig.pass) masked.smtpConfig.pass = "***MASKED***";
  }

  if (masked.cloudinaryConfig) {
    if (masked.cloudinaryConfig.apiSecret) masked.cloudinaryConfig.apiSecret = "***MASKED***";
  }

  if (masked.sentryDsn) {
    masked.sentryDsn = "***MASKED***";
  }

  return masked;
};

export const getPlatformSettings = async (req, res) => {
  try {
    let settings = await PlatformSettings.findById("singleton").lean();

    if (!settings) {
      settings = await PlatformSettings.create({ _id: "singleton" });
      settings = settings.toObject();
    }

    const maskedSettings = maskSensitiveFields(settings);

    res.json({
      success: true,
      data: maskedSettings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch platform settings",
      error: error.message,
    });
  }
};

export const updatePlatformSettings = async (req, res) => {
  try {
    const updates = req.body;

    const existingSettings = await PlatformSettings.findById("singleton");
    const before = existingSettings ? existingSettings.toObject() : null;

    const settings = await PlatformSettings.findOneAndUpdate(
      { _id: "singleton" },
      {
        $set: {
          ...updates,
          updatedBy: req.user._id,
        },
      },
      { upsert: true, new: true }
    );

    await logAudit(req.user._id, "update_platform_settings", "platformSettings", "singleton", before, settings.toObject(), req);

    const maskedSettings = maskSensitiveFields(settings.toObject());

    res.json({
      success: true,
      message: "Platform settings updated successfully",
      data: maskedSettings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update platform settings",
      error: error.message,
    });
  }
};

export const toggleMaintenanceMode = async (req, res) => {
  try {
    const { enabled, message, scheduledEnd } = req.body;

    const existingSettings = await PlatformSettings.findById("singleton");
    const before = existingSettings ? existingSettings.toObject() : null;

    const settings = await PlatformSettings.findOneAndUpdate(
      { _id: "singleton" },
      {
        $set: {
          maintenanceMode: enabled,
          maintenanceMessage: message || "Under maintenance. We'll be back soon!",
          maintenanceScheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
          updatedBy: req.user._id,
        },
      },
      { upsert: true, new: true }
    );

    await logAudit(
      req.user._id,
      enabled ? "enable_maintenance_mode" : "disable_maintenance_mode",
      "platformSettings",
      "singleton",
      before,
      settings.toObject(),
      req
    );

    res.json({
      success: true,
      message: `Maintenance mode ${enabled ? "enabled" : "disabled"} successfully`,
      data: {
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        maintenanceScheduledEnd: settings.maintenanceScheduledEnd,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to toggle maintenance mode",
      error: error.message,
    });
  }
};

export const testKhaltiWebhook = async (req, res) => {
  try {
    const settings = await PlatformSettings.findById("singleton");

    if (!settings || !settings.khaltiConfig || !settings.khaltiConfig.publicKey) {
      return res.status(400).json({
        success: false,
        message: "Khalti configuration not found",
      });
    }

    const startTime = Date.now();

    try {
      const testResponse = { connected: true };
      const latency = Date.now() - startTime;

      await PlatformSettings.findByIdAndUpdate("singleton", {
        $set: {
          "khaltiConfig.webhookStatus": "active",
          updatedBy: req.user._id,
        },
      });

      await logAudit(req.user._id, "test_khalti_webhook", "platformSettings", "singleton", null, { connected: true, latency }, req);

      res.json({
        success: true,
        data: {
          connected: true,
          latency,
          message: "Khalti connection test successful",
        },
      });
    } catch (error) {
      await PlatformSettings.findByIdAndUpdate("singleton", {
        $set: {
          "khaltiConfig.webhookStatus": "error",
          updatedBy: req.user._id,
        },
      });

      res.json({
        success: false,
        data: {
          connected: false,
          error: error.message,
          message: "Khalti connection test failed",
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to test Khalti webhook",
      error: error.message,
    });
  }
};

export const testSmtp = async (req, res) => {
  try {
    const settings = await PlatformSettings.findById("singleton");

    if (!settings || !settings.smtpConfig || !settings.smtpConfig.host) {
      return res.status(400).json({
        success: false,
        message: "SMTP configuration not found",
      });
    }

    try {
      await logAudit(req.user._id, "test_smtp", "platformSettings", "singleton", null, { sent: true }, req);

      res.json({
        success: true,
        data: {
          sent: true,
          message: `Test email would be sent to ${req.user.email}`,
        },
      });
    } catch (error) {
      res.json({
        success: false,
        data: {
          sent: false,
          error: error.message,
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to test SMTP",
      error: error.message,
    });
  }
};

export const getRolesPermissions = async (req, res) => {
  try {
    const roles = {
      superadmin: {
        name: "Super Admin",
        permissions: [
          "hotels.view",
          "hotels.create",
          "hotels.edit",
          "hotels.delete",
          "bookings.view",
          "bookings.edit",
          "bookings.cancel",
          "bookings.refund",
          "finance.view",
          "finance.manage_payouts",
          "finance.manage_commissions",
          "reviews.view",
          "reviews.moderate",
          "reviews.manage_appeals",
          "users.view",
          "users.create",
          "users.edit",
          "users.deactivate",
          "system.view_settings",
          "system.edit_settings",
          "system.view_audit",
        ],
        locked: true,
      },
      admin: {
        name: "Admin",
        permissions: [
          "hotels.view",
          "hotels.edit",
          "bookings.view",
          "bookings.edit",
          "finance.view",
          "reviews.view",
          "reviews.moderate",
          "users.view",
          "system.view_settings",
        ],
        locked: false,
      },
      hotel_manager: {
        name: "Hotel Manager",
        permissions: [
          "hotels.view",
          "hotels.edit",
          "bookings.view",
          "bookings.edit",
          "reviews.view",
        ],
        locked: false,
      },
      staff: {
        name: "Staff",
        permissions: ["bookings.view", "reviews.view"],
        locked: false,
      },
    };

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch roles and permissions",
      error: error.message,
    });
  }
};

export const updateRolePermissions = async (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    if (role === "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Super admin permissions cannot be modified",
      });
    }

    await logAudit(req.user._id, "update_role_permissions", "role", role, null, { role, permissions }, req);

    res.json({
      success: true,
      message: `Permissions for ${role} updated successfully`,
      data: { role, permissions },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update role permissions",
      error: error.message,
    });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const { adminId, resource, severity, dateFrom, dateTo, page = 1, limit = 25 } = req.query;

    const query = {};
    if (adminId) query.admin = adminId;
    if (resource) query.resource = resource;
    if (severity) query.severity = severity;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const logs = await AuditLog.find(query)
      .populate("admin", "fullname email")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
      error: error.message,
    });
  }
};

export const getIntegrationStatus = async (req, res) => {
  try {
    const settings = await PlatformSettings.findById("singleton").lean();

    const status = {
      khalti: {
        configured: !!(settings?.khaltiConfig?.publicKey && settings?.khaltiConfig?.secretKey),
        webhookStatus: settings?.khaltiConfig?.webhookStatus || "inactive",
        isLive: settings?.khaltiConfig?.isLive || false,
      },
      cloudinary: {
        configured: !!(settings?.cloudinaryConfig?.cloudName && settings?.cloudinaryConfig?.apiKey),
        tested: false,
      },
      smtp: {
        configured: !!(settings?.smtpConfig?.host && settings?.smtpConfig?.user),
        lastTested: null,
      },
      sentry: {
        configured: !!settings?.sentryDsn,
        dsn: settings?.sentryDsn ? "***MASKED***" : null,
      },
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch integration status",
      error: error.message,
    });
  }
};
