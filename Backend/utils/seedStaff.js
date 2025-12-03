import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/user.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { Role } from "../models/role.schema.js";
import { Company } from "../models/company.schema.js";

dotenv.config();

const seedStaff = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // 1. First, create a temporary owner user (or use existing one)
    let ownerRole = await Role.findOne({ name: "owner" });
    if (!ownerRole) {
      ownerRole = await Role.create({ name: "owner" });
      console.log("✅ Created owner role");
    }

    let ownerUser = await User.findOne({ email: "owner@test.com" });
    if (!ownerUser) {
      ownerUser = await User.create({
        fullname: "Test Owner",
        username: "testowner",
        email: "owner@test.com",
        password: "owner123",
        role: ownerRole._id,
        isActive: true,
      });
      console.log("✅ Created owner user: owner@test.com / owner123");
    } else {
      console.log("ℹ️ Using existing owner:", ownerUser.email);
    }

    // 2. Get or create a test company with ALL required fields
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create({
        name: "Test Hotel Company",
        legalName: "Test Hotel Company Pvt. Ltd.",
        type: "hotel",
        description: "A test hotel company for development",
        contact: {
          phone: "+977-1-4567890",
          email: "info@testhotel.com",
          website: "https://testhotel.com",
        },
        address: {
          street: "123 Test Street",
          city: "Kathmandu",
          state: "Bagmati",
          country: "Nepal",
          postalCode: "44600",
        },
        owner: ownerUser._id,
        isActive: true,
        status: "active",
      });
      console.log("✅ Created test company");

      // Update owner with company reference
      ownerUser.company = company._id;
      ownerUser.companyRole = "owner";
      await ownerUser.save();
    } else {
      console.log("ℹ️ Using existing company:", company.name);
    }

    // 3. Get or create a test hotel with ALL required fields
    let hotel = await Hotel.findOne();
    if (!hotel) {
      hotel = await Hotel.create({
        name: "Test Hotel",
        description: "A beautiful test hotel for development and testing purposes. Featuring modern amenities and excellent service.",
        owner: ownerUser._id,
        company: company._id,
        location: {
          city: "Kathmandu",
          address: "123 Test Street, Thamel",
          coordinates: {
            latitude: 27.7172,
            longitude: 85.3240,
          },
        },
        category: "Hotel",
        starRating: 4,
        priceRange: {
          min: 5000,
          max: 15000,
        },
        images: [
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
          "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800",
        ],
        amenities: ["WiFi", "Restaurant", "Room Service", "Parking", "AC"],
        contact: {
          phone: "+977-1-4567890",
          email: "hotel@testhotel.com",
          website: "https://testhotel.com",
        },
        status: "approved",
        isActive: true,
        totalRooms: 50,
        availableRooms: 45,
      });
      console.log("✅ Created test hotel");
    } else {
      console.log("ℹ️ Using existing hotel:", hotel.name);
    }

    // 4. Create roles (must match enum in role.schema.js)
    const rolesToCreate = ["kitchen", "waiter", "manager", "receptionist"];

    for (const roleName of rolesToCreate) {
      let role = await Role.findOne({ name: roleName });
      if (!role) {
        await Role.create({ name: roleName });
        console.log(`✅ Created role: ${roleName}`);
      }
    }

    // 5. Create test staff
    const testStaff = [
      {
        fullname: "Kitchen Staff",
        username: "kitchenstaff",
        email: "kitchen@test.com",
        password: "kitchen123",
        roleName: "kitchen",
      },
      {
        fullname: "Waiter Staff",
        username: "waiterstaff",
        email: "waiter@test.com",
        password: "waiter123",
        roleName: "waiter",
      },
      {
        fullname: "Manager Staff",
        username: "managerstaff",
        email: "manager@test.com",
        password: "manager123",
        roleName: "manager",
      },
      {
        fullname: "Receptionist Staff",
        username: "receptionstaff",
        email: "reception@test.com",
        password: "reception123",
        roleName: "receptionist",
      },
    ];

    for (const staffData of testStaff) {
      const exists = await User.findOne({ email: staffData.email });
      if (!exists) {
        const role = await Role.findOne({ name: staffData.roleName });
        if (role) {
          await User.create({
            fullname: staffData.fullname,
            username: staffData.username,
            email: staffData.email,
            password: staffData.password,
            role: role._id,
            company: company._id,
            companyRole: "staff",
            assignedProperties: [hotel._id],
            isActive: true,
          });
          console.log(`✅ Created: ${staffData.email} / ${staffData.password}`);
        } else {
          console.log(`❌ Role '${staffData.roleName}' not found`);
        }
      } else {
        console.log(`ℹ️ Already exists: ${staffData.email}`);
      }
    }

    console.log("\n🎉 Seed complete!");
    console.log("\n📋 Test Credentials:");
    console.log("   Owner:       owner@test.com / owner123");
    console.log("   Kitchen:     kitchen@test.com / kitchen123");
    console.log("   Waiter:      waiter@test.com / waiter123");
    console.log("   Manager:     manager@test.com / manager123");
    console.log("   Receptionist: reception@test.com / reception123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
};

seedStaff();