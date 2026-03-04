# Authentication & Security Documentation

## Overview

The StayHaven hotel management system uses a **JWT-based dual-token authentication** system with role-based access control (RBAC), brute force protection, rate limiting, and audit logging.

---

## Authentication Architecture

### Token Strategy

| Token | Storage | Lifetime | Purpose |
|-------|---------|----------|---------|
| **Access Token** | `httpOnly` cookie + localStorage (`staffAccessToken`) | 1 hour | API request authorization |
| **Refresh Token** | `httpOnly` cookie + MongoDB (per-user) | 7 days | Silent token renewal |

### Token Flow

1. **Login** → Server validates credentials → Returns access + refresh tokens (set as httpOnly cookies, access token also in response body)
2. **API Request** → Axios interceptor attaches `Bearer <accessToken>` header
3. **Token Expiry** → Axios 401 interceptor calls `/api/staff/refresh-token` → Gets new tokens
4. **Proactive Refresh** → Frontend `StaffAuthContext` refreshes tokens every 55 minutes (before 1-hour expiry)
5. **Logout** → Server clears refresh token from DB + clears cookies → Frontend clears localStorage

### Token Rotation

Refresh tokens are **single-use**. Each refresh issues a new refresh token and invalidates the old one. If a reused token is detected, all tokens for that user are invalidated (security measure against token theft).

---

## Security Layers

### 1. Password Hashing

- **Algorithm:** bcrypt with 10 salt rounds
- **Validation:** Minimum 8 characters, requires uppercase, lowercase, number, and special character
- **Location:** `models/user.schema.js` (pre-save hook), `utils/passwordValidation.js`

### 2. Brute Force Protection

- **Max Attempts:** 5 failed login attempts
- **Lock Duration:** 30 minutes
- **Fields:** `loginAttempts` (counter), `lockUntil` (timestamp) on User model
- **Behavior:** After 5 failures, account is locked with HTTP 423 response. Lock auto-expires after 30 minutes. Successful login resets the counter.
- **Location:** `models/user.schema.js` (methods), `controllers/staffController.js` (staffLogin)

### 3. Rate Limiting

| Limiter | Window | Max Requests | Applied To |
|---------|--------|-------------|------------|
| `authLimiter` | 15 min | 10 | `/api/staff/login`, `/api/staff/complete-onboard` |
| `passwordResetLimiter` | 15 min | 5 | `/api/staff/forgot-password`, `/api/staff/reset-password` |
| `apiLimiter` | 15 min | 100 | All `/api/*` routes |
| `sensitiveOpLimiter` | 1 hour | 20 | Available for sensitive operations |

- **Location:** `middleware/rateLimiter.js`, wired in `server.js` and `routes/staffRoutes.js`

### 4. HTTP Security Headers (Helmet)

Helmet middleware sets secure headers including:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options`
- `Strict-Transport-Security` (in production)
- `X-XSS-Protection`
- Cross-origin resource policy configured for frontend compatibility

### 5. CORS

- Restricted to `http://localhost:5173` (frontend origin)
- Credentials enabled for cookie transmission
- Explicit method and header allowlists

### 6. Audit Logging

All security-relevant events are logged with structured JSON output:
- `LOGIN_SUCCESS` / `LOGIN_FAILURE`
- `ACCOUNT_LOCKED`
- `LOGOUT`
- `PASSWORD_CHANGED` / `PASSWORD_RESET_REQUESTED` / `PASSWORD_RESET_COMPLETED`
- `UNAUTHORIZED_ACCESS`

Each log entry includes: timestamp, IP address, user agent, user ID, and event-specific details.

- **Location:** `middleware/auditLogger.js`

### 7. Session Invalidation

- **Password Change:** Clears refresh token → forces re-login on all devices
- **Password Reset:** Clears refresh token + reset token fields
- **Logout:** Clears refresh token from DB + clears httpOnly cookies

---

## Role-Based Access Control (RBAC)

### Roles

| Role | Level | Scope |
|------|-------|-------|
| `owner` | Highest | Full system access |
| `admin` | High | System administration |
| `manager` | High | Hotel management, staff management |
| `receptionist` | Medium | Front desk operations, check-in/out, billing |
| `chief` | Medium | Kitchen operations, menu management |
| `waiter` | Medium | Order management, table service |
| `guest` | Low | Public booking, QR access |

### Route Permissions

#### Public Routes (No Auth)
- `POST /api/staff/login`
- `POST /api/staff/refresh-token`
- `GET /api/staff/verify-invite/:token`
- `POST /api/staff/complete-onboard`
- `POST /api/staff/forgot-password`
- `POST /api/staff/reset-password`

#### Authenticated (Any Staff)
- `GET /api/staff/me` — Get profile
- `POST /api/staff/logout`
- `PUT /api/staff/change-password`
- `PATCH /api/staff/profile-picture`
- `GET /api/staff/menu-items`
- `GET /api/staff/orders`
- `GET /api/staff/orders/:orderId`

#### Role-Restricted
- **Create Order:** waiter, receptionist, chief, manager
- **Update Order Status:** waiter, chief, manager
- **Update Order:** waiter, manager
- **Delete Order:** waiter, manager, receptionist, admin
- **Send Bill:** waiter, receptionist, manager
- **Staff Management (register, invite, etc.):** manager, admin, owner
- **Create Notifications:** receptionist, manager, admin, owner
- **Table Assignments:** manager, admin, owner (view only for waiters)
- **Waiter Call Acknowledge/Resolve:** waiter, manager

### Frontend Route Protection

Protected routes use `<ProtectedStaffRoute allowedRoles={[...]}>` wrapper in `App.jsx`:
- `/reception-dashboard` → receptionist, manager, admin, owner
- `/waiter-dashboard` → waiter
- `/kitchen-dashboard` → chief

---

## API Endpoints Reference

### Authentication

```
POST   /api/staff/login              — Staff login (rate-limited)
POST   /api/staff/logout             — Staff logout (authenticated)
POST   /api/staff/refresh-token      — Refresh access token
PUT    /api/staff/change-password    — Change password (authenticated)
POST   /api/staff/forgot-password    — Request password reset (rate-limited)
POST   /api/staff/reset-password     — Complete password reset (rate-limited)
```

### Staff Onboarding

```
POST   /api/staff/invite             — Invite staff member (manager+)
GET    /api/staff/verify-invite/:t   — Verify invite token
POST   /api/staff/complete-onboard   — Complete onboarding (rate-limited)
POST   /api/staff/resend-invite/:id  — Resend invite (manager+)
GET    /api/staff/pending-invites    — List pending invites (manager+)
DELETE /api/staff/invite/:id         — Cancel invite (manager+)
```

### Profile

```
GET    /api/staff/me                 — Get current user profile
PATCH  /api/staff/profile-picture    — Update profile picture
```

---

## Frontend Auth Flow

### StaffAuthContext

Central auth state manager (`core/context/StaffAuthContext.jsx`):
- `staffUser` — Current user object
- `isAuthenticated` — Boolean derived from staffUser
- `login(userData)` — Stores user + sets up refresh timer
- `logout()` — Clears all auth data + stops refresh timer
- `updateUser(data)` — Partial user update

### Axios Client (`core/api/client.js`)

- **Request interceptor:** Automatically attaches the correct token (staff vs guest) based on URL
- **Response interceptor:** On 401, attempts token refresh. On refresh failure, redirects to login and clears session

### Token Storage

| Key | Storage | Contains |
|-----|---------|----------|
| `staffAccessToken` | localStorage | JWT access token |
| `staffUser` | localStorage | Serialized user object |
| `staffRole` | localStorage | Role string |
| `activeProperty` | localStorage | Current hotel property |

---

## Environment Variables

```
JWT_ACCESS_SECRET    — Secret for signing access tokens
JWT_REFRESH_SECRET   — Secret for signing refresh tokens
JWT_SECRET           — Legacy/fallback secret
JWT_EXPIRE           — Access token expiry (default: 1h)
NODE_ENV             — "development" or "production" (affects cookie settings)
```

---

## Production Checklist

- [ ] Set strong, unique values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Set `NODE_ENV=production` for secure cookie settings (`Secure`, `SameSite=None`)
- [ ] Update CORS origin to production frontend URL
- [ ] Enable Helmet CSP in production
- [ ] Forward audit logs to centralized logging service
- [ ] Set up monitoring alerts for `ACCOUNT_LOCKED` events
- [ ] Configure HTTPS/TLS termination
- [ ] Review and tighten rate limiter thresholds based on traffic patterns
