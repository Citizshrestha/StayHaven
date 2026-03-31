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
  updateStaffProfile,
} from "../controllers/staffController.js";
import {
  createOrder,
  getOrders,
  updateOrderStatus,
  updateOrder,
  getOrderById,
  deleteOrder,
  sendBillToCustomer,
} from "../controllers/orderController.js";
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
import { getMenuItems, getMenuCategories } from "../controllers/menuController.js";
import {
  sendMessage,
  getMessages,
  markMessagesRead,
  initiateCall,
  updateCallStatus,
  getContacts,
  getConversations,
  deleteConversation,
  archiveConversation,
  muteConversation,
  unmuteConversation,
  markConversationUnread,
} from "../controllers/messagingController.js";
import {
  getNotifications,
  markNotificationsRead,
  getUnreadCount,
  createNotification,
} from "../controllers/notificationController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";
import { authLimiter, passwordResetLimiter, sensitiveOpLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// PUBLIC ROUTES (No authentication required)
// Rate-limited auth endpoints to prevent brute force attacks
router.post("/login", authLimiter, staffLogin);
router.post("/refresh-token", refreshAccessToken);
router.get("/verify-invite/:token", verifyInviteToken);
router.post("/complete-onboard", authLimiter, completeOnBoarding);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", passwordResetLimiter, resetPassword);


// PROTECTED ROUTES (Requires valid access token)
router.get("/me", protect, getStaffProfile);
router.post("/logout", protect, staffLogout);
router.put("/change-password", protect, changePassword);
router.patch("/profile-picture", protect, upload.single("profilePicture"), updateProfilePicture);
router.patch("/profile", protect, updateStaffProfile);

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

// Update order status - ONLY waiter, chief, manager can update (NOT receptionist)
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
  authorize("waiter", "manager", "receptionist"),
  updateOrder
);

// Send bill to customer - waiter, manager can send
router.post(
  "/orders/:orderId/send-bill",
  protect,
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

// ORDER HISTORY route removed

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
  protect,
  authorize("waiter", "manager"),
  acknowledgeWaiterCall
);

// Resolve a waiter call
router.put(
  "/waiter-calls/:callId/resolve",
  protect,
  authorize("waiter", "manager"),
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

// ═══════════════════════════════════════════
// MESSAGING ROUTES
// ═══════════════════════════════════════════

// Send a message
router.post("/messages", protect, sendMessage);

// Get messages (by channel or direct)
router.get("/messages", protect, getMessages);

// Mark messages as read
router.put("/messages/read", protect, markMessagesRead);

// Get contacts (staff list for messaging)
router.get("/messages/contacts", protect, getContacts);

// Get recent conversations (latest message per partner)
router.get("/messages/conversations", protect, getConversations);

// Delete conversation (soft delete - archives for this user)
router.delete("/messages/conversations/:partnerId", protect, deleteConversation);

// Archive conversation
router.post("/messages/conversations/:partnerId/archive", protect, archiveConversation);

// Mute conversation
router.post("/messages/conversations/:partnerId/mute", protect, muteConversation);

// Unmute conversation
router.post("/messages/conversations/:partnerId/unmute", protect, unmuteConversation);

// Mark conversation as unread
router.post("/messages/conversations/:partnerId/mark-unread", protect, markConversationUnread);

// Initiate a call
router.post("/messages/call", protect, initiateCall);

// Update call status
router.put("/messages/call/:callId", protect, updateCallStatus);

// ═══════════════════════════════════════════
// NOTIFICATION ROUTES
// ═══════════════════════════════════════════

// Get notifications for current user
router.get("/notifications", protect, getNotifications);

// Get unread notification count
router.get("/notifications/count", protect, getUnreadCount);

// Mark notifications as read
router.put("/notifications/read", protect, markNotificationsRead);

// Create a notification (for sending to other staff)
router.post(
  "/notifications",
  protect,
  authorize("receptionist", "manager", "admin", "owner"),
  createNotification
);

export default router;
