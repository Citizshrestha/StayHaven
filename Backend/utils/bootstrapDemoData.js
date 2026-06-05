import { Hotel } from "../models/hotel.schema.js";
import { Payout } from "../models/payout.model.js";
import { runSeedSuperadminData } from "../controllers/seedSuperadminData.js";
import { runSeedFinanceData } from "../controllers/seedFinanceData.js";
import { runSeedReviewData } from "../controllers/seedReviewData.js";
import { Review } from "../models/review.model.js";
import { createLogger } from "./logger.js";

const logger = createLogger("BootstrapDemoData");

export const bootstrapDemoData = async () => {
  if (process.env.NODE_ENV === "production" || process.env.AUTO_SEED_DEMO === "false") {
    return;
  }

  try {
    const approvedHotels = await Hotel.countDocuments({ status: "approved" });

    if (approvedHotels < 2) {
      logger.info("Seeding superadmin demo data (hotels, bookings, guests)...");
      const superadminResult = await runSeedSuperadminData();
      if (superadminResult.success) {
        logger.info("Superadmin demo data ready", superadminResult.data);
      } else {
        logger.warn("Superadmin demo seed skipped", { message: superadminResult.message });
        return;
      }
    }

    const payoutCount = await Payout.countDocuments();
    if (payoutCount < 5) {
      logger.info("Seeding finance demo data (payouts, refunds, transactions)...");
      const financeResult = await runSeedFinanceData();
      if (financeResult.success) {
        logger.info("Finance demo data ready", financeResult.data);
      } else {
        logger.warn("Finance demo seed skipped", { message: financeResult.message });
      }
    }

    const reviewCount = await Review.countDocuments();
    if (reviewCount < 8) {
      logger.info("Seeding review moderation demo data...");
      const reviewResult = await runSeedReviewData();
      if (reviewResult.success) {
        logger.info("Review demo data ready", reviewResult.data);
      } else {
        logger.warn("Review demo seed skipped", { message: reviewResult.message });
      }
    }
  } catch (error) {
    logger.error("Demo data bootstrap failed", { error: error.message });
  }
};
