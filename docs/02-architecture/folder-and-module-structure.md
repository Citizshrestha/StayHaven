# Folder and Module Structure

> Complete project organization for frontend and backend

---

## 📋 Table of Contents

1. [Project Root Structure](#project-root-structure)
2. [Frontend Structure](#frontend-structure)
3. [Backend Structure](#backend-structure)
4. [Naming Conventions](#naming-conventions)
5. [Module Organization](#module-organization)

---

## 📁 Project Root Structure

```
StayHaven/
├── frontend/                    # React frontend application
│   ├── public/                  # Static assets
│   ├── src/                     # Source code
│   ├── package.json             # Frontend dependencies
│   ├── vite.config.js           # Vite configuration
│   └── index.html               # Entry HTML
│
├── Backend/                     # Express backend application
│   ├── config/                  # Configuration files
│   ├── controllers/             # Route controllers
│   ├── middleware/              # Custom middleware
│   ├── models/                  # Mongoose schemas
│   ├── routes/                  # API routes
│   ├── utils/                   # Utility functions
│   ├── package.json             # Backend dependencies
│   └── server.js                # Entry point
│
├── docs/                        # Documentation
│   ├── 00-overview/             # Project overview docs
│   ├── 02-architecture/         # Architecture docs (this file)
│   ├── 03-api/                  # API documentation
│   ├── 04-backend-nodejs/       # Backend guides
│   ├── 05-security/             # Security docs
│   ├── 06-database/             # Database docs
│   └── 07-exception-logging/    # Error handling docs
│
├── .gitignore                   # Git ignore rules
└── README.md                    # Project readme
```

---

## ⚛️ Frontend Structure

### Complete Frontend Tree

```
frontend/
├── public/                                # Static assets served as-is
│   └── source/                            # Image assets
│       ├── DATABASE_ER_DIAGRAM.md         # Database diagram
│       ├── photo-1607836046730-*.avif     # Sample image
│       ├── Chitwan/                       # Location images
│       ├── Kathmandu/
│       ├── Lumbini/
│       ├── Nagarkot/
│       └── Pokhara/
│
├── src/                                   # Source code
│   ├── main.jsx                           # Application entry point
│   ├── App.jsx                            # Root component
│   ├── App.css                            # Global app styles
│   ├── index.css                          # Base CSS (Tailwind imports)
│   ├── axiosClient.js                     # Configured Axios instance
│   │
│   ├── components/                        # React components
│   │   ├── guestUsers/                    # Guest-facing components
│   │   │   ├── Home.jsx                   # Landing page
│   │   │   ├── HotelDetails.jsx           # Hotel detail view
│   │   │   ├── BookingConfirmed.jsx       # Booking confirmation
│   │   │   ├── FilteredHotels.jsx         # Hotel search results
│   │   │   ├── FeaturedHotels.jsx         # Featured hotels list
│   │   │   ├── Categories.jsx             # Hotel categories
│   │   │   ├── Destination.jsx            # Destinations showcase
│   │   │   ├── Destination.css
│   │   │   ├── Membership.jsx             # Loyalty program info
│   │   │   ├── Membership.css
│   │   │   ├── MembershipPage.jsx         # Loyalty signup
│   │   │   ├── MembershipPage.css
│   │   │   ├── OffersPage.jsx             # Special offers
│   │   │   ├── OffersPage.css
│   │   │   ├── Feedback.jsx               # Guest feedback
│   │   │   ├── Contactus.jsx              # Contact form
│   │   │   └── Contactus.css
│   │   │
│   │   ├── HotelAdmin/                    # Hotel admin dashboard
│   │   │   ├── HotelAdminDashboard.jsx    # Admin overview
│   │   │   ├── HotelNavbar.jsx            # Admin navigation
│   │   │   ├── AddHotel.jsx               # Add new hotel
│   │   │   ├── ManageHotels.jsx           # Hotel management
│   │   │   ├── AddMenu.jsx                # Add menu items
│   │   │   ├── ManageMenus.jsx            # Menu management
│   │   │   ├── ManageOrders.jsx           # Order management
│   │   │   ├── ManageBookings.jsx         # Booking management
│   │   │   ├── ManageStaff.jsx            # Staff management
│   │   │   ├── Reports.jsx                # Analytics/reports
│   │   │   └── Settings.jsx               # Admin settings
│   │   │
│   │   ├── WaiterDashboard/               # Waiter interface
│   │   │   ├── WaiterDashboard.jsx        # Waiter overview
│   │   │   ├── OrderList.jsx              # Active orders
│   │   │   ├── TakeOrder.jsx              # Create new order
│   │   │   ├── ServiceRequests.jsx        # Waiter calls
│   │   │   └── TableStatus.jsx            # Table assignments
│   │   │
│   │   ├── KitchenDashboard/              # Kitchen interface
│   │   │   ├── KitchenDashboard.jsx       # Kitchen overview
│   │   │   ├── OrderQueue.jsx             # Pending orders
│   │   │   ├── ActiveOrders.jsx           # In-progress orders
│   │   │   ├── CompletedOrders.jsx        # Finished orders
│   │   │   └── MenuInventory.jsx          # Ingredient tracking
│   │   │
│   │   ├── ReceptionDashboard/            # Reception interface
│   │   │   ├── ReceptionDashboard.jsx     # Reception overview
│   │   │   ├── CheckIn.jsx                # Guest check-in
│   │   │   ├── CheckOut.jsx               # Guest check-out
│   │   │   ├── RoomStatus.jsx             # Room availability
│   │   │   ├── Reservations.jsx           # Booking calendar
│   │   │   └── GuestList.jsx              # Guest directory
│   │   │
│   │   ├── staff/                         # Staff authentication
│   │   │   ├── StaffLogin.jsx             # Staff login page
│   │   │   └── StaffRegister.jsx          # Staff registration
│   │   │
│   │   ├── HotelDetail/                   # Hotel detail components
│   │   │   ├── RoomCard.jsx               # Room display card
│   │   │   ├── ReviewSection.jsx          # Guest reviews
│   │   │   ├── ImageGallery.jsx           # Photo gallery
│   │   │   └── BookingForm.jsx            # Booking widget
│   │   │
│   │   ├── aboutPage/                     # About page components
│   │   │   ├── AboutUs.jsx                # About page
│   │   │   ├── OurStory.jsx               # Company story
│   │   │   └── Team.jsx                   # Team members
│   │   │
│   │   ├── shared/                        # Shared/reusable components
│   │   │   ├── Navbar.jsx                 # Main navigation
│   │   │   ├── Footer.jsx                 # Footer component
│   │   │   ├── ThemeToggle.jsx            # Dark/light mode
│   │   │   ├── LoadingSpinner.jsx         # Loading indicator
│   │   │   ├── ErrorMessage.jsx           # Error display
│   │   │   ├── Modal.jsx                  # Modal dialog
│   │   │   ├── Button.jsx                 # Custom button
│   │   │   ├── Input.jsx                  # Form input
│   │   │   ├── Select.jsx                 # Dropdown select
│   │   │   └── Card.jsx                   # Card component
│   │   │
│   │   ├── Superadmin/                    # Super admin panel
│   │   │   ├── SuperadminDashboard.jsx    # Admin overview
│   │   │   ├── ManageCompanies.jsx        # Company management
│   │   │   ├── ManageUsers.jsx            # All users
│   │   │   ├── SystemStats.jsx            # Platform analytics
│   │   │   └── SystemSettings.jsx         # Global settings
│   │   │
│   │   ├── Register.jsx                   # Guest registration
│   │   ├── ForgotPassword.jsx             # Password reset
│   │   ├── ResetPassword.jsx              # New password form
│   │   └── GoogleConfirmModal.jsx         # Google OAuth modal
│   │
│   ├── context/                           # React Context providers
│   │   ├── StaffAuthContext.jsx           # Staff authentication
│   │   ├── OrderContext.jsx               # Order state management
│   │   ├── OrderContextDef.js             # Order context types
│   │   ├── SocketContext.jsx              # Socket.IO connection
│   │   ├── NotificationContext.jsx        # Notifications
│   │   └── ThemeContext.jsx               # Dark/light theme
│   │
│   ├── hooks/                             # Custom React hooks
│   │   ├── useAuth.js                     # Authentication hook
│   │   ├── useSocket.js                   # Socket.IO hook
│   │   ├── useDebounce.js                 # Debounce hook
│   │   ├── useLocalStorage.js             # LocalStorage hook
│   │   ├── useFetch.js                    # Data fetching hook
│   │   └── useForm.js                     # Form handling hook
│   │
│   ├── api/                               # API service layer
│   │   ├── auth.js                        # Authentication API
│   │   ├── hotel.js                       # Hotel API
│   │   ├── user.js                        # User API
│   │   ├── staff.js                       # Staff API
│   │   ├── booking.js                     # Booking API
│   │   ├── order.js                       # Order API
│   │   ├── menu.js                        # Menu API
│   │   └── waiterCall.js                  # Waiter call API
│   │
│   ├── routes/                            # Route configurations
│   │   ├── AppRoutes.jsx                  # Main route definitions
│   │   ├── ProtectedRoute.jsx             # Auth-required routes
│   │   ├── PublicRoute.jsx                # Public routes
│   │   └── RoleRoute.jsx                  # Role-based routes
│   │
│   └── utils/                             # Utility functions
│       ├── formatDate.js                  # Date formatting
│       ├── formatCurrency.js              # Currency formatting
│       ├── validation.js                  # Form validation
│       ├── constants.js                   # App constants
│       └── helpers.js                     # Helper functions
│
├── package.json                           # Dependencies & scripts
├── vite.config.js                         # Vite build config
├── eslint.config.js                       # ESLint configuration
├── jsconfig.json                          # JavaScript config
├── index.html                             # HTML entry point
└── README.md                              # Frontend readme
```

### Key Frontend Files

#### main.jsx - Application Entry

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// Context providers
import { StaffAuthProvider } from './context/StaffAuthContext';
import { SocketProvider } from './context/SocketContext';
import { OrderProvider } from './context/OrderContext';
import { NotificationProvider } from './context/NotificationContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <StaffAuthProvider>
        <SocketProvider>
          <OrderProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </OrderProvider>
        </SocketProvider>
      </StaffAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

#### App.jsx - Root Component

```javascript
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';

// Context
import { useStaffAuth } from './context/StaffAuthContext';

// Components
import Home from './components/guestUsers/Home';
import StaffLogin from './components/staff/StaffLogin';
import WaiterDashboard from './components/WaiterDashboard/WaiterDashboard';
import KitchenDashboard from './components/KitchenDashboard/KitchenDashboard';

// Routes
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';

function App() {
  return (
    <div className="App">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/staff/login" element={<StaffLogin />} />
        
        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/waiter" element={
            <RoleRoute allowedRoles={['waiter']}>
              <WaiterDashboard />
            </RoleRoute>
          } />
          
          <Route path="/kitchen" element={
            <RoleRoute allowedRoles={['chief']}>
              <KitchenDashboard />
            </RoleRoute>
          } />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
```

#### axiosClient.js - API Client

```javascript
import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
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

// Response interceptor
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Refresh token
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        
        // Update token
        localStorage.setItem('accessToken', data.accessToken);
        
        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        // Logout on refresh failure
        localStorage.removeItem('accessToken');
        window.location.href = '/staff/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;
```

---

## 🔧 Backend Structure

### Complete Backend Tree

```
Backend/
├── server.js                        # Application entry point
├── package.json                     # Dependencies & scripts
├── .env                             # Environment variables (not in git)
├── .env.example                     # Example env file
├── README.md                        # Backend readme
│
├── config/                          # Configuration files
│   ├── db.js                        # MongoDB connection
│   ├── socket.js                    # Socket.IO setup
│   ├── cloudinary.js                # Cloudinary config
│   └── nodemailer.js                # Email config
│
├── models/                          # Mongoose schemas
│   ├── user.schema.js               # User model
│   ├── role.schema.js               # Role model
│   ├── company.schema.js            # Company (tenant) model
│   ├── hotel.schema.js              # Hotel model
│   ├── room.schema.js               # Room model
│   ├── booking.schema.js            # Booking model
│   ├── loyalty.schema.js            # Loyalty program model
│   ├── menuItem.schema.js           # Menu item model
│   ├── order.schema.js              # Order model
│   ├── waitercall.schema.js         # Waiter call model
│   ├── tableAssignment.schema.js    # Table assignment model
│   └── notification.schema.js       # Notification model
│
├── controllers/                     # Route controllers (business logic)
│   ├── authController.js            # Authentication
│   ├── userController.js            # User management
│   ├── companyController.js         # Company management
│   ├── hotelController.js           # Hotel CRUD
│   ├── menuController.js            # Menu CRUD
│   ├── orderController.js           # Order management
│   ├── staffController.js           # Staff management
│   ├── waitercall.controller.js     # Waiter calls
│   └── tableAssignment.controller.js # Table assignments
│
├── routes/                          # API route definitions
│   ├── authRoutes.js                # /api/auth
│   ├── userRoutes.js                # /api/users
│   ├── companyRoutes.js             # /api/companies
│   ├── hotelRoutes.js               # /api/hotels
│   ├── staffRoutes.js               # /api/staff
│   ├── orderRoutes.js               # /api/orders
│   ├── menuRoutes.js                # /api/menu
│   └── waiterCallRoutes.js          # /api/waiter-calls
│
├── middleware/                      # Custom middleware
│   ├── authMiddleware.js            # protect, authorize
│   ├── isAuthenticated.js           # Check authentication
│   ├── upload.js                    # File upload (Multer)
│   ├── errorHandler.js              # Global error handler
│   ├── validator.js                 # Request validation
│   └── rateLimiter.js               # Rate limiting
│
└── utils/                           # Utility functions
    ├── asyncHandler.js              # Async error wrapper
    ├── tokenUtils.js                # JWT utils
    ├── passwordValidation.js        # Password rules
    ├── emailTemplates.js            # Email templates
    ├── resetDatabase.js             # DB reset script
    └── seedData.js                  # Sample data seeder
```

### Key Backend Files

#### server.js - Entry Point

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import config
const connectDB = require('./config/db');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const staffRoutes = require('./routes/staffRoutes');

// Initialize Express
const app = express();
const httpServer = createServer(app);

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});
require('./config/socket')(io);
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/staff', staffRoutes);

// Error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    errors: err.errors,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## 📝 Naming Conventions

### File Naming

| Type | Convention | Example |
|---|---|---|
| **React Component** | PascalCase.jsx | `UserProfile.jsx`, `HotelCard.jsx` |
| **React Hook** | camelCase.js | `useAuth.js`, `useSocket.js` |
| **API Service** | camelCase.js | `auth.js`, `hotel.js` |
| **Utility** | camelCase.js | `formatDate.js`, `validation.js` |
| **CSS Module** | PascalCase.css | `Navbar.css`, `HotelCard.css` |
| **Backend Model** | camelCase.schema.js | `user.schema.js`, `hotel.schema.js` |
| **Backend Controller** | camelCase Controller.js | `authController.js`, `userController.js` |
| **Backend Route** | camelCase Routes.js | `authRoutes.js`, `hotelRoutes.js` |
| **Config File** | camelCase.js | `db.js`, `socket.js` |

### Variable Naming

```javascript
// Components - PascalCase
const UserProfile = () => {};
const HotelCard = ({ hotel }) => {};

// Functions/methods - camelCase
const getUserData = async () => {};
const handleSubmit = (e) => {};

// Constants - UPPER_SNAKE_CASE
const API_BASE_URL = 'http://localhost:5000/api';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Context - PascalCase with "Context"
const StaffAuthContext = createContext();

// Hooks - camelCase with "use" prefix
const useAuth = () => useContext(StaffAuthContext);

// API services - camelCase with API suffix
const authAPI = { login, register, logout };
```

---

## 🧩 Module Organization

### Feature-Based Organization

```
components/
├── shared/              # Shared across all features
│   ├── Navbar.jsx
│   └── Footer.jsx
│
├── guestUsers/          # Guest feature
│   ├── Home.jsx
│   ├── HotelDetails.jsx
│   └── BookingConfirmed.jsx
│
├── WaiterDashboard/     # Waiter feature
│   ├── WaiterDashboard.jsx
│   ├── OrderList.jsx
│   └── TakeOrder.jsx
│
└── KitchenDashboard/    # Kitchen feature
    ├── KitchenDashboard.jsx
    ├── OrderQueue.jsx
    └── ActiveOrders.jsx
```

### Layer-Based Organization

```
Backend/
├── models/              # Data layer
│   └── user.schema.js
│
├── controllers/         # Business logic layer
│   └── userController.js
│
├── routes/              # API layer
│   └── userRoutes.js
│
└── middleware/          # Cross-cutting concerns
    └── authMiddleware.js
```

---

## 📚 Related Documents

- [System Architecture Overview](./system-architecture-overview.md)
- [Frontend Architecture](./frontend-backend-architecture.md)
- [Backend Deployment](./deployment-architecture.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive folder and module structure
