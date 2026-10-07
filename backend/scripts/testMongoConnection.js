/**
 * Simple MongoDB Connection Test
 * Tests basic connectivity to MongoDB Atlas
 *
 * Usage: node Backend/scripts/testMongoConnection.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const testConnection = async () => {
  console.log('\n🔍 MongoDB Connection Test\n');
  console.log('='.repeat(60));

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  // Mask password in logs
  const maskedUri = mongoUri.replace(/:[^:@]+@/, ':****@');
  console.log(`\n📍 Connection String: ${maskedUri}`);
  console.log(`\n⏳ Attempting to connect...`);

  try {
    // Try connecting with timeout
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000,
    });

    console.log('\n✅ MongoDB Connected Successfully!');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
    console.log(`🔌 Connection State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected'}`);

    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📁 Collections found: ${collections.length}`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Connection test passed!\n');

  } catch (error) {
    console.error('\n❌ Connection Failed!');
    console.error('\nError Details:');
    console.error(`   Type: ${error.name}`);
    console.error(`   Message: ${error.message}`);

    console.log('\n🔧 Troubleshooting Steps:\n');
    console.log('1. Check your internet connection');
    console.log('2. Verify MongoDB Atlas cluster is running (not paused)');
    console.log('3. Check MongoDB Atlas Network Access settings:');
    console.log('   - Go to: https://cloud.mongodb.com');
    console.log('   - Navigate to: Network Access');
    console.log('   - Add your IP address or use 0.0.0.0/0 for testing');
    console.log('4. Verify the connection string is correct');
    console.log('5. Check if your firewall/antivirus is blocking the connection');
    console.log('6. Try disabling VPN if you\'re using one');
    console.log('7. Verify database user credentials are correct\n');

    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.log('⚠️  DNS Resolution Error Detected:');
      console.log('   This usually means:');
      console.log('   - Network/DNS issues');
      console.log('   - Firewall blocking MongoDB Atlas');
      console.log('   - VPN interfering with connection\n');
    }

    if (error.message.includes('authentication failed')) {
      console.log('⚠️  Authentication Error Detected:');
      console.log('   - Check username and password in MONGODB_URI');
      console.log('   - Verify database user exists in MongoDB Atlas\n');
    }

  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Connection closed\n');
    }
  }
};

// Run the test
testConnection();
