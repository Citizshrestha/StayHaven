import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    entityType: {
      type: String,
      enum: ["booking", "room", "guest", "invoice", "housekeeping", "staff", "request", "payment", "system", "shift", "queue", "staff-report"],
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

// ═════════════════════════════════════════════════════════════════════════════
// INDEXES FOR PRODUCTION PERFORMANCE
// ═════════════════════════════════════════════════════════════════════════════

// Time-series queries (most common - live activity feed)
activityLogSchema.index({ company: 1, createdAt: -1 });
activityLogSchema.index({ hotel: 1, createdAt: -1 });
activityLogSchema.index({ hotel: 1, entityType: 1, createdAt: -1 });

// Entity lookups (audit trail)
activityLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

// Action filtering
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ hotel: 1, action: 1, createdAt: -1 });

// Actor audit trail
activityLogSchema.index({ actor: 1, createdAt: -1 });

// Date range queries for reports
activityLogSchema.index({ createdAt: -1, entityType: 1 });

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
