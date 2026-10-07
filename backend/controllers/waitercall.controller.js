import { WaiterCall } from '../models/waitercall.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emitToWaiters, emitToHotel } from '../config/socket.js';

/**
 * Create a new waiter call (guest requesting assistance)
 * POST /api/staff/waiter-calls
 */
export const createWaiterCall = asyncHandler(async (req, res) => {
  const { 
    hotelId, 
    roomId, 
    roomNumber, 
    requestType = 'assistance',
    priority = 'medium',
    description 
  } = req.body;

  if (!hotelId || !roomNumber) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID and room number are required",
    });
  }

  const waiterCall = new WaiterCall({
    hotel: hotelId,
    room: roomId,
    roomNumber,
    raisedBy: req.user._id,
    requestType,
    priority,
    description,
    status: 'open',
  });

  await waiterCall.save();

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
    message: `New ${priority} priority request from Room ${roomNumber}`,
  });

  return res.status(201).json({
    success: true,
    message: "Waiter call created successfully",
    call: waiterCall,
  });
});

/**
 * Get all active waiter calls for a hotel
 * GET /api/staff/waiter-calls?hotelId=xxx
 */
export const getActiveWaiterCalls = asyncHandler(async (req, res) => {
  const { hotelId } = req.query;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const calls = await WaiterCall.find({ 
    hotel: hotelId,
    status: { $in: ['open', 'acknowledged', 'inProgress'] }
  })
    .populate('raisedBy', 'fullname email')
    .populate('assignedTo', 'fullname')
    .sort({ priority: -1, createdAt: 1 }); // Urgent first, then oldest

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

  const hotelId = req.body.hotelId || req.query.hotelId ||
    (req.user.assignedProperties && req.user.assignedProperties[0]?._id) ||
    req.user.assignedProperties?.[0];

  // Query-scoped by hotel for security (prevent cross-hotel call acknowledgment)
  const call = await WaiterCall.findOne({
    _id: callId,
    hotel: hotelId
  });
  if (!call) {
    return res.status(404).json({
      success: false,
      message: "Waiter call not found or access denied",
    });
  }

  if (call.status !== 'open') {
    return res.status(400).json({
      success: false,
      message: `Call is already ${call.status}`,
    });
  }

  call.status = 'acknowledged';
  call.assignedTo = req.user._id;
  call.acknowledgedAt = new Date();
  await call.save();

  // Notify all staff that this call was acknowledged
  emitToHotel(call.hotel.toString(), 'waiter-call-acknowledged', {
    callId: call._id,
    roomNumber: call.roomNumber,
    acknowledgedBy: req.user.fullname,
    acknowledgedAt: call.acknowledgedAt,
  });

  return res.status(200).json({
    success: true,
    message: "Call acknowledged",
    call,
  });
});

/**
 * Resolve a waiter call (request completed)
 * PUT /api/staff/waiter-calls/:callId/resolve
 */
export const resolveWaiterCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const { notes } = req.body;

  const hotelId = req.body.hotelId || req.query.hotelId ||
    (req.user.assignedProperties && req.user.assignedProperties[0]?._id) ||
    req.user.assignedProperties?.[0];

  // Query-scoped by hotel for security (prevent cross-hotel call resolution)
  const call = await WaiterCall.findOne({
    _id: callId,
    hotel: hotelId
  });
  if (!call) {
    return res.status(404).json({
      success: false,
      message: "Waiter call not found or access denied",
    });
  }

  call.status = 'resolved';
  call.resolvedAt = new Date();
  if (notes) call.notes = notes;
  await call.save();

  // Notify all staff
  emitToHotel(call.hotel.toString(), 'waiter-call-resolved', {
    callId: call._id,
    roomNumber: call.roomNumber,
    resolvedBy: req.user.fullname,
    resolvedAt: call.resolvedAt,
  });

  return res.status(200).json({
    success: true,
    message: "Call resolved",
    call,
  });
});

/**
 * Get waiter call history for today
 * GET /api/staff/waiter-calls/history?hotelId=xxx
 */
export const getWaiterCallHistory = asyncHandler(async (req, res) => {
  const { hotelId } = req.query;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

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
