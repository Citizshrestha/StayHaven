# Authentication APIs

> Comprehensive documentation for all authentication and authorization endpoints in the StayHaven platform

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [Guest Authentication APIs](#guest-authentication-apis)
4. [Staff Authentication APIs](#staff-authentication-apis)
5. [Token Management](#token-management)
6. [OAuth Integration](#oauth-integration)
7. [Password Management](#password-management)
8. [Security Considerations](#security-considerations)
9. [Error Handling](#error-handling)

---

## 🔐 Overview

### Base URL

```
Production: https://api.stayhaven.com
Development: http://localhost:5000
```

### Authentication Methods

1. **JWT Token Authentication** (Primary)
   - Access Token: 1 hour expiry
   - Refresh Token: 7 days expiry
   - Bearer token in Authorization header

2. **Google OAuth 2.0** (Alternative)
   - One-click login
   - Google credential verification
   - Automatic account creation

### Token Types

| Token Type | Purpose | Expiry | Storage |
|-----------|---------|--------|---------|
| Access Token | API authentication | 1 hour | Memory/localStorage |
| Refresh Token | Renew access token | 7 days | HttpOnly cookie |
| Reset Token | Password reset | 1 hour | Email link |
| Verification Token | Email verification | 24 hours | Email link |
| Invite Token | Staff invitation | 7 days | Email link |

---

## 🔄 Authentication Flow

### JWT Authentication Flow

```
┌─────────┐                                    ┌─────────┐
│         │  1. POST /api/auth/register        │         │
│         │  or POST /api/auth/login           │         │
│  Client │──────────────────────────────────>│  Server │
│         │                                    │         │
│         │  2. { accessToken, refreshToken }  │         │
│         │<──────────────────────────────────│         │
└─────────┘                                    └─────────┘
     │                                              │
     │  3. Store accessToken in memory              │
     │     Store refreshToken in httpOnly cookie    │
     │                                              │
     │  4. API Request with Bearer token            │
     │──────────────────────────────────────────>  │
     │     Authorization: Bearer <accessToken>      │
     │                                              │
     │  5a. If token valid: Return data            │
     │<──────────────────────────────────────────  │
     │                                              │
     │  5b. If token expired (401)                  │
     │<──────────────────────────────────────────  │
     │                                              │
     │  6. POST /api/auth/refresh-token             │
     │──────────────────────────────────────────>  │
     │     (refreshToken from cookie)               │
     │                                              │
     │  7. New { accessToken }                      │
     │<──────────────────────────────────────────  │
     │                                              │
     │  8. Retry API request with new token         │
     │──────────────────────────────────────────>  │
```

### Google OAuth Flow

```
┌─────────┐              ┌─────────┐              ┌─────────┐
│         │              │         │              │         │
│  Client │              │  Google │              │  Server │
│         │              │         │              │         │
└────┬────┘              └────┬────┘              └────┬────┘
     │                        │                        │
     │ 1. Click Google Login  │                        │
     │───────────────────────>│                        │
     │                        │                        │
     │ 2. Google Auth Popup   │                        │
     │<───────────────────────│                        │
     │                        │                        │
     │ 3. User authenticates  │                        │
     │───────────────────────>│                        │
     │                        │                        │
     │ 4. Google Credential   │                        │
     │<───────────────────────│                        │
     │                        │                        │
     │ 5. POST /api/auth/google-login                  │
     │        { credential }                           │
     │────────────────────────────────────────────────>│
     │                        │                        │
     │                        │ 6. Verify credential   │
     │                        │<───────────────────────│
     │                        │                        │
     │                        │ 7. Valid/Invalid       │
     │                        │───────────────────────>│
     │                        │                        │
     │ 8. { accessToken, user }                        │
     │<────────────────────────────────────────────────│
```

---

## 👥 Guest Authentication APIs

### 1. Check User Exists

Check if an email is already registered in the system.

**Endpoint**: `GET /api/auth/check`

**Authentication**: None (Public)

**Query Parameters**:

```typescript
{
  email: string  // Email to check
}
```

**Request Example**:

```bash
curl -X GET "http://localhost:5000/api/auth/check?email=john@example.com" \
  -H "Content-Type: application/json"
```

**Response - User Exists**:

```json
{
  "success": true,
  "exists": true
}
```

**Response - User Not Found**:

```json
{
  "success": true,
  "exists": false
}
```

**Error Response - Missing Email**:

```json
{
  "success": false,
  "message": "Email is required"
}
```

**Use Cases**:

- Registration form validation
- Pre-filling login form
- Checking duplicate email before submission

**Implementation Notes**:

```javascript
// Backend: controllers/authController.js
export const checkUserExists = asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }
  const user = await User.findOne({ email });
  res.json({
    success: true,
    exists: !!user,
  });
});
```

---

### 2. Register Guest

Create a new guest account.

**Endpoint**: `POST /api/auth/register`

**Authentication**: None (Public)

**Request Headers**:

```
Content-Type: application/json
```

**Request Body**:

```typescript
{
  username: string,      // Min 3 chars, max 30 chars
  email: string,         // Valid email format
  password: string,      // Min 8 chars, 1 uppercase, 1 lowercase, 1 number
  confirmPassword: string, // Must match password
  phone?: string,        // Optional: E.164 format
  dateOfBirth?: Date,    // Optional: YYYY-MM-DD
  address?: {
    street?: string,
    city?: string,
    state?: string,
    country?: string,
    zipCode?: string
  }
}
```

**Request Example**:

```bash
curl -X POST "http://localhost:5000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123",
    "phone": "+1234567890",
    "dateOfBirth": "1990-01-15"
  }'
```

**Response - Success (201 Created)**:

```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "guest",
    "isVerified": false,
    "createdAt": "2026-02-02T10:30:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // Set in cookie
}
```

**Error Response - Email Already Exists (400)**:

```json
{
  "success": false,
  "message": "Email is already registered. Please login instead."
}
```

**Error Response - Password Mismatch (400)**:

```json
{
  "success": false,
  "message": "Passwords do not match"
}
```

**Error Response - Weak Password (400)**:

```json
{
  "success": false,
  "message": "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number."
}
```

**Error Response - Invalid Email (400)**:

```json
{
  "success": false,
  "message": "Please provide a valid email address"
}
```

**Error Response - Server Error (500)**:

```json
{
  "success": false,
  "message": "Registration failed. Please try again later."
}
```

**Validation Rules**:

| Field | Rule | Error Message |
|-------|------|---------------|
| username | Required, 3-30 chars | "Username is required" |
| email | Required, valid email | "Valid email is required" |
| password | Required, min 8 chars, 1 upper, 1 lower, 1 number | "Password must be..." |
| confirmPassword | Must match password | "Passwords do not match" |
| phone | Optional, E.164 format | "Invalid phone number format" |

**Side Effects**:

1. User created in database
2. Password hashed with bcrypt (10 rounds)
3. Default role assigned: "guest"
4. Verification email sent
5. Access token generated (1 hour)
6. Refresh token generated (7 days, httpOnly cookie)

**Email Sent**:

```
Subject: Welcome to StayHaven - Verify Your Email

Hi johndoe,

Welcome to StayHaven! Please verify your email address by clicking the link below:

[Verify Email] (expires in 24 hours)

If you didn't create this account, please ignore this email.

Best regards,
StayHaven Team
```

---

### 3. Login Guest

Authenticate existing guest user.

**Endpoint**: `POST /api/auth/login`

**Authentication**: None (Public)

**Request Headers**:

```
Content-Type: application/json
```

**Request Body**:

```typescript
{
  email: string,     // Registered email
  password: string   // User password
}
```

**Request Example**:

```bash
curl -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1YTEyMzQ1Njc4OWFiY2RlZjAxMjM0NSIsImlhdCI6MTcwNzIxNjAwMCwiZXhwIjoxNzA3MjE5NjAwfQ.signature",
  "_id": "65a12345678abcdef012345",
  "username": "johndoe",
  "email": "john@example.com",
  "role": "guest",
  "profilePicture": "https://res.cloudinary.com/.../profile.jpg"
}
```

**Cookie Set**:

```
Set-Cookie: refreshToken=eyJhbGc...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/
```

**Error Response - Email Not Registered (400)**:

```json
{
  "success": false,
  "message": "Email is not registered. Please register first."
}
```

**Error Response - Invalid Credentials (401)**:

```json
{
  "success": false,
  "message": "Invalid credentials. Please try again."
}
```

**Error Response - Account Deactivated (403)**:

```json
{
  "success": false,
  "message": "Your account has been deactivated. Please contact support."
}
```

**Token Details**:

**Access Token Payload**:

```json
{
  "id": "65a12345678abcdef012345",
  "iat": 1707216000,
  "exp": 1707219600
}
```

**Refresh Token Payload**:

```json
{
  "id": "65a12345678abcdef012345",
  "iat": 1707216000,
  "exp": 1707820800
}
```

**Security Features**:

- Password comparison using bcrypt
- Failed login attempts tracked
- Rate limiting: 5 attempts per 15 minutes
- Refresh token stored in httpOnly cookie (XSS protection)
- Access token sent in response body

**Implementation Notes**:

```javascript
// Backend: controllers/authController.js
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).populate('role');

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Email is not registered. Please register first.",
    });
  }

  if (!(await user.matchPassword(password))) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials. Please try again.",
    });
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.status(200).json({
    success: true,
    message: "Login successful",
    accessToken,
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role?.name || 'guest',
    profilePicture: user.profilePicture,
  });
});
```

---

### 4. Google OAuth Login

Authenticate using Google account.

**Endpoint**: `POST /api/auth/google-login`

**Authentication**: None (Public)

**Request Headers**:

```
Content-Type: application/json
```

**Request Body**:

```typescript
{
  credential: string  // Google ID token from Google Sign-In
}
```

**Request Example**:

```bash
curl -X POST "http://localhost:5000/api/auth/google-login" \
  -H "Content-Type: application/json" \
  -d '{
    "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjY4ZDk1MmU3MTQ2YjM4ZWNmNjVlZjc4YzMyMjY5MzM2ZTgyOWE4MjQiLCJ0eXAiOiJKV1QifQ..."
  }'
```

**Google Credential Structure** (Decoded):

```json
{
  "iss": "https://accounts.google.com",
  "azp": "123456789.apps.googleusercontent.com",
  "aud": "123456789.apps.googleusercontent.com",
  "sub": "1234567890",
  "email": "john@example.com",
  "email_verified": true,
  "name": "John Doe",
  "picture": "https://lh3.googleusercontent.com/a/...",
  "given_name": "John",
  "family_name": "Doe",
  "iat": 1707216000,
  "exp": 1707219600
}
```

**Response - Existing User (200 OK)**:

```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "65a12345678abcdef012345",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "guest",
    "profilePicture": "https://lh3.googleusercontent.com/a/...",
    "googleId": "1234567890",
    "isVerified": true
  }
}
```

**Response - New User Created (201 Created)**:

```json
{
  "success": true,
  "message": "Account created successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "65a98765432fedcba987654",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "guest",
    "profilePicture": "https://lh3.googleusercontent.com/a/...",
    "googleId": "1234567890",
    "isVerified": true
  },
  "isNewUser": true
}
```

**Error Response - Invalid Credential (400)**:

```json
{
  "success": false,
  "message": "Invalid Google token payload"
}
```

**Error Response - Google Verification Failed (400)**:

```json
{
  "success": false,
  "message": "Invalid Google credential"
}
```

**Error Response - Email Conflict (400)**:

```json
{
  "success": false,
  "message": "An account with this email already exists. Please login with password."
}
```

**Flow**:

1. Client receives Google credential from Google Sign-In popup
2. Client sends credential to backend
3. Backend verifies credential with Google OAuth2Client
4. Backend extracts user info from verified payload
5. Backend checks if user exists by email or googleId
6. If user exists: Return existing user with tokens
7. If new user: Create account automatically
8. Generate JWT tokens
9. Return user info and tokens

**Account Creation (New User)**:

```javascript
{
  username: payload.email.split('@')[0], // "john@example.com" → "john"
  email: payload.email,
  googleId: payload.sub,
  profilePicture: payload.picture,
  isVerified: true, // Google verified email
  password: null, // No password for Google OAuth users
  role: 'guest' // Default role
}
```

**Security Considerations**:

- Google credential verified server-side
- Email already verified by Google
- No password stored for Google OAuth users
- Profile picture from Google CDN
- Cannot login with password if registered via Google (unless password set later)

**Implementation Notes**:

```javascript
// Backend: controllers/authController.js
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({
      success: false,
      message: "Google credential is required",
    });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google token payload",
      });
    }

    let user = await User.findOne({
      $or: [{ email: payload.email }, { googleId: payload.sub }],
    }).populate("role");

    let isNewUser = false;

    if (!user) {
      // Create new user
      const guestRole = await Role.findOne({ name: "guest" });
      user = await User.create({
        username: payload.email.split("@")[0],
        email: payload.email,
        googleId: payload.sub,
        profilePicture: payload.picture,
        isVerified: true,
        role: guestRole._id,
      });
      await user.populate("role");
      isNewUser = true;
    } else if (!user.googleId) {
      // Update existing user with Google ID
      user.googleId = payload.sub;
      user.profilePicture = payload.picture;
      user.isVerified = true;
      await user.save();
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(isNewUser ? 201 : 200).json({
      success: true,
      message: isNewUser ? "Account created successfully" : "Login successful",
      accessToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role?.name || "guest",
        profilePicture: user.profilePicture,
        googleId: user.googleId,
        isVerified: user.isVerified,
      },
      isNewUser,
    });
  } catch (error) {
    console.error("Google login error:", error);
    return res.status(400).json({
      success: false,
      message: "Invalid Google credential",
    });
  }
});
```

**Frontend Integration**:

```javascript
// Using @react-oauth/google

import { GoogleLogin } from '@react-oauth/google';

<GoogleLogin
  onSuccess={(credentialResponse) => {
    axios.post('/api/auth/google-login', {
      credential: credentialResponse.credential
    })
    .then(response => {
      // Store accessToken
      localStorage.setItem('accessToken', response.data.accessToken);
      // Redirect to dashboard
    });
  }}
  onError={() => {
    console.log('Login Failed');
  }}
/>
```

---

### 5. Logout

End user session and invalidate tokens.

**Endpoint**: `POST /api/auth/logout`

**Authentication**: Required (Bearer token)

**Request Headers**:

```
Authorization: Bearer <accessToken>
```

**Request Body**: None

**Request Example**:

```bash
curl -X POST "http://localhost:5000/api/auth/logout" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Cookie Cleared**:

```
Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/
```

**Client-Side Actions**:

1. Remove accessToken from memory/localStorage
2. Clear user state
3. Redirect to login page
4. Clear any cached data

**Implementation Notes**:

```javascript
// Backend: controllers/authController.js
export const logout = asyncHandler(async (req, res) => {
  // Clear refresh token cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });

  res.json({
    success: true,
    message: "Logged out successfully",
  });
});
```

---

## 👨‍💼 Staff Authentication APIs

### 1. Staff Login

Authenticate staff members (manager, receptionist, chef, waiter).

**Endpoint**: `POST /api/staff/login`

**Authentication**: None (Public)

**Request Body**:

```typescript
{
  email: string,
  password: string
}
```

**Request Example**:

```bash
curl -X POST "http://localhost:5000/api/staff/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@hotel.com",
    "password": "StaffPass123"
  }'
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "staff": {
    "_id": "65b12345678abcdef012345",
    "username": "johnmanager",
    "email": "manager@hotel.com",
    "role": "staff",
    "companyRole": "manager",
    "company": {
      "_id": "65c98765432fedcba987654",
      "name": "Hotel Paradise Group"
    },
    "assignedProperties": [
      {
        "_id": "65d11111222233334444555",
        "name": "Hotel Paradise - Downtown"
      }
    ],
    "profilePicture": null
  }
}
```

**Differences from Guest Login**:

- Returns `companyRole` instead of just `role`
- Includes `company` information
- Includes `assignedProperties` array
- No `isVerified` field (staff pre-verified by invitation)

**Staff Roles**:

- `owner`: Company owner
- `manager`: Hotel manager
- `receptionist`: Front desk staff
- `chief`: Chef/kitchen head
- `waiter`: Service staff
- `housekeeping`: Cleaning staff

---

### 2. Accept Staff Invitation

Staff member accepts invitation and completes onboarding.

**Endpoint**: `POST /api/staff/accept-invite`

**Authentication**: None (Token in request)

**Request Body**:

```typescript
{
  token: string,          // Invitation token from email
  password: string,       // New password (min 8 chars)
  confirmPassword: string, // Password confirmation
  firstName?: string,     // Optional: First name
  lastName?: string,      // Optional: Last name
  phone?: string          // Optional: Phone number
}
```

**Request Example**:

```bash
curl -X POST "http://localhost:5000/api/staff/accept-invite" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4e5f6789012345678901234567890abcd",
    "password": "NewStaffPass123",
    "confirmPassword": "NewStaffPass123",
    "firstName": "John",
    "lastName": "Manager",
    "phone": "+1234567890"
  }'
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "message": "Account activated successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "staff": {
    "_id": "65e98765432fedcba987654",
    "username": "johnmanager",
    "email": "john@hotel.com",
    "role": "staff",
    "companyRole": "manager",
    "firstName": "John",
    "lastName": "Manager",
    "company": {
      "_id": "65c98765432fedcba987654",
      "name": "Hotel Paradise Group"
    },
    "assignedProperties": [
      {
        "_id": "65d11111222233334444555",
        "name": "Hotel Paradise - Downtown"
      }
    ]
  }
}
```

**Error Response - Invalid/Expired Token (400)**:

```json
{
  "success": false,
  "message": "Invalid or expired invitation token"
}
```

**Error Response - Already Accepted (400)**:

```json
{
  "success": false,
  "message": "This invitation has already been accepted"
}
```

**Flow**:

1. Staff receives invitation email with token
2. Clicks link: `https://stayhaven.com/staff/accept-invite?token=abc123`
3. Frontend loads invitation details (without password)
4. Staff fills password and optional details
5. Submits to backend
6. Backend verifies token
7. Backend creates staff account
8. Backend marks invitation as accepted
9. Backend generates JWT tokens
10. Staff logged in automatically

---

## 🔄 Token Management

### 1. Refresh Access Token

Get new access token using refresh token.

**Endpoint**: `POST /api/auth/refresh-token`

**Authentication**: Refresh token in cookie

**Request Headers**:

```
Cookie: refreshToken=<refreshToken>
```

**Request Body**: None

**Request Example**:

```bash
curl -X POST "http://localhost:5000/api/auth/refresh-token" \
  -H "Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.newToken..."
}
```

**Error Response - No Refresh Token (401)**:

```json
{
  "success": false,
  "message": "Refresh token not provided"
}
```

**Error Response - Invalid Token (401)**:

```json
{
  "success": false,
  "message": "Invalid refresh token"
}
```

**Error Response - Expired Token (401)**:

```json
{
  "success": false,
  "message": "Refresh token expired. Please login again."
}
```

**Frontend Implementation**:

```javascript
// Axios interceptor for automatic token refresh

import axios from 'axios';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return axios(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post('/api/auth/refresh-token');
        const { accessToken } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        axios.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
        originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;
        
        processQueue(null, accessToken);
        return axios(originalRequest);
      } catch (err) {
        processQueue(err, null);
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

**Proactive Refresh Strategy**:

```javascript
// Refresh token before expiry (at 55 minutes)

import { jwtDecode } from 'jwt-decode';

const checkTokenExpiry = () => {
  const token = localStorage.getItem('accessToken');
  if (!token) return;

  const decoded = jwtDecode(token);
  const now = Date.now() / 1000;
  const timeLeft = decoded.exp - now;

  // If less than 5 minutes left, refresh
  if (timeLeft < 300) {
    axios.post('/api/auth/refresh-token')
      .then(response => {
        localStorage.setItem('accessToken', response.data.accessToken);
      })
      .catch(() => {
        // Token refresh failed, logout
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      });
  }
};

// Check every minute
setInterval(checkTokenExpiry, 60000);
```

---

## 🔑 Password Management

### 1. Forgot Password

Request password reset email.

**Endpoint**: `POST /api/auth/forgot-password`

**Authentication**: None (Public)

**Request Body**:

```typescript
{
  email: string  // Registered email
}
```

**Request Example**:

```bash
curl -X POST "http://localhost:5000/api/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "message": "Password reset instructions have been sent to your email"
}
```

**Response - Email Not Found (200 OK)**:

```json
{
  "success": true,
  "message": "If that email is registered, you will receive password reset instructions"
}
```

*Note: Same response for security (don't reveal if email exists)*

**Email Sent**:

```
Subject: Reset Your StayHaven Password

Hi johndoe,

We received a request to reset your password. Click the link below to reset:

[Reset Password] (expires in 1 hour)

If you didn't request this, please ignore this email. Your password will remain unchanged.

Best regards,
StayHaven Team
```

**Reset Token**:

- Random crypto token (32 bytes)
- Hashed and stored in database
- Expires in 1 hour
- Single-use only

---

### 2. Reset Password

Set new password using reset token.

**Endpoint**: `POST /api/auth/reset-password`

**Authentication**: Reset token required

**Request Body**:

```typescript
{
  token: string,          // Reset token from email
  password: string,       // New password
  confirmPassword: string // Password confirmation
}
```

**Request Example**:

```bash
curl -X POST "http://localhost:5000/api/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4e5f6789012345678901234567890abcd",
    "password": "NewSecurePass123",
    "confirmPassword": "NewSecurePass123"
  }'
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "message": "Password reset successful. You can now login with your new password."
}
```

**Error Response - Invalid/Expired Token (400)**:

```json
{
  "success": false,
  "message": "Invalid or expired reset token"
}
```

**Error Response - Password Mismatch (400)**:

```json
{
  "success": false,
  "message": "Passwords do not match"
}
```

**Side Effects**:

1. Password updated and hashed
2. Reset token invalidated
3. All existing sessions invalidated (logout everywhere)
4. Confirmation email sent

---

## 🔒 Security Considerations

### Rate Limiting

| Endpoint | Limit | Window | Block Duration |
|----------|-------|--------|----------------|
| `/api/auth/login` | 5 attempts | 15 min | 15 min |
| `/api/auth/register` | 3 attempts | 1 hour | 1 hour |
| `/api/auth/forgot-password` | 3 attempts | 1 hour | 1 hour |
| `/api/auth/refresh-token` | 10 attempts | 15 min | 15 min |

### Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- Special characters recommended but not required

### Token Security

**Access Token**:

- Short-lived (1 hour)
- Stored in memory or localStorage (XSS risk)
- Sent in Authorization header
- Contains minimal user info

**Refresh Token**:

- Long-lived (7 days)
- Stored in httpOnly cookie (XSS protection)
- Not accessible to JavaScript
- Cannot be stolen via XSS
- Requires HTTPS in production

### HTTPS Requirements

- All endpoints require HTTPS in production
- Cookies set with `Secure` flag
- `SameSite=Strict` for CSRF protection

---

## ⚠️ Error Handling

### Standard Error Response

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "ERROR_CODE",
  "details": {} // Optional: Additional error details
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful request |
| 201 | Created | User/resource created |
| 400 | Bad Request | Validation error, invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate email, username |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Common Error Codes

| Code | Message | Resolution |
|------|---------|------------|
| `AUTH_001` | Invalid credentials | Check email/password |
| `AUTH_002` | Email already exists | Use different email or login |
| `AUTH_003` | Token expired | Request new token |
| `AUTH_004` | Invalid token | Check token format |
| `AUTH_005` | Account deactivated | Contact support |
| `AUTH_006` | Email not verified | Check verification email |
| `AUTH_007` | Password too weak | Use stronger password |
| `AUTH_008` | Rate limit exceeded | Wait before retrying |

---

## 📚 Related Documents

- [User Management APIs](./user-management-apis.md)
- [Security Overview](../05-security/security-overview.md)
- [User Roles and Permissions](../01-requirements/user-roles-and-permissions.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive authentication API documentation  
**API Version**: v1  
**Base URL**: `https://api.stayhaven.com/api/auth`
