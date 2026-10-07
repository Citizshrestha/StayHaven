import express from "express";
import heroBannerRoutes from "./heroBanner.routes.js";
import featuredHotelRoutes from "./featuredHotel.routes.js";
import destinationRoutes from "./destination.routes.js";
import offerRoutes from "./offer.routes.js";
import membershipRoutes from "./membership.routes.js";
import aboutRoutes from "./about.routes.js";
import footerRoutes from "./footer.routes.js";
import siteSettingsRoutes from "./siteSettings.routes.js";

const router = express.Router();

router.use("/hero-banners", heroBannerRoutes);
router.use("/featured-hotels", featuredHotelRoutes);
router.use("/destinations", destinationRoutes);
router.use("/offers", offerRoutes);
router.use("/memberships", membershipRoutes);
router.use("/about", aboutRoutes);
router.use("/footer", footerRoutes);
router.use("/site-settings", siteSettingsRoutes);

export default router;
