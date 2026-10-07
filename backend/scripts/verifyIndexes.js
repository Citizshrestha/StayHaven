/**
 * Database Index Verification Script
 * Verifies that all required indexes are properly created for production performance
 */

import mongoose from "mongoose";
import { Booking } from "../models/booking.schema.js";
import { Guest } from "../models/guest.schema.js";
import { Room } from "../models/room.schema.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { Invoice } from "../models/invoice.schema.js";
import { ActivityLog } from "../models/activityLog.schema.js";

// Define expected indexes for each collection
const expectedIndexes = {
  bookings: [
    { fields: { user: 1, status: 1 }, name: "user_status" },
    { fields: { guest: 1, status: 1 }, name: "guest_status" },
    { fields: { bookingId: 1 }, name: "bookingId", unique: true },
    { fields: { confirmationCode: 1 }, name: "confirmationCode", unique: true, sparse: true },
    { fields: { room: 1, checkIn: 1, checkOut: 1 }, name: "room_availability" },
    { fields: { room: 1, status: 1, checkIn: 1, checkOut: 1 }, name: "room_status_availability" },
    { fields: { hotel: 1, status: 1, checkIn: 1 }, name: "hotel_checkins" },
    { fields: { hotel: 1, status: 1, checkOut: 1 }, name: "hotel_checkouts" },
    { fields: { hotel: 1, status: 1, updatedAt: -1 }, name: "hotel_status_updates" },
    { fields: { hotel: 1, paymentStatus: 1, status: 1 }, name: "hotel_payment_status" },
    { fields: { company: 1, status: 1 }, name: "company_status" },
    { fields: { company: 1, createdAt: -1 }, name: "company_created" },
    { fields: { createdAt: -1 }, name: "createdAt_desc" },
    { fields: { checkIn: 1, status: 1 }, name: "checkin_status" },
    { fields: { checkOut: 1, status: 1 }, name: "checkout_status" },
    { fields: { hotel: 1, checkIn: 1, checkOut: 1, status: 1 }, name: "hotel_dashboard" },
    { fields: { "guestInfo.name": "text", bookingId: "text" }, name: "text_search", type: "text" },
  ],
  guests: [
    { fields: { hotel: 1, status: 1 }, name: "hotel_status" },
    { fields: { company: 1, status: 1 }, name: "company_status" },
    { fields: { email: 1 }, name: "email" },
    { fields: { guestId: 1 }, name: "guestId" },
    { fields: { fullName: "text", email: "text", phone: "text" }, name: "text_search", type: "text" },
  ],
  rooms: [
    { fields: { hotel: 1, status: 1 }, name: "hotel_status" },
    { fields: { company: 1, status: 1 }, name: "company_status" },
    { fields: { hotel: 1, type: 1, status: 1 }, name: "hotel_type_status" },
    { fields: { floor: 1, status: 1 }, name: "floor_status" },
  ],
  paymenttransactions: [
    { fields: { booking: 1, type: 1, status: 1 }, name: "booking_type_status" },
    { fields: { company: 1, createdAt: -1 }, name: "company_created" },
    { fields: { transactionId: 1 }, name: "transactionId", unique: true },
    { fields: { status: 1, createdAt: -1 }, name: "status_created" },
  ],
  invoices: [
    { fields: { booking: 1 }, name: "booking" },
    { fields: { company: 1, status: 1 }, name: "company_status" },
    { fields: { hotel: 1, status: 1 }, name: "hotel_status" },
    { fields: { invoiceId: 1 }, name: "invoiceId", unique: true },
    { fields: { issuedAt: -1 }, name: "issuedAt_desc" },
  ],
  activitylogs: [
    { fields: { hotel: 1, createdAt: -1 }, name: "hotel_created" },
    { fields: { company: 1, createdAt: -1 }, name: "company_created" },
    { fields: { entityType: 1, entityId: 1 }, name: "entity_lookup" },
    { fields: { action: 1, createdAt: -1 }, name: "action_created" },
  ],
};

/**
 * Get current indexes from a collection
 */
async function getCurrentIndexes(model) {
  try {
    const indexes = await model.collection.getIndexes({ full: true });
    return indexes;
  } catch (err) {
    console.error(`Error getting indexes for ${model.collection.name}:`, err.message);
    return {};
  }
}

/**
 * Compare expected vs actual indexes
 */
function compareIndexes(collectionName, expected, actual) {
  const missing = [];
  const present = [];
  const extra = [];

  // Check for expected indexes
  for (const exp of expected) {
    const found = Object.values(actual).some((idx) => {
      // Compare key fields
      const keyMatch = JSON.stringify(idx.key) === JSON.stringify(exp.fields);
      // For text indexes, also check weights if specified
      return keyMatch;
    });

    if (found) {
      present.push(exp.name);
    } else {
      missing.push(exp);
    }
  }

  // Check for extra indexes (not in expected list)
  const expectedNames = new Set(expected.map((e) => e.name));
  for (const [name, idx] of Object.entries(actual)) {
    if (name !== "_id_" && !expectedNames.has(name)) {
      extra.push({ name, fields: idx.key });
    }
  }

  return { missing, present, extra };
}

/**
 * Create missing indexes
 */
async function createMissingIndexes(model, missing) {
  const created = [];
  const failed = [];

  for (const idx of missing) {
    try {
      const options = { name: idx.name };
      if (idx.unique) options.unique = true;
      if (idx.sparse) options.sparse = true;

      await model.collection.createIndex(idx.fields, options);
      created.push(idx.name);
    } catch (err) {
      failed.push({ name: idx.name, error: err.message });
    }
  }

  return { created, failed };
}

/**
 * Main verification function
 */
export async function verifyIndexes(options = {}) {
  const { fix = false, verbose = true } = options;
  const report = {
    timestamp: new Date().toISOString(),
    collections: {},
    summary: {
      totalExpected: 0,
      totalPresent: 0,
      totalMissing: 0,
      totalExtra: 0,
    },
  };

  const collections = [
    { name: "bookings", model: Booking, indexes: expectedIndexes.bookings },
    { name: "guests", model: Guest, indexes: expectedIndexes.guests },
    { name: "rooms", model: Room, indexes: expectedIndexes.rooms },
    { name: "paymenttransactions", model: PaymentTransaction, indexes: expectedIndexes.paymenttransactions },
    { name: "invoices", model: Invoice, indexes: expectedIndexes.invoices },
    { name: "activitylogs", model: ActivityLog, indexes: expectedIndexes.activitylogs },
  ];

  for (const { name, model, indexes } of collections) {
    if (verbose) console.log(`\nChecking ${name}...`);

    const actual = await getCurrentIndexes(model);
    const comparison = compareIndexes(name, indexes, actual);

    report.collections[name] = {
      expected: indexes.length,
      present: comparison.present.length,
      missing: comparison.missing,
      extra: comparison.extra,
    };

    report.summary.totalExpected += indexes.length;
    report.summary.totalPresent += comparison.present.length;
    report.summary.totalMissing += comparison.missing.length;
    report.summary.totalExtra += comparison.extra.length;

    if (verbose) {
      console.log(`  Present: ${comparison.present.length}/${indexes.length}`);
      if (comparison.missing.length > 0) {
        console.log(`  Missing: ${comparison.missing.map((m) => m.name).join(", ")}`);
      }
      if (comparison.extra.length > 0) {
        console.log(`  Extra: ${comparison.extra.map((e) => e.name).join(", ")}`);
      }
    }

    // Create missing indexes if fix option is enabled
    if (fix && comparison.missing.length > 0) {
      if (verbose) console.log(`  Creating missing indexes...`);
      const result = await createMissingIndexes(model, comparison.missing);
      report.collections[name].created = result.created;
      report.collections[name].failed = result.failed;

      if (verbose) {
        if (result.created.length > 0) {
          console.log(`  Created: ${result.created.join(", ")}`);
        }
        if (result.failed.length > 0) {
          console.log(`  Failed: ${result.failed.map((f) => `${f.name} (${f.error})`).join(", ")}`);
        }
      }
    }
  }

  // Health check status
  report.healthy = report.summary.totalMissing === 0;

  return report;
}

/**
 * CLI runner for the script
 */
async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes("--fix");
  const verbose = !args.includes("--quiet");

  try {
    // Connect to database
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/hotel_booking";
    await mongoose.connect(mongoUri);

    if (verbose) console.log("Connected to MongoDB");
    if (verbose) console.log("\n=== Database Index Verification ===\n");

    const report = await verifyIndexes({ fix, verbose });

    if (verbose) {
      console.log("\n=== Summary ===");
      console.log(`Total Expected: ${report.summary.totalExpected}`);
      console.log(`Total Present: ${report.summary.totalPresent}`);
      console.log(`Total Missing: ${report.summary.totalMissing}`);
      console.log(`Total Extra: ${report.summary.totalExtra}`);
      console.log(`\nStatus: ${report.healthy ? "✓ HEALTHY" : "✗ ISSUES FOUND"}`);
    }

    // Exit with appropriate code
    process.exit(report.healthy ? 0 : 1);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default { verifyIndexes };
