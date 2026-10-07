import { Invoice } from '../models/invoice.schema.js';

// Keep every billing surface in the same transaction as a stay change.
export async function updateStayCharges(booking, totalAmount, session) {
  const previousTotal = booking.totalAmount;
  booking.totalAmount = Math.round(totalAmount * 100) / 100;
  const paid = booking.paidAmount || (booking.paymentStatus === 'paid' ? previousTotal : 0);
  booking.paidAmount = paid;
  booking.paymentStatus = paid >= booking.totalAmount ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
  if (booking.priceBreakdown?.totalPaisa != null) {
    const taxRate = booking.priceBreakdown.taxRate || 0;
    const totalPaisa = Math.round(booking.totalAmount * 100);
    const subtotalPaisa = Math.round(totalPaisa / (1 + taxRate / 100));
    booking.priceBreakdown = { totalPaisa, subtotalPaisa, taxPaisa: totalPaisa - subtotalPaisa, taxRate };
  }
  const invoices = await Invoice.find({ booking: booking._id }).session(session);
  for (const invoice of invoices) {
    const delta = booking.totalAmount - previousTotal;
    const rate = invoice.charges.taxRate || 0;
    invoice.charges.room = Math.round((invoice.charges.room + delta / (1 + rate / 100)) * 100) / 100;
    invoice.charges.total = Math.round((invoice.charges.total + delta) * 100) / 100;
    invoice.charges.tax = Math.round((invoice.charges.total - invoice.charges.room - invoice.charges.extras) * 100) / 100;
    invoice.balance = Math.max(0, Math.round((invoice.charges.total - invoice.paid) * 100) / 100);
    invoice.status = invoice.balance === 0 ? 'paid' : invoice.paid > 0 ? 'partial' : 'pending';
    invoice.checkOut = booking.checkOut;
    invoice.checkIn = booking.checkIn;
    invoice.nights = Math.ceil((booking.checkOut - booking.checkIn) / 86400000);
    await invoice.save({ session });
  }
}
