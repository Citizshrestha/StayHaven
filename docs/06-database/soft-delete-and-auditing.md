# Soft Delete & Auditing

> Data retention, soft delete patterns, audit trails, and compliance in StayHaven

---

## 📋 Table of Contents

1. [Soft Delete Implementation](#soft-delete-implementation)
2. [Audit Trail Fields](#audit-trail-fields)
3. [Query Patterns](#query-patterns)
4. [Restore Functionality](#restore-functionality)
5. [Data Retention Policy](#data-retention-policy)

---

## 🗑️ Soft Delete Implementation

### What is Soft Delete?

**Soft delete** marks records as deleted without physically removing them from the database.

```javascript
// Hard delete (permanent):
// ❌ Data lost forever
await User.findByIdAndDelete(userId);

// Soft delete (reversible):
// ✅ Data marked as deleted but recoverable
await User.findByIdAndUpdate(userId, {
  isActive: false,
  isDeleted: true,
  deletedAt: Date.now()
});
```

### Benefits

```
✅ Data Recovery: Restore accidentally deleted records
✅ Audit Trail: Track what was deleted and when
✅ Referential Integrity: Related data remains accessible
✅ Compliance: GDPR/legal requirements for data retention
✅ Analytics: Analyze historical data
```

---

## 📊 Schema Implementation

### Basic Soft Delete Fields

```javascript
const userSchema = new mongoose.Schema({
  // Regular fields
  fullname: String,
  email: String,
  
  // Soft delete fields
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true // Auto createdAt & updatedAt
});
```

### Complete Audit Schema

```javascript
const userSchema = new mongoose.Schema({
  // Basic info
  fullname: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  
  // Status flags
  isActive: {
    type: Boolean,
    default: true,
    index: true // Index for filtering
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Audit timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    default: null
  },
  
  // Staff-specific audit fields
  invitedAt: {
    type: Date,
    default: null
  },
  onboardedAt: {
    type: Date,
    default: null
  },
  
  // Who performed actions
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true // Auto-manage createdAt & updatedAt
});
```

---

## 🔍 Audit Trail Fields

### Automatic Timestamps

```javascript
const schema = new mongoose.Schema({
  // Fields...
}, {
  timestamps: true // Enables automatic timestamp management
});

// Mongoose automatically adds:
// - createdAt: Date when document was created
// - updatedAt: Date when document was last modified

const user = await User.create({ fullname: 'John' });
console.log(user.createdAt); // 2026-02-02T10:30:00.000Z
console.log(user.updatedAt); // 2026-02-02T10:30:00.000Z

// Update user
user.fullname = 'John Doe';
await user.save();
console.log(user.updatedAt); // 2026-02-02T15:45:00.000Z (updated!)
```

### Custom Audit Fields

```javascript
// Staff invitation tracking
const userSchema = new mongoose.Schema({
  invitedAt: {
    type: Date,
    default: null
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  onboardedAt: {
    type: Date,
    default: null
  },
  
  accountStatus: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'locked'],
    default: 'pending'
  },
  
  statusChangedAt: {
    type: Date,
    default: Date.now
  },
  statusChangedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Update status with audit
await User.findByIdAndUpdate(userId, {
  accountStatus: 'active',
  statusChangedAt: Date.now(),
  statusChangedBy: adminId
});
```

### Loyalty Points Audit

```javascript
const loyaltySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  points: {
    type: Number,
    default: 0
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  
  // Complete audit trail
  history: [{
    points: Number,
    type: {
      type: String,
      enum: ['earned', 'redeemed', 'expired', 'adjusted']
    },
    description: String,
    date: {
      type: Date,
      default: Date.now
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
});

// Add points with audit trail
await Loyalty.findOneAndUpdate(
  { user: userId },
  {
    $inc: { points: 100 },
    $push: {
      history: {
        points: 100,
        type: 'earned',
        description: 'Booking #12345',
        date: Date.now(),
        performedBy: userId
      }
    }
  }
);
```

### Booking Status Audit

```javascript
const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel'
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  
  bookingStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed'],
    default: 'pending'
  },
  
  // Audit timestamps for each status
  confirmedAt: Date,
  checkedInAt: Date,
  checkedOutAt: Date,
  cancelledAt: Date,
  completedAt: Date,
  
  // Who performed actions
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});
```

---

## 🔎 Query Patterns

### Find Active Records

```javascript
// ❌ Without soft delete: Returns everything
const users = await User.find();

// ✅ With soft delete: Filter active only
const users = await User.find({ isActive: true, isDeleted: false });
```

### Default Query Middleware

```javascript
// Add pre-query middleware to auto-filter deleted records
userSchema.pre(/^find/, function(next) {
  // Automatically exclude deleted records
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Now simple queries automatically filter:
const users = await User.find(); // Only non-deleted users
const user = await User.findById(userId); // Only if not deleted
```

### Find Including Deleted

```javascript
// Override default filter
const allUsers = await User.find().where('isDeleted').ne(false);

// Or use custom method
userSchema.statics.findWithDeleted = function() {
  return this.find(); // No filter
};

const allUsers = await User.findWithDeleted();
```

### Find Only Deleted

```javascript
// Get deleted records (for admin/restore)
const deletedUsers = await User.find({ isDeleted: true });
```

---

## ♻️ Restore Functionality

### Soft Delete Method

```javascript
// Add soft delete instance method
userSchema.methods.softDelete = async function(deletedBy) {
  this.isActive = false;
  this.isDeleted = true;
  this.deletedAt = Date.now();
  this.deletedBy = deletedBy;
  await this.save();
};

// Usage
const user = await User.findById(userId);
await user.softDelete(adminId);
```

### Restore Method

```javascript
// Add restore instance method
userSchema.methods.restore = async function(restoredBy) {
  this.isActive = true;
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  this.updatedBy = restoredBy;
  await this.save();
};

// Usage
const user = await User.findById(userId);
await user.restore(adminId);
```

### Bulk Soft Delete

```javascript
// Soft delete multiple records
await User.updateMany(
  { company: companyId },
  {
    isActive: false,
    isDeleted: true,
    deletedAt: Date.now(),
    deletedBy: adminId
  }
);
```

### Permanent Delete

```javascript
// Delete permanently after retention period
userSchema.methods.permanentDelete = async function() {
  // Check if record was deleted > 90 days ago
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  if (this.isDeleted && this.deletedAt < ninetyDaysAgo) {
    await this.remove(); // Hard delete
    return true;
  }
  
  return false;
};

// Usage
const user = await User.findById(userId);
const deleted = await user.permanentDelete();
if (deleted) {
  console.log('User permanently deleted');
} else {
  console.log('User not eligible for permanent deletion');
}
```

---

## 📅 Data Retention Policy

### Retention Periods

```javascript
// StayHaven Data Retention Policy

const RETENTION_PERIODS = {
  // User data
  users: {
    active: Infinity, // Keep forever
    deleted: 90 * 24 * 60 * 60 * 1000 // 90 days
  },
  
  // Booking data
  bookings: {
    completed: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years (compliance)
    cancelled: 2 * 365 * 24 * 60 * 60 * 1000 // 2 years
  },
  
  // Order data
  orders: {
    completed: 5 * 365 * 24 * 60 * 60 * 1000, // 5 years (tax)
    cancelled: 1 * 365 * 24 * 60 * 60 * 1000 // 1 year
  },
  
  // Notification data
  notifications: {
    read: 30 * 24 * 60 * 60 * 1000, // 30 days
    unread: 90 * 24 * 60 * 60 * 1000 // 90 days
  }
};
```

### Auto-Cleanup Job

```javascript
// Cron job to clean up old data (runs daily at 2 AM)
const cleanupOldData = async () => {
  const now = Date.now();
  
  // Delete users soft-deleted > 90 days ago
  const ninetyDaysAgo = now - RETENTION_PERIODS.users.deleted;
  await User.deleteMany({
    isDeleted: true,
    deletedAt: { $lt: ninetyDaysAgo }
  });
  
  // Delete old notifications
  const thirtyDaysAgo = now - RETENTION_PERIODS.notifications.read;
  await Notification.deleteMany({
    isRead: true,
    createdAt: { $lt: thirtyDaysAgo }
  });
  
  console.log('Cleanup completed');
};

// Schedule with node-cron
const cron = require('node-cron');
cron.schedule('0 2 * * *', cleanupOldData); // Daily at 2 AM
```

### TTL Index for Auto-Delete

```javascript
// Notification schema with TTL index
const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  message: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-delete after 30 days
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 } // 30 days in seconds
);

// MongoDB automatically deletes expired documents
```

---

## 📊 Audit Report

### Generate User Activity Report

```javascript
const getUserActivityReport = async (userId) => {
  const user = await User.findById(userId);
  
  return {
    user: {
      id: user._id,
      name: user.fullname,
      email: user.email
    },
    audit: {
      accountCreated: user.createdAt,
      lastLogin: user.lastLoginAt,
      lastUpdate: user.updatedAt,
      totalLogins: user.loginCount,
      accountStatus: user.accountStatus,
      isDeleted: user.isDeleted,
      deletedAt: user.deletedAt
    },
    activity: {
      totalBookings: await Booking.countDocuments({ user: userId }),
      totalOrders: await Order.countDocuments({ user: userId }),
      loyaltyPoints: await Loyalty.findOne({ user: userId }).select('points tier')
    }
  };
};
```

### Generate Deletion Report

```javascript
const getDeletionReport = async (startDate, endDate) => {
  const deletedUsers = await User.find({
    isDeleted: true,
    deletedAt: { $gte: startDate, $lte: endDate }
  }).populate('deletedBy', 'fullname email');
  
  return {
    period: { start: startDate, end: endDate },
    totalDeleted: deletedUsers.length,
    deletions: deletedUsers.map(user => ({
      id: user._id,
      name: user.fullname,
      email: user.email,
      deletedAt: user.deletedAt,
      deletedBy: user.deletedBy?.fullname || 'System'
    }))
  };
};
```

---

## ✅ Best Practices

### 1. Always Use Soft Delete for Critical Data

```javascript
// ✅ Good: Soft delete users
await user.softDelete(adminId);

// ❌ Bad: Hard delete users
await User.findByIdAndDelete(userId);
```

### 2. Index Soft Delete Fields

```javascript
// ✅ Good: Index for performance
userSchema.index({ isDeleted: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ deletedAt: 1 });
```

### 3. Log All Delete Actions

```javascript
// ✅ Good: Audit trail
userSchema.pre('save', function(next) {
  if (this.isModified('isDeleted') && this.isDeleted) {
    console.log(`User ${this._id} deleted by ${this.deletedBy} at ${this.deletedAt}`);
  }
  next();
});
```

### 4. Provide Restore Endpoint

```javascript
// Admin endpoint to restore deleted records
router.patch('/admin/users/:id/restore', protect, authorize('admin'), async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user || !user.isDeleted) {
    return res.status(404).json({
      success: false,
      message: 'Deleted user not found'
    });
  }
  
  await user.restore(req.user._id);
  
  res.json({
    success: true,
    message: 'User restored successfully'
  });
});
```

### 5. Set Retention Policies

```javascript
// ✅ Good: Define clear retention periods
// ❌ Bad: Keep all data forever
```

---

## 📊 Soft Delete Summary Table

| Field | Type | Purpose | Example |
|---|---|---|---|
| **isActive** | Boolean | Current status | `true` / `false` |
| **isDeleted** | Boolean | Deletion flag | `true` / `false` |
| **deletedAt** | Date | Deletion timestamp | `2026-02-02T10:30:00Z` |
| **deletedBy** | ObjectId | Who deleted | User ID |
| **createdAt** | Date | Creation timestamp | `2026-01-01T10:00:00Z` |
| **updatedAt** | Date | Last update timestamp | `2026-02-02T15:45:00Z` |

---

## 📚 Related Documents

- [Database Overview](./database-overview.md)
- [Collection Schema Definitions](./collection-schema-definitions.md)
- [Transaction & Consistency](./transaction-and-consistency.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive soft delete and auditing guide
