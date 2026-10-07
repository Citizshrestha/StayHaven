import mongoose from "mongoose";

/**
 * OperationQueue — stores deferred / offline operations for retry.
 *
 * When the front desk client detects network issues, it serialises the
 * intended mutation and posts it to the queue.  A sync endpoint processes
 * queued items with retry and audit trail.
 *
 * States: queued → processing → completed / failed
 */
const operationQueueSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    operationId: { type: String, unique: true },  // OP-XXXXXXX
    operationType: {
      type: String,
      enum: ["check-in", "check-out", "room-change", "payment-capture", "guest-update", "housekeeping-update"],
      required: true,
    },

    // Serialised payload — everything needed to replay the operation
    payload: { type: mongoose.Schema.Types.Mixed, required: true },

    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
    },

    // Retry tracking
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    lastAttemptAt: { type: Date },
    nextRetryAt: { type: Date },
    errorLog: [{ attempt: Number, error: String, at: Date }],

    // Result once processed
    result: { type: mongoose.Schema.Types.Mixed },
    completedAt: { type: Date },

    // Audit
    queuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    queuedByName: { type: String },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    processedByName: { type: String },

    // Client metadata
    clientTimestamp: { type: Date }, // when the client originally attempted the action
    idempotencyKey: { type: String, index: true, sparse: true },
  },
  { timestamps: true }
);

operationQueueSchema.pre("save", async function (next) {
  if (!this.operationId) {
    const count = await mongoose.model("OperationQueue").countDocuments({ company: this.company });
    this.operationId = `OP-${(50001 + count).toString().padStart(6, "0")}`;
  }
  next();
});

operationQueueSchema.index({ company: 1, status: 1, priority: -1 });
operationQueueSchema.index({ hotel: 1, status: 1 });
operationQueueSchema.index({ status: 1, nextRetryAt: 1 });

export const OperationQueue = mongoose.model("OperationQueue", operationQueueSchema);
