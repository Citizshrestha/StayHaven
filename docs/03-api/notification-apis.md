# Notification APIs

> Comprehensive documentation for managing user notifications, real-time delivery, and notification preferences

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Notification Types](#notification-types)
3. [Get Notifications](#get-notifications)
4. [Mark as Read](#mark-as-read)
5. [Delete Notifications](#delete-notifications)
6. [Notification Preferences](#notification-preferences)
7. [Real-time Delivery](#real-time-delivery)

---

## 🔔 Overview

### Notification System Architecture

StayHaven uses a hybrid notification system combining:
- **Database Storage**: Persistent notification history in MongoDB
- **WebSocket Delivery**: Real-time push via Socket.io to connected clients
- **Email Notifications**: Critical updates sent via email (Nodemailer)
- **Push Notifications**: Browser and mobile push (planned)

### Base URL
```
Production: https://api.stayhaven.com/api/notifications
Development: http://localhost:5000/api/notifications
```

---

## 📝 Notification Types

### Complete Type Catalog

| Type | Priority | Description | Recipients |
|------|----------|-------------|------------|
| `booking_confirmed` | high | Booking confirmed by hotel | Guest |
| `booking_cancelled` | high | Booking cancelled | Guest, Hotel |
| `booking_reminder` | medium | Check-in reminder (24h before) | Guest |
| `payment_received` | high | Payment successful | Guest |
| `payment_failed` | high | Payment failed | Guest |
| `review_received` | low | New review on hotel | Hotel owner/manager |
| `hotel_approved` | high | Hotel listing approved | Hotel owner |
| `hotel_rejected` | high | Hotel listing rejected | Hotel owner |
| `hotel_suspended` | high | Hotel suspended | Hotel owner |
| `order_status` | medium | Order status updated | Guest, Staff |
| `order_delivered` | high | Order delivered | Guest |
| `waiter_call` | high | Waiter call received | Waiters |
| `waiter_call_resolved` | medium | Waiter call resolved | Guest |
| `system` | varies | System announcements | All users |
| `promotional` | low | Marketing offers | Opted-in users |
| `account` | medium | Account changes | User |

### Notification Schema

```typescript
interface Notification {
  _id: string;
  user: string;           // User ObjectId (recipient)
  sender?: string;        // User ObjectId (optional sender)
  type: NotificationType;
  title: string;          // Max 100 characters
  message: string;        // Max 500 characters
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;     // URL to navigate on click
  payload?: Map<string, any>;  // Additional data
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 📬 Get Notifications

### 1. Get User Notifications

**Endpoint**: `GET /api/notifications`

**Authorization**: Required (JWT Access Token)

**Description**: Get paginated list of user's notifications

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `type`: Filter by notification type
- `priority`: Filter by priority (low, medium, high)
- `isRead`: Filter by read status (true, false)
- `startDate`: ISO date, filter from date
- `endDate`: ISO date, filter to date
- `sortBy`: Sort field (createdAt, priority, isRead)
- `sortOrder`: asc or desc (default: desc)

**Example Requests**:

Get all unread notifications:
```bash
curl -X GET 'http://localhost:5000/api/notifications?isRead=false&sortBy=priority&sortOrder=desc' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

Get booking-related notifications:
```bash
curl -X GET 'http://localhost:5000/api/notifications?type=booking_confirmed,booking_cancelled,booking_reminder&limit=10' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

Get high-priority notifications:
```bash
curl -X GET 'http://localhost:5000/api/notifications?priority=high&isRead=false' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Success Response** (200):
```json
{
  "success": true,
  "notifications": [
    {
      "_id": "65f12345678abcdef0123456",
      "user": "65a12345678abcdef0123456",
      "sender": {
        "_id": "65b12345678abcdef0123456",
        "fullname": "Grand Plaza Hotel",
        "profilePicture": "https://res.cloudinary.com/stayhaven/image/upload/v1707390000/hotels/logo.jpg"
      },
      "type": "booking_confirmed",
      "title": "Booking Confirmed!",
      "message": "Your booking at Grand Plaza Hotel (SH-2026-1025) has been confirmed for Feb 15-18, 2026.",
      "priority": "high",
      "actionUrl": "/bookings/65e12345678abcdef0123456",
      "payload": {
        "bookingId": "65e12345678abcdef0123456",
        "confirmationCode": "SH-2026-1025",
        "hotelName": "Grand Plaza Hotel",
        "checkIn": "2026-02-15",
        "checkOut": "2026-02-18"
      },
      "isRead": false,
      "readAt": null,
      "createdAt": "2026-02-02T10:00:00.000Z",
      "updatedAt": "2026-02-02T10:00:00.000Z"
    },
    {
      "_id": "65f22345678abcdef0123456",
      "user": "65a12345678abcdef0123456",
      "sender": null,
      "type": "booking_reminder",
      "title": "Check-in Tomorrow",
      "message": "Your check-in at Grand Plaza Hotel is tomorrow at 2:00 PM. Have a great stay!",
      "priority": "medium",
      "actionUrl": "/bookings/65e12345678abcdef0123456",
      "payload": {
        "bookingId": "65e12345678abcdef0123456",
        "checkIn": "2026-02-15T14:00:00.000Z"
      },
      "isRead": true,
      "readAt": "2026-02-14T08:30:00.000Z",
      "createdAt": "2026-02-14T08:00:00.000Z",
      "updatedAt": "2026-02-14T08:30:00.000Z"
    },
    {
      "_id": "65f32345678abcdef0123456",
      "user": "65a12345678abcdef0123456",
      "sender": {
        "_id": "65c12345678abcdef0123456",
        "fullname": "Alice Johnson",
        "profilePicture": "https://res.cloudinary.com/stayhaven/image/upload/v1707396000/staff/alice.jpg"
      },
      "type": "order_status",
      "title": "Order #1025 Ready",
      "message": "Your order is ready for pickup. Alice Johnson will deliver it shortly.",
      "priority": "medium",
      "actionUrl": "/orders/65d12345678abcdef0123456",
      "payload": {
        "orderId": "65d12345678abcdef0123456",
        "orderNumber": 1025,
        "status": "ready",
        "waiterName": "Alice Johnson"
      },
      "isRead": false,
      "readAt": null,
      "createdAt": "2026-02-02T12:30:00.000Z",
      "updatedAt": "2026-02-02T12:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalNotifications": 87,
    "limit": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "unreadCount": 12
}
```

---

### 2. Get Unread Count

**Endpoint**: `GET /api/notifications/unread-count`

**Authorization**: Required (JWT Access Token)

**Description**: Get count of unread notifications

**Success Response** (200):
```json
{
  "success": true,
  "unreadCount": 12,
  "byPriority": {
    "high": 3,
    "medium": 7,
    "low": 2
  }
}
```

---

### 3. Get Single Notification

**Endpoint**: `GET /api/notifications/:notificationId`

**Authorization**: Required (JWT Access Token)

**Description**: Get details of a specific notification

**Success Response** (200):
```json
{
  "success": true,
  "notification": {
    "_id": "65f12345678abcdef0123456",
    "user": "65a12345678abcdef0123456",
    "sender": {
      "_id": "65b12345678abcdef0123456",
      "fullname": "Grand Plaza Hotel",
      "profilePicture": "https://res.cloudinary.com/stayhaven/image/upload/v1707390000/hotels/logo.jpg"
    },
    "type": "booking_confirmed",
    "title": "Booking Confirmed!",
    "message": "Your booking at Grand Plaza Hotel (SH-2026-1025) has been confirmed for Feb 15-18, 2026.",
    "priority": "high",
    "actionUrl": "/bookings/65e12345678abcdef0123456",
    "payload": {
      "bookingId": "65e12345678abcdef0123456",
      "confirmationCode": "SH-2026-1025",
      "hotelName": "Grand Plaza Hotel",
      "checkIn": "2026-02-15",
      "checkOut": "2026-02-18"
    },
    "isRead": false,
    "readAt": null,
    "createdAt": "2026-02-02T10:00:00.000Z",
    "updatedAt": "2026-02-02T10:00:00.000Z"
  }
}
```

**Error Responses**:

404 - Not Found:
```json
{
  "success": false,
  "message": "Notification not found"
}
```

403 - Unauthorized:
```json
{
  "success": false,
  "message": "You don't have permission to view this notification"
}
```

---

## ✅ Mark as Read

### 1. Mark Single Notification as Read

**Endpoint**: `PATCH /api/notifications/:notificationId/read`

**Authorization**: Required (JWT Access Token)

**Description**: Mark a specific notification as read

**Success Response** (200):
```json
{
  "success": true,
  "message": "Notification marked as read",
  "notification": {
    "_id": "65f12345678abcdef0123456",
    "isRead": true,
    "readAt": "2026-02-02T15:45:00.000Z"
  }
}
```

---

### 2. Mark All as Read

**Endpoint**: `PATCH /api/notifications/mark-all-read`

**Authorization**: Required (JWT Access Token)

**Description**: Mark all user's notifications as read

**Success Response** (200):
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "markedCount": 12
}
```

---

### 3. Mark Multiple as Read (Bulk)

**Endpoint**: `PATCH /api/notifications/bulk-read`

**Authorization**: Required (JWT Access Token)

**Description**: Mark multiple notifications as read

**Request Body**:
```json
{
  "notificationIds": [
    "65f12345678abcdef0123456",
    "65f22345678abcdef0123456",
    "65f32345678abcdef0123456"
  ]
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Notifications marked as read",
  "markedCount": 3,
  "failed": []
}
```

**Partial Success** (200):
```json
{
  "success": true,
  "message": "Some notifications marked as read",
  "markedCount": 2,
  "failed": [
    {
      "notificationId": "65f32345678abcdef0123456",
      "reason": "Not found or already read"
    }
  ]
}
```

---

## 🗑️ Delete Notifications

### 1. Delete Single Notification

**Endpoint**: `DELETE /api/notifications/:notificationId`

**Authorization**: Required (JWT Access Token)

**Description**: Permanently delete a notification

**Success Response** (200):
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

**Error Responses**:

404 - Not Found:
```json
{
  "success": false,
  "message": "Notification not found"
}
```

---

### 2. Delete All Notifications

**Endpoint**: `DELETE /api/notifications`

**Authorization**: Required (JWT Access Token)

**Description**: Delete all user's notifications

**Success Response** (200):
```json
{
  "success": true,
  "message": "All notifications deleted",
  "deletedCount": 87
}
```

---

### 3. Delete Read Notifications

**Endpoint**: `DELETE /api/notifications/read`

**Authorization**: Required (JWT Access Token)

**Description**: Delete all read notifications

**Success Response** (200):
```json
{
  "success": true,
  "message": "Read notifications deleted",
  "deletedCount": 75
}
```

---

### 4. Bulk Delete

**Endpoint**: `DELETE /api/notifications/bulk`

**Authorization**: Required (JWT Access Token)

**Description**: Delete multiple notifications

**Request Body**:
```json
{
  "notificationIds": [
    "65f12345678abcdef0123456",
    "65f22345678abcdef0123456"
  ]
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Notifications deleted",
  "deletedCount": 2
}
```

---

## ⚙️ Notification Preferences

### 1. Get Notification Preferences

**Endpoint**: `GET /api/notifications/preferences`

**Authorization**: Required (JWT Access Token)

**Description**: Get user's notification delivery preferences

**Success Response** (200):
```json
{
  "success": true,
  "preferences": {
    "channels": {
      "email": true,
      "sms": false,
      "push": true,
      "inApp": true
    },
    "types": {
      "booking": true,
      "payment": true,
      "order": true,
      "waiterCall": true,
      "promotional": false,
      "newsletter": true,
      "system": true
    },
    "schedule": {
      "quietHours": {
        "enabled": true,
        "start": "22:00",
        "end": "08:00"
      },
      "timezone": "America/New_York"
    },
    "grouping": {
      "enabled": true,
      "interval": 300
    }
  }
}
```

---

### 2. Update Notification Preferences

**Endpoint**: `PUT /api/notifications/preferences`

**Authorization**: Required (JWT Access Token)

**Description**: Update notification delivery preferences

**Request Body**:
```json
{
  "channels": {
    "email": true,
    "sms": true,
    "push": true,
    "inApp": true
  },
  "types": {
    "booking": true,
    "payment": true,
    "order": true,
    "waiterCall": true,
    "promotional": false,
    "newsletter": false,
    "system": true
  },
  "schedule": {
    "quietHours": {
      "enabled": true,
      "start": "23:00",
      "end": "07:00"
    }
  }
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Notification preferences updated successfully",
  "preferences": {
    // updated preferences
  }
}
```

---

### 3. Mute Notifications

**Endpoint**: `POST /api/notifications/mute`

**Authorization**: Required (JWT Access Token)

**Description**: Temporarily mute all notifications

**Request Body**:
```json
{
  "duration": 3600
}
```

**Duration Options**:
- `1800`: 30 minutes
- `3600`: 1 hour (default)
- `7200`: 2 hours
- `14400`: 4 hours
- `86400`: 24 hours

**Success Response** (200):
```json
{
  "success": true,
  "message": "Notifications muted for 1 hour",
  "mutedUntil": "2026-02-02T16:45:00.000Z"
}
```

---

### 4. Unmute Notifications

**Endpoint**: `POST /api/notifications/unmute`

**Authorization**: Required (JWT Access Token)

**Description**: Unmute notifications

**Success Response** (200):
```json
{
  "success": true,
  "message": "Notifications unmuted"
}
```

---

## 🔴 Real-time Delivery

### WebSocket Connection

Notifications are delivered in real-time via Socket.io to connected clients.

**Connection Setup** (Client-Side):
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('accessToken')
  }
});

// Join personal notification room
socket.on('connect', () => {
  console.log('Connected:', socket.id);
  socket.emit('join-user-room', { userId: currentUser._id });
});

// Listen for notifications
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
  
  // Add to notifications list
  setNotifications(prev => [notification, ...prev]);
  
  // Update unread count
  setUnreadCount(prev => prev + 1);
  
  // Show toast
  toast.info(notification.title, {
    description: notification.message,
    action: notification.actionUrl ? {
      label: 'View',
      onClick: () => navigate(notification.actionUrl)
    } : undefined
  });
  
  // Play sound
  if (notification.priority === 'high') {
    playNotificationSound();
  }
});
```

**Server-Side Emission** (Backend):
```javascript
import { io } from '../config/socket.js';

// Send notification to specific user
const sendNotification = async (userId, notification) => {
  // Save to database
  const savedNotification = await Notification.create({
    user: userId,
    ...notification
  });
  
  // Emit via WebSocket to user's room
  io.to(`user-${userId}`).emit('notification', savedNotification);
  
  // Also send email if enabled in user preferences
  const user = await User.findById(userId).populate('preferences');
  if (user.preferences?.notifications?.email) {
    await sendEmailNotification(user.email, notification);
  }
  
  return savedNotification;
};

// Example: Booking confirmed notification
const notifyBookingConfirmed = async (bookingId) => {
  const booking = await Booking.findById(bookingId)
    .populate('user')
    .populate('hotel');
  
  await sendNotification(booking.user._id, {
    type: 'booking_confirmed',
    title: 'Booking Confirmed!',
    message: `Your booking at ${booking.hotel.name} (${booking.confirmationCode}) has been confirmed.`,
    priority: 'high',
    actionUrl: `/bookings/${booking._id}`,
    payload: {
      bookingId: booking._id,
      confirmationCode: booking.confirmationCode,
      hotelName: booking.hotel.name,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut
    }
  });
};
```

---

### Notification Grouping

For users with high notification volume, group similar notifications together.

**Example**: Multiple order status updates
```javascript
{
  "type": "order_status_group",
  "title": "Order Updates",
  "message": "3 of your orders have been updated",
  "priority": "medium",
  "payload": {
    "orders": [
      { "orderNumber": 1025, "status": "preparing" },
      { "orderNumber": 1026, "status": "ready" },
      { "orderNumber": 1027, "status": "delivered" }
    ]
  }
}
```

---

## 📊 Notification Analytics

### Get User Notification Stats

**Endpoint**: `GET /api/notifications/stats`

**Authorization**: Required (JWT Access Token)

**Query Parameters**:
- `startDate`: ISO date (default: 30 days ago)
- `endDate`: ISO date (default: now)

**Success Response** (200):
```json
{
  "success": true,
  "stats": {
    "total": 127,
    "unread": 12,
    "byType": {
      "booking_confirmed": 8,
      "booking_reminder": 5,
      "order_status": 45,
      "payment_received": 7,
      "system": 12
    },
    "byPriority": {
      "high": 23,
      "medium": 67,
      "low": 37
    },
    "readRate": 0.91,
    "averageReadTime": 3.5,
    "mostActiveHours": [9, 12, 18, 20]
  }
}
```

---

## 📚 Related Documents

- [API Overview](./api-overview.md)
- [Real-time Events](./real-time-events.md)
- [User Management APIs](./user-management-apis.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive notification APIs documentation
