import express from "express";
import { getFeaturedTestimonials } from "../controllers/reviewModeration.controller.js";

const router = express.Router();

// Public endpoint - no authentication required
router.get("/", getFeaturedTestimonials);

export default router;
