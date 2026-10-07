import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';
import { installWalletGatewayMock } from './helpers/walletGatewayMock.js';

// Import application models/service only after installing isolated environment and DB.
// Never load dotenv, the application server, DB configuration, or seeders.
test('wallet payments against an owned ephemeral replica set', { timeout: 600000 }, async t => {
  await withEphemeralWalletDatabase(async db => {
    const gateway = installWalletGatewayMock();
    try {
      const { walletFixtures } = await import('./helpers/walletFixtures.js');
      const service = await import('../services/walletPaymentService.js');
      const { WalletPaymentAttempt: Attempt } = await import('../models/walletPaymentAttempt.schema.js');
      const { Booking } = await import('../models/booking.schema.js');
      const { Room } = await import('../models/room.schema.js');
      const { Guest } = await import('../models/guest.schema.js');
      const { Invoice } = await import('../models/invoice.schema.js');
      const { Order } = await import('../models/order.schema.js');
      const { PaymentTransaction: Capture } = await import('../models/paymentTransaction.schema.js');
      const { ActivityLog: Activity } = await import('../models/activityLog.schema.js');
      // Await real unique indexes before any concurrent transaction tests.
      await Promise.all(Object.values(mongoose.models).map(model => model.init()));
      const scenario = (name, run) => t.test(name, async st => {
        await db.reset();
        gateway.calls.length = 0;
        gateway.payments.clear();
        await run(await walletFixtures(), st);
      });
      const checkout = async (f, method = 'khalti', key = randomUUID()) => {
        const result = await service.createWalletBooking({ user: f.user,
          body: { ...f.body, paymentMethod: method }, idempotencyKey: key });
        assert.equal(result.requiresRedirect, true, 'Fixture initiation must succeed');
        const attempt = await Attempt.findById(result.paymentAttemptId);
        assert.equal(attempt.environment, 'sandbox');
        assert.ok(attempt.providerReference);
        return { result, attempt };
      };
      const verified = (attempt, overrides = {}) => ({
        ...(attempt.gateway === 'khalti'
          ? { status: 'Completed', pidx: attempt.providerReference,
            transactionId: `capture-${attempt._id}`, refunded: false }
          : { status: 'COMPLETE', transactionUuid: attempt.providerReference,
            refId: `capture-${attempt._id}`, productCode: attempt.merchantProductCode }),
        totalAmount: attempt.amountPaisa / 100, ...overrides,
      });
      const noCapture = async () => {
        assert.equal(await Capture.countDocuments(), 0);
        assert.equal(await Activity.countDocuments({ entityType: 'payment' }), 0);
      };
      const counts = async () => ({
        guests: await Guest.countDocuments(), invoices: await Invoice.countDocuments(),
        captures: await Capture.countDocuments(), logs: await Activity.countDocuments(),
      });

      for (const method of ['khalti', 'esewa']) {
        await scenario(`${method}: persisted references and one stored quote survive reconnect and price change`, async f => {
          const key = randomUUID();
          const { result, attempt } = await checkout(f, method, key);
          const before = await Booking.findById(attempt.targetId).lean();
          assert.equal(before.bookingId, result.booking.bookingId);
          assert.equal(before.confirmationCode, result.booking.confirmationCode);
          assert.equal(before.paymentReference, attempt.providerReference);
          assert.equal(before.totalAmount, 2240);
          assert.deepEqual(before.priceBreakdown, { subtotalPaisa: 200000,
            taxPaisa: 24000, totalPaisa: 224000, taxRate: 12 });
          assert.equal(attempt.amountPaisa, 224000);
          if (method === 'khalti') {
            const request = gateway.initiationCalls()[0].body;
            assert.equal(request.purchase_order_id, attempt.merchantReference);
            assert.equal(request.amount, 224000);
          } else {
            assert.equal(result.formData.transaction_uuid, attempt.merchantReference);
            assert.equal(result.formData.total_amount, '2240.00');
          }
          await Room.updateOne({ _id: f.room._id }, { $set: { price: 9000 } });
          await db.reconnect();
          const replay = await checkout(f, method, key);
          assert.equal(replay.result.paymentAttemptId, result.paymentAttemptId);
          assert.equal(await Booking.countDocuments(), 1);
          assert.equal(gateway.initiationCalls().length, method === 'khalti' ? 1 : 0);
          assert.equal((await service.reconcilePayment(attempt._id)).status, 'succeeded');
          const invoice = await Invoice.findOne({ booking: before._id });
          assert.equal(invoice.charges.room, 2000);
          assert.equal(invoice.charges.tax, 240);
          assert.equal(invoice.charges.total, 2240);
          assert.equal(invoice.paid, 2240);
          assert.equal(invoice.balance, 0);
          assert.equal(invoice.nights, 2);
          const after = await Booking.findById(before._id).lean();
          assert.deepEqual(after.priceBreakdown, before.priceBreakdown);
          assert.equal(after.paymentStatus, 'paid');
          assert.equal(after.status, 'Confirmed');
          const networkCount = gateway.calls.length;
          await service.reconcilePayment(attempt._id);
          assert.equal(gateway.calls.length, networkCount, 'Terminal replay skips gateway lookup');
        });

        await scenario(`${method}: concurrent repeated finalization fulfills exactly once`, async f => {
          const { attempt } = await checkout(f, method);
          const baseline = await counts();
          const results = await Promise.all(Array.from({ length: 8 }, () =>
            service.finalizeVerifiedPayment(attempt._id, verified(attempt))));
          assert.ok(results.every(result => result.status === 'succeeded'));
          await service.finalizeVerifiedPayment(attempt._id, verified(attempt));
          assert.deepEqual(await counts(), { guests: baseline.guests + 1,
            invoices: 1, captures: 1, logs: 1 });
          const saved = await Attempt.findById(attempt._id);
          assert.equal(saved.checkCount, 1);
          assert.equal(saved.activeTarget, undefined);
          assert.equal(saved.notificationPending, true);
          assert.equal(await Guest.countDocuments({ currentBooking: attempt.targetId }), 1);
          const capture = await Capture.findOne({ paymentAttempt: attempt._id });
          assert.equal(capture.amount, 2240);
          assert.equal(String(capture.booking), String(attempt.targetId));
        });

        for (const mismatch of ['amount', 'reference', 'missing transaction', 'refunded']) {
          await scenario(`${method}: ${mismatch} cannot credit booking`, async f => {
            const { attempt } = await checkout(f, method);
            const overrides = mismatch === 'amount' ? { totalAmount: 2240.01 }
              : mismatch === 'reference' ? { pidx: 'wrong-reference', transactionUuid: 'wrong-reference' }
              : mismatch === 'missing transaction' ? { transactionId: '', refId: '' }
              : { refunded: true };
            const result = await service.finalizeVerifiedPayment(attempt._id, verified(attempt, overrides));
            assert.equal(result.status, 'review');
            assert.equal(result.reviewReason, 'gateway_identity_or_amount_mismatch');
            assert.equal((await Booking.findById(attempt.targetId)).paymentStatus, 'unpaid');
            assert.equal(await Invoice.countDocuments(), 0);
            await noCapture();
          });
        }

        await scenario(`${method}: a paid provider transaction cannot be reused on another target`, async f => {
          const first = await checkout(f, method);
          await service.finalizeVerifiedPayment(first.attempt._id, verified(first.attempt));
          const order = await f.order();
          const next = await service.initiateWalletTarget({ user: f.user,
            targetId: String(order._id), gateway: method, idempotencyKey: randomUUID() });
          const second = await Attempt.findById(next.paymentAttemptId);
          const baseline = await counts();
          const duplicate = await service.finalizeVerifiedPayment(second._id, verified(second, {
            transactionId: `capture-${first.attempt._id}`, refId: `capture-${first.attempt._id}`,
          }));
          assert.equal(duplicate.status, 'review');
          assert.equal(duplicate.reviewReason, 'duplicate_provider_transaction');
          assert.deepEqual(await counts(), baseline);
          assert.equal((await Order.findById(order._id)).paymentStatus, 'pending');
          assert.equal((await Attempt.findById(second._id)).status, 'review');
        });

        for (const kind of ['order', 'invoice']) {
          await scenario(`${method}: ${kind} settlement and replay retain one capture`, async f => {
            const target = kind === 'order' ? await f.order() : await f.invoice(await f.booking());
            const args = { user: f.user, targetId: String(target._id), gateway: method, idempotencyKey: randomUUID() };
            await assert.rejects(service.initiateWalletTarget({ ...args, user: f.stranger }), { statusCode: 404 });
            const result = await service.initiateWalletTarget(args);
            assert.equal(result.requiresRedirect, true);
            assert.equal((await service.initiateWalletTarget(args)).paymentAttemptId, result.paymentAttemptId);
            const attempt = await Attempt.findById(result.paymentAttemptId);
            assert.equal(attempt.amountPaisa, kind === 'order' ? 25100 : 200000);
            assert.equal((await service.reconcilePayment(attempt._id)).status, 'succeeded');
            await service.reconcilePayment(attempt._id);
            await service.finalizeVerifiedPayment(attempt._id, verified(attempt));
            const replay = await service.initiateWalletTarget(args);
            assert.equal(replay.paymentAttemptId, result.paymentAttemptId);
            assert.equal(replay.requiresRedirect, false);
            const saved = await (kind === 'order' ? Order : Invoice).findById(target._id);
            if (kind === 'order') {
              assert.equal(saved.paymentStatus, 'paid');
              assert.equal(saved.paidAmount, 251);
              assert.equal(saved.paymentReference, attempt.providerReference);
            } else {
              assert.equal(saved.status, 'paid');
              assert.equal(saved.paid, 2260);
              assert.equal(saved.balance, 0);
            }
            assert.equal(await Capture.countDocuments({ paymentAttempt: attempt._id }), 1);
            assert.equal(await Activity.countDocuments({ entityId: String(attempt._id) }), 1);
            await assert.rejects(service.initiateWalletTarget({ ...args, idempotencyKey: randomUUID() }), { statusCode: 409 });
          });
        }
      }

      await scenario('concurrent identical booking keys reuse one attempt; changed request is rejected', async f => {
        const args = { user: f.user, body: f.body, idempotencyKey: randomUUID() };
        const results = await Promise.all(Array.from({ length: 5 }, () => service.createWalletBooking(args)));
        assert.equal(new Set(results.map(result => result.paymentAttemptId)).size, 1);
        assert.equal(await Attempt.countDocuments(), 1);
        assert.equal(await Booking.countDocuments(), 1);
        assert.equal(gateway.initiationCalls().length, 1);
        await assert.rejects(service.createWalletBooking({ ...args,
          body: { ...f.body, specialRequests: 'Changed request' } }), { statusCode: 409 });
        const id = results[0].paymentAttemptId;
        assert.equal(String((await service.getOwnedAttempt(id, f.user._id)).user), String(f.user._id));
        await assert.rejects(service.getOwnedAttempt(id, f.stranger._id), { statusCode: 404 });
        await assert.rejects(service.getOwnedAttempt('invalid', f.user._id), { statusCode: 400 });
      });

      await scenario('target keys reject different targets and competing active payments', async f => {
        const order = await f.order();
        const other = await f.order();
        const args = { user: f.user, targetId: String(order._id), gateway: 'khalti', idempotencyKey: randomUUID() };
        const results = await Promise.all(Array.from({ length: 4 }, () => service.initiateWalletTarget(args)));
        assert.equal(new Set(results.map(result => result.paymentAttemptId)).size, 1);
        assert.equal(gateway.initiationCalls().length, 1);
        await assert.rejects(service.initiateWalletTarget({ ...args, targetId: String(other._id) }), { statusCode: 409 });
        await assert.rejects(service.initiateWalletTarget({ ...args, gateway: 'esewa', idempotencyKey: randomUUID() }), { statusCode: 409 });
        assert.equal(await Attempt.countDocuments(), 1);
      });

      await scenario('verified legacy invoice without a guest reference settles once', async f => {
        const booking = await f.booking();
        const invoice = await f.invoice(booking);
        await Invoice.collection.updateOne({ _id: invoice._id }, { $unset: { guest: '' } });
        const args = { user: f.user, targetId: String(invoice._id), gateway: 'khalti', idempotencyKey: randomUUID() };
        const initiated = await service.initiateWalletTarget(args);
        const attempt = await Attempt.findById(initiated.paymentAttemptId);
        const settled = await service.reconcilePayment(attempt._id);
        assert.equal(settled.status, 'succeeded');
        const saved = await Invoice.findById(invoice._id).lean();
        assert.equal(saved.status, 'paid');
        assert.equal(saved.balance, 0);
        assert.equal(saved.paid, 2260);
        assert.equal(saved.guest, undefined);
        assert.equal(await Capture.countDocuments({ paymentAttempt: attempt._id }), 1);
      });

      await scenario('Khalti booking with optional phone omitted can initiate checkout', async f => {
        const { guestPhone, ...body } = f.body;
        const result = await service.createWalletBooking({ user: f.user, body, idempotencyKey: randomUUID() });
        assert.equal(result.requiresRedirect, true,
          'Valid booking without optional phone must not become initiation_unconfirmed');
        assert.equal(gateway.initiationCalls().length, 1);
      });

      await scenario('a late database failure rolls back guest, invoice, target, capture, audit and attempt', async (f, st) => {
        const { attempt } = await checkout(f);
        const baseline = await counts();
        const original = await Booking.findById(attempt.targetId).lean();
        const roomBefore = await Room.findById(f.room._id).lean();
        const fault = st.mock.method(Activity, 'create', async () => { throw new Error('injected-audit-write-failure'); });
        try {
          await assert.rejects(service.finalizeVerifiedPayment(attempt._id, verified(attempt)), /injected-audit-write-failure/);
          assert.equal(fault.mock.callCount(), 1, 'Fault is reached after capture and target writes');
        } finally { fault.mock.restore(); }
        assert.deepEqual(await counts(), baseline);
        assert.deepEqual(await Booking.findById(attempt.targetId).lean(), original);
        assert.deepEqual(await Room.findById(f.room._id).lean(), roomBefore);
        const saved = await Attempt.findById(attempt._id);
        assert.equal(saved.status, 'pending');
        assert.equal(saved.checkCount, 0);
        assert.equal(saved.providerTransactionId, undefined);
        assert.equal(saved.notificationPending, false);
        assert.equal((await service.finalizeVerifiedPayment(attempt._id, verified(attempt))).status, 'succeeded');
        assert.equal(await Capture.countDocuments(), 1);
      });

      for (const [method, pending, cancelled] of [['khalti', 'Pending', 'User canceled'], ['esewa', 'PENDING', 'CANCELED']]) {
        await scenario(`${method}: unpaid lookup and cancellation never fulfill`, async f => {
          const { attempt } = await checkout(f, method);
          const raw = method === 'khalti' ? gateway.payments.get(attempt.providerReference) : {
            transaction_uuid: attempt.providerReference, product_code: 'EPAYTEST', total_amount: 2240, ref_id: null,
          };
          gateway.payments.set(attempt.providerReference, { ...raw, status: pending });
          assert.equal((await service.reconcilePayment(attempt._id)).status, 'pending');
          assert.equal((await Booking.findById(attempt.targetId)).paymentStatus, 'unpaid');
          gateway.payments.set(attempt.providerReference, { ...raw, status: cancelled });
          assert.equal((await service.reconcilePayment(attempt._id)).status, 'cancelled');
          const booking = await Booking.findById(attempt.targetId);
          assert.equal(booking.status, 'Cancelled');
          assert.equal(booking.paymentStatus, 'unpaid');
          assert.equal((await Attempt.findById(attempt._id)).activeTarget, undefined);
          await service.finalizeVerifiedPayment(attempt._id, verified(attempt));
          assert.equal(await Invoice.countDocuments(), 0);
          await noCapture();
        });
      }

      for (const condition of ['cancelled', 'maintenance', 'balance changed', 'late room race']) {
        await scenario(`verified booking with ${condition} requires review without fulfillment`, async f => {
          const { attempt } = await checkout(f);
          if (condition === 'cancelled') await Booking.updateOne({ _id: attempt.targetId }, { $set: { status: 'Cancelled' } });
          if (condition === 'maintenance') await Room.updateOne({ _id: f.room._id }, { $set: { status: 'maintenance' } });
          if (condition === 'balance changed') await Booking.updateOne({ _id: attempt.targetId }, { $set: { totalAmount: 2500 } });
          if (condition === 'late room race') {
            await Booking.updateOne({ _id: attempt.targetId }, { $set: { paymentHoldExpiresAt: new Date(Date.now() - 1000) } });
            const other = await checkout(f, 'esewa');
            assert.equal((await service.reconcilePayment(other.attempt._id)).status, 'succeeded');
          }
          const baseline = await counts();
          const result = await service.finalizeVerifiedPayment(attempt._id, verified(attempt));
          assert.equal(result.status, 'review');
          assert.equal(result.reviewReason, condition === 'cancelled' ? 'target_no_longer_payable'
            : condition === 'balance changed' ? 'target_balance_changed' : 'room_unavailable_after_payment');
          assert.equal(result.activeTarget, `booking:${attempt.targetId}`);
          assert.equal((await Booking.findById(attempt.targetId)).paymentStatus, 'unpaid');
          assert.deepEqual(await counts(), { ...baseline, captures: baseline.captures + 1, logs: baseline.logs + 1 });
          await service.finalizeVerifiedPayment(attempt._id, verified(attempt));
          assert.equal(await Capture.countDocuments({ paymentAttempt: attempt._id }), 1);
        });
      }

      await scenario('concurrent distinct bookings cannot both hold the same room', async f => {
        const results = await Promise.allSettled(Array.from({ length: 2 }, () =>
          service.createWalletBooking({ user: f.user, body: f.body, idempotencyKey: randomUUID() })));
        assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
        assert.equal(results.find(result => result.status === 'rejected').reason.statusCode, 409);
        assert.equal(await Booking.countDocuments(), 1);
        assert.equal(await Attempt.countDocuments(), 1);
      });
    } finally { gateway.restore(); }
  });
});
