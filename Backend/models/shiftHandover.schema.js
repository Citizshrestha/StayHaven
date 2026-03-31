import mongoose from "mongoose";

/**
 * ShiftHandover — formal shift-close report + handoff.
 *
 * Contains auto-aggregated stats + manual notes from the closing
 * receptionist, so the incoming shift has complete situational awareness.
 */
const shiftHandoverSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    shiftId: { type: String, unique: true }, // SH-XXXXXXX

    // Who is handing over
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    closedByName: { type: String, required: true },

    // Shift period
    shiftStart: { type: Date, required: true },
    shiftEnd: { type: Date, default: Date.now },
    shiftType: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night"],
      required: true,
    },

    // Auto-aggregated stats (populated at close time)
    stats: {
      checkInsProcessed: { type: Number, default: 0 },
      checkOutsProcessed: { type: Number, default: 0 },
      roomsChanged: { type: Number, default: 0 },
      paymentsCollected: { type: Number, default: 0 },    // total ₹
      paymentTransactions: { type: Number, default: 0 },
      guestRequestsHandled: { type: Number, default: 0 },
      housekeepingCompleted: { type: Number, default: 0 },
    },

    // Manual notes from the closing receptionist
    notes: { type: String, maxlength: 5000, default: "" },

    // Pending items to hand off
    pendingTasks: [
      {
        description: { type: String, required: true },
        priority: { type: String, enum: ["low", "normal", "high", "critical"], default: "normal" },
        relatedEntity: { type: String }, // e.g. "Booking #BK-5012"
        assignedTo: { type: String },    // name or role
      },
    ],

    // Unresolved incidents
    unresolvedIncidents: [
      {
        description: { type: String, required: true },
        severity: { type: String, enum: ["minor", "moderate", "major", "critical"], default: "moderate" },
        reportedAt: { type: Date, default: Date.now },
        guestName: { type: String },
        roomNumber: { type: String },
      },
    ],

    // Cash drawer / float
    cashDrawer: {
      openingBalance: { type: Number, default: 0 },
      closingBalance: { type: Number, default: 0 },
      cashReceived: { type: Number, default: 0 },
      cashPaidOut: { type: Number, default: 0 },
      variance: { type: Number, default: 0 },
    },

    // Acknowledgement by incoming shift
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    acknowledgedByName: { type: String },
    acknowledgedAt: { type: Date },

    status: {
      type: String,
      enum: ["open", "closed", "acknowledged"],
      default: "closed",
    },
  },
  { timestamps: true }
);

shiftHandoverSchema.pre("save", async function (next) {
  if (!this.shiftId) {
    const count = await mongoose.model("ShiftHandover").countDocuments({ company: this.company });
    this.shiftId = `SH-${(1001 + count).toString().padStart(5, "0")}`;
  }
  next();
});

shiftHandoverSchema.index({ company: 1, createdAt: -1 });
shiftHandoverSchema.index({ hotel: 1, shiftEnd: -1 });
shiftHandoverSchema.index({ closedBy: 1, shiftEnd: -1 });

export const ShiftHandover = mongoose.model("ShiftHandover", shiftHandoverSchema);
