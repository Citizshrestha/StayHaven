/**
 * createTestReceptionist.js
 *
 * Run from the Backend directory:
 *   node scripts/createTestReceptionist.js
 *
 * Creates a test receptionist account in the database for local development.
 * DO NOT use in production.
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { User } from "../models/user.schema.js";
import { Role } from "../models/role.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { Company } from "../models/company.schema.js";

// ─── Test credentials (change as needed) ───────────────────────────
const TEST_EMAIL = "receptionist@test.com";
const TEST_PASSWORD = "Test@1234"; // meets all strength requirements
const TEST_NAME = "Test Receptionist";
const TEST_USERNAME = "test_receptionist";
// ────────────────────────────────────────────────────────────────────

async function run() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      console.error("❌ MONGODB_URI / MONGO_URI not found in .env");
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    // Check if test account already exists
    const existing = await User.findOne({ email: TEST_EMAIL });
    if (existing) {
      console.log(`⚠️  Account already exists: ${TEST_EMAIL}`);
      console.log(`   Role: ${existing.companyRole} | Active: ${existing.isActive}`);
      console.log("\n🔑 Login credentials:");
      console.log(`   Email:    ${TEST_EMAIL}`);
      console.log(`   Password: ${TEST_PASSWORD}`);
      process.exit(0);
    }

    // Find or create the receptionist role
    let receptionistRole = await Role.findOne({ name: "receptionist" });
    if (!receptionistRole) {
      receptionistRole = await Role.create({ name: "receptionist" });
      console.log("✅ Created 'receptionist' role");
    }

    // Find a company — use the first one available
    const company = await Company.findOne();
    if (!company) {
      console.error("❌ No company found. Please create a company first via the app.");
      console.log("   Tip: Register as a hotel owner/admin to auto-create a company.");
      process.exit(1);
    }
    console.log(`✅ Using company: ${company.name}`);

    // Find a hotel assigned to that company
    const hotel = await Hotel.findOne({ company: company._id });
    if (!hotel) {
      console.error(`❌ No hotel found for company "${company.name}".`);
      console.log("   Tip: Add a hotel from the Hotel Admin dashboard first.");
      process.exit(1);
    }
    console.log(`✅ Using hotel: ${hotel.name}`);

    // Create the test receptionist
    const user = await User.create({
      fullname: TEST_NAME,
      username: TEST_USERNAME,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,         // hashed by pre-save hook
      role: receptionistRole._id,
      companyRole: "receptionist",
      company: company._id,
      assignedProperties: [hotel._id],
      isActive: true,
      isEmailVerified: true,
      accountStatus: "active",
    });

    console.log("\n✅ Test receptionist created successfully!");
    console.log("─────────────────────────────────────────");
    console.log("🔑 Login credentials:");
    console.log(`   Email:    ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD}`);
    console.log(`   Role:     receptionist`);
    console.log(`   Hotel:    ${hotel.name}`);
    console.log(`   Company:  ${company.name}`);
    console.log("─────────────────────────────────────────");
    console.log("\n👉 Go to: http://localhost:5173/staff/login");

  } catch (err) {
    console.error("❌ Error:", err.message);
    if (err.code === 11000) {
      console.log("   (Duplicate key — account may already exist with a different field)");
    }
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
