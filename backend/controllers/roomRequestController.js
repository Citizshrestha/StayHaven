/**
 * roomRequestController.js — service requests raised from an anonymous ROOM
 * QR scan (housekeeping, amenities, maintenance, concierge, late checkout).
 *
 * Requests land in the same GuestRequest queue reception already works from
 * (dashboard → assign / ignore / resolve), are announced in real time to the
 * staff who can act on them, and report status back to the phone that raised
 * them via its guest-session socket room.
 *
 * Routes (public, mounted under /api/v1/guest):
 *   POST /room-request
 *   GET  /room/:token/requests?guestSessionId=
 */

import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { Booking } from "../models/booking.schema.js";
import { GuestRequest } from "../models/guestRequest.schema.js";
import { User } from "../models/user.schema.js";
import { Role } from "../models/role.schema.js";
import { emitToHotelStaff, emitToGuestSession } from "../config/socket.js";
import { createNotificationInternal } from "./notificationController.js";

export const ROOM_REQUEST_KINDS = {
  housekeeping: { label: "Room cleaning", category: "Amenities", roles: ["receptionist", "housekeeping"] },
  amenities: { label: "Towels / toiletries", category: "Amenities", roles: ["receptionist", "housekeeping"] },
  maintenance: { label: "Something needs fixing", category: "Maintenance", roles: ["receptionist", "maintenance"] },
  concierge: { label: "Front desk / concierge", category: "Other", roles: ["receptionist"] },
  checkout: { label: "Late checkout", category: "Checkout", roles: ["receptionist"] },
};

const SLA_MINUTES = { urgent: 15, medium: 30, low: 60 };
const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;
const SESSION_PATTERN = /^GUEST-[0-9a-fA-F-]{32,50}$/;
const GUEST_HISTORY_MS = 24 * 60 * 60 * 1000;

const toGuestShape = (r) => ({
  _id: r._id,
  kind: r.kind,
  label: ROOM_REQUEST_KINDS[r.kind]?.label || r.category,
  description: r.description,
  urgency: r.urgency,
  status: r.status,
  createdAt: r.createdAt,
  resolvedAt: r.resolvedAt || null,
});

const findRecipients = async (hotelId, roleNames) => {
  const roles = await Role.find({ name: { $in: roleNames } }).select("_id").lean();
  return User.find({
    assignedProperties: hotelId,
    isActive: { $ne: false },
    $or: [{ companyRole: { $in: roleNames } }, { role: { $in: roles.map((r) => r._id) } }],
  }).select("_id").lean();
};

const announce = async (hotelId, request) => {
  const kind = ROOM_REQUEST_KINDS[request.kind];
  const title = `Room ${request.roomNumber}: ${kind?.label || "Request"}`.slice(0, 100);
  const message = `${request.urgency === "urgent" ? "URGENT · " : ""}${request.description}${request.verifiedStay === false ? " (no checked-in booking found)" : ""}`.slice(0, 500);
  try {
    emitToHotelStaff(String(hotelId), "new-guest-request", { request, message: title });
  } catch {
    /* best-effort */
  }
  try {
    const recipients = await findRecipients(hotelId, kind?.roles || ["receptionist"]);
    await Promise.all(recipients.map((r) => createNotificationInternal({
      userId: r._id,
      type: "guest_request",
      title,
      message,
      priority: request.urgency === "urgent" ? "high" : "medium",
      payload: { requestId: String(request._id), roomNumber: request.roomNumber, kind: request.kind, source: "room_qr" },
    })));
  } catch {
    /* best-effort */
  }
};

// @desc    Raise a service request from a room QR scan
// @route   POST /api/v1/guest/room-request
// @access  Public (rate limited by IP + room token)
export const createRoomRequest = asyncHandler(async (req, res) => {
  const { roomToken, hotelId, kind, details, urgent, guestName, guestSessionId } = req.body || {};

  if (typeof roomToken !== "string" || !roomToken.startsWith("RM-") || !mongoose.isValidObjectId(hotelId)) {
    return res.status(400).json({ success: false, message: "Invalid room QR code" });
  }
  if (!ROOM_REQUEST_KINDS[kind]) {
    return res.status(400).json({ success: false, message: "Choose what you need" });
  }
  if (details != null && (typeof details !== "string" || details.length > 300)) {
    return res.status(400).json({ success: false, message: "Details must be under 300 characters" });
  }
  if (guestName != null && (typeof guestName !== "string" || guestName.length > 100)) {
    return res.status(400).json({ success: false, message: "Name is too long" });
  }
  if (guestSessionId != null && (typeof guestSessionId !== "string" || !SESSION_PATTERN.test(guestSessionId))) {
    return res.status(400).json({ success: false, message: "Invalid guest session" });
  }
  if (kind === "maintenance" && !(typeof details === "string" && details.trim().length >= 3)) {
    return res.status(400).json({ success: false, message: "Tell us briefly what needs fixing" });
  }

  const room = await Room.findOne({ uniqueToken: roomToken, hotel: hotelId, isQrActive: true }).select("_id hotel roomNumber");
  if (!room) {
    return res.status(404).json({ success: false, message: "Room not found or QR code is inactive" });
  }
  const hotel = await Hotel.findById(hotelId).select("company status isActive");
  if (!hotel || hotel.status !== "approved" || !hotel.isActive) {
    return res.status(404).json({ success: false, message: "Hotel is currently unavailable" });
  }

  // The same ask from the same room a few minutes ago is still being handled:
  // return it instead of queueing a duplicate (double taps, impatient guests).
  const recent = await GuestRequest.findOne({
    room: room._id,
    kind,
    status: { $in: ["open", "assigned"] },
    createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
  }).sort({ createdAt: -1 });
  if (recent) {
    return res.status(200).json({ success: true, duplicate: true, message: "We already have this request and are on it", data: toGuestShape(recent) });
  }

  const booking = await Booking.findOne({ room: room._id, hotel: hotel._id, status: "Checked-In" })
    .select("_id guest guestInfo")
    .lean();

  const label = ROOM_REQUEST_KINDS[kind].label;
  const cleanDetails = typeof details === "string" ? details.trim() : "";
  const urgency = urgent === true ? "urgent" : "medium";

  const request = await GuestRequest.create({
    hotel: hotel._id,
    company: hotel.company,
    booking: booking?._id,
    room: room._id,
    roomNumber: room.roomNumber,
    guest: booking?.guest,
    guestName: (typeof guestName === "string" && guestName.trim()) || booking?.guestInfo?.name || undefined,
    description: `${label}${cleanDetails ? ` — ${cleanDetails}` : ""}`.slice(0, 500),
    category: ROOM_REQUEST_KINDS[kind].category,
    kind,
    urgency,
    status: "open",
    source: "room_qr",
    guestSessionId: guestSessionId || undefined,
    verifiedStay: Boolean(booking),
    timeRemainingMinutes: SLA_MINUTES[urgency],
  });

  announce(hotel._id, request.toObject()).catch(() => {});

  return res.status(201).json({ success: true, message: "Request sent to the front desk", data: toGuestShape(request) });
});

// @desc    This phone's recent requests for a room (restores after refresh)
// @route   GET /api/v1/guest/room/:token/requests?guestSessionId=
// @access  Public — scoped to the requesting device's session
export const getRoomRequests = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { guestSessionId } = req.query;
  if (typeof token !== "string" || !token.startsWith("RM-") || typeof guestSessionId !== "string" || !SESSION_PATTERN.test(guestSessionId)) {
    return res.status(400).json({ success: false, message: "Invalid request" });
  }
  const room = await Room.findOne({ uniqueToken: token, isQrActive: true }).select("_id").lean();
  if (!room) return res.status(404).json({ success: false, message: "Room not found" });

  const requests = await GuestRequest.find({
    room: room._id,
    guestSessionId,
    createdAt: { $gte: new Date(Date.now() - GUEST_HISTORY_MS) },
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return res.json({ success: true, data: requests.map(toGuestShape) });
});

/** Tells the phone that raised a room-QR request that its status changed. */
export const notifyRequestDevice = (request) => {
  if (!request?.guestSessionId) return;
  try {
    emitToGuestSession(request.guestSessionId, "room-request-update", toGuestShape(request));
  } catch {
    /* best-effort */
  }
};
