# Request & Response Samples

> Complete collection of real-world API request/response examples for all major StayHaven endpoints

---

## 📋 Table of Contents

1. [Authentication Flow](#authentication-flow)
2. [Hotel Management](#hotel-management)
3. [Booking Lifecycle](#booking-lifecycle)
4. [Order Management](#order-management)
5. [Staff Operations](#staff-operations)
6. [User Profile](#user-profile)
7. [Real-time Events](#real-time-events)

---

## 🔐 Authentication Flow

### Complete Guest Registration & Login Flow

#### Step 1: Register New User

**Request**:
```http
POST /api/auth/register HTTP/1.1
Host: api.stayhaven.com
Content-Type: application/json

{
  "fullname": "John Doe",
  "username": "johndoe",
  "email": "john.doe@email.com",
  "password": "SecurePass123!",
  "phone": "+1-555-123-4567"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "user": {
    "_id": "65a12345678abcdef0123456",
    "fullname": "John Doe",
    "username": "johndoe",
    "email": "john.doe@email.com",
    "phone": "+1-555-123-4567",
    "role": {
      "_id": "65901234567abcdef0123456",
      "name": "guest"
    },
    "isVerified": false,
    "isActive": true,
    "createdAt": "2026-02-02T10:00:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1YTEyMzQ1Njc4YWJjZGVmMDEyMzQ1NiIsImlhdCI6MTcwNzM5NjAwMCwiZXhwIjoxNzA3Mzk5NjAwfQ.abc123...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1YTEyMzQ1Njc4YWJjZGVmMDEyMzQ1NiIsImlhdCI6MTcwNzM5NjAwMCwiZXhwIjoxNzA4MDAwODAwfQ.def456..."
  }
}
```

---

#### Step 2: Login

**Request**:
```http
POST /api/auth/login HTTP/1.1
Host: api.stayhaven.com
Content-Type: application/json

{
  "email": "john.doe@email.com",
  "password": "SecurePass123!"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "65a12345678abcdef0123456",
    "fullname": "John Doe",
    "username": "johndoe",
    "email": "john.doe@email.com",
    "profilePicture": "https://res.cloudinary.com/stayhaven/image/upload/v1707396000/users/johndoe.jpg",
    "role": {
      "_id": "65901234567abcdef0123456",
      "name": "guest"
    },
    "loyaltyPoints": 2580,
    "membershipTier": "gold"
  }
}
```

---

#### Step 3: Refresh Access Token

**Request**:
```http
POST /api/auth/refresh-token HTTP/1.1
Host: api.stayhaven.com
Content-Type: application/json
Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200):
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_token...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_refresh..."
}
```

---

## 🏨 Hotel Management

### Create Hotel Listing

**Request**:
```http
POST /api/hotels HTTP/1.1
Host: api.stayhaven.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Grand Plaza Hotel",
  "description": "Luxury 5-star hotel in the heart of Kathmandu with stunning mountain views",
  "location": "Kathmandu",
  "address": {
    "street": "Durbar Marg",
    "city": "Kathmandu",
    "state": "Bagmati",
    "country": "Nepal",
    "zipCode": "44600"
  },
  "category": "luxury",
  "starRating": 5,
  "priceRange": {
    "min": 120,
    "max": 450,
    "currency": "USD"
  },
  "images": [
    "https://res.cloudinary.com/stayhaven/image/upload/v1707390000/hotels/grand_plaza_1.jpg",
    "https://res.cloudinary.com/stayhaven/image/upload/v1707390000/hotels/grand_plaza_2.jpg"
  ],
  "amenities": [
    "wifi",
    "parking",
    "pool",
    "spa",
    "gym",
    "restaurant",
    "bar",
    "room-service",
    "conference-rooms"
  ],
  "policies": {
    "checkIn": "14:00",
    "checkOut": "12:00",
    "cancellationPolicy": "Free cancellation up to 24 hours before check-in",
    "petPolicy": "Pets allowed with additional fee"
  },
  "contact": {
    "phone": "+977-1-4444444",
    "email": "info@grandplaza.com",
    "website": "https://grandplaza.com"
  }
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Hotel created successfully and sent for approval",
  "hotel": {
    "_id": "65b98765432fedcba987654",
    "name": "Grand Plaza Hotel",
    "description": "Luxury 5-star hotel in the heart of Kathmandu with stunning mountain views",
    "location": "Kathmandu",
    "address": {
      "street": "Durbar Marg",
      "city": "Kathmandu",
      "state": "Bagmati",
      "country": "Nepal",
      "zipCode": "44600"
    },
    "category": "luxury",
    "starRating": 5,
    "priceRange": {
      "min": 120,
      "max": 450,
      "currency": "USD"
    },
    "images": [
      "https://res.cloudinary.com/stayhaven/image/upload/v1707390000/hotels/grand_plaza_1.jpg",
      "https://res.cloudinary.com/stayhaven/image/upload/v1707390000/hotels/grand_plaza_2.jpg"
    ],
    "amenities": [
      "wifi",
      "parking",
      "pool",
      "spa",
      "gym",
      "restaurant",
      "bar",
      "room-service",
      "conference-rooms"
    ],
    "policies": {
      "checkIn": "14:00",
      "checkOut": "12:00",
      "cancellationPolicy": "Free cancellation up to 24 hours before check-in",
      "petPolicy": "Pets allowed with additional fee"
    },
    "contact": {
      "phone": "+977-1-4444444",
      "email": "info@grandplaza.com",
      "website": "https://grandplaza.com"
    },
    "owner": "65a12345678abcdef0123456",
    "company": "65812345678abcdef0123456",
    "status": "pending",
    "isActive": false,
    "createdAt": "2026-02-02T10:00:00.000Z"
  }
}
```

---

### Search Hotels with Filters

**Request**:
```http
GET /api/hotels/search?location=Kathmandu&checkIn=2026-03-15&checkOut=2026-03-18&guests=2&minPrice=100&maxPrice=300&amenities=wifi,pool&starRating=4,5&sortBy=rating&sortOrder=desc&page=1&limit=10 HTTP/1.1
Host: api.stayhaven.com
```

**Response** (200):
```json
{
  "success": true,
  "hotels": [
    {
      "_id": "65b98765432fedcba987654",
      "name": "Grand Plaza Hotel",
      "description": "Luxury 5-star hotel in the heart of Kathmandu with stunning mountain views",
      "location": "Kathmandu",
      "starRating": 5,
      "priceRange": {
        "min": 120,
        "max": 450,
        "currency": "USD"
      },
      "images": [
        "https://res.cloudinary.com/stayhaven/image/upload/v1707390000/hotels/grand_plaza_1.jpg"
      ],
      "amenities": ["wifi", "parking", "pool", "spa"],
      "rating": 4.8,
      "reviewCount": 342,
      "availableRooms": 15,
      "lowestPrice": 120
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalHotels": 28,
    "limit": 10
  },
  "filters": {
    "location": "Kathmandu",
    "checkIn": "2026-03-15",
    "checkOut": "2026-03-18",
    "guests": 2,
    "priceRange": { "min": 100, "max": 300 },
    "amenities": ["wifi", "pool"],
    "starRating": [4, 5]
  }
}
```

---

## 📅 Booking Lifecycle

### Complete Booking Flow

#### Step 1: Check Room Availability

**Request**:
```http
GET /api/hotels/65b98765432fedcba987654/availability?checkIn=2026-03-15&checkOut=2026-03-18&guests=2 HTTP/1.1
Host: api.stayhaven.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** (200):
```json
{
  "success": true,
  "availability": {
    "hotelId": "65b98765432fedcba987654",
    "hotelName": "Grand Plaza Hotel",
    "checkIn": "2026-03-15",
    "checkOut": "2026-03-18",
    "nights": 3,
    "availableRooms": [
      {
        "_id": "65c12345678abcdef0123456",
        "roomNumber": "101",
        "type": "Deluxe",
        "description": "Spacious room with king bed and mountain view",
        "capacity": {
          "adults": 2,
          "children": 1
        },
        "pricePerNight": 150,
        "totalPrice": 450,
        "currency": "USD",
        "amenities": ["wifi", "tv", "minibar", "balcony"],
        "images": ["https://res.cloudinary.com/stayhaven/image/upload/v1707390000/rooms/deluxe_101.jpg"]
      },
      {
        "_id": "65c22345678abcdef0123456",
        "roomNumber": "205",
        "type": "Suite",
        "description": "Luxurious suite with separate living area",
        "capacity": {
          "adults": 4,
          "children": 2
        },
        "pricePerNight": 300,
        "totalPrice": 900,
        "currency": "USD",
        "amenities": ["wifi", "tv", "minibar", "balcony", "jacuzzi"],
        "images": ["https://res.cloudinary.com/stayhaven/image/upload/v1707390000/rooms/suite_205.jpg"]
      }
    ],
    "totalAvailable": 2
  }
}
```

---

#### Step 2: Create Booking

**Request**:
```http
POST /api/bookings HTTP/1.1
Host: api.stayhaven.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "hotel": "65b98765432fedcba987654",
  "room": "65c12345678abcdef0123456",
  "checkIn": "2026-03-15T14:00:00.000Z",
  "checkOut": "2026-03-18T12:00:00.000Z",
  "guests": {
    "adults": 2,
    "children": 0
  },
  "totalAmount": 450,
  "currency": "USD",
  "paymentMethod": "card",
  "specialRequests": "Late check-in around 9 PM. High floor preferred."
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Booking created successfully",
  "booking": {
    "_id": "65e12345678abcdef0123456",
    "user": {
      "_id": "65a12345678abcdef0123456",
      "fullname": "John Doe",
      "email": "john.doe@email.com"
    },
    "hotel": {
      "_id": "65b98765432fedcba987654",
      "name": "Grand Plaza Hotel",
      "location": "Kathmandu"
    },
    "room": {
      "_id": "65c12345678abcdef0123456",
      "roomNumber": "101",
      "type": "Deluxe"
    },
    "confirmationCode": "SH-2026-1025",
    "checkIn": "2026-03-15T14:00:00.000Z",
    "checkOut": "2026-03-18T12:00:00.000Z",
    "guests": {
      "adults": 2,
      "children": 0
    },
    "totalAmount": 450,
    "currency": "USD",
    "status": "Pending",
    "paymentStatus": "unpaid",
    "specialRequests": "Late check-in around 9 PM. High floor preferred.",
    "createdAt": "2026-02-02T10:00:00.000Z"
  }
}
```

---

#### Step 3: Check-In Guest

**Request**:
```http
PATCH /api/bookings/65e12345678abcdef0123456/checkin HTTP/1.1
Host: api.stayhaven.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "actualCheckInTime": "2026-03-15T21:15:00.000Z",
  "notes": "Guest arrived late as requested. Room 101 assigned."
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Guest checked in successfully",
  "booking": {
    "_id": "65e12345678abcdef0123456",
    "confirmationCode": "SH-2026-1025",
    "status": "Checked-In",
    "checkIn": "2026-03-15T14:00:00.000Z",
    "actualCheckIn": "2026-03-15T21:15:00.000Z",
    "room": {
      "roomNumber": "101",
      "type": "Deluxe"
    },
    "guest": {
      "fullname": "John Doe",
      "phone": "+1-555-123-4567"
    }
  }
}
```

---

## 🍽️ Order Management

### Complete Order Flow

#### Step 1: Create Room Service Order

**Request**:
```http
POST /api/orders HTTP/1.1
Host: api.stayhaven.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "hotel": "65b98765432fedcba987654",
  "orderType": "roomService",
  "roomNumber": "101",
  "customerName": "John Doe",
  "items": [
    {
      "menuItem": "65d12345678abcdef0123456",
      "quantity": 2,
      "specialInstructions": "No onions"
    },
    {
      "name": "Extra Towels",
      "price": 0,
      "quantity": 3
    }
  ],
  "totalPrice": 48.00,
  "priority": "normal"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Order created successfully",
  "order": {
    "_id": "65f12345678abcdef0123456",
    "orderNumber": 1025,
    "hotel": {
      "_id": "65b98765432fedcba987654",
      "name": "Grand Plaza Hotel"
    },
    "orderType": "roomService",
    "roomNumber": "101",
    "customerName": "John Doe",
    "items": [
      {
        "menuItem": {
          "_id": "65d12345678abcdef0123456",
          "name": "Club Sandwich",
          "price": 18.00,
          "category": "Main Course"
        },
        "quantity": 2,
        "price": 18.00,
        "subtotal": 36.00,
        "specialInstructions": "No onions"
      },
      {
        "name": "Extra Towels",
        "price": 0,
        "quantity": 3,
        "subtotal": 0
      }
    ],
    "totalPrice": 48.00,
    "status": "pending",
    "priority": "normal",
    "orderBy": {
      "_id": "65g12345678abcdef0123456",
      "fullname": "Alice Waiter"
    },
    "createdAt": "2026-03-15T19:30:00.000Z"
  }
}
```

---

#### Step 2: Update Order Status (Chef)

**Request**:
```http
PUT /api/orders/65f12345678abcdef0123456/status HTTP/1.1
Host: api.stayhaven.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "status": "preparing"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Order status updated to preparing",
  "order": {
    "_id": "65f12345678abcdef0123456",
    "orderNumber": 1025,
    "status": "preparing",
    "updatedAt": "2026-03-15T19:35:00.000Z"
  }
}
```

**WebSocket Emission** (to waiters):
```json
{
  "event": "order-status-updated",
  "data": {
    "orderId": "65f12345678abcdef0123456",
    "orderNumber": 1025,
    "status": "preparing",
    "roomNumber": "101",
    "orderType": "roomService",
    "updatedBy": "Chef Alice",
    "updaterId": "65h12345678abcdef0123456",
    "message": "🍳 Kitchen: Order #1025 is now preparing"
  }
}
```

---

#### Step 3: Mark Order Ready

**Request**:
```http
PUT /api/orders/65f12345678abcdef0123456/status HTTP/1.1
Host: api.stayhaven.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "status": "ready"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Order marked as ready",
  "order": {
    "_id": "65f12345678abcdef0123456",
    "orderNumber": 1025,
    "status": "ready",
    "preparationTime": 18,
    "updatedAt": "2026-03-15T19:48:00.000Z"
  }
}
```

**WebSocket Emission** (order-ready to waiters):
```json
{
  "event": "order-ready",
  "data": {
    "orderId": "65f12345678abcdef0123456",
    "orderNumber": 1025,
    "status": "ready",
    "customerName": "John Doe",
    "location": "Room 101",
    "message": "Order #1025 is ready for pickup!",
    "items": [
      { "name": "Club Sandwich", "quantity": 2 },
      { "name": "Extra Towels", "quantity": 3 }
    ]
  }
}
```

---

## 👥 Staff Operations

### Staff Invitation Flow

#### Step 1: Send Invitation

**Request**:
```http
POST /api/staff/invite HTTP/1.1
Host: api.stayhaven.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "email": "alice.chef@email.com",
  "fullname": "Alice Johnson",
  "role": "chief",
  "companyRole": "chief",
  "assignedProperties": ["65b98765432fedcba987654"],
  "phone": "+1-234-567-8900",
  "expiresIn": "7 days"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Invitation sent successfully to alice.chef@email.com",
  "invitation": {
    "_id": "65e12345678abcdef0123456",
    "email": "alice.chef@email.com",
    "fullname": "Alice Johnson",
    "role": "chief",
    "assignedProperties": [
      {
        "_id": "65b98765432fedcba987654",
        "name": "Grand Plaza Hotel",
        "location": "Kathmandu"
      }
    ],
    "invitedBy": {
      "_id": "65a12345678abcdef0123456",
      "fullname": "John Owner"
    },
    "inviteToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-02-09T10:00:00.000Z",
    "status": "pending",
    "createdAt": "2026-02-02T10:00:00.000Z"
  }
}
```

---

#### Step 2: Accept Invitation

**Request**:
```http
POST /api/staff/invite/accept HTTP/1.1
Host: api.stayhaven.com
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "username": "alice_chef",
  "phone": "+1-234-567-8900"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Account activated successfully. You can now login.",
  "user": {
    "_id": "65f12345678abcdef0123456",
    "fullname": "Alice Johnson",
    "username": "alice_chef",
    "email": "alice.chef@email.com",
    "role": {
      "_id": "65901234567abcdef0123456",
      "name": "chief"
    },
    "assignedProperties": [
      {
        "_id": "65b98765432fedcba987654",
        "name": "Grand Plaza Hotel"
      }
    ],
    "isActive": true
  },
  "redirectPath": "/kitchen-dashboard"
}
```

---

## 👤 User Profile

### Update Profile with Picture Upload

**Request** (Multipart):
```http
PUT /api/users/profile HTTP/1.1
Host: api.stayhaven.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="fullname"

John Michael Doe
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="phone"

+1-555-123-9999
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="image"; filename="profile.jpg"
Content-Type: image/jpeg

[Binary image data]
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

**Response** (200):
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "_id": "65a12345678abcdef0123456",
    "fullname": "John Michael Doe",
    "phone": "+1-555-123-9999",
    "profilePicture": "https://res.cloudinary.com/stayhaven/image/upload/v1707399600/users/johndoe_new.jpg",
    "updatedAt": "2026-02-02T10:00:00.000Z"
  }
}
```

---

## 🔴 Real-time Events

### WebSocket Connection & Events

**Client Connection**:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  
  // Join hotel room
  socket.emit('join-hotel', { hotelId: '65b98765432fedcba987654' });
});

// Listen for new orders
socket.on('new-order', (data) => {
  console.log('New order received:', data);
});

// Listen for order updates
socket.on('order-status-updated', (data) => {
  console.log('Order status updated:', data);
});
```

**New Order Event** (received by kitchen):
```json
{
  "order": {
    "_id": "65f12345678abcdef0123456",
    "orderNumber": 1025,
    "orderType": "roomService",
    "roomNumber": "101",
    "status": "pending",
    "priority": "normal",
    "items": [
      {
        "name": "Club Sandwich",
        "quantity": 2
      }
    ],
    "totalPrice": 36.00,
    "customerName": "John Doe",
    "createdAt": "2026-03-15T19:30:00.000Z"
  },
  "creatorId": "65g12345678abcdef0123456",
  "message": "New order #1025 placed by Alice Waiter"
}
```

---

## 📚 Related Documents

- [API Overview](./api-overview.md)
- [Error Response Format](./error-response-format.md)
- [Real-time Events](./real-time-events.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive request/response samples
