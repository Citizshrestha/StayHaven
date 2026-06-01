import { SiteSettings } from "../../models/SiteSettings.model.js";
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
} = createContentController({
  Model: SiteSettings,
  type: "site-settings",
  singleton: true,
  defaultContent: {
    trustBadges: [
      { icon: "Shield", text: "Secure Booking", order: 0 },
      { icon: "Clock", text: "24/7 Support", order: 1 },
      { icon: "Star", text: "Verified Stays", order: 2 },
    ],
    liveViewers: 23,
    totalTravelers: "50,000+",
    avgRating: "4.8",
    secureBooking: true,
    isActive: true,
    status: "published",
  },
});
