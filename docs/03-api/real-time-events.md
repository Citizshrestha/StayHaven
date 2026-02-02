# Real-time Events Documentation

> Comprehensive documentation for WebSocket-based real-time communication using Socket.io

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Connection Setup](#connection-setup)
3. [Room Structure](#room-structure)
4. [Event Catalog](#event-catalog)
5. [Order Events](#order-events)
6. [Booking Events](#booking-events)
7. [Waiter Call Events](#waiter-call-events)
8. [Notification Events](#notification-events)
9. [Connection Management](#connection-management)

---

## 🔌 Overview

### Socket.io Configuration

StayHaven uses Socket.io v4.8.3 for real-time bidirectional communication between clients and server.

**Server Configuration**:
```javascript
// Backend: server.js
import { Server } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});
```

**Base URL**:
```
Production: wss://api.stayhaven.com
Development: ws://localhost:5000
```

---

## 🔐 Connection Setup

### Client-Side Connection (React)

```javascript
import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const accessToken = localStorage.getItem('accessToken');

  useEffect(() => {
    if (!accessToken) return;

    // Create socket connection with authentication
    const socketInstance = io('http://localhost:5000', {
      auth: {
        token: accessToken
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('✅ Connected to server:', socketInstance.id);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [accessToken]);

  return socket;
};

export default useSocket;
```

### Authentication Middleware

```javascript
// Backend: config/socket.js
import jwt from 'jsonwebtoken';
import { User } from '../models/user.schema.js';

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user from database
    const user = await User.findById(decoded.id).populate('role');
    
    if (!user) {
      return next(new Error('User not found'));
    }

    // Attach user to socket
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});
```

---

## 🏠 Room Structure

### Room Naming Convention

| Room Pattern | Purpose | Who Joins | Example |
|--------------|---------|-----------|---------|
| `user-{userId}` | Personal notifications | Individual user | `user-65a12345678abcdef012345` |
| `hotel-{hotelId}` | Hotel-wide updates | All staff in hotel | `hotel-65b98765432fedcba987654` |
| `hotel-{hotelId}-kitchen` | Kitchen orders | Chefs in hotel | `hotel-65b98765432fedcba987654-kitchen` |
| `hotel-{hotelId}-waiters` | Waiter calls | Waiters in hotel | `hotel-65b98765432fedcba987654-waiters` |
| `hotel-{hotelId}-reception` | Front desk events | Receptionists | `hotel-65b98765432fedcba987654-reception` |
| `role-{roleName}` | Role-specific broadcasts | All users with role | `role-chef`, `role-manager` |
| `company-{companyId}` | Company-wide | All company staff | `company-65c98765432fedcba987654` |

### Joining Rooms (Client-Side)

```javascript
// Join personal room (automatic on connection)
socket.on('connect', () => {
  socket.emit('join-user-room', { userId: currentUser._id });
});

// Join hotel room (staff selects property)
const joinHotel = (hotelId) => {
  socket.emit('join-hotel', { hotelId });
};

// Join role-specific room (automatic based on user role)
socket.emit('join-role-room', { role: currentUser.role });

// Leave hotel room (when switching properties)
const leaveHotel = (hotelId) => {
  socket.emit('leave-hotel', { hotelId });
};
```

### Joining Rooms (Server-Side)

```javascript
// Backend: config/socket.js

io.on('connection', (socket) => {
  const user = socket.user;
  
  // Join personal room
  socket.join(`user-${user._id}`);
  
  // Join role room
  socket.join(`role-${user.role.name}`);
  
  // Join company room (if staff)
  if (user.company) {
    socket.join(`company-${user.company}`);
  }
  
  // Handle hotel room join
  socket.on('join-hotel', ({ hotelId }) => {
    socket.join(`hotel-${hotelId}`);
    
    // Join role-specific hotel room
    if (user.role.name === 'chief') {
      socket.join(`hotel-${hotelId}-kitchen`);
    } else if (user.role.name === 'waiter') {
      socket.join(`hotel-${hotelId}-waiters`);
    } else if (user.role.name === 'receptionist') {
      socket.join(`hotel-${hotelId}-reception`);
    }
    
    socket.emit('joined-hotel', { hotelId, message: 'Successfully joined hotel room' });
  });
  
  // Handle hotel room leave
  socket.on('leave-hotel', ({ hotelId }) => {
    socket.leave(`hotel-${hotelId}`);
    socket.leave(`hotel-${hotelId}-kitchen`);
    socket.leave(`hotel-${hotelId}-waiters`);
    socket.leave(`hotel-${hotelId}-reception`);
    
    socket.emit('left-hotel', { hotelId });
  });
});
```

---

## 📊 Event Catalog

### Complete Event List

| Event Name | Direction | Emitted By | Received By | Purpose |
|-----------|-----------|------------|-------------|---------|
| `connect` | Client ← Server | Server | Client | Connection established |
| `disconnect` | Client ← Server | Server | Client | Connection closed |
| `new-order` | Client ← Server | Server | Kitchen staff | New order created |
| `order-status-updated` | Client ← Server | Server | Staff | Order status changed |
| `order-ready` | Client ← Server | Server | Waiters | Order ready for pickup |
| `order-cancelled` | Client ← Server | Server | All hotel staff | Order cancelled |
| `new-booking` | Client ← Server | Server | Receptionists | New booking created |
| `booking-checked-in` | Client ← Server | Server | All hotel staff | Guest checked in |
| `booking-checked-out` | Client ← Server | Server | Housekeeping | Guest checked out |
| `new-waiter-call` | Client ← Server | Server | Waiters | Guest called waiter |
| `waiter-call-accepted` | Client ← Server | Server | Guest | Waiter accepted call |
| `waiter-call-completed` | Client ← Server | Server | Guest | Service completed |
| `notification` | Client ← Server | Server | Specific user | Personal notification |
| `system-alert` | Client ← Server | Server | All users | System-wide alert |
| `join-hotel` | Client → Server | Client | Server | Join hotel room |
| `leave-hotel` | Client → Server | Client | Server | Leave hotel room |

---

## 🍽️ Order Events

### 1. New Order Created

**Event**: `new-order`

**Emitted To**: `hotel-{hotelId}` (all hotel staff, especially kitchen)

**When**: Order created by waiter

**Payload**:
```typescript
{
  order: {
    _id: string;
    orderNumber: number;
    orderType: 'roomService' | 'dineIn' | 'takeaway';
    tableNumber?: string;
    roomNumber?: string;
    status: 'pending';
    priority: 'normal' | 'high';
    items: OrderItem[];
    totalPrice: number;
    customerName?: string;
    createdAt: Date;
  };
  creatorId: string;  // To filter self-notifications
  message: string;    // e.g., "New order #1025 placed by Alice Waiter"
}
```

**Client Handler**:
```javascript
socket.on('new-order', (data) => {
  // Don't show notification to order creator
  if (data.creatorId === currentUser._id.toString()) {
    return;
  }
  
  // Play notification sound
  playNotificationSound();
  
  // Show toast notification
  toast.success(`New Order #${data.order.orderNumber}`, {
    description: `${data.order.items.length} items, ${data.order.orderType}`,
    action: {
      label: 'View',
      onClick: () => navigate(`/orders/${data.order._id}`)
    }
  });
  
  // Update orders list
  setOrders(prev => [data.order, ...prev]);
  
  // Update counter
  setNewOrdersCount(prev => prev + 1);
});
```

---

### 2. Order Status Updated

**Event**: `order-status-updated`

**Emitted To**: 
- When chef updates: `hotel-{hotelId}-waiters` (only waiters)
- When waiter updates: `hotel-{hotelId}-kitchen` (only kitchen)

**When**: Order status changes in workflow

**Payload**:
```typescript
{
  orderId: string;
  orderNumber: number;
  status: 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  tableNumber?: string;
  roomNumber?: string;
  orderType: 'roomService' | 'dineIn' | 'takeaway';
  updatedAt: Date;
  updatedBy: string;     // Staff name
  updaterId: string;     // To filter self-notifications
  updaterRole: string;   // 'chief' | 'waiter'
  message: string;       // e.g., "🍳 Kitchen: Order #1025 is now preparing"
}
```

**Client Handler (Waiter Dashboard)**:
```javascript
socket.on('order-status-updated', (data) => {
  // Filter self-updates
  if (data.updaterId === currentUser._id.toString()) {
    return;
  }
  
  // Update order in list
  setOrders(prev => 
    prev.map(order => 
      order._id === data.orderId 
        ? { ...order, status: data.status, updatedAt: data.updatedAt }
        : order
    )
  );
  
  // Show notification
  toast.info(data.message);
  
  // If order is ready, highlight it
  if (data.status === 'ready') {
    highlightOrder(data.orderId);
    playAlertSound();
  }
});
```

---

### 3. Order Ready for Pickup

**Event**: `order-ready`

**Emitted To**: `hotel-{hotelId}-waiters` (waiters only)

**When**: Chef marks order as ready

**Payload**:
```typescript
{
  orderId: string;
  orderNumber: number;
  status: 'ready';
  message: string;        // "Order #1025 is ready for pickup!"
  customerName?: string;
  location: string;       // "Room 101" or "Table T-15"
  items: OrderItem[];
}
```

**Client Handler (Waiter App)**:
```javascript
socket.on('order-ready', (data) => {
  // Play urgent notification sound
  playUrgentSound();
  
  // Show modal alert
  Modal.alert({
    title: '🔔 Order Ready!',
    message: `Order #${data.orderNumber} for ${data.customerName || 'Guest'}`,
    location: data.location,
    items: data.items.map(item => `${item.quantity}x ${item.name}`).join(', '),
    actions: [
      {
        label: 'View Order',
        onClick: () => navigate(`/orders/${data.orderId}`)
      },
      {
        label: 'Mark Picked Up',
        onClick: () => updateOrderStatus(data.orderId, 'delivering')
      }
    ]
  });
  
  // Add to priority pickup list
  setPriorityPickups(prev => [...prev, data.orderId]);
});
```

---

### 4. Order Cancelled

**Event**: `order-cancelled`

**Emitted To**: `hotel-{hotelId}` (all hotel staff)

**When**: Order cancelled by waiter or manager

**Payload**:
```typescript
{
  orderId: string;
  orderNumber: number;
  reason?: string;
  cancelledBy: string;  // Staff name
  message: string;
}
```

---

## 🏨 Booking Events

### 1. New Booking Created

**Event**: `new-booking`

**Emitted To**: `hotel-{hotelId}-reception` (receptionists)

**When**: Guest creates booking online

**Payload**:
```typescript
{
  booking: {
    _id: string;
    confirmationCode: string;
    checkIn: Date;
    checkOut: Date;
    room: {
      roomNumber: string;
      type: string;
    };
    guest: {
      name: string;
      email: string;
      phone: string;
    };
    totalAmount: number;
    status: 'Pending' | 'Confirmed';
  };
  message: string;
}
```

**Client Handler (Reception Dashboard)**:
```javascript
socket.on('new-booking', (data) => {
  // Add to bookings list
  setBookings(prev => [data.booking, ...prev]);
  
  // Show notification
  toast.success('New Booking Received', {
    description: `${data.booking.guest.name} - Room ${data.booking.room.roomNumber}`,
    action: {
      label: 'Review',
      onClick: () => navigate(`/bookings/${data.booking._id}`)
    }
  });
  
  // Play notification sound
  playNotificationSound();
  
  // Update counter
  setPendingBookingsCount(prev => prev + 1);
});
```

---

### 2. Guest Checked In

**Event**: `guest-checked-in`

**Emitted To**: `hotel-{hotelId}` (all staff)

**When**: Receptionist checks in guest

**Payload**:
```typescript
{
  bookingId: string;
  confirmationCode: string;
  room: {
    roomNumber: string;
    type: string;
  };
  guest: {
    name: string;
  };
  checkInTime: Date;
  message: string;  // "John Doe checked into Room 101"
}
```

---

### 3. Guest Checked Out

**Event**: `guest-checked-out`

**Emitted To**: `hotel-{hotelId}-reception`, housekeeping

**When**: Receptionist checks out guest

**Payload**:
```typescript
{
  bookingId: string;
  room: {
    roomNumber: string;
    type: string;
  };
  guest: {
    name: string;
  };
  checkOutTime: Date;
  requiresCleaning: boolean;
  message: string;
}
```

**Client Handler (Housekeeping App)**:
```javascript
socket.on('guest-checked-out', (data) => {
  if (data.requiresCleaning) {
    // Add room to cleaning queue
    setCleaningQueue(prev => [...prev, {
      roomNumber: data.room.roomNumber,
      priority: 'normal',
      checkedOutAt: data.checkOutTime
    }]);
    
    toast.info('Room Needs Cleaning', {
      description: `Room ${data.room.roomNumber} - Guest checked out`
    });
  }
});
```

---

## 🔔 Waiter Call Events

### 1. New Waiter Call

**Event**: `new-waiter-call`

**Emitted To**: `hotel-{hotelId}-waiters` (waiters only)

**When**: Guest presses call waiter button

**Payload**:
```typescript
{
  call: {
    _id: string;
    type: 'service' | 'bill' | 'complaint' | 'assistance';
    roomNumber?: string;
    tableNumber?: string;
    guest: {
      name?: string;
      phone?: string;
    };
    urgency: 'normal' | 'urgent';
    notes?: string;
    createdAt: Date;
  };
  message: string;  // "Waiter call from Room 101"
}
```

**Client Handler (Waiter App)**:
```javascript
socket.on('new-waiter-call', (data) => {
  // Play alert sound
  playAlertSound();
  
  // Vibrate device (mobile)
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
  
  // Show notification
  toast.warning('Waiter Call!', {
    description: `${data.call.type} - ${data.call.roomNumber || data.call.tableNumber}`,
    duration: 0,  // Don't auto-dismiss
    action: {
      label: 'Accept',
      onClick: () => acceptWaiterCall(data.call._id)
    }
  });
  
  // Add to calls list
  setWaiterCalls(prev => [data.call, ...prev]);
  
  // Update counter
  setPendingCallsCount(prev => prev + 1);
});
```

---

### 2. Waiter Call Accepted

**Event**: `waiter-call-accepted`

**Emitted To**: `user-{guestId}` (guest who made call)

**When**: Waiter accepts the call

**Payload**:
```typescript
{
  callId: string;
  waiter: {
    _id: string;
    name: string;
    profilePicture?: string;
  };
  estimatedArrival: number;  // minutes
  message: string;  // "Alice Waiter is on the way"
}
```

**Client Handler (Guest App)**:
```javascript
socket.on('waiter-call-accepted', (data) => {
  // Update call status
  setWaiterCall(prev => ({
    ...prev,
    status: 'accepted',
    waiter: data.waiter,
    acceptedAt: new Date()
  }));
  
  // Show notification
  toast.success('Waiter Responding', {
    description: `${data.waiter.name} will arrive in ~${data.estimatedArrival} minutes`
  });
  
  // Update UI
  setCallStatus('Waiter on the way...');
});
```

---

### 3. Waiter Call Completed

**Event**: `waiter-call-completed`

**Emitted To**: `user-{guestId}` (guest), `hotel-{hotelId}` (stats tracking)

**When**: Waiter marks service as completed

**Payload**:
```typescript
{
  callId: string;
  completedAt: Date;
  waiter: {
    name: string;
  };
  message: string;
}
```

---

## 🔔 Notification Events

### 1. Personal Notification

**Event**: `notification`

**Emitted To**: `user-{userId}` (specific user)

**When**: System or staff sends notification to user

**Payload**:
```typescript
{
  _id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: any;           // Additional context data
  actionUrl?: string;   // URL to navigate on click
  read: boolean;
  createdAt: Date;
}
```

**Client Handler**:
```javascript
socket.on('notification', (notification) => {
  // Add to notifications list
  setNotifications(prev => [notification, ...prev]);
  
  // Show toast
  const toastType = {
    'info': toast.info,
    'success': toast.success,
    'warning': toast.warning,
    'error': toast.error
  }[notification.type];
  
  toastType(notification.title, {
    description: notification.message,
    action: notification.actionUrl ? {
      label: 'View',
      onClick: () => navigate(notification.actionUrl)
    } : undefined
  });
  
  // Update unread count
  setUnreadCount(prev => prev + 1);
  
  // Play sound
  playNotificationSound();
});
```

---

### 2. System Alert

**Event**: `system-alert`

**Emitted To**: All connected users or specific roles

**When**: Critical system event

**Payload**:
```typescript
{
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  action?: {
    label: string;
    url: string;
  };
}
```

---

## 🔧 Connection Management

### Heartbeat/Ping-Pong

Server automatically sends ping every 25 seconds, expects pong within 60 seconds.

```javascript
// Backend: config/socket.js
io.on('connection', (socket) => {
  let isAlive = true;
  
  socket.on('pong', () => {
    isAlive = true;
  });
  
  const interval = setInterval(() => {
    if (!isAlive) {
      socket.disconnect();
      return;
    }
    isAlive = false;
    socket.emit('ping');
  }, 25000);
  
  socket.on('disconnect', () => {
    clearInterval(interval);
  });
});
```

### Auto-Reconnection

Client automatically attempts to reconnect on disconnect.

```javascript
// Frontend: SocketContext.jsx
const socket = io('http://localhost:5000', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  
  // Re-join rooms
  if (selectedHotel) {
    socket.emit('join-hotel', { hotelId: selectedHotel._id });
  }
  
  // Fetch missed updates
  fetchMissedUpdates();
});

socket.on('reconnect_failed', () => {
  toast.error('Connection Lost', {
    description: 'Unable to reconnect. Please refresh the page.'
  });
});
```

---

## 📚 Related Documents

- [API Overview](./api-overview.md)
- [Order and KOT APIs](./order-and-kot-apis.md)
- [Authentication APIs](./authentication-apis.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive real-time events documentation
