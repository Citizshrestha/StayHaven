# Collection Schema Definitions

> Detailed schema definitions for all MongoDB collections in StayHaven

---

## 📋 Table of Contents

1. [User Schema](#user-schema)
2. [Role Schema](#role-schema)
3. [Company Schema](#company-schema)
4. [Hotel Schema](#hotel-schema)
5. [Room Schema](#room-schema)
6. [Booking Schema](#booking-schema)
7. [Loyalty Schema](#loyalty-schema)
8. [MenuItem Schema](#menuitem-schema)
9. [Order Schema](#order-schema)
10. [WaiterCall Schema](#waitercall-schema)
11. [TableAssignment Schema](#tableassignment-schema)
12. [Notification Schema](#notification-schema)

---

## 👤 User Schema

**Collection**: `users`  
**File**: `models/user.schema.js`

```javascript
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  // Identity
  fullname: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters'],
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  
  password: {
    type: String,
    required: function() {
      return !this.isGoogleUser;
    },
    minlength: [6, 'Password must be at least 6 characters']
  },
  
  // Profile
  profilePicture: {
    type: String,
    default: null
  },
  
  phoneNumber: {
    type: String,
    trim: true
  },
  
  dateOfBirth: Date,
  
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    default: 'prefer_not_to_say'
  },
  
  nationality: String,
  
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  // Role & Permissions
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  
  companyRole: {
    type: String,
    enum: ['owner', 'manager', 'chief', 'waiter', 'receptionist', 'housekeeping', 'maintenance']
  },
  
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel'
  },
  
  // Account Status
  accountStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deactivated'],
    default: 'active'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Authentication
  isGoogleUser: {
    type: Boolean,
    default: false
  },
  
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  refreshToken: String,
  
  // Password Reset
  resetOtp: String,
  resetOtpExpireAt: Date,
  
  // Staff Onboarding
  invitedAt: Date,
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  onboardedAt: Date,
  
  // Timestamps (automatic)
  // createdAt: Date
  // updatedAt: Date
  
}, { timestamps: true });

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ company: 1 });
userSchema.index({ hotel: 1 });
userSchema.index({ role: 1 });

// Pre-save hook: Hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  if (this.isGoogleUser && !this.password) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method: Compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model('User', userSchema);
```

**Field Count**: 30+ fields  
**Indexes**: 4  
**Methods**: 1 (matchPassword)  
**Hooks**: 1 (pre-save for password hashing)

---

## 🎭 Role Schema

**Collection**: `roles`  
**File**: `models/role.schema.js`

```javascript
const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'admin',
      'owner',
      'manager',
      'chief',
      'waiter',
      'receptionist',
      'housekeeping',
      'maintenance',
      'guest'
    ]
  },
  
  description: {
    type: String,
    required: true
  },
  
  permissions: [{
    type: String
  }],
  
  level: {
    type: String,
    enum: ['system', 'company', 'hotel', 'guest'],
    required: true
  }
  
}, { timestamps: true });

roleSchema.index({ name: 1 });

export const Role = mongoose.model('Role', roleSchema);
```

**Field Count**: 4 fields  
**Indexes**: 1  
**Seed Data**: 9 predefined roles

---

## 🏢 Company Schema

**Collection**: `companies`  
**File**: `models/company.schema.js`

```javascript
const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    minlength: [2, 'Company name must be at least 2 characters'],
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  logo: String,
  
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Contact Info
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  
  phone: String,
  
  website: String,
  
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  // Business Details
  registrationNumber: String,
  
  taxId: String,
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  totalHotels: {
    type: Number,
    default: 0
  },
  
  totalStaff: {
    type: Number,
    default: 0
  }
  
}, { timestamps: true });

companySchema.index({ owner: 1 });
companySchema.index({ isActive: 1 });

export const Company = mongoose.model('Company', companySchema);
```

**Field Count**: 15 fields  
**Indexes**: 2

---

## 🏨 Hotel Schema

**Collection**: `hotels`  
**File**: `models/hotel.schema.js`

```javascript
const hotelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hotel name is required'],
    trim: true
  },
  
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Location
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  
  // Contact
  phone: String,
  email: String,
  website: String,
  
  // Details
  category: {
    type: String,
    enum: ['budget', 'mid-range', 'luxury', 'boutique', 'resort'],
    default: 'mid-range'
  },
  
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  
  totalRooms: {
    type: Number,
    default: 0
  },
  
  // Amenities
  amenities: [{
    type: String,
    enum: [
      'wifi',
      'parking',
      'pool',
      'gym',
      'spa',
      'restaurant',
      'bar',
      'room_service',
      'laundry',
      'concierge',
      'airport_shuttle',
      'business_center',
      'pet_friendly'
    ]
  }],
  
  // Media
  images: [{
    url: String,
    caption: String
  }],
  
  coverImage: String,
  
  // Operating Hours
  checkInTime: {
    type: String,
    default: '14:00'
  },
  
  checkOutTime: {
    type: String,
    default: '12:00'
  },
  
  // Policies
  cancellationPolicy: {
    type: String,
    maxlength: [1000, 'Policy cannot exceed 1000 characters']
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'under_maintenance'],
    default: 'active'
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
  
}, { timestamps: true });

// Indexes
hotelSchema.index({ company: 1 });
hotelSchema.index({ location: '2dsphere' });
hotelSchema.index({ status: 1 });
hotelSchema.index({ category: 1, rating: -1 });

export const Hotel = mongoose.model('Hotel', hotelSchema);
```

**Field Count**: 25+ fields  
**Indexes**: 4 (including geospatial index)

---

## 🛏️ Room Schema

**Collection**: `rooms`  
**File**: `models/room.schema.js`

```javascript
const roomSchema = new mongoose.Schema({
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  
  roomNumber: {
    type: String,
    required: true
  },
  
  roomType: {
    type: String,
    enum: ['single', 'double', 'suite', 'deluxe', 'presidential'],
    required: true
  },
  
  floor: Number,
  
  // Capacity
  capacity: {
    adults: {
      type: Number,
      default: 2
    },
    children: {
      type: Number,
      default: 1
    }
  },
  
  // Pricing
  pricePerNight: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Features
  bedType: {
    type: String,
    enum: ['single', 'double', 'queen', 'king', 'twin'],
    default: 'double'
  },
  
  amenities: [{
    type: String,
    enum: [
      'ac',
      'heater',
      'tv',
      'minibar',
      'safe',
      'balcony',
      'sea_view',
      'city_view',
      'bathtub',
      'shower',
      'hairdryer',
      'iron',
      'coffee_maker'
    ]
  }],
  
  // Media
  images: [String],
  
  // Status
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'cleaning'],
    default: 'available'
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
  
}, { timestamps: true });

// Compound indexes
roomSchema.index({ hotel: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ hotel: 1, status: 1 });
roomSchema.index({ hotel: 1, roomType: 1, pricePerNight: 1 });

export const Room = mongoose.model('Room', roomSchema);
```

**Field Count**: 15 fields  
**Indexes**: 3 (1 unique compound index)

---

## 📅 Booking Schema

**Collection**: `bookings`  
**File**: `models/booking.schema.js`

```javascript
const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  
  // Dates
  checkInDate: {
    type: Date,
    required: true
  },
  
  checkOutDate: {
    type: Date,
    required: true
  },
  
  // Guest Info
  guests: {
    adults: {
      type: Number,
      required: true,
      min: 1
    },
    children: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Pricing
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Status
  bookingStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'],
    default: 'pending'
  },
  
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  
  // Special Requests
  specialRequests: String,
  
  // Cancellation
  cancelledAt: Date,
  cancellationReason: String
  
}, { timestamps: true });

// Indexes
bookingSchema.index({ user: 1, bookingStatus: 1 });
bookingSchema.index({ hotel: 1, bookingStatus: 1 });
bookingSchema.index({ room: 1, checkInDate: 1 });
bookingSchema.index({ checkInDate: 1, checkOutDate: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);
```

**Field Count**: 15 fields  
**Indexes**: 4

---

## 🎁 Loyalty Schema

**Collection**: `loyalties`  
**File**: `models/loyalty.schema.js`

```javascript
const loyaltySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  
  history: [{
    type: {
      type: String,
      enum: ['earned', 'redeemed', 'expired']
    },
    points: Number,
    description: String,
    date: {
      type: Date,
      default: Date.now
    }
  }]
  
}, { timestamps: true });

loyaltySchema.index({ user: 1 });
loyaltySchema.index({ tier: 1, points: -1 });

export const Loyalty = mongoose.model('Loyalty', loyaltySchema);
```

**Field Count**: 4 fields  
**Indexes**: 2

---

## 🍽️ MenuItem Schema

**Collection**: `menuitems`  
**File**: `models/menuItem.schema.js`

```javascript
const menuItemSchema = new mongoose.Schema({
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  
  name: {
    type: String,
    required: [true, 'Menu item name is required'],
    trim: true
  },
  
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  category: {
    type: String,
    enum: [
      'appetizer',
      'main_course',
      'dessert',
      'beverage',
      'breakfast',
      'lunch',
      'dinner',
      'snack'
    ],
    required: true
  },
  
  price: {
    type: Number,
    required: true,
    min: 0
  },
  
  images: [String],
  
  // Dietary Info
  isVegetarian: {
    type: Boolean,
    default: false
  },
  
  isVegan: {
    type: Boolean,
    default: false
  },
  
  isGlutenFree: {
    type: Boolean,
    default: false
  },
  
  allergens: [{
    type: String,
    enum: ['dairy', 'eggs', 'nuts', 'soy', 'wheat', 'fish', 'shellfish']
  }],
  
  // Availability
  isAvailable: {
    type: Boolean,
    default: true
  },
  
  preparationTime: {
    type: Number, // in minutes
    default: 15
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
  
}, { timestamps: true });

// Indexes
menuItemSchema.index({ hotel: 1, category: 1 });
menuItemSchema.index({ hotel: 1, isAvailable: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

export const MenuItem = mongoose.model('MenuItem', menuItemSchema);
```

**Field Count**: 15 fields  
**Indexes**: 3 (including text index)

---

## 🛎️ Order Schema

**Collection**: `orders`  
**File**: `models/order.schema.js`

```javascript
// Counter schema for auto-increment orderNumber
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: {
    type: Number,
    default: 0
  }
});

const Counter = mongoose.model('Counter', counterSchema);

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: Number,
    unique: true
  },
  
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Order Items
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    specialInstructions: String
  }],
  
  // Pricing
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  
  serviceFee: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Order Type
  orderType: {
    type: String,
    enum: ['dine_in', 'room_service', 'takeaway'],
    required: true
  },
  
  // Location
  roomNumber: String, // For room service
  tableNumber: String, // For dine-in
  
  // Status
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending'
  },
  
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  
  // Timestamps
  orderedAt: {
    type: Date,
    default: Date.now
  },
  
  confirmedAt: Date,
  preparingAt: Date,
  readyAt: Date,
  deliveredAt: Date,
  
  // Cancellation
  cancelledAt: Date,
  cancellationReason: String,
  
  // Notes
  specialInstructions: String
  
}, { timestamps: true });

// Pre-save hook: Auto-increment orderNumber
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'orderNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.orderNumber = counter.seq;
  }
  next();
});

// Indexes
orderSchema.index({ hotel: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ user: 1, orderStatus: 1 });
orderSchema.index({ hotel: 1, orderStatus: 1 });
orderSchema.index({ hotel: 1, orderType: 1, orderStatus: 1 });
orderSchema.index({ orderedAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
```

**Field Count**: 25 fields  
**Indexes**: 5  
**Hooks**: 1 (pre-save for auto-increment)

---

## 🔔 WaiterCall Schema

**Collection**: `waitercalls`  
**File**: `models/waitercall.schema.js`

```javascript
const waiterCallSchema = new mongoose.Schema({
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  tableNumber: {
    type: String,
    required: true
  },
  
  requestType: {
    type: String,
    enum: ['assistance', 'bill', 'order', 'other'],
    default: 'assistance'
  },
  
  message: String,
  
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Assigned Staff
  assignedWaiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
  acknowledgedAt: Date,
  completedAt: Date,
  cancelledAt: Date
  
}, { timestamps: true });

// Indexes
waiterCallSchema.index({ hotel: 1, status: 1 });
waiterCallSchema.index({ hotel: 1, tableNumber: 1 });
waiterCallSchema.index({ assignedWaiter: 1, status: 1 });

export const WaiterCall = mongoose.model('WaiterCall', waiterCallSchema);
```

**Field Count**: 12 fields  
**Indexes**: 3

---

## 🪑 TableAssignment Schema

**Collection**: `tableassignments`  
**File**: `models/tableAssignment.schema.js`

```javascript
const tableAssignmentSchema = new mongoose.Schema({
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  
  tableNumber: {
    type: String,
    required: true
  },
  
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved'],
    default: 'available'
  },
  
  capacity: {
    type: Number,
    default: 4
  },
  
  assignedAt: Date,
  releasedAt: Date
  
}, { timestamps: true });

// Indexes
tableAssignmentSchema.index({ hotel: 1, tableNumber: 1 }, { unique: true });
tableAssignmentSchema.index({ hotel: 1, status: 1 });

export const TableAssignment = mongoose.model('TableAssignment', tableAssignmentSchema);
```

**Field Count**: 9 fields  
**Indexes**: 2

---

## 🔔 Notification Schema

**Collection**: `notifications`  
**File**: `models/notification.schema.js`

```javascript
const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  type: {
    type: String,
    enum: [
      'booking',
      'order',
      'waiter_call',
      'staff_invitation',
      'system',
      'promotional'
    ],
    required: true
  },
  
  title: {
    type: String,
    required: true
  },
  
  message: {
    type: String,
    required: true
  },
  
  // Related Entity
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['booking', 'order', 'waitercall', 'company', 'hotel']
    },
    entityId: mongoose.Schema.Types.ObjectId
  },
  
  // Status
  isRead: {
    type: Boolean,
    default: false
  },
  
  readAt: Date,
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
  
}, { timestamps: true });

// Indexes
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ type: 1, priority: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);
```

**Field Count**: 10 fields  
**Indexes**: 3

---

## 📊 Schema Summary

| Collection | Documents | Fields | Indexes | Relationships |
|------------|-----------|--------|---------|---------------|
| users | 1,000+ | 30+ | 4 | role, company, hotel |
| roles | 9 | 4 | 1 | - |
| companies | 50+ | 15 | 2 | owner |
| hotels | 200+ | 25+ | 4 | company |
| rooms | 5,000+ | 15 | 3 | hotel |
| bookings | 10,000+ | 15 | 4 | user, hotel, room |
| loyalties | 500+ | 4 | 2 | user |
| menuitems | 2,000+ | 15 | 3 | hotel |
| orders | 50,000+ | 25 | 5 | hotel, user, menuItems |
| waitercalls | 10,000+ | 12 | 3 | hotel, user, waiter |
| tableassignments | 5,000+ | 9 | 2 | hotel, order, user |
| notifications | 100,000+ | 10 | 3 | user |

---

## 📚 Related Documents

- [Database Overview](./database-overview.md)
- [Entity Relationship Model](./entity-relationship-model.md)
- [Schema Relationships](./schema-relationships.md)
- [Data Validation Rules](./data-validation-rules.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - All 12 collection schemas documented
