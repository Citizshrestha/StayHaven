import { Hotel } from "../models/hotel.schema.js";
import { Room } from "../models/room.schema.js";
import { Company } from "../models/company.schema.js";
import { User } from "../models/user.schema.js";
import { MenuItem } from "../models/menuItem.schema.js";
import { HotelTable } from "../models/hotelTable.schema.js";
import { Order } from "../models/order.schema.js";
import { Booking } from "../models/booking.schema.js";
import { Invoice } from "../models/invoice.schema.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * @desc    Seed comprehensive hotel admin dashboard data
 * @route   POST /api/seed/hotel-admin-data/:hotelId
 * @access  Admin/Owner only
 */
export const seedHotelAdminData = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const { clear = false } = req.query;

  // Validate hotel exists
  const hotel = await Hotel.findById(hotelId).populate('company');
  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: 'Hotel not found',
    });
  }

  const company = hotel.company;
  if (!company) {
    return res.status(404).json({
      success: false,
      message: 'Company not found for this hotel',
    });
  }

  const summary = {
    hotel: hotel.name,
    hotelId: hotel._id,
    rooms: { created: 0, existing: 0 },
    menuItems: { created: 0, existing: 0 },
    tables: { created: 0, existing: 0 },
    staff: { created: 0, existing: 0 },
    orders: { created: 0, existing: 0 },
    bookings: { created: 0, existing: 0 },
    invoices: { created: 0, existing: 0 },
    transactions: { created: 0, existing: 0 },
  };

  // Optional: Clear existing data
  if (clear === 'true') {
    await Promise.all([
      Room.deleteMany({ hotel: hotelId }),
      MenuItem.deleteMany({ hotel: hotelId }),
      HotelTable.deleteMany({ hotel: hotelId }),
      Order.deleteMany({ hotel: hotelId }),
      Booking.deleteMany({ hotel: hotelId }),
      Invoice.deleteMany({ hotel: hotelId }),
      PaymentTransaction.deleteMany({ hotel: hotelId }),
    ]);
  }

  // ============================================
  // 1. SEED ROOMS
  // ============================================
  const existingRoomCount = await Room.countDocuments({ hotel: hotelId });
  if (existingRoomCount === 0) {
    const roomsData = [
      { roomNumber: '101', type: 'single', price: 120, bedType: 'Single', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar'] },
      { roomNumber: '102', type: 'single', price: 120, bedType: 'Single', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar'] },
      { roomNumber: '201', type: 'double', price: 150, bedType: 'Double', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Coffee Maker'] },
      { roomNumber: '202', type: 'double', price: 150, bedType: 'Double', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Coffee Maker'] },
      { roomNumber: '203', type: 'double', price: 150, bedType: 'Double', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Coffee Maker'] },
      { roomNumber: '301', type: 'deluxe', price: 200, bedType: 'King', amenities: ['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Coffee Maker', 'Jacuzzi', 'Bathrobe'] },
      { roomNumber: '302', type: 'deluxe', price: 200, bedType: 'King', amenities: ['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Coffee Maker', 'Jacuzzi', 'Bathrobe'] },
      { roomNumber: '401', type: 'suite', price: 300, bedType: 'King', amenities: ['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Coffee Maker', 'Jacuzzi', 'Bathrobe', 'Sofa', 'Work Desk'] },
      { roomNumber: '402', type: 'suite', price: 300, bedType: 'King', amenities: ['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Coffee Maker', 'Jacuzzi', 'Bathrobe', 'Sofa', 'Work Desk'] },
      { roomNumber: '501', type: 'villa', price: 500, bedType: 'King', amenities: ['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Coffee Maker', 'Jacuzzi', 'Bathrobe', 'Sofa', 'Work Desk', 'Private Pool', 'Terrace'] },
    ];

    const rooms = await Room.insertMany(
      roomsData.map(room => ({
        ...room,
        hotel: hotelId,
        company: company._id,
        roomName: `${hotel.name} - Room ${room.roomNumber}`,
        capacity: {
          adults: room.type === 'single' ? 1 : room.type === 'suite' || room.type === 'villa' ? 4 : 2,
          children: room.type === 'suite' || room.type === 'villa' ? 2 : 1
        },
        status: 'available',
        images: [],
        isQrActive: true,
      }))
    );
    summary.rooms.created = rooms.length;
  } else {
    summary.rooms.existing = existingRoomCount;
  }

  // ============================================
  // 2. SEED MENU ITEMS
  // ============================================
  const existingMenuCount = await MenuItem.countDocuments({ hotel: hotelId });
  if (existingMenuCount === 0) {
    const menuItemsData = [
      // Breakfast
      { name: 'Pancakes', category: 'Breakfast', price: 12, description: 'Fluffy pancakes with maple syrup', preparationTime: 15, dietary: ['vegetarian'] },
      { name: 'Eggs Benedict', category: 'Breakfast', price: 15, description: 'Poached eggs on English muffin with hollandaise', preparationTime: 20 },
      { name: 'Continental Breakfast', category: 'Breakfast', price: 18, description: 'Fresh pastries, fruit, coffee, and juice', preparationTime: 10 },
      { name: 'Omelette', category: 'Breakfast', price: 10, description: 'Three-egg omelette with choice of fillings', preparationTime: 15, dietary: ['vegetarian'] },

      // Lunch
      { name: 'Caesar Salad', category: 'Lunch', price: 14, description: 'Classic Caesar with grilled chicken', preparationTime: 10 },
      { name: 'Club Sandwich', category: 'Lunch', price: 16, description: 'Triple-decker with turkey, bacon, and veggies', preparationTime: 15 },
      { name: 'Grilled Chicken Breast', category: 'Lunch', price: 22, description: 'Served with seasonal vegetables and mashed potatoes', preparationTime: 25 },
      { name: 'Pasta Carbonara', category: 'Lunch', price: 18, description: 'Creamy pasta with bacon and parmesan', preparationTime: 20 },

      // Dinner
      { name: 'Ribeye Steak', category: 'Dinner', price: 45, description: '12oz premium ribeye, cooked to perfection', preparationTime: 30 },
      { name: 'Grilled Salmon', category: 'Dinner', price: 38, description: 'Fresh Atlantic salmon with lemon butter sauce', preparationTime: 25 },
      { name: 'Lobster Thermidor', category: 'Dinner', price: 55, description: 'Classic French lobster dish', preparationTime: 35 },
      { name: 'Vegetarian Lasagna', category: 'Dinner', price: 24, description: 'Layered pasta with vegetables and cheese', preparationTime: 30, dietary: ['vegetarian'] },

      // Appetizers
      { name: 'Bruschetta', category: 'Appetizers', price: 8, description: 'Toasted bread with tomato, basil, and garlic', preparationTime: 10, dietary: ['vegetarian', 'vegan'] },
      { name: 'Calamari', category: 'Appetizers', price: 12, description: 'Crispy fried squid with marinara sauce', preparationTime: 15 },
      { name: 'Mozzarella Sticks', category: 'Appetizers', price: 9, description: 'Breaded mozzarella with marinara', preparationTime: 12, dietary: ['vegetarian'] },

      // Drinks
      { name: 'Fresh Orange Juice', category: 'Drinks', price: 6, description: 'Freshly squeezed orange juice', preparationTime: 5 },
      { name: 'Coffee', category: 'Drinks', price: 4, description: 'Freshly brewed coffee', preparationTime: 5, dietary: ['vegan'] },
      { name: 'Cappuccino', category: 'Drinks', price: 5, description: 'Espresso with steamed milk', preparationTime: 7, dietary: ['vegetarian'] },
      { name: 'Mojito', category: 'Drinks', price: 10, description: 'Classic mint mojito', preparationTime: 8 },
      { name: 'Red Wine (Glass)', category: 'Drinks', price: 12, description: 'House red wine', preparationTime: 2 },

      // Desserts
      { name: 'Chocolate Cake', category: 'Dessert', price: 10, description: 'Rich chocolate layer cake', preparationTime: 10, dietary: ['vegetarian'] },
      { name: 'Tiramisu', category: 'Dessert', price: 12, description: 'Classic Italian dessert', preparationTime: 10, dietary: ['vegetarian'] },
      { name: 'Ice Cream Sundae', category: 'Dessert', price: 8, description: 'Vanilla ice cream with toppings', preparationTime: 5, dietary: ['vegetarian'] },

      // Snacks
      { name: 'French Fries', category: 'Snacks', price: 6, description: 'Crispy golden fries', preparationTime: 10, dietary: ['vegan'] },
      { name: 'Chicken Wings', category: 'Snacks', price: 14, description: 'Spicy buffalo wings', preparationTime: 20, spiceLevel: 'hot' },
      { name: 'Nachos', category: 'Snacks', price: 11, description: 'Tortilla chips with cheese and toppings', preparationTime: 15, dietary: ['vegetarian'] },
    ];

    const menuItems = await MenuItem.insertMany(
      menuItemsData.map(item => ({
        ...item,
        hotel: hotelId,
        isAvailable: true,
        orderType: 'Room Service',
      }))
    );
    summary.menuItems.created = menuItems.length;
  } else {
    summary.menuItems.existing = existingMenuCount;
  }

  // ============================================
  // 3. SEED TABLES
  // ============================================
  const existingTableCount = await HotelTable.countDocuments({ hotel: hotelId });
  if (existingTableCount === 0) {
    const tablesData = [
      { tableNumber: 'T1', capacity: 2, location: 'Main Dining', status: 'available' },
      { tableNumber: 'T2', capacity: 4, location: 'Main Dining', status: 'occupied' },
      { tableNumber: 'T3', capacity: 4, location: 'Main Dining', status: 'available' },
      { tableNumber: 'T4', capacity: 6, location: 'Main Dining', status: 'reserved' },
      { tableNumber: 'T5', capacity: 2, location: 'Terrace', status: 'available' },
      { tableNumber: 'T6', capacity: 4, location: 'Terrace', status: 'available' },
      { tableNumber: 'T7', capacity: 8, location: 'Private Room', status: 'available' },
      { tableNumber: 'T8', capacity: 2, location: 'Bar Area', status: 'occupied' },
    ];

    const tables = await HotelTable.insertMany(
      tablesData.map(table => ({
        ...table,
        hotel: hotelId,
        isActive: true,
      }))
    );
    summary.tables.created = tables.length;
  } else {
    summary.tables.existing = existingTableCount;
  }

  // ============================================
  // 4. SEED STAFF (if none exist for this hotel)
  // ============================================
  const existingStaffCount = await User.countDocuments({
    company: company._id,
    assignedProperties: hotelId,
    companyRole: { $in: ['receptionist', 'housekeeping', 'chef', 'waiter', 'maintenance'] }
  });

  if (existingStaffCount === 0) {
    const staffData = [
      { fullname: 'John Receptionist', email: `receptionist_${hotelId}@test.com`, companyRole: 'receptionist' },
      { fullname: 'Mary Housekeeper', email: `housekeeper_${hotelId}@test.com`, companyRole: 'housekeeping' },
      { fullname: 'Chef Robert', email: `chef_${hotelId}@test.com`, companyRole: 'chef' },
      { fullname: 'Tom Waiter', email: `waiter_${hotelId}@test.com`, companyRole: 'waiter' },
    ];

    let staffCreated = 0;
    for (const staff of staffData) {
      const exists = await User.findOne({ email: staff.email });
      if (!exists) {
        await User.create({
          ...staff,
          username: staff.email.split('@')[0],
          password: 'Test@1234',
          company: company._id,
          assignedProperties: [hotelId],
          isActive: true,
          isEmailVerified: true,
          accountStatus: 'active',
        });
        staffCreated++;
      }
    }
    summary.staff.created = staffCreated;
  } else {
    summary.staff.existing = existingStaffCount;
  }

  // ============================================
  // 5. SEED ORDERS
  // ============================================
  const existingOrderCount = await Order.countDocuments({ hotel: hotelId });
  if (existingOrderCount === 0) {
    const rooms = await Room.find({ hotel: hotelId }).limit(5);
    const menuItems = await MenuItem.find({ hotel: hotelId }).limit(10);
    const tables = await HotelTable.find({ hotel: hotelId }).limit(3);

    if (rooms.length > 0 && menuItems.length > 0) {
      const ordersData = [
        // Room Service Orders
        {
          room: rooms[0]._id,
          roomNumber: rooms[0].roomNumber,
          items: [
            { menuItem: menuItems[0]._id, name: menuItems[0].name, quantity: 2, price: menuItems[0].price },
            { menuItem: menuItems[5]._id, name: menuItems[5].name, quantity: 1, price: menuItems[5].price },
          ],
          totalPrice: (menuItems[0].price * 2) + menuItems[5].price,
          orderType: 'roomService',
          status: 'pending',
          customerName: 'John Smith',
          isGuestOrder: true,
          paymentStatus: 'pending',
        },
        {
          room: rooms[1]._id,
          roomNumber: rooms[1].roomNumber,
          items: [
            { menuItem: menuItems[1]._id, name: menuItems[1].name, quantity: 1, price: menuItems[1].price },
            { menuItem: menuItems[16]._id, name: menuItems[16].name, quantity: 2, price: menuItems[16].price },
          ],
          totalPrice: menuItems[1].price + (menuItems[16].price * 2),
          orderType: 'roomService',
          status: 'preparing',
          customerName: 'Sarah Johnson',
          isGuestOrder: true,
          paymentStatus: 'pending',
        },
        {
          room: rooms[2]._id,
          roomNumber: rooms[2].roomNumber,
          items: [
            { menuItem: menuItems[8]._id, name: menuItems[8].name, quantity: 1, price: menuItems[8].price },
            { menuItem: menuItems[19]._id, name: menuItems[19].name, quantity: 1, price: menuItems[19].price },
          ],
          totalPrice: menuItems[8].price + menuItems[19].price,
          orderType: 'roomService',
          status: 'delivered',
          customerName: 'Michael Brown',
          isGuestOrder: true,
          paymentStatus: 'paid',
          paymentMethod: 'card',
          paidAt: new Date(),
          paidAmount: menuItems[8].price + menuItems[19].price,
          deliveredAt: new Date(Date.now() - 3600000), // 1 hour ago
        },
      ];

      // Dine-in Orders
      if (tables.length > 0) {
        ordersData.push(
          {
            tableNumber: tables[0].tableNumber,
            items: [
              { menuItem: menuItems[4]._id, name: menuItems[4].name, quantity: 2, price: menuItems[4].price },
              { menuItem: menuItems[17]._id, name: menuItems[17].name, quantity: 2, price: menuItems[17].price },
            ],
            totalPrice: (menuItems[4].price * 2) + (menuItems[17].price * 2),
            orderType: 'dineIn',
            status: 'confirmed',
            customerName: 'Emily Davis',
            isGuestOrder: false,
            paymentStatus: 'pending',
          },
          {
            tableNumber: tables[1].tableNumber,
            items: [
              { menuItem: menuItems[6]._id, name: menuItems[6].name, quantity: 3, price: menuItems[6].price },
              { menuItem: menuItems[13]._id, name: menuItems[13].name, quantity: 1, price: menuItems[13].price },
              { menuItem: menuItems[18]._id, name: menuItems[18].name, quantity: 3, price: menuItems[18].price },
            ],
            totalPrice: (menuItems[6].price * 3) + menuItems[13].price + (menuItems[18].price * 3),
            orderType: 'dineIn',
            status: 'ready',
            customerName: 'David Wilson',
            isGuestOrder: false,
            paymentStatus: 'pending',
          }
        );
      }

      const orders = await Order.insertMany(
        ordersData.map(order => ({
          ...order,
          hotel: hotelId,
        }))
      );
      summary.orders.created = orders.length;
    }
  } else {
    summary.orders.existing = existingOrderCount;
  }

  // ============================================
  // 6. SEED BOOKINGS
  // ============================================
  const existingBookingCount = await Booking.countDocuments({ hotel: hotelId });
  if (existingBookingCount === 0) {
    const rooms = await Room.find({ hotel: hotelId });

    if (rooms.length > 0) {
      const bookingsData = [
        {
          room: rooms[0]._id,
          checkIn: new Date(Date.now() + 86400000 * 2), // 2 days from now
          checkOut: new Date(Date.now() + 86400000 * 5), // 5 days from now
          guests: { adults: 2, children: 0 },
          totalAmount: rooms[0].price * 3,
          status: 'Confirmed',
          guestInfo: {
            name: 'Alice Cooper',
            email: 'alice@example.com',
            phone: '+1234567890',
          },
          paymentStatus: 'paid',
          bookingSource: 'web',
        },
        {
          room: rooms[1]._id,
          checkIn: new Date(Date.now() - 86400000), // yesterday
          checkOut: new Date(Date.now() + 86400000 * 2), // 2 days from now
          guests: { adults: 1, children: 0 },
          totalAmount: rooms[1].price * 3,
          status: 'Checked-In',
          guestInfo: {
            name: 'Bob Martin',
            email: 'bob@example.com',
            phone: '+1234567891',
          },
          paymentStatus: 'paid',
          bookingSource: 'admin',
        },
        {
          room: rooms[2]._id,
          checkIn: new Date(Date.now() + 86400000), // tomorrow
          checkOut: new Date(Date.now() + 86400000 * 4), // 4 days from now
          guests: { adults: 2, children: 1 },
          totalAmount: rooms[2].price * 3,
          status: 'Pending',
          guestInfo: {
            name: 'Charlie Brown',
            email: 'charlie@example.com',
            phone: '+1234567892',
          },
          paymentStatus: 'unpaid',
          bookingSource: 'Booking.com',
        },
        {
          room: rooms[3]._id,
          checkIn: new Date(Date.now() - 86400000 * 5), // 5 days ago
          checkOut: new Date(Date.now() - 86400000 * 2), // 2 days ago
          guests: { adults: 2, children: 0 },
          totalAmount: rooms[3].price * 3,
          status: 'Checked-Out',
          guestInfo: {
            name: 'Diana Prince',
            email: 'diana@example.com',
            phone: '+1234567893',
          },
          paymentStatus: 'paid',
          bookingSource: 'Walk-in',
        },
        {
          room: rooms[4]._id,
          checkIn: new Date(Date.now() + 86400000 * 7), // 7 days from now
          checkOut: new Date(Date.now() + 86400000 * 10), // 10 days from now
          guests: { adults: 4, children: 2 },
          totalAmount: rooms[4].price * 3,
          status: 'Confirmed',
          guestInfo: {
            name: 'Edward Norton',
            email: 'edward@example.com',
            phone: '+1234567894',
          },
          paymentStatus: 'partial',
          bookingSource: 'Agoda',
        },
      ];

      const bookings = await Booking.insertMany(
        bookingsData.map(booking => ({
          ...booking,
          hotel: hotelId,
          company: company._id,
        }))
      );
      summary.bookings.created = bookings.length;
    }
  } else {
    summary.bookings.existing = existingBookingCount;
  }

  // ============================================
  // 7. SEED INVOICES & TRANSACTIONS
  // ============================================
  const existingInvoiceCount = await Invoice.countDocuments({ hotel: hotelId });
  if (existingInvoiceCount === 0) {
    const bookings = await Booking.find({
      hotel: hotelId,
      paymentStatus: { $in: ['paid', 'partial'] }
    }).populate('room');

    if (bookings.length > 0) {
      for (const booking of bookings) {
        const nights = Math.ceil((booking.checkOut - booking.checkIn) / (1000 * 60 * 60 * 24));
        const roomCharge = booking.totalAmount * 0.85; // 85% for room
        const extrasCharge = booking.totalAmount * 0.15; // 15% for extras
        const taxRate = 13;
        const tax = (roomCharge + extrasCharge) * (taxRate / 100);
        const totalWithTax = roomCharge + extrasCharge + tax;

        const invoice = await Invoice.create({
          hotel: hotelId,
          company: company._id,
          booking: booking._id,
          guest: booking.guest,
          bookingRef: booking.bookingId,
          guestName: booking.guestInfo?.name,
          room: {
            type: booking.room?.type,
            number: booking.room?.roomNumber,
          },
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          nights: nights,
          charges: {
            room: roomCharge,
            extras: extrasCharge,
            taxRate: taxRate,
            tax: tax,
            total: totalWithTax,
          },
          paid: booking.paymentStatus === 'paid' ? totalWithTax : totalWithTax * 0.5,
          balance: booking.paymentStatus === 'paid' ? 0 : totalWithTax * 0.5,
          paymentMethod: booking.paymentStatus === 'paid' ? 'Credit Card' : 'Cash',
          status: booking.paymentStatus === 'paid' ? 'paid' : 'partial',
          issuedAt: booking.createdAt || new Date(),
          paidAt: booking.paymentStatus === 'paid' ? booking.createdAt : null,
        });
        summary.invoices.created++;

        // Create corresponding transaction
        await PaymentTransaction.create({
          hotel: hotelId,
          company: company._id,
          booking: booking._id,
          invoice: invoice._id,
          guest: booking.guest,
          type: 'capture',
          amount: invoice.paid,
          method: 'credit-card',
          reference: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          status: booking.paymentStatus === 'paid' ? 'settled' : 'captured',
          currency: 'USD',
        });
        summary.transactions.created++;
      }
    }
  } else {
    summary.invoices.existing = existingInvoiceCount;
  }

  res.status(201).json({
    success: true,
    message: 'Hotel admin dashboard data seeded successfully',
    summary,
  });
});
