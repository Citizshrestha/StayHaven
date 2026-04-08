/**
 * Create Test Guest User
 * Creates a guest user with login credentials for testing
 * 
 * Usage: node Backend/scripts/createTestGuest.js
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
import { Role } from "../models/role.schema.js";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in environment variables");
  console.log("Please ensure Backend/.env file exists with MONGODB_URI");
  process.exit(1);
}

async function createTestGuest() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get or create guest role
    let guestRole = await Role.findOne({ name: 'guest' });
    if (!guestRole) {
      guestRole = await Role.create({ name: 'guest' });
      console.log("✅ Created guest role");
    }

    // Check if test guest already exists
    const existingGuest = await User.findOne({ email: 'guest@test.com' });
    if (existingGuest) {
      console.log("⚠️  Test guest already exists");
      console.log("\n📧 Login Credentials:");
      console.log("   Email: guest@test.com");
      console.log("   Password: Guest@123");
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create test guest user
    const testGuest = await User.create({
      fullname: "Test Guest",
      username: "testguest",
      email: "guest@test.com",
      password: "Guest@123", // Will be hashed automatically by the schema
      role: guestRole._id,
      profilePicture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=faces",
    });

    console.log("✅ Test guest user created successfully!");
    console.log("\n📧 Login Credentials:");
    console.log("   Email: guest@test.com");
    console.log("   Password: Guest@123");
    console.log("\n👤 User Details:");
    console.log(`   ID: ${testGuest._id}`);
    console.log(`   Name: ${testGuest.fullname}`);
    console.log(`   Username: ${testGuest.username}`);
    console.log(`   Role: guest`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating test guest:", err);
    process.exit(1);
  }
}

createTestGuest();
