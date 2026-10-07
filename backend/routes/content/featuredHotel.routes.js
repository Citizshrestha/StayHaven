import express from "express";
import * as controller from "../../controllers/content/featuredHotel.controller.js";
import { createContentRoutes } from "./createContentRoutes.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const baseRouter = createContentRoutes(controller);

// Superadmin hotel picker — must be registered BEFORE the generic :id routes
const router = express.Router();
router.get(
  "/approved-hotels",
  protect,
  authorize("superadmin"),
  controller.getApprovedHotels
);

// Mount all standard content routes onto the same router
router.use("/", baseRouter);

export default router;
