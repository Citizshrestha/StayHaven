import { Booking } from "../models/booking.schema.js";
import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { User } from "../models/user.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import crypto from "crypto";

// Helper function to generate unique confirmation code
const generateConfirmationCode = () => {
  return `BK-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

// Helper function to validate dates
const validateDates = (checkIn, checkOut) => {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);

  // Reset time to midnight for date comparison
  inDate.setHours(0, 0, 0, 0);
  outDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (inDate >= outDate) {
    throw Object.assign(new Error('Check-out date must be after check-in date'), { status: 400 });
  }

  // Allow same day check-in for walk-in guests
  // Check if check-in date is in the past (more than today)
  if (inDate < today) {
    throw Object.assign(new Error('Check-in date cannot be in the past'), { status: 400 });
  }
};

// Helper function to check room availability
const checkRoomAvailability = async (roomId, checkIn, checkOut, excludeBookingId = null) => {
  const query = {
    room: roomId,
    status: { $in: ['Confirmed', 'Checked-In'] },
    $or: [
      {
        checkIn: { $lt: new Date(checkOut) },
        checkOut: { $gt: new Date(checkIn) }
      }
    ]
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const conflicts = await Booking.findOne(query);
  return !conflicts;
};

// ============================================
// 1. CREATE NEW BOOKING
// ============================================
export const createNewBooking = asyncHandler(async (req, res) => {
  const {
    guestName,
    guestEmail,
    guestPhone,
    checkIn,
    checkOut,
    roomId,
    numGuests = 1,
    specialRequests = '',
    hotelId
  } = req.body;

  // Validation
  if (!guestName || !guestPhone || !checkIn || !checkOut || !roomId || !hotelId) {
    throw Object.assign(
      new Error('Please provide all required fields: guestName, guestPhone, checkIn, checkOut, roomId, hotelId'),
      { status: 400 }
    );
  }

  // Validate guest name
  if (guestName.trim().length < 2) {
    throw Object.assign(new Error('Guest name must be at least 2 characters'), { status: 400 });
  }

  // Validate phone format (simple check)
  const cleanPhone = guestPhone.replace(/\D/g, '');
  if (!/^\d{10,}$/.test(cleanPhone)) {
    throw Object.assign(new Error('Invalid phone number format (minimum 10 digits)'), { status: 400 });
  }

  // Validate email if provided
  if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
    throw Object.assign(new Error('Invalid email format'), { status: 400 });
  }

  // Validate guest count
  if (isNaN(numGuests) || numGuests < 1 || numGuests > 10) {
    throw Object.assign(new Error('Number of guests must be between 1 and 10'), { status: 400 });
  }

  // Validate dates
  validateDates(checkIn, checkOut);

  // Check if hotel exists
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) {
    throw Object.assign(new Error('Hotel not found'), { status: 404 });
  }

  // Check if room exists and belongs to this hotel
  const room = await Room.findById(roomId);
  if (!room) {
    throw Object.assign(new Error('Room not found'), { status: 404 });
  }

  if (room.hotel.toString() !== hotelId.toString()) {
    throw Object.assign(new Error('Room does not belong to this hotel'), { status: 400 });
  }

  // Check room status
  if (room.status !== 'available') {
    throw Object.assign(
      new Error(`Room is currently ${room.status} and cannot be booked`),
      { status: 400 }
    );
  }

  // Check room availability for dates
  const isAvailable = await checkRoomAvailability(roomId, checkIn, checkOut);
  if (!isAvailable) {
    throw Object.assign(new Error('Room is already booked for selected dates'), { status: 400 });
  }

  // Calculate total amount
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const totalAmount = room.price * nights;

  // Create or find guest user
  let guestUser = null;
  try {
    if (guestEmail) {
      guestUser = await User.findOne({ email: guestEmail });
      if (!guestUser) {
        // Create a new guest user
        guestUser = await User.create({
          fullname: guestName,
          username: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          email: guestEmail,
          password: crypto.randomBytes(16).toString('hex'),
          companyRole: 'guest'
        });
      }
    }
  } catch (err) {
    console.error('Error creating guest user:', err);
    // Continue without user account - booking can still be created
  }

  // Create booking
  const booking = await Booking.create({
    user: guestUser?._id || null,
    hotel: hotelId,
    company: hotel.company,
    room: roomId,
    checkIn: new Date(checkIn),
    checkOut: new Date(checkOut),
    guests: {
      adults: numGuests,
      children: 0
    },
    totalAmount,
    status: 'Confirmed',
    paymentStatus: 'unpaid',
    confirmationCode: generateConfirmationCode(),
    specialRequests: specialRequests || '',
    bookingSource: 'admin'
  });

  // Update room status to occupied
  room.status = 'occupied';
  await room.save();

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    booking: await booking.populate(['user', 'hotel', 'room']),
    confirmationCode: booking.confirmationCode
  });
});

// ============================================
// 2. WALK-IN GUEST CHECK-IN
// ============================================
export const checkInWalkInGuest = asyncHandler(async (req, res) => {
  const {
    guestName,
    guestEmail,
    guestPhone,
    idType,
    idNumber,
    roomId,
    paymentMethod,
    hotelId,
    checkOutDate
  } = req.body;

  // Validation
  if (!guestName || !guestPhone || !idNumber || !roomId || !hotelId || !checkOutDate) {
    throw Object.assign(
      new Error('Please provide all required fields'),
      { status: 400 }
    );
  }

  // Validate phone
  if (!/^\d{10,}$/.test(guestPhone.replace(/\D/g, ''))) {
    throw Object.assign(new Error('Invalid phone number format'), { status: 400 });
  }

  // Validate payment method
  const validPaymentMethods = ['card', 'cash', 'company'];
  if (!validPaymentMethods.includes(paymentMethod)) {
    throw Object.assign(new Error('Invalid payment method'), { status: 400 });
  }

  // Validate ID
  if (!idNumber || idNumber.trim().length < 5) {
    throw Object.assign(new Error('Invalid ID number'), { status: 400 });
  }

  // Check if hotel exists
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) {
    throw Object.assign(new Error('Hotel not found'), { status: 404 });
  }

  // Check if room exists and is available
  const room = await Room.findById(roomId);
  if (!room || room.hotel.toString() !== hotelId) {
    throw Object.assign(new Error('Room not found'), { status: 404 });
  }

  if (room.status !== 'available') {
    throw Object.assign(new Error('Room is not available for check-in'), { status: 400 });
  }

  // Create or find guest user
  let guestUser = null;
  try {
    if (guestEmail) {
      guestUser = await User.findOne({ email: guestEmail });
      if (!guestUser) {
        guestUser = await User.create({
          fullname: guestName,
          username: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          email: guestEmail,
          password: crypto.randomBytes(16).toString('hex'),
          companyRole: 'guest'
        });
      }
    }
  } catch (err) {
    console.error('Error creating guest user:', err);
    // Continue without user account
  }

  // Calculate stay duration (assume 1 night for walk-in)
  const checkInDate = new Date();
  const checkOut = new Date(checkOutDate);
  const nights = Math.ceil((checkOut - checkInDate) / (1000 * 60 * 60 * 24)) || 1;
  const totalAmount = room.price * nights;

  // Create booking
  const booking = await Booking.create({
    user: guestUser?._id || null,
    hotel: hotelId,
    company: hotel.company,
    room: roomId,
    checkIn: checkInDate,
    checkOut: checkOut,
    guests: {
      adults: 1,
      children: 0
    },
    totalAmount,
    status: 'Checked-In',
    paymentStatus: paymentMethod === 'cash' ? 'unpaid' : 'partial',
    confirmationCode: generateConfirmationCode(),
    specialRequests: `Walk-in guest | ID Type: ${idType} | ID: ${idNumber} | Payment: ${paymentMethod}`,
    bookingSource: 'admin'
  });

  // Update room status
  room.status = 'occupied';
  await room.save();

  res.status(201).json({
    success: true,
    message: 'Walk-in guest checked in successfully',
    booking: await booking.populate(['user', 'hotel', 'room'])
  });
});

// ============================================
// 3. EXPRESS CHECK-OUT
// ============================================
export const expressCheckOut = asyncHandler(async (req, res) => {
  const { bookingId, settlePayment = false } = req.body;

  // Validation
  if (!bookingId) {
    throw Object.assign(new Error('Booking ID is required'), { status: 400 });
  }

  // Find booking
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw Object.assign(new Error('Booking not found'), { status: 404 });
  }

  // Check if guest is currently checked in
  if (booking.status !== 'Checked-In') {
    throw Object.assign(
      new Error(`Cannot check out. Current status: ${booking.status}`),
      { status: 400 }
    );
  }

  // Update booking
  booking.status = 'Checked-Out';
  booking.checkOut = new Date();
  
  if (settlePayment) {
    booking.paymentStatus = 'paid';
  }

  await booking.save();

  // Update room status back to available
  const room = await Room.findById(booking.room);
  if (room) {
    room.status = 'available';
    await room.save();
  }

  res.status(200).json({
    success: true,
    message: 'Guest checked out successfully',
    booking: await booking.populate(['user', 'hotel', 'room']),
    totalAmount: booking.totalAmount,
    paymentStatus: booking.paymentStatus
  });
});

// ============================================
// 4. ROOM CHANGE
// ============================================
export const changeGuestRoom = asyncHandler(async (req, res) => {
  const { bookingId, newRoomId } = req.body;

  // Validation
  if (!bookingId || !newRoomId) {
    throw Object.assign(
      new Error('Booking ID and new Room ID are required'),
      { status: 400 }
    );
  }

  // Find booking
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw Object.assign(new Error('Booking not found'), { status: 404 });
  }

  // Check if guest is checked in
  if (booking.status !== 'Checked-In') {
    throw Object.assign(
      new Error('Guest must be checked in to change rooms'),
      { status: 400 }
    );
  }

  // Find new room
  const newRoom = await Room.findById(newRoomId);
  if (!newRoom || newRoom.hotel.toString() !== booking.hotel.toString()) {
    throw Object.assign(
      new Error('New room not found or belongs to different hotel'),
      { status: 404 }
    );
  }

  // Check if new room is available
  if (newRoom.status !== 'available') {
    throw Object.assign(new Error('New room is not available'), { status: 400 });
  }

  // Check for booking conflicts on new room
  const hasConflict = await Booking.findOne({
    _id: { $ne: bookingId },
    room: newRoomId,
    status: { $in: ['Confirmed', 'Checked-In'] },
    checkIn: { $lt: booking.checkOut },
    checkOut: { $gt: booking.checkIn }
  });

  if (hasConflict) {
    throw Object.assign(
      new Error('New room has conflicting bookings for this period'),
      { status: 400 }
    );
  }

  // Get old room
  const oldRoom = await Room.findById(booking.room);

  // Calculate price difference
  const nights = Math.ceil((booking.checkOut - booking.checkIn) / (1000 * 60 * 60 * 24));
  const oldTotal = oldRoom.price * nights;
  const newTotal = newRoom.price * nights;
  const priceDifference = newTotal - oldTotal;

  // Update booking
  booking.room = newRoomId;
  booking.totalAmount = newTotal;
  
  // Add note about room change
  booking.specialRequests = (booking.specialRequests || '') + 
    `\n[Room Change] From Room ${oldRoom.roomNumber} to Room ${newRoom.roomNumber} (Price difference: ${priceDifference > 0 ? '+' : ''}$${Math.abs(priceDifference)})`;

  await booking.save();

  // Update room statuses
  oldRoom.status = 'available';
  newRoom.status = 'occupied';
  await oldRoom.save();
  await newRoom.save();

  res.status(200).json({
    success: true,
    message: 'Room changed successfully',
    booking: await booking.populate(['user', 'hotel', 'room']),
    roomChange: {
      oldRoom: oldRoom.roomNumber,
      newRoom: newRoom.roomNumber,
      priceDifference: priceDifference,
      newTotal: newTotal
    }
  });
});

// ============================================
// 5. GET BOOKING DETAILS (helper)
// ============================================
export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate(['user', 'hotel', 'room', 'company']);

  if (!booking) {
    throw Object.assign(new Error('Booking not found'), { status: 404 });
  }

  res.status(200).json({
    success: true,
    booking
  });
});

// ============================================
// 6. GET HOTEL BOOKINGS (for reception dashboard)
// ============================================
export const getHotelBookings = asyncHandler(async (req, res) => {
  const { hotelId, status, page = 1, limit = 20 } = req.query;

  if (!hotelId) {
    throw Object.assign(new Error('Hotel ID is required'), { status: 400 });
  }

  const query = { hotel: hotelId };

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;
  const bookings = await Booking.find(query)
    .populate(['user', 'room'])
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Booking.countDocuments(query);

  res.status(200).json({
    success: true,
    count: bookings.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    bookings
  });
});

// ============================================
// 7. GET AVAILABLE ROOMS
// ============================================
export const getAvailableRooms = asyncHandler(async (req, res) => {
  // Get hotelId from URL params
  const { hotelId } = req.params;
  const { checkIn, checkOut } = req.query;

  if (!hotelId) {
    throw Object.assign(new Error('Hotel ID is required'), { status: 400 });
  }

  let query = { hotel: hotelId, status: 'available' };

  // If dates provided, check for conflicts
  if (checkIn && checkOut) {
    const occupiedRoomIds = await Booking.distinct('room', {
      hotel: hotelId,
      status: { $in: ['Confirmed', 'Checked-In'] },
      checkIn: { $lt: new Date(checkOut) },
      checkOut: { $gt: new Date(checkIn) }
    });

    if (occupiedRoomIds.length > 0) {
      query._id = { $nin: occupiedRoomIds };
    }
  }

  const rooms = await Room.find(query).sort({ roomNumber: 1 });

  res.status(200).json({
    success: true,
    count: rooms.length,
    rooms
  });
});
