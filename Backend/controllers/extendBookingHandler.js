/**
 * Extend Booking Handler
 * 
 * Handles booking extension requests with full validation
 * and room availability checking
 */

import { Booking } from "../models/booking.schema.js";
import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emitToHotel, emitToUser } from "../config/socket.js";
import * as Sentry from "@sentry/node";

/**
 * POST /api/guest/portal/bookings/:id/extend
 * Extend an existing booking
 */
export const extendBooking = asyncHandler(async (req, res) => {
  const { id: bookingId } = req.params;
  const { additionalNights } = req.body;
  const userId = req.user._id;

  // Validation
  if (!additionalNights || additionalNights < 1) {
    return res.status(400).json({
      success: false,
      message: "Additional nights must be at least 1",
    });
  }

  if (additionalNights > 30) {
    return res.status(400).json({
      success: false,
      message: "Cannot extend more than 30 nights at once",
    });
  }

  // Find booking
  const booking = await Booking.findOne({
    _id: bookingId,
    user: userId,
  }).populate("room", "roomNumber type pricePerNight")
    .populate("hotel", "name");

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found or access denied",
    });
  }

  // Check booking status
  if (!["Confirmed", "Checked-In"].includes(booking.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot extend booking with status "${booking.status}". Only confirmed or checked-in bookings can be extended.`,
    });
  }

  // Calculate new checkout date
  const currentCheckOut = new Date(booking.checkOut);
  const newCheckOut = new Date(currentCheckOut);
  newCheckOut.setDate(newCheckOut.getDate() + additionalNights);

  // Check if extension goes beyond reasonable limit (1 year)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  if (newCheckOut > maxDate) {
    return res.status(400).json({
      success: false,
      message: "Extension date exceeds maximum allowed period (1 year)",
    });
  }

  // Check room availability for extended period
  const conflictingBookings = await Booking.find({
    room: booking.room._id,
    _id: { $ne: booking._id },
    status: { $in: ["Confirmed", "Checked-In", "Pending"] },
    $or: [
      {
        // New checkout overlaps with existing booking
        checkIn: { $lt: newCheckOut },
        checkOut: { $gt: currentCheckOut },
      },
    ],
  });

  if (conflictingBookings.length > 0) {
    const nextBooking = conflictingBookings[0];
    const maxPossibleNights = Math.floor(
      (new Date(nextBooking.checkIn) - currentCheckOut) / (1000 * 60 * 60 * 24)
    );

    return res.status(409).json({
      success: false,
      message: `Room ${booking.room.roomNumber} is not available for ${additionalNights} additional nights`,
      availableNights: Math.max(0, maxPossibleNights),
      nextBookingStartsAt: nextBooking.checkIn,
    });
  }

  // Calculate additional cost
  const pricePerNight = booking.room.pricePerNight || booking.totalAmount / booking.durationNights || 0;
  const additionalCost = pricePerNight * additionalNights;
  const newTotalAmount = booking.totalAmount + additionalCost;
  const newDurationNights = booking.durationNights + additionalNights;

  // Update booking
  const originalCheckOut = booking.checkOut;
  booking.checkOut = newCheckOut;
  booking.totalAmount = newTotalAmount;
  booking.durationNights = newDurationNights;

  // Add extension note to special requests
  const extensionNote = `Extended by ${additionalNights} night(s) on ${new Date().toLocaleDateString()}. Original checkout: ${new Date(originalCheckOut).toLocaleDateString()}`;
  booking.specialRequests = booking.specialRequests
    ? `${booking.specialRequests}\n\n${extensionNote}`
    : extensionNote;

  await booking.save();

  // Emit real-time notification to hotel staff
  try {
    emitToHotel(booking.hotel._id.toString(), "booking-extended", {
      bookingId: booking._id,
      bookingNumber: booking.bookingId,
      guestName: req.user.fullname,
      roomNumber: booking.room.roomNumber,
      additionalNights,
      newCheckOut,
      additionalCost,
    });

    // Notify guest
    emitToUser(userId.toString(), "booking-extended-confirmed", {
      bookingId: booking._id,
      additionalNights,
      newCheckOut,
      additionalCost,
    });
  } catch (socketError) {
    Sentry.captureException(socketError, {
      tags: { feature: "extend-booking-socket" },
    });
  }

  res.status(200).json({
    success: true,
    message: `Booking extended by ${additionalNights} night(s) successfully`,
    data: {
      booking: {
        _id: booking._id,
        bookingId: booking.bookingId,
        hotel: booking.hotel,
        room: booking.room,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        originalCheckOut,
        durationNights: booking.durationNights,
        totalAmount: booking.totalAmount,
        status: booking.status,
      },
      extension: {
        additionalNights,
        additionalCost,
        pricePerNight,
        newCheckOut,
      },
    },
  });
});

/**
 * GET /api/guest/portal/bookings/:id/extend/availability
 * Check availability for extending a booking
 */
export const checkExtensionAvailability = asyncHandler(async (req, res) => {
  const { id: bookingId } = req.params;
  const { nights } = req.query;
  const userId = req.user._id;

  const requestedNights = parseInt(nights, 10) || 7;

  // Find booking
  const booking = await Booking.findOne({
    _id: bookingId,
    user: userId,
  }).populate("room", "roomNumber type pricePerNight");

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found or access denied",
    });
  }

  // Check booking status
  if (!["Confirmed", "Checked-In"].includes(booking.status)) {
    return res.status(400).json({
      success: false,
      message: "Only confirmed or checked-in bookings can be extended",
      canExtend: false,
    });
  }

  const currentCheckOut = new Date(booking.checkOut);

  // Find next booking for this room
  const nextBooking = await Booking.findOne({
    room: booking.room._id,
    _id: { $ne: booking._id },
    status: { $in: ["Confirmed", "Checked-In", "Pending"] },
    checkIn: { $gte: currentCheckOut },
  }).sort({ checkIn: 1 });

  let maxAvailableNights = 365; // Default max 1 year
  let blockedBy = null;

  if (nextBooking) {
    const daysUntilNextBooking = Math.floor(
      (new Date(nextBooking.checkIn) - currentCheckOut) / (1000 * 60 * 60 * 24)
    );
    maxAvailableNights = Math.max(0, daysUntilNextBooking);
    blockedBy = {
      checkIn: nextBooking.checkIn,
      bookingId: nextBooking.bookingId,
    };
  }

  const canExtend = maxAvailableNights > 0;
  const requestedAvailable = requestedNights <= maxAvailableNights;

  // Calculate pricing
  const pricePerNight = booking.room.pricePerNight || booking.totalAmount / booking.durationNights || 0;
  const suggestedNights = Math.min(requestedNights, maxAvailableNights);
  const estimatedCost = pricePerNight * suggestedNights;

  res.status(200).json({
    success: true,
    data: {
      canExtend,
      maxAvailableNights,
      requestedNights,
      requestedAvailable,
      suggestedNights,
      pricePerNight,
      estimatedCost,
      currentCheckOut: booking.checkOut,
      blockedBy,
      room: {
        roomNumber: booking.room.roomNumber,
        type: booking.room.type,
      },
    },
  });
});
