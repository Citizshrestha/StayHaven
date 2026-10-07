import mongoose from 'mongoose';

// Immutable expected amount and ownership survive redirects and process restarts.
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  targetType: { type: String, enum: ['booking', 'order', 'invoice'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  gateway: { type: String, enum: ['esewa', 'khalti'], required: true },
  environment: { type: String, enum: ['sandbox', 'production'], required: true },
  amountPaisa: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  currency: { type: String, enum: ['NPR'], default: 'NPR' },
  idempotencyKey: { type: String, required: true },
  requestHash: { type: String, required: true },
  merchantReference: { type: String, required: true, unique: true },
  providerReference: String,
  merchantProductCode: String,
  providerTransactionId: String,
  status: { type: String, enum: ['initiated', 'pending', 'succeeded', 'failed', 'cancelled', 'expired', 'review', 'refunded'], default: 'initiated' },
  // At most one unresolved wallet attempt may exist per target, across gateways.
  activeTarget: String,
  checkout: { type: mongoose.Schema.Types.Mixed, select: false },
  initiationStartedAt: Date,
  expiresAt: { type: Date, required: true },
  verifiedAt: Date,
  nextCheckAt: { type: Date, default: Date.now },
  lastCheckedAt: Date,
  checkCount: { type: Number, default: 0 },
  reviewReason: String,
  notificationPending: { type: Boolean, default: false },
}, { timestamps: true });
schema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ gateway: 1, environment: 1, providerReference: 1 }, { unique: true, partialFilterExpression: { providerReference: { $type: 'string' } } });
schema.index({ gateway: 1, environment: 1, providerTransactionId: 1 }, { unique: true, partialFilterExpression: { providerTransactionId: { $type: 'string' } } });
schema.index({ activeTarget: 1 }, { unique: true, partialFilterExpression: { activeTarget: { $type: 'string' } } });
schema.index({ status: 1, nextCheckAt: 1 });
export const WalletPaymentAttempt = mongoose.model('WalletPaymentAttempt', schema);
