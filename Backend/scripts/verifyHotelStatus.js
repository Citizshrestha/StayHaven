/**
 * Verify and Fix Hotel Status
 * Ensures Test Hotel is properly configured for guest orders
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
import { Hotel } from "../models/hotel.schema.js";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found");
  process.exit(1);
}

async function verifyHotelStatus() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const hotels = await Hotel.find({}).select("name status isActive");
    
    console.log("\n📋 All Hotels:");
    console.log("─────────────────────────────────────────");
    
    for (const hotel of hotels) {
      console.log(`\n🏨 ${hotel.name}`);
      console.log(`   ID: ${hotel._id}`);
      console.log(`   Status: ${hotel.status}`);
      console.log(`   isActive: ${hotel.isActive}`);
      
      if (hotel.status !== 'approved' || !hotel.isActive) {
        console.log(`   ⚠️  Fixing hotel configuration...`);
        await Hotel.findByIdAndUpdate(hotel._id, {
          status: 'approved',
          isActive: true
        });
        console.log(`   ✅ Updated to: status='approved', isActive=true`);
      } else {
        console.log(`   ✅ Hotel is properly configured`);
      }
    }
    
    console.log("\n─────────────────────────────────────────");
    console.log("✅ Verification complete!");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

verifyHotelStatus();
