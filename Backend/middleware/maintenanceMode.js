import { PlatformSettings } from "../models/platformSettings.model.js";

const ALWAYS_EXEMPT_PREFIXES = [
  "/health",
  "/api/v1/csrf-token",
  "/api/v1/public/maintenance-status",
  "/api/v1/superadmin",
  "/api/superadmin",
  "/api/v1/staff",
  "/api/v1/reception",
  "/api/v1/profile",
  "/api/v1/webhooks",
  "/api/v1/company",
  "/api/v1/tables",
  "/api/v1/rooms",
  "/api/v1/bookings",
  "/api/v1/users",
  "/api/v1/user",
  "/api/v1/content",
  "/api/content",
  "/api/v1/seed",
];

const GUEST_BLOCKED_PREFIXES = [
  "/api/v1/public/",
  "/api/v1/guest/portal/",
  "/api/v1/auth/register",
  "/api/v1/auth/google-login",
  "/api/v1/auth/sendSignupOtp",
  "/api/v1/auth/verifySignupOtp",
  "/api/v1/auth/sendResetPasswordOtp",
  "/api/v1/auth/verifyResetPasswordOtp",
  "/api/v1/auth/resetPassword",
];

const hasAuthToken = (req) => {
  return !!(
    (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) ||
    req.cookies?.accessToken
  );
};

const isPublicHotelBrowse = (req) => {
  if (req.method !== "GET") return false;
  const path = req.path;
  if (path === "/api/v1/hotels") return true;
  if (/^\/api\/v1\/hotels\/[^/]+$/.test(path) && !path.includes("/admin")) return true;
  return false;
};

const isGuestFacingRequest = (req) => {
  const path = req.path;

  if (GUEST_BLOCKED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return true;
  }

  if (!hasAuthToken(req) && isPublicHotelBrowse(req)) {
    return true;
  }

  if (!hasAuthToken(req) && path.startsWith("/api/v1/feedback")) {
    return true;
  }

  return false;
};

const isAlwaysExempt = (path) =>
  ALWAYS_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix));

const buildMaintenanceResponse = (settings) =>
  res.status(503).json({
    success: false,
    message:
      settings.maintenanceMessage ||
      "System is under maintenance. Please try again later.",
    maintenanceMode: true,
    scheduledEnd: settings.maintenanceScheduledEnd || null,
  });

export const getMaintenanceStatus = async (req, res) => {
  try {
    const settings = await PlatformSettings.findById("singleton").lean();

    res.json({
      success: true,
      data: {
        maintenanceMode: settings?.maintenanceMode === true,
        maintenanceMessage:
          settings?.maintenanceMessage ||
          "Under maintenance. We'll be back soon!",
        scheduledEnd: settings?.maintenanceScheduledEnd || null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch maintenance status",
    });
  }
};

export const checkMaintenanceMode = async (req, res, next) => {
  try {
    if (isAlwaysExempt(req.path)) {
      return next();
    }

    const settings = await PlatformSettings.findById("singleton").lean();

    if (!settings?.maintenanceMode) {
      return next();
    }

    if (!isGuestFacingRequest(req)) {
      return next();
    }

    return buildMaintenanceResponse(settings);
  } catch (error) {
    next();
  }
};
