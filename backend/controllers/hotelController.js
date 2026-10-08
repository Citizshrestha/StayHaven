import { Hotel } from "../models/hotel.schema.js";
import { Room } from "../models/room.schema.js";
import { Booking } from "../models/booking.schema.js";
import { Review } from "../models/review.model.js";
import { User } from "../models/user.schema.js";
import { Company } from "../models/company.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notifySuperadmins } from "./notificationController.js";
import { sendEmail } from "../config/nodemailer.js";
import { createLogger } from "../utils/logger.js";
import { searchRegex, parsePaging } from "../utils/searchQuery.js";
import { activeReservationFilter } from "../services/bookingAvailability.js";

const logger = createLogger('HotelController');

const optionalObjectIdFields = ['propertyManager'];


const sanitizeHotelUpdateFields = (fields) => {
  const sanitized = { ...fields };

  delete sanitized.mapEmbedUrl;
  delete sanitized.currency;

  optionalObjectIdFields.forEach((field) => {
    if (sanitized[field] === '') {
      delete sanitized[field];
    }
  });

  return sanitized;
};

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

  // Get company
  const company = await Company.findOne({ owner: req.user._id });
  if (!company) {
    return res.status(400).json({
      success: false,
      message: "Please create a company profile first",
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
    company: company._id,
    status: 'pending', // Requires admin approval
  });

  // Update company stats
  await Company.findByIdAndUpdate(company._id, {
    $inc: { totalProperties: 1 }
  });

  // Platform-level event: superadmins verify new hotels, so push it to them live.
  await notifySuperadmins({
    type: "system",
    title: "New hotel awaiting verification",
    message: `${hotel.name} was submitted by ${req.user.fullname || "an owner"} and needs approval.`,
    priority: "high",
    actionUrl: "/hotelmanagement",
    senderId: req.user._id,
    payload: { hotelId: hotel._id.toString(), hotelName: hotel.name },
  });

  res.status(201).json({
    success: true,
    message: "Hotel created successfully. Pending admin approval.",
    hotel,
  });
});

// ---------------------------------------------------------------------------
// PUBLIC (unauthenticated) hotel reads.
// These responses go to anyone on the internet, so they use an explicit
// field allow-list by exclusion of everything operational/private: owner and
// company ids + PII, payout bank details, restaurant billing config, revenue
// counters, and room QR tokens (a room QR token grants in-room guest access).
// ---------------------------------------------------------------------------
const PUBLIC_HOTEL_EXCLUDE = '-owner -company -propertyManager -bankTransferAccount -restaurantBilling -totalRevenue -totalBookings -totalRooms -availableRooms -__v';
const PUBLIC_ROOM_EXCLUDE = '-uniqueToken -qrCodeData -qrCodeImage -QR -isQrActive -reservationVersion -company -lastCleaned -status -__v';
const PUBLIC_SORTS = new Map([
  ['-rating', { rating: -1, _id: 1 }], ['rating', { rating: 1, _id: 1 }],
  ['-createdAt', { createdAt: -1, _id: 1 }], ['createdAt', { createdAt: 1, _id: 1 }],
  ['name', { name: 1, _id: 1 }], ['-name', { name: -1, _id: 1 }],
  ['-starRating', { starRating: -1, _id: 1 }], ['starRating', { starRating: 1, _id: 1 }],
  ['priceRange.min', { 'priceRange.min': 1, _id: 1 }], ['-priceRange.min', { 'priceRange.min': -1, _id: 1 }],
  ['price', { 'priceRange.min': 1, _id: 1 }], ['-price', { 'priceRange.min': -1, _id: 1 }],
]);
const finiteNumber = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const parseStayDates = (checkIn, checkOut) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (typeof checkIn !== 'string' || typeof checkOut !== 'string' ||
      Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return null;
  return { start, end };
};

// IDs of rooms (from `roomIds`) that already have a live reservation overlapping the stay.
const bookedRoomIdSet = async (roomIds, start, end) => {
  if (!roomIds.length) return new Set();
  const booked = await Booking.distinct('room', {
    room: { $in: roomIds },
    checkIn: { $lt: end },
    checkOut: { $gt: start },
    ...activeReservationFilter(),
  });
  return new Set(booked.map(String));
};

// @desc    Get all hotels (with filters)
// @route   GET /api/hotels
// @access  Public
export const getAllHotels = asyncHandler(async (req, res) => {
  const { city, category, starRating, minRating, maxRating, minPrice, maxPrice, amenities, search,
    sort, destination, checkIn, checkOut } = req.query;
  const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 12, maxLimit: 50 });

  // Only approved + active hotels are ever public.
  const query = { status: 'approved', isActive: true };

  const cityRegex = searchRegex(destination) || searchRegex(city);
  if (cityRegex) query['location.city'] = cityRegex;

  if (typeof category === 'string' && category.trim()) query.category = category.trim();

  const stars = finiteNumber(starRating);
  if (stars !== null) query.starRating = Math.trunc(stars);

  const ratingFilter = {};
  const minR = finiteNumber(minRating);
  const maxR = finiteNumber(maxRating);
  if (minR !== null) ratingFilter.$gte = minR;
  if (maxR !== null) ratingFilter.$lte = maxR;
  if (Object.keys(ratingFilter).length) query.rating = ratingFilter;

  // Price filtering: match hotels whose price range overlaps the requested range.
  const minP = finiteNumber(minPrice);
  const maxP = finiteNumber(maxPrice);
  if (minP !== null) query['priceRange.max'] = { $gte: minP };
  if (maxP !== null) query['priceRange.min'] = { $lte: maxP };

  const amenityList = (Array.isArray(amenities) ? amenities : typeof amenities === 'string' ? amenities.split(',') : [])
    .filter((a) => typeof a === 'string').map((a) => a.trim()).filter(Boolean).slice(0, 30);
  if (amenityList.length) query.amenities = { $all: amenityList };

  const textRegex = searchRegex(search);
  if (textRegex) {
    query.$or = [
      { name: textRegex }, { description: textRegex }, { 'location.city': textRegex },
      { 'location.country': textRegex }, { 'location.address': textRegex },
    ];
  }

  const sortSpec = PUBLIC_SORTS.get(typeof sort === 'string' ? sort : '-rating') || PUBLIC_SORTS.get('-rating');

  let hotels;
  let total;
  if (checkIn !== undefined || checkOut !== undefined) {
    // Date-aware search: keep hotels with at least one bookable room for the stay.
    const dates = parseStayDates(checkIn, checkOut);
    if (!dates) {
      return res.status(400).json({ success: false, message: 'Valid check-in and check-out dates are required' });
    }
    const candidates = await Hotel.find(query).select(PUBLIC_HOTEL_EXCLUDE).sort(sortSpec).limit(500).lean();
    const rooms = await Room.find({ hotel: { $in: candidates.map((h) => h._id) }, status: { $ne: 'maintenance' } }).select('_id hotel').lean();
    const booked = await bookedRoomIdSet(rooms.map((r) => r._id), dates.start, dates.end);
    const free = new Set(rooms.filter((r) => !booked.has(String(r._id))).map((r) => String(r.hotel)));
    const available = candidates.filter((h) => free.has(String(h._id)));
    total = available.length;
    hotels = available.slice(skip, skip + limit);
  } else {
    [hotels, total] = await Promise.all([
      Hotel.find(query).select(PUBLIC_HOTEL_EXCLUDE).sort(sortSpec).skip(skip).limit(limit).lean(),
      Hotel.countDocuments(query),
    ]);
  }

  res.status(200).json({
    success: true,
    count: hotels.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    hotels,
  });
});

// @desc    Get single hotel by ID
// @route   GET /api/hotels/:id
// @access  Public
export const getHotelById = asyncHandler(async (req, res) => {
  const found = await Hotel.findOne({
    _id: req.params.id,
    status: 'approved',
    isActive: true,
  }).lean();

  if (!found) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found",
    });
  }

  // Rooms that are permanently out of service can't be booked, so they aren't listed.
  const rooms = await Room.find({ hotel: found._id, status: { $ne: 'maintenance' } })
    .select(PUBLIC_ROOM_EXCLUDE).sort({ price: 1, roomNumber: 1 }).lean();

  const { owner, company, propertyManager, bankTransferAccount, restaurantBilling, totalRevenue, totalBookings, totalRooms, availableRooms, __v, ...hotel } = found; // eslint-disable-line no-unused-vars
  res.status(200).json({
    success: true,
    hotel: {
      ...hotel,
      // Only whether bank transfer is offered; the account itself needs a signed-in guest (see getBankTransferDetails).
      bankTransferEnabled: bankTransferAccount?.enabled === true,
      rooms,
    },
  });
});

// @desc    Which of a hotel's rooms can be booked for a stay
// @route   GET /api/hotels/:id/availability?checkIn=&checkOut=
// @access  Public (returns booleans only, no booking data)
export const getHotelAvailability = asyncHandler(async (req, res) => {
  const dates = parseStayDates(req.query.checkIn, req.query.checkOut);
  if (!dates) {
    return res.status(400).json({ success: false, message: 'Valid check-in and check-out dates are required' });
  }
  const hotel = await Hotel.findOne({ _id: req.params.id, status: 'approved', isActive: true }).select('_id').lean();
  if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });

  const rooms = await Room.find({ hotel: hotel._id, status: { $ne: 'maintenance' } }).select('_id').lean();
  const booked = await bookedRoomIdSet(rooms.map((r) => r._id), dates.start, dates.end);
  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    success: true,
    rooms: rooms.map((r) => ({ roomId: String(r._id), available: !booked.has(String(r._id)) })),
  });
});

// @desc    Approved guest reviews for a hotel (hidden/pending/rejected/flagged are never returned)
// @route   GET /api/hotels/:id/reviews
// @access  Public
export const getHotelReviews = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findOne({ _id: req.params.id, status: 'approved', isActive: true }).select('_id').lean();
  if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
  const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 5, maxLimit: 20 });
  const filter = { hotel: hotel._id, moderationStatus: 'approved' };

  const [reviews, total, distribution] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('guest', 'fullname').select('rating title comment createdAt guest isVerifiedGuest hotelReply').lean(),
    Review.countDocuments(filter),
    Review.aggregate([{ $match: filter }, { $group: { _id: '$rating', count: { $sum: 1 } } }]),
  ]);
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach((row) => { if (counts[row._id] !== undefined) counts[row._id] = row.count; });

  // Reviewer = first name + last initial only. Never expose email or ids.
  const displayName = (fullname) => {
    const parts = String(fullname || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'Guest';
    return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };
  res.status(200).json({
    success: true,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    distribution: counts,
    reviews: reviews.map((r) => ({
      id: String(r._id),
      name: displayName(r.guest?.fullname),
      rating: r.rating,
      title: r.title || '',
      text: r.comment,
      date: r.createdAt,
      verified: !!r.isVerifiedGuest,
      reply: r.hotelReply?.isPublic && r.hotelReply?.text ? r.hotelReply.text : null,
    })),
  });
});

// @desc    Where a guest should send a bank transfer for this hotel
// @route   GET /api/hotels/:id/bank-transfer-details
// @access  Private (signed-in guest completing a booking); never part of the public hotel payload
export const getBankTransferDetails = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findOne({ _id: req.params.id, status: 'approved', isActive: true })
    .select('name bankTransferAccount').lean();
  if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
  const a = hotel.bankTransferAccount || {};
  const configured = a.enabled === true && a.accountName && a.bankName && a.accountNumber;
  res.set('Cache-Control', 'no-store');
  if (!configured) {
    return res.status(200).json({ success: true, enabled: false });
  }
  res.status(200).json({
    success: true,
    enabled: true,
    account: { accountName: a.accountName, bankName: a.bankName, accountNumber: a.accountNumber, branch: a.branch || '' },
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
  const userRole = req.user?.role?.name || req.user?.companyRole;
  const isPrivileged = userRole === 'admin' || userRole === 'superadmin';

  const hotel = isPrivileged
    ? await Hotel.findById(req.params.id)
    : await Hotel.findOne({
        _id: req.params.id,
        owner: req.user._id
      });

  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found or access denied",
    });
  }

  // Update hotel (status changes back to pending if major changes)
  const updatedFields = sanitizeHotelUpdateFields(req.body);

  if (Object.prototype.hasOwnProperty.call(updatedFields, 'bankTransferAccount')) {
    const account = updatedFields.bankTransferAccount;
    if (!account || typeof account !== 'object' || Array.isArray(account) || typeof account.enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'A valid bank transfer account and enabled flag are required' });
    }
    const clean = {
      enabled: account.enabled,
      accountName: String(account.accountName || '').trim(),
      bankName: String(account.bankName || '').trim(),
      accountNumber: String(account.accountNumber || '').trim(),
      branch: String(account.branch || '').trim(),
    };
    if (clean.enabled && (clean.accountName.length < 3 || clean.bankName.length < 3 || !/^[A-Za-z0-9 -]{5,64}$/.test(clean.accountNumber))) {
      return res.status(400).json({ success: false, message: 'Configure a real account holder, bank name, and account number before enabling bank transfer' });
    }
    updatedFields.bankTransferAccount = clean;
  }

  if (updatedFields.propertyManager) {
    const manager = await User.findById(updatedFields.propertyManager);
    if (!manager) {
      return res.status(400).json({
        success: false,
        message: "Selected property manager was not found",
      });
    }
  }

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
  const userRole = req.user?.role?.name || req.user?.companyRole;
  const isPrivileged = userRole === 'admin' || userRole === 'superadmin';

  const hotel = isPrivileged
    ? await Hotel.findById(req.params.id)
    : await Hotel.findOne({
        _id: req.params.id,
        owner: req.user._id
      });

  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found or access denied",
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
  // Query-scoped by owner for security
  const hotel = await Hotel.findOne({
    _id: req.params.id,
    owner: req.user._id
  });

  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found or access denied",
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

  // Send email notification to hotel owner
  try {
    const owner = hotel.owner;
    const ownerEmail = owner.email || owner.contact?.email;
    const ownerName = owner.fullname || owner.name || 'Hotel Owner';

    if (ownerEmail) {
      const statusText = status === 'approved' ? 'Approved' : 'Rejected';
      const subject = `StayHaven - Your Hotel "${hotel.name}" Has Been ${statusText}`;

      let emailBody = '';

      if (status === 'approved') {
        emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10B981;">🎉 Congratulations, ${ownerName}!</h2>
            <p>Your hotel <strong>"${hotel.name}"</strong> has been approved and is now live on StayHaven.</p>
            <p>Guests can now discover and book your property. You can manage your hotel from your dashboard.</p>
            <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
              <p style="margin: 0;"><strong>Hotel:</strong> ${hotel.name}</p>
              <p style="margin: 5px 0 0 0;"><strong>Location:</strong> ${hotel.location?.city || 'N/A'}, ${hotel.location?.country || 'N/A'}</p>
            </div>
            <p>Start adding rooms and managing your bookings today!</p>
            <p>Best regards,<br>The StayHaven Team</p>
          </div>
        `;
      } else {
        emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #EF4444;">Hotel Status Update</h2>
            <p>Dear ${ownerName},</p>
            <p>We regret to inform you that your hotel <strong>"${hotel.name}"</strong> was not approved for listing on StayHaven.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>If you believe this is an error or would like to reapply, please contact our support team.</p>
            <p>Best regards,<br>The StayHaven Team</p>
          </div>
        `;
      }

      await sendEmail({
        from: process.env.SENDER_EMAIL,
        to: ownerEmail,
        subject,
        html: emailBody,
      });

      logger.info(`Hotel status notification sent to ${ownerEmail}`, { hotelId: hotel._id, status });
    }
  } catch (emailError) {
    // Log error but don't fail the request
    logger.error('Failed to send hotel status notification email', {
      error: emailError.message,
      hotelId: hotel._id
    });
  }

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
