import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { Hotel } from "../models/hotel.schema.js";
import { Room } from "../models/room.schema.js";
import { Company } from "../models/company.schema.js";

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

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const seedRooms = async () => {
  try {
    await connectDB();

    // Get all hotels
    const hotels = await Hotel.find();
    
    if (hotels.length === 0) {
      console.log('❌ No hotels found. Please create a hotel first.');
      process.exit(1);
    }

    console.log(`📍 Found ${hotels.length} hotel(s). Creating rooms...`);

    let totalRoomsCreated = 0;

    for (const hotel of hotels) {
      console.log(`\n🏨 Seeding rooms for hotel: ${hotel.name}`);

      // Get company
      const company = await Company.findById(hotel.company);
      if (!company) {
        console.log(`⚠️  Company not found for hotel ${hotel.name}, skipping...`);
        continue;
      }

      // Check if rooms already exist
      const existingRooms = await Room.countDocuments({ hotel: hotel._id });
      if (existingRooms > 0) {
        console.log(`   ⚠️  ${existingRooms} rooms already exist for this hotel, skipping...`);
        continue;
      }

      // Create rooms
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
      console.log(`   ✅ Created ${createdRooms.length} rooms`);
      totalRoomsCreated += createdRooms.length;

      // Log room details
      createdRooms.forEach(room => {
        console.log(`      • Room ${room.roomNumber} (${room.type}) - $${room.price}/night`);
      });
    }

    console.log(`\n✅ Total rooms created: ${totalRoomsCreated}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding rooms:', error);
    process.exit(1);
  }
};

seedRooms();
