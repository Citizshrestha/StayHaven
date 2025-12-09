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
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", staffLogin);
router.post("/refresh-token", refreshAccessToken);

// Verify invite token - staff clicks email link, frontend calls this
router.get("/verify-invite/:token", verifyInviteToken);

// Complete onboarding - staff sets password after clicking invite link
router.post("/complete-onboard", completeOnBoarding);

// Forgot password - request reset link 
router.post("/forgot-password", forgotPassword);

// Reset password - complete reset with token
router.post("/reset-password", resetPassword);

// PROTECTED ROUTES (Requires valid access token)
router.get("/me", protect, getStaffProfile);
router.post("/logout", protect, staffLogout);

//staff change password
router.put("/change-password", protect, changePassword);

// MANAGER/ADMIN/OWNER ONLY ROUTES
// Register staff directly (manager creates with password)
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

// Get all pending invitations for manager's company
router.get(
  "/pending-invites",
  protect,
  authorize("manager", "admin", "owner"),
  getPendingInvites
);


// delete/cancel pending invitations
router.delete("/invite/:staffId", protect, authorize('manager', 'admin', 'owner'), deleteInvite);


// Get all staff for a specific property
router.get(
  "/property/:propertyId",
  protect,
  authorize("manager", "admin", "owner"),
  getPropertyStaff
);

// Update staff status (activate/deactivate)
router.put(
  "/status/:staffId",
  protect,
  authorize("manager", "admin", "owner"),
  updateStaffStatus
);

export default router;
