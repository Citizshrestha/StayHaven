# HTTP Error Mapping

> HTTP status codes and error mapping guide

---

## 📋 Table of Contents

1. [HTTP Status Code Categories](#http-status-code-categories)
2. [Common Status Codes](#common-status-codes)
3. [Custom Error Classes](#custom-error-classes)
4. [Error Message Guidelines](#error-message-guidelines)
5. [Status Code Selection](#status-code-selection)

---

## 📊 HTTP Status Code Categories

### Status Code Ranges

| Range | Category | Meaning | Client Action |
|---|---|---|---|
| **1xx** | Informational | Request received, processing | Wait |
| **2xx** | Success | Request successful | Proceed |
| **3xx** | Redirection | Further action needed | Redirect |
| **4xx** | Client Error | Client made a mistake | Fix and retry |
| **5xx** | Server Error | Server failed | Retry later |

---

## ✅ Common Status Codes

### 2xx Success

#### 200 OK

**Use**: Successful GET, PUT, PATCH, DELETE requests.

```javascript
// GET request successful
const getHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find({ company: req.user.company });
  
  res.status(200).json({
    success: true,
    data: hotels
  });
});

// PUT request successful
const updateHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  
  res.status(200).json({
    success: true,
    message: 'Hotel updated successfully',
    data: hotel
  });
});
```

#### 201 Created

**Use**: Successful POST request that creates a resource.

```javascript
const createHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.create({
    ...req.body,
    company: req.user.company
  });
  
  res.status(201).json({
    success: true,
    message: 'Hotel created successfully',
    data: hotel
  });
});
```

#### 204 No Content

**Use**: Successful DELETE request with no response body.

```javascript
const deleteHotel = asyncHandler(async (req, res) => {
  await Hotel.findByIdAndDelete(req.params.id);
  
  res.status(204).send();  // No content
});
```

---

### 4xx Client Errors

#### 400 Bad Request

**Use**: Invalid request body, malformed JSON, validation errors.

```javascript
// Mongoose validation error
{
  success: false,
  status: 'fail',
  message: 'Validation failed',
  errors: [
    { field: 'email', message: 'Invalid email format' },
    { field: 'password', message: 'Password must be at least 8 characters' }
  ]
}

// Invalid JSON
{
  success: false,
  status: 'fail',
  message: 'Invalid JSON format'
}

// Missing required field
throw new AppError('Hotel name is required', 400);

// Invalid data type
throw new AppError('Price must be a number', 400);
```

#### 401 Unauthorized

**Use**: Missing or invalid authentication credentials.

```javascript
// No token provided
throw new AppError('No token provided. Please log in.', 401);

// Invalid token
throw new AppError('Invalid token. Please log in again.', 401);

// Token expired
throw new AppError('Token expired. Please log in again.', 401);

// Wrong password
throw new AppError('Invalid email or password', 401);

// Middleware example
const protect = asyncHandler(async (req, res, next) => {
  let token;
  
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  
  if (!token) {
    throw new AppError('Not authorized. Please log in.', 401);
  }
  
  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (error) {
    throw new AppError('Invalid or expired token', 401);
  }
});
```

#### 403 Forbidden

**Use**: User authenticated but lacks permissions.

```javascript
// Insufficient role
throw new AppError('You do not have permission to perform this action', 403);

// Not resource owner
throw new AppError('You can only delete your own orders', 403);

// Company mismatch (multi-tenancy)
throw new AppError('Access denied to this resource', 403);

// Middleware example
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.companyRole)) {
      throw new AppError(
        `Role '${req.user.companyRole}' is not authorized for this action`,
        403
      );
    }
    next();
  };
};

// Usage
router.delete('/hotels/:id', protect, authorize('owner', 'manager'), deleteHotel);
```

#### 404 Not Found

**Use**: Resource does not exist.

```javascript
// Hotel not found
const hotel = await Hotel.findById(req.params.id);
if (!hotel) {
  throw new AppError('Hotel not found', 404);
}

// Order not found
throw new AppError(`Order with ID ${orderId} not found`, 404);

// User not found
throw new AppError('User not found', 404);

// Route not found (catch-all)
app.use((req, res, next) => {
  throw new AppError(`Route ${req.originalUrl} not found`, 404);
});
```

#### 409 Conflict

**Use**: Resource already exists, duplicate data.

```javascript
// Email already registered
const userExists = await User.findOne({ email });
if (userExists) {
  throw new AppError('Email already registered', 409);
}

// Hotel name already exists
throw new AppError('Hotel with this name already exists', 409);

// Room already booked
throw new AppError('Room is already booked for these dates', 409);

// Mongoose duplicate key error (handled in error middleware)
if (err.code === 11000) {
  const field = Object.keys(err.keyPattern)[0];
  throw new AppError(`${field} already exists`, 409);
}
```

#### 422 Unprocessable Entity

**Use**: Semantic validation errors (syntactically correct but semantically wrong).

```javascript
// Check-out before check-in
if (checkOut <= checkIn) {
  throw new AppError('Check-out date must be after check-in date', 422);
}

// Negative price
if (price < 0) {
  throw new AppError('Price cannot be negative', 422);
}

// Invalid date range
throw new AppError('End date cannot be before start date', 422);

// Insufficient quantity
if (orderQuantity > stockQuantity) {
  throw new AppError('Insufficient stock available', 422);
}
```

#### 429 Too Many Requests

**Use**: Rate limiting exceeded.

```javascript
// Rate limiter middleware
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 requests per window
  message: {
    success: false,
    status: 'fail',
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/login', loginLimiter, authController.login);

// Custom rate limit error
throw new AppError('Rate limit exceeded. Please try again later.', 429);
```

---

### 5xx Server Errors

#### 500 Internal Server Error

**Use**: Unexpected errors, programmer errors.

```javascript
// Unexpected error
throw new AppError('Something went wrong. Please try again.', 500);

// Programmer error (caught by error middleware)
// TypeError, ReferenceError, etc. → 500

// Database error
throw new AppError('Database operation failed', 500);

// In error middleware (production)
if (!error.isOperational) {
  // Programmer error - don't leak details
  return res.status(500).json({
    success: false,
    status: 'error',
    message: 'Something went wrong. Please try again later.'
  });
}
```

#### 502 Bad Gateway

**Use**: External service failures.

```javascript
// Cloudinary upload failed
try {
  const imageUrl = await cloudinary.uploader.upload(file.path);
} catch (error) {
  throw new AppError('Image upload service unavailable', 502);
}

// Payment gateway error
throw new AppError('Payment service temporarily unavailable', 502);

// Email service down
throw new AppError('Email service unavailable', 502);
```

#### 503 Service Unavailable

**Use**: Temporary unavailability, maintenance mode.

```javascript
// Database connection lost
if (!mongoose.connection.readyState) {
  throw new AppError('Database temporarily unavailable', 503);
}

// Maintenance mode
if (process.env.MAINTENANCE_MODE === 'true') {
  throw new AppError('System under maintenance. Please try again later.', 503);
}

// Service overloaded
throw new AppError('Service temporarily unavailable due to high load', 503);
```

---

## 🏗️ Custom Error Classes

### Base AppError Class

```javascript
// utils/AppError.js
class AppError extends Error {
  constructor(message, statusCode, errors = []) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
```

### Specialized Error Classes

```javascript
// utils/errors.js

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, errors);
    this.name = 'ValidationError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class UnprocessableEntityError extends AppError {
  constructor(message) {
    super(message, 422);
    this.name = 'UnprocessableEntityError';
  }
}

class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500);
    this.name = 'InternalServerError';
  }
}

module.exports = {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  InternalServerError
};
```

### Usage Examples

```javascript
const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
} = require('../utils/errors');

// Validation error
throw new ValidationError('Validation failed', [
  { field: 'email', message: 'Invalid email' }
]);

// Unauthorized
throw new UnauthorizedError('Invalid credentials');

// Forbidden
throw new ForbiddenError('Only owners can delete hotels');

// Not found
throw new NotFoundError('Hotel');

// Conflict
throw new ConflictError('Email already registered');
```

---

## 📝 Error Message Guidelines

### User-Friendly Messages

✅ **Good messages** (clear, actionable):
```javascript
'Email already registered. Please use a different email or log in.'
'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.'
'Hotel not found. It may have been deleted.'
'You do not have permission to delete this order.'
'Check-out date must be after check-in date.'
```

❌ **Bad messages** (vague, technical):
```javascript
'Error'
'Invalid input'
'Something went wrong'
'Database error: E11000 duplicate key'
'Cannot read property "id" of undefined'
```

### Message Structure

```javascript
// Pattern: [What happened] + [Why] + [What to do]

// Good
'Login failed. Invalid email or password. Please check your credentials and try again.'

// Bad
'Authentication error'
```

### Field-Specific Errors

```javascript
// Include field name and specific issue
{
  success: false,
  message: 'Validation failed',
  errors: [
    {
      field: 'email',
      message: 'Email is required'
    },
    {
      field: 'password',
      message: 'Password must be at least 8 characters'
    },
    {
      field: 'age',
      message: 'Age must be at least 18'
    }
  ]
}
```

---

## 🎯 Status Code Selection

### Decision Tree

```
┌─────────────────────────────────┐
│     Error occurred?             │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│   Is it a client mistake?       │
└───┬─────────────────────┬───────┘
    │ Yes                 │ No
    │                     │
    ▼                     ▼
┌─────────────┐    ┌──────────────────┐
│   4xx       │    │   5xx            │
│   Client    │    │   Server         │
│   Error     │    │   Error          │
└───┬─────────┘    └─────┬────────────┘
    │                    │
    ▼                    ▼
┌─────────────────────────────────┐
│   What type of client error?    │
├─────────────────────────────────┤
│ • Invalid data → 400            │
│ • Not logged in → 401           │
│ • No permission → 403           │
│ • Not found → 404               │
│ • Duplicate → 409               │
│ • Semantic error → 422          │
│ • Too many requests → 429       │
└─────────────────────────────────┘
                 
┌─────────────────────────────────┐
│   What type of server error?    │
├─────────────────────────────────┤
│ • Unexpected error → 500        │
│ • External service → 502        │
│ • Unavailable → 503             │
└─────────────────────────────────┘
```

### Common Scenarios

| Scenario | Status Code | Example |
|---|---|---|
| User sends invalid email format | 400 | `throw new AppError('Invalid email', 400)` |
| User forgot to include token | 401 | `throw new UnauthorizedError('No token')` |
| Waiter tries to delete manager's order | 403 | `throw new ForbiddenError()` |
| Hotel ID doesn't exist | 404 | `throw new NotFoundError('Hotel')` |
| Email already exists | 409 | `throw new ConflictError('Email exists')` |
| Check-out before check-in | 422 | `throw new AppError('Invalid dates', 422)` |
| Too many login attempts | 429 | Rate limiter middleware |
| Unexpected error in code | 500 | Caught by error middleware |
| Cloudinary upload fails | 502 | `throw new AppError('Upload failed', 502)` |
| Database connection lost | 503 | `throw new AppError('DB unavailable', 503)` |

---

## 📚 Related Documents

- [Error Handling Strategy](./error-handling-strategy.md)
- [Global Error Middleware](./global-error-middleware.md)
- [Logging Levels](./logging-levels.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive HTTP error mapping guide
