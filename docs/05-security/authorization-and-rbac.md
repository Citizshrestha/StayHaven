# Authorization & RBAC

> Role-Based Access Control (RBAC) implementation, permission management, and authorization strategies in StayHaven

---

## 📋 Table of Contents

1. [RBAC Overview](#rbac-overview)
2. [Role System](#role-system)
3. [Authorization Middleware](#authorization-middleware)
4. [Permission Matrix](#permission-matrix)
5. [Ownership Validation](#ownership-validation)
6. [Multi-Tenancy](#multi-tenancy)

---

## 🎯 RBAC Overview

### What is RBAC?

**Role-Based Access Control (RBAC)** is a security approach that restricts system access based on user roles.

### RBAC Hierarchy

```
┌──────────────────────────────────────────────┐
│              StayHaven RBAC                  │
├──────────────────────────────────────────────┤
│                                              │
│  System Level                                │
│  └─ admin (Full system access)               │
│                                              │
│  Company Level (Multi-tenant)                │
│  ├─ owner (Company creator, full control)    │
│  └─ manager (Hotel management, staff mgmt)   │
│                                              │
│  Hotel Level (Staff)                         │
│  ├─ chief (Kitchen management)               │
│  ├─ waiter (Order taking, table service)     │
│  ├─ receptionist (Bookings, check-in/out)    │
│  ├─ housekeeping (Room cleaning, supplies)   │
│  └─ maintenance (Facility repairs)           │
│                                              │
│  Guest Level                                 │
│  └─ guest (Bookings, orders)                 │
│                                              │
└──────────────────────────────────────────────┘
```

### Role Hierarchy

```
admin (Global)
  │
  ├─ owner (Company)
  │   │
  │   └─ manager (Hotel Management)
  │       │
  │       ├─ chief (Kitchen)
  │       ├─ waiter (Dining)
  │       ├─ receptionist (Front Desk)
  │       ├─ housekeeping (Rooms)
  │       └─ maintenance (Facilities)
  │
  └─ guest (Bookings & Orders)
```

---

## 👥 Role System

### Role Schema

**File**: `models/role.schema.js`

```javascript
import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'admin',
      'owner',
      'manager',
      'chief',
      'waiter',
      'receptionist',
      'housekeeping',
      'maintenance',
      'guest'
    ]
  },
  description: {
    type: String,
    required: true
  },
  permissions: [{
    type: String
  }],
  level: {
    type: String,
    enum: ['system', 'company', 'hotel', 'guest'],
    required: true
  }
}, { timestamps: true });

export const Role = mongoose.model('Role', roleSchema);
```

### Role Definitions

```javascript
// Database seed data
const roles = [
  {
    name: 'admin',
    description: 'System administrator with full access',
    level: 'system',
    permissions: ['*'] // All permissions
  },
  {
    name: 'owner',
    description: 'Company owner with full company access',
    level: 'company',
    permissions: [
      'company.manage',
      'hotel.create',
      'hotel.manage',
      'staff.invite',
      'staff.manage',
      'reports.view'
    ]
  },
  {
    name: 'manager',
    description: 'Hotel manager with hotel-level access',
    level: 'hotel',
    permissions: [
      'hotel.manage',
      'staff.manage',
      'room.manage',
      'menu.manage',
      'order.manage',
      'booking.manage'
    ]
  },
  {
    name: 'chief',
    description: 'Kitchen chief managing food preparation',
    level: 'hotel',
    permissions: [
      'menu.manage',
      'order.view',
      'order.update_status',
      'kitchen.manage'
    ]
  },
  {
    name: 'waiter',
    description: 'Waiter handling orders and table service',
    level: 'hotel',
    permissions: [
      'order.create',
      'order.view',
      'order.update',
      'table.view',
      'menu.view'
    ]
  },
  {
    name: 'receptionist',
    description: 'Receptionist managing bookings and check-ins',
    level: 'hotel',
    permissions: [
      'booking.view',
      'booking.create',
      'booking.update',
      'room.view',
      'guest.view'
    ]
  },
  {
    name: 'housekeeping',
    description: 'Housekeeping staff managing room cleanliness',
    level: 'hotel',
    permissions: [
      'room.view',
      'room.update_status',
      'task.view',
      'task.complete'
    ]
  },
  {
    name: 'maintenance',
    description: 'Maintenance staff handling repairs',
    level: 'hotel',
    permissions: [
      'room.view',
      'maintenance.view',
      'maintenance.update',
      'task.complete'
    ]
  },
  {
    name: 'guest',
    description: 'Guest with booking and ordering capabilities',
    level: 'guest',
    permissions: [
      'booking.create',
      'booking.view_own',
      'order.create',
      'order.view_own',
      'profile.manage'
    ]
  }
];
```

### User Role Assignment

**File**: `models/user.schema.js`

```javascript
const userSchema = new mongoose.Schema({
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  companyRole: {
    type: String,
    enum: ['owner', 'manager', 'chief', 'waiter', 'receptionist', 'housekeeping', 'maintenance']
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel'
  }
});
```

---

## 🛡️ Authorization Middleware

### Authorize Middleware

**File**: `middleware/authMiddleware.js`

```javascript
/**
 * Authorize user by role
 * @param {...string} allowedRoles - Roles allowed to access route
 * @returns {Function} Express middleware
 */
export const authorize = (...allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    // Ensure user is authenticated (protect middleware runs first)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Populate role if not already populated
    if (!req.user.role || !req.user.role.name) {
      await req.user.populate('role');
    }

    const userRole = req.user.role.name;

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${userRole} role is not authorized for this action.`
      });
    }

    next();
  });
};
```

### Usage in Routes

```javascript
import { protect, authorize } from '../middleware/authMiddleware.js';

// Only admin can access
router.get('/admin/users', protect, authorize('admin'), getAllUsers);

// Owner and manager can access
router.post('/hotels', protect, authorize('owner', 'manager'), createHotel);

// Hotel staff can access
router.get('/orders', protect, authorize('waiter', 'chief', 'manager'), getOrders);

// Any authenticated user
router.get('/profile', protect, getProfile);
```

### Company-Scoped Authorization

```javascript
/**
 * Authorize user within company context
 * Ensures user belongs to the company they're trying to access
 */
export const authorizeCompany = asyncHandler(async (req, res, next) => {
  const companyId = req.params.companyId || req.body.company;

  if (!companyId) {
    return res.status(400).json({
      success: false,
      message: "Company ID is required"
    });
  }

  // Check if user belongs to the company
  if (req.user.company && req.user.company.toString() !== companyId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You don't belong to this company."
    });
  }

  next();
});
```

### Hotel-Scoped Authorization

```javascript
/**
 * Authorize user within hotel context
 * Ensures staff belongs to the hotel they're accessing
 */
export const authorizeHotel = asyncHandler(async (req, res, next) => {
  const hotelId = req.params.hotelId || req.body.hotel;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required"
    });
  }

  // Admin can access any hotel
  if (req.user.role.name === 'admin') {
    return next();
  }

  // Owner can access hotels in their company
  if (req.user.role.name === 'owner') {
    const hotel = await Hotel.findById(hotelId);
    if (hotel && hotel.company.toString() === req.user.company.toString()) {
      return next();
    }
  }

  // Staff must belong to the hotel
  if (req.user.hotel && req.user.hotel.toString() !== hotelId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You don't belong to this hotel."
    });
  }

  next();
});
```

---

## 📊 Permission Matrix

### Role Permissions

| Resource | Admin | Owner | Manager | Chief | Waiter | Receptionist | Housekeeping | Maintenance | Guest |
|----------|-------|-------|---------|-------|--------|--------------|--------------|-------------|-------|
| **Company** |
| Create Company | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Company | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete Company | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Hotel** |
| Create Hotel | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Hotel | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Hotel | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Staff** |
| Invite Staff | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Staff | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Room** |
| Create Room | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update Room | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 🟡 Status | ❌ | ❌ |
| View Room | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | 🟡 Available |
| **Booking** |
| Create Booking | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| View All Bookings | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View Own Bookings | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Cancel Booking | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | 🟡 Own |
| **Menu** |
| Create MenuItem | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update MenuItem | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Menu | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Order** |
| Create Order | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| View All Orders | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Own Orders | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Update Status | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cancel Order | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 🟡 Own |

**Legend**:
- ✅ Full Access
- 🟡 Partial Access (with conditions)
- ❌ No Access

---

## 🔐 Ownership Validation

### Ownership Middleware

```javascript
/**
 * Validate resource ownership
 * Ensures user can only access their own resources
 */
export const validateOwnership = (Model, paramName = 'id') => {
  return asyncHandler(async (req, res, next) => {
    const resourceId = req.params[paramName];

    // Find resource
    const resource = await Model.findById(resourceId);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: "Resource not found"
      });
    }

    // Admin can access anything
    if (req.user.role.name === 'admin') {
      return next();
    }

    // Check ownership
    if (resource.user && resource.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You don't own this resource."
      });
    }

    req.resource = resource;
    next();
  });
};
```

### Usage Examples

```javascript
// Booking ownership
router.delete('/bookings/:id',
  protect,
  authorize('guest'),
  validateOwnership(Booking, 'id'),
  cancelBooking
);

// Order ownership
router.get('/orders/:id',
  protect,
  authorize('guest', 'waiter'),
  validateOwnership(Order, 'id'),
  getOrderDetails
);
```

### Conditional Ownership

```javascript
export const getMyBookings = asyncHandler(async (req, res) => {
  let query;

  // Admin can see all bookings
  if (req.user.role.name === 'admin') {
    query = {};
  }
  // Owner/Manager can see company bookings
  else if (['owner', 'manager'].includes(req.user.role.name)) {
    query = { company: req.user.company };
  }
  // Receptionist can see hotel bookings
  else if (req.user.role.name === 'receptionist') {
    query = { hotel: req.user.hotel };
  }
  // Guest can only see own bookings
  else {
    query = { user: req.user._id };
  }

  const bookings = await Booking.find(query)
    .populate('room')
    .populate('hotel')
    .sort('-createdAt');

  res.json({
    success: true,
    count: bookings.length,
    bookings
  });
});
```

---

## 🏢 Multi-Tenancy

### Company Isolation

```javascript
// Ensure staff can only access their company's data
export const getCompanyHotels = asyncHandler(async (req, res) => {
  const companyId = req.user.company;

  if (!companyId) {
    return res.status(400).json({
      success: false,
      message: "User not associated with any company"
    });
  }

  const hotels = await Hotel.find({ company: companyId });

  res.json({
    success: true,
    count: hotels.length,
    hotels
  });
});
```

### Hotel Isolation

```javascript
// Ensure staff can only access their hotel's orders
export const getHotelOrders = asyncHandler(async (req, res) => {
  const hotelId = req.user.hotel;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "User not associated with any hotel"
    });
  }

  const orders = await Order.find({ hotel: hotelId })
    .populate('items.menuItem')
    .populate('user')
    .sort('-createdAt');

  res.json({
    success: true,
    count: orders.length,
    orders
  });
});
```

---

## 📚 Related Documents

- [Security Overview](./security-overview.md)
- [Authentication Flow](./authentication-flow.md)
- [API Security Best Practices](./api-security-best-practices.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive RBAC and authorization documentation
