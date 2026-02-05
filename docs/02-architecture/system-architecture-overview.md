# System Architecture Overview

> High-level architecture and design principles for the StayHaven platform

---

## 📋 Table of Contents

1. [Architecture Vision](#architecture-vision)
2. [System Components](#system-components)
3. [Technology Stack](#technology-stack)
4. [Architecture Patterns](#architecture-patterns)
5. [Data Flow](#data-flow)
6. [Scalability Strategy](#scalability-strategy)

---

## 🎯 Architecture Vision

### Core Principles

```
1. SEPARATION OF CONCERNS
   - Frontend (React SPA)
   - Backend (Node.js/Express REST API)
   - Database (MongoDB)
   - Real-time (Socket.IO)

2. SCALABILITY
   - Horizontal scaling capability
   - Microservices-ready architecture
   - Stateless API design

3. SECURITY-FIRST
   - JWT authentication
   - RBAC authorization
   - Data encryption

4. PERFORMANCE
   - Caching strategies (Redis)
   - Database optimization (indexes)
   - Lazy loading (React)

5. MAINTAINABILITY
   - Clean code principles
   - Modular architecture
   - Comprehensive documentation
```

### Design Philosophy

```javascript
// StayHaven follows these architectural principles:

const ARCHITECTURE_PRINCIPLES = {
  separation: 'Clear boundaries between layers',
  modularity: 'Independent, reusable components',
  consistency: 'Uniform patterns across codebase',
  simplicity: 'KISS - Keep It Simple, Stupid',
  testability: 'Easy to test and maintain',
  security: 'Security by design, not afterthought'
};
```

---

## 🏗️ System Components

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  React   │  │  Axios   │  │Socket.IO │  │  Redux   │      │
│  │   SPA    │  │  Client  │  │  Client  │  │ Context  │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │             │             │             │              │
│       └─────────────┴─────────────┴─────────────┘              │
│                         │                                       │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          │ HTTPS / WSS
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                    API GATEWAY LAYER                            │
├─────────────────────────┼───────────────────────────────────────┤
│                         │                                       │
│               ┌─────────▼─────────┐                            │
│               │  Nginx / Caddy    │                            │
│               │  (Load Balancer)  │                            │
│               └─────────┬─────────┘                            │
│                         │                                       │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                   APPLICATION LAYER                             │
├─────────────────────────┼───────────────────────────────────────┤
│                         │                                       │
│    ┌────────────────────▼───────────────────┐                  │
│    │      Express.js Server                 │                  │
│    │  ┌──────────────────────────────────┐  │                  │
│    │  │     Middleware Pipeline          │  │                  │
│    │  │  ┌────────┐  ┌────────┐         │  │                  │
│    │  │  │ CORS   │  │  Auth  │         │  │                  │
│    │  │  │ Helmet │  │Protect │         │  │                  │
│    │  │  └────────┘  └────────┘         │  │                  │
│    │  └──────────────────────────────────┘  │                  │
│    │                                         │                  │
│    │  ┌──────────────────────────────────┐  │                  │
│    │  │         Route Handlers           │  │                  │
│    │  │  ┌────────┐  ┌────────┐         │  │                  │
│    │  │  │  Auth  │  │ Hotel  │         │  │                  │
│    │  │  │ Routes │  │ Routes │   ...   │  │                  │
│    │  │  └────────┘  └────────┘         │  │                  │
│    │  └──────────────────────────────────┘  │                  │
│    │                                         │                  │
│    │  ┌──────────────────────────────────┐  │                  │
│    │  │         Controllers              │  │                  │
│    │  │  - Request validation            │  │                  │
│    │  │  - Business logic orchestration  │  │                  │
│    │  │  - Response formatting           │  │                  │
│    │  └──────────────────────────────────┘  │                  │
│    │                                         │                  │
│    │  ┌──────────────────────────────────┐  │                  │
│    │  │      Socket.IO Server            │  │                  │
│    │  │  - Real-time events              │  │                  │
│    │  │  - Room management               │  │                  │
│    │  │  - Broadcast notifications       │  │                  │
│    │  └──────────────────────────────────┘  │                  │
│    └─────────────────────────────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ Mongoose ODM
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                     DATA LAYER                                  │
├─────────────────────────┼───────────────────────────────────────┤
│                         │                                       │
│               ┌─────────▼─────────┐                            │
│               │     MongoDB       │                            │
│               │   (Primary DB)    │                            │
│               │                   │                            │
│               │  ┌─────────────┐  │                            │
│               │  │   users     │  │                            │
│               │  │   hotels    │  │                            │
│               │  │   bookings  │  │                            │
│               │  │   orders    │  │                            │
│               │  │   ...       │  │                            │
│               │  └─────────────┘  │                            │
│               └───────────────────┘                            │
│                                                                 │
│               ┌───────────────────┐                            │
│               │      Redis        │                            │
│               │  (Cache & Queue)  │                            │
│               │                   │                            │
│               │  - Session cache  │                            │
│               │  - Rate limiting  │                            │
│               │  - Job queue      │                            │
│               └───────────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                  EXTERNAL SERVICES                              │
├─────────────────────────┼───────────────────────────────────────┤
│                         │                                       │
│     ┌──────────┐  ┌─────┴──────┐  ┌──────────┐  ┌──────────┐ │
│     │Cloudinary│  │  Nodemailer│  │  Stripe  │  │  Google  │ │
│     │ (Images) │  │   (Email)  │  │(Payment) │  │  OAuth   │ │
│     └──────────┘  └────────────┘  └──────────┘  └──────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Client Layer

```javascript
// React SPA with modern tooling
const CLIENT_STACK = {
  framework: 'React 18.3.1',
  buildTool: 'Vite 6.0.13',
  routing: 'React Router DOM 7.1.3',
  stateManagement: ['Context API', 'useState/useReducer'],
  httpClient: 'Axios 1.7.9',
  realTime: 'Socket.IO Client 4.8.3',
  styling: 'CSS3 with custom properties'
};
```

#### 2. API Gateway Layer

```nginx
# Nginx configuration (production)
upstream backend {
    server localhost:5000;
    server localhost:5001;
    server localhost:5002;
}

server {
    listen 80;
    server_name stayhaven.com;
    
    # Frontend (React build)
    location / {
        root /var/www/stayhaven/frontend;
        try_files $uri /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Socket.IO
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

#### 3. Application Layer

```javascript
// Express.js server structure
const express = require('express');
const app = express();

// Middleware pipeline
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use(rateLimiter);
app.use(requestLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', protect, userRoutes);
app.use('/api/hotels', protect, hotelRoutes);
app.use('/api/bookings', protect, bookingRoutes);
app.use('/api/orders', protect, orderRoutes);

// Socket.IO setup
const io = require('socket.io')(server, socketConfig);
io.on('connection', handleSocketConnection);

// Error handling
app.use(errorHandler);
```

#### 4. Data Layer

```javascript
// MongoDB with Mongoose ODM
const MONGODB_COLLECTIONS = {
  users: 'User accounts and authentication',
  roles: 'User roles (admin, owner, manager, etc.)',
  companies: 'Hotel management companies',
  hotels: 'Hotel properties',
  rooms: 'Hotel rooms',
  bookings: 'Room reservations',
  loyalties: 'Loyalty points',
  menuitems: 'Restaurant menu',
  orders: 'Food orders',
  waitercalls: 'Service requests',
  tableassignments: 'Table management',
  notifications: 'User notifications'
};

// Redis for caching
const REDIS_USAGE = {
  sessionCache: 'User session data',
  rateLimiting: 'API rate limit counters',
  jobQueue: 'Background task queue',
  realtimeData: 'Temporary real-time state'
};
```

---

## 💻 Technology Stack

### Complete Stack Overview

```javascript
const TECHNOLOGY_STACK = {
  // Frontend
  frontend: {
    framework: 'React 18.3.1',
    language: 'JavaScript (ES6+)',
    buildTool: 'Vite 6.0.13',
    routing: 'React Router DOM 7.1.3',
    stateManagement: 'Context API + Hooks',
    httpClient: 'Axios 1.7.9',
    realTime: 'Socket.IO Client 4.8.3',
    styling: 'CSS3',
    icons: 'React Icons 5.4.0'
  },
  
  // Backend
  backend: {
    runtime: 'Node.js 20.x LTS',
    framework: 'Express 5.1.0',
    language: 'JavaScript (ES6+)',
    authentication: 'JWT (jsonwebtoken 9.0.2)',
    passwordHashing: 'bcryptjs 2.4.3',
    validation: 'express-validator',
    fileUpload: 'Multer 1.4.5-lts.1',
    realTime: 'Socket.IO 4.8.3'
  },
  
  // Database
  database: {
    primary: 'MongoDB 6.20.0',
    odm: 'Mongoose 8.9.1',
    cache: 'Redis 7.x (planned)',
    backup: 'mongodump/mongorestore'
  },
  
  // External Services
  services: {
    storage: 'Cloudinary',
    email: 'Nodemailer with Gmail OAuth',
    payment: 'Stripe (planned)',
    oauth: 'Google OAuth 2.0'
  },
  
  // DevOps
  devops: {
    versionControl: 'Git + GitHub',
    containerization: 'Docker (planned)',
    ci_cd: 'GitHub Actions (planned)',
    monitoring: 'Winston logger',
    webServer: 'Nginx (production)'
  }
};
```

### Version Matrix

| Category | Technology | Version | Purpose |
|---|---|---|---|
| **Runtime** | Node.js | 20.x LTS | Backend execution |
| **Framework** | Express | 5.1.0 | Web server |
| **Frontend** | React | 18.3.1 | UI library |
| **Build** | Vite | 6.0.13 | Fast dev server |
| **Database** | MongoDB | 6.20.0 | Primary database |
| **ODM** | Mongoose | 8.9.1 | Object modeling |
| **Real-time** | Socket.IO | 4.8.3 | WebSocket communication |
| **Auth** | JWT | 9.0.2 | Token authentication |
| **Encryption** | bcryptjs | 2.4.3 | Password hashing |

---

## 🎨 Architecture Patterns

### 1. Layered Architecture

```
┌──────────────────────────────────────┐
│     PRESENTATION LAYER (React)       │
│  - UI Components                     │
│  - User interactions                 │
│  - State management                  │
└──────────────┬───────────────────────┘
               │
               │ HTTP/REST + WebSocket
               │
┌──────────────▼───────────────────────┐
│     API LAYER (Express Routes)       │
│  - Request validation                │
│  - Authentication/Authorization      │
│  - Response formatting               │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│     BUSINESS LOGIC LAYER             │
│     (Controllers)                    │
│  - Business rules                    │
│  - Data orchestration                │
│  - Transaction management            │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│     DATA ACCESS LAYER                │
│     (Mongoose Models)                │
│  - CRUD operations                   │
│  - Data validation                   │
│  - Query optimization                │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│     DATABASE LAYER (MongoDB)         │
│  - Data persistence                  │
│  - Indexing                          │
│  - Transactions                      │
└──────────────────────────────────────┘
```

### 2. MVC Pattern

```javascript
// Model (Mongoose Schema)
const userSchema = new mongoose.Schema({
  fullname: String,
  email: String,
  password: String
});

// View (React Component)
const UserProfile = ({ user }) => (
  <div>
    <h1>{user.fullname}</h1>
    <p>{user.email}</p>
  </div>
);

// Controller (Express Controller)
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, data: user });
});
```

### 3. Repository Pattern

```javascript
// User Repository (Data Access Layer)
class UserRepository {
  async findById(id) {
    return User.findById(id);
  }
  
  async findByEmail(email) {
    return User.findOne({ email });
  }
  
  async create(userData) {
    return User.create(userData);
  }
  
  async update(id, updates) {
    return User.findByIdAndUpdate(id, updates, { new: true });
  }
}

// Controller uses repository
const userRepository = new UserRepository();

const getUserById = async (req, res) => {
  const user = await userRepository.findById(req.params.id);
  res.json({ data: user });
};
```

### 4. Event-Driven Pattern

```javascript
// Event emitter for notifications
const EventEmitter = require('events');
const notificationEmitter = new EventEmitter();

// Emit event on booking creation
notificationEmitter.on('booking:created', async (booking) => {
  await Notification.create({
    user: booking.user,
    type: 'booking_created',
    message: `Booking confirmed for ${booking.hotel.name}`
  });
  
  // Send Socket.IO notification
  io.to(`user-${booking.user}`).emit('notification', {
    type: 'booking_created',
    booking
  });
});

// Trigger event
await Booking.create(bookingData);
notificationEmitter.emit('booking:created', newBooking);
```

### 5. Middleware Pattern

```javascript
// Express middleware chain
app.use('/api/bookings',
  protect,           // Authentication
  authorize('user'), // Authorization
  validateBooking,   // Validation
  bookingController  // Business logic
);

// Middleware implementation
const protect = async (req, res, next) => {
  // Verify JWT token
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  req.user = await User.findById(decoded.id);
  next();
};
```

---

## 🔄 Data Flow

### Request-Response Flow

```
1. USER ACTION
   ↓
   Browser: Click "Book Room" button
   ↓

2. FRONTEND (React)
   ↓
   Component: handleBooking()
   ↓
   API Call: axios.post('/api/bookings', data)
   ↓

3. API GATEWAY (Nginx)
   ↓
   Load balancer routes to backend server
   ↓

4. MIDDLEWARE PIPELINE
   ↓
   CORS → Helmet → Express.json() → protect → authorize
   ↓

5. ROUTE HANDLER
   ↓
   POST /api/bookings → bookingController.createBooking
   ↓

6. CONTROLLER
   ↓
   - Validate input
   - Start transaction
   - Create booking
   - Update room status
   - Send notification
   ↓

7. DATABASE (MongoDB)
   ↓
   - Insert booking document
   - Update room document
   - Commit transaction
   ↓

8. RESPONSE
   ↓
   Controller sends JSON response
   ↓
   { success: true, data: booking }
   ↓

9. FRONTEND UPDATE
   ↓
   - Update UI
   - Show success message
   - Redirect to booking details
```

### Real-time Data Flow

```
1. SERVER EVENT
   ↓
   New order created
   ↓

2. SOCKET.IO SERVER
   ↓
   io.to(`hotel-${hotelId}-chiefs`).emit('new_order', order)
   ↓

3. SOCKET.IO CLIENT
   ↓
   socket.on('new_order', (order) => { ... })
   ↓

4. REACT COMPONENT
   ↓
   Update state with new order
   ↓
   setOrders(prev => [...prev, order])
   ↓

5. UI UPDATE
   ↓
   Display new order notification
   Play sound alert
```

---

## 📈 Scalability Strategy

### Horizontal Scaling

```
┌────────────────────────────────────────────┐
│           Load Balancer (Nginx)            │
└───┬───────────┬────────────┬───────────────┘
    │           │            │
    ▼           ▼            ▼
┌───────┐   ┌───────┐   ┌───────┐
│Node.js│   │Node.js│   │Node.js│
│Server │   │Server │   │Server │
│ :5000 │   │ :5001 │   │ :5002 │
└───┬───┘   └───┬───┘   └───┬───┘
    │           │            │
    └───────────┴────────────┘
                │
                ▼
         ┌─────────────┐
         │   MongoDB   │
         │ Replica Set │
         └─────────────┘
```

### Caching Strategy

```javascript
// Redis caching layers
const CACHE_STRATEGY = {
  // Layer 1: Browser cache (Service Worker)
  browserCache: {
    static: '1 year',      // Images, fonts, CSS
    api: '5 minutes'       // API responses
  },
  
  // Layer 2: CDN cache (Cloudflare)
  cdnCache: {
    static: '1 month',
    images: '1 week',
    api: 'no-cache'
  },
  
  // Layer 3: Server cache (Redis)
  serverCache: {
    hotelDetails: '1 hour',
    menuItems: '30 minutes',
    userProfile: '15 minutes',
    availableRooms: '5 minutes'
  },
  
  // Layer 4: Database query cache
  databaseCache: {
    readPreference: 'secondaryPreferred',
    mongooseCache: true
  }
};
```

### Database Optimization

```javascript
// Indexing strategy
const INDEXES = {
  users: ['email', 'username', 'company', 'role'],
  hotels: ['company', 'location (2dsphere)', 'status'],
  rooms: ['hotel', 'status', 'pricePerNight'],
  bookings: ['user', 'hotel', 'checkInDate'],
  orders: ['hotel', 'orderStatus', 'createdAt']
};

// Sharding strategy (future)
const SHARDING = {
  shardKey: 'company', // Multi-tenant isolation
  distribution: 'hashed', // Even distribution
  zones: ['asia', 'europe', 'americas'] // Geographic
};
```

---

## 🔐 Security Architecture

```
┌──────────────────────────────────────────┐
│         DEFENSE IN DEPTH                 │
├──────────────────────────────────────────┤
│                                          │
│  Layer 1: Network Security               │
│  - Firewall rules                        │
│  - DDoS protection (Cloudflare)          │
│  - Rate limiting                         │
│                                          │
│  Layer 2: Application Security           │
│  - JWT authentication                    │
│  - RBAC authorization                    │
│  - Input validation                      │
│  - CORS + XSS protection                 │
│                                          │
│  Layer 3: Data Security                  │
│  - Password hashing (bcrypt)             │
│  - Data encryption at rest               │
│  - Secure cookies (httpOnly, SameSite)   │
│                                          │
│  Layer 4: Infrastructure Security        │
│  - HTTPS/TLS encryption                  │
│  - MongoDB authentication                │
│  - Environment variable security         │
│                                          │
└──────────────────────────────────────────┘
```

---

## 📚 Related Documents

- [Frontend-Backend Architecture](./frontend-backend-architecture.md)
- [Authentication Architecture](./authentication-architecture.md)
- [Real-time Architecture](./real-time-architecture.md)
- [Multi-tenancy Design](./multi-tenancy-design.md)
- [Deployment Architecture](./deployment-architecture.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive system architecture overview
