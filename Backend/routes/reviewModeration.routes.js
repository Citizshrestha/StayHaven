import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  getPendingReviews,
  moderateReview,
  getAutoFlagRules,
  updateAutoFlagRules,
  addHotelReply,
  moderateHotelReply,
  submitAppeal,
  resolveAppeal,
  getModerationMetrics,
  getReviewInsights,
} from "../controllers/reviewModeration.controller.js";

const router = express.Router();

router.use(protect);
router.use(authorize("superadmin", "admin"));

router.get("/", getPendingReviews);
router.put("/:id/moderate", moderateReview);

router.get("/auto-flag-rules", getAutoFlagRules);
router.put("/auto-flag-rules", updateAutoFlagRules);

router.post("/:id/reply", addHotelReply);
router.put("/:id/reply/moderate", moderateHotelReply);

router.post("/:id/appeal", submitAppeal);
router.put("/:id/appeal/resolve", resolveAppeal);

router.get("/metrics", getModerationMetrics);
router.get("/insights", getReviewInsights);

export default router;
