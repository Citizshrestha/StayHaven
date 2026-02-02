# User Management APIs

> Comprehensive documentation for guest user profile management, preferences, and account operations

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [User Profile Management](#user-profile-management)
3. [Password Management](#password-management)
4. [Profile Picture Upload](#profile-picture-upload)
5. [Account Preferences](#account-preferences)
6. [Wishlist Management](#wishlist-management)
7. [Cart Management](#cart-management)
8. [Account Deletion](#account-deletion)

---

## 🎯 Overview

### User Types

| Type | Description | Access Level |
|------|-------------|--------------|
| **Guest** | Regular hotel bookers | Profile, bookings, orders |
| **Premium** | Loyalty program members | Extra benefits, priority support |
| **Corporate** | Business account users | Corporate rates, invoicing |

### Base URL
```
Production: https://api.stayhaven.com/api/users
Development: http://localhost:5000/api/users
```

---

## 👤 User Profile Management

### 1. Get Current User Profile

**Endpoint**: `GET /api/users/profile`

**Authorization**: Required (JWT Access Token)

**Description**: Get authenticated user's complete profile

**Example Request**:
```bash
curl -X GET 'http://localhost:5000/api/users/profile' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Success Response** (200):
```json
{
  "success": true,
  "user": {
    "_id": "65a12345678abcdef0123456",
    "fullname": "John Doe",
    "username": "johndoe",
    "email": "john.doe@email.com",
    "profilePicture": "https://res.cloudinary.com/stayhaven/image/upload/v1707396000/users/johndoe.jpg",
    "phone": "+1-555-123-4567",
    "dateOfBirth": "1990-05-15",
    "address": {
      "street": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "zipCode": "10001"
    },
    "role": {
      "_id": "65901234567abcdef0123456",
      "name": "guest"
    },
    "isVerified": true,
    "isActive": true,
    "loyaltyPoints": 2580,
    "membershipTier": "gold",
    "preferences": {
      "language": "en",
      "currency": "USD",
      "notifications": {
        "email": true,
        "sms": false,
        "push": true
      },
      "roomPreferences": {
        "floorLevel": "high",
        "bedType": "king",
        "smokingAllowed": false
      }
    },
    "wishlist": [
      "65b98765432fedcba987654",
      "65c98765432fedcba987654"
    ],
    "cart": [
      {
        "hotelId": "65b98765432fedcba987654",
        "quantity": 1,
        "addedAt": "2026-02-01T10:00:00.000Z"
      }
    ],
    "stats": {
      "totalBookings": 12,
      "completedBookings": 10,
      "cancelledBookings": 2,
      "totalSpent": 15420.50,
      "averageRating": 4.8
    },
    "createdAt": "2024-05-10T08:00:00.000Z",
    "lastLogin": "2026-02-02T09:15:00.000Z"
  }
}
```

---

### 2. Update User Profile

**Endpoint**: `PUT /api/users/profile`

**Authorization**: Required (JWT Access Token)

**Description**: Update user profile information

**Request Body**:
```json
{
  "fullname": "John Michael Doe",
  "phone": "+1-555-123-9999",
  "dateOfBirth": "1990-05-15",
  "address": {
    "street": "456 Oak Avenue",
    "city": "Los Angeles",
    "state": "CA",
    "country": "USA",
    "zipCode": "90001"
  }
}
```

**Editable Fields**:
- `fullname`: String, 2-50 characters
- `phone`: Valid phone number format
- `dateOfBirth`: ISO date string, must be 18+ years old
- `address`: Object with street, city, state, country, zipCode
- `profilePicture`: Cloudinary URL (use upload endpoint)

**Non-Editable Fields** (require special endpoints):
- `email` (requires email change verification)
- `username` (immutable after registration)
- `password` (use password change endpoint)
- `role` (admin only)

**Success Response** (200):
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "_id": "65a12345678abcdef0123456",
    "fullname": "John Michael Doe",
    "phone": "+1-555-123-9999",
    "address": {
      "street": "456 Oak Avenue",
      "city": "Los Angeles",
      "state": "CA",
      "country": "USA",
      "zipCode": "90001"
    },
    "updatedAt": "2026-02-02T10:00:00.000Z"
  }
}
```

**Error Responses**:

400 - Invalid Data:
```json
{
  "success": false,
  "message": "Invalid phone number format"
}
```

400 - Underage:
```json
{
  "success": false,
  "message": "You must be at least 18 years old to register"
}
```

---

## 🔐 Password Management

### 1. Change Password

**Endpoint**: `PUT /api/users/change-password`

**Authorization**: Required (JWT Access Token)

**Description**: Change user password (requires current password)

**Request Body**:
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!",
  "confirmPassword": "NewSecurePass456!"
}
```

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*)
- Must be different from current password

**Success Response** (200):
```json
{
  "success": true,
  "message": "Password changed successfully. Please login with your new password."
}
```

**Error Responses**:

401 - Wrong Current Password:
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

400 - Password Mismatch:
```json
{
  "success": false,
  "message": "New passwords do not match"
}
```

400 - Weak Password:
```json
{
  "success": false,
  "message": "Password does not meet security requirements",
  "requirements": {
    "minLength": true,
    "uppercase": true,
    "lowercase": true,
    "number": false,
    "specialChar": false
  }
}
```

400 - Same Password:
```json
{
  "success": false,
  "message": "New password must be different from current password"
}
```

---

## 📷 Profile Picture Upload

### 1. Upload Profile Picture

**Endpoint**: `POST /api/users/profile-picture`

**Authorization**: Required (JWT Access Token)

**Content-Type**: `multipart/form-data`

**Description**: Upload and set user profile picture to Cloudinary

**Request Body** (FormData):
```
image: [File Object]
```

**Image Requirements**:
- **File Types**: JPEG, PNG, WebP, GIF
- **Max Size**: 5 MB
- **Min Dimensions**: 100x100 pixels
- **Recommended**: Square aspect ratio (1:1), 500x500px

**cURL Example**:
```bash
curl -X POST 'http://localhost:5000/api/users/profile-picture' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -F 'image=@/path/to/profile.jpg'
```

**JavaScript Example (React)**:
```javascript
const uploadProfilePicture = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('http://localhost:5000/api/users/profile-picture', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData
  });
  
  return await response.json();
};

// Usage with file input
const handleFileChange = (e) => {
  const file = e.target.files[0];
  uploadProfilePicture(file);
};
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Profile picture updated successfully",
  "profilePicture": "https://res.cloudinary.com/stayhaven/image/upload/v1707399600/users/johndoe_abc123.jpg",
  "thumbnails": {
    "small": "https://res.cloudinary.com/stayhaven/image/upload/c_fill,w_100,h_100/v1707399600/users/johndoe_abc123.jpg",
    "medium": "https://res.cloudinary.com/stayhaven/image/upload/c_fill,w_300,h_300/v1707399600/users/johndoe_abc123.jpg",
    "large": "https://res.cloudinary.com/stayhaven/image/upload/c_fill,w_500,h_500/v1707399600/users/johndoe_abc123.jpg"
  }
}
```

**Error Responses**:

400 - No File:
```json
{
  "success": false,
  "message": "No image file provided"
}
```

400 - Invalid Format:
```json
{
  "success": false,
  "message": "Only JPEG, PNG, WebP and GIF images are allowed"
}
```

413 - File Too Large:
```json
{
  "success": false,
  "message": "Image size must be less than 5 MB"
}
```

---

### 2. Delete Profile Picture

**Endpoint**: `DELETE /api/users/profile-picture`

**Authorization**: Required (JWT Access Token)

**Success Response** (200):
```json
{
  "success": true,
  "message": "Profile picture removed successfully",
  "profilePicture": null
}
```

---

## ⚙️ Account Preferences

### 1. Get User Preferences

**Endpoint**: `GET /api/users/preferences`

**Authorization**: Required (JWT Access Token)

**Success Response** (200):
```json
{
  "success": true,
  "preferences": {
    "language": "en",
    "currency": "USD",
    "timezone": "America/New_York",
    "notifications": {
      "email": true,
      "sms": false,
      "push": true,
      "booking": true,
      "promotions": false,
      "newsletter": true
    },
    "roomPreferences": {
      "floorLevel": "high",
      "bedType": "king",
      "viewType": "ocean",
      "smokingAllowed": false,
      "accessibilityNeeds": []
    },
    "privacy": {
      "showProfile": true,
      "showReviews": true,
      "allowMarketing": false
    },
    "theme": "light"
  }
}
```

---

### 2. Update User Preferences

**Endpoint**: `PUT /api/users/preferences`

**Authorization**: Required (JWT Access Token)

**Request Body**:
```json
{
  "language": "en",
  "currency": "EUR",
  "timezone": "Europe/London",
  "notifications": {
    "email": true,
    "sms": false,
    "push": true,
    "booking": true,
    "promotions": true,
    "newsletter": false
  },
  "roomPreferences": {
    "floorLevel": "high",
    "bedType": "queen",
    "viewType": "city",
    "smokingAllowed": false
  },
  "theme": "dark"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "preferences": {
    // updated preferences
  }
}
```

---

## ❤️ Wishlist Management

### 1. Get Wishlist

**Endpoint**: `GET /api/users/wishlist`

**Authorization**: Required (JWT Access Token)

**Query Parameters**:
- `populate`: Include hotel details (default: false)

**Success Response** (200):
```json
{
  "success": true,
  "message": "Wishlist fetched successfully",
  "wishlist": [
    "65b98765432fedcba987654",
    "65c98765432fedcba987654"
  ]
}
```

**With Population** (`?populate=true`):
```json
{
  "success": true,
  "message": "Wishlist fetched successfully",
  "wishlist": [
    {
      "_id": "65b98765432fedcba987654",
      "name": "Grand Plaza Hotel",
      "location": "Kathmandu",
      "images": ["https://res.cloudinary.com/stayhaven/image/upload/v1707390000/hotels/grand_plaza.jpg"],
      "rating": 4.8,
      "priceRange": {
        "min": 120,
        "max": 450
      }
    },
    {
      "_id": "65c98765432fedcba987654",
      "name": "Mountain View Resort",
      "location": "Pokhara",
      "images": ["https://res.cloudinary.com/stayhaven/image/upload/v1707390000/hotels/mountain_view.jpg"],
      "rating": 4.6,
      "priceRange": {
        "min": 90,
        "max": 320
      }
    }
  ],
  "count": 2
}
```

---

### 2. Toggle Wishlist Item

**Endpoint**: `POST /api/users/wishlist/:hotelId`

**Authorization**: Required (JWT Access Token)

**Description**: Add hotel to wishlist if not present, remove if already present

**Success Response** (200 - Added):
```json
{
  "success": true,
  "message": "Added to wishlist",
  "wishlist": [
    "65b98765432fedcba987654",
    "65c98765432fedcba987654",
    "65d98765432fedcba987654"
  ]
}
```

**Success Response** (200 - Removed):
```json
{
  "success": true,
  "message": "Removed from wishlist",
  "wishlist": [
    "65b98765432fedcba987654",
    "65c98765432fedcba987654"
  ]
}
```

---

## 🛒 Cart Management

### 1. Get Cart

**Endpoint**: `GET /api/users/cart`

**Authorization**: Required (JWT Access Token)

**Success Response** (200):
```json
{
  "success": true,
  "message": "Cart Fetched Successfully",
  "cart": [
    {
      "hotelId": "65b98765432fedcba987654",
      "quantity": 1,
      "addedAt": "2026-02-01T10:00:00.000Z"
    },
    {
      "hotelId": "65c98765432fedcba987654",
      "quantity": 2,
      "addedAt": "2026-02-02T08:30:00.000Z"
    }
  ]
}
```

---

### 2. Add to Cart

**Endpoint**: `POST /api/users/cart`

**Authorization**: Required (JWT Access Token)

**Request Body**:
```json
{
  "hotelId": "65d98765432fedcba987654",
  "quantity": 1
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Item added to cart successfully",
  "cart": [
    {
      "hotelId": "65b98765432fedcba987654",
      "quantity": 1
    },
    {
      "hotelId": "65c98765432fedcba987654",
      "quantity": 2
    },
    {
      "hotelId": "65d98765432fedcba987654",
      "quantity": 1
    }
  ]
}
```

---

### 3. Update Cart Item

**Endpoint**: `PUT /api/users/cart`

**Authorization**: Required (JWT Access Token)

**Request Body**:
```json
{
  "hotelId": "65c98765432fedcba987654",
  "quantity": 3
}
```

**Behavior**:
- If `quantity > 0`: Update item quantity
- If `quantity <= 0`: Remove item from cart

**Success Response** (200):
```json
{
  "success": true,
  "message": "Cart updated successfully",
  "cart": [
    {
      "hotelId": "65b98765432fedcba987654",
      "quantity": 1
    },
    {
      "hotelId": "65c98765432fedcba987654",
      "quantity": 3
    }
  ]
}
```

**Error Responses**:

404 - Item Not Found:
```json
{
  "success": false,
  "message": "Item Not Found in Cart"
}
```

---

### 4. Remove from Cart

**Endpoint**: `DELETE /api/users/cart/:hotelId`

**Authorization**: Required (JWT Access Token)

**Success Response** (201):
```json
{
  "success": true,
  "message": "Hotel Removed Successfully",
  "cart": [
    {
      "hotelId": "65b98765432fedcba987654",
      "quantity": 1
    }
  ]
}
```

---

### 5. Clear Cart

**Endpoint**: `DELETE /api/users/cart`

**Authorization**: Required (JWT Access Token)

**Success Response** (200):
```json
{
  "success": true,
  "message": "Cart Cleared Successfully",
  "cart": []
}
```

---

## 🗑️ Account Deletion

### 1. Request Account Deletion

**Endpoint**: `POST /api/users/delete-account`

**Authorization**: Required (JWT Access Token)

**Description**: Soft delete user account (30-day grace period)

**Request Body**:
```json
{
  "password": "CurrentPass123!",
  "reason": "No longer using the service",
  "feedback": "The app was great but I'm moving abroad"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Account deletion requested. Your account will be permanently deleted after 30 days. You can cancel this request by logging in before then.",
  "deletionDate": "2026-03-04T10:00:00.000Z",
  "gracePeriodDays": 30
}
```

**Error Responses**:

401 - Wrong Password:
```json
{
  "success": false,
  "message": "Password verification failed"
}
```

409 - Active Bookings:
```json
{
  "success": false,
  "message": "Cannot delete account with active bookings. Please cancel or complete your bookings first.",
  "activeBookings": [
    {
      "_id": "65f12345678abcdef0123456",
      "confirmationCode": "SH-2026-1025",
      "checkIn": "2026-02-15",
      "checkOut": "2026-02-18"
    }
  ]
}
```

---

### 2. Cancel Account Deletion

**Endpoint**: `POST /api/users/cancel-deletion`

**Authorization**: Required (JWT Access Token)

**Description**: Cancel pending account deletion request

**Success Response** (200):
```json
{
  "success": true,
  "message": "Account deletion cancelled successfully. Your account remains active."
}
```

---

### 3. Get Account Status

**Endpoint**: `GET /api/users/account-status`

**Authorization**: Required (JWT Access Token)

**Success Response** (200):
```json
{
  "success": true,
  "account": {
    "isActive": true,
    "isDeletionPending": false,
    "deletionScheduledFor": null,
    "daysUntilDeletion": null
  }
}
```

**With Pending Deletion**:
```json
{
  "success": true,
  "account": {
    "isActive": true,
    "isDeletionPending": true,
    "deletionScheduledFor": "2026-03-04T10:00:00.000Z",
    "daysUntilDeletion": 25
  }
}
```

---

## 📚 Related Documents

- [API Overview](./api-overview.md)
- [Authentication APIs](./authentication-apis.md)
- [Notification APIs](./notification-apis.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive user management APIs
