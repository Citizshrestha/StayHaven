/**
 * Script to create a Hotel Admin user
 * Run: node scripts/createHotelAdmin.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Define schemas inline for this script
const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  permissions: { type: [String], default: [] },
  description: { type: String },
  isSystemRole: { type: Boolean, default: false }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  companyRole: { type: String },
  assignedProperties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const hotelSchema = new mongoose.Schema({
  name: { type: String },
  location: { type: String }
}, { timestamps: true });

const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Hotel = mongoose.models.Hotel || mongoose.model('Hotel', hotelSchema);

const createHotelAdmin = async () => {
  await connectDB();

  try {
    // 1. First, ensure the 'admin' role exists
    let adminRole = await Role.findOne({ name: 'admin' });
    
    if (!adminRole) {
      adminRole = await Role.create({
        name: 'admin',
        permissions: ['all'],
        description: 'Hotel Administrator',
        isSystemRole: true
      });
      console.log('✅ Created admin role');
    } else {
      console.log('ℹ️  Admin role already exists');
    }

    // 2. Check if hotel admin user already exists
    const existingUser = await User.findOne({ email: 'hoteladmin@test.com' });
    
    if (existingUser) {
      console.log('ℹ️  Hotel admin user already exists');
      console.log('\n📋 Login Credentials:');
      console.log('   Email: hoteladmin@test.com');
      console.log('   Password: Admin@123');
      
      // Make sure user has admin role
      if (!existingUser.role || existingUser.role.toString() !== adminRole._id.toString()) {
        existingUser.role = adminRole._id;
        await existingUser.save();
        console.log('✅ Updated user role to admin');
      }
    } else {
      // 3. Create the hotel admin user
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      
      const hotelAdmin = await User.create({
        fullname: 'Hotel Administrator',
        username: 'hoteladmin',
        email: 'hoteladmin@test.com',
        password: hashedPassword,
        role: adminRole._id,
        companyRole: 'admin',
        isActive: true
      });

      console.log('✅ Hotel Admin user created successfully!');
      console.log('\n📋 Login Credentials:');
      console.log('   Email: hoteladmin@test.com');
      console.log('   Password: Admin@123');
    }

    // 4. Check for existing hotels and assign one
    const hotels = await Hotel.find().limit(5);
    
    if (hotels.length > 0) {
      console.log('\n🏨 Available Hotels:');
      hotels.forEach((h, i) => {
        console.log(`   ${i + 1}. ${h.name} (ID: ${h._id})`);
      });
      
      // Assign first hotel to the admin
      const adminUser = await User.findOne({ email: 'hoteladmin@test.com' });
      if (adminUser && hotels[0]) {
        adminUser.assignedProperties = [hotels[0]._id];
        await adminUser.save();
        console.log(`\n✅ Assigned hotel "${hotels[0].name}" to the admin user`);
      }
    } else {
      console.log('\n⚠️  No hotels found in database. Create a hotel first.');
    }

    console.log('\n🚀 You can now login at: http://localhost:5173/login');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

createHotelAdmin();
