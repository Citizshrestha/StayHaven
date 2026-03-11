# Client-Server Communication

> Communication protocols, data exchange patterns, and API contracts

---

## 📋 Table of Contents

1. [Communication Protocols](#communication-protocols)
2. [REST API Design](#rest-api-design)
3. [WebSocket Communication](#websocket-communication)
4. [Request-Response Flow](#request-response-flow)
5. [Error Handling](#error-handling)

---

## 🔌 Communication Protocols

### Protocol Overview

```
┌────────────────────────────────────────────┐
│            CLIENT (Browser)                │
│                                            │
│  React App → axios (HTTP) + Socket.IO (WS) │
└────────────┬───────────────┬───────────────┘
             │               │
             │ HTTP/HTTPS    │ WebSocket (WSS)
             │               │
┌────────────▼───────────────▼───────────────┐
│            SERVER (Node.js)                │
│                                            │
│  Express (REST) + Socket.IO Server         │
└────────────────────────────────────────────┘
```

### Protocol Comparison

| Feature | REST API (HTTP) | WebSocket (Socket.IO) |
|---|---|---|
| **Communication** | Request-Response | Bidirectional |
| **Connection** | Stateless | Persistent |
| **Use Case** | CRUD operations | Real-time updates |
| **Overhead** | Higher (headers) | Lower (persistent) |
| **Caching** | Yes (HTTP cache) | No |
| **Examples** | Login, fetch hotels | New orders, notifications |

---

## 🌐 REST API Design

### RESTful Principles

```javascript
// Resource-based URLs
GET    /api/hotels          // Get all hotels
GET    /api/hotels/:id      // Get specific hotel
POST   /api/hotels          // Create hotel
PUT    /api/hotels/:id      // Update hotel
DELETE /api/hotels/:id      // Delete hotel

// Nested resources
GET    /api/hotels/:id/rooms           // Get hotel rooms
POST   /api/hotels/:id/rooms           // Create room in hotel
GET    /api/hotels/:id/orders          // Get hotel orders
```

### Request Format

```javascript
// POST /api/auth/login
// Request Headers
{
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (...)"
}

// Request Body
{
  "email": "john@example.com",
  "password": "password123"
}

// Frontend code
const response = await axiosClient.post('/api/auth/login', {
  email: 'john@example.com',
  password: 'password123'
});
```

### Response Format

```javascript
// Success Response (200 OK)
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "fullname": "John Doe",
      "email": "john@example.com",
      "role": "guest"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

// Error Response (400 Bad Request)
{
  "success": false,
  "message": "Invalid credentials",
  "errors": [
    {
      "field": "password",
      "message": "Password is incorrect"
    }
  ]
}
```

### HTTP Status Codes

```javascript
const HTTP_STATUS = {
  // Success
  200: 'OK - Request succeeded',
  201: 'Created - Resource created',
  204: 'No Content - Request succeeded, no data',
  
  // Client Errors
  400: 'Bad Request - Invalid input',
  401: 'Unauthorized - Authentication required',
  403: 'Forbidden - Insufficient permissions',
  404: 'Not Found - Resource does not exist',
  409: 'Conflict - Duplicate resource',
  422: 'Unprocessable Entity - Validation failed',
  
  // Server Errors
  500: 'Internal Server Error - Server crash',
  502: 'Bad Gateway - Upstream server error',
  503: 'Service Unavailable - Server overloaded'
};

// Backend usage
res.status(200).json({ success: true, data: hotels });
res.status(201).json({ success: true, data: newHotel });
res.status(400).json({ success: false, message: 'Invalid input' });
res.status(401).json({ success: false, message: 'Unauthorized' });
res.status(404).json({ success: false, message: 'Hotel not found' });
```

### Authentication Headers

```javascript
// Frontend: Send JWT token
axiosClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

// Backend: Verify token
const protect = async (req, res, next) => {
  let token;
  
  // Get token from header
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Or get from cookie
  if (!token && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};
```

### CORS Configuration

```javascript
// Backend: server.js
const cors = require('cors');

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Frontend: axiosClient.js
const axiosClient = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true // Send cookies with requests
});
```

---

## ⚡ WebSocket Communication

### Socket.IO Connection

```javascript
// Frontend: Connect to Socket.IO
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  withCredentials: true,
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// Connection events
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### Room-Based Broadcasting

```javascript
// Backend: Socket.IO rooms
io.on('connection', (socket) => {
  // Join hotel room
  socket.on('join:hotel', (hotelId) => {
    socket.join(`hotel-${hotelId}`);
    console.log(`Socket ${socket.id} joined hotel-${hotelId}`);
  });
  
  // Join role-specific room
  socket.on('join:role', ({ hotelId, role }) => {
    const roomName = `hotel-${hotelId}-${role}s`;
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined ${roomName}`);
  });
  
  // Leave room
  socket.on('leave:hotel', (hotelId) => {
    socket.leave(`hotel-${hotelId}`);
  });
  
  // Broadcast to specific room
  io.to(`hotel-${hotelId}-chiefs`).emit('order:new', orderData);
  
  // Broadcast to multiple rooms
  io.to(`hotel-${hotelId}`).to(`hotel-${hotelId}-waiters`).emit('order:ready', orderData);
  
  // Broadcast to everyone except sender
  socket.broadcast.emit('user:online', { userId: socket.userId });
});
```

### Event Patterns

```javascript
// Frontend: Emit events
socket.emit('order:create', {
  hotel: hotelId,
  items: [...],
  orderType: 'restaurant'
});

// Frontend: Listen for events
socket.on('order:created', (order) => {
  console.log('New order created:', order);
  setOrders(prev => [...prev, order]);
  playNotificationSound();
});

socket.on('order:status', ({ orderId, status }) => {
  console.log(`Order ${orderId} status: ${status}`);
  updateOrderStatus(orderId, status);
});

// Backend: Handle events
socket.on('order:create', async (orderData) => {
  try {
    // Create order in database
    const order = await Order.create(orderData);
    
    // Emit to kitchen staff
    io.to(`hotel-${orderData.hotel}-chiefs`).emit('order:created', order);
    
    // Emit confirmation to client
    socket.emit('order:confirmed', { orderId: order._id });
  } catch (error) {
    socket.emit('order:error', { message: error.message });
  }
});
```

### Acknowledgements

```javascript
// Frontend: Request with acknowledgement
socket.emit('order:create', orderData, (response) => {
  if (response.success) {
    console.log('Order created:', response.order);
  } else {
    console.error('Order failed:', response.error);
  }
});

// Backend: Send acknowledgement
socket.on('order:create', async (orderData, callback) => {
  try {
    const order = await Order.create(orderData);
    callback({ success: true, order });
  } catch (error) {
    callback({ success: false, error: error.message });
  }
});
```

### Authentication with Socket.IO

```javascript
// Backend: Authenticate socket connection
const jwt = require('jsonwebtoken');

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
    socket.user = await User.findById(decoded.id);
    
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Frontend: Send token with connection
const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('accessToken')
  }
});
```

---

## 🔄 Request-Response Flow

### Complete Flow Example: Create Booking

```
1. USER ACTION (Frontend)
   ↓
   User clicks "Book Room" button
   ↓
   
2. EVENT HANDLER (React Component)
   ↓
   const handleBooking = async () => {
     try {
       const response = await bookingAPI.create(bookingData);
       // Success handling
     } catch (error) {
       // Error handling
     }
   }
   ↓
   
3. API CALL (axios)
   ↓
   POST http://localhost:5000/api/bookings
   Headers: {
     "Content-Type": "application/json",
     "Authorization": "Bearer eyJhbGciOi..."
   }
   Body: {
     "hotel": "507f1f77bcf86cd799439011",
     "room": "507f1f77bcf86cd799439012",
     "checkInDate": "2026-03-01",
     "checkOutDate": "2026-03-05"
   }
   ↓
   
4. SERVER RECEIVES (Express)
   ↓
   app.post('/api/bookings', protect, authorize('guest'), createBooking)
   ↓
   
5. MIDDLEWARE CHAIN
   ↓
   protect: Verify JWT token
   authorize: Check user role
   ↓
   
6. CONTROLLER (bookingController.js)
   ↓
   const createBooking = async (req, res) => {
     // Validate input
     // Start transaction
     // Create booking
     // Update room status
     // Send notification
     // Emit Socket.IO event
   }
   ↓
   
7. DATABASE OPERATIONS (MongoDB)
   ↓
   - Insert booking document
   - Update room status
   - Create notification
   ↓
   
8. RESPONSE (Express)
   ↓
   res.status(201).json({
     success: true,
     data: booking
   })
   ↓
   
9. CLIENT RECEIVES (axios)
   ↓
   response = {
     data: {
       success: true,
       data: { ... }
     }
   }
   ↓
   
10. UI UPDATE (React)
    ↓
    - Update state
    - Show success message
    - Redirect to booking details
    
11. REAL-TIME NOTIFICATION (Socket.IO)
    ↓
    io.to(`user-${userId}`).emit('booking:created', booking)
    ↓
    Client receives notification
    ↓
    Display notification toast
```

### Parallel Requests

```javascript
// Frontend: Multiple API calls
const fetchDashboardData = async () => {
  try {
    // Parallel requests
    const [hotels, bookings, orders] = await Promise.all([
      hotelAPI.getAll(),
      bookingAPI.getMyBookings(),
      orderAPI.getMyOrders()
    ]);
    
    setHotels(hotels);
    setBookings(bookings);
    setOrders(orders);
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
  }
};

// Sequential requests (when one depends on another)
const fetchHotelDetails = async (hotelId) => {
  // First get hotel
  const hotel = await hotelAPI.getById(hotelId);
  
  // Then get hotel rooms (depends on hotel data)
  const rooms = await roomAPI.getByHotel(hotel.id);
  
  // Then get available rooms (depends on rooms data)
  const available = rooms.filter(r => r.status === 'available');
  
  return { hotel, rooms, available };
};
```

---

## ❌ Error Handling

### Frontend Error Handling

```javascript
// API service with error handling
export const bookingAPI = {
  create: async (bookingData) => {
    try {
      const response = await axiosClient.post('/api/bookings', bookingData);
      return response.data;
    } catch (error) {
      // Network error
      if (!error.response) {
        throw new Error('Network error - please check your connection');
      }
      
      // HTTP error
      const { status, data } = error.response;
      
      if (status === 400) {
        throw new Error(data.message || 'Invalid booking data');
      } else if (status === 401) {
        // Redirect to login
        window.location.href = '/login';
        throw new Error('Please login to continue');
      } else if (status === 404) {
        throw new Error('Hotel or room not found');
      } else {
        throw new Error('Something went wrong - please try again');
      }
    }
  }
};

// Component error handling
const BookingForm = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      await bookingAPI.create(bookingData);
      // Success - redirect
      navigate('/bookings');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* Form fields */}
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Book Now'}
      </button>
    </form>
  );
};
```

### Backend Error Handling

```javascript
// Global error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server error'
  });
});

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Usage in controller
if (!hotel) {
  throw new AppError('Hotel not found', 404);
}
```

### Socket.IO Error Handling

```javascript
// Frontend: Socket error handling
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  setConnectionStatus('disconnected');
  showNotification('Connection lost - retrying...');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
  showNotification('An error occurred');
});

// Backend: Socket error handling
socket.on('order:create', async (orderData, callback) => {
  try {
    const order = await Order.create(orderData);
    callback({ success: true, order });
  } catch (error) {
    console.error('Order creation failed:', error);
    callback({ success: false, error: error.message });
  }
});
```

---

## 📊 Communication Patterns Summary

| Pattern | Protocol | Use Case | Example |
|---|---|---|---|
| **Request-Response** | HTTP/REST | CRUD operations | Get hotels, Create booking |
| **Real-time Push** | WebSocket | Live updates | New order notification |
| **Polling** | HTTP/REST | Check updates | Check order status every 30s |
| **Long Polling** | HTTP/REST | Wait for updates | Wait for payment confirmation |
| **Server-Sent Events** | SSE | One-way updates | Stock price updates |

---

## 📚 Related Documents

- [System Architecture Overview](./system-architecture-overview.md)
- [Frontend-Backend Architecture](./frontend-backend-architecture.md)
- [Authentication Architecture](./authentication-architecture.md)
- [Real-time Architecture](./real-time-architecture.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive client-server communication guide
