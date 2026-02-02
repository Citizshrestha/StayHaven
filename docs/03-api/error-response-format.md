# Error Response Format

> Comprehensive guide to StayHaven API error handling, status codes, and standardized error responses

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Error Response Structure](#error-response-structure)
3. [HTTP Status Codes](#http-status-codes)
4. [Error Categories](#error-categories)
5. [Validation Errors](#validation-errors)
6. [Authentication Errors](#authentication-errors)
7. [Authorization Errors](#authorization-errors)
8. [Resource Errors](#resource-errors)
9. [Business Logic Errors](#business-logic-errors)
10. [Server Errors](#server-errors)
11. [Rate Limiting Errors](#rate-limiting-errors)
12. [Error Handling Best Practices](#error-handling-best-practices)

---

## 🎯 Overview

### Error Handling Philosophy

StayHaven API follows RESTful error handling principles:
- **Consistent Structure**: All errors follow the same JSON format
- **HTTP Status Codes**: Proper use of standard HTTP status codes
- **Descriptive Messages**: Human-readable error messages
- **Machine-Readable Codes**: Error codes for programmatic handling
- **Detailed Validation**: Field-specific validation errors
- **No Sensitive Data**: Never expose passwords, tokens, or internal details

---

## 📐 Error Response Structure

### Base Error Format

All error responses follow this structure:

```typescript
interface ErrorResponse {
  success: false;                    // Always false for errors
  message: string;                   // Human-readable error message
  error?: {
    code: string;                    // Machine-readable error code
    details?: any;                   // Additional error context
    field?: string;                  // Field causing the error
    timestamp: string;               // ISO 8601 timestamp
    path: string;                    // API endpoint path
    requestId?: string;              // Unique request identifier
  };
  errors?: ValidationError[];        // Array of validation errors (for 422)
}
```

### Simple Error Example

```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Detailed Error Example

```json
{
  "success": false,
  "message": "Authentication failed",
  "error": {
    "code": "INVALID_CREDENTIALS",
    "details": "The email or password you entered is incorrect",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/auth/login",
    "requestId": "req_1a2b3c4d5e6f"
  }
}
```

### Validation Error Example

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/auth/register"
  },
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "value": "notanemail",
      "code": "INVALID_EMAIL"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters",
      "value": "[REDACTED]",
      "code": "PASSWORD_TOO_SHORT"
    }
  ]
}
```

---

## 🚦 HTTP Status Codes

### Complete Status Code Reference

| Code | Name | Description | When to Use |
|------|------|-------------|-------------|
| **200** | OK | Request successful | Successful GET, PUT, PATCH, DELETE |
| **201** | Created | Resource created | Successful POST creating new resource |
| **204** | No Content | Success with no response body | Successful DELETE with no content |
| **400** | Bad Request | Invalid request format | Malformed JSON, missing required fields |
| **401** | Unauthorized | Authentication required | Missing or invalid token |
| **403** | Forbidden | Insufficient permissions | Valid token but no access rights |
| **404** | Not Found | Resource doesn't exist | Requested resource not found |
| **409** | Conflict | Resource conflict | Duplicate email, username exists |
| **422** | Unprocessable Entity | Validation failed | Invalid field values |
| **429** | Too Many Requests | Rate limit exceeded | Too many requests from IP |
| **500** | Internal Server Error | Server error | Unexpected server failure |
| **502** | Bad Gateway | Upstream service error | Database or external API failed |
| **503** | Service Unavailable | Service temporarily down | Maintenance mode |

---

## 📂 Error Categories

### 1. Client Errors (4xx)

User or client-side errors that can be fixed by changing the request.

### 2. Server Errors (5xx)

Server-side errors that require investigation and fixing on the backend.

---

## ✅ Validation Errors

### 400 - Bad Request

**When**: Malformed request, invalid JSON, missing required fields

**Example 1: Invalid JSON**
```json
{
  "success": false,
  "message": "Invalid JSON format in request body",
  "error": {
    "code": "INVALID_JSON",
    "details": "Unexpected token '}' at position 45",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/hotels"
  }
}
```

**Example 2: Missing Required Field**
```json
{
  "success": false,
  "message": "Email and password are required",
  "error": {
    "code": "MISSING_REQUIRED_FIELDS",
    "details": {
      "missing": ["email", "password"]
    },
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/auth/login"
  }
}
```

---

### 422 - Validation Failed

**When**: Request format is correct but field values are invalid

**Registration Example**:
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/auth/register"
  },
  "errors": [
    {
      "field": "fullname",
      "message": "Full name must be between 2 and 50 characters",
      "value": "J",
      "code": "NAME_TOO_SHORT",
      "constraints": {
        "min": 2,
        "max": 50
      }
    },
    {
      "field": "email",
      "message": "Invalid email format",
      "value": "notanemail",
      "code": "INVALID_EMAIL"
    },
    {
      "field": "password",
      "message": "Password must contain uppercase, lowercase, number, and special character",
      "value": "[REDACTED]",
      "code": "PASSWORD_WEAK",
      "requirements": {
        "minLength": true,
        "uppercase": false,
        "lowercase": true,
        "number": true,
        "specialChar": false
      }
    },
    {
      "field": "phone",
      "message": "Invalid phone number format",
      "value": "12345",
      "code": "INVALID_PHONE",
      "example": "+1-555-123-4567"
    }
  ]
}
```

**Booking Validation Example**:
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/bookings"
  },
  "errors": [
    {
      "field": "checkIn",
      "message": "Check-in date must be in the future",
      "value": "2026-01-01",
      "code": "CHECK_IN_PAST"
    },
    {
      "field": "checkOut",
      "message": "Check-out date must be after check-in date",
      "value": "2026-02-10",
      "code": "INVALID_DATE_RANGE",
      "context": {
        "checkIn": "2026-02-15",
        "checkOut": "2026-02-10"
      }
    },
    {
      "field": "guests.adults",
      "message": "Number of adults must be between 1 and 10",
      "value": 0,
      "code": "INVALID_GUEST_COUNT",
      "constraints": {
        "min": 1,
        "max": 10
      }
    }
  ]
}
```

---

## 🔐 Authentication Errors

### 401 - Unauthorized

**When**: Authentication required but not provided or invalid

**Example 1: Missing Token**
```json
{
  "success": false,
  "message": "Authentication token required",
  "error": {
    "code": "NO_AUTH_TOKEN",
    "details": "Please provide a valid JWT token in Authorization header",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/users/profile"
  }
}
```

**Example 2: Invalid Token**
```json
{
  "success": false,
  "message": "Invalid or expired token",
  "error": {
    "code": "INVALID_TOKEN",
    "details": "JWT signature verification failed",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/users/profile"
  }
}
```

**Example 3: Token Expired**
```json
{
  "success": false,
  "message": "Token has expired",
  "error": {
    "code": "TOKEN_EXPIRED",
    "details": "Access token expired at 2026-02-02T09:00:00.000Z",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/orders",
    "action": "Use refresh token to obtain new access token"
  }
}
```

**Example 4: Invalid Credentials**
```json
{
  "success": false,
  "message": "Invalid credentials",
  "error": {
    "code": "INVALID_CREDENTIALS",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/auth/login"
  }
}
```

---

## 🚫 Authorization Errors

### 403 - Forbidden

**When**: Valid authentication but insufficient permissions

**Example 1: Insufficient Role**
```json
{
  "success": false,
  "message": "Access denied. Staff account required.",
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "details": "Only staff members (chef, waiter, manager) can access this endpoint",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/staff/login",
    "userRole": "guest",
    "requiredRoles": ["chief", "waiter", "manager", "receptionist", "owner"]
  }
}
```

**Example 2: Inactive Account**
```json
{
  "success": false,
  "message": "Account is deactivated. Contact your manager.",
  "error": {
    "code": "ACCOUNT_INACTIVE",
    "details": "Your account has been deactivated",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/staff/login",
    "deactivatedAt": "2026-01-15T10:00:00.000Z",
    "contactEmail": "support@stayhaven.com"
  }
}
```

**Example 3: No Property Access**
```json
{
  "success": false,
  "message": "You don't have permission to access this hotel",
  "error": {
    "code": "NO_PROPERTY_ACCESS",
    "details": "You are not assigned to this hotel",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/hotels/65b98765432fedcba987654/orders",
    "hotelId": "65b98765432fedcba987654",
    "assignedProperties": ["65c98765432fedcba987654"]
  }
}
```

**Example 4: Action Not Allowed**
```json
{
  "success": false,
  "message": "Only owners and managers can invite staff",
  "error": {
    "code": "ACTION_NOT_ALLOWED",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/staff/invite",
    "userRole": "waiter",
    "requiredRoles": ["owner", "manager"]
  }
}
```

---

## 📦 Resource Errors

### 404 - Not Found

**When**: Requested resource doesn't exist

**Example 1: Hotel Not Found**
```json
{
  "success": false,
  "message": "Hotel not found",
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "details": "No hotel found with the provided ID",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/hotels/65b98765432fedcba987654",
    "resourceType": "Hotel",
    "resourceId": "65b98765432fedcba987654"
  }
}
```

**Example 2: Order Not Found**
```json
{
  "success": false,
  "message": "Order not found",
  "error": {
    "code": "ORDER_NOT_FOUND",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/orders/65d12345678abcdef0123456",
    "orderId": "65d12345678abcdef0123456"
  }
}
```

**Example 3: Endpoint Not Found**
```json
{
  "success": false,
  "message": "Endpoint not found",
  "error": {
    "code": "ENDPOINT_NOT_FOUND",
    "details": "The requested API endpoint does not exist",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/invalid-endpoint",
    "method": "GET"
  }
}
```

---

### 409 - Conflict

**When**: Resource already exists or state conflict

**Example 1: Duplicate Email**
```json
{
  "success": false,
  "message": "Email already registered",
  "error": {
    "code": "EMAIL_EXISTS",
    "details": "An account with this email already exists",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/auth/register",
    "field": "email",
    "action": "Use a different email or login to existing account"
  }
}
```

**Example 2: Duplicate Username**
```json
{
  "success": false,
  "message": "Username already taken",
  "error": {
    "code": "USERNAME_EXISTS",
    "details": "This username is already in use",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/auth/register",
    "field": "username",
    "suggestions": ["johndoe123", "john_doe", "jdoe2026"]
  }
}
```

**Example 3: Room Already Booked**
```json
{
  "success": false,
  "message": "Room not available for selected dates",
  "error": {
    "code": "ROOM_UNAVAILABLE",
    "details": "This room is already booked for the selected dates",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/bookings",
    "conflictingBooking": {
      "checkIn": "2026-02-15",
      "checkOut": "2026-02-18",
      "status": "Confirmed"
    },
    "suggestedAlternatives": [
      {
        "roomId": "65e98765432fedcba987654",
        "roomNumber": "102",
        "roomType": "Deluxe"
      }
    ]
  }
}
```

---

## 💼 Business Logic Errors

### Custom Business Rules

**Example 1: Insufficient Loyalty Points**
```json
{
  "success": false,
  "message": "Insufficient loyalty points",
  "error": {
    "code": "INSUFFICIENT_POINTS",
    "details": "You need 5000 points for this reward",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/loyalty/redeem",
    "currentPoints": 2580,
    "requiredPoints": 5000,
    "shortfall": 2420
  }
}
```

**Example 2: Booking Cannot Be Cancelled**
```json
{
  "success": false,
  "message": "Booking cannot be cancelled",
  "error": {
    "code": "CANCELLATION_NOT_ALLOWED",
    "details": "Free cancellation period has expired",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/bookings/65e12345678abcdef0123456/cancel",
    "checkIn": "2026-02-05",
    "freeCancellationUntil": "2026-02-01T14:00:00.000Z",
    "cancellationFee": 50.00,
    "currency": "USD"
  }
}
```

**Example 3: Order Already Delivered**
```json
{
  "success": false,
  "message": "Order already delivered",
  "error": {
    "code": "ORDER_ALREADY_DELIVERED",
    "details": "This order has already been delivered and cannot be modified",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/orders/65d12345678abcdef0123456/status",
    "orderNumber": 1025,
    "currentStatus": "delivered",
    "deliveredAt": "2026-02-02T09:45:00.000Z"
  }
}
```

---

## ⚠️ Server Errors

### 500 - Internal Server Error

**When**: Unexpected server error

```json
{
  "success": false,
  "message": "An unexpected error occurred",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "details": "Something went wrong on our end. Please try again later.",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/bookings",
    "requestId": "req_1a2b3c4d5e6f",
    "supportEmail": "support@stayhaven.com"
  }
}
```

---

### 502 - Bad Gateway

**When**: Upstream service failed (database, external API)

```json
{
  "success": false,
  "message": "Database connection failed",
  "error": {
    "code": "DATABASE_ERROR",
    "details": "Unable to connect to database. Please try again later.",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/hotels",
    "requestId": "req_1a2b3c4d5e6f"
  }
}
```

---

### 503 - Service Unavailable

**When**: Service temporarily unavailable (maintenance)

```json
{
  "success": false,
  "message": "Service temporarily unavailable",
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "details": "The API is undergoing scheduled maintenance",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/bookings",
    "retryAfter": 3600,
    "estimatedRestore": "2026-02-02T11:00:00.000Z"
  }
}
```

---

## 🚦 Rate Limiting Errors

### 429 - Too Many Requests

**When**: Rate limit exceeded

```json
{
  "success": false,
  "message": "Rate limit exceeded",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "details": "You have exceeded the maximum number of requests per hour",
    "timestamp": "2026-02-02T10:00:00.000Z",
    "path": "/api/auth/login",
    "limit": 100,
    "remaining": 0,
    "resetAt": "2026-02-02T11:00:00.000Z",
    "retryAfter": 3600
  }
}
```

**Response Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1707397200
Retry-After: 3600
```

---

## 🛠️ Error Handling Best Practices

### Client-Side Error Handling

```javascript
// Example: React error handler
const handleApiError = (error) => {
  const response = error.response?.data;
  
  if (!response) {
    toast.error('Network error. Please check your connection.');
    return;
  }
  
  switch (error.response?.status) {
    case 400:
    case 422:
      // Validation errors - show field-specific messages
      if (response.errors) {
        response.errors.forEach(err => {
          setFieldError(err.field, err.message);
        });
      } else {
        toast.error(response.message);
      }
      break;
      
    case 401:
      // Authentication error - redirect to login
      localStorage.removeItem('accessToken');
      navigate('/login');
      toast.error('Please login to continue');
      break;
      
    case 403:
      // Authorization error - show access denied
      toast.error(response.message || 'Access denied');
      break;
      
    case 404:
      // Not found - navigate to 404 page
      navigate('/404');
      break;
      
    case 409:
      // Conflict - show specific conflict message
      toast.warning(response.message);
      if (response.error?.suggestions) {
        // Show suggestions if available
        setSuggestions(response.error.suggestions);
      }
      break;
      
    case 429:
      // Rate limit - show retry message
      const retryAfter = response.error?.retryAfter || 60;
      toast.error(`Too many requests. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`);
      break;
      
    case 500:
    case 502:
    case 503:
      // Server error - show generic message
      toast.error('Server error. Please try again later.');
      break;
      
    default:
      toast.error(response.message || 'An error occurred');
  }
};

// Usage with axios
try {
  const response = await axios.post('/api/auth/login', data);
} catch (error) {
  handleApiError(error);
}
```

---

### Error Codes Reference

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_JSON` | 400 | Request body is not valid JSON |
| `MISSING_REQUIRED_FIELDS` | 400 | Required fields missing |
| `VALIDATION_ERROR` | 422 | Field validation failed |
| `INVALID_EMAIL` | 422 | Email format invalid |
| `PASSWORD_WEAK` | 422 | Password doesn't meet requirements |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `NO_AUTH_TOKEN` | 401 | Authorization header missing |
| `INVALID_TOKEN` | 401 | Token is invalid or malformed |
| `TOKEN_EXPIRED` | 401 | Access token has expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `ACCOUNT_INACTIVE` | 403 | Account is deactivated |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource doesn't exist |
| `ENDPOINT_NOT_FOUND` | 404 | API endpoint doesn't exist |
| `EMAIL_EXISTS` | 409 | Email already registered |
| `USERNAME_EXISTS` | 409 | Username already taken |
| `ROOM_UNAVAILABLE` | 409 | Room already booked |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `DATABASE_ERROR` | 502 | Database connection failed |
| `SERVICE_UNAVAILABLE` | 503 | Service in maintenance |

---

## 📚 Related Documents

- [API Overview](./api-overview.md)
- [Authentication APIs](./authentication-apis.md)
- [Request-Response Samples](./request-response-samples.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive error response format documentation
