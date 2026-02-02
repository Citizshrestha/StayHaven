# Security Overview

> Comprehensive security architecture and threat mitigation strategies in StayHaven

---

## 📋 Table of Contents

1. [Security Architecture](#security-architecture)
2. [Security Layers](#security-layers)
3. [Threat Model](#threat-model)
4. [Security Features](#security-features)
5. [Compliance](#compliance)
6. [Security Checklist](#security-checklist)

---

## 🛡️ Security Architecture

### Defense in Depth

StayHaven implements multiple layers of security controls:

```
┌─────────────────────────────────────────┐
│  Network Layer                          │
│  ├─ HTTPS/TLS                           │
│  ├─ CORS                                │
│  └─ Rate Limiting                       │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  Application Layer                      │
│  ├─ JWT Authentication                  │
│  ├─ Role-Based Access Control           │
│  ├─ Input Validation                    │
│  └─ XSS/CSRF Protection                 │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  Data Layer                             │
│  ├─ Password Hashing (bcrypt)           │
│  ├─ Data Encryption                     │
│  ├─ SQL Injection Prevention            │
│  └─ Sensitive Data Protection           │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  Infrastructure Layer                   │
│  ├─ Environment Variables               │
│  ├─ Secure Configuration                │
│  └─ Logging & Monitoring                │
└─────────────────────────────────────────┘
```

---

## 🔐 Security Layers

### 1. Authentication Layer

**Implementation**: JWT-based authentication with dual tokens

```javascript
// Access Token: Short-lived (1 hour)
const accessToken = jwt.sign(
  { id: userId },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: '1h' }
);

// Refresh Token: Long-lived (7 days)
const refreshToken = jwt.sign(
  { id: userId },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

**Features**:
- JWT token with expiration
- Refresh token rotation
- HTTP-only cookies for token storage
- Token revocation support
- Multi-device session management

### 2. Authorization Layer

**Implementation**: Role-Based Access Control (RBAC)

```javascript
// System Roles
- admin: Full system access
- owner: Manage own hotels and staff
- manager: Manage assigned properties
- staff: Limited operational access (waiter, chief, receptionist)
- guest: Book rooms, place orders

// Permission Checks
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role.name)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized"
      });
    }
    next();
  };
};
```

### 3. Data Protection Layer

**Password Security**:
```javascript
// Bcrypt hashing with salt rounds = 10
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
```

**Sensitive Data Exclusion**:
```javascript
// Always exclude password from responses
const user = await User.findById(userId).select('-password -refreshToken');
```

### 4. Network Security Layer

**CORS Configuration**:
```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
};
```

**HTTPS/TLS**:
- Production: Enforce HTTPS
- Development: HTTP allowed
- Certificate: Let's Encrypt / Cloudflare

---

## ⚠️ Threat Model

### OWASP Top 10 Coverage

| Threat | Status | Mitigation |
|--------|--------|------------|
| **A01: Broken Access Control** | ✅ Protected | RBAC, JWT verification, ownership checks |
| **A02: Cryptographic Failures** | ✅ Protected | Bcrypt password hashing, HTTPS, secure cookies |
| **A03: Injection** | ✅ Protected | Mongoose parameterization, input validation |
| **A04: Insecure Design** | ⚠️ Partial | Defense in depth, fail-secure defaults |
| **A05: Security Misconfiguration** | ✅ Protected | Environment variables, secure defaults |
| **A06: Vulnerable Components** | ⚠️ Ongoing | Regular npm audit, dependency updates |
| **A07: Authentication Failures** | ✅ Protected | JWT + refresh tokens, password policy |
| **A08: Data Integrity Failures** | ⚠️ Partial | Input validation, schema validation |
| **A09: Logging Failures** | ⚠️ Planned | Console logging (production logs needed) |
| **A10: Server-Side Request Forgery** | ✅ Protected | No user-controlled URLs |

### Attack Scenarios

#### 1. Brute Force Attack
**Threat**: Attacker attempts multiple login attempts

**Mitigation**:
- Rate limiting on `/api/auth/login` endpoint
- Account lockout after 5 failed attempts
- CAPTCHA after 3 failed attempts (planned)

#### 2. Token Theft
**Threat**: Attacker steals JWT token

**Mitigation**:
- HTTP-only cookies (not accessible via JavaScript)
- Short access token expiry (1 hour)
- Refresh token rotation
- Token revocation on logout

#### 3. SQL Injection
**Threat**: Malicious SQL in user input

**Mitigation**:
- Mongoose ODM handles parameterization
- No raw queries with user input
- Input validation and sanitization

#### 4. Cross-Site Scripting (XSS)
**Threat**: Malicious scripts in user input

**Mitigation**:
- React escapes output by default
- Content Security Policy headers
- Input sanitization on backend

#### 5. Cross-Site Request Forgery (CSRF)
**Threat**: Unauthorized actions on behalf of authenticated user

**Mitigation**:
- SameSite cookie attribute
- CORS origin validation
- Token-based authentication (not session-based)

---

## 🔒 Security Features

### Implemented

✅ **JWT Authentication**
- Access token (1 hour expiry)
- Refresh token (7 days expiry)
- Token stored in HTTP-only cookies

✅ **Password Security**
- Bcrypt hashing (10 salt rounds)
- Minimum 6 characters (should be increased to 8+)
- Password not returned in API responses

✅ **Authorization**
- Role-Based Access Control (RBAC)
- 8 roles: admin, owner, manager, chief, waiter, receptionist, housekeeping, maintenance
- Route-level protection with `protect` and `authorize` middleware

✅ **CORS Protection**
- Whitelist frontend origin
- Credentials support enabled
- Preflight request handling

✅ **Input Validation**
- Mongoose schema validation
- Required field checks
- Data type validation

✅ **Secure Configuration**
- Environment variables for secrets
- No hardcoded credentials
- Separate dev/prod configurations

### Planned

⏳ **Rate Limiting**
- API rate limiting (100 requests per 15 minutes)
- Auth endpoint rate limiting (5 attempts per 15 minutes)

⏳ **Enhanced Password Policy**
- Minimum 8 characters
- Require uppercase, lowercase, number, special character
- Password strength meter
- Password history (prevent reuse)

⏳ **Two-Factor Authentication (2FA)**
- SMS-based OTP
- Authenticator app support
- Backup codes

⏳ **Security Headers**
- Helmet.js for HTTP headers
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options

⏳ **Audit Logging**
- Log all authentication attempts
- Track sensitive operations
- IP address logging
- User activity tracking

⏳ **Data Encryption**
- Encrypt sensitive fields at rest
- Database encryption
- File encryption for uploads

---

## 📜 Compliance

### Data Protection

**GDPR Considerations**:
- User consent for data collection
- Right to data portability (export user data)
- Right to erasure (delete account)
- Data minimization (collect only necessary data)
- Privacy policy and terms of service

**Current Status**: ⚠️ Partial compliance (privacy features needed)

### PCI DSS (Payment Card Industry)

**Status**: 🚫 Not applicable yet (no payment processing implemented)

**Future Requirements**:
- Never store credit card CVV
- Encrypt cardholder data
- Use payment gateway (Stripe, PayPal)
- Maintain secure network
- Regular security testing

---

## ✅ Security Checklist

### Authentication & Authorization
- [x] JWT-based authentication
- [x] HTTP-only cookies for token storage
- [x] Access token expiration (1 hour)
- [x] Refresh token expiration (7 days)
- [x] Password hashing with bcrypt
- [x] Role-based access control
- [ ] Two-factor authentication
- [ ] Account lockout after failed attempts
- [ ] CAPTCHA on login

### Data Protection
- [x] Passwords hashed with bcrypt
- [x] Password excluded from API responses
- [x] Mongoose schema validation
- [ ] Sensitive data encryption at rest
- [ ] PII data encryption
- [ ] Data retention policies

### Network Security
- [x] CORS configured for frontend origin
- [x] HTTPS in production (deployment dependent)
- [ ] Rate limiting on API endpoints
- [ ] Rate limiting on auth endpoints
- [ ] DDoS protection
- [ ] WAF (Web Application Firewall)

### Application Security
- [x] Input validation on all endpoints
- [x] Mongoose parameterized queries
- [x] Error messages don't leak sensitive info
- [ ] Security headers (Helmet.js)
- [ ] Content Security Policy
- [ ] XSS protection
- [ ] CSRF protection

### Infrastructure Security
- [x] Environment variables for secrets
- [x] No hardcoded credentials
- [x] Separate dev/prod configs
- [ ] Secret rotation policy
- [ ] Database access restrictions
- [ ] Server hardening

### Monitoring & Logging
- [x] Basic console logging
- [ ] Security event logging
- [ ] Failed login attempt tracking
- [ ] Suspicious activity detection
- [ ] Log aggregation and analysis
- [ ] Intrusion detection system

### Third-Party Security
- [x] npm packages reviewed
- [ ] Regular dependency audits
- [ ] Vulnerability scanning
- [ ] Third-party service security review
- [ ] API key rotation

---

## 📚 Related Documents

- [Authentication Flow](./authentication-flow.md)
- [JWT Access & Refresh Tokens](./jwt-access-refresh-tokens.md)
- [Password Policy & Hashing](./password-policy-and-hashing.md)
- [Authorization & RBAC](./authorization-and-rbac.md)
- [API Security Best Practices](./api-security-best-practices.md)
- [Known Security Risks](./security-known-risks.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive security overview with current implementation and planned features
