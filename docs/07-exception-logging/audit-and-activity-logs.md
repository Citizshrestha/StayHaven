# Audit and Activity Logs

> Comprehensive audit trail and activity logging for StayHaven

---

## 📋 Table of Contents

1. [Audit Logging Overview](#audit-logging-overview)
2. [Events to Audit](#events-to-audit)
3. [Audit Log Schema](#audit-log-schema)
4. [Implementation](#implementation)
5. [Compliance Requirements](#compliance-requirements)

---

## 📊 Audit Logging Overview

### What is Audit Logging?

**Audit logs** record **who** did **what**, **when**, and **why** for accountability, security, and compliance purposes.

### Purpose

```javascript
const AUDIT_PURPOSES = {
  accountability: {
    description: 'Track user actions for responsibility',
    examples: [
      'Who deleted this hotel?',
      'Who changed the room price?',
      'Who approved this booking?'
    ]
  },
  
  security: {
    description: 'Detect suspicious activities',
    examples: [
      'Failed login attempts',
      'Unauthorized access attempts',
      'Data export activities'
    ]
  },
  
  compliance: {
    description: 'Meet regulatory requirements',
    regulations: [
      'GDPR: Data access logs',
      'PCI DSS: Payment card logs',
      'SOX: Financial transaction logs'
    ]
  },
  
  troubleshooting: {
    description: 'Debug issues and understand system state',
    examples: [
      'When did this order status change?',
      'What was the old price before update?',
      'Who made this configuration change?'
    ]
  }
};
```

### Audit vs Regular Logs

| Feature | Regular Logs | Audit Logs |
|---|---|---|
| **Purpose** | Debugging, monitoring | Accountability, compliance |
| **Retention** | Days to weeks | Months to years (7+ years) |
| **Mutability** | Can be deleted | **Immutable** (cannot be changed) |
| **Structure** | Varies | Standardized |
| **Storage** | Files, console | Database, secure storage |
| **Access** | Developers | Auditors, compliance officers |

---

## 🔍 Events to Audit

### Authentication Events

**Why**: Security, compliance (track access).

```javascript
const AUTHENTICATION_EVENTS = {
  'user.login.success': {
    severity: 'info',
    fields: ['userId', 'email', 'ip', 'userAgent', 'timestamp']
  },
  
  'user.login.failure': {
    severity: 'warn',
    fields: ['email', 'ip', 'reason', 'attemptCount', 'timestamp']
  },
  
  'user.logout': {
    severity: 'info',
    fields: ['userId', 'email', 'timestamp']
  },
  
  'user.password.change': {
    severity: 'info',
    fields: ['userId', 'email', 'ip', 'timestamp']
  },
  
  'user.password.reset.request': {
    severity: 'info',
    fields: ['email', 'ip', 'timestamp']
  },
  
  'user.password.reset.complete': {
    severity: 'info',
    fields: ['userId', 'email', 'ip', 'timestamp']
  },
  
  'user.token.refresh': {
    severity: 'info',
    fields: ['userId', 'ip', 'timestamp']
  }
};
```

### Data Modification Events

**Why**: Track changes to critical data.

```javascript
const DATA_MODIFICATION_EVENTS = {
  'hotel.create': {
    severity: 'info',
    fields: ['userId', 'hotelId', 'hotelName', 'data', 'timestamp']
  },
  
  'hotel.update': {
    severity: 'info',
    fields: ['userId', 'hotelId', 'changes', 'before', 'after', 'timestamp']
  },
  
  'hotel.delete': {
    severity: 'warn',
    fields: ['userId', 'hotelId', 'hotelName', 'data', 'timestamp']
  },
  
  'room.create': {
    severity: 'info',
    fields: ['userId', 'roomId', 'hotelId', 'data', 'timestamp']
  },
  
  'room.price.update': {
    severity: 'info',
    fields: ['userId', 'roomId', 'oldPrice', 'newPrice', 'timestamp']
  },
  
  'order.create': {
    severity: 'info',
    fields: ['userId', 'orderId', 'totalPrice', 'items', 'timestamp']
  },
  
  'order.status.change': {
    severity: 'info',
    fields: ['userId', 'orderId', 'oldStatus', 'newStatus', 'timestamp']
  },
  
  'booking.create': {
    severity: 'info',
    fields: ['userId', 'bookingId', 'hotelId', 'checkIn', 'checkOut', 'timestamp']
  },
  
  'booking.cancel': {
    severity: 'warn',
    fields: ['userId', 'bookingId', 'reason', 'timestamp']
  }
};
```

### Admin Actions

**Why**: Track privileged operations.

```javascript
const ADMIN_EVENTS = {
  'user.role.change': {
    severity: 'warn',
    fields: ['adminId', 'targetUserId', 'oldRole', 'newRole', 'timestamp']
  },
  
  'user.delete': {
    severity: 'warn',
    fields: ['adminId', 'targetUserId', 'targetEmail', 'reason', 'timestamp']
  },
  
  'company.create': {
    severity: 'info',
    fields: ['adminId', 'companyId', 'companyName', 'timestamp']
  },
  
  'company.suspend': {
    severity: 'warn',
    fields: ['adminId', 'companyId', 'reason', 'timestamp']
  },
  
  'config.update': {
    severity: 'warn',
    fields: ['adminId', 'configKey', 'oldValue', 'newValue', 'timestamp']
  }
};
```

### Security Events

**Why**: Detect attacks and breaches.

```javascript
const SECURITY_EVENTS = {
  'access.unauthorized': {
    severity: 'warn',
    fields: ['userId', 'resource', 'action', 'ip', 'timestamp']
  },
  
  'access.forbidden': {
    severity: 'warn',
    fields: ['userId', 'resource', 'requiredRole', 'userRole', 'timestamp']
  },
  
  'login.locked': {
    severity: 'warn',
    fields: ['email', 'ip', 'attemptCount', 'lockDuration', 'timestamp']
  },
  
  'data.export': {
    severity: 'warn',
    fields: ['userId', 'entityType', 'recordCount', 'format', 'timestamp']
  },
  
  'api.rate.limit': {
    severity: 'warn',
    fields: ['userId', 'endpoint', 'requestCount', 'ip', 'timestamp']
  }
};
```

---

## 🗄️ Audit Log Schema

### Mongoose Schema

```javascript
// models/auditLog.schema.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Event details
  event: {
    type: String,
    required: true,
    index: true,
    enum: [
      // Authentication
      'user.login.success',
      'user.login.failure',
      'user.logout',
      'user.password.change',
      
      // Data modifications
      'hotel.create',
      'hotel.update',
      'hotel.delete',
      'order.create',
      'booking.cancel',
      
      // Admin actions
      'user.role.change',
      'user.delete',
      
      // Security
      'access.unauthorized',
      'login.locked'
    ]
  },
  
  severity: {
    type: String,
    enum: ['info', 'warn', 'error'],
    default: 'info',
    index: true
  },
  
  // Actor (who performed the action)
  actor: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    email: String,
    role: String,
    ip: String,
    userAgent: String
  },
  
  // Target (what was affected)
  target: {
    entityType: {
      type: String,
      enum: ['user', 'hotel', 'room', 'order', 'booking', 'company', 'config'],
      index: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true
    },
    entityName: String  // Human-readable name
  },
  
  // Action details
  action: {
    type: {
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'login', 'logout'],
      index: true
    },
    description: String  // Human-readable description
  },
  
  // Changes (before and after)
  changes: {
    before: mongoose.Schema.Types.Mixed,  // Old values
    after: mongoose.Schema.Types.Mixed    // New values
  },
  
  // Additional metadata
  metadata: {
    reason: String,      // Why action was performed
    requestId: String,   // Correlation ID
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true
    }
  },
  
  // Timestamp (immutable)
  timestamp: {
    type: Date,
    default: Date.now,
    immutable: true,
    index: true
  }
}, {
  timestamps: false  // Use custom timestamp field
});

// Indexes for common queries
auditLogSchema.index({ event: 1, timestamp: -1 });
auditLogSchema.index({ 'actor.userId': 1, timestamp: -1 });
auditLogSchema.index({ 'target.entityType': 1, 'target.entityId': 1, timestamp: -1 });
auditLogSchema.index({ 'metadata.company': 1, timestamp: -1 });

// Prevent modification of audit logs
auditLogSchema.pre('save', function(next) {
  if (!this.isNew) {
    return next(new Error('Audit logs cannot be modified'));
  }
  next();
});

// Prevent deletion (can be overridden for data retention policies)
auditLogSchema.pre('remove', function(next) {
  next(new Error('Audit logs cannot be deleted'));
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
```

---

## 🔧 Implementation

### Audit Logger Utility

```javascript
// utils/auditLogger.js
const AuditLog = require('../models/auditLog.schema');

class AuditLogger {
  /**
   * Log an audit event
   */
  static async log(event, {
    userId,
    email,
    role,
    ip,
    userAgent,
    entityType,
    entityId,
    entityName,
    actionType,
    description,
    before = null,
    after = null,
    reason = null,
    requestId = null,
    company = null,
    severity = 'info'
  }) {
    try {
      const auditLog = await AuditLog.create({
        event,
        severity,
        actor: {
          userId,
          email,
          role,
          ip,
          userAgent
        },
        target: {
          entityType,
          entityId,
          entityName
        },
        action: {
          type: actionType,
          description
        },
        changes: before || after ? {
          before,
          after
        } : undefined,
        metadata: {
          reason,
          requestId,
          company
        }
      });
      
      console.log(`✓ Audit log created: ${event}`);
      return auditLog;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit failure shouldn't break the application
    }
  }
  
  /**
   * Log user login
   */
  static async logLogin(user, req, success = true) {
    return this.log(
      success ? 'user.login.success' : 'user.login.failure',
      {
        userId: user?._id,
        email: user?.email || req.body.email,
        role: user?.companyRole,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        entityType: 'user',
        entityId: user?._id,
        actionType: 'login',
        description: success ? 'User logged in successfully' : 'Login attempt failed',
        requestId: req.correlationId,
        severity: success ? 'info' : 'warn'
      }
    );
  }
  
  /**
   * Log data modification
   */
  static async logModification(actionType, entityType, entity, user, req, before = null) {
    const event = `${entityType}.${actionType}`;
    
    return this.log(event, {
      userId: user._id,
      email: user.email,
      role: user.companyRole,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      entityType,
      entityId: entity._id,
      entityName: entity.name || entity.email || entity._id,
      actionType,
      description: `${entityType} ${actionType}d`,
      before,
      after: actionType === 'delete' ? null : entity.toObject(),
      requestId: req.correlationId,
      company: user.company
    });
  }
  
  /**
   * Log admin action
   */
  static async logAdminAction(event, admin, target, req, { before, after, reason }) {
    return this.log(event, {
      userId: admin._id,
      email: admin.email,
      role: admin.companyRole,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      entityType: target.entityType,
      entityId: target.entityId,
      entityName: target.entityName,
      actionType: target.actionType,
      description: event.replace(/\./g, ' '),
      before,
      after,
      reason,
      requestId: req.correlationId,
      company: admin.company,
      severity: 'warn'
    });
  }
}

module.exports = AuditLogger;
```

### Usage in Controllers

```javascript
// controllers/hotelController.js
const AuditLogger = require('../utils/auditLogger');

// Create hotel
const createHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.create({
    ...req.body,
    company: req.user.company
  });
  
  // Audit log
  await AuditLogger.logModification('create', 'hotel', hotel, req.user, req);
  
  res.status(201).json({
    success: true,
    data: hotel
  });
});

// Update hotel
const updateHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);
  
  if (!hotel) {
    throw new AppError('Hotel not found', 404);
  }
  
  // Save old values for audit
  const before = hotel.toObject();
  
  // Update hotel
  Object.assign(hotel, req.body);
  await hotel.save();
  
  // Audit log with before/after
  await AuditLogger.logModification('update', 'hotel', hotel, req.user, req, before);
  
  res.json({
    success: true,
    data: hotel
  });
});

// Delete hotel
const deleteHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);
  
  if (!hotel) {
    throw new AppError('Hotel not found', 404);
  }
  
  // Save data before deletion
  const hotelData = hotel.toObject();
  
  await hotel.remove();
  
  // Audit log
  await AuditLogger.logModification('delete', 'hotel', { _id: hotel._id, ...hotelData }, req.user, req, hotelData);
  
  res.status(204).send();
});
```

### Mongoose Middleware for Auto-Audit

```javascript
// Automatically audit all modifications
const AuditLogger = require('../utils/auditLogger');

// Add to schema
hotelSchema.post('save', async function(doc) {
  // Only audit if not a new document
  if (!this.isNew && this._auditContext) {
    await AuditLogger.logModification(
      'update',
      'hotel',
      doc,
      this._auditContext.user,
      this._auditContext.req,
      this._auditContext.before
    );
  }
});

// Usage in controller
const updateHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);
  const before = hotel.toObject();
  
  Object.assign(hotel, req.body);
  
  // Attach audit context
  hotel._auditContext = {
    user: req.user,
    req,
    before
  };
  
  await hotel.save();
  
  res.json({ success: true, data: hotel });
});
```

---

## 📜 Compliance Requirements

### GDPR (General Data Protection Regulation)

**Requirements**:

1. Log all personal data access
2. Retain logs for proof of compliance
3. Allow users to request their audit logs

```javascript
// Log data access
const getUserData = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  // Audit log: Data access
  await AuditLogger.log('user.data.access', {
    userId: req.user._id,
    email: req.user.email,
    entityType: 'user',
    entityId: user._id,
    actionType: 'read',
    description: 'User data accessed',
    reason: req.query.reason || 'Admin view',
    requestId: req.correlationId
  });
  
  res.json({ success: true, data: user });
});

// User requests their audit logs
const getMyAuditLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find({
    $or: [
      { 'actor.userId': req.user._id },
      { 'target.entityId': req.user._id }
    ]
  }).sort({ timestamp: -1 }).limit(100);
  
  res.json({ success: true, data: logs });
});
```

### PCI DSS (Payment Card Industry)

**Requirements**:

1. Log all payment transactions
2. Retain logs for 1 year minimum
3. Protect log access with encryption

```javascript
// Log payment transaction
const processPayment = asyncHandler(async (req, res) => {
  const payment = await stripe.charges.create({
    amount: req.body.amount,
    currency: 'usd',
    source: req.body.token
  });
  
  // Audit log: Payment
  await AuditLogger.log('payment.processed', {
    userId: req.user._id,
    email: req.user.email,
    entityType: 'order',
    entityId: req.body.orderId,
    actionType: 'update',
    description: 'Payment processed',
    after: {
      paymentId: payment.id,
      amount: payment.amount,
      status: payment.status,
      last4: payment.source.last4  // Only log last 4 digits
    },
    requestId: req.correlationId,
    severity: 'warn'
  });
  
  res.json({ success: true, data: payment });
});
```

### Retention Policy

```javascript
// Delete old audit logs (run as scheduled job)
const deleteOldAuditLogs = async () => {
  const retentionPeriod = 7 * 365 * 24 * 60 * 60 * 1000;  // 7 years
  const cutoffDate = new Date(Date.now() - retentionPeriod);
  
  // Exception: Keep payment logs forever
  const result = await AuditLog.deleteMany({
    timestamp: { $lt: cutoffDate },
    event: { $not: /^payment\./ }  // Don't delete payment logs
  });
  
  console.log(`Deleted ${result.deletedCount} old audit logs`);
};

// Schedule: Run monthly
const schedule = require('node-schedule');
schedule.scheduleJob('0 0 1 * *', deleteOldAuditLogs);
```

---

## 📊 Querying Audit Logs

### Common Queries

```javascript
// Get all actions by a specific user
const getUserActions = async (userId) => {
  return await AuditLog.find({
    'actor.userId': userId
  }).sort({ timestamp: -1 }).limit(100);
};

// Get all changes to a specific entity
const getEntityHistory = async (entityType, entityId) => {
  return await AuditLog.find({
    'target.entityType': entityType,
    'target.entityId': entityId
  }).sort({ timestamp: 1 });
};

// Get all failed login attempts
const getFailedLogins = async (startDate, endDate) => {
  return await AuditLog.find({
    event: 'user.login.failure',
    timestamp: { $gte: startDate, $lte: endDate }
  }).sort({ timestamp: -1 });
};

// Get all admin actions
const getAdminActions = async () => {
  return await AuditLog.find({
    event: /^(user\.role\.change|user\.delete|company\.|config\.)/
  }).sort({ timestamp: -1 });
};

// Get audit logs for a specific company
const getCompanyAuditLogs = async (companyId) => {
  return await AuditLog.find({
    'metadata.company': companyId
  }).sort({ timestamp: -1 });
};
```

---

## 📚 Related Documents

- [Error Handling Strategy](./error-handling-strategy.md)
- [Logging Levels](./logging-levels.md)
- [Structured Logging Format](./structured-logging-format.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive audit and activity logging with compliance guidelines
