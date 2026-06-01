import mongoose from "mongoose";
import stripeLib from "stripe";
import { Booking } from "../models/booking.schema.js";
import { Invoice } from "../models/invoice.schema.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { ActivityLog } from "../models/activityLog.schema.js";
import { emitToHotel } from "../config/socket.js";
import { sendEmail } from "../config/nodemailer.js";

const stripe = process.env.STRIPE_SECRET_KEY ? stripeLib(process.env.STRIPE_SECRET_KEY) : null;

// Helper: get context from request
const getCtx = (req) => {
  const user = req.user;
  const hotel = req._scopedHotelId || req.query.hotelId || user?.assignedProperties?.[0]?._id;
  const company = req.query.companyId || user?.company?._id || user?.company;
  return { hotel, company, userId: user?._id, userName: user?.fullname };
};

// Multi-tenancy helpers
const getUserRole = (req) => req.user?.role?.name || req.user?.companyRole;

const getAssignedHotelIds = (req) => {
  const assigned = req.user?.assignedProperties || [];
  return assigned
    .map((p) => (typeof p === "object" ? p?._id?.toString() : p?.toString()))
    .filter(Boolean);
};

const assertHotelAccess = async (req, hotelId) => {
  const role = getUserRole(req);

  // Superadmins should NOT have access to hotel-specific financial data
  // They can manage hotels (approve/reject) but cannot view bookings, revenue, etc.
  if (role === "admin" || role === "superadmin") {
    throw Object.assign(new Error("Superadmins cannot access hotel-specific operational data"), { status: 403 });
  }

  const assignedHotelIds = getAssignedHotelIds(req);
  const userCompany = req.user?.company?._id?.toString?.() || req.user?.company?.toString?.() || req.user?.company;

  const hotel = await Hotel.findById(hotelId).select("company");
  if (!hotel) {
    throw Object.assign(new Error("Hotel not found"), { status: 404 });
  }

  if (role === "receptionist" && assignedHotelIds.length > 0 && !assignedHotelIds.includes(hotelId.toString())) {
    throw Object.assign(new Error("Not authorized for this hotel"), { status: 403 });
  }

  if (role !== "owner" && userCompany && hotel.company?.toString() !== userCompany.toString()) {
    throw Object.assign(new Error("Not authorized for this hotel company"), { status: 403 });
  }

  return hotel;
};

// Helper: log activity
const logActivity = async (data) => {
  try {
    const log = await ActivityLog.create(data);
    if (data.hotel) {
      emitToHotel(data.hotel.toString(), "activity-log", log);
    }
    return log;
  } catch {
    /* silently ignore */
  }
};

/**
 * Create a payment intent (Stripe)
 */
export const createPaymentIntent = async (req, res) => {
  try {
    if (!stripe) {
      // Simulate payment intent in dev mode
      return res.json({
        success: true,
        message: "Development mode: Simulated payment intent",
        data: {
          clientSecret: "simulated_secret_" + Date.now(),
          amount: req.body.amount,
          currency: req.body.currency || "usd",
          simulated: true,
        },
      });
    }

    const { amount, currency = "usd", bookingId, metadata = {} } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    // CRITICAL: Validate hotel access before processing payment
    let booking = null;
    if (bookingId) {
      booking = await Booking.findById(bookingId).populate("guest");
      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }
      // Validate user has access to this booking's hotel
      await assertHotelAccess(req, booking.hotel);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses cents
      currency,
      metadata: {
        bookingId: bookingId || "",
        bookingRef: booking?.bookingId || "",
        guestEmail: booking?.guest?.email || "",
        ...metadata,
      },
      automatic_payment_methods: { enabled: true },
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
      },
    });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Confirm payment and create transaction record
 */
export const confirmPayment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { hotel, company, userId, userName } = getCtx(req);
    const { bookingId, amount, paymentIntentId, method = "credit-card", last4, receiptEmail } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ success: false, message: "bookingId and amount are required" });
    }

    // CRITICAL: Validate hotel access BEFORE starting transaction
    const bookingCheck = await Booking.findById(bookingId).select('hotel');
    if (!bookingCheck) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    await assertHotelAccess(req, bookingCheck.hotel);

    let paymentResult;

    await session.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).populate("guest").session(session);
      if (!booking) throw new Error("Booking not found");

      // Create payment transaction
      const txnData = {
        hotel: booking.hotel,
        company: booking.company,
        booking: booking._id,
        guest: booking.guest?._id,
        type: "capture",
        amount,
        method,
        reference: paymentIntentId || `MANUAL-${Date.now()}`,
        status: "captured",
        processedBy: userId,
        processedByName: userName,
      };

      const txn = await PaymentTransaction.create([txnData], { session });

      // Calculate total paid
      const previousPayments = await PaymentTransaction.aggregate([
        {
          $match: {
            booking: booking._id,
            type: "capture",
            status: { $in: ["captured", "settled"] },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).session(session);

      const totalPaid = previousPayments[0]?.total || 0;

      // Update booking payment status
      booking.paymentStatus = totalPaid >= booking.totalAmount ? "paid" : "partial";
      await booking.save({ session });

      // Create or update invoice
      let invoice = await Invoice.findOne({ booking: booking._id }).session(session);
      if (!invoice) {
        invoice = await Invoice.create([{
          hotel: booking.hotel,
          company: booking.company,
          booking: booking._id,
          guest: booking.guest?._id,
          bookingRef: booking.bookingId,
          guestName: booking.guest?.fullName || booking.guestInfo?.name,
          room: {
            type: booking.room?.type,
            number: booking.room?.roomNumber,
          },
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          nights: booking.durationNights,
          charges: {
            room: booking.totalAmount,
            extras: 0,
            tax: booking.totalAmount * 0.13,
            total: booking.totalAmount * 1.13,
          },
          paid: totalPaid,
          balance: Math.max(0, booking.totalAmount * 1.13 - totalPaid),
          status: totalPaid >= booking.totalAmount * 1.13 ? "paid" : "partial",
        }], { session });
        invoice = invoice[0];
      } else {
        invoice.paid = totalPaid;
        invoice.balance = Math.max(0, invoice.charges.total - totalPaid);
        invoice.status = totalPaid >= invoice.charges.total ? "paid" : "partial";
        if (totalPaid >= invoice.charges.total) {
          invoice.paidAt = new Date();
        }
        await invoice.save({ session });
      }

      paymentResult = { txn: txn[0], booking, invoice, totalPaid };
    });

    // Send receipt email
    if (receiptEmail || paymentResult.booking?.guest?.email) {
      await sendPaymentReceipt({
        to: receiptEmail || paymentResult.booking.guest.email,
        booking: paymentResult.booking,
        txn: paymentResult.txn,
        invoice: paymentResult.invoice,
      });
    }

    // Log activity
    await logActivity({
      hotel: paymentResult.booking.hotel,
      company: paymentResult.booking.company,
      entityType: "payment",
      entityId: paymentResult.txn.transactionId,
      action: "payment-confirmed",
      description: `Payment of <strong>${amount}</strong> confirmed for booking ${paymentResult.booking.bookingId}`,
      icon: "CreditCard",
      color: "#10b981",
      actor: userId,
      actorName: userName,
    });

    emitToHotel(paymentResult.booking.hotel.toString(), "payment-update", {
      type: "confirmed",
      txn: paymentResult.txn,
      booking: paymentResult.booking,
    });

    res.json({
      success: true,
      message: "Payment confirmed",
      data: {
        transaction: paymentResult.txn,
        booking: paymentResult.booking,
        invoice: paymentResult.invoice,
        totalPaid: paymentResult.totalPaid,
        remainingBalance: Math.max(0, paymentResult.invoice.charges.total - paymentResult.totalPaid),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Process refund with approval workflow
 */
export const processRefund = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { hotel, company, userId, userName } = getCtx(req);
    const { transactionId, amount, reason, requiresApproval = false } = req.body;

    if (!transactionId || !amount) {
      return res.status(400).json({ success: false, message: "transactionId and amount are required" });
    }

    // CRITICAL: Validate hotel access BEFORE processing refund
    const txnCheck = await PaymentTransaction.findById(transactionId).select('hotel');
    if (!txnCheck) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    await assertHotelAccess(req, txnCheck.hotel);

    let refundResult;

    await session.withTransaction(async () => {
      const originalTxn = await PaymentTransaction.findById(transactionId).session(session);
      if (!originalTxn) throw new Error("Original transaction not found");

      // Check if transaction can be refunded
      if (!["captured", "settled"].includes(originalTxn.status)) {
        throw new Error(`Cannot refund transaction with status: ${originalTxn.status}`);
      }

      // Check refund amount
      const existingRefunds = await PaymentTransaction.aggregate([
        {
          $match: {
            booking: originalTxn.booking,
            type: "refund",
            status: "refunded",
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).session(session);

      const totalRefunded = existingRefunds[0]?.total || 0;
      const maxRefund = originalTxn.amount - totalRefunded;

      if (amount > maxRefund) {
        throw new Error(`Refund amount exceeds available amount. Max refund: ${maxRefund}`);
      }

      // For large refunds, require approval
      const needsManagerApproval = requiresApproval || amount > 1000;
      const refundStatus = needsManagerApproval ? "refund-requested" : "refunded";

      // Create refund transaction
      const refundTxn = await PaymentTransaction.create([{
        hotel: originalTxn.hotel,
        company: originalTxn.company,
        booking: originalTxn.booking,
        guest: originalTxn.guest,
        type: "refund",
        amount,
        method: originalTxn.method,
        reference: `REFUND-${originalTxn.transactionId}`,
        status: refundStatus,
        refundReason: reason,
        processedBy: userId,
        processedByName: userName,
      }], { session });

      // If auto-approved, update booking
      if (!needsManagerApproval) {
        const booking = await Booking.findById(originalTxn.booking).session(session);
        if (booking) {
          const totalPaid = await PaymentTransaction.aggregate([
            {
              $match: {
                booking: booking._id,
                type: "capture",
                status: { $in: ["captured", "settled"] },
              },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]).session(session);

          const totalRefunds = await PaymentTransaction.aggregate([
            {
              $match: {
                booking: booking._id,
                type: "refund",
                status: "refunded",
              },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]).session(session);

          const netPaid = (totalPaid[0]?.total || 0) - (totalRefunds[0]?.total || 0);
          booking.paymentStatus = netPaid >= booking.totalAmount ? "paid" : netPaid > 0 ? "partial" : "refunded";
          await booking.save({ session });
        }
      }

      refundResult = { refundTxn: refundTxn[0], needsManagerApproval };
    });

    // Log activity
    const action = refundResult.needsManagerApproval ? "refund-requested" : "refund-processed";
    const description = refundResult.needsManagerApproval
      ? `Refund of <strong>${amount}</strong> requested (pending approval)`
      : `Refund of <strong>${amount}</strong> processed`;

    await logActivity({
      hotel,
      company,
      entityType: "payment",
      entityId: refundResult.refundTxn.transactionId,
      action,
      description,
      icon: "RotateCcw",
      color: refundResult.needsManagerApproval ? "#f59e0b" : "#10b981",
      actor: userId,
      actorName: userName,
    });

    emitToHotel(hotel?.toString(), "payment-update", {
      type: refundResult.needsManagerApproval ? "refund-requested" : "refunded",
      txn: refundResult.refundTxn,
    });

    res.json({
      success: true,
      message: refundResult.needsManagerApproval ? "Refund request submitted for approval" : "Refund processed",
      data: {
        transaction: refundResult.refundTxn,
        needsApproval: refundResult.needsManagerApproval,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Approve or reject refund request
 */
export const approveRefund = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { hotel, company, userId, userName } = getCtx(req);
    const { refundId, action, rejectionReason } = req.body;

    if (!refundId || !action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "refundId and action (approve/reject) are required" });
    }

    // CRITICAL: Validate hotel access BEFORE approving/rejecting refund
    const refundCheck = await PaymentTransaction.findById(refundId).select('hotel');
    if (!refundCheck) {
      return res.status(404).json({ success: false, message: "Refund transaction not found" });
    }
    await assertHotelAccess(req, refundCheck.hotel);

    await session.withTransaction(async () => {
      const refundTxn = await PaymentTransaction.findById(refundId).session(session);
      if (!refundTxn) throw new Error("Refund transaction not found");
      if (refundTxn.status !== "refund-requested") {
        throw new Error(`Refund is not pending approval. Current status: ${refundTxn.status}`);
      }

      if (action === "approve") {
        refundTxn.status = "refunded";
        refundTxn.resolution = "Approved by manager";
        refundTxn.resolvedAt = new Date();
        await refundTxn.save({ session });

        // Update booking payment status
        const booking = await Booking.findById(refundTxn.booking).session(session);
        if (booking) {
          const totalPaid = await PaymentTransaction.aggregate([
            {
              $match: {
                booking: booking._id,
                type: "capture",
                status: { $in: ["captured", "settled"] },
              },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]).session(session);

          const totalRefunds = await PaymentTransaction.aggregate([
            {
              $match: {
                booking: booking._id,
                type: "refund",
                status: "refunded",
              },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]).session(session);

          const netPaid = (totalPaid[0]?.total || 0) - (totalRefunds[0]?.total || 0);
          booking.paymentStatus = netPaid >= booking.totalAmount ? "paid" : netPaid > 0 ? "partial" : "refunded";
          await booking.save({ session });
        }
      } else {
        refundTxn.status = "failed";
        refundTxn.resolution = `Rejected: ${rejectionReason || "No reason provided"}`;
        refundTxn.resolvedAt = new Date();
        await refundTxn.save({ session });
      }
    });

    const refundTxn = await PaymentTransaction.findById(refundId);

    await logActivity({
      hotel,
      company,
      entityType: "payment",
      entityId: refundTxn.transactionId,
      action: action === "approve" ? "refund-approved" : "refund-rejected",
      description:
        action === "approve"
          ? `Refund of <strong>${refundTxn.amount}</strong> approved`
          : `Refund of <strong>${refundTxn.amount}</strong> rejected: ${rejectionReason}`,
      icon: action === "approve" ? "CheckCircle" : "XCircle",
      color: action === "approve" ? "#10b981" : "#ef4444",
      actor: userId,
      actorName: userName,
    });

    res.json({
      success: true,
      message: `Refund ${action === "approve" ? "approved" : "rejected"}`,
      data: refundTxn,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Get pending refund requests
 */
export const getPendingRefunds = async (req, res) => {
  try {
    const { hotel, company } = getCtx(req);
    const filter = company ? { company } : hotel ? { hotel } : {};
    filter.status = "refund-requested";
    filter.type = "refund";

    const refunds = await PaymentTransaction.find(filter)
      .populate("booking", "bookingId guestInfo")
      .populate("guest", "fullName email")
      .populate("processedBy", "fullname")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: refunds });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Handle Stripe webhook
 */
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = req.body;
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;
      default:
        // Unhandled event type - silently ignore
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

async function handlePaymentIntentSucceeded(paymentIntent) {
  // Update transaction status
  await PaymentTransaction.updateOne(
    { reference: paymentIntent.id },
    { status: "captured", $set: { stripePaymentIntentId: paymentIntent.id } }
  );
}

async function handlePaymentIntentFailed(paymentIntent) {
  await PaymentTransaction.updateOne(
    { reference: paymentIntent.id },
    { status: "failed" }
  );
}

async function handleChargeRefunded(charge) {
  // Handle automatic refund updates from Stripe
  // Log to application logger if needed
}

/**
 * Send payment receipt email
 */
async function sendPaymentReceipt({ to, booking, txn, invoice }) {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; }
          .detail { margin: 10px 0; }
          .label { font-weight: bold; color: #6b7280; }
          .value { color: #111827; }
          .amount { font-size: 24px; color: #10b981; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Receipt</h1>
          </div>
          <div class="content">
            <p>Dear ${booking.guest?.fullName || booking.guestInfo?.name || "Guest"},</p>
            <p>Thank you for your payment. Here are your transaction details:</p>

            <div class="detail">
              <span class="label">Transaction ID:</span>
              <span class="value">${txn.transactionId}</span>
            </div>
            <div class="detail">
              <span class="label">Booking Reference:</span>
              <span class="value">${booking.bookingId}</span>
            </div>
            <div class="detail">
              <span class="label">Amount Paid:</span>
              <span class="amount">$${txn.amount.toFixed(2)}</span>
            </div>
            <div class="detail">
              <span class="label">Payment Method:</span>
              <span class="value">${txn.method}</span>
            </div>
            <div class="detail">
              <span class="label">Date:</span>
              <span class="value">${new Date(txn.createdAt).toLocaleString()}</span>
            </div>

            ${invoice ? `
            <div class="detail">
              <span class="label">Invoice ID:</span>
              <span class="value">${invoice.invoiceId}</span>
            </div>
            <div class="detail">
              <span class="label">Remaining Balance:</span>
              <span class="value">$${invoice.balance.toFixed(2)}</span>
            </div>
            ` : ""}
          </div>
          <div class="footer">
            <p>If you have any questions, please contact our support team.</p>
            <p>Thank you for choosing our hotel!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      from: process.env.SENDER_EMAIL,
      to,
      subject: "Payment Receipt - Thank You!",
      html,
    });
  } catch (err) {
    console.error("Failed to send receipt:", err);
  }
}

/**
 * Get payment summary for a booking
 */
export const getPaymentSummary = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // CRITICAL: Validate hotel access BEFORE fetching payment data
    const bookingCheck = await Booking.findById(bookingId).select('hotel');
    if (!bookingCheck) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    await assertHotelAccess(req, bookingCheck.hotel);

    const [booking, transactions, invoice] = await Promise.all([
      Booking.findById(bookingId).populate("guest", "fullName email").lean(),
      PaymentTransaction.find({ booking: bookingId }).sort({ createdAt: -1 }).lean(),
      Invoice.findOne({ booking: bookingId }).lean(),
    ]);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const captures = transactions.filter((t) => t.type === "capture" && ["captured", "settled"].includes(t.status));
    const refunds = transactions.filter((t) => t.type === "refund" && t.status === "refunded");
    const pendingRefunds = transactions.filter((t) => t.status === "refund-requested");

    const totalCaptured = captures.reduce((sum, t) => sum + t.amount, 0);
    const totalRefunded = refunds.reduce((sum, t) => sum + t.amount, 0);
    const pendingRefundAmount = pendingRefunds.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      data: {
        booking: {
          _id: booking._id,
          bookingId: booking.bookingId,
          totalAmount: booking.totalAmount,
          paymentStatus: booking.paymentStatus,
        },
        summary: {
          totalCaptured,
          totalRefunded,
          netAmount: totalCaptured - totalRefunded,
          pendingRefundAmount,
          remainingBalance: Math.max(0, booking.totalAmount - totalCaptured),
        },
        transactions: {
          captures,
          refunds,
          pendingRefunds,
          disputes: transactions.filter((t) => t.status === "disputed"),
        },
        invoice,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
