import { TableAssignment } from "../models/tableAssignment.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emitToHotel, emitToUser } from "../config/socket.js";

/**
 * Create or update table assignment for a waiter
 * POST /api/staff/table-assignments
 */
export const assignTables = asyncHandler(async (req, res) => {
  const { waiterId, waiterName, tables, rooms, shift } = req.body;
  const hotelId = req.user?.activeProperty || req.body.hotelId;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  if (!waiterId) {
    return res.status(400).json({
      success: false,
      message: "Waiter ID is required",
    });
  }

  if ((!tables || tables.length === 0) && (!rooms || rooms.length === 0)) {
    return res.status(400).json({
      success: false,
      message: "At least one table or room must be assigned",
    });
  }

  // Deactivate any existing assignment for this waiter at this hotel
  await TableAssignment.updateMany(
    { hotel: hotelId, waiter: waiterId, isActive: true },
    { isActive: false }
  );

  // Create new assignment
  const assignment = await TableAssignment.create({
    hotel: hotelId,
    waiter: waiterId,
    waiterName: waiterName || req.user?.fullname || "Staff",
    tables: tables || [],
    rooms: rooms || [],
    shift: shift || 'morning',
    isActive: true,
    assignedBy: req.user?._id,
  });

  // Emit real-time update
  emitToHotel(hotelId, 'table-assignment-updated', {
    assignment,
    action: 'created',
  });

  // Notify the assigned waiter
  emitToUser(waiterId, 'your-tables-updated', {
    tables: assignment.tables,
    rooms: assignment.rooms,
    shift: assignment.shift,
  });

  res.status(201).json({
    success: true,
    message: "Tables assigned successfully",
    data: assignment,
  });
});

/**
 * Get all active table assignments for a hotel
 * GET /api/staff/table-assignments
 */
export const getTableAssignments = asyncHandler(async (req, res) => {
  const hotelId = req.user?.activeProperty || req.query.hotelId;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const assignments = await TableAssignment.find({
    hotel: hotelId,
    isActive: true,
  })
    .populate('waiter', 'fullname email profilePicture')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: assignments,
  });
});

/**
 * Get current waiter's table assignment
 * GET /api/staff/table-assignments/my
 */
export const getMyAssignment = asyncHandler(async (req, res) => {
  const waiterId = req.user?._id;
  const hotelId = req.user?.activeProperty;

  if (!hotelId || !waiterId) {
    return res.status(400).json({
      success: false,
      message: "Authentication required",
    });
  }

  const assignment = await TableAssignment.findOne({
    hotel: hotelId,
    waiter: waiterId,
    isActive: true,
  });

  res.status(200).json({
    success: true,
    data: assignment || { tables: [], rooms: [], shift: null },
  });
});

/**
 * Get waiter assigned to a specific table or room
 * GET /api/staff/table-assignments/lookup?table=5 or ?room=101
 */
export const lookupAssignedWaiter = asyncHandler(async (req, res) => {
  const { table, room } = req.query;
  const hotelId = req.user?.activeProperty || req.query.hotelId;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  if (!table && !room) {
    return res.status(400).json({
      success: false,
      message: "Table or room number is required",
    });
  }

  let query = { hotel: hotelId, isActive: true };

  if (table) {
    query.tables = table;
  } else if (room) {
    query.rooms = room;
  }

  const assignment = await TableAssignment.findOne(query)
    .populate('waiter', 'fullname email profilePicture');

  if (!assignment) {
    return res.status(200).json({
      success: true,
      data: null,
      message: `No waiter assigned to ${table ? `table ${table}` : `room ${room}`}`,
    });
  }

  res.status(200).json({
    success: true,
    data: {
      waiterId: assignment.waiter._id,
      waiterName: assignment.waiterName,
      waiter: assignment.waiter,
      shift: assignment.shift,
    },
  });
});

/**
 * Remove table assignment (deactivate)
 * DELETE /api/staff/table-assignments/:assignmentId
 */
export const removeAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const hotelId = req.user?.activeProperty;

  const assignment = await TableAssignment.findOneAndUpdate(
    { _id: assignmentId, hotel: hotelId },
    { isActive: false },
    { new: true }
  );

  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: "Assignment not found",
    });
  }

  // Emit real-time update
  emitToHotel(hotelId, 'table-assignment-updated', {
    assignmentId,
    action: 'removed',
  });

  // Notify the waiter
  emitToUser(assignment.waiter, 'your-tables-updated', {
    tables: [],
    rooms: [],
    shift: null,
    removed: true,
  });

  res.status(200).json({
    success: true,
    message: "Assignment removed successfully",
  });
});

/**
 * Bulk update table assignments
 * PUT /api/staff/table-assignments/bulk
 */
export const bulkUpdateAssignments = asyncHandler(async (req, res) => {
  const { assignments } = req.body; // Array of { waiterId, waiterName, tables, rooms, shift }
  const hotelId = req.user?.activeProperty || req.body.hotelId;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Assignments array is required",
    });
  }

  // Deactivate all current assignments for this hotel
  await TableAssignment.updateMany(
    { hotel: hotelId, isActive: true },
    { isActive: false }
  );

  // Create new assignments
  const newAssignments = await TableAssignment.insertMany(
    assignments.map(a => ({
      hotel: hotelId,
      waiter: a.waiterId,
      waiterName: a.waiterName,
      tables: a.tables || [],
      rooms: a.rooms || [],
      shift: a.shift || 'morning',
      isActive: true,
      assignedBy: req.user?._id,
    }))
  );

  // Emit real-time updates
  emitToHotel(hotelId, 'table-assignments-bulk-updated', {
    count: newAssignments.length,
  });

  // Notify each waiter
  for (const assignment of newAssignments) {
    emitToUser(assignment.waiter.toString(), 'your-tables-updated', {
      tables: assignment.tables,
      rooms: assignment.rooms,
      shift: assignment.shift,
    });
  }

  res.status(200).json({
    success: true,
    message: `${newAssignments.length} assignments created`,
    data: newAssignments,
  });
});
