import mongoose from "mongoose";

const waiterCallSchema = new mongoose.Schema({
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    // Optional: table QR guest calls have no room, and anonymous guests
    // supply only a token-resolved location.
    required: false,
  },
  roomNumber: {
    type: String,
    // Optional so table-based (dine-in) calls can use tableNumber instead.
    required: false,
  },
  // Table identifier for dine-in QR calls (mutually exclusive with roomNumber).
  tableNumber: {
    type: String,
  },
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Optional: anonymous QR guests have no user account.
    required: false,
  },
  // Distinguishes anonymous QR-guest calls from staff-raised calls.
  source: {
    type: String,
    enum: ['staff', 'guest_qr'],
    default: 'staff',
  },
  // Anonymous QR guest session that raised the call (for correlation).
  guestSessionId: {
    type: String,
  },
  // Optional guest-provided name shown to staff.
  guestName: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  requestType: {
    type: String,
    enum: ['cleaning', 'maintenance', 'roomService', 'emergency', 'checkout', 'assistance', 'bill', 'other'],
    default: 'other',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  description: {
    type: String,
    maxlength: 500,
  },
  status: {
    type: String,
    enum: ['open', 'acknowledged', 'inProgress', 'resolved', 'cancelled'],
    default: 'open',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Staff member assigned
  },
  acknowledgedAt: {
    type: Date,
  },
  resolvedAt: {
    type: Date,
  },
  notes: {
    type: String,
    maxlength: 500,
  },
}, {timestamps: true});

// Indexes for performance
waiterCallSchema.index({ hotel: 1, status: 1 });
waiterCallSchema.index({ room: 1, status: 1 });
waiterCallSchema.index({ assignedTo: 1, status: 1 });
waiterCallSchema.index({ priority: -1, createdAt: 1 });

export const WaiterCall = mongoose.model('WaiterCall', waiterCallSchema);
