# Mongoose Schema Design

> Comprehensive guide to MongoDB data modeling with Mongoose ODM in StayHaven

---

## 📋 Table of Contents

1. [Schema Architecture](#schema-architecture)
2. [Core Schemas](#core-schemas)
3. [Schema Features](#schema-features)
4. [Validation](#validation)
5. [Indexing](#indexing)
6. [Hooks & Middleware](#hooks--middleware)
7. [Best Practices](#best-practices)

---

## 🏗️ Schema Architecture

### Mongoose Version

- **Mongoose**: 8.9.1 (LTS)
- **MongoDB Driver**: Bundled with Mongoose
- **Connection**: Single connection string with no deprecated options

### Schema Organization

```
models/
├── user.schema.js          # User authentication & profiles
├── role.schema.js          # Role-based access control
├── company.schema.js       # Multi-tenant company data
├── hotel.schema.js         # Property listings
├── room.schema.js          # Room inventory
├── booking.schema.js       # Reservation management
├── order.schema.js         # Food & beverage orders
├── menuItem.schema.js      # Restaurant menu items
├── tableAssignment.schema.js
├── waitercall.schema.js    # Service requests
├── notification.schema.js   # Push notifications
└── loyalty.schema.js       # Guest loyalty program
```

---

## 📦 Core Schemas

### 1. User Schema

**File**: `models/user.schema.js`

```javascript
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  // Core Identity
  fullname: {
    type: String,
    required: [true, "Full name is required"],
    trim: true,
  },
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    trim: true,
    lowercase: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
  },
  profilePicture: {
    type: String,
    default: null,
  },

  // Role & Permissions
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    required: true,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    index: true, // Indexed for multi-tenant queries
  },
  companyRole: {
    type: String,
    enum: ['owner', 'admin', 'manager', 'chief', 'waiter', 'receptionist', 'housekeeping', 'maintenance'],
    default: null,
  },
  permissions: {
    type: [String],
    default: [],
  },
  assignedProperties: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Hotel" }],
    default: [],
  },

  // Password Reset
  resetOtp: {
    type: String,
    default: null,
  },
  resetOtpExpireAt: {
    type: Number,
    default: null,
  },

  // Google OAuth
  isGoogleUser: {
    type: Boolean,
    default: false,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },

  // Guest Features
  wishlist: {
    type: [String],
    default: [],
  },
  cart: [
    {
      hotelId: { type: String },
      quantity: { type: Number },
    },
  ],

  // Token Management
  refreshToken: {
    type: String,
    default: null,
  },
  inviteToken: {
    type: String,
    default: null,
  },
  inviteTokenExpireAt: {
    type: Date,
    default: null,
  },

  // Staff Onboarding
  accountStatus: {
    type: String,
    enum: ['invited', 'pending', 'active', 'deactivated'],
    default: 'pending',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  invitedAt: {
    type: Date,
  },
  onboardedAt: {
    type: Date,
  },
}, { timestamps: true });

// Compound index for multi-tenancy
userSchema.index({ company: 1, companyRole: 1 });

// Pre-save hook: Hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Instance method: Compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model("User", userSchema);
```

### 2. Hotel Schema

**File**: `models/hotel.schema.js`

```javascript
import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Hotel name is required"],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "Description is required"],
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

  // Location
  location: {
    city: {
      type: String,
      required: true,
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

  // Classification
  category: {
    type: String,
    enum: ['Hotel', 'Resort', 'Villa', 'Apartment', 'Guest House', 'Hostel'],
    required: true,
  },
  starRating: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    required: true,
  },

  // Ratings & Reviews
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

  // Pricing
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

  // Media
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

  // Features
  amenities: {
    type: [String],
    default: [],
  },

  // Policies
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

  // Contact Info
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

  // Status & Visibility
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

  // Room Statistics
  totalRooms: {
    type: Number,
    default: 0,
  },
  availableRooms: {
    type: Number,
    default: 0,
  },

  // Business Metrics
  totalBookings: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// Indexes
hotelSchema.index({ company: 1, status: 1 });
hotelSchema.index({ location: 1, category: 1 });
hotelSchema.index({ starRating: -1, rating: -1 });

export const Hotel = mongoose.model("Hotel", hotelSchema);
```

### 3. Booking Schema

**File**: `models/booking.schema.js`

```javascript
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
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
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  checkIn: {
    type: Date,
    required: true,
  },
  checkOut: {
    type: Date,
    required: true,
  },
  guests: {
    adults: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    children: {
      type: Number,
      default: 0,
      min: 0,
      max: 8,
    },
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'NPR'],
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Checked-In', 'Checked-Out', 'Cancelled', 'No-Show'],
    default: 'Pending',
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'refunded'],
    default: 'unpaid',
  },
  confirmationCode: {
    type: String,
    unique: true,
    sparse: true, // Allows null values while maintaining uniqueness
  },
  specialRequests: {
    type: String,
    maxlength: 500,
  },
  cancellationReason: {
    type: String,
    maxlength: 500,
  },
  cancelledAt: {
    type: Date,
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  bookingSource: {
    type: String,
    enum: ['web', 'mobile', 'admin', 'api'],
    default: 'web',
  },
}, { timestamps: true });

// Compound indexes for performance
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ hotel: 1, status: 1 });
bookingSchema.index({ confirmationCode: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ company: 1, status: 1 });
bookingSchema.index({ company: 1, createdAt: -1 });

export const Booking = mongoose.model("Booking", bookingSchema);
```

### 4. Order Schema with Auto-Increment

**File**: `models/order.schema.js`

```javascript
import mongoose from "mongoose";

// Counter schema for auto-incrementing order numbers per hotel
const counterSchema = new mongoose.Schema({
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
    unique: true,
  },
  seq: {
    type: Number,
    default: 1000, // Start from 1001
  },
});

export const Counter = mongoose.model('Counter', counterSchema);

const orderSchema = new mongoose.Schema({
  // Human-readable order number (e.g., 1001, 1002, etc.)
  orderNumber: {
    type: Number,
    // Auto-generated by pre-save hook
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: false, // Only for room service
  },
  roomNumber: {
    type: String,
  },
  tableNumber: {
    type: String,
  },

  // Staff Info
  orderBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderByName: {
    type: String,
  },

  // Customer Info
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

  // Order Items
  items: [
    {
      menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: false, // Allows custom items
      },
      name: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true },
      notes: { type: String },
    },
  ],

  // Pricing
  totalPrice: {
    type: Number,
    required: true,
  },

  // Order Type & Status
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

  // Timing
  preparationTime: {
    type: Number, // In minutes
  },
  deliveredAt: {
    type: Date,
  },

  // Bill Tracking
  billSent: {
    type: Boolean,
    default: false,
  },
  billSentAt: {
    type: Date,
  },
  billSentTo: {
    email: String,
    phone: String,
    method: {
      type: String,
      enum: ['email', 'sms', 'whatsapp'],
    },
  },
}, { timestamps: true });

// Indexes for performance
orderSchema.index({ hotel: 1, orderNumber: 1 }, { unique: true }); // Unique per hotel
orderSchema.index({ room: 1, status: 1 });
orderSchema.index({ hotel: 1, status: 1 });
orderSchema.index({ orderBy: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

// Pre-save hook: Auto-generate order number
orderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderNumber) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { hotel: this.hotel },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.orderNumber = counter.seq;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

export const Order = mongoose.model('Order', orderSchema);
```

---

## 🎯 Schema Features

### 1. Validation

#### Built-in Validators

```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
  },
  age: {
    type: Number,
    min: [18, "Must be at least 18 years old"],
    max: [120, "Invalid age"],
  },
  username: {
    type: String,
    minlength: [3, "Username must be at least 3 characters"],
    maxlength: [20, "Username cannot exceed 20 characters"],
  },
});
```

#### Custom Validators

```javascript
images: {
  type: [String],
  required: true,
  validate: {
    validator: function (v) {
      return v && v.length > 0;
    },
    message: 'At least one image is required'
  }
}
```

### 2. Enums

```javascript
status: {
  type: String,
  enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
  default: 'pending',
}
```

### 3. Default Values

```javascript
createdAt: {
  type: Date,
  default: Date.now,
},
isActive: {
  type: Boolean,
  default: true,
}
```

### 4. References

```javascript
owner: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true,
}
```

### 5. Nested Objects

```javascript
location: {
  city: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
}
```

### 6. Arrays

```javascript
// Simple array
amenities: {
  type: [String],
  default: [],
}

// Array of objects
items: [
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
  },
]

// Array of references
assignedProperties: {
  type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Hotel" }],
  default: [],
}
```

---

## 📇 Indexing

### Single Field Indexes

```javascript
company: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Company",
  index: true, // Single field index
}
```

### Compound Indexes

```javascript
// Defined after schema
userSchema.index({ company: 1, companyRole: 1 });
bookingSchema.index({ user: 1, status: 1 });
orderSchema.index({ hotel: 1, orderNumber: 1 }, { unique: true });
```

### Unique Indexes

```javascript
email: {
  type: String,
  unique: true, // Unique index
}

confirmationCode: {
  type: String,
  unique: true,
  sparse: true, // Allows null values
}
```

### Text Indexes

```javascript
hotelSchema.index({ name: 'text', description: 'text' });
```

---

## 🔧 Hooks & Middleware

### Pre-Save Hooks

#### Password Hashing

```javascript
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
```

#### Auto-Increment Counter

```javascript
orderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderNumber) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { hotel: this.hotel },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.orderNumber = counter.seq;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});
```

### Instance Methods

```javascript
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Usage
const isMatch = await user.matchPassword('password123');
```

### Static Methods

```javascript
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Usage
const user = await User.findByEmail('john@example.com');
```

### Virtual Properties

```javascript
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Enable virtuals in JSON
userSchema.set('toJSON', { virtuals: true });
```

---

## ✅ Best Practices

### 1. **Use Timestamps**

```javascript
const schema = new mongoose.Schema({
  // fields...
}, { timestamps: true }); // Adds createdAt & updatedAt
```

### 2. **Index for Multi-Tenancy**

```javascript
company: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Company",
  index: true, // Critical for multi-tenant queries
}
```

### 3. **Sparse Unique Indexes**

```javascript
googleId: {
  type: String,
  unique: true,
  sparse: true, // Allows multiple null values
}
```

### 4. **Validation Messages**

```javascript
required: [true, "Email is required"], // Custom error message
```

### 5. **Enum for Fixed Values**

```javascript
status: {
  type: String,
  enum: ['pending', 'active', 'inactive'],
  default: 'pending',
}
```

### 6. **Select Sensitive Fields**

```javascript
// Exclude password by default
const user = await User.findById(id).select('-password');
```

### 7. **Populate References**

```javascript
const booking = await Booking.findById(id)
  .populate('user', 'fullname email')
  .populate('hotel', 'name location');
```

### 8. **Use Lean for Read-Only**

```javascript
// Returns plain JavaScript objects (faster)
const hotels = await Hotel.find().lean();
```

---

## 📚 Related Documents

- [Backend Overview](./backend-overview.md)
- [Controller Design Pattern](./controller-design-pattern.md)
- [Data Access Patterns](./data-access-patterns.md)
- [Database ER Diagram](../06-database-mongodb/database-er-diagram.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive Mongoose schema design guide
