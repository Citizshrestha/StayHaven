import { Booking } from "../models/booking.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { User } from "../models/user.schema.js";
import { Company } from "../models/company.schema.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { Payout } from "../models/payout.model.js";
import { Refund } from "../models/refund.model.js";
import { Commission } from "../models/commission.model.js";

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

export const runSeedFinanceData = async () => {
    const superadmin = await User.findOne({ email: "superadmin@stayhaven.com" });
    const company = await Company.findOne({ name: /StayHaven/i });
    const hotels = await Hotel.find({ status: "approved" }).limit(6).lean();
    const paidBookings = await Booking.find({
      paymentStatus: "paid",
      status: { $in: ["Confirmed", "Checked-In", "Checked-Out"] },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    if (!company || hotels.length === 0) {
      return {
        success: false,
        message: "Run /api/v1/seed/superadmin-data first to create hotels and bookings.",
      };
    }

    const createdBy = superadmin?._id;

    // ── Payment transactions ──────────────────────────────────────────
    const existingTxns = await PaymentTransaction.countDocuments();
    let transactionsCreated = 0;

    if (existingTxns < 15) {
      const methods = [
        { method: "khalti", weight: 5 },
        { method: "esewa", weight: 3 },
        { method: "card", weight: 2 },
        { method: "bank-transfer", weight: 1 },
      ];
      const txnPayload = [];

      for (let i = 0; i < 24; i++) {
        const booking = paidBookings[i % paidBookings.length];
        const hotel = booking
          ? hotels.find((h) => String(h._id) === String(booking.hotel)) || hotels[0]
          : hotels[i % hotels.length];
        const method = methods[i % methods.length].method;
        const isFailed = i % 7 === 0;
        const amount = booking?.totalAmount || 15000 + i * 1200;

        txnPayload.push({
          hotel: hotel._id,
          company: company._id,
          booking: booking?._id,
          guest: booking?.user,
          type: "capture",
          amount,
          currency: "NPR",
          method,
          status: isFailed ? "failed" : i % 3 === 0 ? "settled" : "captured",
          reference: `REF-${10000 + i}`,
          createdAt: daysAgo(Math.floor(Math.random() * 28)),
        });
      }

      await PaymentTransaction.insertMany(txnPayload);
      transactionsCreated = txnPayload.length;
    }

    // ── Payouts ───────────────────────────────────────────────────────
    const existingPayouts = await Payout.countDocuments();
    let payoutsCreated = 0;

    if (existingPayouts < 5) {
      const payoutSpecs = [
        { hotelIdx: 0, status: "pending", gross: 285000, daysBack: 5 },
        { hotelIdx: 1, status: "processing", gross: 412000, daysBack: 12 },
        { hotelIdx: 2, status: "scheduled", gross: 198500, daysBack: 3 },
        { hotelIdx: 3, status: "completed", gross: 156000, daysBack: 20 },
        { hotelIdx: 4, status: "pending", gross: 94500, daysBack: 8 },
        { hotelIdx: 0, status: "completed", gross: 320000, daysBack: 25 },
      ];

      const payoutDocs = payoutSpecs.map((spec) => {
        const commission = Math.round(spec.gross * 0.15);
        const taxes = Math.round(commission * 0.13);
        const net = spec.gross - commission - taxes;
        const from = daysAgo(spec.daysBack + 14);
        const to = daysAgo(spec.daysBack);

        return {
          hotel: hotels[spec.hotelIdx % hotels.length]._id,
          period: { from, to },
          totalBookings: Math.floor(spec.gross / 12000),
          grossRevenue: spec.gross,
          platformCommission: commission,
          taxes,
          netPayout: net,
          currency: "NRS",
          status: spec.status,
          scheduledFor: spec.status === "scheduled" ? daysAgo(-3) : null,
          processedAt: spec.status === "completed" ? daysAgo(spec.daysBack - 2) : null,
          createdBy,
          createdAt: daysAgo(spec.daysBack),
        };
      });

      await Payout.insertMany(payoutDocs);
      payoutsCreated = payoutDocs.length;
    }

    // ── Refunds ───────────────────────────────────────────────────────
    const existingRefunds = await Refund.countDocuments();
    let refundsCreated = 0;

    if (existingRefunds < 4 && paidBookings.length >= 4) {
      const refundSpecs = [
        { bookingIdx: 0, status: "requested", reason: "guest_request", amountRatio: 0.5 },
        { bookingIdx: 1, status: "approved", reason: "hotel_cancel", amountRatio: 1 },
        { bookingIdx: 2, status: "processed", reason: "system_error", amountRatio: 0.3 },
        { bookingIdx: 3, status: "requested", reason: "duplicate", amountRatio: 1 },
        { bookingIdx: 4, status: "rejected", reason: "other", amountRatio: 0.2 },
      ];

      const refundDocs = refundSpecs.map((spec, i) => {
        const booking = paidBookings[spec.bookingIdx];
        return {
          booking: booking._id,
          hotel: booking.hotel,
          guest: booking.user,
          amount: Math.round(booking.totalAmount * spec.amountRatio),
          currency: "NRS",
          reason: spec.reason,
          reasonDetail: `Finance seed refund #${i + 1}`,
          status: spec.status,
          requestedAt: daysAgo(2 + i * 3),
          processedAt: spec.status === "processed" ? daysAgo(1) : null,
          processedBy: spec.status === "processed" ? createdBy : null,
        };
      });

      await Refund.insertMany(refundDocs);
      refundsCreated = refundDocs.length;
    }

    // ── Commission rules ──────────────────────────────────────────────
    const existingRules = await Commission.countDocuments();
    let rulesCreated = 0;

    if (existingRules < 3) {
      const ruleDocs = [
        {
          scope: "global",
          rate: 15,
          flatFee: 0,
          priority: 0,
          isActive: true,
          validFrom: daysAgo(90),
          createdBy,
        },
        {
          scope: "hotel",
          hotel: hotels[0]._id,
          rate: 12,
          flatFee: 500,
          priority: 10,
          isActive: true,
          validFrom: daysAgo(60),
          createdBy,
        },
        {
          scope: "room_type",
          hotel: hotels[1]._id,
          roomType: "suite",
          rate: 18,
          flatFee: 0,
          priority: 20,
          isActive: true,
          validFrom: daysAgo(30),
          validUntil: daysAgo(-60),
          createdBy,
        },
        {
          scope: "seasonal",
          rate: 10,
          flatFee: 0,
          priority: 5,
          isActive: false,
          validFrom: daysAgo(120),
          validUntil: daysAgo(90),
          createdBy,
        },
      ];

      await Commission.insertMany(ruleDocs);
      rulesCreated = ruleDocs.length;
    }

    // Ensure bookings have varied bookingSource for breakdown chart
    const sources = ["web", "mobile", "Website", "Walk-in", "Agoda", "Booking.com", "Expedia"];
    const bookingsToUpdate = await Booking.find({ paymentStatus: "paid" }).limit(15);
    for (let i = 0; i < bookingsToUpdate.length; i++) {
      bookingsToUpdate[i].bookingSource = sources[i % sources.length];
      await bookingsToUpdate[i].save();
    }

    return {
      success: true,
      message: "Finance data seeded successfully",
      data: {
        transactionsCreated,
        payoutsCreated,
        refundsCreated,
        rulesCreated,
        totalTransactions: await PaymentTransaction.countDocuments(),
        totalPayouts: await Payout.countDocuments(),
        totalRefunds: await Refund.countDocuments(),
        totalCommissionRules: await Commission.countDocuments(),
      },
    };
};

export const seedFinanceData = async (req, res) => {
  try {
    const result = await runSeedFinanceData();
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error("Error seeding finance data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to seed finance data",
      error: error.message,
    });
  }
};
