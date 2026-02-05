import express from "express";
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
router.post("/order", createGuestOrder);

// Track order status
router.get("/order/:orderId", getGuestOrderStatus);

// Call waiter (table QR feature)
router.post("/call-waiter", callWaiter);

// Request bill (table QR feature)
router.post("/request-bill", requestBill);

export default router;
