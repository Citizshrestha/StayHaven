/**
 * diningSessionService.js — lifecycle of restaurant tabs (DiningSession).
 *
 *   open  ── orders attach ──►  payments (cash/card/wallet/bank, split) ──► closed
 *     │                                                                    ▲
 *     └──────── void (no payments, no live orders) ──────────────────────┘
 *
 * Invariants enforced here (not in controllers):
 *   - at most one open tab per table (partial unique index + E11000 join)
 *   - the bill is computed from the tab's orders, never from client input
 *   - a payment can never exceed the outstanding balance
 *   - a tab closes only when fully paid and nothing is still in the kitchen
 *   - every write is conditional on `rev` (optimistic concurrency) and money
 *     writes run in a MongoDB transaction together with the ledger entry
 */

import mongoose from "mongoose";
import { DiningSession, ReceiptCounter, DINING_PAYMENT_METHODS } from "../models/diningSession.schema.js";
import { Order } from "../models/order.schema.js";
import { HotelTable } from "../models/hotelTable.schema.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { AppError } from "../middleware/errorHandler.js";
import { emitToHotelStaff, emitToGuestSession } from "../config/socket.js";
import { computeTotals, round2 } from "./diningBilling.js";

const MAX_RETRIES = 5;
const MAX_GUEST_DEVICES = 20;
const REFERENCE_REQUIRED = new Set(["esewa", "khalti", "bank"]);
const LEDGER_METHOD = {
  cash: "cash",
  card: "card",
  esewa: "esewa",
  khalti: "khalti",
  bank: "bank-transfer",
  upi: "upi",
};

class RevConflict extends Error {}

const idOf = (value) => (value?._id || value)?.toString();

export const chargesFromHotel = (hotel) => ({
  taxRate: Number.isFinite(hotel?.restaurantBilling?.taxRate) ? hotel.restaurantBilling.taxRate : 13,
  serviceChargeRate: Number.isFinite(hotel?.restaurantBilling?.serviceChargeRate)
    ? hotel.restaurantBilling.serviceChargeRate
    : 0,
  taxOnServiceCharge: hotel?.restaurantBilling?.taxOnServiceCharge !== false,
});

const staffName = (user) => user?.fullname || user?.name || "Staff";

const sessionOrders = (sessionId, dbSession) =>
  Order.find({ session: sessionId })
    .select("orderNumber status items totalPrice customerName orderByName isGuestOrder createdAt deliveredAt paymentStatus")
    .sort({ createdAt: 1 })
    .session(dbSession || null)
    .lean();

const assertSessionInHotel = (session, hotelId) => {
  if (!session || (hotelId && idOf(session.hotel) !== idOf(hotelId))) {
    throw new AppError("Tab not found", 404);
  }
};

const setTableStatus = async (tableId, from, to, dbSession) => {
  if (!tableId) return;
  await HotelTable.updateOne(
    { _id: tableId, status: { $in: from } },
    { $set: { status: to } },
    { session: dbSession || undefined }
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Real-time fan-out
// ─────────────────────────────────────────────────────────────────────────

export const broadcastSession = (session, extra = {}) => {
  if (!session) return;
  const hotelId = idOf(session.hotel);
  const payload = {
    sessionId: idOf(session._id),
    status: session.status,
    type: session.type,
    tableNumber: session.tableNumber || null,
    totals: session.totals,
    billRequestedAt: session.billRequestedAt || null,
    receiptNumber: session.receiptNumber || null,
    ...extra,
  };
  try {
    emitToHotelStaff(hotelId, "dining-session-updated", payload);
    for (const guestSessionId of session.guestSessionIds || []) {
      emitToGuestSession(guestSessionId, "table-tab-updated", {
        status: payload.status,
        totals: payload.totals,
        receiptNumber: payload.receiptNumber,
      });
    }
  } catch {
    // Socket fan-out is best-effort; the tab is already persisted.
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Opening tabs
// ─────────────────────────────────────────────────────────────────────────

/**
 * Returns the table's open tab, opening one if none exists. Concurrent first
 * orders on the same table converge on a single tab.
 */
export const openTableSession = async ({
  hotel,
  table,
  source = "staff",
  user = null,
  guestSessionId = null,
  customerName,
  customerPhone,
}) => {
  if (!table?._id) throw new AppError("Table is required", 400);
  if (table.status === "maintenance") {
    throw new AppError("This table is not in service right now. Please ask a member of staff.", 409);
  }

  const activeFilter = { table: table._id, isActive: true, type: "dineIn" };
  let session = await DiningSession.findOne(activeFilter);
  let created = false;

  if (!session) {
    try {
      session = await DiningSession.create({
        hotel: hotel._id,
        company: hotel.company,
        type: "dineIn",
        table: table._id,
        tableNumber: table.tableNumber,
        source,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        openedBy: user?._id,
        openedByName: user ? staffName(user) : "Guest (QR)",
        charges: chargesFromHotel(hotel),
        guestSessionIds: guestSessionId ? [guestSessionId] : [],
      });
      created = true;
    } catch (err) {
      if (err?.code !== 11000) throw err;
      session = await DiningSession.findOne(activeFilter);
      if (!session) throw new AppError("Could not open this table. Please try again.", 409);
    }
  }

  if (guestSessionId && !session.guestSessionIds.includes(guestSessionId)) {
    const joined = await DiningSession.findOneAndUpdate(
      { _id: session._id, [`guestSessionIds.${MAX_GUEST_DEVICES - 1}`]: { $exists: false } },
      { $addToSet: { guestSessionIds: guestSessionId } },
      { new: true }
    );
    if (!joined) {
      throw new AppError("Too many devices are ordering on this table. Please ask a member of staff.", 409);
    }
    session = joined;
  }

  if (!session.customerName && customerName) {
    await DiningSession.updateOne({ _id: session._id, customerName: { $in: [null, ""] } }, { $set: { customerName } });
  }

  await setTableStatus(table._id, ["available", "reserved"], "occupied");
  return { session, created };
};

export const createTakeawaySession = async ({ hotel, user, customerName, customerPhone }) =>
  DiningSession.create({
    hotel: hotel._id,
    company: hotel.company,
    type: "takeaway",
    source: "staff",
    customerName,
    customerPhone: customerPhone || undefined,
    openedBy: user?._id,
    openedByName: staffName(user),
    charges: chargesFromHotel(hotel),
  });

// ─────────────────────────────────────────────────────────────────────────
// Recalculation (optimistic concurrency)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Re-reads the tab + its orders, applies `mutate`, recomputes totals and
 * writes conditionally on `rev`. `mutate(session, orders)` returns
 * `{ set, unset, filter, validate(totals) }`, or `null` for a no-op.
 */
const mutateSession = async (sessionId, mutate, { hotelId, requireOpen = true } = {}) => {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const current = await DiningSession.findById(sessionId).lean();
    assertSessionInHotel(current, hotelId);
    if (requireOpen && current.status !== "open") {
      throw new AppError(`This tab is already ${current.status}`, 409);
    }
    const orders = await sessionOrders(current._id);
    const change = mutate ? mutate(current, orders) : {};
    if (change === null) return current;

    const nextDiscount = change.unset?.discount !== undefined
      ? null
      : change.set?.discount !== undefined ? change.set.discount : current.discount;
    const totals = computeTotals({
      orders,
      charges: current.charges,
      discount: nextDiscount,
      payments: current.payments,
      refunds: current.refunds,
    });
    change.validate?.(totals);

    const update = { $set: { ...(change.set || {}), totals }, $inc: { rev: 1 } };
    if (change.unset) update.$unset = change.unset;

    try {
      const saved = await DiningSession.findOneAndUpdate(
        { _id: current._id, rev: current.rev, ...(change.filter || {}) },
        update,
        { new: true }
      );
      if (saved) return saved;
    } catch (err) {
      if (err?.code === 11000 && change.onDuplicate) change.onDuplicate(err);
      throw err;
    }
  }
  throw new AppError("This tab was just updated by someone else. Please refresh and try again.", 409);
};

/** Refreshes cached totals after an order was added/edited/cancelled. */
export const recalculateSession = async (sessionId) => {
  if (!sessionId) return null;
  const existing = await DiningSession.findById(sessionId).select("status").lean();
  if (!existing || existing.status !== "open") return null;
  const session = await mutateSession(sessionId, null);
  broadcastSession(session);
  return session;
};

// ─────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────

const validatePaymentInput = ({ method, amount, tendered, reference, idempotencyKey }) => {
  if (!DINING_PAYMENT_METHODS.includes(method)) {
    throw new AppError(`Payment method must be one of: ${DINING_PAYMENT_METHODS.join(", ")}`, 400);
  }
  if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8 || idempotencyKey.length > 100) {
    throw new AppError("A valid idempotency key is required", 400);
  }
  if (amount !== undefined && amount !== null && !(Number.isFinite(Number(amount)) && Number(amount) > 0)) {
    throw new AppError("Amount must be a positive number", 400);
  }
  if (tendered !== undefined && tendered !== null && !(Number.isFinite(Number(tendered)) && Number(tendered) >= 0)) {
    throw new AppError("Cash tendered must be a number", 400);
  }
  const ref = typeof reference === "string" ? reference.trim() : "";
  if (ref.length > 100) throw new AppError("Reference is too long", 400);
  if (REFERENCE_REQUIRED.has(method) && ref.length < 4) {
    throw new AppError("Enter the transaction ID shown on the customer's payment confirmation", 400);
  }
  return method === "bank" ? ref.toUpperCase() : ref;
};

/**
 * Records one payment against a tab. Repeating the same idempotencyKey
 * returns the original payment instead of charging twice.
 */
export const recordPayment = async ({ sessionId, hotel, method, amount, tendered, reference, idempotencyKey, user }) => {
  const cleanRef = validatePaymentInput({ method, amount, tendered, reference, idempotencyKey });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const current = await DiningSession.findById(sessionId).lean();
    assertSessionInHotel(current, hotel._id);

    const duplicate = current.payments.find((p) => p.idempotencyKey === idempotencyKey);
    if (duplicate) return { session: current, payment: duplicate, duplicate: true };
    if (current.status !== "open") throw new AppError(`This tab is already ${current.status}`, 409);

    const orders = await sessionOrders(current._id);
    const before = computeTotals({ orders, charges: current.charges, discount: current.discount, payments: current.payments, refunds: current.refunds });
    if (before.total <= 0) throw new AppError("There is nothing to pay on this tab yet", 409);
    if (before.balance <= 0) throw new AppError("This tab is already fully paid", 409);

    const payAmount = round2(amount ?? before.balance);
    if (payAmount > before.balance) {
      throw new AppError(`Amount is more than the balance due (Rs ${before.balance.toFixed(2)})`, 400);
    }

    const payment = {
      _id: new mongoose.Types.ObjectId(),
      method,
      amount: payAmount,
      reference: cleanRef || undefined,
      idempotencyKey,
      receivedBy: user?._id,
      receivedByName: staffName(user),
      receivedAt: new Date(),
    };
    if (method === "cash") {
      const handed = round2(tendered ?? payAmount);
      if (handed < payAmount) throw new AppError("Cash tendered is less than the amount being paid", 400);
      payment.tendered = handed;
      payment.change = round2(handed - payAmount);
    }

    const totals = computeTotals({
      orders,
      charges: current.charges,
      discount: current.discount,
      payments: [...current.payments, payment],
      refunds: current.refunds,
    });

    const dbSession = await mongoose.startSession();
    try {
      let saved;
      await dbSession.withTransaction(async () => {
        const [txn] = await PaymentTransaction.create(
          [{
            hotel: current.hotel,
            company: current.company || hotel.company,
            diningSession: current._id,
            type: "capture",
            amount: payAmount,
            currency: "NPR",
            method: LEDGER_METHOD[method],
            reference: cleanRef || `DINE-${payment._id}`,
            status: "captured",
            processedBy: user?._id,
            processedByName: staffName(user),
            notes: current.type === "takeaway"
              ? `Takeaway payment${current.customerName ? ` (${current.customerName})` : ""}`
              : `Table ${current.tableNumber} payment`,
          }],
          { session: dbSession }
        );
        payment.transaction = txn._id;
        saved = await DiningSession.findOneAndUpdate(
          { _id: current._id, rev: current.rev, status: "open" },
          { $push: { payments: payment }, $set: { totals }, $inc: { rev: 1 } },
          { new: true, session: dbSession }
        );
        if (!saved) throw new RevConflict();
      });
      broadcastSession(saved);
      return { session: saved, payment, duplicate: false };
    } catch (err) {
      if (err instanceof RevConflict) continue;
      if (err?.code === 11000 && method === "bank") {
        throw new AppError("This bank transfer reference has already been used for another payment", 409);
      }
      throw err;
    } finally {
      await dbSession.endSession();
    }
  }
  throw new AppError("This tab was just updated by someone else. Please refresh and try again.", 409);
};

// ─────────────────────────────────────────────────────────────────────────
// Closing
// ─────────────────────────────────────────────────────────────────────────

const primaryMethod = (payments) => {
  const byMethod = new Map();
  for (const p of payments) byMethod.set(p.method, round2((byMethod.get(p.method) || 0) + p.amount));
  let best = null;
  for (const [method, sum] of byMethod) if (!best || sum > best.sum) best = { method, sum };
  return best?.method;
};

/**
 * Closes a fully-paid tab: assigns a receipt number, marks its orders paid,
 * marks ready orders served and frees the table — all in one transaction.
 * Closing an already-closed tab is a no-op (safe to retry).
 */
export const closeSession = async ({ sessionId, hotel, user }) => {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const current = await DiningSession.findById(sessionId).lean();
    assertSessionInHotel(current, hotel._id);
    if (current.status === "closed") return current;
    if (current.status !== "open") throw new AppError(`This tab is already ${current.status}`, 409);

    const orders = await sessionOrders(current._id);
    const totals = computeTotals({ orders, charges: current.charges, discount: current.discount, payments: current.payments, refunds: current.refunds });

    if (totals.orderCount === 0) throw new AppError("This tab has no orders. Void it instead of closing.", 409);
    if (totals.openKitchenOrders > 0) {
      throw new AppError(
        `${totals.openKitchenOrders} order${totals.openKitchenOrders === 1 ? " is" : "s are"} still with the kitchen. Wait until ${totals.openKitchenOrders === 1 ? "it is" : "they are"} ready or cancel ${totals.openKitchenOrders === 1 ? "it" : "them"} before closing.`,
        409
      );
    }
    if (totals.balance > 0) throw new AppError(`Rs ${totals.balance.toFixed(2)} is still due on this tab`, 409);
    if (totals.balance < 0) throw new AppError("Payments exceed the bill. Review the payments before closing.", 409);

    const now = new Date();
    const dbSession = await mongoose.startSession();
    try {
      let saved;
      await dbSession.withTransaction(async () => {
        const counter = await ReceiptCounter.findOneAndUpdate(
          { hotel: current.hotel },
          { $inc: { seq: 1 } },
          { new: true, upsert: true, session: dbSession }
        );
        saved = await DiningSession.findOneAndUpdate(
          { _id: current._id, rev: current.rev, status: "open" },
          {
            $set: {
              status: "closed",
              isActive: false,
              totals,
              receiptNumber: counter.seq,
              closedAt: now,
              closedBy: user?._id,
              closedByName: staffName(user),
            },
            $inc: { rev: 1 },
          },
          { new: true, session: dbSession }
        );
        if (!saved) throw new RevConflict();

        await Order.updateMany(
          { session: current._id, status: "ready" },
          { $set: { status: "delivered", deliveredAt: now } },
          { session: dbSession }
        );
        await Order.updateMany(
          { session: current._id, status: { $ne: "cancelled" } },
          {
            $set: {
              paymentStatus: "paid",
              paidAt: now,
              paymentMethod: primaryMethod(current.payments),
              paymentReference: `RCPT-${counter.seq}`,
            },
          },
          { session: dbSession }
        );
        if (current.table) {
          await setTableStatus(current.table, ["occupied", "reserved"], "available", dbSession);
        }
      });
      broadcastSession(saved);
      return saved;
    } catch (err) {
      if (err instanceof RevConflict) continue;
      throw err;
    } finally {
      await dbSession.endSession();
    }
  }
  throw new AppError("This tab was just updated by someone else. Please refresh and try again.", 409);
};

/** Closes the tab if it has just become settleable; never throws. */
export const closeIfSettled = async ({ session, hotel, user }) => {
  const t = session?.totals;
  if (!t || session.status !== "open" || t.balance !== 0 || t.total <= 0 || t.openKitchenOrders > 0) {
    return session;
  }
  try {
    return await closeSession({ sessionId: session._id, hotel, user });
  } catch {
    return session;
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Refunds
// ─────────────────────────────────────────────────────────────────────────

/**
 * Hands money back against one payment. Supervisor-only (route guard).
 *  - open tab:   the balance goes back up (e.g. before cancelling a paid order)
 *  - closed tab: post-settlement refund; the receipt is unchanged and the
 *                refund is reported on the day it happens
 * Repeating the same idempotencyKey returns the original refund.
 */
export const refundPayment = async ({ sessionId, hotel, paymentId, amount, reason, reference, idempotencyKey, user }) => {
  if (!mongoose.isValidObjectId(paymentId)) throw new AppError("Choose the payment to refund", 400);
  if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8 || idempotencyKey.length > 100) {
    throw new AppError("A valid idempotency key is required", 400);
  }
  const why = typeof reason === "string" ? reason.trim() : "";
  if (why.length < 3 || why.length > 200) throw new AppError("Give a reason for the refund (3–200 characters)", 400);
  const ref = typeof reference === "string" ? reference.trim() : "";
  if (ref.length > 100) throw new AppError("Reference is too long", 400);
  if (amount !== undefined && amount !== null && !(Number.isFinite(Number(amount)) && Number(amount) > 0)) {
    throw new AppError("Refund amount must be a positive number", 400);
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const current = await DiningSession.findById(sessionId).lean();
    assertSessionInHotel(current, hotel._id);

    const refunds = current.refunds || [];
    const duplicate = refunds.find((r) => r.idempotencyKey === idempotencyKey);
    if (duplicate) return { session: current, refund: duplicate, duplicate: true };
    if (current.status === "void") throw new AppError("This tab is void", 409);

    const payment = current.payments.find((p) => idOf(p._id) === idOf(paymentId));
    if (!payment) throw new AppError("Payment not found on this tab", 404);
    const alreadyRefunded = round2(
      refunds.filter((r) => idOf(r.payment) === idOf(payment._id)).reduce((s, r) => s + r.amount, 0)
    );
    const refundable = round2(payment.amount - alreadyRefunded);
    if (refundable <= 0) throw new AppError("This payment has already been fully refunded", 409);
    const refundAmount = round2(amount ?? refundable);
    if (refundAmount > refundable) {
      throw new AppError(`At most Rs ${refundable.toFixed(2)} can be refunded on this payment`, 400);
    }

    const afterClose = current.status === "closed";
    const refund = {
      _id: new mongoose.Types.ObjectId(),
      payment: payment._id,
      method: payment.method,
      amount: refundAmount,
      reason: why,
      reference: ref || undefined,
      afterClose,
      idempotencyKey,
      refundedBy: user?._id,
      refundedByName: staffName(user),
      refundedAt: new Date(),
    };
    const nextRefunds = [...refunds, refund];

    // Open tabs: live totals. Closed tabs: keep the receipt snapshot and only
    // record how much has been handed back since.
    let totalsSet;
    if (afterClose) {
      totalsSet = { "totals.refunded": round2(nextRefunds.reduce((s, r) => s + r.amount, 0)) };
    } else {
      const orders = await sessionOrders(current._id);
      totalsSet = {
        totals: computeTotals({ orders, charges: current.charges, discount: current.discount, payments: current.payments, refunds: nextRefunds }),
      };
    }

    const dbSession = await mongoose.startSession();
    try {
      let saved;
      await dbSession.withTransaction(async () => {
        const [txn] = await PaymentTransaction.create(
          [{
            hotel: current.hotel,
            company: current.company || hotel.company,
            diningSession: current._id,
            type: "refund",
            amount: refundAmount,
            currency: "NPR",
            method: LEDGER_METHOD[payment.method],
            reference: ref || `DINE-RF-${refund._id}`,
            status: "refunded",
            refundReason: why,
            processedBy: user?._id,
            processedByName: staffName(user),
            notes: `${current.type === "takeaway" ? "Takeaway" : `Table ${current.tableNumber}`} refund${afterClose ? ` (receipt #${current.receiptNumber})` : ""}`,
          }],
          { session: dbSession }
        );
        refund.transaction = txn._id;
        saved = await DiningSession.findOneAndUpdate(
          { _id: current._id, rev: current.rev, status: current.status },
          { $push: { refunds: refund }, $set: totalsSet, $inc: { rev: 1 } },
          { new: true, session: dbSession }
        );
        if (!saved) throw new RevConflict();

        // A closed tab whose money has all been handed back: its orders are refunded.
        if (afterClose) {
          const kept = round2(current.payments.reduce((s, p) => s + p.amount, 0) - totalsSet["totals.refunded"]);
          if (kept <= 0) {
            await Order.updateMany(
              { session: current._id, paymentStatus: "paid" },
              { $set: { paymentStatus: "refunded" } },
              { session: dbSession }
            );
          }
        }
      });
      broadcastSession(saved);
      return { session: saved, refund, duplicate: false };
    } catch (err) {
      if (err instanceof RevConflict) continue;
      throw err;
    } finally {
      await dbSession.endSession();
    }
  }
  throw new AppError("This tab was just updated by someone else. Please refresh and try again.", 409);
};

// ─────────────────────────────────────────────────────────────────────────
// Discounts, transfer, void, bill print
// ─────────────────────────────────────────────────────────────────────────

export const applyDiscount = async ({ sessionId, hotel, kind, value, reason, user }) => {
  if (!["percent", "amount"].includes(kind)) throw new AppError("Discount type must be percent or amount", 400);
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) throw new AppError("Discount must be a positive number", 400);
  if (kind === "percent" && numeric > 100) throw new AppError("A percentage discount cannot exceed 100%", 400);
  const why = typeof reason === "string" ? reason.trim() : "";
  if (why.length < 3 || why.length > 200) throw new AppError("Give a reason for the discount (3–200 characters)", 400);

  const session = await mutateSession(
    sessionId,
    () => ({
      set: {
        discount: {
          kind,
          value: round2(numeric),
          reason: why,
          appliedBy: user?._id,
          appliedByName: staffName(user),
          appliedAt: new Date(),
        },
      },
      filter: { status: "open" },
      validate: (totals) => {
        if (totals.balance < 0) {
          throw new AppError("That discount would bring the bill below what has already been paid", 409);
        }
      },
    }),
    { hotelId: hotel._id }
  );
  broadcastSession(session);
  return session;
};

export const removeDiscount = async ({ sessionId, hotel }) => {
  const session = await mutateSession(
    sessionId,
    (current) => (current.discount?.kind ? { unset: { discount: "" }, filter: { status: "open" } } : null),
    { hotelId: hotel._id }
  );
  broadcastSession(session);
  return session;
};

export const transferSession = async ({ sessionId, hotel, toTableId }) => {
  if (!mongoose.isValidObjectId(toTableId)) throw new AppError("Choose a valid table", 400);
  const target = await HotelTable.findOne({ _id: toTableId, hotel: hotel._id, isActive: true });
  if (!target) throw new AppError("Table not found", 404);
  if (target.status === "maintenance") throw new AppError(`Table ${target.tableNumber} is not in service`, 409);

  let fromTable = null;
  const session = await mutateSession(
    sessionId,
    (current) => {
      if (current.type !== "dineIn") throw new AppError("Only dine-in tabs can move tables", 400);
      if (idOf(current.table) === idOf(target._id)) throw new AppError("The tab is already on that table", 400);
      fromTable = current.table;
      return {
        set: { table: target._id, tableNumber: target.tableNumber },
        filter: { status: "open" },
        onDuplicate: () => {
          throw new AppError(`Table ${target.tableNumber} already has an open tab`, 409);
        },
      };
    },
    { hotelId: hotel._id }
  );

  await Order.updateMany({ session: session._id }, { $set: { table: target._id, tableNumber: target.tableNumber } });
  await setTableStatus(fromTable, ["occupied"], "available");
  await setTableStatus(target._id, ["available", "reserved"], "occupied");
  broadcastSession(session, { movedFrom: fromTable ? idOf(fromTable) : null });
  return session;
};

export const voidSession = async ({ sessionId, hotel, reason, user }) => {
  const why = typeof reason === "string" ? reason.trim() : "";
  if (why.length < 3 || why.length > 300) throw new AppError("Give a reason for voiding (3–300 characters)", 400);

  const session = await mutateSession(
    sessionId,
    (current, orders) => {
      const kept = round2(
        current.payments.reduce((s, p) => s + p.amount, 0) - (current.refunds || []).reduce((s, r) => s + r.amount, 0)
      );
      if (kept > 0) {
        throw new AppError("Money was taken on this tab. Refund it before voiding, or close the tab.", 409);
      }
      const live = orders.filter((o) => o.status !== "cancelled");
      if (live.length > 0) {
        throw new AppError(`Cancel the ${live.length} remaining order${live.length === 1 ? "" : "s"} before voiding this tab`, 409);
      }
      return {
        set: {
          status: "void",
          isActive: false,
          voidReason: why,
          voidedBy: user?._id,
          closedAt: new Date(),
          closedBy: user?._id,
          closedByName: staffName(user),
        },
        filter: { status: "open" },
      };
    },
    { hotelId: hotel._id }
  );
  if (session.table) await setTableStatus(session.table, ["occupied", "reserved"], "available");
  broadcastSession(session);
  return session;
};

export const markBillPrinted = async ({ sessionId, hotel }) => {
  const session = await DiningSession.findOneAndUpdate(
    { _id: sessionId, hotel: hotel._id },
    { $set: { billPrintedAt: new Date() } },
    { new: true }
  );
  assertSessionInHotel(session, hotel._id);
  return session;
};

export const markBillRequested = async (sessionId) => {
  const session = await DiningSession.findOneAndUpdate(
    { _id: sessionId, status: "open" },
    { $set: { billRequestedAt: new Date() } },
    { new: true }
  );
  broadcastSession(session);
  return session;
};

// ─────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────

export const getSessionWithOrders = async (sessionId, hotelId) => {
  if (!mongoose.isValidObjectId(sessionId)) throw new AppError("Tab not found", 404);
  const session = await DiningSession.findById(sessionId).lean();
  assertSessionInHotel(session, hotelId);
  const orders = await sessionOrders(session._id);
  // Open tabs: always return live totals (a missed recalculation can never
  // show a stale bill). Closed tabs keep their receipt snapshot.
  if (session.status === "open") {
    session.totals = computeTotals({ orders, charges: session.charges, discount: session.discount, payments: session.payments, refunds: session.refunds });
  }
  return { session, orders };
};

/** Shape exposed to anonymous QR devices: no phone, staff or references. */
export const serializeForGuest = (session, orders) => ({
  _id: session._id,
  status: session.status,
  tableNumber: session.tableNumber,
  openedAt: session.openedAt,
  closedAt: session.closedAt || null,
  receiptNumber: session.receiptNumber || null,
  billRequestedAt: session.billRequestedAt || null,
  charges: session.charges,
  discount: session.discount?.kind ? { kind: session.discount.kind, value: session.discount.value } : null,
  totals: session.totals,
  orders: orders.map((o) => ({
    _id: o._id,
    orderNumber: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt,
    items: (o.items || []).map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, notes: i.notes || "" })),
  })),
});

export const listSessions = async ({ hotelId, status = "open", type, from, to, limit = 100 }) => {
  const filter = { hotel: hotelId };
  if (status && status !== "all") filter.status = status;
  if (type && ["dineIn", "takeaway"].includes(type)) filter.type = type;
  if (from || to) {
    const field = status === "open" ? "openedAt" : "closedAt";
    filter[field] = {};
    if (from) filter[field].$gte = from;
    if (to) filter[field].$lte = to;
  }
  const sessions = await DiningSession.find(filter)
    .select("-guestSessionIds -payments.idempotencyKey -refunds.idempotencyKey")
    .sort(status === "open" ? { openedAt: 1 } : { closedAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 100, 1), 300))
    .lean();

  if (status !== "open" || sessions.length === 0) return sessions;

  // Live totals for open tabs from one grouped read of their orders.
  const orders = await Order.find({ session: { $in: sessions.map((s) => s._id) } })
    .select("session status items")
    .lean();
  const bySession = new Map();
  for (const o of orders) {
    const key = idOf(o.session);
    if (!bySession.has(key)) bySession.set(key, []);
    bySession.get(key).push(o);
  }
  return sessions.map((s) => ({
    ...s,
    totals: computeTotals({
      orders: bySession.get(idOf(s._id)) || [],
      charges: s.charges,
      discount: s.discount,
      payments: s.payments,
      refunds: s.refunds,
    }),
  }));
};

/**
 * End-of-day (Z) report for [from, to]:
 *  - sales (subtotal, VAT, service, total) from tabs CLOSED in the window
 *  - money in/out by method from payments RECEIVED and refunds GIVEN in the window
 */
export const dailyReport = async ({ hotelId, from, to }) => {
  const hotel = new mongoose.Types.ObjectId(idOf(hotelId));
  const closedMatch = { hotel, status: "closed", closedAt: { $gte: from, $lte: to } };

  const [summary] = await DiningSession.aggregate([
    { $match: closedMatch },
    {
      $group: {
        _id: null,
        tabs: { $sum: 1 },
        dineIn: { $sum: { $cond: [{ $eq: ["$type", "dineIn"] }, 1, 0] } },
        takeaway: { $sum: { $cond: [{ $eq: ["$type", "takeaway"] }, 1, 0] } },
        subtotal: { $sum: "$totals.subtotal" },
        discount: { $sum: "$totals.discount" },
        serviceCharge: { $sum: "$totals.serviceCharge" },
        tax: { $sum: "$totals.tax" },
        total: { $sum: "$totals.total" },
      },
    },
  ]);

  // Money movement is counted by WHEN it happened (drawer reconciliation):
  // payments received in the window — including on tabs still open — and
  // refunds handed back in the window, whichever day the tab was settled.
  const windowOf = (field) => ({ [field]: { $gte: from, $lte: to } });
  const [received, handedBack] = await Promise.all([
    DiningSession.aggregate([
      { $match: { hotel, status: { $in: ["open", "closed"] }, "payments.receivedAt": { $gte: from, $lte: to } } },
      { $unwind: "$payments" },
      { $match: windowOf("payments.receivedAt") },
      {
        $group: {
          _id: "$payments.method",
          amount: { $sum: "$payments.amount" },
          count: { $sum: 1 },
          change: { $sum: { $ifNull: ["$payments.change", 0] } },
        },
      },
    ]),
    DiningSession.aggregate([
      { $match: { hotel, "refunds.refundedAt": { $gte: from, $lte: to } } },
      { $unwind: "$refunds" },
      { $match: windowOf("refunds.refundedAt") },
      { $group: { _id: "$refunds.method", amount: { $sum: "$refunds.amount" }, count: { $sum: 1 } } },
    ]),
  ]);

  const methods = new Map();
  for (const m of received) {
    methods.set(m._id, { method: m._id, amount: round2(m.amount), count: m.count, change: round2(m.change), refunded: 0, refundCount: 0 });
  }
  for (const m of handedBack) {
    const row = methods.get(m._id) || { method: m._id, amount: 0, count: 0, change: 0, refunded: 0, refundCount: 0 };
    row.refunded = round2(m.amount);
    row.refundCount = m.count;
    methods.set(m._id, row);
  }
  const byMethod = [...methods.values()]
    .map((row) => ({ ...row, net: round2(row.amount - row.refunded) }))
    .sort((a, b) => b.net - a.net);
  const refundTotal = round2(byMethod.reduce((s, m) => s + m.refunded, 0));
  const receivedTotal = round2(byMethod.reduce((s, m) => s + m.amount, 0));

  const [voids, openTabs] = await Promise.all([
    DiningSession.countDocuments({ hotel, status: "void", closedAt: { $gte: from, $lte: to } }),
    listSessions({ hotelId, status: "open" }),
  ]);

  const r = summary || { tabs: 0, dineIn: 0, takeaway: 0, subtotal: 0, discount: 0, serviceCharge: 0, tax: 0, total: 0 };
  return {
    from,
    to,
    tabs: r.tabs,
    dineIn: r.dineIn,
    takeaway: r.takeaway,
    subtotal: round2(r.subtotal),
    discount: round2(r.discount),
    serviceCharge: round2(r.serviceCharge),
    tax: round2(r.tax),
    total: round2(r.total),
    // Per method: received, refunded and net (what should be in the drawer / settlement).
    payments: byMethod,
    received: receivedTotal,
    refunded: refundTotal,
    netCollected: round2(receivedTotal - refundTotal),
    voids,
    open: {
      count: openTabs.length,
      outstanding: round2(openTabs.reduce((sum, s) => sum + Math.max(0, s.totals.balance), 0)),
    },
  };
};
