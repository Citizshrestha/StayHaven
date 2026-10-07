import { AppError } from '../middleware/errorHandler.js';

export function toPaisa(value, allowZero = false) {
  if ((typeof value !== 'number' && typeof value !== 'string') ||
      !/^\d+(?:\.\d{1,2})?$/.test(String(value))) {
    throw new AppError('Amount must be a finite NPR amount with at most two decimal places', 400);
  }
  const [rupees, fraction = ''] = String(value).split('.');
  const result = Number(rupees) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result < (allowZero ? 0 : 1)) throw new AppError('Invalid payment amount', 400);
  return result;
}

// Preserve the existing advertised 12% checkout fee; calculate and store it ONCE.
// Changing the business tax policy is independent of payment verification.
export function bookingQuote(price, nights) {
  const subtotalPaisa = toPaisa(price) * nights;
  if (!Number.isSafeInteger(subtotalPaisa)) throw new AppError('Invalid booking total', 400);
  const taxPaisa = Math.round(subtotalPaisa * 0.12 / 100) * 100;
  return { subtotalPaisa, taxPaisa, totalPaisa: subtotalPaisa + taxPaisa, taxRate: 12 };
}
