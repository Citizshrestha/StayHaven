# Staff Management APIs

> Comprehensive documentation for managing staff members, invitations, roles, and property assignments

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Staff Invitation Workflow](#staff-invitation-workflow)
3. [Staff Authentication](#staff-authentication)
4. [Staff CRUD Operations](#staff-crud-operations)
5. [Role Assignment](#role-assignment)
6. [Property Assignment](#property-assignment)
7. [Staff Activation/Deactivation](#staff-activationdeactivation)
8. [Staff Performance Tracking](#staff-performance-tracking)

---

## 🎯 Overview

### Staff Types

| Role | Access Level | Responsibilities |
|------|--------------|------------------|
| **Owner** | Full Control | Company management, staff hiring, financial oversight |
| **Manager** | Hotel Management | Operations, staff scheduling, reports |
| **Receptionist** | Front Desk | Check-in/out, bookings, guest services |
| **Chief (Chef)** | Kitchen | Menu management, order preparation, inventory |
| **Waiter** | Service | Order taking, food delivery, guest assistance |

### Base URL
```
Production: https://api.stayhaven.com/api/staff
Development: http://localhost:5000/api/staff
```

---

## 🔐 Staff Invitation Workflow

### Complete Invitation Flow

```mermaid
sequenceDiagram
    Owner/Manager->>+API: POST /api/staff/invite
    API->>+Database: Create pending user
    API->>+Email Service: Send invitation email
    Email Service->>+Staff: Email with invite link
    Staff->>+Frontend: Click invite link
    Frontend->>+API: GET /api/staff/invite/verify/:token
    API->>+Frontend: Return staff details
    Staff->>+Frontend: Fill password & accept
    Frontend->>+API: POST /api/staff/invite/accept
    API->>+Database: Activate staff account
    API->>+Staff: Login credentials ready
```

### 1. Invite Staff Member

**Endpoint**: `POST /api/staff/invite`

**Authorization**: Required (Owner, Manager)

**Description**: Send invitation email to new staff member

**Request Body**:
```json
{
  "email": "alice.chef@email.com",
  "fullname": "Alice Johnson",
  "role": "chief",
  "companyRole": "chief",
  "assignedProperties": ["65b98765432fedcba987654"],
  "phone": "+1-234-567-8900",
  "expiresIn": "7 days"
}
```

**Field Validations**:
- `email`: Valid email format, unique across company
- `fullname`: 2-50 characters
- `role`: One of ['chief', 'waiter', 'manager', 'receptionist']
- `assignedProperties`: Array of valid hotel ObjectIds
- `phone`: Optional, valid phone number format
- `expiresIn`: Default "7 days", options: "24 hours", "3 days", "7 days", "14 days"

**Success Response** (201):
```json
{
  "success": true,
  "message": "Invitation sent successfully to alice.chef@email.com",
  "invitation": {
    "_id": "65e12345678abcdef0123456",
    "email": "alice.chef@email.com",
    "fullname": "Alice Johnson",
    "role": "chief",
    "assignedProperties": [
      {
        "_id": "65b98765432fedcba987654",
        "name": "Grand Plaza Hotel",
        "location": "Kathmandu"
      }
    ],
    "invitedBy": {
      "_id": "65a12345678abcdef0123456",
      "fullname": "John Owner"
    },
    "inviteToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-02-09T10:00:00.000Z",
    "status": "pending",
    "createdAt": "2026-02-02T10:00:00.000Z"
  }
}
```

**Email Template** (sent to staff):
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px; text-align: center;">
              <h1 style="color: #333; margin: 0;">You're Invited!</h1>
              <p style="color: #666; font-size: 16px; margin: 10px 0 0 0;">
                Welcome to the <strong style="color: #667eea;">Grand Plaza Hotel</strong> team
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Hi <strong>Alice Johnson</strong>,
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                <strong>John Owner</strong> has invited you to join the team as a
                <span style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; margin: 0 4px;">
                  Chef
                </span>
              </p>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Click the button below to accept the invitation and set up your account:
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://stayhaven.com/staff/invite/accept?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Warning Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin: 20px 0;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="color: #856404; font-size: 14px; margin: 0;">
                      ⏰ This invitation expires in <strong>7 days</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; text-align: center; background: #f8f9fa; border-top: 1px solid #e9ecef;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                Thanks,<br>
                <strong>The StayHaven Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Error Responses**:

403 - Not Authorized:
```json
{
  "success": false,
  "message": "Only owners and managers can invite staff"
}
```

409 - Email Exists:
```json
{
  "success": false,
  "message": "Staff member with this email already exists in the company"
}
```

400 - Invalid Hotel:
```json
{
  "success": false,
  "message": "One or more assigned hotels do not belong to your company"
}
```

---

### 2. Verify Invitation Token

**Endpoint**: `GET /api/staff/invite/verify/:token`

**Authorization**: None (Public)

**Description**: Validate invitation token and return staff details

**Success Response** (200):
```json
{
  "success": true,
  "invitation": {
    "email": "alice.chef@email.com",
    "fullname": "Alice Johnson",
    "role": "chief",
    "property": {
      "name": "Grand Plaza Hotel",
      "location": "Kathmandu"
    },
    "invitedBy": "John Owner",
    "expiresAt": "2026-02-09T10:00:00.000Z",
    "isExpired": false
  }
}
```

**Error Responses**:

400 - Expired Token:
```json
{
  "success": false,
  "message": "Invitation has expired. Please contact your manager for a new invitation.",
  "code": "INVITATION_EXPIRED"
}
```

404 - Invalid Token:
```json
{
  "success": false,
  "message": "Invalid or revoked invitation token"
}
```

---

### 3. Accept Invitation

**Endpoint**: `POST /api/staff/invite/accept`

**Authorization**: None (Public with token)

**Description**: Accept invitation and create staff account

**Request Body**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "username": "alice_chef",
  "phone": "+1-234-567-8900"
}
```

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*)

**Success Response** (201):
```json
{
  "success": true,
  "message": "Account activated successfully. You can now login.",
  "user": {
    "_id": "65f12345678abcdef0123456",
    "fullname": "Alice Johnson",
    "username": "alice_chef",
    "email": "alice.chef@email.com",
    "role": {
      "_id": "65901234567abcdef0123456",
      "name": "chief",
      "permissions": ["manage_orders", "view_menu", "update_order_status"]
    },
    "company": {
      "_id": "65812345678abcdef0123456",
      "name": "Hospitality Group Inc."
    },
    "assignedProperties": [
      {
        "_id": "65b98765432fedcba987654",
        "name": "Grand Plaza Hotel",
        "location": "Kathmandu"
      }
    ],
    "isActive": true,
    "createdAt": "2026-02-02T10:30:00.000Z"
  },
  "redirectPath": "/kitchen-dashboard"
}
```

**Error Responses**:

400 - Password Mismatch:
```json
{
  "success": false,
  "message": "Passwords do not match"
}
```

400 - Weak Password:
```json
{
  "success": false,
  "message": "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
  "requirements": {
    "minLength": false,
    "uppercase": true,
    "lowercase": true,
    "number": true,
    "specialChar": false
  }
}
```

---

## 🔑 Staff Authentication

### 1. Staff Login

**Endpoint**: `POST /api/staff/login`

**Authorization**: None (Public)

**Description**: Authenticate staff member with email/username and password

**Request Body**:
```json
{
  "email": "alice.chef@email.com",
  "password": "SecurePass123!"
}
```

**Login Validations**:
1. ✅ User exists with email or username
2. ✅ Password matches bcrypt hash
3. ✅ Role is staff role (chief, waiter, manager, receptionist, owner)
4. ✅ Account is active (`isActive: true`)
5. ✅ User belongs to a company
6. ✅ User has assigned properties (at least one hotel)

**Success Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZjEyMzQ1Njc4YWJjZGVmMDEyMzQ1NiIsImlhdCI6MTcwNzM5NjAwMCwiZXhwIjoxNzA3Mzk5NjAwfQ...",
  "user": {
    "_id": "65f12345678abcdef0123456",
    "fullname": "Alice Johnson",
    "username": "alice_chef",
    "email": "alice.chef@email.com",
    "profilePicture": "https://res.cloudinary.com/stayhaven/image/upload/v1707396000/staff/alice_chef.jpg",
    "role": {
      "_id": "65901234567abcdef0123456",
      "name": "chief",
      "permissions": ["manage_orders", "view_menu", "update_order_status"]
    },
    "companyRole": "chief",
    "company": {
      "_id": "65812345678abcdef0123456",
      "name": "Hospitality Group Inc.",
      "logo": "https://res.cloudinary.com/stayhaven/image/upload/v1707390000/companies/logo.png"
    },
    "assignedProperties": [
      {
        "_id": "65b98765432fedcba987654",
        "name": "Grand Plaza Hotel",
        "location": "Kathmandu",
        "images": ["https://res.cloudinary.com/stayhaven/image/upload/v1707390000/hotels/grand_plaza.jpg"]
      }
    ],
    "isActive": true,
    "phone": "+1-234-567-8900"
  },
  "redirectPath": "/kitchen-dashboard"
}
```

**Redirect Paths by Role**:
```javascript
{
  "chief": "/kitchen-dashboard",
  "waiter": "/waiter-dashboard",
  "manager": "/manager-dashboard",
  "receptionist": "/reception-dashboard",
  "owner": "/admin-dashboard"
}
```

**HTTP-Only Cookies Set**:
```
accessToken: JWT token, expires in 1 hour, HttpOnly, Secure (prod), SameSite=None (prod) / Lax (dev)
refreshToken: JWT token, expires in 7 days, HttpOnly, Secure (prod), SameSite=None (prod) / Lax (dev)
```

**Error Responses**:

401 - Invalid Credentials:
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

403 - Not Staff Role:
```json
{
  "success": false,
  "message": "Access denied. Staff account required."
}
```

403 - Inactive Account:
```json
{
  "success": false,
  "message": "Account is deactivated. Contact your manager."
}
```

403 - No Company:
```json
{
  "success": false,
  "message": "No company assigned. Contact your administrator."
}
```

403 - No Properties:
```json
{
  "success": false,
  "message": "No property assigned. Contact your manager."
}
```

---

## 👥 Staff CRUD Operations

### 1. Get All Staff Members

**Endpoint**: `GET /api/staff`

**Authorization**: Required (Owner, Manager)

**Query Parameters**:
- `companyId`: Filter by company (automatic for non-owner)
- `hotelId`: Filter by assigned hotel
- `role`: Filter by role (chief, waiter, manager, receptionist)
- `isActive`: Filter by status (true, false)
- `search`: Search by name, email, or username
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sortBy`: Sort field (createdAt, fullname, role)
- `sortOrder`: asc or desc (default: desc)

**Example Request**:
```bash
curl -X GET 'http://localhost:5000/api/staff?hotelId=65b98765432fedcba987654&role=waiter&isActive=true&page=1&limit=10' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Success Response** (200):
```json
{
  "success": true,
  "staff": [
    {
      "_id": "65f12345678abcdef0123456",
      "fullname": "Alice Johnson",
      "username": "alice_chef",
      "email": "alice.chef@email.com",
      "profilePicture": "https://res.cloudinary.com/stayhaven/image/upload/v1707396000/staff/alice.jpg",
      "role": {
        "_id": "65901234567abcdef0123456",
        "name": "chief"
      },
      "assignedProperties": [
        {
          "_id": "65b98765432fedcba987654",
          "name": "Grand Plaza Hotel"
        }
      ],
      "phone": "+1-234-567-8900",
      "isActive": true,
      "createdAt": "2026-01-15T10:00:00.000Z",
      "lastLogin": "2026-02-02T08:30:00.000Z"
    },
    // ... more staff
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalStaff": 28,
    "limit": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### 2. Get Single Staff Member

**Endpoint**: `GET /api/staff/:staffId`

**Authorization**: Required (Owner, Manager, or self)

**Success Response** (200):
```json
{
  "success": true,
  "staff": {
    "_id": "65f12345678abcdef0123456",
    "fullname": "Alice Johnson",
    "username": "alice_chef",
    "email": "alice.chef@email.com",
    "profilePicture": "https://res.cloudinary.com/stayhaven/image/upload/v1707396000/staff/alice.jpg",
    "role": {
      "_id": "65901234567abcdef0123456",
      "name": "chief",
      "permissions": ["manage_orders", "view_menu", "update_order_status"]
    },
    "company": {
      "_id": "65812345678abcdef0123456",
      "name": "Hospitality Group Inc."
    },
    "assignedProperties": [
      {
        "_id": "65b98765432fedcba987654",
        "name": "Grand Plaza Hotel",
        "location": "Kathmandu",
        "address": "Durbar Marg, Kathmandu 44600"
      }
    ],
    "phone": "+1-234-567-8900",
    "dateOfBirth": "1990-05-15",
    "address": "Thamel, Kathmandu",
    "emergencyContact": {
      "name": "Bob Johnson",
      "phone": "+1-234-567-8901",
      "relationship": "Spouse"
    },
    "hireDate": "2026-01-15T10:00:00.000Z",
    "isActive": true,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "lastLogin": "2026-02-02T08:30:00.000Z",
    "performanceMetrics": {
      "ordersCompleted": 342,
      "averagePreparationTime": 18,
      "customerRating": 4.7,
      "punctuality": 0.95
    }
  }
}
```

---

### 3. Update Staff Member

**Endpoint**: `PUT /api/staff/:staffId`

**Authorization**: Required (Owner, Manager, or self for limited fields)

**Request Body** (Manager/Owner):
```json
{
  "fullname": "Alice Marie Johnson",
  "phone": "+1-234-567-8999",
  "address": "New Address, Kathmandu",
  "assignedProperties": ["65b98765432fedcba987654", "65c98765432fedcba987654"],
  "role": "manager",
  "isActive": true,
  "emergencyContact": {
    "name": "Bob Johnson",
    "phone": "+1-234-567-8901",
    "relationship": "Spouse"
  }
}
```

**Request Body** (Self - limited fields):
```json
{
  "fullname": "Alice Marie Johnson",
  "phone": "+1-234-567-8999",
  "address": "New Address, Kathmandu",
  "profilePicture": "https://res.cloudinary.com/stayhaven/image/upload/v1707399600/staff/alice_new.jpg"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Staff member updated successfully",
  "staff": {
    "_id": "65f12345678abcdef0123456",
    "fullname": "Alice Marie Johnson",
    // ... updated fields
    "updatedAt": "2026-02-02T10:00:00.000Z"
  }
}
```

---

### 4. Deactivate Staff Member

**Endpoint**: `PATCH /api/staff/:staffId/deactivate`

**Authorization**: Required (Owner, Manager)

**Description**: Soft delete staff member (sets `isActive: false`)

**Request Body**:
```json
{
  "reason": "Resigned from position",
  "effectiveDate": "2026-02-15"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Staff member deactivated successfully",
  "staff": {
    "_id": "65f12345678abcdef0123456",
    "fullname": "Alice Johnson",
    "isActive": false,
    "deactivatedAt": "2026-02-02T10:00:00.000Z",
    "deactivationReason": "Resigned from position"
  }
}
```

---

### 5. Reactivate Staff Member

**Endpoint**: `PATCH /api/staff/:staffId/reactivate`

**Authorization**: Required (Owner, Manager)

**Success Response** (200):
```json
{
  "success": true,
  "message": "Staff member reactivated successfully",
  "staff": {
    "_id": "65f12345678abcdef0123456",
    "fullname": "Alice Johnson",
    "isActive": true,
    "reactivatedAt": "2026-02-10T10:00:00.000Z"
  }
}
```

---

## 🎭 Role Assignment

### 1. Update Staff Role

**Endpoint**: `PATCH /api/staff/:staffId/role`

**Authorization**: Required (Owner only)

**Request Body**:
```json
{
  "role": "manager",
  "effectiveDate": "2026-02-15"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Staff role updated successfully",
  "staff": {
    "_id": "65f12345678abcdef0123456",
    "fullname": "Alice Johnson",
    "role": {
      "_id": "65902234567abcdef0123456",
      "name": "manager",
      "permissions": ["manage_staff", "view_reports", "manage_orders", "manage_bookings"]
    },
    "previousRole": "chief",
    "roleChangedAt": "2026-02-02T10:00:00.000Z"
  }
}
```

---

## 🏨 Property Assignment

### 1. Assign Hotel to Staff

**Endpoint**: `POST /api/staff/:staffId/assign-hotel`

**Authorization**: Required (Owner, Manager)

**Request Body**:
```json
{
  "hotelId": "65c98765432fedcba987654"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Hotel assigned successfully",
  "staff": {
    "_id": "65f12345678abcdef0123456",
    "fullname": "Alice Johnson",
    "assignedProperties": [
      {
        "_id": "65b98765432fedcba987654",
        "name": "Grand Plaza Hotel"
      },
      {
        "_id": "65c98765432fedcba987654",
        "name": "Mountain View Resort"
      }
    ]
  }
}
```

---

### 2. Remove Hotel from Staff

**Endpoint**: `DELETE /api/staff/:staffId/remove-hotel/:hotelId`

**Authorization**: Required (Owner, Manager)

**Success Response** (200):
```json
{
  "success": true,
  "message": "Hotel removed from staff assignments",
  "staff": {
    "_id": "65f12345678abcdef0123456",
    "fullname": "Alice Johnson",
    "assignedProperties": [
      {
        "_id": "65b98765432fedcba987654",
        "name": "Grand Plaza Hotel"
      }
    ]
  }
}
```

---

## 📊 Staff Performance Tracking

### Get Staff Performance Metrics

**Endpoint**: `GET /api/staff/:staffId/performance`

**Authorization**: Required (Owner, Manager, or self)

**Query Parameters**:
- `startDate`: ISO date string (default: 30 days ago)
- `endDate`: ISO date string (default: now)
- `hotelId`: Filter by specific hotel

**Success Response** (200):
```json
{
  "success": true,
  "performance": {
    "staffId": "65f12345678abcdef0123456",
    "fullname": "Alice Johnson",
    "role": "chief",
    "period": {
      "startDate": "2026-01-03T00:00:00.000Z",
      "endDate": "2026-02-02T23:59:59.000Z"
    },
    "metrics": {
      "ordersCompleted": 342,
      "ordersInProgress": 8,
      "averagePreparationTime": 18,
      "fastestPreparationTime": 8,
      "slowestPreparationTime": 45,
      "onTimeDeliveryRate": 0.92,
      "customerRating": 4.7,
      "totalRatings": 156,
      "punctuality": 0.95,
      "attendanceRate": 0.97,
      "shiftsWorked": 28,
      "totalHoursWorked": 224
    },
    "weeklyTrend": [
      { "week": "2026-W05", "ordersCompleted": 78, "avgPrepTime": 17 },
      { "week": "2026-W06", "ordersCompleted": 85, "avgPrepTime": 19 },
      { "week": "2026-W07", "ordersCompleted": 92, "avgPrepTime": 18 },
      { "week": "2026-W08", "ordersCompleted": 87, "avgPrepTime": 17 }
    ]
  }
}
```

---

## 📚 Related Documents

- [API Overview](./api-overview.md)
- [Authentication APIs](./authentication-apis.md)
- [Hotel Management APIs](./hotel-management-apis.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive staff management APIs
