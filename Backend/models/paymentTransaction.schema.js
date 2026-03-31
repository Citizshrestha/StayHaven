import mongoose from "mongoose";

/**
 * PaymentTransaction — full lifecycle of a payment operation.
 *
 * States:
 *   pending → captured → settled
 *   captured → refund-requested → refunded
 *   captured → disputed → resolved
 */
const paymentTransactionSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "Guest" },

    transactionId: { type: String, unique: true }, // TXN-XXXXXXX
    type: {
      type: String,
      enum: ["capture", "refund", "adjustment", "dispute"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD", enum: ["USD", "EUR", "GBP", "INR", "NPR"] },
    method: {
      type: String,
      enum: ["cash", "credit-card", "debit-card", "bank-transfer", "upi", "online"],
      default: "cash",
    },
    reference: { type: String, trim: true }, // external ref / receipt number

    status: {
      type: String,
      enum: [
        "pending",       // capture initiated
        "captured",      // payment confirmed
        "settled",       // reconciled / end-of-day
        "refund-requested",
        "refunded",
        "disputed",
        "resolved",      // dispute resolved
        "failed",
      ],
      default: "pending",
    },

    // Refund / dispute metadata
    refundReason: { type: String, maxlength: 500 },
    disputeReason: { type: String, maxlength: 500 },
    resolution: { type: String, maxlength: 500 },
    resolvedAt: { type: Date },

    // Audit
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    processedByName: { type: String },
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

// Auto-generate transactionId
paymentTransactionSchema.pre("save", async function (next) {
  if (!this.transactionId) {
    const count = await mongoose.model("PaymentTransaction").countDocuments({ company: this.company });
    this.transactionId = `TXN-${(100001 + count).toString()}`;
  }
  next();
});

// ═════════════════════════════════════════════════════════════════════════════
// INDEXES FOR PRODUCTION PERFORMANCE
// ═════════════════════════════════════════════════════════════════════════════

// Core lookups
paymentTransactionSchema.index({ transactionId: 1 });
paymentTransactionSchema.index({ booking: 1, createdAt: -1 });
paymentTransactionSchema.index({ booking: 1, type: 1, status: 1 });

// Dashboard and reporting queries
paymentTransactionSchema.index({ company: 1, status: 1 });
paymentTransactionSchema.index({ company: 1, createdAt: -1 });
paymentTransactionSchema.index({ company: 1, type: 1, status: 1 });

paymentTransactionSchema.index({ hotel: 1, createdAt: -1 });
paymentTransactionSchema.index({ hotel: 1, status: 1, createdAt: -1 });

// Refund workflow queries
paymentTransactionSchema.index({ status: 1, type: 1 }); // For finding refund requests
paymentTransactionSchema.index({ hotel: 1, status: 1, type: 1 });

// Payment summary aggregation (sum by booking)
paymentTransactionSchema.index({ booking: 1, type: 1, status: 1 });

// Audit queries
paymentTransactionSchema.index({ processedBy: 1, createdAt: -1 });

export const PaymentTransaction = mongoose.model("PaymentTransaction", paymentTransactionSchema);
