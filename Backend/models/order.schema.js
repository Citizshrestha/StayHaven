import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
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
  orderBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [
    {
      menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true,
      },
      name: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  orderType: {
    type: String,
    enum: ['roomService', 'dineIn', 'takeaway'],
    default: 'roomService',
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending',
  },
  priority: {
    type: String,
    enum: ['normal', 'high'],
    default: 'normal',
  },
  notes: {
    type: String,
    maxlength: 300,
  },
  preparationTime: {
    type: Number, // In minutes
  },
  deliveredAt: {
    type: Date,
  },
}, {timestamps: true});

// Indexes for performance
orderSchema.index({ room: 1, status: 1 });
orderSchema.index({ hotel: 1, status: 1 });
orderSchema.index({ orderBy: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
