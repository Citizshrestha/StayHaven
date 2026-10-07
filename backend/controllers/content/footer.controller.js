import { FooterContent } from "../../models/FooterContent.model.js";
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
  Model: FooterContent,
  type: "footer",
  singleton: true,
  defaultContent: {
    quickLinks: [
      { label: "Home", href: "/", order: 0 },
      { label: "Hotels", href: "/hotels", order: 1 },
      { label: "Offers", href: "/offers", order: 2 },
    ],
    exploreLinks: [
      { label: "Destinations", href: "/", order: 0 },
      { label: "About", href: "/about", order: 1 },
      { label: "Contact", href: "/contact", order: 2 },
    ],
    contactInfo: {
      address: "Kathmandu, Nepal",
      phone: "+977-1-0000000",
      email: "support@stayhaven.com",
    },
    socialLinks: [],
    copyrightText: "© 2026 StayHaven. All rights reserved.",
    newsletterEnabled: true,
    isActive: true,
    status: "published",
  },
});
