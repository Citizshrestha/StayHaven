import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  getFinanceOverview,
  getRevenueSummary,
  getRevenueByHotel,
  getRevenueBreakdown,
  getPaymentMethodMix,
  getPayouts,
  createPayout,
  updatePayoutStatus,
  getRefunds,
  createRefund,
  updateRefundStatus,
  getCommissionRules,
  createCommissionRule,
  updateCommissionRule,
  deleteCommissionRule,
  generateInvoice,
  getFinancialReport,
} from "../controllers/finance.controller.js";

const router = express.Router();

router.use(protect);
router.use(authorize("superadmin", "admin"));

router.get("/overview", getFinanceOverview);
router.get("/revenue/summary", getRevenueSummary);
router.get("/revenue/by-hotel", getRevenueByHotel);
router.get("/revenue/breakdown", getRevenueBreakdown);
router.get("/payment-methods", getPaymentMethodMix);

router.get("/payouts", getPayouts);
router.post("/payouts", createPayout);
router.put("/payouts/:id/status", updatePayoutStatus);

router.get("/refunds", getRefunds);
router.post("/refunds", createRefund);
router.put("/refunds/:id/status", updateRefundStatus);

router.get("/commission-rules", getCommissionRules);
router.post("/commission-rules", createCommissionRule);
router.put("/commission-rules/:id", updateCommissionRule);
router.delete("/commission-rules/:id", deleteCommissionRule);

router.get("/invoice/:bookingId", generateInvoice);
router.get("/report", getFinancialReport);

export default router;
