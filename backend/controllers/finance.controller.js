import mongoose from "mongoose";
import { Booking } from "../models/booking.schema.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { Payout } from "../models/payout.model.js";
import { Refund } from "../models/refund.model.js";
import { Commission } from "../models/commission.model.js";
import { logAudit } from "../middleware/auditLogger.js";
import { resolveFinanceDateRange } from "../utils/financeDateRange.js";
import { parsePaging } from "../utils/searchQuery.js";
import {
  isObjectId,
  toPaisa,
  fromPaisa,
  getCommissionRate,
  splitGross,
  splitGrossRupees,
  sumPaisa,
  parseDate,
  csvCell,
} from "../services/platformFinance.js";

const REVENUE_STATUSES = ["Confirmed", "Checked-In", "Checked-Out"];
const badRequest = (res, message) => res.status(400).json({ success: false, message });
// 5xx responses keep the generic message; the detail goes to the server log.
const serverError = (res, message, error) => {
  console.error(`[finance] ${message}:`, error?.message);
  return res.status(500).json({ success: false, message });
};
const paidRevenueMatch = (startDate, endDate) => ({
  createdAt: { $gte: startDate, $lte: endDate },
  status: { $in: REVENUE_STATUSES },
  paymentStatus: "paid",
});

export const getFinanceOverview = async (req, res) => {
  try {
    const { startDate, endDate } = resolveFinanceDateRange(req.query);

    const [pendingPayouts, outstandingRefunds, failedPayments, bookings, rate] = await Promise.all([
      Payout.find({ status: { $in: ["pending", "scheduled", "processing"] } }).select("netPayout").lean(),
      Refund.find({ status: { $in: ["requested", "under_review", "approved"] } }).select("amount").lean(),
      PaymentTransaction.find({ createdAt: { $gte: startDate, $lte: endDate }, status: "failed" }).select("amount").lean(),
      Booking.find(paidRevenueMatch(startDate, endDate)).select("totalAmount").lean(),
      getCommissionRate(),
    ]);

    const split = splitGrossRupees(sumPaisa(bookings, (b) => b.totalAmount), rate);

    res.json({
      success: true,
      data: {
        kpis: {
          pendingPayouts: {
            count: pendingPayouts.length,
            amount: fromPaisa(sumPaisa(pendingPayouts, (p) => p.netPayout)),
          },
          outstandingRefunds: {
            count: outstandingRefunds.length,
            amount: fromPaisa(sumPaisa(outstandingRefunds, (r) => r.amount)),
          },
          failedPayments: {
            count: failedPayments.length,
            amount: fromPaisa(sumPaisa(failedPayments, (t) => t.amount)),
          },
          taxesCollected: split.taxes,
        },
        waterfall: {
          grossRevenue: split.gross,
          platformCommission: split.commission,
          taxes: split.taxes,
          netHotelPayout: split.net,
        },
        commissionRate: rate,
        currency: "NRS",
      },
    });
  } catch (error) {
    serverError(res, "Failed to fetch finance overview", error);
  }
};

export const getRevenueSummary = async (req, res) => {
  try {
    const { startDate, endDate } = resolveFinanceDateRange(req.query);

    const [bookings, rate] = await Promise.all([
      Booking.find(paidRevenueMatch(startDate, endDate)).select("totalAmount createdAt").lean(),
      getCommissionRate(),
    ]);

    const split = splitGrossRupees(sumPaisa(bookings, (b) => b.totalAmount), rate);

    const byDay = {};
    bookings.forEach((booking) => {
      const date = new Date(booking.createdAt).toISOString().split("T")[0];
      byDay[date] = (byDay[date] || 0) + toPaisa(booking.totalAmount);
    });

    const dayArray = Object.keys(byDay)
      .sort()
      .map((date) => ({ date, revenue: fromPaisa(byDay[date]) }));

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: split.gross,
          platformCommission: split.commission,
          hotelsPayouts: split.net,
          taxes: split.taxes,
          totalBookings: bookings.length,
          commissionRate: rate,
          currency: "NRS",
        },
        byDay: dayArray,
      },
    });
  } catch (error) {
    serverError(res, "Failed to fetch revenue summary", error);
  }
};

export const getRevenueByHotel = async (req, res) => {
  try {
    const { hotelId, sortBy = "revenue" } = req.query;
    const { startDate, endDate } = resolveFinanceDateRange(req.query);
    const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 10, maxLimit: 100 });

    const matchStage = paidRevenueMatch(startDate, endDate);
    if (hotelId) {
      if (!isObjectId(hotelId)) return badRequest(res, "Invalid hotel id");
      matchStage.hotel = new mongoose.Types.ObjectId(hotelId);
    }

    const [aggregation, total, rate] = await Promise.all([
      Booking.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$hotel",
            bookingCount: { $sum: 1 },
            grossPaisa: { $sum: { $round: [{ $multiply: ["$totalAmount", 100] }, 0] } },
          },
        },
        { $lookup: { from: "hotels", localField: "_id", foreignField: "_id", as: "hotelInfo" } },
        { $unwind: "$hotelInfo" },
        { $project: { hotelId: "$_id", hotelName: "$hotelInfo.name", bookingCount: 1, grossPaisa: 1 } },
        { $sort: sortBy === "revenue" ? { grossPaisa: -1 } : { bookingCount: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      Booking.aggregate([{ $match: matchStage }, { $group: { _id: "$hotel" } }, { $count: "total" }]),
      getCommissionRate(),
    ]);

    res.json({
      success: true,
      data: aggregation.map(({ grossPaisa, ...item }) => {
        const split = splitGross(grossPaisa, rate);
        return {
          ...item,
          grossRevenue: fromPaisa(split.gross),
          commission: fromPaisa(split.commission),
          taxes: fromPaisa(split.taxes),
          netPayout: fromPaisa(split.net),
          avgBookingValue: fromPaisa(Math.round(split.gross / item.bookingCount)),
        };
      }),
      total: total[0]?.total || 0,
      page,
      limit,
    });
  } catch (error) {
    serverError(res, "Failed to fetch revenue by hotel", error);
  }
};

export const getRevenueBreakdown = async (req, res) => {
  try {
    const { groupBy = "channel" } = req.query;
    const { startDate, endDate } = resolveFinanceDateRange(req.query);

    const matchStage = paidRevenueMatch(startDate, endDate);

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
            { $lookup: { from: lookupCollection, localField: "_id", foreignField: "_id", as: "info" } },
            { $unwind: { path: "$info", preserveNullAndEmptyArrays: true } },
          ]
        : []),
      { $sort: { revenue: -1 } },
    ]);

    const totalRevenue = aggregation.reduce((sum, item) => sum + item.revenue, 0);

    const breakdown = aggregation.map((item) => ({
      label: lookupCollection ? item.info?.[lookupField] || "Unknown" : item._id || "Direct",
      count: item.count,
      revenue: fromPaisa(toPaisa(item.revenue)),
      percentage: totalRevenue > 0 ? parseFloat(((item.revenue / totalRevenue) * 100).toFixed(1)) : 0,
    }));

    res.json({ success: true, data: breakdown });
  } catch (error) {
    serverError(res, "Failed to fetch revenue breakdown", error);
  }
};

export const getPaymentMethodMix = async (req, res) => {
  try {
    const { startDate, endDate } = resolveFinanceDateRange(req.query);

    const transactions = await PaymentTransaction.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .select("method amount status")
      .lean();

    const methods = {};
    transactions.forEach((txn) => {
      const method = txn.method || "cash";
      if (!methods[method]) {
        methods[method] = { method, count: 0, amount: 0, successCount: 0, failedCount: 0, failedAmount: 0 };
      }
      methods[method].count++;
      methods[method].amount += toPaisa(txn.amount);

      if (txn.status === "captured" || txn.status === "settled") {
        methods[method].successCount++;
      } else if (txn.status === "failed") {
        methods[method].failedCount++;
        methods[method].failedAmount += toPaisa(txn.amount);
      }
    });

    const result = Object.values(methods).map((m) => ({
      ...m,
      amount: fromPaisa(m.amount),
      failedAmount: fromPaisa(m.failedAmount),
      successRate: m.count > 0 ? parseFloat(((m.successCount / m.count) * 100).toFixed(1)) : 0,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    serverError(res, "Failed to fetch payment method mix", error);
  }
};

const PAYOUT_STATUSES = ["pending", "processing", "completed", "failed", "scheduled"];
const REFUND_STATUSES = ["requested", "under_review", "approved", "processed", "rejected", "chargeback"];

// Shared filter parsing for the payout/refund lists. Returns null after
// sending a 400 when an input is malformed.
const buildListQuery = (req, res, statuses, dateField) => {
  const { status, hotelId, dateFrom, dateTo } = req.query;
  const query = {};
  if (status) {
    if (!statuses.includes(status)) return badRequest(res, "Invalid status filter") && null;
    query.status = status;
  }
  if (hotelId) {
    if (!isObjectId(hotelId)) return badRequest(res, "Invalid hotel id") && null;
    query.hotel = hotelId;
  }
  const from = parseDate(dateFrom);
  const to = parseDate(dateTo);
  if (from === undefined || to === undefined) return badRequest(res, "Invalid date filter") && null;
  if (from || to) {
    query[dateField] = {};
    if (from) query[dateField].$gte = from;
    if (to) query[dateField].$lte = to;
  }
  return query;
};

export const getPayouts = async (req, res) => {
  try {
    const query = buildListQuery(req, res, PAYOUT_STATUSES, "createdAt");
    if (!query) return;
    const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 10, maxLimit: 100 });

    const [payouts, total] = await Promise.all([
      Payout.find(query).populate("hotel", "name").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Payout.countDocuments(query),
    ]);

    res.json({ success: true, data: payouts, total, page, limit });
  } catch (error) {
    serverError(res, "Failed to fetch payouts", error);
  }
};

export const createPayout = async (req, res) => {
  try {
    const { hotelId, periodFrom, periodTo, scheduledFor } = req.body;

    if (!hotelId || !periodFrom || !periodTo) {
      return badRequest(res, "Hotel ID, period from, and period to are required");
    }
    if (!isObjectId(hotelId)) return badRequest(res, "Invalid hotel id");
    const from = parseDate(periodFrom);
    const to = parseDate(periodTo);
    const scheduled = parseDate(scheduledFor);
    if (!from || !to) return badRequest(res, "Invalid payout period dates");
    if (from > to) return badRequest(res, "Period start must be before period end");
    if (scheduled === undefined) return badRequest(res, "Invalid scheduled date");

    // A booking may be paid out only once: reject any period that overlaps an
    // existing (non-failed) payout for the same hotel. Failed payouts are
    // retried through their status (failed -> pending), not re-created.
    const overlapping = await Payout.exists({
      hotel: hotelId,
      status: { $ne: "failed" },
      "period.from": { $lte: to },
      "period.to": { $gte: from },
    });
    if (overlapping) {
      return res.status(409).json({ success: false, message: "A payout already covers part of this period for this hotel" });
    }

    const [bookings, rate] = await Promise.all([
      Booking.find({
        hotel: hotelId,
        checkOut: { $gte: from, $lte: to },
        status: "Checked-Out",
        paymentStatus: "paid",
      })
        .select("totalAmount")
        .lean(),
      getCommissionRate(),
    ]);

    const split = splitGrossRupees(sumPaisa(bookings, (b) => b.totalAmount), rate);

    const payout = new Payout({
      hotel: hotelId,
      period: { from, to },
      totalBookings: bookings.length,
      grossRevenue: split.gross,
      platformCommission: split.commission,
      taxes: split.taxes,
      netPayout: split.net,
      currency: "NRS",
      status: scheduled ? "scheduled" : "pending",
      scheduledFor: scheduled || null,
      createdBy: req.user._id,
    });

    try {
      await payout.save();
    } catch (error) {
      // Unique (hotel, period) index: a concurrent double-submit lost the race.
      if (error?.code === 11000) {
        return res.status(409).json({ success: false, message: "A payout for this hotel and period already exists" });
      }
      throw error;
    }

    await logAudit(req.user._id, "create_payout", "payout", payout._id, null, payout.toObject(), req);

    res.json({ success: true, message: "Payout created successfully", data: payout });
  } catch (error) {
    serverError(res, "Failed to create payout", error);
  }
};

const PAYOUT_TRANSITIONS = {
  pending: ["processing", "scheduled"],
  scheduled: ["processing"],
  processing: ["completed", "failed"],
  completed: [],
  failed: ["pending"],
};

export const updatePayoutStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, transactionRef, notes } = req.body;

    if (!isObjectId(id)) return badRequest(res, "Invalid payout id");
    if (typeof status !== "string" || !PAYOUT_STATUSES.includes(status)) return badRequest(res, "Invalid payout status");
    if (transactionRef !== undefined && (typeof transactionRef !== "string" || transactionRef.length > 100)) {
      return badRequest(res, "Transaction reference must be a string of at most 100 characters");
    }
    if (notes !== undefined && (typeof notes !== "string" || notes.length > 1000)) {
      return badRequest(res, "Notes must be a string of at most 1000 characters");
    }

    const payout = await Payout.findById(id).lean();
    if (!payout) return res.status(404).json({ success: false, message: "Payout not found" });

    if (!PAYOUT_TRANSITIONS[payout.status]?.includes(status)) {
      return badRequest(res, `Cannot transition from ${payout.status} to ${status}`);
    }

    const set = { status };
    if (transactionRef) set.transactionRef = transactionRef.trim();
    if (notes) set.notes = notes;
    if (status === "completed") set.processedAt = new Date();

    // Compare-and-set on the status we validated against, so two admins
    // approving / marking paid at the same time can only succeed once.
    const updated = await Payout.findOneAndUpdate({ _id: id, status: payout.status }, { $set: set }, { new: true, runValidators: true });
    if (!updated) {
      return res.status(409).json({ success: false, message: "This payout was updated by someone else. Refresh and try again." });
    }

    await logAudit(req.user._id, "update_payout_status", "payout", updated._id, payout, updated.toObject(), req);

    res.json({ success: true, message: "Payout status updated successfully", data: updated });
  } catch (error) {
    serverError(res, "Failed to update payout status", error);
  }
};

export const getRefunds = async (req, res) => {
  try {
    const query = buildListQuery(req, res, REFUND_STATUSES, "requestedAt");
    if (!query) return;
    const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 10, maxLimit: 100 });

    const [refunds, total] = await Promise.all([
      Refund.find(query)
        .populate("booking", "bookingId")
        .populate("hotel", "name")
        .populate("guest", "fullname email")
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Refund.countDocuments(query),
    ]);

    res.json({ success: true, data: refunds, total, page, limit });
  } catch (error) {
    serverError(res, "Failed to fetch refunds", error);
  }
};

const REFUND_REASONS = Refund.schema.path("reason").enumValues;

export const createRefund = async (req, res) => {
  try {
    const { bookingId, amount, reason, reasonDetail } = req.body;

    if (!bookingId || amount === undefined || !reason) {
      return badRequest(res, "Booking ID, amount, and reason are required");
    }
    if (!isObjectId(bookingId)) return badRequest(res, "Invalid booking id");
    const amountNumber = typeof amount === "number" ? amount : typeof amount === "string" && amount.trim() ? Number(amount) : NaN;
    if (!Number.isFinite(amountNumber) || amountNumber <= 0 || Math.round(amountNumber * 100) !== Number((amountNumber * 100).toFixed(6))) {
      return badRequest(res, "Amount must be a positive number with at most two decimals");
    }
    if (!REFUND_REASONS.includes(reason)) return badRequest(res, "Invalid refund reason");
    if (reasonDetail !== undefined && (typeof reasonDetail !== "string" || reasonDetail.length > 1000)) {
      return badRequest(res, "Reason detail must be at most 1000 characters");
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    if (toPaisa(amountNumber) > toPaisa(booking.totalAmount)) {
      return badRequest(res, "Refund amount cannot exceed booking amount");
    }

    const existingRefund = await Refund.findOne({ booking: bookingId, status: { $nin: ["rejected"] } });
    if (existingRefund) {
      return badRequest(res, "A refund request already exists for this booking");
    }

    const refund = new Refund({
      booking: bookingId,
      hotel: booking.hotel,
      guest: booking.user || booking.guest,
      amount: fromPaisa(toPaisa(amountNumber)),
      currency: booking.currency || "NRS",
      reason,
      reasonDetail,
      status: "requested",
    });

    await refund.save();

    await logAudit(req.user._id, "create_refund", "refund", refund._id, null, refund.toObject(), req);

    res.json({ success: true, message: "Refund request created successfully", data: refund });
  } catch (error) {
    serverError(res, "Failed to create refund", error);
  }
};

const REFUND_TRANSITIONS = {
  requested: ["under_review", "approved", "rejected"],
  under_review: ["approved", "rejected"],
  approved: ["processed", "rejected"],
  processed: ["chargeback"],
  rejected: [],
  chargeback: [],
};

export const updateRefundStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, khaltiRefRef } = req.body;

    if (!isObjectId(id)) return badRequest(res, "Invalid refund id");
    if (typeof status !== "string" || !REFUND_STATUSES.includes(status)) return badRequest(res, "Invalid refund status");
    if (rejectionReason !== undefined && (typeof rejectionReason !== "string" || rejectionReason.length > 1000)) {
      return badRequest(res, "Rejection reason must be at most 1000 characters");
    }
    if (khaltiRefRef !== undefined && (typeof khaltiRefRef !== "string" || khaltiRefRef.length > 100)) {
      return badRequest(res, "Gateway reference must be at most 100 characters");
    }

    const refund = await Refund.findById(id).lean();
    if (!refund) return res.status(404).json({ success: false, message: "Refund not found" });

    if (!REFUND_TRANSITIONS[refund.status]?.includes(status)) {
      return badRequest(res, `Cannot move a refund from ${refund.status} to ${status}`);
    }

    const set = { status, processedBy: req.user._id, processedAt: new Date() };
    if (rejectionReason) set.rejectionReason = rejectionReason;
    if (khaltiRefRef) set.khaltiRefRef = khaltiRefRef;

    const updated = await Refund.findOneAndUpdate({ _id: id, status: refund.status }, { $set: set }, { new: true, runValidators: true });
    if (!updated) {
      return res.status(409).json({ success: false, message: "This refund was updated by someone else. Refresh and try again." });
    }

    await logAudit(req.user._id, "update_refund_status", "refund", updated._id, refund, updated.toObject(), req);

    res.json({ success: true, message: "Refund status updated successfully", data: updated });
  } catch (error) {
    serverError(res, "Failed to update refund status", error);
  }
};

export const getCommissionRules = async (req, res) => {
  try {
    const rules = await Commission.find({ isActive: true }).populate("hotel", "name").sort({ priority: -1 }).lean();
    res.json({ success: true, data: rules });
  } catch (error) {
    serverError(res, "Failed to fetch commission rules", error);
  }
};

const COMMISSION_SCOPES = Commission.schema.path("scope").enumValues;

// Validates the editable commission-rule fields; returns an error message or null.
const validateCommissionFields = (body, { partial }) => {
  const { scope, hotel, roomType, rate, flatFee, validFrom, validUntil, promoCode, priority } = body;
  if (!partial || scope !== undefined) {
    if (!COMMISSION_SCOPES.includes(scope)) return "Invalid scope";
  }
  if (!partial || rate !== undefined) {
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate > 100) return "Rate must be a number between 0 and 100";
  }
  if (hotel !== undefined && hotel !== null && hotel !== "" && !isObjectId(hotel)) return "Invalid hotel id";
  if (flatFee !== undefined && (typeof flatFee !== "number" || !Number.isFinite(flatFee) || flatFee < 0)) return "Flat fee must be a non-negative number";
  if (priority !== undefined && (!Number.isInteger(priority) || Math.abs(priority) > 1000)) return "Priority must be an integer";
  for (const [key, value] of Object.entries({ roomType, promoCode })) {
    if (value !== undefined && value !== null && (typeof value !== "string" || value.length > 50)) return `${key} must be at most 50 characters`;
  }
  for (const [key, value] of Object.entries({ validFrom, validUntil })) {
    if (parseDate(value) === undefined) return `Invalid ${key}`;
  }
  return null;
};

export const createCommissionRule = async (req, res) => {
  try {
    const { scope, hotel, roomType, rate, flatFee, validFrom, validUntil, promoCode, priority } = req.body;

    if (!scope || rate === undefined) return badRequest(res, "Scope and rate are required");
    const invalid = validateCommissionFields(req.body, { partial: false });
    if (invalid) return badRequest(res, invalid);

    const conflictQuery = { isActive: true, scope };
    if (hotel) conflictQuery.hotel = hotel;
    if (roomType) conflictQuery.roomType = roomType;

    const conflicting = await Commission.findOne(conflictQuery);
    if (conflicting) return badRequest(res, "A conflicting commission rule already exists");

    const rule = new Commission({
      scope,
      hotel: hotel || null,
      roomType: roomType || null,
      rate,
      flatFee: flatFee || 0,
      validFrom: parseDate(validFrom),
      validUntil: parseDate(validUntil),
      promoCode: promoCode || null,
      priority: priority || 0,
      createdBy: req.user._id,
    });

    await rule.save();

    await logAudit(req.user._id, "create_commission_rule", "commission", rule._id, null, rule.toObject(), req);

    res.json({ success: true, message: "Commission rule created successfully", data: rule });
  } catch (error) {
    serverError(res, "Failed to create commission rule", error);
  }
};

const COMMISSION_EDITABLE = ["scope", "hotel", "roomType", "rate", "flatFee", "validFrom", "validUntil", "promoCode", "priority"];

export const updateCommissionRule = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return badRequest(res, "Invalid commission rule id");
    const invalid = validateCommissionFields(req.body, { partial: true });
    if (invalid) return badRequest(res, invalid);

    const rule = await Commission.findById(id);
    if (!rule) return res.status(404).json({ success: false, message: "Commission rule not found" });

    const before = rule.toObject();

    // Only rule fields are editable; createdBy, isActive, _id etc. are ignored.
    for (const key of COMMISSION_EDITABLE) {
      if (req.body[key] === undefined) continue;
      rule[key] = key === "validFrom" || key === "validUntil" ? parseDate(req.body[key]) : req.body[key] === "" ? null : req.body[key];
    }

    await rule.save();

    await logAudit(req.user._id, "update_commission_rule", "commission", rule._id, before, rule.toObject(), req);

    res.json({ success: true, message: "Commission rule updated successfully", data: rule });
  } catch (error) {
    serverError(res, "Failed to update commission rule", error);
  }
};

export const deleteCommissionRule = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return badRequest(res, "Invalid commission rule id");

    const rule = await Commission.findById(id);
    if (!rule) return res.status(404).json({ success: false, message: "Commission rule not found" });

    const before = rule.toObject();
    rule.isActive = false;
    await rule.save();

    await logAudit(req.user._id, "delete_commission_rule", "commission", rule._id, before, rule.toObject(), req);

    res.json({ success: true, message: "Commission rule deleted successfully" });
  } catch (error) {
    serverError(res, "Failed to delete commission rule", error);
  }
};

export const generateInvoice = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!isObjectId(bookingId)) return badRequest(res, "Invalid booking id");

    const booking = await Booking.findById(bookingId)
      .populate("hotel", "name address")
      .populate("user", "fullname email phone")
      .populate("room", "type pricePerNight")
      .lean();

    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const nights = Math.max(1, Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)));

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
          unitPrice: fromPaisa(Math.round(toPaisa(booking.totalAmount) / nights)),
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

    res.json({ success: true, data: invoice });
  } catch (error) {
    serverError(res, "Failed to generate invoice", error);
  }
};

export const getFinancialReport = async (req, res) => {
  try {
    const { format = "json" } = req.query;
    const { startDate, endDate } = resolveFinanceDateRange(req.query);

    const [bookings, refunds, rate] = await Promise.all([
      Booking.find(paidRevenueMatch(startDate, endDate)).select("createdAt totalAmount").lean(),
      Refund.find({ requestedAt: { $gte: startDate, $lte: endDate }, status: "processed" }).select("requestedAt amount").lean(),
      getCommissionRate(),
    ]);

    const groupedData = {};
    bookings.forEach((booking) => {
      const date = new Date(booking.createdAt).toISOString().split("T")[0];
      if (!groupedData[date]) {
        groupedData[date] = { date, bookings: 0, gross: 0, refunds: 0 };
      }
      groupedData[date].bookings++;
      groupedData[date].gross += toPaisa(booking.totalAmount);
    });

    refunds.forEach((refund) => {
      const date = new Date(refund.requestedAt).toISOString().split("T")[0];
      if (groupedData[date]) groupedData[date].refunds += toPaisa(refund.amount);
    });

    const report = Object.values(groupedData)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => {
        const split = splitGross(row.gross, rate);
        return {
          date: row.date,
          bookings: row.bookings,
          revenue: fromPaisa(split.gross),
          commission: fromPaisa(split.commission),
          taxes: fromPaisa(split.taxes),
          payouts: fromPaisa(split.net),
          refunds: fromPaisa(row.refunds),
        };
      });

    if (format === "csv") {
      const csv = [
        "Date,Bookings,Revenue,Commission,Taxes,Payouts,Refunds",
        ...report.map((row) =>
          [row.date, row.bookings, row.revenue, row.commission, row.taxes, row.payouts, row.refunds].map(csvCell).join(",")
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=financial-report-${Date.now()}.csv`);
      return res.send(csv);
    }

    res.json({ success: true, data: report });
  } catch (error) {
    serverError(res, "Failed to generate financial report", error);
  }
};
