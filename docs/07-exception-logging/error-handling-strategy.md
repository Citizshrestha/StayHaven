# Error Handling Strategy

> Comprehensive error handling approach for StayHaven

---

## 📋 Table of Contents

1. [Error Handling Philosophy](#error-handling-philosophy)
2. [Error Categories](#error-categories)
3. [Error Handling Layers](#error-handling-layers)
4. [Error Propagation](#error-propagation)
5. [Error Recovery](#error-recovery)

---

## 🎯 Error Handling Philosophy

### Core Principles

```javascript
const ERROR_HANDLING_PRINCIPLES = {
  1: 'Fail fast - Detect errors early',
  2: 'Meaningful errors - Provide actionable messages',
  3: 'Never expose internals - Hide stack traces from clients',
  4: 'Log everything - Record all errors for debugging',
  5: 'Graceful degradation - Continue serving users when possible',
  6: 'Centralized handling - Use middleware for consistency'
};
```

### Error Flow

```
┌──────────────────────────────────────────────────┐
│             User Action                          │
└────────────────┬─────────────────────────────────┘
                 │
                 │ Request
                 │
┌────────────────▼─────────────────────────────────┐
│          Validation Layer                        │
│  ├─ Schema validation (Mongoose)                 │
│  ├─ Request validation (express-validator)       │
│  └─ Business rules validation                    │
└────────────────┬─────────────────────────────────┘
                 │
                 │ Valid request
                 │
┌────────────────▼─────────────────────────────────┐
│          Business Logic Layer                    │
│  ├─ Controllers                                  │
│  ├─ Services                                     │
│  └─ Database operations                          │
│                                                  │
│  ❌ Error occurs                                 │
│     ├─ Validation error                          │
│     ├─ Not found error                           │
│     ├─ Authorization error                       │
│     └─ Database error                            │
└────────────────┬─────────────────────────────────┘
                 │
                 │ Throw error
                 │
┌────────────────▼─────────────────────────────────┐
│          Error Middleware                        │
│  ├─ Log error details                            │
│  ├─ Determine error type                         │
│  ├─ Map to HTTP status code                      │
│  └─ Format error response                        │
└────────────────┬─────────────────────────────────┘
                 │
                 │ Error response
                 │
┌────────────────▼─────────────────────────────────┐
│             Client                               │
│  ├─ Display user-friendly message                │
│  ├─ Show field errors (if validation)            │
│  └─ Retry or redirect                            │
└──────────────────────────────────────────────────┘
```

---

## 🏷️ Error Categories

### 1. Operational Errors

**Definition**: Expected errors that occur during normal operation.

```javascript
const OPERATIONAL_ERRORS = {
  validation: {
    description: 'User input fails validation',
    examples: [
      'Email format invalid',
      'Password too short',
      'Required field missing'
    ],
    httpStatus: 400,
    shouldLog: true,
    canRecover: true
  },
  
  authentication: {
    description: 'User authentication fails',
    examples: [
      'Invalid credentials',
      'Token expired',
      'Token missing'
    ],
    httpStatus: 401,
    shouldLog: true,
    canRecover: true
  },
  
  authorization: {
    description: 'User lacks permissions',
    examples: [
      'Insufficient role',
      'Not resource owner',
      'Company mismatch'
    ],
    httpStatus: 403,
    shouldLog: true,
    canRecover: false
  },
  
  notFound: {
    description: 'Resource does not exist',
    examples: [
      'Hotel not found',
      'Order not found',
      'User not found'
    ],
    httpStatus: 404,
    shouldLog: false,  // Don't log 404s (too noisy)
    canRecover: true
  },
  
  conflict: {
    description: 'Resource already exists',
    examples: [
      'Email already registered',
      'Duplicate hotel name',
      'Room already booked'
    ],
    httpStatus: 409,
    shouldLog: true,
    canRecover: true
  },
  
  rateLimited: {
    description: 'Too many requests',
    examples: [
      'Login attempts exceeded',
      'API rate limit exceeded'
    ],
    httpStatus: 429,
    shouldLog: true,
    canRecover: true  // Retry after delay
  }
};
```

### 2. Programmer Errors

**Definition**: Bugs in the code that should never occur in production.

```javascript
const PROGRAMMER_ERRORS = {
  typeError: {
    description: 'Incorrect variable type',
    examples: [
      "Cannot read property 'id' of undefined",
      'Expected string, got number'
    ],
    httpStatus: 500,
    shouldLog: true,
    canRecover: false,
    action: 'Fix immediately'
  },
  
  referenceError: {
    description: 'Variable not defined',
    examples: [
      'userId is not defined',
      'Function does not exist'
    ],
    httpStatus: 500,
    shouldLog: true,
    canRecover: false,
    action: 'Fix immediately'
  },
  
  logicError: {
    description: 'Incorrect business logic',
    examples: [
      'Negative price calculated',
      'Division by zero',
      'Infinite loop'
    ],
    httpStatus: 500,
    shouldLog: true,
    canRecover: false,
    action: 'Fix immediately'
  }
};
```

### 3. System Errors

**Definition**: Infrastructure or external service failures.

```javascript
const SYSTEM_ERRORS = {
  databaseError: {
    description: 'Database connection or query fails',
    examples: [
      'MongoDB connection lost',
      'Query timeout',
      'Disk full'
    ],
    httpStatus: 503,
    shouldLog: true,
    canRecover: true,  // Retry with backoff
    action: 'Alert DevOps'
  },
  
  externalServiceError: {
    description: 'Third-party service fails',
    examples: [
      'Cloudinary upload failed',
      'SendGrid email failed',
      'Stripe payment failed'
    ],
    httpStatus: 502,
    shouldLog: true,
    canRecover: true,  // Retry or fallback
    action: 'Monitor service status'
  },
  
  fileSystemError: {
    description: 'File operations fail',
    examples: [
      'Cannot write to disk',
      'File not found',
      'Permission denied'
    ],
    httpStatus: 500,
    shouldLog: true,
    canRecover: false,
    action: 'Check server resources'
  }
};
```

---

## 🏗️ Error Handling Layers

### Layer 1: Validation

**Purpose**: Catch invalid input early, before business logic.

```javascript
// Mongoose schema validation
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: (v) => /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v),
      message: 'Invalid email format'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters']
  },
  age: {
    type: Number,
    min: [18, 'Must be at least 18 years old'],
    max: [120, 'Invalid age']
  }
});

// Express-validator middleware
const validateRegister = [
  body('email')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain number'),
  
  body('fullname')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  
  // Handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }
    next();
  }
];

// Usage in route
router.post('/register', validateRegister, authController.register);
```

### Layer 2: Business Logic

**Purpose**: Handle domain-specific errors (not found, conflict, etc.).

```javascript
// controllers/hotelController.js
const getHotelById = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  
  // Find hotel (operational error if not found)
  const hotel = await Hotel.findOne({
    _id: hotelId,
    company: req.user.company  // Multi-tenancy check
  });
  
  if (!hotel) {
    throw new AppError('Hotel not found', 404);
  }
  
  res.json({
    success: true,
    data: hotel
  });
});

const createHotel = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  
  // Check for conflict
  const existingHotel = await Hotel.findOne({
    name,
    company: req.user.company
  });
  
  if (existingHotel) {
    throw new AppError('Hotel with this name already exists', 409);
  }
  
  // Create hotel
  const hotel = await Hotel.create({
    ...req.body,
    company: req.user.company
  });
  
  res.status(201).json({
    success: true,
    data: hotel
  });
});
```

### Layer 3: Infrastructure

**Purpose**: Handle database, file system, external service errors.

```javascript
// Database connection error handling
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,  // 5 second timeout
      socketTimeoutMS: 45000
    });
    
    console.log('✓ MongoDB connected');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    
    // Retry after 5 seconds
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
});

// External service error handling
const uploadToCloudinary = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'stayhaven',
      resource_type: 'auto'
    });
    
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    
    // Throw operational error
    throw new AppError('Image upload failed. Please try again.', 500);
  }
};
```

---

## 📤 Error Propagation

### Async Error Handling

```javascript
// utils/asyncHandler.js - Wraps async controllers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  
  // If error occurs, asyncHandler catches and passes to next(error)
  res.json({ success: true, data: orders });
});

// Alternative: try-catch in controller
const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id });
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);  // Pass to error middleware
  }
};
```

### Custom Error Class

```javascript
// utils/AppError.js
class AppError extends Error {
  constructor(message, statusCode, errors = []) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;  // Distinguish from programmer errors
    this.errors = errors;  // Field-specific errors (for validation)
    
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

// Usage
throw new AppError('Hotel not found', 404);
throw new AppError('Validation failed', 400, [
  { field: 'email', message: 'Invalid email' },
  { field: 'password', message: 'Password too short' }
]);
```

---

## 🔄 Error Recovery

### Retry Strategies

```javascript
// Exponential backoff for transient failures
const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const backoffDelay = delay * Math.pow(2, attempt - 1);
        console.log(`Attempt ${attempt} failed. Retrying in ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  throw lastError;
};

// Usage: Retry external API call
const sendEmail = asyncHandler(async (req, res) => {
  const { to, subject, body } = req.body;
  
  await retryWithBackoff(async () => {
    await sendgrid.send({ to, subject, html: body });
  }, 3, 1000);
  
  res.json({
    success: true,
    message: 'Email sent successfully'
  });
});
```

### Fallback Values

```javascript
// Fallback to default if external service fails
const getHotelImage = async (hotelId) => {
  try {
    const imageUrl = await cloudinary.getImage(hotelId);
    return imageUrl;
  } catch (error) {
    console.error('Failed to fetch hotel image:', error);
    
    // Return default placeholder image
    return '/images/hotel-placeholder.jpg';
  }
};
```

### Graceful Degradation

```javascript
// Continue serving even if non-critical feature fails
const getHotelDetails = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  
  // Critical: Must have hotel data
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) {
    throw new AppError('Hotel not found', 404);
  }
  
  // Non-critical: Reviews can fail
  let reviews = [];
  try {
    reviews = await Review.find({ hotel: hotelId }).limit(5);
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    // Continue without reviews
  }
  
  // Non-critical: Recommendations can fail
  let recommendations = [];
  try {
    recommendations = await getRecommendations(hotelId);
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    // Continue without recommendations
  }
  
  res.json({
    success: true,
    data: {
      hotel,
      reviews,
      recommendations
    }
  });
});
```

### Circuit Breaker Pattern

```javascript
// Prevent repeated calls to failing service
class CircuitBreaker {
  constructor(fn, threshold = 5, timeout = 60000) {
    this.fn = fn;
    this.threshold = threshold;  // Failures before opening
    this.timeout = timeout;      // Time to wait before retry
    this.failureCount = 0;
    this.state = 'CLOSED';       // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }
  
  async execute(...args) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await this.fn(...args);
      
      // Success: Reset
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      
      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.timeout;
        console.error(`Circuit breaker OPEN for ${this.timeout}ms`);
      }
      
      throw error;
    }
  }
}

// Usage: Protect external API
const sendEmailBreaker = new CircuitBreaker(sendEmail, 5, 60000);

const notifyUser = async (userId, message) => {
  try {
    await sendEmailBreaker.execute(userId, message);
  } catch (error) {
    console.error('Email service unavailable. Using fallback notification.');
    // Fallback: Save notification in database for later delivery
    await Notification.create({ user: userId, message });
  }
};
```

---

## 📚 Related Documents

- [Global Error Middleware](./global-error-middleware.md)
- [HTTP Error Mapping](./http-error-mapping.md)
- [Logging Levels](./logging-levels.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive error handling strategy
