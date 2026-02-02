# Schema Relationships

> ObjectId references, population strategies, and relationship patterns in StayHaven MongoDB schemas

---

## 📋 Table of Contents

1. [ObjectId References](#objectid-references)
2. [Population Strategies](#population-strategies)
3. [Compound Indexes](#compound-indexes)
4. [Cascade Operations](#cascade-operations)
5. [Relationship Patterns](#relationship-patterns)

---

## 🔗 ObjectId References

### What is ObjectId?

**ObjectId** is MongoDB's 12-byte unique identifier for documents.

```javascript
// ObjectId Structure (24 hex characters)
507f1f77bcf86cd799439011
│       │       │       │
│       │       │       └─ Counter (3 bytes)
│       │       └─ Random value (5 bytes)
│       └─ Process ID (2 bytes)
└─ Timestamp (4 bytes)

// Created automatically for _id field
const user = await User.create({ name: "John" });
console.log(user._id); // ObjectId("507f1f77bcf86cd799439011")
```

### Reference Types

#### 1. Required Reference

```javascript
// Booking MUST reference a User
const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, // Cannot create booking without user
    index: true
  }
});
```

#### 2. Optional Reference

```javascript
// User MAY belong to a Company
const userSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null // Optional for guests
  }
});
```

#### 3. Array of References

```javascript
// Order contains multiple menu items
const orderSchema = new mongoose.Schema({
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    quantity: Number,
    price: Number
  }]
});
```

---

## 🔍 Population Strategies

### Basic Population

```javascript
// Populate single reference
const booking = await Booking.findById(bookingId)
  .populate('user');

console.log(booking.user.fullname); // Populated user data
```

### Selective Field Population

```javascript
// Populate only specific fields
const booking = await Booking.findById(bookingId)
  .populate('user', 'fullname email profilePicture');

// Result:
// booking.user = {
//   _id: ObjectId(...),
//   fullname: "John Doe",
//   email: "john@example.com",
//   profilePicture: "..."
// }
```

### Multiple Population

```javascript
// Populate multiple references
const booking = await Booking.findById(bookingId)
  .populate('user', 'fullname email')
  .populate('hotel', 'name address')
  .populate('room', 'roomNumber roomType pricePerNight');
```

### Nested Population

```javascript
// Populate references within populated documents
const order = await Order.findById(orderId)
  .populate({
    path: 'hotel',
    select: 'name company',
    populate: {
      path: 'company',
      select: 'name owner'
    }
  });

// Result:
// order.hotel.company.name
// order.hotel.company.owner
```

### Array Population

```javascript
// Populate array of references
const order = await Order.findById(orderId)
  .populate('items.menuItem', 'name price images');

// Result:
// order.items[0].menuItem.name
// order.items[0].menuItem.price
```

### Conditional Population

```javascript
// Populate with query conditions
const hotels = await Hotel.find({ company: companyId })
  .populate({
    path: 'rooms',
    match: { status: 'available' }, // Only available rooms
    select: 'roomNumber roomType pricePerNight',
    options: {
      sort: { pricePerNight: 1 },
      limit: 10
    }
  });
```

### Virtual Population

```javascript
// Define virtual field for reverse relationship
hotelSchema.virtual('rooms', {
  ref: 'Room',
  localField: '_id',
  foreignField: 'hotel'
});

// Enable virtuals in toJSON
hotelSchema.set('toJSON', { virtuals: true });

// Populate virtual
const hotel = await Hotel.findById(hotelId)
  .populate('rooms');

console.log(hotel.rooms); // All rooms for this hotel
```

---

## 🔢 Compound Indexes

### Purpose of Compound Indexes

```javascript
// Compound indexes optimize queries with multiple conditions
// Index on (company, status) speeds up:
Hotel.find({ company: companyId, status: 'active' });
```

### Hotel Schema Indexes

```javascript
const hotelSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'under_maintenance']
  },
  category: String,
  rating: Number
});

// Compound indexes
hotelSchema.index({ company: 1 }); // Single field
hotelSchema.index({ company: 1, status: 1 }); // Compound
hotelSchema.index({ category: 1, rating: -1 }); // Compound with sort
```

### Booking Schema Indexes

```javascript
const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel'
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  bookingStatus: String,
  checkInDate: Date,
  checkOutDate: Date
});

// Compound indexes for common queries
bookingSchema.index({ user: 1, bookingStatus: 1 });
bookingSchema.index({ hotel: 1, bookingStatus: 1 });
bookingSchema.index({ room: 1, checkInDate: 1 });
bookingSchema.index({ checkInDate: 1, checkOutDate: 1 });
```

### Order Schema Indexes

```javascript
const orderSchema = new mongoose.Schema({
  orderNumber: Number,
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  orderStatus: String,
  orderType: String
});

// Compound indexes
orderSchema.index({ hotel: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ user: 1, orderStatus: 1 });
orderSchema.index({ hotel: 1, orderStatus: 1 });
orderSchema.index({ hotel: 1, orderType: 1, orderStatus: 1 });
```

### Unique Compound Indexes

```javascript
// Ensure uniqueness across multiple fields
roomSchema.index({ hotel: 1, roomNumber: 1 }, { unique: true });
// Prevents duplicate room numbers within same hotel

tableAssignmentSchema.index({ hotel: 1, tableNumber: 1 }, { unique: true });
// Prevents duplicate table numbers within same hotel
```

---

## 🔄 Cascade Operations

### Cascade Delete Pattern

```javascript
// When a hotel is deleted, delete all related rooms

// Option 1: Pre-remove hook
hotelSchema.pre('remove', async function(next) {
  // Delete all rooms belonging to this hotel
  await mongoose.model('Room').deleteMany({ hotel: this._id });
  
  // Delete all menu items
  await mongoose.model('MenuItem').deleteMany({ hotel: this._id });
  
  // Delete all orders
  await mongoose.model('Order').deleteMany({ hotel: this._id });
  
  next();
});

// Usage
const hotel = await Hotel.findById(hotelId);
await hotel.remove(); // Cascade delete triggered
```

### Soft Delete Instead

```javascript
// Preferred: Soft delete (mark as inactive)
hotelSchema.methods.softDelete = async function() {
  this.isActive = false;
  this.deletedAt = Date.now();
  await this.save();
  
  // Soft delete related entities
  await mongoose.model('Room').updateMany(
    { hotel: this._id },
    { isActive: false, deletedAt: Date.now() }
  );
};

// Usage
const hotel = await Hotel.findById(hotelId);
await hotel.softDelete();
```

### Cascade Update Pattern

```javascript
// When company name changes, update denormalized data

companySchema.post('save', async function(doc) {
  if (this.isModified('name')) {
    // Update all hotels with new company name
    await mongoose.model('Hotel').updateMany(
      { company: doc._id },
      { $set: { 'companyName': doc.name } }
    );
  }
});
```

---

## 🎯 Relationship Patterns

### 1. One-to-Few (Embedding)

```javascript
// Order embeds a few items (typically 1-20)
const orderSchema = new mongoose.Schema({
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    },
    quantity: Number,
    price: Number, // Denormalized for historical accuracy
    specialInstructions: String
  }],
  totalPrice: Number
});

// Pros:
// - Fast reads (single query)
// - Atomic updates
// - Historical data preserved

// Cons:
// - Document size grows
// - Not suitable for 100+ items
```

### 2. One-to-Many (Referencing)

```javascript
// Hotel has many rooms (referencing)
const roomSchema = new mongoose.Schema({
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
    index: true
  },
  roomNumber: String,
  // ... other fields
});

// Query pattern
const rooms = await Room.find({ hotel: hotelId });

// Pros:
// - Unlimited rooms
// - Independent updates
// - Efficient for large datasets

// Cons:
// - Requires additional query
// - Multiple documents
```

### 3. Many-to-Many (Referencing)

```javascript
// Order → MenuItem (many-to-many via embedding)
const orderSchema = new mongoose.Schema({
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    },
    quantity: Number
  }]
});

// Pros:
// - Flexible relationships
// - Historical pricing (denormalized price)

// Cons:
// - Requires population for details
```

### 4. Parent-Child (Hierarchical)

```javascript
// Company → Hotel → Room (hierarchical)

// Company level
const companySchema = new mongoose.Schema({
  name: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Hotel level
const hotelSchema = new mongoose.Schema({
  name: String,
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }
});

// Room level
const roomSchema = new mongoose.Schema({
  roomNumber: String,
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel'
  }
});

// Query pattern: Get all rooms in a company
const hotels = await Hotel.find({ company: companyId }).select('_id');
const hotelIds = hotels.map(h => h._id);
const rooms = await Room.find({ hotel: { $in: hotelIds } });
```

### 5. Polymorphic Relationships

```javascript
// Notification can reference different entity types
const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['booking', 'order', 'waitercall']
    },
    entityId: mongoose.Schema.Types.ObjectId
  },
  message: String
});

// Query with dynamic population
const notification = await Notification.findById(notificationId);

let entity;
if (notification.relatedEntity.entityType === 'booking') {
  entity = await Booking.findById(notification.relatedEntity.entityId);
} else if (notification.relatedEntity.entityType === 'order') {
  entity = await Order.findById(notification.relatedEntity.entityId);
}
```

### 6. Denormalization Pattern

```javascript
// Store frequently accessed data directly
const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userName: String, // Denormalized
  userEmail: String, // Denormalized
  
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel'
  },
  hotelName: String, // Denormalized
  
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  roomNumber: String // Denormalized
});

// Pre-save hook to denormalize
bookingSchema.pre('save', async function(next) {
  if (this.isModified('user')) {
    const user = await mongoose.model('User').findById(this.user);
    this.userName = user.fullname;
    this.userEmail = user.email;
  }
  
  if (this.isModified('hotel')) {
    const hotel = await mongoose.model('Hotel').findById(this.hotel);
    this.hotelName = hotel.name;
  }
  
  if (this.isModified('room')) {
    const room = await mongoose.model('Room').findById(this.room);
    this.roomNumber = room.roomNumber;
  }
  
  next();
});

// Pros:
// - Faster reads (no population needed)
// - Displays data even if referenced doc deleted

// Cons:
// - Data duplication
// - Potential inconsistency if not updated
```

---

## 📚 Related Documents

- [Database Overview](./database-overview.md)
- [Collection Schema Definitions](./collection-schema-definitions.md)
- [Entity Relationship Model](./entity-relationship-model.md)
- [Indexing & Query Optimization](./indexing-and-query-optimization.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive schema relationships documentation
