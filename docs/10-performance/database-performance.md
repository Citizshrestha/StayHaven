# Database Performance

> MongoDB optimization strategies for StayHaven

---

## 📋 Table of Contents

1. [Indexing Strategy](#indexing-strategy)
2. [Query Optimization](#query-optimization)
3. [Schema Design](#schema-design)
4. [Aggregation Pipeline](#aggregation-pipeline)
5. [Connection Management](#connection-management)
6. [Monitoring](#monitoring)

---

## 📌 Indexing Strategy

### Hotel Collection Indexes

```javascript
// models/hotel.schema.js
const hotelSchema = new mongoose.Schema({
  name: String,
  city: String,
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
  },
  price: Number,
  rating: Number,
  isActive: Boolean,
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
});

// Single field indexes
hotelSchema.index({ city: 1 });
hotelSchema.index({ companyId: 1 });
hotelSchema.index({ rating: -1 });

// Compound indexes for common queries
hotelSchema.index({ city: 1, isActive: 1, rating: -1 });
hotelSchema.index({ companyId: 1, isActive: 1 });

// Geospatial index for location-based search
hotelSchema.index({ location: '2dsphere' });

// Text index for full-text search
hotelSchema.index({ 
  name: 'text', 
  description: 'text',
  amenities: 'text'
}, {
  weights: { name: 10, description: 5, amenities: 1 }
});
```

### Booking Collection Indexes

```javascript
// models/booking.schema.js
const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },
  checkIn: Date,
  checkOut: Date,
  status: String,
  createdAt: Date
});

// Compound indexes for queries
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ hotelId: 1, status: 1 });
bookingSchema.index({ checkIn: 1, checkOut: 1 });

// TTL index for auto-deletion (optional)
bookingSchema.index({ createdAt: 1 }, { 
  expireAfterSeconds: 31536000, // 1 year
  partialFilterExpression: { status: 'cancelled' }
});
```

### Index Usage Analysis

```javascript
// Check if query uses index
const explain = await Hotel.find({ city: 'New York' })
  .explain('executionStats');

console.log(explain.executionStats.executionStages);

/*
Good: "stage": "IXSCAN" (index scan)
Bad: "stage": "COLLSCAN" (collection scan)
*/
```

---

## 🔍 Query Optimization

### Use Projection

```javascript
// ❌ Slow: Fetch all fields (200+ bytes)
const hotels = await Hotel.find({ city: 'New York' });

// ✅ Fast: Fetch only needed fields (50 bytes)
const hotels = await Hotel.find({ city: 'New York' })
  .select('name price rating images')
  .lean();
```

### Limit Results

```javascript
// ❌ Slow: Fetch all documents
const hotels = await Hotel.find({ city: 'New York' });

// ✅ Fast: Limit to needed amount
const hotels = await Hotel.find({ city: 'New York' })
  .limit(20)
  .lean();
```

### Covered Queries

```javascript
// Index includes all queried fields
hotelSchema.index({ city: 1, name: 1, price: 1 });

// Query is "covered" - no document fetch needed
const hotels = await Hotel.find({ city: 'New York' })
  .select('city name price -_id')
  .lean();
```

### Avoid $where and $regex

```javascript
// ❌ Slow: $where (doesn't use index)
await Hotel.find({ 
  $where: 'this.price > 100' 
});

// ✅ Fast: Use operators
await Hotel.find({ 
  price: { $gt: 100 } 
});

// ❌ Slow: Case-insensitive regex
await Hotel.find({ 
  name: { $regex: /hilton/i } 
});

// ✅ Fast: Text index
await Hotel.find({ 
  $text: { $search: 'hilton' } 
});
```

---

## 📊 Schema Design

### Embedding vs Referencing

**Embed** when:
- Data is accessed together
- Small, bounded arrays
- One-to-few relationships

```javascript
// Good: Embed addresses (1-3 addresses per user)
const userSchema = new mongoose.Schema({
  name: String,
  addresses: [{
    street: String,
    city: String,
    zipCode: String
  }]
});
```

**Reference** when:
- Large arrays
- Many-to-many relationships
- Data needs separate access

```javascript
// Good: Reference bookings (potentially hundreds per user)
const userSchema = new mongoose.Schema({
  name: String
  // bookings referenced separately
});

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
```

### Denormalization for Performance

```javascript
// Store frequently accessed data together
const bookingSchema = new mongoose.Schema({
  userId: ObjectId,
  hotelId: ObjectId,
  
  // Denormalized for quick access
  hotelName: String,
  hotelCity: String,
  userName: String,
  userEmail: String
});

// Update denormalized data when source changes
export const updateHotel = async (req, res) => {
  const hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body);
  
  // Update denormalized data in bookings
  await Booking.updateMany(
    { hotelId: hotel._id },
    { 
      hotelName: hotel.name,
      hotelCity: hotel.city
    }
  );
};
```

---

## 📦 Aggregation Pipeline

### Optimize Pipeline Order

```javascript
// ❌ Slow: Match after expensive operations
const stats = await Booking.aggregate([
  { $lookup: { from: 'hotels', ... } },
  { $unwind: '$hotel' },
  { $match: { status: 'confirmed' } }, // Should be first!
  { $group: { ... } }
]);

// ✅ Fast: Filter early
const stats = await Booking.aggregate([
  { $match: { status: 'confirmed' } }, // Filter first
  { $lookup: { from: 'hotels', ... } },
  { $unwind: '$hotel' },
  { $group: { ... } }
]);
```

### Use $project Early

```javascript
// ✅ Reduce data size early in pipeline
const results = await Booking.aggregate([
  { $match: { status: 'confirmed' } },
  { $project: { // Project early
      userId: 1,
      hotelId: 1,
      totalAmount: 1,
      createdAt: 1
    }
  },
  { $group: {
      _id: '$userId',
      totalSpent: { $sum: '$totalAmount' }
    }
  }
]);
```

### Use Indexes in Aggregation

```javascript
// Ensure $match uses index
const results = await Hotel.aggregate([
  { $match: { city: 'New York', isActive: true } }, // Uses compound index
  { $sort: { rating: -1 } }, // Uses index
  { $limit: 10 }
]);
```

---

## 🔌 Connection Management

### Connection Pool Configuration

```javascript
// config/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    // Connection pool settings
    maxPoolSize: 10,      // Maximum connections
    minPoolSize: 2,       // Minimum connections
    maxIdleTimeMS: 30000, // Close idle connections after 30s
    
    // Timeout settings
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    
    // Retry settings
    retryWrites: true,
    retryReads: true,
    
    // Compression
    compressors: 'zlib'
  });

  // Monitor connection pool
  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
  });
};

export default connectDB;
```

---

## 📊 Monitoring

### Query Performance Monitoring

```javascript
// Enable query logging in development
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', (collectionName, method, query, doc) => {
    console.log(`${collectionName}.${method}`, JSON.stringify(query));
  });
}

// Custom query profiler
const profileQuery = async (queryFn, label) => {
  const start = Date.now();
  const result = await queryFn();
  const duration = Date.now() - start;
  
  if (duration > 100) {
    console.warn(`Slow query [${label}]: ${duration}ms`);
  }
  
  return result;
};

// Usage
const hotels = await profileQuery(
  () => Hotel.find({ city: 'New York' }).lean(),
  'Find hotels by city'
);
```

### Database Metrics

```javascript
// Get database stats
export const getDatabaseStats = async () => {
  const stats = await mongoose.connection.db.stats();
  
  return {
    collections: stats.collections,
    dataSize: stats.dataSize,
    indexSize: stats.indexSize,
    avgObjSize: stats.avgObjSize
  };
};

// Get collection stats
export const getCollectionStats = async (collectionName) => {
  const stats = await mongoose.connection.db
    .collection(collectionName)
    .stats();
    
  return {
    count: stats.count,
    size: stats.size,
    avgObjSize: stats.avgObjSize,
    storageSize: stats.storageSize,
    totalIndexSize: stats.totalIndexSize
  };
};
```

---

## ⚡ Performance Tips

### 1. Use Lean Queries
```javascript
// 5-10x faster for read-only operations
const hotels = await Hotel.find().lean();
```

### 2. Batch Operations
```javascript
// ❌ Slow: Multiple queries
for (const id of hotelIds) {
  await Hotel.findByIdAndUpdate(id, { isActive: false });
}

// ✅ Fast: Single query
await Hotel.updateMany(
  { _id: { $in: hotelIds } },
  { isActive: false }
);
```

### 3. Use $in Wisely
```javascript
// Limit $in array size to < 100 items
const hotels = await Hotel.find({
  _id: { $in: hotelIds.slice(0, 100) }
});
```

### 4. Avoid Negation Operators
```javascript
// ❌ Slow: Can't use index efficiently
await Hotel.find({ status: { $ne: 'deleted' } });

// ✅ Fast: Use positive match
await Hotel.find({ status: { $in: ['active', 'pending'] } });
```

---

## 📝 Summary

Database optimizations:
- **Indexes**: Strategic compound indexes
- **Queries**: Lean, projection, limits
- **Schema**: Smart embedding/referencing
- **Aggregation**: Optimize pipeline order
- **Monitoring**: Track slow queries

**Goal**: Sub-100ms query performance.