import { Hotel } from "../models/hotel.schema.js";
import { Room } from "../models/room.schema.js";
import { User } from "../models/user.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Create a new hotel
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
    amenities,
    policies,
    contact,
  } = req.body;

  // Validate required fields
  if (!name || !description || !location || !category || !starRating || !priceRange || !images || !contact) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  // Check if hotel name already exists for this owner
  const existingHotel = await Hotel.findOne({ 
    name, 
    owner: req.user._id 
  });

  if (existingHotel) {
    return res.status(400).json({
      success: false,
      message: "You already have a hotel with this name",
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
    amenities: amenities || [],
    policies: policies || {},
    contact,
    owner: req.user._id,
    status: 'pending', // Requires admin approval
  });

  res.status(201).json({
    success: true,
    message: "Hotel created successfully. Pending admin approval.",
    hotel,
  });
});

// @desc    Get all hotels (with filters)
// @route   GET /api/hotels
// @access  Public
export const getAllHotels = asyncHandler(async (req, res) => {
  const {
    city,
    category,
    starRating,
    minPrice,
    maxPrice,
    amenities,
    search,
    page = 1,
    limit = 12,
    sort = '-rating',
  } = req.query;

  // Build query
  const query = { status: 'approved', isActive: true };

  if (city) {
    query['location.city'] = { $regex: city, $options: 'i' };
  }

  if (category) {
    query.category = category;
  }

  if (starRating) {
    query.starRating = parseInt(starRating);
  }

  if (minPrice || maxPrice) {
    query['priceRange.min'] = {};
    if (minPrice) query['priceRange.min'].$gte = parseInt(minPrice);
    if (maxPrice) query['priceRange.max'] = { $lte: parseInt(maxPrice) };
  }

  if (amenities) {
    const amenitiesArray = amenities.split(',');
    query.amenities = { $all: amenitiesArray };
  }

  if (search) {
    query.$text = { $search: search };
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const hotels = await Hotel.find(query)
    .populate('owner', 'fullname email')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Hotel.countDocuments(query);

  res.status(200).json({
    success: true,
    count: hotels.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    hotels,
  });
});

// @desc    Get single hotel by ID
// @route   GET /api/hotels/:id
// @access  Public
export const getHotelById = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id)
    .populate('owner', 'fullname email contact');

  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found",
    });
  }

  // Get associated rooms
  const rooms = await Room.find({ hotel: hotel._id });

  res.status(200).json({
    success: true,
    hotel: {
      ...hotel.toObject(),
      rooms,
    },
  });
});

// @desc    Get hotels owned by logged-in user
// @route   GET /api/hotels/my-hotels
// @access  Private (Hotel Owner)
export const getMyHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find({ owner: req.user._id })
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: hotels.length,
    hotels,
  });
});

// @desc    Update hotel
// @route   PUT /api/hotels/:id
// @access  Private (Hotel Owner)
export const updateHotel = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found",
    });
  }

  // Check ownership
  if (hotel.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this hotel",
    });
  }

  // Update hotel (status changes back to pending if major changes)
  const updatedFields = { ...req.body };
  
  // If major fields changed, reset to pending
  const majorFields = ['name', 'description', 'location', 'category'];
  const hasMajorChanges = majorFields.some(field => req.body[field]);
  
  if (hasMajorChanges && hotel.status === 'approved') {
    updatedFields.status = 'pending';
  }

  const updatedHotel = await Hotel.findByIdAndUpdate(
    req.params.id,
    updatedFields,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: hasMajorChanges 
      ? "Hotel updated. Changes pending admin approval." 
      : "Hotel updated successfully",
    hotel: updatedHotel,
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
      message: "Hotel not found",
    });
  }

  // Check ownership
  if (hotel.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this hotel",
    });
  }

  // Soft delete - just deactivate
  hotel.isActive = false;
  await hotel.save();

  res.status(200).json({
    success: true,
    message: "Hotel deleted successfully",
  });
});

// @desc    Get hotel statistics (for owner)
// @route   GET /api/hotels/:id/statistics
// @access  Private (Hotel Owner)
export const getHotelStatistics = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found",
    });
  }

  // Check ownership
  if (hotel.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to view this hotel's statistics",
    });
  }

  // Get rooms count
  const totalRooms = await Room.countDocuments({ hotel: hotel._id });
  const availableRooms = await Room.countDocuments({ 
    hotel: hotel._id, 
    status: 'available' 
  });

  res.status(200).json({
    success: true,
    statistics: {
      totalBookings: hotel.totalBookings,
      totalRevenue: hotel.totalRevenue,
      rating: hotel.rating,
      reviewCount: hotel.reviewCount,
      totalRooms,
      availableRooms,
      occupancyRate: totalRooms > 0 
        ? ((totalRooms - availableRooms) / totalRooms * 100).toFixed(2) 
        : 0,
    },
  });
});

// @desc    Approve/Reject hotel (Admin only)
// @route   PATCH /api/hotels/:id/status
// @access  Private (Admin)
export const updateHotelStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status. Must be 'approved' or 'rejected'",
    });
  }

  const hotel = await Hotel.findById(req.params.id).populate('owner');

  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found",
    });
  }

  hotel.status = status;
  await hotel.save();

  // TODO: Send email notification to hotel owner

  res.status(200).json({
    success: true,
    message: `Hotel ${status} successfully`,
    hotel,
  });
});

// @desc    Toggle featured status (Admin only)
// @route   PATCH /api/hotels/:id/featured
// @access  Private (Admin)
export const toggleFeatured = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found",
    });
  }

  hotel.featured = !hotel.featured;
  await hotel.save();

  res.status(200).json({
    success: true,
    message: `Hotel ${hotel.featured ? 'featured' : 'unfeatured'} successfully`,
    hotel,
  });
});
