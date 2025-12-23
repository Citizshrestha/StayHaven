import express from "express";
import {
  staffLogin,
  staffLogout,
  refreshAccessToken,
  getStaffProfile,
  registerStaff,
  getPropertyStaff,
  updateStaffStatus,
  inviteStaff,
  verifyInviteToken,
  completeOnBoarding,
  resendInvite,
  getPendingInvites,
  deleteInvite,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/staffController.js";
import {
  createOrder,
  getOrders,
  updateOrderStatus,
  updateOrder,
  getOrderById,
  deleteOrder
} from "../controllers/orderController.js";
import { getMenuItems, getMenuCategories } from "../controllers/menuController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// PUBLIC ROUTES (No authentication required)
router.post("/login", staffLogin);
router.post("/refresh-token", refreshAccessToken);
router.get("/verify-invite/:token", verifyInviteToken);
router.post("/complete-onboard", completeOnBoarding);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// PROTECTED ROUTES (Requires valid access token)
router.get("/me", protect, getStaffProfile);
router.post("/logout", protect, staffLogout);
router.put("/change-password", protect, changePassword);

// MENU ROUTES (Any authenticated staff can access)
router.get("/menu-items", protect, getMenuItems);
router.get("/menu-categories", protect, getMenuCategories);

// ORDER ROUTES
// Create order - waiter, receptionist, chief can create
router.post(
  "/create-order",
  protect,
  authorize("waiter", "receptionist", "chief", "manager"),
  createOrder
);

// Get all orders - any staff can view
router.get("/orders", protect, getOrders);

// Get single order
router.get("/orders/:orderId", protect, getOrderById);

// Update order status - waiter, chief, manager can update
router.put(
  "/orders/:orderId/status",
  protect,
  authorize("waiter", "chief", "manager"),
  updateOrderStatus
);

// Update order details - waiter, manager can update
router.put(
  "/orders/:orderId",
  protect,
  authorize("waiter", "manager"),
  updateOrder
);

// MANAGER/ADMIN/OWNER ONLY ROUTES
router.post(
  "/register",
  protect,
  authorize("manager", "admin", "owner"),
  registerStaff
);

router.post(
  "/invite",
  protect,
  authorize("manager", "admin", "owner"),
  inviteStaff
);

router.post(
  "/resend-invite/:staffId",
  protect,
  authorize("manager", "admin", "owner"),
  resendInvite
);

router.get(
  "/pending-invites",
  protect,
  authorize("manager", "admin", "owner"),
  getPendingInvites
);

router.delete(
  "/invite/:staffId",
  protect,
  authorize("manager", "admin", "owner"),
  deleteInvite
);

router.get(
  "/property/:propertyId",
  protect,
  authorize("manager", "admin", "owner"),
  getPropertyStaff
);

router.put(
  "/status/:staffId",
  protect,
  authorize("manager", "admin", "owner"),
  updateStaffStatus
);

router.delete(
  "/orders/:orderId",
  protect,
  authorize("waiter", "manager", "receptionist", "admin"),
  deleteOrder
);

export default router;
