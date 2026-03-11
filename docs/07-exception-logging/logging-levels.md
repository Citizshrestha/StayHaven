# Logging Levels

> Log level hierarchy and usage guidelines for StayHaven

---

## 📋 Table of Contents

1. [Log Level Overview](#log-level-overview)
2. [Log Level Definitions](#log-level-definitions)
3. [When to Use Each Level](#when-to-use-each-level)
4. [Environment-Based Configuration](#environment-based-configuration)
5. [Winston Logger Setup](#winston-logger-setup)

---

## 📊 Log Level Overview

### Log Level Hierarchy

```bash
┌──────────────────────────────────────────────┐
│               Log Levels                     │
│   (from most severe to least severe)         │
└──────────────────────────────────────────────┘

        ▼ MOST SEVERE (always logged)

┌──────────────────────────────────────────────┐
│  ERROR - System failures, critical issues    │
│  • Database connection lost                  │
│  • Unhandled exceptions                      │
│  • Payment processing failed                 │
└──────────────────────────────────────────────┘
                    ▼
┌──────────────────────────────────────────────┐
│  WARN - Concerning but not critical          │
│  • Deprecated API usage                      │
│  • Slow query performance                    │
│  • High memory usage                         │
└──────────────────────────────────────────────┘
                    ▼
┌──────────────────────────────────────────────┐
│  INFO - Normal operations, important events  │
│  • User logged in                            │
│  • Order created                             │
│  • Server started                            │
└──────────────────────────────────────────────┘
                    ▼
┌──────────────────────────────────────────────┐
│  HTTP - HTTP request logs                    │
│  • GET /api/hotels - 200 - 45ms              │
│  • POST /api/orders - 201 - 123ms            │
└──────────────────────────────────────────────┘
                    ▼
┌──────────────────────────────────────────────┐
│  DEBUG - Detailed diagnostic information     │
│  • Function entry/exit                       │
│  • Variable values                           │
│  • Query parameters                          │
└──────────────────────────────────────────────┘
                    ▼
┌──────────────────────────────────────────────┐
│  TRACE - Extremely detailed (rarely used)    │
│  • Every step of execution                   │
│  • Full object dumps                         │
└──────────────────────────────────────────────┘

        ▼ LEAST SEVERE (most verbose)
```

---

## 🏷️ Log Level Definitions

### ERROR

**Purpose**: System failures requiring immediate attention.

**Color**: 🔴 Red  
**Priority**: Highest  
**Production**: Always logged  
**Alerts**: Trigger notifications (PagerDuty, email)

**Examples**:

```javascript
// Database connection failure
logger.error('MongoDB connection failed', {
  error: err.message,
  stack: err.stack,
  timestamp: new Date()
});

// Unhandled exception
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', {
    error: err.message,
    stack: err.stack
  });
  process.exit(1);
});

// Payment processing error
logger.error('Payment processing failed', {
  orderId: order._id,
  userId: user._id,
  amount: order.totalPrice,
  error: err.message
});

// External service failure
logger.error('Cloudinary upload failed', {
  file: file.originalname,
  size: file.size,
  error: err.message
});
```

### WARN

**Purpose**: Concerning issues that don't stop execution but need attention.

**Color**: 🟡 Yellow  
**Priority**: High  
**Production**: Always logged  
**Alerts**: Optional notifications

**Examples**:

```javascript
// Deprecated API usage
logger.warn('Deprecated endpoint accessed', {
  endpoint: req.originalUrl,
  method: req.method,
  userId: req.user?._id,
  message: 'This endpoint will be removed in v2.0'
});

// Slow query performance
logger.warn('Slow query detected', {
  query: 'Order.find()',
  duration: '2345ms',
  threshold: '1000ms'
});

// High memory usage
logger.warn('High memory usage', {
  used: process.memoryUsage().heapUsed,
  total: process.memoryUsage().heapTotal,
  percentage: '85%'
});

// Failed login attempts
logger.warn('Multiple failed login attempts', {
  email: req.body.email,
  attempts: 4,
  ip: req.ip,
  lockoutIn: 1  // 1 more attempt before lockout
});

// Missing optional configuration
logger.warn('Optional config missing', {
  config: 'CLOUDINARY_API_KEY',
  impact: 'Image uploads will be disabled'
});
```

### INFO

**Purpose**: Normal operations and important business events.

**Color**: 🔵 Blue  
**Priority**: Medium  
**Production**: Logged in production  
**Alerts**: No alerts

**Examples**:

```javascript
// Server startup
logger.info('Server started', {
  port: process.env.PORT,
  environment: process.env.NODE_ENV,
  timestamp: new Date()
});

// User authentication
logger.info('User logged in', {
  userId: user._id,
  email: user.email,
  role: user.companyRole,
  ip: req.ip
});

// Order creation
logger.info('Order created', {
  orderId: order._id,
  userId: user._id,
  hotelId: order.hotel,
  totalPrice: order.totalPrice,
  items: order.items.length
});

// Booking confirmation
logger.info('Booking confirmed', {
  bookingId: booking._id,
  userId: user._id,
  hotelId: booking.hotel,
  checkIn: booking.checkIn,
  checkOut: booking.checkOut
});

// Scheduled task execution
logger.info('Daily cleanup task completed', {
  deletedRecords: 150,
  duration: '3.2s'
});
```

### HTTP

**Purpose**: HTTP request/response logs.

**Color**: 🟢 Green  
**Priority**: Low  
**Production**: Optional (can be noisy)  
**Alerts**: No alerts

**Examples**:

```javascript
// Request logging (Morgan middleware)
logger.http('GET /api/hotels', {
  method: 'GET',
  url: '/api/hotels',
  status: 200,
  duration: '45ms',
  userAgent: req.headers['user-agent'],
  ip: req.ip
});

// Response logging
logger.http('POST /api/orders', {
  method: 'POST',
  url: '/api/orders',
  status: 201,
  duration: '123ms',
  body: sanitizeBody(req.body)
});
```

### DEBUG

**Purpose**: Detailed diagnostic information for developers.

**Color**: ⚪ White  
**Priority**: Very Low  
**Production**: **NOT logged** (only development)  
**Alerts**: No alerts

**Examples**:

```javascript
// Function entry/exit
logger.debug('Entering getHotels controller', {
  userId: req.user._id,
  params: req.params,
  query: req.query
});

logger.debug('Exiting getHotels controller', {
  hotelsCount: hotels.length,
  duration: '234ms'
});

// Variable values
logger.debug('Query parameters', {
  company: req.user.company,
  city: req.query.city,
  minPrice: req.query.minPrice,
  maxPrice: req.query.maxPrice
});

// Conditional logic
logger.debug('Checking user permissions', {
  userRole: req.user.companyRole,
  requiredRoles: ['owner', 'manager'],
  hasPermission: hasPermission
});

// Database queries
logger.debug('Executing query', {
  model: 'Hotel',
  query: { company: req.user.company, city: 'Kathmandu' },
  sort: { createdAt: -1 }
});
```

### TRACE

**Purpose**: Extremely detailed logs (rarely used).

**Color**: ⚪ Gray  
**Priority**: Lowest  
**Production**: **NEVER logged**  
**Alerts**: No alerts

**Examples**:

```javascript
// Full object dumps
logger.trace('Request object', {
  req: JSON.stringify(req, null, 2)
});

// Step-by-step execution
logger.trace('Step 1: Validating input');
logger.trace('Step 2: Checking authentication');
logger.trace('Step 3: Querying database');
logger.trace('Step 4: Formatting response');
```

---

## 🎯 When to Use Each Level

### Decision Matrix

| Scenario | Level | Reason |
|---|---|---|
| Database connection lost | ❌ ERROR | Critical - system cannot function |
| Unhandled exception | ❌ ERROR | Critical - unknown state |
| Payment processing failed | ❌ ERROR | Critical - money involved |
| User not found (404) | ℹ️ INFO | Normal - not an error |
| Invalid login credentials | ℹ️ INFO | Normal - not an error |
| Deprecated API used | ⚠️ WARN | Concerning - needs migration |
| Slow query (>1s) | ⚠️ WARN | Concerning - performance issue |
| 4th failed login attempt | ⚠️ WARN | Concerning - potential attack |
| User logged in | ℹ️ INFO | Normal business event |
| Order created | ℹ️ INFO | Normal business event |
| Server started | ℹ️ INFO | Normal system event |
| GET /api/hotels - 200 | 🌐 HTTP | HTTP request log |
| POST /api/orders - 201 | 🌐 HTTP | HTTP request log |
| Function parameters | 🐛 DEBUG | Development diagnostic |
| Variable values | 🐛 DEBUG | Development diagnostic |
| Full object dump | 🔍 TRACE | Extreme debugging (rarely used) |

### Common Mistakes

❌ **Don't do this**:

```javascript
// Logging 404 as ERROR (it's normal)
logger.error('Hotel not found', { hotelId: req.params.id });

// Logging every variable as INFO (too verbose)
logger.info('Variable x', { x });
logger.info('Variable y', { y });

// Using DEBUG in production
if (process.env.NODE_ENV === 'production') {
  logger.debug('Debug info');  // ❌ Will clutter logs
}
```

✅ **Do this**:

```javascript
// Log 404 as INFO (or don't log at all)
logger.info('Hotel not found', { hotelId: req.params.id });

// Use DEBUG for diagnostic info
logger.debug('Variables', { x, y, z });

// Only log DEBUG in development
if (process.env.NODE_ENV === 'development') {
  logger.debug('Debug info');  // ✅
}
```

---

## ⚙️ Environment-Based Configuration

### Development

**Log Levels**: All levels (ERROR, WARN, INFO, HTTP, DEBUG, TRACE)  
**Format**: Colorized, pretty-printed  
**Output**: Console only

```javascript
// Development configuration
if (process.env.NODE_ENV === 'development') {
  logger.level = 'debug';  // Log everything from DEBUG and above
  
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}
```

### Production

**Log Levels**: ERROR, WARN, INFO  
**Format**: JSON  
**Output**: Files + External services (Sentry, LogRocket)

```javascript
// Production configuration
if (process.env.NODE_ENV === 'production') {
  logger.level = 'info';  // Only INFO and above
  
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error'  // Only errors
  }));
  
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log'  // All logs
  }));
}
```

### Staging

**Log Levels**: ERROR, WARN, INFO, HTTP  
**Format**: JSON  
**Output**: Files

```javascript
// Staging configuration
if (process.env.NODE_ENV === 'staging') {
  logger.level = 'http';  // Include HTTP logs
  
  logger.add(new winston.transports.File({
    filename: 'logs/staging.log'
  }));
}
```

---

## 🔧 Winston Logger Setup

### Complete Logger Configuration

```javascript
// utils/logger.js
const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'blue',
  http: 'green',
  debug: 'white',
  trace: 'gray'
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define transports
const transports = [
  // Error logs
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    maxsize: 5242880,  // 5MB
    maxFiles: 5
  }),
  
  // Combined logs
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/combined.log'),
    maxsize: 5242880,
    maxFiles: 5
  })
];

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      )
    })
  );
}

// Create logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/exceptions.log')
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/rejections.log')
    })
  ]
});

module.exports = logger;
```

### Usage Examples

```javascript
// Import logger
const logger = require('./utils/logger');

// Log different levels
logger.error('Database connection failed', { error: err.message });
logger.warn('Slow query detected', { duration: '2s', query: 'Order.find()' });
logger.info('User logged in', { userId: user._id, email: user.email });
logger.http('GET /api/hotels - 200 - 45ms');
logger.debug('Query parameters', { company: req.user.company });
logger.trace('Full request object', { req });

// Log with metadata
logger.info('Order created', {
  orderId: order._id,
  userId: user._id,
  totalPrice: order.totalPrice,
  timestamp: new Date()
});
```

### Morgan Integration (HTTP Logging)

```javascript
// server.js
const morgan = require('morgan');
const logger = require('./utils/logger');

// Create stream for Morgan
const stream = {
  write: (message) => logger.http(message.trim())
};

// Use Morgan middleware
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream }));
```

---

## 📚 Related Documents

- [Error Handling Strategy](./error-handling-strategy.md)
- [Structured Logging Format](./structured-logging-format.md)
- [Audit and Activity Logs](./audit-and-activity-logs.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive logging levels guide with Winston
