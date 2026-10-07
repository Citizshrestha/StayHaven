import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "NRS",
    },
    reason: {
      type: String,
      enum: [
        "guest_request",
        "hotel_cancel",
        "system_error",
        "duplicate",
        "chargeback",
        "other",
      ],
      required: true,
    },
    reasonDetail: {
      type: String,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: [
        "requested",
        "under_review",
        "approved",
        "processed",
        "rejected",
        "chargeback",
      ],
      default: "requested",
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    khaltiRefRef: {
      type: String,
    },
    rejectionReason: {
      type: String,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Indexes for production performance
refundSchema.index({ booking: 1 });
refundSchema.index({ hotel: 1, status: 1 });
refundSchema.index({ status: 1, requestedAt: -1 });
refundSchema.index({ guest: 1, status: 1 });
refundSchema.index({ createdAt: -1 });

export const Refund = mongoose.model("Refund", refundSchema);
