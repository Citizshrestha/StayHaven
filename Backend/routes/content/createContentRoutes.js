import express from "express";
import { protect, authorize } from "../../middleware/authMiddleware.js";

export const createContentRoutes = (controller) => {
  const router = express.Router();
  const requireSuperAdmin = [protect, authorize("superadmin")];

  router.get("/", controller.getPublicContent);
  router.get("/admin", requireSuperAdmin, controller.getAdminContent);
  router.get("/admin/:id", requireSuperAdmin, controller.getContentById);
  router.post("/", requireSuperAdmin, controller.createContent);
  router.put("/:id", requireSuperAdmin, controller.updateContent);
  router.delete("/:id", requireSuperAdmin, controller.deleteContent);
  router.patch("/:id/publish", requireSuperAdmin, controller.publishContent);
  router.patch("/:id/unpublish", requireSuperAdmin, controller.unpublishContent);
  router.patch("/reorder", requireSuperAdmin, controller.reorderContent);

  return router;
};
