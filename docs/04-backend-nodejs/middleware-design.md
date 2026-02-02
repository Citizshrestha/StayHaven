# Middleware Design

> Comprehensive guide to Express middleware implementation, authentication, authorization, and request processing in StayHaven

---

## 📋 Table of Contents

1. [Middleware Architecture](#middleware-architecture)
2. [Authentication Middleware](#authentication-middleware)
3. [Authorization Middleware](#authorization-middleware)
4. [Upload Middleware](#upload-middleware)
5. [Error Handling](#error-handling)
6. [Custom Middleware](#custom-middleware)
7. [Best Practices](#best-practices)

---

## 🏗️ Middleware Architecture

### What is Middleware?

Middleware functions are functions that have access to the request object (`req`), response object (`res`), and the next middleware function (`next`) in the application's request-response cycle.

### Middleware Types

1. **Application-level middleware** - Bound to app instance
2. **Router-level middleware** - Bound to router instance
3. **Error-handling middleware** - 4 parameters (err, req, res, next)
4. **Built-in middleware** - express.json(), express.urlencoded()
5. **Third-party middleware** - cors, cookie-parser, multer

### Middleware Flow

```
Request → JSON Parser → CORS → Cookie Parser → Routes → Auth → Authorization → Controller → Response
```

---

## 🔐 Authentication Middleware

### File: `middleware/authMiddleware.js`

```javascript
import jwt from 'jsonwebtoken';
import { User } from '../models/user.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Protect routes - Verify JWT token
 * Checks Authorization header OR cookies for access token
 * Populates req.user with authenticated user data
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Check Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Check cookies (fallback)
  else if (req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  // No token found
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Find user and populate role
    req.user = await User.findById(decoded.id)
      .select('-password') // Exclude password
      .populate('role');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);

    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }
});
```

### Usage Example

```javascript
import { protect } from '../middleware/authMiddleware.js';

// Protected route - requires authentication
router.get('/me', protect, getCurrentUser);
router.post('/logout', protect, logoutUser);
```

---

## 👥 Authorization Middleware

### Role-Based Access Control

```javascript
/**
 * Authorize - Check user role/companyRole
 * Must be used AFTER protect middleware
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'owner', 'manager')
 */
export const authorize = (...roles) => {
  return asyncHandler(async (req, res, next) => {
    // Check if user exists (should be set by protect middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // Check role.name (system role)
    const userRole = req.user.role?.name;
    
    // Check companyRole (company-specific role)
    const companyRole = req.user.companyRole;

    // Allow if either role matches
    if (!roles.includes(userRole) && !roles.includes(companyRole)) {
      return res.status(403).json({
        success: false,
        message: `User role '${userRole || companyRole}' is not authorized to access this route`,
      });
    }

    next();
  });
};
```

### Authorization Usage

```javascript
import { protect, authorize } from '../middleware/authMiddleware.js';

// Only hotel owners can create hotels
router.post('/hotels', protect, authorize('owner', 'admin'), createHotel);

// Only staff can access orders
router.get('/orders', protect, authorize('waiter', 'chief', 'manager'), getOrders);

// Multiple roles allowed
router.put('/hotels/:id', protect, authorize('owner', 'manager', 'admin'), updateHotel);
```

---

## 📁 Upload Middleware

### File: `middleware/upload.js`

```javascript
import multer from 'multer';
import path from 'path';

// Use memory storage (files stored in memory as Buffer)
const storage = multer.memoryStorage();

// File filter - only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: fileFilter,
});

export default upload;
```

### Upload Middleware Usage

```javascript
import upload from '../middleware/upload.js';

// Single file upload
router.post('/upload', protect, upload.single('image'), uploadImage);

// Multiple files upload (max 10)
router.post('/upload-multiple', protect, upload.array('images', 10), uploadImages);

// Multiple fields
router.post('/hotel', protect, upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'logo', maxCount: 1 }
]), createHotel);
```

### Cloudinary Integration

```javascript
// controllers/uploadController.js
import { v2 as cloudinary } from 'cloudinary';
import { asyncHandler } from '../utils/asyncHandler.js';

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  // Upload to Cloudinary
  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'stayhaven',
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(req.file.buffer);
  });

  res.json({
    success: true,
    message: "File uploaded successfully",
    url: result.secure_url,
    publicId: result.public_id,
  });
});
```

---

## ⚠️ Error Handling

### Global Error Handler

```javascript
// server.js
app.use((err, req, res, next) => {
  console.error("Error:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});
```

### JSON Parsing Error Handler

```javascript
// server.js
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: "Malformed JSON",
    });
  }
  next(err);
});
```

### Multer Error Handler

```javascript
// Handle multer errors
router.post('/upload', upload.single('image'), (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: "File size cannot exceed 5MB",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
}, uploadImage);
```

---

## 🛠️ Custom Middleware

### Request Logging

```javascript
// middleware/logger.js
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
};

// Usage
app.use(requestLogger);
```

### Rate Limiting

```javascript
// middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many login attempts, please try again later.",
  },
});

// Usage
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
```

### Validation Middleware

```javascript
// middleware/validation.js
export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    next();
  };
};

// Usage with Joi
import Joi from 'joi';

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

router.post('/login', validateBody(loginSchema), loginUser);
```

### Company Scope Middleware

```javascript
// middleware/companyScope.js
export const requireCompany = asyncHandler(async (req, res, next) => {
  if (!req.user.company) {
    return res.status(403).json({
      success: false,
      message: "This feature requires company association",
    });
  }
  next();
});

export const requireHotelAccess = asyncHandler(async (req, res, next) => {
  const hotelId = req.params.hotelId || req.body.hotel;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const hotel = await Hotel.findById(hotelId);

  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found",
    });
  }

  // Check if user's company owns this hotel
  if (hotel.company.toString() !== req.user.company.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to access this hotel",
    });
  }

  req.hotel = hotel;
  next();
});

// Usage
router.get('/orders', protect, requireCompany, requireHotelAccess, getOrders);
```

---

## ✅ Best Practices

### 1. **Order Middleware Correctly**

```javascript
// Correct order
app.use(express.json());           // Parse JSON first
app.use(cors(corsOptions));        // CORS
app.use(cookieParser());           // Parse cookies
app.use('/api/auth', authRoutes);  // Routes
app.use(errorHandler);             // Error handler last
```

### 2. **Use asyncHandler**

```javascript
// Good - wrapped with asyncHandler
export const protect = asyncHandler(async (req, res, next) => {
  // async operations...
  next();
});

// Avoid - manual try-catch
export const protect = async (req, res, next) => {
  try {
    // async operations...
    next();
  } catch (error) {
    next(error);
  }
};
```

### 3. **Chain Middleware**

```javascript
// Multiple middleware in order
router.post(
  '/hotels',
  protect,              // Authenticate
  authorize('owner'),   // Authorize
  upload.array('images', 10), // Upload
  createHotel          // Controller
);
```

### 4. **Early Returns**

```javascript
// Good - early return
if (!token) {
  return res.status(401).json({ message: "No token" });
}

// Avoid - else block
if (!token) {
  res.status(401).json({ message: "No token" });
} else {
  // continue...
}
```

### 5. **Populate req Object**

```javascript
// Set user on request object for downstream use
req.user = await User.findById(decoded.id);
req.hotel = await Hotel.findById(hotelId);
next();
```

---

## 📚 Related Documents

- [Backend Overview](./backend-overview.md)
- [Controller Design Pattern](./controller-design-pattern.md)
- [Routing Strategy](./routing-strategy.md)
- [Authentication APIs](../03-api/authentication-apis.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive middleware design guide
