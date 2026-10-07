/**
 * guestMessagingController.js
 *
 * Guest-facing chat. A logged-in guest can message the property through two
 * intent channels:
 *   - "reception"    → front desk (receptionist / manager)
 *   - "room-service" → dining team (waiter / chef), reception copied in
 *
 * Design decisions:
 *  - hotelId is ALWAYS resolved server-side from the guest's active booking.
 *    The client never supplies it — a guest can only ever talk to the hotel
 *    they are actually staying at.
 *  - Each guest-facing message stores `guestUser` (the guest) so staff and the
 *    guest share one scoped thread per channel without a fragile DM handshake.
 *  - Delivery reuses the same socket rooms + notification fan-out as staff
 *    messaging (see messagingController) so receptionists/waiters see guest
 *    messages in their existing MessagingPanel with zero extra wiring.
 */

import mongoose from "mongoose";
import { Message } from "../models/message.schema.js";
import { Booking } from "../models/booking.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getIO } from "../config/socket.js";
import { createNotificationInternal } from "./notificationController.js";
import {
  GUEST_CHANNELS,
  getChannelRooms,
  getChannelTargetRoles,
} from "./messagingController.js";
import { User } from "../models/user.schema.js";

const MAX_CONTENT_LENGTH = 2000;

/**
 * Resolve the guest's active hotel + room from their current booking.
 * Returns { hotelId, roomNumber } or null when the guest has no active stay.
 */
const resolveGuestContext = async (userId) => {
  const booking = await Booking.findOne({
    user: userId,
    status: { $in: ["Confirmed", "Checked-In"] },
  })
    .sort({ checkIn: 1 })
    .populate("room", "roomNumber")
    .lean();

  if (!booking) return null;
  return {
    hotelId: booking.hotel?.toString?.() || booking.hotel,
    roomNumber: booking.room?.roomNumber || null,
  };
};

const CHANNEL_LABEL = { reception: "Front Desk", "room-service": "Room Service" };

/**
 * GET /api/v1/guest/portal/messages/context
 * Lightweight endpoint so the chat UI knows whether chat is available
 * (active booking) and which hotel/room it is scoped to.
 */
export const getGuestChatContext = asyncHandler(async (req, res) => {
  const ctx = await resolveGuestContext(req.user._id);
  return res.status(200).json({
    success: true,
    data: {
      available: !!ctx,
      hotelId: ctx?.hotelId || null,
      roomNumber: ctx?.roomNumber || null,
      channels: GUEST_CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABEL[c] || c })),
    },
  });
});

/**
 * GET /api/v1/guest/portal/messages?channel=reception&limit=50&before=<iso>
 * Fetch the guest's own thread for a channel (only their guestUser messages).
 */
export const getGuestMessages = asyncHandler(async (req, res) => {
  const { channel, limit = 50, before } = req.query;

  if (!GUEST_CHANNELS.includes(channel)) {
    return res.status(400).json({ success: false, message: "Invalid channel" });
  }

  const ctx = await resolveGuestContext(req.user._id);
  if (!ctx) {
    // No active stay → no thread, but respond 200 with empty list so the UI
    // can render the "no active booking" state cleanly.
    return res.status(200).json({ success: true, count: 0, data: [] });
  }

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

  const query = {
    hotel: ctx.hotelId,
    channel,
    guestUser: req.user._id,
    isDeleted: { $ne: true },
  };
  if (before) {
    const beforeDate = new Date(before);
    if (!Number.isNaN(beforeDate.getTime())) query.createdAt = { $lt: beforeDate };
  }

  const messages = await Message.find(query)
    .populate("sender", "fullname companyRole role profilePicture")
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();

  messages.reverse();

  return res.status(200).json({ success: true, count: messages.length, data: messages });
});

/**
 * POST /api/v1/guest/portal/messages
 * Body: { channel, content }
 * Sends a guest message on an intent channel to the right staff.
 */
export const sendGuestMessage = asyncHandler(async (req, res) => {
  const { channel } = req.body;
  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";

  if (!GUEST_CHANNELS.includes(channel)) {
    return res.status(400).json({ success: false, message: "Invalid channel" });
  }
  if (!content) {
    return res.status(400).json({ success: false, message: "Message content is required" });
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return res.status(400).json({ success: false, message: `Message must be ${MAX_CONTENT_LENGTH} characters or fewer` });
  }

  const ctx = await resolveGuestContext(req.user._id);
  if (!ctx) {
    return res.status(409).json({
      success: false,
      message: "You need an active booking to message the property.",
      code: "NO_ACTIVE_BOOKING",
    });
  }

  const message = await Message.create({
    hotel: ctx.hotelId,
    sender: req.user._id,
    recipient: null,
    channel,
    guestUser: req.user._id,
    content,
    messageType: "text",
    roomNumber: ctx.roomNumber,
  });

  await message.populate("sender", "fullname companyRole role profilePicture");

  const payload = {
    _id: message._id,
    hotel: ctx.hotelId,
    sender: {
      _id: message.sender._id,
      fullname: message.sender.fullname,
      role: message.sender.companyRole || message.sender.role?.name || "guest",
      profilePicture: message.sender.profilePicture || null,
    },
    guestUser: req.user._id,
    channel: message.channel,
    content: message.content,
    messageType: message.messageType,
    roomNumber: message.roomNumber,
    createdAt: message.createdAt,
  };

  // Deliver to the staff role rooms for this channel, and echo to the guest's
  // own personal room so their other devices/tabs stay in sync.
  const io = getIO();
  if (io) {
    getChannelRooms(ctx.hotelId, channel).forEach((room) =>
      io.to(room).emit("new-message", payload)
    );
    io.to(`user-${req.user._id}`).emit("new-message", payload);
  }

  // In-app notifications for the target staff (best-effort, non-blocking).
  (async () => {
    try {
      const roles = getChannelTargetRoles(channel);
      if (!roles.length) return;
      const recipients = await User.find({
        assignedProperties: ctx.hotelId,
        companyRole: { $in: roles },
        isActive: true,
      }).select("_id");
      const preview = content.length > 60 ? content.slice(0, 60) + "..." : content;
      const label = CHANNEL_LABEL[channel] || channel;
      await Promise.all(
        recipients.map((r) =>
          createNotificationInternal({
            userId: r._id,
            senderId: req.user._id,
            type: "message",
            title: `${message.sender.fullname} · ${label}`,
            message: preview,
            priority: channel === "room-service" ? "high" : "medium",
            payload: { channel, messageId: String(message._id), guestUser: String(req.user._id) },
          })
        )
      );
    } catch (err) {
      console.error("[sendGuestMessage] notify failed:", err.message);
    }
  })();

  return res.status(201).json({ success: true, message: "Message sent", data: message });
});

/**
 * PUT /api/v1/guest/portal/messages/read
 * Body: { channel }
 * Mark staff→guest messages in a channel as read (for this guest's thread).
 */
export const markGuestMessagesRead = asyncHandler(async (req, res) => {
  const { channel } = req.body;
  if (!GUEST_CHANNELS.includes(channel)) {
    return res.status(400).json({ success: false, message: "Invalid channel" });
  }

  const ctx = await resolveGuestContext(req.user._id);
  if (!ctx) return res.status(200).json({ success: true, modifiedCount: 0 });

  const filter = {
    hotel: ctx.hotelId,
    channel,
    guestUser: req.user._id,
    sender: { $ne: req.user._id }, // only inbound (staff) messages
    isRead: false,
  };

  // Collect ids first so staff clients can flip exactly these to "read".
  const unread = await Message.find(filter).select("_id").lean();
  if (unread.length === 0) {
    return res.status(200).json({ success: true, modifiedCount: 0 });
  }
  const messageIds = unread.map((m) => String(m._id));

  const result = await Message.updateMany(
    { _id: { $in: messageIds } },
    { $set: { isRead: true, readAt: new Date() } }
  );

  // Read receipts (blue ticks) for every staff role room on this channel.
  // Payload shape matches the staff MessagingPanel handler: { messageIds, readBy }.
  const io = getIO();
  if (io) {
    const payload = { messageIds, readBy: String(req.user._id), channel, guestUser: String(req.user._id) };
    getChannelRooms(ctx.hotelId, channel).forEach((room) => io.to(room).emit("messages-read", payload));
  }

  return res.status(200).json({ success: true, modifiedCount: result.modifiedCount });
});

/**
 * GET /api/v1/guest/portal/messages/unread-count
 * Total unread staff→guest messages across guest channels (for nav badge).
 */
export const getGuestUnreadCount = asyncHandler(async (req, res) => {
  const ctx = await resolveGuestContext(req.user._id);
  if (!ctx) return res.status(200).json({ success: true, data: { total: 0, byChannel: {} } });

  const rows = await Message.aggregate([
    {
      $match: {
        hotel: new mongoose.Types.ObjectId(ctx.hotelId),
        guestUser: new mongoose.Types.ObjectId(req.user._id),
        sender: { $ne: new mongoose.Types.ObjectId(req.user._id) },
        isRead: false,
        isDeleted: { $ne: true },
      },
    },
    { $group: { _id: "$channel", count: { $sum: 1 } } },
  ]);

  const byChannel = {};
  let total = 0;
  rows.forEach((r) => {
    byChannel[r._id] = r.count;
    total += r.count;
  });

  return res.status(200).json({ success: true, data: { total, byChannel } });
});
