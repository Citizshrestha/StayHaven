import mongoose from "mongoose";
import { Booking } from "../models/booking.schema.js";
import { Room } from "../models/room.schema.js";

/**
 * Conflict Resolution Middleware
 * Prevents overbooking and handles race conditions
 */

/**
 * Check room availability with pessimistic locking
 * Prevents race conditions during booking creation
 */
export const checkRoomAvailability = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const { room, checkIn, checkOut, bookingId } = req.body;

    if (!room || !checkIn || !checkOut) {
      return next(); // Let validation middleware handle missing fields
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Check for overlapping bookings with atomic operation
    const overlappingQuery = {
      room: room,
      status: { $nin: ["Cancelled", "Checked-Out"] },
      $or: [
        { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } }, // Standard overlap
      ],
    };

    // Exclude current booking if updating
    if (bookingId) {
      overlappingQuery._id = { $ne: bookingId };
    }

    const overlappingBookings = await Booking.find(overlappingQuery)
      .select("_id status guestInfo checkIn checkOut")
      .lean();

    if (overlappingBookings.length > 0) {
      // Check if any is currently checked in (true conflict)
      const checkedInBooking = overlappingBookings.find(
        b => b.status === "Checked-In"
      );

      if (checkedInBooking) {
        return res.status(409).json({
          success: false,
          message: "Room is currently occupied",
          conflict: {
            type: "OCCUPIED",
            existingBooking: checkedInBooking._id,
            guestName: checkedInBooking.guestInfo?.name || "Unknown",
            checkOut: checkedInBooking.checkOut,
          },
          suggestion: "Please select a different room or date range.",
        });
      }

      // Has confirmed booking (potential overbooking)
      const confirmedBooking = overlappingBookings.find(
        b => b.status === "Confirmed"
      );

      if (confirmedBooking) {
        return res.status(409).json({
          success: false,
          message: "Room has an existing reservation for these dates",
          conflict: {
            type: "EXISTING_RESERVATION",
            existingBooking: confirmedBooking._id,
            checkIn: confirmedBooking.checkIn,
            checkOut: confirmedBooking.checkOut,
          },
          suggestion: "Please select a different room or modify the dates.",
        });
      }
    }

    // Store availability check result for later use
    req.roomAvailability = {
      room,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      isAvailable: true,
    };

    next();
  } catch (err) {
    console.error("Availability check error:", err);
    return res.status(500).json({
      success: false,
      message: "Error checking room availability",
    });
  }
};

/**
 * Optimistic locking middleware
 * Attaches version check for concurrent update prevention
 */
export const optimisticLock = (modelName) => {
  return async (req, res, next) => {
    const { id } = req.params;
    const { __v } = req.body;

    if (!id) return next();

    try {
      const Model = mongoose.model(modelName);
      const doc = await Model.findById(id).select("__v").lean();

      if (!doc) {
        return res.status(404).json({
          success: false,
          message: `${modelName} not found`,
        });
      }

      // If version provided, check for conflicts
      if (__v !== undefined && doc.__v !== __v) {
        return res.status(409).json({
          success: false,
          message: "Document was modified by another user. Please refresh and try again.",
          conflict: {
            expectedVersion: __v,
            currentVersion: doc.__v,
          },
        });
      }

      // Attach current version to request
      req.documentVersion = doc.__v;
      next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Error checking document version",
      });
    }
  };
};

/**
 * Double-booking prevention for critical operations
 * Uses atomic operations to prevent concurrent check-ins
 */
export const preventDoubleCheckIn = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const { bookingId } = req.params;

    await session.withTransaction(async () => {
      // Lock the booking document
      const booking = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          status: { $in: ["Confirmed", "Pending"] } // Only allow if not already checked in
        },
        {
          $set: {
            _lock: true // Temporary lock flag
          }
        },
        {
          session,
          new: true
        }
      );

      if (!booking) {
        // Check if already checked in
        const existing = await Booking.findById(bookingId).session(session);
        if (existing?.status === "Checked-In") {
          throw new Error("Guest is already checked in");
        }
        throw new Error("Booking not found or cannot be checked in");
      }

      // Check room availability atomically
      if (booking.room) {
        const roomUpdate = await Room.findOneAndUpdate(
          {
            _id: booking.room,
            status: { $ne: "occupied" } // Only if not occupied
          },
          {
            $set: {
              status: "occupied",
              lastOccupiedAt: new Date()
            }
          },
          { session }
        );

        if (!roomUpdate) {
          // Room is occupied - release booking lock
          await Booking.findByIdAndUpdate(
            bookingId,
            { $unset: { _lock: 1 } },
            { session }
          );
          throw new Error("Room is no longer available");
        }
      }

      // Remove lock flag and proceed
      await Booking.findByIdAndUpdate(
        bookingId,
        { $unset: { _lock: 1 } },
        { session }
      );

      req.bookingData = booking;
    });

    next();
  } catch (err) {
    return res.status(409).json({
      success: false,
      message: err.message || "Check-in conflict detected",
    });
  } finally {
    session.endSession();
  }
};

/**
 * Rate limit concurrent operations per room
 * Prevents multiple operations on the same room simultaneously
 */
const roomOperationLocks = new Map();
const LOCK_TIMEOUT = 30000; // 30 seconds

export const roomOperationLock = async (req, res, next) => {
  const { roomId } = req.params || req.body;

  if (!roomId) return next();

  const lockKey = roomId.toString();

  if (roomOperationLocks.has(lockKey)) {
    return res.status(423).json({
      success: false,
      message: "Room is currently being modified by another operation. Please try again.",
    });
  }

  // Acquire lock
  roomOperationLocks.set(lockKey, Date.now());

  // Auto-release after timeout
  setTimeout(() => {
    roomOperationLocks.delete(lockKey);
  }, LOCK_TIMEOUT);

  // Attach release function to response
  res.on("finish", () => {
    roomOperationLocks.delete(lockKey);
  });

  next();
};

/**
 * Booking window validation
 * Prevents bookings outside allowed windows
 */
export const validateBookingWindow = async (req, res, next) => {
  const { checkIn } = req.body;

  if (!checkIn) return next();

  const checkInDate = new Date(checkIn);
  const now = new Date();

  // Configurable booking windows
  const config = {
    minAdvanceBooking: 0, // Same day allowed
    maxAdvanceBooking: 365 * 2, // 2 years in advance
  };

  // Calculate days in advance
  const daysInAdvance = Math.ceil((checkInDate - now) / (1000 * 60 * 60 * 24));

  if (daysInAdvance < config.minAdvanceBooking) {
    return res.status(400).json({
      success: false,
      message: "Check-in date cannot be in the past",
    });
  }

  if (daysInAdvance > config.maxAdvanceBooking) {
    return res.status(400).json({
      success: false,
      message: `Bookings cannot be made more than ${config.maxAdvanceBooking} days in advance`,
    });
  }

  // Weekend/holiday restrictions could be added here

  next();
};

/**
 * Overbooking tolerance check
 * Allows configurable overbooking percentage
 */
export const checkOverbookingTolerance = async (req, res, next) => {
  const { room, checkIn, checkOut } = req.body;

  if (!room) return next();

  try {
    // Get total room inventory
    const totalRooms = await Room.countDocuments({
      _id: room,
      status: { $ne: "maintenance" }
    });

    if (totalRooms === 0) {
      return res.status(400).json({
        success: false,
        message: "Room not available or under maintenance",
      });
    }

    // Count confirmed bookings for the date range
    const confirmedBookings = await Booking.countDocuments({
      room: room,
      status: { $in: ["Confirmed", "Checked-In"] },
      checkIn: { $lt: new Date(checkOut) },
      checkOut: { $gt: new Date(checkIn) },
    });

    // If already at capacity, prevent overbooking
    if (confirmedBookings >= totalRooms) {
      return res.status(409).json({
        success: false,
        message: "Room is fully booked for the selected dates",
        details: {
          totalRooms,
          confirmedBookings,
          available: 0,
        },
      });
    }

    // Attach availability info
    req.availabilityInfo = {
      totalRooms,
      confirmedBookings,
      available: totalRooms - confirmedBookings,
    };

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error checking availability",
    });
  }
};

/**
 * Idempotency key check
 * Prevents duplicate operations
 */
const processedKeys = new Set();
const KEY_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export const idempotencyCheck = async (req, res, next) => {
  const idempotencyKey = req.headers["idempotency-key"] || req.body.idempotencyKey;

  if (!idempotencyKey) return next();

  if (processedKeys.has(idempotencyKey)) {
    return res.status(409).json({
      success: false,
      message: "Duplicate request detected. This operation has already been processed.",
    });
  }

  // Add key and schedule removal
  processedKeys.add(idempotencyKey);
  setTimeout(() => {
    processedKeys.delete(idempotencyKey);
  }, KEY_EXPIRY);

  next();
};

/**
 * Concurrent request limiter per user
 * Prevents a single user from overwhelming the system
 */
const userRequestCounts = new Map();
const USER_REQUEST_WINDOW = 60000; // 1 minute
const USER_REQUEST_LIMIT = 10; // Max 10 concurrent/minute per user

export const userConcurrentLimiter = async (req, res, next) => {
  const userId = req.user?._id?.toString();
  if (!userId) return next();

  const current = userRequestCounts.get(userId) || 0;

  if (current >= USER_REQUEST_LIMIT) {
    return res.status(429).json({
      success: false,
      message: "Too many concurrent requests. Please slow down.",
    });
  }

  userRequestCounts.set(userId, current + 1);

  res.on("finish", () => {
    const newCount = (userRequestCounts.get(userId) || 1) - 1;
    if (newCount <= 0) {
      userRequestCounts.delete(userId);
    } else {
      userRequestCounts.set(userId, newCount);
    }
  });

  // Auto-cleanup after window
  setTimeout(() => {
    userRequestCounts.delete(userId);
  }, USER_REQUEST_WINDOW);

  next();
};
