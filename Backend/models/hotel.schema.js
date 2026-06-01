import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
    index: true,
  },
  propertyManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  location: {
    city: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  category: {
    type: String,
    enum: ['Hotel', 'Resort', 'Villa', 'Apartment', 'Guest House', 'Hostel'],
    required: true,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  starRating: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    required: true,
  },
  priceRange: {
    min: {
      type: Number,
      required: true,
    },
    max: {
      type: Number,
      required: true,
    },
  },
  images: {
    type: [String],
    required: true,
    validate: {
      validator: function (v) {
        return v && v.length > 0;
      },
      message: 'At least one image is required'
    }
  },
  amenities: {
    type: [String],
    default: [],
  },
  policies: {
    checkIn: {
      type: String,
      default: "2:00 PM",
    },
    checkOut: {
      type: String,
      default: "12:00 PM",
    },
    cancellationPolicy: {
      type: String,
      default: "Free cancellation up to 24 hours before check-in",
    },
    petPolicy: {
      type: String,
      default: "Pets not allowed",
    },
  },
  contact: {
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    website: {
      type: String,
    },
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  totalRooms: {
    type: Number,
    default: 0,
  },
  availableRooms: {
    type: Number,
    default: 0,
  },
  // Statistics
  totalBookings: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// Index for search optimization
hotelSchema.index({ name: 'text', description: 'text' });
hotelSchema.index({ 'location.city': 1 });
hotelSchema.index({ category: 1 });
hotelSchema.index({ starRating: 1 });
hotelSchema.index({ rating: -1 });
hotelSchema.index({ owner: 1 });

export const Hotel = mongoose.model("Hotel", hotelSchema);
