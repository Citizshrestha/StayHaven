import { Membership } from "../../models/Membership.model.js";
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
} = createContentController({ Model: Membership, type: "membership" });
