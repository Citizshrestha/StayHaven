# Routing Strategy

> Comprehensive guide to RESTful API routing, route organization, and middleware chaining in StayHaven

---

## 📋 Table of Contents

1. [Routing Architecture](#routing-architecture)
2. [Route Files](#route-files)
3. [RESTful Conventions](#restful-conventions)
4. [Route Protection](#route-protection)
5. [Route Organization](#route-organization)
6. [Best Practices](#best-practices)

---

## 🏗️ Routing Architecture

### Express Router Structure

```
server.js
└── Routes mounted
    ├── /api/auth → authRoutes.js
    ├── /api/users → userRoutes.js
    ├── /api/hotels → hotelRoutes.js
    ├── /api/companies → companyRoutes.js
    └── /api/staff → staffRoutes.js
```

### Route Mounting in server.js

```javascript
// server.js
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import hotelRoutes from './routes/hotelRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import staffRoutes from './routes/staffRoutes.js';

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/staff', staffRoutes);
```

---

## 📁 Route Files

### 1. Authentication Routes

**File**: `routes/authRoutes.js`

```javascript
import express from 'express';
import {
  loginUser,
  registerUser,
  logoutUser,
  isAuthenticated,
  getCurrentUser,
  sendResetPasswordOtp,
  verifyResetPasswordOtp,
  resetPassword,
  refreshAccessToken,
  checkUserExists,
  googleLogin,
  googleRegister,
  changePassword,
  sendSignupOtp,
  verifySignupOtp,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes - No authentication required
router.get('/check', checkUserExists);              // Check email/username availability
router.post('/login', loginUser);                   // Login with credentials
router.post('/register', registerUser);             // Register new user
router.post('/google-login', googleLogin);          // Google OAuth login
router.post('/google-register', googleRegister);    // Google OAuth register
router.post('/sendResetPasswordOtp', sendResetPasswordOtp);      // Request password reset
router.post('/verifyResetPasswordOtp', verifyResetPasswordOtp);  // Verify OTP
router.post('/resetPassword', resetPassword);       // Reset password
router.post('/refresh', refreshAccessToken);        // Refresh access token
router.post('/sendSignupOtp', sendSignupOtp);       // Send signup OTP
router.post('/verifySignupOtp', verifySignupOtp);   // Verify signup OTP

// Protected routes - Require authentication
router.get('/me', protect, getCurrentUser);          // Get current user profile
router.post('/logout', protect, logoutUser);         // Logout
router.post('/isAuth', protect, isAuthenticated);    // Check authentication
router.post('/change-password', protect, changePassword);  // Change password

export default router;
```

### 2. User Routes

**File**: `routes/userRoutes.js`

```javascript
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  addToCart,
  clearCart,
  getCart,
  getWishList,
  removeFromCart,
  toggleWishList,
  updateCart,
} from '../controllers/userController.js';

const router = express.Router();

// All user routes require authentication
router.use(protect);

// Wishlist routes
router.get('/wishlist', getWishList);                    // Get user's wishlist
router.post('/wishlist/:hotelId', toggleWishList);       // Add/remove from wishlist

// Cart routes
router.get('/cart', getCart);                            // Get cart items
router.post('/cart', addToCart);                         // Add item to cart
router.patch('/cart/:hotelId', updateCart);              // Update cart item quantity
router.delete('/cart/:hotelId', removeFromCart);         // Remove item from cart
router.delete('/cart', clearCart);                       // Clear entire cart

export default router;
```

### 3. Hotel Routes

**File**: `routes/hotelRoutes.js`

```javascript
import express from 'express';
import {
  createHotel,
  getAllHotels,
  getHotelById,
  getMyHotels,
  updateHotel,
  deleteHotel,
  getHotelStatistics,
  updateHotelStatus,
  toggleFeatured,
} from '../controllers/hotelController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes - No authentication required
router.get('/', getAllHotels);                           // Get all hotels (with filters)
router.get('/:id', getHotelById);                        // Get single hotel by ID

// Protected routes - Hotel Owners & Admins
router.post('/', protect, authorize('owner', 'admin'), createHotel);
router.get('/owner/my-hotels', protect, authorize('owner', 'admin'), getMyHotels);
router.put('/:id', protect, authorize('owner', 'admin'), updateHotel);
router.delete('/:id', protect, authorize('owner', 'admin'), deleteHotel);
router.get('/:id/statistics', protect, authorize('owner', 'admin'), getHotelStatistics);

// Admin only routes
router.patch('/:id/status', protect, authorize('admin'), updateHotelStatus);
router.patch('/:id/featured', protect, authorize('admin'), toggleFeatured);

export default router;
```

### 4. Company Routes

**File**: `routes/companyRoutes.js`

```javascript
import express from 'express';
import {
  createCompany,
  getMyCompany,
  updateCompany,
  deleteCompany,
  getCompanyStaff,
} from '../controllers/companyController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All company routes require authentication
router.use(protect);

// Owner only routes
router.post('/', authorize('owner'), createCompany);
router.get('/my-company', authorize('owner', 'admin', 'manager'), getMyCompany);
router.put('/:id', authorize('owner'), updateCompany);
router.delete('/:id', authorize('owner'), deleteCompany);
router.get('/:id/staff', authorize('owner', 'admin', 'manager'), getCompanyStaff);

export default router;
```

### 5. Staff Routes

**File**: `routes/staffRoutes.js`

```javascript
import express from 'express';
import {
  inviteStaff,
  acceptInvite,
  getAllStaff,
  updateStaff,
  removeStaff,
  assignHotel,
} from '../controllers/staffController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All staff routes require authentication
router.use(protect);

// Manager & Admin routes
router.post('/invite', authorize('owner', 'admin', 'manager'), inviteStaff);
router.get('/', authorize('owner', 'admin', 'manager'), getAllStaff);
router.put('/:id', authorize('owner', 'admin', 'manager'), updateStaff);
router.delete('/:id', authorize('owner', 'admin'), removeStaff);
router.post('/:id/assign-hotel', authorize('owner', 'admin', 'manager'), assignHotel);

// Staff accepting invite (public with token)
router.post('/accept-invite', acceptInvite);

export default router;
```

---

## 🎯 RESTful Conventions

### HTTP Methods

| Method | Purpose | Example |
|--------|---------|---------|
| `GET` | Retrieve resource(s) | `GET /api/hotels` |
| `POST` | Create new resource | `POST /api/hotels` |
| `PUT` | Update entire resource | `PUT /api/hotels/123` |
| `PATCH` | Partial update | `PATCH /api/hotels/123/status` |
| `DELETE` | Delete resource | `DELETE /api/hotels/123` |

### URL Naming Conventions

```javascript
// Good - Plural nouns, lowercase
GET    /api/hotels
POST   /api/hotels
GET    /api/hotels/:id
PUT    /api/hotels/:id
DELETE /api/hotels/:id

// Nested resources
GET    /api/hotels/:id/rooms
POST   /api/hotels/:id/rooms
GET    /api/hotels/:id/bookings

// Actions on resources
POST   /api/hotels/:id/publish
PATCH  /api/hotels/:id/featured
POST   /api/orders/:id/cancel
```

### Query Parameters for Filtering

```javascript
// Filtering
GET /api/hotels?location=Kathmandu&category=Hotel

// Sorting
GET /api/hotels?sort=-rating,price

// Pagination
GET /api/hotels?page=2&limit=20

// Search
GET /api/hotels?search=luxury

// Field selection
GET /api/hotels?fields=name,location,price
```

---

## 🔒 Route Protection

### Middleware Chaining

```javascript
// No protection - Public
router.get('/hotels', getAllHotels);

// Authentication only
router.get('/me', protect, getCurrentUser);

// Authentication + Authorization (single role)
router.post('/hotels', protect, authorize('owner'), createHotel);

// Authentication + Authorization (multiple roles)
router.get('/orders', protect, authorize('waiter', 'chief', 'manager'), getOrders);

// Multiple middleware
router.post(
  '/hotels',
  protect,                        // 1. Authenticate
  authorize('owner', 'admin'),    // 2. Authorize
  upload.array('images', 10),     // 3. Upload
  createHotel                     // 4. Controller
);
```

### Route-Level Protection

```javascript
// Protect all routes in this file
router.use(protect);

// Now all routes below require authentication
router.get('/wishlist', getWishList);
router.post('/cart', addToCart);
```

---

## 📂 Route Organization

### Pattern 1: Flat Structure

```javascript
// All routes at root level
router.get('/hotels', getAllHotels);
router.post('/hotels', protect, authorize('owner'), createHotel);
router.get('/hotels/:id', getHotelById);
router.put('/hotels/:id', protect, authorize('owner'), updateHotel);
router.delete('/hotels/:id', protect, authorize('owner'), deleteHotel);
```

### Pattern 2: Route Grouping

```javascript
// Public routes
router.get('/', getAllHotels);
router.get('/:id', getHotelById);

// Owner routes
router.use(protect);
router.use(authorize('owner', 'admin'));
router.post('/', createHotel);
router.put('/:id', updateHotel);
router.delete('/:id', deleteHotel);
```

### Pattern 3: Nested Routes

```javascript
// Parent resource
router.get('/hotels/:hotelId', getHotel);

// Nested resources
router.get('/hotels/:hotelId/rooms', getRooms);
router.post('/hotels/:hotelId/rooms', protect, authorize('owner'), createRoom);
router.get('/hotels/:hotelId/bookings', protect, authorize('owner'), getBookings);

// Alternative: Separate router
const roomRouter = express.Router({ mergeParams: true }); // mergeParams to access :hotelId
roomRouter.get('/', getRooms);
roomRouter.post('/', protect, authorize('owner'), createRoom);

router.use('/:hotelId/rooms', roomRouter);
```

---

## ✅ Best Practices

### 1. **Consistent Naming**

```javascript
// Good - RESTful resource names
GET    /api/hotels
POST   /api/hotels
GET    /api/hotels/:id
PUT    /api/hotels/:id
DELETE /api/hotels/:id

// Avoid - inconsistent naming
GET    /api/getAllHotels
POST   /api/createNewHotel
GET    /api/hotelDetails/:id
```

### 2. **Version Your API**

```javascript
// Option 1: URL versioning
app.use('/api/v1/hotels', hotelsV1Routes);
app.use('/api/v2/hotels', hotelsV2Routes);

// Option 2: Header versioning
// Accept: application/vnd.stayhaven.v1+json
```

### 3. **Use Route Parameters**

```javascript
// Good
GET /api/hotels/:id
GET /api/hotels/:hotelId/rooms/:roomId

// Avoid
GET /api/hotels?id=123
```

### 4. **Group Protected Routes**

```javascript
// Good - grouped protection
const router = express.Router();
router.use(protect); // All routes below are protected

router.get('/wishlist', getWishList);
router.post('/cart', addToCart);

// Avoid - repeating protect on every route
router.get('/wishlist', protect, getWishList);
router.post('/cart', protect, addToCart);
```

### 5. **Order Routes Correctly**

```javascript
// Good - specific routes first
router.get('/hotels/featured', getFeaturedHotels);   // Specific
router.get('/hotels/:id', getHotelById);             // Parameter

// Bad - parameter route first (catches 'featured' as :id)
router.get('/hotels/:id', getHotelById);
router.get('/hotels/featured', getFeaturedHotels);
```

### 6. **Use Router Prefixes**

```javascript
// Good - prefix in server.js
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// In route file - no /api prefix
router.get('/login', loginUser);  // Becomes /api/auth/login
```

### 7. **Handle 404**

```javascript
// server.js - after all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});
```

---

## 📚 Related Documents

- [Backend Overview](./backend-overview.md)
- [Controller Design Pattern](./controller-design-pattern.md)
- [Middleware Design](./middleware-design.md)
- [API Overview](../03-api/api-overview.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive routing strategy guide
