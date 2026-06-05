import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    period: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
    grossRevenue: {
      type: Number,
      default: 0,
    },
    platformCommission: {
      type: Number,
      default: 0,
    },
    taxes: {
      type: Number,
      default: 0,
    },
    netPayout: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "NRS",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "scheduled"],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      default: "bank_transfer",
    },
    transactionRef: {
      type: String,
    },
    processedAt: {
      type: Date,
    },
    scheduledFor: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Indexes for production performance
payoutSchema.index({ hotel: 1, status: 1 });
payoutSchema.index({ hotel: 1, createdAt: -1 });
payoutSchema.index({ status: 1, scheduledFor: 1 });
payoutSchema.index({ createdAt: -1 });

export const Payout = mongoose.model("Payout", payoutSchema);
