# API Testing with Postman

> Complete guide to testing StayHaven APIs using Postman collections and automated testing

---

## 📋 Table of Contents

1. [Postman Setup](#postman-setup)
2. [Collection Structure](#collection-structure)
3. [Environment Variables](#environment-variables)
4. [Authentication Flow](#authentication-flow)
5. [Test Scripts](#test-scripts)
6. [Automated Testing](#automated-testing)

---

## 🛠️ Postman Setup

### Install Postman

```bash
# Download from official website
https://www.postman.com/downloads/

# Or install via CLI
winget install Postman.Postman
```

### Import StayHaven Collection

1. Open Postman
2. Click **Import** button
3. Select `StayHaven-API.postman_collection.json`
4. Import `StayHaven-Environments.postman_environment.json`

---

## 📁 Collection Structure

```
StayHaven API Collection
├── 🔐 Authentication
│   ├── Register User
│   ├── Login
│   ├── Refresh Token
│   ├── Logout
│   └── Reset Password
├── 👤 User Management
│   ├── Get Profile
│   ├── Update Profile
│   └── Change Password
├── 🏨 Hotel Management
│   ├── Get All Hotels
│   ├── Get Hotel Details
│   ├── Create Hotel (Owner)
│   ├── Update Hotel
│   └── Approve Hotel (Admin)
├── 🛏️ Room Management
│   ├── Get Rooms
│   ├── Create Room
│   └── Update Room
├── 📅 Bookings
│   ├── Create Booking
│   ├── Get My Bookings
│   └── Cancel Booking
├── 🍽️ Orders
│   ├── Create Order
│   ├── Get Orders
│   └── Update Order Status
└── 👥 Staff Management
    ├── Invite Staff
    ├── Get Staff List
    └── Remove Staff
```

---

## 🌍 Environment Variables

### Development Environment

```json
{
  "environment": "Development",
  "variables": [
    {
      "key": "base_url",
      "value": "http://localhost:5000/api",
      "enabled": true
    },
    {
      "key": "access_token",
      "value": "",
      "enabled": true
    },
    {
      "key": "refresh_token",
      "value": "",
      "enabled": true
    },
    {
      "key": "user_id",
      "value": "",
      "enabled": true
    },
    {
      "key": "hotel_id",
      "value": "",
      "enabled": true
    }
  ]
}
```

### Production Environment

```json
{
  "environment": "Production",
  "variables": [
    {
      "key": "base_url",
      "value": "https://api.stayhaven.com/api",
      "enabled": true
    }
  ]
}
```

---

## 🔐 Authentication Flow

### 1. Register User Request

**POST** `{{base_url}}/auth/register`

```json
{
  "email": "test@example.com",
  "password": "StrongPass123!",
  "fullName": "Test User",
  "phoneNumber": "+1234567890"
}
```

**Tests**:

```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response contains user data", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.data).to.have.property('email');
    pm.expect(jsonData.data).to.not.have.property('password');
});
```

### 2. Login Request

**POST** `{{base_url}}/auth/login`

```json
{
  "email": "test@example.com",
  "password": "StrongPass123!"
}
```

**Tests**:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response contains access token", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property('accessToken');
    
    // Save token for subsequent requests
    pm.environment.set("access_token", jsonData.data.accessToken);
    pm.environment.set("user_id", jsonData.data.user._id);
});

pm.test("Refresh token set in cookie", function () {
    pm.expect(pm.cookies.has('refreshToken')).to.be.true;
});
```

### 3. Authenticated Request Example

**GET** `{{base_url}}/users/profile`

**Headers**:
```
Authorization: Bearer {{access_token}}
```

**Pre-request Script**:

```javascript
// Check if token exists
if (!pm.environment.get("access_token")) {
    console.error("No access token found. Please login first.");
}
```

**Tests**:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Profile data returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property('email');
    pm.expect(jsonData.data).to.have.property('fullName');
});
```

---

## 📝 Test Scripts

### Common Test Scripts

#### Response Time Test

```javascript
pm.test("Response time is less than 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
```

#### Status Code Tests

```javascript
pm.test("Successful POST request", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 202]);
});
```

#### JSON Schema Validation

```javascript
const schema = {
    type: "object",
    required: ["success", "data"],
    properties: {
        success: { type: "boolean" },
        data: { type: "object" }
    }
};

pm.test("Schema is valid", function () {
    pm.response.to.have.jsonSchema(schema);
});
```

#### Save Response Data

```javascript
pm.test("Save hotel ID", function () {
    var jsonData = pm.response.json();
    pm.environment.set("hotel_id", jsonData.data._id);
});
```

### Hotel Creation Test

**POST** `{{base_url}}/hotels`

**Headers**:
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Body**:
```json
{
  "name": "Test Hotel {{$randomInt}}",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "zipCode": "10001",
  "phoneNumber": "+1234567890",
  "email": "info@testhotel.com"
}
```

**Tests**:

```javascript
pm.test("Hotel created successfully", function () {
    pm.response.to.have.status(201);
    var jsonData = pm.response.json();
    
    // Validate response structure
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.data).to.have.property('_id');
    pm.expect(jsonData.data).to.have.property('name');
    pm.expect(jsonData.data.status).to.equal('pending');
    
    // Save hotel ID for next requests
    pm.environment.set("hotel_id", jsonData.data._id);
});

pm.test("Hotel data matches request", function () {
    var jsonData = pm.response.json();
    var requestData = JSON.parse(pm.request.body.raw);
    
    pm.expect(jsonData.data.city).to.equal(requestData.city);
    pm.expect(jsonData.data.country).to.equal(requestData.country);
});
```

---

## 🤖 Automated Testing

### Newman (CLI Runner)

#### Install Newman

```bash
npm install -g newman
npm install -g newman-reporter-htmlextra
```

#### Run Collection

```bash
# Basic run
newman run StayHaven-API.postman_collection.json \
  -e StayHaven-Development.postman_environment.json

# With HTML report
newman run StayHaven-API.postman_collection.json \
  -e StayHaven-Development.postman_environment.json \
  -r htmlextra \
  --reporter-htmlextra-export ./reports/api-test-report.html

# Run specific folder
newman run StayHaven-API.postman_collection.json \
  --folder "Authentication" \
  -e StayHaven-Development.postman_environment.json
```

#### CI/CD Integration

**GitHub Actions**:

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Install Newman
        run: npm install -g newman newman-reporter-htmlextra
      
      - name: Run API Tests
        run: |
          newman run postman/StayHaven-API.postman_collection.json \
            -e postman/StayHaven-CI.postman_environment.json \
            -r htmlextra,cli \
            --reporter-htmlextra-export reports/api-test-report.html
      
      - name: Upload Test Report
        uses: actions/upload-artifact@v2
        if: always()
        with:
          name: api-test-report
          path: reports/
```

### Pre-request Scripts

#### Dynamic Data Generation

```javascript
// Generate random email
pm.globals.set("random_email", `user${Math.random().toString(36).substring(7)}@example.com`);

// Generate random phone
pm.globals.set("random_phone", `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`);

// Current timestamp
pm.globals.set("timestamp", new Date().toISOString());
```

#### Token Refresh Logic

```javascript
// Check if access token is expired
const token = pm.environment.get("access_token");

if (!token) {
    console.log("No token found. Please login.");
} else {
    // Decode JWT and check expiration
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload));
    const now = Math.floor(Date.now() / 1000);
    
    if (decoded.exp < now) {
        console.log("Token expired. Refreshing...");
        // Trigger refresh token request
    }
}
```

---

## 📊 Test Reporting

### Newman HTML Report

The HTML report includes:
- ✅ Total tests run
- ✅ Pass/fail statistics
- ✅ Response times
- ✅ Request/response details
- ✅ Environment variables used
- ✅ Detailed error messages

### Sample Report Summary

```
┌─────────────────────────┬──────────┬──────────┐
│                         │ executed │   failed │
├─────────────────────────┼──────────┼──────────┤
│              iterations │        1 │        0 │
├─────────────────────────┼──────────┼──────────┤
│                requests │       45 │        0 │
├─────────────────────────┼──────────┼──────────┤
│            test-scripts │       90 │        0 │
├─────────────────────────┼──────────┼──────────┤
│      prerequest-scripts │       45 │        0 │
├─────────────────────────┼──────────┼──────────┤
│              assertions │      180 │        0 │
├─────────────────────────┴──────────┴──────────┤
│ total run duration: 3.2s                      │
├───────────────────────────────────────────────┤
│ total data received: 25.4KB (approx)          │
├───────────────────────────────────────────────┤
│ average response time: 71ms                   │
└───────────────────────────────────────────────┘
```

---

## ✅ Best Practices

1. **Use Environment Variables**: Never hardcode URLs or tokens
2. **Add Descriptive Tests**: Clear test names help debugging
3. **Chain Requests**: Use saved variables to link requests
4. **Validate Schema**: Ensure response structure consistency
5. **Test Edge Cases**: Include error scenarios
6. **Check Response Times**: Performance matters
7. **Clean Up**: Delete test data after tests
8. **Use Collections**: Organize by feature/module

---

## 📌 Summary

Postman API testing in StayHaven:
- **Organized Collections**: Grouped by feature
- **Environment Management**: Dev, Staging, Production
- **Automated Testing**: Newman for CI/CD
- **Comprehensive Tests**: Status, schema, data validation
- **HTML Reports**: Detailed test results

**Goal**: Ensure API reliability through comprehensive automated testing.