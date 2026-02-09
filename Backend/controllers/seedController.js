import { Hotel } from "../models/hotel.schema.js";
import { Room } from "../models/room.schema.js";
import { Company } from "../models/company.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const ROOM_TYPES = [
  {
    roomNumber: '101',
    type: 'single',
    price: 120,
    bedType: 'Single',
    amenities: ['WiFi', 'AC', 'TV', 'Mini Bar'],
    description: 'Comfortable single room with modern amenities'
  },
  {
    roomNumber: '102',
    type: 'single',
    price: 120,
    bedType: 'Single',
    amenities: ['WiFi', 'AC', 'TV', 'Mini Bar'],
    description: 'Comfortable single room with modern amenities'
  },
  {
    roomNumber: '201',
    type: 'double',
    price: 150,
    bedType: 'Double',
    amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Coffee Maker'],
    description: 'Spacious double room with city view'
  },
  {
    roomNumber: '202',
    type: 'double',
    price: 150,
    bedType: 'Double',
    amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Coffee Maker'],
    description: 'Spacious double room with city view'
  },
  {
    roomNumber: '203',
    type: 'double',
    price: 150,
    bedType: 'Double',
    amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Coffee Maker'],
    description: 'Spacious double room with city view'
  },
  {
    roomNumber: '301',
    type: 'deluxe',
    price: 200,
    bedType: 'King',
    amenities: ['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Coffee Maker', 'Jacuzzi', 'Bathrobe'],
    description: 'Deluxe room with premium amenities and garden view'
  },
  {
    roomNumber: '302',
    type: 'deluxe',
    price: 200,
    bedType: 'King',
    amenities: ['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Coffee Maker', 'Jacuzzi', 'Bathrobe'],
    description: 'Deluxe room with premium amenities and garden view'
  },
  {
    roomNumber: '401',
    type: 'suite',
    price: 300,
    bedType: 'King',
    amenities: ['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Coffee Maker', 'Jacuzzi', 'Bathrobe', 'Sofa', 'Work Desk'],
    description: 'Spacious suite with separate living area'
  },
  {
    roomNumber: '402',
    type: 'suite',
    price: 300,
    bedType: 'King',
    amenities: ['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Coffee Maker', 'Jacuzzi', 'Bathrobe', 'Sofa', 'Work Desk'],
    description: 'Spacious suite with separate living area'
  },
  {
    roomNumber: '501',
    type: 'villa',
    price: 500,
    bedType: 'King',
    amenities: ['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Coffee Maker', 'Jacuzzi', 'Bathrobe', 'Sofa', 'Work Desk', 'Private Pool', 'Terrace'],
    description: 'Luxurious villa with private amenities'
  }
];

// @desc    Seed rooms for a hotel
// @route   POST /api/seed/rooms/:hotelId
// @access  Admin only (for testing)
export const seedRoomsForHotel = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;

  // Find hotel
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) {
    throw Object.assign(new Error('Hotel not found'), { status: 404 });
  }

  // Find company
  const company = await Company.findById(hotel.company);
  if (!company) {
    throw Object.assign(new Error('Company not found'), { status: 404 });
  }

  // Check if rooms already exist
  const existingRooms = await Room.countDocuments({ hotel: hotelId });
  if (existingRooms > 0) {
    return res.status(200).json({
      success: true,
      message: `Hotel already has ${existingRooms} rooms. Skipping seed.`,
      warning: true
    });
  }

  // Create rooms
  const roomsToCreate = ROOM_TYPES.map(roomData => ({
    ...roomData,
    hotel: hotelId,
    company: company._id,
    roomName: `${hotel.name} - Room ${roomData.roomNumber}`,
    capacity: {
      adults: roomData.type === 'single' ? 1 : roomData.type === 'suite' || roomData.type === 'villa' ? 4 : 2,
      children: roomData.type === 'suite' || roomData.type === 'villa' ? 2 : 1
    },
    status: 'available',
    images: [],
    isQrActive: true
  }));

  const createdRooms = await Room.insertMany(roomsToCreate);

  res.status(201).json({
    success: true,
    message: `Successfully created ${createdRooms.length} test rooms`,
    hotel: {
      id: hotel._id,
      name: hotel.name
    },
    roomCount: createdRooms.length,
    rooms: createdRooms.map(room => ({
      id: room._id,
      roomNumber: room.roomNumber,
      type: room.type,
      price: room.price,
      status: room.status
    }))
  });
});

// @desc    Seed all hotels with rooms
// @route   POST /api/seed/all-rooms
// @access  Admin only (for testing)
export const seedAllRooms = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find();

  if (hotels.length === 0) {
    throw Object.assign(new Error('No hotels found to seed'), { status: 404 });
  }

  const results = [];
  let totalCreated = 0;

  for (const hotel of hotels) {
    const company = await Company.findById(hotel.company);
    if (!company) continue;

    const existingRooms = await Room.countDocuments({ hotel: hotel._id });
    if (existingRooms > 0) {
      results.push({
        hotel: hotel.name,
        status: 'skipped',
        reason: `Already has ${existingRooms} rooms`
      });
      continue;
    }

    const roomsToCreate = ROOM_TYPES.map(roomData => ({
      ...roomData,
      hotel: hotel._id,
      company: company._id,
      roomName: `${hotel.name} - Room ${roomData.roomNumber}`,
      capacity: {
        adults: roomData.type === 'single' ? 1 : roomData.type === 'suite' || roomData.type === 'villa' ? 4 : 2,
        children: roomData.type === 'suite' || roomData.type === 'villa' ? 2 : 1
      },
      status: 'available',
      images: [],
      isQrActive: true
    }));

    const createdRooms = await Room.insertMany(roomsToCreate);
    totalCreated += createdRooms.length;

    results.push({
      hotel: hotel.name,
      status: 'success',
      roomsCreated: createdRooms.length
    });
  }

  res.status(201).json({
    success: true,
    message: `Seeding complete. Created ${totalCreated} total rooms.`,
    totalHotels: hotels.length,
    totalRoomsCreated: totalCreated,
    results
  });
});

// @desc    Delete all rooms from a hotel (for testing)
// @route   DELETE /api/seed/rooms/:hotelId
// @access  Admin only (for testing)
export const clearHotelRooms = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;

  const result = await Room.deleteMany({ hotel: hotelId });

  res.status(200).json({
    success: true,
    message: `Deleted ${result.deletedCount} rooms from hotel`,
    deletedCount: result.deletedCount
  });
});
