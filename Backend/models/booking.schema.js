import mongoose from "mongoose";

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
    const Booking = mongoose.model("Booking");
    const company = this.company;
    
    // Find the highest existing bookingId for this company
    const lastBooking = await Booking
      .findOne({ company, bookingId: { $regex: /^#BK-\d+$/ } })
      .sort({ bookingId: -1 })
      .select("bookingId")
      .lean();
    
    let nextNum = 5001; // Default starting number
    if (lastBooking?.bookingId) {
      const match = lastBooking.bookingId.match(/#BK-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    
    // Ensure uniqueness with retry
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const candidateId = `#BK-${nextNum.toString().padStart(4, "0")}`;
      const exists = await Booking.exists({ company, bookingId: candidateId });
      if (!exists) {
        this.bookingId = candidateId;
        break;
      }
      nextNum++;
      attempts++;
    }
    
    if (!this.bookingId) {
      // Fallback to timestamp-based ID
      this.bookingId = `#BK-${Date.now().toString(36).toUpperCase()}`;
    }
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

