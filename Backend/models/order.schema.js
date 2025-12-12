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
    required: false,  // only for room service 
  },
  roomNumber: {
    type: String,
  },
  tableNumber: {
    type: String,
  },

  // staff info 
  orderBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
   orderByName: {
      type: String,
   },
   
   // customer info 
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  customerName: {
    type: String,
  },
  customerPhone: {
    type: String,
  },
  customerPhone: {
    type: String,
  },
  // order items 
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
      notes: {
        type: String,
      }
    },
  ],
  // pricing
  totalPrice: {
    type: Number,
    required: true,
  },
  // order type and status
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

  // additional info
  preparationTime: {
    type: Number, // In minutes
  },
  deliveredAt: {
    type: Date,
  },
}, { timestamps: true });

// Indexes for performance
orderSchema.index({ room: 1, status: 1 });  // find orders by hotel and staus
orderSchema.index({ hotel: 1, status: 1 });
orderSchema.index({ orderBy: 1, createdAt: -1 });  // find orders by staff
orderSchema.index({ status: 1, createdAt: -1 });  // find orders by status (newest first)

export const Order = mongoose.model('Order', orderSchema);
