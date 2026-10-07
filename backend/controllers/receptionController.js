import mongoose from "mongoose";
import { Booking } from "../models/booking.schema.js";
import { Room } from "../models/room.schema.js";
import { Guest } from "../models/guest.schema.js";
import { Invoice } from "../models/invoice.schema.js";
import { HousekeepingTask } from "../models/housekeepingTask.schema.js";
import { GuestRequest } from "../models/guestRequest.schema.js";
import { ActivityLog } from "../models/activityLog.schema.js";
import { User } from "../models/user.schema.js";
import { Order } from "../models/order.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { OperationQueue } from "../models/operationQueue.schema.js";
import { ShiftHandover } from "../models/shiftHandover.schema.js";
import { emitToHotel, emitToUser } from "../config/socket.js";
import { notifyRequestDevice } from "./roomRequestController.js";
import { createNotificationInternal } from "./notificationController.js";
import { sendEmail } from "../config/nodemailer.js";
import { paginateQuery, parsePaginationParams, MAX_PAGE_SIZE } from "../utils/pagination.js";
import {
  getReceptionScope, scopeFilter, inScope, searchRegex, escapeHtml, clampInt,
  dayRange, monthStart, localWeekday,
} from "./receptionScope.js";

// Helper: the caller's property scope (see receptionScope.js). `hotel` is the
// single active hotel when one is selected, otherwise null; `filter` always
// restricts queries to the hotels this user may see.
const getCtx = (req) => {
  const scope = getReceptionScope(req);
  return {
    hotel: scope.hotel,
    company: scope.company,
    filter: scopeFilter(req),
    timezone: scope.timezone,
    userId: scope.userId,
    userName: scope.userName,
  };
};

// Helper: start/end of today in the hotel's timezone
const todayRange = (req) => dayRange(getReceptionScope(req).timezone);

const notFound = (res, what = "Resource") => res.status(404).json({ success: false, message: `${what} not found` });
const isId = (id) => mongoose.isValidObjectId(id);

// Find a document by id only when it belongs to one of the caller's hotels.
const findScoped = (Model, req, id) => (isId(id) ? Model.findOne({ _id: id, ...scopeFilter(req) }) : Promise.resolve(null));

const ROOM_STATUSES = ["available", "occupied", "maintenance", "cleaning", "reserved"];
const HOUSEKEEPING_STATUSES = ["needs-cleaning", "in-progress", "clean", "inspected", "maintenance"];
const HOUSEKEEPING_PRIORITIES = ["normal", "medium", "high"];
const CHECKIN_FROM = ["Confirmed", "Pending"];

// Helper: log activity
const logActivity = async (data) => {
  try {
    const log = await ActivityLog.create(data);
    if (data.hotel) {
      emitToHotel(data.hotel.toString(), "activity-log", log);
    }
    return log;
  } catch {
    /* silently ignore activity log failures */
  }
};

const GUEST_COMMUNICATION_TEMPLATES = {
  checkin_welcome: {
    key: "checkin_welcome",
    label: "Check-in Welcome",
    subject: "Welcome to {{hotelName}}, {{guestName}}!",
    body: `Hi {{guestName}},\n\nWelcome to {{hotelName}}! Your check-in is confirmed.\n\nBooking: {{bookingId}}\nRoom: {{roomNumber}} ({{roomType}})\nCheck-in: {{checkInDate}}\nCheck-out: {{checkOutDate}}\n\nIf you need anything, reply to this email or contact front desk.\n\nWarm regards,\n{{hotelName}} Front Desk`,
  },
  checkout_thankyou: {
    key: "checkout_thankyou",
    label: "Check-out Thank You",
    subject: "Thank you for staying with us, {{guestName}}",
    body: `Hi {{guestName}},\n\nThank you for choosing {{hotelName}}. We hope you had a comfortable stay.\n\nBooking: {{bookingId}}\nRoom: {{roomNumber}}\nStay: {{checkInDate}} to {{checkOutDate}}\n\nWe would love to welcome you again soon.\n\nBest regards,\n{{hotelName}} Team`,
  },
  payment_reminder: {
    key: "payment_reminder",
    label: "Pending Payment Reminder",
    subject: "Payment reminder for booking {{bookingId}}",
    body: `Hi {{guestName}},\n\nThis is a gentle reminder for pending payment on your booking.\n\nBooking: {{bookingId}}\nRoom: {{roomNumber}}\nTotal Amount: Rs. {{totalAmount}}\nStatus: {{paymentStatus}}\n\nPlease contact front desk for assistance.\n\nThank you,\n{{hotelName}} Billing Desk`,
  },
};

const renderTemplate = (text, variables) => {
  return String(text).replace(/{{\s*([\w]+)\s*}}/g, (_, token) => {
    const val = variables[token];
    return val === undefined || val === null ? "" : String(val);
  });
};

/* ═══════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════ */

export const getDashboardSummary = async (req, res) => {
  try {
    // scopeFilter() already holds ObjectIds, so it works inside $match.
    const { filter, timezone } = getCtx(req);
    const { start, end } = todayRange(req);
    const { start: yesterday, end: yesterdayEnd } = dayRange(timezone, -1);

    // ── 1. Single Booking aggregation with $facet (replaces 13 individual queries) ──
    const [bookingStats] = await Booking.aggregate([
      { $match: filter },
      {
        $facet: {
          todayCheckIns: [
            { $match: { status: "Checked-In", updatedAt: { $gte: start, $lte: end } } },
            { $count: "n" },
          ],
          todayCheckOuts: [
            { $match: { status: "Checked-Out", updatedAt: { $gte: start, $lte: end } } },
            { $count: "n" },
          ],
          todayRevenue: [
            { $match: { status: { $in: ["Checked-In", "Checked-Out"] }, updatedAt: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } },
          ],
          pendingPayments: [
            { $match: { paymentStatus: { $in: ["unpaid", "partial"] }, status: { $nin: ["Cancelled"] } } },
            { $count: "n" },
          ],
          yesterdayCheckIns: [
            { $match: { status: "Checked-In", updatedAt: { $gte: yesterday, $lte: yesterdayEnd } } },
            { $count: "n" },
          ],
          yesterdayCheckOuts: [
            { $match: { status: "Checked-Out", updatedAt: { $gte: yesterday, $lte: yesterdayEnd } } },
            { $count: "n" },
          ],
          yesterdayRevenue: [
            { $match: { status: { $in: ["Checked-In", "Checked-Out"] }, updatedAt: { $gte: yesterday, $lte: yesterdayEnd } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } },
          ],
          totalArrivals: [
            { $match: { checkIn: { $gte: start, $lte: end }, status: { $in: ["Confirmed", "Pending"] } } },
            { $count: "n" },
          ],
          totalDepartures: [
            { $match: { checkOut: { $gte: start, $lte: end }, status: "Checked-In" } },
            { $count: "n" },
          ],
        },
      },
    ]);

    // ── 2. Single Room aggregation (replaces 3 countDocuments calls) ──
    const roomAgg = await Room.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);
    const roomMap = {};
    let totalRooms = 0;
    roomAgg.forEach((r) => { roomMap[r._id] = r.count; totalRooms += r.count; });
    const occupiedRooms = roomMap["occupied"] || 0;
    const availableRooms = roomMap["available"] || 0;

    // ── 3. Sparkline: batched 7-day aggregation using $facet (replaces 28 queries) ──
    const sparkDayBounds = [];
    for (let i = 6; i >= 0; i--) {
      const { start: dayStart, end: dayEnd } = dayRange(timezone, -i);
      sparkDayBounds.push({ dayStart, dayEnd });
    }

    // Build $facet stages dynamically for each day
    const sparkFacet = {};
    sparkDayBounds.forEach((d, idx) => {
      sparkFacet[`ci_${idx}`] = [
        { $match: { status: "Checked-In", updatedAt: { $gte: d.dayStart, $lte: d.dayEnd } } },
        { $count: "n" },
      ];
      sparkFacet[`co_${idx}`] = [
        { $match: { status: "Checked-Out", updatedAt: { $gte: d.dayStart, $lte: d.dayEnd } } },
        { $count: "n" },
      ];
      sparkFacet[`rev_${idx}`] = [
        { $match: { status: { $in: ["Checked-In", "Checked-Out"] }, updatedAt: { $gte: d.dayStart, $lte: d.dayEnd } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ];
      sparkFacet[`occ_${idx}`] = [
        { $match: { checkIn: { $lte: d.dayEnd }, checkOut: { $gte: d.dayStart }, status: { $in: ["Confirmed", "Checked-In"] } } },
        { $count: "n" },
      ];
    });

    const [sparkResult] = await Booking.aggregate([
      { $match: filter },
      { $facet: sparkFacet },
    ]);

    const sparklineData = { checkIns: [], checkOuts: [], occupancy: [], revenue: [] };
    sparkDayBounds.forEach((_, idx) => {
      sparklineData.checkIns.push(sparkResult[`ci_${idx}`]?.[0]?.n || 0);
      sparklineData.checkOuts.push(sparkResult[`co_${idx}`]?.[0]?.n || 0);
      sparklineData.revenue.push(sparkResult[`rev_${idx}`]?.[0]?.total || 0);
      const occ = sparkResult[`occ_${idx}`]?.[0]?.n || 0;
      sparklineData.occupancy.push(totalRooms > 0 ? Math.round((occ / totalRooms) * 100) : 0);
    });

    // ── Extract facet results ──
    const f = (arr) => arr?.[0]?.n || 0;
    const todayCheckIns = f(bookingStats.todayCheckIns);
    const todayCheckOuts = f(bookingStats.todayCheckOuts);
    const pendingPayments = f(bookingStats.pendingPayments);
    const yesterdayCheckIns_ = f(bookingStats.yesterdayCheckIns);
    const yesterdayCheckOuts_ = f(bookingStats.yesterdayCheckOuts);
    const totalArrivals = f(bookingStats.totalArrivals);
    const totalDepartures = f(bookingStats.totalDepartures);
    const revenue = bookingStats.todayRevenue?.[0]?.total || 0;
    const yRevenue = bookingStats.yesterdayRevenue?.[0]?.total || 0;
    const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    // Trend compares booking-based occupancy for today vs yesterday (same measure on both sides).
    const occToday = sparklineData.occupancy[6] || 0;
    const yOccupancy = sparklineData.occupancy[5] || 0;

    const calcDelta = (today, yesterday) => {
      if (yesterday === 0) return today > 0 ? "+100%" : "0%";
      const diff = ((today - yesterday) / yesterday * 100).toFixed(0);
      return diff >= 0 ? `+${diff}%` : `${diff}%`;
    };

    const formatRevenue = (v) => `Rs. ${Math.round(Number(v) || 0).toLocaleString("en-IN")}`;

    res.json({
      success: true,
      data: {
        checkIns: { value: todayCheckIns, total: todayCheckIns + totalArrivals, trend: calcDelta(todayCheckIns, yesterdayCheckIns_), up: todayCheckIns >= yesterdayCheckIns_, sparkline: sparklineData.checkIns },
        checkOuts: { value: todayCheckOuts, total: todayCheckOuts + totalDepartures, trend: calcDelta(todayCheckOuts, yesterdayCheckOuts_), up: todayCheckOuts >= yesterdayCheckOuts_, sparkline: sparklineData.checkOuts },
        occupancy: { value: occupancy, trend: calcDelta(occToday, yOccupancy), up: occToday >= yOccupancy, sparkline: sparklineData.occupancy },
        revenue: { value: formatRevenue(revenue), amount: revenue, trend: calcDelta(revenue, yRevenue), up: revenue >= yRevenue, sparkline: sparklineData.revenue },
        // No day-over-day history is tracked for these two, so no trend is reported.
        pendingPayments: { value: pendingPayments, trend: null, up: false },
        availableRooms: { value: availableRooms, trend: null, up: false },
        totalRooms,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getLiveRoomStatus = async (req, res) => {
  try {
    const { filter } = getCtx(req);

    const [statusCounts, totalRooms] = await Promise.all([
      Room.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Room.countDocuments(filter),
    ]);

    const statusMap = {};
    statusCounts.forEach((s) => {
      statusMap[s._id] = s.count;
    });

    res.json({
      success: true,
      data: {
        available: statusMap.available || 0,
        occupied: statusMap.occupied || 0,
        cleaning: statusMap.cleaning || 0,
        maintenance: statusMap.maintenance || 0,
        reserved: statusMap.reserved || 0,
        total: totalRooms,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getWeeklyOccupancy = async (req, res) => {
  try {
    const { filter, timezone } = getCtx(req);
    const totalRooms = await Room.countDocuments(filter) || 1;

    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const fullNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    for (let i = 6; i >= 0; i--) {
      const { start: d, end: dEnd } = dayRange(timezone, -i);
      const weekday = localWeekday(d, timezone);

      const occupied = await Booking.countDocuments({
        ...filter,
        checkIn: { $lte: dEnd },
        checkOut: { $gte: d },
        status: { $in: ["Confirmed", "Checked-In"] },
      });

      days.push({
        day: dayNames[weekday],
        name: fullNames[weekday],
        value: Math.round((occupied / totalRooms) * 100),
      });
    }

    const avg = Math.round(days.reduce((a, d) => a + d.value, 0) / days.length);
    res.json({ success: true, data: { days, avg } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRevenueSplit = async (req, res) => {
  try {
    const { filter, timezone } = getCtx(req);
    const thisMonth = monthStart(timezone);

    // Room revenue from bookings
    const roomRevenue = await Booking.aggregate([
      { $match: { ...filter, createdAt: { $gte: thisMonth }, status: { $nin: ["Cancelled"] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const roomTotal = roomRevenue[0]?.total || 0;

    // Food & beverage revenue from orders (dineIn + roomService).
    // Orders carry `hotel` only, which is exactly what the scope filters on.
    const orderFilter = scopeFilter(req);
    const foodRevenue = await Order.aggregate([
      {
        $match: {
          ...orderFilter,
          createdAt: { $gte: thisMonth },
          status: { $nin: ["cancelled"] },
          orderType: { $in: ["dineIn", "roomService"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);
    const foodTotal = foodRevenue[0]?.total || 0;

    // Services revenue from takeaway orders (or other service-type orders)
    const servicesRevenue = await Order.aggregate([
      {
        $match: {
          ...orderFilter,
          createdAt: { $gte: thisMonth },
          status: { $nin: ["cancelled"] },
          orderType: "takeaway",
        },
      },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);
    const servicesTotal = servicesRevenue[0]?.total || 0;

    res.json({
      success: true,
      data: {
        rooms: roomTotal,
        food: foodTotal,
        services: servicesTotal,
        total: roomTotal + foodTotal + servicesTotal,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTodayArrivals = async (req, res) => {
  try {
    const { filter, timezone } = getCtx(req);
    const { start, end } = todayRange(req);

    const arrivals = await Booking.find({
      ...filter,
      checkIn: { $gte: start, $lte: end },
    })
      .populate("room", "roomNumber roomName type price floor")
      .populate("guest", "fullName email phone guestId avatarUrl membershipTier vipStatus")
      .sort({ checkIn: 1 })
      .lean();

    const formatted = arrivals.map((b) => ({
      _id: b._id,
      bookingId: b.bookingId || b.confirmationCode || b._id.toString().slice(-8),
      guest: {
        name: b.guest?.fullName || b.guestInfo?.name || "Unknown",
        email: b.guest?.email || b.guestInfo?.email || "",
        phone: b.guest?.phone || b.guestInfo?.phone || "",
        initials: (b.guest?.fullName || b.guestInfo?.name || "U").split(" ").map((n) => n[0]).join(""),
        vip: b.isVip || b.guest?.vipStatus || false,
        avatarUrl: b.guest?.avatarUrl,
      },
      room: {
        type: b.room?.type || b.room?.roomName || "",
        number: b.room?.roomNumber || "",
      },
      expectedTime: b.expectedArrivalTime || new Date(b.checkIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }),
      nights: b.durationNights || Math.ceil((b.checkOut - b.checkIn) / (1000 * 60 * 60 * 24)),
      status: b.status === "Checked-In" ? "checked-in" : b.status === "Confirmed" ? "expected" : "arrived",
      source: b.bookingSource || "web",
      paymentStatus: b.paymentStatus,
      specialRequests: b.earlyCheckinRequested ? "Early check-in requested" : b.specialRequests || null,
    }));

    const stats = {
      total: formatted.length,
      expected: formatted.filter((a) => a.status === "expected").length,
      arrived: formatted.filter((a) => a.status === "arrived").length,
      checkedIn: formatted.filter((a) => a.status === "checked-in").length,
    };

    res.json({ success: true, data: formatted, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTodayDepartures = async (req, res) => {
  try {
    const { filter, timezone } = getCtx(req);
    const { start, end } = todayRange(req);

    const departures = await Booking.find({
      ...filter,
      checkOut: { $gte: start, $lte: end },
      status: { $in: ["Checked-In", "Checked-Out"] },
    })
      .populate("room", "roomNumber roomName type price floor")
      .populate("guest", "fullName email phone guestId avatarUrl membershipTier vipStatus")
      .sort({ checkOut: 1 })
      .lean();

    const formatted = departures.map((b) => ({
      _id: b._id,
      bookingId: b.bookingId || b.confirmationCode || b._id.toString().slice(-8),
      guest: {
        name: b.guest?.fullName || b.guestInfo?.name || "Unknown",
        email: b.guest?.email || b.guestInfo?.email || "",
        phone: b.guest?.phone || b.guestInfo?.phone || "",
        initials: (b.guest?.fullName || b.guestInfo?.name || "U").split(" ").map((n) => n[0]).join(""),
        vip: b.isVip || b.guest?.vipStatus || false,
        avatarUrl: b.guest?.avatarUrl,
      },
      room: {
        type: b.room?.type || b.room?.roomName || "",
        number: b.room?.roomNumber || "",
      },
      checkOutTime: new Date(b.checkOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }),
      stayDuration: b.durationNights || Math.ceil((b.checkOut - b.checkIn) / (1000 * 60 * 60 * 24)),
      status: b.status === "Checked-Out" ? "checked-out" : "in-room",
      balance: b.paymentStatus === "paid" ? 0 : Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0)),
      source: b.bookingSource || "web",
      paymentStatus: b.paymentStatus,
    }));

    const stats = {
      total: formatted.length,
      inRoom: formatted.filter((d) => d.status === "in-room").length,
      checkingOut: 0,
      checkedOut: formatted.filter((d) => d.status === "checked-out").length,
    };

    res.json({ success: true, data: formatted, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   CHECK-IN / CHECK-OUT ACTIONS
   ═══════════════════════════════════════ */

/**
 * Route guard that runs BEFORE preventDoubleCheckIn (which flips the room to
 * "occupied" as a side effect): ownership, status transition, arrival window
 * and room readiness are all rejected here without touching any data.
 */
export const validateCheckIn = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await findScoped(Booking, req, bookingId);
    if (!booking) return notFound(res, "Booking");
    if (booking.status === "Checked-In") {
      return res.status(409).json({ success: false, message: "Guest is already checked in." });
    }
    if (!CHECKIN_FROM.includes(booking.status)) {
      return res.status(409).json({ success: false, message: `A ${booking.status.toLowerCase()} booking cannot be checked in.` });
    }
    const { timezone } = getCtx(req);
    const { end: todayEnd } = dayRange(timezone);
    if (booking.checkIn > todayEnd) {
      const day = booking.checkIn.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: timezone });
      return res.status(409).json({ success: false, message: `This booking arrives on ${day}. Check-in opens on the arrival day.` });
    }
    if (booking.checkOut <= new Date()) {
      return res.status(409).json({ success: false, message: "This stay has already ended. Update the dates before checking in." });
    }
    if (booking.room) {
      const room = await Room.findById(booking.room).select("roomNumber status").lean();
      if (room && ["cleaning", "maintenance"].includes(room.status)) {
        return res.status(409).json({ success: false, message: `Room ${room.roomNumber} is not ready (${room.status}). Mark it clean or change the room first.` });
      }
    }
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const performCheckIn = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { bookingId } = req.params;
    const { userId, userName } = getCtx(req);
    const expectedVersion = req.body?.__v; // optimistic locking

    await session.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).populate("room").populate("guest").session(session);
      // Property-scope validation: booking must belong to one of the caller's hotels
      if (!booking || !inScope(req, booking.hotel)) throw Object.assign(new Error("Booking not found"), { status: 404 });

      // Optimistic locking: reject if version mismatch
      if (expectedVersion !== undefined && booking.__v !== expectedVersion) {
        throw Object.assign(new Error("Booking was modified by another user. Please refresh and try again."), { status: 409 });
      }

      // Prevent duplicate check-in
      if (booking.status === "Checked-In") {
        throw Object.assign(new Error("Guest is already checked in."), { status: 409 });
      }
      if (!CHECKIN_FROM.includes(booking.status)) {
        throw Object.assign(new Error(`A ${booking.status.toLowerCase()} booking cannot be checked in.`), { status: 409 });
      }

      booking.status = "Checked-In";
      await booking.save({ session });

      if (booking.room) {
        await Room.findByIdAndUpdate(booking.room._id, { status: "occupied" }, { session });
      }

      if (booking.guest) {
        await Guest.findByIdAndUpdate(booking.guest._id || booking.guest, {
          status: "In-House",
          currentBooking: booking._id,
          currentRoom: booking.room?.roomNumber,
        }, { session });
      }
    });

    // Post-commit: logging & events (non-critical, outside transaction)
    const booking = await Booking.findById(bookingId).populate("room").populate("guest");

    await logActivity({
      hotel: booking.hotel, company: booking.company,
      entityType: "booking", entityId: booking.bookingId || booking._id,
      action: "check-in",
      description: `<strong>${booking.guest?.fullName || booking.guestInfo?.name || "Guest"}</strong> checked in to Room ${booking.room?.roomNumber || ""}`,
      icon: "CalendarCheck", color: "#10b981", actor: userId, actorName: userName,
    });

    emitToHotel(booking.hotel.toString(), "booking-update", { type: "check-in", booking });
    emitToHotel(booking.hotel.toString(), "room-update", { roomId: booking.room?._id, status: "occupied" });

    res.json({ success: true, message: "Check-in successful", data: booking });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

export const performCheckOut = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { bookingId } = req.params;
    const { userId, userName } = getCtx(req);
    const expectedVersion = req.body?.__v;
    if (!isId(bookingId)) return notFound(res, "Booking");

    await session.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).populate("room").populate("guest").session(session);
      if (!booking || !inScope(req, booking.hotel)) throw Object.assign(new Error("Booking not found"), { status: 404 });

      if (expectedVersion !== undefined && booking.__v !== expectedVersion) {
        throw Object.assign(new Error("Booking was modified by another user. Please refresh and try again."), { status: 409 });
      }

      if (booking.status === "Checked-Out") {
        throw Object.assign(new Error("Guest is already checked out."), { status: 409 });
      }

      // Only an in-house stay can be checked out (not pending, cancelled or no-show).
      if (booking.status !== "Checked-In") {
        throw Object.assign(new Error(`A ${booking.status.toLowerCase()} booking cannot be checked out. Check the guest in first.`), { status: 409 });
      }

      booking.status = "Checked-Out";
      await booking.save({ session });

      if (booking.room) {
        await Room.findByIdAndUpdate(booking.room._id, { status: "cleaning" }, { session });
      }

      if (booking.guest) {
        await Guest.findByIdAndUpdate(booking.guest._id || booking.guest, {
          status: "Checked-Out",
          currentBooking: null,
          currentRoom: null,
          $inc: { totalStays: 1, totalSpent: booking.totalAmount || 0 },
        }, { session });
      }
    });

    const booking = await Booking.findById(bookingId).populate("room").populate("guest");

    await logActivity({
      hotel: booking.hotel, company: booking.company,
      entityType: "booking", entityId: booking.bookingId || booking._id,
      action: "checkout",
      description: `<strong>${booking.guest?.fullName || booking.guestInfo?.name || "Guest"}</strong> checked out from Room ${booking.room?.roomNumber || ""}`,
      icon: "LogOut", color: "#f97316", actor: userId, actorName: userName,
    });

    emitToHotel(booking.hotel.toString(), "booking-update", { type: "checkout", booking });
    emitToHotel(booking.hotel.toString(), "room-update", { roomId: booking.room?._id, status: "cleaning" });

    res.json({ success: true, message: "Check-out successful", data: booking });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/* ═══════════════════════════════════════
   GUEST COMMUNICATION TEMPLATES
   ═══════════════════════════════════════ */

export const getGuestCommunicationTemplates = async (_req, res) => {
  try {
    res.json({
      success: true,
      data: Object.values(GUEST_COMMUNICATION_TEMPLATES).map((t) => ({
        key: t.key,
        label: t.label,
        subject: t.subject,
        body: t.body,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const sendGuestCommunication = async (req, res) => {
  try {
    const { bookingId, templateKey, customSubject, customBody } = req.body;
    const { userId, userName } = getCtx(req);

    if (!bookingId || !isId(bookingId)) {
      return res.status(400).json({ success: false, message: "bookingId is required" });
    }
    if ((customSubject && typeof customSubject !== "string") || (customBody && typeof customBody !== "string")) {
      return res.status(400).json({ success: false, message: "Subject and message must be text." });
    }
    if (String(customSubject || "").length > 200 || String(customBody || "").length > 5000) {
      return res.status(400).json({ success: false, message: "Subject is limited to 200 characters and the message to 5000." });
    }

    const booking = await Booking.findById(bookingId)
      .populate("guest", "fullName email")
      .populate("room", "roomNumber type roomName")
      .populate("hotel", "name contact")
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (!inScope(req, booking.hotel?._id || booking.hotel)) {
      return notFound(res, "Booking");
    }

    const template = GUEST_COMMUNICATION_TEMPLATES[templateKey] || GUEST_COMMUNICATION_TEMPLATES.checkin_welcome;
    const guestName = booking.guest?.fullName || booking.guestInfo?.name || "Guest";
    const guestEmail = booking.guest?.email || booking.guestInfo?.email || "";

    if (!guestEmail) {
      return res.status(400).json({ success: false, message: "Guest email is missing for this booking." });
    }

    const vars = {
      guestName,
      bookingId: booking.bookingId || booking.confirmationCode || booking._id.toString().slice(-8),
      roomNumber: booking.room?.roomNumber || "N/A",
      roomType: booking.room?.type || booking.room?.roomName || "Room",
      checkInDate: booking.checkIn ? new Date(booking.checkIn).toLocaleDateString("en-US") : "",
      checkOutDate: booking.checkOut ? new Date(booking.checkOut).toLocaleDateString("en-US") : "",
      totalAmount: Number(booking.totalAmount || 0).toLocaleString("en-IN"),
      paymentStatus: booking.paymentStatus || "pending",
      hotelName: booking.hotel?.name || "StayHaven",
    };

    const subject = renderTemplate(customSubject || template.subject, vars).trim();
    const body = renderTemplate(customBody || template.body, vars).trim();

    const emailResult = await sendEmail({
      from: process.env.SENDER_EMAIL || booking.hotel?.contact?.email,
      to: guestEmail,
      subject,
      text: body,
      // Guest names and staff-typed text are escaped so they can't inject markup into the email.
      html: `<div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #0f172a; white-space: pre-wrap;">${escapeHtml(body).replace(/\n/g, "<br />")}</div>`,
    });

    if (!emailResult?.success) {
      return res.status(502).json({ success: false, message: "Failed to send guest communication email." });
    }

    await logActivity({
      hotel: booking.hotel?._id,
      company: booking.company,
      entityType: "communication",
      entityId: booking.bookingId || booking._id,
      action: "guest-communication-sent",
      description: `Guest communication <strong>${template.label}</strong> sent to ${guestName} (${guestEmail})`,
      icon: "Mail",
      color: "#6366f1",
      actor: userId,
      actorName: userName,
    });

    res.json({
      success: true,
      message: "Guest communication sent successfully.",
      data: {
        bookingId: booking._id,
        guestName,
        guestEmail,
        templateKey: template.key,
        subject,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   BOOKINGS (RESERVATIONS)
   ═══════════════════════════════════════ */

export const getReservations = async (req, res) => {
  try {
    const { filter, timezone } = getCtx(req);
    const { status, search, dateRange } = req.query;
    
    // Parse pagination params (enforces 100 max limit)
    const pagination = parsePaginationParams(req);

    if (status && status !== "all") {
      const statusMap = {
        "Confirmed": "Confirmed",
        "Checked In": "Checked-In",
        "Checked Out": "Checked-Out",
        "Pending": "Pending",
        "Cancelled": "Cancelled",
        "No Show": "No-Show",
      };
      filter.status = String(statusMap[status] || status);
    }

    const rx = searchRegex(search);
    if (rx) {
      filter.$or = [
        { "guestInfo.name": rx },
        { "guestInfo.email": rx },
        { "guestInfo.phone": rx },
        { bookingId: rx },
        { confirmationCode: rx },
      ];
    }

    if (dateRange && dateRange !== "all") {
      if (dateRange === "thisMonth") {
        filter.checkIn = { $gte: monthStart(timezone) };
      } else if (dateRange === "lastMonth") {
        filter.checkIn = { $gte: monthStart(timezone, -1), $lt: monthStart(timezone) };
      }
    }

    // Use cursor-based pagination
    const result = await paginateQuery({
      model: Booking,
      filter,
      pagination,
      populate: [
        { path: "room", select: "roomNumber roomName type price floor" },
        { path: "guest", select: "fullName email phone guestId avatarUrl vipStatus" },
      ],
      lean: true,
    });

    const formatted = result.items.map((b) => ({
      _id: b._id,
      id: b.bookingId || `#BK-${b._id.toString().slice(-4)}`,
      numericId: parseInt((b.bookingId || "").replace("#BK-", "")) || 0,
      guest: {
        name: b.guest?.fullName || b.guestInfo?.name || "Unknown",
        email: b.guest?.email || b.guestInfo?.email || "",
        avatar: b.guest?.avatarUrl || null,
        initials: (b.guest?.fullName || b.guestInfo?.name || "U").split(" ").map((n) => n[0]).join(""),
      },
      room: {
        type: b.room?.type || b.room?.roomName || "",
        number: b.room?.roomNumber || "",
      },
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      status: b.status.replace("-", " "),
      nights: b.durationNights || Math.ceil((b.checkOut - b.checkIn) / (1000 * 60 * 60 * 24)),
      source: b.bookingSource || "web",
      totalAmount: b.totalAmount,
      paymentStatus: b.paymentStatus,
    }));

    res.json({
      success: true,
      data: formatted,
      pagination: result.pagination,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   ROOMS
   ═══════════════════════════════════════ */

export const getRoomsList = async (req, res) => {
  try {
    const { filter } = getCtx(req);
    const { status, floor, type, search, sort } = req.query;

    if (status && status !== "all") filter.status = String(status);
    if (floor && floor !== "all") filter.floor = clampInt(floor, 0, -10, 500);
    if (type && type !== "all") filter.type = String(type);
    const rx = searchRegex(search);
    if (rx) {
      filter.$or = [{ roomNumber: rx }, { roomName: rx }, { type: rx }];
    }
    // Only allow sorting on known fields (sort strings can otherwise reach arbitrary paths).
    const SORTS = { roomNumber: "roomNumber", floor: "floor", type: "type", status: "status", price: "price", "-price": "-price" };
    const rooms = await Room.find(filter).sort(SORTS[sort] || "roomNumber").lean();

    // Get current occupants for occupied rooms
    const occupiedRoomIds = rooms.filter((r) => r.status === "occupied").map((r) => r._id);
    const activeBookings = occupiedRoomIds.length > 0
      ? await Booking.find({
        room: { $in: occupiedRoomIds },
        status: "Checked-In",
      })
        .populate("guest", "fullName guestId avatarUrl")
        .lean()
      : [];

    const bookingMap = {};
    activeBookings.forEach((b) => {
      bookingMap[b.room.toString()] = b;
    });

    // Get reserved rooms guest info
    const reservedRoomIds = rooms.filter((r) => r.status === "reserved").map((r) => r._id);
    const reservedBookings = reservedRoomIds.length > 0
      ? await Booking.find({
        room: { $in: reservedRoomIds },
        status: "Confirmed",
      })
        .populate("guest", "fullName guestId avatarUrl")
        .lean()
      : [];

    const reservedMap = {};
    reservedBookings.forEach((b) => {
      reservedMap[b.room.toString()] = b;
    });

    const formatted = rooms.map((r) => {
      const booking = bookingMap[r._id.toString()] || reservedMap[r._id.toString()];
      return {
        _id: r._id,
        id: `RM-${r.roomNumber}`,
        number: r.roomNumber,
        floor: r.floor || parseInt(r.roomNumber?.[0]) || 1,
        type: r.type || r.roomName,
        status: r.status,
        basePrice: r.price,
        maxGuests: r.maxGuests || r.capacity?.adults || 2,
        beds: r.bedType || null,
        amenities: r.amenities || [],
        rating: r.rating ?? null,
        lastCleaned: r.lastCleaned || r.updatedAt,
        guest: booking
          ? {
            name: booking.guest?.fullName || booking.guestInfo?.name || "",
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
          }
          : null,
      };
    });

    // Status counts
    const statusCounts = {};
    rooms.forEach((r) => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    res.json({
      success: true,
      data: formatted,
      stats: {
        total: rooms.length,
        available: statusCounts.available || 0,
        occupied: statusCounts.occupied || 0,
        cleaning: statusCounts.cleaning || 0,
        maintenance: statusCounts.maintenance || 0,
        reserved: statusCounts.reserved || 0,
        occupancyRate: rooms.length > 0 ? Math.round(((statusCounts.occupied || 0) / rooms.length) * 100) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   GUESTS
   ═══════════════════════════════════════ */

export const getGuestsList = async (req, res) => {
  try {
    const { filter, timezone } = getCtx(req);
    const { status, tier, search } = req.query;
    
    // Parse pagination params (enforces 100 max limit)
    const pagination = parsePaginationParams(req);
    if (status && status !== "all") filter.status = String(status);
    if (tier && tier !== "all") filter.membershipTier = String(tier);
    const rx = searchRegex(search);
    if (rx) {
      filter.$or = [{ fullName: rx }, { email: rx }, { phone: rx }, { guestId: rx }];
    }

    // Get stats in parallel with paginated query
    const [result, inHouseCount, vipCount, newThisMonth] = await Promise.all([
      paginateQuery({
        model: Guest,
        filter,
        pagination,
        populate: [{ path: "currentBooking", select: "checkIn checkOut" }],
        lean: true,
      }),
      Guest.countDocuments({ ...filter, status: "In-House" }),
      Guest.countDocuments({ ...filter, vipStatus: true }),
      Guest.countDocuments({ ...filter, createdAt: { $gte: monthStart(timezone) } }),
    ]);

    const formatted = result.items.map((g) => ({
      _id: g._id,
      guestId: g.guestId,
      fullName: g.fullName,
      email: g.email,
      phone: g.phone,
      country: g.country,
      avatarUrl: g.avatarUrl,
      initials: g.fullName?.split(" ").map((n) => n[0]).join("") || "",
      membershipTier: g.membershipTier,
      loyaltyPoints: g.loyaltyPoints,
      totalStays: g.totalStays,
      totalSpent: g.totalSpent,
      vipStatus: g.vipStatus,
      isActive: g.isActive !== false,
      blacklisted: g.blacklisted || false,
      blacklistReason: g.blacklistReason || "",
      status: g.status,
      currentRoom: g.currentRoom,
      currentBooking: g.currentBooking,
    }));

    res.json({
      success: true,
      data: formatted,
      stats: {
        total: result.pagination.total,
        inHouse: inHouseCount,
        vip: vipCount,
        newThisMonth,
      },
      pagination: result.pagination,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getGuestById = async (req, res) => {
  try {
    if (!isId(req.params.id)) return notFound(res, "Guest");
    const guest = await Guest.findOne({ _id: req.params.id, ...scopeFilter(req) })
      .populate("currentBooking", "checkIn checkOut bookingId")
      .lean();
    if (!guest) return res.status(404).json({ success: false, message: "Guest not found" });
    res.json({ success: true, data: guest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   HOUSEKEEPING
   ═══════════════════════════════════════ */

export const getHousekeepingTasks = async (req, res) => {
  try {
    const { filter } = getCtx(req);
    const { status, floor, priority, search } = req.query;

    if (status && status !== "all") {
      filter.status = { $in: String(status).split(",").map((s) => s.trim()) };
    }
    if (floor && floor !== "all") filter.floor = clampInt(floor, 0, -10, 500);
    if (priority && priority !== "all") filter.priority = String(priority);
    const rx = searchRegex(search);
    if (rx) {
      filter.$or = [{ roomNumber: rx }, { roomType: rx }, { assignedToName: rx }];
    }

    const tasks = await HousekeepingTask.find(filter)
      .populate("assignedTo", "fullname profilePicture")
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    const statusCounts = {};
    let highPriority = 0;
    tasks.forEach((t) => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      if (t.priority === "high") highPriority++;
    });

    res.json({
      success: true,
      data: tasks.map((t) => ({
        ...t,
        assignedTo: t.assignedTo
          ? {
            _id: t.assignedTo._id,
            name: t.assignedTo.fullname || t.assignedToName,
            avatar: t.assignedTo.profilePicture,
            initials: (t.assignedTo.fullname || "").split(" ").map((n) => n[0]).join(""),
          }
          : null,
      })),
      stats: {
        total: tasks.length,
        clean: (statusCounts.clean || 0) + (statusCounts.inspected || 0),
        needsCleaning: statusCounts["needs-cleaning"] || 0,
        inProgress: statusCounts["in-progress"] || 0,
        maintenance: statusCounts.maintenance || 0,
        highPriority,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateHousekeepingTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, priority, notes } = req.body || {};
    const { userId, userName } = getCtx(req);

    if (status !== undefined && !HOUSEKEEPING_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${HOUSEKEEPING_STATUSES.join(", ")}` });
    }
    if (priority !== undefined && !HOUSEKEEPING_PRIORITIES.includes(priority)) {
      return res.status(400).json({ success: false, message: `Priority must be one of: ${HOUSEKEEPING_PRIORITIES.join(", ")}` });
    }
    if (notes !== undefined && (typeof notes !== "string" || notes.length > 1000)) {
      return res.status(400).json({ success: false, message: "Notes must be text of at most 1000 characters." });
    }

    const existing = await findScoped(HousekeepingTask, req, id);
    if (!existing) return notFound(res, "Task");

    const update = {};
    if (status) update.status = status;
    if (assignedTo) {
      // Only staff of the same company assigned to this task's hotel can take it.
      const assignee = isId(assignedTo)
        ? await User.findOne({ _id: assignedTo, company: getCtx(req).company, assignedProperties: existing.hotel, staffRemovedAt: null }).select("fullname").lean()
        : null;
      if (!assignee) return res.status(400).json({ success: false, message: "Choose a staff member of this hotel." });
      update.assignedTo = assignee._id;
      update.assignedToName = assignee.fullname;
    }
    if (priority) update.priority = priority;
    if (notes !== undefined) update.notes = notes.trim();

    if (status === "in-progress") update.startedAt = new Date();
    if (status === "clean" || status === "inspected") update.completedAt = new Date();

    const task = await HousekeepingTask.findOneAndUpdate({ _id: existing._id }, update, { new: true, runValidators: true })
      .populate("assignedTo", "fullname profilePicture");

    if (!task) return notFound(res, "Task");

    if (status === "clean" || status === "inspected") {
      // A cleaned room becomes bookable again, unless a guest is still in it.
      await Room.updateOne({ _id: task.room, hotel: task.hotel }, { lastCleaned: new Date() });
      const inHouse = await Booking.exists({ room: task.room, status: "Checked-In" });
      if (!inHouse) {
        const freed = await Room.updateOne({ _id: task.room, hotel: task.hotel, status: "cleaning" }, { status: "available" });
        if (freed.modifiedCount) emitToHotel(task.hotel.toString(), "room-update", { roomId: task.room, status: "available" });
      }
    }

    await logActivity({
      hotel: task.hotel,
      company: task.company,
      entityType: "housekeeping",
      entityId: task.roomNumber,
      action: "status-change",
      description: `Room ${task.roomNumber} moved to <strong>${status || "updated"}</strong>`,
      icon: "Sparkles",
      color: "#f59e0b",
      actor: userId,
      actorName: userName,
    });

    emitToHotel(task.hotel.toString(), "housekeeping-update", task);

    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   GUEST REQUESTS
   ═══════════════════════════════════════ */

export const getGuestRequests = async (req, res) => {
  try {
    const { filter } = getCtx(req);
    filter.status = { $in: ["open", "assigned"] };

    const requests = await GuestRequest.find(filter)
      .populate("assignedTo", "fullname profilePicture")
      .sort({ urgency: -1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: requests,
      newCount: requests.filter((r) => r.status === "open").length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Scope for request writes: the caller's hotels. Never unscoped — an id
// alone must not let staff edit another hotel's queue.
const requestScope = (req) => scopeFilter(req);

// Tells the guest who raised the request (portal user or room-QR phone).
const REQUEST_STATUS_TEXT = {
  assigned: "A staff member is on it.",
  resolved: "Your request has been taken care of.",
  ignored: "The front desk closed this request. Contact them if you still need help.",
};

const notifyRequester = (request) => {
  if (!request) return;
  const payload = { requestId: request._id, status: request.status, resolvedAt: request.resolvedAt || null };
  const userId = request.guestInfo?.userId;
  try {
    if (userId) emitToUser(String(userId), "request-status-update", payload);
  } catch { /* best-effort */ }
  // Saved notification for the portal bell (registered guests only).
  if (userId && REQUEST_STATUS_TEXT[request.status]) {
    createNotificationInternal({
      userId,
      type: "guest_request",
      title: `${request.category || "Request"}: ${request.status === "assigned" ? "in progress" : request.status === "resolved" ? "done" : "closed"}`.slice(0, 100),
      message: REQUEST_STATUS_TEXT[request.status],
      actionUrl: "/guest-dashboard/requests",
      payload: { requestId: String(request._id), status: request.status },
    }).catch(() => {});
  }
  notifyRequestDevice(request);
};

export const assignGuestRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const { userId, userName } = getCtx(req);
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ success: false, message: "Request not found" });

    let assignee = { _id: userId, fullname: userName };
    if (assignedTo && String(assignedTo) !== String(userId)) {
      assignee = isId(assignedTo)
        ? await User.findOne({ _id: assignedTo, company: getCtx(req).company, staffRemovedAt: null }).select("fullname").lean()
        : null;
      if (!assignee) return res.status(400).json({ success: false, message: "Choose a staff member of this hotel." });
    }

    const request = await GuestRequest.findOneAndUpdate(
      { _id: id, ...requestScope(req) },
      { status: "assigned", assignedTo: assignee._id, assignedToName: assignee.fullname },
      { new: true }
    );

    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    await logActivity({
      hotel: request.hotel,
      company: request.company,
      entityType: "request",
      entityId: request.roomNumber,
      action: "assigned",
      description: `Guest request for Room ${request.roomNumber} assigned to <strong>${assignee.fullname || "staff"}</strong>`,
      icon: "Users",
      color: "#06b6d4",
      actor: userId,
      actorName: userName,
    });

    emitToHotel(request.hotel.toString(), "request-update", request);
    notifyRequester(request);

    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const ignoreGuestRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ success: false, message: "Request not found" });
    const request = await GuestRequest.findOneAndUpdate({ _id: id, ...requestScope(req) }, { status: "ignored" }, { new: true });
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    emitToHotel(request.hotel.toString(), "request-update", request);
    notifyRequester(request);
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const resolveGuestRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ success: false, message: "Request not found" });
    const request = await GuestRequest.findOneAndUpdate(
      { _id: id, ...requestScope(req) },
      { status: "resolved", resolvedAt: new Date() },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    emitToHotel(request.hotel.toString(), "request-update", request);
    notifyRequester(request);
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   BILLING / INVOICES
   ═══════════════════════════════════════ */

export const getInvoices = async (req, res) => {
  try {
    const { filter, timezone } = getCtx(req);
    const { status, search } = req.query;
    const page = clampInt(req.query.page, 1, 1, 100000);
    // BillingView loads up to 200 cards at once; anything larger is clamped.
    const limit = clampInt(req.query.limit, 30, 1, 2 * MAX_PAGE_SIZE);
    const baseFilter = { ...filter };

    if (status && status !== "all") filter.status = String(status);
    const rx = searchRegex(search);
    if (rx) {
      filter.$or = [{ invoiceId: rx }, { guestName: rx }, { bookingRef: rx }];
    }

    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      Invoice.find(filter).sort({ issuedAt: -1 }).skip(skip).limit(limit).lean(),
      Invoice.countDocuments(filter),
    ]);

    // Summary stats (only the fields the totals need)
    const allInvoices = await Invoice.find(baseFilter).select("charges.total balance status issuedAt createdAt").lean();
    const totalRevenue = allInvoices.reduce((s, i) => s + (i.charges?.total || 0), 0);
    const pendingTotal = allInvoices.filter((i) => i.status === "pending").reduce((s, i) => s + (i.balance || 0), 0);
    const overdueTotal = allInvoices.filter((i) => i.status === "overdue").reduce((s, i) => s + (i.balance || 0), 0);

    // Revenue trend: current month vs previous month
    const thisMonthStart = monthStart(timezone);
    const prevMonthStart = monthStart(timezone, -1);
    const thisMonthRevenue = allInvoices
      .filter(i => new Date(i.issuedAt || i.createdAt) >= thisMonthStart)
      .reduce((s, i) => s + (i.charges?.total || 0), 0);
    const prevMonthRevenue = allInvoices
      .filter(i => {
        const d = new Date(i.issuedAt || i.createdAt);
        return d >= prevMonthStart && d < thisMonthStart;
      })
      .reduce((s, i) => s + (i.charges?.total || 0), 0);

    res.json({
      success: true,
      data: invoices,
      summary: {
        totalRevenue,
        pending: pendingTotal,
        overdue: overdueTotal,
        totalInvoices: total,
        thisMonthRevenue,
        prevMonthRevenue,
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getBillingSummary = async (req, res) => {
  try {
    const { filter } = getCtx(req);

    const invoices = await Invoice.find(filter).select("paid balance status").lean();
    const totalRevenue = invoices.reduce((s, i) => s + (i.paid || 0), 0);
    const pendingTotal = invoices.filter((i) => i.status === "pending").reduce((s, i) => s + (i.balance || 0), 0);
    const overdueTotal = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + (i.balance || 0), 0);

    res.json({
      success: true,
      data: {
        totalRevenue,
        pending: pendingTotal,
        overdue: overdueTotal,
        totalInvoices: invoices.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   STAFF
   ═══════════════════════════════════════ */

export const getStaffList = async (req, res) => {
  try {
    const { company, filter: hotelFilter } = getCtx(req);
    if (!company) return res.status(403).json({ success: false, message: 'Company context is required' });
    const { department, search } = req.query;
    const filter = { company, staffRemovedAt: null };
    filter.assignedProperties = hotelFilter.hotel;
    filter.companyRole = { $exists: true, $ne: null };

    if (department && department !== "all") {
      // Map department names to roles
      const deptRoleMap = {
        "Front Office": ["receptionist", "manager"],
        "Housekeeping": ["housekeeping"],
        "Food & Beverage": ["chief", "waiter"],
        "Guest Services": ["waiter"],
        "Maintenance": ["maintenance"],
        "Security": ["staff"],
      };
      if (deptRoleMap[department]) {
        filter.companyRole = { $in: deptRoleMap[department] };
      }
    }

    const rx = searchRegex(search);
    if (rx) {
      filter.$or = [{ fullname: rx }, { email: rx }];
    }

    const staff = await User.find(filter)
      .select("-password -refreshToken -resetOtp -resetOtpExpireAt -inviteToken")
      .populate("role", "name")
      .lean();

    const formatted = staff.map((s, i) => ({
      _id: s._id,
      id: `STF-${(1000 + i).toString()}`,
      name: s.fullname || s.username || "Unknown",
      initials: (s.fullname || "U").split(" ").map((n) => n[0]).join(""),
      role: s.companyRole || s.role?.name || "staff",
      department: getDepartment(s.companyRole),
      email: s.email,
      phone: s.contact || "",
      shift: null,
      status: s.isActive ? (s.accountStatus === "active" ? "on-duty" : "off-duty") : "on-leave",
      rating: null,
      yearsExp: null,
      joinDate: s.createdAt,
      tasksCompleted: null,
      shiftsThisMonth: null,
      profilePicture: s.profilePicture,
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

function getDepartment(role) {
  const map = {
    receptionist: "Front Office",
    manager: "Front Office",
    owner: "Management",
    admin: "Management",
    chief: "Food & Beverage",
    waiter: "Food & Beverage",
    housekeeping: "Housekeeping",
    maintenance: "Maintenance",
    staff: "General",
  };
  return map[role] || "General";
}

/* ═══════════════════════════════════════
   REPORTS
   ═══════════════════════════════════════ */

export const getReportsOverview = async (req, res) => {
  try {
    const { filter, timezone } = getCtx(req);
    const { start, end } = todayRange(req);
    const { start: yStart, end: yEnd } = dayRange(timezone, -1);

    const [
      totalRooms, occupiedRooms, todayCheckInsCompleted, todayCheckInsTotal,
      todayCheckOutsCompleted, todayCheckOutsTotal, currentGuests, vipGuests,
      roomStatusCounts, housekeepingCounts, noShowToday, yesterdayOccupied, lateCheckouts,
    ] = await Promise.all([
      Room.countDocuments(filter),
      Room.countDocuments({ ...filter, status: "occupied" }),
      Booking.countDocuments({ ...filter, status: "Checked-In", updatedAt: { $gte: start, $lte: end } }),
      Booking.countDocuments({ ...filter, checkIn: { $gte: start, $lte: end } }),
      Booking.countDocuments({ ...filter, status: "Checked-Out", updatedAt: { $gte: start, $lte: end } }),
      Booking.countDocuments({ ...filter, checkOut: { $gte: start, $lte: end } }),
      Guest.countDocuments({ ...filter, status: "In-House" }),
      Guest.countDocuments({ ...filter, vipStatus: true, status: "In-House" }),
      Room.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      HousekeepingTask.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Booking.countDocuments({ ...filter, status: "No-Show", checkIn: { $gte: start, $lte: end } }),
      // Rooms that were booked (confirmed or in-house) at any point yesterday.
      Booking.countDocuments({ ...filter, status: { $in: ["Confirmed", "Checked-In", "Checked-Out"] }, checkIn: { $lte: yEnd }, checkOut: { $gt: yStart } }),
      // Still in-house although the departure time has passed.
      Booking.countDocuments({ ...filter, status: "Checked-In", checkOut: { $lt: new Date() } }),
    ]);

    const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    const previousOccupancy = totalRooms > 0 ? Math.min(100, Math.round((yesterdayOccupied / totalRooms) * 100)) : null;

    const roomStatusMap = {};
    roomStatusCounts.forEach((s) => { roomStatusMap[s._id] = s.count; });

    const hkMap = {};
    housekeepingCounts.forEach((s) => { hkMap[s._id] = s.count; });

    // Occupancy by room type
    const roomTypeCounts = await Room.aggregate([
      { $match: filter },
      { $group: { _id: "$type", total: { $sum: 1 }, occupied: { $sum: { $cond: [{ $eq: ["$status", "occupied"] }, 1, 0] } } } },
    ]);

    // Recent activity
    const activity = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    res.json({
      success: true,
      data: {
        occupancy: {
          current: occupancy,
          // Yesterday's booking-based occupancy; null when the hotel has no rooms.
          previous: previousOccupancy,
          trend: previousOccupancy == null ? null : occupancy >= previousOccupancy ? "up" : "down",
          rooms: {
            occupied: roomStatusMap.occupied || 0,
            available: roomStatusMap.available || 0,
            maintenance: roomStatusMap.maintenance || 0,
            reserved: roomStatusMap.reserved || 0,
          }
        },
        checkIns: { today: todayCheckInsTotal, completed: todayCheckInsCompleted, pending: Math.max(0, todayCheckInsTotal - todayCheckInsCompleted - noShowToday), noShow: noShowToday },
        checkOuts: { today: todayCheckOutsTotal, completed: todayCheckOutsCompleted, pending: Math.max(0, todayCheckOutsTotal - todayCheckOutsCompleted), lateCheckout: lateCheckouts },
        guestActivity: { currentGuests, vipGuests, newArrivals: todayCheckInsTotal, departures: todayCheckOutsTotal },
        housekeeping: {
          clean: (hkMap.clean || 0) + (hkMap.inspected || 0),
          dirty: hkMap["needs-cleaning"] || 0,
          inProgress: hkMap["in-progress"] || 0,
          inspected: hkMap.inspected || 0,
        },
        roomStatus: roomTypeCounts.map((r) => ({ type: r._id, total: r.total, occupied: r.occupied })),
        recentActivity: activity.map((a) => ({
          id: a._id,
          type: a.action,
          description: a.description,
          time: getRelativeTime(a.createdAt),
          icon: a.icon,
          color: a.color,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

function getRelativeTime(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

/* ═══════════════════════════════════════
   ACTIVITY LOG
   ═══════════════════════════════════════ */

export const getActivityLog = async (req, res) => {
  try {
    const { filter } = getCtx(req);
    const limit = clampInt(req.query.limit, 20, 1, MAX_PAGE_SIZE);

    const logs = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: logs.map((l) => ({
        _id: l._id,
        text: l.description,
        time: getRelativeTime(l.createdAt),
        icon: l.icon || "CheckCircle",
        color: l.color || "#6366f1",
        live: (Date.now() - new Date(l.createdAt).getTime()) < 300000,
        createdAt: l.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   ROOM STATUS CHANGE
   ═══════════════════════════════════════ */

export const updateRoomStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const { userId, userName } = getCtx(req);

    if (!ROOM_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${ROOM_STATUSES.join(", ")}` });
    }
    const current = await findScoped(Room, req, id);
    if (!current) return notFound(res, "Room");

    // A room with a guest in it stays occupied (maintenance is still allowed)
    // until the guest is checked out.
    if (!["occupied", "maintenance"].includes(status)) {
      const inHouse = await Booking.exists({ room: current._id, status: "Checked-In" });
      if (inHouse) {
        return res.status(409).json({ success: false, message: `Room ${current.roomNumber} has a checked-in guest. Check the guest out first.` });
      }
    }

    const update = { status };
    if (status === "available") update.lastCleaned = new Date();
    const room = await Room.findOneAndUpdate({ _id: current._id }, update, { new: true, runValidators: true });
    if (!room) return notFound(res, "Room");

    await logActivity({
      hotel: room.hotel,
      company: room.company,
      entityType: "room",
      entityId: room.roomNumber,
      action: "status-change",
      description: `Room ${room.roomNumber} moved to <strong>${status}</strong>`,
      icon: "Sparkles",
      color: "#f59e0b",
      actor: userId,
      actorName: userName,
    });

    emitToHotel(room.hotel.toString(), "room-update", { roomId: room._id, status });

    res.json({ success: true, data: room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   GUEST STATUS MANAGEMENT
   Receptionists can mark guests as inactive or blacklisted,
   but NEVER delete them — preserves financial and legal records.
   ═══════════════════════════════════════ */

export const updateGuestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const { userId, userName } = getCtx(req);

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "isActive (boolean) is required" });
    }

    const guest = await findScoped(Guest, req, id);
    if (!guest) return notFound(res, "Guest");

    guest.isActive = isActive;
    if (!isActive) {
      guest.deactivatedAt = new Date();
      guest.deactivatedBy = userId;
    } else {
      guest.deactivatedAt = null;
      guest.deactivatedBy = null;
    }
    await guest.save();

    await logActivity({
      hotel: guest.hotel,
      company: guest.company,
      entityType: "guest",
      entityId: guest.guestId,
      action: isActive ? "reactivated" : "deactivated",
      description: `Guest <strong>${guest.fullName}</strong> (${guest.guestId}) marked as <strong>${isActive ? "Active" : "Inactive"}</strong> by ${userName}`,
      icon: isActive ? "UserCheck" : "UserX",
      color: isActive ? "#10b981" : "#ef4444",
      actor: userId,
      actorName: userName,
    });

    res.json({
      success: true,
      message: `Guest ${isActive ? "reactivated" : "deactivated"} successfully`,
      data: { _id: guest._id, guestId: guest.guestId, fullName: guest.fullName, isActive: guest.isActive },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const flagGuestBlacklist = async (req, res) => {
  try {
    const { id } = req.params;
    const { blacklisted, reason } = req.body;
    const { userId, userName } = getCtx(req);

    if (typeof blacklisted !== "boolean") {
      return res.status(400).json({ success: false, message: "blacklisted (boolean) is required" });
    }
    if (reason !== undefined && (typeof reason !== "string" || reason.length > 500)) {
      return res.status(400).json({ success: false, message: "Reason must be text of at most 500 characters." });
    }

    const guest = await findScoped(Guest, req, id);
    if (!guest) return notFound(res, "Guest");

    guest.blacklisted = blacklisted;
    guest.blacklistReason = blacklisted ? (reason || "").trim() : "";
    guest.blacklistedAt = blacklisted ? new Date() : null;
    guest.blacklistedBy = blacklisted ? userId : null;
    await guest.save();

    await logActivity({
      hotel: guest.hotel,
      company: guest.company,
      entityType: "guest",
      entityId: guest.guestId,
      action: blacklisted ? "blacklisted" : "un-blacklisted",
      description: `Guest <strong>${guest.fullName}</strong> (${guest.guestId}) ${blacklisted ? "flagged on blacklist" : "removed from blacklist"} by ${userName}${blacklisted && reason ? `. Reason: ${reason}` : ""}`,
      icon: blacklisted ? "ShieldAlert" : "ShieldCheck",
      color: blacklisted ? "#dc2626" : "#10b981",
      actor: userId,
      actorName: userName,
    });

    res.json({
      success: true,
      message: `Guest ${blacklisted ? "blacklisted" : "removed from blacklist"} successfully`,
      data: { _id: guest._id, guestId: guest.guestId, fullName: guest.fullName, blacklisted: guest.blacklisted, blacklistReason: guest.blacklistReason },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   STAFF ISSUE NOTIFICATION
   Receptionists CANNOT delete/deactivate staff.
   Instead they can notify a manager about a staff issue.
   ═══════════════════════════════════════ */

export const notifyManagerAboutStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { reason } = req.body || {};
    const urgency = req.body?.urgency === "high" ? "high" : "normal";
    const { userId, userName, company, filter: hotelFilter } = getCtx(req);

    if (typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({ success: false, message: "Reason is required" });
    }
    if (reason.length > 1000) {
      return res.status(400).json({ success: false, message: "Reason is limited to 1000 characters." });
    }

    // Only staff of the caller's company working at one of the caller's hotels can be reported.
    const staffMember = isId(staffId)
      ? await User.findOne({ _id: staffId, company, assignedProperties: hotelFilter.hotel }).populate("role", "name").lean()
      : null;
    if (!staffMember) return res.status(404).json({ success: false, message: "Staff member not found" });
    // Log against a hotel the reported member actually works at.
    const hotel = (staffMember.assignedProperties || []).map(String).find((h) => inScope(req, h));

    const staffName = staffMember.fullname || staffMember.username || "Unknown";
    const staffRole = staffMember.companyRole || staffMember.role?.name || "staff";

    // Log this as an activity so managers see it in the activity feed
    await logActivity({
      hotel,
      company,
      entityType: "staff-report",
      entityId: staffId,
      action: "staff-issue-reported",
      description: `⚠️ <strong>${userName}</strong> reported an issue with <strong>${staffName}</strong> (${staffRole}): "${reason.trim()}"`,
      icon: "AlertTriangle",
      color: urgency === "high" ? "#dc2626" : "#f59e0b",
      actor: userId,
      actorName: userName,
    });

    // Emit real-time notification to managers in the hotel
    if (hotel) {
      emitToHotel(hotel.toString(), "staff-issue-reported", {
        reportedBy: userName,
        staffName,
        staffRole,
        reason,
        urgency,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: `Issue reported to management about ${staffName}. Managers have been notified.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   PAYMENT SETTLEMENT WORKFLOW
   ═══════════════════════════════════════ */

export const capturePayment = async (req, res) => {
  try {
    const { bookingId, method, reference, notes } = req.body;
    const amount = Number(req.body?.amount);
    const { userId, userName } = getCtx(req);

    if (!bookingId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "bookingId and positive amount are required" });
    }

    const booking = await findScoped(Booking, req, bookingId);
    if (!booking) return notFound(res, "Booking");
    if (["Cancelled", "No-Show"].includes(booking.status)) {
      return res.status(409).json({ success: false, message: `Payments can't be recorded on a ${booking.status.toLowerCase()} booking.` });
    }

    const txn = await PaymentTransaction.create({
      hotel: booking.hotel, company: booking.company,
      booking: booking._id, guest: booking.guest,
      type: "capture", amount, method: method || "cash",
      reference, notes, status: "captured",
      processedBy: userId, processedByName: userName,
    });

    // Update booking payment status
    const totalPaid = await PaymentTransaction.aggregate([
      { $match: { booking: booking._id, type: "capture", status: { $in: ["captured", "settled"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const paidAmount = totalPaid[0]?.total || 0;
    booking.paymentStatus = paidAmount >= booking.totalAmount ? "paid" : "partial";
    await booking.save();

    await logActivity({
      hotel: booking.hotel, company: booking.company,
      entityType: "payment", entityId: txn.transactionId,
      action: "payment-captured",
      description: `Payment of <strong>${amount}</strong> captured for booking ${booking.bookingId || booking._id}`,
      icon: "CreditCard", color: "#10b981", actor: userId, actorName: userName,
    });

    emitToHotel(booking.hotel.toString(), "payment-update", { type: "capture", txn, booking });
    res.json({ success: true, message: "Payment captured", data: txn });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const refundPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { userId, userName } = getCtx(req);

    const txn = await findScoped(PaymentTransaction, req, id);
    if (!txn) return notFound(res, "Transaction");
    if (!["captured", "settled"].includes(txn.status)) {
      return res.status(400).json({ success: false, message: `Cannot refund a transaction in '${txn.status}' status` });
    }

    txn.status = "refund-requested";
    txn.refundReason = reason || "";
    await txn.save();

    await logActivity({
      hotel: txn.hotel, company: txn.company,
      entityType: "payment", entityId: txn.transactionId,
      action: "refund-requested",
      description: `Refund requested for <strong>${txn.transactionId}</strong> (${txn.amount})${reason ? `: ${reason}` : ""}`,
      icon: "RotateCcw", color: "#f59e0b", actor: userId, actorName: userName,
    });

    res.json({ success: true, message: "Refund requested", data: txn });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const disputePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { userId, userName } = getCtx(req);

    const txn = await findScoped(PaymentTransaction, req, id);
    if (!txn) return notFound(res, "Transaction");
    if (!["captured", "settled"].includes(txn.status)) {
      return res.status(400).json({ success: false, message: `Cannot dispute a transaction in '${txn.status}' status` });
    }

    txn.status = "disputed";
    txn.disputeReason = reason || "";
    await txn.save();

    await logActivity({
      hotel: txn.hotel, company: txn.company,
      entityType: "payment", entityId: txn.transactionId,
      action: "payment-disputed",
      description: `Payment <strong>${txn.transactionId}</strong> disputed${reason ? `: ${reason}` : ""}`,
      icon: "AlertCircle", color: "#dc2626", actor: userId, actorName: userName,
    });

    res.json({ success: true, message: "Payment disputed", data: txn });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getBookingPayments = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!(await findScoped(Booking, req, bookingId))) return notFound(res, "Booking");
    const txns = await PaymentTransaction.find({ booking: bookingId, ...scopeFilter(req) })
      .sort({ createdAt: -1 }).lean();

    const summary = {
      totalCaptured: txns.filter(t => ["captured", "settled"].includes(t.status)).reduce((s, t) => s + t.amount, 0),
      totalRefunded: txns.filter(t => t.status === "refunded").reduce((s, t) => s + t.amount, 0),
      pendingRefunds: txns.filter(t => t.status === "refund-requested").reduce((s, t) => s + t.amount, 0),
      disputes: txns.filter(t => t.status === "disputed").length,
    };

    res.json({ success: true, data: txns, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   OFFLINE OPERATION QUEUE
   ═══════════════════════════════════════ */

export const enqueueOperation = async (req, res) => {
  try {
    const { operationType, payload, priority, clientTimestamp, idempotencyKey } = req.body;
    const { hotel, company, userId, userName } = getCtx(req);

    if (!operationType || !payload) {
      return res.status(400).json({ success: false, message: "operationType and payload are required" });
    }
    if (!hotel) return res.status(400).json({ success: false, message: "Select a hotel first." });

    // Idempotency: if same key exists, return existing op
    if (idempotencyKey) {
      const existing = await OperationQueue.findOne({ idempotencyKey: String(idempotencyKey), hotel });
      if (existing) return res.json({ success: true, message: "Operation already queued", data: existing });
    }

    const op = await OperationQueue.create({
      hotel, company, operationType, payload,
      priority: priority || "normal",
      clientTimestamp: clientTimestamp ? new Date(clientTimestamp) : new Date(),
      idempotencyKey,
      queuedBy: userId, queuedByName: userName,
    });

    await logActivity({
      hotel, company,
      entityType: "queue", entityId: op.operationId,
      action: "operation-queued",
      description: `Offline operation <strong>${op.operationId}</strong> (${operationType}) queued by ${userName}`,
      icon: "CloudOff", color: "#6366f1", actor: userId, actorName: userName,
    });

    res.status(201).json({ success: true, message: "Operation queued", data: op });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const syncOperations = async (req, res) => {
  try {
    const { filter: hotelFilter, userId, userName } = getCtx(req);
    const filter = { ...hotelFilter, status: "queued" };

    const ops = await OperationQueue.find(filter)
      .sort({ priority: -1, createdAt: 1 })
      .limit(20);

    const results = [];
    for (const op of ops) {
      op.status = "processing";
      op.attempts += 1;
      op.lastAttemptAt = new Date();
      await op.save();

      try {
        // Process based on type (simplified — real impl would call the actual handler)
        let result;
        switch (op.operationType) {
          case "check-in": {
            // The queued op's own hotel bounds which booking it may touch.
            const booking = isId(op.payload?.bookingId) ? await Booking.findOne({ _id: op.payload.bookingId, hotel: op.hotel }) : null;
            if (booking && CHECKIN_FROM.includes(booking.status)) {
              booking.status = "Checked-In";
              await booking.save();
              if (booking.room) await Room.findByIdAndUpdate(booking.room, { status: "occupied" });
              result = { bookingId: booking._id, status: "Checked-In" };
            } else {
              result = { skipped: true, reason: booking ? `Booking is ${booking.status}` : "Booking not found" };
            }
            break;
          }
          case "check-out": {
            const booking = isId(op.payload?.bookingId) ? await Booking.findOne({ _id: op.payload.bookingId, hotel: op.hotel }) : null;
            if (booking && booking.status === "Checked-In") {
              booking.status = "Checked-Out";
              await booking.save();
              if (booking.room) await Room.findByIdAndUpdate(booking.room, { status: "cleaning" });
              result = { bookingId: booking._id, status: "Checked-Out" };
            } else {
              result = { skipped: true, reason: booking ? `Booking is ${booking.status}` : "Booking not found" };
            }
            break;
          }
          default:
            result = { message: "Operation type processed generically" };
        }

        op.status = "completed";
        op.result = result;
        op.completedAt = new Date();
        op.processedBy = userId;
        op.processedByName = userName;
        await op.save();
        results.push({ operationId: op.operationId, status: "completed", result });
      } catch (opErr) {
        op.status = op.attempts >= op.maxAttempts ? "failed" : "queued";
        op.errorLog.push({ attempt: op.attempts, error: opErr.message, at: new Date() });
        // Exponential backoff for next retry
        if (op.status === "queued") {
          op.nextRetryAt = new Date(Date.now() + Math.pow(2, op.attempts) * 1000);
        }
        await op.save();
        results.push({ operationId: op.operationId, status: op.status, error: opErr.message });
      }
    }

    res.json({ success: true, processed: results.length, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPendingOperations = async (req, res) => {
  try {
    const { filter } = getCtx(req);
    const { status = "queued" } = req.query;
    if (status !== "all") filter.status = String(status);

    const ops = await OperationQueue.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .limit(100).lean();

    res.json({ success: true, data: ops, count: ops.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════
   SHIFT HANDOVER WORKFLOW
   ═══════════════════════════════════════ */

export const closeShift = async (req, res) => {
  try {
    const { shiftType, shiftStart, notes, pendingTasks, unresolvedIncidents, cashDrawer } = req.body;
    const { hotel, company, userId, userName } = getCtx(req);

    if (!shiftType) return res.status(400).json({ success: false, message: "shiftType is required" });
    if (!hotel) return res.status(400).json({ success: false, message: "Select a hotel first." });

    const parsedStart = shiftStart ? new Date(shiftStart) : null;
    const start = parsedStart && !Number.isNaN(parsedStart.getTime()) ? parsedStart : new Date(Date.now() - 8 * 60 * 60 * 1000);
    const end = new Date();

    // Auto-aggregate stats for this shift window
    const bookingFilter = scopeFilter(req);
    const [checkIns, checkOuts, paymentTxns, guestReqs, hkTasks] = await Promise.all([
      Booking.countDocuments({ ...bookingFilter, status: "Checked-In", updatedAt: { $gte: start, $lte: end } }),
      Booking.countDocuments({ ...bookingFilter, status: "Checked-Out", updatedAt: { $gte: start, $lte: end } }),
      PaymentTransaction.aggregate([
        { $match: { ...bookingFilter, status: "captured", createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      GuestRequest.countDocuments({ ...bookingFilter, status: "resolved", updatedAt: { $gte: start, $lte: end } }),
      HousekeepingTask.countDocuments({ ...bookingFilter, status: { $in: ["clean", "inspected"] }, updatedAt: { $gte: start, $lte: end } }),
    ]);

    const handover = await ShiftHandover.create({
      hotel, company,
      closedBy: userId, closedByName: userName,
      shiftStart: start, shiftEnd: end, shiftType,
      stats: {
        checkInsProcessed: checkIns,
        checkOutsProcessed: checkOuts,
        paymentsCollected: paymentTxns[0]?.total || 0,
        paymentTransactions: paymentTxns[0]?.count || 0,
        guestRequestsHandled: guestReqs,
        housekeepingCompleted: hkTasks,
      },
      notes: notes || "",
      pendingTasks: pendingTasks || [],
      unresolvedIncidents: unresolvedIncidents || [],
      cashDrawer: cashDrawer || {},
      status: "closed",
    });

    await logActivity({
      hotel, company,
      entityType: "shift", entityId: handover.shiftId,
      action: "shift-closed",
      description: `<strong>${userName}</strong> closed ${shiftType} shift (${handover.shiftId})`,
      icon: "ClipboardList", color: "#8b5cf6", actor: userId, actorName: userName,
      metadata: { shiftId: handover.shiftId, stats: handover.stats },
    });

    emitToHotel(hotel?.toString(), "shift-closed", { shiftId: handover.shiftId, closedBy: userName, shiftType });

    res.status(201).json({ success: true, message: "Shift closed successfully", data: handover });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCurrentShiftSummary = async (req, res) => {
  try {
    const { filter: bookingFilter } = getCtx(req);

    // Approximate shift start: beginning of last 8-hour window
    const shiftStart = new Date(Date.now() - 8 * 60 * 60 * 1000);

    const [checkIns, checkOuts, paymentTxns, pendingRequests, pendingOps] = await Promise.all([
      Booking.countDocuments({ ...bookingFilter, status: "Checked-In", updatedAt: { $gte: shiftStart } }),
      Booking.countDocuments({ ...bookingFilter, status: "Checked-Out", updatedAt: { $gte: shiftStart } }),
      PaymentTransaction.aggregate([
        { $match: { ...bookingFilter, status: "captured", createdAt: { $gte: shiftStart } } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      GuestRequest.countDocuments({ ...bookingFilter, status: { $in: ["open", "assigned"] } }),
      OperationQueue.countDocuments({ ...bookingFilter, status: "queued" }),
    ]);

    res.json({
      success: true,
      data: {
        shiftStart,
        checkInsProcessed: checkIns,
        checkOutsProcessed: checkOuts,
        paymentsCollected: paymentTxns[0]?.total || 0,
        paymentTransactions: paymentTxns[0]?.count || 0,
        pendingGuestRequests: pendingRequests,
        pendingQueuedOperations: pendingOps,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getShiftHistory = async (req, res) => {
  try {
    const { filter } = getCtx(req);
    const page = clampInt(req.query.page, 1, 1, 100000);
    const limit = clampInt(req.query.limit, 20, 1, MAX_PAGE_SIZE);

    const skip = (page - 1) * limit;
    const [shifts, total] = await Promise.all([
      ShiftHandover.find(filter).sort({ shiftEnd: -1 }).skip(skip).limit(limit).lean(),
      ShiftHandover.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: shifts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getShiftById = async (req, res) => {
  try {
    if (!isId(req.params.id)) return notFound(res, "Shift record");
    const shift = await ShiftHandover.findOne({ _id: req.params.id, ...scopeFilter(req) })
      .populate("closedBy", "fullname profilePicture")
      .populate("acknowledgedBy", "fullname profilePicture")
      .lean();
    if (!shift) return res.status(404).json({ success: false, message: "Shift record not found" });
    res.json({ success: true, data: shift });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const acknowledgeShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName } = getCtx(req);

    const shift = await findScoped(ShiftHandover, req, id);
    if (!shift) return notFound(res, "Shift record");
    if (shift.status === "acknowledged") {
      return res.status(409).json({ success: false, message: "Shift already acknowledged" });
    }

    shift.acknowledgedBy = userId;
    shift.acknowledgedByName = userName;
    shift.acknowledgedAt = new Date();
    shift.status = "acknowledged";
    await shift.save();

    await logActivity({
      hotel: shift.hotel, company: shift.company,
      entityType: "shift", entityId: shift.shiftId,
      action: "shift-acknowledged",
      description: `<strong>${userName}</strong> acknowledged shift handover ${shift.shiftId}`,
      icon: "CheckCircle", color: "#10b981", actor: userId, actorName: userName,
    });

    res.json({ success: true, message: "Shift acknowledged", data: shift });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
