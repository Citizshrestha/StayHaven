import mongoose from "mongoose";
import { MaintenanceSchedule } from "../models/maintenanceSchedule.schema.js";
import { Room } from "../models/room.schema.js";
import { ActivityLog } from "../models/activityLog.schema.js";
import { emitToHotel } from "../config/socket.js";

// Helper: get hotel & company from request
const getCtx = (req) => {
  const user = req.user;
  const hotel = req._scopedHotelId || req.query.hotelId || req.params.hotelId || user?.assignedProperties?.[0]?._id || user?.assignedProperties?.[0];
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
 * Create a new maintenance schedule
 */
export const createMaintenanceSchedule = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { hotel, company, userId, userName } = getCtx(req);
    const {
      roomId,
      title,
      description,
      category,
      scheduleType,
      scheduledDate,
      scheduledTime,
      duration,
      recurring,
      recurrencePattern,
      assignedTo,
      assignedToName,
      assignedDepartment,
      
      priority,
      checklist,
      estimatedCost,
      externalVendor,
    } = req.body;

    if (!hotel) {
      return res.status(400).json({ success: false, message: "Hotel ID is required" });
    }

    if (!title || !scheduledDate) {
      return res.status(400).json({ success: false, message: "Title and scheduled date are required" });
    }

    let roomNumber = null;
    if (roomId) {
      const room = await Room.findById(roomId).select("roomNumber").lean();
      if (room) roomNumber = room.roomNumber;
    }

    const schedule = await MaintenanceSchedule.create({
      hotel,
      company,
      room: roomId,
      roomNumber,
      title,
      description,
      category: category || "preventive",
      scheduleType: scheduleType || "one-time",
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      duration: duration || 60,
      recurring: recurring || false,
      recurrencePattern,
      assignedTo,
      assignedToName,
      assignedDepartment: assignedDepartment || "maintenance",
      priority: priority || "normal",
      checklist: checklist || [],
      estimatedCost: estimatedCost || 0,
      externalVendor,
      createdBy: userId,
      createdByName: userName,
    });

    // If room-specific maintenance, mark room as maintenance
    if (roomId && category === "preventive") {
      await Room.findByIdAndUpdate(roomId, { status: "maintenance" });
      emitToHotel(hotel.toString(), "room-update", { roomId, status: "maintenance" });
    }

    await logActivity({
      hotel,
      company,
      entityType: "maintenance",
      entityId: schedule._id,
      action: "schedule-created",
      description: `Maintenance scheduled: <strong>${title}</strong> for ${roomNumber || "hotel"} on ${new Date(scheduledDate).toLocaleDateString()}`,
      icon: "Wrench",
      color: "#f59e0b",
      actor: userId,
      actorName: userName,
    });

    emitToHotel(hotel.toString(), "maintenance-update", { type: "created", schedule });

    res.status(201).json({ success: true, message: "Maintenance scheduled", data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Get maintenance schedules with filters
 */
export const getMaintenanceSchedules = async (req, res) => {
  try {
    const { hotel, company } = getCtx(req);
    const {
      status,
      category,
      priority,
      roomId,
      assignedTo,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = company ? { company } : hotel ? { hotel } : {};

    if (status && status !== "all") filter.status = status;
    if (category && category !== "all") filter.category = category;
    if (priority && priority !== "all") filter.priority = priority;
    if (roomId && roomId !== "all") filter.room = roomId;
    if (assignedTo && assignedTo !== "all") filter.assignedTo = assignedTo;

    // Date range filter
    if (startDate || endDate) {
      filter.scheduledDate = {};
      if (startDate) filter.scheduledDate.$gte = new Date(startDate);
      if (endDate) filter.scheduledDate.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { roomNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [schedules, total, stats] = await Promise.all([
      MaintenanceSchedule.find(filter)
        .populate("room", "roomNumber type floor")
        .populate("assignedTo", "fullname profilePicture")
        .populate("completedBy", "fullname")
        .sort({ scheduledDate: 1, priority: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      MaintenanceSchedule.countDocuments(filter),
      getMaintenanceStats(hotel, company),
    ]);

    // Update overdue status
    await MaintenanceSchedule.updateOverdueTasks(hotel);

    res.json({
      success: true,
      data: schedules,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get maintenance statistics
 */
async function getMaintenanceStats(hotel, company) {
  const filter = company ? { company } : hotel ? { hotel } : {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const thisWeekEnd = new Date(today);
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);

  const [
    total,
    scheduled,
    inProgress,
    completed,
    overdue,
    todayCount,
    upcoming,
    byCategory,
    byPriority,
  ] = await Promise.all([
    MaintenanceSchedule.countDocuments(filter),
    MaintenanceSchedule.countDocuments({ ...filter, status: "scheduled" }),
    MaintenanceSchedule.countDocuments({ ...filter, status: "in-progress" }),
    MaintenanceSchedule.countDocuments({ ...filter, status: "completed" }),
    MaintenanceSchedule.countDocuments({ ...filter, status: "overdue" }),
    MaintenanceSchedule.countDocuments({
      ...filter,
      scheduledDate: { $gte: today, $lt: tomorrow },
      status: { $nin: ["completed", "cancelled"] },
    }),
    MaintenanceSchedule.countDocuments({
      ...filter,
      scheduledDate: { $gte: tomorrow, $lte: thisWeekEnd },
      status: { $nin: ["completed", "cancelled"] },
    }),
    MaintenanceSchedule.aggregate([{ $match: filter }, { $group: { _id: "$category", count: { $sum: 1 } } }]),
    MaintenanceSchedule.aggregate([{ $match: filter }, { $group: { _id: "$priority", count: { $sum: 1 } } }]),
  ]);

  return {
    total,
    scheduled,
    inProgress,
    completed,
    overdue,
    today: todayCount,
    upcoming,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    byCategory: byCategory.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {}),
    byPriority: byPriority.reduce((acc, p) => ({ ...acc, [p._id]: p.count }), {}),
  };
}

/**
 * Get single maintenance schedule
 */
export const getMaintenanceScheduleById = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await MaintenanceSchedule.findById(id)
      .populate("room", "roomNumber type floor amenities")
      .populate("assignedTo", "fullname email phone profilePicture")
      .populate("completedBy", "fullname")
      .populate("createdBy", "fullname")
      .lean();

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Maintenance schedule not found" });
    }

    res.json({ success: true, data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Update maintenance schedule
 */
export const updateMaintenanceSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { hotel, userId, userName } = getCtx(req);
    const updates = req.body;

    // Prevent updating certain fields
    delete updates._id;
    delete updates.hotel;
    delete updates.company;
    delete updates.createdBy;

    const schedule = await MaintenanceSchedule.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).populate("room", "roomNumber");

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Maintenance schedule not found" });
    }

    await logActivity({
      hotel: schedule.hotel,
      company: schedule.company,
      entityType: "maintenance",
      entityId: schedule._id,
      action: "schedule-updated",
      description: `Maintenance <strong>${schedule.title}</strong> updated`,
      icon: "Edit",
      color: "#3b82f6",
      actor: userId,
      actorName: userName,
    });

    emitToHotel(hotel.toString(), "maintenance-update", { type: "updated", schedule });

    res.json({ success: true, message: "Schedule updated", data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Start maintenance work
 */
export const startMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName } = getCtx(req);

    const schedule = await MaintenanceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found" });
    }

    if (schedule.status !== "scheduled" && schedule.status !== "overdue") {
      return res.status(400).json({ success: false, message: `Cannot start maintenance in '${schedule.status}' status` });
    }

    schedule.status = "in-progress";
    schedule.startedAt = new Date();
    await schedule.save();

    // Update room status if applicable
    if (schedule.room) {
      await Room.findByIdAndUpdate(schedule.room, { status: "maintenance" });
    }

    await logActivity({
      hotel: schedule.hotel,
      company: schedule.company,
      entityType: "maintenance",
      entityId: schedule._id,
      action: "maintenance-started",
      description: `Maintenance started: <strong>${schedule.title}</strong>`,
      icon: "Play",
      color: "#10b981",
      actor: userId,
      actorName: userName,
    });

    emitToHotel(schedule.hotel.toString(), "maintenance-update", { type: "started", schedule });

    res.json({ success: true, message: "Maintenance started", data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Complete maintenance work
 */
export const completeMaintenance = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;
    const { userId, userName } = getCtx(req);
    const {
      checklist,
      workPerformed,
      issuesFound,
      recommendations,
      actualCost,
      materialsUsed,
      photosBefore,
      photosAfter,
    } = req.body;

    await session.withTransaction(async () => {
      const schedule = await MaintenanceSchedule.findById(id).session(session);
      if (!schedule) throw new Error("Schedule not found");

      if (schedule.status !== "in-progress" && schedule.status !== "scheduled") {
        throw new Error(`Cannot complete maintenance in '${schedule.status}' status`);
      }

      // Update checklist if provided
      if (checklist && Array.isArray(checklist)) {
        schedule.checklist = checklist;
      }

      schedule.status = "completed";
      schedule.completedAt = new Date();
      schedule.completedBy = userId;
      schedule.completedByName = userName;
      schedule.workPerformed = workPerformed;
      schedule.issuesFound = issuesFound;
      schedule.recommendations = recommendations;
      schedule.actualCost = actualCost || schedule.actualCost;
      schedule.materialsUsed = materialsUsed || schedule.materialsUsed;
      schedule.photosBefore = photosBefore || schedule.photosBefore;
      schedule.photosAfter = photosAfter || schedule.photosAfter;

      await schedule.save({ session });

      // Update room status back to available if applicable
      if (schedule.room) {
        await Room.findByIdAndUpdate(schedule.room, { status: "available", lastCleaned: new Date() }, { session });
      }

      // Create next recurring instance if applicable
      if (schedule.recurring && !schedule.isRecurringInstance) {
        await MaintenanceSchedule.createNextRecurringInstance(schedule._id);
      }
    });

    const schedule = await MaintenanceSchedule.findById(id);

    await logActivity({
      hotel: schedule.hotel,
      company: schedule.company,
      entityType: "maintenance",
      entityId: schedule._id,
      action: "maintenance-completed",
      description: `Maintenance completed: <strong>${schedule.title}</strong>`,
      icon: "CheckCircle",
      color: "#10b981",
      actor: userId,
      actorName: userName,
    });

    emitToHotel(schedule.hotel.toString(), "maintenance-update", { type: "completed", schedule });
    emitToHotel(schedule.hotel.toString(), "room-update", { roomId: schedule.room, status: "available" });

    res.json({ success: true, message: "Maintenance completed", data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Cancel maintenance schedule
 */
export const cancelMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { userId, userName } = getCtx(req);

    const schedule = await MaintenanceSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found" });
    }

    if (schedule.status === "completed" || schedule.status === "cancelled") {
      return res.status(400).json({ success: false, message: `Cannot cancel ${schedule.status} maintenance` });
    }

    schedule.status = "cancelled";
    schedule.cancelledBy = userId;
    schedule.cancellationReason = reason;
    await schedule.save();

    await logActivity({
      hotel: schedule.hotel,
      company: schedule.company,
      entityType: "maintenance",
      entityId: schedule._id,
      action: "maintenance-cancelled",
      description: `Maintenance cancelled: <strong>${schedule.title}</strong>${reason ? ` (${reason})` : ""}`,
      icon: "XCircle",
      color: "#ef4444",
      actor: userId,
      actorName: userName,
    });

    emitToHotel(schedule.hotel.toString(), "maintenance-update", { type: "cancelled", schedule });

    res.json({ success: true, message: "Maintenance cancelled", data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get maintenance calendar data
 */
export const getMaintenanceCalendar = async (req, res) => {
  try {
    const { hotel, company } = getCtx(req);
    const { year, month } = req.query;

    const filter = company ? { company } : hotel ? { hotel } : {};

    // Filter by month if provided
    if (year && month) {
      const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0);
      filter.scheduledDate = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const schedules = await MaintenanceSchedule.find(filter)
      .populate("room", "roomNumber")
      .populate("assignedTo", "fullname")
      .sort({ scheduledDate: 1 })
      .lean();

    // Group by date
    const calendar = {};
    schedules.forEach((s) => {
      const dateKey = new Date(s.scheduledDate).toISOString().split("T")[0];
      if (!calendar[dateKey]) calendar[dateKey] = [];
      calendar[dateKey].push({
        _id: s._id,
        title: s.title,
        status: s.status,
        priority: s.priority,
        roomNumber: s.roomNumber,
        category: s.category,
        assignedTo: s.assignedTo?.fullname || s.assignedToName,
      });
    });

    res.json({ success: true, data: calendar });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get upcoming maintenance for a room
 */
export const getRoomMaintenanceHistory = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 20 } = req.query;

    const history = await MaintenanceSchedule.find({ room: roomId })
      .populate("completedBy", "fullname")
      .populate("assignedTo", "fullname")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    const stats = {
      total: history.length,
      completed: history.filter(h => h.status === "completed").length,
      inProgress: history.filter(h => h.status === "in-progress").length,
      scheduled: history.filter(h => h.status === "scheduled").length,
      totalCost: history.reduce((sum, h) => sum + (h.actualCost || 0), 0),
    };

    res.json({ success: true, data: history, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
