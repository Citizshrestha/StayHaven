import { HeroBanner } from "../../models/HeroBanner.model.js";
import { createContentController } from "./contentControllerFactory.js";

export const {
  getPublicContent,
  getAdminContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  publishContent,
  unpublishContent,
  reorderContent,
} = createContentController({ Model: HeroBanner, type: "hero-banner" });
