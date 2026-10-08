import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteStay, nightsBetween, cancellationNote, formatRs, toLocalISODate } from '../src/features/public/hotels/lib/money.js';
import { bookingQuote } from '../../backend/utils/paymentMoney.js';

// The booking sidebar previews the price the server will charge. These two must never drift apart.
test('client quote equals the server bookingQuote for many prices and stay lengths', () => {
  const prices = [1, 99, 500, 999.5, 1000, 1234.56, 1999.99, 4500, 5000, 7777, 12500.5, 99999];
  for (const price of prices) {
    for (let nights = 1; nights <= 30; nights += 1) {
      const server = bookingQuote(price, nights);
      const client = quoteStay(price, nights);
      assert.equal(client.total, server.totalPaisa / 100, `total ${price} x ${nights}`);
      assert.equal(client.subtotal, server.subtotalPaisa / 100, `subtotal ${price} x ${nights}`);
      assert.equal(client.taxes, server.taxPaisa / 100, `tax ${price} x ${nights}`);
    }
  }
});

test('nights are whole calendar nights and invalid ranges are zero', () => {
  assert.equal(nightsBetween('2030-01-01', '2030-01-04'), 3);
  assert.equal(nightsBetween('2030-01-01', '2030-01-01'), 0);
  assert.equal(nightsBetween('2030-01-04', '2030-01-01'), 0);
  assert.equal(nightsBetween('', '2030-01-01'), 0);
  assert.equal(nightsBetween('2030-02-28', '2030-03-01'), 1);
  assert.deepEqual(quoteStay(5000, 0), { nights: 0, subtotal: 0, taxes: 0, total: 0 });
});

test('cancellation wording follows the server refund tiers (48h full, 24-48h half, none inside 24h)', () => {
  const now = new Date('2030-06-01T00:00:00Z');
  assert.match(cancellationNote('2030-06-10', now), /^Free cancellation until Jun 8, 2030/);
  assert.match(cancellationNote('2030-06-02T12:00:00Z', now), /50% refund/);
  assert.match(cancellationNote('2030-06-01T10:00:00Z', now), /Not refundable/);
});

test('money and local dates format as the site contract says', () => {
  assert.equal(formatRs(1234), 'Rs. 1,234');
  assert.equal(formatRs(1234.5), 'Rs. 1,234.5');
  assert.equal(formatRs('abc'), 'Rs. 0');
  assert.equal(toLocalISODate(new Date(2030, 0, 5)), '2030-01-05');
});
