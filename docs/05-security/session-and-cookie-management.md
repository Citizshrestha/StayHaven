# Session & Cookie Management

> HTTP cookie configuration, session handling, and secure token storage strategies in StayHaven

---

## 📋 Table of Contents

1. [Cookie Overview](#cookie-overview)
2. [Cookie Configuration](#cookie-configuration)
3. [Session Management](#session-management)
4. [Multi-Device Sessions](#multi-device-sessions)
5. [Security Best Practices](#security-best-practices)

---

## 🍪 Cookie Overview

### What are HTTP Cookies?

**HTTP cookies** are small pieces of data stored by the browser and sent with every HTTP request to the server.

### Cookie Types

```javascript
// Session Cookie (expires when browser closes)
res.cookie('sessionId', '123', { httpOnly: true });

// Persistent Cookie (expires at specific date)
res.cookie('token', 'abc', {
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

// Secure Cookie (HTTPS only)
res.cookie('token', 'abc', {
  httpOnly: true,
  secure: true // Only sent over HTTPS
});
```

### StayHaven Cookie Strategy

```
┌──────────────────────────────────────────────────┐
│         StayHaven Cookie Strategy                │
├──────────────────────────────────────────────────┤
│                                                  │
│  accessToken Cookie                              │
│  ├─ Type: Persistent                             │
│  ├─ Expiry: 1 hour                               │
│  ├─ HttpOnly: Yes (not accessible via JS)        │
│  ├─ Secure: Yes (HTTPS only in production)       │
│  ├─ SameSite: Strict (CSRF protection)           │
│  └─ Purpose: API authentication                  │
│                                                  │
│  refreshToken Cookie                             │
│  ├─ Type: Persistent                             │
│  ├─ Expiry: 7 days                               │
│  ├─ HttpOnly: Yes                                │
│  ├─ Secure: Yes                                  │
│  ├─ SameSite: Strict                             │
│  └─ Purpose: Token refresh                       │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## ⚙️ Cookie Configuration

### Cookie Attributes

**File**: `controllers/authController.js`

```javascript
/**
 * Set secure cookies for authentication tokens
 * @param {Response} res - Express response object
 * @param {string} accessToken - JWT access token
 * @param {string} refreshToken - JWT refresh token
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
  // Cookie options
  const cookieOptions = {
    httpOnly: true,                          // Not accessible via JavaScript
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',                      // CSRF protection
    path: '/'                                // Available on all routes
  };

  // Set access token cookie (1 hour)
  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 1000 // 1 hour in milliseconds
  });

  // Set refresh token cookie (7 days)
  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  });
};
```

### Cookie Attribute Explanation

#### 1. httpOnly

```javascript
// ✅ HttpOnly: true (Secure)
res.cookie('token', 'abc', { httpOnly: true });
// Cookie NOT accessible via document.cookie
// Protects against XSS attacks

// ❌ HttpOnly: false (Vulnerable)
res.cookie('token', 'abc', { httpOnly: false });
// Cookie accessible via JavaScript:
console.log(document.cookie); // "token=abc"
// Vulnerable to XSS: <script>sendToAttacker(document.cookie)</script>
```

#### 2. secure

```javascript
// ✅ Secure: true (Production)
res.cookie('token', 'abc', { secure: true });
// Cookie only sent over HTTPS
// Protects against man-in-the-middle attacks

// ⚠️ Secure: false (Development only)
res.cookie('token', 'abc', { secure: false });
// Cookie sent over HTTP (localhost development)
// Should NEVER be used in production
```

#### 3. sameSite

```javascript
// ✅ SameSite: 'strict' (Strongest CSRF protection)
res.cookie('token', 'abc', { sameSite: 'strict' });
// Cookie only sent with same-site requests
// Not sent with cross-site requests (even legitimate ones)

// ⚠️ SameSite: 'lax' (Balanced)
res.cookie('token', 'abc', { sameSite: 'lax' });
// Cookie sent with top-level navigation (GET)
// Not sent with cross-site POST requests

// ❌ SameSite: 'none' (Vulnerable)
res.cookie('token', 'abc', { sameSite: 'none', secure: true });
// Cookie sent with all cross-site requests
// Requires 'secure: true'
// Vulnerable to CSRF attacks
```

#### 4. maxAge

```javascript
// Persistent cookie (expires after duration)
res.cookie('token', 'abc', { maxAge: 3600000 }); // 1 hour

// Session cookie (expires when browser closes)
res.cookie('sessionId', '123'); // No maxAge
```

#### 5. path

```javascript
// Cookie available on all routes
res.cookie('token', 'abc', { path: '/' });

// Cookie only available on /api routes
res.cookie('token', 'abc', { path: '/api' });
```

#### 6. domain

```javascript
// Cookie available on all subdomains
res.cookie('token', 'abc', { domain: '.example.com' });
// Works on: example.com, api.example.com, www.example.com

// Cookie only on specific subdomain
res.cookie('token', 'abc', { domain: 'api.example.com' });
// Works only on: api.example.com
```

---

## 🔐 Session Management

### Session Creation (Login)

```javascript
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Authenticate user
  const user = await User.findOne({ email }).populate('role');
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

  // Save refresh token to database
  user.refreshToken = refreshToken;
  await user.save();

  // Set cookies
  setAuthCookies(res, accessToken, refreshToken);

  res.json({
    success: true,
    message: "Login successful",
    accessToken,
    user: {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role.name
    }
  });
});
```

### Session Validation (Protected Routes)

```javascript
import { protect } from '../middleware/authMiddleware.js';

// Middleware validates session on every request
router.get('/profile', protect, getProfile);
router.post('/orders', protect, createOrder);

// protect middleware:
// 1. Extracts accessToken from cookie or Authorization header
// 2. Verifies JWT signature
// 3. Loads user from database
// 4. Attaches user to req.user
```

### Session Refresh

```javascript
export const refreshAccessToken = asyncHandler(async (req, res) => {
  // Get refresh token from cookie
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token not provided"
    });
  }

  // Verify refresh token
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

  // Find user and verify stored token
  const user = await User.findById(decoded.id);

  if (!user || user.refreshToken !== refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token"
    });
  }

  // Generate new access token
  const newAccessToken = generateAccessToken(user._id);

  // Set new cookie
  res.cookie('accessToken', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000
  });

  res.json({
    success: true,
    accessToken: newAccessToken
  });
});
```

### Session Termination (Logout)

```javascript
export const logoutUser = asyncHandler(async (req, res) => {
  // Clear refresh token from database
  await User.findByIdAndUpdate(req.user._id, {
    refreshToken: null
  });

  // Clear cookies
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });

  res.json({
    success: true,
    message: "Logged out successfully"
  });
});
```

---

## 📱 Multi-Device Sessions

### Current Implementation

```javascript
// Single session per user
const userSchema = new mongoose.Schema({
  refreshToken: String // Only one refresh token stored
});

// Logging in on new device invalidates old session
user.refreshToken = newRefreshToken;
await user.save();
```

### Planned: Multi-Device Support

```javascript
// Multiple sessions per user
const userSchema = new mongoose.Schema({
  sessions: [{
    refreshToken: String,
    deviceInfo: {
      userAgent: String,
      ip: String,
      deviceType: String // mobile, desktop, tablet
    },
    createdAt: Date,
    lastUsed: Date
  }]
});

// Login creates new session without invalidating others
export const loginUser = asyncHandler(async (req, res) => {
  // ... authentication ...

  const session = {
    refreshToken,
    deviceInfo: {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      deviceType: detectDeviceType(req.headers['user-agent'])
    },
    createdAt: Date.now(),
    lastUsed: Date.now()
  };

  user.sessions.push(session);
  await user.save();

  // ...
});

// Refresh updates lastUsed timestamp
export const refreshAccessToken = asyncHandler(async (req, res) => {
  // ... verify token ...

  const sessionIndex = user.sessions.findIndex(
    s => s.refreshToken === refreshToken
  );

  if (sessionIndex === -1) {
    return res.status(401).json({
      success: false,
      message: "Invalid session"
    });
  }

  user.sessions[sessionIndex].lastUsed = Date.now();
  await user.save();

  // ...
});

// Logout specific session
export const logoutDevice = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { sessions: { refreshToken } }
  });

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.json({
    success: true,
    message: "Device logged out successfully"
  });
});

// Logout all devices
export const logoutAllDevices = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    sessions: []
  });

  res.json({
    success: true,
    message: "Logged out from all devices"
  });
});
```

---

## 🔒 Security Best Practices

### 1. Always Use httpOnly

```javascript
// ✅ CORRECT: HttpOnly prevents XSS
res.cookie('token', token, { httpOnly: true });

// ❌ WRONG: Vulnerable to XSS
res.cookie('token', token, { httpOnly: false });
localStorage.setItem('token', token);
```

### 2. Use secure in Production

```javascript
// ✅ CORRECT: Environment-based
res.cookie('token', token, {
  secure: process.env.NODE_ENV === 'production'
});

// ❌ WRONG: Always secure (breaks localhost)
res.cookie('token', token, { secure: true });
```

### 3. Use sameSite for CSRF Protection

```javascript
// ✅ CORRECT: Strict CSRF protection
res.cookie('token', token, { sameSite: 'strict' });

// ⚠️ ACCEPTABLE: Lax for flexibility
res.cookie('token', token, { sameSite: 'lax' });

// ❌ WRONG: No CSRF protection
res.cookie('token', token, { sameSite: 'none' });
```

### 4. Set Appropriate Expiration

```javascript
// ✅ CORRECT: Short-lived access token
res.cookie('accessToken', token, {
  maxAge: 60 * 60 * 1000 // 1 hour
});

// ❌ WRONG: Long-lived access token
res.cookie('accessToken', token, {
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days (too long!)
});
```

### 5. Clear Cookies on Logout

```javascript
// ✅ CORRECT: Clear with same options
res.clearCookie('token', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/'
});

// ❌ WRONG: Clear without options (may not work)
res.clearCookie('token');
```

### 6. Validate Cookie Options

```javascript
// ✅ CORRECT: Consistent options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/'
};

res.cookie('accessToken', accessToken, {
  ...cookieOptions,
  maxAge: 3600000
});

res.cookie('refreshToken', refreshToken, {
  ...cookieOptions,
  maxAge: 604800000
});
```

### 7. Handle Cookie Consent (GDPR)

```javascript
// Cookie consent flag
const userSchema = new mongoose.Schema({
  cookieConsent: {
    accepted: { type: Boolean, default: false },
    acceptedAt: Date
  }
});

// Only set non-essential cookies if consent given
export const setCookies = (req, res, tokens) => {
  // Essential cookies (always allowed)
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600000
  });

  // Non-essential cookies (require consent)
  if (req.user.cookieConsent.accepted) {
    res.cookie('preferences', JSON.stringify(preferences), {
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
  }
};
```

---

## 📚 Related Documents

- [Security Overview](./security-overview.md)
- [Authentication Flow](./authentication-flow.md)
- [JWT Access & Refresh Tokens](./jwt-access-refresh-tokens.md)
- [CORS & XSS Protection](./cors-and-xss-protection.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive session and cookie management documentation
