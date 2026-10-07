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
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: false },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "Guest" },
    // Restaurant tab (dine-in / takeaway) this payment settles.
    diningSession: { type: mongoose.Schema.Types.ObjectId, ref: "DiningSession" },

    transactionId: { type: String, unique: true, sparse: true }, // TXN-XXXXXXX
    type: {
      type: String,
      enum: ["capture", "refund", "adjustment", "dispute"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD", enum: ["USD", "EUR", "GBP", "INR", "NPR"] },
    method: {
      type: String,
      enum: ["cash", "credit-card", "debit-card", "bank-transfer", "upi", "online", "khalti", "khalti-mock", "esewa", "esewa-mock", "card"],
      default: "cash",
    },
    reference: { type: String, trim: true }, // external ref / receipt number
    paymentAttempt: { type: mongoose.Schema.Types.ObjectId, ref: 'WalletPaymentAttempt' },

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

// Auto-generate transactionId with collision handling — countDocuments
// alone is a check-then-write race under concurrent payment confirmations
// for the same company; retry against a fresh count (same pattern as
// bookingSchema's bookingId generator) instead of trusting a single count.
paymentTransactionSchema.pre("save", async function (next) {
  if (!this.transactionId) {
    const Txn = mongoose.model("PaymentTransaction");
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const count = await Txn.countDocuments({ company: this.company });
      const candidateId = `TXN-${(100001 + count).toString()}`;
      const exists = await Txn.exists({ transactionId: candidateId });
      if (!exists) {
        this.transactionId = candidateId;
        break;
      }
      attempts++;
    }
    if (!this.transactionId) {
      // Fallback to a timestamp-based id if we somehow lost every race
      this.transactionId = `TXN-${Date.now().toString(36).toUpperCase()}`;
    }
  }
  next();
});

// ═════════════════════════════════════════════════════════════════════════════
// INDEXES FOR PRODUCTION PERFORMANCE
// ═════════════════════════════════════════════════════════════════════════════

// Core lookups
// (transactionId already has a unique index via the field definition above)
paymentTransactionSchema.index({ booking: 1, createdAt: -1 });
paymentTransactionSchema.index({ paymentAttempt: 1 }, { unique: true, partialFilterExpression: { paymentAttempt: { $type: 'objectId' } } });
paymentTransactionSchema.index({ booking: 1, type: 1, status: 1 });
paymentTransactionSchema.index({ diningSession: 1 }, { sparse: true });

// Dashboard and reporting queries
paymentTransactionSchema.index({ company: 1, status: 1 });
paymentTransactionSchema.index({ company: 1, createdAt: -1 });
paymentTransactionSchema.index({ company: 1, type: 1, status: 1 });

paymentTransactionSchema.index({ hotel: 1, createdAt: -1 });
paymentTransactionSchema.index({ hotel: 1, status: 1, createdAt: -1 });

// Refund workflow queries
paymentTransactionSchema.index({ status: 1, type: 1 }); // For finding refund requests
paymentTransactionSchema.index({ hotel: 1, status: 1, type: 1 });

// Audit queries
paymentTransactionSchema.index({ processedBy: 1, createdAt: -1 });

// Bank-transfer duplicate-reference protection: the same real bank slip
// number must not be submitted as evidence for two different transactions
// -- neither two pending ones (racing submissions), nor a fresh submission
// reusing a reference that was already approved and paid out (which would
// let one real transfer be claimed against a second booking). Only a
// rejected/failed submission's reference is released for resubmission,
// since that transaction never had real money credited against it. This
// never collides with Khalti/eSewa/card references, which use their own
// provider-id formats and are covered by the transactionId unique index.
paymentTransactionSchema.index(
  { method: 1, reference: 1 },
  {
    unique: true,
    partialFilterExpression: {
      method: "bank-transfer",
      status: { $in: ["pending", "captured"] },
      reference: { $type: "string" },
    },
  }
);

export const PaymentTransaction = mongoose.model("PaymentTransaction", paymentTransactionSchema);
