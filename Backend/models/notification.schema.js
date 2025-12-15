import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  type: {
    type: String,
    required: true,
    enum: [
      'booking_confirmed',
      'booking_cancelled',
      'booking_reminder',
      'payment_received',
      'payment_failed',
      'review_received',
      'hotel_approved',
      'hotel_rejected',
      'hotel_suspended',
      'order_status',
      'order_delivered',
      'waiter_call',
      'waiter_call_resolved',
      'system',
      'promotional',
      'account',
    ],
  },
  title: {
    type: String,
    required: true,
    maxlength: 100,
  },
  message: {
    type: String,
    required: true,
    maxlength: 500,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  actionUrl: {
    type: String,
  },
  payload: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
}, {timestamps: true});

// Indexes for performance
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: -1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
