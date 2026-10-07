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
import mongoose from 'mongoose';
import { activeReservationFilter } from '../services/bookingAvailability.js';
import { updateStayCharges } from '../services/bookingCharges.js';

/**
 * POST /api/guest/portal/bookings/:id/extend
 * Extend an existing booking
 */
export const extendBooking = asyncHandler(async (req, res) => {
  const { id: bookingId } = req.params;
  const { additionalNights } = req.body;
  const userId = req.user._id;

  // Validation
  if (!Number.isInteger(additionalNights) || additionalNights < 1) {
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
  const session = await mongoose.startSession();
  let booking, currentCheckOut, newCheckOut, pricePerNight, additionalCost, originalCheckOut;
  try {
  await session.withTransaction(async () => {
  booking = await Booking.findOne({
    _id: bookingId,
    user: userId,
  }).populate("room", "roomNumber type price")
    .populate("hotel", "name").session(session);

  if (!booking) {
    throw Object.assign(new Error('Booking not found or access denied'), { status: 404 });
  }

  // Check booking status
  if (!["Confirmed", "Checked-In"].includes(booking.status)) {
    throw Object.assign(new Error('Only confirmed or checked-in bookings can be extended'), { status: 400 });
  }

  // Calculate new checkout date
  if (!booking.room || !booking.hotel || booking.checkOut <= new Date()) {
    throw Object.assign(new Error('This stay can no longer be extended'), { status: 400 });
  }
  await Room.updateOne({ _id: booking.room._id }, { $inc: { reservationVersion: 1 } }, { session });
  currentCheckOut = new Date(booking.checkOut);
  newCheckOut = new Date(currentCheckOut);
  newCheckOut.setDate(newCheckOut.getDate() + additionalNights);

  // Check if extension goes beyond reasonable limit (1 year)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  if (newCheckOut > maxDate) {
    throw Object.assign(new Error('Extension exceeds the maximum allowed period'), { status: 400 });
  }

  // Check room availability for extended period
  const conflictingBookings = await Booking.find({
    room: booking.room._id,
    _id: { $ne: booking._id },
    ...activeReservationFilter(),
        // New checkout overlaps with existing booking
        checkIn: { $lt: newCheckOut },
        checkOut: { $gt: currentCheckOut },
  }).sort({ checkIn: 1 }).session(session);

  if (conflictingBookings.length > 0) {
    const nextBooking = conflictingBookings[0];
    const maxPossibleNights = Math.floor(
      (new Date(nextBooking.checkIn) - currentCheckOut) / (1000 * 60 * 60 * 24)
    );

    throw Object.assign(new Error(`Room is available for only ${Math.max(0, maxPossibleNights)} additional nights`), { status: 409 });
  }

  // Calculate additional cost
  pricePerNight = booking.totalAmount / booking.durationNights || booking.room.price;
  additionalCost = Math.round(pricePerNight * additionalNights * 100) / 100;
  const newTotalAmount = booking.totalAmount + additionalCost;
  const newDurationNights = booking.durationNights + additionalNights;

  // Update booking
  originalCheckOut = booking.checkOut;
  booking.checkOut = newCheckOut;
  await updateStayCharges(booking, newTotalAmount, session);
  booking.durationNights = newDurationNights;

  // Add extension note to special requests
  const extensionNote = `Extended by ${additionalNights} night(s) on ${new Date().toLocaleDateString()}. Original checkout: ${new Date(originalCheckOut).toLocaleDateString()}`;
  booking.specialRequests = (booking.specialRequests
    ? `${booking.specialRequests}\n\n${extensionNote}`
    : extensionNote).slice(-500);

  await booking.save({ session });
  });
  } finally {
    await session.endSession();
  }

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

  const requestedNights = nights === undefined ? 7 : Number(nights);
  if (!Number.isInteger(requestedNights) || requestedNights < 1 || requestedNights > 30) {
    return res.status(400).json({ success: false, message: 'Nights must be an integer from 1 to 30' });
  }

  // Find booking
  const booking = await Booking.findOne({
    _id: bookingId,
    user: userId,
  }).populate("room", "roomNumber type price");

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found or access denied",
    });
  }

  // Check booking status
  if (!["Confirmed", "Checked-In"].includes(booking.status) || !booking.room || booking.checkOut <= new Date()) {
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
    ...activeReservationFilter(),
    checkOut: { $gt: currentCheckOut },
  }).sort({ checkIn: 1 });

  let maxAvailableNights = Math.max(0, Math.min(30, Math.floor((Date.now() + 365 * 86400000 - currentCheckOut) / 86400000)));
  let blockedBy = null;

  if (nextBooking) {
    const daysUntilNextBooking = Math.floor(
      (new Date(nextBooking.checkIn) - currentCheckOut) / (1000 * 60 * 60 * 24)
    );
    maxAvailableNights = Math.min(maxAvailableNights, Math.max(0, daysUntilNextBooking));
    blockedBy = {
      checkIn: nextBooking.checkIn,
    };
  }

  const canExtend = maxAvailableNights > 0;
  const requestedAvailable = requestedNights <= maxAvailableNights;

  // Calculate pricing
  const pricePerNight = booking.totalAmount / booking.durationNights || booking.room.price;
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
