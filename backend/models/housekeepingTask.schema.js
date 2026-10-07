import mongoose from "mongoose";

const housekeepingTaskSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    roomNumber: { type: String, required: true },
    roomType: { type: String },
    floor: { type: Number },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedToName: { type: String },
    status: {
      type: String,
      enum: ["needs-cleaning", "in-progress", "clean", "inspected", "maintenance"],
      default: "needs-cleaning",
    },
    priority: {
      type: String,
      enum: ["normal", "medium", "high"],
      default: "normal",
    },
    isOccupied: { type: Boolean, default: false },
    checkoutToday: { type: Boolean, default: false },
    notes: { type: String, maxlength: 500 },
    estimatedTime: { type: Number }, // minutes
    startedAt: { type: Date },
    completedAt: { type: Date },
    lastCleaned: { type: Date },
  },
  { timestamps: true }
);

// ═════════════════════════════════════════════════════════════════════════════
// INDEXES FOR PRODUCTION PERFORMANCE
// ═════════════════════════════════════════════════════════════════════════════

// Dashboard queries
housekeepingTaskSchema.index({ company: 1, status: 1 });
housekeepingTaskSchema.index({ hotel: 1, status: 1 });
housekeepingTaskSchema.index({ hotel: 1, status: 1, priority: 1 });
housekeepingTaskSchema.index({ hotel: 1, roomNumber: 1 });

// Staff assignment queries
housekeepingTaskSchema.index({ assignedTo: 1, status: 1 });
housekeepingTaskSchema.index({ assignedTo: 1, createdAt: -1 });

// Priority and checkout queries
housekeepingTaskSchema.index({ hotel: 1, checkoutToday: 1, status: 1 });
housekeepingTaskSchema.index({ hotel: 1, priority: 1, status: 1 });

// Room lookup
housekeepingTaskSchema.index({ room: 1, status: 1 });

// Time-based queries
housekeepingTaskSchema.index({ hotel: 1, completedAt: -1 });
housekeepingTaskSchema.index({ createdAt: -1 });

export const HousekeepingTask = mongoose.model("HousekeepingTask", housekeepingTaskSchema);
