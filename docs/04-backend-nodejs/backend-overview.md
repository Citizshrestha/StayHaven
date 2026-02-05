# Backend Overview

> Comprehensive guide to StayHaven's Node.js backend architecture, tech stack, and design principles

---

## 📋 Table of Contents

1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Application Architecture](#application-architecture)
4. [Core Components](#core-components)
5. [Design Principles](#design-principles)
6. [Development Workflow](#development-workflow)

---

## 🛠️ Technology Stack

### Core Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 20.x LTS | JavaScript runtime |
| **Express.js** | 5.1.0 | Web framework |
| **MongoDB** | 6.20.0 | NoSQL database |
| **Mongoose** | 8.9.1 | MongoDB ODM |
| **Socket.io** | 4.8.3 | Real-time bidirectional communication |

### Key Dependencies

**Authentication & Security**:
```json
{
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^5.1.1",
  "cookie-parser": "^1.4.7",
  "cors": "^2.8.5"
}
```

**File Upload & Storage**:
```json
{
  "cloudinary": "^2.5.1",
  "multer": "^1.4.5-lts.1"
}
```

**Email & Communication**:
```json
{
  "nodemailer": "^6.9.17",
  "googleapis": "^144.0.0"
}
```

**Utilities**:
```json
{
  "dotenv": "^16.4.7",
  "validator": "^13.12.0"
}
```

---

## 📁 Project Structure

### Complete Directory Tree

```
Backend/
├── server.js                    # Application entry point
├── package.json                 # Dependencies & scripts
├── .env                         # Environment variables
│
├── config/                      # Configuration files
│   ├── db.js                   # MongoDB connection
│   ├── cloudinary.js           # Cloudinary setup
│   ├── nodemailer.js           # Email configuration
│   └── socket.js               # Socket.io initialization
│
├── controllers/                 # Request handlers
│   ├── authController.js       # Authentication logic
│   ├── userController.js       # User management
│   ├── hotelController.js      # Hotel CRUD
│   ├── companyController.js    # Company operations
│   ├── orderController.js      # Order & KOT
│   ├── staffController.js      # Staff management
│   ├── menuController.js       # Menu management
│   ├── tableAssignment.controller.js
│   └── waitercall.controller.js
│
├── models/                      # Mongoose schemas
│   ├── user.schema.js          # User model
│   ├── hotel.schema.js         # Hotel model
│   ├── booking.schema.js       # Booking model
│   ├── order.schema.js         # Order model
│   ├── company.schema.js       # Company model
│   ├── room.schema.js          # Room model
│   ├── role.schema.js          # Role model
│   ├── menuItem.schema.js      # Menu item model
│   ├── notification.schema.js  # Notification model
│   ├── loyalty.schema.js       # Loyalty program
│   ├── tableAssignment.schema.js
│   └── waitercall.schema.js
│
├── routes/                      # API endpoints
│   ├── authRoutes.js           # /api/auth/*
│   ├── userRoutes.js           # /api/users/*
│   ├── hotelRoutes.js          # /api/hotels/*
│   ├── companyRoutes.js        # /api/companies/*
│   └── staffRoutes.js          # /api/staff/*
│
├── middleware/                  # Express middleware
│   ├── authMiddleware.js       # JWT authentication
│   ├── isAuthenticated.js      # Session validation
│   └── upload.js               # Multer file upload
│
└── utils/                       # Helper functions
    ├── asyncHandler.js         # Error wrapper
    ├── tokenUtils.js           # JWT utilities
    ├── passwordValidation.js   # Password strength
    └── resetDatabase.js        # DB reset utility
```

---

## 🏗️ Application Architecture

### Layered Architecture

```
┌─────────────────────────────────────┐
│         HTTP Server Layer           │
│  Express.js + Socket.io (Port 5000) │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         Middleware Layer            │
│  CORS, JSON Parser, Cookie Parser,  │
│  Authentication, Authorization      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│          Routing Layer              │
│  authRoutes, userRoutes, etc.       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│        Controller Layer             │
│  Business logic, validation,        │
│  orchestration                      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         Model Layer (ODM)           │
│  Mongoose schemas, validators,      │
│  hooks, methods                     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│        Database Layer               │
│  MongoDB (Cloud/Local)              │
└─────────────────────────────────────┘
```

### Request Flow

```javascript
Client Request
    ↓
Express Middleware Chain
    ↓
Route Handler Matching
    ↓
Authentication Middleware (protect)
    ↓
Authorization Middleware (authorize)
    ↓
Controller Function
    ↓
Model Validation & Database Query
    ↓
Response Formatting
    ↓
Client Response
```

---

## 🔧 Core Components

### 1. Application Entry Point (server.js)

**Purpose**: Initialize and configure the Express application

```javascript
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import connectDB from "./config/db.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { initCloudinary } from "./config/cloudinary.js";
import { initSocket } from "./config/socket.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import hotelRoutes from "./routes/hotelRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";

// Initialize Cloudinary
initCloudinary();

const app = express();

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// Initialize Socket.io
initSocket(httpServer);

// Connect to MongoDB
connectDB();

// Seed roles on startup
const seedRoles = async () => {
  const roles = ["admin", "staff", "guest", "owner", "chief", "waiter", "manager", "receptionist"];
  for (let roleName of roles) {
    if (!(await Role.findOne({ name: roleName }))) {
      await new Role({ name: roleName }).save();
      console.log(`✅ Role '${roleName}' created`);
    }
  }
};
seedRoles();

// Middleware setup
app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/staff", staffRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

**Key Features**:
- Environment variable loading via dotenv
- HTTP server creation for Socket.io compatibility
- Database connection on startup
- Role seeding for initial setup
- CORS configuration for cross-origin requests
- Cookie parser for authentication
- Global error handling

---

### 2. Database Configuration (config/db.js)

**Purpose**: MongoDB connection with Mongoose

```javascript
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("MONGODB_URI is not defined in .env file");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
};

export default connectDB;
```

**Features**:
- Connection validation
- Error handling with process exit
- No deprecated options (using Mongoose 8.x)
- Graceful failure handling

---

### 3. Authentication Middleware (middleware/authMiddleware.js)

**Purpose**: JWT token validation and user authorization

```javascript
import jwt from 'jsonwebtoken';
import { User } from '../models/user.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check Authorization header first
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Fallback to cookies
  else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = await User.findById(decoded.id)
      .select('-password')
      .populate('role');

    if (!req.user) {
      throw new Error('User not found');
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: "Token expired"
      });
    }
    return res.status(401).json({
      success: false,
      message: "Not authorized, invalid token"
    });
  }
});

export const authorize = (...roles) => {
  return asyncHandler(async (req, res, next) => {
    const userRole = req.user?.role?.name || req.user?.companyRole;

    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `User role '${userRole}' is not authorized`
      });
    }
    next();
  });
};
```

**Features**:
- Dual token source (Authorization header + cookies)
- JWT expiration handling
- User data population with role
- Role-based authorization middleware

---

### 4. Async Error Handler (utils/asyncHandler.js)

**Purpose**: Wrap async functions to catch errors

```javascript
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

**Usage**:
```javascript
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json({ success: true, user });
});
```

---

## 🎨 Design Principles

### 1. **Separation of Concerns**

Each layer has a specific responsibility:
- **Routes**: Define endpoints and HTTP methods
- **Controllers**: Handle business logic
- **Models**: Define data structure and validation
- **Middleware**: Handle cross-cutting concerns

---

### 2. **DRY (Don't Repeat Yourself)**

**Reusable Components**:
```javascript
// asyncHandler wrapper
export const asyncHandler = (fn) => (req, res, next) => 
  Promise.resolve(fn(req, res, next)).catch(next);

// Token generation utility
export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '1h'
  });
};
```

---

### 3. **Error-First Callbacks**

```javascript
try {
  const result = await someAsyncOperation();
  res.json({ success: true, data: result });
} catch (error) {
  console.error("Operation failed:", error);
  res.status(500).json({ success: false, message: error.message });
}
```

---

### 4. **Environment-Based Configuration**

```javascript
// .env file
MONGODB_URI=mongodb://localhost:27017/stayhaven
JWT_ACCESS_SECRET=your_secret_here
CLOUDINARY_CLOUD_NAME=your_cloud_name

// Usage
const dbUri = process.env.MONGODB_URI;
```

---

### 5. **RESTful API Design**

```
GET    /api/hotels       - List all hotels
POST   /api/hotels       - Create hotel
GET    /api/hotels/:id   - Get single hotel
PUT    /api/hotels/:id   - Update hotel
DELETE /api/hotels/:id   - Delete hotel
```

---

## 🔄 Development Workflow

### Local Development Setup

**1. Install Dependencies**:
```bash
cd Backend
npm install
```

**2. Configure Environment**:
```bash
cp .env.example .env
# Edit .env with your values
```

**3. Start Development Server**:
```bash
npm run dev
```

**4. Run Tests** (if available):
```bash
npm test
```

---

### Environment Variables

**Required Variables**:
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/stayhaven

# JWT Secrets
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Server
PORT=5000
NODE_ENV=development

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Nodemailer)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173
```

---

### Development Scripts

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "lint": "eslint .",
    "seed": "node utils/seedDatabase.js",
    "reset": "node utils/resetDatabase.js"
  }
}
```

---

## 📊 Performance Considerations

### 1. **Database Indexing**

```javascript
// models/user.schema.js
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ company: 1, role: 1 });
```

### 2. **Pagination**

```javascript
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
const skip = (page - 1) * limit;

const hotels = await Hotel.find().skip(skip).limit(limit);
```

### 3. **Selective Field Population**

```javascript
// Populate only needed fields
const user = await User.findById(id)
  .populate('role', 'name permissions')
  .populate('company', 'name logo');
```

---

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Bcrypt Password Hashing**: Industry-standard hashing
- **CORS Configuration**: Restrict origins
- **Input Validation**: Mongoose validators + custom validation
- **HTTP-Only Cookies**: Prevent XSS attacks
- **Rate Limiting**: Prevent brute force (planned)
- **Helmet.js**: Security headers (planned)

---

## 📚 Related Documents

- [Controller Design Pattern](./controller-design-pattern.md)
- [Middleware Design](./middleware-design.md)
- [Mongoose Schema Design](./mongoose-schema-design.md)
- [Routing Strategy](./routing-strategy.md)
- [Socket.io Server Design](./socket-io-server-design.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive backend overview
