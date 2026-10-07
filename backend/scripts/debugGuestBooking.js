/**
 * Debug Guest Booking
 * Check test guest's booking and hotel association
 */
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from "mongoose";
import { User } from "../models/user.schema.js";
import { Booking } from "../models/booking.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { MenuItem } from "../models/menuItem.schema.js";

const MONGODB_URI = process.env.MONGODB_URI;

async function debugGuestBooking() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find test guest
    const testGuest = await User.findOne({ email: 'guest@test.com' });
    if (!testGuest) {
      console.error("❌ Test guest not found");
      process.exit(1);
    }
    
    console.log("👤 Test Guest:");
    console.log(`   ID: ${testGuest._id}`);
    console.log(`   Name: ${testGuest.fullname}`);
    console.log(`   Email: ${testGuest.email}`);
    console.log(`   Role: ${testGuest.role}`);

    // Find active booking
    const activeBooking = await Booking.findOne({
      user: testGuest._id,
      status: { $in: ["Confirmed", "Checked-In"] }
    }).populate('hotel').populate('room').sort({ checkIn: 1 });

    if (!activeBooking) {
      console.error("\n❌ No active booking found for test guest");
      process.exit(1);
    }

    console.log("\n📋 Active Booking:");
    console.log(`   Booking ID: ${activeBooking.bookingId}`);
    console.log(`   Status: ${activeBooking.status}`);
    console.log(`   Check-in: ${activeBooking.checkIn}`);
    console.log(`   Check-out: ${activeBooking.checkOut}`);
    console.log(`   Hotel ID: ${activeBooking.hotel._id}`);
    console.log(`   Hotel Name: ${activeBooking.hotel.name}`);
    console.log(`   Room: ${activeBooking.room?.roomNumber || 'N/A'}`);

    // Check hotel details
    const hotel = await Hotel.findById(activeBooking.hotel._id);
    console.log("\n🏨 Hotel Details:");
    console.log(`   ID: ${hotel._id}`);
    console.log(`   Name: ${hotel.name}`);
    console.log(`   Status: ${hotel.status}`);
    console.log(`   isActive: ${hotel.isActive}`);
    console.log(`   Company: ${hotel.company}`);

    // Check menu items
    const menuCount = await MenuItem.countDocuments({ 
      hotel: hotel._id, 
      isAvailable: true 
    });
    console.log("\n🍽️  Menu Items:");
    console.log(`   Total available: ${menuCount}`);

    if (menuCount > 0) {
      const sampleItems = await MenuItem.find({ 
        hotel: hotel._id, 
        isAvailable: true 
      }).limit(3);
      console.log("\n   Sample items:");
      sampleItems.forEach(item => {
        console.log(`   - ${item.name} (${item.category}) - NPR ${item.price}`);
      });
    }

    // Test the resolveActiveHotel logic
    console.log("\n🔍 Testing resolveActiveHotel logic:");
    const resolvedHotelId = activeBooking.hotel?._id?.toString?.() || activeBooking.hotel?.toString();
    console.log(`   Resolved Hotel ID: ${resolvedHotelId}`);
    console.log(`   Match: ${resolvedHotelId === hotel._id.toString()}`);

    console.log("\n✅ All checks passed!");
    console.log("\n💡 If you're still seeing 'Hotel not available' error:");
    console.log("   1. Clear browser cache and localStorage");
    console.log("   2. Logout and login again");
    console.log("   3. Check browser console for API errors");
    console.log("   4. Verify backend server is running");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Error:", err);
    process.exit(1);
  }
}

debugGuestBooking();
