import express from "express";
import {staffLogin,refreshAccessToken, getStaffProfile, registerStaff, getPropertyStaff, updateStaffStatus, staffLogout} from "../controllers/staffController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();


router.post("/login", staffLogin);

//protected routes
router.get("/me", protect, getStaffProfile);
router.post("/logout", protect, staffLogout);
router.post("/refresh-token", refreshAccessToken);

// Manager / admin  only routes
router.post("/register", protect, authorize("manager","admin", "owner", "receptionist", "waiter", "kitchen-staff"), registerStaff);
router.get("/property-staff/:propertyId", protect, authorize("manager","admin", "owner", "receptionist",), getPropertyStaff);
router.put("/update-status/:staffId", protect, authorize("manager","admin", "owner", "receptionist"), updateStaffStatus);

export default router;

