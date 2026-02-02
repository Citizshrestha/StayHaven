# Backend Performance Optimizations

> Strategies and techniques for optimizing Node.js/Express backend performance

---

## 📋 Table of Contents

1. [Caching Strategies](#caching-strategies)
2. [Database Query Optimization](#database-query-optimization)
3. [API Response Optimization](#api-response-optimization)
4. [Connection Pooling](#connection-pooling)
5. [Compression](#compression)
6. [Rate Limiting](#rate-limiting)

---

## 🗄️ Caching Strategies

### Redis Caching Implementation

```javascript
// config/redis.js
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error('Max retries reached');
      return Math.min(retries * 100, 3000);
    }
  }
});

await redisClient.connect();

export default redisClient;
```

### Cache Middleware

```javascript
// middleware/cache.js
import redisClient from '../config/redis.js';

export const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      // Check cache
      const cachedData = await redisClient.get(key);
      
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Store original res.json
      const originalJson = res.json.bind(res);
      
      // Override res.json to cache response
      res.json = (data) => {
        redisClient.setEx(key, duration, JSON.stringify(data));
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
};
```

### Usage Example

```javascript
// routes/hotelRoutes.js
import { cacheMiddleware } from '../middleware/cache.js';

// Cache hotel list for 5 minutes
router.get('/hotels', cacheMiddleware(300), hotelController.getHotels);

// Cache hotel details for 10 minutes
router.get('/hotels/:id', cacheMiddleware(600), hotelController.getHotelById);
```

### Cache Invalidation

```javascript
// utils/cacheInvalidation.js
import redisClient from '../config/redis.js';

export const invalidateCache = async (pattern) => {
  const keys = await redisClient.keys(pattern);
  
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};

// Controller example
export const updateHotel = async (req, res) => {
  const hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body);
  
  // Invalidate related caches
  await invalidateCache(`cache:/api/hotels*`);
  
  res.json(hotel);
};
```

---

## 🔍 Database Query Optimization

### Use Lean Queries

```javascript
// ❌ Slow: Returns full Mongoose documents
const hotels = await Hotel.find({ city: 'New York' });

// ✅ Fast: Returns plain JavaScript objects
const hotels = await Hotel.find({ city: 'New York' }).lean();
```

### Select Only Required Fields

```javascript
// ❌ Slow: Returns all fields
const users = await User.find();

// ✅ Fast: Returns only needed fields
const users = await User.find()
  .select('name email role')
  .lean();
```

### Use Indexes Effectively

```javascript
// models/hotel.schema.js
const hotelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, required: true },
  price: { type: Number, required: true },
  rating: { type: Number },
  isActive: { type: Boolean, default: true }
});

// Single field indexes
hotelSchema.index({ city: 1 });
hotelSchema.index({ rating: -1 });
hotelSchema.index({ price: 1 });

// Compound index for common queries
hotelSchema.index({ city: 1, isActive: 1, rating: -1 });

// Text index for search
hotelSchema.index({ name: 'text', description: 'text' });
```

### Paginate Results

```javascript
export const getHotels = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [hotels, total] = await Promise.all([
    Hotel.find({ isActive: true })
      .select('name city price rating images')
      .skip(skip)
      .limit(limit)
      .lean(),
    Hotel.countDocuments({ isActive: true })
  ]);

  res.json({
    hotels,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
};
```

### Avoid N+1 Queries

```javascript
// ❌ Slow: N+1 query problem
const bookings = await Booking.find();
for (const booking of bookings) {
  booking.hotel = await Hotel.findById(booking.hotelId);
}

// ✅ Fast: Use populate
const bookings = await Booking.find()
  .populate('hotel', 'name city')
  .lean();

// ✅ Even faster: Manual join if needed
const bookings = await Booking.find().lean();
const hotelIds = [...new Set(bookings.map(b => b.hotelId))];
const hotels = await Hotel.find({ _id: { $in: hotelIds } })
  .select('name city')
  .lean();

const hotelMap = new Map(hotels.map(h => [h._id.toString(), h]));
bookings.forEach(b => {
  b.hotel = hotelMap.get(b.hotelId.toString());
});
```

---

## 📦 API Response Optimization

### Compression Middleware

```javascript
// server.js
import compression from 'compression';

// Compress all responses
app.use(compression({
  level: 6, // Compression level (0-9)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

### Response Streaming

```javascript
export const exportBookings = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.write('[');

  const cursor = Booking.find().cursor();
  let first = true;

  for await (const booking of cursor) {
    if (!first) res.write(',');
    res.write(JSON.stringify(booking));
    first = false;
  }

  res.write(']');
  res.end();
};
```

### Async/Parallel Processing

```javascript
// ❌ Slow: Sequential
export const getUserDashboard = async (req, res) => {
  const user = await User.findById(req.userId);
  const bookings = await Booking.find({ userId: req.userId });
  const notifications = await Notification.find({ userId: req.userId });
  
  res.json({ user, bookings, notifications });
};

// ✅ Fast: Parallel
export const getUserDashboard = async (req, res) => {
  const [user, bookings, notifications] = await Promise.all([
    User.findById(req.userId).lean(),
    Booking.find({ userId: req.userId }).lean(),
    Notification.find({ userId: req.userId }).lean()
  ]);
  
  res.json({ user, bookings, notifications });
};
```

---

## 🔌 Connection Pooling

### MongoDB Connection Pool

```javascript
// config/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 10, // Maximum connections
    minPoolSize: 2,  // Minimum connections
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    family: 4 // Use IPv4
  });

  console.log('MongoDB Connected');
};

export default connectDB;
```

---

## 🗜️ Compression

### Image Optimization

```javascript
// middleware/upload.js
import multer from 'multer';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';

export const optimizeImage = async (buffer) => {
  return await sharp(buffer)
    .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
};

export const uploadImage = async (req, res) => {
  const optimized = await optimizeImage(req.file.buffer);
  
  const result = await cloudinary.uploader.upload_stream(
    { folder: 'hotels' },
    (error, result) => {
      if (error) throw error;
      res.json({ url: result.secure_url });
    }
  ).end(optimized);
};
```

---

## 🚦 Rate Limiting

```javascript
// middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../config/redis.js';

export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later.'
});

export const authLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 15 * 60 * 1000,
  max: 5, // Stricter for auth endpoints
  message: 'Too many login attempts, please try again later.'
});

// Usage
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
```

---

## 📊 Performance Monitoring

```javascript
// middleware/performanceMonitor.js
export const performanceMonitor = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }

    // Track metrics (send to monitoring service)
    // metrics.timing('api.response_time', duration, [`route:${req.path}`]);
  });

  next();
};
```

---

## 📝 Summary

Backend optimizations:
- **Caching**: Redis for frequent queries
- **Queries**: Lean, select, indexes, pagination
- **Responses**: Compression, streaming, parallel
- **Connections**: Pool configuration
- **Rate limiting**: Protect from abuse

**Goal**: Fast, efficient API responses.