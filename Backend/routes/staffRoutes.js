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
  updateProfilePicture,
} from "../controllers/staffController.js";
import {
  createOrder,
  getOrders,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
  sendBillToCustomer,
} from "../controllers/orderController.js";
import { getMenuItems, getMenuCategories } from "../controllers/menuController.js";
import {
  createWaiterCall,
  getActiveWaiterCalls,
  acknowledgeWaiterCall,
  resolveWaiterCall,
  getWaiterCallHistory,
} from "../controllers/waitercall.controller.js";
import {
  assignTables,
  getTableAssignments,
  getMyAssignment,
  lookupAssignedWaiter,
  removeAssignment,
  bulkUpdateAssignments,
} from "../controllers/tableAssignment.controller.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

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
router.patch("/profile-picture", protect, upload.single("profilePicture"), updateProfilePicture);

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
// Send bill to customer - waiter, manager can send
router.post(
  "/orders/:orderId/send-bill",
  authorize("waiter", "receptionist", "manager"),
  sendBillToCustomer
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

// WAITER CALL ROUTES
// Create a waiter call (from guest room or table)
router.post(
  "/waiter-calls",
  protect,
  createWaiterCall
);
// Get all active waiter calls for a hotel
router.get("/waiter-calls", protect, getActiveWaiterCalls);
// Get waiter call history (today)
router.get("/waiter-calls/history", protect, getWaiterCallHistory);
// Acknowledge a waiter call
router.put(
  "/waiter-calls/:callId/acknowledge",
  authorize("waiter", "manager"),
  acknowledgeWaiterCall
);
// Resolve a waiter call
router.put(
  "/waiter-calls/:callId/resolve",
  protect,
  resolveWaiterCall
);

// TABLE ASSIGNMENT ROUTES
// Get current waiter's table assignment
router.get("/table-assignments/my", protect, getMyAssignment);
// Lookup which waiter is assigned to a specific table or room
router.get("/table-assignments/lookup", protect, lookupAssignedWaiter);
// Get all table assignments for a hotel (manager+)
router.get(
  "/table-assignments",
  protect,
  authorize("manager", "admin", "owner"),
  getTableAssignments
);
// Assign tables to a waiter (manager+)
router.post(
  "/table-assignments",
  protect,
  authorize("manager", "admin", "owner"),
  assignTables
);
// Remove a table assignment (manager+)
router.delete(
  "/table-assignments/:assignmentId",
  protect,
  authorize("manager", "admin", "owner"),
  removeAssignment
);
// Bulk update table assignments (manager+)
router.put(
  "/table-assignments/bulk",
  protect,
  authorize("manager", "admin", "owner"),
  bulkUpdateAssignments
);

export default router;
