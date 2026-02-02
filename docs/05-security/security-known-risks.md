# Security Known Risks

> Identified security vulnerabilities, risk assessment, and mitigation roadmap for StayHaven

---

## 📋 Table of Contents

1. [Current Vulnerabilities](#current-vulnerabilities)
2. [Risk Assessment](#risk-assessment)
3. [Mitigation Roadmap](#mitigation-roadmap)
4. [Security Gaps](#security-gaps)
5. [Compliance Concerns](#compliance-concerns)

---

## 🚨 Current Vulnerabilities

### 1. No Rate Limiting Implementation

**Status**: ❌ **Not Implemented**

**Risk Level**: 🔴 **HIGH**

**Description**:
- No rate limiting on any API endpoints
- Authentication endpoints vulnerable to brute force attacks
- Public endpoints can be overwhelmed by excessive requests
- No protection against credential stuffing attacks

**Impact**:
```
- Brute Force: Attacker can try unlimited login attempts
- DoS Attack: Single IP can overwhelm server with requests
- Resource Exhaustion: Database and server resources can be depleted
- Account Takeover: Weak passwords can be discovered through brute force
```

**Proof of Concept**:
```javascript
// Attacker script - unlimited login attempts
for (let i = 0; i < 10000; i++) {
  await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'victim@example.com',
      password: passwords[i] // Try 10,000 passwords
    })
  });
}
// No rate limiting = all attempts processed
```

**Mitigation**:
```javascript
// Install express-rate-limit
npm install express-rate-limit

// Implement rate limiting
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later.'
});

app.use('/api/auth/login', authLimiter);
```

---

### 2. Weak Password Policy

**Status**: ⚠️ **Partial Implementation**

**Risk Level**: 🟠 **MEDIUM**

**Description**:
- Current minimum: 6 characters
- No complexity requirements (uppercase, lowercase, numbers, symbols)
- No password strength meter
- No common password blacklist
- No password history (users can reuse old passwords)

**Current Implementation**:
```javascript
// Only checks minimum length
if (password.length < 6) {
  return res.status(400).json({
    message: "Password must be at least 6 characters long"
  });
}
```

**Weak Passwords Accepted**:
```
"123456"   ✅ Accepted (6 chars, but extremely weak)
"password" ✅ Accepted (common password)
"aaaaaa"   ✅ Accepted (no complexity)
"qwerty"   ✅ Accepted (keyboard pattern)
```

**Impact**:
- Easy brute force attacks on weak passwords
- Higher risk of account compromise
- Fails security compliance standards (NIST, OWASP)

**Mitigation**:
```javascript
// Enhanced password validation
const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check against common passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty', 'abc123', '123456',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }

  return { valid: errors.length === 0, errors };
};
```

---

### 3. No Two-Factor Authentication (2FA)

**Status**: ❌ **Not Implemented**

**Risk Level**: 🟠 **MEDIUM**

**Description**:
- Single-factor authentication only (password)
- No additional verification layer
- Compromised passwords = full account access
- No protection if password leaked in data breach

**Impact**:
- Account takeover if password is compromised
- No defense against phishing attacks
- Fails compliance requirements for sensitive data

**Mitigation**:
```javascript
// Install OTP library
npm install otplib qrcode

// 2FA Implementation
import { authenticator } from 'otplib';
import qrcode from 'qrcode';

// Generate 2FA secret
export const enable2FA = asyncHandler(async (req, res) => {
  const secret = authenticator.generateSecret();

  // Generate QR code
  const otpauth = authenticator.keyuri(
    req.user.email,
    'StayHaven',
    secret
  );

  const qrCode = await qrcode.toDataURL(otpauth);

  // Save secret (encrypted)
  req.user.twoFactorSecret = encrypt(secret);
  req.user.twoFactorEnabled = false; // Enabled after verification
  await req.user.save();

  res.json({
    success: true,
    qrCode,
    secret // Show to user for manual entry
  });
});

// Verify 2FA token
export const verify2FA = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const decryptedSecret = decrypt(req.user.twoFactorSecret);

  const isValid = authenticator.verify({
    token,
    secret: decryptedSecret
  });

  if (!isValid) {
    return res.status(400).json({
      success: false,
      message: "Invalid 2FA token"
    });
  }

  req.user.twoFactorEnabled = true;
  await req.user.save();

  res.json({
    success: true,
    message: "2FA enabled successfully"
  });
});

// Login with 2FA
export const loginWith2FA = asyncHandler(async (req, res) => {
  const { email, password, twoFactorToken } = req.body;

  const user = await User.findOne({ email });

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  // Check 2FA if enabled
  if (user.twoFactorEnabled) {
    if (!twoFactorToken) {
      return res.status(401).json({
        success: false,
        message: "2FA token required",
        requires2FA: true
      });
    }

    const decryptedSecret = decrypt(user.twoFactorSecret);
    const isValid = authenticator.verify({
      token: twoFactorToken,
      secret: decryptedSecret
    });

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid 2FA token"
      });
    }
  }

  // Generate tokens and proceed with login
  // ...
});
```

---

### 4. Basic Logging Implementation

**Status**: ⚠️ **Partial Implementation**

**Risk Level**: 🟡 **LOW-MEDIUM**

**Description**:
- Console.log only (no persistent logging)
- No structured logging
- No security event logging (failed logins, unauthorized access)
- No audit trail
- Logs lost on server restart

**Current Implementation**:
```javascript
// Basic console logging
console.log('User logged in:', user._id);
console.error('Error:', error.message);
```

**Missing Logs**:
- Failed login attempts
- Unauthorized access attempts
- Permission denied events
- Data modifications (who changed what)
- API rate limit violations
- Security policy changes

**Impact**:
- Cannot detect brute force attacks
- No forensic evidence for security incidents
- Difficult to troubleshoot issues
- Compliance failures (audit requirements)

**Mitigation**:
```javascript
// Install Winston logger
npm install winston winston-daily-rotate-file

// Setup Winston logger
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console logging
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),

    // File logging (errors)
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d'
    }),

    // File logging (all logs)
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    }),

    // Security event logging
    new DailyRotateFile({
      filename: 'logs/security-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      maxSize: '20m',
      maxFiles: '90d'
    })
  ]
});

// Security event logger
export const logSecurityEvent = (event, details) => {
  logger.warn({
    type: 'SECURITY_EVENT',
    event,
    details,
    timestamp: new Date().toISOString()
  });
};

// Usage
export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    logSecurityEvent('LOGIN_FAILED', {
      email: req.body.email,
      reason: 'User not found',
      ip: req.ip
    });

    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  const isMatch = await user.matchPassword(req.body.password);

  if (!isMatch) {
    logSecurityEvent('LOGIN_FAILED', {
      userId: user._id,
      email: user.email,
      reason: 'Invalid password',
      ip: req.ip
    });

    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  logger.info({
    type: 'LOGIN_SUCCESS',
    userId: user._id,
    email: user.email,
    ip: req.ip
  });

  // ... generate tokens
});
```

---

### 5. No Security Headers (Helmet.js)

**Status**: ❌ **Not Implemented**

**Risk Level**: 🟡 **LOW-MEDIUM**

**Description**:
- Missing security headers
- No Content Security Policy (CSP)
- No clickjacking protection (X-Frame-Options)
- No MIME sniffing prevention (X-Content-Type-Options)
- No XSS protection header

**Missing Headers**:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000
Referrer-Policy: no-referrer
```

**Impact**:
- Clickjacking attacks possible
- MIME type confusion attacks
- Missing defense-in-depth layers

**Mitigation**:
```javascript
// Install Helmet
npm install helmet

// Apply Helmet middleware
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true
}));
```

---

### 6. No Account Lockout Mechanism

**Status**: ❌ **Not Implemented**

**Risk Level**: 🟠 **MEDIUM**

**Description**:
- No account lockout after failed login attempts
- Unlimited login attempts allowed
- No temporary suspension for suspicious activity

**Impact**:
- Brute force attacks can continue indefinitely
- Account takeover risk
- No deterrent for automated attacks

**Mitigation**:
```javascript
// Add to user schema
const userSchema = new mongoose.Schema({
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  }
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours

  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }

  return this.updateOne(updates);
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Login with lockout check
export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  // Check if account is locked
  if (user.isLocked) {
    const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
    return res.status(423).json({
      success: false,
      message: `Account locked due to multiple failed login attempts. Try again in ${remainingTime} minutes.`
    });
  }

  const isMatch = await user.matchPassword(req.body.password);

  if (!isMatch) {
    await user.incLoginAttempts();

    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  // Reset attempts on successful login
  await user.resetLoginAttempts();

  // ... generate tokens
});
```

---

## 📊 Risk Assessment

### Risk Matrix

| Vulnerability | Likelihood | Impact | Risk Level | Priority |
|---------------|-----------|--------|------------|----------|
| No Rate Limiting | High | High | 🔴 Critical | P0 |
| Weak Password Policy | High | Medium | 🟠 High | P1 |
| No Account Lockout | High | Medium | 🟠 High | P1 |
| No 2FA | Medium | High | 🟠 High | P1 |
| Basic Logging | Medium | Medium | 🟡 Medium | P2 |
| No Security Headers | Low | Medium | 🟡 Medium | P2 |

### Risk Scoring

```
Risk = Likelihood × Impact

Likelihood:
- High (3): Attack is easy and common
- Medium (2): Attack requires some effort
- Low (1): Attack is difficult

Impact:
- High (3): Data breach, account takeover, service disruption
- Medium (2): Limited data exposure, partial service impact
- Low (1): Minimal impact

Risk Levels:
- 9: 🔴 Critical (immediate action required)
- 6: 🟠 High (address within 1 month)
- 4: 🟡 Medium (address within 3 months)
- 2-3: 🟢 Low (address when possible)
```

---

## 🛤️ Mitigation Roadmap

### Phase 1: Critical Fixes (Week 1-2)

**Priority**: 🔴 **P0**

- [ ] **Implement Rate Limiting**
  - Install `express-rate-limit`
  - Apply to all API endpoints (100 req/15min)
  - Stricter limits for auth endpoints (5 req/15min)
  - Test with load testing tools

- [ ] **Enhance Password Policy**
  - Increase minimum length to 8 characters
  - Add complexity requirements (uppercase, lowercase, numbers, symbols)
  - Implement common password blacklist
  - Add password strength meter on frontend

- [ ] **Implement Account Lockout**
  - Lock account after 5 failed attempts
  - 2-hour lockout duration
  - Add unlock mechanism (email or admin)
  - Log lockout events

### Phase 2: High Priority (Week 3-4)

**Priority**: 🟠 **P1**

- [ ] **Implement Two-Factor Authentication (2FA)**
  - Install `otplib` and `qrcode`
  - Add 2FA secret and enabled flag to user schema
  - Build 2FA setup flow (QR code generation)
  - Build 2FA verification flow
  - Add backup codes

- [ ] **Enhance Logging**
  - Install `winston` logger
  - Implement structured logging
  - Add security event logging
  - Set up log rotation (daily, 30-day retention)
  - Log failed logins, unauthorized access, permission denials

### Phase 3: Medium Priority (Week 5-6)

**Priority**: 🟡 **P2**

- [ ] **Add Security Headers**
  - Install `helmet`
  - Configure CSP headers
  - Add X-Frame-Options, X-Content-Type-Options
  - Enable HSTS in production

- [ ] **Implement Password History**
  - Prevent password reuse (last 5 passwords)
  - Store hashed passwords in history array

- [ ] **Add Security Monitoring**
  - Set up monitoring dashboard
  - Alert on suspicious activity
  - Track rate limit violations

### Phase 4: Future Enhancements

**Priority**: 🟢 **P3**

- [ ] **Advanced Security Features**
  - Session management improvements
  - IP-based geolocation blocking
  - Device fingerprinting
  - Anomaly detection (unusual login patterns)

- [ ] **Compliance**
  - GDPR compliance audit
  - PCI DSS compliance (if handling payments)
  - SOC 2 certification preparation

---

## 🔍 Security Gaps

### Authentication
- ❌ No passwordless authentication (magic links)
- ❌ No biometric authentication support
- ❌ No social login beyond Google (Facebook, Apple)

### Authorization
- ✅ RBAC implemented
- ⚠️ No fine-grained permissions
- ❌ No dynamic permission assignment

### Data Protection
- ✅ Password hashing (bcrypt)
- ❌ No data-at-rest encryption
- ❌ No field-level encryption for sensitive data

### Network Security
- ✅ CORS configured
- ❌ No rate limiting (planned)
- ❌ No DDoS protection (use Cloudflare)

### Monitoring
- ⚠️ Basic logging
- ❌ No SIEM integration
- ❌ No real-time security alerts

---

## 📚 Related Documents

- [Security Overview](./security-overview.md)
- [Authentication Flow](./authentication-flow.md)
- [Rate Limiting & DDoS](./rate-limiting-and-ddos.md)
- [API Security Best Practices](./api-security-best-practices.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive security risk assessment and mitigation roadmap
