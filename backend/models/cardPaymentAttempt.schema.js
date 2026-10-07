import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  targetType: { type: String, enum: ['order', 'invoice'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  amountPaisa: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  currency: { type: String, enum: ['NPR'], default: 'NPR' },
  mode: { type: String, enum: ['test', 'live'], required: true },
  stripeIdempotencyKey: { type: String, required: true, unique: true },
  paymentIntentId: { type: String, unique: true, sparse: true },
  clientSecret: { type: String, select: false },
  activeTarget: String,
  status: { type: String, enum: ['initiated', 'pending', 'succeeded', 'review'], default: 'initiated' },
  reviewReason: String,
  settledAt: Date,
}, { timestamps: true });

schema.index({ activeTarget: 1 }, { unique: true, partialFilterExpression: { activeTarget: { $type: 'string' } } });
schema.index({ user: 1, targetId: 1, createdAt: -1 });

export const CardPaymentAttempt = mongoose.model('CardPaymentAttempt', schema);
