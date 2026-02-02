# Global Error Middleware

> Centralized error handling for Express.js

---

## 📋 Table of Contents

1. [Error Middleware Overview](#error-middleware-overview)
2. [Implementation](#implementation)
3. [Error Types Handled](#error-types-handled)
4. [Response Formatting](#response-formatting)
5. [Error Logging](#error-logging)

---

## 🛡️ Error Middleware Overview

### Purpose

Global error middleware provides:
- **Centralized error handling**: Single place to handle all errors
- **Consistent error responses**: Same format for all errors
- **Error logging**: Record all errors for debugging
- **Security**: Hide internal details from clients
- **Development vs Production**: Different behaviors per environment

### Middleware Position

**CRITICAL**: Error middleware must be the **last middleware** in the chain.

```javascript
// server.js
const express = require('express');
const app = express();

// 1. Regular middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

// 2. Routes
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/orders', orderRoutes);

// 3. 404 handler (after all routes)
app.use((req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
});

// 4. Global error handler (LAST middleware) ✅
app.use((err, req, res, next) => {
  // Error handling logic
});
```

---

## 🔧 Implementation

### Complete Error Middleware

```javascript
// middleware/errorHandler.js
const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  // Copy error object
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;
  error.name = err.name;
  
  // Log error to console (development)
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ ERROR:');
    console.error('  Message:', err.message);
    console.error('  Status:', err.statusCode || 500);
    console.error('  Stack:', err.stack);
  }
  
  // Log error to file/service (production)
  if (process.env.NODE_ENV === 'production') {
    logError(err, req);  // Custom logging function
  }
  
  // ──────────────────────────────────────────────
  // Handle specific error types
  // ──────────────────────────────────────────────
  
  // 1. Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = 'Validation failed';
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    error = new AppError(message, 400, errors);
  }
  
  // 2. Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new AppError(message, 400);
  }
  
  // 3. Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const value = err.keyValue[field];
    const message = `${field} '${value}' already exists`;
    error = new AppError(message, 409);
  }
  
  // 4. JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = new AppError(message, 401);
  }
  
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired. Please log in again.';
    error = new AppError(message, 401);
  }
  
  // 5. Multer file upload errors
  if (err.name === 'MulterError') {
    let message = 'File upload error';
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size too large. Maximum 5MB allowed.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files. Maximum 5 files allowed.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field.';
    }
    
    error = new AppError(message, 400);
  }
  
  // ──────────────────────────────────────────────
  // Send error response
  // ──────────────────────────────────────────────
  
  const statusCode = error.statusCode || 500;
  const status = error.status || 'error';
  
  // Development: Send full error details
  if (process.env.NODE_ENV === 'development') {
    return res.status(statusCode).json({
      success: false,
      status,
      message: error.message || 'Internal server error',
      errors: error.errors || [],
      stack: error.stack,
      error: err  // Full error object
    });
  }
  
  // Production: Hide internal details
  if (error.isOperational) {
    // Operational error: Safe to send to client
    return res.status(statusCode).json({
      success: false,
      status,
      message: error.message,
      errors: error.errors || []
    });
  } else {
    // Programmer error: Don't leak details
    console.error('🔥 PROGRAMMER ERROR:', err);
    
    return res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went wrong. Please try again later.'
    });
  }
};

module.exports = errorHandler;
```

### Custom AppError Class

```javascript
// utils/AppError.js
class AppError extends Error {
  constructor(message, statusCode, errors = []) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;  // Mark as operational error
    this.errors = errors;  // Array of field-specific errors
    
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
```

---

## 🔍 Error Types Handled

### 1. Mongoose Validation Error

```javascript
// Example error from Mongoose
{
  name: 'ValidationError',
  errors: {
    email: {
      message: 'Email is required',
      kind: 'required',
      path: 'email'
    },
    password: {
      message: 'Password must be at least 8 characters',
      kind: 'minlength',
      path: 'password'
    }
  }
}

// Transformed response
{
  success: false,
  status: 'fail',
  message: 'Validation failed',
  errors: [
    { field: 'email', message: 'Email is required' },
    { field: 'password', message: 'Password must be at least 8 characters' }
  ]
}
```

### 2. Mongoose Cast Error

```javascript
// Example: Invalid MongoDB ObjectId
// Request: GET /api/hotels/invalid_id

{
  name: 'CastError',
  kind: 'ObjectId',
  value: 'invalid_id',
  path: '_id'
}

// Transformed response
{
  success: false,
  status: 'fail',
  message: 'Invalid _id: invalid_id'
}
```

### 3. Mongoose Duplicate Key Error

```javascript
// Example: Duplicate email registration
{
  name: 'MongoServerError',
  code: 11000,
  keyPattern: { email: 1 },
  keyValue: { email: 'user@example.com' }
}

// Transformed response
{
  success: false,
  status: 'fail',
  message: "email 'user@example.com' already exists"
}
```

### 4. JWT Errors

```javascript
// JsonWebTokenError (invalid token)
{
  name: 'JsonWebTokenError',
  message: 'jwt malformed'
}

// Transformed response
{
  success: false,
  status: 'fail',
  message: 'Invalid token. Please log in again.'
}

// TokenExpiredError
{
  name: 'TokenExpiredError',
  message: 'jwt expired',
  expiredAt: '2026-02-02T10:00:00.000Z'
}

// Transformed response
{
  success: false,
  status: 'fail',
  message: 'Token expired. Please log in again.'
}
```

### 5. Multer File Upload Errors

```javascript
// LIMIT_FILE_SIZE
{
  name: 'MulterError',
  code: 'LIMIT_FILE_SIZE',
  field: 'image'
}

// Transformed response
{
  success: false,
  status: 'fail',
  message: 'File size too large. Maximum 5MB allowed.'
}
```

---

## 📄 Response Formatting

### Development Response (Full Details)

```javascript
// Response in development mode
{
  success: false,
  status: 'error',
  message: 'Hotel not found',
  errors: [],
  stack: 'Error: Hotel not found\n    at getHotelById (/controllers/hotelController.js:45:11)\n    ...',
  error: {
    // Full error object with all properties
  }
}
```

### Production Response (Operational Error)

```javascript
// Response in production for operational errors
{
  success: false,
  status: 'fail',
  message: 'Hotel not found',
  errors: []
}
```

### Production Response (Programmer Error)

```javascript
// Response in production for programmer errors (hide details)
{
  success: false,
  status: 'error',
  message: 'Something went wrong. Please try again later.'
}
```

### Response with Field Errors

```javascript
// Validation error with field details
{
  success: false,
  status: 'fail',
  message: 'Validation failed',
  errors: [
    { field: 'email', message: 'Invalid email format' },
    { field: 'password', message: 'Password must be at least 8 characters' },
    { field: 'fullname', message: 'Full name is required' }
  ]
}
```

---

## 📝 Error Logging

### Development Logging

```javascript
// Console logging in development
if (process.env.NODE_ENV === 'development') {
  console.error('❌ ERROR:');
  console.error('  Message:', err.message);
  console.error('  Status:', err.statusCode || 500);
  console.error('  Stack:', err.stack);
}
```

### Production Logging

```javascript
// Custom logging function for production
const logError = (err, req) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    message: err.message,
    statusCode: err.statusCode || 500,
    stack: err.stack,
    
    // Request details
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?._id,
    userEmail: req.user?.email,
    
    // Headers (exclude sensitive data)
    headers: {
      'user-agent': req.headers['user-agent'],
      'accept': req.headers['accept']
    },
    
    // Body (exclude passwords)
    body: sanitizeBody(req.body)
  };
  
  // Log to file
  fs.appendFileSync(
    path.join(__dirname, '../logs/error.log'),
    JSON.stringify(errorLog) + '\n'
  );
  
  // Send to external service (Sentry, LogRocket, etc.)
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
};

// Remove sensitive fields from body
const sanitizeBody = (body) => {
  const sanitized = { ...body };
  delete sanitized.password;
  delete sanitized.refreshToken;
  delete sanitized.accessToken;
  return sanitized;
};
```

### Logging to Winston

```javascript
// Use Winston for advanced logging
const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// In development, also log to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Use in error middleware
const logError = (err, req) => {
  logger.error({
    message: err.message,
    statusCode: err.statusCode || 500,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?._id
  });
};
```

---

## 🧪 Testing Error Middleware

### Manual Testing

```javascript
// Create test route to trigger errors
if (process.env.NODE_ENV === 'development') {
  app.get('/test/error', (req, res, next) => {
    next(new AppError('Test error', 500));
  });
  
  app.get('/test/validation', (req, res, next) => {
    const error = new AppError('Validation failed', 400, [
      { field: 'email', message: 'Invalid email' },
      { field: 'password', message: 'Password too short' }
    ]);
    next(error);
  });
  
  app.get('/test/programmer', (req, res, next) => {
    // Trigger programmer error
    const obj = null;
    obj.property;  // TypeError
  });
}
```

### Unit Testing

```javascript
// tests/errorHandler.test.js
const request = require('supertest');
const app = require('../server');

describe('Error Middleware', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown');
    
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not found');
  });
  
  it('should handle validation errors', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid' });  // Invalid data
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeInstanceOf(Array);
  });
  
  it('should hide stack trace in production', async () => {
    process.env.NODE_ENV = 'production';
    
    const res = await request(app).get('/test/error');
    
    expect(res.status).toBe(500);
    expect(res.body.stack).toBeUndefined();
  });
});
```

---

## 📚 Related Documents

- [Error Handling Strategy](./error-handling-strategy.md)
- [HTTP Error Mapping](./http-error-mapping.md)
- [Logging Levels](./logging-levels.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive global error middleware implementation
