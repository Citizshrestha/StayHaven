import mongoose from "mongoose";

/**
 * DiningSession — one party's "tab".
 *
 *  - dineIn:   opened on the first order at a table (QR or staff), collects
 *              every order that party places, settled once, then closed so the
 *              table is free for the next party.
 *  - takeaway: one walk-in counter customer; same settlement flow, no table.
 *
 * The bill is ALWAYS computed server-side from the session's orders
 * (see services/diningBilling.js). `totals` is a cached snapshot, refreshed on
 * every mutation under optimistic concurrency (`rev`).
 */

export const DINING_PAYMENT_METHODS = ["cash", "card", "esewa", "khalti", "bank", "upi"];

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: DINING_PAYMENT_METHODS, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    // Cash only: what the customer handed over and the change returned.
    tendered: { type: Number, min: 0 },
    change: { type: Number, min: 0 },
    reference: { type: String, trim: true, maxlength: 100 },
    idempotencyKey: { type: String, maxlength: 100 },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentTransaction" },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receivedByName: { type: String },
    receivedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const refundSchema = new mongoose.Schema(
  {
    payment: { type: mongoose.Schema.Types.ObjectId, required: true },
    method: { type: String, enum: DINING_PAYMENT_METHODS, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    reason: { type: String, trim: true, maxlength: 200, required: true },
    reference: { type: String, trim: true, maxlength: 100 },
    afterClose: { type: Boolean, default: false },
    idempotencyKey: { type: String, maxlength: 100 },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentTransaction" },
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    refundedByName: { type: String },
    refundedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const totalsSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    refunded: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
    itemCount: { type: Number, default: 0 },
    // Orders still with the kitchen (pending/confirmed/preparing). A tab
    // cannot be closed while this is > 0.
    openKitchenOrders: { type: Number, default: 0 },
  },
  { _id: false }
);

const diningSessionSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true, index: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    type: { type: String, enum: ["dineIn", "takeaway"], required: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: "HotelTable" },
    tableNumber: { type: String, trim: true },

    status: { type: String, enum: ["open", "closed", "void"], default: "open" },
    // true exactly while status === "open"; backs the one-open-tab-per-table
    // partial unique index below.
    isActive: { type: Boolean, default: true },
    source: { type: String, enum: ["qr", "staff"], default: "staff" },

    customerName: { type: String, trim: true, maxlength: 100 },
    customerPhone: { type: String, trim: true, maxlength: 20 },
    // Anonymous QR devices that ordered on this tab. Only these may read it.
    guestSessionIds: { type: [String], default: [] },

    openedAt: { type: Date, default: Date.now },
    openedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    openedByName: { type: String },
    billRequestedAt: { type: Date },
    billPrintedAt: { type: Date },

    // Rates are snapshotted at open so a settings change never re-prices a
    // meal that is already in progress.
    charges: {
      taxRate: { type: Number, default: 13, min: 0, max: 50 },
      serviceChargeRate: { type: Number, default: 0, min: 0, max: 30 },
      taxOnServiceCharge: { type: Boolean, default: true },
    },

    discount: {
      kind: { type: String, enum: ["percent", "amount"] },
      value: { type: Number, min: 0 },
      reason: { type: String, trim: true, maxlength: 200 },
      appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      appliedByName: { type: String },
      appliedAt: { type: Date },
    },

    totals: { type: totalsSchema, default: () => ({}) },
    payments: { type: [paymentSchema], default: [] },
    // Money handed back against a specific payment. On an open tab a refund
    // raises the balance again (e.g. before cancelling a paid order); on a
    // closed tab it is a post-settlement refund and the receipt is unchanged.
    refunds: { type: [refundSchema], default: [] },

    receiptNumber: { type: Number },
    closedAt: { type: Date },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    closedByName: { type: String },
    voidReason: { type: String, trim: true, maxlength: 300 },
    voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Optimistic-concurrency revision; every write is conditional on it.
    rev: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One open tab per table. Two first-orders racing on the same table both try
// to insert; the loser gets E11000 and joins the winner's tab.
diningSessionSchema.index(
  { table: 1 },
  { unique: true, partialFilterExpression: { isActive: true, type: "dineIn" } }
);
diningSessionSchema.index({ hotel: 1, status: 1, openedAt: -1 });
diningSessionSchema.index({ hotel: 1, closedAt: -1 });
diningSessionSchema.index({ guestSessionIds: 1, updatedAt: -1 });
diningSessionSchema.index(
  { hotel: 1, receiptNumber: 1 },
  { unique: true, partialFilterExpression: { receiptNumber: { $type: "number" } } }
);

export const DiningSession = mongoose.model("DiningSession", diningSessionSchema);

// Per-hotel receipt sequence (separate from order numbers).
const receiptCounterSchema = new mongoose.Schema({
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const ReceiptCounter = mongoose.model("ReceiptCounter", receiptCounterSchema);
