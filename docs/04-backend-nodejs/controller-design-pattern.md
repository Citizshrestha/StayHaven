# Controller Design Pattern

> Comprehensive guide to controller implementation, business logic organization, and request handling in StayHaven

---

## 📋 Table of Contents

1. [Controller Architecture](#controller-architecture)
2. [Controller Responsibilities](#controller-responsibilities)
3. [Request Flow](#request-flow)
4. [Error Handling](#error-handling)
5. [Controller Examples](#controller-examples)
6. [Best Practices](#best-practices)

---

## 🏗️ Controller Architecture

### What is a Controller?

Controllers are the **business logic layer** between routes and models. They:
- Receive HTTP requests from routes
- Validate and process data
- Interact with database models
- Format and send responses

### Controller Structure

```javascript
// controllers/resourceController.js
import { Model } from '../models/resource.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Get all resources
export const getResources = asyncHandler(async (req, res) => {
  // 1. Extract query parameters
  // 2. Build database query
  // 3. Execute query
  // 4. Format response
  // 5. Send response
});

// Get single resource
export const getResource = asyncHandler(async (req, res) => {
  // Implementation
});

// Create resource
export const createResource = asyncHandler(async (req, res) => {
  // Implementation
});

// Update resource
export const updateResource = asyncHandler(async (req, res) => {
  // Implementation
});

// Delete resource
export const deleteResource = asyncHandler(async (req, res) => {
  // Implementation
});
```

---

## 📦 Controller Responsibilities

### 1. Request Validation

```javascript
export const createHotel = asyncHandler(async (req, res) => {
  const { name, description, location, starRating } = req.body;

  // Validate required fields
  if (!name || !description || !location) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields"
    });
  }

  // Validate data format
  if (starRating < 1 || starRating > 5) {
    return res.status(400).json({
      success: false,
      message: "Star rating must be between 1 and 5"
    });
  }

  // Continue with business logic...
});
```

### 2. Business Logic Execution

```javascript
export const createOrder = asyncHandler(async (req, res) => {
  const { hotel, items, orderType, roomNumber } = req.body;

  // 1. Validate hotel exists
  const hotelDoc = await Hotel.findById(hotel);
  if (!hotelDoc) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found"
    });
  }

  // 2. Validate menu items
  const validatedItems = [];
  let totalPrice = 0;

  for (const item of items) {
    if (item.menuItem) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: `Menu item ${item.menuItem} not found`
        });
      }
      validatedItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price,
        subtotal: menuItem.price * item.quantity
      });
      totalPrice += menuItem.price * item.quantity;
    }
  }

  // 3. Create order
  const order = await Order.create({
    hotel,
    orderType,
    roomNumber,
    items: validatedItems,
    totalPrice,
    orderBy: req.user._id,
    status: 'pending'
  });

  // 4. Emit real-time event
  const io = getIO();
  io.to(`hotel-${hotel}`).emit('new-order', {
    order,
    message: `New order #${order.orderNumber} created`
  });

  // 5. Send response
  res.status(201).json({
    success: true,
    message: "Order created successfully",
    order
  });
});
```

### 3. Data Transformation

```javascript
export const getHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find()
    .populate('owner', 'fullname email')
    .populate('company', 'name logo');

  // Transform data for client
  const transformedHotels = hotels.map(hotel => ({
    _id: hotel._id,
    name: hotel.name,
    location: hotel.location,
    rating: hotel.rating || 0,
    reviewCount: hotel.reviews?.length || 0,
    mainImage: hotel.images?.[0] || null,
    priceRange: {
      min: hotel.priceRange?.min,
      max: hotel.priceRange?.max,
      currency: hotel.priceRange?.currency || 'USD'
    },
    owner: {
      name: hotel.owner.fullname,
      email: hotel.owner.email
    }
  }));

  res.json({
    success: true,
    hotels: transformedHotels,
    count: transformedHotels.length
  });
});
```

### 4. Response Formatting

```javascript
// Consistent response format
const successResponse = {
  success: true,
  message: "Operation successful",
  data: { /* response data */ }
};

const errorResponse = {
  success: false,
  message: "Error message",
  error: { /* error details */ }
};
```

---

## 🔄 Request Flow

### Complete Authentication Flow

```javascript
// authController.js
export const loginUser = asyncHandler(async (req, res) => {
  // 1. Extract credentials
  const { email, password } = req.body;

  // 2. Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  // 3. Find user
  const user = await User.findOne({ email }).populate('role');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  // 4. Verify password
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  // 5. Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // 6. Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  // 7. Set cookies
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 1000 // 1 hour
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // 8. Send response
  res.status(200).json({
    success: true,
    message: "Login successful",
    accessToken,
    user: {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role.name,
      profilePicture: user.profilePicture
    }
  });
});
```

---

## ⚠️ Error Handling

### 1. Try-Catch with asyncHandler

```javascript
import { asyncHandler } from '../utils/asyncHandler.js';

// asyncHandler automatically catches errors
export const getHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);
  
  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found"
    });
  }

  res.json({ success: true, hotel });
});
```

### 2. Manual Try-Catch

```javascript
export const updateHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found"
      });
    }

    res.json({
      success: true,
      message: "Hotel updated successfully",
      hotel
    });
  } catch (error) {
    console.error("Update hotel error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};
```

### 3. Validation Errors

```javascript
export const createBooking = asyncHandler(async (req, res) => {
  const { checkIn, checkOut, guests } = req.body;

  // Date validation
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (checkInDate < new Date()) {
    return res.status(400).json({
      success: false,
      message: "Check-in date must be in the future"
    });
  }

  if (checkOutDate <= checkInDate) {
    return res.status(400).json({
      success: false,
      message: "Check-out date must be after check-in date"
    });
  }

  // Guest validation
  if (guests.adults < 1 || guests.adults > 10) {
    return res.status(400).json({
      success: false,
      message: "Number of adults must be between 1 and 10"
    });
  }

  // Continue with booking creation...
});
```

---

## 📝 Controller Examples

### Complete CRUD Controller

```javascript
// controllers/hotelController.js
import { Hotel } from '../models/hotel.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getIO } from '../config/socket.js';

// @desc    Get all hotels with filtering
// @route   GET /api/hotels
// @access  Public
export const getHotels = asyncHandler(async (req, res) => {
  const {
    location,
    category,
    minPrice,
    maxPrice,
    starRating,
    amenities,
    page = 1,
    limit = 20
  } = req.query;

  // Build query
  const query = { isActive: true, status: 'approved' };

  if (location) query.location = new RegExp(location, 'i');
  if (category) query.category = category;
  if (starRating) query.starRating = { $gte: parseInt(starRating) };
  
  if (minPrice || maxPrice) {
    query['priceRange.min'] = {};
    if (minPrice) query['priceRange.min'].$gte = parseInt(minPrice);
    if (maxPrice) query['priceRange.max'] = { $lte: parseInt(maxPrice) };
  }

  if (amenities) {
    const amenitiesArray = amenities.split(',');
    query.amenities = { $all: amenitiesArray };
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const hotels = await Hotel.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('owner', 'fullname email')
    .populate('company', 'name logo');

  const total = await Hotel.countDocuments(query);

  res.json({
    success: true,
    hotels,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalHotels: total,
      limit: parseInt(limit)
    }
  });
});

// @desc    Get single hotel
// @route   GET /api/hotels/:id
// @access  Public
export const getHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id)
    .populate('owner', 'fullname email phone')
    .populate('company', 'name logo')
    .populate('rooms');

  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found"
    });
  }

  res.json({ success: true, hotel });
});

// @desc    Create hotel
// @route   POST /api/hotels
// @access  Private (Hotel Owner)
export const createHotel = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    location,
    category,
    starRating,
    priceRange,
    images,
    amenities
  } = req.body;

  // Validate required fields
  if (!name || !description || !location) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields"
    });
  }

  // Check for duplicate
  const existingHotel = await Hotel.findOne({
    name,
    owner: req.user._id
  });

  if (existingHotel) {
    return res.status(400).json({
      success: false,
      message: "You already have a hotel with this name"
    });
  }

  // Create hotel
  const hotel = await Hotel.create({
    name,
    description,
    location,
    category,
    starRating,
    priceRange,
    images,
    amenities,
    owner: req.user._id,
    company: req.user.company,
    status: 'pending' // Requires admin approval
  });

  res.status(201).json({
    success: true,
    message: "Hotel created successfully and sent for approval",
    hotel
  });
});

// @desc    Update hotel
// @route   PUT /api/hotels/:id
// @access  Private (Hotel Owner)
export const updateHotel = asyncHandler(async (req, res) => {
  let hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found"
    });
  }

  // Check ownership
  if (hotel.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this hotel"
    });
  }

  // Update hotel
  hotel = await Hotel.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: "Hotel updated successfully",
    hotel
  });
});

// @desc    Delete hotel
// @route   DELETE /api/hotels/:id
// @access  Private (Hotel Owner)
export const deleteHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found"
    });
  }

  // Check ownership
  if (hotel.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this hotel"
    });
  }

  await hotel.deleteOne();

  res.json({
    success: true,
    message: "Hotel deleted successfully"
  });
});
```

---

## ✅ Best Practices

### 1. **Use asyncHandler for Async Functions**

```javascript
// Good
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json({ success: true, users });
});

// Avoid (manual try-catch everywhere)
export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

### 2. **Consistent Response Format**

```javascript
// Success response
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}

// Error response
{
  "success": false,
  "message": "Error description"
}
```

### 3. **Early Returns for Errors**

```javascript
// Good - early return
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  // Continue with update...
});

// Avoid - nested if statements
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (user) {
    // Update logic...
  } else {
    res.status(404).json({
      success: false,
      message: "User not found"
    });
  }
});
```

### 4. **Validate Input First**

```javascript
export const createHotel = asyncHandler(async (req, res) => {
  // Validate first
  if (!req.body.name || !req.body.location) {
    return res.status(400).json({
      success: false,
      message: "Name and location are required"
    });
  }

  // Then proceed with business logic
  const hotel = await Hotel.create(req.body);
  res.status(201).json({ success: true, hotel });
});
```

### 5. **Populate Selectively**

```javascript
// Good - populate only needed fields
const user = await User.findById(id)
  .populate('role', 'name permissions')
  .populate('company', 'name logo');

// Avoid - populate everything
const user = await User.findById(id)
  .populate('role')
  .populate('company');
```

### 6. **Use Pagination**

```javascript
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
const skip = (page - 1) * limit;

const results = await Model.find()
  .skip(skip)
  .limit(limit);

const total = await Model.countDocuments();

res.json({
  success: true,
  data: results,
  pagination: {
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    total
  }
});
```

---

## 📚 Related Documents

- [Backend Overview](./backend-overview.md)
- [Middleware Design](./middleware-design.md)
- [Routing Strategy](./routing-strategy.md)
- [Mongoose Schema Design](./mongoose-schema-design.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive controller design pattern guide
