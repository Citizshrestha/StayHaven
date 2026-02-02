# Integration Testing APIs

> Comprehensive guide to testing API endpoints and integration points in StayHaven

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Testing Setup](#testing-setup)
3. [API Test Structure](#api-test-structure)
4. [Authentication Tests](#authentication-tests)
5. [Hotel Management Tests](#hotel-management-tests)
6. [Booking Tests](#booking-tests)
7. [Order Management Tests](#order-management-tests)
8. [Database Integration](#database-integration)
9. [File Upload Tests](#file-upload-tests)
10. [Best Practices](#best-practices)

---

## 🎯 Overview

### What is Integration Testing?

Integration testing validates that different components work together correctly, focusing on:
- API endpoint functionality
- Database interactions
- Authentication/authorization flows
- Third-party service integrations
- Request/response handling

```
Integration Test Scope:
┌──────────────────────────────────────────┐
│  HTTP Request → Express → Controller     │
│       ↓            ↓          ↓          │
│  Middleware → Database → Response        │
└──────────────────────────────────────────┘
```

### Key Differences from Unit Tests

| Aspect | Unit Tests | Integration Tests |
|--------|-----------|-------------------|
| Scope | Single function | Multiple components |
| Dependencies | Mocked | Real or test DB |
| Speed | Very fast (<10ms) | Moderate (50-500ms) |
| Database | Not used | Test database |
| Coverage | Code paths | User workflows |

---

## 🛠️ Testing Setup

### 1. Install Dependencies

```bash
cd Backend
npm install --save-dev jest supertest mongodb-memory-server
```

### 2. Test Environment Configuration

**File**: `tests/integration/setup.js`

```javascript
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

// Setup before all tests
export const setupTestDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
  console.log('Test database connected');
};

// Cleanup after all tests
export const teardownTestDB = async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('Test database disconnected');
};

// Clear all collections between tests
export const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};
```

### 3. Package.json Scripts

```json
{
  "scripts": {
    "test:integration": "jest --testPathPattern=tests/integration --runInBand",
    "test:integration:watch": "jest --testPathPattern=tests/integration --watch",
    "test:integration:coverage": "jest --testPathPattern=tests/integration --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "testTimeout": 10000,
    "setupFilesAfterEnv": ["<rootDir>/tests/integration/setup.js"]
  }
}
```

---

## 📝 API Test Structure

### Basic Test Template

```javascript
import request from 'supertest';
import app from '../../server.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import User from '../../models/user.schema.js';

describe('API Endpoint Tests', () => {
  // Setup database before all tests
  beforeAll(async () => {
    await setupTestDB();
  });
  
  // Cleanup database after all tests
  afterAll(async () => {
    await teardownTestDB();
  });
  
  // Clear data between tests
  afterEach(async () => {
    await clearTestDB();
  });
  
  describe('Specific Feature', () => {
    test('should perform expected action', async () => {
      // Test implementation
    });
  });
});
```

---

## 🔐 Authentication Tests

**File**: `tests/integration/auth.test.js`

```javascript
import request from 'supertest';
import app from '../../server.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import User from '../../models/user.schema.js';
import Role from '../../models/role.schema.js';

describe('Authentication API Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDB();
    
    // Create default roles
    await Role.create([
      { name: 'guest', permissions: ['read:hotels', 'create:bookings'] },
      { name: 'owner', permissions: ['manage:hotels', 'manage:staff'] },
      { name: 'admin', permissions: ['manage:all'] }
    ]);
  });
  
  afterAll(async () => {
    await teardownTestDB();
  });
  
  afterEach(async () => {
    await clearTestDB();
  });
  
  describe('POST /api/auth/register', () => {
    test('should register new user with valid data', async () => {
      // ARRANGE
      const userData = {
        email: 'newuser@example.com',
        password: 'StrongPass123!',
        fullName: 'New User',
        phoneNumber: '+1234567890'
      };
      
      // ACT
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.password).toBeUndefined(); // Should not return password
      
      // Verify user exists in database
      const userInDB = await User.findOne({ email: userData.email });
      expect(userInDB).toBeTruthy();
      expect(userInDB.fullName).toBe(userData.fullName);
    });
    
    test('should return 400 when email already exists', async () => {
      // ARRANGE
      const existingUser = {
        email: 'existing@example.com',
        password: 'StrongPass123!',
        fullName: 'Existing User'
      };
      
      await User.create(existingUser);
      
      // ACT
      const response = await request(app)
        .post('/api/auth/register')
        .send(existingUser)
        .expect(400);
      
      // ASSERT
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
    
    test('should return 400 when required fields are missing', async () => {
      // ACT
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);
      
      // ASSERT
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/required|password/i);
    });
    
    test('should return 400 when email format is invalid', async () => {
      // ACT
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'StrongPass123!',
          fullName: 'Test User'
        })
        .expect(400);
      
      // ASSERT
      expect(response.body.success).toBe(false);
    });
    
    test('should return 400 when password is weak', async () => {
      // ACT
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          fullName: 'Test User'
        })
        .expect(400);
      
      // ASSERT
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/password/i);
    });
  });
  
  describe('POST /api/auth/login', () => {
    let testUser;
    
    beforeEach(async () => {
      // Create test user
      const guestRole = await Role.findOne({ name: 'guest' });
      testUser = await User.create({
        email: 'test@example.com',
        password: 'StrongPass123!',
        fullName: 'Test User',
        role: guestRole._id
      });
    });
    
    test('should login with correct credentials', async () => {
      // ACT
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'StrongPass123!'
        })
        .expect(200);
      
      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
      
      // Check refresh token cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.includes('refreshToken'))).toBe(true);
    });
    
    test('should return 401 with incorrect password', async () => {
      // ACT
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!'
        })
        .expect(401);
      
      // ASSERT
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid credentials/i);
    });
    
    test('should return 401 with non-existent email', async () => {
      // ACT
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'StrongPass123!'
        })
        .expect(401);
      
      // ASSERT
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/auth/logout', () => {
    let authToken;
    
    beforeEach(async () => {
      // Create and login user
      const guestRole = await Role.findOne({ name: 'guest' });
      await User.create({
        email: 'test@example.com',
        password: 'StrongPass123!',
        fullName: 'Test User',
        role: guestRole._id
      });
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'StrongPass123!'
        });
      
      authToken = loginResponse.body.data.accessToken;
    });
    
    test('should logout successfully', async () => {
      // ACT
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/logout/i);
    });
    
    test('should return 401 without auth token', async () => {
      // ACT
      await request(app)
        .post('/api/auth/logout')
        .expect(401);
    });
  });
  
  describe('POST /api/auth/refresh-token', () => {
    let refreshToken;
    
    beforeEach(async () => {
      const guestRole = await Role.findOne({ name: 'guest' });
      await User.create({
        email: 'test@example.com',
        password: 'StrongPass123!',
        fullName: 'Test User',
        role: guestRole._id
      });
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'StrongPass123!'
        });
      
      // Extract refresh token from cookie
      const cookies = loginResponse.headers['set-cookie'];
      refreshToken = cookies
        .find(cookie => cookie.startsWith('refreshToken='))
        .split(';')[0]
        .split('=')[1];
    });
    
    test('should generate new access token with valid refresh token', async () => {
      // ACT
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', [`refreshToken=${refreshToken}`])
        .expect(200);
      
      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });
    
    test('should return 401 with invalid refresh token', async () => {
      // ACT
      await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', ['refreshToken=invalid_token'])
        .expect(401);
    });
  });
});
```

---

## 🏨 Hotel Management Tests

**File**: `tests/integration/hotel.test.js`

```javascript
import request from 'supertest';
import app from '../../server.js';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import User from '../../models/user.schema.js';
import Hotel from '../../models/hotel.schema.js';
import Role from '../../models/role.schema.js';
import Company from '../../models/company.schema.js';

describe('Hotel Management API Integration Tests', () => {
  let ownerToken, guestToken, adminToken;
  let ownerId, companyId;
  
  beforeAll(async () => {
    await setupTestDB();
    
    // Create roles
    const roles = await Role.create([
      { name: 'guest', permissions: ['read:hotels'] },
      { name: 'owner', permissions: ['manage:hotels'] },
      { name: 'admin', permissions: ['manage:all'] }
    ]);
    
    // Create test users
    const owner = await User.create({
      email: 'owner@example.com',
      password: 'StrongPass123!',
      fullName: 'Hotel Owner',
      role: roles[1]._id
    });
    ownerId = owner._id;
    
    const guest = await User.create({
      email: 'guest@example.com',
      password: 'StrongPass123!',
      fullName: 'Guest User',
      role: roles[0]._id
    });
    
    const admin = await User.create({
      email: 'admin@example.com',
      password: 'StrongPass123!',
      fullName: 'Admin User',
      role: roles[2]._id
    });
    
    // Create company
    const company = await Company.create({
      name: 'Test Company',
      owner: ownerId
    });
    companyId = company._id;
    
    // Login users and get tokens
    const ownerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'StrongPass123!' });
    ownerToken = ownerLogin.body.data.accessToken;
    
    const guestLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'guest@example.com', password: 'StrongPass123!' });
    guestToken = guestLogin.body.data.accessToken;
    
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'StrongPass123!' });
    adminToken = adminLogin.body.data.accessToken;
  });
  
  afterAll(async () => {
    await teardownTestDB();
  });
  
  afterEach(async () => {
    await Hotel.deleteMany({});
  });
  
  describe('POST /api/hotels', () => {
    test('owner should create hotel successfully', async () => {
      // ARRANGE
      const hotelData = {
        name: 'Grand Hotel',
        description: 'Luxury hotel in city center',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        zipCode: '10001',
        phoneNumber: '+1234567890',
        email: 'info@grandhotel.com',
        companyId: companyId.toString()
      };
      
      // ACT
      const response = await request(app)
        .post('/api/hotels')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(hotelData)
        .expect(201);
      
      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(hotelData.name);
      expect(response.body.data.status).toBe('pending'); // Needs approval
      
      // Verify in database
      const hotelInDB = await Hotel.findById(response.body.data._id);
      expect(hotelInDB).toBeTruthy();
      expect(hotelInDB.owner.toString()).toBe(ownerId.toString());
    });
    
    test('guest should not be able to create hotel', async () => {
      // ACT
      const response = await request(app)
        .post('/api/hotels')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ name: 'Test Hotel' })
        .expect(403);
      
      // ASSERT
      expect(response.body.success).toBe(false);
    });
    
    test('should return 401 without authentication', async () => {
      // ACT
      await request(app)
        .post('/api/hotels')
        .send({ name: 'Test Hotel' })
        .expect(401);
    });
  });
  
  describe('GET /api/hotels', () => {
    beforeEach(async () => {
      // Create test hotels
      await Hotel.create([
        {
          name: 'Hotel A',
          owner: ownerId,
          company: companyId,
          city: 'New York',
          status: 'approved'
        },
        {
          name: 'Hotel B',
          owner: ownerId,
          company: companyId,
          city: 'Los Angeles',
          status: 'approved'
        },
        {
          name: 'Hotel C',
          owner: ownerId,
          company: companyId,
          city: 'New York',
          status: 'pending'
        }
      ]);
    });
    
    test('should return all approved hotels', async () => {
      // ACT
      const response = await request(app)
        .get('/api/hotels')
        .expect(200);
      
      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2); // Only approved hotels
    });
    
    test('should filter hotels by city', async () => {
      // ACT
      const response = await request(app)
        .get('/api/hotels?city=New York')
        .expect(200);
      
      // ASSERT
      expect(response.body.data.length).toBe(1); // Only approved NY hotel
      expect(response.body.data[0].city).toBe('New York');
    });
    
    test('should support pagination', async () => {
      // ACT
      const response = await request(app)
        .get('/api/hotels?page=1&limit=1')
        .expect(200);
      
      // ASSERT
      expect(response.body.data.length).toBe(1);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.totalPages).toBeGreaterThan(1);
    });
  });
  
  describe('GET /api/hotels/:id', () => {
    let hotelId;
    
    beforeEach(async () => {
      const hotel = await Hotel.create({
        name: 'Test Hotel',
        owner: ownerId,
        company: companyId,
        city: 'New York',
        status: 'approved'
      });
      hotelId = hotel._id;
    });
    
    test('should return hotel details', async () => {
      // ACT
      const response = await request(app)
        .get(`/api/hotels/${hotelId}`)
        .expect(200);
      
      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Hotel');
      expect(response.body.data._id).toBe(hotelId.toString());
    });
    
    test('should return 404 for non-existent hotel', async () => {
      // ACT
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/api/hotels/${fakeId}`)
        .expect(404);
    });
  });
  
  describe('PUT /api/hotels/:id', () => {
    let hotelId;
    
    beforeEach(async () => {
      const hotel = await Hotel.create({
        name: 'Original Hotel',
        owner: ownerId,
        company: companyId,
        city: 'New York',
        status: 'approved'
      });
      hotelId = hotel._id;
    });
    
    test('owner should update own hotel', async () => {
      // ACT
      const response = await request(app)
        .put(`/api/hotels/${hotelId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Updated Hotel Name' })
        .expect(200);
      
      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Hotel Name');
    });
    
    test('other owner should not update different owner hotel', async () => {
      // Create another owner
      const otherOwnerRole = await Role.findOne({ name: 'owner' });
      const otherOwner = await User.create({
        email: 'other@example.com',
        password: 'StrongPass123!',
        fullName: 'Other Owner',
        role: otherOwnerRole._id
      });
      
      const otherLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'other@example.com', password: 'StrongPass123!' });
      
      // ACT
      await request(app)
        .put(`/api/hotels/${hotelId}`)
        .set('Authorization', `Bearer ${otherLogin.body.data.accessToken}`)
        .send({ name: 'Hacked Hotel' })
        .expect(403);
    });
  });
  
  describe('POST /api/hotels/:id/approve', () => {
    let pendingHotelId;
    
    beforeEach(async () => {
      const hotel = await Hotel.create({
        name: 'Pending Hotel',
        owner: ownerId,
        company: companyId,
        city: 'New York',
        status: 'pending'
      });
      pendingHotelId = hotel._id;
    });
    
    test('admin should approve pending hotel', async () => {
      // ACT
      const response = await request(app)
        .post(`/api/hotels/${pendingHotelId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      // ASSERT
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
    });
    
    test('owner should not approve own hotel', async () => {
      // ACT
      await request(app)
        .post(`/api/hotels/${pendingHotelId}/approve`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });
  });
});
```

---

## 📊 Best Practices

### 1. Use Real Test Database

```javascript
// ✅ GOOD: MongoDB Memory Server
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

// ❌ BAD: Mocking database
jest.mock('../../models/user.schema.js');
```

### 2. Test Complete Request/Response Cycle

```javascript
// ✅ GOOD: Full integration
const response = await request(app)
  .post('/api/hotels')
  .set('Authorization', `Bearer ${token}`)
  .send(data)
  .expect(201);

// Verify in database
const hotel = await Hotel.findById(response.body.data._id);
expect(hotel).toBeTruthy();

// ❌ BAD: Only testing controller
await createHotel(req, res);
```

### 3. Clean Database Between Tests

```javascript
afterEach(async () => {
  await clearTestDB();
});
```

### 4. Use Realistic Test Data

```javascript
// ✅ GOOD
const hotelData = {
  name: 'Grand Plaza Hotel',
  address: '123 Main Street',
  city: 'New York',
  phoneNumber: '+12125551234',
  email: 'info@grandplaza.com'
};

// ❌ BAD
const hotelData = {
  name: 'test',
  city: 'test'
};
```

---

## 📌 Summary

Integration testing in StayHaven:
- **Tool**: Supertest for HTTP assertions
- **Database**: MongoDB Memory Server for isolation
- **Scope**: Complete request-response cycles
- **Coverage**: All API endpoints
- **Authentication**: Test with real JWT tokens

**Goal**: Ensure API endpoints work correctly with real database and middleware.