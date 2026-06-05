import mongoose from "mongoose";
import crypto from "crypto";

const roomSchema = new mongoose.Schema({
    hotel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hotel",
        required: true,
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
    },
    roomName: {
        type: String,
        required: true,
        trim: true,
    },
    roomNumber: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['single', 'double', 'suite', 'deluxe', 'villa', 'Standard Twin', 'Standard Queen', 'Deluxe King', 'Executive Suite', 'Ocean View', 'Presidential Suite', 'Garden View'],
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    floor: {
        type: Number,
        default: 1,
    },
    maxGuests: {
        type: Number,
        default: 2,
    },
    rating: {
        type: Number,
        default: 4.0,
        min: 0,
        max: 5,
    },
    lastCleaned: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['available', 'occupied', 'maintenance', 'cleaning', 'reserved'],
        default: 'available',
        required: true,
    },
    description: {
        type: String,
        trim: true,
    },
    amenities: {
        type: [String],
        default: [],
    },
    images: {
        type: [String],
        default: [],
    },
    capacity: {
        adults: {
            type: Number,
            default: 2,
        },
        children: {
            type: Number,
            default: 0,
        },
    },
    bedType: {
        type: String,
        enum: ['Single', 'Double', 'Queen', 'King', 'Twin'],
    },
    // QR Code fields
    uniqueToken: {
        type: String,
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
    // Legacy QR field (deprecated - use uniqueToken, qrCodeData, qrCodeImage instead)
    QR: {
        type: String,
    }

}, { timestamps: true })

// ═════════════════════════════════════════════════════════════════════════════
// INDEXES FOR PRODUCTION PERFORMANCE
// ═════════════════════════════════════════════════════════════════════════════

// Compound index for unique room numbers per hotel
roomSchema.index({ hotel: 1, roomNumber: 1 }, { unique: true });

// Status queries for dashboard (available, occupied, maintenance, etc.)
roomSchema.index({ hotel: 1, status: 1 });
roomSchema.index({ company: 1, status: 1 });

// Room type filtering
roomSchema.index({ hotel: 1, type: 1 });
roomSchema.index({ hotel: 1, floor: 1 });

// Combined index for room listing with filters
roomSchema.index({ hotel: 1, status: 1, type: 1 });
roomSchema.index({ hotel: 1, status: 1, floor: 1 });

// Text search
roomSchema.index({ roomName: "text", roomNumber: "text", type: "text" });

// QR code lookups
roomSchema.index({ uniqueToken: 1 }, { unique: true, sparse: true });

// Pre-save middleware to generate unique token if not exists
roomSchema.pre('save', function(next) {
  if (!this.uniqueToken) {
    // Generate a unique token: RM-{random}
    this.uniqueToken = `RM-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  }
  next();
});

// Static method to generate new token (for regeneration)
roomSchema.statics.generateNewToken = function() {
  return `RM-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
};

// Instance method to regenerate QR token
roomSchema.methods.regenerateToken = function() {
  this.uniqueToken = `RM-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  this.qrCodeData = null;
  this.qrCodeImage = null;
  return this;
};

export const Room = mongoose.model("Room", roomSchema);