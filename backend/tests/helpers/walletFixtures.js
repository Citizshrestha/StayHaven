import mongoose from 'mongoose';
import { User } from '../../models/user.schema.js';
import { Hotel } from '../../models/hotel.schema.js';
import { Room } from '../../models/room.schema.js';
import { Guest } from '../../models/guest.schema.js';
import { Booking } from '../../models/booking.schema.js';
import { Order } from '../../models/order.schema.js';
import { Invoice } from '../../models/invoice.schema.js';

export async function walletFixtures() {
  const company = new mongoose.Types.ObjectId();
  const user = await User.create({ fullname: 'Wallet Test Guest', username: 'wallet-test',
    email: 'wallet@example.test', password: 'only-for-isolated-tests', contact: '9800000000' });
  const stranger = await User.create({ fullname: 'Other Guest', username: 'other-wallet-test',
    email: 'other@example.test', password: 'only-for-isolated-tests', contact: '9800000001' });
  const hotel = await Hotel.create({ company, owner: user._id, name: 'Ephemeral Hotel',
    description: 'Integration fixture', category: 'Hotel', starRating: 3,
    location: { city: 'Kathmandu', country: 'Nepal', address: 'Test Street' },
    contact: { phone: '9800000000', email: 'hotel@example.test' },
    bankTransferAccount: { enabled: true, accountName: 'Ephemeral Hotel', bankName: 'Test Bank', accountNumber: 'TEST12345678' },
    images: ['https://wallet-tests.invalid/hotel.jpg'], priceRange: { min: 1000, max: 1000 },
    status: 'approved', isActive: true, totalRooms: 2, availableRooms: 2 });
  const room = await Room.create({ hotel: hotel._id, company, roomName: 'Test Double',
    roomNumber: '101', type: 'double', price: 1000, status: 'available',
    capacity: { adults: 2, children: 1 }, maxGuests: 3 });
  const guest = await Guest.create({ hotel: hotel._id, company, fullName: user.fullname,
    email: user.email, phone: user.contact });
  const checkIn = new Date(Date.now() + 30 * 86400000);
  checkIn.setUTCHours(12, 0, 0, 0);
  const checkOut = new Date(checkIn.getTime() + 2 * 86400000);
  const body = { hotelId: String(hotel._id), roomId: String(room._id),
    checkIn: checkIn.toISOString(), checkOut: checkOut.toISOString(),
    guests: { adults: 2, children: 0 }, guestName: user.fullname, guestEmail: user.email,
    guestPhone: user.contact, paymentMethod: 'khalti' };
  return {
    user, stranger, hotel, room, guest, company, body,
    booking: (overrides = {}) => Booking.create({ user: user._id, hotel: hotel._id,
      company, room: room._id, guest: guest._id, checkIn, checkOut, guests: body.guests,
      totalAmount: 2260, currency: 'NPR', status: 'Pending', paymentStatus: 'unpaid', ...overrides }),
    order: (overrides = {}) => Order.create({ hotel: hotel._id, room: room._id,
      customerId: user._id, customerName: user.fullname, orderType: 'roomService',
      items: [{ name: 'Dinner', quantity: 2, price: 125.5 }],
      totalPrice: 251, status: 'delivered', paymentStatus: 'pending', ...overrides }),
    invoice: (booking, overrides = {}) => Invoice.create({ hotel: hotel._id, company,
      booking: booking._id, guest: guest._id, guestName: user.fullname,
      charges: { room: 2000, extras: 0, taxRate: 13, tax: 260, total: 2260 },
      paid: 260, balance: 2000, status: 'partial', ...overrides }),
  };
}
