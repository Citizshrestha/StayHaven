# Test Data Management

> Strategies for creating, managing, and cleaning up test data in StayHaven

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Test Data Strategies](#test-data-strategies)
3. [Data Fixtures](#data-fixtures)
4. [Factory Pattern](#factory-pattern)
5. [Database Seeding](#database-seeding)
6. [Data Cleanup](#data-cleanup)

---

## 🎯 Overview

### Why Test Data Matters

```
Good Test Data:
✅ Realistic and representative
✅ Consistent across test runs
✅ Easy to create and modify
✅ Isolated per test
✅ Easy to clean up
```

### Test Data Principles

```javascript
const PRINCIPLES = {
  isolation: 'Each test has its own data',
  repeatability: 'Same data produces same results',
  realism: 'Data reflects production scenarios',
  minimalism: 'Only create necessary data',
  cleanup: 'Always remove test data after use'
};
```

---

## 📊 Test Data Strategies

### 1. Inline Data

Best for: Simple, one-off test cases

```javascript
test('should create user with valid data', async () => {
  const userData = {
    email: 'test@example.com',
    password: 'StrongPass123!',
    fullName: 'Test User'
  };
  
  const user = await User.create(userData);
  expect(user.email).toBe(userData.email);
});
```

### 2. Fixtures

Best for: Shared, reusable test data

**File**: `tests/fixtures/userData.js`

```javascript
export const validUser = {
  email: 'valid@example.com',
  password: 'StrongPass123!',
  fullName: 'Valid User',
  phoneNumber: '+1234567890'
};

export const invalidUsers = [
  {
    email: 'invalid-email',
    password: 'StrongPass123!',
    error: 'Invalid email format'
  },
  {
    email: 'test@example.com',
    password: 'weak',
    error: 'Password too weak'
  }
];

export const userRoles = {
  guest: { name: 'guest', permissions: ['read:hotels'] },
  owner: { name: 'owner', permissions: ['manage:hotels'] },
  admin: { name: 'admin', permissions: ['manage:all'] }
};
```

**Usage**:

```javascript
import { validUser, invalidUsers } from '../fixtures/userData';

test('should accept valid user', async () => {
  const user = await User.create(validUser);
  expect(user).toBeDefined();
});

test.each(invalidUsers)('should reject invalid user: $error', async (data) => {
  await expect(User.create(data)).rejects.toThrow();
});
```

### 3. Factory Functions

Best for: Dynamic, customizable test data

**File**: `tests/factories/userFactory.js`

```javascript
import { faker } from '@faker-js/faker';

let userCounter = 0;

export const createUser = (overrides = {}) => ({
  email: `user${++userCounter}@example.com`,
  password: 'StrongPass123!',
  fullName: faker.person.fullName(),
  phoneNumber: faker.phone.number(),
  ...overrides
});

export const createUsers = (count, overrides = {}) => {
  return Array.from({ length: count }, () => createUser(overrides));
};

export const createOwner = (overrides = {}) => {
  return createUser({
    role: 'owner',
    ...overrides
  });
};
```

**File**: `tests/factories/hotelFactory.js`

```javascript
import { faker } from '@faker-js/faker';

export const createHotel = (overrides = {}) => ({
  name: faker.company.name() + ' Hotel',
  description: faker.lorem.paragraph(),
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  state: faker.location.state(),
  country: 'USA',
  zipCode: faker.location.zipCode(),
  phoneNumber: faker.phone.number(),
  email: faker.internet.email(),
  status: 'approved',
  ...overrides
});

export const createHotels = (count, overrides = {}) => {
  return Array.from({ length: count }, () => createHotel(overrides));
};
```

**Usage**:

```javascript
import { createUser, createUsers } from '../factories/userFactory';
import { createHotel } from '../factories/hotelFactory';

test('should create unique users', async () => {
  const user1 = createUser();
  const user2 = createUser();
  
  expect(user1.email).not.toBe(user2.email);
});

test('should create user with specific role', async () => {
  const admin = createUser({ role: 'admin' });
  expect(admin.role).toBe('admin');
});

test('should create multiple hotels', () => {
  const hotels = createHotels(5, { city: 'New York' });
  
  expect(hotels).toHaveLength(5);
  expect(hotels.every(h => h.city === 'New York')).toBe(true);
});
```

---

## 🏭 Database Seeding

### Seed Script

**File**: `tests/helpers/seedDatabase.js`

```javascript
import User from '../../models/user.schema.js';
import Hotel from '../../models/hotel.schema.js';
import Role from '../../models/role.schema.js';
import { createUser } from '../factories/userFactory.js';
import { createHotel } from '../factories/hotelFactory.js';

export const seedRoles = async () => {
  const roles = [
    { name: 'guest', permissions: ['read:hotels', 'create:bookings'] },
    { name: 'owner', permissions: ['manage:hotels', 'manage:staff'] },
    { name: 'waiter', permissions: ['manage:orders'] },
    { name: 'chef', permissions: ['view:orders', 'update:orders'] },
    { name: 'admin', permissions: ['manage:all'] }
  ];
  
  await Role.insertMany(roles);
  return await Role.find();
};

export const seedUsers = async (count = 10) => {
  const roles = await Role.find();
  const guestRole = roles.find(r => r.name === 'guest');
  const ownerRole = roles.find(r => r.name === 'owner');
  
  const users = [];
  
  // Create owners
  for (let i = 0; i < 3; i++) {
    users.push(createUser({
      role: ownerRole._id,
      fullName: `Owner ${i + 1}`
    }));
  }
  
  // Create guests
  for (let i = 0; i < count - 3; i++) {
    users.push(createUser({
      role: guestRole._id,
      fullName: `Guest ${i + 1}`
    }));
  }
  
  await User.insertMany(users);
  return await User.find();
};

export const seedHotels = async (count = 20) => {
  const owners = await User.find({ role: 'owner' });
  
  const hotels = [];
  for (let i = 0; i < count; i++) {
    const owner = owners[i % owners.length];
    hotels.push(createHotel({
      owner: owner._id,
      status: i % 5 === 0 ? 'pending' : 'approved'
    }));
  }
  
  await Hotel.insertMany(hotels);
  return await Hotel.find();
};

export const seedAll = async () => {
  await seedRoles();
  await seedUsers();
  await seedHotels();
};
```

**Usage in Tests**:

```javascript
import { seedAll, seedUsers, seedHotels } from '../helpers/seedDatabase';

describe('Hotel Search', () => {
  beforeAll(async () => {
    await setupTestDB();
    await seedAll(); // Seed complete database
  });
  
  afterAll(async () => {
    await teardownTestDB();
  });
  
  test('should find hotels by city', async () => {
    const response = await request(app)
      .get('/api/hotels?city=New York');
    
    expect(response.body.data.length).toBeGreaterThan(0);
  });
});
```

---

## 🧹 Data Cleanup

### Strategy 1: Delete After Each Test

```javascript
afterEach(async () => {
  await User.deleteMany({});
  await Hotel.deleteMany({});
  await Booking.deleteMany({});
});
```

### Strategy 2: Test Database Reset

```javascript
import mongoose from 'mongoose';

export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

export const resetDatabase = async () => {
  await clearDatabase();
  await seedRoles(); // Re-seed essential data
};
```

### Strategy 3: Transaction Rollback

```javascript
import mongoose from 'mongoose';

let session;

beforeEach(async () => {
  session = await mongoose.startSession();
  session.startTransaction();
});

afterEach(async () => {
  await session.abortTransaction();
  session.endSession();
});

test('should create user (rolled back)', async () => {
  const user = await User.create([{ email: 'test@example.com' }], { session });
  expect(user).toBeDefined();
  // Automatically rolled back after test
});
```

---

## 🔑 Test Data Best Practices

### 1. Use Unique Identifiers

```javascript
// ✅ GOOD: Unique emails
const user1 = createUser({ email: `user_${Date.now()}@example.com` });
const user2 = createUser({ email: `user_${Date.now() + 1}@example.com` });

// ❌ BAD: Duplicate emails
const user1 = { email: 'test@example.com' };
const user2 = { email: 'test@example.com' }; // Will fail
```

### 2. Minimize Test Data

```javascript
// ✅ GOOD: Only necessary fields
const user = { email: 'test@example.com', password: 'pass123' };

// ❌ BAD: Unnecessary data
const user = {
  email: 'test@example.com',
  password: 'pass123',
  bio: 'Long bio...',
  preferences: {...},
  // ... many unused fields
};
```

### 3. Use Meaningful Names

```javascript
// ✅ GOOD
const ownerUser = createUser({ role: 'owner' });
const approvedHotel = createHotel({ status: 'approved' });

// ❌ BAD
const user1 = createUser();
const hotel = createHotel();
```

### 4. Document Data Dependencies

```javascript
// ✅ GOOD: Clear setup
test('owner can update own hotel', async () => {
  // Setup: Create owner and hotel
  const owner = await User.create(createUser({ role: 'owner' }));
  const hotel = await Hotel.create(createHotel({ owner: owner._id }));
  
  // Test: Owner updates hotel
  const response = await request(app)
    .put(`/api/hotels/${hotel._id}`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ name: 'Updated Name' });
  
  expect(response.status).toBe(200);
});
```

---

## 📊 Test Data Coverage

### Essential Test Cases

```javascript
const TEST_SCENARIOS = {
  validData: 'Happy path with correct data',
  invalidData: 'Validation errors',
  missingData: 'Required fields missing',
  edgeCases: 'Boundary values',
  conflicts: 'Duplicate data',
  unauthorized: 'Permission denied',
  notFound: 'Resource doesn\'t exist'
};
```

### Example: Comprehensive User Tests

```javascript
import { createUser } from '../factories/userFactory';

describe('User Creation Test Data', () => {
  test('valid user data', () => {
    const user = createUser();
    expect(user.email).toMatch(/@/);
  });
  
  test('missing required fields', () => {
    const invalidUser = { email: 'test@example.com' }; // Missing password
    // Test validation
  });
  
  test('invalid email format', () => {
    const user = createUser({ email: 'invalid-email' });
    // Test validation
  });
  
  test('weak password', () => {
    const user = createUser({ password: 'weak' });
    // Test validation
  });
  
  test('duplicate email', async () => {
    const user1 = createUser({ email: 'same@example.com' });
    const user2 = createUser({ email: 'same@example.com' });
    // Test unique constraint
  });
});
```

---

## 📌 Summary

Test data management in StayHaven:
- **Factories**: Generate dynamic test data
- **Fixtures**: Reusable static data
- **Seeding**: Populate database for tests
- **Cleanup**: Remove data after tests
- **Isolation**: Each test has independent data

**Goal**: Reliable, maintainable, realistic test data.