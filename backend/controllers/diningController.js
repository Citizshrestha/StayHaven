/**
 * diningController.js — staff API for restaurant tabs (dine-in + takeaway).
 * Mounted at /api/v1/staff/dining. Business rules live in
 * services/diningSessionService.js; this layer does auth scoping, input
 * shaping, audit logging and response formatting.
 */

import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../middleware/errorHandler.js";
import { Hotel } from "../models/hotel.schema.js";
import { DiningSession } from "../models/diningSession.schema.js";
import { logAudit } from "../middleware/auditLogger.js";
import {
  applyDiscount,
  closeIfSettled,
  closeSession,
  dailyReport,
  getSessionWithOrders,
  listSessions,
  markBillPrinted,
  recordPayment,
  refundPayment,
  removeDiscount,
  transferSession,
  voidSession,
} from "../services/diningSessionService.js";

const OPERATIONAL_ROLES = ["waiter", "receptionist", "chief", "kitchen"];
const MAX_REPORT_DAYS = 31;

const roleOf = (req) => req.user?.role?.name || req.user?.companyRole;
const idOf = (value) => (value?._id || value)?.toString();

/**
 * Hotel-level access for tabs. Operational staff must be assigned to the
 * hotel; managers need assignment or the same company; owners need ownership
 * or the same company. Platform admins never see hotel money.
 */
export const assertDiningAccess = async (req, hotelId) => {
  if (!hotelId || !mongoose.isValidObjectId(hotelId)) throw new AppError("A valid hotelId is required", 400);
  const role = roleOf(req);
  if (role === "admin" || role === "superadmin") {
    throw new AppError("Platform admins cannot access hotel billing", 403);
  }

  const hotel = await Hotel.findById(hotelId).select("name company owner location contact restaurantBilling");
  if (!hotel) throw new AppError("Hotel not found", 404);

  const assigned = (req.user?.assignedProperties || []).some((p) => idOf(p) === idOf(hotel._id));
  const userCompany = idOf(req.user?.company);
  const sameCompany = Boolean(userCompany) && idOf(hotel.company) === userCompany;
  const isOwner = idOf(hotel.owner) === idOf(req.user?._id);

  const allowed = OPERATIONAL_ROLES.includes(role)
    ? assigned
    : role === "owner"
      ? isOwner || sameCompany
      : assigned || sameCompany;

  if (!allowed) throw new AppError("Not authorized for this hotel", 403);
  return hotel;
};

const loadScopedSession = async (req) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new AppError("Tab not found", 404);
  const found = await DiningSession.findById(id).select("hotel").lean();
  if (!found) throw new AppError("Tab not found", 404);
  const hotel = await assertDiningAccess(req, found.hotel);
  return { hotel, sessionId: found._id };
};

const respondWithDetail = async (res, sessionId, hotelId, extra = {}, status = 200) => {
  const detail = await getSessionWithOrders(sessionId, hotelId);
  return res.status(status).json({ success: true, data: { ...detail, ...extra } });
};

const parseDate = (value, fallback) => {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new AppError("Invalid date", 400);
  return d;
};

const todayBounds = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// GET /sessions?hotelId=&status=open|closed|void|all&type=&from=&to=
export const getSessions = asyncHandler(async (req, res) => {
  const { hotelId, status = "open", type, from, to, limit } = req.query;
  await assertDiningAccess(req, hotelId);
  if (!["open", "closed", "void", "all"].includes(status)) throw new AppError("Invalid status filter", 400);

  let range = {};
  if (status !== "open") {
    const { start, end } = todayBounds();
    range = { from: parseDate(from, start), to: parseDate(to, end) };
  }
  const sessions = await listSessions({ hotelId, status, type, limit, ...range });
  res.json({ success: true, count: sessions.length, data: sessions });
});

// GET /sessions/:id
export const getSession = asyncHandler(async (req, res) => {
  const { hotel, sessionId } = await loadScopedSession(req);
  return respondWithDetail(res, sessionId, hotel._id);
});

// POST /sessions/:id/payments { method, amount?, tendered?, reference?, idempotencyKey }
export const postPayment = asyncHandler(async (req, res) => {
  const { hotel, sessionId } = await loadScopedSession(req);
  const { method, amount, tendered, reference, idempotencyKey } = req.body || {};

  const { session, payment, duplicate } = await recordPayment({
    sessionId, hotel, method, amount, tendered, reference, idempotencyKey, user: req.user,
  });

  if (!duplicate) {
    logAudit(req.user?._id, "dining_payment_recorded", "diningSession", sessionId, null, {
      method: payment.method, amount: payment.amount, tendered: payment.tendered, change: payment.change,
      reference: payment.reference, transaction: payment.transaction,
    }, req);
  }

  const after = await closeIfSettled({ session, hotel, user: req.user });
  if (after?.status === "closed" && session.status === "open") {
    logAudit(req.user?._id, "dining_tab_closed", "diningSession", sessionId, null, {
      receiptNumber: after.receiptNumber, total: after.totals?.total, auto: true,
    }, req);
  }

  return respondWithDetail(res, sessionId, hotel._id, { payment, duplicate }, duplicate ? 200 : 201);
});

// POST /sessions/:id/refunds { paymentId, amount?, reason, reference?, idempotencyKey }   (manager/owner)
export const postRefund = asyncHandler(async (req, res) => {
  const { hotel, sessionId } = await loadScopedSession(req);
  const { paymentId, amount, reason, reference, idempotencyKey } = req.body || {};
  const { refund, duplicate } = await refundPayment({
    sessionId, hotel, paymentId, amount, reason, reference, idempotencyKey, user: req.user,
  });
  if (!duplicate) {
    logAudit(req.user?._id, "dining_payment_refunded", "diningSession", sessionId, null, {
      payment: refund.payment, method: refund.method, amount: refund.amount, reason: refund.reason,
      reference: refund.reference, afterClose: refund.afterClose, transaction: refund.transaction,
    }, req);
  }
  return respondWithDetail(res, sessionId, hotel._id, { refund, duplicate }, duplicate ? 200 : 201);
});

// POST /sessions/:id/close
export const postClose = asyncHandler(async (req, res) => {
  const { hotel, sessionId } = await loadScopedSession(req);
  const before = await DiningSession.findById(sessionId).select("status").lean();
  const session = await closeSession({ sessionId, hotel, user: req.user });
  if (before?.status === "open") {
    logAudit(req.user?._id, "dining_tab_closed", "diningSession", sessionId, null, {
      receiptNumber: session.receiptNumber, total: session.totals?.total,
    }, req);
  }
  return respondWithDetail(res, sessionId, hotel._id);
});

// POST /sessions/:id/discount { kind, value, reason }   (manager/owner)
export const postDiscount = asyncHandler(async (req, res) => {
  const { hotel, sessionId } = await loadScopedSession(req);
  const { kind, value, reason } = req.body || {};
  const session = await applyDiscount({ sessionId, hotel, kind, value, reason, user: req.user });
  logAudit(req.user?._id, "dining_discount_applied", "diningSession", sessionId, null, {
    kind, value: session.discount?.value, amount: session.totals?.discount, reason: session.discount?.reason,
  }, req);
  return respondWithDetail(res, sessionId, hotel._id);
});

// DELETE /sessions/:id/discount   (manager/owner)
export const deleteDiscount = asyncHandler(async (req, res) => {
  const { hotel, sessionId } = await loadScopedSession(req);
  await removeDiscount({ sessionId, hotel });
  logAudit(req.user?._id, "dining_discount_removed", "diningSession", sessionId, null, null, req);
  return respondWithDetail(res, sessionId, hotel._id);
});

// POST /sessions/:id/transfer { tableId }
export const postTransfer = asyncHandler(async (req, res) => {
  const { hotel, sessionId } = await loadScopedSession(req);
  const before = await DiningSession.findById(sessionId).select("tableNumber").lean();
  const session = await transferSession({ sessionId, hotel, toTableId: req.body?.tableId });
  logAudit(req.user?._id, "dining_tab_transferred", "diningSession", sessionId,
    { tableNumber: before?.tableNumber }, { tableNumber: session.tableNumber }, req);
  return respondWithDetail(res, sessionId, hotel._id);
});

// POST /sessions/:id/void { reason }   (manager/owner)
export const postVoid = asyncHandler(async (req, res) => {
  const { hotel, sessionId } = await loadScopedSession(req);
  const session = await voidSession({ sessionId, hotel, reason: req.body?.reason, user: req.user });
  logAudit(req.user?._id, "dining_tab_voided", "diningSession", sessionId, null, { reason: session.voidReason }, req);
  return respondWithDetail(res, sessionId, hotel._id);
});

// POST /sessions/:id/print — records that the bill was presented; returns the
// bill plus the hotel header needed to print it.
export const postPrint = asyncHandler(async (req, res) => {
  const { hotel, sessionId } = await loadScopedSession(req);
  await markBillPrinted({ sessionId, hotel });
  return respondWithDetail(res, sessionId, hotel._id, {
    hotel: {
      name: hotel.name,
      address: [hotel.location?.address, hotel.location?.city].filter(Boolean).join(", "),
      phone: hotel.contact?.phone || "",
    },
  });
});

// GET /report?hotelId=&from=&to=
export const getReport = asyncHandler(async (req, res) => {
  const { hotelId } = req.query;
  await assertDiningAccess(req, hotelId);
  const { start, end } = todayBounds();
  const from = parseDate(req.query.from, start);
  const to = parseDate(req.query.to, end);
  if (to < from) throw new AppError("'to' must be after 'from'", 400);
  if ((to - from) / 86400000 > MAX_REPORT_DAYS) throw new AppError(`Reports cover at most ${MAX_REPORT_DAYS} days`, 400);
  res.json({ success: true, data: await dailyReport({ hotelId, from, to }) });
});

// GET /settings?hotelId=
export const getSettings = asyncHandler(async (req, res) => {
  const hotel = await assertDiningAccess(req, req.query.hotelId);
  res.json({
    success: true,
    data: {
      taxRate: hotel.restaurantBilling?.taxRate ?? 13,
      serviceChargeRate: hotel.restaurantBilling?.serviceChargeRate ?? 0,
      taxOnServiceCharge: hotel.restaurantBilling?.taxOnServiceCharge !== false,
    },
  });
});

// PUT /settings { hotelId, taxRate, serviceChargeRate, taxOnServiceCharge }   (manager/owner)
export const putSettings = asyncHandler(async (req, res) => {
  const { hotelId, taxRate, serviceChargeRate, taxOnServiceCharge } = req.body || {};
  const hotel = await assertDiningAccess(req, hotelId);

  const tax = Number(taxRate);
  const service = Number(serviceChargeRate);
  if (!Number.isFinite(tax) || tax < 0 || tax > 50) throw new AppError("VAT rate must be between 0 and 50%", 400);
  if (!Number.isFinite(service) || service < 0 || service > 30) {
    throw new AppError("Service charge must be between 0 and 30%", 400);
  }
  if (typeof taxOnServiceCharge !== "boolean") throw new AppError("taxOnServiceCharge must be true or false", 400);

  const next = {
    taxRate: Math.round(tax * 100) / 100,
    serviceChargeRate: Math.round(service * 100) / 100,
    taxOnServiceCharge,
  };
  const before = hotel.restaurantBilling?.toObject?.() || hotel.restaurantBilling || null;
  await Hotel.updateOne({ _id: hotel._id }, { $set: { restaurantBilling: next } });
  logAudit(req.user?._id, "dining_settings_updated", "hotel", hotel._id, before, next, req);

  // Open tabs keep the rates they were opened with; new tabs use these.
  res.json({ success: true, data: next, message: "Billing settings saved. They apply to tabs opened from now on." });
});
