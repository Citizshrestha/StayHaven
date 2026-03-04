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

housekeepingTaskSchema.index({ company: 1, status: 1 });
housekeepingTaskSchema.index({ hotel: 1, roomNumber: 1 });
housekeepingTaskSchema.index({ assignedTo: 1, status: 1 });

export const HousekeepingTask = mongoose.model("HousekeepingTask", housekeepingTaskSchema);
