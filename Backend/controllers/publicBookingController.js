import mongoose from "mongoose";
import crypto from "crypto";
import jsPDF from "jspdf";
import "jspdf-autotable";
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
  // Normalize dates to midnight for accurate comparison
  const newCheckIn = new Date(checkIn);
  newCheckIn.setHours(0, 0, 0, 0);

  const newCheckOut = new Date(checkOut);
  newCheckOut.setHours(0, 0, 0, 0);

  console.log('Checking availability for:', {
    roomId,
    newCheckIn: newCheckIn.toISOString(),
    newCheckOut: newCheckOut.toISOString(),
  });

  // Find conflicting bookings
  // A conflict exists if:
  // - Existing booking starts before new booking ends AND
  // - Existing booking ends after new booking starts
  // BUT: Check-out day is when guest leaves, so room is available that day
  // So we need: existingCheckOut > newCheckIn (not >=)
  const conflicts = await Booking.find({
    room: roomId,
    status: { $in: ["Confirmed", "Checked-In", "Pending"] },
  });

  console.log(`Found ${conflicts.length} existing bookings for this room`);

  // Check each booking for actual overlap
  for (const booking of conflicts) {
    const existingCheckIn = new Date(booking.checkIn);
    existingCheckIn.setHours(0, 0, 0, 0);

    const existingCheckOut = new Date(booking.checkOut);
    existingCheckOut.setHours(0, 0, 0, 0);

    console.log('Comparing with existing booking:', {
      bookingId: booking.bookingId,
      existingCheckIn: existingCheckIn.toISOString(),
      existingCheckOut: existingCheckOut.toISOString(),
    });

    // Check for overlap
    // Overlap exists if: existingCheckIn < newCheckOut AND existingCheckOut > newCheckIn
    // BUT: Since checkout day means room is vacated, we use strict inequality
    const hasOverlap = existingCheckIn < newCheckOut && existingCheckOut > newCheckIn;

    if (hasOverlap) {
      console.log('CONFLICT FOUND:', {
        existingCheckIn: existingCheckIn.toISOString(),
        existingCheckOut: existingCheckOut.toISOString(),
        newCheckIn: newCheckIn.toISOString(),
        newCheckOut: newCheckOut.toISOString(),
      });
      return false; // Room not available
    }
  }

  console.log('No conflicts found - room is available');
  return true; // Room is available
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
 * REQUIRES AUTHENTICATION - User must be logged in
 * POST /api/public/bookings/create-with-payment
 */
export const createBookingWithPayment = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('=== AUTHENTICATED BOOKING REQUEST ===');
    console.log('User:', req.user.email);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Get authenticated user
    const authenticatedUser = req.user;
    if (!authenticatedUser) {
      throw Object.assign(new Error("Authentication required to create booking"), { status: 401 });
    }

    const {
      // Booking details
      hotelId,
      roomId,
      checkIn,
      checkOut,
      guests,
      specialRequests,
      // Guest details (optional - defaults to authenticated user)
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
    console.log('Validating input...');

    if (!hotelId || !roomId || !checkIn || !checkOut || !paymentMethod) {
      const missingFields = [];
      if (!hotelId) missingFields.push('hotelId');
      if (!roomId) missingFields.push('roomId');
      if (!checkIn) missingFields.push('checkIn');
      if (!checkOut) missingFields.push('checkOut');
      if (!paymentMethod) missingFields.push('paymentMethod');

      console.error('Missing required fields:', missingFields);
      throw Object.assign(
        new Error(`Missing required fields: ${missingFields.join(', ')}`),
        { status: 400 }
      );
    }

    // Use authenticated user's details as default, allow override for booking on behalf of others
    const finalGuestName = guestName || authenticatedUser.fullname || authenticatedUser.username;
    const finalGuestEmail = guestEmail || authenticatedUser.email;
    const finalGuestPhone = guestPhone || authenticatedUser.phone || '';

    // Validate guest name
    if (!finalGuestName || finalGuestName.trim().length < 2) {
      throw Object.assign(new Error("Guest name must be at least 2 characters"), { status: 400 });
    }

    // Validate phone if provided
    let cleanPhone = '';
    if (finalGuestPhone) {
      cleanPhone = finalGuestPhone.replace(/\D/g, "");
      if (cleanPhone && !/^\d{10,}$/.test(cleanPhone)) {
        throw Object.assign(new Error("Invalid phone number format (minimum 10 digits)"), { status: 400 });
      }
    }

    // Validate email
    if (!finalGuestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalGuestEmail)) {
      throw Object.assign(new Error("Valid email is required"), { status: 400 });
    }

    // Validate payment method
    if (!["esewa", "khalti", "card", "bank", "bank-transfer"].includes(paymentMethod)) {
      throw Object.assign(new Error("Invalid payment method"), { status: 400 });
    }

    // Validate dates
    validateDates(checkIn, checkOut);

    // ============================================
    // 2. VERIFY HOTEL AND ROOM
    // ============================================
    console.log('Verifying hotel and room...');

    const hotel = await Hotel.findById(hotelId).session(session);
    if (!hotel) {
      console.error('Hotel not found:', hotelId);
      throw Object.assign(new Error("Hotel not found"), { status: 404 });
    }
    console.log('Hotel found:', hotel.name);

    const room = await Room.findById(roomId).session(session);
    if (!room) {
      console.error('Room not found:', roomId);
      throw Object.assign(new Error("Room not found"), { status: 404 });
    }
    console.log('Room found:', room.roomName || room.title);

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

    console.log('Booking calculation:', {
      nights,
      roomPrice: room.price,
      subtotal,
      taxesAndFees,
      totalAmount
    });

    // ============================================
    // 4. CREATE BOOKING (PENDING STATUS)
    // ============================================
    const bookingId = generateBookingId();
    const confirmationCode = generateConfirmationCode();

    const bookingData = {
      bookingId,
      confirmationCode,
      user: authenticatedUser._id, // Link to authenticated user
      guestInfo: {
        name: finalGuestName,
        phone: cleanPhone,
        email: finalGuestEmail,
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
        console.log('Processing eSewa payment...');

        paymentResult = generateEsewaPaymentData({
          amount: totalAmount,
          taxAmount: 0,
          orderId: booking._id.toString(),
        });

        console.log('eSewa payment data generated:', {
          formUrl: paymentResult.formUrl,
          transactionUuid: paymentResult.transactionUuid,
          amount: totalAmount,
        });

        // Store payment reference
        booking.paymentReference = paymentResult.transactionUuid;
        await booking.save({ session });

        await session.commitTransaction();

        console.log('eSewa booking created successfully:', booking.bookingId);

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
              company: hotel.company,
              booking: booking._id,
              amount: totalAmount,
              currency: "NPR",
              method: "card",
              type: "capture",
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
      } else if (paymentMethod === "bank" || paymentMethod === "bank-transfer") {
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
        booking.paymentMethod = "bank-transfer";
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
              company: hotel.company,
              booking: booking._id,
              amount: totalAmount,
              currency: "NPR",
              method: "bank-transfer",
              type: "capture",
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
              method: "bank-transfer",
              status: "pending",
            },
          },
        });
      }
    } catch (paymentError) {
      console.error("Payment processing error:", paymentError);
      console.error("Payment error stack:", paymentError.stack);
      // Only abort if transaction is still active
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw Object.assign(new Error(`Payment failed: ${paymentError.message}`), { status: 400 });
    }
  } catch (error) {
    console.error("Booking creation error:", error);
    console.error("Error stack:", error.stack);
    // Only abort if transaction is still active
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
});

/**
 * Get booking details by ID
 * Public endpoint - no authentication required
 * GET /api/public/bookings/:bookingId
 */
export const getBookingDetails = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  console.log('Fetching booking details for:', bookingId);

  // Find booking by MongoDB _id
  const booking = await Booking.findById(bookingId)
    .populate('hotel', 'name location images')
    .populate('room', 'roomName title price')
    .lean();

  if (!booking) {
    throw Object.assign(new Error("Booking not found"), { status: 404 });
  }

  // Return booking details with confirmation code
  res.status(200).json({
    success: true,
    data: {
      _id: booking._id,
      bookingId: booking.bookingId,
      confirmationCode: booking.confirmationCode,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      totalAmount: booking.totalAmount,
      paidAmount: booking.paidAmount,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests,
      guestInfo: booking.guestInfo,
      hotelName: booking.hotel?.name,
      hotelAddress: booking.hotel?.location?.address,
      hotelImage: booking.hotel?.images?.[0],
      roomType: booking.room?.roomName || booking.room?.title,
    },
  });
});

/**
 * Generate booking confirmation PDF
 * Public endpoint - no authentication required
 * GET /api/public/bookings/:bookingId/confirmation-pdf
 */
export const generateBookingConfirmationPDF = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  console.log('Generating PDF for booking:', bookingId);

  // Find booking by MongoDB _id
  const booking = await Booking.findById(bookingId)
    .populate('hotel', 'name location phone email images')
    .populate('room', 'roomName title price')
    .lean();

  if (!booking) {
    throw Object.assign(new Error("Booking not found"), { status: 404 });
  }

  // Create PDF document
  const doc = new jsPDF();

  // Colors
  const primaryColor = [13, 148, 136]; // teal-600
  const secondaryColor = [100, 116, 139]; // slate-600
  const successColor = [16, 185, 129]; // green-500

  // Header with hotel name
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text(booking.hotel?.name || 'StayHaven', 20, 20);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(booking.hotel?.location?.address || '', 20, 28);
  doc.text(`Phone: ${booking.hotel?.phone || 'N/A'} | Email: ${booking.hotel?.email || 'N/A'}`, 20, 34);

  // Confirmation badge
  doc.setFillColor(...successColor);
  doc.roundedRect(150, 10, 45, 20, 3, 3, 'F');
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('CONFIRMED', 157, 22);

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Booking confirmation section
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Booking Confirmation', 20, 55);

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text('Thank you for choosing us! Your booking has been confirmed.', 20, 63);

  // Confirmation details box
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, 70, 170, 25, 2, 2);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Confirmation Code:', 25, 78);
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text(booking.confirmationCode || booking.bookingId, 25, 86);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Booking Date: ${new Date(booking.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`, 110, 78);
  doc.text(`Payment Status: ${booking.paymentStatus.toUpperCase()}`, 110, 86);

  // Guest information
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Guest Information', 20, 108);

  const guestData = [
    ['Name', booking.guestInfo?.name || 'N/A'],
    ['Email', booking.guestInfo?.email || 'N/A'],
    ['Phone', booking.guestInfo?.phone || 'N/A'],
  ];

  doc.autoTable({
    startY: 112,
    head: [],
    body: guestData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 130 }
    },
    margin: { left: 20 }
  });

  // Booking details
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Booking Details', 20, doc.lastAutoTable.finalY + 15);

  const checkInDate = new Date(booking.checkIn);
  const checkOutDate = new Date(booking.checkOut);
  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

  const bookingData = [
    ['Check-in', checkInDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })],
    ['Check-out', checkOutDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })],
    ['Number of Nights', `${nights} night${nights > 1 ? 's' : ''}`],
    ['Room Type', booking.room?.roomName || booking.room?.title || 'N/A'],
    ['Guests', `${booking.guests?.adults || 0} Adult${booking.guests?.adults > 1 ? 's' : ''}${booking.guests?.children > 0 ? `, ${booking.guests.children} Child${booking.guests.children > 1 ? 'ren' : ''}` : ''}`],
  ];

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 19,
    head: [],
    body: bookingData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 130 }
    },
    margin: { left: 20 }
  });

  // Payment summary
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Payment Summary', 20, doc.lastAutoTable.finalY + 15);

  const subtotal = booking.totalAmount / 1.12; // Assuming 12% tax
  const tax = booking.totalAmount - subtotal;

  const paymentData = [
    ['Room Charges', `NPR ${subtotal.toFixed(2)}`],
    ['Taxes & Fees (12%)', `NPR ${tax.toFixed(2)}`],
    ['Total Amount', `NPR ${booking.totalAmount.toFixed(2)}`],
    ['Amount Paid', `NPR ${(booking.paidAmount || booking.totalAmount).toFixed(2)}`],
    ['Payment Method', booking.paymentMethod || 'N/A'],
  ];

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 19,
    head: [],
    body: paymentData,
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right', cellWidth: 70 }
    },
    margin: { left: 20, right: 20 }
  });

  // Important information
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Important Information', 20, doc.lastAutoTable.finalY + 15);

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...secondaryColor);
  const importantInfo = [
    '• Check-in time: 2:00 PM | Check-out time: 12:00 PM',
    '• Please bring a valid ID proof at the time of check-in',
    '• Cancellation policy applies as per hotel terms and conditions',
    '• For any queries, please contact the hotel directly',
  ];

  let yPos = doc.lastAutoTable.finalY + 22;
  importantInfo.forEach(info => {
    doc.text(info, 20, yPos);
    yPos += 5;
  });

  // Footer
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, 270, 190, 270);

  doc.setTextColor(...secondaryColor);
  doc.setFontSize(8);
  doc.text('This is a computer-generated document and does not require a signature.', 105, 278, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 105, 283, { align: 'center' });

  // Generate PDF buffer
  const pdfBuffer = doc.output('arraybuffer');

  // Send PDF
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=booking-confirmation-${booking.confirmationCode || booking.bookingId}.pdf`);
  res.send(Buffer.from(pdfBuffer));
});
