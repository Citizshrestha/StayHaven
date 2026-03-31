import mongoose from "mongoose";
import { Booking } from "../models/booking.schema.js";
import { Room } from "../models/room.schema.js";
import { Guest } from "../models/guest.schema.js";
import { Invoice } from "../models/invoice.schema.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { ActivityLog } from "../models/activityLog.schema.js";
import { emitToHotel } from "../config/socket.js";

// Helper: get context from request
const getCtx = (req) => {
  const user = req.user;
  const hotel = req._scopedHotelId || req.query.hotelId || user?.assignedProperties?.[0]?._id;
  const company = req.query.companyId || user?.company?._id || user?.company;
  return { hotel, company, userId: user?._id, userName: user?.fullname };
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
    /* silently ignore */
  }
};

/**
 * Bulk Check-In
 * Process multiple bookings for check-in with optimistic locking
 */
export const bulkCheckIn = async (req, res) => {
  const session = await mongoose.startSession();
  const results = { success: [], failed: [] };

  try {
    const { hotel, company, userId, userName } = getCtx(req);
    const { bookingIds, expectedVersions } = req.body;

    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({ success: false, message: "bookingIds array is required" });
    }

    if (bookingIds.length > 50) {
      return res.status(400).json({ success: false, message: "Maximum 50 bookings can be processed at once" });
    }

    const versionMap = expectedVersions || {};

    await session.withTransaction(async () => {
      for (const bookingId of bookingIds) {
        try {
          const booking = await Booking.findById(bookingId)
            .populate("room")
            .populate("guest")
            .session(session);

          if (!booking) {
            results.failed.push({ bookingId, reason: "Booking not found" });
            continue;
          }

          // Property scope check
          if (hotel && booking.hotel.toString() !== hotel.toString()) {
            results.failed.push({ bookingId, reason: "Booking does not belong to your property" });
            continue;
          }

          // Optimistic locking
          if (versionMap[bookingId] !== undefined && booking.__v !== versionMap[bookingId]) {
            results.failed.push({ bookingId, reason: "Booking was modified by another user" });
            continue;
          }

          // Check if already checked in
          if (booking.status === "Checked-In") {
            results.failed.push({ bookingId, reason: "Already checked in" });
            continue;
          }

          // Check if booking is confirmed/pending
          if (!["Confirmed", "Pending"].includes(booking.status)) {
            results.failed.push({ bookingId, reason: `Cannot check in booking with status: ${booking.status}` });
            continue;
          }

          // Check for conflicting room occupancy
          if (booking.room) {
            const roomStatus = await Room.findById(booking.room._id).select("status").session(session);
            if (roomStatus?.status === "occupied") {
              // Check if occupied by another active booking
              const conflictingBooking = await Booking.findOne({
                room: booking.room._id,
                status: "Checked-In",
                _id: { $ne: booking._id },
              }).session(session);

              if (conflictingBooking) {
                results.failed.push({ bookingId, reason: `Room ${booking.room?.roomNumber} is already occupied` });
                continue;
              }
            }
          }

          // Perform check-in
          booking.status = "Checked-In";
          await booking.save({ session });

          // Update room status
          if (booking.room) {
            await Room.findByIdAndUpdate(booking.room._id, { status: "occupied" }, { session });
          }

          // Update guest status
          if (booking.guest) {
            await Guest.findByIdAndUpdate(
              booking.guest._id || booking.guest,
              {
                status: "In-House",
                currentBooking: booking._id,
                currentRoom: booking.room?.roomNumber,
              },
              { session }
            );
          }

          results.success.push({
            bookingId,
            bookingRef: booking.bookingId,
            guestName: booking.guest?.fullName || booking.guestInfo?.name,
            roomNumber: booking.room?.roomNumber,
          });
        } catch (err) {
          results.failed.push({ bookingId, reason: err.message });
        }
      }
    });

    // Log bulk activity
    if (results.success.length > 0) {
      await logActivity({
        hotel,
        company,
        entityType: "batch",
        entityId: "bulk-checkin",
        action: "bulk-check-in",
        description: `Bulk check-in completed: <strong>${results.success.length}</strong> guests checked in (${results.failed.length} failed)`,
        icon: "Users",
        color: "#10b981",
        actor: userId,
        actorName: userName,
        metadata: { successCount: results.success.length, failedCount: results.failed.length },
      });

      // Emit updates for each successful booking
      for (const item of results.success) {
        emitToHotel(hotel?.toString(), "booking-update", { type: "check-in", bookingId: item.bookingId });
      }
    }

    res.json({
      success: true,
      message: `Bulk check-in: ${results.success.length} successful, ${results.failed.length} failed`,
      data: results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Bulk Check-Out
 * Process multiple bookings for check-out
 */
export const bulkCheckOut = async (req, res) => {
  const session = await mongoose.startSession();
  const results = { success: [], failed: [] };

  try {
    const { hotel, company, userId, userName } = getCtx(req);
    const { bookingIds, expectedVersions, skipUnpaid = false } = req.body;

    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({ success: false, message: "bookingIds array is required" });
    }

    if (bookingIds.length > 50) {
      return res.status(400).json({ success: false, message: "Maximum 50 bookings can be processed at once" });
    }

    const versionMap = expectedVersions || {};

    await session.withTransaction(async () => {
      for (const bookingId of bookingIds) {
        try {
          const booking = await Booking.findById(bookingId)
            .populate("room")
            .populate("guest")
            .session(session);

          if (!booking) {
            results.failed.push({ bookingId, reason: "Booking not found" });
            continue;
          }

          // Property scope check
          if (hotel && booking.hotel.toString() !== hotel.toString()) {
            results.failed.push({ bookingId, reason: "Booking does not belong to your property" });
            continue;
          }

          // Optimistic locking
          if (versionMap[bookingId] !== undefined && booking.__v !== versionMap[bookingId]) {
            results.failed.push({ bookingId, reason: "Booking was modified by another user" });
            continue;
          }

          // Check if already checked out
          if (booking.status === "Checked-Out") {
            results.failed.push({ bookingId, reason: "Already checked out" });
            continue;
          }

          // Check if checked in
          if (booking.status !== "Checked-In") {
            results.failed.push({ bookingId, reason: `Cannot check out booking with status: ${booking.status}` });
            continue;
          }

          // Check payment status
          if (!skipUnpaid && booking.paymentStatus !== "paid") {
            results.failed.push({
              bookingId,
              reason: `Outstanding balance: ${booking.totalAmount}. Payment required before checkout.`,
              requiresPayment: true,
              balance: booking.totalAmount,
            });
            continue;
          }

          // Perform check-out
          booking.status = "Checked-Out";
          await booking.save({ session });

          // Update room status
          if (booking.room) {
            await Room.findByIdAndUpdate(booking.room._id, { status: "cleaning" }, { session });
          }

          // Update guest status
          if (booking.guest) {
            await Guest.findByIdAndUpdate(
              booking.guest._id || booking.guest,
              {
                status: "Checked-Out",
                currentBooking: null,
                currentRoom: null,
                $inc: { totalStays: 1, totalSpent: booking.totalAmount || 0 },
              },
              { session }
            );
          }

          results.success.push({
            bookingId,
            bookingRef: booking.bookingId,
            guestName: booking.guest?.fullName || booking.guestInfo?.name,
            roomNumber: booking.room?.roomNumber,
          });
        } catch (err) {
          results.failed.push({ bookingId, reason: err.message });
        }
      }
    });

    // Log bulk activity
    if (results.success.length > 0) {
      await logActivity({
        hotel,
        company,
        entityType: "batch",
        entityId: "bulk-checkout",
        action: "bulk-check-out",
        description: `Bulk check-out completed: <strong>${results.success.length}</strong> guests checked out (${results.failed.length} failed)`,
        icon: "LogOut",
        color: "#f97316",
        actor: userId,
        actorName: userName,
        metadata: { successCount: results.success.length, failedCount: results.failed.length },
      });

      for (const item of results.success) {
        emitToHotel(hotel?.toString(), "booking-update", { type: "check-out", bookingId: item.bookingId });
      }
    }

    res.json({
      success: true,
      message: `Bulk check-out: ${results.success.length} successful, ${results.failed.length} failed`,
      data: results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Bulk Payment Marking
 * Mark multiple bookings/invoices as paid
 */
export const bulkMarkPayment = async (req, res) => {
  const session = await mongoose.startSession();
  const results = { success: [], failed: [] };

  try {
    const { hotel, company, userId, userName } = getCtx(req);
    const { items, method = "cash", reference, notes } = req.body;

    // items: [{ bookingId, amount }, ...]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "items array is required" });
    }

    if (items.length > 50) {
      return res.status(400).json({ success: false, message: "Maximum 50 payments can be processed at once" });
    }

    await session.withTransaction(async () => {
      for (const item of items) {
        const { bookingId, amount } = item;

        try {
          if (!bookingId || !amount || amount <= 0) {
            results.failed.push({ bookingId, reason: "Invalid bookingId or amount" });
            continue;
          }

          const booking = await Booking.findById(bookingId)
            .populate("guest")
            .session(session);

          if (!booking) {
            results.failed.push({ bookingId, reason: "Booking not found" });
            continue;
          }

          // Property scope check
          if (hotel && booking.hotel.toString() !== hotel.toString()) {
            results.failed.push({ bookingId, reason: "Booking does not belong to your property" });
            continue;
          }

          // Calculate total paid so far
          const previousPayments = await PaymentTransaction.aggregate([
            {
              $match: {
                booking: booking._id,
                type: "capture",
                status: { $in: ["captured", "settled"] },
              },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]).session(session);

          const totalPaid = (previousPayments[0]?.total || 0) + amount;

          // Create payment transaction
          const txn = await PaymentTransaction.create([{
            hotel: booking.hotel,
            company: booking.company,
            booking: booking._id,
            guest: booking.guest?._id,
            type: "capture",
            amount,
            method,
            reference,
            notes,
            status: "captured",
            processedBy: userId,
            processedByName: userName,
          }], { session });

          // Update booking payment status
          booking.paymentStatus = totalPaid >= booking.totalAmount ? "paid" : "partial";
          await booking.save({ session });

          // Update invoice if exists
          await Invoice.updateOne(
            { booking: booking._id },
            {
              $inc: { paid: amount },
              $set: {
                status: totalPaid >= booking.totalAmount ? "paid" : "partial",
                balance: Math.max(0, booking.totalAmount - totalPaid),
                paymentMethod: method,
                paidAt: totalPaid >= booking.totalAmount ? new Date() : null,
              },
            },
            { session }
          );

          results.success.push({
            bookingId,
            bookingRef: booking.bookingId,
            amount,
            totalPaid,
            remainingBalance: Math.max(0, booking.totalAmount - totalPaid),
            status: booking.paymentStatus,
            transactionId: txn[0].transactionId,
          });
        } catch (err) {
          results.failed.push({ bookingId, reason: err.message });
        }
      }
    });

    // Log bulk activity
    if (results.success.length > 0) {
      const totalAmount = results.success.reduce((sum, r) => sum + r.amount, 0);
      await logActivity({
        hotel,
        company,
        entityType: "batch",
        entityId: "bulk-payment",
        action: "bulk-payment",
        description: `Bulk payment: <strong>${results.success.length}</strong> payments processed (${results.failed.length} failed), total: ${totalAmount.toFixed(2)}`,
        icon: "CreditCard",
        color: "#10b981",
        actor: userId,
        actorName: userName,
        metadata: {
          successCount: results.success.length,
          failedCount: results.failed.length,
          totalAmount,
        },
      });

      emitToHotel(hotel?.toString(), "payment-update", { type: "bulk-payment", results: results.success });
    }

    res.json({
      success: true,
      message: `Bulk payment: ${results.success.length} successful, ${results.failed.length} failed`,
      data: results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Bulk Update Booking Status
 * Update status for multiple bookings (e.g., mark as no-show)
 */
export const bulkUpdateStatus = async (req, res) => {
  const session = await mongoose.startSession();
  const results = { success: [], failed: [] };

  try {
    const { hotel, company, userId, userName } = getCtx(req);
    const { bookingIds, newStatus, reason } = req.body;

    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({ success: false, message: "bookingIds array is required" });
    }

    if (!newStatus) {
      return res.status(400).json({ success: false, message: "newStatus is required" });
    }

    const validStatuses = ["Confirmed", "Pending", "Cancelled", "No-Show"];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    await session.withTransaction(async () => {
      for (const bookingId of bookingIds) {
        try {
          const booking = await Booking.findById(bookingId).session(session);

          if (!booking) {
            results.failed.push({ bookingId, reason: "Booking not found" });
            continue;
          }

          // Property scope check
          if (hotel && booking.hotel.toString() !== hotel.toString()) {
            results.failed.push({ bookingId, reason: "Booking does not belong to your property" });
            continue;
          }

          // Don't allow changing Checked-In/Checked-Out via bulk
          if (["Checked-In", "Checked-Out"].includes(booking.status)) {
            results.failed.push({ bookingId, reason: `Cannot change status from ${booking.status} via bulk update` });
            continue;
          }

          const oldStatus = booking.status;
          booking.status = newStatus;

          if (newStatus === "Cancelled" || newStatus === "No-Show") {
            booking.cancellationReason = reason;
            booking.cancelledAt = new Date();
            booking.cancelledBy = userId;

            // Free up the room
            if (booking.room) {
              await Room.findByIdAndUpdate(booking.room, { status: "available" }, { session });
            }
          }

          await booking.save({ session });

          results.success.push({ bookingId, oldStatus, newStatus });
        } catch (err) {
          results.failed.push({ bookingId, reason: err.message });
        }
      }
    });

    // Log activity
    if (results.success.length > 0) {
      await logActivity({
        hotel,
        company,
        entityType: "batch",
        entityId: "bulk-status-update",
        action: "bulk-status-update",
        description: `Bulk status update: <strong>${results.success.length}</strong> bookings marked as ${newStatus}`,
        icon: "RefreshCw",
        color: "#3b82f6",
        actor: userId,
        actorName: userName,
      });
    }

    res.json({
      success: true,
      message: `Bulk status update: ${results.success.length} successful, ${results.failed.length} failed`,
      data: results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Bulk Room Status Update
 */
export const bulkUpdateRoomStatus = async (req, res) => {
  const session = await mongoose.startSession();
  const results = { success: [], failed: [] };

  try {
    const { hotel, company, userId, userName } = getCtx(req);
    const { roomIds, newStatus, reason } = req.body;

    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      return res.status(400).json({ success: false, message: "roomIds array is required" });
    }

    if (!newStatus) {
      return res.status(400).json({ success: false, message: "newStatus is required" });
    }

    const validStatuses = ["available", "maintenance", "cleaning"];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    // Check for occupied rooms with active bookings
    const occupiedRooms = await Booking.find({
      room: { $in: roomIds },
      status: "Checked-In",
    }).distinct("room");

    const occupiedRoomSet = new Set(occupiedRooms.map(r => r.toString()));

    await session.withTransaction(async () => {
      for (const roomId of roomIds) {
        try {
          const room = await Room.findById(roomId).session(session);

          if (!room) {
            results.failed.push({ roomId, reason: "Room not found" });
            continue;
          }

          // Property scope check
          if (hotel && room.hotel.toString() !== hotel.toString()) {
            results.failed.push({ roomId, reason: "Room does not belong to your property" });
            continue;
          }

          // Don't change occupied rooms
          if (occupiedRoomSet.has(roomId.toString())) {
            results.failed.push({ roomId, reason: "Room is currently occupied by a guest" });
            continue;
          }

          const oldStatus = room.status;
          room.status = newStatus;

          if (newStatus === "available") {
            room.lastCleaned = new Date();
          }

          await room.save({ session });

          results.success.push({ roomId, roomNumber: room.roomNumber, oldStatus, newStatus });
        } catch (err) {
          results.failed.push({ roomId, reason: err.message });
        }
      }
    });

    // Log activity and emit updates
    if (results.success.length > 0) {
      await logActivity({
        hotel,
        company,
        entityType: "batch",
        entityId: "bulk-room-update",
        action: "bulk-room-status-update",
        description: `Bulk room update: <strong>${results.success.length}</strong> rooms marked as ${newStatus}`,
        icon: "Home",
        color: "#8b5cf6",
        actor: userId,
        actorName: userName,
      });

      for (const item of results.success) {
        emitToHotel(hotel?.toString(), "room-update", { roomId: item.roomId, status: newStatus });
      }
    }

    res.json({
      success: true,
      message: `Bulk room update: ${results.success.length} successful, ${results.failed.length} failed`,
      data: results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Get bulk operation status/history
 */
export const getBulkOperationStatus = async (req, res) => {
  // This would typically query a bulk operations collection
  // For now, return a placeholder
  res.json({
    success: true,
    message: "Bulk operation status tracking",
    data: {
      note: "Bulk operations are processed synchronously. Use the response to track individual item status.",
    },
  });
};
