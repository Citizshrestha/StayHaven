import mongoose from "mongoose";

const waiterCallSchema = new mongoose.Schema({
  roomNumber: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Handled'],
    default: 'Active',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('WaiterCall', waiterCallSchema);
