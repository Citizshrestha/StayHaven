import { initiateCardTarget, finalizeCardPayment } from '../services/cardPaymentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CardPaymentAttempt } from '../models/cardPaymentAttempt.schema.js';
import mongoose from 'mongoose';

export const initiateCardTargetHandler = asyncHandler(async (req, res) => {
  const result = await initiateCardTarget({ user: req.user, targetId: req.params.id });
  res.json(result);
});

export const confirmCardTargetHandler = asyncHandler(async (req, res) => {
  const { paymentIntentId, orderId } = req.body || {};
  if (!mongoose.isValidObjectId(orderId)) return res.status(400).json({ success: false, message: 'Invalid payment target' });
  const owned = await CardPaymentAttempt.findOne({ paymentIntentId, user: req.user._id, targetId: orderId }).select('_id');
  if (!owned) return res.status(404).json({ success: false, message: 'Payment target not found' });
  const result = await finalizeCardPayment(paymentIntentId, req.user._id);
  res.json({ success: true, message: 'Payment confirmed', alreadyProcessed: !!result.alreadyProcessed });
});
