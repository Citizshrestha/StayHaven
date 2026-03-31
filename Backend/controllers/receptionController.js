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
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { OperationQueue } from "../models/operationQueue.schema.js";
import { ShiftHandover } from "../models/shiftHandover.schema.js";
import { emitToHotel } from "../config/socket.js";
import { sendEmail } from "../config/nodemailer.js";
import { paginateQuery, parsePaginationParams, MAX_PAGE_SIZE } from "../utils/pagination.js";

// Helper: get hotel & company from staff user (uses property-scope middleware result)
const getCtx = (req) => {
  const user = req.user;
  // Prefer the scoped hotel from enforcePropertyScope middleware
  const hotel = req._scopedHotelId || req.query.hotelId || req.params.hotelId || user?.assignedProperties?.[0]?._id || user?.assignedProperties?.[0];
  const company = req.query.companyId || user?.company?._id || user?.company;
  return { hotel, company, userId: user?._id, userName: user?.fullname };
};

// Helper: start/end of today
const todayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

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
    body: `Hi {{guestName}},\n\nThis is a gentle reminder for pending payment on your booking.\n\nBooking: {{bookingId}}\nRoom: {{roomNumber}}\nTotal Amount: ₹{{totalAmount}}\nStatus: {{paymentStatus}}\n\nPlease contact front desk for assistance.\n\nThank you,\n{{hotelName}} Billing Desk`,
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
    const { hotel, company } = getCtx(req);
    const { start, end } = todayRange();
    const yesterday = new Date(start);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Build a filter that works inside $match (must use ObjectId for aggregation)
    const filter = company
      ? { company: new mongoose.Types.ObjectId(String(company)) }
      : hotel
        ? { hotel: new mongoose.Types.ObjectId(String(hotel)) }
        : {};

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
      { $match: company ? { company: filter.company } : hotel ? { hotel: filter.hotel } : {} },
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
      const dayStart = new Date(start);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
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
    const yOccupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0; // approx

    const calcDelta = (today, yesterday) => {
      if (yesterday === 0) return today > 0 ? "+100%" : "0%";
      const diff = ((today - yesterday) / yesterday * 100).toFixed(0);
      return diff >= 0 ? `+${diff}%` : `${diff}%`;
    };

    const formatRevenue = (v) => v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${v}`;

    res.json({
      success: true,
      data: {
        checkIns: { value: todayCheckIns, total: todayCheckIns + totalArrivals, trend: calcDelta(todayCheckIns, yesterdayCheckIns_), up: todayCheckIns >= yesterdayCheckIns_, sparkline: sparklineData.checkIns },
        checkOuts: { value: todayCheckOuts, total: todayCheckOuts + totalDepartures, trend: calcDelta(todayCheckOuts, yesterdayCheckOuts_), up: todayCheckOuts >= yesterdayCheckOuts_, sparkline: sparklineData.checkOuts },
        occupancy: { value: occupancy, trend: calcDelta(occupancy, yOccupancy), up: occupancy >= yOccupancy, sparkline: sparklineData.occupancy },
        revenue: { value: formatRevenue(revenue), trend: calcDelta(revenue, yRevenue), up: revenue >= yRevenue, sparkline: sparklineData.revenue },
        pendingPayments: { value: pendingPayments, trend: `${pendingPayments}`, up: false },
        availableRooms: { value: availableRooms, trend: `${availableRooms}`, up: false },
        totalRooms,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getLiveRoomStatus = async (req, res) => {
  try {
    const { hotel, company } = getCtx(req);
    const filter = company ? { company } : hotel ? { hotel } : {};

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
    const { hotel, company } = getCtx(req);
    const filter = company ? { company } : hotel ? { hotel } : {};
    const totalRooms = await Room.countDocuments(filter) || 1;

    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const fullNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(d);
      dEnd.setHours(23, 59, 59, 999);

      const occupied = await Booking.countDocuments({
        ...filter,
        checkIn: { $lte: dEnd },
        checkOut: { $gte: d },
        status: { $in: ["Confirmed", "Checked-In"] },
      });

      days.push({
        day: dayNames[d.getDay()],
        name: fullNames[d.getDay()],
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
    const { hotel, company } = getCtx(req);
    const filter = company ? { company } : hotel ? { hotel } : {};

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    // Room revenue from bookings
    const roomRevenue = await Booking.aggregate([
      { $match: { ...filter, createdAt: { $gte: thisMonth }, status: { $nin: ["Cancelled"] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const roomTotal = roomRevenue[0]?.total || 0;

    // Food & beverage revenue from orders (dineIn + roomService)
    const orderFilter = company ? { company } : hotel ? { hotel } : {};
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
    const { hotel, company } = getCtx(req);
    const { start, end } = todayRange();
    const filter = company ? { company } : hotel ? { hotel } : {};

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
      expectedTime: b.expectedArrivalTime || new Date(b.checkIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
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
    const { hotel, company } = getCtx(req);
    const { start, end } = todayRange();
    const filter = company ? { company } : hotel ? { hotel } : {};

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
      checkOutTime: new Date(b.checkOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      stayDuration: b.durationNights || Math.ceil((b.checkOut - b.checkIn) / (1000 * 60 * 60 * 24)),
      status: b.status === "Checked-Out" ? "checked-out" : "in-room",
      balance: b.paymentStatus === "paid" ? 0 : b.totalAmount || 0,
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

export const performCheckIn = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { bookingId } = req.params;
    const { hotel, company, userId, userName } = getCtx(req);
    const expectedVersion = req.body?.__v; // optimistic locking

    await session.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).populate("room").populate("guest").session(session);
      if (!booking) throw Object.assign(new Error("Booking not found"), { status: 404 });

      // Optimistic locking: reject if version mismatch
      if (expectedVersion !== undefined && booking.__v !== expectedVersion) {
        throw Object.assign(new Error("Booking was modified by another user. Please refresh and try again."), { status: 409 });
      }

      // Prevent duplicate check-in
      if (booking.status === "Checked-In") {
        throw Object.assign(new Error("Guest is already checked in."), { status: 409 });
      }

      // Property-scope validation: booking must belong to assigned hotel
      if (hotel && booking.hotel.toString() !== hotel.toString()) {
        throw Object.assign(new Error("Booking does not belong to your assigned property."), { status: 403 });
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
    const { hotel, userId, userName } = getCtx(req);
    const expectedVersion = req.body?.__v;

    await session.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).populate("room").populate("guest").session(session);
      if (!booking) throw Object.assign(new Error("Booking not found"), { status: 404 });

      if (expectedVersion !== undefined && booking.__v !== expectedVersion) {
        throw Object.assign(new Error("Booking was modified by another user. Please refresh and try again."), { status: 409 });
      }

      if (booking.status === "Checked-Out") {
        throw Object.assign(new Error("Guest is already checked out."), { status: 409 });
      }

      if (hotel && booking.hotel.toString() !== hotel.toString()) {
        throw Object.assign(new Error("Booking does not belong to your assigned property."), { status: 403 });
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
    const { hotel: scopedHotel, userId, userName } = getCtx(req);

    if (!bookingId) {
      return res.status(400).json({ success: false, message: "bookingId is required" });
    }

    const booking = await Booking.findById(bookingId)
      .populate("guest", "fullName email")
      .populate("room", "roomNumber type roomName")
      .populate("hotel", "name contact")
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (scopedHotel && booking.hotel?._id?.toString() !== scopedHotel.toString()) {
      return res.status(403).json({ success: false, message: "Booking does not belong to your assigned property." });
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
      html: `<div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #0f172a; white-space: pre-wrap;">${body.replace(/\n/g, "<br />")}</div>`,
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
    const { hotel, company } = getCtx(req);
    const { status, search, dateRange, roomType } = req.query;
    
    // Parse pagination params (enforces 100 max limit)
    const pagination = parsePaginationParams(req);
    const filter = company ? { company } : hotel ? { hotel } : {};

    if (status && status !== "all") {
      const statusMap = {
        "Confirmed": "Confirmed",
        "Checked In": "Checked-In",
        "Checked Out": "Checked-Out",
        "Pending": "Pending",
        "Cancelled": "Cancelled",
      };
      filter.status = statusMap[status] || status;
    }

    if (search) {
      filter.$or = [
        { "guestInfo.name": { $regex: search, $options: "i" } },
        { bookingId: { $regex: search, $options: "i" } },
        { confirmationCode: { $regex: search, $options: "i" } },
      ];
    }

    if (dateRange && dateRange !== "all") {
      const now = new Date();
      if (dateRange === "thisMonth") {
        filter.checkIn = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
      } else if (dateRange === "lastMonth") {
        filter.checkIn = {
          $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          $lt: new Date(now.getFullYear(), now.getMonth(), 1),
        };
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
    const { hotel, company } = getCtx(req);
    const { status, floor, type, search, sort = "roomNumber" } = req.query;
    const filter = company ? { company } : hotel ? { hotel } : {};

    if (status && status !== "all") filter.status = status;
    if (floor && floor !== "all") filter.floor = parseInt(floor);
    if (type && type !== "all") filter.type = type;
    if (search) {
      filter.$or = [
        { roomNumber: { $regex: search, $options: "i" } },
        { roomName: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
      ];
    }

    const rooms = await Room.find(filter).sort(sort).lean();

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
        beds: r.bedType || "Queen",
        amenities: r.amenities || [],
        rating: r.rating || 4.0,
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
    const { hotel, company } = getCtx(req);
    const { status, tier, search } = req.query;
    
    // Parse pagination params (enforces 100 max limit)
    const pagination = parsePaginationParams(req);
    const filter = company ? { company } : hotel ? { hotel } : {};

    if (status && status !== "all") filter.status = status;
    if (tier && tier !== "all") filter.membershipTier = tier;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { guestId: { $regex: search, $options: "i" } },
      ];
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
      Guest.countDocuments({
        ...filter,
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      }),
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
    const guest = await Guest.findById(req.params.id)
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
    const { hotel, company } = getCtx(req);
    const { status, floor, priority, search } = req.query;
    const filter = company ? { company } : hotel ? { hotel } : {};

    if (status && status !== "all") {
      if (status.includes(',')) {
        filter.status = { $in: status.split(',').map(s => s.trim()) };
      } else {
        filter.status = status;
      }
    }
    if (floor && floor !== "all") filter.floor = parseInt(floor);
    if (priority && priority !== "all") filter.priority = priority;
    if (search) {
      filter.$or = [
        { roomNumber: { $regex: search, $options: "i" } },
        { roomType: { $regex: search, $options: "i" } },
        { assignedToName: { $regex: search, $options: "i" } },
      ];
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
    const { status, assignedTo, priority, notes } = req.body;
    const { userId, userName } = getCtx(req);

    const update = {};
    if (status) update.status = status;
    if (assignedTo) update.assignedTo = assignedTo;
    if (priority) update.priority = priority;
    if (notes) update.notes = notes;

    if (status === "in-progress") update.startedAt = new Date();
    if (status === "clean" || status === "inspected") update.completedAt = new Date();

    const task = await HousekeepingTask.findByIdAndUpdate(id, update, { new: true })
      .populate("assignedTo", "fullname profilePicture");

    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    if (status === "clean" || status === "inspected") {
      await Room.findByIdAndUpdate(task.room, { lastCleaned: new Date() });
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
    const { hotel, company } = getCtx(req);
    const filter = company ? { company } : hotel ? { hotel } : {};
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

export const assignGuestRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const { userId, userName } = getCtx(req);

    const request = await GuestRequest.findByIdAndUpdate(
      id,
      { status: "assigned", assignedTo: assignedTo || userId, assignedToName: userName },
      { new: true }
    );

    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    await logActivity({
      hotel: request.hotel,
      company: request.company,
      entityType: "request",
      entityId: request.roomNumber,
      action: "assigned",
      description: `Guest request for Room ${request.roomNumber} assigned to <strong>${userName || "staff"}</strong>`,
      icon: "Users",
      color: "#06b6d4",
      actor: userId,
      actorName: userName,
    });

    emitToHotel(request.hotel.toString(), "request-update", request);

    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const ignoreGuestRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await GuestRequest.findByIdAndUpdate(id, { status: "ignored" }, { new: true });
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const resolveGuestRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await GuestRequest.findByIdAndUpdate(
      id,
      { status: "resolved", resolvedAt: new Date() },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
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
    const { hotel, company } = getCtx(req);
    const { status, search, page = 1, limit = 30 } = req.query;
    const filter = company ? { company } : hotel ? { hotel } : {};

    if (status && status !== "all") filter.status = status;
    if (search) {
      filter.$or = [
        { invoiceId: { $regex: search, $options: "i" } },
        { guestName: { $regex: search, $options: "i" } },
        { bookingRef: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(filter).sort({ issuedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Invoice.countDocuments(filter),
    ]);

    // Summary stats
    const baseFilter = company ? { company } : hotel ? { hotel } : {};
    const allInvoices = await Invoice.find(baseFilter).lean();
    const totalRevenue = allInvoices.reduce((s, i) => s + (i.charges?.total || 0), 0);
    const pendingTotal = allInvoices.filter((i) => i.status === "pending").reduce((s, i) => s + (i.balance || 0), 0);
    const overdueTotal = allInvoices.filter((i) => i.status === "overdue").reduce((s, i) => s + (i.balance || 0), 0);

    // Revenue trend: current month vs previous month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
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
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getBillingSummary = async (req, res) => {
  try {
    const { hotel, company } = getCtx(req);
    const filter = company ? { company } : hotel ? { hotel } : {};

    const invoices = await Invoice.find(filter).lean();
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
    const { company } = getCtx(req);
    const { department, status, search } = req.query;
    const filter = company ? { company } : {};
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

    if (search) {
      filter.$or = [
        { fullname: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
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
      phone: s.contact?.phone || "",
      shift: getShift(s),
      status: s.isActive ? (s.accountStatus === "active" ? "on-duty" : "off-duty") : "on-leave",
      rating: (4 + Math.random()).toFixed(1),
      yearsExp: Math.max(1, Math.floor((Date.now() - new Date(s.createdAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000))),
      joinDate: s.createdAt,
      tasksCompleted: Math.floor(Math.random() * 200) + 50,
      shiftsThisMonth: Math.floor(Math.random() * 20) + 5,
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

function getShift(user) {
  const shifts = ["Morning", "Afternoon", "Evening", "Night"];
  const hash = (user.fullname || "").charCodeAt(0) || 0;
  return shifts[hash % shifts.length];
}

/* ═══════════════════════════════════════
   REPORTS
   ═══════════════════════════════════════ */

export const getReportsOverview = async (req, res) => {
  try {
    const { hotel, company } = getCtx(req);
    const { start, end } = todayRange();
    const filter = company ? { company } : hotel ? { hotel } : {};

    const [
      totalRooms, occupiedRooms, todayCheckInsCompleted, todayCheckInsTotal,
      todayCheckOutsCompleted, todayCheckOutsTotal, currentGuests, vipGuests,
      roomStatusCounts, housekeepingCounts
    ] = await Promise.all([
      Room.countDocuments(filter),
      Room.countDocuments({ ...filter, status: "occupied" }),
      Booking.countDocuments({ ...filter, status: "Checked-In", updatedAt: { $gte: start, $lte: end } }),
      Booking.countDocuments({ ...filter, checkIn: { $gte: start, $lte: end } }),
      Booking.countDocuments({ ...filter, status: "Checked-Out", updatedAt: { $gte: start, $lte: end } }),
      Booking.countDocuments({ ...filter, checkOut: { $gte: start, $lte: end } }),
      Guest.countDocuments({ ...(company ? { company } : {}), status: "In-House" }),
      Guest.countDocuments({ ...(company ? { company } : {}), vipStatus: true, status: "In-House" }),
      Room.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      HousekeepingTask.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

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
    const activity = await ActivityLog.find(company ? { company } : hotel ? { hotel } : {})
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    res.json({
      success: true,
      data: {
        occupancy: {
          current: occupancy,
          previous: Math.max(0, occupancy - 6),
          trend: "up",
          rooms: {
            occupied: roomStatusMap.occupied || 0,
            available: roomStatusMap.available || 0,
            maintenance: roomStatusMap.maintenance || 0,
            reserved: roomStatusMap.reserved || 0,
          }
        },
        checkIns: { today: todayCheckInsTotal, completed: todayCheckInsCompleted, pending: todayCheckInsTotal - todayCheckInsCompleted, noShow: 0 },
        checkOuts: { today: todayCheckOutsTotal, completed: todayCheckOutsCompleted, pending: todayCheckOutsTotal - todayCheckOutsCompleted, lateCheckout: 0 },
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
    const { hotel, company } = getCtx(req);
    const filter = company ? { company } : hotel ? { hotel } : {};
    const { limit = 20 } = req.query;

    const logs = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
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
    const { status } = req.body;
    const { userId, userName } = getCtx(req);

    const room = await Room.findByIdAndUpdate(id, { status }, { new: true });
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    if (status === "available") {
      room.lastCleaned = new Date();
      await room.save();
    }

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
    const { userId, userName, hotel, company } = getCtx(req);

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "isActive (boolean) is required" });
    }

    const guest = await Guest.findById(id);
    if (!guest) return res.status(404).json({ success: false, message: "Guest not found" });

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

    const guest = await Guest.findById(id);
    if (!guest) return res.status(404).json({ success: false, message: "Guest not found" });

    guest.blacklisted = blacklisted;
    guest.blacklistReason = blacklisted ? (reason || "") : "";
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
    const { reason, urgency = "normal" } = req.body;
    const { userId, userName, hotel, company } = getCtx(req);

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: "Reason is required" });
    }

    // Find the staff member being reported
    const staffMember = await User.findById(staffId).populate("role", "name").lean();
    if (!staffMember) return res.status(404).json({ success: false, message: "Staff member not found" });

    const staffName = staffMember.fullname || staffMember.username || "Unknown";
    const staffRole = staffMember.companyRole || staffMember.role?.name || "staff";

    // Log this as an activity so managers see it in the activity feed
    await logActivity({
      hotel,
      company,
      entityType: "staff-report",
      entityId: staffId,
      action: "staff-issue-reported",
      description: `⚠️ <strong>${userName}</strong> reported an issue with <strong>${staffName}</strong> (${staffRole}): "${reason}"`,
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
    const { bookingId, amount, method, reference, notes } = req.body;
    const { hotel, company, userId, userName } = getCtx(req);

    if (!bookingId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "bookingId and positive amount are required" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

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

    const txn = await PaymentTransaction.findById(id);
    if (!txn) return res.status(404).json({ success: false, message: "Transaction not found" });
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

    const txn = await PaymentTransaction.findById(id);
    if (!txn) return res.status(404).json({ success: false, message: "Transaction not found" });

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
    const txns = await PaymentTransaction.find({ booking: bookingId })
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

    // Idempotency: if same key exists, return existing op
    if (idempotencyKey) {
      const existing = await OperationQueue.findOne({ idempotencyKey });
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
    const { hotel, company, userId, userName } = getCtx(req);
    const filter = company ? { company, status: "queued" } : hotel ? { hotel, status: "queued" } : { status: "queued" };

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
            const booking = await Booking.findById(op.payload.bookingId);
            if (booking && booking.status !== "Checked-In") {
              booking.status = "Checked-In";
              await booking.save();
              if (booking.room) await Room.findByIdAndUpdate(booking.room, { status: "occupied" });
              result = { bookingId: booking._id, status: "Checked-In" };
            } else {
              result = { skipped: true, reason: booking ? "Already checked in" : "Booking not found" };
            }
            break;
          }
          case "check-out": {
            const booking = await Booking.findById(op.payload.bookingId);
            if (booking && booking.status !== "Checked-Out") {
              booking.status = "Checked-Out";
              await booking.save();
              if (booking.room) await Room.findByIdAndUpdate(booking.room, { status: "cleaning" });
              result = { bookingId: booking._id, status: "Checked-Out" };
            } else {
              result = { skipped: true, reason: booking ? "Already checked out" : "Booking not found" };
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
    const { hotel, company } = getCtx(req);
    const filter = company ? { company } : hotel ? { hotel } : {};
    const { status = "queued" } = req.query;
    if (status !== "all") filter.status = status;

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

    const start = shiftStart ? new Date(shiftStart) : (() => { const d = new Date(); d.setHours(d.getHours() - 8); return d; })();
    const end = new Date();

    // Auto-aggregate stats for this shift window
    const bookingFilter = company ? { company } : hotel ? { hotel } : {};
    const [checkIns, checkOuts, paymentTxns, guestReqs, hkTasks] = await Promise.all([
      Booking.countDocuments({ ...bookingFilter, status: "Checked-In", updatedAt: { $gte: start, $lte: end } }),
      Booking.countDocuments({ ...bookingFilter, status: "Checked-Out", updatedAt: { $gte: start, $lte: end } }),
      PaymentTransaction.aggregate([
        { $match: { ...(company ? { company } : hotel ? { hotel } : {}), status: "captured", createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      GuestRequest.countDocuments({ ...(company ? { company } : hotel ? { hotel } : {}), status: "resolved", updatedAt: { $gte: start, $lte: end } }),
      HousekeepingTask.countDocuments({ ...(company ? { company } : hotel ? { hotel } : {}), status: { $in: ["clean", "inspected"] }, updatedAt: { $gte: start, $lte: end } }),
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
    const { hotel, company, userId } = getCtx(req);
    const { start } = todayRange();

    // Approximate shift start: beginning of last 8-hour window
    const shiftStart = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const bookingFilter = company ? { company } : hotel ? { hotel } : {};

    const [checkIns, checkOuts, paymentTxns, pendingRequests, pendingOps] = await Promise.all([
      Booking.countDocuments({ ...bookingFilter, status: "Checked-In", updatedAt: { $gte: shiftStart } }),
      Booking.countDocuments({ ...bookingFilter, status: "Checked-Out", updatedAt: { $gte: shiftStart } }),
      PaymentTransaction.aggregate([
        { $match: { ...(company ? { company } : hotel ? { hotel } : {}), status: "captured", createdAt: { $gte: shiftStart } } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      GuestRequest.countDocuments({ ...(company ? { company } : hotel ? { hotel } : {}), status: { $in: ["open", "assigned"] } }),
      OperationQueue.countDocuments({ ...(company ? { company } : hotel ? { hotel } : {}), status: "queued" }),
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
    const { hotel, company } = getCtx(req);
    const { page = 1, limit = 20 } = req.query;
    const filter = company ? { company } : hotel ? { hotel } : {};

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [shifts, total] = await Promise.all([
      ShiftHandover.find(filter).sort({ shiftEnd: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      ShiftHandover.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: shifts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getShiftById = async (req, res) => {
  try {
    const shift = await ShiftHandover.findById(req.params.id)
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

    const shift = await ShiftHandover.findById(id);
    if (!shift) return res.status(404).json({ success: false, message: "Shift record not found" });
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
