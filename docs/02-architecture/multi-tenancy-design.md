# Multi-Tenancy Design

> Company-based data isolation and tenant management in StayHaven

---

## 📋 Table of Contents

1. [Multi-Tenancy Overview](#multi-tenancy-overview)
2. [Data Isolation Strategy](#data-isolation-strategy)
3. [Tenant Onboarding](#tenant-onboarding)
4. [Query Patterns](#query-patterns)
5. [Security & Access Control](#security--access-control)

---

## 🏢 Multi-Tenancy Overview

### What is Multi-Tenancy?

**Multi-tenancy** allows a single application instance to serve multiple independent organizations (tenants) while keeping their data isolated and secure.

```
┌──────────────────────────────────────────────────┐
│           StayHaven Application                  │
│                                                  │
│  ┌───────────────┐  ┌───────────────┐          │
│  │  Company A    │  │  Company B    │          │
│  │  (Hilton)     │  │  (Marriott)   │          │
│  │               │  │               │          │
│  │  5 Hotels     │  │  3 Hotels     │   ...    │
│  │  50 Users     │  │  30 Users     │          │
│  │  100 Rooms    │  │  80 Rooms     │          │
│  └───────────────┘  └───────────────┘          │
│                                                  │
│       ▼                    ▼                     │
│  ┌─────────────────────────────────────────┐   │
│  │      Shared MongoDB Database            │   │
│  │  (Data segregated by company field)     │   │
│  └─────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### Tenancy Model

StayHaven uses **shared database with discriminator column** approach:

| Model | Description | StayHaven Choice |
|---|---|---|
| **Separate Database** | Each tenant has their own database | ❌ Too expensive |
| **Separate Schema** | Each tenant has their own schema | ❌ Complex migrations |
| **Shared Database** | All tenants share one database, data segregated by column | ✅ **Chosen** |

---

## 🔒 Data Isolation Strategy

### Company-Based Segregation

**All data belongs to a company**. Every document (except admin data) has a `company` field referencing the Company collection.

```javascript
// Company Schema (Tenant)
const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  logo: String,
  
  // Subscription/billing
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'trial'],
      default: 'trial'
    },
    startDate: Date,
    endDate: Date
  },
  
  // Limits
  limits: {
    hotels: { type: Number, default: 1 },      // Max hotels
    users: { type: Number, default: 10 },      // Max users
    rooms: { type: Number, default: 50 }       // Max rooms per hotel
  },
  
  // Owner
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', companySchema);
```

### Data Hierarchy

```
Company (Tenant)
  │
  ├── Users (employees, staff)
  │     └── companyRole: owner, manager, waiter, chief, etc.
  │
  ├── Hotels (properties)
  │     ├── company (reference)
  │     ├── Rooms
  │     │     └── company (reference)
  │     │
  │     ├── Bookings
  │     │     └── company (reference)
  │     │
  │     ├── MenuItems
  │     │     └── company (reference)
  │     │
  │     ├── Orders
  │     │     └── company (reference)
  │     │
  │     ├── WaiterCalls
  │     │     └── company (reference)
  │     │
  │     └── TableAssignments
  │           └── company (reference)
  │
  └── Loyalty Program
        └── company (reference)
```

### Schema Examples with Company Field

```javascript
// Hotel Schema
const hotelSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true  // ✅ Indexed for fast queries
  },
  name: { type: String, required: true },
  // ... other fields
});

// Compound index for company + other fields
hotelSchema.index({ company: 1, name: 1 });
hotelSchema.index({ company: 1, city: 1 });

// User Schema
const userSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },
  email: { type: String, required: true, unique: true },
  companyRole: {
    type: String,
    enum: ['owner', 'manager', 'chief', 'waiter', 'receptionist', 'housekeeping', 'maintenance'],
    required: function() { return !!this.company; }
  },
  // ... other fields
});

// Compound index for company + role
userSchema.index({ company: 1, companyRole: 1 });

// Order Schema
const orderSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // ... other fields
});

// Compound indexes
orderSchema.index({ company: 1, hotel: 1, createdAt: -1 });
orderSchema.index({ company: 1, user: 1, createdAt: -1 });
orderSchema.index({ company: 1, orderStatus: 1 });
```

---

## 🚀 Tenant Onboarding

### Company Registration Flow

```javascript
// 1. Owner signs up
const registerOwner = asyncHandler(async (req, res) => {
  const { fullname, email, password, companyName, companyEmail } = req.body;
  
  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(409).json({
      success: false,
      message: 'User already exists'
    });
  }
  
  // Check if company name is taken
  const companyExists = await Company.findOne({ name: companyName });
  if (companyExists) {
    return res.status(409).json({
      success: false,
      message: 'Company name already taken'
    });
  }
  
  // Create user (owner)
  const user = await User.create({
    fullname,
    email,
    password,    // Will be hashed by pre-save hook
    role: 'user' // Global role
  });
  
  // Create company
  const company = await Company.create({
    name: companyName,
    email: companyEmail,
    owner: user._id,
    subscription: {
      plan: 'trial',
      status: 'trial',
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
    },
    limits: {
      hotels: 1,
      users: 10,
      rooms: 50
    }
  });
  
  // Update user with company and role
  user.company = company._id;
  user.companyRole = 'owner';
  await user.save();
  
  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  
  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();
  
  // Set HTTP-only cookies
  setAuthCookies(res, accessToken, refreshToken);
  
  res.status(201).json({
    success: true,
    message: 'Company registered successfully',
    data: {
      user: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        companyRole: user.companyRole,
        company: company._id
      },
      company: {
        _id: company._id,
        name: company.name,
        subscription: company.subscription
      }
    }
  });
});
```

### Add Staff to Company

```javascript
// 2. Owner invites staff
const inviteStaff = asyncHandler(async (req, res) => {
  const { email, companyRole, hotelId } = req.body;
  const ownerId = req.user._id;  // From protect middleware
  
  // Verify requester is owner or manager
  const owner = await User.findById(ownerId);
  if (!['owner', 'manager'].includes(owner.companyRole)) {
    return res.status(403).json({
      success: false,
      message: 'Only owners and managers can invite staff'
    });
  }
  
  // Check company limits
  const company = await Company.findById(owner.company);
  const userCount = await User.countDocuments({ company: company._id });
  
  if (userCount >= company.limits.users) {
    return res.status(400).json({
      success: false,
      message: `User limit reached (${company.limits.users} max)`
    });
  }
  
  // Check if user already exists
  let user = await User.findOne({ email });
  
  if (user) {
    // User exists, check if already in company
    if (user.company && user.company.toString() === company._id.toString()) {
      return res.status(409).json({
        success: false,
        message: 'User already part of this company'
      });
    }
    
    // User exists but not in company - invite them
    user.company = company._id;
    user.companyRole = companyRole;
    await user.save();
  } else {
    // Create new user with temporary password
    const tempPassword = generateRandomPassword();
    user = await User.create({
      email,
      fullname: email.split('@')[0],  // Temporary name
      password: tempPassword,
      company: company._id,
      companyRole,
      role: 'user'
    });
    
    // Send invitation email with temp password
    await sendInvitationEmail(user.email, tempPassword, company.name);
  }
  
  res.status(201).json({
    success: true,
    message: 'Staff invited successfully',
    data: user
  });
});
```

---

## 🔍 Query Patterns

### Always Filter by Company

**CRITICAL**: Every query MUST include `company` filter to prevent data leakage.

```javascript
// ✅ CORRECT - Filters by company
const getHotels = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  // Get user's company
  const user = await User.findById(userId).select('company');
  
  // Query only company's hotels
  const hotels = await Hotel.find({
    company: user.company  // ✅ Company filter
  });
  
  res.json({ success: true, data: hotels });
});

// ❌ WRONG - No company filter (data leakage!)
const getHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find();  // ❌ Returns ALL hotels
  res.json({ success: true, data: hotels });
});
```

### Middleware for Auto-Filtering

```javascript
// middleware/tenantFilter.js
const addTenantFilter = (req, res, next) => {
  // Attach company to request
  if (req.user && req.user.company) {
    req.companyId = req.user.company;
  }
  next();
};

// Use in routes
router.get('/hotels', protect, addTenantFilter, getHotels);

// Controller with auto-filter
const getHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find({
    company: req.companyId  // From middleware
  });
  
  res.json({ success: true, data: hotels });
});
```

### Mongoose Plugin for Auto-Scoping

```javascript
// utils/tenantPlugin.js
const tenantPlugin = (schema) => {
  // Add company field if not exists
  if (!schema.path('company')) {
    schema.add({
      company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
      }
    });
  }
  
  // Pre-find hook: Auto-add company filter
  schema.pre(/^find/, function(next) {
    if (this.getQuery().company === undefined && this._tenantId) {
      this.where({ company: this._tenantId });
    }
    next();
  });
  
  // Pre-save hook: Auto-set company
  schema.pre('save', function(next) {
    if (!this.company && this._tenantId) {
      this.company = this._tenantId;
    }
    next();
  });
};

module.exports = tenantPlugin;

// Apply to schemas
const hotelSchema = new mongoose.Schema({
  name: String,
  // company field added by plugin
});

hotelSchema.plugin(tenantPlugin);

// Usage with tenant context
const getTenantHotels = asyncHandler(async (req, res) => {
  // Set tenant context
  const query = Hotel.find();
  query._tenantId = req.user.company;
  
  const hotels = await query; // Automatically filtered by company
  res.json({ success: true, data: hotels });
});
```

### Query Examples

```javascript
// Get hotels for user's company
const hotels = await Hotel.find({
  company: req.user.company
}).sort({ createdAt: -1 });

// Get orders for specific hotel (still company-scoped)
const orders = await Order.find({
  company: req.user.company,
  hotel: hotelId
}).populate('user', 'fullname email')
  .populate('items.menuItem', 'name price');

// Get staff for company with role
const waiters = await User.find({
  company: req.user.company,
  companyRole: 'waiter'
}).select('fullname email phone');

// Aggregate with company filter
const orderStats = await Order.aggregate([
  { $match: { company: mongoose.Types.ObjectId(req.user.company) } },
  {
    $group: {
      _id: '$orderStatus',
      count: { $sum: 1 },
      total: { $sum: '$totalPrice' }
    }
  }
]);

// Update only company's data
const result = await Hotel.updateOne(
  {
    _id: hotelId,
    company: req.user.company  // ✅ Prevents updating other company's hotel
  },
  { $set: { status: 'active' } }
);

// Delete only company's data
const result = await Order.deleteOne({
  _id: orderId,
  company: req.user.company  // ✅ Prevents deleting other company's order
});
```

---

## 🔐 Security & Access Control

### Access Control Rules

```javascript
const accessControl = {
  // 1. Company isolation
  companyIsolation: {
    rule: 'Users can only access data from their company',
    implementation: 'Every query filters by company field'
  },
  
  // 2. Role-based access
  roleAccess: {
    owner: ['manage_company', 'invite_staff', 'all_hotels', 'all_data'],
    manager: ['manage_hotel', 'invite_staff', 'hotel_data'],
    chief: ['view_orders', 'update_order_status', 'kitchen_data'],
    waiter: ['view_orders', 'create_orders', 'waiter_calls'],
    receptionist: ['view_bookings', 'create_bookings', 'check_in'],
    housekeeping: ['view_rooms', 'update_room_status'],
    maintenance: ['view_maintenance', 'update_maintenance']
  },
  
  // 3. Hotel-level access
  hotelAccess: {
    rule: 'Staff can only access their assigned hotel(s)',
    implementation: 'Filter by hotel field after company check'
  }
};
```

### Authorization Middleware

```javascript
// middleware/authorize.js

// Check company access
const requireCompany = asyncHandler(async (req, res, next) => {
  if (!req.user.company) {
    return res.status(403).json({
      success: false,
      message: 'User not associated with any company'
    });
  }
  next();
});

// Check owner role
const requireOwner = asyncHandler(async (req, res, next) => {
  if (req.user.companyRole !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Only company owners can perform this action'
    });
  }
  next();
});

// Check hotel access
const requireHotelAccess = asyncHandler(async (req, res, next) => {
  const { hotelId } = req.params;
  
  // Verify hotel belongs to user's company
  const hotel = await Hotel.findOne({
    _id: hotelId,
    company: req.user.company
  });
  
  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: 'Hotel not found or access denied'
    });
  }
  
  // Attach hotel to request
  req.hotel = hotel;
  next();
});

// Usage in routes
router.post('/companies/:companyId/hotels',
  protect,
  requireCompany,
  requireOwner,
  createHotel
);

router.get('/hotels/:hotelId/orders',
  protect,
  requireCompany,
  requireHotelAccess,
  getHotelOrders
);
```

### Data Validation

```javascript
// Validate company ownership before updates
const updateHotel = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const { name, address } = req.body;
  
  // Find and verify ownership
  const hotel = await Hotel.findOne({
    _id: hotelId,
    company: req.user.company  // ✅ Company check
  });
  
  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: 'Hotel not found or access denied'
    });
  }
  
  // Update
  hotel.name = name;
  hotel.address = address;
  await hotel.save();
  
  res.json({
    success: true,
    data: hotel
  });
});

// Prevent cross-company references
const createOrder = asyncHandler(async (req, res) => {
  const { hotelId, userId, items } = req.body;
  
  // Verify hotel belongs to user's company
  const hotel = await Hotel.findOne({
    _id: hotelId,
    company: req.user.company
  });
  
  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: 'Hotel not found'
    });
  }
  
  // Verify all menu items belong to company
  const menuItemIds = items.map(item => item.menuItem);
  const menuItems = await MenuItem.find({
    _id: { $in: menuItemIds },
    company: req.user.company  // ✅ Company check
  });
  
  if (menuItems.length !== menuItemIds.length) {
    return res.status(400).json({
      success: false,
      message: 'Invalid menu items'
    });
  }
  
  // Create order
  const order = await Order.create({
    company: req.user.company,  // ✅ Auto-set company
    hotel: hotelId,
    user: userId,
    items,
    totalPrice: calculateTotal(items)
  });
  
  res.status(201).json({
    success: true,
    data: order
  });
});
```

### Audit Logging

```javascript
// Log tenant actions for audit trail
const auditLog = asyncHandler(async (action, entity, userId, companyId) => {
  await AuditLog.create({
    action,          // 'create', 'update', 'delete'
    entityType: entity.constructor.modelName,
    entityId: entity._id,
    user: userId,
    company: companyId,
    changes: entity.toObject(),
    timestamp: new Date()
  });
});

// Usage
const deleteHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findOneAndDelete({
    _id: req.params.hotelId,
    company: req.user.company
  });
  
  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: 'Hotel not found'
    });
  }
  
  // Audit log
  await auditLog('delete', hotel, req.user._id, req.user.company);
  
  res.json({
    success: true,
    message: 'Hotel deleted successfully'
  });
});
```

---

## 📚 Related Documents

- [System Architecture Overview](./system-architecture-overview.md)
- [Database Design](../06-database/database-design.md)
- [Security Measures](../05-security/jwt-authentication.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive multi-tenancy design with company-based isolation
