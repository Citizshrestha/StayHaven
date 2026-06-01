import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { Booking } from "../models/booking.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateRoomQRCode } from "../utils/qrGenerator.js";

// Helper functions for multi-tenancy
const getUserRole = (req) => req.user?.role?.name || req.user?.companyRole;

const getAssignedHotelIds = (req) => {
  const assigned = req.user?.assignedProperties || [];
  return assigned
    .map((p) => (typeof p === "object" ? p?._id?.toString() : p?.toString()))
    .filter(Boolean);
};

const assertHotelAccess = async (req, hotelId) => {
  const role = getUserRole(req);

  // Superadmins should NOT have access to hotel-specific financial data
  // They can manage hotels (approve/reject) but cannot view bookings, revenue, etc.
  if (role === "admin" || role === "superadmin") {
    throw Object.assign(new Error("Superadmins cannot access hotel-specific operational data"), { status: 403 });
  }

  const assignedHotelIds = getAssignedHotelIds(req);
  const userCompany = req.user?.company?._id?.toString?.() || req.user?.company?.toString?.() || req.user?.company;

  const hotel = await Hotel.findById(hotelId).select("company owner");
  if (!hotel) {
    throw Object.assign(new Error("Hotel not found"), { status: 404 });
  }

  // Receptionists are property-scoped
  if (role === "receptionist" && assignedHotelIds.length > 0 && !assignedHotelIds.includes(hotelId.toString())) {
    throw Object.assign(new Error("Not authorized for this hotel"), { status: 403 });
  }

  // Enforce same-company scope for non-owner users
  if (role !== "owner" && userCompany && hotel.company?.toString() !== userCompany.toString()) {
    throw Object.assign(new Error("Not authorized for this hotel company"), { status: 403 });
  }

  return hotel;
};

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

  // Validate hotel access
  await assertHotelAccess(req, hotelId);

  // Build query
  const query = { hotel: hotelId };

  if (status) {
    query.status = status;
  }

  if (type) {
    query.type = type;
  }

  if (isQrActive !== undefined) {
    query.isQrActive = isQrActive === 'true';
  }

  const rooms = await Room.find(query).sort({ roomNumber: 1 });

  res.status(200).json({
    success: true,
    count: rooms.length,
    rooms,
  });
});

// @desc    Get single room by ID
// @route   GET /api/rooms/:id
// @access  Private (Owner, Manager, Staff)
export const getRoomById = asyncHandler(async (req, res) => {
  // First get room to extract hotel ID
  const room = await Room.findById(req.params.id).select('hotel');

  if (!room) {
    return res.status(404).json({
      success: false,
      message: "Room not found",
    });
  }

  // Validate hotel access
  await assertHotelAccess(req, room.hotel);

  // Now get full room data
  const fullRoom = await Room.findById(req.params.id)
    .populate('hotel', 'name location');

  res.status(200).json({
    success: true,
    room: fullRoom,
  });
});

// @desc    Generate/Regenerate QR code for a room
// @route   POST /api/rooms/:id/generate-qr
// @access  Private (Owner, Manager)
export const generateRoomQR = asyncHandler(async (req, res) => {
  const { regenerate } = req.body; // If true, generate new token

  const room = await Room.findById(req.params.id);

  if (!room) {
    return res.status(404).json({
      success: false,
      message: "Room not found",
    });
  }

  // Validate hotel access and get hotel
  const hotel = await assertHotelAccess(req, room.hotel);

  // Verify ownership/role
  if (hotel.owner.toString() !== req.user._id.toString() &&
      req.user.role?.name !== 'admin' &&
      req.user.role?.name !== 'manager') {
    return res.status(403).json({
      success: false,
      message: "Not authorized to generate QR for this room",
    });
  }

  // Regenerate token if requested (invalidates old QR codes)
  if (regenerate) {
    room.regenerateToken();
  }

  // Generate QR code
  const { qrCodeData, qrCodeImage } = await generateRoomQRCode(room.uniqueToken, room.hotel.toString());
  room.qrCodeData = qrCodeData;
  room.qrCodeImage = qrCodeImage;
  room.isQrActive = true;

  await room.save();

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
  const { hotelId, regenerate } = req.body;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  // Validate hotel access and get hotel
  const hotel = await assertHotelAccess(req, hotelId);

  if (hotel.owner.toString() !== req.user._id.toString() &&
      req.user.role?.name !== 'admin' &&
      req.user.role?.name !== 'manager') {
    return res.status(403).json({
      success: false,
      message: "Not authorized to generate QR codes for this hotel",
    });
  }

  // Get all rooms for the hotel
  const rooms = await Room.find({ hotel: hotelId });

  const results = [];
  const errors = [];

  for (const room of rooms) {
    try {
      // Regenerate token if requested
      if (regenerate) {
        room.regenerateToken();
      }

      // Generate QR code if not exists or regenerating
      if (!room.qrCodeImage || regenerate) {
        const { qrCodeData, qrCodeImage } = await generateRoomQRCode(room.uniqueToken, hotelId);
        room.qrCodeData = qrCodeData;
        room.qrCodeImage = qrCodeImage;
        room.isQrActive = true;
        await room.save();
      }

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
    message: `QR codes generated for ${results.length} rooms`,
    successCount: results.length,
    errorCount: errors.length,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
});

// @desc    Toggle QR code active status
// @route   PATCH /api/rooms/:id/toggle-qr
// @access  Private (Owner, Manager)
export const toggleRoomQR = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);

  if (!room) {
    return res.status(404).json({
      success: false,
      message: "Room not found",
    });
  }

  // Validate hotel access and get hotel
  const hotel = await assertHotelAccess(req, room.hotel);

  if (hotel.owner.toString() !== req.user._id.toString() &&
      req.user.role?.name !== 'admin' &&
      req.user.role?.name !== 'manager') {
    return res.status(403).json({
      success: false,
      message: "Not authorized to modify this room's QR settings",
    });
  }

  room.isQrActive = !room.isQrActive;
  await room.save();

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
  const room = await Room.findById(req.params.id)
    .populate('hotel', 'name');

  if (!room) {
    return res.status(404).json({
      success: false,
      message: "Room not found",
    });
  }

  // Validate hotel access - CRITICAL: was missing before!
  await assertHotelAccess(req, room.hotel._id || room.hotel);

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

  // Validate hotel access and get hotel
  const hotel = await assertHotelAccess(req, hotelId);

  if (hotel.owner.toString() !== req.user._id.toString() &&
      req.user.role?.name !== 'admin' &&
      req.user.role?.name !== 'manager') {
    return res.status(403).json({
      success: false,
      message: "Not authorized to access QR codes for this hotel",
    });
  }

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
  const {
    hotelId,
    roomName,
    roomNumber,
    type,
    price,
    floor,
    maxGuests,
    description,
    amenities,
    images,
    capacity,
    bedType,
    status
  } = req.body;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  // Validate hotel access and get hotel
  const hotel = await assertHotelAccess(req, hotelId);

  // Verify ownership/role
  if (hotel.owner.toString() !== req.user._id.toString() &&
      req.user.role?.name !== 'admin' &&
      req.user.role?.name !== 'manager') {
    return res.status(403).json({
      success: false,
      message: "Not authorized to create rooms for this hotel",
    });
  }

  // Check if room number already exists for this hotel
  const existingRoom = await Room.findOne({ hotel: hotelId, roomNumber });
  if (existingRoom) {
    return res.status(400).json({
      success: false,
      message: `Room number ${roomNumber} already exists for this hotel`,
    });
  }

  // Create room
  const room = await Room.create({
    hotel: hotelId,
    company: hotel.company,
    roomName,
    roomNumber,
    type,
    price,
    floor,
    maxGuests,
    description,
    amenities,
    images,
    capacity,
    bedType,
    status: status || 'available'
  });

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
  const room = await Room.findById(req.params.id);

  if (!room) {
    return res.status(404).json({
      success: false,
      message: "Room not found",
    });
  }

  // Validate hotel access and get hotel
  const hotel = await assertHotelAccess(req, room.hotel);

  // Verify ownership/role
  if (hotel.owner.toString() !== req.user._id.toString() &&
      req.user.role?.name !== 'admin' &&
      req.user.role?.name !== 'manager') {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this room",
    });
  }

  // If room number is being changed, check for duplicates
  if (req.body.roomNumber && req.body.roomNumber !== room.roomNumber) {
    const existingRoom = await Room.findOne({
      hotel: room.hotel,
      roomNumber: req.body.roomNumber,
      _id: { $ne: room._id }
    });
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: `Room number ${req.body.roomNumber} already exists for this hotel`,
      });
    }
  }

  // Update room fields
  const allowedFields = [
    'roomName', 'roomNumber', 'type', 'price', 'floor', 'maxGuests',
    'description', 'amenities', 'images', 'capacity', 'bedType', 'status',
    'rating', 'lastCleaned'
  ];

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      room[field] = req.body[field];
    }
  });

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
  const room = await Room.findById(req.params.id);

  if (!room) {
    return res.status(404).json({
      success: false,
      message: "Room not found",
    });
  }

  // Validate hotel access and get hotel
  const hotel = await assertHotelAccess(req, room.hotel);

  // Verify ownership/role
  if (hotel.owner.toString() !== req.user._id.toString() &&
      req.user.role?.name !== 'admin' &&
      req.user.role?.name !== 'manager') {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this room",
    });
  }

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
  if (!monthRegex.test(month)) {
    return res.status(400).json({
      success: false,
      message: "Invalid month format. Use YYYY-MM (e.g., 2026-05)",
    });
  }

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
