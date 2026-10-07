import { PlatformSettings } from "../models/platformSettings.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { logAudit } from "../middleware/auditLogger.js";
import { checkKhaltiConnection, getPaymentGatewayConfig } from "../services/paymentGatewayService.js";
import { transporter, sendEmail } from "../config/nodemailer.js";

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
    const startTime = Date.now();
    const result = await checkKhaltiConnection();
    const latency = Date.now() - startTime;

    await PlatformSettings.findByIdAndUpdate(
      "singleton",
      {
        $set: {
          "khaltiConfig.webhookStatus": result.connected ? "active" : "error",
          updatedBy: req.user._id,
        },
      },
      { upsert: true }
    );

    await logAudit(req.user._id, "test_khalti_webhook", "platformSettings", "singleton", null, { connected: result.connected, latency }, req);

    res.json({
      success: result.connected,
      data: {
        connected: result.connected,
        latency,
        error: result.error,
        message: result.connected
          ? "Khalti connection test successful"
          : result.error || "Khalti connection test failed",
      },
    });
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
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(400).json({
        success: false,
        message: "SMTP is not configured — set SMTP_USER and SMTP_PASS in the server environment",
      });
    }

    if (!req.user.email) {
      return res.status(400).json({
        success: false,
        message: "Your account has no email address to send the test to",
      });
    }

    try {
      // verify() opens a real connection and authenticates, so a bad password
      // fails here instead of silently queueing an email that never arrives.
      await transporter.verify();

      await sendEmail({
        from: process.env.SENDER_EMAIL || process.env.SMTP_USER,
        to: req.user.email,
        subject: "StayHaven — SMTP test email",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #00BFA6;">SMTP is working</h2>
            <p>This test email was sent from System Configuration → Integrations.</p>
            <p style="color: #546E7A; font-size: 13px;">Sent ${new Date().toLocaleString()}</p>
          </div>
        `,
      });

      await logAudit(req.user._id, "test_smtp", "platformSettings", "singleton", null, { sent: true }, req);

      res.json({
        success: true,
        data: {
          sent: true,
          message: `Test email sent to ${req.user.email}`,
        },
      });
    } catch (error) {
      res.json({
        success: false,
        data: {
          sent: false,
          error: error.message,
          message: `Failed to send test email: ${error.message}`,
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
    // Environment variables are the real source of truth: the running server
    // reads its Khalti / SMTP / Cloudinary / Sentry credentials from
    // process.env. The PlatformSettings singleton only ever holds optional DB
    // overrides plus the last webhook probe result, and nothing writes the
    // credential fields — so checking the DB alone reported "Not Configured"
    // on every card even for a fully wired deployment.
    const settings = await PlatformSettings.findById("singleton").lean();
    const env = process.env;

    const walletConfig = getPaymentGatewayConfig();

    const status = {
      khalti: {
        configured: walletConfig.khalti.enabled,
        webhookStatus: settings?.khaltiConfig?.webhookStatus || "inactive",
        isLive: !walletConfig.khalti.testMode,
      },
      cloudinary: {
        configured: !!(
          (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) ||
          (settings?.cloudinaryConfig?.cloudName && settings?.cloudinaryConfig?.apiKey)
        ),
        tested: false,
      },
      smtp: {
        // nodemailer defaults host to smtp.gmail.com, so credentials — not
        // host — are what decide whether mail can actually go out.
        configured: !!(
          (env.SMTP_USER && env.SMTP_PASS) ||
          (settings?.smtpConfig?.host && settings?.smtpConfig?.user)
        ),
        lastTested: null,
      },
      sentry: {
        configured: !!(env.SENTRY_DSN || settings?.sentryDsn),
        dsn: env.SENTRY_DSN || settings?.sentryDsn ? "***MASKED***" : null,
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
