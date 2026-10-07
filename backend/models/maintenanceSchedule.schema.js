import mongoose from "mongoose";

/**
 * MaintenanceSchedule — Proactive preventive maintenance tracking
 *
 * Schedule types: daily, weekly, monthly, quarterly, yearly, custom
 * Status: scheduled, in-progress, completed, overdue, cancelled
 * Priority: low, normal, high, critical
 */
const maintenanceScheduleSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" }, // Optional - can be hotel-wide
    roomNumber: { type: String }, // For quick reference

    // Maintenance details
    title: { type: String, required: true, trim: true },
    description: { type: String, maxlength: 1000 },
    category: {
      type: String,
      enum: ["preventive", "repair", "inspection", "deep-cleaning", "renovation", "electrical", "plumbing", "hvac", "other"],
      default: "preventive",
    },

    // Scheduling
    scheduleType: {
      type: String,
      enum: ["daily", "weekly", "monthly", "quarterly", "yearly", "custom", "one-time"],
      required: true,
    },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String }, // e.g., "09:00" for specific time
    duration: { type: Number, default: 60 }, // Estimated duration in minutes
    recurring: { type: Boolean, default: false },
    recurrencePattern: {
      frequency: { type: String, enum: ["daily", "weekly", "monthly"] },
      interval: { type: Number, default: 1 }, // Every N days/weeks/months
      daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0 = Sunday
      endDate: { type: Date }, // When recurrence ends
    },

    // Assignment
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedToName: { type: String },
    assignedDepartment: { type: String, enum: ["housekeeping", "maintenance", "engineering", "external"] },

    // Status tracking
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "overdue", "cancelled", "paused"],
      default: "scheduled",
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
    },

    // Execution tracking
    startedAt: { type: Date },
    completedAt: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedByName: { type: String },

    // Checklist for maintenance tasks
    checklist: [{
      item: { type: String, required: true },
      completed: { type: Boolean, default: false },
      completedAt: { type: Date },
      notes: { type: String },
    }],

    // Costs and materials
    estimatedCost: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 },
    materialsUsed: [{
      name: { type: String },
      quantity: { type: Number },
      unit: { type: String },
      cost: { type: Number },
    }],

    // Completion details
    workPerformed: { type: String, maxlength: 2000 },
    issuesFound: { type: String, maxlength: 1000 },
    recommendations: { type: String, maxlength: 1000 },
    photosBefore: [{ type: String }], // URLs to photos
    photosAfter: [{ type: String }],

    // For overdue tracking
    overdueNotifiedAt: { type: Date },
    reminderSentAt: { type: Date },

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cancellationReason: { type: String },

    // External contractor info
    externalVendor: {
      name: { type: String },
      contact: { type: String },
      email: { type: String },
      phone: { type: String },
    },

    // Parent task for recurring series
    parentSchedule: { type: mongoose.Schema.Types.ObjectId, ref: "MaintenanceSchedule" },
    isRecurringInstance: { type: Boolean, default: false },
    instanceNumber: { type: Number, default: 1 }, // Which instance in the series
  },
  { timestamps: true }
);

// Indexes for performance
maintenanceScheduleSchema.index({ company: 1, status: 1 });
maintenanceScheduleSchema.index({ hotel: 1, scheduledDate: 1 });
maintenanceScheduleSchema.index({ room: 1, status: 1 });
maintenanceScheduleSchema.index({ assignedTo: 1, status: 1 });
maintenanceScheduleSchema.index({ status: 1, scheduledDate: 1 }); // For overdue queries
maintenanceScheduleSchema.index({ recurring: 1, "recurrencePattern.endDate": 1 });

// Pre-save hook to auto-update status based on dates
maintenanceScheduleSchema.pre("save", function(next) {
  const now = new Date();
  const scheduled = new Date(this.scheduledDate);

  // Check if overdue (past scheduled date and not completed/cancelled)
  if (this.status === "scheduled" && scheduled < now) {
    this.status = "overdue";
  }

  next();
});

// Static method to check and update overdue tasks
maintenanceScheduleSchema.statics.updateOverdueTasks = async function(hotelId) {
  const now = new Date();
  const filter = {
    status: "scheduled",
    scheduledDate: { $lt: now },
  };
  if (hotelId) filter.hotel = hotelId;

  const result = await this.updateMany(filter, {
    $set: { status: "overdue" },
  });

  return result.modifiedCount;
};

// Static method to create next recurring instance
maintenanceScheduleSchema.statics.createNextRecurringInstance = async function(parentScheduleId) {
  const parent = await this.findById(parentScheduleId);
  if (!parent || !parent.recurring || parent.recurrencePattern?.endDate < new Date()) {
    return null;
  }

  const nextDate = calculateNextDate(parent.scheduledDate, parent.recurrencePattern);
  if (!nextDate || (parent.recurrencePattern.endDate && nextDate > parent.recurrencePattern.endDate)) {
    return null;
  }

  const instance = new this({
    hotel: parent.hotel,
    company: parent.company,
    room: parent.room,
    roomNumber: parent.roomNumber,
    title: parent.title,
    description: parent.description,
    category: parent.category,
    scheduleType: parent.scheduleType,
    scheduledDate: nextDate,
    scheduledTime: parent.scheduledTime,
    duration: parent.duration,
    recurring: false, // Individual instances are not recurring
    assignedTo: parent.assignedTo,
    assignedToName: parent.assignedToName,
    assignedDepartment: parent.assignedDepartment,
    priority: parent.priority,
    checklist: parent.checklist.map(item => ({
      item: item.item,
      completed: false,
    })),
    estimatedCost: parent.estimatedCost,
    externalVendor: parent.externalVendor,
    parentSchedule: parent._id,
    isRecurringInstance: true,
    instanceNumber: (parent.instanceNumber || 1) + 1,
    createdBy: parent.createdBy,
  });

  await instance.save();
  return instance;
};

// Helper function to calculate next recurring date
function calculateNextDate(currentDate, pattern) {
  const next = new Date(currentDate);

  switch (pattern.frequency) {
    case "daily":
      next.setDate(next.getDate() + (pattern.interval || 1));
      break;
    case "weekly":
      next.setDate(next.getDate() + ((pattern.interval || 1) * 7));
      break;
    case "monthly":
      next.setMonth(next.getMonth() + (pattern.interval || 1));
      break;
    default:
      return null;
  }

  return next;
}

export const MaintenanceSchedule = mongoose.model("MaintenanceSchedule", maintenanceScheduleSchema);
