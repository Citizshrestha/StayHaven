# Test Coverage Report

> Guide to measuring, analyzing, and improving code coverage in StayHaven

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Coverage Metrics](#coverage-metrics)
3. [Generating Reports](#generating-reports)
4. [Coverage Goals](#coverage-goals)
5. [Improving Coverage](#improving-coverage)
6. [CI/CD Integration](#cicd-integration)

---

## 🎯 Overview

### What is Code Coverage?

Code coverage measures which parts of your code are executed during tests.

```
Coverage Types:
├── Statement Coverage: % of statements executed
├── Branch Coverage: % of if/else branches tested
├── Function Coverage: % of functions called
└── Line Coverage: % of lines executed
```

### Why Coverage Matters

```javascript
const BENEFITS = {
  confidence: 'Know which code is tested',
  quality: 'Find untested code paths',
  refactoring: 'Safe to change tested code',
  documentation: 'Shows what\'s important',
  trends: 'Track quality over time'
};
```

---

## 📊 Coverage Metrics

### Four Key Metrics

#### 1. Statement Coverage

```javascript
function divide(a, b) {
  if (b === 0) {          // Statement 1
    throw new Error();    // Statement 2
  }
  return a / b;           // Statement 3
}

// Test with b !== 0: 66% coverage (Statements 1, 3)
// Test with b === 0: 100% coverage (All statements)
```

#### 2. Branch Coverage

```javascript
function getUserType(user) {
  if (user.age >= 18) {   // Branch 1: true
    return 'adult';       
  } else {                 // Branch 2: false
    return 'minor';
  }
}

// Need tests for both branches
test('adult user', () => getUserType({ age: 25 }));  // Branch 1
test('minor user', () => getUserType({ age: 15 }));  // Branch 2
```

#### 3. Function Coverage

```javascript
class UserService {
  createUser() { ... }     // Function 1
  updateUser() { ... }     // Function 2
  deleteUser() { ... }     // Function 3
}

// If only createUser is tested: 33% function coverage
// If all three are tested: 100% function coverage
```

#### 4. Line Coverage

```javascript
function processOrder(order) {
  const total = order.items.reduce((sum, item) => sum + item.price, 0);  // Line 1
  const tax = total * 0.08;                                               // Line 2
  const finalTotal = total + tax;                                         // Line 3
  return finalTotal;                                                      // Line 4
}

// Testing this function executes all 4 lines: 100% line coverage
```

---

## 🛠️ Generating Reports

### Backend Coverage (Jest)

#### 1. Run with Coverage

```bash
# Generate coverage report
npm run test:coverage

# Generate coverage for specific files
npm test -- --coverage --collectCoverageFrom="controllers/**/*.js"
```

#### 2. Coverage Configuration

**File**: `package.json`

```json
{
  "jest": {
    "collectCoverageFrom": [
      "controllers/**/*.js",
      "models/**/*.js",
      "middleware/**/*.js",
      "utils/**/*.js",
      "!**/*.test.js",
      "!**/node_modules/**"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 75,
        "functions": 80,
        "lines": 80,
        "statements": 80
      },
      "./controllers/**/*.js": {
        "branches": 80,
        "functions": 90,
        "lines": 90,
        "statements": 90
      }
    },
    "coverageReporters": [
      "text",
      "text-summary",
      "html",
      "lcov",
      "json"
    ]
  }
}
```

#### 3. Coverage Output

```bash
---------------------------|---------|----------|---------|---------|-------------------|
File                       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s |
---------------------------|---------|----------|---------|---------|-------------------|
All files                  |   82.5  |   75.3   |   85.1  |   82.8  |                   |
 controllers/              |   85.0  |   78.0   |   88.0  |   85.5  |                   |
  authController.js        |   90.0  |   85.0   |   95.0  |   90.0  | 45-48,67          |
  hotelController.js       |   80.0  |   71.0   |   81.0  |   81.0  | 23,45,78-82       |
  userController.js        |   85.0  |   78.0   |   88.0  |   85.5  | 12,34             |
 models/                   |   88.0  |   80.0   |   90.0  |   88.0  |                   |
  user.schema.js           |   92.0  |   85.0   |   95.0  |   92.0  | 67                |
  hotel.schema.js          |   84.0  |   75.0   |   85.0  |   84.0  | 34,56-59          |
 middleware/               |   75.0  |   68.0   |   78.0  |   75.0  |                   |
  authMiddleware.js        |   80.0  |   70.0   |   85.0  |   80.0  | 23,45             |
  errorHandler.js          |   70.0  |   66.0   |   71.0  |   70.0  | 12,34,56          |
 utils/                    |   92.0  |   88.0   |   95.0  |   92.0  |                   |
  tokenUtils.js            |   95.0  |   90.0   |   100.0 |   95.0  | 23                |
  passwordValidation.js    |   89.0  |   86.0   |   90.0  |   89.0  | 45,67             |
---------------------------|---------|----------|---------|---------|-------------------|
```

---

### Frontend Coverage (Vitest)

#### 1. Configuration

**File**: `vite.config.js`

```javascript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}',
        'src/main.jsx'
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80
      }
    }
  }
});
```

#### 2. Run Coverage

```bash
npm run test:coverage
```

---

## 🎯 Coverage Goals

### Target Thresholds

```javascript
const COVERAGE_GOALS = {
  critical: {
    // Authentication, payment, security
    statements: 95,
    branches: 90,
    functions: 95,
    lines: 95
  },
  
  important: {
    // Controllers, business logic
    statements: 85,
    branches: 80,
    functions: 85,
    lines: 85
  },
  
  standard: {
    // Utilities, helpers
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80
  },
  
  acceptable: {
    // UI components, simple wrappers
    statements: 70,
    branches: 65,
    functions: 70,
    lines: 70
  }
};
```

### Per-Module Goals

| Module | Target Coverage | Rationale |
|--------|----------------|----------|
| Authentication | 95%+ | Critical security |
| Payment Processing | 95%+ | Financial accuracy |
| Controllers | 85%+ | Core business logic |
| Models/Schemas | 80%+ | Data integrity |
| Middleware | 80%+ | Request processing |
| Utilities | 85%+ | Reused everywhere |
| UI Components | 70%+ | Visual testing needed |

---

## 🔍 Improving Coverage

### 1. Identify Gaps

```bash
# Open HTML report
open coverage/index.html  # macOS
start coverage/index.html # Windows

# Find uncovered lines
grep "Uncovered Line" coverage/lcov-report/index.html
```

### 2. Add Missing Tests

**Example**: Uncovered error handling

```javascript
// Original function (lines 10-15 uncovered)
function processPayment(amount) {
  if (amount <= 0) {
    throw new Error('Invalid amount');  // Line 12 uncovered
  }
  return chargeCard(amount);
}

// Add test to cover error case
test('should reject invalid amount', () => {
  expect(() => processPayment(-10)).toThrow('Invalid amount');
  // Now line 12 is covered!
});
```

### 3. Test Edge Cases

```javascript
// Function with branches
function getDiscount(userType, purchaseAmount) {
  if (userType === 'premium') {           // Branch 1
    if (purchaseAmount > 100) {            // Branch 2
      return 0.20;                         // 20% discount
    }
    return 0.10;                           // 10% discount
  }
  return 0;                                // No discount
}

// Tests for all branches
test('premium user, high purchase', () => {
  expect(getDiscount('premium', 150)).toBe(0.20); // Branches 1, 2
});

test('premium user, low purchase', () => {
  expect(getDiscount('premium', 50)).toBe(0.10);  // Branch 1, not 2
});

test('regular user', () => {
  expect(getDiscount('regular', 150)).toBe(0);    // Neither branch
});
```

### 4. Remove Dead Code

```javascript
// ❌ BAD: Unreachable code
function processOrder(order) {
  if (order.status === 'pending') {
    return 'processing';
  }
  return 'completed';
  
  // This code is never reached (0% coverage)
  if (order.urgent) {
    notifyManager();
  }
}

// ✅ GOOD: Remove or fix
function processOrder(order) {
  // Check urgent BEFORE returning
  if (order.urgent) {
    notifyManager();
  }
  
  if (order.status === 'pending') {
    return 'processing';
  }
  return 'completed';
}
```

---

## 🚀 CI/CD Integration

### GitHub Actions

**File**: `.github/workflows/test-coverage.yml`

```yaml
name: Test Coverage

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  coverage:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests with coverage
        run: npm run test:coverage
      
      - name: Check coverage thresholds
        run: |
          if [ $(cat coverage/coverage-summary.json | jq '.total.statements.pct') -lt 80 ]; then
            echo "Coverage below 80%"
            exit 1
          fi
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: backend
          name: backend-coverage
      
      - name: Comment coverage on PR
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          lcov-file: ./coverage/lcov.info
```

### Codecov Integration

```yaml
# codecov.yml
coverage:
  status:
    project:
      default:
        target: 80%
        threshold: 2%
    patch:
      default:
        target: 85%

comment:
  layout: "header, diff, files"
  behavior: default
```

---

## 📊 Coverage Trends

### Track Over Time

```javascript
const COVERAGE_HISTORY = [
  { date: '2024-01-01', coverage: 65 },
  { date: '2024-02-01', coverage: 72 },
  { date: '2024-03-01', coverage: 78 },
  { date: '2024-04-01', coverage: 82 },
  // Goal: 85% by end of Q2
];
```

### Coverage Badge

```markdown
![Coverage](https://img.shields.io/codecov/c/github/username/stayhaven)
```

---

## ✅ Best Practices

1. **Don't Obsess Over 100%**: Focus on critical paths
2. **Meaningful Tests**: Coverage ≠ quality
3. **Test Behavior**: Not implementation details
4. **Review Reports**: Identify gaps regularly
5. **Improve Gradually**: Set incremental goals
6. **Automate Checks**: Fail CI if coverage drops
7. **Document Exceptions**: Some code can't be tested

---

## 📌 Summary

Test coverage in StayHaven:
- **Metrics**: Statements, branches, functions, lines
- **Tools**: Jest (backend), Vitest (frontend)
- **Goals**: 80%+ overall, 90%+ for critical code
- **Reports**: HTML, LCOV, JSON formats
- **CI/CD**: Automated coverage checks
- **Trends**: Track improvement over time

**Goal**: Measure and improve code quality continuously.