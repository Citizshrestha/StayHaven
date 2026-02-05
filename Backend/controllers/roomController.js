import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateRoomQRCode } from "../utils/qrGenerator.js";

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
  const room = await Room.findById(req.params.id)
    .populate('hotel', 'name location');

  if (!room) {
    return res.status(404).json({
      success: false,
      message: "Room not found",
    });
  }

  res.status(200).json({
    success: true,
    room,
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

  // Verify ownership
  const hotel = await Hotel.findById(room.hotel);
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

  // Verify hotel ownership
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found",
    });
  }

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

  // Verify ownership
  const hotel = await Hotel.findById(room.hotel);
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

  // Verify hotel ownership
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found",
    });
  }

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
