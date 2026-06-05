import mongoose from "mongoose";
import { Booking } from "../models/booking.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { Payout } from "../models/payout.model.js";
import { Refund } from "../models/refund.model.js";
import { Commission } from "../models/commission.model.js";
import { logAudit } from "../middleware/auditLogger.js";
import { resolveFinanceDateRange } from "../utils/financeDateRange.js";

export const getFinanceOverview = async (req, res) => {
  try {
    const { startDate, endDate } = resolveFinanceDateRange(req.query);

    const pendingPayouts = await Payout.find({
      status: { $in: ["pending", "scheduled", "processing"] },
    }).lean();

    const outstandingRefunds = await Refund.find({
      status: { $in: ["requested", "under_review", "approved"] },
    }).lean();

    const failedPayments = await PaymentTransaction.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: "failed",
    }).lean();

    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ["Confirmed", "Checked-In", "Checked-Out"] },
      paymentStatus: "paid",
    }).lean();

    const grossRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const platformCommission = Math.round(grossRevenue * 0.15);
    const taxes = Math.round(platformCommission * 0.13);
    const netHotelPayout = Math.round(grossRevenue - platformCommission - taxes);

    res.json({
      success: true,
      data: {
        kpis: {
          pendingPayouts: {
            count: pendingPayouts.length,
            amount: Math.round(pendingPayouts.reduce((s, p) => s + p.netPayout, 0)),
          },
          outstandingRefunds: {
            count: outstandingRefunds.length,
            amount: Math.round(outstandingRefunds.reduce((s, r) => s + r.amount, 0)),
          },
          failedPayments: {
            count: failedPayments.length,
            amount: Math.round(failedPayments.reduce((s, t) => s + t.amount, 0)),
          },
          taxesCollected: taxes,
        },
        waterfall: {
          grossRevenue: Math.round(grossRevenue),
          platformCommission,
          taxes,
          netHotelPayout,
        },
        currency: "NRS",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch finance overview",
      error: error.message,
    });
  }
};

export const getRevenueSummary = async (req, res) => {
  try {
    const { startDate, endDate } = resolveFinanceDateRange(req.query);

    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ["Confirmed", "Checked-In", "Checked-Out"] },
      paymentStatus: "paid",
    }).lean();

    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const platformCommission = Math.round(totalRevenue * 0.15);
    const taxes = Math.round(platformCommission * 0.13);
    const hotelsPayouts = totalRevenue - platformCommission - taxes;

    const byDay = {};
    bookings.forEach((booking) => {
      const date = new Date(booking.createdAt).toISOString().split("T")[0];
      if (!byDay[date]) {
        byDay[date] = 0;
      }
      byDay[date] += booking.totalAmount;
    });

    const dayArray = Object.keys(byDay)
      .sort()
      .map((date) => ({
        date,
        revenue: byDay[date],
      }));

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: Math.round(totalRevenue),
          platformCommission,
          hotelsPayouts: Math.round(hotelsPayouts),
          taxes,
          totalBookings: bookings.length,
          currency: "NRS",
        },
        byDay: dayArray,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue summary",
      error: error.message,
    });
  }
};

export const getRevenueByHotel = async (req, res) => {
  try {
    const { hotelId, page = 1, limit = 10, sortBy = "revenue" } = req.query;
    const { startDate, endDate } = resolveFinanceDateRange(req.query);

    const matchStage = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ["Confirmed", "Checked-In", "Checked-Out"] },
      paymentStatus: "paid",
    };

    if (hotelId) {
      matchStage.hotel = new mongoose.Types.ObjectId(hotelId);
    }

    const aggregation = await Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$hotel",
          bookingCount: { $sum: 1 },
          grossRevenue: { $sum: "$totalAmount" },
        },
      },
      {
        $lookup: {
          from: "hotels",
          localField: "_id",
          foreignField: "_id",
          as: "hotelInfo",
        },
      },
      { $unwind: "$hotelInfo" },
      {
        $project: {
          hotelId: "$_id",
          hotelName: "$hotelInfo.name",
          bookingCount: 1,
          grossRevenue: 1,
          commission: { $multiply: ["$grossRevenue", 0.15] },
          netPayout: { $multiply: ["$grossRevenue", 0.85] },
          avgBookingValue: { $divide: ["$grossRevenue", "$bookingCount"] },
        },
      },
      { $sort: sortBy === "revenue" ? { grossRevenue: -1 } : { bookingCount: -1 } },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
    ]);

    const total = await Booking.aggregate([
      { $match: matchStage },
      { $group: { _id: "$hotel" } },
      { $count: "total" },
    ]);

    res.json({
      success: true,
      data: aggregation.map((item) => ({
        ...item,
        grossRevenue: Math.round(item.grossRevenue),
        commission: Math.round(item.commission),
        netPayout: Math.round(item.netPayout),
        avgBookingValue: Math.round(item.avgBookingValue),
      })),
      total: total[0]?.total || 0,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue by hotel",
      error: error.message,
    });
  }
};

export const getRevenueBreakdown = async (req, res) => {
  try {
    const { groupBy = "channel" } = req.query;
    const { startDate, endDate } = resolveFinanceDateRange(req.query);

    const matchStage = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ["Confirmed", "Checked-In", "Checked-Out"] },
      paymentStatus: "paid",
    };

    let groupField = "$hotel";
    let lookupCollection = "hotels";
    let lookupField = "name";

    if (groupBy === "channel") {
      groupField = "$bookingSource";
      lookupCollection = null;
    } else if (groupBy === "roomType") {
      groupField = "$room";
      lookupCollection = "rooms";
      lookupField = "type";
    }

    const aggregation = await Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupField,
          count: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
      ...(lookupCollection
        ? [
            {
              $lookup: {
                from: lookupCollection,
                localField: "_id",
                foreignField: "_id",
                as: "info",
              },
            },
            { $unwind: { path: "$info", preserveNullAndEmptyArrays: true } },
          ]
        : []),
      { $sort: { revenue: -1 } },
    ]);

    const totalRevenue = aggregation.reduce((sum, item) => sum + item.revenue, 0);

    const breakdown = aggregation.map((item) => ({
      label: lookupCollection ? item.info?.[lookupField] || "Unknown" : item._id || "Direct",
      count: item.count,
      revenue: Math.round(item.revenue),
      percentage: totalRevenue > 0 ? parseFloat(((item.revenue / totalRevenue) * 100).toFixed(1)) : 0,
    }));

    res.json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue breakdown",
      error: error.message,
    });
  }
};

export const getPaymentMethodMix = async (req, res) => {
  try {
    const { startDate, endDate } = resolveFinanceDateRange(req.query);

    const transactions = await PaymentTransaction.find({
      createdAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const methods = {};
    transactions.forEach((txn) => {
      const method = txn.method || "cash";
      if (!methods[method]) {
        methods[method] = {
          method,
          count: 0,
          amount: 0,
          successCount: 0,
          failedCount: 0,
          failedAmount: 0,
        };
      }
      methods[method].count++;
      methods[method].amount += txn.amount;

      if (txn.status === "captured" || txn.status === "settled") {
        methods[method].successCount++;
      } else if (txn.status === "failed") {
        methods[method].failedCount++;
        methods[method].failedAmount += txn.amount;
      }
    });

    const result = Object.values(methods).map((m) => ({
      ...m,
      amount: Math.round(m.amount),
      failedAmount: Math.round(m.failedAmount),
      successRate: m.count > 0 ? parseFloat(((m.successCount / m.count) * 100).toFixed(1)) : 0,
    }));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment method mix",
      error: error.message,
    });
  }
};

export const getPayouts = async (req, res) => {
  try {
    const { status, hotelId, dateFrom, dateTo, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (hotelId) query.hotel = hotelId;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const payouts = await Payout.find(query)
      .populate("hotel", "name")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const total = await Payout.countDocuments(query);

    res.json({
      success: true,
      data: payouts,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch payouts",
      error: error.message,
    });
  }
};

export const createPayout = async (req, res) => {
  try {
    const { hotelId, periodFrom, periodTo, scheduledFor } = req.body;

    if (!hotelId || !periodFrom || !periodTo) {
      return res.status(400).json({
        success: false,
        message: "Hotel ID, period from, and period to are required",
      });
    }

    const bookings = await Booking.find({
      hotel: hotelId,
      checkOut: { $gte: new Date(periodFrom), $lte: new Date(periodTo) },
      status: "Checked-Out",
      paymentStatus: "paid",
    }).lean();

    const grossRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const platformCommission = Math.round(grossRevenue * 0.15);
    const taxes = Math.round(platformCommission * 0.13);
    const netPayout = grossRevenue - platformCommission - taxes;

    const payout = new Payout({
      hotel: hotelId,
      period: {
        from: new Date(periodFrom),
        to: new Date(periodTo),
      },
      totalBookings: bookings.length,
      grossRevenue: Math.round(grossRevenue),
      platformCommission,
      taxes,
      netPayout: Math.round(netPayout),
      currency: "NRS",
      status: scheduledFor ? "scheduled" : "pending",
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      createdBy: req.user._id,
    });

    await payout.save();

    await logAudit(req.user._id, "create_payout", "payout", payout._id, null, payout.toObject(), req);

    res.json({
      success: true,
      message: "Payout created successfully",
      data: payout,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create payout",
      error: error.message,
    });
  }
};

export const updatePayoutStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, transactionRef, notes } = req.body;

    const validTransitions = {
      pending: ["processing", "scheduled"],
      scheduled: ["processing"],
      processing: ["completed", "failed"],
      completed: [],
      failed: ["pending"],
    };

    const payout = await Payout.findById(id);
    if (!payout) {
      return res.status(404).json({
        success: false,
        message: "Payout not found",
      });
    }

    const before = payout.toObject();

    if (!validTransitions[payout.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${payout.status} to ${status}`,
      });
    }

    payout.status = status;
    if (transactionRef) payout.transactionRef = transactionRef;
    if (notes) payout.notes = notes;
    if (status === "completed") payout.processedAt = new Date();

    await payout.save();

    await logAudit(req.user._id, "update_payout_status", "payout", payout._id, before, payout.toObject(), req);

    res.json({
      success: true,
      message: "Payout status updated successfully",
      data: payout,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update payout status",
      error: error.message,
    });
  }
};

export const getRefunds = async (req, res) => {
  try {
    const { status, hotelId, dateFrom, dateTo, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (hotelId) query.hotel = hotelId;
    if (dateFrom || dateTo) {
      query.requestedAt = {};
      if (dateFrom) query.requestedAt.$gte = new Date(dateFrom);
      if (dateTo) query.requestedAt.$lte = new Date(dateTo);
    }

    const refunds = await Refund.find(query)
      .populate("booking", "bookingId")
      .populate("hotel", "name")
      .populate("guest", "fullname email")
      .sort({ requestedAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const total = await Refund.countDocuments(query);

    res.json({
      success: true,
      data: refunds,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch refunds",
      error: error.message,
    });
  }
};

export const createRefund = async (req, res) => {
  try {
    const { bookingId, amount, reason, reasonDetail } = req.body;

    if (!bookingId || !amount || !reason) {
      return res.status(400).json({
        success: false,
        message: "Booking ID, amount, and reason are required",
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (amount > booking.totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Refund amount cannot exceed booking amount",
      });
    }

    const existingRefund = await Refund.findOne({
      booking: bookingId,
      status: { $nin: ["rejected"] },
    });

    if (existingRefund) {
      return res.status(400).json({
        success: false,
        message: "A refund request already exists for this booking",
      });
    }

    const refund = new Refund({
      booking: bookingId,
      hotel: booking.hotel,
      guest: booking.user || booking.guest,
      amount,
      currency: booking.currency || "NRS",
      reason,
      reasonDetail,
      status: "requested",
    });

    await refund.save();

    await logAudit(req.user._id, "create_refund", "refund", refund._id, null, refund.toObject(), req);

    res.json({
      success: true,
      message: "Refund request created successfully",
      data: refund,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create refund",
      error: error.message,
    });
  }
};

export const updateRefundStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, khaltiRefRef } = req.body;

    const refund = await Refund.findById(id);
    if (!refund) {
      return res.status(404).json({
        success: false,
        message: "Refund not found",
      });
    }

    const before = refund.toObject();

    refund.status = status;
    refund.processedBy = req.user._id;
    refund.processedAt = new Date();

    if (rejectionReason) refund.rejectionReason = rejectionReason;
    if (khaltiRefRef) refund.khaltiRefRef = khaltiRefRef;

    await refund.save();

    await logAudit(req.user._id, "update_refund_status", "refund", refund._id, before, refund.toObject(), req);

    res.json({
      success: true,
      message: "Refund status updated successfully",
      data: refund,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update refund status",
      error: error.message,
    });
  }
};

export const getCommissionRules = async (req, res) => {
  try {
    const rules = await Commission.find({ isActive: true })
      .populate("hotel", "name")
      .sort({ priority: -1 })
      .lean();

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch commission rules",
      error: error.message,
    });
  }
};

export const createCommissionRule = async (req, res) => {
  try {
    const { scope, hotel, roomType, rate, flatFee, validFrom, validUntil, promoCode, priority } = req.body;

    if (!scope || rate === undefined) {
      return res.status(400).json({
        success: false,
        message: "Scope and rate are required",
      });
    }

    if (rate < 0 || rate > 100) {
      return res.status(400).json({
        success: false,
        message: "Rate must be between 0 and 100",
      });
    }

    const conflictQuery = {
      isActive: true,
      scope,
    };
    if (hotel) conflictQuery.hotel = hotel;
    if (roomType) conflictQuery.roomType = roomType;

    const conflicting = await Commission.findOne(conflictQuery);
    if (conflicting) {
      return res.status(400).json({
        success: false,
        message: "A conflicting commission rule already exists",
      });
    }

    const rule = new Commission({
      scope,
      hotel: hotel || null,
      roomType: roomType || null,
      rate,
      flatFee: flatFee || 0,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      promoCode: promoCode || null,
      priority: priority || 0,
      createdBy: req.user._id,
    });

    await rule.save();

    await logAudit(req.user._id, "create_commission_rule", "commission", rule._id, null, rule.toObject(), req);

    res.json({
      success: true,
      message: "Commission rule created successfully",
      data: rule,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create commission rule",
      error: error.message,
    });
  }
};

export const updateCommissionRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const rule = await Commission.findById(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Commission rule not found",
      });
    }

    const before = rule.toObject();

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined && key !== "_id") {
        rule[key] = updates[key];
      }
    });

    await rule.save();

    await logAudit(req.user._id, "update_commission_rule", "commission", rule._id, before, rule.toObject(), req);

    res.json({
      success: true,
      message: "Commission rule updated successfully",
      data: rule,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update commission rule",
      error: error.message,
    });
  }
};

export const deleteCommissionRule = async (req, res) => {
  try {
    const { id } = req.params;

    const rule = await Commission.findById(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Commission rule not found",
      });
    }

    const before = rule.toObject();
    rule.isActive = false;
    await rule.save();

    await logAudit(req.user._id, "delete_commission_rule", "commission", rule._id, before, rule.toObject(), req);

    res.json({
      success: true,
      message: "Commission rule deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete commission rule",
      error: error.message,
    });
  }
};

export const generateInvoice = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate("hotel", "name address")
      .populate("user", "fullname email phone")
      .populate("room", "type pricePerNight")
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const nights = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));

    const invoice = {
      invoiceNumber: `INV-${booking.bookingId}`,
      issuedAt: new Date(),
      dueDate: new Date(booking.checkIn),
      hotel: {
        name: booking.hotel?.name || "Unknown Hotel",
        address: booking.hotel?.address || "N/A",
        taxId: "N/A",
      },
      guest: {
        name: booking.user?.fullname || booking.guestInfo?.name || "Guest",
        email: booking.user?.email || booking.guestInfo?.email || "N/A",
        phone: booking.user?.phone || booking.guestInfo?.phone || "N/A",
      },
      booking: {
        bookingId: booking.bookingId,
        roomType: booking.room?.type || "Standard Room",
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights,
      },
      lineItems: [
        {
          description: `${booking.room?.type || "Room"} - ${nights} night(s)`,
          quantity: nights,
          unitPrice: Math.round(booking.totalAmount / nights),
          total: booking.totalAmount,
        },
      ],
      subtotal: booking.totalAmount,
      tax: 0,
      total: booking.totalAmount,
      currency: booking.currency || "NRS",
      paymentMethod: "Online",
      paymentStatus: booking.paymentStatus,
    };

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate invoice",
      error: error.message,
    });
  }
};

export const getFinancialReport = async (req, res) => {
  try {
    const { format = "json" } = req.query;
    const { startDate, endDate } = resolveFinanceDateRange(req.query);

    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ["Confirmed", "Checked-In", "Checked-Out"] },
      paymentStatus: "paid",
    }).lean();

    const refunds = await Refund.find({
      requestedAt: { $gte: startDate, $lte: endDate },
      status: "processed",
    }).lean();

    const groupedData = {};

    bookings.forEach((booking) => {
      const date = new Date(booking.createdAt).toISOString().split("T")[0];
      if (!groupedData[date]) {
        groupedData[date] = {
          date,
          bookings: 0,
          revenue: 0,
          commission: 0,
          payouts: 0,
          refunds: 0,
        };
      }
      groupedData[date].bookings++;
      groupedData[date].revenue += booking.totalAmount;
      groupedData[date].commission += Math.round(booking.totalAmount * 0.15);
      groupedData[date].payouts += Math.round(booking.totalAmount * 0.85);
    });

    refunds.forEach((refund) => {
      const date = new Date(refund.requestedAt).toISOString().split("T")[0];
      if (groupedData[date]) {
        groupedData[date].refunds += refund.amount;
      }
    });

    const report = Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));

    if (format === "csv") {
      const csv = [
        "Date,Bookings,Revenue,Commission,Payouts,Refunds",
        ...report.map(
          (row) => `${row.date},${row.bookings},${row.revenue},${row.commission},${row.payouts},${row.refunds}`
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=financial-report-${Date.now()}.csv`);
      return res.send(csv);
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate financial report",
      error: error.message,
    });
  }
};
