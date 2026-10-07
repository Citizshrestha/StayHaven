import { Booking } from '../models/booking.schema.js';
import { AppError } from '../middleware/errorHandler.js';

// Pending reservations hold inventory only until their checkout window expires.
export const activeReservationFilter = (now = new Date()) => ({
  $or: [
    { status: { $in: ['Confirmed', 'Checked-In'] } },
    { status: 'Pending', $or: [
      { paymentHoldExpiresAt: { $exists: false } },
      { paymentHoldExpiresAt: null },
      { paymentHoldExpiresAt: { $gt: now } },
    ] },
  ],
});

export function validateStayDates(checkIn, checkOut) {
  if (!checkIn || !checkOut || !['string', 'number'].includes(typeof checkIn) && !(checkIn instanceof Date) ||
      !['string', 'number'].includes(typeof checkOut) && !(checkOut instanceof Date)) {
    throw new AppError('Valid check-in and check-out dates are required', 400);
  }
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || end <= start || start < today || end - start > 365 * 86400000) {
    throw new AppError('Stay must start today or later and last between 1 and 365 nights', 400);
  }
  return { start, end };
}

export async function findReservationConflict({ room, checkIn, checkOut, exclude, session }) {
  return Booking.findOne({
    room,
    ...(exclude ? { _id: { $ne: exclude } } : {}),
    checkIn: { $lt: new Date(checkOut) },
    checkOut: { $gt: new Date(checkIn) },
    ...activeReservationFilter(),
  }).sort({ checkIn: 1 }).session(session || null);
}
