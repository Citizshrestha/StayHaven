# Backward Compatibility

> Ensuring smooth upgrades and migration paths for StayHaven

---

## 📋 Table of Contents

1. [Compatibility Policy](#compatibility-policy)
2. [API Compatibility](#api-compatibility)
3. [Database Migrations](#database-migrations)
4. [Breaking Changes](#breaking-changes)
5. [Deprecation Process](#deprecation-process)
6. [Migration Guides](#migration-guides)

---

## 📜 Compatibility Policy

### Version Support

```
Active Version (v2.x):
- Full feature support
- Bug fixes
- Security patches
- Performance improvements

Previous Version (v1.x):
- Security patches only
- Critical bug fixes
- Supported for 12 months after v2.0 release

Legacy Versions (v0.x):
- No support
- Deprecation warnings
- 6 months migration period
```

### Backward Compatibility Promise

**We guarantee**:
- MINOR and PATCH versions are backward compatible
- No breaking changes within same MAJOR version
- Minimum 6 months deprecation notice
- Clear migration guides for breaking changes

**Example**:
```
v1.0.0 → v1.5.0: Fully compatible
v1.5.0 → v1.5.3: Fully compatible
v1.9.0 → v2.0.0: May have breaking changes
```

---

## 🔌 API Compatibility

### Backward Compatible Changes

**✅ Allowed in MINOR/PATCH versions**:

1. **Adding new endpoints**
```javascript
// v1.0.0
GET /api/hotels

// v1.1.0 - Added new endpoint (compatible)
GET /api/hotels
GET /api/hotels/featured  // New!
```

2. **Adding optional parameters**
```javascript
// v1.0.0
GET /api/hotels?city=NYC

// v1.1.0 - Added optional parameter (compatible)
GET /api/hotels?city=NYC&featured=true  // New optional param
```

3. **Adding fields to response**
```javascript
// v1.0.0
{
  "id": "123",
  "name": "Hotel ABC"
}

// v1.1.0 - Added new field (compatible)
{
  "id": "123",
  "name": "Hotel ABC",
  "rating": 4.5  // New field
}
```

4. **Adding enum values**
```javascript
// v1.0.0
enum BookingStatus {
  PENDING,
  CONFIRMED,
  CANCELLED
}

// v1.1.0 - Added new status (compatible)
enum BookingStatus {
  PENDING,
  CONFIRMED,
  CANCELLED,
  COMPLETED  // New value
}
```

### Breaking Changes

**❌ NOT allowed in MINOR/PATCH versions**:

1. **Removing endpoints**
```javascript
// v1.0.0
GET /api/hotels
GET /api/hotels/old-endpoint

// v2.0.0 - Removed endpoint (BREAKING)
GET /api/hotels
// /api/hotels/old-endpoint removed!
```

2. **Removing response fields**
```javascript
// v1.0.0
{ "id": "123", "oldField": "value" }

// v2.0.0 - Removed field (BREAKING)
{ "id": "123" }
// oldField removed!
```

3. **Changing field types**
```javascript
// v1.0.0
{ "price": "100.00" }  // String

// v2.0.0 - Changed type (BREAKING)
{ "price": 100.00 }  // Number
```

4. **Renaming fields**
```javascript
// v1.0.0
{ "hotelName": "ABC" }

// v2.0.0 - Renamed field (BREAKING)
{ "name": "ABC" }
// hotelName renamed to name!
```

5. **Making optional parameters required**
```javascript
// v1.0.0
POST /api/bookings
{ "hotelId": "123" }  // guests optional

// v2.0.0 - Made parameter required (BREAKING)
POST /api/bookings
{ "hotelId": "123", "guests": 2 }  // guests now required!
```

---

## 💾 Database Migrations

### Compatible Migrations

**✅ Safe to apply**:

1. **Adding new fields with defaults**
```javascript
// Migration: Add loyalty points
export const up = async (db) => {
  await db.collection('users').updateMany(
    {},
    { $set: { loyaltyPoints: 0 } }  // Default value provided
  );
};
```

2. **Adding indexes**
```javascript
export const up = async (db) => {
  await db.collection('hotels').createIndex({ city: 1, rating: -1 });
};
```

3. **Adding new collections**
```javascript
export const up = async (db) => {
  await db.createCollection('reviews');
};
```

### Breaking Migrations

**⚠️ Require careful planning**:

1. **Removing fields**
```javascript
// Migration: Remove deprecated field
export const up = async (db) => {
  // First deprecate (v1.5.0)
  await db.collection('users').updateMany(
    {},
    { $rename: { 'oldField': 'oldField_deprecated' } }
  );
  
  // Later remove (v2.0.0 - after 6 months)
  await db.collection('users').updateMany(
    {},
    { $unset: { oldField_deprecated: '' } }
  );
};
```

2. **Renaming fields**
```javascript
// Multi-step migration
// Step 1 (v1.5.0): Duplicate field
export const up_step1 = async (db) => {
  await db.collection('users').updateMany(
    {},
    { $rename: { 'userName': 'name' } }
  );
};

// Step 2 (v1.6.0): Support both fields
// (Application code supports both userName and name)

// Step 3 (v2.0.0): Remove old field
export const up_step3 = async (db) => {
  await db.collection('users').updateMany(
    {},
    { $unset: { userName: '' } }
  );
};
```

3. **Changing field types**
```javascript
// Migration: Change price from string to number
export const up = async (db) => {
  const hotels = await db.collection('hotels').find().toArray();
  
  for (const hotel of hotels) {
    await db.collection('hotels').updateOne(
      { _id: hotel._id },
      { $set: { price: parseFloat(hotel.price) } }
    );
  }
};

export const down = async (db) => {
  const hotels = await db.collection('hotels').find().toArray();
  
  for (const hotel of hotels) {
    await db.collection('hotels').updateOne(
      { _id: hotel._id },
      { $set: { price: hotel.price.toString() } }
    );
  }
};
```

---

## 🚧 Breaking Changes

### Announcing Breaking Changes

**Timeline**:
```
v1.0.0: Feature X introduced
   ↓
v1.5.0: Feature X deprecated (6 months notice)
   ↓
v2.0.0: Feature X removed
```

**Deprecation Warning**:
```javascript
// v1.5.0 - Add deprecation warning
router.get('/api/old-endpoint', (req, res) => {
  res.setHeader('X-API-Deprecated', 'true');
  res.setHeader('X-API-Sunset', '2025-12-31');
  res.setHeader('X-API-Replacement', '/api/v2/new-endpoint');
  
  console.warn('DEPRECATED: /api/old-endpoint will be removed in v2.0.0');
  
  res.json({
    warning: 'This endpoint is deprecated. Please use /api/v2/new-endpoint',
    data: {}
  });
});
```

### Documentation

**Changelog Entry**:
```markdown
## [1.5.0] - 2024-12-01

### Deprecated
- **API**: `GET /api/old-endpoint` is deprecated
  - Use `GET /api/v2/new-endpoint` instead
  - Will be removed in v2.0.0 (June 2025)
  - Migration guide: docs/migrations/old-to-new-endpoint.md
```

---

## 📊 Deprecation Process

### 4-Step Deprecation

**Step 1: Announce (v1.5.0)**
- Add deprecation warnings
- Update documentation
- Notify users via email/blog

**Step 2: Provide Alternative (v1.5.0)**
- Ensure replacement feature is available
- Provide migration guide
- Support both old and new

**Step 3: Grace Period (6 months)**
- Monitor usage of deprecated features
- Send reminders to users
- Offer migration support

**Step 4: Remove (v2.0.0)**
- Remove deprecated feature
- Update documentation
- Release notes highlight breaking changes

---

## 📝 Migration Guides

### Example: v1.x to v2.0 Migration

**Breaking Changes**:

1. **Authentication endpoint changed**

```javascript
// v1.x (deprecated)
POST /api/auth/signin
{ "username": "user", "password": "pass" }

// v2.0 (new)
POST /api/auth/login
{ "email": "user@example.com", "password": "pass" }
```

**Migration Steps**:

```javascript
// Old code (v1.x)
const response = await fetch('/api/auth/signin', {
  method: 'POST',
  body: JSON.stringify({
    username: 'user',
    password: 'pass'
  })
});

// New code (v2.0)
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    email: 'user@example.com',  // Changed from username to email
    password: 'pass'
  })
});
```

2. **Response format changed**

```javascript
// v1.x response
{
  "success": true,
  "token": "abc123"
}

// v2.0 response
{
  "accessToken": "abc123",
  "refreshToken": "xyz789"
}
```

**Migration Steps**:

```javascript
// Old code (v1.x)
const { token } = response.data;
localStorage.setItem('token', token);

// New code (v2.0)
const { accessToken, refreshToken } = response.data;
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

---

## ✅ Testing Compatibility

### Automated Tests

```javascript
// Test backward compatibility
describe('API Backward Compatibility', () => {
  it('should support old endpoint during grace period', async () => {
    // Test old endpoint still works
    const response = await request(app)
      .get('/api/old-endpoint')
      .expect(200);
    
    // Check deprecation header
    expect(response.headers['x-api-deprecated']).toBe('true');
  });

  it('should accept old and new request formats', async () => {
    // Old format
    await request(app)
      .post('/api/auth/login')
      .send({ username: 'user', password: 'pass' })
      .expect(200);
    
    // New format
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'pass' })
      .expect(200);
  });
});
```

---

## 🔗 Related Documentation

- [Versioning Strategy](./versioning-strategy.md)
- [Changelog](./changelog.md)
- [Known Issues](./known-issues.md)

---

## 📝 Summary

Backward compatibility:
- **Policy**: MINOR/PATCH versions are compatible
- **Breaking changes**: Only in MAJOR versions
- **Deprecation**: 6 months minimum notice
- **Migration**: Clear guides and support

**Goal**: Smooth upgrades with minimal disruption.