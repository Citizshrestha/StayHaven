import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  roomNumber: {
    type: Number,
    required: true,
  },
  items: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Preparing', 'Delivered'],
    default: 'Pending',
  },
  orderBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // reference to user.schema.js
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Order', orderSchema);
