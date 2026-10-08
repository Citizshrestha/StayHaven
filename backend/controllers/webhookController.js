import mongoose from "mongoose";
import { Booking } from "../models/booking.schema.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { Invoice, generateInvoiceId } from "../models/invoice.schema.js";
import { Room } from "../models/room.schema.js";
import { ActivityLog } from "../models/activityLog.schema.js";
import { emitToHotel } from "../config/socket.js";
import { sendEmail } from "../config/nodemailer.js";
import {
  verifyStripePayment,
} from "../services/paymentGatewayService.js";
import { createLogger } from "../utils/logger.js";
import { findReservationConflict } from "../services/bookingAvailability.js";

const logger = createLogger('WebhookController');

export { handleKhaltiCallback, handleEsewaCallback } from './walletPaymentController.js';

/**
 * Finalize a Stripe card booking payment — the single source of truth for
 * marking a guest booking paid via card. Card details never reach this
 * server (collected by Stripe Elements client-side); this function is
 * called AFTER Stripe confirms the charge, and it always re-verifies the
 * PaymentIntent directly with Stripe's API (never trusts a client- or
 * webhook-supplied amount/status) before writing anything.
 *
 * Idempotent and safe to call twice for the same paymentIntentId (from
 * both the client-triggered verify endpoint and the Stripe webhook) —
 * mirrors the same "already processed" guard used by the Khalti/eSewa
 * callbacks above.
 *
 * @param {string} paymentIntentId
 * @param {{ expectedUserId?: string }} [opts] - if provided, the booking's
 *   owning user must match (prevents one guest confirming another's booking)
 * @returns {{ok: true, booking, alreadyProcessed?: true} | {ok: false, reason: string}}
 */
// A payment may only be applied to a booking still awaiting one. Anything
// already outside this set is terminal or settled, so a late/replayed event
// must leave it untouched rather than reopening it -- the same status-whitelist
// rule the wallet layer uses to make PAID -> FAILED unreachable.
const CLAIMABLE_STATUS = ["Pending", "Confirmed"];
const CLAIMABLE_PAYMENT_STATUS = ["unpaid", "partial"];

async function finalizeStripeBookingPayment(paymentIntentId, { expectedUserId } = {}) {
  // Validate before the value reaches a Stripe API path or a database query.
  if (typeof paymentIntentId !== "string" || !/^pi_[A-Za-z0-9_]{8,250}$/.test(paymentIntentId)) {
    return { ok: false, reason: "invalid_reference" };
  }

  // Look the booking up FIRST: its stored amount and currency are the expected
  // values that verification must be bound to. Verifying before knowing them
  // leaves nothing to compare against but the provider's own numbers.
  const booking = await Booking.findOne({ paymentReference: paymentIntentId })
    .populate("hotel", "name")
    .populate("room", "roomNumber type status")
    .populate("user", "fullname email");

  if (!booking) {
    // Not a guest-booking payment intent — e.g. a staff-confirmed reception
    // payment. Caller falls back to its own handling for this case.
    return { ok: false, reason: "booking_not_found" };
  }

  if (expectedUserId && booking.user?._id?.toString() !== expectedUserId.toString()) {
    logger.error("Stripe payment booking ownership mismatch", { bookingId: booking._id, paymentIntentId });
    return { ok: false, reason: "ownership_mismatch" };
  }

  // Amount AND currency are enforced inside the adapter against the stored
  // booking, in integer minor units. A bare numeric compare would let an
  // intent in a weaker currency satisfy an NPR booking at a fraction of price.
  let verification;
  try {
    verification = await verifyStripePayment(paymentIntentId, {
      amount: booking.totalAmount,
      currency: booking.currency || "NPR",
    });
  } catch (error) {
    logger.error("Stripe verification rejected the payment", {
      bookingId: booking._id, paymentIntentId, message: error?.message,
    });
    return {
      ok: false,
      reason: /currency/i.test(error?.message || "") ? "currency_mismatch" : "amount_mismatch",
    };
  }

  // `settled` requires status succeeded AND amount_received covering the
  // expected total, so a partial capture cannot confirm a full booking.
  if (!verification.settled) {
    logger.warn("Stripe payment not completed", { paymentIntentId, status: verification.status });
    return { ok: false, reason: "payment_not_completed" };
  }

  if (booking.paymentStatus === "paid") {
    logger.info("Stripe payment already processed", { bookingId: booking._id, paymentIntentId });
    return { ok: true, booking, alreadyProcessed: true };
  }

  // Refuse to resurrect a booking that has already reached a terminal state.
  // A webhook retry arriving after a cancellation must be escalated for a
  // refund decision, never silently turned back into a confirmed stay.
  if (!CLAIMABLE_STATUS.includes(booking.status) ||
      !CLAIMABLE_PAYMENT_STATUS.includes(booking.paymentStatus)) {
    logger.error("Stripe payment settled for a booking in a terminal state", {
      bookingId: booking._id, paymentIntentId,
      status: booking.status, paymentStatus: booking.paymentStatus,
    });
    return { ok: false, reason: "booking_not_claimable" };
  }

  const session = await mongoose.startSession();
  let claimed = null;
  let roomTaken = false;
  try {
    await session.withTransaction(async () => {
      roomTaken = false;
      // The payment hold on this booking may have lapsed (card holds last 1 hour) while the
      // guest was on Stripe's page, and someone else may now hold the same room. Never
      // confirm a second booking on top of a live one: that would be a double booking
      // paid for by two guests. Flag it for a refund decision instead.
      if (booking.room?._id) {
        const clash = await findReservationConflict({
          room: booking.room._id, checkIn: booking.checkIn, checkOut: booking.checkOut,
          exclude: booking._id, session,
        });
        if (clash) { roomTaken = true; return; }
      }
      // Atomic claim. The client-triggered verify endpoint and the Stripe
      // webhook race here as a matter of course (both fire for every card
      // payment), and the read-then-save this replaced let both pass the
      // "already processed" check and write. Re-asserting the claimable
      // status inside the filter means exactly one finalizer can transition
      // the booking; the loser observes null and reports alreadyProcessed.
      claimed = await Booking.findOneAndUpdate(
        {
          _id: booking._id,
          status: { $in: CLAIMABLE_STATUS },
          paymentStatus: { $in: CLAIMABLE_PAYMENT_STATUS },
        },
        {
          $set: {
            status: "Confirmed",
            paymentStatus: "paid",
            paymentMethod: "card",
            paidAt: new Date(),
            paidAmount: verification.amount,
          },
        },
        { new: true, session },
      );
      if (!claimed) return;

      // Upsert keyed on the provider reference, so a retry of this same
      // intent updates one row instead of colliding with the unique index
      // on transactionId and surfacing a duplicate-key 500.
      await PaymentTransaction.findOneAndUpdate(
        { transactionId: paymentIntentId },
        {
          $setOnInsert: {
            transactionId: paymentIntentId,
            hotel: booking.hotel._id,
            company: booking.company,
            booking: booking._id,
            user: booking.user?._id,
            type: "capture",
            amount: verification.amount,
            currency: (verification.currency || "npr").toUpperCase(),
            method: "card",
            reference: paymentIntentId,
            status: "captured",
            processedAt: new Date(),
          },
        },
        { upsert: true, session },
      );

      // Only advance a room that is actually free. Overwriting an occupied
      // room's status from a payment callback would desynchronise housekeeping
      // for a guest already in it.
      if (booking.room) {
        await Room.findOneAndUpdate(
          { _id: booking.room._id, status: { $in: ["available", "reserved"] } },
          { $set: { status: "reserved" } },
          { session },
        );
      }

      // booking.totalAmount is ALREADY the amount the guest was quoted and charged (nights x rate
      // + the 12% fee). The invoice used to add a further 13% on top, so every card-paid booking
      // showed an outstanding balance the guest never owed.
      const quote = booking.priceBreakdown?.totalPaisa != null ? booking.priceBreakdown : null;
      const subtotal = quote ? quote.subtotalPaisa / 100 : booking.totalAmount;
      const tax = quote ? quote.taxPaisa / 100 : 0;
      const total = booking.totalAmount;

      await Invoice.findOneAndUpdate(
        { booking: booking._id },
        {
          // See the identical comment in handleKhaltiCallback above.
          $setOnInsert: { invoiceId: await generateInvoiceId(booking.company) },
          $set: {
            hotel: booking.hotel._id,
            company: booking.company,
            booking: booking._id,
            user: booking.user?._id,
            bookingRef: booking.bookingId,
            guestName: booking.user?.fullname || booking.guestInfo?.name,
            room: { type: booking.room?.type, number: booking.room?.roomNumber },
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            nights: booking.durationNights,
            charges: { room: subtotal, extras: 0, taxRate: quote?.taxRate ?? 0, tax, total },
            paid: verification.amount,
            balance: Math.max(0, total - verification.amount),
            status: verification.amount >= total ? "paid" : "partial",
            paidAt: verification.amount >= total ? new Date() : null,
          },
        },
        { upsert: true, session }
      );

      await ActivityLog.create([{
        hotel: booking.hotel._id,
        company: booking.company,
        entityType: "payment",
        entityId: paymentIntentId,
        action: "payment-verified",
        description: `Stripe card payment verified for booking ${booking.bookingId}. Amount: NPR ${verification.amount}`,
        icon: "CheckCircle",
        color: "#10b981",
      }], { session });
    });
  } finally {
    session.endSession();
  }

  if (roomTaken) {
    logger.error("Stripe payment settled but the room was taken by another reservation; refund required", {
      bookingId: booking._id, paymentIntentId,
    });
    return { ok: false, reason: "room_unavailable_after_payment" };
  }

  // The transaction ran, but another finalizer (the racing webhook/verify
  // call) won the atomic claim first. That finalizer already performed (or
  // is performing) every side effect below; this call must not double them.
  if (!claimed) {
    logger.info("Stripe payment already processed (raced)", { bookingId: booking._id, paymentIntentId });
    return { ok: true, booking, alreadyProcessed: true };
  }
  booking.status = claimed.status;
  booking.paymentStatus = claimed.paymentStatus;
  booking.paidAmount = claimed.paidAmount;
  booking.paidAt = claimed.paidAt;

  // Best-effort side effects, outside the transaction. The email is NOT awaited: the guest's
  // browser is waiting on this response, and an unreachable SMTP server used to hold the
  // payment confirmation for about two minutes (measured) before it could answer.
  const guestEmail = booking.user?.email || booking.guestInfo?.email;
  if (guestEmail) {
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    Promise.resolve()
      .then(() => sendEmail({
        from: process.env.SENDER_EMAIL || "noreply@stayhaven.com",
        to: guestEmail,
        subject: `Booking Confirmed - ${booking.bookingId}`,
        html: `
          <h2>Booking Confirmed!</h2>
          <p>Dear ${esc(booking.user?.fullname || booking.guestInfo?.name)},</p>
          <p>Your payment has been successfully processed and your booking is confirmed.</p>
          <p><strong>Booking Reference:</strong> ${esc(booking.confirmationCode || booking.bookingId)}</p>
          <p><strong>Hotel:</strong> ${esc(booking.hotel.name)}</p>
          <p><strong>Check-in:</strong> ${esc(new Date(booking.checkIn).toLocaleDateString())}</p>
          <p><strong>Check-out:</strong> ${esc(new Date(booking.checkOut).toLocaleDateString())}</p>
          <p><strong>Amount Paid:</strong> NPR ${esc(verification.amount)}</p>
          <p>Thank you for choosing StayHaven!</p>
        `,
      }))
      .catch((emailError) => {
        logger.error("Failed to send confirmation email", { error: emailError?.message, bookingId: booking._id });
      });
  }

  emitToHotel(booking.hotel._id.toString(), "booking-confirmed", {
    bookingId: booking._id,
    bookingRef: booking.bookingId,
    paymentMethod: "card",
  });

  logger.info("Stripe card payment processed successfully", { bookingId: booking._id, paymentIntentId });

  return { ok: true, booking };
}

// Exported for the Stripe webhook (paymentController.js) to reuse the same
// verified, idempotent finalize logic instead of trusting the event payload.
export { finalizeStripeBookingPayment };

/**
 * Verify + finalize a guest's card payment right after Stripe confirms it
 * client-side. This is the primary confirmation path for card bookings
 * (the webhook above is a same-logic backup in case this call never
 * reaches the server, e.g. the tab closes right after payment).
 * POST /api/v1/public/bookings/verify-card-payment
 */
export const verifyStripeCardPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: "paymentIntentId is required" });
    }

    const result = await finalizeStripeBookingPayment(paymentIntentId, {
      expectedUserId: req.user?._id,
    });

    if (!result.ok) {
      const statusByReason = {
        booking_not_found: 404,
        ownership_mismatch: 403,
        amount_mismatch: 400,
        payment_not_completed: 400,
        room_unavailable_after_payment: 409,
        booking_not_claimable: 409,
      };
      const messages = {
        room_unavailable_after_payment: "Your payment went through but the room was taken before it could be confirmed. Please contact support for a refund.",
        booking_not_claimable: "This booking can no longer accept a payment. Please contact support if you were charged.",
      };
      return res.status(statusByReason[result.reason] || 400).json({
        success: false,
        message: messages[result.reason] || "Payment could not be verified.",
        reason: result.reason,
      });
    }

    return res.json({
      success: true,
      data: {
        bookingId: result.booking._id,
        bookingRef: result.booking.bookingId,
        confirmationCode: result.booking.confirmationCode,
        status: result.booking.status,
        paymentStatus: result.booking.paymentStatus,
      },
    });
  } catch (error) {
    logger.error("Stripe card verification error", { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: "Failed to verify payment." });
  }
};

/**
 * Verify payment status (for polling)
 * GET /api/webhooks/payment/:bookingId/status
 */
export const verifyPaymentStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .select('status paymentStatus paymentMethod paidAmount confirmationCode bookingId')
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    res.json({
      success: true,
      data: {
        bookingId: booking._id,
        bookingRef: booking.bookingId,
        confirmationCode: booking.confirmationCode,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod,
        paidAmount: booking.paidAmount,
      },
    });
  } catch (error) {
    logger.error('Payment status check error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
    });
  }
};
