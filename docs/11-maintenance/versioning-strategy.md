# Versioning Strategy

> Semantic versioning and release management for StayHaven

---

## 📋 Table of Contents

1. [Semantic Versioning](#semantic-versioning)
2. [Version Numbering](#version-numbering)
3. [Release Cycle](#release-cycle)
4. [Branching Strategy](#branching-strategy)
5. [API Versioning](#api-versioning)
6. [Database Migrations](#database-migrations)

---

## 🔢 Semantic Versioning

### Format

```
MAJOR.MINOR.PATCH

Example: 2.4.1
```

### Version Components

**MAJOR** (2.x.x):
- Breaking changes
- Incompatible API changes
- Major architectural changes
- Database schema breaking changes

**MINOR** (x.4.x):
- New features (backward compatible)
- Significant improvements
- New API endpoints
- Database schema additions

**PATCH** (x.x.1):
- Bug fixes
- Security patches
- Performance improvements
- Documentation updates

---

## 🏷️ Version Numbering

### Current Version

```json
// package.json
{
  "name": "stayhaven",
  "version": "1.0.0",
  "description": "Hotel booking platform"
}
```

### Version Examples

```
1.0.0 - Initial release
1.0.1 - Bug fix: Fixed booking date validation
1.1.0 - Feature: Added hotel reviews
1.1.1 - Bug fix: Fixed review submission
1.2.0 - Feature: Added loyalty program
2.0.0 - Breaking: New authentication system
```

### Pre-release Versions

```
1.2.0-alpha.1   - Alpha release (internal testing)
1.2.0-beta.1    - Beta release (limited users)
1.2.0-rc.1      - Release candidate
1.2.0           - Stable release
```

---

## 📅 Release Cycle

### Schedule

```
Major Releases: Annually (v1.0, v2.0)
Minor Releases: Quarterly (v1.1, v1.2, v1.3)
Patch Releases: As needed (v1.1.1, v1.1.2)
```

### Release Timeline

```
Week 1-8:  Feature development
Week 9:    Code freeze, testing
Week 10:   Beta release
Week 11:   Bug fixes
Week 12:   Production release
```

### Release Process

```
1. Code freeze on develop branch
   ↓
2. Create release branch (release/1.2.0)
   ↓
3. Testing and bug fixes
   ↓
4. Update version number
   ↓
5. Update CHANGELOG.md
   ↓
6. Merge to main
   ↓
7. Tag release (v1.2.0)
   ↓
8. Deploy to production
   ↓
9. Merge back to develop
```

---

## 🌳 Branching Strategy

### Git Flow

```
main (production)
  │
  ├── release/1.2.0
  │     │
  │     ├── hotfix/fix-payment
  │
develo p (integration)
  │
  ├── feature/hotel-reviews
  ├── feature/loyalty-program
  ├── bugfix/date-validation
```

### Branch Types

**main**:
- Production-ready code
- Tagged releases only
- Protected branch

**develop**:
- Integration branch
- Latest development code
- Base for feature branches

**feature/***:
- New features
- Branch from develop
- Merge back to develop

**bugfix/***:
- Bug fixes for develop
- Branch from develop
- Merge back to develop

**release/***:
- Preparation for release
- Branch from develop
- Merge to main and develop

**hotfix/***:
- Emergency production fixes
- Branch from main
- Merge to main and develop

### Branch Naming

```bash
# Features
git checkout -b feature/hotel-reviews
git checkout -b feature/loyalty-program

# Bug fixes
git checkout -b bugfix/date-validation
git checkout -b bugfix/email-template

# Releases
git checkout -b release/1.2.0

# Hotfixes
git checkout -b hotfix/fix-payment-bug
```

---

## 🔌 API Versioning

### URL-based Versioning

```javascript
// Current approach (v1)
GET /api/hotels
GET /api/bookings

// Future versions
GET /api/v2/hotels
GET /api/v2/bookings
```

### Version Router

```javascript
// server.js
import v1Routes from './routes/v1/index.js';
import v2Routes from './routes/v2/index.js';

// Default to v1
app.use('/api', v1Routes);

// Explicit v1
app.use('/api/v1', v1Routes);

// v2 (when needed)
app.use('/api/v2', v2Routes);
```

### Deprecation Strategy

```javascript
// Deprecated endpoint
router.get('/old-endpoint', (req, res) => {
  res.setHeader('X-API-Deprecated', 'true');
  res.setHeader('X-API-Sunset', '2025-12-31');
  res.json({
    warning: 'This endpoint is deprecated. Use /api/v2/new-endpoint instead.',
    data: {}
  });
});
```

### Version Support Policy

```
Active Version:      Full support
Previous Version:    Security fixes only (12 months)
Older Versions:      Deprecated (6 months notice)

Example (Jan 2025):
- v2.x: Active (full support)
- v1.x: Maintenance (security only)
- v0.x: Deprecated (shutdown June 2025)
```

---

## 📊 Database Migrations

### Migration Versioning

```javascript
// migrations/
20241201120000-add-loyalty-points.js
20241205143000-add-review-schema.js
20241210101500-update-booking-status.js

// Format: YYYYMMDDHHmmss-description.js
```

### Migration File

```javascript
// migrations/20241201120000-add-loyalty-points.js
export const up = async (db) => {
  await db.collection('users').updateMany(
    {},
    { $set: { loyaltyPoints: 0 } }
  );
};

export const down = async (db) => {
  await db.collection('users').updateMany(
    {},
    { $unset: { loyaltyPoints: '' } }
  );
};
```

### Version in Database

```javascript
// Track schema version
const schemaVersionSchema = new mongoose.Schema({
  version: String,
  appliedAt: Date,
  description: String
});

// Current schema version
await SchemaVersion.create({
  version: '1.2.0',
  appliedAt: new Date(),
  description: 'Added loyalty program'
});
```

---

## 📝 Version Update Checklist

### Before Release

- [ ] All tests passing
- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Update API documentation
- [ ] Run database migrations
- [ ] Update environment variables (if needed)

### During Release

- [ ] Create release branch
- [ ] Tag version in Git
- [ ] Build production assets
- [ ] Deploy to staging
- [ ] Smoke test staging
- [ ] Deploy to production

### After Release

- [ ] Verify production deployment
- [ ] Monitor for errors
- [ ] Announce release to team
- [ ] Update documentation
- [ ] Merge release back to develop

---

## 🔗 Related Documentation

- [Changelog](./changelog.md)
- [Known Issues](./known-issues.md)
- [Backward Compatibility](./backward-compatibility.md)

---

## 📝 Summary

Versioning strategy:
- **Format**: Semantic versioning (MAJOR.MINOR.PATCH)
- **Release cycle**: Quarterly minor, as-needed patches
- **Branching**: Git Flow with main/develop
- **API versioning**: URL-based (/api/v1, /api/v2)
- **Migrations**: Timestamped, reversible

**Goal**: Clear, predictable version management.