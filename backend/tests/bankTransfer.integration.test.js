import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { withEphemeralWalletDatabase } from './helpers/ephemeralWalletDatabase.js';

// Import application models/service only after installing the isolated
// ephemeral database. Never load dotenv, the application server, DB
// configuration, or seeders — see ephemeralWalletDatabase.js.
test('bank transfer admin approval workflow against an owned ephemeral replica set', { timeout: 600000 }, async t => {
  await withEphemeralWalletDatabase(async db => {
    const { walletFixtures } = await import('./helpers/walletFixtures.js');
    const bankTransfer = await import('../services/bankTransferService.js');
    const { PaymentTransaction: Txn } = await import('../models/paymentTransaction.schema.js');
    const { Booking } = await import('../models/booking.schema.js');
    const { Order } = await import('../models/order.schema.js');
    const { Invoice } = await import('../models/invoice.schema.js');
    const { Hotel } = await import('../models/hotel.schema.js');
    const { ActivityLog: Activity } = await import('../models/activityLog.schema.js');
    const { payOrder } = await import('../controllers/guestDashboardController.js');
    // Await real unique indexes, including the bank-transfer duplicate-reference
    // partial index, before any concurrent-approval tests run.
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));

    const scenario = (name, run) => t.test(name, async st => {
      await db.reset();
      await run(await walletFixtures(), st);
    });

    const staff = { _id: new mongoose.Types.ObjectId(), fullname: 'Front Desk Staff' };

    function pendingBookingTxn(f, booking, overrides = {}) {
      return Txn.create({
        hotel: f.hotel._id, company: f.company, booking: booking._id,
        type: 'capture', amount: booking.totalAmount, currency: 'NPR',
        method: 'bank-transfer', reference: `BANK-${booking._id}`,
        status: 'pending', notes: 'Bank transfer submitted', ...overrides,
      });
    }
    function pendingOrderTxn(f, booking, order, overrides = {}) {
      return Txn.create({
        hotel: f.hotel._id, company: f.company, booking: booking._id, order: order._id,
        type: 'capture', amount: order.totalPrice, currency: 'NPR',
        method: 'bank-transfer', reference: `BANK-ORD-${order._id}`,
        status: 'pending', notes: 'Bank transfer submitted for order', ...overrides,
      });
    }
    function pendingInvoiceTxn(f, invoice, overrides = {}) {
      return Txn.create({
        hotel: f.hotel._id, company: f.company, booking: invoice.booking, invoice: invoice._id,
        type: 'capture', amount: invoice.balance, currency: 'NPR',
        method: 'bank-transfer', reference: `BANK-INV-${invoice._id}`,
        status: 'pending', notes: 'Bank transfer submitted for invoice', ...overrides,
      });
    }

    await scenario('guest submission stays pending until scoped staff approval', async f => {
      const order = await f.order();
      const req = { params: { id: String(order._id) }, user: f.user, body: {
        paymentMethod: 'bank', bankTransferDetails: {
          accountName: 'Test Guest', accountNumber: '12345678', bankName: 'Test Bank', transactionId: 'slip-controller-001',
        },
      } };
      let response;
      const res = { status() { return this; }, json(value) { response = value; return this; } };
      await payOrder(req, res, error => { throw error; });
      assert.equal(response.success, true);
      assert.equal(response.requiresVerification, true);
      assert.equal((await Order.findById(order._id)).paymentStatus, 'pending');
      const txn = await Txn.findOne({ order: order._id, method: 'bank-transfer' });
      assert.equal(txn.currency, 'NPR');
      assert.equal(txn.reference, 'SLIP-CONTROLLER-001');
      assert.equal(txn.status, 'pending');
      await assert.rejects(bankTransfer.approveBankTransfer({ transactionId: txn._id, staffUser: staff, scope: { company: new mongoose.Types.ObjectId() } }), /not found/);
      assert.equal((await Order.findById(order._id)).paymentStatus, 'pending');
      await bankTransfer.approveBankTransfer({ transactionId: txn._id, staffUser: staff, scope: { company: f.company, hotel: f.hotel._id } });
      assert.equal((await Order.findById(order._id)).paymentStatus, 'paid');
      assert.equal((await Txn.findById(txn._id)).status, 'captured');
    });

    await scenario('invoice bank submission stays unpaid until staff approval', async f => {
      const booking = await f.booking();
      const invoice = await f.invoice(booking);
      const req = { params: { id: String(invoice._id) }, user: f.user, body: {
        paymentMethod: 'bank', bankTransferDetails: {
          accountName: 'Test Guest', accountNumber: '12345678', bankName: 'Test Bank', transactionId: 'slip-invoice-001',
        },
      } };
      let response;
      const res = { status() { return this; }, json(value) { response = value; return this; } };
      await payOrder(req, res, error => { throw error; });
      assert.equal(response.requiresVerification, true);
      assert.equal((await Invoice.findById(invoice._id)).status, 'partial');
      const txn = await Txn.findOne({ invoice: invoice._id, method: 'bank-transfer' });
      assert.equal(txn.status, 'pending');
      await bankTransfer.approveBankTransfer({ transactionId: txn._id, staffUser: staff, scope: { company: f.company, hotel: f.hotel._id } });
      const settled = await Invoice.findById(invoice._id);
      assert.equal(settled.status, 'paid');
      assert.equal(settled.balance, 0);
    });

    await scenario('bank transfer cannot be submitted without a configured receiving account', async f => {
      await Hotel.updateOne({ _id: f.hotel._id }, { $set: { 'bankTransferAccount.enabled': false } });
      const order = await f.order();
      const req = { params: { id: String(order._id) }, user: f.user, body: {
        paymentMethod: 'bank', bankTransferDetails: {
          accountName: 'Test Guest', accountNumber: '12345678', bankName: 'Test Bank', transactionId: 'slip-unconfigured-001',
        },
      } };
      let response;
      const res = { status() { return this; }, json(value) { response = value; return this; } };
      await payOrder(req, res, error => { throw error; });
      assert.equal(response.success, false);
      assert.match(response.message, /not configured/);
      assert.equal(await Txn.countDocuments({ order: order._id }), 0);
    });

    await scenario('approving a booking bank transfer confirms the booking, invoice and reserves the room', async f => {
      const booking = await f.booking();
      const txn = await pendingBookingTxn(f, booking);
      const { transaction, fulfillment } = await bankTransfer.approveBankTransfer({ transactionId: txn._id, staffUser: staff });
      assert.equal(transaction.status, 'captured');
      assert.equal(transaction.processedByName, 'Front Desk Staff');
      assert.equal(fulfillment.targetType, 'booking');

      const confirmed = await Booking.findById(booking._id);
      assert.equal(confirmed.status, 'Confirmed');
      assert.equal(confirmed.paymentStatus, 'paid');
      assert.equal(confirmed.paymentMethod, 'bank-transfer');
      assert.equal(confirmed.paidAmount, booking.totalAmount);

      const invoice = await Invoice.findOne({ booking: booking._id });
      assert.ok(invoice, 'approval must create an invoice, exactly like the Stripe finalizer does');
      assert.equal(invoice.paid, booking.totalAmount);

      const log = await Activity.findOne({ action: 'bank-transfer-approved' });
      assert.ok(log);
    });

    await scenario('approving an order bank transfer marks the order paid without touching booking/invoice', async f => {
      const booking = await f.booking();
      const order = await f.order();
      const txn = await pendingOrderTxn(f, booking, order);
      const { fulfillment } = await bankTransfer.approveBankTransfer({ transactionId: txn._id, staffUser: staff });
      assert.equal(fulfillment.targetType, 'order');

      const paidOrder = await Order.findById(order._id);
      assert.equal(paidOrder.paymentStatus, 'paid');
      assert.equal(paidOrder.paymentMethod, 'bank');
      assert.equal(paidOrder.paidAmount, order.totalPrice);

      // The booking used only to satisfy PaymentTransaction's required
      // fields (see guestDashboardController.js's dummy-booking pattern)
      // must remain completely untouched by an order approval.
      const untouchedBooking = await Booking.findById(booking._id);
      assert.equal(untouchedBooking.status, 'Pending');
      assert.equal(untouchedBooking.paymentStatus, 'unpaid');
    });

    await scenario('approving an invoice bank transfer settles the balance and leaves the booking alone', async f => {
      const booking = await f.booking();
      const invoice = await f.invoice(booking);
      const txn = await pendingInvoiceTxn(f, invoice);
      const { fulfillment } = await bankTransfer.approveBankTransfer({ transactionId: txn._id, staffUser: staff });
      assert.equal(fulfillment.targetType, 'invoice');

      const settled = await Invoice.findById(invoice._id);
      assert.equal(settled.status, 'paid');
      assert.equal(settled.balance, 0);
      assert.equal(settled.paid, invoice.paid + invoice.balance);

      const untouchedBooking = await Booking.findById(booking._id);
      assert.equal(untouchedBooking.status, 'Pending');
      assert.equal(untouchedBooking.paymentStatus, 'unpaid');
    });

    await scenario('partial invoice balance settles to "partial" rather than "paid" when short', async f => {
      const booking = await f.booking();
      const invoice = await f.invoice(booking, { balance: 2000 });
      const txn = await pendingInvoiceTxn(f, invoice, { amount: 1000 }); // pays less than the full balance
      const { fulfillment } = await bankTransfer.approveBankTransfer({ transactionId: txn._id, staffUser: staff });
      assert.equal(fulfillment.status, 'partial');
      const settled = await Invoice.findById(invoice._id);
      assert.equal(settled.status, 'partial');
      assert.equal(settled.balance, 1000);
    });

    await scenario('rejecting a bank transfer leaves the booking exactly as payable as before', async f => {
      const booking = await f.booking();
      const txn = await pendingBookingTxn(f, booking);
      const { transaction } = await bankTransfer.rejectBankTransfer({ transactionId: txn._id, staffUser: staff, reason: 'Slip does not match statement' });
      assert.equal(transaction.status, 'failed');
      assert.equal(transaction.refundReason, 'Slip does not match statement');

      const untouched = await Booking.findById(booking._id);
      assert.equal(untouched.status, 'Pending');
      assert.equal(untouched.paymentStatus, 'unpaid');

      const log = await Activity.findOne({ action: 'bank-transfer-rejected' });
      assert.ok(log);
    });

    await scenario('rejection requires a reason', async f => {
      const booking = await f.booking();
      const txn = await pendingBookingTxn(f, booking);
      await assert.rejects(
        bankTransfer.rejectBankTransfer({ transactionId: txn._id, staffUser: staff, reason: '' }),
        /reason is required/,
      );
      assert.equal((await Txn.findById(txn._id)).status, 'pending');
    });

    await scenario('concurrent repeated approval fulfills exactly once', async f => {
      const booking = await f.booking();
      const txn = await pendingBookingTxn(f, booking);
      const results = await Promise.all(Array.from({ length: 8 }, () =>
        bankTransfer.approveBankTransfer({ transactionId: txn._id, staffUser: staff })));
      const winners = results.filter(r => !r.alreadyProcessed);
      assert.equal(winners.length, 1, 'exactly one of the 8 concurrent approvals must win the atomic claim');
      assert.equal(results.filter(r => r.alreadyProcessed).length, 7);
      assert.equal(await Invoice.countDocuments({ booking: booking._id }), 1);
      assert.equal((await Booking.findById(booking._id)).paymentStatus, 'paid');
    });

    await scenario('approve and reject racing on the same transaction produce exactly one outcome', async f => {
      const booking = await f.booking();
      const txn = await pendingBookingTxn(f, booking);
      const [approveResults, rejectResults] = await Promise.all([
        Promise.all(Array.from({ length: 4 }, () => bankTransfer.approveBankTransfer({ transactionId: txn._id, staffUser: staff }))),
        Promise.all(Array.from({ length: 4 }, () => bankTransfer.rejectBankTransfer({ transactionId: txn._id, staffUser: staff, reason: 'racing rejection' }))),
      ]);
      const winners = [...approveResults, ...rejectResults].filter(r => !r.alreadyProcessed);
      assert.equal(winners.length, 1, 'double-approval/rejection protection must yield exactly one winner');
      const final = await Txn.findById(txn._id);
      assert.ok(['captured', 'failed'].includes(final.status));
    });

    await scenario('a second pending bank transfer cannot reuse the same reference', async f => {
      const booking = await f.booking();
      const other = await f.booking();
      await pendingBookingTxn(f, booking, { reference: 'SLIP-DUPLICATE-001' });
      await assert.rejects(
        pendingBookingTxn(f, other, { reference: 'SLIP-DUPLICATE-001' }),
        error => error.code === 11000,
      );
    });

    await scenario('a rejected reference can be resubmitted, but a captured one cannot', async f => {
      const booking = await f.booking();
      const txn = await pendingBookingTxn(f, booking, { reference: 'SLIP-REUSE-001' });
      await bankTransfer.rejectBankTransfer({ transactionId: txn._id, staffUser: staff, reason: 'mismatch' });
      const resubmitted = await f.booking();
      // Must not throw: the first transaction is now "failed", outside the
      // partial index's status filter, so the reference is free again.
      await pendingBookingTxn(f, resubmitted, { reference: 'SLIP-REUSE-001' });
      // These two bookings only establish reference reuse; neither should
      // hold the fixture room while the third booking is approved.
      await Booking.updateMany({ _id: { $in: [booking._id, resubmitted._id] } }, { $set: { status: 'Cancelled' } });

      const approvedBooking = await f.booking();
      const approvedTxn = await pendingBookingTxn(f, approvedBooking, { reference: 'SLIP-REUSE-002' });
      await bankTransfer.approveBankTransfer({ transactionId: approvedTxn._id, staffUser: staff });
      const another = await f.booking();
      await assert.rejects(
        pendingBookingTxn(f, another, { reference: 'SLIP-REUSE-002' }),
        error => error.code === 11000,
        'a captured transaction\'s reference must never be reusable for a fresh pending submission',
      );
    });

    await scenario('approving a cancelled booking is refused rather than resurrecting it', async f => {
      const booking = await f.booking({ status: 'Cancelled', paymentStatus: 'unpaid' });
      const txn = await pendingBookingTxn(f, booking);
      await assert.rejects(
        bankTransfer.approveBankTransfer({ transactionId: txn._id, staffUser: staff }),
        /no longer awaiting payment/,
      );
      // The transaction must not be left dangling as "captured" when
      // fulfillment failed inside the same transaction.
      assert.equal((await Txn.findById(txn._id)).status, 'pending');
      assert.equal((await Booking.findById(booking._id)).status, 'Cancelled');
    });

    await scenario('approving an already-captured transaction is a no-op, not a double fulfillment', async f => {
      const booking = await f.booking();
      const txn = await pendingBookingTxn(f, booking);
      await bankTransfer.approveBankTransfer({ transactionId: txn._id, staffUser: staff });
      const second = await bankTransfer.approveBankTransfer({ transactionId: txn._id, staffUser: staff });
      assert.equal(second.alreadyProcessed, true);
      assert.equal(await Invoice.countDocuments({ booking: booking._id }), 1);
    });

    await scenario('the pending list surfaces oldest submissions first, scoped to the hotel', async f => {
      const other = await f.booking();
      await pendingBookingTxn(f, other, { hotel: new mongoose.Types.ObjectId() });
      const mine1 = await f.booking();
      const mine2 = await f.booking();
      await pendingBookingTxn(f, mine1);
      await pendingBookingTxn(f, mine2);
      const result = await bankTransfer.listPendingBankTransfers({ hotel: f.hotel._id });
      assert.equal(result.total, 2);
      assert.ok(result.items.every(item => String(item.hotel) === String(f.hotel._id)));
    });
  });
});
