# Socket.IO Server Design

> Comprehensive guide to real-time WebSocket communication with Socket.IO in StayHaven

---

## 📋 Table of Contents

1. [Socket.IO Architecture](#socketio-architecture)
2. [Server Initialization](#server-initialization)
3. [Room Structure](#room-structure)
4. [Event Handlers](#event-handlers)
5. [Real-Time Features](#real-time-features)
6. [Best Practices](#best-practices)

---

## 🏗️ Socket.IO Architecture

### Technology Stack

- **Socket.IO**: 4.8.3
- **Transport**: WebSocket (fallback to HTTP long-polling)
- **Protocol**: Socket.IO protocol v4
- **CORS**: Enabled for frontend origin

### Why Socket.IO?

1. **Real-time bidirectional communication** between server and clients
2. **Automatic reconnection** on connection drop
3. **Room-based broadcasting** for targeted messages
4. **Fallback to HTTP long-polling** when WebSocket unavailable
5. **Binary data support** for file transfers

### Use Cases in StayHaven

- **Kitchen Dashboard**: Instant order notifications when guests place orders
- **Waiter Dashboard**: Real-time updates when orders are ready for delivery
- **Reception Dashboard**: Live booking notifications and room availability updates
- **Guest App**: Order status updates (preparing → ready → delivered)
- **Service Calls**: Instant waiter call notifications to staff

---

## 🚀 Server Initialization

### File: `config/socket.js`

```javascript
import { Server } from 'socket.io';

let io;

/**
 * Initialize Socket.IO server
 * @param {http.Server} httpServer - HTTP server instance from Express
 * @returns {Server} Socket.IO server instance
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
    pingTimeout: 60000,  // 60 seconds
    pingInterval: 25000, // 25 seconds
  });

  // Connection event handler
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Join hotel room
    socket.on('join-hotel', (hotelId) => {
      socket.join(`hotel-${hotelId}`);
      console.log(`Socket ${socket.id} joined hotel-${hotelId}`);
    });

    // Join role-specific room
    socket.on('join-role', ({ hotelId, role, userId }) => {
      socket.join(`hotel-${hotelId}-${role}s`);
      socket.join(`user-${userId}`);
      console.log(`Socket ${socket.id} joined hotel-${hotelId}-${role}s and user-${userId}`);
    });

    // Acknowledge waiter call
    socket.on('acknowledge-call', ({ callId, hotelId, waiterId, waiterName }) => {
      io.to(`hotel-${hotelId}`).emit('call-acknowledged', {
        callId,
        waiterId,
        waiterName,
        acknowledgedAt: new Date(),
      });
      console.log(`Waiter ${waiterName} acknowledged call ${callId}`);
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', socket.id, 'Reason:', reason);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
};

/**
 * Get Socket.IO server instance
 * @returns {Server} Socket.IO server instance
 */
export const getIO = () => {
  if (!io) {
    console.warn('Socket.io not initialized. Call initSocket first.');
    return null;
  }
  return io;
};

/**
 * Emit event to all sockets in a hotel
 * @param {string} hotelId - Hotel ID
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
export const emitToHotel = (hotelId, event, data) => {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }
  io.to(`hotel-${hotelId}`).emit(event, data);
};

/**
 * Emit event to specific role in hotel
 * @param {string} hotelId - Hotel ID
 * @param {string} role - Role name (waiter, chief, manager, etc.)
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
export const emitToRole = (hotelId, role, event, data) => {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }
  io.to(`hotel-${hotelId}-${role}s`).emit(event, data);
};

/**
 * Emit event to specific user
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
export const emitToUser = (userId, event, data) => {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }
  io.to(`user-${userId}`).emit(event, data);
};
```

### Server Integration

**File**: `server.js`

```javascript
import express from 'express';
import { createServer } from 'http';
import { initSocket } from './config/socket.js';

const app = express();

// Create HTTP server (required for Socket.IO)
const httpServer = createServer(app);

// Initialize Socket.IO
initSocket(httpServer);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## 🏠 Room Structure

### Room Naming Convention

```
hotel-{hotelId}               # All staff in specific hotel
hotel-{hotelId}-waiters       # All waiters in hotel
hotel-{hotelId}-chiefs        # All kitchen chiefs in hotel
hotel-{hotelId}-managers      # All managers in hotel
hotel-{hotelId}-receptionists # All receptionists in hotel
user-{userId}                 # Personal room for direct messages
```

### Joining Rooms

#### Client-Side (Frontend)

```javascript
import io from 'socket.io-client';

// Connect to server
const socket = io('http://localhost:5000', {
  withCredentials: true,
});

// Join hotel room (all staff)
socket.emit('join-hotel', hotelId);

// Join role-specific room
socket.emit('join-role', {
  hotelId: '123',
  role: 'waiter',
  userId: 'user_456'
});
```

#### Server-Side (Backend)

```javascript
socket.on('join-hotel', (hotelId) => {
  socket.join(`hotel-${hotelId}`);
});

socket.on('join-role', ({ hotelId, role, userId }) => {
  socket.join(`hotel-${hotelId}-${role}s`);
  socket.join(`user-${userId}`);
});
```

---

## 🎯 Event Handlers

### 1. New Order Event

**Controller**: `orderController.js`

```javascript
import { getIO } from '../config/socket.js';

export const createOrder = asyncHandler(async (req, res) => {
  // Create order in database
  const order = await Order.create({
    hotel: req.body.hotel,
    items: req.body.items,
    totalPrice: req.body.totalPrice,
    orderBy: req.user._id,
    status: 'pending',
  });

  // Emit to kitchen chiefs
  const io = getIO();
  io.to(`hotel-${order.hotel}-chiefs`).emit('new-order', {
    order,
    message: `New order #${order.orderNumber} received`,
    timestamp: new Date(),
  });

  res.status(201).json({
    success: true,
    order,
  });
});
```

### 2. Order Status Update

```javascript
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );

  const io = getIO();

  if (req.body.status === 'ready') {
    // Notify waiters
    io.to(`hotel-${order.hotel}-waiters`).emit('order-ready', {
      order,
      message: `Order #${order.orderNumber} is ready for delivery`,
      timestamp: new Date(),
    });
  }

  if (req.body.status === 'delivered') {
    // Notify guest
    io.to(`user-${order.orderBy}`).emit('order-delivered', {
      order,
      message: `Your order #${order.orderNumber} has been delivered`,
      timestamp: new Date(),
    });
  }

  res.json({
    success: true,
    order,
  });
});
```

### 3. Waiter Call

```javascript
export const createWaiterCall = asyncHandler(async (req, res) => {
  const call = await WaiterCall.create({
    hotel: req.body.hotel,
    room: req.body.room,
    tableNumber: req.body.tableNumber,
    requestedBy: req.user._id,
    status: 'pending',
  });

  const io = getIO();

  // Notify all waiters
  io.to(`hotel-${call.hotel}-waiters`).emit('waiter-call', {
    call,
    message: `Service requested at ${call.tableNumber || call.room}`,
    timestamp: new Date(),
  });

  res.status(201).json({
    success: true,
    call,
  });
});
```

### 4. Booking Notification

```javascript
export const createBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.create({
    user: req.user._id,
    hotel: req.body.hotel,
    room: req.body.room,
    checkIn: req.body.checkIn,
    checkOut: req.body.checkOut,
    status: 'Pending',
  });

  const io = getIO();

  // Notify hotel receptionists
  io.to(`hotel-${booking.hotel}-receptionists`).emit('new-booking', {
    booking,
    message: `New booking received for ${booking.room}`,
    timestamp: new Date(),
  });

  res.status(201).json({
    success: true,
    booking,
  });
});
```

---

## 🔄 Real-Time Features

### Feature Matrix

| Feature | Event | Room | Trigger |
|---------|-------|------|---------|
| New Order | `new-order` | `hotel-{id}-chiefs` | Guest places order |
| Order Ready | `order-ready` | `hotel-{id}-waiters` | Chef marks ready |
| Order Delivered | `order-delivered` | `user-{id}` | Waiter delivers |
| Waiter Call | `waiter-call` | `hotel-{id}-waiters` | Guest requests service |
| Call Acknowledged | `call-acknowledged` | `hotel-{id}` | Waiter accepts call |
| New Booking | `new-booking` | `hotel-{id}-receptionists` | Guest books room |
| Booking Confirmed | `booking-confirmed` | `user-{id}` | Admin confirms |

### Broadcasting Patterns

#### 1. Broadcast to All in Hotel

```javascript
io.to(`hotel-${hotelId}`).emit('event-name', data);
```

#### 2. Broadcast to Specific Role

```javascript
io.to(`hotel-${hotelId}-waiters`).emit('event-name', data);
```

#### 3. Broadcast to Specific User

```javascript
io.to(`user-${userId}`).emit('event-name', data);
```

#### 4. Broadcast to Multiple Rooms

```javascript
io.to(`hotel-${hotelId}-waiters`)
  .to(`hotel-${hotelId}-managers`)
  .emit('event-name', data);
```

---

## ✅ Best Practices

### 1. **Always Check io Existence**

```javascript
// Good
const io = getIO();
if (io) {
  io.to(`hotel-${hotelId}`).emit('event', data);
}

// Avoid
getIO().to(`hotel-${hotelId}`).emit('event', data); // May throw error
```

### 2. **Use Consistent Event Names**

```javascript
// Good - kebab-case
socket.emit('new-order');
socket.emit('order-ready');
socket.emit('waiter-call');

// Avoid - mixed styles
socket.emit('NewOrder');
socket.emit('order_ready');
socket.emit('waiterCall');
```

### 3. **Include Timestamps**

```javascript
io.emit('event-name', {
  data: { /* event data */ },
  timestamp: new Date(),
});
```

### 4. **Log Socket Events**

```javascript
socket.on('join-hotel', (hotelId) => {
  socket.join(`hotel-${hotelId}`);
  console.log(`Socket ${socket.id} joined hotel-${hotelId}`);
});
```

### 5. **Handle Disconnections**

```javascript
socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', socket.id, 'Reason:', reason);
  // Clean up user-specific data if needed
});
```

### 6. **Use Room-Based Broadcasting**

```javascript
// Good - targeted broadcasting
io.to(`hotel-${hotelId}-waiters`).emit('event', data);

// Avoid - broadcasting to all clients
io.emit('event', data);
```

### 7. **Validate Data**

```javascript
socket.on('join-hotel', (hotelId) => {
  if (!hotelId) {
    socket.emit('error', { message: 'Hotel ID is required' });
    return;
  }
  socket.join(`hotel-${hotelId}`);
});
```

---

## 📚 Related Documents

- [Backend Overview](./backend-overview.md)
- [Real-Time Events API](../03-api/real-time-events.md)
- [Order Management APIs](../03-api/order-and-kot-apis.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive Socket.IO server design guide
