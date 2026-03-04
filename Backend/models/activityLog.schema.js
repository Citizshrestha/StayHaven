import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    entityType: {
      type: String,
      enum: ["booking", "room", "guest", "invoice", "housekeeping", "staff", "request", "payment", "system"],
      required: true,
    },
    entityId: { type: String },
    action: { type: String, required: true }, // e.g. "check-in", "checkout", "payment", "cleaning", "assigned"
    description: { type: String, required: true },
    icon: { type: String }, // icon name for frontend
    color: { type: String }, // hex color for frontend
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

activityLogSchema.index({ company: 1, createdAt: -1 });
activityLogSchema.index({ hotel: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
