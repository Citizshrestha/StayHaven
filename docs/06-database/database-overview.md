# Database Overview

> MongoDB database architecture, connection configuration, and collection structure in StayHaven

---

## 📋 Table of Contents

1. [Database Technology](#database-technology)
2. [Database Connection](#database-connection)
3. [Collections Overview](#collections-overview)
4. [Database Design Principles](#database-design-principles)
5. [Scalability Considerations](#scalability-considerations)

---

## 🗄️ Database Technology

### MongoDB

**Version**: 6.20.0

**Why MongoDB?**

```
Advantages for StayHaven:
┌──────────────────────────────────────────────────┐
│  1. Flexible Schema                              │
│     - Accommodates varying hotel structures      │
│     - Easy to add new fields without migration   │
│     - Perfect for multi-tenant architecture      │
│                                                  │
│  2. Document-Oriented                            │
│     - Natural fit for hierarchical data          │
│     - Embedded documents reduce joins            │
│     - JSON-like documents match frontend data    │
│                                                  │
│  3. Horizontal Scalability                       │
│     - Sharding support for growth                │
│     - Replica sets for high availability         │
│     - Handles increasing hotel/user volume       │
│                                                  │
│  4. Rich Query Language                          │
│     - Complex filtering and aggregation          │
│     - Geospatial queries for location search     │
│     - Text search for hotel/menu discovery       │
│                                                  │
│  5. Excellent ODM Support                        │
│     - Mongoose provides schema validation        │
│     - Middleware for business logic              │
│     - Virtual fields and methods                 │
└──────────────────────────────────────────────────┘
```

### Mongoose ODM

**Version**: 8.9.1

**Features Used**:
- Schema definition and validation
- Pre/post save hooks
- Virtual properties
- Instance methods
- Static methods
- Query helpers
- Population (relationships)
- Indexes

---

## 🔌 Database Connection

### Connection Configuration

**File**: `config/db.js`

```javascript
import mongoose from 'mongoose';

/**
 * Connect to MongoDB database
 * Uses Mongoose 8.x (no deprecated options needed)
 */
const connectDB = async () => {
  try {
    // Connection options (most are defaults in Mongoose 8.x)
    const options = {
      // No deprecated options needed:
      // - useNewUrlParser: true (default in 8.x)
      // - useUnifiedTopology: true (default in 8.x)
      // - useFindAndModify: false (removed in 6.x)
      // - useCreateIndex: true (removed in 6.x)
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Connection event handlers
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`Mongoose connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Mongoose connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit with failure
  }
};

export default connectDB;
```

### Environment Variables

```env
# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/stayhaven

# Production (MongoDB Atlas)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/stayhaven?retryWrites=true&w=majority
```

### Connection String Format

```javascript
// Local Development
mongodb://localhost:27017/stayhaven
│         │         │    │
│         │         │    └─ Database name
│         │         └─ Port (default: 27017)
│         └─ Hostname
└─ Protocol

// MongoDB Atlas (Cloud)
mongodb+srv://username:password@cluster0.mongodb.net/stayhaven?retryWrites=true&w=majority
│          │        │        │                      │          │
│          │        │        │                      │          └─ Write concern
│          │        │        │                      └─ Database name
│          │        │        └─ Cluster hostname
│          │        └─ Password
│          └─ Username
└─ Protocol (SRV record)
```

### Server Initialization

**File**: `server.js`

```javascript
import express from 'express';
import connectDB from './config/db.js';

const app = express();

// Connect to database
await connectDB();

// ... middleware and routes

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## 📂 Collections Overview

### Collection Structure

```
StayHaven Database
│
├─ users (Authentication & User Profiles)
│   └─ Stores all user accounts (guests, staff, admins)
│
├─ roles (RBAC System)
│   └─ Defines user roles and permissions
│
├─ companies (Multi-Tenant)
│   └─ Hotel management companies
│
├─ hotels (Hotel Properties)
│   └─ Hotel details and configuration
│
├─ rooms (Accommodation)
│   └─ Hotel rooms and availability
│
├─ bookings (Reservations)
│   └─ Room booking records
│
├─ loyalties (Loyalty Program)
│   └─ User loyalty points and rewards
│
├─ menuItems (Food & Beverage)
│   └─ Restaurant menu items
│
├─ orders (Food Orders)
│   └─ Customer food and beverage orders
│
├─ waitercalls (Service Requests)
│   └─ Table service call requests
│
├─ tableAssignments (Dining Management)
│   └─ Table allocation for orders
│
└─ notifications (Real-time Alerts)
    └─ User and staff notifications
```

### Collection Count & Documents

```javascript
// Collection statistics (approximate)
Collection          Documents    Avg Size    Indexes
───────────────────────────────────────────────────────
users               1,000+       2 KB        5
roles               9            1 KB        2
companies           50+          3 KB        2
hotels              200+         5 KB        4
rooms               5,000+       2 KB        4
bookings            10,000+      3 KB        6
loyalties           500+         2 KB        3
menuItems           2,000+       2 KB        4
orders              50,000+      4 KB        7
waitercalls         10,000+      1 KB        4
tableAssignments    5,000+       1 KB        4
notifications       100,000+     1 KB        4
```

---

## 🎯 Database Design Principles

### 1. Multi-Tenancy

**Approach**: Company-scoped data isolation

```javascript
// Every hotel-related document includes company reference
const hotelSchema = new mongoose.Schema({
  name: String,
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true // Query optimization
  }
  // ... other fields
});

// Query pattern: Always filter by company
const hotels = await Hotel.find({ company: companyId });
```

### 2. Embedding vs Referencing

**Embedding** (One-to-Few, Read-Heavy):
```javascript
// Order embeds ordered items (1-20 items typical)
const orderSchema = new mongoose.Schema({
  items: [{
    menuItem: { type: ObjectId, ref: 'MenuItem' },
    quantity: Number,
    price: Number
  }]
});
```

**Referencing** (One-to-Many, Write-Heavy):
```javascript
// Hotel references rooms (separate documents)
const hotelSchema = new mongoose.Schema({
  name: String
  // No embedded rooms array
});

const roomSchema = new mongoose.Schema({
  hotel: { type: ObjectId, ref: 'Hotel' }
});
```

### 3. Denormalization for Performance

**Example**: Store user name in booking for faster display

```javascript
const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userName: String, // Denormalized for quick access
  userEmail: String, // Denormalized for quick access
  // ... other fields
});

// Pre-save hook to denormalize
bookingSchema.pre('save', async function(next) {
  if (this.isModified('user')) {
    const user = await mongoose.model('User').findById(this.user);
    this.userName = user.fullname;
    this.userEmail = user.email;
  }
  next();
});
```

### 4. Indexing Strategy

```javascript
// Compound index for company + status queries
hotelSchema.index({ company: 1, status: 1 });

// Text index for search
menuItemSchema.index({ name: 'text', description: 'text' });

// Unique compound index
bookingSchema.index({ hotel: 1, room: 1, checkInDate: 1 }, { unique: true });
```

### 5. Soft Deletes

```javascript
// Don't physically delete data
const userSchema = new mongoose.Schema({
  // ... fields
  isActive: {
    type: Boolean,
    default: true
  },
  deletedAt: Date
});

// Query only active records
const activeUsers = await User.find({ isActive: true });
```

---

## 📈 Scalability Considerations

### Vertical Scaling

```
Current Setup:
- Single MongoDB instance
- Suitable for: < 10,000 concurrent users
- Storage: Up to 1 TB
- RAM: 8-16 GB
```

### Horizontal Scaling (Future)

#### 1. Replica Sets

```javascript
// High availability and read scalability
mongodb+srv://username:password@cluster0.mongodb.net/?replicaSet=rs0

Benefits:
- Automatic failover
- Read from secondaries
- Data redundancy
- Zero downtime maintenance
```

#### 2. Sharding

```javascript
// Distribute data across multiple servers
// Shard key: company (each company on specific shard)

sh.enableSharding("stayhaven");
sh.shardCollection("stayhaven.hotels", { company: 1 });

Benefits:
- Horizontal scaling
- Distribute load
- Handle massive datasets
```

### Connection Pooling

```javascript
// Mongoose connection pool (default: 5)
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,  // Max connections in pool
  minPoolSize: 5,   // Min connections to maintain
  maxIdleTimeMS: 10000, // Close idle connections after 10s
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  socketTimeoutMS: 45000 // Close socket after 45s inactivity
});
```

### Caching Strategy

```javascript
// Redis caching for frequently accessed data
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache hotel details (1 hour TTL)
export const getHotelById = async (hotelId) => {
  const cacheKey = `hotel:${hotelId}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const hotel = await Hotel.findById(hotelId);

  // Store in cache
  await redis.setex(cacheKey, 3600, JSON.stringify(hotel));

  return hotel;
};
```

### Database Monitoring

```javascript
// MongoDB Atlas monitoring
- Connection pooling stats
- Query performance
- Slow query logs
- Index usage statistics
- Disk usage and IOPS

// Application-level monitoring
- Query execution time
- Database connection errors
- Connection pool exhaustion
```

---

## 📚 Related Documents

- [Collection Schema Definitions](./collection-schema-definitions.md)
- [Entity Relationship Model](./entity-relationship-model.md)
- [Schema Relationships](./schema-relationships.md)
- [Indexing & Query Optimization](./indexing-and-query-optimization.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive database overview documentation
