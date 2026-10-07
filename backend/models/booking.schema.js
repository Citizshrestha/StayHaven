import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,   // optional — walk-in guests may not have a user account
  },
  // Inline guest details for walk-in / anonymous bookings
  guestInfo: {
    name:    { type: String, trim: true },
    phone:   { type: String, trim: true },
    email:   { type: String, trim: true, lowercase: true },
    idType:  { type: String, trim: true },
    idNumber:{ type: String, trim: true },
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hotel",
    required: true,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  checkIn: {
    type: Date,
    required: true,
  },
  checkOut: {
    type: Date,
    required: true,
  },
  guests: {
    adults: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    children: {
      type: Number,
      default: 0,
      min: 0,
      max: 8,
    },
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'NPR'],
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Checked-In', 'Checked-Out', 'Cancelled', 'No-Show'],
    default: 'Pending',
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'refunded'],
    default: 'unpaid',
  },
  paymentReference: { type: String },
  paymentMethod: { type: String },
  paidAmount: { type: Number, default: 0 },
  paidAt: { type: Date },
  paymentHoldExpiresAt: { type: Date },
  paymentLockVersion: { type: Number, default: 0 },
  priceBreakdown: {
    subtotalPaisa: Number,
    taxPaisa: Number,
    totalPaisa: Number,
    taxRate: Number,
  },
  confirmationCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  specialRequests: {
    type: String,
    maxlength: 500,
  },
  cancellationReason: {
    type: String,
    maxlength: 500,
  },
  cancelledAt: {
    type: Date,
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  bookingSource: {
    type: String,
    enum: ['web', 'mobile', 'admin', 'api', 'Website', 'Agoda', 'Booking.com', 'Walk-in', 'Expedia'],
    default: 'web',
  },
  bookingId: {
    type: String,
    unique: true,
    sparse: true,
  },
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Guest",
  },
  durationNights: {
    type: Number,
    default: 1,
  },
  isVip: {
    type: Boolean,
    default: false,
  },
  earlyCheckinRequested: {
    type: Boolean,
    default: false,
  },
  expectedArrivalTime: {
    type: String,
  },
}, { timestamps: true });

// Auto-generate bookingId with collision handling
bookingSchema.pre("save", async function (next) {
  if (!this.bookingId) {
    // Globally unique across properties, concurrent requests and transaction retries.
    this.bookingId = `#BK-${randomUUID().toUpperCase()}`;
  }
  if (this.checkIn && this.checkOut) {
    this.durationNights = Math.max(1, Math.ceil((this.checkOut - this.checkIn) / (1000 * 60 * 60 * 24)));
  }
  next();
});

// ═════════════════════════════════════════════════════════════════════════════
// INDEXES FOR PRODUCTION PERFORMANCE
// ═════════════════════════════════════════════════════════════════════════════

// Core lookups
bookingSchema.index({ user: 1, status: 1 }, { sparse: true });
bookingSchema.index({ guest: 1, status: 1 });

// Room availability checks (critical for conflict prevention)
bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ room: 1, status: 1, checkIn: 1, checkOut: 1 });

// Dashboard queries - today's check-ins/check-outs
bookingSchema.index({ hotel: 1, status: 1, checkIn: 1 });
bookingSchema.index({ hotel: 1, status: 1, checkOut: 1 });
bookingSchema.index({ hotel: 1, status: 1, updatedAt: -1 });
bookingSchema.index({ hotel: 1, paymentStatus: 1, status: 1 });

// Company-level aggregations
bookingSchema.index({ company: 1, status: 1 });
bookingSchema.index({ company: 1, createdAt: -1 });
bookingSchema.index({ company: 1, checkIn: 1, status: 1 });

// Date-based queries for reports
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ checkIn: 1, status: 1 });
bookingSchema.index({ checkOut: 1, status: 1 });

// Compound index for reception dashboard (most common query)
bookingSchema.index({ hotel: 1, checkIn: 1, checkOut: 1, status: 1 });

// Text search for guest info
bookingSchema.index({ "guestInfo.name": "text", bookingId: "text" });

export const Booking = mongoose.model("Booking", bookingSchema);

