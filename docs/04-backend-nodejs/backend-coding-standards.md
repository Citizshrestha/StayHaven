# Backend Coding Standards

> Comprehensive coding standards, best practices, and conventions for Node.js/Express development in StayHaven

---

## 📋 Table of Contents

1. [Code Style](#code-style)
2. [Naming Conventions](#naming-conventions)
3. [File Organization](#file-organization)
4. [Function Guidelines](#function-guidelines)
5. [Error Handling](#error-handling)
6. [Comments & Documentation](#comments--documentation)
7. [Security Practices](#security-practices)

---

## 🎨 Code Style

### ES Modules

```javascript
// Good - ES6 imports
import express from 'express';
import { User } from '../models/user.schema.js';

// Avoid - CommonJS
const express = require('express');
const User = require('../models/user.schema.js');
```

### Async/Await

```javascript
// Good - async/await
export const getHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find();
  res.json({ success: true, hotels });
});

// Avoid - .then/.catch chains
export const getHotels = (req, res) => {
  Hotel.find()
    .then(hotels => res.json({ success: true, hotels }))
    .catch(error => res.status(500).json({ error }));
};
```

### Arrow Functions

```javascript
// Good - Arrow functions for callbacks
const userIds = users.map(user => user._id);
const activeUsers = users.filter(user => user.isActive);

// Traditional functions for methods
userSchema.methods.matchPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};
```

### Destructuring

```javascript
// Good - Destructure imports
import { protect, authorize } from '../middleware/authMiddleware.js';

// Good - Destructure req.body
const { email, password, fullname } = req.body;

// Avoid
const email = req.body.email;
const password = req.body.password;
const fullname = req.body.fullname;
```

---

## 📝 Naming Conventions

### Variables & Functions

```javascript
// camelCase for variables and functions
const userEmail = 'john@example.com';
const isAuthenticated = true;

function getUserById(id) {
  // ...
}

const calculateTotalPrice = (items) => {
  // ...
};
```

### Constants

```javascript
// UPPER_SNAKE_CASE for constants
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB
const JWT_ACCESS_EXPIRE = '1h';
const DEFAULT_PAGE_LIMIT = 20;
```

### Classes & Schemas

```javascript
// PascalCase for classes and schemas
class EmailService {
  // ...
}

const UserSchema = new mongoose.Schema({
  // ...
});

export const User = mongoose.model('User', UserSchema);
```

### Files

```javascript
// camelCase for utility files
// asyncHandler.js
// passwordValidation.js
// tokenUtils.js

// kebab-case for config files (optional)
// auth-middleware.js
// user-controller.js

// Use consistent pattern project-wide
```

### Routes

```javascript
// kebab-case for multi-word routes
GET  /api/hotels
POST /api/password-reset
GET  /api/my-bookings
```

---

## 📁 File Organization

### Controller Pattern

```javascript
// controllers/hotelController.js

import { Hotel } from '../models/hotel.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Get all hotels
// @route   GET /api/hotels
// @access  Public
export const getAllHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find();
  
  res.json({
    success: true,
    count: hotels.length,
    hotels
  });
});

// @desc    Create hotel
// @route   POST /api/hotels
// @access  Private (Owner)
export const createHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.create({
    ...req.body,
    owner: req.user._id,
    company: req.user.company,
  });

  res.status(201).json({
    success: true,
    message: "Hotel created successfully",
    hotel
  });
});
```

### Import Order

```javascript
// 1. Node.js built-in modules
import { createServer } from 'http';
import path from 'path';

// 2. Third-party packages
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

// 3. Local config
import connectDB from './config/db.js';
import { initSocket } from './config/socket.js';

// 4. Local modules (models, middleware, utils)
import { User } from './models/user.schema.js';
import { protect } from './middleware/authMiddleware.js';
import { asyncHandler } from './utils/asyncHandler.js';

// 5. Routes (last)
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
```

---

## ⚙️ Function Guidelines

### Single Responsibility

```javascript
// Good - Each function does one thing
const validateEmail = (email) => {
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(email);
};

const checkUserExists = async (email) => {
  return await User.findOne({ email });
};

// Avoid - Function doing too much
const registerUser = async (req, res) => {
  // Validate, check existence, hash password, send email, create user...
};
```

### Function Size

```javascript
// Good - Small, focused functions (< 50 lines)
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  // Find user
  const user = await User.findOne({ email }).populate('role');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  // Verify password
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Send response
  res.json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role.name
    }
  });
});
```

### Early Returns

```javascript
// Good - Early returns for error cases
export const updateHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found"
    });
  }

  if (hotel.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized"
    });
  }

  // Continue with update logic...
});

// Avoid - Nested if-else
export const updateHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);

  if (hotel) {
    if (hotel.owner.toString() === req.user._id.toString()) {
      // Update logic...
    } else {
      res.status(403).json({ message: "Not authorized" });
    }
  } else {
    res.status(404).json({ message: "Hotel not found" });
  }
});
```

---

## ⚠️ Error Handling

### Use asyncHandler

```javascript
// Good - asyncHandler wraps async functions
export const getHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find();
  res.json({ success: true, hotels });
});

// Avoid - Manual try-catch everywhere
export const getHotels = async (req, res) => {
  try {
    const hotels = await Hotel.find();
    res.json({ success: true, hotels });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

### Consistent Error Responses

```javascript
// Success response
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}

// Error response
{
  "success": false,
  "message": "Error description"
}
```

### Validation

```javascript
// Good - Validate input first
export const createHotel = asyncHandler(async (req, res) => {
  const { name, description, location } = req.body;

  // Validate required fields
  if (!name || !description || !location) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields"
    });
  }

  // Continue...
});
```

---

## 📖 Comments & Documentation

### JSDoc for Functions

```javascript
/**
 * Get all hotels with filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
export const getAllHotels = asyncHandler(async (req, res) => {
  // Implementation...
});
```

### Route Documentation

```javascript
// @desc    Get all hotels
// @route   GET /api/hotels
// @access  Public
export const getAllHotels = asyncHandler(async (req, res) => {
  // Implementation...
});
```

### Inline Comments

```javascript
// Good - Explain WHY, not WHAT
// Check ownership before allowing update
if (hotel.owner.toString() !== req.user._id.toString()) {
  return res.status(403).json({ message: "Not authorized" });
}

// Avoid - Obvious comments
// Check if hotel owner is not equal to user id
if (hotel.owner.toString() !== req.user._id.toString()) {
  return res.status(403).json({ message: "Not authorized" });
}
```

---

## 🔒 Security Practices

### Environment Variables

```javascript
// Good - Use environment variables
const jwtSecret = process.env.JWT_ACCESS_SECRET;
const mongoUri = process.env.MONGODB_URI;

// Avoid - Hardcoded secrets
const jwtSecret = 'my-secret-key';
const mongoUri = 'mongodb://localhost:27017/mydb';
```

### Input Validation

```javascript
// Good - Validate all user input
if (!email || !password) {
  return res.status(400).json({
    success: false,
    message: "Email and password are required"
  });
}

// Validate email format
const emailRegex = /^\S+@\S+\.\S+$/;
if (!emailRegex.test(email)) {
  return res.status(400).json({
    success: false,
    message: "Invalid email format"
  });
}
```

### Password Handling

```javascript
// Good - Exclude password from response
const user = await User.findById(userId).select('-password');

// Good - Hash password in schema pre-save hook
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Avoid - Sending password in response
const user = await User.findById(userId);
res.json({ user }); // Includes password!
```

### SQL Injection Prevention

```javascript
// Good - Mongoose handles parameterization
const user = await User.findOne({ email: req.body.email });

// Good - Sanitize input (additional layer)
const email = req.body.email.trim().toLowerCase();
```

---

## ✅ Best Practices Checklist

- [ ] Use ES6+ features (arrow functions, destructuring, template literals)
- [ ] Use async/await instead of .then()
- [ ] Wrap async functions with asyncHandler
- [ ] Use early returns for error cases
- [ ] Keep functions small (< 50 lines)
- [ ] Use descriptive variable and function names
- [ ] Consistent naming conventions (camelCase, PascalCase)
- [ ] Add JSDoc comments for public functions
- [ ] Validate all user input
- [ ] Never commit .env files
- [ ] Exclude passwords from responses
- [ ] Use environment variables for secrets
- [ ] Handle errors consistently
- [ ] Return consistent response format
- [ ] Use pagination for large datasets

---

## 📚 Related Documents

- [Backend Overview](./backend-overview.md)
- [Controller Design Pattern](./controller-design-pattern.md)
- [Middleware Design](./middleware-design.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive backend coding standards guide
