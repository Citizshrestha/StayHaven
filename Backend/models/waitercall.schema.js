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
    required: true,
  },
  roomNumber: {
    type: String,
    required: true,
  },
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  requestType: {
    type: String,
    enum: ['cleaning', 'maintenance', 'roomService', 'emergency', 'checkout', 'assistance', 'other'],
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
