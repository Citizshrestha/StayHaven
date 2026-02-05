# Real-time Architecture

> Socket.IO implementation for real-time features in StayHaven

---

## 📋 Table of Contents

1. [Real-time Features](#real-time-features)
2. [Socket.IO Architecture](#socketio-architecture)
3. [Event System](#event-system)
4. [Room Management](#room-management)
5. [Scalability](#scalability)

---

## ⚡ Real-time Features

### Use Cases

```javascript
const REALTIME_FEATURES = {
  orders: {
    events: ['order:created', 'order:accepted', 'order:preparing', 'order:ready', 'order:delivered'],
    users: ['guests', 'waiters', 'kitchen_staff'],
    purpose: 'Live order tracking and kitchen display system'
  },
  
  waiterCalls: {
    events: ['call:created', 'call:accepted', 'call:completed'],
    users: ['guests', 'waiters'],
    purpose: 'Service request notifications'
  },
  
  notifications: {
    events: ['notification:new', 'notification:read'],
    users: ['all_authenticated'],
    purpose: 'In-app notifications'
  },
  
  presence: {
    events: ['user:online', 'user:offline', 'user:typing'],
    users: ['staff'],
    purpose: 'Online status indicators'
  },
  
  bookings: {
    events: ['booking:created', 'booking:confirmed', 'booking:cancelled'],
    users: ['guests', 'receptionists'],
    purpose: 'Booking status updates'
  }
};
```

### Real-time vs HTTP

| Feature | HTTP/REST | Socket.IO (Real-time) |
|---|---|---|
| **Order notification** | Poll every 30s | Instant push |
| **Waiter call** | Manual refresh | Instant notification |
| **Kitchen display** | Refresh page | Live updates |
| **Chat messages** | Not feasible | Built for it |
| **User presence** | Not feasible | Built for it |

---

## 🔌 Socket.IO Architecture

### Server Architecture

```
┌───────────────────────────────────────────────────┐
│                Express Server                     │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │          HTTP Server                        │ │
│  │  (handles REST API requests)                │ │
│  └─────────────────────────────────────────────┘ │
│                       │                           │
│                       │ Upgraded to WebSocket     │
│                       │                           │
│  ┌────────────────────▼──────────────────────────┐ │
│  │          Socket.IO Server                     │ │
│  │                                               │ │
│  │  ┌─────────────────────────────────────────┐ │ │
│  │  │        Namespace: / (default)           │ │ │
│  │  │                                         │ │ │
│  │  │  ┌──────────────┐  ┌──────────────┐   │ │ │
│  │  │  │  Room:       │  │  Room:       │   │ │ │
│  │  │  │  hotel-101   │  │  hotel-102   │   │ │ │
│  │  │  └──────────────┘  └──────────────┘   │ │ │
│  │  │                                         │ │ │
│  │  │  ┌──────────────┐  ┌──────────────┐   │ │ │
│  │  │  │  Room:       │  │  Room:       │   │ │ │
│  │  │  │  hotel-101-  │  │  user-123    │   │ │ │
│  │  │  │  chiefs      │  │              │   │ │ │
│  │  │  └──────────────┘  └──────────────┘   │ │ │
│  │  └─────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

### Server Setup

```javascript
// server.js
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

// Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,     // 60 seconds
  pingInterval: 25000,    // 25 seconds
  transports: ['websocket', 'polling']
});

// Socket.IO configuration
require('./config/socket')(io);

// Make io accessible in routes
app.set('io', io);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO ready for connections`);
});

module.exports = { app, io };
```

### Socket Configuration

```javascript
// config/socket.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.schema');

module.exports = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      // Get token from handshake
      const token = socket.handshake.auth.token ||
                    socket.handshake.headers.cookie?.split('accessToken=')[1]?.split(';')[0];
      
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      
      // Attach user to socket
      socket.userId = decoded.id;
      socket.user = await User.findById(decoded.id).select('-password -refreshToken');
      
      if (!socket.user) {
        return next(new Error('User not found'));
      }
      
      console.log(`✓ Socket authenticated: ${socket.user.email}`);
      next();
    } catch (error) {
      console.error('Socket authentication failed:', error.message);
      next(new Error('Authentication error'));
    }
  });
  
  // Connection handler
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id} (User: ${socket.user.email})`);
    
    // Auto-join user's personal room
    socket.join(`user-${socket.userId}`);
    
    // Handle hotel join
    socket.on('join:hotel', (hotelId) => {
      socket.join(`hotel-${hotelId}`);
      console.log(`Socket ${socket.id} joined hotel-${hotelId}`);
      
      // Notify others
      socket.to(`hotel-${hotelId}`).emit('user:joined', {
        userId: socket.userId,
        username: socket.user.fullname
      });
    });
    
    // Handle role-specific room join
    socket.on('join:role', ({ hotelId, role }) => {
      const roomName = `hotel-${hotelId}-${role}s`;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined ${roomName}`);
    });
    
    // Handle leave hotel
    socket.on('leave:hotel', (hotelId) => {
      socket.leave(`hotel-${hotelId}`);
      console.log(`Socket ${socket.id} left hotel-${hotelId}`);
    });
    
    // Handle order events
    setupOrderEvents(io, socket);
    
    // Handle waiter call events
    setupWaiterCallEvents(io, socket);
    
    // Handle notification events
    setupNotificationEvents(io, socket);
    
    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id} (${reason})`);
      
      // Notify others
      io.emit('user:offline', { userId: socket.userId });
    });
  });
};

// Order events handler
const setupOrderEvents = (io, socket) => {
  // New order created
  socket.on('order:create', async (orderData) => {
    try {
      // Create order in database (controller logic)
      // const order = await Order.create(orderData);
      
      // Emit to kitchen staff
      io.to(`hotel-${orderData.hotel}-chiefs`).emit('order:created', orderData);
      
      // Emit to waiters
      io.to(`hotel-${orderData.hotel}-waiters`).emit('order:created', orderData);
      
      // Confirm to client
      socket.emit('order:confirmed', { orderId: orderData._id });
    } catch (error) {
      socket.emit('order:error', { message: error.message });
    }
  });
  
  // Order status update
  socket.on('order:status', ({ orderId, status }) => {
    // Update order in database
    // await Order.findByIdAndUpdate(orderId, { orderStatus: status });
    
    // Notify all interested parties
    io.to(`hotel-${orderData.hotel}`).emit('order:updated', {
      orderId,
      status
    });
  });
};

// Waiter call events handler
const setupWaiterCallEvents = (io, socket) => {
  socket.on('waiter:call', (callData) => {
    // Emit to all waiters in hotel
    io.to(`hotel-${callData.hotel}-waiters`).emit('waiter:called', callData);
  });
  
  socket.on('waiter:accept', (callData) => {
    // Notify guest
    io.to(`user-${callData.user}`).emit('waiter:accepted', {
      callId: callData._id,
      waiter: socket.user.fullname
    });
  });
};

// Notification events handler
const setupNotificationEvents = (io, socket) => {
  socket.on('notification:send', (notificationData) => {
    // Send to specific user
    io.to(`user-${notificationData.userId}`).emit('notification:new', notificationData);
  });
  
  socket.on('notification:read', ({ notificationId }) => {
    // Mark as read in database
    // await Notification.findByIdAndUpdate(notificationId, { isRead: true });
  });
};
```

---

## 📡 Event System

### Event Naming Convention

```javascript
// Format: resource:action
const EVENT_NAMING = {
  // Order events
  'order:created': 'New order created',
  'order:accepted': 'Order accepted by kitchen',
  'order:preparing': 'Order is being prepared',
  'order:ready': 'Order ready for pickup',
  'order:delivered': 'Order delivered to guest',
  'order:cancelled': 'Order cancelled',
  
  // Waiter call events
  'call:created': 'New service request',
  'call:accepted': 'Waiter accepted request',
  'call:completed': 'Service completed',
  
  // User events
  'user:joined': 'User joined room',
  'user:left': 'User left room',
  'user:online': 'User came online',
  'user:offline': 'User went offline',
  
  // Notification events
  'notification:new': 'New notification',
  'notification:read': 'Notification marked as read'
};
```

### Event Payloads

```javascript
// order:created event
{
  _id: "507f1f77bcf86cd799439011",
  orderNumber: 101,
  hotel: "507f1f77bcf86cd799439012",
  user: "507f1f77bcf86cd799439013",
  items: [
    {
      menuItem: "507f1f77bcf86cd799439014",
      name: "Chicken Burger",
      quantity: 2,
      price: 500
    }
  ],
  totalPrice: 1000,
  orderType: "restaurant",
  tableNumber: 5,
  orderStatus: "pending",
  createdAt: "2026-02-02T10:30:00.000Z"
}

// waiter:called event
{
  _id: "507f1f77bcf86cd799439015",
  hotel: "507f1f77bcf86cd799439012",
  user: "507f1f77bcf86cd799439013",
  requestType: "service",
  description: "Need water",
  tableNumber: 5,
  status: "pending",
  createdAt: "2026-02-02T10:32:00.000Z"
}

// notification:new event
{
  _id: "507f1f77bcf86cd799439016",
  user: "507f1f77bcf86cd799439013",
  type: "order_ready",
  message: "Your order #101 is ready!",
  relatedEntity: {
    entityType: "order",
    entityId: "507f1f77bcf86cd799439011"
  },
  isRead: false,
  createdAt: "2026-02-02T10:45:00.000Z"
}
```

### Emitting Events

```javascript
// Backend: Emit events in controller
const createOrder = asyncHandler(async (req, res) => {
  // Create order
  const order = await Order.create(req.body);
  
  // Get Socket.IO instance
  const io = req.app.get('io');
  
  // Emit to kitchen staff
  io.to(`hotel-${order.hotel}-chiefs`).emit('order:created', order);
  
  // Emit to waiters
  io.to(`hotel-${order.hotel}-waiters`).emit('order:created', order);
  
  // Emit to user (confirmation)
  io.to(`user-${order.user}`).emit('order:confirmed', {
    orderId: order._id,
    orderNumber: order.orderNumber
  });
  
  res.status(201).json({
    success: true,
    data: order
  });
});

// Frontend: Listen for events
import { useSocket } from '../hooks/useSocket';

const KitchenDashboard = () => {
  const { socket } = useSocket();
  const [orders, setOrders] = useState([]);
  
  useEffect(() => {
    if (!socket) return;
    
    // Join kitchen room
    socket.emit('join:role', { hotelId, role: 'chief' });
    
    // Listen for new orders
    socket.on('order:created', (order) => {
      console.log('New order:', order);
      setOrders(prev => [...prev, order]);
      playNotificationSound();
      showToast('New order received!');
    });
    
    // Listen for order updates
    socket.on('order:updated', ({ orderId, status }) => {
      setOrders(prev => prev.map(o =>
        o._id === orderId ? { ...o, orderStatus: status } : o
      ));
    });
    
    // Cleanup
    return () => {
      socket.off('order:created');
      socket.off('order:updated');
    };
  }, [socket, hotelId]);
  
  return (
    <div>
      <h1>Kitchen Orders ({orders.length})</h1>
      {orders.map(order => (
        <OrderCard key={order._id} order={order} />
      ))}
    </div>
  );
};
```

---

## 🏠 Room Management

### Room Types

```javascript
const ROOM_TYPES = {
  // Personal rooms (1:1)
  user: 'user-{userId}',
  // Example: user-507f1f77bcf86cd799439011
  
  // Hotel rooms (broadcast to all in hotel)
  hotel: 'hotel-{hotelId}',
  // Example: hotel-507f1f77bcf86cd799439012
  
  // Role-specific rooms (staff by role)
  roleRoom: 'hotel-{hotelId}-{role}s',
  // Example: hotel-507f1f77bcf86cd799439012-chiefs
  //          hotel-507f1f77bcf86cd799439012-waiters
  //          hotel-507f1f77bcf86cd799439012-receptionists
};
```

### Room Join/Leave

```javascript
// Frontend: Join rooms on component mount
useEffect(() => {
  if (!socket) return;
  
  // Join hotel room
  socket.emit('join:hotel', hotelId);
  
  // Join role-specific room
  if (user.companyRole === 'chief') {
    socket.emit('join:role', { hotelId, role: 'chief' });
  }
  
  // Cleanup: Leave rooms on unmount
  return () => {
    socket.emit('leave:hotel', hotelId);
  };
}, [socket, hotelId]);

// Backend: Handle room management
socket.on('join:hotel', (hotelId) => {
  socket.join(`hotel-${hotelId}`);
  
  // Track user's rooms
  if (!socket.rooms) {
    socket.rooms = new Set();
  }
  socket.rooms.add(`hotel-${hotelId}`);
  
  console.log(`Socket ${socket.id} joined hotel-${hotelId}`);
  console.log(`Current rooms:`, Array.from(socket.rooms));
});
```

### Broadcasting Patterns

```javascript
// 1. Broadcast to ALL clients
io.emit('server:announcement', { message: 'Server maintenance in 5 minutes' });

// 2. Broadcast to specific room
io.to('hotel-123').emit('order:created', orderData);

// 3. Broadcast to multiple rooms
io.to('hotel-123').to('hotel-124').emit('notification', data);

// 4. Broadcast to all EXCEPT sender
socket.broadcast.emit('user:typing', { userId: socket.userId });

// 5. Broadcast to room EXCEPT sender
socket.to('hotel-123').emit('order:updated', orderData);

// 6. Send to specific socket
io.to(socketId).emit('message', data);

// 7. Send to specific user (all their sockets)
io.to(`user-${userId}`).emit('notification', data);

// 8. Conditional broadcast
const sockets = await io.in('hotel-123').fetchSockets();
sockets.forEach(socket => {
  if (socket.user.role === 'waiter') {
    socket.emit('waiter:task', taskData);
  }
});
```

---

## 📈 Scalability

### Load Balancing (Future)

```javascript
// Multiple Socket.IO servers with Redis adapter
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ host: 'localhost', port: 6379 });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

// Now multiple servers can communicate
// Server 1 emits → Redis pub/sub → Server 2,3,4 receive
```

### Connection Pooling

```javascript
// Limit connections per server
const io = new Server(httpServer, {
  maxHttpBufferSize: 1e6,      // 1 MB
  pingTimeout: 60000,           // 60 seconds
  pingInterval: 25000,          // 25 seconds
  upgradeTimeout: 10000,        // 10 seconds
  maxHttpBufferSize: 1e8,       // 100 MB
  allowEIO3: true               // Support older clients
});

// Monitor connections
io.engine.on('connection_error', (err) => {
  console.error('Connection error:', err.message);
});

io.engine.on('initial_headers', (headers, req) => {
  headers['X-Custom-Header'] = 'StayHaven';
});
```

### Performance Monitoring

```javascript
// Track active connections
setInterval(() => {
  const sockets = io.sockets.sockets;
  console.log(`Active connections: ${sockets.size}`);
  
  // Track rooms
  const rooms = io.sockets.adapter.rooms;
  console.log(`Active rooms: ${rooms.size}`);
}, 60000); // Every minute

// Track events per second
let eventCount = 0;
io.on('connection', (socket) => {
  socket.onAny(() => {
    eventCount++;
  });
});

setInterval(() => {
  console.log(`Events per second: ${eventCount / 60}`);
  eventCount = 0;
}, 60000);
```

---

## 📚 Related Documents

- [System Architecture Overview](./system-architecture-overview.md)
- [Client-Server Communication](./client-server-communication.md)
- [Backend Architecture](./frontend-backend-architecture.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive real-time architecture with Socket.IO
