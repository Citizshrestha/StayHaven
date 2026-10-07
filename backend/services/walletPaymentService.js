import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { WalletPaymentAttempt as Attempt } from '../models/walletPaymentAttempt.schema.js';
import { Booking } from '../models/booking.schema.js';
import { Order } from '../models/order.schema.js';
import { Invoice } from '../models/invoice.schema.js';
import { Room } from '../models/room.schema.js';
import { Hotel } from '../models/hotel.schema.js';
import { Guest } from '../models/guest.schema.js';
import { PaymentTransaction } from '../models/paymentTransaction.schema.js';
import { ActivityLog } from '../models/activityLog.schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { toPaisa, bookingQuote } from '../utils/paymentMoney.js';
import { initiateKhaltiPayment, generateEsewaPaymentData, verifyKhaltiPayment, checkEsewaTransactionStatus, getPaymentGatewayConfig } from './paymentGatewayService.js';

const unresolved = ['initiated', 'pending'];
const same = (a, b) => String(a) === String(b);
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const environment = gateway => getPaymentGatewayConfig()[gateway]?.testMode ? 'sandbox' : 'production';
export const isWallet = method => ['esewa', 'khalti'].includes(method);
export function objectId(value) {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) throw new AppError('Invalid payment resource identifier', 400);
  return value;
}
function enabled(gateway) {
  if (!isWallet(gateway)) throw new AppError('Unsupported wallet', 400);
  if (!getPaymentGatewayConfig()[gateway]?.enabled) throw new AppError(`${gateway === 'esewa' ? 'eSewa' : 'Khalti'} payments are unavailable. Please choose another method.`, 503);
}
let indexSetup;
export async function ensureWalletIndexes() {
  // Enforce uniqueness even when deployment disables Mongoose autoIndex.
  // createIndex only adds these named indexes; it never drops historical indexes/data.
  if (!indexSetup) indexSetup = (async () => {
    await Attempt.createIndexes();
    await PaymentTransaction.collection.createIndex({ paymentAttempt: 1 }, {
      unique: true, partialFilterExpression: { paymentAttempt: { $type: 'objectId' } },
    });
  })().catch(error => { indexSetup = undefined; throw error; });
  return indexSetup;
}
function key(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(value)) throw new AppError('A valid Idempotency-Key is required', 400);
  return value;
}
async function existingRequest(user, idempotencyKey, requestHash) {
  const existing = await Attempt.findOne({ user: user._id, idempotencyKey }).select('+checkout');
  if (existing && existing.requestHash !== requestHash) throw new AppError('This checkout key was already used for different payment details', 409);
  return existing;
}
function attemptData({ user, gateway, targetType, targetId, hotel, company, amountPaisa, idempotencyKey, requestHash }) {
  return {
    user: user._id, hotel, company, gateway, environment: environment(gateway), targetType, targetId,
    amountPaisa, idempotencyKey, requestHash, merchantReference: crypto.randomUUID(),
    activeTarget: `${targetType}:${targetId}`, expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  };
}
async function transaction(work) {
  const session = await mongoose.startSession();
  try { return await session.withTransaction(() => work(session)); }
  finally { await session.endSession(); }
}

export async function createWalletBooking({ user, body, idempotencyKey }) {
  const gateway = body.paymentMethod;
  enabled(gateway);
  key(idempotencyKey);
  await ensureWalletIndexes();
  objectId(body.hotelId); objectId(body.roomId);
  const start = new Date(body.checkIn); const end = new Date(body.checkOut);
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || start < today || end <= start) throw new AppError('Invalid check-in/check-out dates', 400);
  const nights = Math.ceil((end - start) / 86400000);
  if (nights > 365) throw new AppError('Booking duration exceeds 365 nights', 400);
  const adults = body.guests?.adults ?? 2; const children = body.guests?.children ?? 0;
  if (!Number.isInteger(adults) || adults < 1 || adults > 10 || !Number.isInteger(children) || children < 0 || children > 8) throw new AppError('Invalid guest count', 400);
  const name = body.guestName || user.fullname || user.username;
  const email = body.guestEmail || user.email;
  const phone = body.guestPhone || user.phone || user.contact || user.phoneNumber || '';
  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100 || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof phone !== 'string' || phone.length > 25) throw new AppError('Valid guest contact details are required', 400);
  if (body.specialRequests !== undefined && (typeof body.specialRequests !== 'string' || body.specialRequests.length > 500)) throw new AppError('Invalid special requests', 400);
  const details = { hotelId: body.hotelId, roomId: body.roomId, checkIn: start.toISOString(), checkOut: end.toISOString(), adults, children, name, email, phone, gateway, specialRequests: body.specialRequests || '' };
  const requestHash = hash(details);
  let attempt = await existingRequest(user, idempotencyKey, requestHash);
  if (!attempt) {
    try {
      attempt = await transaction(async session => {
        // Updating the room serializes competing wallet reservations for its date ranges.
        const room = await Room.findOneAndUpdate({ _id: body.roomId, hotel: body.hotelId, status: { $ne: 'maintenance' } }, { $inc: { reservationVersion: 1 } }, { new: true, session });
        if (!room) throw new AppError('Room is unavailable', 409);
        const hotel = await Hotel.findById(body.hotelId).session(session);
        if (!hotel || hotel.status !== 'approved' || hotel.isActive === false || !hotel.company || !same(room.company, hotel.company)) throw new AppError('Hotel is unavailable for booking', 409);
        if (adults + children > room.maxGuests) throw new AppError('Guest count exceeds room capacity', 400);
        const conflict = await Booking.exists({ room: room._id, checkIn: { $lt: end }, checkOut: { $gt: start }, $or: [
          { status: { $in: ['Confirmed', 'Checked-In'] } },
          { status: 'Pending', $or: [{ paymentHoldExpiresAt: { $exists: false } }, { paymentHoldExpiresAt: null }, { paymentHoldExpiresAt: { $gt: new Date() } }] },
        ] }).session(session);
        if (conflict) throw new AppError('Room is already booked for selected dates', 409);
        const priceBreakdown = bookingQuote(room.price, nights);
        const [booking] = await Booking.create([{
          bookingId: `BK-${crypto.randomUUID()}`, confirmationCode: `SH-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
          user: user._id, hotel: hotel._id, company: hotel.company, room: room._id,
          guestInfo: { name: name.trim(), email, phone }, checkIn: start, checkOut: end,
          guests: { adults, children }, totalAmount: priceBreakdown.totalPaisa / 100, priceBreakdown,
          currency: 'NPR', paymentMethod: gateway, specialRequests: details.specialRequests,
          paymentHoldExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        }], { session });
        const [record] = await Attempt.create([attemptData({ user, gateway, targetType: 'booking', targetId: booking._id, hotel: hotel._id, company: hotel.company, amountPaisa: priceBreakdown.totalPaisa, idempotencyKey, requestHash })], { session });
        return record;
      });
    } catch (error) {
      // Concurrent submissions may observe a room conflict after the first committed.
      attempt = await existingRequest(user, idempotencyKey, requestHash);
      if (!attempt) throw error;
    }
  }
  return initiateAttempt(attempt, { name, email, phone });
}

export async function initiateWalletTarget({ user, targetId, gateway, idempotencyKey }) {
  enabled(gateway); key(idempotencyKey); objectId(targetId);
  await ensureWalletIndexes();
  const requestHash = hash({ targetId, gateway });
  let attempt = await existingRequest(user, idempotencyKey, requestHash);
  if (!attempt) {
    try {
      attempt = await transaction(async session => {
        let targetType = 'order';
        let target = await Order.findOneAndUpdate({ _id: targetId, customerId: user._id }, { $inc: { paymentLockVersion: 1 } }, { new: true, session });
        if (!target) {
          targetType = 'invoice';
          const bookings = await Booking.find({ user: user._id }).select('_id').session(session);
          target = await Invoice.findOneAndUpdate({ _id: targetId, booking: { $in: bookings.map(b => b._id) } }, { $inc: { paymentLockVersion: 1 } }, { new: true, session });
        }
        if (!target) throw new AppError('Order/invoice not found', 404);
        if (target.paymentStatus === 'paid' || ['paid', 'cancelled', 'refunded'].includes(target.status)) throw new AppError('This item cannot accept another payment', 409);
        const amountPaisa = toPaisa(targetType === 'order' ? target.totalPrice : target.balance);
        const hotel = await Hotel.findById(target.hotel).select('company').session(session);
        if (!hotel?.company) throw new AppError('Hotel account is unavailable', 409);
        if (targetType === 'invoice' && !same(target.company, hotel.company)) throw new AppError('Invoice account is inconsistent', 409);
        const [record] = await Attempt.create([attemptData({ user, gateway, targetType, targetId: target._id, hotel: target.hotel, company: hotel.company, amountPaisa, idempotencyKey, requestHash })], { session });
        return record;
      });
    } catch (error) {
      attempt = await existingRequest(user, idempotencyKey, requestHash);
      if (!attempt) {
        if (error.code === 11000) throw new AppError('A payment is already in progress for this item. Check its status before retrying.', 409);
        throw error;
      }
    }
  }
  return initiateAttempt(attempt, {
    name: user.fullname || user.username,
    email: user.email,
    phone: user.phone || user.contact || user.phoneNumber || '',
  });
}

async function checkoutResult(attempt) {
  const booking = attempt.targetType === 'booking' ? await Booking.findById(attempt.targetId).select('bookingId confirmationCode') : null;
  return { success: true, paymentAttemptId: String(attempt._id), status: attempt.status, ...(booking ? { booking } : {}),
    ...(unresolved.includes(attempt.status) && attempt.expiresAt > new Date() && attempt.checkout ? attempt.checkout : { requiresRedirect: false, requiresStatusCheck: true }),
  };
}
async function initiateAttempt(attempt, customer) {
  if (attempt.checkout || !unresolved.includes(attempt.status)) return checkoutResult(attempt);
  // A crashed/timed-out initiate may already exist at the provider. Never repeat it blindly.
  const claimed = await Attempt.findOneAndUpdate({ _id: attempt._id, initiationStartedAt: { $exists: false } }, { $set: { initiationStartedAt: new Date() } }, { new: true });
  if (!claimed) return checkoutResult(await Attempt.findById(attempt._id).select('+checkout'));
  try {
    let checkout; let providerReference; let merchantProductCode; let expiresAt = claimed.expiresAt;
    if (claimed.gateway === 'khalti') {
      const data = await initiateKhaltiPayment({ amount: claimed.amountPaisa / 100, orderId: claimed.merchantReference, orderName: `StayHaven ${claimed.targetType}`, customer });
      providerReference = data.pidx;
      if (data.expiresAt && Number.isFinite(+new Date(data.expiresAt))) expiresAt = new Date(data.expiresAt);
      checkout = { requiresRedirect: true, redirectType: 'url', paymentUrl: data.paymentUrl, expiresAt };
    } else {
      const data = generateEsewaPaymentData({ amount: claimed.amountPaisa / 100, orderId: claimed.merchantReference });
      providerReference = data.transactionUuid;
      merchantProductCode = data.formData.product_code;
      checkout = { requiresRedirect: true, redirectType: 'form-post', formUrl: data.formUrl, formData: data.formData };
    }
    const result = await transaction(async session => {
      const updated = await Attempt.findOneAndUpdate({ _id: claimed._id, status: { $in: unresolved } }, { $set: { checkout, providerReference, merchantProductCode, expiresAt, status: 'pending', nextCheckAt: new Date(Date.now() + 60000) } }, { new: true, session }).select('+checkout');
      if (claimed.targetType === 'booking') await Booking.updateOne({ _id: claimed.targetId }, { $set: { paymentReference: providerReference, paymentHoldExpiresAt: expiresAt } }, { session });
      return updated;
    });
    return checkoutResult(result);
  } catch (error) {
    if (error.definitive === true) {
      await transaction(async session => {
        await Attempt.updateOne({ _id: claimed._id, status: { $in: unresolved } }, { $set: { status: 'failed', reviewReason: 'gateway_rejected_initiation' }, $unset: { activeTarget: 1 } }, { session });
        if (claimed.targetType === 'booking') await Booking.updateOne({ _id: claimed.targetId, status: 'Pending', paymentStatus: 'unpaid' }, { $set: { status: 'Cancelled', cancellationReason: 'Gateway rejected payment initiation', cancelledAt: new Date() } }, { session });
      });
      return { success: true, paymentAttemptId: String(claimed._id), requiresStatusCheck: true, status: 'failed', message: 'The payment provider rejected checkout. No payment was confirmed.' };
    }
    // No false "failed" if the request reached the wallet but its response was lost.
    await Attempt.updateOne({ _id: claimed._id, status: { $in: unresolved } }, { $set: { status: 'pending', reviewReason: 'initiation_unconfirmed', nextCheckAt: new Date(Date.now() + 60000) } });
    return { success: true, paymentAttemptId: String(claimed._id), requiresStatusCheck: true, status: 'pending', message: 'Payment initiation could not be confirmed. Check payment status before trying again.' };
  }
}

export async function getOwnedAttempt(attemptId, userId) {
  objectId(attemptId);
  const attempt = await Attempt.findOne({ _id: attemptId, user: userId });
  if (!attempt) throw new AppError('Payment not found', 404);
  return attempt;
}
export function publicAttempt(attempt) {
  return { id: String(attempt._id), status: attempt.status, gateway: attempt.gateway, targetType: attempt.targetType, targetId: String(attempt.targetId), amount: attempt.amountPaisa / 100, currency: attempt.currency, expiresAt: attempt.expiresAt };
}

export async function reconcilePayment(attemptId) {
  objectId(String(attemptId));
  const attempt = await Attempt.findById(attemptId);
  if (!attempt) throw new AppError('Payment not found', 404);
  if (!unresolved.includes(attempt.status)) return attempt;
  if (environment(attempt.gateway) !== attempt.environment) throw new AppError('Payment environment changed; merchant reconciliation is required', 409);
  if (!attempt.providerReference) return attempt;
  const verified = attempt.gateway === 'khalti'
    ? await verifyKhaltiPayment(attempt.providerReference)
    : await checkEsewaTransactionStatus(attempt.providerReference, attempt.amountPaisa / 100);
  return finalizeVerifiedPayment(attempt._id, verified);
}

// Only server-to-server lookup results may reach this function, never request bodies.
async function finalizeVerifiedPaymentInTransaction(attemptId, verification) {
  return transaction(async session => {
    const attempt = await Attempt.findById(attemptId).session(session);
    if (!attempt) throw new AppError('Payment not found', 404);
    if (!unresolved.includes(attempt.status)) return attempt;
    const complete = attempt.gateway === 'khalti' ? verification.status === 'Completed' : verification.status === 'COMPLETE';
    const terminal = { 'User canceled': 'cancelled', CANCELED: 'cancelled', Expired: 'expired', Refunded: 'refunded', FULL_REFUND: 'refunded' };
    attempt.lastCheckedAt = new Date(); attempt.checkCount += 1;
    attempt.nextCheckAt = new Date(Date.now() + Math.min(15 * 60000, 60000 * Math.max(1, attempt.checkCount)));
    if (!complete) {
      attempt.status = terminal[verification.status] || 'pending';
      if (verification.status === 'NOT_FOUND' && attempt.expiresAt < new Date() && attempt.checkCount > 1) attempt.status = 'expired';
      if (['PARTIAL_REFUND', 'Partially Refunded'].includes(verification.status)) { attempt.status = 'review'; attempt.reviewReason = 'partial_refund'; }
      if (terminal[verification.status] || attempt.status === 'expired') {
        attempt.activeTarget = undefined;
        if (attempt.targetType === 'booking') await Booking.updateOne({ _id: attempt.targetId, status: 'Pending', paymentStatus: 'unpaid' }, { $set: { status: 'Cancelled', cancellationReason: `Wallet payment ${attempt.status}`, cancelledAt: new Date() } }, { session });
      }
      await attempt.save({ session });
      return attempt;
    }
    const providerId = attempt.gateway === 'khalti' ? verification.pidx : verification.transactionUuid;
    const providerTransactionId = attempt.gateway === 'khalti' ? verification.transactionId : verification.refId;
    if (!providerId || !same(providerId, attempt.providerReference) || !providerTransactionId || toPaisa(verification.totalAmount) !== attempt.amountPaisa || verification.refunded === true ||
        (attempt.gateway === 'esewa' && verification.productCode !== attempt.merchantProductCode)) {
      attempt.status = 'review'; attempt.reviewReason = 'gateway_identity_or_amount_mismatch';
      await attempt.save({ session });
      return attempt;
    }
    const model = { booking: Booking, order: Order, invoice: Invoice }[attempt.targetType];
    const target = await model.findOneAndUpdate({ _id: attempt.targetId }, { $inc: { paymentLockVersion: 1 } }, { new: true, session });
    if (!target || !same(target.hotel, attempt.hotel)) throw new AppError('Payment target is unavailable', 409);
    const expected = toPaisa(attempt.targetType === 'booking' ? target.totalAmount : attempt.targetType === 'order' ? target.totalPrice : target.balance, true);
    let reason = expected !== attempt.amountPaisa ? 'target_balance_changed' : null;
    if (['Cancelled', 'cancelled', 'refunded', 'Checked-Out', 'No-Show'].includes(target.status) || target.paymentStatus === 'paid' || target.status === 'paid') reason = 'target_no_longer_payable';
    if (attempt.targetType === 'booking' && !reason) {
      const room = await Room.findOneAndUpdate({ _id: target.room }, { $inc: { reservationVersion: 1 } }, { new: true, session });
      const conflict = await Booking.exists({ _id: { $ne: target._id }, room: target.room, checkIn: { $lt: target.checkOut }, checkOut: { $gt: target.checkIn }, $or: [
        { status: { $in: ['Confirmed', 'Checked-In'] } },
        { status: 'Pending', $or: [{ paymentHoldExpiresAt: { $exists: false } }, { paymentHoldExpiresAt: null }, { paymentHoldExpiresAt: { $gt: new Date() } }] },
      ] }).session(session);
      if (!room || room.status === 'maintenance' || conflict) reason = 'room_unavailable_after_payment';
    }
    attempt.providerTransactionId = String(providerTransactionId);
    attempt.verifiedAt = new Date();
    attempt.status = reason ? 'review' : 'succeeded';
    attempt.reviewReason = reason || undefined;
    // Review attempts keep their target lock until merchant resolution.
    if (!reason) attempt.activeTarget = undefined;
    let invoice = attempt.targetType === 'invoice' ? target : null;
    if (!reason && attempt.targetType === 'booking') {
      if (!target.guest) {
        const [guest] = await Guest.create([{
          hotel: target.hotel, company: target.company, guestId: `G-${crypto.randomUUID()}`,
          fullName: target.guestInfo?.name || 'Guest', email: target.guestInfo?.email, phone: target.guestInfo?.phone,
          status: 'Reserved', currentBooking: target._id,
        }], { session });
        target.guest = guest._id;
      }
      // Attempts created here always snapshot the quote before contacting the gateway.
      const quote = target.priceBreakdown;
      if (!quote || quote.totalPaisa !== attempt.amountPaisa) throw new AppError('Stored booking quote is unavailable', 409);
      invoice = await Invoice.findOne({ booking: target._id }).session(session);
      if (invoice) throw new AppError('Booking already has an invoice; merchant reconciliation is required', 409);
      [invoice] = await Invoice.create([{
        invoiceId: `INV-${crypto.randomUUID()}`, hotel: target.hotel, company: target.company, booking: target._id, guest: target.guest,
        bookingRef: target.bookingId, guestName: target.guestInfo.name, checkIn: target.checkIn, checkOut: target.checkOut, nights: target.durationNights,
        charges: { room: quote.subtotalPaisa / 100, tax: quote.taxPaisa / 100, taxRate: quote.taxRate, extras: 0, total: attempt.amountPaisa / 100 },
        paid: attempt.amountPaisa / 100, balance: 0, status: 'paid', paidAt: new Date(), paymentMethod: 'Online Payment',
      }], { session });
      target.status = 'Confirmed';
    }
    if (!reason) {
      if (attempt.targetType === 'invoice') {
        const paid = (toPaisa(target.paid || 0, true) + attempt.amountPaisa) / 100;
        // Some legacy invoices predate the required Guest reference. A document
        // save would revalidate that unrelated historical field and roll back an
        // otherwise verified payment. The guarded atomic update changes payment
        // fields only and remains inside this transaction.
        await Invoice.updateOne(
          { _id: target._id },
          { $set: { paid, balance: 0, status: 'paid', paymentMethod: 'Online Payment', paidAt: new Date() } },
          { session },
        );
        target.paid = paid; target.balance = 0; target.status = 'paid'; target.paymentMethod = 'Online Payment';
      } else {
        target.paymentStatus = 'paid'; target.paymentMethod = attempt.gateway;
        target.paymentReference = attempt.providerReference; target.paidAmount = attempt.amountPaisa / 100;
        target.paidAt = new Date();
        await target.save({ session });
      }
    }
    await PaymentTransaction.create([{
      transactionId: `TXN-${crypto.randomUUID()}`, paymentAttempt: attempt._id,
      hotel: attempt.hotel, company: attempt.company,
      ...(attempt.targetType === 'booking' ? { booking: target._id } : attempt.targetType === 'order' ? { order: target._id } : { booking: target.booking }),
      ...(invoice ? { invoice: invoice._id } : {}), guest: target.guest,
      type: 'capture', amount: attempt.amountPaisa / 100, currency: 'NPR', method: attempt.gateway,
      reference: attempt.providerReference, status: reason ? 'disputed' : 'captured', processedBy: attempt.user,
      notes: reason ? `Verified charge requires merchant review: ${reason}` : 'Gateway lookup verified',
    }], { session });
    await ActivityLog.create([{
      hotel: attempt.hotel, company: attempt.company, entityType: 'payment', entityId: String(attempt._id),
      action: reason ? 'payment-review-required' : 'payment-verified',
      description: `${attempt.gateway} payment ${reason ? 'requires review' : 'verified'}: NPR ${attempt.amountPaisa / 100}`,
      actor: attempt.user,
    }], { session });
    attempt.notificationPending = true;
    await attempt.save({ session });
    return attempt;
  });
}

export async function finalizeVerifiedPayment(attemptId, verification) {
  try {
    return await finalizeVerifiedPaymentInTransaction(attemptId, verification);
  } catch (error) {
    // A provider transaction may only settle one local payment. A duplicate-key
    // conflict means an external charge needs merchant reconciliation; retaining
    // it as pending would repeatedly retry an impossible capture.
    if (error?.code === 11000) {
      const reviewed = await Attempt.findOneAndUpdate(
        { _id: attemptId, status: { $in: unresolved } },
        { $set: { status: 'review', reviewReason: 'duplicate_provider_transaction', notificationPending: true } },
        { new: true },
      );
      if (reviewed) return reviewed;
    }
    throw error;
  }
}
