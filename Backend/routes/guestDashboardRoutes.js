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
router.post("/orders/:id/pay", payOrder);
router.post("/payments/confirm", confirmOrderPayment);
router.post("/payments/verify-khalti", verifyKhaltiCallback);
router.post("/payments/verify-esewa", verifyEsewaPaymentCallback);
router.get("/payments/config", getPaymentConfig);

// ═════════════════════════════════════════════════════════
// PROFILE
// ═════════════════════════════════════════════════════════

router.get("/profile", getProfile);
router.put("/profile", updateProfile);

// ═════════════════════════════════════════════════════════
// GUEST REQUESTS
// ═════════════════════════════════════════════════════════

router.get("/requests", getGuestRequests);
router.post("/request", submitRequest);

export default router;
