import mongoose from "mongoose";
import { Booking } from "../models/booking.schema.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { Invoice } from "../models/invoice.schema.js";
import { Room } from "../models/room.schema.js";
import { ActivityLog } from "../models/activityLog.schema.js";
import { emitToHotel } from "../config/socket.js";
import { sendEmail } from "../config/nodemailer.js";
import {
  verifyKhaltiPayment,
  verifyEsewaCallback,
  checkEsewaTransactionStatus,
} from "../services/paymentGatewayService.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger('WebhookController');

/**
 * Handle Khalti payment callback
 * GET /api/webhooks/khalti/verify?pidx=xxx&purchase_order_id=xxx&transaction_id=xxx&amount=xxx
 */
export const handleKhaltiCallback = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { pidx, purchase_order_id, transaction_id, amount, status } = req.query;

    logger.info('Khalti callback received', { pidx, purchase_order_id, transaction_id, amount, status });

    if (!pidx) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment identifier (pidx)',
      });
    }

    // Check if this is a mock payment (development mode)
    const isMockPayment = pidx.startsWith('mock_pidx_');
    let verification;

    if (isMockPayment) {
      // Mock payment - simulate successful verification without calling Khalti API
      logger.info('Processing mock Khalti payment (development mode)', { pidx, purchase_order_id });

      verification = {
        status: 'Completed',
        transactionId: transaction_id || `KHALTI-MOCK-${Date.now()}`,
        pidx: pidx,
        totalAmount: amount ? parseFloat(amount) / 100 : 0, // Convert from paisa to NPR
        fee: 0,
        refunded: false,
        mock: true,
      };

      logger.info('Mock Khalti verification successful', verification);
    } else {
      // Real payment - verify with Khalti API
      verification = await verifyKhaltiPayment(pidx);

      logger.info('Khalti verification result', {
        status: verification.status,
        transactionId: verification.transactionId
      });
    }

    // Check if payment was successful
    if (verification.status !== 'Completed') {
      logger.warn('Khalti payment not completed', { status: verification.status, pidx });

      // Redirect to failure page
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(
        `${clientUrl}/payment-callback?status=failed&method=khalti&orderId=${purchase_order_id}&reason=payment_not_completed`
      );
    }

    // Find booking by ID
    const bookingId = purchase_order_id;
    const booking = await Booking.findById(bookingId)
      .populate('hotel', 'name')
      .populate('room', 'roomNumber type')
      .populate('guest', 'fullName email');

    if (!booking) {
      logger.error('Booking not found for Khalti payment', { bookingId, pidx });
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if payment already processed
    if (booking.paymentStatus === 'paid' && booking.status === 'Confirmed') {
      logger.info('Payment already processed', { bookingId, pidx });

      // Redirect to success page
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(
        `${clientUrl}/payment-callback?status=success&method=khalti&orderId=${bookingId}`
      );
    }

    // Process payment in transaction
    await session.withTransaction(async () => {
      // Update booking status
      booking.status = 'Confirmed';
      booking.paymentStatus = 'paid';
      booking.paymentMethod = isMockPayment ? 'khalti-mock' : 'khalti';
      booking.paidAt = new Date();
      booking.paidAmount = verification.totalAmount;
      await booking.save({ session });

      // Create payment transaction record
      await PaymentTransaction.create([{
        transactionId: verification.transactionId || `KHALTI-${Date.now()}`,
        hotel: booking.hotel._id,
        company: booking.company,
        booking: booking._id,
        guest: booking.guest?._id,
        type: 'capture',
        amount: verification.totalAmount,
        currency: 'NPR',
        method: isMockPayment ? 'khalti-mock' : 'khalti',
        reference: pidx,
        status: 'captured',
        processedAt: new Date(),
      }], { session });

      // Update room status to reserved
      if (booking.room) {
        await Room.findByIdAndUpdate(
          booking.room._id,
          { status: 'reserved' },
          { session }
        );
      }

      // Create or update invoice
      const taxRate = 0.13; // 13% tax
      const subtotal = booking.totalAmount;
      const tax = Math.round(subtotal * taxRate);
      const total = subtotal + tax;

      await Invoice.findOneAndUpdate(
        { booking: booking._id },
        {
          hotel: booking.hotel._id,
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
            room: subtotal,
            extras: 0,
            tax: tax,
            total: total,
          },
          paid: verification.totalAmount,
          balance: Math.max(0, total - verification.totalAmount),
          status: verification.totalAmount >= total ? 'paid' : 'partial',
          paidAt: verification.totalAmount >= total ? new Date() : null,
        },
        { upsert: true, session }
      );

      // Log activity
      await ActivityLog.create([{
        hotel: booking.hotel._id,
        company: booking.company,
        entityType: 'payment',
        entityId: verification.transactionId,
        action: 'payment-verified',
        description: `Khalti payment verified for booking ${booking.bookingId}. Amount: NPR ${verification.totalAmount}`,
        icon: 'CheckCircle',
        color: '#10b981',
      }], { session });
    });

    // Send confirmation email (outside transaction)
    try {
      const guestEmail = booking.guest?.email || booking.guestInfo?.email;
      if (guestEmail) {
        await sendEmail({
          from: process.env.SENDER_EMAIL || 'noreply@stayhaven.com',
          to: guestEmail,
          subject: `Booking Confirmed - ${booking.bookingId}`,
          html: `
            <h2>Booking Confirmed!</h2>
            <p>Dear ${booking.guest?.fullName || booking.guestInfo?.name},</p>
            <p>Your payment has been successfully processed and your booking is confirmed.</p>
            <p><strong>Booking Reference:</strong> ${booking.confirmationCode || booking.bookingId}</p>
            <p><strong>Hotel:</strong> ${booking.hotel.name}</p>
            <p><strong>Check-in:</strong> ${new Date(booking.checkIn).toLocaleDateString()}</p>
            <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toLocaleDateString()}</p>
            <p><strong>Amount Paid:</strong> NPR ${verification.totalAmount}</p>
            <p>Thank you for choosing StayHaven!</p>
          `,
        });
      }
    } catch (emailError) {
      logger.error('Failed to send confirmation email', { error: emailError.message, bookingId });
    }

    // Emit Socket.io event
    emitToHotel(booking.hotel._id.toString(), 'booking-confirmed', {
      bookingId: booking._id,
      bookingRef: booking.bookingId,
      paymentMethod: 'khalti',
    });

    logger.info('Khalti payment processed successfully', { bookingId, pidx });

    // Redirect to success page
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(
      `${clientUrl}/payment-callback?status=success&method=khalti&orderId=${bookingId}`
    );

  } catch (error) {
    logger.error('Khalti callback error', { error: error.message, stack: error.stack });

    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(
      `${clientUrl}/payment-callback?status=failed&method=khalti&reason=verification_failed`
    );
  } finally {
    session.endSession();
  }
};

/**
 * Handle eSewa payment callback
 * GET /api/webhooks/esewa/verify?data=base64_encoded_response
 */
export const handleEsewaCallback = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { data } = req.query;

    logger.info('eSewa callback received', { hasData: !!data, queryKeys: Object.keys(req.query) });

    if (!data) {
      logger.error('Missing eSewa payment data', { query: req.query });
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(
        `${clientUrl}/payment-callback?status=failed&method=esewa&reason=missing_payment_data`
      );
    }

    // Verify eSewa callback signature
    const verification = verifyEsewaCallback(data);

    if (!verification.verified) {
      logger.warn('eSewa signature verification failed', { error: verification.error });

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(
        `${clientUrl}/payment-callback?status=failed&method=esewa&reason=signature_verification_failed`
      );
    }

    logger.info('eSewa verification result', {
      status: verification.data.status,
      transactionCode: verification.data.transactionCode,
      transactionUuid: verification.data.transactionUuid
    });

    // Extract booking ID from transaction UUID
    // Format: bookingId-timestamp (e.g., "507f1f77bcf86cd799439011-1234567890123")
    const transactionUuid = verification.data.transactionUuid;

    // MongoDB ObjectID is 24 characters, so extract first 24 chars before the hyphen
    const parts = transactionUuid.split('-');
    const bookingId = parts[0];

    logger.info('Extracted booking ID from transaction UUID', { transactionUuid, bookingId });

    // Find booking
    const booking = await Booking.findById(bookingId)
      .populate('hotel', 'name')
      .populate('room', 'roomNumber type')
      .populate('user', 'fullname email');

    if (!booking) {
      logger.error('Booking not found for eSewa payment', { bookingId, transactionUuid });
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(
        `${clientUrl}/payment-callback?status=failed&method=esewa&orderId=${bookingId}&reason=booking_not_found`
      );
    }

    logger.info('Booking found for eSewa payment', {
      bookingId: booking._id,
      bookingRef: booking.bookingId,
      currentStatus: booking.status,
      currentPaymentStatus: booking.paymentStatus
    });

    // Check if payment already processed
    if (booking.paymentStatus === 'paid' && booking.status === 'Confirmed') {
      logger.info('Payment already processed', { bookingId, transactionUuid });

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(
        `${clientUrl}/payment-callback?status=success&method=esewa&orderId=${bookingId}`
      );
    }

    // Double-check payment status with eSewa API
    const statusCheck = await checkEsewaTransactionStatus(
      transactionUuid,
      verification.data.totalAmount
    );

    if (statusCheck.status !== 'COMPLETE') {
      logger.warn('eSewa payment not complete', { status: statusCheck.status, transactionUuid });

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(
        `${clientUrl}/payment-callback?status=failed&method=esewa&orderId=${bookingId}&reason=payment_not_complete`
      );
    }

    // Process payment in transaction
    await session.withTransaction(async () => {
      // Update booking status
      booking.status = 'Confirmed';
      booking.paymentStatus = 'paid';
      booking.paymentMethod = 'esewa';
      booking.paidAt = new Date();
      booking.paidAmount = verification.data.totalAmount;
      await booking.save({ session });

      // Create payment transaction record
      await PaymentTransaction.create([{
        transactionId: verification.data.transactionCode || `ESEWA-${Date.now()}`,
        hotel: booking.hotel._id,
        company: booking.company,
        booking: booking._id,
        user: booking.user?._id,
        type: 'capture',
        amount: verification.data.totalAmount,
        currency: 'NPR',
        method: 'esewa',
        reference: transactionUuid,
        status: 'captured',
        processedAt: new Date(),
      }], { session });

      // Update room status to reserved
      if (booking.room) {
        await Room.findByIdAndUpdate(
          booking.room._id,
          { status: 'reserved' },
          { session }
        );
      }

      // Create or update invoice
      const taxRate = 0.13;
      const subtotal = booking.totalAmount;
      const tax = Math.round(subtotal * taxRate);
      const total = subtotal + tax;

      await Invoice.findOneAndUpdate(
        { booking: booking._id },
        {
          hotel: booking.hotel._id,
          company: booking.company,
          booking: booking._id,
          user: booking.user?._id,
          bookingRef: booking.bookingId,
          guestName: booking.user?.fullname || booking.guestInfo?.name,
          room: {
            type: booking.room?.type,
            number: booking.room?.roomNumber,
          },
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          nights: booking.durationNights,
          charges: {
            room: subtotal,
            extras: 0,
            tax: tax,
            total: total,
          },
          paid: verification.data.totalAmount,
          balance: Math.max(0, total - verification.data.totalAmount),
          status: verification.data.totalAmount >= total ? 'paid' : 'partial',
          paidAt: verification.data.totalAmount >= total ? new Date() : null,
        },
        { upsert: true, session }
      );

      // Log activity
      await ActivityLog.create([{
        hotel: booking.hotel._id,
        company: booking.company,
        entityType: 'payment',
        entityId: verification.data.transactionCode,
        action: 'payment-verified',
        description: `eSewa payment verified for booking ${booking.bookingId}. Amount: NPR ${verification.data.totalAmount}`,
        icon: 'CheckCircle',
        color: '#10b981',
      }], { session });
    });

    // Send confirmation email
    try {
      const guestEmail = booking.user?.email || booking.guestInfo?.email;
      if (guestEmail) {
        await sendEmail({
          from: process.env.SENDER_EMAIL || 'noreply@stayhaven.com',
          to: guestEmail,
          subject: `Booking Confirmed - ${booking.bookingId}`,
          html: `
            <h2>Booking Confirmed!</h2>
            <p>Dear ${booking.user?.fullname || booking.guestInfo?.name},</p>
            <p>Your payment has been successfully processed and your booking is confirmed.</p>
            <p><strong>Booking Reference:</strong> ${booking.confirmationCode || booking.bookingId}</p>
            <p><strong>Hotel:</strong> ${booking.hotel.name}</p>
            <p><strong>Check-in:</strong> ${new Date(booking.checkIn).toLocaleDateString()}</p>
            <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toLocaleDateString()}</p>
            <p><strong>Amount Paid:</strong> NPR ${verification.data.totalAmount}</p>
            <p>Thank you for choosing StayHaven!</p>
          `,
        });
      }
    } catch (emailError) {
      logger.error('Failed to send confirmation email', { error: emailError.message, bookingId });
    }

    // Emit Socket.io event
    emitToHotel(booking.hotel._id.toString(), 'booking-confirmed', {
      bookingId: booking._id,
      bookingRef: booking.bookingId,
      paymentMethod: 'esewa',
    });

    logger.info('eSewa payment processed successfully', { bookingId, transactionUuid });

    // Redirect to success page
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(
      `${clientUrl}/payment-callback?status=success&method=esewa&orderId=${bookingId}`
    );

  } catch (error) {
    logger.error('eSewa callback error', { error: error.message, stack: error.stack });

    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(
      `${clientUrl}/payment-callback?status=failed&method=esewa&reason=verification_failed`
    );
  } finally {
    session.endSession();
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
