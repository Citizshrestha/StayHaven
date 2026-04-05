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
  getProfile,
  updateProfile,
  submitRequest,
  getGuestRequests,
} from "../controllers/guestDashboardController.js";

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

// ═════════════════════════════════════════════════════════
// RESTAURANT / ROOM SERVICE
// ═════════════════════════════════════════════════════════

router.get("/menu", getAuthenticatedMenu);
router.post("/order", placeOrder);
router.get("/orders", getUserOrders);

// ═════════════════════════════════════════════════════════
// BILLING / PAYMENTS
// ═════════════════════════════════════════════════════════

router.get("/invoices", getUserInvoices);
router.post("/orders/:id/pay", payOrder);
router.post("/payments/confirm", confirmOrderPayment);

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
