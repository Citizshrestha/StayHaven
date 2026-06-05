import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  getPlatformSettings,
  updatePlatformSettings,
  toggleMaintenanceMode,
  testKhaltiWebhook,
  testSmtp,
  getRolesPermissions,
  updateRolePermissions,
  getAuditLogs,
  getIntegrationStatus,
} from "../controllers/systemConfig.controller.js";

const router = express.Router();

router.use(protect);
router.use(authorize("superadmin", "admin"));

router.get("/settings", getPlatformSettings);
router.put("/settings", updatePlatformSettings);

router.put("/maintenance", toggleMaintenanceMode);

router.post("/khalti/test", testKhaltiWebhook);
router.post("/smtp/test", testSmtp);

router.get("/roles", getRolesPermissions);
router.put("/roles/:role", updateRolePermissions);

router.get("/audit-logs", getAuditLogs);

router.get("/integrations", getIntegrationStatus);

export default router;
