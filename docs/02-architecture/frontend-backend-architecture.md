# Frontend-Backend Architecture

> Detailed breakdown of React frontend and Node.js backend architecture

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Communication Layer](#communication-layer)
5. [State Management](#state-management)

---

## 🏗️ Architecture Overview

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────┐
│          PRESENTATION TIER (Frontend)           │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │          React Application              │   │
│  │                                         │   │
│  │  Components → Hooks → Context → API    │   │
│  └─────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────┘
                     │
                     │ REST API (axios)
                     │ WebSocket (Socket.IO)
                     │
┌────────────────────▼────────────────────────────┐
│         APPLICATION TIER (Backend)              │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │        Express.js Server                │   │
│  │                                         │   │
│  │  Routes → Middleware → Controllers     │   │
│  └─────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────┘
                     │
                     │ Mongoose ODM
                     │
┌────────────────────▼────────────────────────────┐
│            DATA TIER (Database)                 │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │           MongoDB Database              │   │
│  │                                         │   │
│  │  Collections → Documents → Indexes     │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## ⚛️ Frontend Architecture

### Project Structure

```
frontend/
├── public/
│   ├── source/                    # Static assets
│   │   ├── Kathmandu/            # Hotel images by location
│   │   ├── Pokhara/
│   │   └── ...
│   └── index.html
│
├── src/
│   ├── main.jsx                   # Application entry point
│   ├── App.jsx                    # Root component
│   ├── axiosClient.js            # Axios configuration
│   │
│   ├── components/                # React components
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── Home.jsx
│   │   ├── HotelDetails.jsx
│   │   ├── BookingConfirmed.jsx
│   │   │
│   │   ├── guestUsers/           # Guest-specific components
│   │   │   ├── GuestDashboard.jsx
│   │   │   ├── MyBookings.jsx
│   │   │   └── ...
│   │   │
│   │   ├── HotelAdmin/           # Hotel admin dashboard
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── ManageRooms.jsx
│   │   │   └── ...
│   │   │
│   │   ├── KitchenDashboard/     # Kitchen staff interface
│   │   │   ├── KitchenOrders.jsx
│   │   │   └── ...
│   │   │
│   │   ├── WaiterDashboard/      # Waiter interface
│   │   │   ├── ActiveOrders.jsx
│   │   │   └── ...
│   │   │
│   │   └── shared/               # Shared components
│   │       ├── Button.jsx
│   │       ├── Modal.jsx
│   │       └── ...
│   │
│   ├── context/                   # Context providers
│   │   ├── StaffAuthContext.jsx  # Staff authentication
│   │   ├── OrderContext.jsx      # Order management
│   │   ├── SocketContext.jsx     # Socket.IO connection
│   │   └── NotificationContext.jsx
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useSocket.js
│   │   └── useDebounce.js
│   │
│   ├── api/                       # API service layer
│   │   ├── auth.js               # Authentication APIs
│   │   ├── hotel.js              # Hotel APIs
│   │   ├── user.js               # User APIs
│   │   └── staff.js              # Staff APIs
│   │
│   ├── routes/                    # Route configuration
│   │   ├── ProtectedRoute.jsx
│   │   └── PublicRoute.jsx
│   │
│   └── utils/                     # Utility functions
│       ├── formatDate.js
│       ├── validation.js
│       └── constants.js
│
├── package.json
├── vite.config.js                # Vite configuration
└── eslint.config.js              # ESLint rules
```

### Component Architecture

```javascript
// Component hierarchy example
<App>
  <BrowserRouter>
    <Navbar />
    
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/hotels/:id" element={<HotelDetails />} />
      <Route path="/login" element={<Login />} />
      
      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/bookings" element={<MyBookings />} />
      </Route>
      
      {/* Role-specific routes */}
      <Route element={<RoleProtectedRoute role="admin" />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
    
    <Footer />
  </BrowserRouter>
</App>
```

### Context Pattern

```javascript
// StaffAuthContext.jsx - Authentication state
import { createContext, useState, useEffect } from 'react';
import { axiosClient } from '../axiosClient';

export const StaffAuthContext = createContext();

export const StaffAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  const checkAuth = async () => {
    try {
      const response = await axiosClient.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  
  const login = async (email, password) => {
    const response = await axiosClient.post('/api/auth/login', {
      email,
      password
    });
    setUser(response.data.user);
  };
  
  const logout = async () => {
    await axiosClient.post('/api/auth/logout');
    setUser(null);
  };
  
  return (
    <StaffAuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </StaffAuthContext.Provider>
  );
};
```

### API Service Layer

```javascript
// api/auth.js - Centralized API calls
import { axiosClient } from '../axiosClient';

export const authAPI = {
  // Register new user
  register: async (userData) => {
    const response = await axiosClient.post('/api/auth/register', userData);
    return response.data;
  },
  
  // Login user
  login: async (email, password) => {
    const response = await axiosClient.post('/api/auth/login', {
      email,
      password
    });
    return response.data;
  },
  
  // Get current user
  getMe: async () => {
    const response = await axiosClient.get('/api/auth/me');
    return response.data;
  },
  
  // Logout user
  logout: async () => {
    const response = await axiosClient.post('/api/auth/logout');
    return response.data;
  }
};

// Usage in component
import { authAPI } from '../api/auth';

const Login = () => {
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await authAPI.login(email, password);
      console.log('Logged in:', data.user);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
};
```

### Custom Hooks

```javascript
// hooks/useAuth.js - Authentication hook
import { useContext } from 'react';
import { StaffAuthContext } from '../context/StaffAuthContext';

export const useAuth = () => {
  const context = useContext(StaffAuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within StaffAuthProvider');
  }
  
  return context;
};

// Usage in component
import { useAuth } from '../hooks/useAuth';

const Dashboard = () => {
  const { user, logout } = useAuth();
  
  return (
    <div>
      <h1>Welcome, {user.fullname}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

---

## 🔧 Backend Architecture

### Project Structure

```
Backend/
├── server.js                      # Application entry point
├── package.json
│
├── config/                        # Configuration files
│   ├── db.js                     # MongoDB connection
│   ├── socket.js                 # Socket.IO setup
│   ├── cloudinary.js             # Image upload config
│   └── nodemailer.js             # Email config
│
├── models/                        # Mongoose schemas
│   ├── user.schema.js
│   ├── role.schema.js
│   ├── company.schema.js
│   ├── hotel.schema.js
│   ├── room.schema.js
│   ├── booking.schema.js
│   ├── menuItem.schema.js
│   ├── order.schema.js
│   ├── waitercall.schema.js
│   ├── tableAssignment.schema.js
│   ├── notification.schema.js
│   └── loyalty.schema.js
│
├── controllers/                   # Business logic
│   ├── authController.js         # Authentication
│   ├── userController.js         # User management
│   ├── hotelController.js        # Hotel operations
│   ├── companyController.js      # Company management
│   ├── staffController.js        # Staff operations
│   ├── orderController.js        # Order processing
│   ├── menuController.js         # Menu management
│   ├── tableAssignment.controller.js
│   └── waitercall.controller.js
│
├── routes/                        # Route definitions
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── hotelRoutes.js
│   ├── companyRoutes.js
│   └── staffRoutes.js
│
├── middleware/                    # Custom middleware
│   ├── authMiddleware.js         # JWT verification
│   ├── isAuthenticated.js        # Auth check
│   └── upload.js                 # File upload (Multer)
│
└── utils/                         # Helper functions
    ├── asyncHandler.js           # Async error wrapper
    ├── tokenUtils.js             # JWT utilities
    ├── passwordValidation.js     # Password rules
    └── resetDatabase.js          # DB reset script
```

### Server Setup

```javascript
// server.js - Main application file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const connectDB = require('./config/db');
connectDB();

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/hotels', require('./routes/hotelRoutes'));
app.use('/api/companies', require('./routes/companyRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

require('./config/socket')(io);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server error'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Controller Pattern

```javascript
// controllers/authController.js
const User = require('../models/user.schema');
const asyncHandler = require('../utils/asyncHandler');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { fullname, username, email, password } = req.body;
  
  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({
      success: false,
      message: 'User already exists'
    });
  }
  
  // Create user
  const user = await User.create({
    fullname,
    username,
    email,
    password
  });
  
  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  
  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();
  
  // Set cookies
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000 // 1 hour
  });
  
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user: {
      id: user._id,
      fullname: user.fullname,
      email: user.email
    }
  });
});

module.exports = { registerUser };
```

### Middleware Chain

```javascript
// routes/hotelRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authMiddleware');
const {
  getAllHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel
} = require('../controllers/hotelController');

// Public routes
router.get('/', getAllHotels);
router.get('/:id', getHotelById);

// Protected routes (authentication required)
router.use(protect);

// Owner/Admin only routes (authorization required)
router.post('/', authorize('owner', 'admin'), createHotel);
router.put('/:id', authorize('owner', 'admin'), updateHotel);
router.delete('/:id', authorize('owner'), deleteHotel);

module.exports = router;
```

### Mongoose Model

```javascript
// models/hotel.schema.js
const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hotel name is required'],
    trim: true,
    maxlength: [100, 'Hotel name cannot exceed 100 characters']
  },
  
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  
  address: {
    type: String,
    required: true
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'under_maintenance'],
    default: 'active'
  },
  
  images: [String],
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
hotelSchema.index({ location: '2dsphere' });
hotelSchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('Hotel', hotelSchema);
```

---

## 🔌 Communication Layer

### HTTP Communication (REST API)

```javascript
// Frontend: axiosClient.js
import axios from 'axios';

export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true, // Send cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor (add auth token)
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (handle token refresh)
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const response = await axios.post('/api/auth/refresh');
        const { accessToken } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        return axiosClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

### WebSocket Communication (Socket.IO)

```javascript
// Frontend: SocketContext.jsx
import { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true,
      autoConnect: true
    });
    
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setConnected(true);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  }, []);
  
  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

// Backend: config/socket.js
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join hotel room
    socket.on('join:hotel', (hotelId) => {
      socket.join(`hotel-${hotelId}`);
      console.log(`Socket ${socket.id} joined hotel-${hotelId}`);
    });
    
    // Join role-specific room
    socket.on('join:role', ({ hotelId, role }) => {
      socket.join(`hotel-${hotelId}-${role}s`);
      console.log(`Socket ${socket.id} joined hotel-${hotelId}-${role}s`);
    });
    
    // Handle new order
    socket.on('order:new', async (orderData) => {
      // Broadcast to kitchen staff
      io.to(`hotel-${orderData.hotel}-chiefs`).emit('order:created', orderData);
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};
```

---

## 🗂️ State Management

### Context API Structure

```javascript
// Multiple context providers
<StaffAuthProvider>
  <SocketProvider>
    <OrderProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </OrderProvider>
  </SocketProvider>
</StaffAuthProvider>
```

### Local State vs Global State

```javascript
// Local state (component-specific)
const HotelDetails = () => {
  const [loading, setLoading] = useState(false);
  const [hotel, setHotel] = useState(null);
  
  // Only used in this component
};

// Global state (shared across app)
const OrderContext = createContext();

const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  
  // Shared across multiple components
};
```

---

## 📚 Related Documents

- [System Architecture Overview](./system-architecture-overview.md)
- [Client-Server Communication](./client-server-communication.md)
- [Authentication Architecture](./authentication-architecture.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Detailed frontend-backend architecture
