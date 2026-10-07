import mongoose from "mongoose";
import crypto from "crypto";
import jsPDF from "jspdf";
import "jspdf-autotable";
import QRCode from "qrcode";
import { Booking } from "../models/booking.schema.js";
import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { User } from "../models/user.schema.js";
import { Role } from "../models/role.schema.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createLogger } from "../utils/logger.js";
import { validateStayDates, findReservationConflict } from "../services/bookingAvailability.js";
import { bookingQuote } from "../utils/paymentMoney.js";

const logger = createLogger('PublicBookingController');
import {
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
const validateDates = validateStayDates;

const checkRoomAvailability = async (roomId, checkIn, checkOut, session) =>
  !(await findReservationConflict({ room: roomId, checkIn, checkOut, session }));

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

    // Get authenticated user
    const authenticatedUser = req.user;
    if (!authenticatedUser) {
      console.error('Authentication failed: No user found in request');
      throw Object.assign(new Error("Authentication required to create booking"), { status: 401 });
    }

    logger.debug('Authenticated user:', {
      id: authenticatedUser._id,
      username: authenticatedUser.username,
      email: authenticatedUser.email
    });

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
      // Note: raw card data (number/CVV) is intentionally never accepted
      // here — card payments are collected client-side via Stripe Elements
      // and confirmed through verify-card-payment. See the "card" branch.
      bankTransferDetails, // For bank transfer
    } = req.body;

    // ============================================
    // 1. VALIDATE INPUT
    // ============================================

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
    if (typeof finalGuestName !== "string" || finalGuestName.trim().length < 2) {
      throw Object.assign(new Error("Guest name must be at least 2 characters"), { status: 400 });
    }

    // Validate phone if provided
    let cleanPhone = '';
    if (typeof finalGuestPhone !== "string") throw Object.assign(new Error("Invalid phone number"), { status: 400 });
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
    if (!["card", "bank", "bank-transfer"].includes(paymentMethod)) {
      throw Object.assign(new Error("Invalid payment method"), { status: 400 });
    }

    // Validate dates
    validateDates(checkIn, checkOut);

    // ============================================
    // 2. VERIFY HOTEL AND ROOM
    // ============================================

    const hotel = await Hotel.findById(hotelId).session(session);
    if (!hotel) {
      console.error('Hotel not found:', hotelId);
      throw Object.assign(new Error("Hotel not found"), { status: 404 });
    }

    if (hotel.status !== 'approved' || hotel.isActive === false) {
      throw Object.assign(new Error('Hotel is unavailable for booking'), { status: 409 });
    }
    // Shares the inventory write lock with wallet checkout and front-desk bookings.
    const room = await Room.findOneAndUpdate(
      { _id: roomId, hotel: hotelId, status: { $ne: 'maintenance' } },
      { $inc: { reservationVersion: 1 } }, { new: true, session }
    );
    if (!room) {
      console.error('Room not found:', roomId);
      throw Object.assign(new Error("Room not found"), { status: 404 });
    }

    if (room.hotel.toString() !== hotelId.toString()) {
      throw Object.assign(new Error("Room does not belong to this hotel"), { status: 400 });
    }

    // room.status is real-time front-desk state (today's occupancy, set by
    // the reception walk-in flow) — irrelevant to an online booking for a
    // future date range, so only block rooms that are permanently out of
    // service. Actual date-clash checking is checkRoomAvailability() below,
    // which looks at real booking date ranges instead of a single flag.
    if (room.status === "maintenance") {
      throw Object.assign(new Error("Room is currently under maintenance and cannot be booked"), { status: 400 });
    }

    const adults = guests?.adults ?? 2;
    const children = guests?.children ?? 0;
    if (!Number.isInteger(adults) || adults < 1 || adults > 10 || !Number.isInteger(children) || children < 0 || children > 8 || adults + children > room.maxGuests) {
      throw Object.assign(new Error('Invalid guest count or room capacity exceeded'), { status: 400 });
    }
    // Check room availability within the same transaction as the inventory lock.
    const isAvailable = await checkRoomAvailability(roomId, checkIn, checkOut, session);
    if (!isAvailable) {
      throw Object.assign(new Error("Room is already booked for selected dates"), { status: 400 });
    }

    // ============================================
    // 3. CALCULATE TOTAL AMOUNT
    // ============================================
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const priceBreakdown = bookingQuote(room.price, nights);
    const totalAmount = priceBreakdown.totalPaisa / 100;

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
        adults,
        children,
      },
      totalAmount,
      priceBreakdown,
      ...(paymentMethod === "card" ? { paymentHoldExpiresAt: new Date(Date.now() + 60 * 60 * 1000) } : {}),
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
      if (paymentMethod === "card") {
        // Card payment via Stripe Elements — the browser collects the card
        // number/CVV directly into Stripe's iframe and never sends it to
        // this server (PCI-DSS scope stays with Stripe, not us). We only
        // create a PaymentIntent here; the booking stays "Pending"/"unpaid"
        // until the charge is actually confirmed and verified server-side
        // via POST /api/v1/public/bookings/verify-card-payment (or the
        // Stripe webhook as a backup) — see webhookController.js
        // finalizeStripeBookingPayment, which re-checks the PaymentIntent
        // with Stripe's API before ever marking a booking paid.
        paymentResult = await createStripePaymentIntent({
          amount: totalAmount,
          currency: "npr",
          metadata: {
            bookingId: booking._id.toString(),
            bookingRef: booking.bookingId,
            hotelName: hotel.name,
          },
        });

        booking.paymentReference = paymentResult.paymentIntentId;
        await booking.save({ session });

        await session.commitTransaction();

        return res.status(200).json({
          success: true,
          message: "Booking created. Confirm your card to complete payment.",
          requiresClientConfirmation: true,
          clientSecret: paymentResult.clientSecret,
          simulated: !!paymentResult.simulated,
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
    if (error.hasErrorLabel?.("TransientTransactionError")) throw Object.assign(new Error("Room availability changed. Please try again."), { status: 409 });
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


  // Find booking by MongoDB _id
  const booking = await Booking.findById(bookingId)
    .populate('hotel', 'name location phone email images')
    .populate('room', 'roomName title price')
    .lean();

  if (!booking) {
    throw Object.assign(new Error("Booking not found"), { status: 404 });
  }

  // Generate QR code for booking verification
  const bookingUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/booking/${booking._id}`;
  const qrCodeDataUrl = await QRCode.toDataURL(bookingUrl, {
    width: 200,
    margin: 1,
    color: {
      dark: '#0D9488',
      light: '#FFFFFF'
    }
  });

  // Create PDF document
  const doc = new jsPDF();

  // Colors
  const primaryColor = [13, 148, 136]; // teal-600
  const secondaryColor = [100, 116, 139]; // slate-600
  const successColor = [16, 185, 129]; // green-500

  // Header with hotel name
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 50, 'F');

  // Add hotel logo if available
  if (booking.hotel?.images?.[0]) {
    try {
      doc.addImage(booking.hotel.images[0], 'JPEG', 15, 10, 25, 25);
    } catch (err) {
      console.error('Failed to add hotel logo to PDF:', err);
    }
  }

  // Hotel name and details
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text(booking.hotel?.name || 'StayHaven', booking.hotel?.images?.[0] ? 45 : 20, 20);

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text(booking.hotel?.location?.address || '', booking.hotel?.images?.[0] ? 45 : 20, 28);
  doc.text(`Phone: ${booking.hotel?.phone || 'N/A'} | Email: ${booking.hotel?.email || 'N/A'}`, booking.hotel?.images?.[0] ? 45 : 20, 34);

  // Add QR code (top right)
  doc.addImage(qrCodeDataUrl, 'PNG', 165, 10, 30, 30);
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('Scan to view', 180, 43, { align: 'center' });

  // Confirmation badge
  doc.setFillColor(...successColor);
  doc.roundedRect(150, 10, 12, 12, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.text('✓', 154, 18);

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Booking confirmation section
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Booking Confirmation', 20, 65);

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text('Thank you for choosing us! Your booking has been confirmed.', 20, 73);

  // Confirmation details box with background
  doc.setDrawColor(...primaryColor);
  doc.setFillColor(240, 253, 250); // Light teal background
  doc.roundedRect(20, 80, 170, 28, 3, 3, 'FD');

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Confirmation Code:', 25, 88);
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text(booking.confirmationCode || booking.bookingId, 25, 98);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Booking Date: ${new Date(booking.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`, 110, 88);
  doc.text(`Status: ${booking.status}`, 110, 94);
  doc.text(`Payment: ${booking.paymentStatus.toUpperCase()}`, 110, 100);

  // Guest information
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Guest Information', 20, 120);

  const guestData = [
    ['Name', booking.guestInfo?.name || 'N/A'],
    ['Email', booking.guestInfo?.email || 'N/A'],
    ['Phone', booking.guestInfo?.phone || 'N/A'],
  ];

  doc.autoTable({
    startY: 124,
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
    ['Room Number', booking.room?.roomNumber || 'Will be assigned at check-in'],
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
  doc.setTextColor(0, 0, 0);
  doc.text('Important Information', 20, doc.lastAutoTable.finalY + 15);

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...secondaryColor);
  const importantInfo = [
    '• Check-in time: 2:00 PM | Check-out time: 12:00 PM',
    '• Please bring a valid ID proof at the time of check-in',
    '• Early check-in and late check-out subject to availability',
    '• Cancellation policy: Full refund if cancelled 48+ hours before check-in, 50% refund 24-48 hours',
    '• For any queries, please contact the hotel directly',
  ];

  let yPos = doc.lastAutoTable.finalY + 22;
  importantInfo.forEach(info => {
    doc.text(info, 20, yPos);
    yPos += 5;
  });

  // Terms & Conditions
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Terms & Conditions', 20, yPos + 5);

  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...secondaryColor);
  const terms = [
    '1. The guest must present valid photo identification at check-in.',
    '2. Smoking is prohibited in all rooms. Violation may result in additional charges.',
    '3. The hotel is not responsible for loss or damage to personal belongings.',
    '4. Guests are responsible for any damage to hotel property during their stay.',
  ];

  yPos += 12;
  terms.forEach(term => {
    doc.text(term, 20, yPos, { maxWidth: 170 });
    yPos += 4;
  });

  // QR Code section at bottom
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Scan to View Booking Online', 20, yPos + 8);

  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text('Use your phone camera to scan the QR code at the top of this document', 20, yPos + 13);

  // Footer
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, 275, 190, 275);

  doc.setTextColor(...secondaryColor);
  doc.setFontSize(8);
  doc.text('This is a computer-generated document and does not require a signature.', 105, 281, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 105, 286, { align: 'center' });

  // Generate PDF buffer
  const pdfBuffer = doc.output('arraybuffer');

  // Send PDF
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=booking-confirmation-${booking.confirmationCode || booking.bookingId}.pdf`);
  res.send(Buffer.from(pdfBuffer));
});
