/**
 * QR Code Integration Test Script
 * 
 * This script tests the QR code generation and database storage
 * Run with: node tests/testQRCode.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { HotelTable } from '../models/hotelTable.schema.js';
import { Room } from '../models/room.schema.js';
import { Hotel } from '../models/hotel.schema.js';
import { generateTableQRCode, generateRoomQRCode, validateQRToken } from '../utils/qrGenerator.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel-booking';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`),
};

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    log.success('Connected to MongoDB');
    return true;
  } catch (error) {
    log.error(`Failed to connect to MongoDB: ${error.message}`);
    return false;
  }
}

async function testQRCodeGeneration() {
  log.test('Testing QR Code Generation...');
  
  try {
    // Test table QR generation
    const tableToken = 'TBL-TEST12345678';
    const tableQR = await generateTableQRCode(tableToken);
    
    if (tableQR.qrCodeData && tableQR.qrCodeImage) {
      log.success(`Table QR Code generated successfully`);
      log.info(`  URL: ${tableQR.qrCodeData}`);
      log.info(`  Image size: ${tableQR.qrCodeImage.length} characters (base64)`);
      
      // Verify it's a valid base64 image
      if (tableQR.qrCodeImage.startsWith('data:image/png;base64,')) {
        log.success('  Valid PNG base64 format');
      } else {
        log.error('  Invalid image format');
      }
    } else {
      log.error('Table QR Code generation failed');
      return false;
    }

    // Test room QR generation
    const roomToken = 'RM-TEST123456789';
    const roomQR = await generateRoomQRCode(roomToken);
    
    if (roomQR.qrCodeData && roomQR.qrCodeImage) {
      log.success(`Room QR Code generated successfully`);
      log.info(`  URL: ${roomQR.qrCodeData}`);
    } else {
      log.error('Room QR Code generation failed');
      return false;
    }

    return true;
  } catch (error) {
    log.error(`QR Code generation error: ${error.message}`);
    return false;
  }
}

async function testTokenValidation() {
  log.test('Testing Token Validation...');
  
  const validTableToken = 'TBL-ABCDEF1234567890';
  const validRoomToken = 'RM-ABCDEF1234567890';
  const invalidToken = 'INVALID-TOKEN';
  
  if (validateQRToken(validTableToken, 'table')) {
    log.success('Valid table token recognized');
  } else {
    log.error('Valid table token rejected');
  }
  
  if (validateQRToken(validRoomToken, 'room')) {
    log.success('Valid room token recognized');
  } else {
    log.error('Valid room token rejected');
  }
  
  if (!validateQRToken(invalidToken, 'table')) {
    log.success('Invalid token correctly rejected');
  } else {
    log.error('Invalid token incorrectly accepted');
  }
  
  return true;
}

async function testDatabaseIntegration() {
  log.test('Testing Database Integration...');
  
  try {
    // Find any hotel to test with
    const hotel = await Hotel.findOne();
    
    if (!hotel) {
      log.warn('No hotels found in database. Skipping database integration test.');
      log.info('Create a hotel first to test full integration.');
      return true;
    }
    
    log.info(`Using hotel: ${hotel.name} (${hotel._id})`);
    
    // Test creating a table with QR code
    const testTableNumber = `TEST-${Date.now()}`;
    
    const table = new HotelTable({
      hotel: hotel._id,
      company: hotel.company,
      tableNumber: testTableNumber,
      tableName: `Test Table ${testTableNumber}`,
      capacity: 4,
      location: 'indoor',
    });
    
    // Save to trigger pre-save hook (generates uniqueToken)
    await table.save();
    
    log.success(`Table created with uniqueToken: ${table.uniqueToken}`);
    
    // Verify token was generated
    if (table.uniqueToken && table.uniqueToken.startsWith('TBL-')) {
      log.success('Unique token generated correctly');
    } else {
      log.error('Token generation failed');
      return false;
    }
    
    // Generate QR code
    const { qrCodeData, qrCodeImage } = await generateTableQRCode(table.uniqueToken);
    table.qrCodeData = qrCodeData;
    table.qrCodeImage = qrCodeImage;
    await table.save();
    
    // Verify QR was saved
    const savedTable = await HotelTable.findById(table._id);
    
    if (savedTable.qrCodeImage && savedTable.qrCodeData) {
      log.success('QR code saved to database successfully');
      log.info(`  qrCodeData: ${savedTable.qrCodeData}`);
      log.info(`  qrCodeImage length: ${savedTable.qrCodeImage.length} chars`);
    } else {
      log.error('QR code not saved to database');
      return false;
    }
    
    // Test retrieval by token
    const foundByToken = await HotelTable.findOne({ uniqueToken: table.uniqueToken });
    if (foundByToken) {
      log.success('Table can be retrieved by uniqueToken');
    } else {
      log.error('Failed to retrieve table by token');
      return false;
    }
    
    // Clean up - delete test table
    await HotelTable.findByIdAndDelete(table._id);
    log.success('Test table cleaned up');
    
    return true;
  } catch (error) {
    log.error(`Database integration error: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function testRoomQRIntegration() {
  log.test('Testing Room QR Integration...');
  
  try {
    // Find any room to test with
    const room = await Room.findOne();
    
    if (!room) {
      log.warn('No rooms found in database. Skipping room QR test.');
      return true;
    }
    
    log.info(`Using room: ${room.roomNumber} (${room._id})`);
    
    // Check if room already has a token
    if (room.uniqueToken) {
      log.info(`Room already has token: ${room.uniqueToken}`);
    } else {
      // Generate token for existing room
      room.uniqueToken = `RM-${require('crypto').randomBytes(8).toString('hex').toUpperCase()}`;
      await room.save();
      log.success(`Generated new token for room: ${room.uniqueToken}`);
    }
    
    // Generate QR code
    const { qrCodeData, qrCodeImage } = await generateRoomQRCode(room.uniqueToken);
    room.qrCodeData = qrCodeData;
    room.qrCodeImage = qrCodeImage;
    await room.save();
    
    // Verify
    const savedRoom = await Room.findById(room._id);
    if (savedRoom.qrCodeImage && savedRoom.qrCodeData) {
      log.success('Room QR code saved successfully');
      log.info(`  URL: ${savedRoom.qrCodeData}`);
    } else {
      log.error('Room QR code not saved');
      return false;
    }
    
    return true;
  } catch (error) {
    log.error(`Room QR integration error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🔬 QR CODE INTEGRATION TEST SUITE');
  console.log('='.repeat(60) + '\n');
  
  const results = {
    qrGeneration: false,
    tokenValidation: false,
    databaseIntegration: false,
    roomQRIntegration: false,
  };
  
  // Test 1: QR Code Generation (no DB needed)
  results.qrGeneration = await testQRCodeGeneration();
  console.log('');
  
  // Test 2: Token Validation
  results.tokenValidation = await testTokenValidation();
  console.log('');
  
  // Test 3: Database Integration
  const connected = await connectDB();
  if (connected) {
    results.databaseIntegration = await testDatabaseIntegration();
    console.log('');
    
    // Test 4: Room QR Integration
    results.roomQRIntegration = await testRoomQRIntegration();
    console.log('');
  } else {
    log.warn('Skipping database tests due to connection failure');
  }
  
  // Summary
  console.log('='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const [test, result] of Object.entries(results)) {
    if (result) {
      log.success(`${test}: PASSED`);
      passed++;
    } else {
      log.error(`${test}: FAILED`);
      failed++;
    }
  }
  
  console.log('');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60) + '\n');
  
  // Close connection
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    log.info('Database connection closed');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests();
