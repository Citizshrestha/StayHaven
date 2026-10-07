import mongoose from "mongoose";
import { Booking } from "../models/booking.schema.js";
import { Order } from "../models/order.schema.js";
import { Invoice, generateInvoiceId } from "../models/invoice.schema.js";
import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { toPaisa } from "../utils/paymentMoney.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { ActivityLog } from "../models/activityLog.schema.js";
import { AppError } from "../middleware/errorHandler.js";

/**
 * Bank Transfer admin approval workflow.
 *
 * Guests submit a bank slip reference through one of three call sites
 * (public booking checkout, guest-dashboard order payment, guest-dashboard
 * invoice payment), all of which create a `PaymentTransaction` with
 * `method: "bank-transfer"` and `status: "pending"` — the target
 * (booking/order/invoice) stays unpaid until a staff member reviews the
 * transfer against the hotel's real bank statement and calls
 * approveBankTransfer/rejectBankTransfer here.
 *
 * Mirrors the same atomic-claim architecture used by the Stripe finalizer
 * (webhookController.js) and the wallet layer (walletPaymentService.js):
 * an `findOneAndUpdate` scoped to the still-pending status is the only way
 * either function can act, so two staff members approving/rejecting the
 * same transaction at once produce exactly one winner and one no-op.
 */

// A pending bank-transfer transaction may only be resolved once. Anything
// outside this set has already been decided (or is a different payment
// method entirely) and must not be reopened by a duplicate/racing request.
const CLAIMABLE_TXN_STATUS = ["pending"];
const CLAIMABLE_BOOKING_STATUS = ["Pending", "Confirmed"];
const CLAIMABLE_BOOKING_PAYMENT_STATUS = ["unpaid", "partial"];
const CLAIMABLE_ORDER_PAYMENT_STATUS = ["pending", "failed"];
const CLAIMABLE_INVOICE_STATUS = ["pending", "partial", "overdue"];

const sameId = (a, b) => a && b && String(a._id || a) === String(b._id || b);

function checkTenant(txn, target) {
  if (!sameId(txn.hotel, target.hotel) || !sameId(txn.company, target.company)) {
    throw new AppError("Payment target tenant mismatch", 409);
  }
}

function checkCurrency(txn, currency = "NPR") {
  if (txn.currency !== "NPR" || currency !== txn.currency) {
    throw new AppError("Payment currency mismatch; NPR is required", 409);
  }
}

function remainingAmount(total, paid = 0) {
  const remaining = toPaisa(total) - toPaisa(paid, true);
  if (remaining <= 0) throw new AppError("Target is no longer awaiting payment", 409);
  return remaining;
}

function scopeFilter({ hotel, company }) {
  const filter = { method: "bank-transfer", status: "pending" };
  if (hotel) filter.hotel = hotel;
  if (company) filter.company = company;
  return filter;
}

/**
 * Staff-facing listing of bank transfers awaiting manual verification.
 */
export async function listPendingBankTransfers({ hotel, company, page = 1, limit = 20 } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const filter = scopeFilter({ hotel, company });

  const [items, total] = await Promise.all([
    PaymentTransaction.find(filter)
      .sort({ createdAt: 1 }) // oldest first: guests waiting longest surface first
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate("booking", "bookingId confirmationCode totalAmount guestInfo checkIn checkOut")
      .populate("order", "orderNumber totalPrice customerName")
      .populate("invoice", "invoiceId balance")
      .lean(),
    PaymentTransaction.countDocuments(filter),
  ]);

  return { items, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) };
}

async function claimTransaction(transactionId, nextStatus, extraSet = {}) {
  if (!mongoose.isValidObjectId(transactionId)) throw new AppError("Invalid transaction id", 400);
  const claimed = await PaymentTransaction.findOneAndUpdate(
    { _id: transactionId, method: "bank-transfer", status: { $in: CLAIMABLE_TXN_STATUS } },
    { $set: { status: nextStatus, ...extraSet } },
    { new: true },
  );
  return claimed;
}

/**
 * Approve a pending bank transfer: verifies the staff-supplied claim by
 * atomically flipping the transaction to "captured", then fulfills the
 * associated booking/order/invoice exactly once. Never trusts a
 * client-supplied amount — the amount fulfilled is always the one already
 * recorded on the transaction at submission time.
 */
export async function approveBankTransfer({ transactionId, staffUser, notes, scope } = {}) {
  if (!mongoose.isValidObjectId(transactionId)) throw new AppError("Invalid transaction id", 400);
  const txn = await PaymentTransaction.findOne({ _id: transactionId, method: "bank-transfer" });
  if (!txn) throw new AppError("Bank transfer transaction not found", 404);
  if (scope && (!sameId(txn.company, scope.company) || (scope.hotel && !sameId(txn.hotel, scope.hotel)))) throw new AppError("Bank transfer transaction not found", 404);
  if (txn.status !== "pending") {
    // Already resolved by an earlier call (or a raced one) — report the
    // current state rather than erroring, so a retried click is a no-op.
    return { transaction: txn, alreadyProcessed: true };
  }

  const session = await mongoose.startSession();
  let claimed = null;
  let fulfillment = null;
  try {
    await session.withTransaction(async () => {
      fulfillment = null;
      claimed = await PaymentTransaction.findOneAndUpdate(
        { _id: txn._id, method: "bank-transfer", status: { $in: CLAIMABLE_TXN_STATUS } },
        {
          $set: {
            status: "captured",
            processedBy: staffUser?._id,
            processedByName: staffUser?.fullname,
            ...(notes ? { notes: `${txn.notes ? txn.notes + " | " : ""}${notes}` } : {}),
          },
        },
        { new: true, session },
      );
      if (!claimed) return; // lost the race; another approval/rejection already ran
      if (claimed.type !== "capture" || (claimed.order && claimed.invoice)) {
        throw new AppError("Invalid bank transfer target or type", 409);
      }
      checkCurrency(claimed);
      toPaisa(claimed.amount);

      if (claimed.order) {
        fulfillment = await fulfillOrder(claimed, session);
      } else if (claimed.invoice) {
        fulfillment = await fulfillInvoice(claimed, session);
      } else if (claimed.booking) {
        fulfillment = await fulfillBooking(claimed, session);
      } else {
        throw new AppError("Transaction has no fulfillable target", 409);
      }

      await ActivityLog.create([{
        hotel: claimed.hotel, company: claimed.company,
        entityType: "payment", entityId: claimed.transactionId,
        action: "bank-transfer-approved",
        description: `Bank transfer <strong>${claimed.transactionId}</strong> approved by ${staffUser?.fullname || "staff"} (NPR ${claimed.amount})`,
        actor: staffUser?._id, actorName: staffUser?.fullname,
      }], { session });
    });
  } finally {
    session.endSession();
  }

  if (!claimed) {
    const current = await PaymentTransaction.findById(txn._id);
    return { transaction: current, alreadyProcessed: true };
  }
  return { transaction: claimed, fulfillment };
}

/**
 * Reject a pending bank transfer with a reason. The target is never
 * touched beyond recording the rejection — it was never marked paid, so it
 * remains exactly as payable as before (the guest can resubmit or pay by
 * another method).
 */
export async function rejectBankTransfer({ transactionId, staffUser, reason, scope } = {}) {
  if (!reason || !String(reason).trim()) throw new AppError("A rejection reason is required", 400);
  if (scope) {
    const target = await PaymentTransaction.findOne({ _id: transactionId, method: "bank-transfer" });
    if (!target || !sameId(target.company, scope.company) || (scope.hotel && !sameId(target.hotel, scope.hotel))) throw new AppError("Bank transfer transaction not found", 404);
  }
  const claimed = await claimTransaction(transactionId, "failed", {
    refundReason: String(reason).trim().slice(0, 500),
    processedBy: staffUser?._id,
    processedByName: staffUser?.fullname,
  });
  if (!claimed) {
    const current = await PaymentTransaction.findOne({ _id: transactionId, method: "bank-transfer" });
    if (!current) throw new AppError("Bank transfer transaction not found", 404);
    return { transaction: current, alreadyProcessed: true };
  }

  await ActivityLog.create({
    hotel: claimed.hotel, company: claimed.company,
    entityType: "payment", entityId: claimed.transactionId,
    action: "bank-transfer-rejected",
    description: `Bank transfer <strong>${claimed.transactionId}</strong> rejected by ${staffUser?.fullname || "staff"}: ${reason}`,
    actor: staffUser?._id, actorName: staffUser?.fullname,
  });

  return { transaction: claimed };
}

// ─────────────────────────────────────────────────────────────────────────
// Fulfillment — one path per target type, each an atomic claim of its own
// target so a booking/order/invoice already moved on by other means (e.g.
// cancelled, or paid through a different method in the interim) is left
// untouched rather than being force-marked paid underneath that change.
// ─────────────────────────────────────────────────────────────────────────

async function fulfillBooking(txn, session) {
  const booking = await Booking.findOneAndUpdate(
    { _id: txn.booking }, { $inc: { paymentLockVersion: 1 } }, { new: true, session },
  );
  if (!booking) throw new AppError("Booking not found", 404);
  checkTenant(txn, booking);
  checkCurrency(txn, booking.currency);
  const totalPaisa = toPaisa(booking.totalAmount);
  if (toPaisa(txn.amount) !== remainingAmount(booking.totalAmount, booking.paidAmount)) {
    throw new AppError("Booking payment amount does not match remaining balance", 409);
  }

  const claimed = await Booking.findOneAndUpdate(
    { _id: booking._id, status: { $in: CLAIMABLE_BOOKING_STATUS }, paymentStatus: { $in: CLAIMABLE_BOOKING_PAYMENT_STATUS } },
    { $set: { status: "Confirmed", paymentStatus: "paid", paymentMethod: "bank-transfer", paidAt: new Date(), paidAmount: totalPaisa / 100 } },
    { new: true, session },
  );
  if (!claimed) throw new AppError("Booking is no longer awaiting payment", 409);

  // An actual write, even on an already reserved room, serializes approvals
  // for different bookings and shares the wallet reservation lock.
  const room = await Room.findOneAndUpdate(
    { _id: booking.room, hotel: txn.hotel, company: txn.company, status: { $in: ["available", "reserved"] } },
    { $inc: { reservationVersion: 1 }, $set: { status: "reserved" } },
    { new: true, session },
  );
  if (!room || !(booking.checkIn < booking.checkOut)) throw new AppError("Room is unavailable", 409);
  const conflict = await Booking.exists({
    _id: { $ne: booking._id }, room: room._id,
    checkIn: { $lt: booking.checkOut }, checkOut: { $gt: booking.checkIn },
    $or: [
      { status: { $in: ["Confirmed", "Checked-In"] } },
      { status: "Pending", $or: [
        { paymentHoldExpiresAt: { $exists: false } }, { paymentHoldExpiresAt: null },
        { paymentHoldExpiresAt: { $gt: new Date() } },
      ] },
    ],
  }).session(session);
  if (conflict) throw new AppError("Room is already booked for selected dates", 409);

  const existing = await Invoice.findOne({ booking: booking._id }).session(session);
  if (existing) {
    checkTenant(txn, existing);
    if (!CLAIMABLE_INVOICE_STATUS.includes(existing.status) ||
        toPaisa(existing.charges.total) !== totalPaisa ||
        toPaisa(existing.paid, true) !== toPaisa(booking.paidAmount, true) ||
        toPaisa(existing.balance) !== toPaisa(txn.amount)) {
      throw new AppError("Booking invoice balance changed; reconciliation is required", 409);
    }
  }

  // Gross total is authoritative. Legacy bookings have no stored tax split;
  // do not invent a new tax charge or derive one from today's room price.
  const quote = booking.priceBreakdown;
  let charges = existing?.charges || { room: totalPaisa / 100, extras: 0, tax: 0, taxRate: 0, total: totalPaisa / 100 };
  if (!existing && quote?.totalPaisa != null) {
    if (![quote.subtotalPaisa, quote.taxPaisa, quote.totalPaisa].every(n => Number.isSafeInteger(n) && n >= 0) ||
        quote.totalPaisa !== totalPaisa || quote.subtotalPaisa + quote.taxPaisa !== totalPaisa) {
      throw new AppError("Stored booking quote is inconsistent", 409);
    }
    charges = { room: quote.subtotalPaisa / 100, extras: 0, tax: quote.taxPaisa / 100, taxRate: quote.taxRate, total: totalPaisa / 100 };
  }
  await Invoice.findOneAndUpdate(
    { booking: booking._id },
    {
      $setOnInsert: { invoiceId: await generateInvoiceId(booking.company) },
      $set: {
        hotel: booking.hotel, company: booking.company, booking: booking._id, guest: booking.guest,
        bookingRef: booking.bookingId,
        guestName: booking.user?.fullname || booking.guestInfo?.name,
        room: { type: room.type, number: room.roomNumber },
        checkIn: booking.checkIn, checkOut: booking.checkOut, nights: booking.durationNights,
        charges,
        paid: totalPaisa / 100, balance: 0,
        status: "paid",
        paymentMethod: "Bank Transfer",
        paidAt: new Date(),
      },
    },
    { upsert: true, session },
  );

  return { targetType: "booking", targetId: booking._id, status: claimed.status };
}

async function fulfillOrder(txn, session) {
  const order = await Order.findById(txn.order).session(session);
  if (!order) throw new AppError("Order not found", 404);
  const hotel = await Hotel.findById(order.hotel).select("company").session(session);
  checkTenant(txn, { hotel: order.hotel, company: hotel?.company });
  // Orders have no currency field; their checkout amounts are NPR.
  checkCurrency(txn);
  if (toPaisa(txn.amount) !== remainingAmount(order.totalPrice, order.paidAmount ?? 0)) {
    throw new AppError("Order payment amount does not match remaining balance", 409);
  }
  const claimed = await Order.findOneAndUpdate(
    { _id: txn.order, status: { $ne: "cancelled" }, paymentStatus: { $in: CLAIMABLE_ORDER_PAYMENT_STATUS } },
    { $set: { paymentStatus: "paid", paymentMethod: "bank", paidAt: new Date(), paidAmount: order.totalPrice } },
    { new: true, session },
  );
  if (!claimed) throw new AppError("Order is no longer awaiting payment", 409);
  return { targetType: "order", targetId: claimed._id, status: claimed.paymentStatus };
}

async function fulfillInvoice(txn, session) {
  const invoice = await Invoice.findById(txn.invoice).session(session);
  if (!invoice) throw new AppError("Invoice not found", 404);
  checkTenant(txn, invoice);
  if (!sameId(txn.booking, invoice.booking)) throw new AppError("Invoice booking mismatch", 409);
  const booking = await Booking.findOneAndUpdate(
    { _id: invoice.booking }, { $inc: { paymentLockVersion: 1 } }, { new: true, session },
  );
  if (!booking) throw new AppError("Invoice booking not found", 404);
  checkTenant(txn, booking);
  checkCurrency(txn, booking.currency);
  if (["Cancelled", "No-Show"].includes(booking.status)) throw new AppError("Invoice booking is no longer awaiting payment", 409);
  if (!CLAIMABLE_INVOICE_STATUS.includes(invoice.status)) {
    throw new AppError("Invoice is no longer awaiting payment", 409);
  }
  const amountPaisa = toPaisa(txn.amount);
  const balancePaisa = toPaisa(invoice.balance, true);
  const paidPaisa = toPaisa(invoice.paid, true);
  if (amountPaisa > balancePaisa || paidPaisa + balancePaisa !== toPaisa(invoice.charges.total)) {
    throw new AppError("Invoice payment amount exceeds or does not match remaining balance", 409);
  }
  const paid = (paidPaisa + amountPaisa) / 100;
  const balance = (balancePaisa - amountPaisa) / 100;
  const claimed = await Invoice.findOneAndUpdate(
    { _id: invoice._id, status: { $in: CLAIMABLE_INVOICE_STATUS } },
    {
      $set: {
        paid, balance, status: balance <= 0 ? "paid" : "partial",
        paymentMethod: "Bank Transfer",
        ...(balance <= 0 ? { paidAt: new Date() } : {}),
      },
    },
    { new: true, session },
  );
  if (!claimed) throw new AppError("Invoice is no longer awaiting payment", 409);
  return { targetType: "invoice", targetId: claimed._id, status: claimed.status };
}
