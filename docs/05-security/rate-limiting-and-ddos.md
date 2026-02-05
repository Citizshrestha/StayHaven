# Rate Limiting & DDoS Protection

> API rate limiting strategies, DDoS mitigation, and request throttling in StayHaven

---

## 📋 Table of Contents

1. [Rate Limiting Overview](#rate-limiting-overview)
2. [Rate Limiting Implementation](#rate-limiting-implementation)
3. [DDoS Protection](#ddos-protection)
4. [Best Practices](#best-practices)

---

## 🚦 Rate Limiting Overview

### What is Rate Limiting?

**Rate limiting** restricts the number of requests a client can make to an API within a specific time window.

### Why Rate Limiting?

```
Benefits of Rate Limiting:
┌──────────────────────────────────────────────────┐
│  1. Prevent Abuse                                │
│     - Block brute force attacks                  │
│     - Prevent credential stuffing                │
│     - Stop automated scraping                    │
│                                                  │
│  2. Ensure Fair Usage                            │
│     - Prevent single user from hogging resources │
│     - Maintain service quality for all users     │
│                                                  │
│  3. Reduce Infrastructure Costs                  │
│     - Lower server load                          │
│     - Reduce bandwidth consumption               │
│     - Optimize database queries                  │
│                                                  │
│  4. Improve Stability                            │
│     - Prevent server overload                    │
│     - Graceful degradation under load            │
│     - Protect against DDoS attacks               │
└──────────────────────────────────────────────────┘
```

### Rate Limiting Strategies

```javascript
// 1. Fixed Window
// 100 requests per 15 minutes
// Resets at fixed intervals (e.g., :00, :15, :30, :45)

// 2. Sliding Window
// 100 requests per 15 minutes
// Window slides with each request

// 3. Token Bucket
// Bucket refills at constant rate
// Allows burst traffic

// 4. Leaky Bucket
// Requests queued and processed at fixed rate
// Smooths out traffic spikes
```

---

## ⚙️ Rate Limiting Implementation

### express-rate-limit Package

**Installation**:

```bash
npm install express-rate-limit
```

### Basic Rate Limiter

**File**: `middleware/rateLimiter.js`

```javascript
import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) // Seconds until reset
    });
  }
});
```

### Authentication Rate Limiter

```javascript
/**
 * Strict rate limiter for authentication routes
 * 5 attempts per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes.'
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again after 15 minutes.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});
```

### Apply Rate Limiters

**File**: `server.js`

```javascript
import express from 'express';
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';

const app = express();

// Apply to all API routes
app.use('/api', apiLimiter);

// Apply stricter limits to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/sendResetPasswordOtp', authLimiter);
```

### Custom Rate Limiter with Redis

```javascript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

// Create Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

await redisClient.connect();

/**
 * Rate limiter with Redis store (for distributed systems)
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:' // Rate limit key prefix
  }),
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});
```

### Per-User Rate Limiting

```javascript
/**
 * Rate limit by user ID (not IP)
 * Different limits for different user types
 */
export const userRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    // Higher limits for authenticated users
    if (req.user) {
      return req.user.role.name === 'admin' ? 1000 : 200;
    }
    // Lower limits for anonymous users
    return 50;
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user ? req.user._id.toString() : req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for admin
    return req.user && req.user.role.name === 'admin';
  }
});
```

### Endpoint-Specific Rate Limits

```javascript
// High-traffic endpoints
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30 // 30 searches per minute
});

// Resource-intensive endpoints
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10 // 10 reports per hour
});

// Upload endpoints
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20 // 20 uploads per 15 minutes
});

// Apply to specific routes
app.get('/api/search', searchLimiter, searchHandler);
app.get('/api/reports', protect, reportLimiter, generateReport);
app.post('/api/upload', protect, uploadLimiter, uploadFile);
```

---

## 🛡️ DDoS Protection

### DDoS Attack Types

```
1. Volumetric Attacks
   - UDP floods
   - ICMP floods
   - DNS amplification

2. Protocol Attacks
   - SYN floods
   - Ping of Death
   - Smurf attacks

3. Application Layer Attacks (Layer 7)
   - HTTP floods
   - Slowloris
   - Zero-day exploits
```

### Application-Level DDoS Protection

#### 1. Slow Request Handling

```javascript
import slowDown from 'express-slow-down';

/**
 * Slow down requests after limit
 * Progressive delay instead of blocking
 */
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests at full speed
  delayMs: 500, // Add 500ms delay per request above delayAfter
  maxDelayMs: 20000 // Maximum delay of 20 seconds
});

app.use('/api', speedLimiter);
```

#### 2. Request Size Limits

```javascript
import express from 'express';

// Limit request body size
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom size limit middleware
app.use((req, res, next) => {
  const contentLength = req.headers['content-length'];

  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    return res.status(413).json({
      success: false,
      message: 'Request payload too large'
    });
  }

  next();
});
```

#### 3. Timeout Configuration

```javascript
import timeout from 'connect-timeout';

// Request timeout (30 seconds)
app.use(timeout('30s'));

// Timeout handler
app.use((req, res, next) => {
  if (!req.timedout) {
    next();
  }
});

// Route-specific timeout
app.post('/api/heavy-operation',
  timeout('120s'),
  haltOnTimedout,
  heavyOperationHandler
);

function haltOnTimedout(req, res, next) {
  if (!req.timedout) {
    next();
  } else {
    res.status(503).json({
      success: false,
      message: 'Request timeout, please try again'
    });
  }
}
```

#### 4. IP Blocking

```javascript
/**
 * Block suspicious IPs
 * Store in Redis or database
 */
const blockedIPs = new Set([
  '192.168.1.100',
  '10.0.0.50'
]);

app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;

  if (blockedIPs.has(clientIP)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  next();
});

// Automatic blocking after rate limit violations
export const aggressiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    // Add IP to blocked list
    blockedIPs.add(req.ip);
    
    // Log for review
    console.log(`Blocked IP: ${req.ip} at ${new Date()}`);
    
    res.status(429).json({
      success: false,
      message: 'Too many requests. Your IP has been temporarily blocked.'
    });
  }
});
```

### Infrastructure-Level Protection

#### 1. Reverse Proxy (Nginx)

```nginx
# nginx.conf

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

server {
    listen 80;
    server_name api.stayhaven.com;

    # Connection limits
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
    limit_conn conn_limit 10; # Max 10 concurrent connections per IP

    # Request body size limit
    client_max_body_size 10M;

    # Timeout configuration
    client_body_timeout 30s;
    client_header_timeout 30s;
    send_timeout 30s;

    location /api {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://localhost:3000;
    }

    location /api/auth {
        limit_req zone=auth_limit burst=3 nodelay;
        proxy_pass http://localhost:3000;
    }
}
```

#### 2. CDN (Cloudflare)

```javascript
// Cloudflare configuration
- DDoS Protection: Automatic
- Rate Limiting: 10,000 requests/hour
- WAF (Web Application Firewall): Enabled
- Bot Management: Challenge bots
- IP Reputation: Block known malicious IPs
```

#### 3. Load Balancer

```javascript
// AWS Application Load Balancer
- Connection draining
- Health checks
- Traffic distribution
- DDoS mitigation at network layer
```

---

## 🔒 Best Practices

### 1. Layer Rate Limiting

```javascript
// Layer 1: Network (Cloudflare/CDN)
// Layer 2: Load Balancer
// Layer 3: Reverse Proxy (Nginx)
// Layer 4: Application (Express)

// Multiple layers provide defense in depth
```

### 2. Different Limits for Different Endpoints

```javascript
// Public endpoints: Strict limits
app.use('/api/public', rateLimit({ max: 50 }));

// Authenticated endpoints: Moderate limits
app.use('/api/protected', protect, rateLimit({ max: 200 }));

// Admin endpoints: No limits
app.use('/api/admin', protect, authorize('admin'), (req, res, next) => next());
```

### 3. Use Redis for Distributed Systems

```javascript
// When running multiple servers, use Redis
// to share rate limit counters across instances

export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:'
  }),
  // ... other options
});
```

### 4. Monitor Rate Limit Violations

```javascript
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  handler: (req, res) => {
    // Log violation
    console.warn({
      type: 'RATE_LIMIT_VIOLATION',
      ip: req.ip,
      path: req.path,
      timestamp: new Date()
    });

    // Alert if threshold exceeded
    if (req.rateLimit.current > 150) {
      // Send alert to monitoring service
      alertService.send({
        level: 'warning',
        message: `Excessive requests from ${req.ip}`
      });
    }

    res.status(429).json({
      success: false,
      message: 'Too many requests'
    });
  }
});
```

### 5. Whitelist Trusted IPs

```javascript
const trustedIPs = ['192.168.1.1', '10.0.0.1'];

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => {
    // Skip rate limiting for trusted IPs
    return trustedIPs.includes(req.ip);
  }
});
```

### 6. Implement Exponential Backoff

```javascript
// Client-side: Exponential backoff on 429
async function fetchWithBackoff(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status !== 429) {
      return response;
    }

    // Exponential backoff: 2^i seconds
    const delay = Math.pow(2, i) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error('Max retries reached');
}
```

### 7. Rate Limit Headers

```javascript
// Express-rate-limit automatically adds headers:
// RateLimit-Limit: 100
// RateLimit-Remaining: 95
// RateLimit-Reset: 1612137600

// Client can use these to avoid hitting limits
if (response.headers.get('RateLimit-Remaining') < 10) {
  console.warn('Approaching rate limit');
}
```

---

## 📚 Related Documents

- [Security Overview](./security-overview.md)
- [API Security Best Practices](./api-security-best-practices.md)
- [Security Known Risks](./security-known-risks.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive rate limiting and DDoS protection documentation
