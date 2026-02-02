# Authentication Flow

> Complete authentication workflow, login process, and session management in StayHaven

---

## 📋 Table of Contents

1. [Authentication Overview](#authentication-overview)
2. [User Registration](#user-registration)
3. [Login Flow](#login-flow)
4. [Token Refresh](#token-refresh)
5. [Logout Flow](#logout-flow)
6. [Password Reset](#password-reset)
7. [Google OAuth](#google-oauth)
8. [Flow Diagrams](#flow-diagrams)

---

## 🔐 Authentication Overview

### Authentication Methods

StayHaven supports three authentication methods:

1. **Email/Password Authentication** (Primary)
2. **Google OAuth 2.0** (Social login)
3. **Staff Invitation** (Email-based onboarding)

### Token Strategy

- **Access Token**: Short-lived (1 hour), used for API requests
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens
- **Storage**: HTTP-only cookies + Authorization header support

---

## 📝 User Registration

### Standard Registration Flow

```javascript
POST /api/auth/register

Request Body:
{
  "fullname": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response (201):
{
  "success": true,
  "message": "User registered successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullname": "John Doe",
    "email": "john@example.com",
    "role": "guest"
  }
}

Set-Cookie:
- accessToken=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=3600
- refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

### Registration Implementation

```javascript
// controllers/authController.js
export const registerUser = asyncHandler(async (req, res) => {
  const { fullname, username, email, password } = req.body;

  // 1. Validate input
  if (!fullname || !username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields"
    });
  }

  // 2. Check if user exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User already exists with this email or username"
    });
  }

  // 3. Get guest role
  const guestRole = await Role.findOne({ name: 'guest' });

  // 4. Create user (password hashed by pre-save hook)
  const user = await User.create({
    fullname,
    username,
    email,
    password,
    role: guestRole._id,
    accountStatus: 'active'
  });

  // 5. Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // 6. Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  // 7. Set cookies
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000 // 1 hour
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // 8. Send response
  res.status(201).json({
    success: true,
    message: "User registered successfully",
    accessToken,
    user: {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: 'guest'
    }
  });
});
```

### Registration with OTP Verification

```javascript
// Step 1: Send OTP
POST /api/auth/sendSignupOtp
{
  "email": "john@example.com"
}

Response:
{
  "success": true,
  "message": "OTP sent to email"
}

// Step 2: Verify OTP
POST /api/auth/verifySignupOtp
{
  "email": "john@example.com",
  "otp": "123456"
}

Response:
{
  "success": true,
  "message": "OTP verified successfully",
  "verified": true
}

// Step 3: Complete Registration
POST /api/auth/register
{
  "fullname": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

---

## 🔑 Login Flow

### Email/Password Login

```javascript
POST /api/auth/login

Request Body:
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response (200):
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullname": "John Doe",
    "email": "john@example.com",
    "role": "guest",
    "profilePicture": "https://cloudinary.com/..."
  }
}
```

### Login Implementation

```javascript
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 1. Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  // 2. Find user with role populated
  const user = await User.findOne({ email }).populate('role');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  // 3. Verify password
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  // 4. Check account status
  if (user.accountStatus === 'deactivated') {
    return res.status(403).json({
      success: false,
      message: "Account has been deactivated"
    });
  }

  // 5. Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // 6. Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  // 7. Set cookies
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  // 8. Send response
  res.json({
    success: true,
    message: "Login successful",
    accessToken,
    user: {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role.name,
      profilePicture: user.profilePicture
    }
  });
});
```

### Authentication Check

```javascript
// Verify if user is authenticated
GET /api/auth/me

Headers:
Authorization: Bearer <accessToken>

Response (200):
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullname": "John Doe",
    "email": "john@example.com",
    "role": "guest",
    "company": null,
    "companyRole": null
  }
}
```

---

## 🔄 Token Refresh

### Refresh Token Flow

```javascript
POST /api/auth/refresh

Headers:
Cookie: refreshToken=<token>

OR

Request Body:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response (200):
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Token refreshed successfully"
}
```

### Refresh Implementation

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

  // 2. Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token"
    });
  }

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

  // 5. Set new access token cookie
  res.cookie('accessToken', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000
  });

  // 6. Send response
  res.json({
    success: true,
    accessToken: newAccessToken,
    message: "Token refreshed successfully"
  });
});
```

---

## 🚪 Logout Flow

### Logout Implementation

```javascript
POST /api/auth/logout

Headers:
Authorization: Bearer <accessToken>

Response (200):
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Logout Implementation

```javascript
export const logoutUser = asyncHandler(async (req, res) => {
  // req.user populated by protect middleware

  // 1. Clear refresh token from database
  await User.findByIdAndUpdate(req.user._id, {
    refreshToken: null
  });

  // 2. Clear cookies
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  // 3. Send response
  res.json({
    success: true,
    message: "Logged out successfully"
  });
});
```

---

## 🔐 Password Reset

### Password Reset Flow

#### Step 1: Request Reset

```javascript
POST /api/auth/sendResetPasswordOtp

Request Body:
{
  "email": "john@example.com"
}

Response (200):
{
  "success": true,
  "message": "OTP sent to your email"
}
```

#### Step 2: Verify OTP

```javascript
POST /api/auth/verifyResetPasswordOtp

Request Body:
{
  "email": "john@example.com",
  "otp": "123456"
}

Response (200):
{
  "success": true,
  "message": "OTP verified successfully"
}
```

#### Step 3: Reset Password

```javascript
POST /api/auth/resetPassword

Request Body:
{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePass123!"
}

Response (200):
{
  "success": true,
  "message": "Password reset successfully"
}
```

### Reset Implementation

```javascript
export const sendResetPasswordOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if user exists
    return res.json({
      success: true,
      message: "If the email exists, an OTP has been sent"
    });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Save OTP with 10-minute expiry
  user.resetOtp = otp;
  user.resetOtpExpireAt = Date.now() + 10 * 60 * 1000;
  await user.save();

  // Send email (implementation in emailService)
  await sendResetPasswordEmail(user, otp);

  res.json({
    success: true,
    message: "OTP sent to your email"
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid request"
    });
  }

  // Verify OTP
  if (user.resetOtp !== otp || user.resetOtpExpireAt < Date.now()) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired OTP"
    });
  }

  // Update password (pre-save hook will hash it)
  user.password = newPassword;
  user.resetOtp = null;
  user.resetOtpExpireAt = null;
  await user.save();

  res.json({
    success: true,
    message: "Password reset successfully"
  });
});
```

---

## 🌐 Google OAuth

### Google Login Flow

```javascript
POST /api/auth/google-login

Request Body:
{
  "googleId": "112345678901234567890",
  "email": "john@gmail.com",
  "fullname": "John Doe",
  "profilePicture": "https://lh3.googleusercontent.com/..."
}

Response (200):
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullname": "John Doe",
    "email": "john@gmail.com",
    "role": "guest",
    "isGoogleUser": true
  }
}
```

### Google OAuth Implementation

```javascript
export const googleLogin = asyncHandler(async (req, res) => {
  const { googleId, email, fullname, profilePicture } = req.body;

  // Find user by Google ID or email
  let user = await User.findOne({
    $or: [{ googleId }, { email }]
  }).populate('role');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found. Please register first."
    });
  }

  // Update Google ID if logging in with email
  if (!user.googleId) {
    user.googleId = googleId;
    user.isGoogleUser = true;
    await user.save();
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save();

  // Set cookies
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    message: "Login successful",
    accessToken,
    user: {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role.name,
      profilePicture: user.profilePicture,
      isGoogleUser: true
    }
  });
});
```

---

## 📊 Flow Diagrams

### Complete Authentication Flow

```
User Registration:
┌─────────┐
│ Client  │
└────┬────┘
     │ POST /api/auth/register
     │ { email, password, fullname }
     ↓
┌────────────┐
│  Backend   │
└─────┬──────┘
      │ 1. Validate input
      │ 2. Check existing user
      │ 3. Hash password (bcrypt)
      │ 4. Create user in DB
      │ 5. Generate access + refresh tokens
      │ 6. Set HTTP-only cookies
      ↓
┌─────────┐
│ Client  │ ← Success with tokens
└─────────┘

Login Flow:
┌─────────┐
│ Client  │
└────┬────┘
     │ POST /api/auth/login
     │ { email, password }
     ↓
┌────────────┐
│  Backend   │
└─────┬──────┘
      │ 1. Find user by email
      │ 2. Verify password (bcrypt.compare)
      │ 3. Generate tokens
      │ 4. Save refresh token
      │ 5. Set cookies
      ↓
┌─────────┐
│ Client  │ ← Success with tokens
└─────────┘

Token Refresh:
┌─────────┐
│ Client  │
└────┬────┘
     │ POST /api/auth/refresh
     │ Cookie: refreshToken
     ↓
┌────────────┐
│  Backend   │
└─────┬──────┘
      │ 1. Verify refresh token
      │ 2. Check stored token matches
      │ 3. Generate new access token
      │ 4. Set new cookie
      ↓
┌─────────┐
│ Client  │ ← New access token
└─────────┘
```

---

## 📚 Related Documents

- [Security Overview](./security-overview.md)
- [JWT Access & Refresh Tokens](./jwt-access-refresh-tokens.md)
- [Password Policy & Hashing](./password-policy-and-hashing.md)
- [Session & Cookie Management](./session-and-cookie-management.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive authentication flow documentation
