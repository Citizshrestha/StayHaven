import { Offer } from "../../models/Offer.model.js";
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
} = createContentController({ Model: Offer, type: "offer" });
