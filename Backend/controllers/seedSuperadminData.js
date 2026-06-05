import mongoose from 'mongoose';
import { Booking } from '../models/booking.schema.js';
import { Hotel } from '../models/hotel.schema.js';
import { Room } from '../models/room.schema.js';
import { User } from '../models/user.schema.js';
import { Company } from '../models/company.schema.js';

/**
 * Seed Superadmin Dashboard Data
 * Creates realistic bookings and hotel data with NPR currency
 */

export const runSeedSuperadminData = async () => {
    // Get or create owner user (superadmin)
    let ownerUser = await User.findOne({ email: 'superadmin@stayhaven.com' });
    if (!ownerUser) {
      ownerUser = await User.findOne({ role: 'superadmin' }).limit(1);
    }

    if (!ownerUser) {
      return {
        success: false,
        message: 'No superadmin user found. Please ensure superadmin exists first.'
      };
    }

    // Get or create a default company
    let company = await Company.findOne({ name: /StayHaven/i });
    if (!company) {
      company = await Company.create({
        name: 'StayHaven Nepal',
        legalName: 'StayHaven Hotels & Resorts Pvt. Ltd.',
        type: 'hotel_chain',
        description: 'Nepal hotel chain',
        contact: {
          phone: '+977-1-4123456',
          email: 'info@stayhaven.com.np',
          website: 'https://stayhaven.com.np'
        },
        address: {
          street: 'Thamel Marg',
          city: 'Kathmandu',
          state: 'Bagmati',
          country: 'Nepal',
          postalCode: '44600'
        },
        logo: 'https://via.placeholder.com/150',
        owner: ownerUser._id,
        isActive: true,
        isVerified: true,
        status: 'active'
      });
    }

    // Get or create hotels with NPR pricing
    const hotelData = [
      {
        name: 'Hotel Annapurna',
        description: 'Luxury hotel in the heart of Kathmandu with stunning mountain views',
        category: 'Hotel',
        starRating: 5,
        location: {
          address: 'Durbar Marg, Kathmandu',
          city: 'Kathmandu',
          country: 'Nepal'
        },
        priceRange: { min: 8500, max: 25000 },
        amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Spa'],
        images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
        contact: { email: 'info@hotelannapurna.com', phone: '+977-1-4221711' },
        status: 'approved',
        isActive: true,
        owner: ownerUser._id,
        company: company._id
      },
      {
        name: 'Soaltee Crowne Plaza',
        description: 'Premium 5-star hotel with world-class facilities',
        category: 'Hotel',
        starRating: 5,
        location: {
          address: 'Tahachal, Kathmandu',
          city: 'Kathmandu',
          country: 'Nepal'
        },
        priceRange: { min: 12000, max: 35000 },
        amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Bar', 'Spa'],
        images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800'],
        contact: { email: 'info@soaltee.com', phone: '+977-1-4273999' },
        status: 'approved',
        isActive: true,
        owner: ownerUser._id,
        company: company._id
      },
      {
        name: 'Hotel Yak & Yeti',
        description: 'Historic luxury hotel blending tradition with modern comfort',
        category: 'Hotel',
        starRating: 5,
        location: {
          address: 'Durbar Marg, Kathmandu',
          city: 'Kathmandu',
          country: 'Nepal'
        },
        priceRange: { min: 9500, max: 28000 },
        amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant'],
        images: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800'],
        contact: { email: 'info@yakyeti.com', phone: '+977-1-4248999' },
        status: 'approved',
        isActive: true,
        owner: ownerUser._id,
        company: company._id
      },
      {
        name: 'Temple Tree Resort & Spa',
        description: 'Boutique resort in the tranquil lakeside of Pokhara',
        category: 'Resort',
        starRating: 4,
        location: {
          address: 'Gaurighat, Lakeside',
          city: 'Pokhara',
          country: 'Nepal'
        },
        priceRange: { min: 7500, max: 18000 },
        amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant'],
        images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800'],
        contact: { email: 'info@templetree.com.np', phone: '+977-61-465819' },
        status: 'approved',
        isActive: true,
        owner: ownerUser._id,
        company: company._id
      },
      {
        name: 'Dwarika\'s Hotel',
        description: 'Heritage hotel showcasing Nepalese architecture and culture',
        category: 'Hotel',
        starRating: 5,
        location: {
          address: 'Battisputali, Kathmandu',
          city: 'Kathmandu',
          country: 'Nepal'
        },
        priceRange: { min: 15000, max: 45000 },
        amenities: ['WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Bar'],
        images: ['https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800'],
        contact: { email: 'info@dwarikas.com', phone: '+977-1-4479488' },
        status: 'approved',
        isActive: true,
        owner: ownerUser._id,
        company: company._id
      },
      {
        name: 'Kathmandu Guest House',
        description: 'Popular budget hotel in the heart of Thamel',
        category: 'Guest House',
        starRating: 3,
        location: {
          address: 'Thamel, Kathmandu',
          city: 'Kathmandu',
          country: 'Nepal'
        },
        priceRange: { min: 2500, max: 6000 },
        amenities: ['WiFi', 'Restaurant'],
        images: ['https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800'],
        contact: { email: 'info@ktmgh.com', phone: '+977-1-4700632' },
        status: 'approved',
        isActive: true,
        owner: ownerUser._id,
        company: company._id
      }
    ];

    const hotels = [];
    for (const hotelInfo of hotelData) {
      let hotel = await Hotel.findOne({ name: hotelInfo.name });
      if (!hotel) {
        hotel = await Hotel.create(hotelInfo);
      }
      hotels.push(hotel);
    }

    // Get or create test users
    const guestRole = await mongoose.model('Role').findOne({ name: 'guest' });
    if (!guestRole) {
      return {
        success: false,
        message: 'Guest role not found. Please ensure roles are seeded first.'
      };
    }

    const guestData = [
      { fullname: 'Rajesh Kumar', username: 'rajesh.kumar', email: 'rajesh.kumar@gmail.com', phone: '+977-9841234567' },
      { fullname: 'Sita Sharma', username: 'sita.sharma', email: 'sita.sharma@yahoo.com', phone: '+977-9851234567' },
      { fullname: 'Amit Thapa', username: 'amit.thapa', email: 'amit.thapa@hotmail.com', phone: '+977-9861234567' },
      { fullname: 'Priya Rai', username: 'priya.rai', email: 'priya.rai@gmail.com', phone: '+977-9871234567' },
      { fullname: 'Bikash Gurung', username: 'bikash.gurung', email: 'bikash.gurung@gmail.com', phone: '+977-9881234567' }
    ];

    const users = [];
    for (const guestInfo of guestData) {
      let user = await User.findOne({ email: guestInfo.email });
      if (!user) {
        user = await User.create({
          ...guestInfo,
          password: 'Test@123',
          role: guestRole._id
        });
      }
      users.push(user);
    }

    // Create rooms for each hotel
    for (const hotel of hotels) {
      const existingRooms = await Room.findOne({ hotel: hotel._id });
      if (!existingRooms) {
        await Room.create([
          {
            hotel: hotel._id,
            company: company._id,
            roomName: 'Deluxe Room',
            roomNumber: '101',
            type: 'deluxe',
            price: hotel.priceRange.min,
            maxGuests: 2,
            amenities: ['WiFi', 'AC', 'TV'],
            status: 'available',
            bedType: 'Queen'
          },
          {
            hotel: hotel._id,
            company: company._id,
            roomName: 'Executive Suite',
            roomNumber: '201',
            type: 'suite',
            price: hotel.priceRange.max,
            maxGuests: 4,
            amenities: ['WiFi', 'AC', 'TV', 'Balcony'],
            status: 'available',
            bedType: 'King'
          }
        ]);
      }
    }

    // Create diverse bookings with NPR amounts
    const existingBookings = await Booking.countDocuments();
    if (existingBookings < 100) {
      const bookingsToCreate = [];
      const statuses = ['Confirmed', 'Checked-In', 'Checked-Out', 'Pending'];
      const paymentStatuses = ['paid', 'unpaid', 'partial'];

      for (let i = 0; i < 30; i++) {
        const hotel = hotels[Math.floor(Math.random() * hotels.length)];
        const user = users[Math.floor(Math.random() * users.length)];
        const rooms = await Room.find({ hotel: hotel._id });
        const room = rooms[Math.floor(Math.random() * rooms.length)];

        const daysAgo = Math.floor(Math.random() * 30);
        const checkInDate = new Date();
        checkInDate.setDate(checkInDate.getDate() - daysAgo);

        const nights = Math.floor(Math.random() * 5) + 1;
        const checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + nights);

        const totalAmount = room.price * nights;
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const paymentStatus = status === 'Confirmed' || status === 'Checked-In' || status === 'Checked-Out'
          ? 'paid'
          : paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

        bookingsToCreate.push({
          user: user._id,
          guestInfo: {
            name: user.fullname,
            phone: user.phone,
            email: user.email
          },
          hotel: hotel._id,
          company: company._id,
          room: room._id,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guests: {
            adults: Math.floor(Math.random() * 3) + 1,
            children: Math.floor(Math.random() * 2)
          },
          totalAmount: totalAmount,
          currency: 'NPR',
          status: status,
          paymentStatus: paymentStatus,
          bookingSource: 'web',
          durationNights: nights,
          createdAt: checkInDate
        });
      }

      await Booking.insertMany(bookingsToCreate);
    }

    return {
      success: true,
      message: 'Superadmin dashboard data seeded successfully',
      data: {
        hotels: hotels.length,
        users: users.length,
        bookings: await Booking.countDocuments()
      }
    };
};

export const seedSuperadminData = async (req, res) => {
  try {
    const result = await runSeedSuperadminData();
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('Error seeding superadmin data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed superadmin data',
      error: error.message
    });
  }
};
