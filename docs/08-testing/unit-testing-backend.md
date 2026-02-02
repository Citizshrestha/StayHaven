# Unit Testing Backend

> Comprehensive guide to writing and maintaining unit tests for the StayHaven Node.js/Express backend

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Testing Setup](#testing-setup)
3. [Test Structure](#test-structure)
4. [Testing Controllers](#testing-controllers)
5. [Testing Models](#testing-models)
6. [Testing Middleware](#testing-middleware)
7. [Testing Utilities](#testing-utilities)
8. [Mocking Strategies](#mocking-strategies)
9. [Best Practices](#best-practices)

---

## 🎯 Overview

### What is Unit Testing?

Unit testing focuses on testing individual functions, methods, or classes in isolation from external dependencies.

```
Unit Test Characteristics:
┌──────────────────────────────────────────┐
│  ✅ Fast execution (< 100ms per test)   │
│  ✅ No external dependencies            │
│  ✅ Tests single functionality          │
│  ✅ Repeatable and deterministic        │
│  ✅ Easy to debug failures              │
│  ✅ Independent from other tests        │
└──────────────────────────────────────────┘
```

### Why Unit Tests Matter

```javascript
const BENEFITS = {
  earlyBugDetection: 'Catch issues before integration',
  documentation: 'Tests serve as usage examples',
  refactoringConfidence: 'Safe to change code',
  designImprovement: 'Forces modular design',
  regressionPrevention: 'Prevents old bugs from returning'
};
```

---

## 🛠️ Testing Setup

### 1. Install Dependencies

```bash
cd Backend
npm install --save-dev jest supertest mongodb-memory-server
```

### 2. Package.json Configuration

```json
{
  "scripts": {
    "test": "jest --verbose",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=tests/unit"
  },
  "jest": {
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": [
      "/node_modules/",
      "/tests/"
    ],
    "testMatch": [
      "**/tests/**/*.test.js",
      "**/__tests__/**/*.js"
    ],
    "collectCoverageFrom": [
      "controllers/**/*.js",
      "models/**/*.js",
      "middleware/**/*.js",
      "utils/**/*.js"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 75,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.4",
    "mongodb-memory-server": "^9.1.6"
  }
}
```

### 3. Test Directory Structure

```
Backend/
├── tests/
│   ├── unit/
│   │   ├── controllers/
│   │   │   ├── authController.test.js
│   │   │   ├── hotelController.test.js
│   │   │   └── userController.test.js
│   │   ├── models/
│   │   │   ├── user.test.js
│   │   │   └── hotel.test.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.test.js
│   │   │   └── errorHandler.test.js
│   │   └── utils/
│   │       ├── tokenUtils.test.js
│   │       └── passwordValidation.test.js
│   ├── integration/
│   ├── fixtures/
│   │   └── testData.js
│   └── helpers/
│       └── testHelpers.js
├── controllers/
├── models/
├── middleware/
└── utils/
```

---

## 📝 Test Structure

### AAA Pattern (Arrange, Act, Assert)

```javascript
describe('Feature/Component Description', () => {
  // Setup before each test
  beforeEach(() => {
    // Reset state, create mocks
  });
  
  // Cleanup after each test
  afterEach(() => {
    // Clear mocks, close connections
  });
  
  test('should [expected behavior] when [condition]', () => {
    // ARRANGE: Setup test data and mocks
    const input = { name: 'Test' };
    const expectedOutput = { id: 1, name: 'Test' };
    
    // ACT: Execute the function
    const result = functionToTest(input);
    
    // ASSERT: Verify the result
    expect(result).toEqual(expectedOutput);
  });
});
```

---

## 🎮 Testing Controllers

### Example: Auth Controller

**File**: `tests/unit/controllers/authController.test.js`

```javascript
import { jest } from '@jest/globals';
import { registerUser, loginUser } from '../../../controllers/authController.js';
import User from '../../../models/user.schema.js';
import bcrypt from 'bcryptjs';
import { generateTokens } from '../../../utils/tokenUtils.js';

// Mock dependencies
jest.mock('../../../models/user.schema.js');
jest.mock('bcryptjs');
jest.mock('../../../utils/tokenUtils.js');

describe('Auth Controller - registerUser', () => {
  let req, res;
  
  beforeEach(() => {
    // Setup mock request and response objects
    req = {
      body: {
        email: 'test@example.com',
        password: 'StrongPass123!',
        fullName: 'Test User'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis()
    };
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  test('should register user successfully with valid data', async () => {
    // ARRANGE
    const hashedPassword = 'hashed_password';
    const mockUser = {
      _id: 'user123',
      email: req.body.email,
      fullName: req.body.fullName,
      save: jest.fn().mockResolvedValue(true)
    };
    
    User.findOne.mockResolvedValue(null); // Email doesn't exist
    bcrypt.hash.mockResolvedValue(hashedPassword);
    User.mockImplementation(() => mockUser);
    generateTokens.mockReturnValue({
      accessToken: 'access_token',
      refreshToken: 'refresh_token'
    });
    
    // ACT
    await registerUser(req, res);
    
    // ASSERT
    expect(User.findOne).toHaveBeenCalledWith({ email: req.body.email });
    expect(bcrypt.hash).toHaveBeenCalledWith(req.body.password, 10);
    expect(mockUser.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.any(String)
      })
    );
  });
  
  test('should return 400 when email already exists', async () => {
    // ARRANGE
    User.findOne.mockResolvedValue({ email: req.body.email });
    
    // ACT
    await registerUser(req, res);
    
    // ASSERT
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('already exists')
      })
    );
  });
  
  test('should return 400 when required fields are missing', async () => {
    // ARRANGE
    req.body = { email: 'test@example.com' }; // Missing password
    
    // ACT
    await registerUser(req, res);
    
    // ASSERT
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('required')
      })
    );
  });
  
  test('should handle database errors gracefully', async () => {
    // ARRANGE
    User.findOne.mockRejectedValue(new Error('Database connection failed'));
    
    // ACT
    await registerUser(req, res);
    
    // ASSERT
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.any(String)
      })
    );
  });
});

describe('Auth Controller - loginUser', () => {
  let req, res;
  
  beforeEach(() => {
    req = {
      body: {
        email: 'test@example.com',
        password: 'StrongPass123!'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis()
    };
    
    jest.clearAllMocks();
  });
  
  test('should login user successfully with correct credentials', async () => {
    // ARRANGE
    const mockUser = {
      _id: 'user123',
      email: req.body.email,
      password: 'hashed_password',
      comparePassword: jest.fn().mockResolvedValue(true),
      toObject: jest.fn().mockReturnValue({
        _id: 'user123',
        email: req.body.email
      })
    };
    
    User.findOne.mockResolvedValue(mockUser);
    generateTokens.mockReturnValue({
      accessToken: 'access_token',
      refreshToken: 'refresh_token'
    });
    
    // ACT
    await loginUser(req, res);
    
    // ASSERT
    expect(User.findOne).toHaveBeenCalledWith({ email: req.body.email });
    expect(mockUser.comparePassword).toHaveBeenCalledWith(req.body.password);
    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.any(String),
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
  
  test('should return 401 when email does not exist', async () => {
    // ARRANGE
    User.findOne.mockResolvedValue(null);
    
    // ACT
    await loginUser(req, res);
    
    // ASSERT
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Invalid credentials')
      })
    );
  });
  
  test('should return 401 when password is incorrect', async () => {
    // ARRANGE
    const mockUser = {
      email: req.body.email,
      comparePassword: jest.fn().mockResolvedValue(false)
    };
    
    User.findOne.mockResolvedValue(mockUser);
    
    // ACT
    await loginUser(req, res);
    
    // ASSERT
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
```

---

## 🗄️ Testing Models

### Example: User Model

**File**: `tests/unit/models/user.test.js`

```javascript
import mongoose from 'mongoose';
import User from '../../../models/user.schema.js';
import bcrypt from 'bcryptjs';

describe('User Model', () => {
  beforeAll(async () => {
    // Connect to in-memory database
    await mongoose.connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  afterEach(async () => {
    // Clear all collections
    await User.deleteMany({});
  });
  
  describe('Schema Validation', () => {
    test('should create user with valid data', async () => {
      // ARRANGE
      const validUser = {
        email: 'test@example.com',
        password: 'StrongPass123!',
        fullName: 'Test User'
      };
      
      // ACT
      const user = new User(validUser);
      const savedUser = await user.save();
      
      // ASSERT
      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(validUser.email);
      expect(savedUser.fullName).toBe(validUser.fullName);
      expect(savedUser.password).not.toBe(validUser.password); // Should be hashed
    });
    
    test('should fail when email is missing', async () => {
      // ARRANGE
      const invalidUser = new User({
        password: 'StrongPass123!',
        fullName: 'Test User'
      });
      
      // ACT & ASSERT
      await expect(invalidUser.save()).rejects.toThrow();
    });
    
    test('should fail when email format is invalid', async () => {
      // ARRANGE
      const invalidUser = new User({
        email: 'invalid-email',
        password: 'StrongPass123!',
        fullName: 'Test User'
      });
      
      // ACT & ASSERT
      await expect(invalidUser.save()).rejects.toThrow();
    });
    
    test('should enforce unique email constraint', async () => {
      // ARRANGE
      const userData = {
        email: 'test@example.com',
        password: 'StrongPass123!',
        fullName: 'Test User'
      };
      
      await User.create(userData);
      
      // ACT & ASSERT
      await expect(User.create(userData)).rejects.toThrow(/duplicate key/);
    });
  });
  
  describe('Pre-save Hook - Password Hashing', () => {
    test('should hash password before saving', async () => {
      // ARRANGE
      const plainPassword = 'StrongPass123!';
      const user = new User({
        email: 'test@example.com',
        password: plainPassword,
        fullName: 'Test User'
      });
      
      // ACT
      await user.save();
      
      // ASSERT
      expect(user.password).not.toBe(plainPassword);
      expect(user.password.length).toBeGreaterThan(plainPassword.length);
    });
    
    test('should not rehash password if not modified', async () => {
      // ARRANGE
      const user = await User.create({
        email: 'test@example.com',
        password: 'StrongPass123!',
        fullName: 'Test User'
      });
      
      const originalHash = user.password;
      
      // ACT
      user.fullName = 'Updated Name';
      await user.save();
      
      // ASSERT
      expect(user.password).toBe(originalHash);
    });
  });
  
  describe('Instance Methods', () => {
    test('comparePassword should return true for correct password', async () => {
      // ARRANGE
      const plainPassword = 'StrongPass123!';
      const user = await User.create({
        email: 'test@example.com',
        password: plainPassword,
        fullName: 'Test User'
      });
      
      // ACT
      const isMatch = await user.comparePassword(plainPassword);
      
      // ASSERT
      expect(isMatch).toBe(true);
    });
    
    test('comparePassword should return false for incorrect password', async () => {
      // ARRANGE
      const user = await User.create({
        email: 'test@example.com',
        password: 'StrongPass123!',
        fullName: 'Test User'
      });
      
      // ACT
      const isMatch = await user.comparePassword('WrongPassword');
      
      // ASSERT
      expect(isMatch).toBe(false);
    });
  });
  
  describe('Virtual Properties', () => {
    test('should exclude password in JSON output', async () => {
      // ARRANGE
      const user = await User.create({
        email: 'test@example.com',
        password: 'StrongPass123!',
        fullName: 'Test User'
      });
      
      // ACT
      const userJSON = user.toJSON();
      
      // ASSERT
      expect(userJSON.password).toBeUndefined();
      expect(userJSON.email).toBe('test@example.com');
    });
  });
});
```

---

## 🛡️ Testing Middleware

### Example: Auth Middleware

**File**: `tests/unit/middleware/authMiddleware.test.js`

```javascript
import { jest } from '@jest/globals';
import { protect, authorize } from '../../../middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';
import User from '../../../models/user.schema.js';

jest.mock('jsonwebtoken');
jest.mock('../../../models/user.schema.js');

describe('Auth Middleware - protect', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = {
      headers: {},
      cookies: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();
    
    jest.clearAllMocks();
  });
  
  test('should attach user to request when token is valid', async () => {
    // ARRANGE
    const mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      role: { name: 'guest' }
    };
    
    req.headers.authorization = 'Bearer valid_token';
    jwt.verify.mockReturnValue({ id: 'user123' });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser)
    });
    
    // ACT
    await protect(req, res, next);
    
    // ASSERT
    expect(jwt.verify).toHaveBeenCalledWith(
      'valid_token',
      process.env.JWT_ACCESS_SECRET
    );
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });
  
  test('should return 401 when no token provided', async () => {
    // ACT
    await protect(req, res, next);
    
    // ASSERT
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Not authorized')
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
  
  test('should return 401 when token is invalid', async () => {
    // ARRANGE
    req.headers.authorization = 'Bearer invalid_token';
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });
    
    // ACT
    await protect(req, res, next);
    
    // ASSERT
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
  
  test('should return 401 when user not found', async () => {
    // ARRANGE
    req.headers.authorization = 'Bearer valid_token';
    jwt.verify.mockReturnValue({ id: 'user123' });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null)
    });
    
    // ACT
    await protect(req, res, next);
    
    // ASSERT
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('Auth Middleware - authorize', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = {
      user: {
        role: { name: 'guest' }
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();
    
    jest.clearAllMocks();
  });
  
  test('should call next when user has required role', () => {
    // ARRANGE
    const middleware = authorize('guest', 'owner');
    
    // ACT
    middleware(req, res, next);
    
    // ASSERT
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
  
  test('should return 403 when user lacks required role', () => {
    // ARRANGE
    const middleware = authorize('admin', 'owner');
    
    // ACT
    middleware(req, res, next);
    
    // ASSERT
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Not authorized')
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
```

---

## 🔧 Testing Utilities

### Example: Password Validation

**File**: `tests/unit/utils/passwordValidation.test.js`

```javascript
import { validatePassword } from '../../../utils/passwordValidation.js';

describe('Password Validation Utility', () => {
  describe('Valid Passwords', () => {
    test('should accept password with all required characters', () => {
      expect(validatePassword('StrongPass123!')).toBe(true);
    });
    
    test('should accept password with minimum 8 characters', () => {
      expect(validatePassword('Pass123!')).toBe(true);
    });
    
    test('should accept password with multiple special characters', () => {
      expect(validatePassword('P@ssw0rd!#$')).toBe(true);
    });
  });
  
  describe('Invalid Passwords', () => {
    test('should reject password shorter than 8 characters', () => {
      expect(validatePassword('Pass1!')).toBe(false);
    });
    
    test('should reject password without uppercase letter', () => {
      expect(validatePassword('password123!')).toBe(false);
    });
    
    test('should reject password without lowercase letter', () => {
      expect(validatePassword('PASSWORD123!')).toBe(false);
    });
    
    test('should reject password without number', () => {
      expect(validatePassword('Password!')).toBe(false);
    });
    
    test('should reject password without special character', () => {
      expect(validatePassword('Password123')).toBe(false);
    });
    
    test('should reject empty password', () => {
      expect(validatePassword('')).toBe(false);
    });
    
    test('should reject null password', () => {
      expect(validatePassword(null)).toBe(false);
    });
    
    test('should reject undefined password', () => {
      expect(validatePassword(undefined)).toBe(false);
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle password with only spaces', () => {
      expect(validatePassword('        ')).toBe(false);
    });
    
    test('should handle very long passwords', () => {
      const longPassword = 'A1!' + 'a'.repeat(100);
      expect(validatePassword(longPassword)).toBe(true);
    });
  });
});
```

### Example: Token Utils

**File**: `tests/unit/utils/tokenUtils.test.js`

```javascript
import jwt from 'jsonwebtoken';
import {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken
} from '../../../utils/tokenUtils.js';

describe('Token Utilities', () => {
  const userId = 'user123';
  
  describe('generateTokens', () => {
    test('should generate both access and refresh tokens', () => {
      // ACT
      const { accessToken, refreshToken } = generateTokens(userId);
      
      // ASSERT
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(typeof accessToken).toBe('string');
      expect(typeof refreshToken).toBe('string');
    });
    
    test('access token should contain user ID', () => {
      // ACT
      const { accessToken } = generateTokens(userId);
      const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
      
      // ASSERT
      expect(decoded.id).toBe(userId);
    });
    
    test('refresh token should contain user ID', () => {
      // ACT
      const { refreshToken } = generateTokens(userId);
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      // ASSERT
      expect(decoded.id).toBe(userId);
    });
  });
  
  describe('verifyAccessToken', () => {
    test('should verify valid access token', () => {
      // ARRANGE
      const { accessToken } = generateTokens(userId);
      
      // ACT
      const decoded = verifyAccessToken(accessToken);
      
      // ASSERT
      expect(decoded.id).toBe(userId);
    });
    
    test('should throw error for invalid token', () => {
      // ACT & ASSERT
      expect(() => verifyAccessToken('invalid_token')).toThrow();
    });
    
    test('should throw error for expired token', () => {
      // ARRANGE
      const expiredToken = jwt.sign(
        { id: userId },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '0s' }
      );
      
      // ACT & ASSERT
      expect(() => verifyAccessToken(expiredToken)).toThrow();
    });
  });
});
```

---

## 🎭 Mocking Strategies

### 1. Mocking External Dependencies

```javascript
// Mock entire module
jest.mock('../../../models/user.schema.js');

// Mock specific functions
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
  })
}));
```

### 2. Mocking Database Operations

```javascript
// Mock Mongoose methods
User.findOne = jest.fn();
User.findById = jest.fn();
User.create = jest.fn();
User.findByIdAndUpdate = jest.fn();
```

### 3. Mocking Express Objects

```javascript
const mockRequest = (body = {}, params = {}, query = {}) => ({
  body,
  params,
  query,
  headers: {},
  cookies: {},
  user: null
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();
```

### 4. Mocking Cloudinary

```javascript
jest.mock('cloudinary', () => ({
  v2: {
    uploader: {
      upload: jest.fn().mockResolvedValue({
        secure_url: 'https://cloudinary.com/test-image.jpg',
        public_id: 'test-public-id'
      })
    }
  }
}));
```

---

## ✅ Best Practices

### 1. Test Isolation

```javascript
// ✅ GOOD: Each test is independent
describe('User Service', () => {
  beforeEach(() => {
    // Fresh setup for each test
    jest.clearAllMocks();
  });
  
  test('test 1', () => {});
  test('test 2', () => {});
});

// ❌ BAD: Tests share state
let sharedUser;
test('test 1', () => {
  sharedUser = { name: 'Test' };
});
test('test 2', () => {
  // Depends on test 1
  expect(sharedUser.name).toBe('Test');
});
```

### 2. Descriptive Test Names

```javascript
// ✅ GOOD
test('should return 404 when hotel ID does not exist', () => {});

// ❌ BAD
test('hotel test', () => {});
```

### 3. One Assertion Per Concept

```javascript
// ✅ GOOD
test('should create user with hashed password', () => {
  expect(user.password).not.toBe(plainPassword);
  expect(user.password.length).toBeGreaterThan(20);
});

// ❌ BAD (testing too many things)
test('user creation', () => {
  expect(user).toBeDefined();
  expect(user.email).toBe('test@example.com');
  expect(user.role).toBe('guest');
  expect(user.createdAt).toBeDefined();
  // ... 10 more assertions
});
```

### 4. Test Edge Cases

```javascript
describe('Division Utility', () => {
  test('should divide positive numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });
  
  test('should handle division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Cannot divide by zero');
  });
  
  test('should handle negative numbers', () => {
    expect(divide(-10, 2)).toBe(-5);
  });
  
  test('should handle decimal results', () => {
    expect(divide(10, 3)).toBeCloseTo(3.33, 2);
  });
});
```

### 5. Use Test Factories

```javascript
// testHelpers.js
export const createMockUser = (overrides = {}) => ({
  _id: 'user123',
  email: 'test@example.com',
  fullName: 'Test User',
  role: { name: 'guest' },
  ...overrides
});

export const createMockHotel = (overrides = {}) => ({
  _id: 'hotel123',
  name: 'Test Hotel',
  owner: 'owner123',
  status: 'approved',
  ...overrides
});

// Usage in tests
test('should update user profile', () => {
  const user = createMockUser({ fullName: 'Custom Name' });
  // Test with custom user
});
```

---

## 📊 Running Tests

### Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- authController.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should register"
```

### Coverage Report

```bash
npm run test:coverage

# Output:
---------------------------|---------|----------|---------|---------|
File                       | % Stmts | % Branch | % Funcs | % Lines |
---------------------------|---------|----------|---------|---------|
All files                  |   82.5  |   75.3   |   85.1  |   82.8  |
 controllers/              |   85.0  |   78.0   |   88.0  |   85.5  |
  authController.js        |   90.0  |   85.0   |   95.0  |   90.0  |
  hotelController.js       |   80.0  |   71.0   |   81.0  |   81.0  |
 models/                   |   88.0  |   80.0   |   90.0  |   88.0  |
 middleware/               |   75.0  |   68.0   |   78.0  |   75.0  |
 utils/                    |   92.0  |   88.0   |   95.0  |   92.0  |
---------------------------|---------|----------|---------|---------|
```

---

## 🔗 Related Documentation

- [Testing Strategy](./testing-strategy.md)
- [Integration Testing APIs](./integration-testing-apis.md)
- [Test Data Management](./test-data-management.md)
- [Test Coverage Report](./test-coverage-report.md)

---

## 📌 Summary

Unit testing in StayHaven backend:
- **Framework**: Jest for test runner and assertions
- **Coverage Target**: 80%+ for critical paths
- **Structure**: AAA pattern (Arrange, Act, Assert)
- **Mocking**: External dependencies isolated
- **Best Practices**: Fast, isolated, descriptive tests

**Goal**: Ensure individual components work correctly in isolation.