import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

test('guest card payment is bound to its invoice, amount, currency and owner', { timeout: 600000 }, async t => {
  const previousSecret = process.env.STRIPE_SECRET_KEY;
  const previousPublic = process.env.STRIPE_PUBLISHABLE_KEY;
  process.env.STRIPE_SECRET_KEY = 'sk_test_abcdefghijklmnopqrstuvwxyz0123456789';
  process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_abcdefghijklmnopqrstuvwxyz0123456789';
  const gateway = await import('../services/paymentGatewayService.js');
  let intent;
  let createRequest;
  gateway.__setStripeClientForTests({ paymentIntents: {
    create: async request => {
      createRequest = request;
      intent = { id: 'pi_cardintegration001', client_secret: 'pi_cardintegration001_secret_test', amount: request.amount, amount_received: request.amount, currency: request.currency, status: 'requires_payment_method' };
      return intent;
    },
    retrieve: async () => intent,
  } });
  try {
    await withEphemeralWalletDatabase(async db => {
      const { walletFixtures } = await import('./helpers/walletFixtures.js');
      const cards = await import('../services/cardPaymentService.js');
      const { Invoice } = await import('../models/invoice.schema.js');
      const { PaymentTransaction } = await import('../models/paymentTransaction.schema.js');
      const { CardPaymentAttempt } = await import('../models/cardPaymentAttempt.schema.js');
      await Promise.all(Object.values(mongoose.models).map(model => model.init()));
      const setup = async () => {
        await db.reset();
        const fixture = await walletFixtures();
        const booking = await fixture.booking();
        const invoice = await fixture.invoice(booking);
        const checkout = await cards.initiateCardTarget({ user: fixture.user, targetId: String(invoice._id) });
        return { fixture, invoice, checkout };
      };
      await t.test('pending and wrong amount never settle; replay captures once', async () => {
        const { fixture, invoice, checkout } = await setup();
        assert.equal(checkout.paymentIntentId, intent.id);
        assert.equal(intent.amount, 200000);
        assert.deepEqual(createRequest.payment_method_types, ['card']);
        await assert.rejects(cards.finalizeCardPayment(intent.id, fixture.user._id), /not complete/);
        assert.equal((await Invoice.findById(invoice._id)).status, 'partial');
        intent.status = 'succeeded'; intent.amount_received = 100000;
        await assert.rejects(cards.finalizeCardPayment(intent.id, fixture.user._id), /not complete/);
        intent.amount_received = intent.amount; intent.currency = 'usd';
        await assert.rejects(cards.finalizeCardPayment(intent.id, fixture.user._id), /currency mismatch/);
        intent.currency = 'npr';
        await assert.rejects(cards.finalizeCardPayment(intent.id, fixture.stranger._id), /not found/);
        await cards.finalizeCardPayment(intent.id, fixture.user._id);
        const duplicate = await cards.finalizeCardPayment(intent.id, fixture.user._id);
        assert.equal(duplicate.alreadyProcessed, true);
        const settled = await Invoice.findById(invoice._id);
        assert.equal(settled.status, 'paid'); assert.equal(settled.balance, 0);
        assert.equal(await PaymentTransaction.countDocuments({ reference: intent.id, status: 'captured' }), 1);
      });
      await t.test('a changed invoice cannot receive the old charge', async () => {
        const { fixture, invoice } = await setup();
        intent.status = 'succeeded';
        await Invoice.updateOne({ _id: invoice._id }, { $set: { paid: 1260, balance: 1000 } });
        await assert.rejects(cards.finalizeCardPayment(intent.id, fixture.user._id), /details changed/);
        assert.equal(await CardPaymentAttempt.countDocuments({ status: 'succeeded' }), 0);
        assert.equal(await PaymentTransaction.countDocuments({ reference: intent.id }), 0);
      });
      await t.test('an order becomes paid only after server verification', async () => {
        await db.reset();
        const fixture = await walletFixtures();
        const order = await fixture.order();
        const checkout = await cards.initiateCardTarget({ user: fixture.user, targetId: String(order._id) });
        assert.equal(checkout.requiresClientConfirmation, true);
        assert.equal(intent.amount, 25100);
        assert.equal((await (await import('../models/order.schema.js')).Order.findById(order._id)).paymentStatus, 'pending');
        intent.status = 'succeeded';
        await cards.finalizeCardPayment(intent.id, fixture.user._id);
        const { Order } = await import('../models/order.schema.js');
        assert.equal((await Order.findById(order._id)).paymentStatus, 'paid');
        assert.equal(await PaymentTransaction.countDocuments({ reference: intent.id, status: 'captured' }), 1);
      });
    });
  } finally {
    gateway.__setStripeClientForTests(null);
    if (previousSecret === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = previousSecret;
    if (previousPublic === undefined) delete process.env.STRIPE_PUBLISHABLE_KEY; else process.env.STRIPE_PUBLISHABLE_KEY = previousPublic;
  }
});
