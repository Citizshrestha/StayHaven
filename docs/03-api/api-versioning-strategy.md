# API Versioning Strategy

> Comprehensive guide to StayHaven API versioning, backward compatibility, deprecation policies, and migration strategies

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Versioning Approach](#versioning-approach)
3. [Current API Version](#current-api-version)
4. [Version Format](#version-format)
5. [Backward Compatibility](#backward-compatibility)
6. [Deprecation Policy](#deprecation-policy)
7. [Migration Guide](#migration-guide)
8. [Breaking Changes](#breaking-changes)

---

## 🎯 Overview

### Versioning Philosophy

StayHaven API follows a **URI Path Versioning** strategy with strong emphasis on:
- **Stability**: Existing integrations continue working without forced updates
- **Clarity**: Version clearly visible in URL
- **Predictability**: Well-defined deprecation timeline
- **Innovation**: Ability to introduce new features without breaking existing clients

### Why Version APIs?

- Allow breaking changes without disrupting existing clients
- Provide time for clients to migrate to newer versions
- Maintain backward compatibility for older integrations
- Enable API evolution and improvement

---

## 🔢 Versioning Approach

### URI Path Versioning

StayHaven uses **major version numbers in the URI path**:

```
https://api.stayhaven.com/v1/hotels
https://api.stayhaven.com/v2/hotels
https://api.stayhaven.com/v3/hotels
```

**Advantages**:
✅ Clear and explicit version in URL  
✅ Easy to test different versions  
✅ Simple for developers to understand  
✅ Works with all HTTP clients  
✅ Cacheable by proxies and CDNs  

**Why Not Header Versioning?**
- Less visible to developers
- Harder to test in browser
- More complex to document
- Difficult to cache

---

## 📦 Current API Version

### Version 1.0 (Current Stable)

**Base URL**: `https://api.stayhaven.com/v1`

**Release Date**: February 1, 2026

**Status**: ✅ Active & Supported

**Supported Until**: At least February 1, 2028 (2+ years guaranteed support)

**Key Features**:
- Guest & staff authentication with JWT
- Hotel management with approval workflow
- Booking system with 6-state lifecycle
- Order management with KOT system
- Real-time events via Socket.io
- Multi-tenancy with company isolation
- Role-based access control

**Stability Guarantee**:
- No breaking changes will be introduced to v1
- Bug fixes and security patches only
- New features added as additive changes
- Existing endpoints remain unchanged

---

## 📐 Version Format

### Semantic Versioning for Documentation

While the API uses major versions in URLs (`v1`, `v2`), internal documentation follows **Semantic Versioning** (SemVer):

```
MAJOR.MINOR.PATCH
  |     |     |
  |     |     └── Bug fixes (backward compatible)
  |     └──────── New features (backward compatible)
  └────────────── Breaking changes (not backward compatible)
```

**Examples**:
- `1.0.0` → Initial release
- `1.1.0` → Added new optional fields
- `1.1.1` → Fixed bug in date validation
- `1.2.0` → Added new endpoints
- `2.0.0` → Breaking changes (new major version)

### What Triggers Major Version Bump?

**Breaking Changes** that require `v2`:
- Removing endpoints
- Removing required fields from responses
- Changing field types (string → number)
- Renaming fields
- Changing authentication method
- Removing query parameters
- Changing error response format

**Non-Breaking Changes** (can stay in `v1`):
- Adding new endpoints
- Adding new optional fields to responses
- Adding new optional query parameters
- Adding new enum values
- Improving error messages
- Performance optimizations

---

## 🔄 Backward Compatibility

### Compatibility Rules

#### ✅ Backward Compatible Changes (No Version Bump)

**1. Adding New Endpoints**
```
v1: GET  /api/v1/hotels
v1: POST /api/v1/hotels
v1: GET  /api/v1/hotels/:id
v1: GET  /api/v1/hotels/:id/analytics  ← NEW (OK)
```

**2. Adding Optional Fields to Response**
```json
// v1.0.0
{
  "name": "Grand Plaza Hotel",
  "location": "Kathmandu"
}

// v1.1.0 (backward compatible)
{
  "name": "Grand Plaza Hotel",
  "location": "Kathmandu",
  "timezone": "Asia/Kathmandu"  ← NEW OPTIONAL FIELD (OK)
}
```

**3. Adding Optional Query Parameters**
```
v1.0.0: GET /api/v1/hotels?location=Kathmandu
v1.1.0: GET /api/v1/hotels?location=Kathmandu&timezone=Asia/Kathmandu  ← NEW OPTIONAL PARAM (OK)
```

**4. Adding New Enum Values**
```json
// v1.0.0
{
  "status": "pending" | "confirmed" | "cancelled"
}

// v1.1.0 (backward compatible)
{
  "status": "pending" | "confirmed" | "cancelled" | "no-show"  ← NEW VALUE (OK)
}
```

---

#### ❌ Breaking Changes (Require Major Version Bump)

**1. Removing Fields**
```json
// v1
{
  "name": "Grand Plaza Hotel",
  "description": "Luxury hotel",  // ← REMOVED IN v2
  "location": "Kathmandu"
}

// v2 (breaking change)
{
  "name": "Grand Plaza Hotel",
  "location": "Kathmandu"
}
```

**2. Renaming Fields**
```json
// v1
{
  "fullname": "John Doe"  // ← RENAMED IN v2
}

// v2 (breaking change)
{
  "full_name": "John Doe"
}
```

**3. Changing Field Types**
```json
// v1
{
  "price": "150.00"  // string ← CHANGED TO number IN v2
}

// v2 (breaking change)
{
  "price": 150.00  // number
}
```

**4. Removing Endpoints**
```
v1: GET /api/v1/hotels/featured  ← REMOVED IN v2
```

**5. Changing Authentication**
```
v1: Authorization: Bearer <JWT>
v2: Authorization: OAuth 2.0  ← BREAKING CHANGE
```

---

## ⚠️ Deprecation Policy

### Deprecation Timeline

```mermaid
timeline
    title API Version Lifecycle
    2026-02-01 : v1.0.0 Released : Active
    2026-08-01 : v2.0.0 Released : v1 Maintenance Mode : v1 Deprecated
    2027-02-01 : v1 6-month warning
    2027-08-01 : v1 3-month warning
    2027-11-01 : v1 1-month warning
    2028-02-01 : v1 Sunset : v1 Decommissioned
```

### Deprecation Phases

#### Phase 1: Active Development (0-12 months)
- Full support for new features
- Bug fixes and improvements
- Performance optimizations
- Security patches

#### Phase 2: Maintenance Mode (12-18 months)
**Triggered**: When new major version is released

- No new features added
- Critical bug fixes only
- Security patches
- `Deprecated: true` header in responses
- Sunset date announced

**Response Header**:
```http
Deprecated: true
Sunset: Sat, 01 Feb 2028 00:00:00 GMT
Link: <https://api.stayhaven.com/v2/hotels>; rel="successor-version"
```

#### Phase 3: Sunset Warnings (18-24 months)
**6 Months Before Sunset**:
- Email notifications to registered API users
- Dashboard warnings
- Deprecation notices in documentation
- Migration guide published

**3 Months Before Sunset**:
- Weekly email reminders
- API responses include warning messages
- Support team reaches out to active users

**1 Month Before Sunset**:
- Daily email reminders
- API responses include urgent warnings
- Final migration support offered

#### Phase 4: Decommissioning (24+ months)
- Version removed from production
- All requests return `410 Gone`
- Documentation archived
- No further support

**Final Response**:
```json
{
  "success": false,
  "message": "API version v1 has been sunset",
  "error": {
    "code": "VERSION_SUNSET",
    "details": "This API version was decommissioned on February 1, 2028",
    "migrationGuide": "https://docs.stayhaven.com/migration/v1-to-v2",
    "currentVersion": "v2",
    "supportEmail": "api-support@stayhaven.com"
  }
}
```

---

## 🚀 Migration Guide

### v1 to v2 Migration (Future)

> **Note**: v2 is planned for August 2026

#### Breaking Changes in v2

**1. Authentication Enhancement**
```javascript
// v1 (JWT only)
headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}

// v2 (OAuth 2.0 + JWT)
headers: {
  'Authorization': 'Bearer ya29.a0AfH6SMBx...',  // OAuth 2.0 token
  'X-API-Key': 'your-api-key'  // Required for server-to-server
}
```

**Migration Steps**:
1. Register application for OAuth 2.0 credentials
2. Implement OAuth flow in your application
3. Update Authorization header format
4. Test with v2 sandbox environment
5. Deploy to production

---

**2. Date Format Standardization**
```json
// v1 (mixed formats)
{
  "checkIn": "2026-03-15",  // Date string
  "createdAt": "2026-02-02T10:00:00.000Z"  // ISO 8601
}

// v2 (consistent ISO 8601)
{
  "checkIn": "2026-03-15T14:00:00.000Z",  // ISO 8601 with timezone
  "createdAt": "2026-02-02T10:00:00.000Z"
}
```

---

**3. Error Response Structure**
```json
// v1
{
  "success": false,
  "message": "Hotel not found"
}

// v2 (enhanced)
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Hotel not found",
    "details": "No hotel found with ID: 65b98765432fedcba987654",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/v2/hotels/65b98765432fedcba987654",
    "requestId": "req_1a2b3c4d5e6f"
  }
}
```

---

**4. Pagination Enhancement**
```json
// v1
{
  "hotels": [...],
  "currentPage": 1,
  "totalPages": 5
}

// v2 (cursor-based)
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6IjY1YjEyMzQ1Njc4In0=",
    "prevCursor": null,
    "hasMore": true,
    "totalCount": 127
  }
}
```

---

### Migration Checklist

**Phase 1: Assessment (Week 1-2)**
- [ ] Review v2 changelog and breaking changes
- [ ] Identify affected endpoints in your integration
- [ ] Estimate migration effort
- [ ] Create migration plan

**Phase 2: Development (Week 3-6)**
- [ ] Set up v2 sandbox environment
- [ ] Update authentication implementation
- [ ] Update request/response handling
- [ ] Implement new error handling
- [ ] Update date parsing logic
- [ ] Update pagination logic

**Phase 3: Testing (Week 7-8)**
- [ ] Test all endpoints in v2 sandbox
- [ ] Verify backward compatibility with v1 data
- [ ] Load testing with v2
- [ ] Security testing
- [ ] Edge case testing

**Phase 4: Deployment (Week 9-10)**
- [ ] Deploy to staging with v2
- [ ] Monitor for errors
- [ ] Gradual rollout to production
- [ ] Monitor metrics and errors
- [ ] Deprecate v1 usage

---

## 🔨 Breaking Changes

### Handling Breaking Changes

**Client Responsibility**:
- Always specify API version in requests
- Handle deprecated warnings
- Subscribe to API changelog notifications
- Plan for migrations in advance
- Test against new versions before they go live

**Server Guarantees**:
- Minimum 2 years support for each major version
- 6-month advance notice before sunset
- Migration guides and tools provided
- Sandbox environment for testing
- Dedicated migration support

---

### Version Negotiation

**Requesting Specific Version**:
```http
GET /api/v1/hotels HTTP/1.1
Host: api.stayhaven.com
```

**Default Version** (if not specified):
```http
GET /api/hotels HTTP/1.1
Host: api.stayhaven.com
```
→ Redirects to latest stable version (`v1`)

**Version Header** (alternative):
```http
GET /api/hotels HTTP/1.1
Host: api.stayhaven.com
API-Version: 1
```

---

## 📊 Version Adoption Metrics

### Tracking Version Usage

**Response Headers**:
```http
HTTP/1.1 200 OK
API-Version: 1
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
```

**Metrics Tracked**:
- Requests per version
- Error rates per version
- Active integrations per version
- Migration progress

---

## 📚 Related Documents

- [API Overview](./api-overview.md)
- [Error Response Format](./error-response-format.md)
- [Authentication APIs](./authentication-apis.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Current API Version**: v1.0.0  
**Status**: ✅ Complete - Comprehensive API versioning strategy

---

## 📞 Contact & Support

**Questions about versioning or migration?**
- Email: api-support@stayhaven.com
- Documentation: https://docs.stayhaven.com/versioning
- Changelog: https://docs.stayhaven.com/changelog
- Migration Support: https://docs.stayhaven.com/migration
