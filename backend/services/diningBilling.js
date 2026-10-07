/**
 * diningBilling.js — pure bill math for restaurant tabs. No I/O.
 *
 * Order of operations (Nepal restaurant convention):
 *   subtotal        = Σ price × qty over non-cancelled orders
 *   − discount      (percent of subtotal, or a fixed amount ≤ subtotal)
 *   = net
 *   + service charge = net × serviceChargeRate
 *   + VAT            = (net [+ service charge]) × taxRate
 *   = total
 *
 * Every step rounds to 2 decimals so the printed receipt, the stored totals
 * and the payment ledger always agree to the paisa.
 */

export const KITCHEN_OPEN_STATUSES = ["pending", "confirmed", "preparing"];

export const round2 = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

const lineTotal = (item) => round2((Number(item.price) || 0) * (Number(item.quantity) || 0));

export const orderSubtotal = (order) =>
  round2((order.items || []).reduce((sum, item) => sum + lineTotal(item), 0));

export const discountAmount = (discount, subtotal) => {
  if (!discount?.kind || !(Number(discount.value) > 0) || subtotal <= 0) return 0;
  if (discount.kind === "percent") {
    return round2(Math.min(subtotal, (subtotal * Math.min(100, Number(discount.value))) / 100));
  }
  return round2(Math.min(subtotal, Number(discount.value)));
};

/**
 * @param {object}   args
 * @param {object[]} args.orders    Order docs/objects in the session
 * @param {object}   args.charges   { taxRate, serviceChargeRate, taxOnServiceCharge }
 * @param {object}  [args.discount] { kind, value }
 * @param {object[]} [args.payments] [{ amount }]
 * @param {object[]} [args.refunds]  [{ amount }] money handed back
 */
export const computeTotals = ({ orders = [], charges = {}, discount = null, payments = [], refunds = [] }) => {
  const billable = orders.filter((o) => o.status !== "cancelled");
  const subtotal = round2(billable.reduce((sum, o) => sum + orderSubtotal(o), 0));
  const discountValue = discountAmount(discount, subtotal);
  const net = round2(subtotal - discountValue);

  const serviceChargeRate = Math.max(0, Number(charges.serviceChargeRate) || 0);
  const taxRate = Math.max(0, Number(charges.taxRate) || 0);
  const taxOnServiceCharge = charges.taxOnServiceCharge !== false;

  const serviceCharge = round2((net * serviceChargeRate) / 100);
  const taxBase = round2(net + (taxOnServiceCharge ? serviceCharge : 0));
  const tax = round2((taxBase * taxRate) / 100);
  const total = round2(net + serviceCharge + tax);
  const paid = round2(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0));
  const refunded = round2((refunds || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0));

  return {
    subtotal,
    discount: discountValue,
    serviceCharge,
    tax,
    total,
    paid,
    refunded,
    // What is still owed after counting money kept (payments minus refunds).
    balance: round2(total - (paid - refunded)),
    orderCount: billable.length,
    itemCount: billable.reduce(
      (sum, o) => sum + (o.items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0),
      0
    ),
    openKitchenOrders: billable.filter((o) => KITCHEN_OPEN_STATUSES.includes(o.status)).length,
  };
};
