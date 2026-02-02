# Authentication Architecture

> JWT-based authentication system with access and refresh tokens

---

## 📋 Table of Contents

1. [Authentication Overview](#authentication-overview)
2. [JWT Token Strategy](#jwt-token-strategy)
3. [Authentication Flow](#authentication-flow)
4. [Session Management](#session-management)
5. [Security Measures](#security-measures)

---

## 🔐 Authentication Overview

### Authentication Methods

```javascript
const AUTHENTICATION_METHODS = {
  // Primary method
  jwt: {
    type: 'JWT (JSON Web Token)',
    tokens: ['Access Token (1 hour)', 'Refresh Token (7 days)'],
    storage: ['HTTP-only cookies', 'localStorage (fallback)']
  },
  
  // OAuth integration
  google: {
    type: 'Google OAuth 2.0',
    flow: 'Authorization Code Flow',
    library: 'Passport.js (planned)'
  },
  
  // Password authentication
  local: {
    type: 'Email + Password',
    hashing: 'bcrypt (10 salt rounds)',
    validation: 'Minimum 6 characters'
  }
};
```

### Authentication Architecture

```
┌──────────────────────────────────────────────────┐
│                   CLIENT                         │
│                                                  │
│  Login Form → API Call → Store Tokens           │
│                                                  │
│  ┌────────────┐  ┌────────────┐                │
│  │ Access     │  │  Refresh   │                │
│  │ Token      │  │  Token     │                │
│  │ (Cookie)   │  │  (Cookie)  │                │
│  └────────────┘  └────────────┘                │
└──────────────┬───────────────────────────────────┘
               │
               │ HTTP Request + Cookies
               │
┌──────────────▼───────────────────────────────────┐
│                  MIDDLEWARE                      │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │        protect Middleware                 │  │
│  │                                           │  │
│  │  1. Extract access token from cookie     │  │
│  │  2. Verify token with JWT secret         │  │
│  │  3. Check token expiration               │  │
│  │  4. Load user from database              │  │
│  │  5. Attach user to req.user              │  │
│  └───────────────────────────────────────────┘  │
└──────────────┬───────────────────────────────────┘
               │
               │ req.user populated
               │
┌──────────────▼───────────────────────────────────┐
│                  CONTROLLER                      │
│                                                  │
│  Access user data: req.user.id, req.user.role   │
└──────────────────────────────────────────────────┘
```

---

## 🎫 JWT Token Strategy

### Dual Token System

```javascript
// Access Token (Short-lived)
const accessToken = {
  purpose: 'API authentication',
  expiration: '1 hour',
  storage: 'HTTP-only cookie',
  payload: {
    id: 'user_id',
    role: 'user_role'
  },
  secret: process.env.JWT_ACCESS_SECRET
};

// Refresh Token (Long-lived)
const refreshToken = {
  purpose: 'Token renewal',
  expiration: '7 days',
  storage: 'HTTP-only cookie + Database',
  payload: {
    id: 'user_id'
  },
  secret: process.env.JWT_REFRESH_SECRET
};
```

### Token Generation

```javascript
// utils/tokenUtils.js
const jwt = require('jsonwebtoken');

// Generate access token
const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

// Verify access token
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
```

### Token Payload Structure

```javascript
// Access Token Payload
{
  "id": "507f1f77bcf86cd799439011",
  "iat": 1675339200,    // Issued at
  "exp": 1675342800     // Expires at (1 hour later)
}

// Refresh Token Payload
{
  "id": "507f1f77bcf86cd799439011",
  "iat": 1675339200,    // Issued at
  "exp": 1675944000     // Expires at (7 days later)
}

// Token stored in user document
userSchema = {
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "john@example.com",
  refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
};
```

---

## 🔄 Authentication Flow

### Registration Flow

```
1. USER REGISTRATION
   ↓
   POST /api/auth/register
   Body: {
     fullname: "John Doe",
     email: "john@example.com",
     password: "password123"
   }
   ↓
   
2. VALIDATION
   ↓
   - Check if email exists
   - Validate password strength
   - Validate required fields
   ↓
   
3. PASSWORD HASHING
   ↓
   userSchema.pre('save', async function() {
     if (this.isModified('password')) {
       this.password = await bcrypt.hash(this.password, 10);
     }
   })
   ↓
   
4. CREATE USER
   ↓
   const user = await User.create({
     fullname,
     email,
     password // Already hashed by pre-save hook
   });
   ↓
   
5. GENERATE TOKENS
   ↓
   const accessToken = generateAccessToken(user._id);
   const refreshToken = generateRefreshToken(user._id);
   ↓
   
6. SAVE REFRESH TOKEN
   ↓
   user.refreshToken = refreshToken;
   await user.save();
   ↓
   
7. SET COOKIES
   ↓
   res.cookie('accessToken', accessToken, {
     httpOnly: true,
     secure: true,
     sameSite: 'strict',
     maxAge: 3600000 // 1 hour
   });
   
   res.cookie('refreshToken', refreshToken, {
     httpOnly: true,
     secure: true,
     sameSite: 'strict',
     maxAge: 604800000 // 7 days
   });
   ↓
   
8. RESPONSE
   ↓
   res.status(201).json({
     success: true,
     message: 'Registration successful',
     user: {
       id: user._id,
       fullname: user.fullname,
       email: user.email
     }
   });
```

### Login Flow

```
1. USER LOGIN
   ↓
   POST /api/auth/login
   Body: {
     email: "john@example.com",
     password: "password123"
   }
   ↓
   
2. FIND USER
   ↓
   const user = await User.findOne({ email });
   if (!user) {
     return res.status(401).json({
       message: 'Invalid credentials'
     });
   }
   ↓
   
3. VERIFY PASSWORD
   ↓
   const isMatch = await user.matchPassword(password);
   if (!isMatch) {
     return res.status(401).json({
       message: 'Invalid credentials'
     });
   }
   ↓
   
4. GENERATE TOKENS
   ↓
   const accessToken = generateAccessToken(user._id);
   const refreshToken = generateRefreshToken(user._id);
   ↓
   
5. UPDATE REFRESH TOKEN
   ↓
   user.refreshToken = refreshToken;
   await user.save();
   ↓
   
6. SET COOKIES
   ↓
   res.cookie('accessToken', accessToken, { ... });
   res.cookie('refreshToken', refreshToken, { ... });
   ↓
   
7. RESPONSE
   ↓
   res.status(200).json({
     success: true,
     message: 'Login successful',
     user: { ... }
   });
```

### Token Refresh Flow

```
1. ACCESS TOKEN EXPIRED
   ↓
   Frontend receives 401 Unauthorized
   ↓
   
2. REFRESH TOKEN REQUEST
   ↓
   POST /api/auth/refresh
   Cookie: refreshToken=eyJhbGciOi...
   ↓
   
3. VERIFY REFRESH TOKEN
   ↓
   const decoded = verifyRefreshToken(refreshToken);
   ↓
   
4. VALIDATE USER & TOKEN
   ↓
   const user = await User.findById(decoded.id);
   if (!user || user.refreshToken !== refreshToken) {
     return res.status(401).json({
       message: 'Invalid refresh token'
     });
   }
   ↓
   
5. GENERATE NEW ACCESS TOKEN
   ↓
   const newAccessToken = generateAccessToken(user._id);
   ↓
   
6. SET NEW COOKIE
   ↓
   res.cookie('accessToken', newAccessToken, { ... });
   ↓
   
7. RESPONSE
   ↓
   res.status(200).json({
     success: true,
     accessToken: newAccessToken
   });
   ↓
   
8. RETRY ORIGINAL REQUEST
   ↓
   Frontend retries failed request with new access token
```

### Logout Flow

```
1. USER LOGOUT
   ↓
   POST /api/auth/logout
   ↓
   
2. CLEAR REFRESH TOKEN
   ↓
   user.refreshToken = null;
   await user.save();
   ↓
   
3. CLEAR COOKIES
   ↓
   res.clearCookie('accessToken');
   res.clearCookie('refreshToken');
   ↓
   
4. RESPONSE
   ↓
   res.status(200).json({
     success: true,
     message: 'Logout successful'
   });
   ↓
   
5. FRONTEND CLEANUP
   ↓
   - Clear user state
   - Clear localStorage
   - Redirect to login
```

---

## 🛡️ Session Management

### Cookie Configuration

```javascript
// Set authentication cookies
const setAuthCookies = (res, accessToken, refreshToken) => {
  // Access token cookie
  res.cookie('accessToken', accessToken, {
    httpOnly: true,        // Cannot be accessed by JavaScript
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',    // CSRF protection
    maxAge: 60 * 60 * 1000 // 1 hour
  });
  
  // Refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

// Clear cookies on logout
const clearAuthCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};
```

### Multi-Device Sessions

```javascript
// Support multiple devices (future enhancement)
const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  deviceInfo: {
    userAgent: String,
    ipAddress: String,
    deviceType: String // mobile, tablet, desktop
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Get user's active sessions
const getUserSessions = async (userId) => {
  return await Session.find({
    user: userId,
    expiresAt: { $gt: Date.now() }
  }).sort({ createdAt: -1 });
};

// Revoke specific session
const revokeSession = async (sessionId) => {
  await Session.findByIdAndDelete(sessionId);
};

// Revoke all sessions (logout from all devices)
const revokeAllSessions = async (userId) => {
  await Session.deleteMany({ user: userId });
};
```

---

## 🔒 Security Measures

### Protection Middleware

```javascript
// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.schema');

// Protect routes (authentication required)
const protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from cookie
    if (req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    
    // Get token from Authorization header (fallback)
    if (!token && req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Get user from token
    req.user = await User.findById(decoded.id).select('-password -refreshToken');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};

// Authorize by role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    if (!roles.includes(req.user.companyRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

module.exports = { protect, authorize };
```

### Password Security

```javascript
// User schema with password hashing
const userSchema = new mongoose.Schema({
  password: {
    type: String,
    required: function() {
      return !this.isGoogleUser; // Required for non-Google users
    },
    minlength: [6, 'Password must be at least 6 characters']
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
```

### Token Rotation

```javascript
// Rotate refresh token on use (enhanced security)
const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.cookies;
  
  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'No refresh token'
    });
  }
  
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Validate user and token
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    // Generate new tokens (rotation)
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    
    // Update refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save();
    
    // Set new cookies
    setAuthCookies(res, newAccessToken, newRefreshToken);
    
    res.json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
};
```

### Account Security

```javascript
// Account lockout after failed attempts
userSchema.add({
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  }
});

userSchema.methods.incLoginAttempts = async function() {
  // Lock account after 5 failed attempts
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    this.lockUntil = Date.now() + (2 * 60 * 60 * 1000); // 2 hours
  }
  
  this.loginAttempts += 1;
  await this.save();
};

userSchema.methods.resetLoginAttempts = async function() {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save();
};

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});
```

---

## 📚 Related Documents

- [System Architecture Overview](./system-architecture-overview.md)
- [Frontend-Backend Architecture](./frontend-backend-architecture.md)
- [Security Overview](../05-security/security-overview.md)
- [JWT Access Refresh Tokens](../05-security/jwt-access-refresh-tokens.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive authentication architecture
