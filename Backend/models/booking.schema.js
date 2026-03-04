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

// Auto-generate bookingId
bookingSchema.pre("save", async function (next) {
  if (!this.bookingId) {
    const count = await mongoose.model("Booking").countDocuments({ company: this.company });
    this.bookingId = `#BK-${(5001 + count).toString().padStart(4, "0")}`;
  }
  if (this.checkIn && this.checkOut) {
    this.durationNights = Math.max(1, Math.ceil((this.checkOut - this.checkIn) / (1000 * 60 * 60 * 24)));
  }
  next();
});

// Indexes for performance
bookingSchema.index({ user: 1, status: 1 }, { sparse: true });  // sparse because user is now optional
bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ hotel: 1, status: 1 });

bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ company: 1, status: 1 });
bookingSchema.index({ company: 1, createdAt: -1 });

export const Booking = mongoose.model("Booking", bookingSchema);

