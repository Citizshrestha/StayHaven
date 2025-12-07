import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
  // basic info
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  legalName: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['hotel', 'resort', 'villa', 'hotel_chain', 'franchise', 'hostel', 'apartment', 'other'],
    required: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  
  // Branding
  logo: {
    type: String, // URL to logo image
    default: null,
  },
  coverImage: {
    type: String, // URL to cover/banner image
    default: null,
  },
  brandColors: {
    primary: { type: String, default: '#1a73e8' },
    secondary: { type: String, default: '#f1f3f4' },
  },
  
  // Contact Information
  contact: {
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    website: {
      type: String,
      trim: true,
    },
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
    },
  },
  
  // Address
  address: {
    street: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
    },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  
  // Legal & Tax Information
  taxId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values but ensures uniqueness when present
    trim: true,
  },
  businessLicense: {
    number: String,
    issueDate: Date,
    expiryDate: Date,
    document: String, // URL to license document
  },
  
  // Subscription & Billing
  subscriptionTier: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free',
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'trial', 'suspended', 'cancelled'],
    default: 'trial',
  },
  subscriptionStartDate: {
    type: Date,
    default: Date.now,
  },
  subscriptionEndDate: {
    type: Date,
  },
  billingInfo: {
    billingEmail: String,
    billingAddress: String,
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'bank_transfer', 'upi', 'esewa', 'khalti', 'other'],
    },
    lastPaymentDate: Date,
    nextBillingDate: Date,
  },
  
  // Settings & Configuration
  settings: {
    defaultCurrency: {
      type: String,
      default: 'NPR',
      enum: ['USD', 'EUR', 'GBP', 'INR', 'NPR'],
    },
    timezone: {
      type: String,
      default: 'Asia/Kathmandu',
    },
    language: {
      type: String,
      default: 'en',
    },
    dateFormat: {
      type: String,
      default: 'YYYY-MM-DD',
    },
    features: {
      multiProperty: { type: Boolean, default: false },
      advancedReporting: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      whiteLabel: { type: Boolean, default: false },
      channelManager: { type: Boolean, default: false },
    },
  },
  
  // Users & Access Control
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  admins: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Statistics
  totalProperties: {
    type: Number,
    default: 0,
  },
  totalUsers: {
    type: Number,
    default: 0,
  },
  totalBookings: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verifiedAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['pending_review', 'active', 'suspended', 'deactivated'],
    default: 'pending_review',
  },
  
  // Metadata
  notes: {
    type: String,
    maxlength: 1000,
  },
  tags: {
    type: [String],
    default: [],
  },
  
 
  
}, { timestamps: true });

// Indexes for better performance
companySchema.index({ status: 1 });
companySchema.index({ subscriptionTier: 1 });
companySchema.index({ 'address.city': 1 });
companySchema.index({ 'address.country': 1 });
companySchema.index({ createdAt: -1 });

// Virtual for getting all properties
companySchema.virtual('properties', {
  ref: 'Hotel',
  localField: '_id',
  foreignField: 'company',
});

// Virtual for getting all users associated with this company
companySchema.virtual('users', {
  ref: 'User',
  localField: '_id',
  foreignField: 'company',
});

export const Company = mongoose.model("Company", companySchema);