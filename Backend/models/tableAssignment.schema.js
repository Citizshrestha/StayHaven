import mongoose from "mongoose";

const tableAssignmentSchema = new mongoose.Schema({
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
  },
  waiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  waiterName: {
    type: String,
    required: true,
  },
  tables: [{
    type: String, // Table numbers assigned to this waiter
    required: true,
  }],
  rooms: [{
    type: String, // Room numbers assigned to this waiter (for room service)
  }],
  shift: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night'],
    default: 'morning',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

// Ensure a waiter can only have one active assignment per hotel
tableAssignmentSchema.index({ hotel: 1, waiter: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

// Index for quick lookup by table
tableAssignmentSchema.index({ hotel: 1, tables: 1, isActive: 1 });

// Index for quick lookup by room
tableAssignmentSchema.index({ hotel: 1, rooms: 1, isActive: 1 });

export const TableAssignment = mongoose.model('TableAssignment', tableAssignmentSchema);
