# API Overview

> Comprehensive overview of the StayHaven REST API and WebSocket architecture

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [API Architecture](#api-architecture)
3. [API Endpoints Summary](#api-endpoints-summary)
4. [WebSocket Events](#websocket-events)
5. [Authentication](#authentication)
6. [Request/Response Format](#requestresponse-format)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Versioning](#versioning)
10. [Testing the API](#testing-the-api)

---

## 🌐 Introduction

The StayHaven API is a RESTful API built with Node.js and Express.js, providing comprehensive endpoints for hotel booking, room service ordering, and property management. The API follows REST principles, uses JSON for data exchange, and implements JWT-based authentication.

### Key Features

✅ **RESTful Architecture**: Standard HTTP methods (GET, POST, PUT, DELETE)  
✅ **Real-time Updates**: WebSocket integration via Socket.io  
✅ **Multi-tenancy**: Company-level data isolation  
✅ **Role-Based Access Control**: 7 user roles with granular permissions  
✅ **File Upload Support**: Cloudinary integration for images  
✅ **Comprehensive Error Handling**: Detailed error messages and codes  
✅ **Rate Limiting**: Protection against abuse  
✅ **CORS Enabled**: Cross-origin resource sharing configured  

---

## 🏗️ API Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                         │
│  (React Frontend, Mobile Apps, Third-party Integrations) │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   API Gateway Layer                      │
│  - CORS Middleware                                       │
│  - Rate Limiting                                         │
│  - Request Logging                                       │
│  - Authentication Middleware                             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  Express.js Server                       │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Routes     │  │ Controllers  │  │  Middleware  │  │
│  │              │  │              │  │              │  │
│  │ - Auth       │  │ - Business   │  │ - Auth       │  │
│  │ - Hotels     │  │   Logic      │  │ - Upload     │  │
│  │ - Bookings   │  │ - Validation │  │ - Error      │  │
│  │ - Orders     │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   Service Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   MongoDB    │  │  Cloudinary  │  │  Nodemailer  │  │
│  │  (Database)  │  │   (Images)   │  │   (Email)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐                                       │
│  │  Socket.io   │                                       │
│  │  (Real-time) │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

### Base URLs

| Environment | URL |
|------------|-----|
| Production | `https://api.stayhaven.com` |
| Staging | `https://staging-api.stayhaven.com` |
| Development | `http://localhost:5000` |

### API Structure

```
/api
├── /auth                    # Authentication endpoints
├── /users                   # User management
├── /staff                   # Staff operations
├── /hotels                  # Hotel management
│   ├── /:hotelId/rooms      # Room management
│   ├── /:hotelId/menu       # Menu management
│   └── /:hotelId/analytics  # Hotel analytics
├── /bookings                # Booking operations
├── /orders                  # Order management
├── /waiter-calls            # Waiter call system
├── /notifications           # Notification system
└── /companies               # Company management
```

---

## 📡 API Endpoints Summary

### Authentication & User Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new guest | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/google-login` | Google OAuth login | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| POST | `/api/auth/refresh-token` | Refresh access token | Cookie |
| POST | `/api/auth/forgot-password` | Request password reset | No |
| POST | `/api/auth/reset-password` | Reset password | Token |
| GET | `/api/users/profile` | Get user profile | Yes |
| PUT | `/api/users/profile` | Update profile | Yes |
| PUT | `/api/users/change-password` | Change password | Yes |

### Hotel Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/hotels` | Get all hotels | No |
| GET | `/api/hotels/:id` | Get hotel details | No |
| POST | `/api/hotels` | Create hotel | Owner |
| PUT | `/api/hotels/:id` | Update hotel | Owner/Manager |
| DELETE | `/api/hotels/:id` | Delete hotel | Owner/Admin |
| POST | `/api/hotels/:id/approve` | Approve hotel | Admin |
| POST | `/api/hotels/:id/reject` | Reject hotel | Admin |
| GET | `/api/hotels/:id/analytics` | Get hotel analytics | Owner/Manager |

### Room Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/hotels/:hotelId/rooms` | Get hotel rooms | No |
| GET | `/api/hotels/:hotelId/rooms/:roomId` | Get room details | No |
| POST | `/api/hotels/:hotelId/rooms` | Create room | Owner/Manager |
| PUT | `/api/hotels/:hotelId/rooms/:roomId` | Update room | Owner/Manager |
| DELETE | `/api/hotels/:hotelId/rooms/:roomId` | Delete room | Owner/Manager |
| GET | `/api/hotels/:hotelId/rooms/availability` | Check room availability | No |

### Booking Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/bookings` | Get user bookings | Yes (Guest) |
| GET | `/api/bookings/:id` | Get booking details | Yes |
| POST | `/api/bookings` | Create booking | Yes (Guest) |
| PUT | `/api/bookings/:id` | Update booking | Yes (Guest) |
| POST | `/api/bookings/:id/cancel` | Cancel booking | Yes (Guest) |
| POST | `/api/bookings/:id/check-in` | Check-in guest | Receptionist |
| POST | `/api/bookings/:id/check-out` | Check-out guest | Receptionist |
| GET | `/api/hotels/:hotelId/bookings` | Get hotel bookings | Manager/Receptionist |

### Order Management (KOT System)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/orders` | Get user orders | Yes (Guest) |
| GET | `/api/orders/:id` | Get order details | Yes |
| POST | `/api/orders` | Create order | Yes (Guest/Waiter) |
| PUT | `/api/orders/:id/status` | Update order status | Staff |
| GET | `/api/hotels/:hotelId/orders` | Get hotel orders | Staff |
| GET | `/api/hotels/:hotelId/orders/kitchen` | Get kitchen queue | Chef |
| POST | `/api/orders/:id/confirm` | Confirm order | Waiter |
| POST | `/api/orders/:id/prepare` | Start preparation | Chef |
| POST | `/api/orders/:id/ready` | Mark as ready | Chef |
| POST | `/api/orders/:id/deliver` | Mark as delivered | Waiter |

### Menu Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/hotels/:hotelId/menu` | Get hotel menu | No |
| GET | `/api/hotels/:hotelId/menu/:itemId` | Get menu item details | No |
| POST | `/api/hotels/:hotelId/menu` | Add menu item | Owner/Manager/Chef |
| PUT | `/api/hotels/:hotelId/menu/:itemId` | Update menu item | Owner/Manager/Chef |
| DELETE | `/api/hotels/:hotelId/menu/:itemId` | Delete menu item | Owner/Manager |
| PUT | `/api/hotels/:hotelId/menu/:itemId/availability` | Toggle availability | Chef |

### Waiter Call System

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/waiter-calls` | Get user's calls | Yes (Guest) |
| POST | `/api/waiter-calls` | Create waiter call | Yes (Guest) |
| PUT | `/api/waiter-calls/:id/accept` | Accept call | Waiter |
| PUT | `/api/waiter-calls/:id/complete` | Complete call | Waiter |
| GET | `/api/hotels/:hotelId/waiter-calls` | Get hotel calls | Staff |

### Staff Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/staff/login` | Staff login | No |
| POST | `/api/staff/invite` | Invite staff member | Owner |
| POST | `/api/staff/accept-invite` | Accept invitation | Token |
| GET | `/api/staff` | Get company staff | Owner/Manager |
| PUT | `/api/staff/:id` | Update staff details | Owner |
| DELETE | `/api/staff/:id` | Remove staff | Owner |
| POST | `/api/staff/:id/assign-hotel` | Assign to hotel | Owner |
| POST | `/api/staff/:id/deactivate` | Deactivate staff | Owner |

### Company Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/companies` | Create company | Yes (New Owner) |
| GET | `/api/companies/:id` | Get company details | Owner |
| PUT | `/api/companies/:id` | Update company | Owner |
| GET | `/api/companies/:id/hotels` | Get company hotels | Owner |
| GET | `/api/companies/:id/staff` | Get company staff | Owner |

### Notification Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/notifications` | Get user notifications | Yes |
| PUT | `/api/notifications/:id/read` | Mark as read | Yes |
| PUT | `/api/notifications/read-all` | Mark all as read | Yes |
| DELETE | `/api/notifications/:id` | Delete notification | Yes |

---

## 🔌 WebSocket Events

### Connection

```javascript
// Client-side connection
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: accessToken
  }
});

socket.on('connect', () => {
  console.log('Connected to server');
});
```

### Room Structure

| Room Pattern | Purpose | Who Joins |
|--------------|---------|-----------|
| `user-{userId}` | Personal notifications | Individual user |
| `hotel-{hotelId}` | Hotel-wide updates | All staff in hotel |
| `hotel-{hotelId}-kitchen` | Kitchen orders | Chefs in hotel |
| `hotel-{hotelId}-waiters` | Waiter calls | Waiters in hotel |
| `hotel-{hotelId}-reception` | Front desk | Receptionists in hotel |
| `role-{roleName}` | Role-specific | All users with role |
| `company-{companyId}` | Company-wide | All company staff |

### Events

#### Order Events

```javascript
// New order created
socket.on('newOrder', (order) => {
  console.log('New order:', order);
  // Update order list
});

// Order status updated
socket.on('orderStatusUpdate', (data) => {
  console.log('Order status:', data.orderId, data.status);
  // Update order display
});

// Order ready for pickup
socket.on('orderReady', (orderId) => {
  console.log('Order ready:', orderId);
  // Notify waiter
});
```

#### Waiter Call Events

```javascript
// New waiter call
socket.on('newWaiterCall', (call) => {
  console.log('Waiter call:', call);
  // Show notification
});

// Call accepted
socket.on('callAccepted', (data) => {
  console.log('Call accepted by:', data.waiterName);
  // Update UI
});

// Call completed
socket.on('callCompleted', (callId) => {
  console.log('Call completed:', callId);
  // Remove from list
});
```

#### Booking Events

```javascript
// New booking
socket.on('newBooking', (booking) => {
  console.log('New booking:', booking);
  // Update booking list
});

// Check-in event
socket.on('guestCheckedIn', (data) => {
  console.log('Guest checked in:', data.bookingId);
});

// Check-out event
socket.on('guestCheckedOut', (data) => {
  console.log('Guest checked out:', data.bookingId);
});
```

#### Notification Events

```javascript
// General notification
socket.on('notification', (notification) => {
  console.log('Notification:', notification);
  // Show toast
});

// System alert
socket.on('systemAlert', (alert) => {
  console.log('System alert:', alert);
  // Show modal
});
```

#### Emitting Events

```javascript
// Join hotel room
socket.emit('joinHotel', { hotelId: '65a12345678abcdef012345' });

// Leave hotel room
socket.emit('leaveHotel', { hotelId: '65a12345678abcdef012345' });

// Update location (for waiters)
socket.emit('updateLocation', { 
  hotelId: '65a12345678abcdef012345',
  floor: 2 
});
```

---

## 🔐 Authentication

### Authentication Flow

1. **Login**: Send credentials to `/api/auth/login`
2. **Receive Tokens**: Get `accessToken` in response body, `refreshToken` in httpOnly cookie
3. **Store Access Token**: Save in memory or localStorage
4. **Include in Requests**: Add to Authorization header
5. **Handle Expiry**: Use refresh token to get new access token

### Authorization Header

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                     Token Lifecycle                          │
└─────────────────────────────────────────────────────────────┘

1. Login
   POST /api/auth/login
   ↓
   { accessToken, refreshToken }
   
2. Store Tokens
   accessToken → localStorage (1 hour)
   refreshToken → httpOnly cookie (7 days)
   
3. API Request
   GET /api/bookings
   Authorization: Bearer <accessToken>
   ↓
   ✅ Valid → Response
   ❌ Expired → 401 Unauthorized
   
4. Token Refresh (if expired)
   POST /api/auth/refresh-token
   (refreshToken from cookie)
   ↓
   { accessToken }
   
5. Retry Original Request
   GET /api/bookings
   Authorization: Bearer <newAccessToken>
   ↓
   ✅ Response
```

---

## 📨 Request/Response Format

### Request Format

#### Headers

```http
Content-Type: application/json
Authorization: Bearer <accessToken>
Accept: application/json
```

#### JSON Body Example

```json
{
  "hotelId": "65a12345678abcdef012345",
  "roomId": "65b98765432fedcba987654",
  "checkIn": "2026-03-01",
  "checkOut": "2026-03-05",
  "guests": {
    "adults": 2,
    "children": 1
  }
}
```

#### Multipart Form Data (File Upload)

```http
Content-Type: multipart/form-data

------WebKitFormBoundary
Content-Disposition: form-data; name="name"

Hotel Paradise
------WebKitFormBoundary
Content-Disposition: form-data; name="images"; filename="hotel1.jpg"
Content-Type: image/jpeg

[Binary data]
------WebKitFormBoundary--
```

### Response Format

#### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

#### Error Response

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "ERROR_CODE",
  "details": {
    "field": "email",
    "reason": "Email is required"
  }
}
```

#### Pagination Response

```json
{
  "success": true,
  "data": {
    "items": [ /* Array of items */ ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 100,
      "limit": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

## ⚠️ Error Handling

### HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created |
| 204 | No Content | Success with no body |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service down |

### Error Codes

| Code | Category | Description |
|------|----------|-------------|
| AUTH_001 | Authentication | Invalid credentials |
| AUTH_002 | Authentication | Email already exists |
| AUTH_003 | Authentication | Token expired |
| AUTH_004 | Authentication | Invalid token |
| AUTH_005 | Authentication | Account deactivated |
| VAL_001 | Validation | Required field missing |
| VAL_002 | Validation | Invalid format |
| VAL_003 | Validation | Value out of range |
| BIZ_001 | Business Logic | Room not available |
| BIZ_002 | Business Logic | Booking conflict |
| BIZ_003 | Business Logic | Insufficient inventory |
| SYS_001 | System | Database error |
| SYS_002 | System | External service error |

### Error Response Examples

```json
// Validation Error
{
  "success": false,
  "message": "Validation failed",
  "error": "VAL_001",
  "details": {
    "errors": [
      {
        "field": "email",
        "message": "Valid email is required",
        "code": "INVALID_EMAIL"
      },
      {
        "field": "checkIn",
        "message": "Check-in date must be in the future",
        "code": "INVALID_DATE"
      }
    ]
  }
}

// Business Logic Error
{
  "success": false,
  "message": "Room not available for selected dates",
  "error": "BIZ_001",
  "details": {
    "roomId": "65b98765432fedcba987654",
    "checkIn": "2026-03-01",
    "checkOut": "2026-03-05",
    "reason": "Already booked"
  }
}

// Authentication Error
{
  "success": false,
  "message": "Invalid or expired token",
  "error": "AUTH_003"
}
```

---

## 🚦 Rate Limiting

### Rate Limits by Endpoint Type

| Endpoint Type | Limit | Window | Scope |
|--------------|-------|--------|-------|
| Authentication | 5 requests | 15 min | IP |
| Search/Browse | 100 requests | 1 min | IP |
| Create/Update | 20 requests | 1 min | User |
| Delete | 10 requests | 1 min | User |
| File Upload | 5 requests | 5 min | User |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1707219600
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "error": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "window": "1 minute",
    "retryAfter": 45
  }
}
```

**Response Headers**:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1707219645
Retry-After: 45
```

---

## 📌 Versioning

### Current Version

**API Version**: `v1`

### Versioning Strategy

- **URL Versioning**: `/api/v1/hotels`
- **Header Versioning**: `Accept: application/vnd.stayhaven.v1+json`

Currently, all endpoints use **v1** implicitly. Future versions will be explicitly versioned.

### Deprecation Policy

1. **Announcement**: 3 months notice before deprecation
2. **Migration Period**: 6 months overlap with new version
3. **Sunset Date**: Clear date communicated in advance
4. **Deprecation Headers**:

```http
Deprecation: Sun, 01 Jun 2026 00:00:00 GMT
Sunset: Sun, 01 Dec 2026 00:00:00 GMT
Link: <https://api.stayhaven.com/v2/hotels>; rel="successor-version"
```

---

## 🧪 Testing the API

### Using cURL

```bash
# Login
curl -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"SecurePass123"}'

# Get hotels (with token)
curl -X GET "http://localhost:5000/api/hotels" \
  -H "Authorization: Bearer <your_token>"

# Create booking
curl -X POST "http://localhost:5000/api/bookings" \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "hotelId":"65a12345678abcdef012345",
    "roomId":"65b98765432fedcba987654",
    "checkIn":"2026-03-01",
    "checkOut":"2026-03-05",
    "guests":{"adults":2,"children":1}
  }'
```

### Using Postman

1. **Import Collection**: [Download StayHaven Postman Collection](../postman/stayhaven-api.json)
2. **Set Environment**:
   - `baseUrl`: `http://localhost:5000`
   - `accessToken`: (will be set automatically after login)
3. **Authentication**:
   - Login via `/auth/login`
   - Token auto-saved to environment
4. **Test Endpoints**: All endpoints ready with examples

### Using JavaScript (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Login
const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  localStorage.setItem('accessToken', response.data.accessToken);
  return response.data;
};

// Get hotels
const getHotels = async (filters = {}) => {
  const response = await api.get('/hotels', { params: filters });
  return response.data;
};

// Create booking
const createBooking = async (bookingData) => {
  const response = await api.post('/bookings', bookingData);
  return response.data;
};
```

---

## 📚 Related Documents

- [Authentication APIs](./authentication-apis.md)
- [Hotel Management APIs](./hotel-management-apis.md)
- [Booking APIs](./booking-apis.md)
- [Order and KOT APIs](./order-and-kot-apis.md)
- [Real-time Events](./real-time-events.md)
- [Staff Management APIs](./staff-management-apis.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive API overview documentation  
**API Version**: v1
