/**
 * Create Test Guest Booking
 * Creates an active booking for the test guest user
 * 
 * Usage: node Backend/scripts/createTestGuestBooking.js
 */
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from Backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from "mongoose";
import { User } from "../models/user.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { Room } from "../models/room.schema.js";
import { Booking } from "../models/booking.schema.js";
import { MenuItem } from "../models/menuItem.schema.js";
import { Company } from "../models/company.schema.js";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in environment variables");
  process.exit(1);
}

async function createTestGuestBooking() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find test guest user
    const testGuest = await User.findOne({ email: 'guest@test.com' });
    if (!testGuest) {
      console.error("❌ Test guest user not found. Please run createTestGuest.js first.");
      process.exit(1);
    }
    console.log(`✅ Found test guest: ${testGuest.fullname}`);

    // Find a hotel
    const hotel = await Hotel.findOne({ isActive: true }).populate('company');
    if (!hotel) {
      console.error("❌ No active hotel found in database.");
      console.log("Please ensure you have hotels seeded in your database.");
      process.exit(1);
    }
    
    // Ensure hotel is properly configured for guest orders
    if (hotel.status !== 'approved') {
      console.log(`⚠️  Hotel status is '${hotel.status}', updating to 'approved'...`);
      await Hotel.findByIdAndUpdate(hotel._id, { 
        status: 'approved',
        isActive: true 
      });
      console.log("✅ Hotel status updated to 'approved'");
    }
    
    console.log(`✅ Found hotel: ${hotel.name}`);
    
    if (!hotel.company) {
      console.error("❌ Hotel does not have a company assigned.");
      process.exit(1);
    }

    // Find an available room
    const room = await Room.findOne({ hotel: hotel._id, status: 'available' });
    if (!room) {
      console.error("❌ No available rooms found for this hotel.");
      console.log("Please ensure you have rooms seeded in your database.");
      process.exit(1);
    }
    console.log(`✅ Found available room: ${room.roomNumber} (${room.type})`);

    // Check if booking already exists
    const existingBooking = await Booking.findOne({
      user: testGuest._id,
      status: { $in: ['Confirmed', 'Checked-In'] }
    });

    if (existingBooking) {
      console.log("⚠️  Active booking already exists for test guest");
      console.log("\n📋 Existing Booking Details:");
      console.log(`   Booking ID: ${existingBooking.bookingId}`);
      console.log(`   Hotel: ${hotel.name}`);
      console.log(`   Room: ${room.roomNumber}`);
      console.log(`   Status: ${existingBooking.status}`);
      console.log(`   Check-in: ${existingBooking.checkIn}`);
      console.log(`   Check-out: ${existingBooking.checkOut}`);
    } else {
      // Create a new booking (checked in for 3 days)
      const checkIn = new Date();
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 3); // 3 days from now

      const booking = await Booking.create({
        bookingId: `BK-${Date.now()}`,
        user: testGuest._id,
        hotel: hotel._id,
        company: hotel.company,
        room: room._id,
        guestInfo: {
          name: testGuest.fullname,
          email: testGuest.email,
          phone: testGuest.contact || '+977 9841234567',
        },
        checkIn: checkIn,
        checkOut: checkOut,
        guests: {
          adults: 1,
          children: 0,
        },
        durationNights: 3,
        totalAmount: (room.price || 5000) * 3,
        status: 'Checked-In',
        paymentStatus: 'paid',
        bookingSource: 'admin',
      });

      // Update room status
      await Room.findByIdAndUpdate(room._id, {
        status: 'occupied',
        currentGuest: testGuest._id,
      });

      console.log("✅ Test booking created successfully!");
      console.log("\n📋 Booking Details:");
      console.log(`   Booking ID: ${booking.bookingId}`);
      console.log(`   Guest: ${testGuest.fullname}`);
      console.log(`   Hotel: ${hotel.name}`);
      console.log(`   Room: ${room.roomNumber} (${room.type})`);
      console.log(`   Check-in: ${checkIn.toLocaleDateString()}`);
      console.log(`   Check-out: ${checkOut.toLocaleDateString()}`);
      console.log(`   Status: Checked-In`);
      console.log(`   Total Amount: NPR ${(room.price || 5000) * 3}`);
    }

    // Check menu items
    const menuCount = await MenuItem.countDocuments({ hotel: hotel._id, isAvailable: true });
    console.log(`\n🍽️  Menu Items: ${menuCount} available items`);

    if (menuCount === 0) {
      console.log("\n⚠️  No menu items found for this hotel.");
      console.log("Creating sample menu items...");

      const sampleMenuItems = [
        { name: 'Chicken Momo (10 pcs)', category: 'Appetizers', price: 250, description: 'Steamed chicken dumplings', image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400' },
        { name: 'Veg Momo (10 pcs)', category: 'Appetizers', price: 200, description: 'Steamed vegetable dumplings', image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400' },
        { name: 'Paneer Tikka', category: 'Appetizers', price: 350, description: 'Grilled cottage cheese with spices', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400' },
        { name: 'Dal Bhat Set', category: 'Lunch', price: 450, description: 'Traditional Nepali meal with rice, lentils, curry, and vegetables', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400' },
        { name: 'Chicken Chowmein', category: 'Dinner', price: 350, description: 'Stir-fried noodles with chicken and vegetables', image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400' },
        { name: 'Veg Chowmein', category: 'Dinner', price: 280, description: 'Stir-fried noodles with vegetables', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400' },
        { name: 'Chicken Biryani', category: 'Dinner', price: 550, description: 'Aromatic basmati rice with spiced chicken', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400' },
        { name: 'Butter Chicken with Naan', category: 'Dinner', price: 650, description: 'Creamy tomato-based chicken curry with butter naan', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400' },
        { name: 'French Fries', category: 'Snacks', price: 180, description: 'Crispy golden fries', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400' },
        { name: 'Chicken Sandwich', category: 'Snacks', price: 320, description: 'Grilled chicken sandwich with fresh vegetables', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400' },
        { name: 'Mango Lassi', category: 'Drinks', price: 200, description: 'Sweet mango yogurt drink', image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400' },
        { name: 'Masala Tea', category: 'Drinks', price: 100, description: 'Spiced milk tea', image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=300&fit=crop' },
        { name: 'Fresh Lime Soda', category: 'Drinks', price: 150, description: 'Refreshing lime soda with mint', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400' },
        { name: 'Chocolate Cake Slice', category: 'Dessert', price: 280, description: 'Rich chocolate layer cake', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400' },
        { name: 'Gulab Jamun (2 pcs)', category: 'Dessert', price: 180, description: 'Sweet milk dumplings in sugar syrup', image: 'https://images.unsplash.com/photo-1589119908995-c6c8f7d7e3b7?w=400' },
      ];

      const menuItems = await MenuItem.insertMany(
        sampleMenuItems.map(item => ({
          ...item,
          hotel: hotel._id,
          isAvailable: true,
          preparationTime: 25,
        }))
      );

      console.log(`✅ Created ${menuItems.length} sample menu items`);
    }

    console.log("\n🎉 Setup complete!");
    console.log("\n📧 Test Guest Login:");
    console.log("   URL: http://localhost:5173/guest/login");
    console.log("   Email: guest@test.com");
    console.log("   Password: Guest@123");
    console.log("\n✨ The guest can now:");
    console.log("   - View their active booking");
    console.log("   - Order room service from the menu");
    console.log("   - Track orders in real-time");
    console.log("   - View billing information");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

createTestGuestBooking();
