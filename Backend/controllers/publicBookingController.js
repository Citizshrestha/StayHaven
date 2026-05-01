import mongoose from "mongoose";
import crypto from "crypto";
import { Booking } from "../models/booking.schema.js";
import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { User } from "../models/user.schema.js";
import { Role } from "../models/role.schema.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  initiateKhaltiPayment,
  generateEsewaPaymentData,
  createStripePaymentIntent,
} from "../services/paymentGatewayService.js";

// Helper function to generate unique booking ID
const generateBookingId = () => {
  return `BK-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

// Helper function to generate unique confirmation code
const generateConfirmationCode = () => {
  return `SH${Date.now().toString().slice(-6)}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
};

// Helper function to validate dates
const validateDates = (checkIn, checkOut) => {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);

  inDate.setHours(0, 0, 0, 0);
  outDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (inDate >= outDate) {
    throw Object.assign(new Error("Check-out date must be after check-in date"), { status: 400 });
  }

  if (inDate < today) {
    throw Object.assign(new Error("Check-in date cannot be in the past"), { status: 400 });
  }
};

// Helper function to check room availability
const checkRoomAvailability = async (roomId, checkIn, checkOut) => {
  const conflicts = await Booking.findOne({
    room: roomId,
    status: { $in: ["Confirmed", "Checked-In", "Pending"] },
    $or: [
      {
        checkIn: { $lt: new Date(checkOut) },
        checkOut: { $gt: new Date(checkIn) },
      },
    ],
  });
  return !conflicts;
};

// Get or create guest role
const getOrCreateGuestRole = async () => {
  let guestRole = await Role.findOne({ name: "guest" });
  if (!guestRole) {
    guestRole = await Role.create({ name: "guest" });
  }
  return guestRole;
};

/**
 * Create booking with payment
 * Public endpoint - no authentication required
 * POST /api/public/bookings/create-with-payment
 */
export const createBookingWithPayment = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      // Booking details
      hotelId,
      roomId,
      checkIn,
      checkOut,
      guests,
      specialRequests,
      // Guest details
      guestName,
      guestEmail,
      guestPhone,
      // Payment details
      paymentMethod, // 'esewa', 'khalti', 'card', 'bank'
      cardDetails, // For card payments
      bankTransferDetails, // For bank transfer
    } = req.body;

    // ============================================
    // 1. VALIDATE INPUT
    // ============================================
    if (!hotelId || !roomId || !checkIn || !checkOut || !guestName || !guestPhone || !paymentMethod) {
      throw Object.assign(
        new Error("Missing required fields: hotelId, roomId, checkIn, checkOut, guestName, guestPhone, paymentMethod"),
        { status: 400 }
      );
    }

    // Validate guest name
    if (guestName.trim().length < 2) {
      throw Object.assign(new Error("Guest name must be at least 2 characters"), { status: 400 });
    }

    // Validate phone
    const cleanPhone = guestPhone.replace(/\D/g, "");
    if (!/^\d{10,}$/.test(cleanPhone)) {
      throw Object.assign(new Error("Invalid phone number format (minimum 10 digits)"), { status: 400 });
    }

    // Validate email if provided
    if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      throw Object.assign(new Error("Invalid email format"), { status: 400 });
    }

    // Validate payment method
    if (!["esewa", "khalti", "card", "bank"].includes(paymentMethod)) {
      throw Object.assign(new Error("Invalid payment method"), { status: 400 });
    }

    // Validate dates
    validateDates(checkIn, checkOut);

    // ============================================
    // 2. VERIFY HOTEL AND ROOM
    // ============================================
    const hotel = await Hotel.findById(hotelId).session(session);
    if (!hotel) {
      throw Object.assign(new Error("Hotel not found"), { status: 404 });
    }

    const room = await Room.findById(roomId).session(session);
    if (!room) {
      throw Object.assign(new Error("Room not found"), { status: 404 });
    }

    if (room.hotel.toString() !== hotelId.toString()) {
      throw Object.assign(new Error("Room does not belong to this hotel"), { status: 400 });
    }

    if (room.status !== "available") {
      throw Object.assign(new Error(`Room is currently ${room.status} and cannot be booked`), { status: 400 });
    }

    // Check room availability
    const isAvailable = await checkRoomAvailability(roomId, checkIn, checkOut);
    if (!isAvailable) {
      throw Object.assign(new Error("Room is already booked for selected dates"), { status: 400 });
    }

    // ============================================
    // 3. CALCULATE TOTAL AMOUNT
    // ============================================
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const subtotal = room.price * nights;
    const taxesAndFees = Math.round(subtotal * 0.12); // 12% tax
    const totalAmount = subtotal + taxesAndFees;

    // ============================================
    // 4. CREATE OR FIND GUEST USER
    // ============================================
    let guestUser = null;
    if (guestEmail) {
      guestUser = await User.findOne({ email: guestEmail }).session(session);
      if (!guestUser) {
        const guestRole = await getOrCreateGuestRole();
        guestUser = await User.create(
          [
            {
              fullname: guestName,
              username: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              email: guestEmail,
              password: crypto.randomBytes(16).toString("hex"),
              role: guestRole._id,
            },
          ],
          { session }
        );
        guestUser = guestUser[0];
      }
    }

    // ============================================
    // 5. CREATE BOOKING (PENDING STATUS)
    // ============================================
    const bookingId = generateBookingId();
    const confirmationCode = generateConfirmationCode();

    const bookingData = {
      bookingId,
      confirmationCode,
      user: guestUser?._id,
      guestInfo: {
        name: guestName,
        phone: cleanPhone,
        email: guestEmail || "",
      },
      hotel: hotelId,
      company: hotel.company,
      room: roomId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests: {
        adults: guests?.adults || 2,
        children: guests?.children || 0,
      },
      totalAmount,
      currency: "NPR",
      status: "Pending", // Will be updated to Confirmed after payment
      paymentStatus: "unpaid",
      specialRequests: specialRequests || "",
      bookingSource: "web",
    };

    const [booking] = await Booking.create([bookingData], { session });

    // ============================================
    // 6. PROCESS PAYMENT
    // ============================================
    let paymentResult = null;
    let transactionId = null;

    try {
      if (paymentMethod === "khalti") {
        // Khalti redirect payment
        paymentResult = await initiateKhaltiPayment({
          amount: totalAmount,
          orderId: booking._id.toString(),
          orderName: `Booking at ${hotel.name}`,
          customer: {
            name: guestName,
            email: guestEmail || "guest@stayhaven.com",
            phone: cleanPhone,
          },
        });

        // Store payment reference
        booking.paymentReference = paymentResult.pidx;
        await booking.save({ session });

        await session.commitTransaction();

        return res.status(200).json({
          success: true,
          message: "Booking created. Redirecting to Khalti for payment...",
          requiresRedirect: true,
          redirectType: "url",
          paymentUrl: paymentResult.paymentUrl,
          booking: {
            _id: booking._id,
            bookingId: booking.bookingId,
            confirmationCode: booking.confirmationCode,
          },
        });
      } else if (paymentMethod === "esewa") {
        // eSewa form POST redirect
        paymentResult = generateEsewaPaymentData({
          amount: totalAmount,
          taxAmount: 0,
          orderId: booking._id.toString(),
        });

        // Store payment reference
        booking.paymentReference = paymentResult.transactionUuid;
        await booking.save({ session });

        await session.commitTransaction();

        return res.status(200).json({
          success: true,
          message: "Booking created. Redirecting to eSewa for payment...",
          requiresRedirect: true,
          redirectType: "form-post",
          formUrl: paymentResult.formUrl,
          formData: paymentResult.formData,
          booking: {
            _id: booking._id,
            bookingId: booking.bookingId,
            confirmationCode: booking.confirmationCode,
          },
        });
      } else if (paymentMethod === "card") {
        // Card payment via Stripe
        if (!cardDetails || !cardDetails.number || !cardDetails.name || !cardDetails.expiry || !cardDetails.cvv) {
          throw Object.assign(new Error("Card details are required for card payment"), { status: 400 });
        }

        // In development mode, simulate successful payment
        // In production, you would integrate with Stripe properly
        const isDevelopment = process.env.NODE_ENV !== "production";

        if (isDevelopment) {
          // Simulate successful payment in development
          transactionId = `CARD-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        } else {
          // Production: Create Stripe Payment Intent
          paymentResult = await createStripePaymentIntent({
            amount: totalAmount,
            currency: "npr",
            metadata: {
              orderId: booking._id.toString(),
              bookingId: booking.bookingId,
              hotelName: hotel.name,
            },
          });

          transactionId = paymentResult.paymentIntentId || `CARD-${Date.now()}`;
        }

        // Update booking status
        booking.status = "Confirmed";
        booking.paymentStatus = "paid";
        booking.paymentMethod = "card";
        booking.paymentReference = transactionId;
        booking.paidAt = new Date();
        booking.paidAmount = totalAmount;
        await booking.save({ session });

        // Create payment transaction record
        await PaymentTransaction.create(
          [
            {
              transactionId,
              hotel: hotelId,
              booking: booking._id,
              amount: totalAmount,
              method: "card",
              reference: transactionId,
              status: "captured",
              processedAt: new Date(),
            },
          ],
          { session }
        );

        await session.commitTransaction();

        return res.status(200).json({
          success: true,
          message: "Booking confirmed and payment successful!",
          data: {
            booking: {
              _id: booking._id,
              bookingId: booking.bookingId,
              confirmationCode: booking.confirmationCode,
              status: booking.status,
              paymentStatus: booking.paymentStatus,
              totalAmount: booking.totalAmount,
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              hotelName: hotel.name,
              hotelAddress: hotel.location?.address,
              roomType: room.roomName || room.title,
              guests: booking.guests,
            },
            transaction: {
              transactionId,
              amount: totalAmount,
              method: "card",
              status: "captured",
            },
          },
        });
      } else if (paymentMethod === "bank") {
        // Bank transfer - requires manual verification
        if (
          !bankTransferDetails ||
          !bankTransferDetails.accountName ||
          !bankTransferDetails.accountNumber ||
          !bankTransferDetails.bankName ||
          !bankTransferDetails.transactionId
        ) {
          throw Object.assign(new Error("Bank transfer details are required"), { status: 400 });
        }

        transactionId = `BANK-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

        // Store bank transfer details in payment reference
        booking.paymentMethod = "bank";
        booking.paymentReference = JSON.stringify({
          transactionId: bankTransferDetails.transactionId,
          accountName: bankTransferDetails.accountName,
          accountNumber: bankTransferDetails.accountNumber,
          bankName: bankTransferDetails.bankName,
        });
        await booking.save({ session });

        // Create payment transaction record (pending verification)
        await PaymentTransaction.create(
          [
            {
              transactionId,
              hotel: hotelId,
              booking: booking._id,
              amount: totalAmount,
              method: "bank",
              reference: bankTransferDetails.transactionId,
              status: "pending", // Requires manual verification
              processedAt: new Date(),
            },
          ],
          { session }
        );

        await session.commitTransaction();

        return res.status(200).json({
          success: true,
          message: "Booking created. Bank transfer details submitted for verification.",
          requiresVerification: true,
          data: {
            booking: {
              _id: booking._id,
              bookingId: booking.bookingId,
              confirmationCode: booking.confirmationCode,
              status: booking.status,
              paymentStatus: booking.paymentStatus,
              totalAmount: booking.totalAmount,
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              hotelName: hotel.name,
              hotelAddress: hotel.location?.address,
              roomType: room.roomName || room.title,
              guests: booking.guests,
            },
            transaction: {
              transactionId,
              amount: totalAmount,
              method: "bank",
              status: "pending",
            },
          },
        });
      }
    } catch (paymentError) {
      console.error("Payment processing error:", paymentError);
      await session.abortTransaction();
      throw Object.assign(new Error(`Payment failed: ${paymentError.message}`), { status: 400 });
    }
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});
