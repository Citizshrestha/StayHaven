import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { CardPaymentAttempt as Attempt } from '../models/cardPaymentAttempt.schema.js';
import { PaymentTransaction } from '../models/paymentTransaction.schema.js';
import { Booking } from '../models/booking.schema.js';
import { Order } from '../models/order.schema.js';
import { Invoice } from '../models/invoice.schema.js';
import { Hotel } from '../models/hotel.schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { toPaisa } from '../utils/paymentMoney.js';
import { createStripePaymentIntent, verifyStripePayment, getPaymentGatewayConfig } from './paymentGatewayService.js';

const same = (a, b) => String(a?._id || a) === String(b?._id || b);
const activeKey = (type, id) => `${type}:${id}`;

async function ownedTarget(userId, id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid payment target', 400);
  const order = await Order.findOne({ _id: id, customerId: userId });
  if (order) return { type: 'order', target: order };
  const bookingIds = await Booking.find({ user: userId }).distinct('_id');
  const invoice = await Invoice.findOne({ _id: id, booking: { $in: bookingIds } });
  if (invoice) return { type: 'invoice', target: invoice };
  throw new AppError('Order/invoice not found or access denied', 404);
}

async function payable(type, target, company) {
  if (type === 'order') {
    if (target.status === 'cancelled' || target.paymentStatus === 'paid') throw new AppError('Order is no longer payable', 409);
    return toPaisa(target.totalPrice) - toPaisa(target.paidAmount || 0, true);
  }
  if (!same(target.company, company) || !['pending', 'partial', 'overdue'].includes(target.status)) throw new AppError('Invoice is no longer payable', 409);
  const booking = await Booking.findById(target.booking).select('hotel company status currency');
  if (!booking || !same(booking.hotel, target.hotel) || !same(booking.company, company) || ['Cancelled', 'No-Show'].includes(booking.status) || booking.currency !== 'NPR') throw new AppError('Invoice booking is not payable', 409);
  if (toPaisa(target.paid || 0, true) + toPaisa(target.balance || 0, true) !== toPaisa(target.charges.total)) throw new AppError('Invoice balance requires review', 409);
  return toPaisa(target.balance);
}

export async function initiateCardTarget({ user, targetId }) {
  const { type, target } = await ownedTarget(user._id, targetId);
  const hotel = await Hotel.findById(target.hotel).select('company');
  if (!hotel?.company) throw new AppError('Hotel account is unavailable', 409);
  const amountPaisa = await payable(type, target, hotel.company);
  if (amountPaisa <= 0) throw new AppError('Nothing is due', 409);
  const mode = getPaymentGatewayConfig().stripe?.testMode ? 'test' : 'live';
  if (!getPaymentGatewayConfig().stripe?.enabled) throw new AppError('Card payments are unavailable', 503);
  const targetKey = activeKey(type, target._id);
  if (await Attempt.exists({ targetType: type, targetId: target._id, status: 'review' })) throw new AppError('This item needs payment review before another attempt', 409);
  let attempt = await Attempt.findOne({ activeTarget: targetKey }).select('+clientSecret');
  if (attempt && (!same(attempt.user, user._id) || attempt.amountPaisa !== amountPaisa || attempt.mode !== mode)) throw new AppError('A different payment is already in progress for this item', 409);
  if (!attempt) {
    try {
      await Attempt.createIndexes();
      attempt = await Attempt.create({ user: user._id, hotel: target.hotel, company: hotel.company, targetType: type, targetId: target._id, amountPaisa, mode, stripeIdempotencyKey: `stayhaven-card-${crypto.randomUUID()}`, activeTarget: targetKey });
    } catch (error) {
      if (error.code !== 11000) throw error;
      attempt = await Attempt.findOne({ activeTarget: targetKey }).select('+clientSecret');
      if (!attempt || !same(attempt.user, user._id) || attempt.amountPaisa !== amountPaisa) throw new AppError('A payment is already in progress for this item', 409);
    }
  }
  if (!attempt.paymentIntentId || !attempt.clientSecret) {
    const intent = await createStripePaymentIntent({ amount: amountPaisa / 100, currency: 'npr', cardOnly: true, idempotencyKey: attempt.stripeIdempotencyKey, metadata: { cardAttemptId: String(attempt._id), targetType: type, targetId: String(target._id) } });
    if (intent.amountMinor !== amountPaisa || intent.currency !== 'npr' || intent.mode !== mode) throw new AppError('Gateway payment details changed', 409);
    attempt = await Attempt.findOneAndUpdate({ _id: attempt._id, status: 'initiated' }, { $set: { paymentIntentId: intent.paymentIntentId, clientSecret: intent.clientSecret, status: 'pending' } }, { new: true }).select('+clientSecret') || await Attempt.findById(attempt._id).select('+clientSecret');
  }
  return { success: true, requiresClientConfirmation: true, clientSecret: attempt.clientSecret, paymentIntentId: attempt.paymentIntentId, method: 'card' };
}

export async function finalizeCardPayment(paymentIntentId, userId) {
  if (typeof paymentIntentId !== 'string' || !/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) throw new AppError('Invalid card payment reference', 400);
  const attempt = await Attempt.findOne({ paymentIntentId, ...(userId ? { user: userId } : {}) });
  if (!attempt) throw new AppError('Card payment attempt not found', 404);
  if (attempt.status === 'succeeded') return { success: true, alreadyProcessed: true, attempt };
  if (attempt.status === 'review') throw new AppError('Payment needs manual reconciliation', 409);
  if (getPaymentGatewayConfig().stripe?.testMode !== (attempt.mode === 'test')) throw new AppError('Payment environment changed; manual reconciliation required', 409);
  const verified = await verifyStripePayment(paymentIntentId, { minorAmount: attempt.amountPaisa, currency: attempt.currency });
  if (!verified.settled || verified.mode !== attempt.mode) throw new AppError('Card payment is not complete', 409);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const locked = await Attempt.findOneAndUpdate({ _id: attempt._id, status: { $in: ['initiated', 'pending'] } }, { $set: { status: 'succeeded', settledAt: new Date() }, $unset: { activeTarget: 1 } }, { new: true, session });
      if (!locked) return;
      if (locked.targetType === 'order') {
        const order = await Order.findOneAndUpdate({ _id: locked.targetId }, { $inc: { paymentLockVersion: 1 } }, { new: true, session });
        if (!order || !same(order.customerId, locked.user) || !same(order.hotel, locked.hotel) || order.status === 'cancelled' || order.paymentStatus === 'paid' || toPaisa(order.totalPrice) - toPaisa(order.paidAmount || 0, true) !== locked.amountPaisa) throw new AppError('Order payment details changed; reconciliation required', 409);
        await Order.updateOne({ _id: order._id, paymentStatus: { $ne: 'paid' } }, { $set: { paymentStatus: 'paid', paymentMethod: 'card', paymentReference: paymentIntentId, paidAt: new Date(), paidAmount: order.totalPrice } }, { session });
      } else {
        const invoice = await Invoice.findOneAndUpdate({ _id: locked.targetId }, { $inc: { paymentLockVersion: 1 } }, { new: true, session });
        const booking = invoice && await Booking.findById(invoice.booking).select('user hotel company status currency').session(session);
        if (!invoice || !booking || !same(booking.user, locked.user) || !same(invoice.hotel, locked.hotel) || !same(invoice.company, locked.company) || !same(booking.hotel, locked.hotel) || !same(booking.company, locked.company) || booking.currency !== 'NPR' || ['Cancelled', 'No-Show'].includes(booking.status) || !['pending', 'partial', 'overdue'].includes(invoice.status) || toPaisa(invoice.balance) !== locked.amountPaisa || toPaisa(invoice.paid || 0, true) + locked.amountPaisa !== toPaisa(invoice.charges.total)) throw new AppError('Invoice payment details changed; reconciliation required', 409);
        await Invoice.updateOne({ _id: invoice._id, balance: invoice.balance }, { $set: { paid: invoice.charges.total, balance: 0, status: 'paid', paidAt: new Date(), paymentMethod: 'Credit Card' } }, { session });
      }
      await PaymentTransaction.create([{ hotel: locked.hotel, company: locked.company, ...(locked.targetType === 'order' ? { order: locked.targetId } : { invoice: locked.targetId }), type: 'capture', amount: locked.amountPaisa / 100, currency: 'NPR', method: 'credit-card', reference: paymentIntentId, status: 'captured', processedBy: locked.user }], { session });
    });
  } catch (error) {
    if (error.statusCode === 409 && /details changed|reconciliation required/.test(error.message)) {
      await Attempt.updateOne({ _id: attempt._id, status: { $in: ['initiated', 'pending'] } }, { $set: { status: 'review', reviewReason: 'paid_intent_target_changed' }, $unset: { activeTarget: 1 } });
    }
    throw error;
  } finally { await session.endSession(); }
  return { success: true, attempt: await Attempt.findById(attempt._id) };
}
