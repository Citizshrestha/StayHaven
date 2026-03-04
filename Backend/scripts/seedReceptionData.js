/**
 * Seed script for StayHaven Reception Dashboard
 * Seeds: Rooms, Guests, Bookings, Invoices, HousekeepingTasks, GuestRequests, ActivityLogs
 *
 * Usage: node scripts/seedReceptionData.js
 * Requires: MONGODB_URI in .env and at least one Hotel + Company in the DB
 */
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { Room } from "../models/room.schema.js";
import { Booking } from "../models/booking.schema.js";
import { Guest } from "../models/guest.schema.js";
import { Invoice } from "../models/invoice.schema.js";
import { HousekeepingTask } from "../models/housekeepingTask.schema.js";
import { GuestRequest } from "../models/guestRequest.schema.js";
import { ActivityLog } from "../models/activityLog.schema.js";
import { User } from "../models/user.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { Company } from "../models/company.schema.js";

const MONGODB_URI = process.env.MONGODB_URI;

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  // Find the first hotel and company in the database
  let hotel = await Hotel.findOne();
  let company = await Company.findOne();

  if (!hotel || !company) {
    console.log("⚠️  No hotel or company found. Creating defaults...");
    if (!company) {
      company = await Company.create({
        name: "StayHaven Hotels",
        legalName: "StayHaven Hotels Pvt. Ltd.",
        type: "hotel",
        description: "Premium hotel management company",
        contact: { phone: "+91-9876543210", email: "admin@stayhaven.com" },
        address: { city: "Mumbai", state: "Maharashtra", country: "India" },
        status: "active",
        isActive: true,
        isVerified: true,
      });
    }
    if (!hotel) {
      const owner = await User.findOne({ companyRole: { $in: ["owner", "admin"] } });
      hotel = await Hotel.create({
        name: "StayHaven Hotel & Resort",
        description: "Premium hotel and resort",
        company: company._id,
        owner: owner?._id || undefined,
        location: { city: "Mumbai", address: "Marine Drive" },
        category: "Hotel",
        starRating: 5,
        status: "approved",
        isActive: true,
        totalRooms: 43,
      });
    }
  }

  const hotelId = hotel._id;
  const companyId = company._id;
  console.log(`🏨 Using Hotel: ${hotel.name} (${hotelId})`);
  console.log(`🏢 Using Company: ${company.name} (${companyId})`);

  // ═══════════════════════════════════════
  // CLEAR EXISTING SEED DATA
  // ═══════════════════════════════════════
  console.log("🗑️  Clearing existing reception data...");
  await Promise.all([
    Guest.deleteMany({ company: companyId }),
    Invoice.deleteMany({ company: companyId }),
    HousekeepingTask.deleteMany({ company: companyId }),
    GuestRequest.deleteMany({ company: companyId }),
    ActivityLog.deleteMany({ company: companyId }),
  ]);

  // ═══════════════════════════════════════
  // ROOMS (43 rooms across 2+ floors)
  // ═══════════════════════════════════════
  console.log("🛏️  Seeding rooms...");

  // Check if rooms exist already
  const existingRooms = await Room.countDocuments({ hotel: hotelId });

  const roomTypes = [
    { type: "Standard Queen", price: 150, maxGuests: 2, beds: "1 Queen", amenities: ["wifi", "tv", "ac", "coffee", "bath"] },
    { type: "Standard Twin", price: 120, maxGuests: 2, beds: "2 Twin", amenities: ["wifi", "tv", "ac", "coffee"] },
    { type: "Deluxe King", price: 220, maxGuests: 2, beds: "1 King", amenities: ["wifi", "tv", "ac", "coffee", "bath", "minibar"] },
    { type: "Executive Suite", price: 350, maxGuests: 3, beds: "1 King + Sofa", amenities: ["wifi", "tv", "ac", "coffee", "bath", "minibar", "workspace"] },
    { type: "Ocean View", price: 280, maxGuests: 2, beds: "1 King", amenities: ["wifi", "tv", "ac", "coffee", "bath", "balcony"] },
    { type: "Presidential Suite", price: 600, maxGuests: 4, beds: "2 King", amenities: ["wifi", "tv", "ac", "coffee", "bath", "minibar", "workspace", "jacuzzi"] },
    { type: "Garden View", price: 200, maxGuests: 2, beds: "1 Queen", amenities: ["wifi", "tv", "ac", "coffee", "bath", "balcony"] },
  ];

  const roomLayout = [
    // Floor 1: 101-108
    { number: "101", floor: 1, typeIdx: 0, status: "cleaning" },
    { number: "102", floor: 1, typeIdx: 2, status: "reserved" },
    { number: "103", floor: 1, typeIdx: 3, status: "available" },
    { number: "104", floor: 1, typeIdx: 4, status: "available" },
    { number: "105", floor: 1, typeIdx: 5, status: "cleaning" },
    { number: "106", floor: 1, typeIdx: 6, status: "occupied" },
    { number: "107", floor: 1, typeIdx: 1, status: "reserved" },
    { number: "108", floor: 1, typeIdx: 0, status: "cleaning" },
    // Floor 2: 201-210
    { number: "201", floor: 2, typeIdx: 2, status: "available" },
    { number: "202", floor: 2, typeIdx: 3, status: "occupied" },
    { number: "203", floor: 2, typeIdx: 4, status: "available" },
    { number: "204", floor: 2, typeIdx: 5, status: "occupied" },
    { number: "205", floor: 2, typeIdx: 0, status: "available" },
    { number: "206", floor: 2, typeIdx: 6, status: "occupied" },
    { number: "207", floor: 2, typeIdx: 1, status: "occupied" },
    { number: "208", floor: 2, typeIdx: 2, status: "available" },
    { number: "209", floor: 2, typeIdx: 0, status: "occupied" },
    { number: "210", floor: 2, typeIdx: 1, status: "maintenance" },
    // Floor 3: 301-308
    { number: "301", floor: 3, typeIdx: 2, status: "occupied" },
    { number: "302", floor: 3, typeIdx: 2, status: "occupied" },
    { number: "303", floor: 3, typeIdx: 3, status: "available" },
    { number: "304", floor: 3, typeIdx: 2, status: "cleaning" },
    { number: "305", floor: 3, typeIdx: 2, status: "occupied" },
    { number: "306", floor: 3, typeIdx: 4, status: "occupied" },
    { number: "307", floor: 3, typeIdx: 2, status: "reserved" },
    { number: "308", floor: 3, typeIdx: 0, status: "available" },
    // Floor 4: 401-406
    { number: "401", floor: 4, typeIdx: 3, status: "occupied" },
    { number: "402", floor: 4, typeIdx: 3, status: "reserved" },
    { number: "403", floor: 4, typeIdx: 3, status: "available" },
    { number: "404", floor: 4, typeIdx: 4, status: "occupied" },
    { number: "405", floor: 4, typeIdx: 2, status: "occupied" },
    { number: "406", floor: 4, typeIdx: 4, status: "available" },
    // Floor 5: 501-507
    { number: "501", floor: 5, typeIdx: 5, status: "occupied" },
    { number: "502", floor: 5, typeIdx: 5, status: "reserved" },
    { number: "503", floor: 5, typeIdx: 6, status: "cleaning" },
    { number: "504", floor: 5, typeIdx: 6, status: "occupied" },
    { number: "505", floor: 5, typeIdx: 3, status: "occupied" },
    { number: "506", floor: 5, typeIdx: 4, status: "maintenance" },
    { number: "507", floor: 5, typeIdx: 2, status: "occupied" },
    // Floor 6: 601-604
    { number: "601", floor: 6, typeIdx: 4, status: "available" },
    { number: "602", floor: 6, typeIdx: 4, status: "occupied" },
    { number: "603", floor: 6, typeIdx: 4, status: "cleaning" },
    { number: "604", floor: 6, typeIdx: 4, status: "available" },
    // Floor 7: 701-703
    { number: "701", floor: 7, typeIdx: 6, status: "occupied" },
    { number: "702", floor: 7, typeIdx: 6, status: "cleaning" },
    { number: "703", floor: 7, typeIdx: 6, status: "available" },
  ];

  if (existingRooms < 10) {
    // Delete and recreate rooms
    await Room.deleteMany({ hotel: hotelId });

    const roomDocs = roomLayout.map((r) => {
      const typeData = roomTypes[r.typeIdx];
      return {
        hotel: hotelId,
        company: companyId,
        roomName: typeData.type,
        roomNumber: r.number,
        type: typeData.type,
        price: typeData.price,
        floor: r.floor,
        maxGuests: typeData.maxGuests,
        status: r.status,
        amenities: typeData.amenities,
        bedType: typeData.beds.includes("King") ? "King" : typeData.beds.includes("Queen") ? "Queen" : "Twin",
        rating: parseFloat((3.8 + Math.random() * 1.2).toFixed(1)),
        lastCleaned: r.status === "cleaning"
          ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
          : r.status === "available"
          ? new Date(Date.now() - Math.random() * 6 * 60 * 60 * 1000)
          : null,
        capacity: { adults: typeData.maxGuests, children: Math.max(0, typeData.maxGuests - 1) },
      };
    });

    await Room.insertMany(roomDocs);
    console.log(`   ✅ Created ${roomDocs.length} rooms`);
  } else {
    // Update existing rooms with new fields
    for (const r of roomLayout) {
      const typeData = roomTypes[r.typeIdx];
      await Room.findOneAndUpdate(
        { hotel: hotelId, roomNumber: r.number },
        {
          $set: {
            floor: r.floor,
            maxGuests: typeData.maxGuests,
            status: r.status,
            rating: parseFloat((3.8 + Math.random() * 1.2).toFixed(1)),
            type: typeData.type,
            roomName: typeData.type,
            price: typeData.price,
          },
        },
        { upsert: true }
      );
    }
    console.log(`   ✅ Updated ${roomLayout.length} rooms`);
  }

  const allRooms = await Room.find({ hotel: hotelId }).lean();
  const roomMap = {};
  allRooms.forEach((r) => { roomMap[r.roomNumber] = r; });

  // ═══════════════════════════════════════
  // GUESTS (matching screenshots)
  // ═══════════════════════════════════════
  console.log("👤 Seeding guests...");

  const guestData = [
    { fullName: "Henry Garcia", email: "henry.garcia@example.com", phone: "+1 (555) 630-2401", country: "Japan", membershipTier: "Gold", loyaltyPoints: 15337, totalStays: 4, totalSpent: 24141, vipStatus: true, currentRoom: "204", status: "In-House" },
    { fullName: "Isabella Robinson", email: "isabella.robinson@example.com", phone: "+1 (555) 900-2580", country: "United States", membershipTier: "Silver", loyaltyPoints: 3919, totalStays: 9, totalSpent: 10620, vipStatus: false, currentRoom: "409", status: "In-House" },
    { fullName: "Lucas Garcia", email: "lucas.garcia@example.com", phone: "+1 (555) 579-8317", country: "Brazil", membershipTier: "Gold", loyaltyPoints: 14646, totalStays: 15, totalSpent: 32103, vipStatus: true, currentRoom: "517", status: "In-House" },
    { fullName: "Michael Robinson", email: "michael.robinson@example.com", phone: "+1 (555) 991-9532", country: "Canada", membershipTier: "Silver", loyaltyPoints: 10124, totalStays: 11, totalSpent: 16079, vipStatus: false, currentRoom: "101", status: "In-House" },
    { fullName: "Emma Thomas", email: "emma.thomas@example.com", phone: "+1 (555) 646-6530", country: "United Kingdom", membershipTier: "Silver", loyaltyPoints: 36319, totalStays: 12, totalSpent: 16802, vipStatus: false, currentRoom: "217", status: "In-House" },
    { fullName: "Charlotte Wilson", email: "charlotte.wilson@example.com", phone: "+1 (555) 711-8681", country: "Australia", membershipTier: "Bronze", loyaltyPoints: 23786, totalStays: 14, totalSpent: 12446, vipStatus: false, currentRoom: "406", status: "In-House" },
    { fullName: "Henry Martinez", email: "henry.martinez@example.com", phone: "+1 (555) 916-6689", country: "Mexico", membershipTier: "Silver", loyaltyPoints: 35166, totalStays: 10, totalSpent: 27925, vipStatus: false, currentRoom: "404", status: "In-House" },
    { fullName: "John Doe", email: "john.doe@example.com", phone: "+1 (555) 111-2222", country: "United States", membershipTier: "Silver", loyaltyPoints: 5200, totalStays: 3, totalSpent: 8900, vipStatus: false, currentRoom: "405", status: "In-House" },
    { fullName: "Alice Cooper", email: "alice.cooper@example.com", phone: "+1 (555) 333-4444", country: "United Kingdom", membershipTier: "Gold", loyaltyPoints: 12000, totalStays: 7, totalSpent: 22500, vipStatus: true, currentRoom: "501", status: "In-House" },
    { fullName: "Raj Patel", email: "raj.patel@example.com", phone: "+91 98765 43210", country: "India", membershipTier: "Bronze", loyaltyPoints: 1500, totalStays: 2, totalSpent: 4200, vipStatus: false, currentRoom: "210", status: "In-House" },
    { fullName: "Emma Wilson", email: "emma.wilson@example.com", phone: "+1 (555) 555-6666", country: "United States", membershipTier: "Gold", loyaltyPoints: 18000, totalStays: 8, totalSpent: 18500, vipStatus: true, currentRoom: "302", status: "In-House" },
    { fullName: "Kenji Tanaka", email: "kenji.tanaka@example.com", phone: "+81 90 1234 5678", country: "Japan", membershipTier: "Silver", loyaltyPoints: 8500, totalStays: 5, totalSpent: 12000, vipStatus: false, currentRoom: "118", status: "In-House" },
    { fullName: "Sarah Jenkins", email: "sarah.j@example.com", phone: "+1 (555) 123-4567", country: "United States", membershipTier: "Gold", loyaltyPoints: 9800, totalStays: 6, totalSpent: 15600, vipStatus: false, currentRoom: "304", status: "In-House" },
    { fullName: "Tom Cook", email: "tom.cook@example.com", phone: "+1 (555) 567-8901", country: "Canada", membershipTier: "Bronze", loyaltyPoints: 3200, totalStays: 4, totalSpent: 7800, vipStatus: false, currentRoom: "319", status: "In-House" },
    { fullName: "Courtney Wilson", email: "courtney.w@example.com", phone: "+1 (555) 456-7890", country: "United States", membershipTier: "Silver", loyaltyPoints: 7600, totalStays: 5, totalSpent: 11200, vipStatus: false, currentRoom: "376", status: "In-House" },
    { fullName: "Whitney Francis", email: "whitney.f@example.com", phone: "+1 (555) 234-5678", country: "Australia", membershipTier: "Bronze", loyaltyPoints: 2100, totalStays: 3, totalSpent: 5400, vipStatus: false, status: "Checked-Out" },
    { fullName: "Oliver Brown", email: "oliver.b@example.com", phone: "+44 20 7946 0958", country: "United Kingdom", membershipTier: "Bronze", loyaltyPoints: 1800, totalStays: 2, totalSpent: 3600, vipStatus: false, status: "Checked-Out" },
    { fullName: "Isabella Garcia", email: "isabella.g@example.com", phone: "+1 (555) 777-8888", country: "Spain", membershipTier: "Silver", loyaltyPoints: 6400, totalStays: 4, totalSpent: 9800, vipStatus: false, currentRoom: "402", status: "In-House" },
    { fullName: "Lindsay Walton", email: "lindsay.w@example.com", phone: "+1 (555) 999-0000", country: "United States", membershipTier: "Gold", loyaltyPoints: 14200, totalStays: 9, totalSpent: 21300, vipStatus: true, currentRoom: "305", status: "In-House" },
    { fullName: "Sophia Garcia", email: "sophia.garcia@example.com", phone: "+1 (555) 444-3333", country: "Mexico", membershipTier: "Bronze", loyaltyPoints: 950, totalStays: 1, totalSpent: 2400, vipStatus: false, currentRoom: "106", status: "In-House" },
  ];

  const guestDocs = guestData.map((g, i) => ({
    ...g,
    hotel: hotelId,
    company: companyId,
    guestId: `G-${(10001 + i).toString().padStart(5, "0")}`,
    isActive: true,
  }));

  const guests = await Guest.insertMany(guestDocs);
  console.log(`   ✅ Created ${guests.length} guests`);

  const guestMap = {};
  guests.forEach((g) => { guestMap[g.fullName] = g; });

  // ═══════════════════════════════════════
  // BOOKINGS (matching screenshot BK IDs)
  // ═══════════════════════════════════════
  console.log("📋 Seeding bookings...");

  // Clear existing bookings for this hotel
  await Booking.deleteMany({ hotel: hotelId });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const bookingData = [
    { bookingId: "#BK-5023", guestName: "Courtney Wilson", roomNum: "703", status: "Checked-Out", checkIn: -5, checkOut: -2, source: "Website", payment: "paid", amount: 1000, vip: false },
    { bookingId: "#BK-5022", guestName: "Courtney Wilson", roomNum: "104", status: "Pending", checkIn: 4, checkOut: 8, source: "Website", payment: "unpaid", amount: 600, vip: false },
    { bookingId: "#BK-5019", guestName: "Whitney Francis", roomNum: "402", status: "Checked-Out", checkIn: -10, checkOut: -7, source: "Booking.com", payment: "paid", amount: 1400, vip: false },
    { bookingId: "#BK-5018", guestName: "Tom Cook", roomNum: "307", status: "Checked-Out", checkIn: -8, checkOut: -3, source: "Website", payment: "paid", amount: 1100, vip: false },
    { bookingId: "#BK-5016", guestName: "Oliver Brown", roomNum: "701", status: "Cancelled", checkIn: -7, checkOut: -3, source: "Agoda", payment: "refunded", amount: 800, vip: false },
    { bookingId: "#BK-5014", guestName: "Tom Cook", roomNum: "502", status: "Checked-Out", checkIn: -12, checkOut: -9, source: "Walk-in", payment: "paid", amount: 2400, vip: false },
    { bookingId: "#BK-5012", guestName: "Sarah Jenkins", roomNum: "304", status: "Checked-In", checkIn: -2, checkOut: 3, source: "Website", payment: "paid", amount: 1100, vip: false },
    { bookingId: "#BK-5011", guestName: "Isabella Garcia", roomNum: "402", status: "Confirmed", checkIn: 1, checkOut: 5, source: "Expedia", payment: "paid", amount: 1400, vip: false },
    { bookingId: "#BK-5006", guestName: "Lindsay Walton", roomNum: "305", status: "Confirmed", checkIn: 0, checkOut: 4, source: "Website", payment: "paid", amount: 880, vip: true },
    // Today's arrivals
    { bookingId: "#BK-5050", guestName: "Tom Cook", roomNum: "319", status: "Confirmed", checkIn: 0, checkOut: 4, source: "Website", payment: "paid", amount: 480, vip: false, expectedTime: "11:19" },
    { bookingId: "#BK-5051", guestName: "Tom Cook", roomNum: "355", status: "Confirmed", checkIn: 0, checkOut: 3, source: "Website", payment: "unpaid", amount: 450, vip: false, expectedTime: "10:17" },
    { bookingId: "#BK-5052", guestName: "Courtney Wilson", roomNum: "376", status: "Checked-In", checkIn: 0, checkOut: 4, source: "Agoda", payment: "paid", amount: 2400, vip: false, expectedTime: "10:52" },
    // Active bookings for occupied rooms
    { bookingId: "#BK-5030", guestName: "John Doe", roomNum: "405", status: "Checked-In", checkIn: 0, checkOut: 3, source: "Website", payment: "paid", amount: 660, vip: false },
    { bookingId: "#BK-5031", guestName: "Alice Cooper", roomNum: "501", status: "Checked-In", checkIn: -1, checkOut: 4, source: "Agoda", payment: "paid", amount: 3000, vip: true },
    { bookingId: "#BK-5032", guestName: "Emma Wilson", roomNum: "302", status: "Checked-In", checkIn: -3, checkOut: 0, source: "Booking.com", payment: "paid", amount: 660, vip: true },
    { bookingId: "#BK-5033", guestName: "Raj Patel", roomNum: "210", status: "Confirmed", checkIn: 0, checkOut: 2, source: "Walk-in", payment: "unpaid", amount: 240, vip: false },
    { bookingId: "#BK-5034", guestName: "Henry Garcia", roomNum: "204", status: "Checked-In", checkIn: -5, checkOut: 0, source: "Website", payment: "paid", amount: 3000, vip: true },
    { bookingId: "#BK-5035", guestName: "Sophia Garcia", roomNum: "106", status: "Checked-In", checkIn: -2, checkOut: 3, source: "Website", payment: "partial", amount: 1000, vip: false },
    { bookingId: "#BK-5036", guestName: "Kenji Tanaka", roomNum: "118", status: "Checked-In", checkIn: -4, checkOut: 0, source: "Website", payment: "paid", amount: 560, vip: false },
    // Today's departures
    { bookingId: "#BK-5040", guestName: "Emma Wilson", roomNum: "302", status: "Checked-In", checkIn: -3, checkOut: 0, source: "Booking.com", payment: "paid", amount: 660, vip: true },
    { bookingId: "#BK-5041", guestName: "Kenji Tanaka", roomNum: "118", status: "Checked-In", checkIn: -4, checkOut: 0, source: "Website", payment: "paid", amount: 560, vip: false },
  ];

  const bookingDocs = [];
  for (const b of bookingData) {
    // Check if bookingId already exists => skip duplicates
    const checkIn = new Date(today);
    checkIn.setDate(checkIn.getDate() + b.checkIn);
    const checkOut = new Date(today);
    checkOut.setDate(checkOut.getDate() + b.checkOut);

    const guest = guestMap[b.guestName];
    const room = roomMap[b.roomNum] || allRooms[0]; // fallback

    bookingDocs.push({
      hotel: hotelId,
      company: companyId,
      room: room._id,
      guest: guest?._id,
      guestInfo: { name: b.guestName, email: guest?.email || "", phone: guest?.phone || "" },
      bookingId: b.bookingId,
      checkIn,
      checkOut,
      status: b.status,
      paymentStatus: b.payment,
      totalAmount: b.amount,
      currency: "INR",
      bookingSource: b.source,
      durationNights: Math.max(1, b.checkOut - b.checkIn),
      isVip: b.vip,
      earlyCheckinRequested: b.bookingId === "#BK-5050",
      expectedArrivalTime: b.expectedTime || null,
      confirmationCode: `CONF-${b.bookingId.replace("#BK-", "")}`,
      guests: { adults: b.vip ? 2 : 1, children: 0 },
    });
  }

  const bookings = await Booking.insertMany(bookingDocs);
  console.log(`   ✅ Created ${bookings.length} bookings`);

  // Update guests' currentBooking references
  for (const b of bookings) {
    if (b.guest && b.status === "Checked-In") {
      await Guest.findByIdAndUpdate(b.guest, { currentBooking: b._id });
    }
  }

  // ═══════════════════════════════════════
  // INVOICES
  // ═══════════════════════════════════════
  console.log("💰 Seeding invoices...");

  const invoiceDocs = bookings.slice(0, 15).map((b, i) => {
    const roomCharges = b.totalAmount;
    const extras = Math.floor(Math.random() * 200);
    const tax = Math.round(roomCharges * 0.13);
    const total = roomCharges + extras + tax;
    const st = b.paymentStatus === "paid" ? "paid" : b.paymentStatus === "partial" ? "partial" : b.paymentStatus === "refunded" ? "refunded" : "pending";

    return {
      hotel: hotelId,
      company: companyId,
      invoiceId: `INV-${(2024001 + i).toString()}`,
      booking: b._id,
      guest: b.guest,
      bookingRef: b.bookingId,
      guestName: b.guestInfo?.name || "",
      room: {
        type: allRooms.find((r) => r._id.toString() === b.room.toString())?.type || "",
        number: allRooms.find((r) => r._id.toString() === b.room.toString())?.roomNumber || "",
      },
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      nights: b.durationNights,
      charges: { room: roomCharges, extras, taxRate: 13, tax, total },
      paid: st === "paid" ? total : st === "partial" ? Math.round(total * 0.6) : 0,
      balance: st === "paid" ? 0 : st === "partial" ? Math.round(total * 0.4) : total,
      status: st,
      paymentMethod: ["Credit Card", "Debit Card", "Cash", "Bank Transfer", "UPI"][i % 5],
      issuedAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
    };
  });

  await Invoice.insertMany(invoiceDocs);
  console.log(`   ✅ Created ${invoiceDocs.length} invoices`);

  // ═══════════════════════════════════════
  // HOUSEKEEPING TASKS
  // ═══════════════════════════════════════
  console.log("🧹 Seeding housekeeping tasks...");

  const staffUsers = await User.find({ company: companyId, companyRole: { $exists: true } }).limit(5).lean();

  const hkData = allRooms.map((room) => {
    let hkStatus;
    switch (room.status) {
      case "cleaning": hkStatus = "in-progress"; break;
      case "maintenance": hkStatus = "maintenance"; break;
      case "occupied": hkStatus = Math.random() > 0.7 ? "needs-cleaning" : "clean"; break;
      case "available": hkStatus = Math.random() > 0.3 ? "inspected" : "clean"; break;
      case "reserved": hkStatus = "clean"; break;
      default: hkStatus = "clean";
    }

    const assignStaff = hkStatus === "in-progress" || hkStatus === "inspected";
    const staff = assignStaff && staffUsers.length > 0
      ? staffUsers[Math.floor(Math.random() * staffUsers.length)]
      : null;

    return {
      hotel: hotelId,
      company: companyId,
      room: room._id,
      roomNumber: room.roomNumber,
      roomType: room.type || room.roomName,
      floor: room.floor || parseInt(room.roomNumber?.[0]) || 1,
      status: hkStatus,
      priority: room.status === "cleaning" ? "high" : Math.random() > 0.8 ? "medium" : "normal",
      isOccupied: room.status === "occupied",
      assignedTo: staff?._id,
      assignedToName: staff?.fullname,
      lastCleaned: hkStatus === "clean" || hkStatus === "inspected"
        ? new Date(Date.now() - Math.random() * 3600000)
        : null,
      estimatedTime: hkStatus === "in-progress" ? Math.floor(Math.random() * 30) + 10 : null,
    };
  });

  await HousekeepingTask.insertMany(hkData);
  console.log(`   ✅ Created ${hkData.length} housekeeping tasks`);

  // ═══════════════════════════════════════
  // GUEST REQUESTS (matching screenshot)
  // ═══════════════════════════════════════
  console.log("📩 Seeding guest requests...");

  const requestData = [
    {
      roomNumber: "202",
      description: "Requesting 2 extra pillows and a duvet.",
      category: "Room Service",
      urgency: "urgent",
      status: "open",
      timeRemainingMinutes: 5,
      isOverdue: false,
    },
    {
      roomNumber: "505",
      description: "Late checkout request (2:00 PM).",
      category: "Checkout",
      urgency: "medium",
      status: "open",
      timeRemainingMinutes: 0,
      isOverdue: true,
    },
    {
      roomNumber: "301",
      description: "AC not cooling properly. Needs maintenance.",
      category: "Maintenance",
      urgency: "urgent",
      status: "open",
      timeRemainingMinutes: 12,
      isOverdue: false,
    },
  ];

  const requestDocs = requestData.map((r) => ({
    ...r,
    hotel: hotelId,
    company: companyId,
    room: roomMap[r.roomNumber]?._id,
    guest: null,
    guestName: null,
  }));

  await GuestRequest.insertMany(requestDocs);
  console.log(`   ✅ Created ${requestDocs.length} guest requests`);

  // ═══════════════════════════════════════
  // ACTIVITY LOG (matching screenshot)
  // ═══════════════════════════════════════
  console.log("📊 Seeding activity log...");

  const activityData = [
    { entityType: "booking", action: "check-in", description: "<strong>John Doe</strong> checked in to Room 405", icon: "CalendarCheck", color: "#10b981", minutes: 2 },
    { entityType: "payment", action: "payment", description: "Payment of <strong>₹12,500</strong> received — Room 302", icon: "DollarSign", color: "#6366f1", minutes: 8 },
    { entityType: "room", action: "status-change", description: "Room 201 moved to <strong>cleaning</strong>", icon: "Sparkles", color: "#f59e0b", minutes: 15 },
    { entityType: "housekeeping", action: "assigned", description: "<strong>Maria</strong> assigned to Room 302 housekeeping", icon: "Users", color: "#06b6d4", minutes: 22 },
    { entityType: "booking", action: "checkout", description: "<strong>Alice Cooper</strong> checked out from Room 501", icon: "LogOut", color: "#f97316", minutes: 35 },
    { entityType: "booking", action: "check-in", description: "<strong>Raj Patel</strong> checked in to Room 210", icon: "CalendarCheck", color: "#10b981", minutes: 45 },
    { entityType: "payment", action: "payment", description: "Payment of <strong>₹8,200</strong> received — Room 210", icon: "DollarSign", color: "#6366f1", minutes: 50 },
    { entityType: "housekeeping", action: "status-change", description: "Room 118 cleaning <strong>completed</strong>", icon: "Sparkles", color: "#10b981", minutes: 60 },
    { entityType: "room", action: "status-change", description: "Room 503 moved to <strong>maintenance</strong>", icon: "Wrench", color: "#ef4444", minutes: 75 },
    { entityType: "booking", action: "check-in", description: "<strong>Sarah Jenkins</strong> checked in to Room 304", icon: "CalendarCheck", color: "#10b981", minutes: 90 },
  ];

  const activityDocs = activityData.map((a) => ({
    hotel: hotelId,
    company: companyId,
    entityType: a.entityType,
    action: a.action,
    description: a.description,
    icon: a.icon,
    color: a.color,
    createdAt: new Date(Date.now() - a.minutes * 60 * 1000),
  }));

  await ActivityLog.insertMany(activityDocs);
  console.log(`   ✅ Created ${activityDocs.length} activity log entries`);

  // ═══════════════════════════════════════
  console.log("\n🎉 Seed complete! StayHaven reception data is ready.");
  console.log(`   🏨 Hotel: ${hotel.name}`);
  console.log(`   🛏️  Rooms: ${allRooms.length}`);
  console.log(`   👤 Guests: ${guests.length}`);
  console.log(`   📋 Bookings: ${bookings.length}`);
  console.log(`   💰 Invoices: ${invoiceDocs.length}`);
  console.log(`   🧹 Housekeeping: ${hkData.length}`);
  console.log(`   📩 Guest Requests: ${requestDocs.length}`);
  console.log(`   📊 Activity Logs: ${activityDocs.length}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
