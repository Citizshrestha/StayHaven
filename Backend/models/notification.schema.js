import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Who receives it
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Who sent it (optional for system notifications)
  },
  type: {
    type: String,
    required: true, // e.g., 'Order', 'WaiterCall', 'System'
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  data: {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    roomNumber: { type: Number },
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Notification', notificationSchema);
