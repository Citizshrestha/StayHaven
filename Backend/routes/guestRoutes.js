import express from "express";
import { writeOperationLimiter } from "../middleware/rateLimiter.js";
import { sanitizeAll } from "../middleware/sanitization.js";
import {
  getTableByToken,
  getRoomByToken,
  getGuestMenu,
  createGuestOrder,
  getGuestOrderStatus,
  callWaiter,
  requestBill,
} from "../controllers/guestController.js";

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeAll());

// =====================================================
// PUBLIC ROUTES - No authentication required
// These routes are accessed via QR code scanning
// =====================================================

// Table QR code validation and info
router.get("/table/:token", getTableByToken);

// Room QR code validation and info
router.get("/room/:token", getRoomByToken);

// Get menu for a hotel (accessed after QR scan)
router.get("/menu/:hotelId", getGuestMenu);

// Place an order as guest (via QR scan)
router.post("/order", writeOperationLimiter, createGuestOrder);

// Track order status
router.get("/order/:orderId", getGuestOrderStatus);

// Call waiter (table QR feature)
router.post("/call-waiter", writeOperationLimiter, callWaiter);

// Request bill (table QR feature)
router.post("/request-bill", writeOperationLimiter, requestBill);

export default router;
