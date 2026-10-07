import mongoose from "mongoose";
import { TableAssignment } from "../models/tableAssignment.schema.js";
import { User } from "../models/user.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emitToHotel, emitToUser } from "../config/socket.js";
import { resolveHotelId } from "../services/waiterScope.js";

// `req.user.activeProperty` does not exist on the User document (it is only part of the
// login response), so every handler resolves the hotel through resolveHotelId(): the
// requested hotel must be one the signed-in user works at, else 403.

const SHIFTS = TableAssignment.schema.path("shift").enumValues;
const MAX_AREAS = 200;
const MAX_AREA_LENGTH = 30;

const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
const isId = (v) => typeof v === "string" && mongoose.isValidObjectId(v);

// Normalises a list of table/room numbers: trimmed strings, unique, bounded.
const cleanAreas = (list) => {
  if (list == null) return [];
  if (!Array.isArray(list) || list.length > MAX_AREAS) return null;
  const out = [];
  for (const v of list) {
    if (typeof v !== "string" && typeof v !== "number") return null;
    const s = String(v).trim();
    if (!s || s.length > MAX_AREA_LENGTH) return null;
    if (!out.includes(s)) out.push(s);
  }
  return out;
};

// Validates one { waiterId, tables, rooms, shift } entry against the hotel's staff.
const buildAssignment = async (hotelId, entry, assignedBy) => {
  if (!entry || typeof entry !== "object") return { error: "Invalid assignment" };
  if (!isId(entry.waiterId)) return { error: "Waiter ID is required" };
  const tables = cleanAreas(entry.tables);
  const rooms = cleanAreas(entry.rooms);
  if (tables === null || rooms === null) return { error: `Tables and rooms must be lists of up to ${MAX_AREAS} short names` };
  if (!tables.length && !rooms.length) return { error: "At least one table or room must be assigned" };
  if (entry.shift != null && !SHIFTS.includes(entry.shift)) return { error: `Shift must be one of: ${SHIFTS.join(", ")}` };

  const waiter = await User.findOne({ _id: entry.waiterId, assignedProperties: hotelId, isDeleted: { $ne: true } })
    .select("fullname")
    .lean();
  if (!waiter) return { error: "That staff member does not work at this hotel", status: 404 };

  return {
    doc: {
      hotel: hotelId,
      waiter: waiter._id,
      waiterName: waiter.fullname,
      tables,
      rooms,
      shift: entry.shift || "morning",
      isActive: true,
      assignedBy,
    },
  };
};

/**
 * Create or update table assignment for a waiter
 * POST /api/staff/table-assignments
 */
export const assignTables = asyncHandler(async (req, res) => {
  const hotelId = await resolveHotelId(req, req.body.hotelId);
  const built = await buildAssignment(hotelId, req.body, req.user?._id);
  if (built.error) return bad(res, built.error, built.status);

  // Deactivate any existing assignment for this waiter at this hotel
  await TableAssignment.updateMany({ hotel: hotelId, waiter: built.doc.waiter, isActive: true }, { isActive: false });

  const assignment = await TableAssignment.create(built.doc);

  // Emit real-time update
  emitToHotel(hotelId, "table-assignment-updated", { assignment, action: "created" });

  // Notify the assigned waiter
  emitToUser(String(assignment.waiter), "your-tables-updated", {
    tables: assignment.tables,
    rooms: assignment.rooms,
    shift: assignment.shift,
  });

  res.status(201).json({ success: true, message: "Tables assigned successfully", data: assignment });
});

/**
 * Get all active table assignments for a hotel
 * GET /api/staff/table-assignments
 */
export const getTableAssignments = asyncHandler(async (req, res) => {
  const hotelId = await resolveHotelId(req, req.query.hotelId);

  const assignments = await TableAssignment.find({ hotel: hotelId, isActive: true })
    .populate("waiter", "fullname email profilePicture")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: assignments });
});

/**
 * Get current waiter's table assignment
 * GET /api/staff/table-assignments/my
 */
export const getMyAssignment = asyncHandler(async (req, res) => {
  const hotelId = await resolveHotelId(req, req.query.hotelId);

  const assignment = await TableAssignment.findOne({ hotel: hotelId, waiter: req.user._id, isActive: true });

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
  const hotelId = await resolveHotelId(req, req.query.hotelId);

  if ((table != null && typeof table !== "string") || (room != null && typeof room !== "string")) {
    return bad(res, "Table or room must be text");
  }
  if (!table && !room) return bad(res, "Table or room number is required");

  const query = { hotel: hotelId, isActive: true };
  if (table) query.tables = table;
  else query.rooms = room;

  const assignment = await TableAssignment.findOne(query).populate("waiter", "fullname email profilePicture");

  if (!assignment || !assignment.waiter) {
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
  if (!isId(assignmentId)) return bad(res, "Assignment not found", 404);
  const hotelId = await resolveHotelId(req, req.query.hotelId || req.body?.hotelId);

  const assignment = await TableAssignment.findOneAndUpdate(
    { _id: assignmentId, hotel: hotelId },
    { isActive: false },
    { new: true }
  );

  if (!assignment) return bad(res, "Assignment not found", 404);

  // Emit real-time update
  emitToHotel(hotelId, "table-assignment-updated", { assignmentId, action: "removed" });

  // Notify the waiter
  emitToUser(String(assignment.waiter), "your-tables-updated", { tables: [], rooms: [], shift: null, removed: true });

  res.status(200).json({ success: true, message: "Assignment removed successfully" });
});

/**
 * Bulk update table assignments
 * PUT /api/staff/table-assignments/bulk
 */
export const bulkUpdateAssignments = asyncHandler(async (req, res) => {
  const { assignments } = req.body; // Array of { waiterId, tables, rooms, shift }
  const hotelId = await resolveHotelId(req, req.body.hotelId);

  if (!Array.isArray(assignments) || assignments.length === 0 || assignments.length > MAX_AREAS) {
    return bad(res, "Assignments array is required");
  }

  // Validate everything first so a bad entry can't leave the hotel with no assignments.
  const docs = [];
  const seen = new Set();
  for (const entry of assignments) {
    const built = await buildAssignment(hotelId, entry, req.user?._id);
    if (built.error) return bad(res, built.error, built.status);
    const key = String(built.doc.waiter);
    if (seen.has(key)) return bad(res, "A waiter can only appear once in the list");
    seen.add(key);
    docs.push(built.doc);
  }

  // Deactivate all current assignments for this hotel, then create the new ones
  await TableAssignment.updateMany({ hotel: hotelId, isActive: true }, { isActive: false });
  const newAssignments = await TableAssignment.insertMany(docs);

  // Emit real-time updates
  emitToHotel(hotelId, "table-assignments-bulk-updated", { count: newAssignments.length });

  // Notify each waiter
  for (const assignment of newAssignments) {
    emitToUser(assignment.waiter.toString(), "your-tables-updated", {
      tables: assignment.tables,
      rooms: assignment.rooms,
      shift: assignment.shift,
    });
  }

  res.status(200).json({ success: true, message: `${newAssignments.length} assignments created`, data: newAssignments });
});
