import { Booking } from "../models/booking.schema.js";
import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { Guest } from "../models/guest.schema.js";
import { User } from "../models/user.schema.js";
import { Role } from "../models/role.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import crypto from "crypto";
import mongoose from "mongoose";
import { validateStayDates, findReservationConflict, activeReservationFilter } from "../services/bookingAvailability.js";
import { updateStayCharges } from '../services/bookingCharges.js';

// Helper function to generate unique confirmation code
const generateConfirmationCode = () => {
  return `BK-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

const getOrCreateGuestRole = async () => {
  let guestRole = await Role.findOne({ name: "guest" });
  if (!guestRole) {
    guestRole = await Role.create({ name: "guest" });
  }
  return guestRole;
};

// Helper function to validate dates
const validateDates = validateStayDates;

const checkRoomAvailability = async (roomId, checkIn, checkOut, hotelId, excludeBookingId = null, session = null) =>
  !(await findReservationConflict({ room: roomId, checkIn, checkOut, exclude: excludeBookingId, session }));

const getUserRole = (req) => req.user?.role?.name || req.user?.companyRole;

const getAssignedHotelIds = (req) => {
  const assigned = req.user?.assignedProperties || [];
  return assigned
    .map((p) => (p?._id || p)?.toString())
    .filter(Boolean);
};

const assertHotelAccess = async (req, hotelId) => {
  const role = getUserRole(req);

  // Superadmins should NOT have access to hotel-specific financial data
  // They can manage hotels (approve/reject) but cannot view bookings, revenue, etc.
  if (role === "admin" || role === "superadmin") {
    throw Object.assign(new Error("Superadmins cannot access hotel-specific operational data"), { status: 403 });
  }

  const assignedHotelIds = getAssignedHotelIds(req);
  const userCompany = req.user?.company?._id?.toString?.() || req.user?.company?.toString?.() || req.user?.company;

  const hotel = await Hotel.findById(hotelId).select("company");
  if (!hotel) {
    throw Object.assign(new Error("Hotel not found"), { status: 404 });
  }

  // Operational staff are property-scoped; owners are scoped to their company.
  if (role !== "owner" && !assignedHotelIds.includes(hotelId.toString())) {
    throw Object.assign(new Error("Not authorized for this hotel"), { status: 403 });
  }

  // Every role, including owners, must belong to the hotel company.
  if (!userCompany || hotel.company?.toString() !== userCompany.toString()) {
    throw Object.assign(new Error("Not authorized for this hotel company"), { status: 403 });
  }

  return hotel;
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
  if (typeof guestName !== "string" || guestName.trim().length < 2) {
    throw Object.assign(new Error('Guest name must be at least 2 characters'), { status: 400 });
  }

  // Validate phone format (simple check)
  const cleanPhone = typeof guestPhone === 'string' ? guestPhone.replace(/\D/g, '') : '';
  if (!/^\d{10,}$/.test(cleanPhone)) {
    throw Object.assign(new Error('Invalid phone number format (minimum 10 digits)'), { status: 400 });
  }

  // Validate email if provided
  if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
    throw Object.assign(new Error('Invalid email format'), { status: 400 });
  }

  // Validate guest count
  if (!Number.isInteger(numGuests) || numGuests < 1 || numGuests > 10) {
    throw Object.assign(new Error('Number of guests must be between 1 and 10'), { status: 400 });
  }

  // Validate dates
  validateDates(checkIn, checkOut);

  // Check if hotel exists
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) {
    throw Object.assign(new Error('Hotel not found'), { status: 404 });
  }

  await assertHotelAccess(req, hotelId);

  // Check if room exists and belongs to this hotel
  const room = await Room.findById(roomId);
  if (!room) {
    throw Object.assign(new Error('Room not found'), { status: 404 });
  }

  if (room.hotel.toString() !== hotelId.toString()) {
    throw Object.assign(new Error('Room does not belong to this hotel'), { status: 400 });
  }

  // room.status is front-desk state (today's occupancy) — only meaningful
  // as a pre-check when this booking starts today. A future-dated advance
  // reservation must go through the date-overlap check below instead,
  // otherwise a room busy today would wrongly block booking it for a
  // future stay (and, if claimed, would strand it as "reserved" forever —
  // see the atomic-claim block below for the matching fix).
  const checkInIsToday = new Date(checkIn).toDateString() === new Date().toDateString();
  if (room.status === 'maintenance' || (checkInIsToday && room.status !== 'available')) {
    throw Object.assign(
      new Error(`Room is currently ${room.status} and cannot be booked`),
      { status: 400 }
    );
  }

  if (numGuests > room.maxGuests) throw Object.assign(new Error('Guest count exceeds room capacity'), { status: 400 });

  // Check room availability for dates
  const isAvailable = await checkRoomAvailability(roomId, checkIn, checkOut, hotelId);
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
        const guestRole = await getOrCreateGuestRole();
        // Create a new guest user
        guestUser = await User.create({
          fullname: guestName,
          username: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          email: guestEmail,
          password: crypto.randomBytes(16).toString('hex'),
          role: guestRole._id,
        });
      }
    }
  } catch (err) {
    console.error('Error creating guest user:', err);
    // Continue without user account - booking can still be created
  }

  // A real room write serializes all reservation paths, including future stays.
  const session = await mongoose.startSession();
  let booking;
  try {
    await session.withTransaction(async () => {
      const claimedRoom = await Room.findOneAndUpdate(
        { _id: roomId, hotel: hotelId, status: checkInIsToday ? 'available' : { $ne: 'maintenance' } },
        { $inc: { reservationVersion: 1 }, ...(checkInIsToday ? { $set: { status: 'reserved' } } : {}) },
        { new: true, session }
      );
      if (!claimedRoom || !await checkRoomAvailability(roomId, checkIn, checkOut, hotelId, null, session)) {
        throw Object.assign(new Error('Room is already booked for selected dates'), { status: 409 });
      }

    [booking] = await Booking.create([{
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
      currency: 'NPR',
      guestInfo: { name: guestName, phone: cleanPhone, email: guestEmail || undefined },
      status: 'Confirmed',
      paymentStatus: 'unpaid',
      confirmationCode: generateConfirmationCode(),
      specialRequests: specialRequests || '',
      bookingSource: 'admin'
    }], { session });

    });
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }

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

  validateDates(new Date(), checkOutDate);

  // Validate phone
  if (typeof guestPhone !== 'string' || !/^\d{10,}$/.test(guestPhone.replace(/\D/g, ''))) {
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

  await assertHotelAccess(req, hotelId);

  // Check if room exists and is available
  const room = await Room.findById(roomId);
  if (!room || room.hotel.toString() !== hotelId) {
    throw Object.assign(new Error('Room not found'), { status: 404 });
  }

  if (room.status !== 'available') {
    throw Object.assign(new Error('Room is not available for check-in'), { status: 400 });
  }

  // Create or find guest user (best-effort — a missing user account must NOT block the booking)
  let guestUser = null;
  if (guestEmail) {
    try {
      guestUser = await User.findOne({ email: guestEmail });
      if (!guestUser) {
        const guestRole = await getOrCreateGuestRole();
        guestUser = await User.create({
          fullname: guestName,
          username: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: guestEmail,
          password: crypto.randomBytes(16).toString('hex'),
          role: guestRole._id,
        });
      }
    } catch (err) {
      // Log but do not abort — walk-in guests may not need a user account
      console.warn('Walk-in user lookup/creation skipped:', err.message);
      guestUser = null;
    }
  }

  // Calculate stay duration (assume 1 night for walk-in)
  const checkInDate = new Date();
  const checkOut = new Date(checkOutDate);
  const nights = Math.ceil((checkOut - checkInDate) / (1000 * 60 * 60 * 24)) || 1;
  const totalAmount = room.price * nights;

  // Create booking — user is optional for walk-in guests
  const bookingPayload = {
    hotel: hotelId,
    company: hotel.company,
    room: roomId,
    checkIn: checkInDate,
    checkOut: checkOut,
    guests: { adults: 1, children: 0 },
    totalAmount,
    status: 'Checked-In',
    paymentStatus: 'unpaid',
    currency: 'NPR',
    confirmationCode: generateConfirmationCode(),
    specialRequests: `Walk-in | Payment: ${paymentMethod}`,
    bookingSource: 'admin',
    // Store guest identity inline so we never lose it even without a user account
    guestInfo: {
      name:     guestName,
      phone:    guestPhone,
      email:    guestEmail || null,
      idType:   idType || null,
      idNumber: idNumber,
    },
  };
  if (guestUser?._id) {
    bookingPayload.user = guestUser._id;
  }

  // Create booking + claim the room atomically — see createNewBooking above
  // for why a plain "check then write" here would race under concurrent
  // walk-in check-ins for the same room.
  const roomCompanyUpdate = !room.company && hotel.company ? { company: hotel.company } : {};
  const session = await mongoose.startSession();
  session.startTransaction();
  let booking;
  try {
    const claimedRoom = await Room.findOneAndUpdate(
      { _id: roomId, status: 'available' },
      { $inc: { reservationVersion: 1 }, $set: { status: 'occupied', ...roomCompanyUpdate } },
      { new: true, session }
    );
    if (!claimedRoom) {
      throw Object.assign(
        new Error('This room was just checked in by someone else. Please choose another room or try again.'),
        { status: 409 }
      );
    }

    if (!await checkRoomAvailability(roomId, checkInDate, checkOut, hotelId, null, session)) {
      throw Object.assign(new Error('Room is already booked for selected dates'), { status: 409 });
    }
    [booking] = await Booking.create([bookingPayload], { session });
    await session.commitTransaction();
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

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

  // Get user's hotel context for multi-tenancy validation
  const role = getUserRole(req);
  const assignedHotelIds = getAssignedHotelIds(req);
  const userCompany = req.user?.company?._id?.toString?.() || req.user?.company?.toString?.() || req.user?.company;

  // Build hotel filter based on user role
  let hotelFilter = {};
  if (role === 'receptionist' && assignedHotelIds.length > 0) {
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  } else if (userCompany) {
    // For non-owner users, scope by company
    const userHotels = await Hotel.find({ company: userCompany }).select('_id');
    hotelFilter = { hotel: { $in: userHotels.map(h => h._id) } };
  }

  // Find booking with hotel scope - prevents cross-hotel access
  const booking = await Booking.findOne({ _id: bookingId, ...hotelFilter });
  if (!booking) {
    throw Object.assign(new Error('Booking not found or access denied'), { status: 404 });
  }
  await assertHotelAccess(req, booking.hotel);

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

  // Move room to cleaning (same lifecycle as reception check-out endpoint)
  const room = await Room.findById(booking.room);
  if (room) {
    if (!room.company && booking.company) {
      room.company = booking.company;
    }
    room.status = 'cleaning';
    await room.save();
  }

  // Best-effort guest profile update for consistency with reception flow
  if (booking.guest) {
    await Guest.findByIdAndUpdate(booking.guest, {
      status: "Checked-Out",
      currentBooking: null,
      currentRoom: null,
      $inc: { totalStays: 1, totalSpent: booking.totalAmount || 0 },
    });
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
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
  const { bookingId, newRoomId } = req.body;

  // Validation
  if (!bookingId || !newRoomId) {
    throw Object.assign(
      new Error('Booking ID and new Room ID are required'),
      { status: 400 }
    );
  }

  // Get user's hotel context for multi-tenancy validation
  const role = getUserRole(req);
  const assignedHotelIds = getAssignedHotelIds(req);
  const userCompany = req.user?.company?._id?.toString?.() || req.user?.company?.toString?.() || req.user?.company;

  // Build hotel filter based on user role
  let hotelFilter = {};
  if (role === 'receptionist' && assignedHotelIds.length > 0) {
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  } else if (userCompany) {
    const userHotels = await Hotel.find({ company: userCompany }).select('_id');
    hotelFilter = { hotel: { $in: userHotels.map(h => h._id) } };
  }

  // Find booking with hotel scope - prevents cross-hotel access
  const booking = await Booking.findOne({ _id: bookingId, ...hotelFilter }).session(session);
  if (!booking) {
    throw Object.assign(new Error('Booking not found or access denied'), { status: 404 });
  }
  await assertHotelAccess(req, booking.hotel);

  // Check if guest is checked in
  if (booking.status !== 'Checked-In') {
    throw Object.assign(
      new Error('Guest must be checked in to change rooms'),
      { status: 400 }
    );
  }

  // Find new room
  const newRoom = await Room.findOneAndUpdate({ _id: newRoomId }, { $inc: { reservationVersion: 1 } }, { new: true, session });
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

  // Check for booking conflicts on new room (scoped to same hotel)
  const hasConflict = await Booking.findOne({
    _id: { $ne: bookingId },
    room: newRoomId,
    hotel: booking.hotel, // Multi-tenancy: scope by hotel
    ...activeReservationFilter(),
    checkIn: { $lt: booking.checkOut },
    checkOut: { $gt: booking.checkIn }
  }).session(session);

  if (hasConflict) {
    throw Object.assign(
      new Error('New room has conflicting bookings for this period'),
      { status: 400 }
    );
  }

  // Get old room
  const oldRoom = await Room.findById(booking.room).session(session);
  if (!oldRoom) throw Object.assign(new Error('Current room no longer exists'), { status: 409 });

  // Calculate price difference
  const nights = Math.ceil((booking.checkOut - booking.checkIn) / (1000 * 60 * 60 * 24));
  const oldTotal = booking.totalAmount;
  const newTotal = Math.round((oldRoom.price > 0 ? oldTotal * newRoom.price / oldRoom.price : newRoom.price * nights) * 100) / 100;
  const priceDifference = newTotal - oldTotal;

  // Update booking
  booking.room = newRoomId;
  await updateStayCharges(booking, newTotal, session);
  
  // Add note about room change
  booking.specialRequests = (booking.specialRequests || '') + 
    `\n[Room Change] From Room ${oldRoom.roomNumber} to Room ${newRoom.roomNumber} (Price difference: ${priceDifference > 0 ? '+' : ''}$${Math.abs(priceDifference)})`;

  booking.specialRequests = booking.specialRequests.slice(-500);
  await booking.save({ session });

  // Update room statuses
  if (!oldRoom.company && booking.company) {
    oldRoom.company = booking.company;
  }
  if (!newRoom.company && booking.company) {
    newRoom.company = booking.company;
  }
  oldRoom.status = 'cleaning';
  newRoom.status = 'occupied';
  await oldRoom.save({ session });
  await newRoom.save({ session });
  await session.commitTransaction();

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
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    if (error.hasErrorLabel?.('TransientTransactionError')) throw Object.assign(new Error('Room availability changed. Please try again.'), { status: 409 });
    throw error;
  } finally { await session.endSession(); }
});

// ============================================
// 5. GET BOOKING DETAILS (helper)
// ============================================
export const getBookingById = asyncHandler(async (req, res) => {
  // Get user's hotel context for multi-tenancy validation
  const role = getUserRole(req);
  const assignedHotelIds = getAssignedHotelIds(req);
  const userCompany = req.user?.company?._id?.toString?.() || req.user?.company?.toString?.() || req.user?.company;

  // Build hotel filter based on user role
  let hotelFilter = {};
  if (role === 'receptionist' && assignedHotelIds.length > 0) {
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  } else if (userCompany) {
    const userHotels = await Hotel.find({ company: userCompany }).select('_id');
    hotelFilter = { hotel: { $in: userHotels.map(h => h._id) } };
  }

  // Find booking with hotel scope - prevents cross-hotel access
  const booking = await Booking.findOne({ _id: req.params.id, ...hotelFilter })
    .populate(['user', 'hotel', 'room', 'company']);

  if (!booking) {
    throw Object.assign(new Error('Booking not found or access denied'), { status: 404 });
  }
  await assertHotelAccess(req, booking.hotel._id);

  res.status(200).json({
    success: true,
    booking
  });
});

// ============================================
// 6. GET HOTEL BOOKINGS (for reception dashboard)
// ============================================
export const getHotelBookings = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const { status, page = 1, limit = 20 } = req.query;

  if (!hotelId) {
    throw Object.assign(new Error('Hotel ID is required'), { status: 400 });
  }

  await assertHotelAccess(req, hotelId);

  const query = { hotel: hotelId };

  if (status) {
    query.status = status;
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const bookings = await Booking.find(query)
    .populate(['user', 'room'])
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parsedLimit);

  const total = await Booking.countDocuments(query);

  res.status(200).json({
    success: true,
    count: bookings.length,
    total,
    totalPages: Math.ceil(total / parsedLimit),
    currentPage: parsedPage,
    bookings
  });
});

// ============================================
// 7. MODIFY BOOKING (Change dates/guests)
// ============================================
export const modifyBooking = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
  const { id } = req.params;
  const { checkIn, checkOut, numGuests } = req.body;

  if (!id) {
    throw Object.assign(new Error('Booking ID is required'), { status: 400 });
  }

  // Find booking
  const booking = await Booking.findById(id).populate('room hotel').session(session);
  if (!booking) {
    throw Object.assign(new Error('Booking not found'), { status: 404 });
  }

  // Check authorization - user must own the booking or be staff
  const userRole = getUserRole(req);
  const isOwner = booking.user?.toString() === req.user._id.toString();
  const isStaff = ['receptionist', 'owner', 'admin', 'manager'].includes(userRole);

  if (!isOwner && !isStaff) {
    throw Object.assign(new Error('Not authorized to modify this booking'), { status: 403 });
  }

  // Staff must additionally be scoped to the booking's own hotel/company —
  // without this, any receptionist/owner/admin/manager account could modify
  // a booking belonging to a completely different hotel by guessing its ID.
  if (isStaff && !isOwner) {
    await assertHotelAccess(req, booking.hotel._id);
  }

  // Check if booking can be modified (must be at least 24h before check-in)
  const now = new Date();
  const checkInDate = new Date(booking.checkIn);
  const hoursUntilCheckIn = (checkInDate - now) / (1000 * 60 * 60);

  if (hoursUntilCheckIn < 24 && !isStaff) {
    throw Object.assign(
      new Error('Bookings can only be modified at least 24 hours before check-in'),
      { status: 400 }
    );
  }

  // Check if booking is in a modifiable status
  if (!['Pending', 'Confirmed'].includes(booking.status)) {
    throw Object.assign(
      new Error(`Cannot modify booking with status: ${booking.status}`),
      { status: 400 }
    );
  }

  // Validate new dates if provided
  if ((checkIn !== undefined) !== (checkOut !== undefined)) {
    throw Object.assign(new Error('Provide both check-in and check-out dates'), { status: 400 });
  }
  if (checkIn !== undefined && checkOut !== undefined) {
    validateDates(checkIn, checkOut);
    if (!booking.room) throw Object.assign(new Error('Room no longer exists'), { status: 409 });
    await Room.updateOne({ _id: booking.room._id }, { $inc: { reservationVersion: 1 } }, { session });

    // Check room availability for new dates
    const isAvailable = await checkRoomAvailability(
      booking.room._id,
      checkIn,
      checkOut,
      booking.hotel._id,
      booking._id,
      session
    );

    if (!isAvailable) {
      throw Object.assign(
        new Error('Room is not available for the new dates'),
        { status: 400 }
      );
    }

    // Calculate new total amount
    const newCheckIn = new Date(checkIn);
    const newCheckOut = new Date(checkOut);
    const nights = Math.ceil((newCheckOut - newCheckIn) / (1000 * 60 * 60 * 24));
    const previousNights = Math.max(1, Math.ceil((booking.checkOut - booking.checkIn) / 86400000));
    const newTotal = Math.round(booking.totalAmount / previousNights * nights * 100) / 100;

    booking.checkIn = checkIn;
    booking.checkOut = checkOut;
    await updateStayCharges(booking, newTotal, session);
  }

  // Update number of guests if provided
  if (numGuests !== undefined) {
    if (!Number.isInteger(numGuests) || numGuests < 1 || numGuests + (booking.guests?.children || 0) > (booking.room?.maxGuests || 10)) {
      throw Object.assign(new Error('Number of guests must be between 1 and 10'), { status: 400 });
    }
    // The schema has no top-level `numGuests` field (only `guests.adults` /
    // `guests.children`) — assigning it directly was silently dropped by
    // Mongoose's default strict mode and never persisted. This endpoint's
    // contract only takes a single total, so it maps onto `guests.adults`.
    booking.guests = { ...(booking.guests?.toObject?.() ?? booking.guests ?? {}), adults: numGuests };
  }

  await booking.save({ session });
  await session.commitTransaction();

  res.status(200).json({
    success: true,
    message: 'Booking modified successfully',
    booking
  });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    if (error.hasErrorLabel?.('TransientTransactionError')) throw Object.assign(new Error('Room availability changed. Please try again.'), { status: 409 });
    throw error;
  } finally { await session.endSession(); }
});

// ============================================
// 8. CANCEL BOOKING
// ============================================
export const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!id) {
    throw Object.assign(new Error('Booking ID is required'), { status: 400 });
  }

  // Find booking
  const booking = await Booking.findById(id).populate('room hotel');
  if (!booking) {
    throw Object.assign(new Error('Booking not found'), { status: 404 });
  }

  // Check authorization
  const userRole = getUserRole(req);
  const isOwner = booking.user?.toString() === req.user._id.toString();
  const isStaff = ['receptionist', 'owner', 'admin', 'manager'].includes(userRole);

  if (!isOwner && !isStaff) {
    throw Object.assign(new Error('Not authorized to cancel this booking'), { status: 403 });
  }

  // Staff must additionally be scoped to the booking's own hotel/company —
  // see the identical check in modifyBooking above for why.
  if (isStaff && !isOwner) {
    await assertHotelAccess(req, booking.hotel._id);
  }

  // Check if booking can be cancelled
  if (['Cancelled', 'Checked-Out', 'No-Show'].includes(booking.status)) {
    throw Object.assign(
      new Error(`Cannot cancel booking with status: ${booking.status}`),
      { status: 400 }
    );
  }

  // Calculate refund amount based on cancellation policy
  const now = new Date();
  const checkInDate = new Date(booking.checkIn);
  const hoursUntilCheckIn = (checkInDate - now) / (1000 * 60 * 60);

  let refundPercentage = 0;
  let refundPolicy = '';

  if (hoursUntilCheckIn >= 48) {
    refundPercentage = 100;
    refundPolicy = 'Full refund (cancelled 48+ hours before check-in)';
  } else if (hoursUntilCheckIn >= 24) {
    refundPercentage = 50;
    refundPolicy = '50% refund (cancelled 24-48 hours before check-in)';
  } else {
    refundPercentage = 0;
    refundPolicy = 'No refund (cancelled less than 24 hours before check-in)';
  }

  const refundAmount = (booking.totalAmount * refundPercentage) / 100;

  // Update booking status
  booking.status = 'Cancelled';
  booking.specialRequests = (booking.specialRequests || '') +
    `\n[Cancelled] ${reason || 'No reason provided'} - ${refundPolicy}`;

  await booking.save();

  // Update room status back to available if it was reserved
  if (booking.room.status === 'reserved') {
    booking.room.status = 'available';
    await booking.room.save();
  }

  res.status(200).json({
    success: true,
    message: 'Booking cancelled successfully',
    booking,
    refund: {
      amount: refundAmount,
      percentage: refundPercentage,
      policy: refundPolicy
    }
  });
});

// ============================================
// 9. REQUEST REFUND
// ============================================
export const requestRefund = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!id) {
    throw Object.assign(new Error('Booking ID is required'), { status: 400 });
  }

  // Find booking
  const booking = await Booking.findById(id).populate('room hotel');
  if (!booking) {
    throw Object.assign(new Error('Booking not found'), { status: 404 });
  }

  // Check authorization
  const isOwner = booking.user?.toString() === req.user._id.toString();
  if (!isOwner) {
    throw Object.assign(new Error('Not authorized to request refund for this booking'), { status: 403 });
  }

  // Check if booking is cancelled
  if (booking.status !== 'Cancelled') {
    throw Object.assign(
      new Error('Only cancelled bookings can request refunds'),
      { status: 400 }
    );
  }

  // Calculate refund amount
  const now = new Date();
  const checkInDate = new Date(booking.checkIn);
  const hoursUntilCheckIn = (checkInDate - now) / (1000 * 60 * 60);

  let refundPercentage = 0;
  if (hoursUntilCheckIn >= 48) {
    refundPercentage = 100;
  } else if (hoursUntilCheckIn >= 24) {
    refundPercentage = 50;
  }

  const refundAmount = (booking.totalAmount * refundPercentage) / 100;

  // Add refund request note
  booking.specialRequests = (booking.specialRequests || '') +
    `\n[Refund Requested] ${reason || 'No reason provided'} - Amount: $${refundAmount}`;

  await booking.save();

  res.status(200).json({
    success: true,
    message: 'Refund request submitted successfully',
    refund: {
      amount: refundAmount,
      percentage: refundPercentage,
      status: 'pending'
    }
  });
});

// ============================================
// 10. BATCH ROOM BOOKING WITH CONFLICT DETECTION
// ============================================
// Accepts an array of room bookings, validates each, detects date conflicts
// (both against existing bookings and within the batch), and creates all
// bookings atomically inside a MongoDB transaction.
export const batchCreateBookings = asyncHandler(async (req, res) => {
  const { bookings } = req.body;

  // --- Input validation --------------------------------------------------------
  if (!Array.isArray(bookings) || bookings.length === 0) {
    throw Object.assign(
      new Error('"bookings" must be a non-empty array'),
      { status: 400 }
    );
  }

  // Maximum batch size to prevent unbounded writes
  const MAX_BATCH_SIZE = 50;
  if (bookings.length > MAX_BATCH_SIZE) {
    throw Object.assign(
      new Error(`Batch size exceeds maximum of ${MAX_BATCH_SIZE}`),
      { status: 400 }
    );
  }

  // --- Per-item validation (fail fast before touching the DB) ------------------
  for (let i = 0; i < bookings.length; i++) {
    const b = bookings[i];
    const idx = i; // capture for error context
    const missing = [];

    if (!b.guestName || b.guestName.trim().length < 2) missing.push('guestName (min 2 chars)');
    if (!b.guestPhone) missing.push('guestPhone');
    if (!b.checkIn) missing.push('checkIn');
    if (!b.checkOut) missing.push('checkOut');
    if (!b.roomId) missing.push('roomId');
    if (!b.hotelId) missing.push('hotelId');

    if (missing.length > 0) {
      res.status(400).json({
        success: false,
        message: `Invalid input at index ${idx}`,
        errors: { index: idx, missingFields: missing },
      });
      return;
    }

    // Phone format
    const cleanPhone = b.guestPhone.replace(/\D/g, '');
    if (!/^\d{10,}$/.test(cleanPhone)) {
      res.status(400).json({
        success: false,
        message: `Invalid phone format at index ${idx}`,
        errors: { index: idx, field: 'guestPhone', detail: 'minimum 10 digits required' },
      });
      return;
    }

    // Email if provided
    if (b.guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.guestEmail)) {
      res.status(400).json({
        success: false,
        message: `Invalid email format at index ${idx}`,
        errors: { index: idx, field: 'guestEmail' },
      });
      return;
    }

    // Dates
    try {
      validateDates(b.checkIn, b.checkOut);
    } catch (err) {
      res.status(400).json({
        success: false,
        message: `Date validation failed at index ${idx}: ${err.message}`,
        errors: { index: idx, field: 'checkIn/checkOut', detail: err.message },
      });
      return;
    }

    // Guests
    if (b.numGuests && (isNaN(b.numGuests) || b.numGuests < 1 || b.numGuests > 10)) {
      res.status(400).json({
        success: false,
        message: `Invalid numGuests at index ${idx} (must be 1-10)`,
        errors: { index: idx, field: 'numGuests' },
      });
      return;
    }
  }

  // --- Collect unique hotels and rooms -----------------------------------------
  const hotelIdSet = new Set(bookings.map((b) => b.hotelId));
  // Multi-hotel batch: validate access to every hotel
  const hotels = await Hotel.find({ _id: { $in: [...hotelIdSet] } }).select('company');
  if (hotels.length !== hotelIdSet.size) {
    throw Object.assign(new Error('One or more hotels not found'), { status: 404 });
  }
  for (const hotel of hotels) {
    await assertHotelAccess(req, hotel._id);
  }

  const allRoomIds = [...new Set(bookings.map((b) => b.roomId))];
  const rooms = await Room.find({ _id: { $in: allRoomIds } });
  if (rooms.length !== allRoomIds.length) {
    throw Object.assign(new Error('One or more rooms not found'), { status: 404 });
  }

  // Verify each room belongs to the hotel stated in its booking item
  const roomMap = new Map(rooms.map((r) => [r._id.toString(), r]));
  for (let i = 0; i < bookings.length; i++) {
    const b = bookings[i];
    const room = roomMap.get(b.roomId);
    if (!room) {
      throw Object.assign(new Error(`Room at index ${i} not found`), { status: 404 });
    }
    if (room.hotel.toString() !== b.hotelId.toString()) {
      throw Object.assign(
        new Error(`Room at index ${i} does not belong to the specified hotel`),
        { status: 400 }
      );
    }
    if (room.status !== 'available' && room.status !== 'reserved') {
      throw Object.assign(
        new Error(`Room at index ${i} is not bookable (status: ${room.status})`),
        { status: 400 }
      );
    }
  }

  // --- Conflict detection: existing active bookings with overlapping dates -----
  const checkInDates = bookings.map((b) => new Date(b.checkIn));
  const checkOutDates = bookings.map((b) => new Date(b.checkOut));
  const roomIdsForQuery = [...new Set(bookings.map((b) => b.roomId))];

  const existingConflicts = await Booking.find({
    room: { $in: roomIdsForQuery },
    status: { $in: ['Confirmed', 'Checked-In'] },
    $or: roomIdsForQuery.map((rid) => ({
      room: rid,
      checkIn: { $lt: new Date(
        Math.max(...checkOutDates.filter((_, k) => bookings[k].roomId === rid))
      ) },
      checkOut: { $gt: new Date(
        Math.min(...checkInDates.filter((_, k) => bookings[k].roomId === rid))
      ) },
    })),
  }).select('room checkIn checkOut status bookingId');

  if (existingConflicts.length > 0) {
    const conflictDetails = existingConflicts.map((c) => ({
      room: c.room.toString(),
      existingBookingId: c.bookingId,
      existingCheckIn: c.checkIn,
      existingCheckOut: c.checkOut,
      status: c.status,
    }));
    throw Object.assign(
      new Error('One or more rooms have existing booking conflicts'),
      { status: 409, conflicts: conflictDetails }
    );
  }

  // Simpler overlap check: for each unique room, find the union of requested dates
  // then query existing bookings that overlap with ANY of those ranges
  for (const rid of roomIdsForQuery) {
    const relatedBookings = bookings.filter((b) => b.roomId === rid);
    // Get hotel for this room to pass to checkRoomAvailability
    const roomForCheck = roomMap.get(rid);
    const hasOverlap = await Promise.all(
      relatedBookings.map((rb) => checkRoomAvailability(rb.roomId, rb.checkIn, rb.checkOut, roomForCheck.hotel))
    );
    if (hasOverlap.some((available) => !available)) {
      const roomForCheck = roomMap.get(rid);
      const conflicts = await Booking.find({
        room: rid,
        hotel: roomForCheck.hotel, // Multi-tenancy: scope by hotel
        status: { $in: ['Confirmed', 'Checked-In'] },
        $or: relatedBookings.map((rb) => ({
          checkIn: { $lt: new Date(rb.checkOut) },
          checkOut: { $gt: new Date(rb.checkIn) },
        })),
      }).select('room checkIn checkOut status bookingId');

      throw Object.assign(
        new Error('Room has existing booking conflicts for requested dates'),
        {
          status: 409,
          conflicts: conflicts.map((c) => ({
            room: c.room.toString(),
            existingBookingId: c.bookingId,
            existingCheckIn: c.checkIn,
            existingCheckOut: c.checkOut,
            status: c.status,
          })),
        }
      );
    }
  }

  // --- Intra-batch conflict: same room booked twice with overlapping dates -----
  for (let i = 0; i < bookings.length; i++) {
    for (let j = i + 1; j < bookings.length; j++) {
      const a = bookings[i];
      const b = bookings[j];
      if (a.roomId === b.roomId) {
        const aIn = new Date(a.checkIn);
        const aOut = new Date(a.checkOut);
        const bIn = new Date(b.checkIn);
        const bOut = new Date(b.checkOut);
        if (aIn < bOut && bIn < aOut) {
          throw Object.assign(
            new Error(
              `Duplicate room booking within batch: room ${a.roomId} has overlapping dates at indices ${i} and ${j}`
            ),
            { status: 400, conflicts: [{ indices: [i, j], roomId: a.roomId }] }
          );
        }
      }
    }
  }

  // --- Generate guest users (best-effort, outside transaction) -----------------
  const guestUserMap = new Map();
  for (const b of bookings) {
    if (b.guestEmail && !guestUserMap.has(b.guestEmail)) {
      try {
        let guestUser = await User.findOne({ email: b.guestEmail }).select('_id');
        if (!guestUser) {
          const guestRole = await getOrCreateGuestRole();
          guestUser = await User.create({
            fullname: b.guestName,
            username: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            email: b.guestEmail,
            password: crypto.randomBytes(16).toString('hex'),
            role: guestRole._id,
          });
        }
        guestUserMap.set(b.guestEmail, guestUser._id);
      } catch (err) {
        console.warn('Guest user lookup/creation skipped:', err.message);
      }
    }
  }

  // --- Atomic transaction: create all bookings + update rooms -------------------
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const hotelMap = new Map(hotels.map((h) => [h._id.toString(), h]));
    const createdBookings = [];
    const updatedRoomIds = new Set();

    for (const b of bookings) {
      const hotel = hotelMap.get(b.hotelId);
      const room = roomMap.get(b.roomId);
      const checkInDate = new Date(b.checkIn);
      const checkOutDate = new Date(b.checkOut);
      const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));
      const totalAmount = room.price * nights;
      const lockedRoom = await Room.findOneAndUpdate(
        { _id: b.roomId, hotel: b.hotelId, status: { $ne: 'maintenance' } },
        { $inc: { reservationVersion: 1 } }, { new: true, session }
      );
      if (!lockedRoom || !await checkRoomAvailability(b.roomId, checkInDate, checkOutDate, b.hotelId, null, session)) {
        throw Object.assign(new Error('Room is already booked for selected dates'), { status: 409 });
      }

      const bookingData = {
        user: b.guestEmail ? (guestUserMap.get(b.guestEmail) || null) : null,
        hotel: b.hotelId,
        company: hotel.company,
        room: b.roomId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: {
          adults: b.numGuests || 1,
          children: b.children || 0,
        },
        totalAmount,
        currency: b.currency || 'NPR',
        status: 'Confirmed',
        paymentStatus: 'unpaid',
        confirmationCode: generateConfirmationCode(),
        specialRequests: b.specialRequests || '',
        bookingSource: 'admin',
      };

      // Store guest identity inline
      if (b.guestPhone) {
        bookingData.guestInfo = {
          name: b.guestName,
          phone: b.guestPhone.replace(/\D/g, ''),
          email: b.guestEmail || null,
          idType: b.idType || null,
          idNumber: b.idNumber || null,
        };
      }

      const booking = await Booking.create([bookingData], { session });
      createdBookings.push(booking[0]);
      if (checkInDate.toDateString() === new Date().toDateString()) updatedRoomIds.add(b.roomId);
    }

    // Mark all affected rooms as reserved
    await Room.updateMany(
      { _id: { $in: [...updatedRoomIds] } },
      { $set: { status: 'reserved' } },
      { session }
    );

    // Commit
    await session.commitTransaction();

    // Populate after commit (populate does not work reliably inside transactions)
    const populated = await Booking.find({
      _id: { $in: createdBookings.map((b) => b._id) },
    }).populate(['user', 'hotel', 'room']);

    res.status(201).json({
      success: true,
      message: `${createdBookings.length} booking(s) created successfully`,
      count: createdBookings.length,
      bookings: populated.map((b) => ({
        _id: b._id,
        bookingId: b.bookingId,
        confirmationCode: b.confirmationCode,
        room: b.room,
        guestInfo: b.guestInfo,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        nights: b.durationNights,
        totalAmount: b.totalAmount,
        currency: b.currency,
        status: b.status,
        createdAt: b.createdAt,
      })),
    });
  } catch (err) {
    // Rollback on any failure -- nothing is persisted
    await session.abortTransaction();
    throw Object.assign(
      new Error(`Batch booking failed: ${err.message}`),
      { status: err.status || 500 }
    );
  } finally {
    session.endSession();
  }
});

// ============================================
// 8. GET AVAILABLE ROOMS
// ============================================
export const getAvailableRooms = asyncHandler(async (req, res) => {
  // Get hotelId from URL params
  const { hotelId } = req.params;
  const { checkIn, checkOut } = req.query;

  if (!hotelId) {
    throw Object.assign(new Error('Hotel ID is required'), { status: 400 });
  }

  await assertHotelAccess(req, hotelId);

  let query = { hotel: hotelId, status: 'available' };

  // If dates provided, check for conflicts
  if (checkIn || checkOut) {
    validateDates(checkIn, checkOut);
    // For date-aware availability checks we can include reserved rooms,
    // then exclude conflicting bookings by date overlap.
    query.status = { $ne: 'maintenance' };

    const occupiedRoomIds = await Booking.distinct('room', {
      hotel: hotelId,
      ...activeReservationFilter(),
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
