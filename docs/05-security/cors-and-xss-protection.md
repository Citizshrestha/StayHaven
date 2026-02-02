# CORS & XSS Protection

> Cross-Origin Resource Sharing (CORS) configuration and Cross-Site Scripting (XSS) prevention strategies in StayHaven

---

## 📋 Table of Contents

1. [CORS Overview](#cors-overview)
2. [CORS Configuration](#cors-configuration)
3. [XSS Overview](#xss-overview)
4. [XSS Prevention](#xss-prevention)
5. [CSP Headers](#csp-headers)
6. [Security Best Practices](#security-best-practices)

---

## 🌐 CORS Overview

### What is CORS?

**Cross-Origin Resource Sharing (CORS)** is a security mechanism that allows or restricts resources on a web server to be requested from another domain.

### Same-Origin Policy

```javascript
// Same Origin (Allowed)
http://example.com:3000/api/users
http://example.com:3000/api/orders
// ✅ Same protocol, domain, and port

// Different Origins (Blocked without CORS)
http://example.com:3000  →  http://api.example.com:3000  // Different subdomain
http://example.com:3000  →  http://example.com:4000     // Different port
http://example.com:3000  →  https://example.com:3000    // Different protocol
```

### CORS Flow

```
┌─────────────┐                           ┌─────────────┐
│   Browser   │                           │   Server    │
│ (Frontend)  │                           │  (Backend)  │
└──────┬──────┘                           └──────┬──────┘
       │                                         │
       │  1. Preflight Request (OPTIONS)         │
       │  Origin: http://localhost:5173          │
       │────────────────────────────────────────>│
       │                                         │
       │  2. CORS Check                          │
       │     Is origin allowed?                  │
       │     Is method allowed?                  │
       │     Are headers allowed?                │
       │<────────────────────────────────────────│
       │  3. Preflight Response                  │
       │  Access-Control-Allow-Origin: ...       │
       │  Access-Control-Allow-Methods: ...      │
       │  Access-Control-Allow-Headers: ...      │
       │                                         │
       │  4. Actual Request (GET/POST/etc)       │
       │────────────────────────────────────────>│
       │                                         │
       │  5. Response with CORS headers          │
       │<────────────────────────────────────────│
       │                                         │
```

---

## ⚙️ CORS Configuration

### StayHaven CORS Setup

**File**: `server.js`

```javascript
import express from 'express';
import cors from 'cors';

const app = express();

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept'
  ],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400 // 24 hours (cache preflight response)
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));
```

### Environment Variable

```env
# .env
FRONTEND_URL=http://localhost:5173  # Development
# FRONTEND_URL=https://stayhaven.com  # Production
```

### CORS Option Explanation

#### 1. origin

```javascript
// ✅ Single origin (most secure)
origin: 'http://localhost:5173'

// ✅ Multiple origins
origin: ['http://localhost:5173', 'https://stayhaven.com']

// ✅ Dynamic origin validation
origin: (origin, callback) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'https://stayhaven.com',
    'https://www.stayhaven.com'
  ];

  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
}

// ❌ Allow all origins (insecure)
origin: '*'  // Never use in production!
```

#### 2. credentials

```javascript
// ✅ Allow cookies (required for HTTP-only cookies)
credentials: true

// ❌ Block cookies
credentials: false  // Cookies won't be sent
```

#### 3. methods

```javascript
// ✅ Specific methods
methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

// ⚠️ All methods
methods: '*'  // Less secure
```

#### 4. allowedHeaders

```javascript
// ✅ Specific headers
allowedHeaders: [
  'Content-Type',
  'Authorization',
  'X-Requested-With'
]

// ❌ All headers
allowedHeaders: '*'  // Less secure
```

### Frontend CORS Configuration

**File**: `frontend/src/axiosClient.js`

```javascript
import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor
axiosClient.interceptors.request.use(
  config => {
    // Add Authorization header if token exists
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

export default axiosClient;
```

---

## 🛡️ XSS Overview

### What is XSS?

**Cross-Site Scripting (XSS)** is a vulnerability that allows attackers to inject malicious scripts into web pages viewed by other users.

### XSS Types

#### 1. Stored XSS (Persistent)

```javascript
// Attacker submits malicious script
POST /api/comments
{
  "text": "<script>sendToAttacker(document.cookie)</script>"
}

// Stored in database
// Executed when other users view the comment
// Most dangerous type
```

#### 2. Reflected XSS (Non-Persistent)

```javascript
// Attacker sends malicious link
https://example.com/search?q=<script>alert('XSS')</script>

// Script executed from URL parameter
// Requires user to click malicious link
```

#### 3. DOM-based XSS

```javascript
// Vulnerable code
const name = location.hash.substring(1);
document.getElementById('welcome').innerHTML = `Welcome ${name}`;

// Attacker URL
https://example.com#<img src=x onerror=alert('XSS')>

// Script executed in client-side JavaScript
```

---

## 🔒 XSS Prevention

### 1. Input Validation

```javascript
// Validate and sanitize input
export const createComment = asyncHandler(async (req, res) => {
  const { text } = req.body;

  // Validate input
  if (!text || text.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Comment text is required"
    });
  }

  // Check for suspicious patterns
  const dangerousPatterns = /<script|javascript:|onerror=|onclick=/i;
  if (dangerousPatterns.test(text)) {
    return res.status(400).json({
      success: false,
      message: "Invalid input detected"
    });
  }

  // Sanitize HTML (if HTML is allowed)
  const sanitizedText = sanitizeHtml(text, {
    allowedTags: ['b', 'i', 'em', 'strong'],
    allowedAttributes: {}
  });

  const comment = await Comment.create({
    text: sanitizedText,
    user: req.user._id
  });

  res.status(201).json({
    success: true,
    comment
  });
});
```

### 2. Output Encoding (React)

```jsx
// ✅ SAFE: React automatically escapes
function Comment({ text }) {
  return <div>{text}</div>;
  // <script>alert('XSS')</script> rendered as text
}

// ❌ DANGEROUS: dangerouslySetInnerHTML bypasses escaping
function Comment({ text }) {
  return <div dangerouslySetInnerHTML={{ __html: text }} />;
  // <script>alert('XSS')</script> executed!
}

// ✅ SAFE: Sanitize before dangerouslySetInnerHTML
import DOMPurify from 'dompurify';

function Comment({ text }) {
  const sanitized = DOMPurify.sanitize(text);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### 3. HTTP-only Cookies

```javascript
// ✅ SAFE: HTTP-only cookies not accessible via JavaScript
res.cookie('accessToken', token, {
  httpOnly: true,  // document.cookie cannot access
  secure: true,
  sameSite: 'strict'
});

// ❌ VULNERABLE: localStorage accessible via JavaScript
localStorage.setItem('token', token);
// <script>sendToAttacker(localStorage.getItem('token'))</script>
```

### 4. Content Security Policy (CSP)

```javascript
// Helmet middleware for security headers
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Avoid 'unsafe-inline' in production
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'", 'https://api.example.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'same-origin' }
}));
```

### 5. X-XSS-Protection Header

```javascript
// Enable browser XSS filter
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Or use Helmet
app.use(helmet.xssFilter());
```

---

## 🔐 CSP Headers

### Content Security Policy

```javascript
// Strict CSP (Production)
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://res.cloudinary.com;
  font-src 'self';
  connect-src 'self' https://api.stayhaven.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';

// Helmet CSP Implementation
import helmet from 'helmet';

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],  // For inline styles
    imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
    fontSrc: ["'self'"],
    connectSrc: ["'self'", 'https://api.stayhaven.com'],
    frameAncestors: ["'none'"],  // Prevent clickjacking
    baseUri: ["'self'"],
    formAction: ["'self'"]
  }
}));
```

### CSP Reporting

```javascript
// Report CSP violations
app.use(helmet.contentSecurityPolicy({
  directives: {
    // ... directives
    reportUri: '/api/csp-report'
  },
  reportOnly: false  // Set to true during testing
}));

// CSP violation report endpoint
app.post('/api/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
  console.log('CSP Violation:', req.body);
  // Log to monitoring service
  res.status(204).send();
});
```

---

## 🔒 Security Best Practices

### 1. Validate All User Input

```javascript
// ✅ CORRECT: Server-side validation
export const createHotel = asyncHandler(async (req, res) => {
  const { name, description, address } = req.body;

  // Validate and sanitize
  if (!name || typeof name !== 'string' || name.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Invalid hotel name"
    });
  }

  // Remove HTML tags
  const sanitizedDescription = description.replace(/<[^>]*>/g, '');

  // ...
});
```

### 2. Use Security Headers

```javascript
import helmet from 'helmet';

// Apply security headers
app.use(helmet());

// Specific headers
app.use(helmet.xssFilter());                    // X-XSS-Protection
app.use(helmet.noSniff());                      // X-Content-Type-Options
app.use(helmet.frameguard({ action: 'deny' })); // X-Frame-Options
app.use(helmet.hsts({                           // Strict-Transport-Security
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true
}));
```

### 3. Escape Output

```javascript
// ✅ CORRECT: React escapes by default
<div>{userInput}</div>

// ❌ WRONG: dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ CORRECT: Sanitize before rendering HTML
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### 4. Use HTTPS

```javascript
// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}
```

### 5. Implement CORS Properly

```javascript
// ✅ CORRECT: Whitelist specific origins
origin: process.env.FRONTEND_URL

// ❌ WRONG: Allow all origins
origin: '*'
```

---

## 📚 Related Documents

- [Security Overview](./security-overview.md)
- [Session & Cookie Management](./session-and-cookie-management.md)
- [API Security Best Practices](./api-security-best-practices.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive CORS and XSS protection documentation
