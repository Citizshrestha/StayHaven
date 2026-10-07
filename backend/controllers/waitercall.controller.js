import mongoose from 'mongoose';
import { WaiterCall } from '../models/waitercall.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emitToWaiters, emitToHotel } from '../config/socket.js';
import { resolveHotelId, roleOf } from '../services/waiterScope.js';

const REQUEST_TYPES = WaiterCall.schema.path('requestType').enumValues;
const PRIORITIES = WaiterCall.schema.path('priority').enumValues;
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };
const SUPERVISORS = ['manager', 'owner', 'admin', 'hoteladmin', 'superadmin'];

const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
const validCallId = (id) => typeof id === 'string' && mongoose.isValidObjectId(id);
const sortCalls = (calls) =>
  calls.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) || new Date(a.createdAt) - new Date(b.createdAt));

/**
 * Create a new waiter call raised by a staff member.
 * Guest QR calls are created by guestController, not here.
 * POST /api/staff/waiter-calls
 */
export const createWaiterCall = asyncHandler(async (req, res) => {
  const { roomId, roomNumber, requestType = 'assistance', priority = 'medium', description } = req.body;

  // Throws 403 for non-staff tokens and for hotels the user doesn't work at.
  const hotelId = await resolveHotelId(req, req.body.hotelId);

  if (typeof roomNumber !== 'string' || !roomNumber.trim() || roomNumber.length > 20) {
    return bad(res, 'Hotel ID and room number are required');
  }
  if (!REQUEST_TYPES.includes(requestType)) return bad(res, `Request type must be one of: ${REQUEST_TYPES.join(', ')}`);
  if (!PRIORITIES.includes(priority)) return bad(res, `Priority must be one of: ${PRIORITIES.join(', ')}`);
  if (description != null && (typeof description !== 'string' || description.length > 500)) {
    return bad(res, 'Description must be text under 500 characters');
  }
  if (roomId != null && (typeof roomId !== 'string' || !mongoose.isValidObjectId(roomId))) return bad(res, 'Invalid room');

  const waiterCall = await WaiterCall.create({
    hotel: hotelId,
    room: roomId || undefined,
    roomNumber: roomNumber.trim(),
    raisedBy: req.user._id,
    requestType,
    priority,
    description,
    status: 'open',
  });

  // Emit real-time notification to all waiters in this hotel
  emitToWaiters(hotelId, 'new-waiter-call', {
    call: {
      _id: waiterCall._id,
      roomNumber: waiterCall.roomNumber,
      requestType: waiterCall.requestType,
      priority: waiterCall.priority,
      description: waiterCall.description,
      status: waiterCall.status,
      createdAt: waiterCall.createdAt,
    },
    message: `New ${priority} priority request from Room ${waiterCall.roomNumber}`,
  });

  return res.status(201).json({
    success: true,
    message: 'Waiter call created successfully',
    call: waiterCall,
  });
});

/**
 * Get all active waiter calls for a hotel
 * GET /api/staff/waiter-calls?hotelId=xxx
 */
export const getActiveWaiterCalls = asyncHandler(async (req, res) => {
  const hotelId = await resolveHotelId(req, req.query.hotelId);

  const calls = await WaiterCall.find({
    hotel: hotelId,
    status: { $in: ['open', 'acknowledged', 'inProgress'] },
  })
    .populate('raisedBy', 'fullname')
    .populate('assignedTo', 'fullname')
    .lean();

  // Urgent first, then oldest. (Sorting the stored strings would put "medium" above "high".)
  sortCalls(calls);

  return res.status(200).json({
    success: true,
    count: calls.length,
    calls,
  });
});

/**
 * Acknowledge a waiter call (waiter is on their way)
 * PUT /api/staff/waiter-calls/:callId/acknowledge
 */
export const acknowledgeWaiterCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  if (!validCallId(callId)) return bad(res, 'Invalid waiter call', 404);

  const hotelId = await resolveHotelId(req, req.body?.hotelId || req.query.hotelId);

  // Atomic claim: when two waiters tap at once, exactly one wins.
  const call = await WaiterCall.findOneAndUpdate(
    { _id: callId, hotel: hotelId, status: 'open' },
    { $set: { status: 'acknowledged', assignedTo: req.user._id, acknowledgedAt: new Date() } },
    { new: true }
  );
  if (!call) {
    const existing = await WaiterCall.findOne({ _id: callId, hotel: hotelId }).select('status').lean();
    if (!existing) return bad(res, 'Waiter call not found or access denied', 404);
    return bad(res, `Call is already ${existing.status}`, 409);
  }

  // Notify all staff that this call was acknowledged
  emitToHotel(call.hotel.toString(), 'waiter-call-acknowledged', {
    callId: call._id,
    roomNumber: call.roomNumber,
    tableNumber: call.tableNumber,
    acknowledgedBy: req.user.fullname,
    acknowledgedAt: call.acknowledgedAt,
  });

  return res.status(200).json({
    success: true,
    message: 'Call acknowledged',
    call,
  });
});

/**
 * Resolve a waiter call (request completed)
 * PUT /api/staff/waiter-calls/:callId/resolve
 */
export const resolveWaiterCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  if (!validCallId(callId)) return bad(res, 'Invalid waiter call', 404);
  const notes = req.body?.notes;
  if (notes != null && (typeof notes !== 'string' || notes.length > 500)) return bad(res, 'Notes must be text under 500 characters');

  const hotelId = await resolveHotelId(req, req.body?.hotelId || req.query.hotelId);

  const existing = await WaiterCall.findOne({ _id: callId, hotel: hotelId }).select('status assignedTo').lean();
  if (!existing) return bad(res, 'Waiter call not found or access denied', 404);
  if (['resolved', 'cancelled'].includes(existing.status)) return bad(res, `Call is already ${existing.status}`, 409);

  // A call another waiter is handling can only be closed by that waiter or a supervisor.
  const takenByOther = existing.assignedTo && String(existing.assignedTo) !== String(req.user._id);
  if (takenByOther && !SUPERVISORS.includes(roleOf(req))) {
    return bad(res, 'This call is being handled by another waiter', 403);
  }

  const call = await WaiterCall.findOneAndUpdate(
    { _id: callId, hotel: hotelId, status: existing.status },
    {
      $set: {
        status: 'resolved',
        resolvedAt: new Date(),
        ...(existing.assignedTo ? {} : { assignedTo: req.user._id }),
        ...(notes ? { notes } : {}),
      },
    },
    { new: true }
  );
  if (!call) return bad(res, 'Call was changed by someone else. Refresh and try again.', 409);

  // Notify all staff
  emitToHotel(call.hotel.toString(), 'waiter-call-resolved', {
    callId: call._id,
    roomNumber: call.roomNumber,
    tableNumber: call.tableNumber,
    resolvedBy: req.user.fullname,
    resolvedAt: call.resolvedAt,
  });

  return res.status(200).json({
    success: true,
    message: 'Call resolved',
    call,
  });
});

/**
 * Get waiter call history for today
 * GET /api/staff/waiter-calls/history?hotelId=xxx
 */
export const getWaiterCallHistory = asyncHandler(async (req, res) => {
  const hotelId = await resolveHotelId(req, req.query.hotelId);

  // Get calls from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calls = await WaiterCall.find({
    hotel: hotelId,
    createdAt: { $gte: today },
  })
    .populate('raisedBy', 'fullname')
    .populate('assignedTo', 'fullname')
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: calls.length,
    calls,
  });
});
