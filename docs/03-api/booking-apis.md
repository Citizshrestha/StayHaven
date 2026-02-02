# Booking APIs

> Comprehensive documentation for booking and reservation management endpoints

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Booking Lifecycle](#booking-lifecycle)
3. [Guest Booking Operations](#guest-booking-operations)
4. [Staff Booking Operations](#staff-booking-operations)
5. [Availability Checking](#availability-checking)
6. [Booking Modifications](#booking-modifications)
7. [Cancellation and Refunds](#cancellation-and-refunds)
8. [Check-in/Check-out](#check-incheck-out)

---

## 🏨 Overview

### Base URL

```
Production: https://api.stayhaven.com/api/bookings
Development: http://localhost:5000/api/bookings
```

### Booking Status Flow

```
┌──────────┐                                              ┌───────────┐
│          │  1. Create Booking                           │           │
│  Guest   │────────────────────────────────────────────>│  Pending  │
│          │                                              │           │
└──────────┘                                              └─────┬─────┘
                                                                │
                                                                │
                                              ┌─────────────────┴──────────────────┐
                                              │                                    │
                                       2. Confirm                            2. Cancel
                                              │                                    │
                                              ▼                                    ▼
                                        ┌───────────┐                        ┌──────────┐
                                        │           │                        │          │
                                        │ Confirmed │                        │Cancelled │
                                        │           │                        │          │
                                        └─────┬─────┘                        └──────────┘
                                              │
                                      3. Check-in
                                              │
                                              ▼
                                        ┌───────────┐
                                        │           │
                                        │Checked-In │
                                        │           │
                                        └─────┬─────┘
                                              │
                                     4. Check-out
                                              │
                                              ▼
                                        ┌────────────┐
                                        │            │
                                        │Checked-Out │
                                        │            │
                                        └────────────┘
```

### Booking Schema

```typescript
interface Booking {
  _id: string;
  user: string;                    // User ObjectId
  hotel: string;                   // Hotel ObjectId
  company: string;                 // Company ObjectId
  room: string;                    // Room ObjectId
  checkIn: Date;                   // Check-in date
  checkOut: Date;                  // Check-out date
  guests: {
    adults: number;                // Min: 1, Max: 10
    children: number;              // Min: 0, Max: 8
  };
  totalAmount: number;             // Total price
  currency: string;                // 'USD' | 'EUR' | 'GBP' | 'INR' | 'NPR'
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  confirmationCode: string;        // Unique code
  specialRequests?: string;        // Max 500 chars
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  bookingSource: 'web' | 'mobile' | 'admin' | 'api';
  createdAt: Date;
  updatedAt: Date;
}

type BookingStatus = 'Pending' | 'Confirmed' | 'Checked-In' | 'Checked-Out' | 'Cancelled' | 'No-Show';
type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';
```

---

## 🔄 Booking Lifecycle

### 1. Guest Creates Booking

```
User selects dates → Check availability → Create booking → Status: Pending
```

### 2. Confirmation (Auto or Manual)

```
Pending → Confirmation email sent → Status: Confirmed → Confirmation code generated
```

### 3. Check-in Process

```
Guest arrives → Receptionist verifies → Check-in → Status: Checked-In → Room assigned
```

### 4. Stay Period

```
Guest stays → Room service orders → Services used
```

### 5. Check-out Process

```
Guest checks out → Payment settlement → Housekeeping notified → Status: Checked-Out
```

---

## 👥 Guest Booking Operations

### 1. Get My Bookings

Retrieve all bookings for authenticated user.

**Endpoint**: `GET /api/bookings`

**Authentication**: Required (Guest)

**Query Parameters**:

```typescript
{
  status?: string,        // Filter: 'Pending' | 'Confirmed' | 'Checked-In' | 'Checked-Out' | 'Cancelled'
  page?: number,          // Page number (default: 1)
  limit?: number,         // Items per page (default: 10)
  sortBy?: string,        // 'checkIn' | 'createdAt' | 'totalAmount'
  sortOrder?: string      // 'asc' | 'desc' (default: 'desc')
}
```

**Request Example**:

```bash
curl -X GET "http://localhost:5000/api/bookings?status=Confirmed&sortBy=checkIn&sortOrder=asc" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "_id": "65f12345678abcdef012345",
        "hotel": {
          "_id": "65a12345678abcdef012345",
          "name": "Hotel Paradise Kathmandu",
          "location": {
            "city": "Kathmandu",
            "country": "Nepal"
          },
          "images": ["https://res.cloudinary.com/.../hotel1.jpg"],
          "contact": {
            "phone": "+977-1-1234567",
            "email": "info@paradisehotel.com"
          }
        },
        "room": {
          "_id": "65c11111222233334444555",
          "roomNumber": "101",
          "type": "deluxe",
          "name": "Deluxe Room",
          "images": ["https://res.cloudinary.com/.../room101.jpg"]
        },
        "checkIn": "2026-03-01T00:00:00.000Z",
        "checkOut": "2026-03-05T00:00:00.000Z",
        "guests": {
          "adults": 2,
          "children": 1
        },
        "totalAmount": 20000,
        "currency": "NPR",
        "status": "Confirmed",
        "paymentStatus": "paid",
        "confirmationCode": "SH-2026-ABCD1234",
        "specialRequests": "Early check-in if possible, high floor preferred",
        "bookingSource": "web",
        "createdAt": "2026-02-01T10:30:00.000Z",
        "nights": 4,
        "canCancel": true,
        "canModify": true
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalBookings": 28,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 10
    },
    "summary": {
      "upcoming": 5,
      "past": 20,
      "cancelled": 3
    }
  }
}
```

**Business Logic**:

- Returns only bookings for authenticated user
- Populated with hotel and room details
- Sorted by check-in date by default
- Includes computed fields: `nights`, `canCancel`, `canModify`

---

### 2. Get Booking Details

Retrieve detailed information about a specific booking.

**Endpoint**: `GET /api/bookings/:bookingId`

**Authentication**: Required (Guest or Staff)

**Authorization**:

- Guest: Can view own bookings only
- Staff: Can view bookings for assigned hotels

**Path Parameters**:

```typescript
{
  bookingId: string  // MongoDB ObjectId
}
```

**Request Example**:

```bash
curl -X GET "http://localhost:5000/api/bookings/65f12345678abcdef012345" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "data": {
    "_id": "65f12345678abcdef012345",
    "user": {
      "_id": "65g98765432fedcba987654",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "hotel": {
      "_id": "65a12345678abcdef012345",
      "name": "Hotel Paradise Kathmandu",
      "description": "Luxury hotel in the heart of Kathmandu",
      "location": {
        "address": "Thamel, Ward No. 26",
        "city": "Kathmandu",
        "state": "Bagmati",
        "country": "Nepal",
        "zipCode": "44600"
      },
      "images": ["https://..."],
      "contact": {
        "phone": "+977-1-1234567",
        "email": "info@paradisehotel.com"
      },
      "policies": {
        "checkInTime": "14:00",
        "checkOutTime": "12:00",
        "cancellationPolicy": "Free cancellation up to 24 hours before check-in"
      }
    },
    "room": {
      "_id": "65c11111222233334444555",
      "roomNumber": "101",
      "type": "deluxe",
      "name": "Deluxe Room",
      "description": "Spacious room with king-size bed and mountain view",
      "price": 5000,
      "capacity": {
        "adults": 2,
        "children": 1,
        "total": 3
      },
      "amenities": ["wifi", "tv", "ac", "minibar", "safe", "balcony"],
      "images": ["https://..."]
    },
    "checkIn": "2026-03-01T00:00:00.000Z",
    "checkOut": "2026-03-05T00:00:00.000Z",
    "guests": {
      "adults": 2,
      "children": 1
    },
    "totalAmount": 20000,
    "currency": "NPR",
    "status": "Confirmed",
    "paymentStatus": "paid",
    "confirmationCode": "SH-2026-ABCD1234",
    "specialRequests": "Early check-in if possible, high floor preferred",
    "bookingSource": "web",
    "createdAt": "2026-02-01T10:30:00.000Z",
    "updatedAt": "2026-02-01T10:30:00.000Z",
    "nights": 4,
    "pricePerNight": 5000,
    "canCancel": true,
    "canModify": true,
    "cancellationDeadline": "2026-02-29T00:00:00.000Z",
    "daysUntilCheckIn": 27
  }
}
```

**Computed Fields**:

- `nights`: Number of nights (checkOut - checkIn)
- `pricePerNight`: totalAmount / nights
- `canCancel`: Based on cancellation policy
- `canModify`: Based on hotel policy
- `cancellationDeadline`: Date by which free cancellation is allowed
- `daysUntilCheckIn`: Days remaining until check-in

---

### 3. Create Booking

Create a new hotel room booking.

**Endpoint**: `POST /api/bookings`

**Authentication**: Required (Guest)

**Request Headers**:

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body**:

```typescript
{
  hotelId: string,         // Required: Hotel MongoDB ObjectId
  roomId: string,          // Required: Room MongoDB ObjectId
  checkIn: string,         // Required: ISO date (YYYY-MM-DD)
  checkOut: string,        // Required: ISO date (YYYY-MM-DD)
  guests: {
    adults: number,        // Required: Min 1, Max 10
    children: number       // Optional: Min 0, Max 8, Default: 0
  },
  specialRequests?: string, // Optional: Max 500 chars
  bookingSource?: string    // Optional: 'web' | 'mobile', Default: 'web'
}
```

**Request Example**:

```bash
curl -X POST "http://localhost:5000/api/bookings" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "hotelId": "65a12345678abcdef012345",
    "roomId": "65c11111222233334444555",
    "checkIn": "2026-03-01",
    "checkOut": "2026-03-05",
    "guests": {
      "adults": 2,
      "children": 1
    },
    "specialRequests": "Early check-in if possible, high floor preferred"
  }'
```

**Response - Success (201 Created)**:

```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "_id": "65f12345678abcdef012345",
    "hotel": {
      "_id": "65a12345678abcdef012345",
      "name": "Hotel Paradise Kathmandu"
    },
    "room": {
      "_id": "65c11111222233334444555",
      "roomNumber": "101",
      "type": "deluxe"
    },
    "checkIn": "2026-03-01T00:00:00.000Z",
    "checkOut": "2026-03-05T00:00:00.000Z",
    "guests": {
      "adults": 2,
      "children": 1
    },
    "totalAmount": 20000,
    "currency": "NPR",
    "status": "Pending",
    "paymentStatus": "unpaid",
    "confirmationCode": "SH-2026-ABCD1234",
    "specialRequests": "Early check-in if possible, high floor preferred",
    "createdAt": "2026-02-01T10:30:00.000Z"
  }
}
```

**Error Response - Room Not Available (400)**:

```json
{
  "success": false,
  "message": "Room not available for selected dates",
  "error": "ROOM_NOT_AVAILABLE",
  "details": {
    "roomId": "65c11111222233334444555",
    "checkIn": "2026-03-01",
    "checkOut": "2026-03-05",
    "conflictingBookings": [
      {
        "bookingId": "65e98765432fedcba987654",
        "checkIn": "2026-02-28",
        "checkOut": "2026-03-03"
      }
    ]
  }
}
```

**Error Response - Invalid Date Range (400)**:

```json
{
  "success": false,
  "message": "Check-out date must be after check-in date",
  "error": "INVALID_DATE_RANGE"
}
```

**Error Response - Past Date (400)**:

```json
{
  "success": false,
  "message": "Check-in date cannot be in the past",
  "error": "PAST_DATE"
}
```

**Error Response - Capacity Exceeded (400)**:

```json
{
  "success": false,
  "message": "Number of guests exceeds room capacity",
  "error": "CAPACITY_EXCEEDED",
  "details": {
    "requestedGuests": 4,
    "roomCapacity": 3
  }
}
```

**Validation Rules**:

| Field | Validation | Error Message |
|-------|-----------|---------------|
| hotelId | Required, valid ObjectId | "Hotel ID is required" |
| roomId | Required, valid ObjectId | "Room ID is required" |
| checkIn | Required, future date | "Check-in date must be in the future" |
| checkOut | Required, after checkIn | "Check-out must be after check-in" |
| guests.adults | Required, 1-10 | "Adults must be between 1 and 10" |
| guests.children | Optional, 0-8 | "Children must be between 0 and 8" |
| specialRequests | Optional, max 500 chars | "Special requests too long" |

**Business Logic**:

1. Validate dates (future, checkOut > checkIn)
2. Check room availability for date range
3. Validate guest count against room capacity
4. Calculate total amount (nights × room price)
5. Generate unique confirmation code
6. Set initial status to 'Pending'
7. Create booking record
8. Send confirmation email to guest
9. Notify hotel reception (WebSocket)
10. Return booking details

**Price Calculation**:

```javascript
const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
const totalAmount = room.price * nights;
```

**Confirmation Code Format**:

```
SH-{YEAR}-{RANDOM_8_CHARS}
Example: SH-2026-ABCD1234
```

**Side Effects**:

- Booking created in database
- Confirmation email sent to guest
- WebSocket notification to hotel reception
- Room availability updated

---

### 4. Check Room Availability

Check if a room is available for specific dates.

**Endpoint**: `POST /api/bookings/check-availability`

**Authentication**: None (Public)

**Request Body**:

```typescript
{
  hotelId: string,
  roomId: string,
  checkIn: string,    // ISO date
  checkOut: string    // ISO date
}
```

**Request Example**:

```bash
curl -X POST "http://localhost:5000/api/bookings/check-availability" \
  -H "Content-Type: application/json" \
  -d '{
    "hotelId": "65a12345678abcdef012345",
    "roomId": "65c11111222233334444555",
    "checkIn": "2026-03-01",
    "checkOut": "2026-03-05"
  }'
```

**Response - Available (200 OK)**:

```json
{
  "success": true,
  "available": true,
  "data": {
    "room": {
      "_id": "65c11111222233334444555",
      "roomNumber": "101",
      "type": "deluxe",
      "name": "Deluxe Room",
      "price": 5000
    },
    "checkIn": "2026-03-01",
    "checkOut": "2026-03-05",
    "nights": 4,
    "totalAmount": 20000,
    "currency": "NPR"
  }
}
```

**Response - Not Available (200 OK)**:

```json
{
  "success": true,
  "available": false,
  "message": "Room not available for selected dates",
  "alternativeDates": [
    {
      "checkIn": "2026-03-06",
      "checkOut": "2026-03-10",
      "available": true
    }
  ],
  "alternativeRooms": [
    {
      "_id": "65c22222333344445555777",
      "roomNumber": "102",
      "type": "deluxe",
      "price": 5500,
      "available": true
    }
  ]
}
```

**Database Query**:

```javascript
// Check for overlapping bookings
const conflictingBookings = await Booking.find({
  room: roomId,
  status: { $in: ['Confirmed', 'Checked-In', 'Pending'] },
  $or: [
    // New booking starts during existing booking
    { checkIn: { $lte: checkIn }, checkOut: { $gt: checkIn } },
    // New booking ends during existing booking
    { checkIn: { $lt: checkOut }, checkOut: { $gte: checkOut } },
    // New booking encompasses existing booking
    { checkIn: { $gte: checkIn }, checkOut: { $lte: checkOut } }
  ]
});

const available = conflictingBookings.length === 0;
```

---

## 🔧 Booking Modifications

### 1. Update Booking

Modify booking details (before check-in).

**Endpoint**: `PUT /api/bookings/:bookingId`

**Authentication**: Required (Guest)

**Authorization**: Can only update own bookings with status 'Pending' or 'Confirmed'

**Request Body**:

```typescript
{
  checkIn?: string,           // New check-in date
  checkOut?: string,          // New check-out date
  guests?: {
    adults?: number,
    children?: number
  },
  specialRequests?: string
}
```

**Request Example**:

```bash
curl -X PUT "http://localhost:5000/api/bookings/65f12345678abcdef012345" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "checkOut": "2026-03-06",
    "guests": {
      "adults": 2,
      "children": 2
    }
  }'
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "message": "Booking updated successfully",
  "data": {
    "_id": "65f12345678abcdef012345",
    "checkIn": "2026-03-01T00:00:00.000Z",
    "checkOut": "2026-03-06T00:00:00.000Z",
    "guests": {
      "adults": 2,
      "children": 2
    },
    "totalAmount": 25000,
    "nights": 5,
    "updatedAt": "2026-02-02T11:20:00.000Z"
  }
}
```

**Error Response - Cannot Modify (400)**:

```json
{
  "success": false,
  "message": "Cannot modify booking within 24 hours of check-in",
  "error": "MODIFICATION_NOT_ALLOWED"
}
```

**Modification Rules**:

- Can modify: 'Pending', 'Confirmed' status
- Cannot modify: 'Checked-In', 'Checked-Out', 'Cancelled'
- Must be at least 24 hours before check-in
- Date changes require re-checking availability
- Price recalculated if dates change

---

## ❌ Cancellation and Refunds

### Cancel Booking

Cancel an existing booking.

**Endpoint**: `POST /api/bookings/:bookingId/cancel`

**Authentication**: Required (Guest or Staff)

**Authorization**:

- Guest: Can cancel own bookings
- Staff: Can cancel any booking for assigned hotels

**Request Body**:

```typescript
{
  reason?: string  // Optional: cancellation reason
}
```

**Request Example**:

```bash
curl -X POST "http://localhost:5000/api/bookings/65f12345678abcdef012345/cancel" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Change of plans"
  }'
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "_id": "65f12345678abcdef012345",
    "status": "Cancelled",
    "paymentStatus": "refunded",
    "cancellationReason": "Change of plans",
    "cancelledAt": "2026-02-02T11:30:00.000Z",
    "refundAmount": 20000,
    "refundStatus": "processing"
  }
}
```

**Cancellation Policy Implementation**:

```javascript
// Example policy: Free cancellation up to 24 hours before check-in
const hoursUntilCheckIn = (booking.checkIn - Date.now()) / (1000 * 60 * 60);

let refundPercentage = 0;
if (hoursUntilCheckIn >= 24) {
  refundPercentage = 100; // Full refund
} else if (hoursUntilCheckIn >= 12) {
  refundPercentage = 50;  // 50% refund
} else {
  refundPercentage = 0;   // No refund
}

const refundAmount = (booking.totalAmount * refundPercentage) / 100;
```

---

## 🔑 Check-in/Check-out

### 1. Check-in Guest

Check-in a guest (Receptionist only).

**Endpoint**: `POST /api/bookings/:bookingId/check-in`

**Authentication**: Required (Receptionist or Manager)

**Request Body**:

```typescript
{
  actualCheckInTime?: string,  // Optional: ISO timestamp, default: now
  notes?: string               // Optional: check-in notes
}
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "message": "Guest checked in successfully",
  "data": {
    "_id": "65f12345678abcdef012345",
    "status": "Checked-In",
    "checkInTime": "2026-03-01T10:15:00.000Z",
    "roomKey": "101-A",
    "wifiPassword": "Paradise2026"
  }
}
```

**Side Effects**:

- Booking status updated to 'Checked-In'
- Room status updated to 'occupied'
- Guest receives welcome message (WebSocket)
- Housekeeping notified

---

### 2. Check-out Guest

Check-out a guest (Receptionist only).

**Endpoint**: `POST /api/bookings/:bookingId/check-out`

**Authentication**: Required (Receptionist or Manager)

**Request Body**:

```typescript
{
  actualCheckOutTime?: string, // Optional: ISO timestamp, default: now
  feedback?: string,           // Optional: guest feedback
  finalPaymentStatus?: string  // 'paid' | 'partial' | 'unpaid'
}
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "message": "Guest checked out successfully",
  "data": {
    "_id": "65f12345678abcdef012345",
    "status": "Checked-Out",
    "checkOutTime": "2026-03-05T11:45:00.000Z",
    "finalBill": {
      "roomCharges": 20000,
      "serviceCharges": 5000,
      "total": 25000,
      "paid": 25000,
      "balance": 0
    }
  }
}
```

**Side Effects**:

- Booking status updated to 'Checked-Out'
- Room status updated to 'dirty'
- Housekeeping notified for cleaning
- Final bill generated
- Feedback request sent to guest

---

## 📚 Related Documents

- [Hotel Management APIs](./hotel-management-apis.md)
- [Order and KOT APIs](./order-and-kot-apis.md)
- [Authentication APIs](./authentication-apis.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive booking API documentation
