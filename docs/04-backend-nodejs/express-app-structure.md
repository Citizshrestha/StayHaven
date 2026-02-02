# Express App Structure

> Comprehensive guide to Express.js application architecture, middleware chain, and server initialization in StayHaven

---

## 📋 Table of Contents

1. [Application Architecture](#application-architecture)
2. [Server Initialization](#server-initialization)
3. [Middleware Chain](#middleware-chain)
4. [Route Mounting](#route-mounting)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)

---

## 🏗️ Application Architecture

### Express Version

- **Express.js**: 5.1.0 (latest stable)
- **Node.js**: 20.x LTS
- **HTTP Server**: Node.js built-in `http` module
- **Transport**: HTTP/1.1 with WebSocket upgrade for Socket.IO

### Application Layers

```
┌─────────────────────────────────────┐
│         HTTP Request                │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│    Middleware Chain                 │
│  ├─ JSON Parser                     │
│  ├─ CORS                            │
│  ├─ Cookie Parser                   │
│  └─ Error Handlers                  │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│    Route Layer                      │
│  ├─ /api/auth → authRoutes          │
│  ├─ /api/users → userRoutes         │
│  ├─ /api/hotels → hotelRoutes       │
│  ├─ /api/companies → companyRoutes  │
│  └─ /api/staff → staffRoutes        │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│    Authentication Middleware        │
│  ├─ protect (JWT verification)      │
│  └─ authorize (role-based access)   │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│    Controller Layer                 │
│  ├─ Request Validation              │
│  ├─ Business Logic                  │
│  └─ Response Formatting             │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│    Model Layer (Mongoose)           │
│  ├─ Schema Validation               │
│  ├─ Database Operations             │
│  └─ Data Transformation             │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│    MongoDB Database                 │
└─────────────────────────────────────┘
```

---

## 🚀 Server Initialization

### File: `server.js`

```javascript
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cloudinary from './config/cloudinary.js';
import connectDB from './config/db.js';
import { initSocket } from './config/socket.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import hotelRoutes from './routes/hotelRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import staffRoutes from './routes/staffRoutes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Create HTTP server for Socket.IO
const httpServer = createServer(app);

// Initialize Socket.IO
initSocket(httpServer);

// Connect to MongoDB
connectDB();

// Seed database roles
await seedRoles();

// ================================
// Middleware Configuration
// ================================

// 1. Custom JSON parser with error handling
app.use((req, res, next) => {
  express.json()(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: "Malformed JSON",
      });
    }
    next();
  });
});

// 2. CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// 3. Cookie parser
app.use(cookieParser());

// 4. URL-encoded form data parser
app.use(express.urlencoded({ extended: true }));

// 5. Handle JSON syntax errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: "Malformed JSON in request body",
    });
  }
  next(err);
});

// ================================
// Routes
// ================================

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: "StayHaven API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/staff', staffRoutes);

// 404 handler - Must be after all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// ================================
// Error Handler (Must be last)
// ================================

app.use((err, req, res, next) => {
  console.error("Error:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err,
    }),
  });
});

// ================================
// Start Server
// ================================

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   StayHaven Backend Server            ║
║   Port: ${PORT}                          ║
║   Environment: ${process.env.NODE_ENV || 'development'}     ║
║   MongoDB: Connected                  ║
║   Socket.IO: Active                   ║
╚═══════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  httpServer.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
```

---

## 🔗 Middleware Chain

### Execution Order

```javascript
// 1. JSON Parser
express.json()

// 2. CORS
cors(corsOptions)

// 3. Cookie Parser
cookieParser()

// 4. URL Encoded
express.urlencoded({ extended: true })

// 5. Routes
app.use('/api/auth', authRoutes)

// 6. 404 Handler
app.use((req, res) => { /* 404 */ })

// 7. Error Handler (must be last)
app.use((err, req, res, next) => { /* error */ })
```

### Critical Middleware Details

#### 1. JSON Parser with Error Handling

```javascript
app.use((req, res, next) => {
  express.json()(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: "Malformed JSON",
      });
    }
    next();
  });
});
```

**Why**: Catches malformed JSON before it crashes the server

#### 2. CORS Configuration

```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
```

**Why**: Allows frontend to make cross-origin requests with cookies

#### 3. Cookie Parser

```javascript
app.use(cookieParser());
```

**Why**: Parses cookies from requests for JWT token retrieval

---

## 📍 Route Mounting

### Route Structure

```javascript
// Mount routes with prefix
app.use('/api/auth', authRoutes);      // Authentication endpoints
app.use('/api/users', userRoutes);     // User profile & preferences
app.use('/api/hotels', hotelRoutes);   // Hotel management
app.use('/api/companies', companyRoutes); // Company management
app.use('/api/staff', staffRoutes);    // Staff management
```

### Complete URL Examples

```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/me

GET    /api/users/wishlist
POST   /api/users/cart

GET    /api/hotels
POST   /api/hotels
GET    /api/hotels/:id

POST   /api/companies
GET    /api/companies/my-company

POST   /api/staff/invite
GET    /api/staff
```

---

## ⚠️ Error Handling

### Error Types

#### 1. Malformed JSON

```javascript
app.use((req, res, next) => {
  express.json()(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: "Malformed JSON",
      });
    }
    next();
  });
});
```

#### 2. 404 Not Found

```javascript
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});
```

#### 3. Global Error Handler

```javascript
app.use((err, req, res, next) => {
  console.error("Error:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
});
```

### Process-Level Error Handling

```javascript
// Unhandled Promise Rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  httpServer.close(() => process.exit(1));
});

// Uncaught Exceptions
process.on('uncaught Exception', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
```

---

## ✅ Best Practices

### 1. **Use HTTP Server for Socket.IO**

```javascript
// Good - HTTP server wrapper
const httpServer = createServer(app);
initSocket(httpServer);
httpServer.listen(PORT);

// Avoid - Direct Express listen
app.listen(PORT); // Socket.IO won't work properly
```

### 2. **Load Environment Variables First**

```javascript
// Good - dotenv first
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';

// Avoid - dotenv later
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
```

### 3. **Handle Errors Before Routes**

```javascript
// Good - JSON error handler before routes
app.use(jsonErrorHandler);
app.use('/api/auth', authRoutes);

// Avoid - after routes
app.use('/api/auth', authRoutes);
app.use(jsonErrorHandler);
```

### 4. **404 Handler After All Routes**

```javascript
// Good
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use(notFoundHandler); // Last

// Avoid
app.use(notFoundHandler);
app.use('/api/auth', authRoutes); // Never reached
```

### 5. **Error Handler Must Be Last**

```javascript
// Good
app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler); // Last middleware

// Avoid
app.use(errorHandler);
app.use('/api', routes); // Errors won't be caught
```

### 6. **Use Graceful Shutdown**

```javascript
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  httpServer.close(() => {
    console.log('Server closed gracefully');
    process.exit(1);
  });
});
```

### 7. **Seed Database on Startup**

```javascript
// Initialize roles before server starts
await seedRoles();

httpServer.listen(PORT);
```

---

## 📚 Related Documents

- [Backend Overview](./backend-overview.md)
- [Middleware Design](./middleware-design.md)
- [Routing Strategy](./routing-strategy.md)
- [Socket.IO Server Design](./socket-io-server-design.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive Express app structure guide
