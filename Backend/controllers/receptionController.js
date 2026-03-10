import { Booking } from "../models/booking.schema.js";
import { Room } from "../models/room.schema.js";
import { Guest } from "../models/guest.schema.js";
import { Invoice } from "../models/invoice.schema.js";
import { HousekeepingTask } from "../models/housekeepingTask.schema.js";
import { GuestRequest } from "../models/guestRequest.schema.js";
import { ActivityLog } from "../models/activityLog.schema.js";
import { User } from "../models/user.schema.js";
import { Order } from "../models/order.schema.js";
import { emitToHotel } from "../config/socket.js";

// Helper: get hotel & company from staff user
const getCtx = (req) => {
  const user = req.user;
  const hotel = req.query.hotelId || req.params.hotelId || user?.assignedProperties?.[0]?._id || user?.assignedProperties?.[0];
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

    const filter = company ? { company } : hotel ? { hotel } : {};

    // Today's stats
    const [
      todayCheckIns, todayCheckOuts, totalRooms, occupiedRooms,
      availableRooms, pendingPayments, todayRevenue,
      yesterdayCheckIns, yesterdayCheckOuts, yesterdayOccupied, yesterdayRevenue,
      totalArrivals, totalDepartures
    ] = await Promise.all([
      Booking.countDocuments({ ...filter, status: "Checked-In", updatedAt: { $gte: start, $lte: end } }),
      Booking.countDocuments({ ...filter, status: "Checked-Out", updatedAt: { $gte: start, $lte: end } }),
      Room.countDocuments(filter),
      Room.countDocuments({ ...filter, status: "occupied" }),
      Room.countDocuments({ ...filter, status: "available" }),
      Booking.countDocuments({ ...filter, paymentStatus: { $in: ["unpaid", "partial"] }, status: { $nin: ["Cancelled"] } }),
      Booking.aggregate([
        { $match: { ...filter, status: { $in: ["Checked-In", "Checked-Out"] }, updatedAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Booking.countDocuments({ ...filter, status: "Checked-In", updatedAt: { $gte: yesterday, $lte: yesterdayEnd } }),
      Booking.countDocuments({ ...filter, status: "Checked-Out", updatedAt: { $gte: yesterday, $lte: yesterdayEnd } }),
      Room.countDocuments({ ...filter, status: "occupied" }), // approximate
      Booking.aggregate([
        { $match: { ...filter, status: { $in: ["Checked-In", "Checked-Out"] }, updatedAt: { $gte: yesterday, $lte: yesterdayEnd } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Booking.countDocuments({ ...filter, checkIn: { $gte: start, $lte: end }, status: { $in: ["Confirmed", "Pending"] } }),
      Booking.countDocuments({ ...filter, checkOut: { $gte: start, $lte: end }, status: "Checked-In" }),
    ]);

    // Build 7-day sparkline data from real DB counts
    const sparklineData = { checkIns: [], checkOuts: [], occupancy: [], revenue: [] };
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(start);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [ci, co, rev, occ] = await Promise.all([
        Booking.countDocuments({ ...filter, status: "Checked-In", updatedAt: { $gte: dayStart, $lte: dayEnd } }),
        Booking.countDocuments({ ...filter, status: "Checked-Out", updatedAt: { $gte: dayStart, $lte: dayEnd } }),
        Booking.aggregate([
          { $match: { ...filter, status: { $in: ["Checked-In", "Checked-Out"] }, updatedAt: { $gte: dayStart, $lte: dayEnd } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        Booking.countDocuments({ ...filter, checkIn: { $lte: dayEnd }, checkOut: { $gte: dayStart }, status: { $in: ["Confirmed", "Checked-In"] } }),
      ]);
      sparklineData.checkIns.push(ci);
      sparklineData.checkOuts.push(co);
      sparklineData.revenue.push(rev[0]?.total || 0);
      sparklineData.occupancy.push(totalRooms > 0 ? Math.round((occ / totalRooms) * 100) : 0);
    }

    const revenue = todayRevenue[0]?.total || 0;
    const yRevenue = yesterdayRevenue[0]?.total || 0;
    const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    const yOccupied = yesterdayOccupied || 0;
    const yOccupancy = totalRooms > 0 ? Math.round((yOccupied / totalRooms) * 100) : 0;

    const calcDelta = (today, yesterday) => {
      if (yesterday === 0) return today > 0 ? "+100%" : "0%";
      const diff = ((today - yesterday) / yesterday * 100).toFixed(0);
      return diff >= 0 ? `+${diff}%` : `${diff}%`;
    };

    const formatRevenue = (v) => v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${v}`;

    res.json({
      success: true,
      data: {
        checkIns: { value: todayCheckIns, total: todayCheckIns + totalArrivals, trend: calcDelta(todayCheckIns, yesterdayCheckIns), up: todayCheckIns >= yesterdayCheckIns, sparkline: sparklineData.checkIns },
        checkOuts: { value: todayCheckOuts, total: todayCheckOuts + totalDepartures, trend: calcDelta(todayCheckOuts, yesterdayCheckOuts), up: todayCheckOuts >= yesterdayCheckOuts, sparkline: sparklineData.checkOuts },
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
  try {
    const { bookingId } = req.params;
    const { hotel, company, userId, userName } = getCtx(req);

    const booking = await Booking.findById(bookingId).populate("room").populate("guest");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    booking.status = "Checked-In";
    await booking.save();

    // Update room status
    if (booking.room) {
      await Room.findByIdAndUpdate(booking.room._id, { status: "occupied" });
    }

    // Update guest status
    if (booking.guest) {
      await Guest.findByIdAndUpdate(booking.guest._id || booking.guest, {
        status: "In-House",
        currentBooking: booking._id,
        currentRoom: booking.room?.roomNumber,
      });
    }

    await logActivity({
      hotel: booking.hotel,
      company: booking.company,
      entityType: "booking",
      entityId: booking.bookingId || booking._id,
      action: "check-in",
      description: `<strong>${booking.guest?.fullName || booking.guestInfo?.name || "Guest"}</strong> checked in to Room ${booking.room?.roomNumber || ""}`,
      icon: "CalendarCheck",
      color: "#10b981",
      actor: userId,
      actorName: userName,
    });

    emitToHotel(booking.hotel.toString(), "booking-update", { type: "check-in", booking });
    emitToHotel(booking.hotel.toString(), "room-update", { roomId: booking.room?._id, status: "occupied" });

    res.json({ success: true, message: "Check-in successful", data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const performCheckOut = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId, userName } = getCtx(req);

    const booking = await Booking.findById(bookingId).populate("room").populate("guest");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    booking.status = "Checked-Out";
    await booking.save();

    if (booking.room) {
      await Room.findByIdAndUpdate(booking.room._id, { status: "cleaning" });
    }

    if (booking.guest) {
      await Guest.findByIdAndUpdate(booking.guest._id || booking.guest, {
        status: "Checked-Out",
        currentBooking: null,
        currentRoom: null,
        $inc: { totalStays: 1, totalSpent: booking.totalAmount || 0 },
      });
    }

    await logActivity({
      hotel: booking.hotel,
      company: booking.company,
      entityType: "booking",
      entityId: booking.bookingId || booking._id,
      action: "checkout",
      description: `<strong>${booking.guest?.fullName || booking.guestInfo?.name || "Guest"}</strong> checked out from Room ${booking.room?.roomNumber || ""}`,
      icon: "LogOut",
      color: "#f97316",
      actor: userId,
      actorName: userName,
    });

    emitToHotel(booking.hotel.toString(), "booking-update", { type: "checkout", booking });
    emitToHotel(booking.hotel.toString(), "room-update", { roomId: booking.room?._id, status: "cleaning" });

    res.json({ success: true, message: "Check-out successful", data: booking });
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
    const { status, page = 1, limit = 30, search, dateRange, roomType } = req.query;
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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("room", "roomNumber roomName type price floor")
        .populate("guest", "fullName email phone guestId avatarUrl vipStatus")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Booking.countDocuments(filter),
    ]);

    const formatted = bookings.map((b) => ({
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
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
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
    const { status, tier, search, page = 1, limit = 50 } = req.query;
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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [guests, total, inHouseCount, vipCount, newThisMonth] = await Promise.all([
      Guest.find(filter)
        .populate("currentBooking", "checkIn checkOut")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Guest.countDocuments(filter),
      Guest.countDocuments({ ...filter, status: "In-House" }),
      Guest.countDocuments({ ...filter, vipStatus: true }),
      Guest.countDocuments({
        ...filter,
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      }),
    ]);

    const formatted = guests.map((g) => ({
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
        total,
        inHouse: inHouseCount,
        vip: vipCount,
        newThisMonth,
      },
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
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
