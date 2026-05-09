/**
 * Test script to verify notifications are being created and fetched correctly
 * 
 * Usage: node backend/scripts/testNotifications.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

import { Notification } from '../models/notification.schema.js';
import { User } from '../models/user.schema.js';
import { Order } from '../models/order.schema.js';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI or MONGO_URI not found in environment variables');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

const testNotifications = async () => {
  try {
    console.log('\n📊 NOTIFICATION SYSTEM TEST\n');
    console.log('='.repeat(50));

    // 1. Check total notifications in database
    const totalNotifications = await Notification.countDocuments();
    console.log(`\n1️⃣  Total notifications in database: ${totalNotifications}`);

    // 2. Get sample notifications
    const sampleNotifications = await Notification.find()
      .populate('user', 'fullname email companyRole')
      .populate('sender', 'fullname email companyRole')
      .sort({ createdAt: -1 })
      .limit(5);

    if (sampleNotifications.length > 0) {
      console.log(`\n2️⃣  Sample notifications (latest 5):`);
      sampleNotifications.forEach((notif, index) => {
        console.log(`\n   ${index + 1}. ${notif.title}`);
        console.log(`      Message: ${notif.message}`);
        console.log(`      Type: ${notif.type}`);
        console.log(`      To: ${notif.user?.fullname} (${notif.user?.companyRole})`);
        console.log(`      From: ${notif.sender?.fullname || 'System'}`);
        console.log(`      Read: ${notif.isRead ? '✓' : '✗'}`);
        console.log(`      Created: ${notif.createdAt.toLocaleString()}`);
      });
    } else {
      console.log(`\n2️⃣  No notifications found in database`);
    }

    // 3. Check notifications by user
    const staffUsers = await User.find({ 
      companyRole: { $in: ['waiter', 'chief', 'kitchen'] } 
    }).select('fullname email companyRole').limit(3);

    console.log(`\n3️⃣  Notifications by user:`);
    for (const user of staffUsers) {
      const userNotifCount = await Notification.countDocuments({ user: user._id });
      const unreadCount = await Notification.countDocuments({ user: user._id, isRead: false });
      console.log(`   ${user.fullname} (${user.companyRole}): ${userNotifCount} total, ${unreadCount} unread`);
    }

    // 4. Check recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select('orderNumber status orderType tableNumber roomNumber createdAt');

    console.log(`\n4️⃣  Recent orders (for reference):`);
    recentOrders.forEach((order, index) => {
      console.log(`   ${index + 1}. Order #${order.orderNumber} - ${order.status} (${order.orderType})`);
    });

    // 5. Test notification query (simulate API call)
    console.log(`\n5️⃣  Testing notification API query...`);
    if (staffUsers.length > 0) {
      const testUser = staffUsers[0];
      const apiResult = await Notification.find({ user: testUser._id })
        .populate('sender', 'fullname profilePicture companyRole')
        .sort({ createdAt: -1 })
        .limit(20);

      console.log(`   API query for ${testUser.fullname}: ${apiResult.length} notifications returned`);
      console.log(`   ✅ API query successful`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n✅ Notification system test completed!\n');

    // Recommendations
    if (totalNotifications === 0) {
      console.log('⚠️  RECOMMENDATION:');
      console.log('   No notifications found in database.');
      console.log('   Create a new order or update an existing order status to generate notifications.');
      console.log('   The system will now automatically create database notifications for:');
      console.log('   - New orders');
      console.log('   - Order status updates');
      console.log('   - Order ready notifications\n');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the test
connectDB().then(testNotifications);
