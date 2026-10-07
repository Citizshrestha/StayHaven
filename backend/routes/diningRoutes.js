import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { writeOperationLimiter } from "../middleware/rateLimiter.js";
import { sanitizeAll } from "../middleware/sanitization.js";
import {
  deleteDiscount,
  getReport,
  getSession,
  getSessions,
  getSettings,
  postClose,
  postDiscount,
  postPayment,
  postPrint,
  postRefund,
  postTransfer,
  postVoid,
  putSettings,
} from "../controllers/diningController.js";

// Mounted at /api/v1/staff/dining
const router = express.Router();

router.use(sanitizeAll());
router.use(protect);

const CASHIERS = ["waiter", "receptionist", "manager", "owner"];
const SUPERVISORS = ["manager", "owner"];

router.get("/sessions", authorize(...CASHIERS), getSessions);
router.get("/sessions/:id", authorize(...CASHIERS), getSession);
router.post("/sessions/:id/payments", authorize(...CASHIERS), writeOperationLimiter, postPayment);
router.post("/sessions/:id/close", authorize(...CASHIERS), writeOperationLimiter, postClose);
router.post("/sessions/:id/print", authorize(...CASHIERS), writeOperationLimiter, postPrint);
router.post("/sessions/:id/transfer", authorize(...CASHIERS), writeOperationLimiter, postTransfer);

router.post("/sessions/:id/discount", authorize(...SUPERVISORS), writeOperationLimiter, postDiscount);
router.delete("/sessions/:id/discount", authorize(...SUPERVISORS), writeOperationLimiter, deleteDiscount);
router.post("/sessions/:id/void", authorize(...SUPERVISORS), writeOperationLimiter, postVoid);
router.post("/sessions/:id/refunds", authorize(...SUPERVISORS), writeOperationLimiter, postRefund);

router.get("/report", authorize("receptionist", "manager", "owner"), getReport);
router.get("/settings", authorize(...CASHIERS), getSettings);
router.put("/settings", authorize(...SUPERVISORS), writeOperationLimiter, putSettings);

export default router;
