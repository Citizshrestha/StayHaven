import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
   user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
   },
   hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hotel",
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
    enum: ['web', 'mobile', 'admin', 'api'],
    default: 'web',
   },
}, {timestamps: true});

// Indexes for performance
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ hotel: 1, status: 1 });
bookingSchema.index({ confirmationCode: 1 });
bookingSchema.index({ createdAt: -1 });

export const Booking =  mongoose.model("Booking", bookingSchema);

