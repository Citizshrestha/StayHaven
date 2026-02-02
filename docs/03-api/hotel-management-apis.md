# Hotel Management APIs

> Comprehensive documentation for hotel and property management endpoints

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Hotel CRUD Operations](#hotel-crud-operations)
3. [Room Management](#room-management)
4. [Menu Management](#menu-management)
5. [Staff Assignment](#staff-assignment)
6. [Analytics and Reports](#analytics-and-reports)
7. [Image Management](#image-management)
8. [Approval Workflow](#approval-workflow)

---

## 🏨 Overview

### Base URL

```
Production: https://api.stayhaven.com/api/hotels
Development: http://localhost:5000/api/hotels
```

### Authentication

All endpoints require authentication unless marked as Public.

**Authorization Header**:

```
Authorization: Bearer <accessToken>
```

### Role-Based Access

| Operation | Guest | Owner | Manager | Admin |
|-----------|-------|-------|---------|-------|
| View hotels (public) | ✅ | ✅ | ✅ | ✅ |
| View hotel details | ✅ | ✅ | ✅ | ✅ |
| Create hotel | ❌ | ✅ | ❌ | ❌ |
| Update hotel | ❌ | ✅ | ✅ | ❌ |
| Delete hotel | ❌ | ✅ | ❌ | ✅ |
| Approve hotel | ❌ | ❌ | ❌ | ✅ |
| Feature hotel | ❌ | ❌ | ❌ | ✅ |

---

## 🏨 Hotel CRUD Operations

### 1. Get All Hotels (Public)

Retrieve list of all approved hotels with filtering and pagination.

**Endpoint**: `GET /api/hotels`

**Authentication**: None (Public)

**Query Parameters**:

```typescript
{
  page?: number,           // Page number (default: 1)
  limit?: number,          // Items per page (default: 12, max: 50)
  search?: string,         // Search in name, description, location
  category?: string,       // Filter by category
  city?: string,           // Filter by city
  minPrice?: number,       // Minimum price range
  maxPrice?: number,       // Maximum price range
  starRating?: number,     // Filter by star rating (1-5)
  amenities?: string[],    // Filter by amenities (comma-separated)
  sortBy?: string,         // Sort field: 'name' | 'price' | 'rating' | 'createdAt'
  sortOrder?: string,      // Sort order: 'asc' | 'desc'
  status?: string,         // Filter by status (admin only)
  featured?: boolean       // Show only featured hotels
}
```

**Request Example**:

```bash
curl -X GET "http://localhost:5000/api/hotels?city=Kathmandu&starRating=4&page=1&limit=12&sortBy=rating&sortOrder=desc"
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "data": {
    "hotels": [
      {
        "_id": "65a12345678abcdef012345",
        "name": "Hotel Paradise Kathmandu",
        "description": "Luxury hotel in the heart of Kathmandu with stunning mountain views",
        "location": {
          "address": "Thamel, Kathmandu",
          "city": "Kathmandu",
          "state": "Bagmati",
          "country": "Nepal",
          "coordinates": {
            "latitude": 27.7172,
            "longitude": 85.3240
          },
          "zipCode": "44600"
        },
        "category": "luxury",
        "starRating": 4,
        "priceRange": {
          "min": 5000,
          "max": 15000,
          "currency": "NPR"
        },
        "images": [
          "https://res.cloudinary.com/stayhaven/image/upload/v1707216000/hotels/hotel1-main.jpg",
          "https://res.cloudinary.com/stayhaven/image/upload/v1707216001/hotels/hotel1-lobby.jpg",
          "https://res.cloudinary.com/stayhaven/image/upload/v1707216002/hotels/hotel1-room.jpg"
        ],
        "amenities": [
          "wifi",
          "parking",
          "restaurant",
          "gym",
          "spa",
          "pool",
          "conference-room"
        ],
        "contact": {
          "phone": "+977-1-1234567",
          "email": "info@paradisehotel.com",
          "website": "https://paradisehotel.com"
        },
        "status": "approved",
        "featured": true,
        "averageRating": 4.5,
        "totalReviews": 128,
        "totalRooms": 50,
        "availableRooms": 15,
        "company": {
          "_id": "65b98765432fedcba987654",
          "name": "Paradise Hotels Group"
        },
        "createdAt": "2026-01-15T10:30:00.000Z",
        "updatedAt": "2026-02-01T14:20:00.000Z"
      },
      // ... more hotels
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalHotels": 58,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 12
    },
    "filters": {
      "appliedFilters": {
        "city": "Kathmandu",
        "starRating": 4
      },
      "availableCategories": ["luxury", "budget", "boutique", "resort"],
      "availableCities": ["Kathmandu", "Pokhara", "Chitwan", "Lumbini"],
      "priceRange": {
        "min": 1500,
        "max": 25000
      }
    }
  }
}
```

**Filtering Examples**:

1. **Search by Name/Description**:

```bash
GET /api/hotels?search=mountain%20view
```

1. **Filter by Multiple Amenities**:

```bash
GET /api/hotels?amenities=wifi,parking,pool
```

1. **Price Range + City**:

```bash
GET /api/hotels?city=Pokhara&minPrice=3000&maxPrice=8000
```

1. **Featured Hotels Only**:

```bash
GET /api/hotels?featured=true&limit=6
```

1. **Sort by Rating (Highest First)**:

```bash
GET /api/hotels?sortBy=rating&sortOrder=desc
```

**Database Query Implementation**:

```javascript
// Backend: controllers/hotelController.js
export const getAllHotels = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    search,
    category,
    city,
    minPrice,
    maxPrice,
    starRating,
    amenities,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    status = 'approved',
    featured
  } = req.query;

  // Build query
  const query = { status };

  // Search
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { 'location.city': { $regex: search, $options: 'i' } }
    ];
  }

  // Category filter
  if (category) {
    query.category = category;
  }

  // City filter
  if (city) {
    query['location.city'] = city;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query.priceRange = {};
    if (minPrice) query.priceRange.min = { $gte: Number(minPrice) };
    if (maxPrice) query.priceRange.max = { $lte: Number(maxPrice) };
  }

  // Star rating filter
  if (starRating) {
    query.starRating = Number(starRating);
  }

  // Amenities filter
  if (amenities) {
    const amenitiesArray = amenities.split(',');
    query.amenities = { $all: amenitiesArray };
  }

  // Featured filter
  if (featured === 'true') {
    query.featured = true;
  }

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);

  // Sort
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query
  const hotels = await Hotel.find(query)
    .populate('company', 'name')
    .sort(sort)
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // Count total
  const total = await Hotel.countDocuments(query);

  res.json({
    success: true,
    data: {
      hotels,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalHotels: total,
        hasNextPage: skip + hotels.length < total,
        hasPrevPage: Number(page) > 1,
        limit: Number(limit)
      }
    }
  });
});
```

---

### 2. Get Hotel by ID

Retrieve detailed information about a specific hotel.

**Endpoint**: `GET /api/hotels/:hotelId`

**Authentication**: None (Public)

**Path Parameters**:

```typescript
{
  hotelId: string  // MongoDB ObjectId
}
```

**Request Example**:

```bash
curl -X GET "http://localhost:5000/api/hotels/65a12345678abcdef012345"
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "data": {
    "_id": "65a12345678abcdef012345",
    "name": "Hotel Paradise Kathmandu",
    "description": "Luxury hotel in the heart of Kathmandu with stunning mountain views and world-class amenities",
    "location": {
      "address": "Thamel, Ward No. 26",
      "city": "Kathmandu",
      "state": "Bagmati",
      "country": "Nepal",
      "coordinates": {
        "latitude": 27.7172,
        "longitude": 85.3240
      },
      "zipCode": "44600",
      "landmark": "Near Garden of Dreams"
    },
    "category": "luxury",
    "starRating": 4,
    "priceRange": {
      "min": 5000,
      "max": 15000,
      "currency": "NPR"
    },
    "images": [
      "https://res.cloudinary.com/stayhaven/image/upload/v1707216000/hotels/hotel1-main.jpg",
      "https://res.cloudinary.com/stayhaven/image/upload/v1707216001/hotels/hotel1-lobby.jpg",
      "https://res.cloudinary.com/stayhaven/image/upload/v1707216002/hotels/hotel1-room.jpg",
      "https://res.cloudinary.com/stayhaven/image/upload/v1707216003/hotels/hotel1-restaurant.jpg",
      "https://res.cloudinary.com/stayhaven/image/upload/v1707216004/hotels/hotel1-pool.jpg"
    ],
    "amenities": [
      "wifi",
      "parking",
      "restaurant",
      "gym",
      "spa",
      "pool",
      "conference-room",
      "laundry",
      "room-service",
      "concierge",
      "airport-shuttle"
    ],
    "contact": {
      "phone": "+977-1-1234567",
      "email": "info@paradisehotel.com",
      "website": "https://paradisehotel.com",
      "socialMedia": {
        "facebook": "https://facebook.com/paradisehotel",
        "instagram": "@paradisehotel"
      }
    },
    "policies": {
      "checkInTime": "14:00",
      "checkOutTime": "12:00",
      "cancellationPolicy": "Free cancellation up to 24 hours before check-in. After that, 50% of booking amount will be charged.",
      "childPolicy": "Children under 5 stay free. Extra bed available for NPR 1000/night.",
      "petPolicy": "Pets not allowed",
      "smokingPolicy": "Non-smoking property. Smoking area available on terrace."
    },
    "status": "approved",
    "featured": true,
    "averageRating": 4.5,
    "totalReviews": 128,
    "company": {
      "_id": "65b98765432fedcba987654",
      "name": "Paradise Hotels Group",
      "logo": "https://res.cloudinary.com/.../logo.png"
    },
    "rooms": [
      {
        "_id": "65c11111222233334444555",
        "type": "deluxe",
        "name": "Deluxe Room",
        "price": 5000,
        "capacity": 2,
        "available": 5,
        "total": 20,
        "images": ["https://..."],
        "amenities": ["wifi", "tv", "ac", "minibar"]
      },
      {
        "_id": "65c11111222233334444666",
        "type": "suite",
        "name": "Executive Suite",
        "price": 12000,
        "capacity": 4,
        "available": 2,
        "total": 10,
        "images": ["https://..."],
        "amenities": ["wifi", "tv", "ac", "minibar", "jacuzzi", "balcony"]
      }
    ],
    "menu": [
      {
        "_id": "65d22222333344445555666",
        "name": "Chicken Tikka Masala",
        "category": "main-course",
        "price": 650,
        "image": "https://...",
        "available": true
      }
    ],
    "nearbyAttractions": [
      {
        "name": "Garden of Dreams",
        "distance": "0.5 km",
        "type": "park"
      },
      {
        "name": "Kathmandu Durbar Square",
        "distance": "2 km",
        "type": "heritage"
      }
    ],
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-02-01T14:20:00.000Z"
  }
}
```

**Error Response - Not Found (404)**:

```json
{
  "success": false,
  "message": "Hotel not found"
}
```

**Error Response - Invalid ID (400)**:

```json
{
  "success": false,
  "message": "Invalid hotel ID format"
}
```

---

### 3. Create Hotel

Create a new hotel listing (Owner only).

**Endpoint**: `POST /api/hotels`

**Authentication**: Required (Owner role)

**Request Headers**:

```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data)**:

```typescript
{
  // Basic Information
  name: string,              // Required, 3-100 chars, unique per company
  description: string,       // Required, 50-2000 chars
  category: string,          // Required: 'luxury' | 'budget' | 'boutique' | 'resort' | 'hostel'
  starRating: number,        // Required: 1-5
  
  // Location
  'location.address': string,      // Required
  'location.city': string,         // Required
  'location.state': string,        // Required
  'location.country': string,      // Required, default: 'Nepal'
  'location.zipCode': string,      // Required
  'location.coordinates.latitude': number,   // Optional
  'location.coordinates.longitude': number,  // Optional
  'location.landmark': string,     // Optional
  
  // Price Range
  'priceRange.min': number,        // Required, min: 0
  'priceRange.max': number,        // Required, must be > min
  'priceRange.currency': string,   // Default: 'NPR'
  
  // Contact
  'contact.phone': string,         // Required, E.164 format
  'contact.email': string,         // Required, valid email
  'contact.website': string,       // Optional, valid URL
  
  // Amenities
  amenities: string[],             // Array of amenity codes
  
  // Images
  images: File[],                  // Required, min 3, max 10, each < 5MB
  
  // Policies
  'policies.checkInTime': string,      // Required, HH:mm format
  'policies.checkOutTime': string,     // Required, HH:mm format
  'policies.cancellationPolicy': string, // Required
  'policies.childPolicy': string,      // Optional
  'policies.petPolicy': string,        // Optional
  'policies.smokingPolicy': string     // Optional
}
```

**Request Example (Using FormData)**:

```javascript
// Frontend: JavaScript FormData example

const formData = new FormData();

// Basic info
formData.append('name', 'Hotel Paradise Kathmandu');
formData.append('description', 'Luxury hotel in the heart of Kathmandu...');
formData.append('category', 'luxury');
formData.append('starRating', '4');

// Location
formData.append('location.address', 'Thamel, Ward No. 26');
formData.append('location.city', 'Kathmandu');
formData.append('location.state', 'Bagmati');
formData.append('location.country', 'Nepal');
formData.append('location.zipCode', '44600');
formData.append('location.coordinates.latitude', '27.7172');
formData.append('location.coordinates.longitude', '85.3240');

// Price range
formData.append('priceRange.min', '5000');
formData.append('priceRange.max', '15000');
formData.append('priceRange.currency', 'NPR');

// Contact
formData.append('contact.phone', '+977-1-1234567');
formData.append('contact.email', 'info@paradisehotel.com');
formData.append('contact.website', 'https://paradisehotel.com');

// Amenities (multiple values)
const amenities = ['wifi', 'parking', 'restaurant', 'gym', 'spa', 'pool'];
amenities.forEach(amenity => {
  formData.append('amenities[]', amenity);
});

// Images (multiple files)
const imageFiles = document.getElementById('imageInput').files;
for (let i = 0; i < imageFiles.length; i++) {
  formData.append('images', imageFiles[i]);
}

// Policies
formData.append('policies.checkInTime', '14:00');
formData.append('policies.checkOutTime', '12:00');
formData.append('policies.cancellationPolicy', 'Free cancellation up to 24 hours before check-in');

// Send request
axios.post('/api/hotels', formData, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'multipart/form-data'
  }
})
.then(response => console.log(response.data))
.catch(error => console.error(error.response.data));
```

**cURL Example**:

```bash
curl -X POST "http://localhost:5000/api/hotels" \
  -H "Authorization: Bearer eyJhbGc..." \
  -F "name=Hotel Paradise Kathmandu" \
  -F "description=Luxury hotel in the heart of Kathmandu with stunning mountain views" \
  -F "category=luxury" \
  -F "starRating=4" \
  -F "location.address=Thamel, Ward No. 26" \
  -F "location.city=Kathmandu" \
  -F "location.state=Bagmati" \
  -F "location.country=Nepal" \
  -F "location.zipCode=44600" \
  -F "priceRange.min=5000" \
  -F "priceRange.max=15000" \
  -F "contact.phone=+977-1-1234567" \
  -F "contact.email=info@paradisehotel.com" \
  -F "amenities[]=wifi" \
  -F "amenities[]=parking" \
  -F "amenities[]=restaurant" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  -F "images=@/path/to/image3.jpg" \
  -F "policies.checkInTime=14:00" \
  -F "policies.checkOutTime=12:00" \
  -F "policies.cancellationPolicy=Free cancellation up to 24 hours"
```

**Response - Success (201 Created)**:

```json
{
  "success": true,
  "message": "Hotel created successfully. It will be visible after admin approval.",
  "data": {
    "_id": "65a12345678abcdef012345",
    "name": "Hotel Paradise Kathmandu",
    "description": "Luxury hotel in the heart of Kathmandu...",
    "status": "pending",
    "images": [
      "https://res.cloudinary.com/stayhaven/image/upload/v1707216000/hotels/65a12345_0.jpg",
      "https://res.cloudinary.com/stayhaven/image/upload/v1707216001/hotels/65a12345_1.jpg",
      "https://res.cloudinary.com/stayhaven/image/upload/v1707216002/hotels/65a12345_2.jpg"
    ],
    "company": {
      "_id": "65b98765432fedcba987654",
      "name": "Paradise Hotels Group"
    },
    "createdAt": "2026-02-02T10:30:00.000Z"
  }
}
```

**Error Response - Validation Error (400)**:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Hotel name must be between 3 and 100 characters"
    },
    {
      "field": "images",
      "message": "At least 3 images are required"
    },
    {
      "field": "priceRange.max",
      "message": "Maximum price must be greater than minimum price"
    }
  ]
}
```

**Error Response - Duplicate Hotel Name (409)**:

```json
{
  "success": false,
  "message": "A hotel with this name already exists in your company"
}
```

**Error Response - Image Upload Failed (500)**:

```json
{
  "success": false,
  "message": "Failed to upload images to cloud storage"
}
```

**Image Upload Specifications**:

- **Formats**: JPEG, PNG, WebP
- **Max Size**: 5MB per image
- **Min Dimensions**: 800x600 pixels
- **Max Dimensions**: 4000x3000 pixels
- **Min Images**: 3
- **Max Images**: 10
- **Compression**: Automatic quality optimization
- **CDN**: Cloudinary with automatic format conversion

**Validation Rules**:

| Field | Validation | Error Message |
|-------|-----------|---------------|
| name | Required, 3-100 chars, unique | "Hotel name is required" |
| description | Required, 50-2000 chars | "Description must be between 50-2000 characters" |
| category | Required, valid enum | "Invalid category" |
| starRating | Required, 1-5 | "Star rating must be between 1 and 5" |
| location.city | Required | "City is required" |
| priceRange.min | Required, >= 0 | "Minimum price must be >= 0" |
| priceRange.max | Required, > min | "Max price must be greater than min price" |
| contact.phone | Required, E.164 format | "Invalid phone number format" |
| contact.email | Required, valid email | "Invalid email address" |
| images | Min 3, max 10 | "At least 3 images required" |
| amenities | Array of valid codes | "Invalid amenity code" |

**Business Logic**:

1. Validate owner has a company
2. Check company is active
3. Validate hotel name unique within company
4. Upload images to Cloudinary
5. Set initial status to 'pending'
6. Increment company's totalProperties count
7. Send notification to admin for approval
8. Return hotel with pending status

**Side Effects**:

- Images uploaded to Cloudinary
- Company totalProperties incremented
- Admin notification created
- Email sent to admin queue

---

### 4. Update Hotel

Update existing hotel information (Owner/Manager).

**Endpoint**: `PUT /api/hotels/:hotelId`

**Authentication**: Required (Owner or Manager)

**Authorization**:

- Owner: Can update own company's hotels
- Manager: Can update assigned hotel only

**Path Parameters**:

```typescript
{
  hotelId: string  // MongoDB ObjectId
}
```

**Request Body (multipart/form-data)**:

All fields optional (partial update supported):

```typescript
{
  name?: string,
  description?: string,
  category?: string,
  starRating?: number,
  'location.address'?: string,
  'location.city'?: string,
  // ... other fields from create
  images?: File[],           // New images to add
  removeImages?: string[],   // Cloudinary URLs to remove
  amenities?: string[]       // Complete replacement
}
```

**Request Example**:

```bash
curl -X PUT "http://localhost:5000/api/hotels/65a12345678abcdef012345" \
  -H "Authorization: Bearer eyJhbGc..." \
  -F "description=Updated description with new amenities and services" \
  -F "priceRange.min=6000" \
  -F "priceRange.max=18000" \
  -F "amenities[]=wifi" \
  -F "amenities[]=parking" \
  -F "amenities[]=restaurant" \
  -F "amenities[]=gym" \
  -F "images=@/path/to/new-image.jpg" \
  -F "removeImages[]=https://res.cloudinary.com/.../old-image.jpg"
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "message": "Hotel updated successfully",
  "data": {
    "_id": "65a12345678abcdef012345",
    "name": "Hotel Paradise Kathmandu",
    "description": "Updated description with new amenities and services",
    "priceRange": {
      "min": 6000,
      "max": 18000,
      "currency": "NPR"
    },
    "images": [
      "https://res.cloudinary.com/.../image1.jpg",
      "https://res.cloudinary.com/.../image2.jpg",
      "https://res.cloudinary.com/.../new-image.jpg"
    ],
    "amenities": ["wifi", "parking", "restaurant", "gym"],
    "updatedAt": "2026-02-02T11:45:00.000Z"
  }
}
```

**Error Response - Forbidden (403)**:

```json
{
  "success": false,
  "message": "You don't have permission to update this hotel"
}
```

**Image Management**:

- **Add New Images**: Upload in `images` field
- **Remove Old Images**: Provide URLs in `removeImages` array
- **Limit**: Total images after update must be 3-10
- **Cloudinary Cleanup**: Old images deleted from CDN

**Business Logic**:

1. Verify user ownership or assignment
2. Validate partial update fields
3. Handle image additions/removals
4. Delete removed images from Cloudinary
5. Upload new images
6. Update hotel document
7. If name changed, check uniqueness

**Note**: Critical changes (name, location) may trigger re-approval by admin.

---

### 5. Delete Hotel

Delete hotel listing (Owner/Admin only).

**Endpoint**: `DELETE /api/hotels/:hotelId`

**Authentication**: Required (Owner or Admin)

**Authorization**:

- Owner: Can delete own company's hotels
- Admin: Can delete any hotel

**Path Parameters**:

```typescript
{
  hotelId: string  // MongoDB ObjectId
}
```

**Request Example**:

```bash
curl -X DELETE "http://localhost:5000/api/hotels/65a12345678abcdef012345" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "message": "Hotel deleted successfully"
}
```

**Error Response - Has Active Bookings (400)**:

```json
{
  "success": false,
  "message": "Cannot delete hotel with active bookings. Please cancel all bookings first.",
  "details": {
    "activeBookings": 5,
    "upcomingBookings": 3
  }
}
```

**Error Response - Forbidden (403)**:

```json
{
  "success": false,
  "message": "You don't have permission to delete this hotel"
}
```

**Deletion Logic**:

1. Check for active bookings (status: confirmed, ongoing)
2. If active bookings exist: Reject deletion
3. Delete all associated data:
   - All rooms
   - All menu items
   - Past bookings (soft delete)
   - Past orders (archive)
   - Staff assignments (remove hotel from assignedProperties)
   - Reviews
   - Images from Cloudinary
4. Decrement company's totalProperties
5. Log deletion event

**Soft Delete Option**:
For hotels with historical data, consider setting `status: 'deleted'` instead of hard delete.

---

## 🛏️ Room Management

### 1. Get Hotel Rooms

Retrieve all rooms for a specific hotel.

**Endpoint**: `GET /api/hotels/:hotelId/rooms`

**Authentication**: None (Public)

**Query Parameters**:

```typescript
{
  type?: string,        // Filter by room type
  minPrice?: number,
  maxPrice?: number,
  capacity?: number,    // Min capacity
  available?: boolean   // Only available rooms
}
```

**Request Example**:

```bash
curl -X GET "http://localhost:5000/api/hotels/65a12345678abcdef012345/rooms?available=true&capacity=2"
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "65c11111222233334444555",
      "hotel": "65a12345678abcdef012345",
      "roomNumber": "101",
      "type": "deluxe",
      "name": "Deluxe Room",
      "description": "Spacious room with king-size bed and mountain view",
      "price": 5000,
      "capacity": {
        "adults": 2,
        "children": 1,
        "total": 3
      },
      "bedConfiguration": {
        "type": "king",
        "count": 1
      },
      "size": {
        "value": 30,
        "unit": "sqm"
      },
      "images": [
        "https://res.cloudinary.com/.../room101-1.jpg",
        "https://res.cloudinary.com/.../room101-2.jpg"
      ],
      "amenities": [
        "wifi",
        "tv",
        "ac",
        "minibar",
        "safe",
        "balcony"
      ],
      "view": "mountain",
      "floor": 1,
      "available": true,
      "status": "clean",
      "createdAt": "2026-01-20T10:00:00.000Z"
    },
    // ... more rooms
  ]
}
```

**Room Status Values**:

- `clean`: Ready for guest
- `dirty`: Needs housekeeping
- `maintenance`: Under repair
- `occupied`: Currently in use

---

### 2. Create Room

Add new room to hotel (Owner/Manager).

**Endpoint**: `POST /api/hotels/:hotelId/rooms`

**Authentication**: Required (Owner or Manager)

**Request Body**:

```typescript
{
  roomNumber: string,      // Required, unique per hotel
  type: string,            // Required: 'standard' | 'deluxe' | 'suite' | 'penthouse'
  name: string,            // Required
  description: string,     // Required
  price: number,           // Required, per night
  capacity: {
    adults: number,        // Required
    children: number,      // Optional, default: 0
    total: number          // Auto-calculated
  },
  bedConfiguration: {
    type: string,          // 'single' | 'double' | 'queen' | 'king'
    count: number
  },
  size: {
    value: number,
    unit: string           // 'sqm' | 'sqft'
  },
  images: File[],          // Min 2, max 5
  amenities: string[],
  view?: string,           // 'garden' | 'mountain' | 'city' | 'pool'
  floor?: number
}
```

**Response - Success (201 Created)**:

```json
{
  "success": true,
  "message": "Room created successfully",
  "data": {
    "_id": "65c11111222233334444555",
    "roomNumber": "101",
    "type": "deluxe",
    "available": true,
    "status": "clean"
  }
}
```

---

## 🍽️ Menu Management

### 1. Get Hotel Menu

Retrieve menu items for a hotel.

**Endpoint**: `GET /api/hotels/:hotelId/menu`

**Authentication**: None (Public for guests)

**Query Parameters**:

```typescript
{
  category?: string,    // Filter: 'appetizer' | 'main-course' | 'dessert' | 'beverage'
  available?: boolean   // Only available items
}
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "65d22222333344445555666",
      "hotel": "65a12345678abcdef012345",
      "name": "Chicken Tikka Masala",
      "description": "Tender chicken in creamy tomato sauce",
      "category": "main-course",
      "price": 650,
      "currency": "NPR",
      "image": "https://res.cloudinary.com/.../tikka-masala.jpg",
      "dietary": ["gluten-free"],
      "spiceLevel": "medium",
      "preparationTime": 20,
      "available": true,
      "popular": true,
      "createdAt": "2026-01-25T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Create Menu Item

Add new item to hotel menu (Owner/Manager/Chef).

**Endpoint**: `POST /api/hotels/:hotelId/menu`

**Authentication**: Required

**Request Body**:

```typescript
{
  name: string,
  description: string,
  category: string,
  price: number,
  image?: File,
  dietary?: string[],      // ['vegetarian', 'vegan', 'gluten-free']
  spiceLevel?: string,     // 'mild' | 'medium' | 'hot'
  preparationTime?: number, // minutes
  available?: boolean
}
```

**Response - Success (201 Created)**:

```json
{
  "success": true,
  "message": "Menu item added successfully",
  "data": {
    "_id": "65d22222333344445555666",
    "name": "Chicken Tikka Masala",
    "available": true
  }
}
```

---

## 👥 Staff Assignment

### 1. Assign Staff to Hotel

Assign staff member to specific hotel (Owner only).

**Endpoint**: `POST /api/hotels/:hotelId/staff/assign`

**Authentication**: Required (Owner)

**Request Body**:

```typescript
{
  staffId: string,          // User ID of staff member
  role: string,             // 'manager' | 'receptionist' | 'chief' | 'waiter'
  permissions?: string[]    // Optional: custom permissions
}
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "message": "Staff assigned successfully",
  "data": {
    "staffId": "65e98765432fedcba987654",
    "hotelId": "65a12345678abcdef012345",
    "role": "manager"
  }
}
```

---

## 📊 Analytics and Reports

### 1. Get Hotel Analytics

Retrieve analytics data for hotel (Owner/Manager).

**Endpoint**: `GET /api/hotels/:hotelId/analytics`

**Authentication**: Required (Owner or Manager)

**Query Parameters**:

```typescript
{
  startDate?: string,   // ISO date
  endDate?: string,     // ISO date
  metric?: string       // 'bookings' | 'revenue' | 'occupancy'
}
```

**Response - Success (200 OK)**:

```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2026-01-01",
      "end": "2026-02-01"
    },
    "bookings": {
      "total": 128,
      "confirmed": 115,
      "cancelled": 13,
      "revenue": 850000
    },
    "occupancy": {
      "rate": 75.5,
      "totalRooms": 50,
      "occupiedRooms": 38
    },
    "orders": {
      "total": 456,
      "revenue": 125000,
      "averageOrderValue": 274
    },
    "topRooms": [
      {
        "roomType": "deluxe",
        "bookings": 45,
        "revenue": 225000
      }
    ],
    "topMenuItems": [
      {
        "name": "Chicken Tikka Masala",
        "orders": 89,
        "revenue": 57850
      }
    ]
  }
}
```

---

## 🖼️ Image Management

### Upload Images to Cloudinary

All hotel and room images are uploaded to Cloudinary with these specifications:

**Configuration**:

```javascript
// Backend: config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload function
export const uploadHotelImage = async (file, folder = 'hotels') => {
  const result = await cloudinary.uploader.upload(file.path, {
    folder: `stayhaven/${folder}`,
    transformation: [
      { width: 1200, height: 800, crop: 'fill', quality: 'auto' },
      { fetch_format: 'auto' }
    ],
    public_id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  });
  
  return result.secure_url;
};

// Delete function
export const deleteHotelImage = async (imageUrl) => {
  const publicId = extractPublicId(imageUrl);
  await cloudinary.uploader.destroy(publicId);
};
```

**Image Transformations**:

- Thumbnail: 300x200, crop fill
- Card: 600x400, crop fill
- Detail: 1200x800, crop fill
- Full: Original size, quality auto
- Format: Auto (WebP for modern browsers, JPEG fallback)

---

## ✅ Approval Workflow

### Hotel Approval States

```
┌─────────┐    Create Hotel     ┌─────────┐
│         │──────────────────────>│         │
│  Owner  │                       │ Pending │
│         │                       │         │
└─────────┘                       └────┬────┘
                                       │
                      Admin Reviews    │
                                       │
                        ┌──────────────┴──────────────┐
                        │                             │
                   Approve                        Reject
                        │                             │
                        ▼                             ▼
                  ┌─────────┐                   ┌─────────┐
                  │         │                   │         │
                  │Approved │                   │Rejected │
                  │ (Public)│                   │(Hidden) │
                  │         │                   │         │
                  └─────────┘                   └─────────┘
```

### Approve Hotel (Admin Only)

**Endpoint**: `POST /api/hotels/:hotelId/approve`

**Authentication**: Required (Admin)

**Request Body**:

```typescript
{
  featured?: boolean,  // Mark as featured
  remarks?: string     // Optional approval message
}
```

**Response**:

```json
{
  "success": true,
  "message": "Hotel approved successfully",
  "data": {
    "_id": "65a12345678abcdef012345",
    "status": "approved",
    "featured": true
  }
}
```

### Reject Hotel (Admin Only)

**Endpoint**: `POST /api/hotels/:hotelId/reject`

**Request Body**:

```typescript
{
  reason: string  // Required: rejection reason
}
```

---

## 📚 Related Documents

- [Authentication APIs](./authentication-apis.md)
- [Booking APIs](./booking-apis.md)
- [Order and KOT APIs](./order-and-kot-apis.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive hotel management API documentation
