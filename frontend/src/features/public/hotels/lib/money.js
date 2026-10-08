// Money + stay maths for the public booking flow.
//
// The server is the source of truth for what a guest is charged
// (backend/utils/paymentMoney.js: nights x room rate, plus a 12% taxes & fees line rounded to whole rupees).
// These helpers only PREVIEW that quote while the guest is choosing dates; the booking and payment
// screens always switch to the amount the server returns.

export const TAX_RATE = 0.12;

/** Rs. 1,234 (or Rs. 1,234.50): the one money format used across the site. */
export const formatRs = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Rs. 0';
  return `Rs. ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
};

/** Local calendar date as YYYY-MM-DD (toISOString() would give the UTC date, which is "yesterday" early in the day in Nepal). */
export const toLocalISODate = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole nights between two YYYY-MM-DD strings, or 0 when the range is empty/invalid. */
export const nightsBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
  return Math.ceil((end - start) / MS_PER_DAY);
};

/** Mirror of the server's bookingQuote(): same rounding, so the preview equals the charge. */
export const quoteStay = (pricePerNight, nights) => {
  const price = Number(pricePerNight);
  if (!Number.isFinite(price) || price <= 0 || nights <= 0) return { nights: 0, subtotal: 0, taxes: 0, total: 0 };
  const subtotalPaisa = Math.round(price * 100) * nights;
  const taxPaisa = Math.round((subtotalPaisa * TAX_RATE) / 100) * 100;
  return { nights, subtotal: subtotalPaisa / 100, taxes: taxPaisa / 100, total: (subtotalPaisa + taxPaisa) / 100 };
};

/**
 * What cancelling would cost, from the same tiers the server applies in cancelBooking():
 * 100% back 48h+ before check-in, 50% back 24-48h before, nothing inside 24h.
 */
export const cancellationNote = (checkIn, now = new Date()) => {
  if (!checkIn) return 'Free cancellation up to 48 hours before check-in';
  const start = new Date(checkIn);
  if (Number.isNaN(start.getTime())) return 'Free cancellation up to 48 hours before check-in';
  const hours = (start - now) / (60 * 60 * 1000);
  if (hours >= 48) {
    const until = new Date(start.getTime() - 48 * 60 * 60 * 1000);
    return `Free cancellation until ${until.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  if (hours >= 24) return '50% refund if cancelled now (24-48 hours before check-in)';
  return 'Not refundable inside 24 hours of check-in';
};
