/**
 * guestDashboardRoutes.js
 *
 * Protected routes for authenticated guest self-service dashboard.
 * All routes require JWT authentication (protect middleware) and
 * are restricted to users with the 'guest' role.
 *
 * NOTE: The public guest QR routes (/api/guest/table, /api/guest/menu, etc.)
 * remain in guestRoutes.js — those do NOT require authentication.
 */

import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { guestLimiter } from "../middleware/rateLimiter.js";
import { paymentLimiter, writeOperationLimiter, passwordResetLimiter } from "../middleware/rateLimiter.js";
import { csrfProtection } from "../middleware/csrf.js";
import { upload } from "../middleware/upload.js";
import { payWalletTargetHandler } from "../controllers/walletPaymentController.js";
import { isWallet } from "../services/walletPaymentService.js";
import { initiateCardTargetHandler, confirmCardTargetHandler } from "../controllers/cardPaymentController.js";
import {
  getDashboardOverview,
  getUserBookings,
  getAuthenticatedMenu,
  placeOrder,
  getUserOrders,
  getUserInvoices,
  payOrder,
  confirmOrderPayment,
  verifyKhaltiCallback,
  verifyEsewaPaymentCallback,
  getPaymentConfig,
  getProfile,
  updateProfile,
  uploadProfilePicture,
  removeProfilePicture,
  changeGuestPassword,
  submitRequest,
  getGuestRequests,
} from "../controllers/guestDashboardController.js";
import {
  extendBooking,
  checkExtensionAvailability,
} from "../controllers/extendBookingHandler.js";
import {
  cancelOrder,
  checkCancellable,
} from "../controllers/cancelOrderHandler.js";
import {
  getGuestChatContext,
  getGuestMessages,
  sendGuestMessage,
  markGuestMessagesRead,
  getGuestUnreadCount,
} from "../controllers/guestMessagingController.js";
import { getNotifications, markNotificationsRead } from "../controllers/notificationController.js";

const router = Router();

// ═════════════════════════════════════════════════════════
// GLOBAL MIDDLEWARE — all guest portal routes require auth
// ═════════════════════════════════════════════════════════

router.use(protect);
router.use(authorize("guest"));
router.use(guestLimiter);

// ═════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════

router.get("/dashboard", getDashboardOverview);

// ═════════════════════════════════════════════════════════
// BOOKINGS
// ═════════════════════════════════════════════════════════

router.get("/bookings", getUserBookings);
router.get("/bookings/:id/extend/availability", checkExtensionAvailability);
router.post("/bookings/:id/extend", extendBooking);

// ═════════════════════════════════════════════════════════
// RESTAURANT / ROOM SERVICE
// ═════════════════════════════════════════════════════════

router.get("/menu", getAuthenticatedMenu);
router.post("/order", placeOrder);
router.get("/orders", getUserOrders);
router.get("/orders/:id/can-cancel", checkCancellable);
router.post("/orders/:id/cancel", cancelOrder);

// ═════════════════════════════════════════════════════════
// BILLING / PAYMENTS
// ═════════════════════════════════════════════════════════

router.get("/invoices", getUserInvoices);
router.post("/orders/:id/pay", csrfProtection, paymentLimiter, (req, res, next) =>
  isWallet(req.body.paymentMethod) ? payWalletTargetHandler(req, res, next) : req.body.paymentMethod === 'card' ? initiateCardTargetHandler(req, res, next) : payOrder(req, res, next));
router.post("/payments/confirm", csrfProtection, paymentLimiter, confirmCardTargetHandler);
router.post("/payments/verify-khalti", csrfProtection, verifyKhaltiCallback);
router.post("/payments/verify-esewa", csrfProtection, verifyEsewaPaymentCallback);
router.get("/payments/config", getPaymentConfig);

// ═════════════════════════════════════════════════════════
// PROFILE
// ═════════════════════════════════════════════════════════

// Runs multer and turns its errors (wrong type, >5MB) into a 400 response.
const singleProfileImage = (req, res, next) =>
  upload.single("profilePicture")(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE"
      ? "Image must be 5 MB or smaller"
      : err.message || "Invalid image upload";
    return res.status(400).json({ success: false, message });
  });

router.get("/profile", getProfile);
router.put("/profile", writeOperationLimiter, updateProfile);
router.post("/profile/picture", csrfProtection, writeOperationLimiter, singleProfileImage, uploadProfilePicture);
router.delete("/profile/picture", csrfProtection, writeOperationLimiter, removeProfilePicture);
router.put("/profile/password", csrfProtection, passwordResetLimiter, changeGuestPassword);

// ═════════════════════════════════════════════════════════
// GUEST REQUESTS
// ═════════════════════════════════════════════════════════

router.get("/requests", getGuestRequests);
router.post("/request", submitRequest);

// ═════════════════════════════════════════════════════════
// NOTIFICATIONS (portal bell) — always scoped to req.user
// ═════════════════════════════════════════════════════════

router.get("/notifications", getNotifications);
router.put("/notifications/read", writeOperationLimiter, markNotificationsRead);

// ═════════════════════════════════════════════════════════
// CHAT / MESSAGING  (guest ↔ reception / room-service)
// ═════════════════════════════════════════════════════════

// Note: the global guestLimiter (applied above) already bounds abuse; chat is
// frequent by nature so we don't add the stricter hourly write limiter here.
router.get("/messages/context", getGuestChatContext);
router.get("/messages/unread-count", getGuestUnreadCount);
router.get("/messages", getGuestMessages);
router.post("/messages", sendGuestMessage);
router.put("/messages/read", markGuestMessagesRead);

export default router;
