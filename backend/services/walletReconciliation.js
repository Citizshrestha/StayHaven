import mongoose from 'mongoose';
import { WalletPaymentAttempt as Attempt } from '../models/walletPaymentAttempt.schema.js';
import { Booking } from '../models/booking.schema.js';
import { reconcilePayment } from './walletPaymentService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('WalletReconciliation');

// Durable attempts are the queue. A conditional lease also works with multiple servers.
export async function reconcileWalletBatch() {
  if (mongoose.connection.readyState !== 1) return;
  for (let i = 0; i < 20; i++) {
    const attempt = await Attempt.findOneAndUpdate({
      status: { $in: ['initiated', 'pending'] }, nextCheckAt: { $lte: new Date() },
    }, { $set: { nextCheckAt: new Date(Date.now() + 5 * 60000) } }, { new: true, sort: { nextCheckAt: 1 } });
    if (!attempt) break;
    try {
      const result = await reconcilePayment(String(attempt._id));
      // Unknown outcomes never become "failed" merely because time elapsed.
      if (['initiated', 'pending'].includes(result.status) && Date.now() - result.createdAt.getTime() > 48 * 3600000) {
        await Attempt.updateOne({ _id: result._id, status: { $in: ['initiated', 'pending'] } }, { $set: { status: 'review', reviewReason: 'verification_unresolved_after_48h' } });
        logger.warn('Wallet payment needs merchant reconciliation', { attemptId: String(result._id) });
      }
    } catch {
      logger.warn('Wallet verification will retry', { attemptId: String(attempt._id) });
    }
  }
  await deliverWalletNotifications();
}

async function deliverWalletNotifications() {
  const pending = await Attempt.find({ notificationPending: true }).limit(20);
  if (!pending.length) return;
  const { emitToHotel, emitToUser } = await import('../config/socket.js');
  for (const attempt of pending) {
    try {
      const event = { paymentAttemptId: String(attempt._id), amount: attempt.amountPaisa / 100, paymentMethod: attempt.gateway,
        [`${attempt.targetType}Id`]: String(attempt.targetId), status: attempt.status };
      if (attempt.status === 'succeeded') {
        // Stable attempt id lets subscribers deduplicate at-least-once events.
        emitToUser(String(attempt.user), 'payment-confirmed', event);
        emitToHotel(String(attempt.hotel), attempt.targetType === 'booking' ? 'booking-confirmed' : 'payment-received', event);
        if (attempt.targetType === 'booking' && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
          const booking = await Booking.findById(attempt.targetId);
          if (booking?.guestInfo?.email) {
            const { sendEmail } = await import('../config/nodemailer.js');
            await sendEmail({
              from: process.env.SENDER_EMAIL || process.env.SMTP_USER, to: booking.guestInfo.email,
              messageId: `<wallet-${attempt._id}@stayhaven>`,
              subject: `Booking confirmed - ${booking.confirmationCode}`,
              // Plain text avoids interpreting guest-supplied names as HTML.
              text: `Your booking ${booking.confirmationCode} is confirmed. Payment received: NPR ${attempt.amountPaisa / 100} via ${attempt.gateway}.`,
            });
          }
        }
      } else emitToHotel(String(attempt.hotel), 'payment-review-required', event);
      await Attempt.updateOne({ _id: attempt._id }, { $set: { notificationPending: false } });
    } catch { logger.warn('Wallet notification will retry', { attemptId: String(attempt._id) }); }
  }
}

export function startWalletReconciliation() {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try { await reconcileWalletBatch(); }
    catch { logger.error('Wallet reconciliation batch failed; next interval will retry'); }
    finally { running = false; }
  }, 60000);
  timer.unref();
  return () => clearInterval(timer);
}
