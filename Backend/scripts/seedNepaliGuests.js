/**
 * Seed Nepali Guests with Unsplash Profile Images
 * Replaces English names with authentic Nepali names
 * 
 * Usage: node scripts/seedNepaliGuests.js
 */
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { Guest } from "../models/guest.schema.js";
import { Booking } from "../models/booking.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { Company } from "../models/company.schema.js";

const MONGODB_URI = process.env.MONGODB_URI;

// Nepali names with gender and Unsplash profile images
const nepaliGuests = [
  // Male guests
  { fullName: "राजेश शर्मा", romanName: "Rajesh Sharma", gender: "male", email: "rajesh.sharma@example.com", phone: "+977 9841234567", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=faces", membershipTier: "Gold", loyaltyPoints: 15337, totalStays: 8, totalSpent: 24141, vipStatus: true },
  { fullName: "अमित गुरुङ", romanName: "Amit Gurung", gender: "male", email: "amit.gurung@example.com", phone: "+977 9851234568", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces", membershipTier: "Silver", loyaltyPoints: 10124, totalStays: 6, totalSpent: 16079, vipStatus: false },
  { fullName: "विक्रम तामाङ", romanName: "Vikram Tamang", gender: "male", email: "vikram.tamang@example.com", phone: "+977 9861234569", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=faces", membershipTier: "Gold", loyaltyPoints: 14646, totalStays: 10, totalSpent: 32103, vipStatus: true },
  { fullName: "सुरेश राई", romanName: "Suresh Rai", gender: "male", email: "suresh.rai@example.com", phone: "+977 9871234570", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=faces", membershipTier: "Bronze", loyaltyPoints: 3200, totalStays: 3, totalSpent: 7800, vipStatus: false },
  { fullName: "प्रदीप लिम्बु", romanName: "Pradeep Limbu", gender: "male", email: "pradeep.limbu@example.com", phone: "+977 9881234571", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop&crop=faces", membershipTier: "Silver", loyaltyPoints: 8500, totalStays: 5, totalSpent: 12000, vipStatus: false },
  { fullName: "रमेश पौडेल", romanName: "Ramesh Paudel", gender: "male", email: "ramesh.paudel@example.com", phone: "+977 9891234572", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=400&h=400&fit=crop&crop=faces", membershipTier: "Silver", loyaltyPoints: 35166, totalStays: 7, totalSpent: 27925, vipStatus: false },
  { fullName: "दिपक श्रेष्ठ", romanName: "Dipak Shrestha", gender: "male", email: "dipak.shrestha@example.com", phone: "+977 9801234573", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop&crop=faces", membershipTier: "Silver", loyaltyPoints: 5200, totalStays: 4, totalSpent: 8900, vipStatus: false },
  { fullName: "अनिल महर्जन", romanName: "Anil Maharjan", gender: "male", email: "anil.maharjan@example.com", phone: "+977 9811234574", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=400&fit=crop&crop=faces", membershipTier: "Gold", loyaltyPoints: 12000, totalStays: 7, totalSpent: 22500, vipStatus: true },
  { fullName: "सन्तोष भट्टराई", romanName: "Santosh Bhattarai", gender: "male", email: "santosh.bhattarai@example.com", phone: "+977 9821234575", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&h=400&fit=crop&crop=faces", membershipTier: "Bronze", loyaltyPoints: 1500, totalStays: 2, totalSpent: 4200, vipStatus: false },
  
  // Female guests
  { fullName: "सरिता खड्का", romanName: "Sarita Khadka", gender: "female", email: "sarita.khadka@example.com", phone: "+977 9831234576", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=faces", membershipTier: "Silver", loyaltyPoints: 3919, totalStays: 5, totalSpent: 10620, vipStatus: false },
  { fullName: "अञ्जना गुरुङ", romanName: "Anjana Gurung", gender: "female", email: "anjana.gurung@example.com", phone: "+977 9841234577", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=faces", membershipTier: "Silver", loyaltyPoints: 36319, totalStays: 8, totalSpent: 16802, vipStatus: false },
  { fullName: "प्रिया तामाङ", romanName: "Priya Tamang", gender: "female", email: "priya.tamang@example.com", phone: "+977 9851234578", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop&crop=faces", membershipTier: "Bronze", loyaltyPoints: 23786, totalStays: 6, totalSpent: 12446, vipStatus: false },
  { fullName: "सुनिता राई", romanName: "Sunita Rai", gender: "female", email: "sunita.rai@example.com", phone: "+977 9861234579", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=faces", membershipTier: "Gold", loyaltyPoints: 18000, totalStays: 9, totalSpent: 18500, vipStatus: true },
  { fullName: "रेखा लिम्बु", romanName: "Rekha Limbu", gender: "female", email: "rekha.limbu@example.com", phone: "+977 9871234580", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=faces", membershipTier: "Gold", loyaltyPoints: 9800, totalStays: 7, totalSpent: 15600, vipStatus: false },
  { fullName: "मीना पौडेल", romanName: "Meena Paudel", gender: "female", email: "meena.paudel@example.com", phone: "+977 9881234581", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=faces", membershipTier: "Silver", loyaltyPoints: 7600, totalStays: 5, totalSpent: 11200, vipStatus: false },
  { fullName: "गीता श्रेष्ठ", romanName: "Geeta Shrestha", gender: "female", email: "geeta.shrestha@example.com", phone: "+977 9891234582", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=faces", membershipTier: "Bronze", loyaltyPoints: 2100, totalStays: 3, totalSpent: 5400, vipStatus: false },
  { fullName: "कविता महर्जन", romanName: "Kavita Maharjan", gender: "female", email: "kavita.maharjan@example.com", phone: "+977 9801234583", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=faces", membershipTier: "Silver", loyaltyPoints: 6400, totalStays: 4, totalSpent: 9800, vipStatus: false },
  { fullName: "सुस्मिता भट्टराई", romanName: "Susmita Bhattarai", gender: "female", email: "susmita.bhattarai@example.com", phone: "+977 9811234584", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&crop=faces", membershipTier: "Gold", loyaltyPoints: 14200, totalStays: 9, totalSpent: 21300, vipStatus: true },
  { fullName: "पूजा खड्का", romanName: "Pooja Khadka", gender: "female", email: "pooja.khadka@example.com", phone: "+977 9821234585", country: "Nepal", avatarUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop&crop=faces", membershipTier: "Bronze", loyaltyPoints: 950, totalStays: 1, totalSpent: 2400, vipStatus: false },
];

async function seedNepaliGuests() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find hotel and company
    const hotel = await Hotel.findOne();
    const company = await Company.findOne();

    if (!hotel || !company) {
      console.error("❌ No hotel or company found. Please run seedReceptionData.js first.");
      process.exit(1);
    }

    const hotelId = hotel._id;
    const companyId = company._id;
    console.log(`🏨 Using Hotel: ${hotel.name}`);
    console.log(`🏢 Using Company: ${company.name}`);

    // Delete all existing guests
    console.log("🗑️  Deleting existing guests...");
    const deletedGuests = await Guest.deleteMany({ company: companyId });
    console.log(`   ✅ Deleted ${deletedGuests.deletedCount} guests`);

    // Create new Nepali guests
    console.log("👤 Creating Nepali guests with profile images...");
    const guestDocs = nepaliGuests.map((g, i) => ({
      hotel: hotelId,
      company: companyId,
      guestId: `G-${(10001 + i).toString().padStart(5, "0")}`,
      fullName: g.fullName,
      email: g.email,
      phone: g.phone,
      country: g.country,
      avatarUrl: g.avatarUrl,
      membershipTier: g.membershipTier,
      loyaltyPoints: g.loyaltyPoints,
      totalStays: g.totalStays,
      totalSpent: g.totalSpent,
      vipStatus: g.vipStatus,
      isActive: true,
      status: "Checked-Out", // Will be updated based on bookings
    }));

    const guests = await Guest.insertMany(guestDocs);
    console.log(`   ✅ Created ${guests.length} Nepali guests with profile images`);

    // Update existing bookings with new guest references
    console.log("📋 Updating bookings with Nepali guest names...");
    
    // Map old names to new Nepali guests
    const nameMapping = {
      "Courtney Wilson": guests[15], // मीना पौडेल
      "Tom Cook": guests[3], // सुरेश राई
      "Emma Wilson": guests[13], // सुनिता राई
      "Kenji Tanaka": guests[4], // प्रदीप लिम्बु
      "John Doe": guests[6], // दिपक श्रेष्ठ
      "Alice Cooper": guests[7], // अनिल महर्जन
      "Raj Patel": guests[8], // सन्तोष भट्टराई
      "Henry Garcia": guests[0], // राजेश शर्मा
      "Sophia Garcia": guests[19], // पूजा खड्का
      "Sarah Jenkins": guests[14], // रेखा लिम्बु
      "Isabella Garcia": guests[17], // कविता महर्जन
      "Lindsay Walton": guests[18], // सुस्मिता भट्टराई
      "Whitney Francis": guests[16], // गीता श्रेष्ठ
      "Oliver Brown": guests[5], // रमेश पौडेल
    };

    const bookings = await Booking.find({ hotel: hotelId });
    let updatedCount = 0;

    for (const booking of bookings) {
      const oldName = booking.guestInfo?.name;
      const newGuest = nameMapping[oldName];
      
      if (newGuest) {
        booking.guest = newGuest._id;
        booking.guestInfo = {
          name: newGuest.fullName,
          email: newGuest.email,
          phone: newGuest.phone,
        };
        await booking.save();
        updatedCount++;

        // Update guest status if checked in
        if (booking.status === "Checked-In") {
          await Guest.findByIdAndUpdate(newGuest._id, {
            status: "In-House",
            currentBooking: booking._id,
            currentRoom: booking.room?.roomNumber || null,
          });
        }
      }
    }

    console.log(`   ✅ Updated ${updatedCount} bookings with Nepali guest data`);

    // Display sample guests
    console.log("\n📋 Sample Nepali Guests:");
    guests.slice(0, 5).forEach((g, i) => {
      console.log(`   ${i + 1}. ${g.fullName} (${g.email})`);
      console.log(`      Avatar: ${g.avatarUrl}`);
      console.log(`      Tier: ${g.membershipTier}, Points: ${g.loyaltyPoints}`);
    });

    console.log("\n🎉 Nepali guest seed complete!");
    console.log(`   👤 Total Nepali guests: ${guests.length}`);
    console.log(`   📋 Updated bookings: ${updatedCount}`);
    console.log(`   🖼️  All guests have Unsplash profile images`);
    console.log(`   ✅ Gender-aligned names and images`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
}

seedNepaliGuests();
