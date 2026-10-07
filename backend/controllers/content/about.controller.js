import { AboutContent } from "../../models/AboutContent.model.js";
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
} = createContentController({ Model: AboutContent, type: "about", singleton: true });
