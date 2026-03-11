# JWT Access & Refresh Tokens

> Comprehensive guide to JWT token strategy, implementation, and management in StayHaven

---

## 📋 Table of Contents

1. [JWT Overview](#jwt-overview)
2. [Token Strategy](#token-strategy)
3. [Token Generation](#token-generation)
4. [Token Verification](#token-verification)
5. [Token Refresh](#token-refresh)
6. [Security Considerations](#security-considerations)

---

## 🎫 JWT Overview

### What is JWT?

**JSON Web Token (JWT)** is a compact, URL-safe token format used for securely transmitting information between parties as a JSON object.

### JWT Structure

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYxNzg5YWJjZGVmMTIzNDU2Nzg5MCIsImlhdCI6MTYzNTI0ODAwMCwiZXhwIjoxNjM1MjUxNjAwfQ.K6P8VzQQ5Y_8gH-xK6RJ3mN8tT4wE2vL9pQ7xH5mK8Y

│                Header                │               Payload               │          Signature         │
│ Base64URL({"alg":"HS256",           │ Base64URL({"id":"...",             │  HMACSHA256(              │
│  "typ":"JWT"})                      │  "iat":1635248000,                 │   base64UrlEncode(header) │
│                                     │  "exp":1635251600})                │   + "." +                 │
│                                     │                                    │   base64UrlEncode(payload),│
│                                     │                                    │   secret)                 │
```

### JWT Claims

**Standard Claims**:
- `iat` (Issued At): Timestamp when token was created
- `exp` (Expiration): Timestamp when token expires
- `iss` (Issuer): Token issuer (optional)
- `sub` (Subject): User ID (optional)

**Custom Claims** (StayHaven):
- `id`: User MongoDB ObjectId

---

## 🔐 Token Strategy

### Dual Token Approach

StayHaven implements a **dual token strategy** for security and user experience:

```
┌──────────────────────────────────────────────────────┐
│           Access Token (Short-lived)                 │
│  ├─ Expiry: 1 hour                                   │
│  ├─ Purpose: API authentication                      │
│  ├─ Storage: HTTP-only cookie + Authorization header │
│  └─ Contains: User ID                                │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│         Refresh Token (Long-lived)                   │
│  ├─ Expiry: 7 days                                   │
│  ├─ Purpose: Obtain new access tokens                │
│  ├─ Storage: HTTP-only cookie + Database             │
│  └─ Contains: User ID                                │
└──────────────────────────────────────────────────────┘
```

### Why Dual Tokens?

**Access Token** (Short-lived):
- ✅ Reduces window for token theft exploitation
- ✅ Automatic expiration limits damage if stolen
- ❌ Requires frequent renewal

**Refresh Token** (Long-lived):
- ✅ Better user experience (no frequent re-login)
- ✅ Can be revoked from database
- ✅ Stored securely in HTTP-only cookies
- ❌ Higher risk if stolen (mitigated by rotation)

---

## 🔨 Token Generation

### Implementation

**File**: `utils/tokenUtils.js`

```javascript
import jwt from 'jsonwebtoken';

/**
 * Generate JWT access token (1 hour)
 * @param {string} userId - User MongoDB ObjectId
 * @returns {string} JWT access token
 */
export const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRE || '1h' }
  );
};

/**
 * Generate JWT refresh token (7 days)
 * @param {string} userId - User MongoDB ObjectId
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};
```

### Environment Variables

```env
# JWT Secrets (must be strong and different)
JWT_ACCESS_SECRET=your_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars

# Token Expiry
JWT_ACCESS_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d
```

### Generate Strong Secrets

```bash
# Generate 64-character hex string
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Token Payload

```javascript
// Access Token Decoded:
{
  "id": "507f1f77bcf86cd799439011",      // User ID
  "iat": 1706835600,                      // Issued At (Unix timestamp)
  "exp": 1706839200                       // Expiration (Unix timestamp)
}

// Refresh Token Decoded:
{
  "id": "507f1f77bcf86cd799439011",
  "iat": 1706835600,
  "exp": 1707440400                       // 7 days later
}
```

### Usage in Controllers

```javascript
import { generateAccessToken, generateRefreshToken } from '../utils/tokenUtils.js';

export const loginUser = asyncHandler(async (req, res) => {
  // ... authentication logic ...

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token to database
  user.refreshToken = refreshToken;
  await user.save();

  // Set HTTP-only cookies
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000 // 1 hour in milliseconds
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  });

  // Send response with token in body (for mobile apps)
  res.json({
    success: true,
    accessToken,
    refreshToken,
    user: { /* user data */ }
  });
});
```

---

## ✅ Token Verification

### Access Token Verification

**File**: `middleware/authMiddleware.js`

```javascript
import jwt from 'jsonwebtoken';
import { User } from '../models/user.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

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
    // 3. Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // 4. Find user
    req.user = await User.findById(decoded.id)
      .select('-password')
      .populate('role');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    next();
  } catch (error) {
    // Handle JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }
});
```

### Token Sources Priority

```javascript
// 1. Authorization header (preferred for API clients)
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// 2. HTTP-only cookie (fallback for web browsers)
Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Protected Route Usage

```javascript
import { protect } from '../middleware/authMiddleware.js';

// Protected route - requires valid access token
router.get('/me', protect, getCurrentUser);
router.post('/orders', protect, createOrder);
router.get('/bookings', protect, getMyBookings);
```

---

## 🔄 Token Refresh

### Refresh Flow

```
┌─────────┐
│ Client  │
└────┬────┘
     │ 1. Access token expired (401)
     │
     │ 2. POST /api/auth/refresh
     │    Cookie: refreshToken=<token>
     ↓
┌────────────┐
│  Backend   │
└─────┬──────┘
      │ 3. Verify refresh token
      │ 4. Check stored token matches
      │ 5. Generate new access token
      │ 6. Set new cookie
      ↓
┌─────────┐
│ Client  │ ← 7. New access token
└─────────┘
     │ 8. Retry original request
     ↓
```

### Refresh Token Implementation

```javascript
export const refreshAccessToken = asyncHandler(async (req, res) => {
  // 1. Get refresh token from cookie or body
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token not provided"
    });
  }

  try {
    // 2. Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // 3. Find user and verify stored refresh token
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token"
      });
    }

    // 4. Generate new access token
    const newAccessToken = generateAccessToken(user._id);

    // 5. Optionally rotate refresh token (recommended)
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    await user.save();

    // 6. Set new cookies
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // 7. Send response
    res.json({
      success: true,
      accessToken: newAccessToken,
      message: "Token refreshed successfully"
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token"
    });
  }
});
```

### Client-Side Token Refresh

```javascript
// axios interceptor for automatic token refresh
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh token
        await axios.post('/api/auth/refresh');
        
        // Retry original request
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 🔒 Security Considerations

### 1. Token Storage

**✅ Secure (HTTP-only cookies)**:
```javascript
res.cookie('accessToken', token, {
  httpOnly: true,        // Not accessible via JavaScript
  secure: true,          // HTTPS only
  sameSite: 'strict',    // CSRF protection
  maxAge: 3600000        // 1 hour
});
```

**❌ Insecure (localStorage)**:
```javascript
// NEVER store tokens in localStorage
localStorage.setItem('token', token); // Vulnerable to XSS
```

### 2. Token Secrets

```javascript
// ✅ Strong secrets (64+ characters)
JWT_ACCESS_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

// ❌ Weak secrets
JWT_ACCESS_SECRET=secret123
```

### 3. Token Expiration

```javascript
// ✅ Short-lived access tokens
expiresIn: '1h'  // 1 hour

// ❌ Long-lived access tokens
expiresIn: '30d' // Too long, increases risk
```

### 4. Token Rotation

```javascript
// ✅ Rotate refresh tokens on use
const newRefreshToken = generateRefreshToken(user._id);
user.refreshToken = newRefreshToken;
await user.save();

// ❌ Reuse same refresh token
// Allows stolen tokens to persist
```

### 5. Token Revocation

```javascript
// Logout: Clear refresh token from database
export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    refreshToken: null
  });

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.json({
    success: true,
    message: "Logged out successfully"
  });
});
```

### 6. JWT Vulnerabilities

**None Algorithm Attack**:
```javascript
// ✅ Explicitly specify algorithm
jwt.verify(token, secret, { algorithms: ['HS256'] });

// ❌ Allow any algorithm
jwt.verify(token, secret); // Vulnerable if "alg": "none"
```

**Token Confusion**:
```javascript
// ✅ Use different secrets for access and refresh
JWT_ACCESS_SECRET=<different_secret_1>
JWT_REFRESH_SECRET=<different_secret_2>

// ❌ Same secret for both
JWT_SECRET=<same_secret>
```

---

## 📚 Related Documents

- [Security Overview](./security-overview.md)
- [Authentication Flow](./authentication-flow.md)
- [Session & Cookie Management](./session-and-cookie-management.md)
- [API Security Best Practices](./api-security-best-practices.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive JWT token strategy documentation
