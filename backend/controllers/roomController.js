import { Room } from "../models/room.schema.js";
import { Booking } from "../models/booking.schema.js";
import { Order } from "../models/order.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateRoomQRCode } from "../utils/qrGenerator.js";
import {
  HOTEL_ADMIN_ROLES,
  assertHotelAccess,
  isHotelAdminRole,
  isValidId,
  stripQrSecrets,
} from "./hotelAdminAccess.js";

// Room types accepted by room.schema.js (single source of truth for the UI too)
const ROOM_TYPES = Room.schema.path("type").enumValues;
// occupied/reserved are derived from bookings; admins may only set these.
const ADMIN_ROOM_STATUSES = ["available", "maintenance", "cleaning"];

const notFound = (res) => res.status(404).json({ success: false, message: "Room not found" });

/**
 * Validates and normalises the admin-writable room fields. `partial` skips
 * required checks for updates. Returns { errors, values }.
 */
const validateRoomInput = (body, { partial = false } = {}) => {
  const errors = {};
  const values = {};
  const has = (key) => body[key] !== undefined;

  const text = (key, label, max, required) => {
    if (!has(key)) {
      if (required && !partial) errors[key] = `${label} is required`;
      return;
    }
    if (typeof body[key] !== "string") { errors[key] = `${label} must be text`; return; }
    const value = body[key].trim();
    if (required && !value) errors[key] = `${label} is required`;
    else if (value.length > max) errors[key] = `${label} must be ${max} characters or fewer`;
    else values[key] = value;
  };
  const number = (key, label, { min, max, integer, required }) => {
    if (!has(key) || body[key] === "") {
      if (required && !partial) errors[key] = `${label} is required`;
      return;
    }
    const value = typeof body[key] === "number" ? body[key] : typeof body[key] === "string" ? Number(body[key]) : NaN;
    if (!Number.isFinite(value)) errors[key] = `${label} must be a number`;
    else if (integer && !Number.isInteger(value)) errors[key] = `${label} must be a whole number`;
    else if (value < min || value > max) errors[key] = `${label} must be between ${min} and ${max.toLocaleString("en-US")}`;
    else values[key] = Math.round(value * 100) / 100;
  };

  text("roomNumber", "Room number", 20, true);
  text("roomName", "Room name", 100, true);
  text("description", "Description", 1000, false);
  number("price", "Price", { min: 0, max: 10_000_000, required: true });
  number("floor", "Floor", { min: 0, max: 200, integer: true });
  number("maxGuests", "Max guests", { min: 1, max: 20, integer: true });

  if (has("type") || !partial) {
    if (!ROOM_TYPES.includes(body.type)) errors.type = `Room type must be one of: ${ROOM_TYPES.join(", ")}`;
    else values.type = body.type;
  }
  if (has("bedType") && body.bedType !== "" && body.bedType !== null) {
    const bedTypes = Room.schema.path("bedType").enumValues;
    if (!bedTypes.includes(body.bedType)) errors.bedType = `Bed type must be one of: ${bedTypes.join(", ")}`;
    else values.bedType = body.bedType;
  }
  if (has("amenities")) {
    if (!Array.isArray(body.amenities) || body.amenities.some((a) => typeof a !== "string" || a.length > 60) || body.amenities.length > 50) {
      errors.amenities = "Amenities must be a list of up to 50 short labels";
    } else values.amenities = body.amenities.map((a) => a.trim()).filter(Boolean);
  }
  if (has("images")) {
    if (!Array.isArray(body.images) || body.images.some((i) => typeof i !== "string" || i.length > 2048) || body.images.length > 20) {
      errors.images = "Images must be a list of up to 20 URLs";
    } else values.images = body.images;
  }
  if (has("status")) {
    if (typeof body.status !== "string") errors.status = "Invalid status";
    else values.status = body.status;
  }
  return { errors, values };
};

const sendValidation = (res, errors) => {
  const first = Object.values(errors)[0];
  return res.status(400).json({ success: false, message: first, errors });
};

// Case-insensitive duplicate check for a hotel's room number.
const findDuplicateRoom = (hotelId, roomNumber, excludeId) =>
  Room.findOne({ hotel: hotelId, roomNumber, ...(excludeId && { _id: { $ne: excludeId } }) })
    .collation({ locale: "en", strength: 2 })
    .select("_id");

// @desc    Get all rooms for a hotel
// @route   GET /api/rooms?hotelId=xxx
// @access  Private (Owner, Manager, Staff)
export const getRooms = asyncHandler(async (req, res) => {
  const { hotelId, status, type, isQrActive } = req.query;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  // Validate hotel access (any staff member assigned to the hotel may read)
  await assertHotelAccess(req, hotelId);

  // Build query
  const query = { hotel: hotelId };

  if (typeof status === "string" && status) {
    query.status = status;
  }

  if (typeof type === "string" && type) {
    query.type = type;
  }

  if (isQrActive !== undefined) {
    query.isQrActive = isQrActive === 'true';
  }

  const rooms = await Room.find(query).sort({ roomNumber: 1 });

  // QR tokens open a guest ordering session, so only QR managers see them.
  res.status(200).json({
    success: true,
    count: rooms.length,
    rooms: isHotelAdminRole(req) ? rooms : rooms.map(stripQrSecrets),
  });
});

// @desc    Get single room by ID
// @route   GET /api/rooms/:id
// @access  Private (Owner, Manager, Staff)
export const getRoomById = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return notFound(res);
  // First get room to extract hotel ID
  const room = await Room.findById(req.params.id).select('hotel');

  if (!room) return notFound(res);

  // Validate hotel access
  await assertHotelAccess(req, room.hotel);

  // Now get full room data
  const fullRoom = await Room.findById(req.params.id)
    .populate('hotel', 'name location');

  res.status(200).json({
    success: true,
    room: isHotelAdminRole(req) ? fullRoom : stripQrSecrets(fullRoom),
  });
});

// @desc    Generate/Regenerate QR code for a room
// @route   POST /api/rooms/:id/generate-qr
// @access  Private (Owner, Manager)
export const generateRoomQR = asyncHandler(async (req, res) => {
  const regenerate = req.body?.regenerate === true; // If true, generate new token

  if (!isValidId(req.params.id)) return notFound(res);
  const room = await Room.findById(req.params.id);

  if (!room) return notFound(res);

  // QR generation is a configuration action, not a front-desk one.
  const hotel = await assertHotelAccess(req, room.hotel, { roles: HOTEL_ADMIN_ROLES });

  // Regenerate token if requested (invalidates old QR codes)
  if (regenerate) {
    room.regenerateToken();
  }

  // Backfill company from the hotel for legacy rooms created before the
  // company field was required, so save() validation doesn't fail on an
  // unrelated missing field during a QR-only update.
  if (!room.company && hotel?.company) {
    room.company = hotel.company;
  }

  // Generate QR code
  const { qrCodeData, qrCodeImage } = await generateRoomQRCode(room.uniqueToken, room.hotel.toString());
  room.qrCodeData = qrCodeData;
  room.qrCodeImage = qrCodeImage;
  room.isQrActive = true;

  // Validate only the fields we actually modified so legacy documents with
  // other missing/invalid fields can still receive a QR code.
  await room.save({ validateModifiedOnly: true });

  res.status(200).json({
    success: true,
    message: regenerate ? "QR code regenerated successfully (old QR is now invalid)" : "QR code generated successfully",
    room: {
      _id: room._id,
      roomNumber: room.roomNumber,
      roomName: room.roomName,
      uniqueToken: room.uniqueToken,
      qrCodeData: room.qrCodeData,
      qrCodeImage: room.qrCodeImage,
    },
  });
});

// @desc    Batch generate QR codes for all rooms in a hotel
// @route   POST /api/rooms/batch-generate-qr
// @access  Private (Owner, Manager)
export const batchGenerateRoomQR = asyncHandler(async (req, res) => {
  const { hotelId } = req.body;
  const regenerate = req.body?.regenerate === true;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  // Validate hotel access and get hotel
  const hotel = await assertHotelAccess(req, hotelId, { roles: HOTEL_ADMIN_ROLES });

  // Get all rooms for the hotel
  const rooms = await Room.find({ hotel: hotelId });

  const results = [];
  const errors = [];
  let skippedCount = 0;

  for (const room of rooms) {
    try {
      // Rooms that already have a QR are left alone unless regenerating
      if (room.qrCodeImage && !regenerate) {
        skippedCount += 1;
        continue;
      }
      if (regenerate) {
        room.regenerateToken();
      }

      // Backfill company for legacy rooms so save() doesn't fail on an
      // unrelated required field during a QR-only update.
      if (!room.company && hotel?.company) {
        room.company = hotel.company;
      }
      const { qrCodeData, qrCodeImage } = await generateRoomQRCode(room.uniqueToken, hotelId);
      room.qrCodeData = qrCodeData;
      room.qrCodeImage = qrCodeImage;
      room.isQrActive = true;
      await room.save({ validateModifiedOnly: true });

      results.push({
        roomNumber: room.roomNumber,
        uniqueToken: room.uniqueToken,
        status: 'success',
      });
    } catch (error) {
      errors.push({
        roomNumber: room.roomNumber,
        error: error.message,
      });
    }
  }

  res.status(200).json({
    success: true,
    message: `QR codes generated for ${results.length} room(s)` +
      (skippedCount ? `, ${skippedCount} already had one` : ""),
    successCount: results.length,
    skippedCount,
    errorCount: errors.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
});

// @desc    Toggle QR code active status
// @route   PATCH /api/rooms/:id/toggle-qr
// @access  Private (Owner, Manager)
export const toggleRoomQR = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return notFound(res);
  const room = await Room.findById(req.params.id);

  if (!room) return notFound(res);

  const hotel = await assertHotelAccess(req, room.hotel, { roles: HOTEL_ADMIN_ROLES });

  if (!room.company && hotel?.company) {
    room.company = hotel.company;
  }
  room.isQrActive = !room.isQrActive;
  await room.save({ validateModifiedOnly: true });

  res.status(200).json({
    success: true,
    message: `Room QR code is now ${room.isQrActive ? 'active' : 'inactive'}`,
    isQrActive: room.isQrActive,
  });
});

// @desc    Get QR code download data for a room
// @route   GET /api/rooms/:id/qr-download
// @access  Private (Owner, Manager)
export const getRoomQRDownload = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return notFound(res);
  const room = await Room.findById(req.params.id)
    .populate('hotel', 'name');

  if (!room) return notFound(res);

  await assertHotelAccess(req, room.hotel._id || room.hotel, { roles: HOTEL_ADMIN_ROLES });

  if (!room.qrCodeImage) {
    return res.status(400).json({
      success: false,
      message: "QR code not generated yet. Please generate first.",
    });
  }

  res.status(200).json({
    success: true,
    qrData: {
      roomNumber: room.roomNumber,
      roomName: room.roomName,
      hotelName: room.hotel?.name,
      qrCodeImage: room.qrCodeImage,
      qrCodeUrl: room.qrCodeData,
      uniqueToken: room.uniqueToken,
    },
  });
});

// @desc    Get all QR codes for a hotel (for bulk download/print)
// @route   GET /api/rooms/qr-codes/:hotelId
// @access  Private (Owner, Manager)
export const getAllRoomQRCodes = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const hotel = await assertHotelAccess(req, hotelId, { roles: HOTEL_ADMIN_ROLES });

  const rooms = await Room.find({
    hotel: hotelId,
    qrCodeImage: { $exists: true, $ne: null },
  }).select('roomNumber roomName uniqueToken qrCodeData qrCodeImage isQrActive');

  res.status(200).json({
    success: true,
    hotelName: hotel.name,
    count: rooms.length,
    rooms,
  });
});

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Private (Owner, Manager)
export const createRoom = asyncHandler(async (req, res) => {
  const { hotelId } = req.body;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  // Only hotel-admin roles of this hotel's company may create rooms.
  const hotel = await assertHotelAccess(req, hotelId, { roles: HOTEL_ADMIN_ROLES });

  // Whitelisted, validated fields only: rating, hotel, company, QR fields and
  // lastCleaned are never taken from the client.
  const { errors, values } = validateRoomInput(req.body);
  if (values.status === undefined) values.status = "available";
  if (!ADMIN_ROOM_STATUSES.includes(values.status)) {
    errors.status = `Status must be one of: ${ADMIN_ROOM_STATUSES.join(", ")}`;
  }
  if (Object.keys(errors).length) return sendValidation(res, errors);

  // Check if room number already exists for this hotel (case-insensitive)
  if (await findDuplicateRoom(hotelId, values.roomNumber)) {
    return res.status(400).json({
      success: false,
      message: `Room number ${values.roomNumber} already exists for this hotel`,
      errors: { roomNumber: `Room number ${values.roomNumber} already exists` },
    });
  }

  // Create room
  let room;
  try {
    room = await Room.create({ ...values, hotel: hotel._id, company: hotel.company });
  } catch (error) {
    // Unique index race between two near-simultaneous creates
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `Room number ${values.roomNumber} already exists for this hotel`,
        errors: { roomNumber: `Room number ${values.roomNumber} already exists` },
      });
    }
    throw error;
  }

  res.status(201).json({
    success: true,
    message: "Room created successfully",
    room,
  });
});

// @desc    Update a room
// @route   PUT /api/rooms/:id
// @access  Private (Owner, Manager)
export const updateRoom = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return notFound(res);
  const room = await Room.findById(req.params.id);

  if (!room) return notFound(res);

  const hotel = await assertHotelAccess(req, room.hotel, { roles: HOTEL_ADMIN_ROLES });

  // Whitelisted, validated fields only (rating/lastCleaned/hotel/company are
  // not admin-assignable).
  const { errors, values } = validateRoomInput(req.body, { partial: true });

  if (values.status !== undefined && values.status !== room.status) {
    if (!ADMIN_ROOM_STATUSES.includes(values.status)) {
      errors.status = "Occupied and reserved are set by bookings and can't be chosen manually";
    } else {
      const checkedIn = await Booking.countDocuments({ room: room._id, status: "Checked-In" });
      if (checkedIn > 0) {
        errors.status = "A guest is checked in to this room. Check them out from reception first.";
      }
    }
  }
  if (Object.keys(errors).length) return sendValidation(res, errors);

  // If room number is being changed, check for duplicates (case-insensitive)
  if (values.roomNumber && values.roomNumber !== room.roomNumber &&
      await findDuplicateRoom(room.hotel, values.roomNumber, room._id)) {
    return res.status(400).json({
      success: false,
      message: `Room number ${values.roomNumber} already exists for this hotel`,
      errors: { roomNumber: `Room number ${values.roomNumber} already exists` },
    });
  }

  if (!room.company && hotel?.company) room.company = hotel.company;
  Object.assign(room, values);

  await room.save();

  res.status(200).json({
    success: true,
    message: "Room updated successfully",
    room,
  });
});

// @desc    Delete a room
// @route   DELETE /api/rooms/:id
// @access  Private (Owner, Manager)
export const deleteRoom = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return notFound(res);
  const room = await Room.findById(req.params.id);

  if (!room) return notFound(res);

  await assertHotelAccess(req, room.hotel, { roles: HOTEL_ADMIN_ROLES });

  // Check if room has active bookings
  const activeBookings = await Booking.countDocuments({
    room: room._id,
    status: { $in: ['Confirmed', 'Checked-In', 'Pending'] }
  });

  if (activeBookings > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete room. It has ${activeBookings} active booking(s)`,
    });
  }

  const openOrders = await Order.countDocuments({
    room: room._id,
    status: { $in: ["pending", "confirmed", "preparing", "ready"] },
  });
  if (openOrders > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete room. It has ${openOrders} open room-service order(s)`,
    });
  }

  await room.deleteOne();

  res.status(200).json({
    success: true,
    message: "Room deleted successfully",
  });
});

// @desc    Get room availability calendar for a specific month
// @route   GET /api/rooms/:id/availability?month=2026-05
// @access  Public
export const getRoomAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { month } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Room ID is required",
    });
  }

  if (!month) {
    return res.status(400).json({
      success: false,
      message: "Month parameter is required (format: YYYY-MM)",
    });
  }

  // Validate month format
  const monthRegex = /^\d{4}-\d{2}$/;
  const monthPart = Number(String(month).slice(5, 7));
  if (!monthRegex.test(month) || monthPart < 1 || monthPart > 12) {
    return res.status(400).json({
      success: false,
      message: "Invalid month format. Use YYYY-MM (e.g., 2026-05)",
    });
  }

  if (!isValidId(id)) return notFound(res);

  // Get room
  const room = await Room.findById(id).populate('hotel', 'name');
  if (!room) {
    return res.status(404).json({
      success: false,
      message: "Room not found",
    });
  }

  // Parse month
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0); // Last day of month

  // Get all bookings for this room in the specified month
  const bookings = await Booking.find({
    room: id,
    hotel: room.hotel._id,
    status: { $in: ['Confirmed', 'Checked-In', 'Pending'] },
    $or: [
      {
        checkIn: { $lte: endDate },
        checkOut: { $gte: startDate }
      }
    ]
  }).select('checkIn checkOut status');

  // Build availability calendar
  const calendar = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Check if date is booked
    const isBooked = bookings.some(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      const current = new Date(currentDate);
      current.setHours(0, 0, 0, 0);

      return current >= checkIn && current < checkOut;
    });

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = currentDate < today;

    // Determine availability status
    let status = 'available';
    if (isPast) {
      status = 'past';
    } else if (isBooked) {
      status = 'booked';
    } else if (room.status === 'maintenance') {
      status = 'maintenance';
    }

    calendar.push({
      date: dateStr,
      status,
      price: room.price,
      available: status === 'available'
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  res.status(200).json({
    success: true,
    room: {
      _id: room._id,
      roomNumber: room.roomNumber,
      type: room.type,
      price: room.price,
      hotel: room.hotel
    },
    month,
    calendar
  });
});
