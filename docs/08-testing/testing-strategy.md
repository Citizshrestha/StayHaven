# Testing Strategy

> Comprehensive testing approach for ensuring quality, reliability, and performance in StayHaven

---

## 📋 Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Pyramid](#testing-pyramid)
3. [Testing Types](#testing-types)
4. [Testing Scope](#testing-scope)
5. [Testing Tools](#testing-tools)
6. [Testing Workflow](#testing-workflow)
7. [Quality Gates](#quality-gates)
8. [Test Environment](#test-environment)

---

## 🎯 Testing Philosophy

### Core Principles

```
1. TEST EARLY, TEST OFTEN
   - Write tests alongside features
   - Catch bugs before production
   - Reduce debugging time

2. COMPREHENSIVE COVERAGE
   - Unit tests for business logic
   - Integration tests for APIs
   - E2E tests for critical flows
   - Manual testing for UX

3. AUTOMATION FIRST
   - Automate repetitive tests
   - CI/CD integration
   - Regression prevention

4. QUALITY OVER QUANTITY
   - Meaningful test cases
   - Focus on critical paths
   - Avoid test redundancy

5. CONTINUOUS IMPROVEMENT
   - Learn from production bugs
   - Update test suites regularly
   - Monitor test effectiveness
```

### Testing Goals

```javascript
const TESTING_GOALS = {
  reliability: 'Ensure system works as expected under all conditions',
  security: 'Validate authentication, authorization, and data protection',
  performance: 'Meet response time and throughput requirements',
  usability: 'Provide smooth user experience across devices',
  maintainability: 'Easy to update and extend test suites',
  confidence: 'Deploy to production without fear'
};
```

---

## 🏗️ Testing Pyramid

### StayHaven Testing Structure

```
                    ┌───────────────┐
                    │   E2E Tests   │ ← 10% (Critical User Flows)
                    │  (Slow, High  │
                    │   Confidence) │
                    └───────┬───────┘
                            │
             ┌──────────────┴──────────────┐
             │   Integration Tests         │ ← 30% (API & Component)
             │  (Medium Speed & Confidence)│
             └──────────────┬──────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │         Unit Tests                    │ ← 60% (Business Logic)
        │    (Fast, Focused, Isolated)          │
        └───────────────────────────────────────┘
```

### Test Distribution

| Test Type | Percentage | Count (Target) | Execution Time |
|-----------|------------|----------------|----------------|
| Unit Tests | 60% | ~300 | < 5 seconds |
| Integration Tests | 30% | ~150 | < 30 seconds |
| E2E Tests | 10% | ~50 | < 5 minutes |
| **Total** | **100%** | **~500** | **< 6 minutes** |

---

## 🧪 Testing Types

### 1. Unit Testing

**Purpose**: Test individual functions/methods in isolation

**Scope**:
- Controllers business logic
- Utility functions
- Schema validations
- Helper methods
- Middleware functions

**Example**:
```javascript
// Testing password validation utility
describe('Password Validation', () => {
  test('should reject passwords shorter than 8 characters', () => {
    expect(validatePassword('Short1!')).toBe(false);
  });

  test('should accept strong passwords', () => {
    expect(validatePassword('StrongPass123!')).toBe(true);
  });

  test('should reject passwords without special characters', () => {
    expect(validatePassword('Password123')).toBe(false);
  });
});
```

**Tools**: Jest, Mocha, Chai

---

### 2. Integration Testing

**Purpose**: Test API endpoints and database interactions

**Scope**:
- API endpoint responses
- Database CRUD operations
- Authentication middleware
- File upload functionality
- Third-party integrations

**Example**:
```javascript
// Testing hotel creation API
describe('POST /api/hotels', () => {
  test('should create hotel with valid data', async () => {
    const response = await request(app)
      .post('/api/hotels')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Test Hotel',
        address: '123 Main St',
        city: 'New York'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Test Hotel');
  });

  test('should reject unauthorized users', async () => {
    const response = await request(app)
      .post('/api/hotels')
      .send({ name: 'Test Hotel' });
    
    expect(response.status).toBe(401);
  });
});
```

**Tools**: Supertest, Jest, MongoDB Memory Server

---

### 3. End-to-End (E2E) Testing

**Purpose**: Test complete user workflows

**Scope**:
- User registration and login
- Hotel search and booking
- Order placement and tracking
- Staff management workflows
- Payment processing

**Example**:
```javascript
// Testing complete booking flow
describe('Guest Booking Flow', () => {
  test('guest can search, select, and book a hotel', async () => {
    // 1. Search hotels
    await page.goto('http://localhost:3000/hotels');
    await page.type('#search-input', 'New York');
    await page.click('#search-button');
    
    // 2. Select hotel
    await page.waitForSelector('.hotel-card');
    await page.click('.hotel-card:first-child');
    
    // 3. Select room
    await page.click('.room-select-button');
    
    // 4. Fill booking form
    await page.type('#check-in', '2024-12-01');
    await page.type('#check-out', '2024-12-05');
    await page.type('#guests', '2');
    
    // 5. Submit booking
    await page.click('#confirm-booking');
    
    // 6. Verify confirmation
    await page.waitForSelector('.booking-success');
    expect(await page.$eval('.booking-success', el => el.textContent))
      .toContain('Booking Confirmed');
  });
});
```

**Tools**: Cypress, Playwright, Puppeteer

---

### 4. Socket Event Testing

**Purpose**: Test real-time functionality

**Scope**:
- Order status updates
- Waiter call notifications
- Live booking updates
- Real-time chat (if implemented)

**Example**:
```javascript
// Testing order status update via Socket.IO
describe('Socket Events - Order Updates', () => {
  test('should emit order status change to kitchen', (done) => {
    const clientSocket = io('http://localhost:5000');
    
    clientSocket.on('connect', () => {
      clientSocket.emit('order:create', {
        orderId: '12345',
        items: [{ itemId: 'item1', quantity: 2 }]
      });
    });
    
    clientSocket.on('order:statusUpdated', (data) => {
      expect(data.orderId).toBe('12345');
      expect(data.status).toBe('pending');
      clientSocket.close();
      done();
    });
  });
});
```

**Tools**: Socket.IO Client, Jest

---

### 5. Performance Testing

**Purpose**: Validate system performance under load

**Scope**:
- API response times (< 500ms)
- Concurrent user handling
- Database query performance
- Memory and CPU usage

**Example**:
```bash
# Load testing with Artillery
artillery quick --count 100 --num 10 http://localhost:5000/api/hotels

# Expected Results:
# - Response time p95: < 500ms
# - Error rate: < 1%
# - Throughput: > 100 req/sec
```

**Tools**: Artillery, JMeter, k6

---

### 6. Security Testing

**Purpose**: Identify vulnerabilities and security flaws

**Scope**:
- SQL injection prevention
- XSS protection
- CSRF protection
- Authentication bypass attempts
- Authorization checks

**Example**:
```javascript
// Testing authorization
describe('Security - Authorization', () => {
  test('guest cannot access admin routes', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${guestToken}`);
    
    expect(response.status).toBe(403);
  });

  test('owner cannot access other hotel data', async () => {
    const response = await request(app)
      .get('/api/hotels/other-hotel-id/analytics')
      .set('Authorization', `Bearer ${ownerToken}`);
    
    expect(response.status).toBe(403);
  });
});
```

**Tools**: OWASP ZAP, Burp Suite, npm audit

---

## 🎯 Testing Scope

### Backend Testing (Node.js/Express)

#### Controllers
✅ Request validation  
✅ Business logic execution  
✅ Error handling  
✅ Response formatting  

#### Models/Schemas
✅ Schema validation  
✅ Pre/post hooks  
✅ Instance methods  
✅ Static methods  

#### Middleware
✅ Authentication checks  
✅ Authorization logic  
✅ Error handling  
✅ Request preprocessing  

#### Utilities
✅ Password validation  
✅ Token generation/verification  
✅ Email sending  
✅ File upload handling  

---

### Frontend Testing (React)

#### Components
✅ Rendering with props  
✅ User interactions  
✅ State management  
✅ Conditional rendering  

#### Hooks
✅ Custom hook logic  
✅ Side effects  
✅ State updates  

#### Integration
✅ API calls  
✅ Form submissions  
✅ Navigation flows  
✅ Error boundaries  

---

### Database Testing

✅ CRUD operations  
✅ Query performance  
✅ Index effectiveness  
✅ Transaction handling  
✅ Data integrity  
✅ Relationship validation  

---

## 🛠️ Testing Tools

### Backend Testing Stack

```javascript
{
  "devDependencies": {
    "jest": "^29.7.0",                    // Test runner
    "supertest": "^6.3.4",                // HTTP assertion
    "mongodb-memory-server": "^9.1.6",    // In-memory DB
    "@types/jest": "^29.5.11",            // Type definitions
    "nodemon": "^3.0.2"                   // Auto-restart
  }
}
```

#### Tool Purposes

| Tool | Purpose | Usage |
|------|---------|-------|
| **Jest** | Test runner and assertion library | Unit & integration tests |
| **Supertest** | HTTP endpoint testing | API integration tests |
| **MongoDB Memory Server** | Isolated test database | Database testing |
| **Sinon** | Mocking and stubbing | External service mocks |
| **Nock** | HTTP request mocking | API mocking |

---

### Frontend Testing Stack

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "vitest": "^1.1.0",
    "jsdom": "^23.0.1",
    "cypress": "^13.6.2"
  }
}
```

#### Tool Purposes

| Tool | Purpose | Usage |
|------|---------|-------|
| **Vitest** | Fast unit test runner | Component tests |
| **React Testing Library** | Component testing utilities | User interaction tests |
| **Cypress** | E2E testing framework | Full workflow tests |
| **MSW** | API mocking | Frontend API tests |

---

### E2E Testing Stack

```json
{
  "devDependencies": {
    "cypress": "^13.6.2",
    "playwright": "^1.40.1",
    "@playwright/test": "^1.40.1"
  }
}
```

---

### Performance Testing Tools

- **Artillery**: Load and performance testing
- **k6**: Modern load testing tool
- **Lighthouse**: Frontend performance metrics

---

### Security Testing Tools

- **npm audit**: Dependency vulnerability scanning
- **OWASP ZAP**: Security testing
- **Snyk**: Vulnerability detection

---

## 🔄 Testing Workflow

### Development Phase

```
1. Developer writes feature code
           ↓
2. Developer writes unit tests
           ↓
3. Run tests locally: npm test
           ↓
4. Fix failing tests
           ↓
5. Commit code (pre-commit hooks run tests)
           ↓
6. Push to repository
```

### CI/CD Phase

```
1. Code pushed to GitHub
           ↓
2. CI pipeline triggered
           ↓
3. Install dependencies
           ↓
4. Run linter (ESLint)
           ↓
5. Run unit tests
           ↓
6. Run integration tests
           ↓
7. Generate coverage report
           ↓
8. Run E2E tests (optional)
           ↓
9. Build application
           ↓
10. Deploy to staging (if tests pass)
```

### Pre-Commit Hooks (Husky)

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm test",
      "pre-push": "npm run test:coverage"
    }
  }
}
```

---

## ✅ Quality Gates

### Minimum Requirements for Merge

```javascript
const QUALITY_GATES = {
  testCoverage: {
    statements: '>=80%',
    branches: '>=75%',
    functions: '>=80%',
    lines: '>=80%'
  },
  
  linting: {
    eslintErrors: 0,
    eslintWarnings: '<=5'
  },
  
  testExecution: {
    unitTests: 'All passing',
    integrationTests: 'All passing',
    e2eTests: 'Critical paths passing'
  },
  
  performance: {
    apiResponseTime: '<500ms (p95)',
    buildTime: '<5 minutes',
    bundleSize: '<500KB (gzip)'
  },
  
  security: {
    vulnerabilities: {
      critical: 0,
      high: 0,
      medium: '<=2'
    }
  }
};
```

### Coverage Thresholds

```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 75,
        "functions": 80,
        "lines": 80,
        "statements": 80
      },
      "./src/controllers/**/*.js": {
        "branches": 80,
        "functions": 90,
        "lines": 90,
        "statements": 90
      }
    }
  }
}
```

---

## 🌍 Test Environment

### Environment Configurations

#### Local Development
```javascript
{
  DATABASE_URL: 'mongodb://localhost:27017/stayhaven_test',
  PORT: 5001,
  NODE_ENV: 'test',
  JWT_SECRET: 'test_secret_key'
}
```

#### CI/CD Environment
```javascript
{
  DATABASE_URL: 'mongodb-memory-server',
  PORT: 5001,
  NODE_ENV: 'test',
  JWT_SECRET: process.env.CI_JWT_SECRET
}
```

#### Staging Environment
```javascript
{
  DATABASE_URL: process.env.STAGING_DB_URL,
  PORT: 5000,
  NODE_ENV: 'staging',
  JWT_SECRET: process.env.STAGING_JWT_SECRET
}
```

---

## 📊 Testing Metrics

### Key Performance Indicators (KPIs)

```javascript
const TESTING_KPIS = {
  coverage: {
    target: '>=80%',
    current: '75%',
    trend: '↑'
  },
  
  testExecutionTime: {
    target: '<5 minutes',
    current: '3.5 minutes',
    trend: '→'
  },
  
  testStability: {
    target: '>=95% (non-flaky)',
    current: '92%',
    trend: '↑'
  },
  
  bugEscapeRate: {
    target: '<5% (to production)',
    current: '3%',
    trend: '↓'
  },
  
  automationRate: {
    target: '>=90%',
    current: '85%',
    trend: '↑'
  }
};
```

---

## 🚀 Testing Best Practices

### DO's ✅

1. **Write tests first** (TDD approach when possible)
2. **Keep tests isolated** (no dependencies between tests)
3. **Use descriptive test names** (what is being tested)
4. **Mock external dependencies** (APIs, databases in unit tests)
5. **Test edge cases** (null, undefined, empty arrays)
6. **Clean up after tests** (database, file system)
7. **Use factories for test data** (consistent data creation)
8. **Run tests before committing** (local validation)

### DON'Ts ❌

1. **Don't test implementation details** (test behavior)
2. **Don't share state between tests** (use beforeEach)
3. **Don't skip tests** (fix or remove them)
4. **Don't test third-party code** (trust the library)
5. **Don't over-mock** (balance isolation and realism)
6. **Don't ignore flaky tests** (fix root cause)
7. **Don't hardcode values** (use constants or factories)
8. **Don't commit commented tests** (remove or fix)

---

## 📝 Test Naming Conventions

### Format

```javascript
describe('[Component/Feature] - [Scenario]', () => {
  test('should [expected behavior] when [condition]', () => {
    // Arrange: Setup
    // Act: Execute
    // Assert: Verify
  });
});
```

### Examples

```javascript
// Good ✅
describe('User Authentication', () => {
  test('should return 401 when token is invalid', () => {});
  test('should return user data when token is valid', () => {});
});

// Bad ❌
describe('Auth', () => {
  test('test1', () => {});
  test('works', () => {});
});
```

---

## 🎯 Testing Roadmap

### Phase 1: Foundation (Current)
- [x] Unit tests for utilities
- [x] Basic API integration tests
- [ ] 60% code coverage

### Phase 2: Expansion (Q1 2024)
- [ ] E2E tests for critical flows
- [ ] Socket.IO event testing
- [ ] 75% code coverage

### Phase 3: Advanced (Q2 2024)
- [ ] Performance testing automation
- [ ] Visual regression testing
- [ ] 85% code coverage

### Phase 4: Excellence (Q3 2024)
- [ ] Mutation testing
- [ ] Contract testing (API contracts)
- [ ] 90% code coverage

---

## 🔗 Related Documentation

- [Unit Testing Backend](./unit-testing-backend.md)
- [Integration Testing APIs](./integration-testing-apis.md)
- [Frontend Testing Strategy](./frontend-testing-strategy.md)
- [API Testing with Postman](./api-testing-postman.md)
- [Socket Event Testing](./socket-event-testing.md)
- [Test Data Management](./test-data-management.md)
- [Test Coverage Report](./test-coverage-report.md)

---

## 📌 Summary

StayHaven follows a comprehensive testing strategy with:
- **60% unit tests** for business logic
- **30% integration tests** for APIs
- **10% E2E tests** for critical flows
- **80%+ code coverage** target
- **Automated CI/CD** testing
- **Multiple test types** (unit, integration, E2E, performance, security)

**Goal**: Ship with confidence, catch bugs early, maintain code quality.