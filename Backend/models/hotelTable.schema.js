import mongoose from "mongoose";
import crypto from "crypto";

const hotelTableSchema = new mongoose.Schema({
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
    index: true,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  tableNumber: {
    type: String,
    required: true,
    trim: true,
  },
  tableName: {
    type: String,
    trim: true,
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
    default: 4,
  },
  location: {
    type: String,
    enum: ['indoor', 'outdoor', 'terrace', 'rooftop', 'private', 'bar'],
    default: 'indoor',
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance'],
    default: 'available',
  },
  // QR Code fields
  uniqueToken: {
    type: String,
    unique: true,
    required: true,
  },
  qrCodeData: {
    type: String, // The full URL encoded in the QR code
  },
  qrCodeImage: {
    type: String, // Base64 or Cloudinary URL of QR code image
  },
  isQrActive: {
    type: Boolean,
    default: true,
  },
  // Metadata
  description: {
    type: String,
    trim: true,
  },
  minSpend: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

// Compound index for unique table numbers per hotel
hotelTableSchema.index({ hotel: 1, tableNumber: 1 }, { unique: true });

// Note: uniqueToken index is already created by the unique: true field option

// Pre-save middleware to generate unique token if not exists
hotelTableSchema.pre('save', function(next) {
  if (!this.uniqueToken) {
    // Generate a unique token: TBL-{random}
    this.uniqueToken = `TBL-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  }
  next();
});

// Static method to generate new token (for regeneration)
hotelTableSchema.statics.generateNewToken = function() {
  return `TBL-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
};

// Instance method to regenerate QR token
hotelTableSchema.methods.regenerateToken = function() {
  this.uniqueToken = `TBL-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  this.qrCodeData = null;
  this.qrCodeImage = null;
  return this;
};

export const HotelTable = mongoose.model('HotelTable', hotelTableSchema);
