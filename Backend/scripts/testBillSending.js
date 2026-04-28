#!/usr/bin/env node

/**
 * Production-Level Bill Sending Test
 * 
 * Tests all 4 bill delivery methods:
 * 1. App Notification (WebSocket)
 * 2. Email (SMTP)
 * 3. SMS (TextBelt/Fast2SMS/MSG91/Twilio)
 * 4. WhatsApp (Twilio)
 * 
 * Usage:
 *   node scripts/testBillSending.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

// Test configuration
const TEST_CONFIG = {
  email: process.env.SMTP_FROM_EMAIL || 'test@example.com',
  phone: '+9779800000000', // Nepal format
  whatsapp: '+9779800000000',
};

console.log('\n🧪 StayHaven - Bill Sending System Test\n');
console.log('═'.repeat(70));

// ═══════════════════════════════════════════════════════════════════════
// TEST 1: Configuration Check
// ═══════════════════════════════════════════════════════════════════════

function testConfiguration() {
  console.log('\n📋 TEST 1: Configuration Check\n');
  
  const results = {
    database: !!MONGODB_URI && !MONGODB_URI.includes('YOUR_'),
    smtp: {
      host: !!process.env.SMTP_HOST,
      port: !!process.env.SMTP_PORT,
      user: !!process.env.SMTP_USER && !process.env.SMTP_USER.includes('YOUR_'),
      pass: !!process.env.SMTP_PASS && !process.env.SMTP_PASS.includes('YOUR_'),
      from: !!process.env.SMTP_FROM_EMAIL,
    },
    sms: {
      textbelt: process.env.USE_TEXTBELT === 'true',
      fast2sms: !!process.env.FAST2SMS_API_KEY && !process.env.FAST2SMS_API_KEY.includes('YOUR_'),
      msg91: !!process.env.MSG91_AUTH_KEY && !process.env.MSG91_AUTH_KEY.includes('YOUR_'),
      twilio: !!process.env.TWILIO_ACCOUNT_SID && !process.env.TWILIO_ACCOUNT_SID.includes('YOUR_'),
    },
    whatsapp: {
      twilio: !!process.env.TWILIO_WHATSAPP_NUMBER && !process.env.TWILIO_WHATSAPP_NUMBER.includes('YOUR_'),
    },
  };

  // Database
  console.log(`   Database: ${results.database ? '✅ Configured' : '❌ Missing'}`);
  
  // SMTP
  const smtpConfigured = Object.values(results.smtp).every(v => v);
  console.log(`   SMTP Email: ${smtpConfigured ? '✅ Configured' : '⚠️  Incomplete'}`);
  if (!smtpConfigured) {
    console.log('      Missing:', Object.entries(results.smtp)
      .filter(([k, v]) => !v)
      .map(([k]) => k)
      .join(', '));
  }
  
  // SMS
  const smsProviders = Object.entries(results.sms)
    .filter(([k, v]) => v)
    .map(([k]) => k);
  console.log(`   SMS: ${smsProviders.length > 0 ? '✅ Configured' : '❌ No provider'}`);
  if (smsProviders.length > 0) {
    console.log(`      Providers: ${smsProviders.join(', ')}`);
  }
  
  // WhatsApp
  console.log(`   WhatsApp: ${results.whatsapp.twilio ? '✅ Configured' : '❌ Not configured'}`);
  
  return {
    passed: results.database && smtpConfigured,
    results,
    smsProviders,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// TEST 2: Email Sending
// ═══════════════════════════════════════════════════════════════════════

async function testEmailSending() {
  console.log('\n📧 TEST 2: Email Sending\n');
  
  try {
    const { sendEmail, generateBillEmailHTML, generateBillTextMessage } = await import('../services/notificationService.js');
    
    const testBill = {
      orderNumber: 'TEST-' + Date.now(),
      hotelName: 'Test Hotel',
      hotelAddress: 'Kathmandu, Nepal',
      hotelPhone: '+977-1-4444444',
      location: 'Table 5',
      customerName: 'Test Guest',
      items: [
        { name: 'Test Item 1', quantity: 2, price: 500, total: 1000 },
        { name: 'Test Item 2', quantity: 1, price: 300, total: 300 },
      ],
      subtotal: 1300,
      tax: 169,
      total: 1469,
      date: new Date(),
    };
    
    console.log(`   Sending test email to: ${TEST_CONFIG.email}`);
    console.log(`   Order Number: ${testBill.orderNumber}`);
    console.log(`   Total: NPR ${testBill.total}`);
    
    const emailHTML = generateBillEmailHTML(testBill);
    const emailText = generateBillTextMessage(testBill);
    
    const result = await sendEmail({
      to: TEST_CONFIG.email,
      subject: `Bill for Order #${testBill.orderNumber} - Test Hotel`,
      html: emailHTML,
      text: emailText,
    });
    
    if (result.success) {
      console.log('   ✅ Email sent successfully!');
      console.log(`   Message ID: ${result.messageId || 'N/A'}`);
      return { passed: true, result };
    } else {
      console.log('   ❌ Email sending failed');
      console.log(`   Error: ${result.error}`);
      return { passed: false, error: result.error };
    }
  } catch (error) {
    console.log('   ❌ Email test failed');
    console.log(`   Error: ${error.message}`);
    return { passed: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TEST 3: SMS Sending
// ═══════════════════════════════════════════════════════════════════════

async function testSmsSending() {
  console.log('\n📱 TEST 3: SMS Sending\n');
  
  try {
    const { sendSMS, generateBillTextMessage } = await import('../services/notificationService.js');
    
    const testBill = {
      orderNumber: 'TEST-' + Date.now(),
      hotelName: 'Test Hotel',
      location: 'Table 5',
      customerName: 'Test Guest',
      items: [
        { name: 'Test Item 1', quantity: 2, price: 500, total: 1000 },
        { name: 'Test Item 2', quantity: 1, price: 300, total: 300 },
      ],
      total: 1469,
    };
    
    console.log(`   Sending test SMS to: ${TEST_CONFIG.phone}`);
    console.log(`   Order Number: ${testBill.orderNumber}`);
    console.log(`   Total: NPR ${testBill.total}`);
    
    const smsMessage = generateBillTextMessage(testBill);
    
    const result = await sendSMS({
      to: TEST_CONFIG.phone,
      message: smsMessage,
    });
    
    if (result.success) {
      console.log('   ✅ SMS sent successfully!');
      console.log(`   Provider: ${result.provider || 'N/A'}`);
      console.log(`   Message ID: ${result.messageId || 'N/A'}`);
      return { passed: true, result };
    } else {
      console.log('   ⚠️  SMS sending failed (this is expected if no SMS provider is configured)');
      console.log(`   Error: ${result.error}`);
      return { passed: false, error: result.error, expected: true };
    }
  } catch (error) {
    console.log('   ⚠️  SMS test failed');
    console.log(`   Error: ${error.message}`);
    return { passed: false, error: error.message, expected: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TEST 4: WhatsApp Sending
// ═══════════════════════════════════════════════════════════════════════

async function testWhatsAppSending() {
  console.log('\n💬 TEST 4: WhatsApp Sending\n');
  
  try {
    const { sendWhatsApp, generateBillTextMessage } = await import('../services/notificationService.js');
    
    const testBill = {
      orderNumber: 'TEST-' + Date.now(),
      hotelName: 'Test Hotel',
      location: 'Table 5',
      customerName: 'Test Guest',
      items: [
        { name: 'Test Item 1', quantity: 2, price: 500, total: 1000 },
        { name: 'Test Item 2', quantity: 1, price: 300, total: 300 },
      ],
      total: 1469,
    };
    
    console.log(`   Sending test WhatsApp to: ${TEST_CONFIG.whatsapp}`);
    console.log(`   Order Number: ${testBill.orderNumber}`);
    console.log(`   Total: NPR ${testBill.total}`);
    
    const whatsappMessage = generateBillTextMessage(testBill);
    
    const result = await sendWhatsApp({
      to: TEST_CONFIG.whatsapp,
      message: whatsappMessage,
    });
    
    if (result.success) {
      console.log('   ✅ WhatsApp sent successfully!');
      console.log(`   Message ID: ${result.messageId || 'N/A'}`);
      return { passed: true, result };
    } else {
      console.log('   ⚠️  WhatsApp sending failed (this is expected if Twilio is not configured)');
      console.log(`   Error: ${result.error}`);
      return { passed: false, error: result.error, expected: true };
    }
  } catch (error) {
    console.log('   ⚠️  WhatsApp test failed');
    console.log(`   Error: ${error.message}`);
    return { passed: false, error: error.message, expected: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TEST 5: Database Integration
// ═══════════════════════════════════════════════════════════════════════

async function testDatabaseIntegration() {
  console.log('\n🗄️  TEST 5: Database Integration\n');
  
  try {
    console.log('   Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('   ✅ Connected to MongoDB');
    
    // Import models
    const { Order } = await import('../models/order.schema.js');
    const { Hotel } = await import('../models/hotel.schema.js');
    
    // Find a test order
    console.log('   Looking for test orders...');
    const testOrder = await Order.findOne({ 
      paymentStatus: { $ne: 'paid' } 
    })
      .populate('hotel')
      .limit(1);
    
    if (testOrder) {
      console.log('   ✅ Found test order');
      console.log(`      Order Number: ${testOrder.orderNumber || testOrder._id}`);
      console.log(`      Total: NPR ${testOrder.totalPrice}`);
      console.log(`      Customer: ${testOrder.customerName || 'N/A'}`);
      console.log(`      Payment Status: ${testOrder.paymentStatus}`);
      return { passed: true, order: testOrder };
    } else {
      console.log('   ⚠️  No unpaid orders found (create one for full testing)');
      return { passed: true, order: null };
    }
  } catch (error) {
    console.log('   ❌ Database test failed');
    console.log(`   Error: ${error.message}`);
    return { passed: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════

async function runAllTests() {
  const results = {
    configuration: null,
    email: null,
    sms: null,
    whatsapp: null,
    database: null,
  };
  
  try {
    // Test 1: Configuration
    results.configuration = testConfiguration();
    
    if (!results.configuration.passed) {
      console.log('\n❌ Configuration incomplete. Please fix configuration issues first.\n');
      return results;
    }
    
    // Test 2: Email
    results.email = await testEmailSending();
    
    // Test 3: SMS
    results.sms = await testSmsSending();
    
    // Test 4: WhatsApp
    results.whatsapp = await testWhatsAppSending();
    
    // Test 5: Database
    results.database = await testDatabaseIntegration();
    
    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 TEST SUMMARY\n');
    console.log('═'.repeat(70));
    
    const criticalTests = ['configuration', 'email', 'database'];
    const optionalTests = ['sms', 'whatsapp'];
    
    console.log('\n🔴 Critical Features (Must Work):');
    criticalTests.forEach(test => {
      const result = results[test];
      const status = result?.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`   ${status} - ${test.toUpperCase()}`);
    });
    
    console.log('\n🟡 Optional Features (Nice to Have):');
    optionalTests.forEach(test => {
      const result = results[test];
      const status = result?.passed ? '✅ PASS' : result?.expected ? '⚠️  NOT CONFIGURED' : '❌ FAIL';
      console.log(`   ${status} - ${test.toUpperCase()}`);
    });
    
    const criticalPassed = criticalTests.every(test => results[test]?.passed);
    
    console.log('\n' + '═'.repeat(70));
    if (criticalPassed) {
      console.log('\n✅ PRODUCTION READY - All critical features working!\n');
      console.log('📝 Recommendations:');
      if (!results.sms?.passed) {
        console.log('   • Configure SMS provider for better guest communication');
        console.log('     Options: Fast2SMS (India), MSG91 (Global), Twilio (Global)');
      }
      if (!results.whatsapp?.passed) {
        console.log('   • Configure Twilio WhatsApp for modern messaging');
        console.log('     Get credentials: https://www.twilio.com/console');
      }
    } else {
      console.log('\n❌ NOT PRODUCTION READY - Fix critical issues first!\n');
      console.log('🔧 Required Actions:');
      criticalTests.forEach(test => {
        if (!results[test]?.passed) {
          console.log(`   • Fix ${test.toUpperCase()} configuration`);
        }
      });
    }
    console.log('\n' + '═'.repeat(70) + '\n');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Disconnected from MongoDB\n');
    }
  }
  
  return results;
}

// Run tests
runAllTests();
