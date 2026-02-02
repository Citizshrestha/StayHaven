# API Security Best Practices

> Comprehensive security guidelines, secure coding practices, and API protection strategies for StayHaven

---

## 📋 Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Input Validation](#input-validation)
3. [Error Handling](#error-handling)
4. [Data Protection](#data-protection)
5. [API Design Security](#api-design-security)
6. [Security Checklist](#security-checklist)

---

## 🔐 Authentication & Authorization

### 1. Protect All Sensitive Routes

```javascript
// ❌ WRONG: Unprotected route
router.get('/users/:id', getUserById);

// ✅ CORRECT: Protected route
router.get('/users/:id', protect, getUserById);

// ✅ CORRECT: Protected + authorized
router.delete('/users/:id', protect, authorize('admin'), deleteUser);
```

### 2. Validate Tokens Properly

```javascript
// ✅ CORRECT: Comprehensive token validation
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Extract token
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Check user exists and is active
    const user = await User.findById(decoded.id).select('-password');

    if (!user || user.accountStatus !== 'active') {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
});
```

### 3. Implement Proper Authorization Checks

```javascript
// ✅ CORRECT: Check ownership
export const updateBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found"
    });
  }

  // Verify ownership (unless admin)
  if (
    req.user.role.name !== 'admin' &&
    booking.user.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this booking"
    });
  }

  // Update booking
  // ...
});
```

### 4. Use Role-Based Access Control

```javascript
// ✅ CORRECT: RBAC implementation
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role.name)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${req.user?.role.name || 'Guest'} role not authorized.`
      });
    }
    next();
  };
};

// Usage
router.post('/hotels',
  protect,
  authorize('admin', 'owner', 'manager'),
  createHotel
);
```

---

## ✅ Input Validation

### 1. Validate All Input

```javascript
// ✅ CORRECT: Comprehensive validation
export const createHotel = asyncHandler(async (req, res) => {
  const { name, description, address, phone, email } = req.body;

  // Required fields
  if (!name || !address) {
    return res.status(400).json({
      success: false,
      message: "Name and address are required"
    });
  }

  // Type validation
  if (typeof name !== 'string' || typeof address !== 'string') {
    return res.status(400).json({
      success: false,
      message: "Invalid data types"
    });
  }

  // Length validation
  if (name.length < 3 || name.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Name must be between 3 and 100 characters"
    });
  }

  // Email validation
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format"
    });
  }

  // Phone validation
  if (phone && !/^\+?[\d\s\-()]+$/.test(phone)) {
    return res.status(400).json({
      success: false,
      message: "Invalid phone number"
    });
  }

  // Create hotel
  // ...
});
```

### 2. Sanitize Input

```javascript
import validator from 'validator';
import sanitizeHtml from 'sanitize-html';

// ✅ CORRECT: Sanitize user input
export const createPost = asyncHandler(async (req, res) => {
  const { title, content } = req.body;

  // Escape HTML entities
  const sanitizedTitle = validator.escape(title);

  // Remove dangerous HTML tags
  const sanitizedContent = sanitizeHtml(content, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    allowedAttributes: {
      'a': ['href']
    }
  });

  const post = await Post.create({
    title: sanitizedTitle,
    content: sanitizedContent,
    user: req.user._id
  });

  res.status(201).json({
    success: true,
    post
  });
});
```

### 3. Use Schema Validation

```javascript
import Joi from 'joi';

// Define validation schema
const hotelSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(1000),
  address: Joi.string().required(),
  phone: Joi.string().pattern(/^\+?[\d\s\-()]+$/),
  email: Joi.string().email(),
  rating: Joi.number().min(0).max(5),
  priceRange: Joi.string().valid('budget', 'mid-range', 'luxury')
});

// Validation middleware
export const validateHotel = (req, res, next) => {
  const { error } = hotelSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  next();
};

// Usage
router.post('/hotels', protect, validateHotel, createHotel);
```

### 4. Prevent NoSQL Injection

```javascript
// ❌ VULNERABLE: Direct use of user input
const user = await User.findOne({ email: req.body.email });

// Attacker payload:
// { "email": { "$gt": "" } }
// This bypasses authentication by matching all users!

// ✅ CORRECT: Validate input type
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Ensure email is a string
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      message: "Invalid input"
    });
  }

  const user = await User.findOne({ email });
  // ...
});

// ✅ CORRECT: Use mongoose-sanitize
import mongoSanitize from 'express-mongo-sanitize';

app.use(mongoSanitize()); // Removes $ and . from user input
```

---

## 🚫 Error Handling

### 1. Don't Leak Sensitive Information

```javascript
// ❌ WRONG: Exposes stack trace
app.use((err, req, res, next) => {
  res.status(500).json({
    success: false,
    error: err.message,
    stack: err.stack // ⚠️ Exposes internal details
  });
});

// ✅ CORRECT: Generic error message
app.use((err, req, res, next) => {
  console.error(err); // Log internally

  res.status(500).json({
    success: false,
    message: "An error occurred. Please try again later."
  });
});

// ✅ CORRECT: Environment-specific errors
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server error",
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

### 2. Avoid Information Disclosure

```javascript
// ❌ WRONG: Reveals user existence
export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(404).json({
      message: "User not found" // ⚠️ Helps attackers
    });
  }

  const isMatch = await user.matchPassword(req.body.password);

  if (!isMatch) {
    return res.status(401).json({
      message: "Incorrect password" // ⚠️ Confirms email exists
    });
  }
  // ...
});

// ✅ CORRECT: Generic error message
export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(401).json({
      message: "Invalid credentials" // Generic
    });
  }

  const isMatch = await user.matchPassword(req.body.password);

  if (!isMatch) {
    return res.status(401).json({
      message: "Invalid credentials" // Same message
    });
  }
  // ...
});
```

### 3. Handle Async Errors

```javascript
// ✅ CORRECT: Use asyncHandler wrapper
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  // Errors automatically caught and passed to error handler
  res.json({ success: true, user });
});
```

---

## 🔒 Data Protection

### 1. Never Log Sensitive Data

```javascript
// ❌ WRONG: Logs password
console.log('Login attempt:', req.body);
// Output: { email: 'user@example.com', password: 'secret123' }

// ✅ CORRECT: Omit sensitive fields
const { password, ...safeData } = req.body;
console.log('Login attempt:', safeData);
// Output: { email: 'user@example.com' }
```

### 2. Exclude Sensitive Fields from Responses

```javascript
// ❌ WRONG: Returns password hash
const user = await User.findById(userId);
res.json({ user }); // Includes password, refreshToken, etc.

// ✅ CORRECT: Exclude sensitive fields
const user = await User.findById(userId).select('-password -refreshToken');
res.json({ user });

// ✅ CORRECT: Use toJSON transform
const userSchema = new mongoose.Schema({
  // ... fields
});

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.refreshToken;
    delete ret.resetOtp;
    return ret;
  }
});
```

### 3. Hash Sensitive Data

```javascript
// ✅ CORRECT: Hash password before storing
import bcrypt from 'bcrypt';

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ CORRECT: Never send original password
export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  const isMatch = await user.matchPassword(currentPassword);

  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: "Current password is incorrect"
    });
  }

  user.password = newPassword; // Will be hashed by pre-save hook
  await user.save();

  res.json({
    success: true,
    message: "Password updated successfully"
    // Don't send password back
  });
});
```

### 4. Use HTTPS

```javascript
// ✅ CORRECT: Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// ✅ CORRECT: Set secure cookies
res.cookie('token', token, {
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  httpOnly: true,
  sameSite: 'strict'
});
```

---

## 🎯 API Design Security

### 1. Use Proper HTTP Methods

```javascript
// ✅ CORRECT: RESTful HTTP methods
router.get('/users', getUsers);          // Read
router.post('/users', createUser);       // Create
router.put('/users/:id', updateUser);    // Full update
router.patch('/users/:id', patchUser);   // Partial update
router.delete('/users/:id', deleteUser); // Delete

// ❌ WRONG: GET for state-changing operations
router.get('/users/delete/:id', deleteUser); // Dangerous!
```

### 2. Implement Pagination

```javascript
// ✅ CORRECT: Paginated response
export const getHotels = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Limit max page size
  if (limit > 100) {
    return res.status(400).json({
      success: false,
      message: "Limit cannot exceed 100"
    });
  }

  const hotels = await Hotel.find()
    .limit(limit)
    .skip(skip)
    .sort('-createdAt');

  const total = await Hotel.countDocuments();

  res.json({
    success: true,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    hotels
  });
});
```

### 3. Rate Limit API Endpoints

```javascript
import rateLimit from 'express-rate-limit';

// ✅ CORRECT: Apply rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api', apiLimiter);

// Stricter limits for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

### 4. Implement CORS Properly

```javascript
import cors from 'cors';

// ✅ CORRECT: Whitelist specific origins
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// ❌ WRONG: Allow all origins
app.use(cors({ origin: '*' })); // Insecure!
```

### 5. Version Your API

```javascript
// ✅ CORRECT: API versioning
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/hotels', hotelsRoutes);

// Future version
app.use('/api/v2/users', usersRoutesV2);

// Deprecation notice
app.use('/api/v1', (req, res, next) => {
  res.setHeader('X-API-Deprecation', 'Version 1 will be deprecated on 2026-12-31');
  next();
});
```

---

## ✔️ Security Checklist

### Authentication & Authorization
- [ ] All sensitive routes protected with authentication middleware
- [ ] JWT tokens properly verified and validated
- [ ] Refresh tokens stored securely and rotated
- [ ] Password hashing with bcrypt (salt rounds ≥ 10)
- [ ] Role-based access control (RBAC) implemented
- [ ] Ownership validation for user-specific resources
- [ ] Multi-factor authentication (planned/implemented)

### Input Validation
- [ ] All user input validated (type, length, format)
- [ ] Input sanitized to prevent XSS
- [ ] NoSQL injection prevention (mongoose-sanitize)
- [ ] File upload validation (type, size, content)
- [ ] Schema validation (Joi/Zod) for complex inputs

### Error Handling
- [ ] Generic error messages (no information leakage)
- [ ] Stack traces hidden in production
- [ ] Async errors caught and handled
- [ ] Error logging (without sensitive data)
- [ ] HTTP status codes used correctly

### Data Protection
- [ ] Passwords never logged or sent in responses
- [ ] Sensitive fields excluded from API responses
- [ ] HTTPS enforced in production
- [ ] HTTP-only cookies for tokens
- [ ] Environment variables for secrets

### API Design
- [ ] RESTful HTTP methods used correctly
- [ ] Pagination implemented for list endpoints
- [ ] Rate limiting applied to all routes
- [ ] CORS configured (whitelist specific origins)
- [ ] API versioning strategy
- [ ] Request size limits enforced
- [ ] Timeouts configured

### Headers & Security
- [ ] Security headers (Helmet.js)
- [ ] Content Security Policy (CSP)
- [ ] X-Frame-Options (clickjacking protection)
- [ ] X-Content-Type-Options (MIME sniffing)
- [ ] Strict-Transport-Security (HSTS)

### Monitoring & Logging
- [ ] Security events logged (login failures, rate limit violations)
- [ ] Error monitoring (Sentry/Datadog)
- [ ] Access logs reviewed regularly
- [ ] Suspicious activity alerts configured

---

## 📚 Related Documents

- [Security Overview](./security-overview.md)
- [Authentication Flow](./authentication-flow.md)
- [Authorization & RBAC](./authorization-and-rbac.md)
- [Rate Limiting & DDoS](./rate-limiting-and-ddos.md)
- [CORS & XSS Protection](./cors-and-xss-protection.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive API security best practices documentation
