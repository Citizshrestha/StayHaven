import { WalletPaymentAttempt as Attempt } from '../models/walletPaymentAttempt.schema.js';
import { Booking } from '../models/booking.schema.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { createWalletBooking, initiateWalletTarget, getOwnedAttempt, publicAttempt, reconcilePayment, objectId } from '../services/walletPaymentService.js';
import { getPaymentGatewayConfig, verifyEsewaCallback } from '../services/paymentGatewayService.js';

export const createWalletBookingHandler = asyncHandler(async (req, res) => {
  res.json(await createWalletBooking({ user: req.user, body: req.body, idempotencyKey: req.get('Idempotency-Key') }));
});
export const payWalletTargetHandler = asyncHandler(async (req, res) => {
  res.json(await initiateWalletTarget({ user: req.user, targetId: req.params.id, gateway: req.body.paymentMethod, idempotencyKey: req.get('Idempotency-Key') }));
});
export const walletConfig = (req, res) => res.json({ success: true, data: getPaymentGatewayConfig() });
export const walletStatus = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: publicAttempt(await getOwnedAttempt(req.params.id, req.user._id)) });
});
export const verifyWalletStatus = asyncHandler(async (req, res) => {
  const attempt = await getOwnedAttempt(req.params.id, req.user._id);
  let result = attempt;
  try { result = await reconcilePayment(String(attempt._id)); }
  catch { /* An outage is unknown, not a confirmed failure. The worker also retries. */ }
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: publicAttempt(result) });
});

function redirectUrl(attemptId) {
  const url = new URL('/payment-callback', process.env.PAYMENT_CLIENT_URL || process.env.CLIENT_URL?.split(',')[0]?.trim() || 'http://localhost:5173');
  if (attemptId) url.searchParams.set('attempt', String(attemptId));
  else url.searchParams.set('status', 'invalid');
  return url.href;
}
async function callback(req, res, gateway) {
  let attempt;
  try {
    if (gateway === 'khalti') {
      if (typeof req.query.pidx !== 'string' || !/^[a-zA-Z0-9_-]{1,150}$/.test(req.query.pidx)) throw new AppError('Invalid payment identifier', 400);
      // Ignore purchase_order_id, status and amount supplied in the browser URL.
      attempt = await Attempt.findOne({ gateway, providerReference: req.query.pidx });
    } else {
      if (typeof req.query.data !== 'string' || req.query.data.length > 8192) throw new AppError('Invalid payment callback', 400);
      const verified = verifyEsewaCallback(req.query.data);
      if (!verified.verified) throw new AppError('Invalid callback signature', 400);
      attempt = await Attempt.findOne({ gateway, providerReference: verified.data.transactionUuid });
    }
    if (attempt) await reconcilePayment(String(attempt._id));
  } catch { /* A bad redirect cannot credit money. A timeout remains retryable. */ }
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  return res.redirect(303, redirectUrl(attempt?._id));
}
export const handleKhaltiCallback = (req, res) => callback(req, res, 'khalti');
export const handleEsewaCallback = (req, res) => callback(req, res, 'esewa');
export const handleEsewaFailure = asyncHandler(async (req, res) => {
  const reference = req.query.reference;
  if (typeof reference !== 'string' || !/^[a-zA-Z0-9-]{1,150}$/.test(reference)) throw new AppError('Invalid payment reference', 400);
  const attempt = await Attempt.findOne({ gateway: 'esewa', merchantReference: reference });
  // eSewa sends both failed AND pending payments here; the URL cannot decide status.
  if (attempt) { try { await reconcilePayment(String(attempt._id)); } catch { /* worker retries */ } }
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  res.redirect(303, redirectUrl(attempt?._id));
});

// Compatibility endpoints for older guest clients, with mandatory initiation binding.
async function verifyLegacy(req, res, gateway) {
  const targetId = objectId(req.body.orderId);
  let reference = req.body.pidx;
  if (gateway === 'esewa') {
    const verified = verifyEsewaCallback(req.body.encodedData);
    if (!verified.verified) throw new AppError('Invalid callback signature', 400);
    reference = verified.data.transactionUuid;
  }
  if (typeof reference !== 'string' || reference.length > 150) throw new AppError('Invalid payment reference', 400);
  const attempt = await Attempt.findOne({ user: req.user._id, targetId, gateway, providerReference: reference });
  if (!attempt) throw new AppError('Payment not found', 404);
  const result = await reconcilePayment(String(attempt._id));
  res.json({ success: result.status === 'succeeded', data: publicAttempt(result) });
}
export const verifyKhaltiCallback = asyncHandler((req, res) => verifyLegacy(req, res, 'khalti'));
export const verifyEsewaPaymentCallback = asyncHandler((req, res) => verifyLegacy(req, res, 'esewa'));

// Confirmation details/PDF contain personal data; a booking id is not authorization.
export const ownBooking = asyncHandler(async (req, res, next) => {
  objectId(req.params.bookingId);
  if (!await Booking.exists({ _id: req.params.bookingId, user: req.user._id })) throw new AppError('Booking not found', 404);
  res.set('Cache-Control', 'no-store');
  next();
});
