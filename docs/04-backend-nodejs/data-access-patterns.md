# Data Access Patterns

> Comprehensive guide to database querying, data manipulation, and MongoDB patterns with Mongoose in StayHaven

---

## 📋 Table of Contents

1. [Query Patterns](#query-patterns)
2. [CRUD Operations](#crud-operations)
3. [Population & Relationships](#population--relationships)
4. [Filtering & Pagination](#filtering--pagination)
5. [Aggregation](#aggregation)
6. [Performance Optimization](#performance-optimization)
7. [Best Practices](#best-practices)

---

## 🔍 Query Patterns

### Basic Queries

#### Find All Documents

```javascript
// Get all hotels
const hotels = await Hotel.find();

// Get active hotels only
const activeHotels = await Hotel.find({ isActive: true });

// Get hotels with conditions
const luxuryHotels = await Hotel.find({
  category: 'Hotel',
  starRating: { $gte: 4 },
  isActive: true,
});
```

#### Find Single Document

```javascript
// Find by ID
const hotel = await Hotel.findById(hotelId);

// Find by condition
const user = await User.findOne({ email: 'john@example.com' });

// Find with multiple conditions
const booking = await Booking.findOne({
  user: userId,
  hotel: hotelId,
  status: 'Confirmed',
});
```

#### Query Operators

```javascript
// Comparison
const hotels = await Hotel.find({
  'priceRange.min': { $gte: 100, $lte: 500 },  // Between 100-500
  starRating: { $in: [4, 5] },                 // 4 or 5 stars
  status: { $ne: 'rejected' },                 // Not rejected
});

// Logical
const hotels = await Hotel.find({
  $or: [
    { category: 'Hotel' },
    { category: 'Resort' }
  ],
  $and: [
    { isActive: true },
    { status: 'approved' }
  ]
});

// Regex (case-insensitive search)
const hotels = await Hotel.find({
  name: { $regex: 'luxury', $options: 'i' }
});
```

---

## 📝 CRUD Operations

### Create

#### Single Document

```javascript
// Create hotel
const hotel = await Hotel.create({
  name: "Grand Hotel",
  description: "Luxury hotel in Kathmandu",
  location: {
    city: "Kathmandu",
    address: "Thamel Street"
  },
  owner: req.user._id,
  company: req.user.company,
  category: "Hotel",
  starRating: 5,
  priceRange: { min: 100, max: 300 },
  images: ["url1", "url2"],
});
```

#### Multiple Documents

```javascript
// Bulk insert
const rooms = await Room.insertMany([
  { roomNumber: "101", type: "Single", price: 100 },
  { roomNumber: "102", type: "Double", price: 150 },
  { roomNumber: "103", type: "Suite", price: 300 },
]);
```

### Read

#### With Field Selection

```javascript
// Select specific fields
const users = await User.find()
  .select('fullname email role');

// Exclude fields
const users = await User.find()
  .select('-password -refreshToken');
```

#### With Sorting

```javascript
// Sort ascending
const hotels = await Hotel.find()
  .sort('name');

// Sort descending
const hotels = await Hotel.find()
  .sort('-rating -createdAt');

// Multiple sort fields
const hotels = await Hotel.find()
  .sort({ rating: -1, name: 1 });
```

#### With Limit

```javascript
// Get top 10 rated hotels
const topHotels = await Hotel.find()
  .sort('-rating')
  .limit(10);
```

### Update

#### Update Single Document

```javascript
// Update one
const hotel = await Hotel.findByIdAndUpdate(
  hotelId,
  { name: "New Name", isActive: true },
  { new: true, runValidators: true } // Return updated doc & validate
);

// Update with $set
const hotel = await Hotel.findByIdAndUpdate(
  hotelId,
  { $set: { 'location.city': 'Pokhara' } },
  { new: true }
);

// Increment field
const order = await Order.findByIdAndUpdate(
  orderId,
  { $inc: { totalPrice: 50 } }, // Increase by 50
  { new: true }
);
```

#### Update Multiple Documents

```javascript
// Update many
const result = await Hotel.updateMany(
  { status: 'pending' },
  { status: 'approved' }
);

console.log(`${result.modifiedCount} hotels updated`);
```

### Delete

#### Delete Single

```javascript
// Delete by ID
await Hotel.findByIdAndDelete(hotelId);

// Delete with condition
await Booking.findOneAndDelete({
  user: userId,
  status: 'Cancelled'
});
```

#### Delete Multiple

```javascript
// Delete many
const result = await Order.deleteMany({
  status: 'delivered',
  createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Older than 30 days
});

console.log(`${result.deletedCount} orders deleted`);
```

---

## 🔗 Population & Relationships

### Basic Population

```javascript
// Populate single reference
const booking = await Booking.findById(bookingId)
  .populate('user');

// Populate multiple references
const order = await Order.findById(orderId)
  .populate('hotel')
  .populate('orderBy')
  .populate('items.menuItem');
```

### Selective Population

```javascript
// Populate with field selection
const booking = await Booking.findById(bookingId)
  .populate('user', 'fullname email phone')
  .populate('hotel', 'name location contact');

// Exclude fields
const user = await User.findById(userId)
  .populate('role', '-permissions') // Exclude permissions
  .populate('company', 'name logo');
```

### Nested Population

```javascript
// Populate nested references
const hotel = await Hotel.findById(hotelId)
  .populate({
    path: 'owner',
    select: 'fullname email',
    populate: {
      path: 'company',
      select: 'name logo'
    }
  });
```

### Conditional Population

```javascript
// Populate if field exists
const user = await User.findById(userId)
  .populate({
    path: 'company',
    match: { isActive: true },
    select: 'name logo'
  });
```

---

## 🔎 Filtering & Pagination

### Query Builder Pattern

```javascript
export const getHotels = asyncHandler(async (req, res) => {
  const {
    location,
    category,
    minPrice,
    maxPrice,
    starRating,
    amenities,
    search,
    page = 1,
    limit = 20,
    sort = '-createdAt'
  } = req.query;

  // Build query
  const query = { isActive: true };

  // Location filter
  if (location) {
    query['location.city'] = { $regex: location, $options: 'i' };
  }

  // Category filter
  if (category) {
    query.category = category;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query['priceRange.min'] = {};
    if (minPrice) query['priceRange.min'].$gte = parseInt(minPrice);
    if (maxPrice) query['priceRange.max'] = { $lte: parseInt(maxPrice) };
  }

  // Star rating filter
  if (starRating) {
    query.starRating = { $gte: parseInt(starRating) };
  }

  // Amenities filter (must have all)
  if (amenities) {
    const amenitiesArray = amenities.split(',');
    query.amenities = { $all: amenitiesArray };
  }

  // Search (name or description)
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Pagination
  const skip = (page - 1) * limit;

  // Execute query
  const hotels = await Hotel.find(query)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('owner', 'fullname email')
    .select('-__v');

  // Get total count
  const total = await Hotel.countDocuments(query);

  res.json({
    success: true,
    hotels,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalHotels: total,
      limit: parseInt(limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    }
  });
});
```

---

## 📊 Aggregation

### Basic Aggregation

```javascript
// Count bookings by status
const bookingStats = await Booking.aggregate([
  {
    $group: {
      _id: '$status',
      count: { $sum: 1 },
      totalAmount: { $sum: '$totalAmount' }
    }
  }
]);

// Result: [
//   { _id: 'Confirmed', count: 150, totalAmount: 45000 },
//   { _id: 'Pending', count: 25, totalAmount: 7500 }
// ]
```

### Hotel Statistics

```javascript
export const getHotelStatistics = asyncHandler(async (req, res) => {
  const hotelId = req.params.id;

  const stats = await Order.aggregate([
    // Match orders for this hotel
    { $match: { hotel: new mongoose.Types.ObjectId(hotelId) } },
    
    // Group by status
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$totalPrice' },
        avgOrderValue: { $avg: '$totalPrice' }
      }
    },
    
    // Sort by count
    { $sort: { count: -1 } }
  ]);

  res.json({
    success: true,
    statistics: stats
  });
});
```

### Revenue by Month

```javascript
const monthlyRevenue = await Booking.aggregate([
  {
    $match: {
      hotel: new mongoose.Types.ObjectId(hotelId),
      status: 'Confirmed',
      createdAt: {
        $gte: new Date(new Date().getFullYear(), 0, 1) // This year
      }
    }
  },
  {
    $group: {
      _id: {
        month: { $month: '$createdAt' },
        year: { $year: '$createdAt' }
      },
      revenue: { $sum: '$totalAmount' },
      bookings: { $sum: 1 }
    }
  },
  { $sort: { '_id.year': 1, '_id.month': 1 } }
]);
```

---

## ⚡ Performance Optimization

### 1. **Use Indexes**

```javascript
// Single field index
userSchema.index({ email: 1 });

// Compound index
bookingSchema.index({ user: 1, status: 1 });
orderSchema.index({ hotel: 1, orderNumber: 1 }, { unique: true });

// Text index for search
hotelSchema.index({ name: 'text', description: 'text' });
```

### 2. **Use Lean Queries**

```javascript
// Good - Returns plain JavaScript objects (faster)
const hotels = await Hotel.find().lean();

// Avoid - Returns Mongoose documents (slower)
const hotels = await Hotel.find();
```

### 3. **Select Only Needed Fields**

```javascript
// Good - Only needed fields
const users = await User.find()
  .select('fullname email role');

// Avoid - All fields
const users = await User.find();
```

### 4. **Limit Results**

```javascript
// Good - Paginated
const hotels = await Hotel.find()
  .skip(skip)
  .limit(20);

// Avoid - All documents
const hotels = await Hotel.find();
```

### 5. **Use Cursor for Large Datasets**

```javascript
// Stream large results
const cursor = Hotel.find().cursor();

for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
  // Process document
  console.log(doc.name);
}
```

---

## ✅ Best Practices

### 1. **Always Handle Null Results**

```javascript
const hotel = await Hotel.findById(hotelId);

if (!hotel) {
  return res.status(404).json({
    success: false,
    message: "Hotel not found"
  });
}
```

### 2. **Use Transactions for Multiple Operations**

```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Create booking
  const booking = await Booking.create([{
    user: userId,
    hotel: hotelId,
    room: roomId,
  }], { session });

  // Update room availability
  await Room.findByIdAndUpdate(
    roomId,
    { $inc: { available: -1 } },
    { session }
  );

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### 3. **Validate Before Saving**

```javascript
const hotel = new Hotel({ name, description });

// Validate before saving
const validationError = hotel.validateSync();
if (validationError) {
  return res.status(400).json({
    success: false,
    message: validationError.message
  });
}

await hotel.save();
```

### 4. **Use Populate Sparingly**

```javascript
// Good - Only when needed
const booking = await Booking.findById(id)
  .populate('user', 'fullname email');

// Avoid - Over-populating
const booking = await Booking.findById(id)
  .populate('user')
  .populate('hotel')
  .populate('room')
  .populate('cancelledBy');
```

---

## 📚 Related Documents

- [Mongoose Schema Design](./mongoose-schema-design.md)
- [Controller Design Pattern](./controller-design-pattern.md)
- [Backend Overview](./backend-overview.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive data access patterns guide
