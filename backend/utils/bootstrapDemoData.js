import { Hotel } from "../models/hotel.schema.js";
import { Payout } from "../models/payout.model.js";
import { runSeedSuperadminData } from "../controllers/seedSuperadminData.js";
import { runSeedFinanceData } from "../controllers/seedFinanceData.js";
import { runSeedReviewData } from "../controllers/seedReviewData.js";
import { Review } from "../models/review.model.js";
import { createLogger } from "./logger.js";

const logger = createLogger("BootstrapDemoData");

/**
 * Decide whether demo/sample data may be written to the connected database.
 *
 * WHY THIS IS STRICT OPT-IN:
 * The previous gate was `NODE_ENV !== "production"`, which seeds by default.
 * NODE_ENV is unset in most local shells, so simply starting the server wrote
 * demo hotels, bookings, guests, payouts, refunds and transactions into
 * whatever database MONGODB_URI happened to point at. When a developer's local
 * .env points at a shared or production-like Atlas cluster -- which is the
 * normal situation in this repo -- that silently injects fake financial records
 * into real data. "Not production" is not a safe proxy for "safe to write junk".
 *
 * The boundary is therefore inverted: seeding requires an explicit
 * ENABLE_DEMO_SEED=true, and production refuses regardless.
 */
export const shouldSeedDemoData = (env = process.env) => {
    // Hard stop: production never seeds, even if explicitly asked to.
    if (env.NODE_ENV === "production") {
        if (env.ENABLE_DEMO_SEED === "true") {
            logger.error(
                "REFUSING demo seed: ENABLE_DEMO_SEED=true is set in production. " +
                "Demo data must never be written to a production database. Remove this variable."
            );
        }
        return false;
    }

    // Retain the historical kill switch: AUTO_SEED_DEMO=false always wins.
    if (env.AUTO_SEED_DEMO === "false") {
        return false;
    }

    // Explicit opt-in required. Missing or any other value means do not seed.
    return env.ENABLE_DEMO_SEED === "true";
};

export const bootstrapDemoData = async () => {
  if (!shouldSeedDemoData()) {
    logger.info(
      "Demo data seeding is disabled (set ENABLE_DEMO_SEED=true in a non-production " +
      "environment with a disposable database to enable it)."
    );
    return;
  }

  logger.warn(
    "ENABLE_DEMO_SEED=true: writing demo hotels, bookings, guests and financial " +
    "records to the connected database. Ensure this is a disposable database."
  );

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
