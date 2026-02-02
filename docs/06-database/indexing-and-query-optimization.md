# Indexing & Query Optimization

> Index strategies, query performance optimization, and database tuning for StayHaven

---

## 📋 Table of Contents

1. [Index Types](#index-types)
2. [Index Strategy](#index-strategy)
3. [Query Optimization](#query-optimization)
4. [Performance Monitoring](#performance-monitoring)
5. [Best Practices](#best-practices)

---

## 🏷️ Index Types

### 1. Single Field Index

```javascript
// User schema - Email index
userSchema.index({ email: 1 }); // 1 = ascending, -1 = descending

// Query optimization
// ✅ Optimized: Uses email index
User.find({ email: 'john@example.com' });

// ✅ Optimized: Case-insensitive search with collation
User.find({ email: /^john@example.com$/i });

// Speed: O(log n) instead of O(n)
```

**When to Use:**
- Frequently queried fields
- Unique constraints (email, username)
- Sort operations
- Range queries

**Index Statistics:**
```javascript
// Check index usage
db.users.getIndexes();

// Analyze index performance
db.users.find({ email: 'john@example.com' }).explain('executionStats');
```

### 2. Compound Index

```javascript
// Booking schema - User + Status index
bookingSchema.index({ user: 1, bookingStatus: 1 });

// Query optimization
// ✅ Optimized: Uses compound index
Booking.find({ user: userId, bookingStatus: 'confirmed' });

// ✅ Optimized: Uses left prefix of index
Booking.find({ user: userId });

// ❌ NOT optimized: Doesn't use left prefix
Booking.find({ bookingStatus: 'confirmed' });
```

**Index Prefix Rule:**
```javascript
// Index: { a: 1, b: 1, c: 1 }

// ✅ Uses index
find({ a: 1 })
find({ a: 1, b: 1 })
find({ a: 1, b: 1, c: 1 })

// ❌ Does NOT use index
find({ b: 1 })
find({ c: 1 })
find({ b: 1, c: 1 })
```

### 3. Unique Index

```javascript
// User schema - Unique username
userSchema.index({ username: 1 }, { unique: true });

// Hotel + Room Number - Compound unique index
roomSchema.index({ hotel: 1, roomNumber: 1 }, { unique: true });

// Prevents duplicates:
// ❌ Error: E11000 duplicate key error
Room.create({ hotel: hotelId, roomNumber: '101' });
Room.create({ hotel: hotelId, roomNumber: '101' }); // Fails
```

**Sparse Unique Index:**
```javascript
// Google ID - Unique but allow null
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

// Allows multiple users with null googleId
// But prevents duplicate non-null googleId values
```

### 4. Geospatial Index (2dsphere)

```javascript
// Hotel schema - Location index
hotelSchema.index({ location: '2dsphere' });

// Find hotels near a point
Hotel.find({
  location: {
    $near: {
      $geometry: {
        type: 'Point',
        coordinates: [longitude, latitude] // [84.1240, 28.2096] (Pokhara)
      },
      $maxDistance: 5000 // 5 km radius
    }
  }
});

// Find hotels within a polygon (city boundaries)
Hotel.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: 'Polygon',
        coordinates: [[
          [lon1, lat1],
          [lon2, lat2],
          [lon3, lat3],
          [lon1, lat1] // Close the polygon
        ]]
      }
    }
  }
});
```

**Geospatial Schema:**
```javascript
const hotelSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  address: String
});

hotelSchema.index({ location: '2dsphere' });
```

### 5. Text Index

```javascript
// MenuItem schema - Text search index
menuItemSchema.index({ name: 'text', description: 'text' });

// Full-text search
MenuItem.find({
  $text: {
    $search: 'chicken curry spicy'
  }
}).select({
  score: { $meta: 'textScore' } // Relevance score
}).sort({
  score: { $meta: 'textScore' }
});

// Results ranked by relevance:
// 1. "Spicy Chicken Curry" (score: 1.5)
// 2. "Chicken Biryani" (score: 0.8)
// 3. "Curry Rice" (score: 0.5)
```

**Text Index with Weights:**
```javascript
// Give more weight to name than description
menuItemSchema.index(
  { name: 'text', description: 'text' },
  { weights: { name: 10, description: 5 } }
);
```

### 6. TTL Index (Time To Live)

```javascript
// Notification schema - Auto-delete after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

// Notifications automatically deleted 30 days after creation
// MongoDB background task runs every 60 seconds
```

**Use Cases:**
- Session data
- Temporary notifications
- OTP tokens (expire after 10 minutes)
- Cache entries

---

## 📊 Index Strategy

### StayHaven Index Plan

#### User Collection

```javascript
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ company: 1 });
userSchema.index({ role: 1 });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });
userSchema.index({ resetOtp: 1 });
```

**Query Patterns:**
```javascript
// ✅ Login - Uses email index
User.findOne({ email: 'john@example.com' });

// ✅ Find company staff - Uses company index
User.find({ company: companyId });

// ✅ Find users by role - Uses role index
User.find({ role: roleId });
```

#### Hotel Collection

```javascript
hotelSchema.index({ company: 1 });
hotelSchema.index({ status: 1 });
hotelSchema.index({ location: '2dsphere' });
hotelSchema.index({ category: 1, rating: -1 });
hotelSchema.index({ company: 1, status: 1 });
```

**Query Patterns:**
```javascript
// ✅ Find active hotels in company - Uses compound index
Hotel.find({ company: companyId, status: 'active' });

// ✅ Search hotels by location - Uses geospatial index
Hotel.find({ location: { $near: { ... } } });

// ✅ Browse hotels by category & rating - Uses compound index
Hotel.find({ category: '5-star' }).sort({ rating: -1 });
```

#### Room Collection

```javascript
roomSchema.index({ hotel: 1 });
roomSchema.index({ hotel: 1, status: 1 });
roomSchema.index({ hotel: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ pricePerNight: 1 });
```

**Query Patterns:**
```javascript
// ✅ Find available rooms in hotel - Uses compound index
Room.find({ hotel: hotelId, status: 'available' });

// ✅ Find rooms by price range - Uses price index
Room.find({ pricePerNight: { $gte: 1000, $lte: 5000 } });
```

#### Booking Collection

```javascript
bookingSchema.index({ user: 1 });
bookingSchema.index({ hotel: 1 });
bookingSchema.index({ room: 1 });
bookingSchema.index({ user: 1, bookingStatus: 1 });
bookingSchema.index({ hotel: 1, bookingStatus: 1 });
bookingSchema.index({ checkInDate: 1, checkOutDate: 1 });
```

**Query Patterns:**
```javascript
// ✅ Find user's confirmed bookings - Uses compound index
Booking.find({ user: userId, bookingStatus: 'confirmed' });

// ✅ Find hotel bookings - Uses compound index
Booking.find({ hotel: hotelId, bookingStatus: 'confirmed' });

// ✅ Check room availability - Uses date range index
Booking.find({
  room: roomId,
  checkInDate: { $lte: checkOutDate },
  checkOutDate: { $gte: checkInDate }
});
```

#### Order Collection

```javascript
orderSchema.index({ hotel: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ user: 1 });
orderSchema.index({ user: 1, orderStatus: 1 });
orderSchema.index({ hotel: 1, orderStatus: 1 });
orderSchema.index({ hotel: 1, orderType: 1, orderStatus: 1 });
```

**Query Patterns:**
```javascript
// ✅ Find order by number - Uses unique compound index
Order.findOne({ hotel: hotelId, orderNumber: 101 });

// ✅ Find user's pending orders - Uses compound index
Order.find({ user: userId, orderStatus: 'pending' });

// ✅ Find restaurant orders - Uses triple compound index
Order.find({ hotel: hotelId, orderType: 'restaurant', orderStatus: 'pending' });
```

#### MenuItem Collection

```javascript
menuItemSchema.index({ hotel: 1 });
menuItemSchema.index({ hotel: 1, category: 1 });
menuItemSchema.index({ hotel: 1, isAvailable: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });
```

**Query Patterns:**
```javascript
// ✅ Browse menu by category - Uses compound index
MenuItem.find({ hotel: hotelId, category: 'appetizers' });

// ✅ Search menu items - Uses text index
MenuItem.find({ $text: { $search: 'chicken curry' } });
```

---

## ⚡ Query Optimization

### Use Lean Queries

```javascript
// ❌ Slow: Full Mongoose document with methods
const users = await User.find({ company: companyId });
// Returns: Array of Mongoose documents (heavy)

// ✅ Fast: Plain JavaScript objects
const users = await User.find({ company: companyId }).lean();
// Returns: Array of plain objects (lightweight)
```

**When to Use Lean:**
- Read-only queries
- Large result sets
- API responses
- No need for Mongoose methods (save, populate, etc.)

### Select Only Needed Fields

```javascript
// ❌ Slow: Fetches all fields
const users = await User.find({ company: companyId });
// Fetches: fullname, username, email, password, profilePicture, role, company, ...

// ✅ Fast: Fetches only needed fields
const users = await User.find({ company: companyId })
  .select('fullname email profilePicture');
// Fetches: fullname, email, profilePicture only
```

**Field Projection:**
```javascript
// Include specific fields
.select('name email');

// Exclude specific fields
.select('-password -refreshToken');

// Include all except password
.select('+field -password');
```

### Limit Result Sets

```javascript
// ❌ Slow: Fetches all bookings (potentially 10,000+)
const bookings = await Booking.find({ user: userId });

// ✅ Fast: Fetches only 20 bookings
const bookings = await Booking.find({ user: userId })
  .limit(20)
  .sort({ createdAt: -1 });
```

**Pagination:**
```javascript
const page = 1;
const limit = 20;
const skip = (page - 1) * limit;

const bookings = await Booking.find({ user: userId })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .lean();

const total = await Booking.countDocuments({ user: userId });

res.json({
  success: true,
  data: bookings,
  pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  }
});
```

### Avoid $where and $regex

```javascript
// ❌ Very slow: JavaScript evaluation
User.find({
  $where: function() {
    return this.fullname.length > 10;
  }
});

// ✅ Fast: Use aggregation pipeline
User.aggregate([
  {
    $addFields: {
      nameLength: { $strLenCP: '$fullname' }
    }
  },
  {
    $match: { nameLength: { $gt: 10 } }
  }
]);

// ❌ Slow: Case-insensitive regex (no index)
User.find({ email: /john@example.com/i });

// ✅ Fast: Use lowercase field with index
User.find({ email: 'john@example.com' }); // email stored as lowercase
```

### Use Aggregation Pipeline

```javascript
// Complex query: Find top 5 hotels by order count

// ❌ Slow: Multiple queries
const hotels = await Hotel.find({ company: companyId });
for (const hotel of hotels) {
  hotel.orderCount = await Order.countDocuments({ hotel: hotel._id });
}
hotels.sort((a, b) => b.orderCount - a.orderCount);
const topHotels = hotels.slice(0, 5);

// ✅ Fast: Single aggregation query
const topHotels = await Hotel.aggregate([
  { $match: { company: mongoose.Types.ObjectId(companyId) } },
  {
    $lookup: {
      from: 'orders',
      localField: '_id',
      foreignField: 'hotel',
      as: 'orders'
    }
  },
  {
    $addFields: {
      orderCount: { $size: '$orders' }
    }
  },
  { $sort: { orderCount: -1 } },
  { $limit: 5 },
  {
    $project: {
      name: 1,
      address: 1,
      rating: 1,
      orderCount: 1
    }
  }
]);
```

### Use $lookup Wisely

```javascript
// ❌ Slow: N+1 query problem
const bookings = await Booking.find({ user: userId });
for (const booking of bookings) {
  booking.hotel = await Hotel.findById(booking.hotel);
  booking.room = await Room.findById(booking.room);
}

// ✅ Fast: Single query with populate
const bookings = await Booking.find({ user: userId })
  .populate('hotel', 'name address images')
  .populate('room', 'roomNumber roomType pricePerNight');
```

---

## 📈 Performance Monitoring

### Explain Query Execution

```javascript
// Analyze query performance
const explain = await User.find({ email: 'john@example.com' })
  .explain('executionStats');

console.log(explain.executionStats);
// {
//   executionTimeMillis: 2,
//   totalKeysExamined: 1,
//   totalDocsExamined: 1,
//   executionStages: {
//     stage: 'FETCH',
//     inputStage: {
//       stage: 'IXSCAN', // Index scan
//       keyPattern: { email: 1 },
//       indexName: 'email_1'
//     }
//   }
// }
```

**Key Metrics:**
- **executionTimeMillis**: Query execution time (lower is better)
- **totalKeysExamined**: Number of index entries scanned
- **totalDocsExamined**: Number of documents examined
- **stage**: IXSCAN (index scan) is good, COLLSCAN (collection scan) is bad

### Slow Query Logging

```javascript
// Enable MongoDB profiling
db.setProfilingLevel(1, { slowms: 100 }); // Log queries > 100ms

// View slow queries
db.system.profile.find({ millis: { $gt: 100 } }).sort({ millis: -1 });
```

**Mongoose Query Logging:**
```javascript
// Log all queries
mongoose.set('debug', true);

// Custom query logger
mongoose.set('debug', (collectionName, method, query, doc) => {
  console.log(`${collectionName}.${method}`, JSON.stringify(query));
});
```

### Index Usage Statistics

```javascript
// MongoDB Atlas - Index usage
db.runCommand({ indexStats: 'users' });

// Mongoose - Get indexes
const indexes = await User.collection.getIndexes();
console.log(indexes);

// Drop unused index
User.collection.dropIndex('oldIndexName');
```

---

## ✅ Best Practices

### 1. Index Selectivity

```javascript
// ✅ Good: High selectivity (few documents match)
userSchema.index({ email: 1 }); // Unique values

// ⚠️ Poor: Low selectivity (many documents match)
userSchema.index({ isActive: 1 }); // Only true/false values
```

### 2. Index Cardinality

```javascript
// ✅ Good: High cardinality
email: 1000 unique values / 1000 documents = 100% cardinality

// ❌ Bad: Low cardinality
isActive: 2 unique values / 1000 documents = 0.2% cardinality
```

### 3. Covered Queries

```javascript
// Query uses only indexed fields
userSchema.index({ email: 1, fullname: 1, company: 1 });

// ✅ Covered query: No document fetch needed
User.find({ email: 'john@example.com' })
  .select('email fullname company -_id');
```

### 4. Index Size Management

```javascript
// Check index size
db.users.stats().indexSizes;

// {
//   _id_: 180224,
//   email_1: 90112,
//   username_1: 90112,
//   company_1: 45056
// }

// Drop unused indexes to save space
```

### 5. Avoid Over-Indexing

```javascript
// ❌ Bad: Too many indexes (slow writes)
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ company: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ updatedAt: 1 });
// 6 indexes = 6x slower writes

// ✅ Good: Only necessary indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ company: 1 });
// 3 indexes = faster writes
```

---

## 📊 Index Performance Table

| Index Type | Query Speed | Write Speed | Use Case |
|---|---|---|---|
| **Single Field** | O(log n) | Slow | Equality, range queries |
| **Compound** | O(log n) | Slower | Multiple field queries |
| **Unique** | O(log n) | Slower | Prevent duplicates |
| **Geospatial** | O(log n) | Slower | Location queries |
| **Text** | O(n log n) | Slowest | Full-text search |
| **TTL** | O(log n) | Slow | Auto-delete old data |

---

## 📚 Related Documents

- [Database Overview](./database-overview.md)
- [Collection Schema Definitions](./collection-schema-definitions.md)
- [Schema Relationships](./schema-relationships.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive indexing and optimization guide
