import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTotals, discountAmount, round2 } from '../services/diningBilling.js';

const order = (status, lines) => ({ status, items: lines.map(([price, quantity]) => ({ price, quantity })) });

test('VAT on subtotal, no service charge', () => {
  const t = computeTotals({ orders: [order('ready', [[450, 2], [120, 1]])], charges: { taxRate: 13, serviceChargeRate: 0 } });
  assert.equal(t.subtotal, 1020);
  assert.equal(t.tax, 132.6);
  assert.equal(t.total, 1152.6);
  assert.equal(t.balance, 1152.6);
  assert.equal(t.itemCount, 3);
});

test('service charge is taxed by default and can be exempted', () => {
  const orders = [order('delivered', [[1000, 1]])];
  const taxed = computeTotals({ orders, charges: { taxRate: 13, serviceChargeRate: 10 } });
  assert.deepEqual([taxed.serviceCharge, taxed.tax, taxed.total], [100, 143, 1243]);
  const exempt = computeTotals({ orders, charges: { taxRate: 13, serviceChargeRate: 10, taxOnServiceCharge: false } });
  assert.deepEqual([exempt.serviceCharge, exempt.tax, exempt.total], [100, 130, 1230]);
});

test('cancelled orders are not billed and open kitchen orders are counted', () => {
  const t = computeTotals({
    orders: [order('cancelled', [[500, 1]]), order('preparing', [[200, 1]]), order('ready', [[100, 1]])],
    charges: { taxRate: 0 },
  });
  assert.equal(t.subtotal, 300);
  assert.equal(t.orderCount, 2);
  assert.equal(t.openKitchenOrders, 1);
});

test('discount is applied before service charge and VAT and is capped', () => {
  const orders = [order('ready', [[1000, 1]])];
  const t = computeTotals({ orders, charges: { taxRate: 13, serviceChargeRate: 10 }, discount: { kind: 'percent', value: 10 } });
  assert.deepEqual([t.discount, t.serviceCharge, t.tax, t.total], [100, 90, 128.7, 1118.7]);
  assert.equal(discountAmount({ kind: 'amount', value: 5000 }, 1000), 1000);
  assert.equal(discountAmount({ kind: 'percent', value: 250 }, 1000), 1000);
});

test('payments reduce the balance and totals round to paisa', () => {
  const t = computeTotals({
    orders: [order('ready', [[33.33, 3]])],
    charges: { taxRate: 13 },
    payments: [{ amount: 50 }, { amount: 25.5 }],
  });
  assert.equal(t.subtotal, 99.99);
  assert.equal(t.tax, 13);
  assert.equal(t.total, 112.99);
  assert.equal(t.balance, 37.49);
  assert.equal(round2(0.1 + 0.2), 0.3);
});
