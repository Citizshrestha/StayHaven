# Structured Logging Format

> JSON logging format and log aggregation for StayHaven

---

## 📋 Table of Contents

1. [Structured Logging Overview](#structured-logging-overview)
2. [JSON Log Format](#json-log-format)
3. [Log Context Enrichment](#log-context-enrichment)
4. [Correlation IDs](#correlation-ids)
5. [Log Aggregation](#log-aggregation)

---

## 📊 Structured Logging Overview

### Why Structured Logging?

**Traditional logging** (plain text):

```
2026-02-02 10:30:15 User user@example.com logged in from 192.168.1.1
2026-02-02 10:31:22 Order 507f1f77bcf86cd799439011 created by user 507f1f77bcf86cd799439012
```

❌ **Problems**:

- Hard to parse programmatically
- Cannot filter by specific fields
- Difficult to aggregate metrics
- No consistent structure

**Structured logging** (JSON):

```json
{
  "timestamp": "2026-02-02T10:30:15.234Z",
  "level": "info",
  "message": "User logged in",
  "context": {
    "userId": "507f1f77bcf86cd799439012",
    "email": "user@example.com",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

✅ **Benefits**:

- Machine-readable (JSON)
- Easy to query and filter
- Consistent structure
- Supports log aggregation tools (ELK, Splunk, Datadog)

---

## 🗂️ JSON Log Format

### Standard Log Structure

```typescript
interface LogEntry {
  timestamp: string;        // ISO 8601 format
  level: string;            // error | warn | info | http | debug
  message: string;          // Human-readable message
  context?: {               // Additional context (varies by event)
    userId?: string;
    email?: string;
    hotelId?: string;
    orderId?: string;
    // ... other fields
  };
  error?: {                 // Error details (if applicable)
    message: string;
    stack?: string;
    code?: string;
  };
  request?: {               // HTTP request details (if applicable)
    method: string;
    url: string;
    ip: string;
    userAgent: string;
  };
  response?: {              // HTTP response details (if applicable)
    statusCode: number;
    duration: number;       // milliseconds
  };
  correlationId?: string;   // Request correlation ID
}
```

### Example Log Entries

#### User Login

```json
{
  "timestamp": "2026-02-02T10:30:15.234Z",
  "level": "info",
  "message": "User logged in",
  "context": {
    "userId": "507f1f77bcf86cd799439012",
    "email": "user@example.com",
    "role": "waiter",
    "company": "507f1f77bcf86cd799439013"
  },
  "request": {
    "method": "POST",
    "url": "/api/auth/login",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
  },
  "correlationId": "req-abc123xyz"
}
```

#### Order Created

```json
{
  "timestamp": "2026-02-02T10:31:22.567Z",
  "level": "info",
  "message": "Order created",
  "context": {
    "orderId": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "hotelId": "507f1f77bcf86cd799439014",
    "totalPrice": 1500,
    "itemsCount": 3,
    "orderType": "restaurant"
  },
  "correlationId": "req-def456uvw"
}
```

#### Database Error

```json
{
  "timestamp": "2026-02-02T10:32:45.890Z",
  "level": "error",
  "message": "Database query failed",
  "context": {
    "query": "Hotel.findById()",
    "hotelId": "507f1f77bcf86cd799439015"
  },
  "error": {
    "message": "Connection timeout",
    "code": "ETIMEDOUT",
    "stack": "Error: Connection timeout\n    at Timeout._onTimeout (/node_modules/mongodb/lib/core/connection/pool.js:123:45)\n    ..."
  },
  "correlationId": "req-ghi789rst"
}
```

#### HTTP Request

```json
{
  "timestamp": "2026-02-02T10:33:10.123Z",
  "level": "http",
  "message": "HTTP Request",
  "request": {
    "method": "GET",
    "url": "/api/hotels",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  },
  "response": {
    "statusCode": 200,
    "duration": 45
  },
  "correlationId": "req-jkl012mno"
}
```

---

## 🏷️ Log Context Enrichment

### Request-Level Context

**Add context to all logs within a request lifecycle.**

```javascript
// middleware/logContext.js
const { v4: uuidv4 } = require('uuid');
const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

// Middleware to create log context
const logContextMiddleware = (req, res, next) => {
  const context = {
    correlationId: req.headers['x-correlation-id'] || uuidv4(),
    userId: null,  // Will be set after authentication
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  };
  
  // Store context in AsyncLocalStorage
  asyncLocalStorage.run(context, () => {
    // Add correlation ID to response headers
    res.setHeader('X-Correlation-ID', context.correlationId);
    
    next();
  });
};

// Get current context
const getLogContext = () => {
  return asyncLocalStorage.getStore() || {};
};

// Update context (e.g., after authentication)
const setLogContext = (key, value) => {
  const context = asyncLocalStorage.getStore();
  if (context) {
    context[key] = value;
  }
};

module.exports = {
  logContextMiddleware,
  getLogContext,
  setLogContext
};
```

### Enriched Logger

```javascript
// utils/logger.js (enhanced)
const winston = require('winston');
const { getLogContext } = require('../middleware/logContext');

// Custom format that includes context
const enrichedFormat = winston.format((info) => {
  const context = getLogContext();
  
  return {
    ...info,
    correlationId: context.correlationId,
    request: context.method && context.url ? {
      method: context.method,
      url: context.url,
      ip: context.ip,
      userAgent: context.userAgent
    } : undefined,
    context: {
      ...info.context,
      userId: context.userId
    }
  };
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    enrichedFormat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

module.exports = logger;
```

### Usage with Context

```javascript
// In protect middleware (after authentication)
const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies.accessToken;
  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  
  const user = await User.findById(decoded.id);
  req.user = user;
  
  // Enrich log context with user info
  setLogContext('userId', user._id.toString());
  setLogContext('userEmail', user.email);
  setLogContext('userRole', user.companyRole);
  
  next();
});

// In controller
const createOrder = asyncHandler(async (req, res) => {
  const order = await Order.create({
    ...req.body,
    user: req.user._id
  });
  
  // Logger automatically includes correlationId and userId
  logger.info('Order created', {
    context: {
      orderId: order._id,
      totalPrice: order.totalPrice
    }
  });
  
  res.status(201).json({ success: true, data: order });
});
```

---

## 🔗 Correlation IDs

### What is a Correlation ID?

A **correlation ID** is a unique identifier that tracks a request through the entire system, including:

- Frontend → Backend
- Backend → Database
- Backend → External services
- Async operations (Socket.IO, background jobs)

### Implementation

#### 1. Generate Correlation ID

```javascript
// middleware/logContext.js
const { v4: uuidv4 } = require('uuid');

const logContextMiddleware = (req, res, next) => {
  // Check if client sent correlation ID
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  
  // Store in request
  req.correlationId = correlationId;
  
  // Add to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Store in async local storage
  asyncLocalStorage.run({ correlationId }, () => {
    next();
  });
};
```

#### 2. Frontend Sends Correlation ID

```javascript
// axiosClient.js (frontend)
import { v4 as uuidv4 } from 'uuid';

axiosClient.interceptors.request.use((config) => {
  // Generate or reuse correlation ID
  if (!config.headers['X-Correlation-ID']) {
    config.headers['X-Correlation-ID'] = uuidv4();
  }
  
  return config;
});
```

#### 3. Include in All Logs

```javascript
// Every log includes correlationId
logger.info('Order created', {
  context: { orderId: order._id },
  correlationId: req.correlationId  // Automatically included
});

logger.error('Payment failed', {
  context: { orderId: order._id, amount: order.totalPrice },
  error: { message: err.message },
  correlationId: req.correlationId
});
```

#### 4. Trace Request Flow

```
Frontend Request (correlationId: req-abc123xyz)
  ↓
Backend API (correlationId: req-abc123xyz)
  ├─ Log: "User authentication started"
  ├─ Log: "User authenticated successfully"
  ├─ Database Query (correlationId: req-abc123xyz)
  │   └─ Log: "Order query executed"
  ├─ External Service (correlationId: req-abc123xyz)
  │   └─ Log: "Stripe payment initiated"
  └─ Log: "Order created successfully"
  ↓
Response (X-Correlation-ID: req-abc123xyz)
```

**Query logs by correlation ID**:

```bash
# Find all logs for a specific request
cat logs/combined.log | grep "req-abc123xyz"
```

---

## 📦 Log Aggregation

### ELK Stack (Elasticsearch, Logstash, Kibana)

#### 1. Install Filebeat

```bash
# Install Filebeat to ship logs to Elasticsearch
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.6.0-amd64.deb
sudo dpkg -i filebeat-8.6.0-amd64.deb
```

#### 2. Configure Filebeat

```yaml
# /etc/filebeat/filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/www/stayhaven/logs/*.log
    json.keys_under_root: true
    json.add_error_key: true

output.elasticsearch:
  hosts: ["localhost:9200"]
  index: "stayhaven-logs-%{+yyyy.MM.dd}"

setup.kibana:
  host: "localhost:5601"
```

#### 3. Query Logs in Kibana

```json
// Find all errors for a specific user
{
  "query": {
    "bool": {
      "must": [
        { "match": { "level": "error" } },
        { "match": { "context.userId": "507f1f77bcf86cd799439012" } }
      ]
    }
  }
}

// Find all logs for a specific correlation ID
{
  "query": {
    "match": { "correlationId": "req-abc123xyz" }
  }
}

// Find slow API requests (>1 second)
{
  "query": {
    "range": {
      "response.duration": { "gte": 1000 }
    }
  }
}
```

### Splunk

```javascript
// Send logs to Splunk HTTP Event Collector
const SplunkLogger = require('splunk-logging').Logger;

const splunkLogger = new SplunkLogger({
  token: process.env.SPLUNK_TOKEN,
  url: process.env.SPLUNK_URL
});

// Send log to Splunk
splunkLogger.send({
  message: logEntry,
  severity: 'info'
});
```

### Datadog

```javascript
// Install Datadog Winston transport
const datadogTransport = require('@datadog/winston');

logger.add(new datadogTransport({
  apiKey: process.env.DATADOG_API_KEY,
  hostname: 'stayhaven-api',
  service: 'backend',
  ddsource: 'nodejs',
  ddtags: 'env:production,version:1.0.0'
}));
```

### Winston File Rotation

```javascript
// Rotate log files automatically
const winston = require('winston');
require('winston-daily-rotate-file');

const transport = new winston.transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',  // 20 MB
  maxFiles: '14d'  // Keep logs for 14 days
});

logger.add(transport);
```

---

## 🔍 Searchable Logs

### Query Examples

```javascript
// Find all errors for a specific order
const logs = await Log.find({
  level: 'error',
  'context.orderId': '507f1f77bcf86cd799439011'
});

// Find all logs for a specific user
const logs = await Log.find({
  'context.userId': '507f1f77bcf86cd799439012'
}).sort({ timestamp: -1 }).limit(100);

// Find all slow requests
const logs = await Log.find({
  level: 'http',
  'response.duration': { $gte: 1000 }
});

// Find all logs for a specific correlation ID
const logs = await Log.find({
  correlationId: 'req-abc123xyz'
}).sort({ timestamp: 1 });
```

### Log Filtering

```javascript
// Filter logs by date range
const logs = await Log.find({
  timestamp: {
    $gte: new Date('2026-02-01'),
    $lte: new Date('2026-02-02')
  }
});

// Filter logs by multiple criteria
const logs = await Log.find({
  level: { $in: ['error', 'warn'] },
  'context.company': '507f1f77bcf86cd799439013',
  timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }  // Last 24 hours
});
```

---

## 📚 Related Documents

- [Logging Levels](./logging-levels.md)
- [Error Handling Strategy](./error-handling-strategy.md)
- [Audit and Activity Logs](./audit-and-activity-logs.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive structured logging format with JSON, correlation IDs, and aggregation
