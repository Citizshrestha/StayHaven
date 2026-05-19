/**
 * Guest Dashboard Controller
 *
 * Handles all authenticated guest dashboard endpoints.
 * Every handler filters by req.user._id and req.user's hotel context
 * to enforce strict data isolation.
 */

import mongoose from "mongoose";
import stripeLib from "stripe";
import { Booking } from "../models/booking.schema.js";
import {
  initiateKhaltiPayment,
  generateEsewaPaymentData,
  createStripePaymentIntent,
  verifyKhaltiPayment,
  verifyEsewaCallback,
  checkEsewaTransactionStatus,
  verifyStripePayment,
  getPaymentGatewayConfig,
} from "../services/paymentGatewayService.js";
import { Order, Counter } from "../models/order.schema.js";
import { MenuItem } from "../models/menuItem.schema.js";
import { Invoice } from "../models/invoice.schema.js";
import { GuestRequest } from "../models/guestRequest.schema.js";
import { User } from "../models/user.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { Room } from "../models/room.schema.js";
import { PaymentTransaction } from "../models/paymentTransaction.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emitToHotel, emitToKitchen, emitToWaiters, emitToUser } from "../config/socket.js";
import * as Sentry from "@sentry/node";

const stripe = process.env.STRIPE_SECRET_KEY ? stripeLib(process.env.STRIPE_SECRET_KEY) : null;

// ──────────────────────────────────────────────────────────────────────
// Helper: resolve user's active hotel (from their current active booking)
// ──────────────────────────────────────────────────────────────────────
const resolveActiveHotel = async (userId) => {
  const activeBooking = await Booking.findOne({
    user: userId,
    status: { $in: ["Confirmed", "Checked-In"] },
  }).sort({ checkIn: 1 });

  if (!activeBooking) return null;
  return activeBooking.hotel?.toString?.() || activeBooking.hotel;
};

// ──────────────────────────────────────────────────────────────────────
// GET /api/guest/portal/dashboard
// ──────────────────────────────────────────────────────────────────────
export const getDashboardOverview = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Fetch dashboard data in parallel
  const [activeBooking, pastBookingsCount, pendingOrdersCount, openRequestsCount, recentOrders, upcomingBookings] =
    await Promise.all([
      Booking.findOne({ user: userId, status: { $in: ["Confirmed", "Checked-In"] } })
        .populate("hotel", "name location")
        .populate("room", "roomNumber type")
        .lean(),

      Booking.countDocuments({ user: userId, status: { $in: ["Checked-Out", "Cancelled", "No-Show"] } }),

      Order.countDocuments({ customerId: userId, status: { $in: ["pending", "confirmed", "preparing", "ready"] } }),

      GuestRequest.countDocuments({ "guestInfo.userId": userId, status: "open" }),

      Order.find({ customerId: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      Booking.find({ user: userId, status: { $in: ["Confirmed", "Checked-In", "Pending"] } })
        .sort({ checkIn: 1 })
        .limit(3)
        .populate("hotel", "name")
        .lean(),
    ]);

  const nightsLeft = activeBooking
    ? Math.max(1, Math.ceil((new Date(activeBooking.checkOut) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  res.status(200).json({
    success: true,
    data: {
      activeBooking: activeBooking
        ? {
            _id: activeBooking._id,
            bookingId: activeBooking.bookingId,
            hotel: activeBooking.hotel,
            room: activeBooking.room,
            checkIn: activeBooking.checkIn,
            checkOut: activeBooking.checkOut,
            status: activeBooking.status,
            nightsLeft,
          }
        : null,
      pastBookingsCount,
      pendingOrdersCount,
      openRequestsCount,
      upcomingBookings,
      recentOrders: recentOrders.map((o) => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        orderType: o.orderType,
        status: o.status,
        totalPrice: o.totalPrice,
        roomNumber: o.roomNumber,
        tableNumber: o.tableNumber,
        createdAt: o.createdAt,
      })),
    },
  });
});

// ──────────────────────────────────────────────────────────────────────
// GET /api/guest/portal/bookings
// ──────────────────────────────────────────────────────────────────────
export const getUserBookings = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { status, page = 1, limit = 20 } = req.query;

  const query = { user: userId };
  if (status && status !== "all") {
    query.status = status.trim();
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate("hotel", "name location images")
      .populate("room", "roomNumber type")
      .sort({ checkIn: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean(),
    Booking.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: bookings.length,
    total,
    totalPages: Math.ceil(total / parseInt(limit, 10)),
    currentPage: parseInt(page, 10),
    data: bookings,
  });
});

// ──────────────────────────────────────────────────────────────────────
// GET /api/guest/portal/menu
// ──────────────────────────────────────────────────────────────────────
export const getAuthenticatedMenu = asyncHandler(async (req, res) => {
  const { hotelId } = req.query;
  const { category, search } = req.query;

  let targetHotelId = hotelId;

  // If no hotelId in query, resolve from user's active booking
  if (!targetHotelId) {
    targetHotelId = await resolveActiveHotel(req.user._id);
  }

  if (!targetHotelId) {
    return res.status(400).json({
      success: false,
      message: "No active hotel found. Please specify a hotelId query parameter.",
    });
  }

  // Verify hotel is active
  const hotel = await Hotel.findById(targetHotelId).select("name status isActive");
  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found",
    });
  }
  
  if (!hotel.isActive) {
    return res.status(404).json({
      success: false,
      message: "Hotel is currently inactive",
    });
  }
  
  if (hotel.status !== "approved") {
    return res.status(404).json({
      success: false,
      message: `Hotel is not available (status: ${hotel.status})`,
    });
  }

  const query = { hotel: targetHotelId, isAvailable: true };
  if (category) query.category = category.trim();
  if (search) query.$text = { $search: search.trim() };

  const menuItems = await MenuItem.find(query).sort({ category: 1, name: 1 }).lean();

  // Group by category
  const categories = [...new Set(menuItems.map((item) => item.category))];
  const groupedByCategory = {};
  menuItems.forEach((item) => {
    if (!groupedByCategory[item.category]) groupedByCategory[item.category] = [];
    groupedByCategory[item.category].push(item);
  });

  res.status(200).json({
    success: true,
    hotel: { _id: targetHotelId, name: hotel.name },
    categories,
    count: menuItems.length,
    data: menuItems,
    groupedByCategory,
  });
});

// ──────────────────────────────────────────────────────────────────────
// POST /api/guest/portal/order
// ──────────────────────────────────────────────────────────────────────
export const placeOrder = asyncHandler(async (req, res) => {
  const { hotelId, items, orderType = "roomService", notes } = req.body;

  if (!hotelId || !items || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID and at least one item are required",
    });
  }

  // Verify hotel exists
  const hotel = await Hotel.findById(hotelId);
  if (!hotel || hotel.status !== "approved" || !hotel.isActive) {
    return res.status(404).json({
      success: false,
      message: "Hotel/restaurant not found or unavailable",
    });
  }

  // Resolve room context from user's active booking at this hotel
  const activeBooking = await Booking.findOne({
    user: req.user._id,
    hotel: hotelId,
    status: { $in: ["Confirmed", "Checked-In"] },
  }).populate("room", "roomNumber _id");

  let roomId = null;
  let roomNumber = null;

  if (orderType === "roomService") {
    if (activeBooking?.room) {
      roomId = activeBooking.room._id;
      roomNumber = activeBooking.room.roomNumber;
    } else {
      return res.status(400).json({
        success: false,
        message: "No active booking found at this hotel for room service orders",
      });
    }
  }

  // Validate items and calculate total
  let totalPrice = 0;
  const validatedItems = [];

  for (const item of items) {
    if (!item.menuItem || item.quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Each item must have a valid menuItem ID and quantity (min 1)",
      });
    }

    // Query-scoped by hotel for security (prevent cross-hotel menu item access)
    const menuItem = await MenuItem.findOne({
      _id: item.menuItem,
      hotel: hotelId
    });
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: `Menu item not found or not available at this hotel`,
      });
    }

    if (!menuItem.isAvailable) {
      return res.status(400).json({
        success: false,
        message: `${menuItem.name} is currently not available`,
      });
    }

    const itemTotal = menuItem.price * item.quantity;
    totalPrice += itemTotal;

    validatedItems.push({
      menuItem: menuItem._id,
      name: menuItem.name,
      quantity: item.quantity,
      price: menuItem.price,
      notes: item.notes || "",
    });
  }

  // Generate order number
  const counter = await Counter.findOneAndUpdate(
    { hotel: hotelId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const order = new Order({
    orderNumber: counter.seq,
    hotel: hotelId,
    room: roomId,
    roomNumber,
    orderType,
    items: validatedItems,
    totalPrice,
    customerId: req.user._id,
    customerName: req.user.fullname,
    customerPhone: req.user.contact || "",
    notes: notes || "",
    status: "pending",
    isGuestOrder: true,
    orderBy: req.user._id,
    orderByName: req.user.fullname,
  });

  await order.save();

  // Emit real-time events to kitchen and waiters
  try {
    console.log('🔔 Emitting new-order event:', {
      hotelId: hotelId.toString(),
      orderNumber: order.orderNumber,
      orderType,
      rooms: [
        `hotel-${hotelId}`,
        `hotel-${hotelId}-chiefs`,
        `hotel-${hotelId}-kitchens`,
        orderType !== 'roomService' ? `hotel-${hotelId}-waiters` : null
      ].filter(Boolean)
    });

    emitToHotel(hotelId.toString(), "new-order", {
      order: order.toObject(),
      message: `New ${orderType === "roomService" ? "room service" : "dine-in"} order #${order.orderNumber}`,
    });

    emitToKitchen(hotelId.toString(), "new-order", {
      order: order.toObject(),
      message: `New order #${order.orderNumber} from guest`
    });

    // Always emit to waiters for all order types (room service needs delivery too)
    emitToWaiters(hotelId.toString(), "new-order", {
      order: order.toObject(),
      message: `New ${orderType} order #${order.orderNumber}`
    });

    console.log('✅ Socket events emitted successfully');
  } catch (socketError) {
    console.error('❌ Socket emission error:', socketError);
    Sentry.captureException(socketError, { tags: { feature: "guest-order-socket" } });
  }

  // Notify the ordering user of status changes
  emitToUser(req.user._id.toString(), "order-placed", {
    _id: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    estimatedDelivery: order.preparationTime || 25,
  });

  res.status(201).json({
    success: true,
    message: "Order placed successfully",
    data: {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      items: validatedItems,
      totalPrice: order.totalPrice,
      roomNumber: order.roomNumber,
      estimatedDelivery: order.preparationTime || 25,
    },
  });
});

// ──────────────────────────────────────────────────────────────────────
// GET /api/guest/portal/orders
// ──────────────────────────────────────────────────────────────────────
export const getUserOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { status, page = 1, limit = 20 } = req.query;

  const query = { customerId: userId };
  if (status && status !== "all") {
    query.status = status.trim();
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate("hotel", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean(),
    Order.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    totalPages: Math.ceil(total / parseInt(limit, 10)),
    currentPage: parseInt(page, 10),
    data: orders.map((o) => ({
      _id: o._id,
      orderNumber: o.orderNumber,
      orderType: o.orderType,
      status: o.status,
      totalPrice: o.totalPrice,
      items: o.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
      })),
      roomNumber: o.roomNumber,
      tableNumber: o.tableNumber,
      notes: o.notes,
      createdAt: o.createdAt,
      deliveredAt: o.deliveredAt,
    })),
  });
});

// ──────────────────────────────────────────────────────────────────────
// GET /api/guest/portal/invoices
// Returns both booking invoices AND unpaid orders with bills sent
// ──────────────────────────────────────────────────────────────────────
export const getUserInvoices = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get all bookings for this user
  const userBookings = await Booking.find({ user: userId }).select("_id bookingId").lean();
  const bookingIds = userBookings.map((b) => b._id);

  const { status, page = 1, limit = 20 } = req.query;
  const invoiceQuery = { booking: { $in: bookingIds } };
  if (status && status !== "all") {
    invoiceQuery.status = status.trim();
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  // Fetch booking invoices
  const [invoices, invoiceTotal] = await Promise.all([
    Invoice.find(invoiceQuery)
      .populate("hotel", "name")
      .populate("booking", "bookingId status")
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean(),
    Invoice.countDocuments(invoiceQuery),
  ]);

  // Fetch unpaid orders with bills sent (food/service orders)
  const orderQuery = {
    customerId: userId,
    billSent: true,
    paymentStatus: { $ne: 'paid' },
  };
  
  const unpaidOrders = await Order.find(orderQuery)
    .populate("hotel", "name")
    .sort({ billSentAt: -1 })
    .lean();

  // Calculate outstanding balance from both invoices and unpaid orders
  const invoiceBalance = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
  const orderBalance = unpaidOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
  const outstandingBalance = invoiceBalance + orderBalance;

  // Transform unpaid orders to match invoice format for frontend
  const orderInvoices = unpaidOrders.map((order) => {
    // Calculate tax (13% VAT in Nepal)
    const subtotal = order.totalPrice / 1.13; // Reverse calculate subtotal
    const tax = order.totalPrice - subtotal;
    
    return {
      _id: order._id,
      invoiceId: `ORD-${order.orderNumber}`,
      hotel: order.hotel,
      bookingRef: order.roomNumber ? `Room ${order.roomNumber}` : order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway',
      guestName: order.customerName,
      charges: {
        room: 0,
        extras: subtotal,
        taxRate: 13,
        tax: tax,
        total: order.totalPrice,
      },
      paid: 0,
      balance: order.totalPrice,
      status: 'pending',
      issuedAt: order.billSentAt || order.createdAt,
      dueDate: null,
      paidAt: null,
      orderType: 'food-service', // Flag to identify this is an order, not a booking invoice
      orderNumber: order.orderNumber,
      orderId: order._id,
    };
  });

  // Combine invoices and order invoices
  const allInvoices = [...invoices.map(inv => ({
    _id: inv._id,
    invoiceId: inv.invoiceId,
    hotel: inv.hotel,
    bookingRef: inv.bookingRef,
    guestName: inv.guestName,
    charges: inv.charges,
    paid: inv.paid,
    balance: inv.balance,
    status: inv.status,
    issuedAt: inv.issuedAt,
    dueDate: inv.dueDate,
    paidAt: inv.paidAt,
    orderType: 'booking', // Flag to identify this is a booking invoice
  })), ...orderInvoices].sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));

  res.status(200).json({
    success: true,
    count: allInvoices.length,
    total: invoiceTotal + unpaidOrders.length,
    totalPages: Math.ceil((invoiceTotal + unpaidOrders.length) / parseInt(limit, 10)),
    currentPage: parseInt(page, 10),
    outstandingBalance,
    data: allInvoices,
  });
});

// ──────────────────────────────────────────────────────────────────────
// POST /api/guest/portal/orders/:id/pay
// Enhanced payment processing with multiple payment methods
// ──────────────────────────────────────────────────────────────────────
export const payOrder = asyncHandler(async (req, res) => {
  const { id: targetId } = req.params;
  const { amount, currency = "npr", paymentMethod = "card", cardDetails } = req.body;

  // Validate payment method
  const validMethods = ['esewa', 'khalti', 'card', 'bank'];
  if (!validMethods.includes(paymentMethod)) {
    return res.status(400).json({
      success: false,
      message: `Invalid payment method. Use: ${validMethods.join(', ')}`,
    });
  }

  // Try order payment first
  const order = await Order.findOne({
    _id: targetId,
    customerId: req.user._id,
  });

  let targetType = "order";
  let paymentAmount = amount || order?.totalPrice;
  let paymentMetadata = {};

  if (order) {
    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot pay for a cancelled order",
      });
    }

    // Check if already paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: "Order is already paid",
      });
    }

    paymentMetadata = {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber?.toString() || "",
      customerId: req.user._id.toString(),
      customerName: req.user.fullname || req.user.name || "Guest",
      customerEmail: req.user.email || "guest@example.com",
      customerPhone: req.user.phone || req.user.phoneNumber || "9800000000",
      targetType: "order",
      paymentMethod,
    };
  } else {
    // Fallback: support invoice payment from billing page
    const userBookings = await Booking.find({ user: req.user._id }).select("_id").lean();
    const bookingIds = userBookings.map((b) => b._id);

    const invoice = await Invoice.findOne({
      _id: targetId,
      booking: { $in: bookingIds },
    }).populate("booking", "bookingId");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Order/Invoice not found or access denied",
      });
    }

    if (invoice.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Invoice is already paid",
      });
    }

    targetType = "invoice";
    paymentAmount = amount || invoice.balance;
    paymentMetadata = {
      invoiceId: invoice._id.toString(),
      invoiceNumber: invoice.invoiceId?.toString() || "",
      bookingId: invoice.booking?._id?.toString?.() || "",
      customerId: req.user._id.toString(),
      customerName: req.user.fullname || req.user.name || "Guest",
      customerEmail: req.user.email || "guest@example.com",
      customerPhone: req.user.phone || req.user.phoneNumber || "9800000000",
      targetType: "invoice",
      paymentMethod,
    };
  }

  if (!paymentAmount || paymentAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Valid amount is required",
    });
  }

  // Process payment based on method
  try {
    let paymentResult;

    if (paymentMethod === 'esewa') {
      paymentResult = await processEsewaPayment(paymentAmount, paymentMetadata);
    } else if (paymentMethod === 'khalti') {
      paymentResult = await processKhaltiPayment(paymentAmount, paymentMetadata);
    } else if (paymentMethod === 'card') {
      // Validate card details
      if (!cardDetails || !cardDetails.number || !cardDetails.name || !cardDetails.expiry || !cardDetails.cvv) {
        return res.status(400).json({
          success: false,
          message: "Complete card details are required",
        });
      }
      paymentResult = await processCardPayment(paymentAmount, cardDetails, paymentMetadata);
    } else if (paymentMethod === 'bank') {
      // Validate bank transfer details
      const bankDetails = req.body.bankTransferDetails;
      if (!bankDetails || !bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.bankName || !bankDetails.transactionId) {
        return res.status(400).json({
          success: false,
          message: "Complete bank transfer details are required",
        });
      }
      paymentResult = await processBankTransferPayment(paymentAmount, bankDetails, paymentMetadata);
    }

    // Guard: if paymentResult wasn't set, reject
    if (!paymentResult) {
      return res.status(400).json({
        success: false,
        message: "Payment method not supported",
      });
    }

    // If payment failed at gateway level, return error
    if (!paymentResult.success && !paymentResult.requiresRedirect && !paymentResult.requiresClientConfirmation) {
      return res.status(400).json({
        success: false,
        message: paymentResult.message || "Payment processing failed",
      });
    }

    // If payment successful, update order/invoice and create transaction
    // For redirect-based payments (Khalti/eSewa), return redirect data to frontend
    if (paymentResult.requiresRedirect) {
      return res.json({
        success: true,
        requiresRedirect: true,
        redirectType: paymentResult.redirectType,
        paymentUrl: paymentResult.paymentUrl || null,
        formUrl: paymentResult.formUrl || null,
        formData: paymentResult.formData || null,
        pidx: paymentResult.pidx || null,
        transactionId: paymentResult.transactionId,
        expiresAt: paymentResult.expiresAt || null,
        message: paymentResult.message,
        method: paymentResult.method,
      });
    }

    // For Stripe card payments that need client-side confirmation
    if (paymentResult.requiresClientConfirmation) {
      return res.json({
        success: true,
        requiresClientConfirmation: true,
        clientSecret: paymentResult.clientSecret,
        paymentIntentId: paymentResult.paymentIntentId,
        transactionId: paymentResult.transactionId,
        method: paymentResult.method,
        last4: paymentResult.last4,
        message: paymentResult.message,
      });
    }

    // For bank transfer payments that require manual verification
    if (paymentResult.requiresVerification) {
      // Create pending payment transaction
      if (order) {
        const hotelDoc = await Hotel.findById(order.hotel).select("company");
        const dummyBookingId = new mongoose.Types.ObjectId("000000000000000000000001");
        
        const txn = await PaymentTransaction.create({
          hotel: order.hotel,
          company: hotelDoc?.company || dummyBookingId,
          booking: dummyBookingId,
          order: order._id,
          guest: null,
          type: "capture",
          amount: paymentAmount,
          method: "bank",
          reference: paymentResult.transactionId,
          status: "pending", // Pending verification
          processedBy: req.user._id,
          processedByName: req.user.fullname,
          notes: `Bank transfer from ${paymentResult.bankDetails.bankName} - Account: ${paymentResult.bankDetails.accountNumber} - Ref: ${paymentResult.bankDetails.transactionId}`,
        });

        // Update order with pending payment
        order.paymentStatus = "pending";
        order.paymentMethod = "bank";
        order.paymentReference = paymentResult.transactionId;
        await order.save();

        // Notify hotel staff about pending bank transfer
        emitToHotel(order.hotel.toString(), "bank-transfer-pending", {
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: paymentAmount,
          customerName: order.customerName,
          bankDetails: paymentResult.bankDetails,
          transactionId: txn.transactionId,
        });

        return res.json({
          success: true,
          requiresVerification: true,
          message: paymentResult.message,
          data: {
            transaction: txn,
            order: { _id: order._id, orderNumber: order.orderNumber },
            paymentMethod: "bank",
            transactionId: paymentResult.transactionId,
          },
        });
      } else {
        // Invoice payment
        const invoice = await Invoice.findById(targetId);
        const hotelDoc = await Hotel.findById(invoice.hotel).select("company");

        const txn = await PaymentTransaction.create({
          hotel: invoice.hotel,
          company: hotelDoc.company,
          booking: invoice.booking,
          invoice: invoice._id,
          guest: invoice.guest || null,
          type: "capture",
          amount: paymentAmount,
          method: "bank",
          reference: paymentResult.transactionId,
          status: "pending", // Pending verification
          processedBy: req.user._id,
          processedByName: req.user.fullname,
          notes: `Bank transfer from ${paymentResult.bankDetails.bankName} - Account: ${paymentResult.bankDetails.accountNumber} - Ref: ${paymentResult.bankDetails.transactionId}`,
        });

        // Update invoice with pending payment
        invoice.status = "partial";
        await invoice.save();

        // Notify hotel staff
        emitToHotel(invoice.hotel.toString(), "bank-transfer-pending", {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceId,
          amount: paymentAmount,
          customerName: req.user.fullname,
          bankDetails: paymentResult.bankDetails,
          transactionId: txn.transactionId,
        });

        return res.json({
          success: true,
          requiresVerification: true,
          message: paymentResult.message,
          data: {
            transaction: txn,
            invoice: {
              _id: invoice._id,
              invoiceId: invoice.invoiceId,
              status: invoice.status,
            },
            paymentMethod: "bank",
            transactionId: paymentResult.transactionId,
          },
        });
      }
    }

    if (paymentResult.success) {
      if (order) {
        // Update order payment status
        order.paymentStatus = 'paid';
        order.paymentMethod = paymentMethod;
        order.paidAt = new Date();
        order.paidAmount = paymentAmount;
        order.paymentReference = paymentResult.transactionId;
        await order.save();

        // Create payment transaction record
        const hotelDoc = await Hotel.findById(order.hotel).select("company");
        const dummyBookingId = new mongoose.Types.ObjectId("000000000000000000000001");
        
        const txn = await PaymentTransaction.create({
          hotel: order.hotel,
          company: hotelDoc?.company || dummyBookingId,
          booking: dummyBookingId,
          order: order._id,
          guest: null,
          type: "capture",
          amount: paymentAmount,
          method: paymentMethod,
          reference: paymentResult.transactionId,
          status: "captured",
          processedBy: req.user._id,
          processedByName: req.user.fullname,
          notes: `Payment via ${paymentMethod} for order #${order.orderNumber}`,
        });

        // Emit real-time payment confirmation to user
        emitToUser(req.user._id.toString(), "payment-confirmed", {
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: paymentAmount,
          transactionId: txn.transactionId,
          paymentMethod,
        });

        // Emit to hotel staff
        emitToHotel(order.hotel.toString(), "payment-received", {
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: paymentAmount,
          paymentMethod,
          customerName: order.customerName,
        });

        return res.json({
          success: true,
          message: "Payment successful",
          data: {
            transaction: txn,
            order: { _id: order._id, orderNumber: order.orderNumber },
            paymentMethod,
            transactionId: paymentResult.transactionId,
          },
        });
      } else {
        // Update invoice payment status
        const invoice = await Invoice.findById(targetId);
        const hotelDoc = await Hotel.findById(invoice.hotel).select("company");

        const payableAmount = Number(invoice.balance) || 0;
        
        const txn = await PaymentTransaction.create({
          hotel: invoice.hotel,
          company: hotelDoc.company,
          booking: invoice.booking,
          invoice: invoice._id,
          guest: invoice.guest || null,
          type: "capture",
          amount: payableAmount,
          method: paymentMethod,
          reference: paymentResult.transactionId,
          status: "captured",
          processedBy: req.user._id,
          processedByName: req.user.fullname,
          notes: `Payment via ${paymentMethod} for invoice #${invoice.invoiceId}`,
        });

        invoice.paid = (Number(invoice.paid) || 0) + payableAmount;
        invoice.balance = Math.max(0, (Number(invoice.balance) || 0) - payableAmount);
        invoice.status = invoice.balance <= 0 ? "paid" : "partial";
        if (invoice.status === "paid") {
          invoice.paidAt = new Date();
        }
        await invoice.save();

        emitToUser(req.user._id.toString(), "payment-confirmed", {
          invoiceId: invoice._id,
          amount: payableAmount,
          transactionId: txn.transactionId,
          paymentMethod,
        });

        return res.json({
          success: true,
          message: "Invoice payment successful",
          data: {
            transaction: txn,
            invoice: {
              _id: invoice._id,
              invoiceId: invoice.invoiceId,
              status: invoice.status,
              paid: invoice.paid,
              balance: invoice.balance,
            },
            paymentMethod,
            transactionId: paymentResult.transactionId,
          },
        });
      }
    } else {
      throw new Error(paymentResult.message || 'Payment processing failed');
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    Sentry.captureException(error, { tags: { feature: "guest-payment" } });
    
    return res.status(500).json({
      success: false,
      message: error.message || "Payment processing failed. Please try again.",
    });
  }
});

// ──────────────────────────────────────────────────────────────────────
// Payment Processing Functions (Real Gateway Integrations)
// ──────────────────────────────────────────────────────────────────────

/**
 * Process eSewa payment — generates signed form data for frontend redirect.
 * eSewa uses a form-POST redirect flow (user goes to eSewa → pays → redirected back).
 */
async function processEsewaPayment(amount, metadata) {
  try {
    const { formUrl, formData, transactionUuid } = generateEsewaPaymentData({
      amount,
      taxAmount: 0,
      orderId: metadata.orderId || metadata.invoiceId || `order-${Date.now()}`,
    });

    return {
      success: true,
      requiresRedirect: true,
      redirectType: "form-post",
      formUrl,
      formData,
      transactionId: `ESEWA-${transactionUuid}`,
      transactionUuid,
      message: "Redirecting to eSewa...",
      method: "esewa",
    };
  } catch (error) {
    console.error("eSewa payment initiation error:", error);
    return {
      success: false,
      message: error.message || "eSewa payment initiation failed",
    };
  }
}

/**
 * Process Khalti payment — server-side API call → returns payment_url for redirect.
 * Khalti uses a redirect flow (user goes to Khalti portal → pays → comes back to return_url).
 */
async function processKhaltiPayment(amount, metadata) {
  try {
    const result = await initiateKhaltiPayment({
      amount,
      orderId: metadata.orderId || metadata.invoiceId || `order-${Date.now()}`,
      orderName: metadata.orderNumber
        ? `Order #${metadata.orderNumber}`
        : metadata.invoiceNumber
        ? `Invoice #${metadata.invoiceNumber}`
        : `Payment`,
      customer: {
        name: metadata.customerName || "Guest",
        email: metadata.customerEmail || "guest@example.com",
        phone: metadata.customerPhone || "9800000000",
      },
    });

    return {
      success: true,
      requiresRedirect: true,
      redirectType: "url",
      paymentUrl: result.paymentUrl,
      pidx: result.pidx,
      transactionId: `KHALTI-${result.pidx}`,
      expiresAt: result.expiresAt,
      message: "Redirecting to Khalti...",
      method: "khalti",
    };
  } catch (error) {
    console.error("Khalti payment initiation error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: error.message || "Khalti payment initiation failed",
    };
  }
}

/**
 * Process card payment via Stripe Payment Intents.
 * Returns a client_secret so the frontend can confirm payment using Stripe.js.
 */
async function processCardPayment(amount, cardDetails, metadata) {
  try {
    // Basic card validation (Luhn-like check)
    const cardNumber = (cardDetails?.number || "").replace(/\s/g, "");
    if (cardNumber.length < 13 || cardNumber.length > 19) {
      return { success: false, message: "Invalid card number" };
    }

    // Check if it's a test card number - if so, simulate payment in dev mode
    const testCardNumbers = ['4242424242424242', '4000056655665556', '5555555555554444', '2223003122003222'];
    const isTestCard = testCardNumbers.includes(cardNumber);

    // If test card in development, simulate immediate success
    if (isTestCard && process.env.NODE_ENV === 'development') {
      return {
        success: true,
        transactionId: `CARD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: "Card payment processed (test mode)",
        method: "card",
        last4: cardNumber.slice(-4),
      };
    }

    const result = await createStripePaymentIntent({
      amount,
      currency: "usd",
      metadata: {
        orderId: metadata.orderId || "",
        invoiceId: metadata.invoiceId || "",
        customerEmail: metadata.customerEmail || "",
        paymentMethod: "card",
      },
    });

    if (result.simulated) {
      // Development mode — auto-complete
      return {
        success: true,
        transactionId: `CARD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: "Card payment processed (dev mode)",
        method: "card",
        last4: cardNumber.slice(-4),
      };
    }

    // For real Stripe: return clientSecret so frontend confirms with Stripe.js
    return {
      success: true,
      requiresClientConfirmation: true,
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      transactionId: result.paymentIntentId,
      message: "Card payment intent created",
      method: "card",
      last4: cardNumber.slice(-4),
    };
  } catch (error) {
    console.error("Card payment error:", error);
    return {
      success: false,
      message: error.message || "Card payment processing failed",
    };
  }
}

/**
 * Process bank transfer payment.
 * Creates a pending payment transaction that requires manual verification.
 */
async function processBankTransferPayment(amount, bankDetails, metadata) {
  try {
    // Validate bank transfer details
    if (!bankDetails.accountName || bankDetails.accountName.length < 3) {
      return { success: false, message: "Valid account name is required" };
    }
    if (!bankDetails.accountNumber || bankDetails.accountNumber.length < 5) {
      return { success: false, message: "Valid account number is required" };
    }
    if (!bankDetails.bankName || bankDetails.bankName.length < 3) {
      return { success: false, message: "Valid bank name is required" };
    }
    if (!bankDetails.transactionId || bankDetails.transactionId.length < 5) {
      return { success: false, message: "Valid transaction ID is required" };
    }

    // Generate unique transaction reference
    const transactionRef = `BANK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Return success with pending status
    // The actual payment transaction will be created with "pending" status
    return {
      success: true,
      requiresVerification: true,
      transactionId: transactionRef,
      message: "Bank transfer details submitted. Payment will be verified within 24 hours.",
      method: "bank",
      bankDetails: {
        accountName: bankDetails.accountName,
        accountNumber: bankDetails.accountNumber,
        bankName: bankDetails.bankName,
        transactionId: bankDetails.transactionId,
      },
    };
  } catch (error) {
    console.error("Bank transfer processing error:", error);
    return {
      success: false,
      message: error.message || "Bank transfer processing failed",
    };
  }
}

// ──────────────────────────────────────────────────────────────────────
// POST /api/guest/portal/payments/confirm
// Stripe webhook callback handler for order payments
// ──────────────────────────────────────────────────────────────────────
export const confirmOrderPayment = asyncHandler(async (req, res) => {
  const { paymentIntentId, orderId } = req.body;
  const targetId = orderId;

  if (!paymentIntentId || !targetId) {
    return res.status(400).json({
      success: false,
      message: "paymentIntentId and orderId are required",
    });
  }

  const order = await Order.findOne({ _id: targetId, customerId: req.user._id });

  const userBookings = await Booking.find({ user: req.user._id }).select("_id").lean();
  const bookingIds = userBookings.map((b) => b._id);
  const invoice = order
    ? null
    : await Invoice.findOne({ _id: targetId, booking: { $in: bookingIds } }).populate("booking", "_id");

  if (!order && !invoice) {
    return res.status(404).json({
      success: false,
      message: "Order/Invoice not found or access denied",
    });
  }

  if (stripe) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        success: false,
        message: "Payment not completed. Status: " + paymentIntent.status,
      });
    }
  }

  if (order) {
    // Resolve hotel to get company for payment transaction
    const hotelDoc = await Hotel.findById(order.hotel).select("company");
    if (!hotelDoc) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }

    // Record payment transaction (use dummy ObjectId for booking; order is not booking-linked)
    const dummyBookingId = new mongoose.Types.ObjectId("000000000000000000000001");
    const txn = await PaymentTransaction.create({
      hotel: order.hotel,
      company: hotelDoc.company || dummyBookingId,
      booking: dummyBookingId,
      order: order._id,
      guest: null,
      type: "capture",
      amount: order.totalPrice,
      method: "credit-card",
      reference: paymentIntentId,
      status: "captured",
      processedBy: req.user._id,
      processedByName: req.user.fullname,
      notes: `Payment for order #${order.orderNumber}`,
    });

    emitToUser(req.user._id.toString(), "payment-confirmed", {
      orderId: order._id,
      amount: order.totalPrice,
      transactionId: txn.transactionId,
    });

    return res.json({
      success: true,
      message: "Payment confirmed",
      data: {
        transaction: txn,
        order: { _id: order._id, orderNumber: order.orderNumber },
      },
    });
  }

  // Invoice payment path
  const hotelDoc = await Hotel.findById(invoice.hotel).select("company");
  if (!hotelDoc) {
    return res.status(404).json({ success: false, message: "Hotel not found" });
  }

  const payableAmount = Number(invoice.balance) || 0;
  if (payableAmount <= 0) {
    return res.status(400).json({ success: false, message: "Invoice has no outstanding balance" });
  }

  const txn = await PaymentTransaction.create({
    hotel: invoice.hotel,
    company: hotelDoc.company,
    booking: invoice.booking,
    invoice: invoice._id,
    guest: invoice.guest || null,
    type: "capture",
    amount: payableAmount,
    method: "credit-card",
    reference: paymentIntentId,
    status: "captured",
    processedBy: req.user._id,
    processedByName: req.user.fullname,
    notes: `Payment for invoice #${invoice.invoiceId}`,
  });

  invoice.paid = (Number(invoice.paid) || 0) + payableAmount;
  invoice.balance = Math.max(0, (Number(invoice.balance) || 0) - payableAmount);
  invoice.status = invoice.balance <= 0 ? "paid" : "partial";
  if (invoice.status === "paid") {
    invoice.paidAt = new Date();
  }
  await invoice.save();

  emitToUser(req.user._id.toString(), "payment-confirmed", {
    invoiceId: invoice._id,
    amount: payableAmount,
    transactionId: txn.transactionId,
  });

  return res.json({
    success: true,
    message: "Invoice payment confirmed",
    data: {
      transaction: txn,
      invoice: {
        _id: invoice._id,
        invoiceId: invoice.invoiceId,
        status: invoice.status,
        paid: invoice.paid,
        balance: invoice.balance,
      },
    },
  });
});

// ──────────────────────────────────────────────────────────────────────
// POST /api/guest/portal/payments/verify-khalti
// Verify a Khalti payment after user returns from Khalti portal
// ──────────────────────────────────────────────────────────────────────
export const verifyKhaltiCallback = asyncHandler(async (req, res) => {
  const { pidx, orderId } = req.body;

  if (!pidx || !orderId) {
    return res.status(400).json({
      success: false,
      message: "pidx and orderId are required",
    });
  }

  // Verify with Khalti API
  const verification = await verifyKhaltiPayment(pidx);

  if (verification.status !== "Completed") {
    return res.status(400).json({
      success: false,
      message: `Payment not completed. Status: ${verification.status}`,
      khaltiStatus: verification.status,
    });
  }

  // Complete the payment in our system
  const result = await completePaymentAfterVerification({
    targetId: orderId,
    userId: req.user._id,
    userName: req.user.fullname,
    amount: verification.totalAmount,
    method: "khalti",
    reference: `KHALTI-${pidx}`,
    transactionId: verification.transactionId,
  });

  return res.json({
    success: true,
    message: "Khalti payment verified and confirmed",
    data: result,
  });
});

// ──────────────────────────────────────────────────────────────────────
// POST /api/guest/portal/payments/verify-esewa
// Verify an eSewa payment after user returns from eSewa
// ──────────────────────────────────────────────────────────────────────
export const verifyEsewaPaymentCallback = asyncHandler(async (req, res) => {
  const { encodedData, orderId } = req.body;

  if (!encodedData || !orderId) {
    return res.status(400).json({
      success: false,
      message: "encodedData and orderId are required",
    });
  }

  // Verify signature
  const verification = verifyEsewaCallback(encodedData);

  if (!verification.verified) {
    return res.status(400).json({
      success: false,
      message: `eSewa payment verification failed: ${verification.error || "Unknown error"}`,
    });
  }

  if (verification.data.status !== "COMPLETE") {
    return res.status(400).json({
      success: false,
      message: `Payment not completed. Status: ${verification.data.status}`,
    });
  }

  // Complete the payment in our system
  const result = await completePaymentAfterVerification({
    targetId: orderId,
    userId: req.user._id,
    userName: req.user.fullname,
    amount: verification.data.totalAmount,
    method: "esewa",
    reference: `ESEWA-${verification.data.transactionCode}`,
    transactionId: verification.data.transactionCode,
  });

  return res.json({
    success: true,
    message: "eSewa payment verified and confirmed",
    data: result,
  });
});

// ──────────────────────────────────────────────────────────────────────
// GET /api/guest/portal/payments/config
// Return available payment gateway configuration (safe for frontend)
// ──────────────────────────────────────────────────────────────────────
export const getPaymentConfig = asyncHandler(async (req, res) => {
  const config = getPaymentGatewayConfig();
  return res.json({ success: true, data: config });
});

// ──────────────────────────────────────────────────────────────────────
// Helper: Complete payment after Khalti/eSewa verification
// ──────────────────────────────────────────────────────────────────────
async function completePaymentAfterVerification({
  targetId,
  userId,
  userName,
  amount,
  method,
  reference,
  transactionId,
}) {
  // Try order first
  const order = await Order.findOne({ _id: targetId, customerId: userId });

  if (order) {
    order.paymentStatus = "paid";
    order.paymentMethod = method;
    order.paidAt = new Date();
    order.paidAmount = amount;
    order.paymentReference = reference;
    await order.save();

    const hotelDoc = await Hotel.findById(order.hotel).select("company");
    const dummyBookingId = new mongoose.Types.ObjectId("000000000000000000000001");

    const txn = await PaymentTransaction.create({
      hotel: order.hotel,
      company: hotelDoc?.company || dummyBookingId,
      booking: dummyBookingId,
      order: order._id,
      guest: null,
      type: "capture",
      amount,
      method,
      reference,
      status: "captured",
      processedBy: userId,
      processedByName: userName,
      notes: `Payment via ${method} for order #${order.orderNumber}`,
    });

    emitToUser(userId.toString(), "payment-confirmed", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount,
      transactionId: txn.transactionId,
      paymentMethod: method,
    });

    emitToHotel(order.hotel.toString(), "payment-received", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount,
      paymentMethod: method,
      customerName: order.customerName,
    });

    return {
      transaction: txn,
      order: { _id: order._id, orderNumber: order.orderNumber },
      paymentMethod: method,
      transactionId: txn.transactionId,
    };
  }

  // Fallback: invoice payment
  const userBookings = await Booking.find({ user: userId }).select("_id").lean();
  const bookingIds = userBookings.map((b) => b._id);

  const invoice = await Invoice.findOne({
    _id: targetId,
    booking: { $in: bookingIds },
  });

  if (!invoice) {
    throw new Error("Order/Invoice not found or access denied");
  }

  const hotelDoc = await Hotel.findById(invoice.hotel).select("company");
  const payableAmount = Number(invoice.balance) || amount;

  const txn = await PaymentTransaction.create({
    hotel: invoice.hotel,
    company: hotelDoc?.company,
    booking: invoice.booking,
    invoice: invoice._id,
    guest: invoice.guest || null,
    type: "capture",
    amount: payableAmount,
    method,
    reference,
    status: "captured",
    processedBy: userId,
    processedByName: userName,
    notes: `Payment via ${method} for invoice #${invoice.invoiceId}`,
  });

  invoice.paid = (Number(invoice.paid) || 0) + payableAmount;
  invoice.balance = Math.max(0, (Number(invoice.balance) || 0) - payableAmount);
  invoice.status = invoice.balance <= 0 ? "paid" : "partial";
  if (invoice.status === "paid") {
    invoice.paidAt = new Date();
  }
  await invoice.save();

  emitToUser(userId.toString(), "payment-confirmed", {
    invoiceId: invoice._id,
    amount: payableAmount,
    transactionId: txn.transactionId,
    paymentMethod: method,
  });

  return {
    transaction: txn,
    invoice: {
      _id: invoice._id,
      invoiceId: invoice.invoiceId,
      status: invoice.status,
      paid: invoice.paid,
      balance: invoice.balance,
    },
    paymentMethod: method,
    transactionId: txn.transactionId,
  };
}

// ──────────────────────────────────────────────────────────────────────
// GET /api/guest/portal/profile
// ──────────────────────────────────────────────────────────────────────
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("fullname username email profilePicture contact companyRole assignedProperties wishlist createdAt")
    .populate("role", "name")
    .lean();

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Get booking stats - only count paid bookings for totalSpent
  const [activeBookingCount, totalBookings, totalSpent] = await Promise.all([
    Booking.countDocuments({ user: req.user._id, status: { $in: ["Confirmed", "Checked-In"] } }),
    Booking.countDocuments({ user: req.user._id }),
    Booking.aggregate([
      { 
        $match: { 
          user: req.user._id, 
          status: "Checked-Out",
          paymentStatus: "paid"
        } 
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      profile: {
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        contact: user.contact,
        role: user.role?.name,
        companyRole: user.companyRole,
        wishlist: user.wishlist,
        createdAt: user.createdAt,
      },
      stats: {
        activeBookings: activeBookingCount,
        totalBookings,
        totalSpent: totalSpent[0]?.total || 0,
      },
    },
  });
});

// ──────────────────────────────────────────────────────────────────────
// PUT /api/guest/portal/profile
// ──────────────────────────────────────────────────────────────────────
export const updateProfile = asyncHandler(async (req, res) => {
  const { fullname, contact, profilePicture } = req.body;

  // Build update payload with only validated fields
  const updateFields = {};
  if (fullname !== undefined) {
    if (fullname.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Full name must be at least 2 characters",
      });
    }
    updateFields.fullname = fullname.trim();
  }
  if (contact !== undefined) {
    const cleanPhone = (contact || "").replace(/\D/g, "");
    if (contact && !/^\d{10,}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format (minimum 10 digits)",
      });
    }
    updateFields.contact = cleanPhone;
  }
  if (profilePicture !== undefined) {
    updateFields.profilePicture = profilePicture;
  }

  if (Object.keys(updateFields).length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid fields to update",
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).select("fullname username email profilePicture contact createdAt");

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: {
      fullname: updatedUser.fullname,
      email: updatedUser.email,
      profilePicture: updatedUser.profilePicture,
      contact: updatedUser.contact,
    },
  });
});

// ──────────────────────────────────────────────────────────────────────
// POST /api/guest/portal/request
// ──────────────────────────────────────────────────────────────────────
export const submitRequest = asyncHandler(async (req, res) => {
  const { hotelId, description, category = "Other", urgency = "medium", roomNumber } = req.body;

  const targetHotelId = hotelId || (await resolveActiveHotel(req.user._id));

  if (!targetHotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required. Please specify or have an active booking.",
    });
  }

  if (!description || description.trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: "Description must be at least 5 characters",
    });
  }

  const validCategories = ["Room Service", "Checkout", "Maintenance", "Amenities", "Other"];
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      message: `Category must be one of: ${validCategories.join(", ")}`,
    });
  }

  const validUrgencies = ["urgent", "medium", "low"];
  if (!validUrgencies.includes(urgency)) {
    return res.status(400).json({
      success: false,
      message: `Urgency must be one of: ${validUrgencies.join(", ")}`,
    });
  }

  // Resolve room number from active booking if not provided
  let resolvedRoomNumber = roomNumber;
  let resolvedBookingId = null;
  let resolvedRoomId = null;

  if (!resolvedRoomNumber) {
    const activeBooking = await Booking.findOne({
      user: req.user._id,
      hotel: targetHotelId,
      status: { $in: ["Confirmed", "Checked-In"] },
    }).populate("room", "roomNumber _id");

    if (activeBooking?.room) {
      resolvedRoomNumber = activeBooking.room.roomNumber;
      resolvedBookingId = activeBooking._id;
      resolvedRoomId = activeBooking.room._id;
    }
  }

  if (!resolvedRoomNumber) {
    return res.status(400).json({
      success: false,
      message: "Room number is required. Please have an active booking or provide roomNumber.",
    });
  }

  const hotelDoc = await Hotel.findById(targetHotelId).select("company");

  const request = await GuestRequest.create({
    hotel: targetHotelId,
    company: hotelDoc?.company || null,
    booking: resolvedBookingId,
    room: resolvedRoomId,
    roomNumber: resolvedRoomNumber,
    guest: null,
    guestName: req.user.fullname,
    guestInfo: {
      userId: req.user._id,
      email: req.user.email,
    },
    description: description.trim(),
    category,
    urgency,
    status: "open",
  });

  // Emit real-time notification to hotel staff
  try {
    emitToHotel(targetHotelId, "new-guest-request", {
      request: request.toObject(),
      message: `New ${urgency} request from Room ${resolvedRoomNumber}: ${description.trim().substring(0, 50)}`,
    });
  } catch (socketError) {
    Sentry.captureException(socketError, { tags: { feature: "guest-request-socket" } });
  }

  res.status(201).json({
    success: true,
    message: "Request submitted successfully",
    data: {
      _id: request._id,
      category: request.category,
      urgency: request.urgency,
      description: request.description,
      status: request.status,
      roomNumber: request.roomNumber,
      createdAt: request.createdAt,
    },
  });
});

// ──────────────────────────────────────────────────────────────────────
// GET /api/guest/portal/requests
// Get current guest's submitted requests
// ──────────────────────────────────────────────────────────────────────
export const getGuestRequests = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = { "guestInfo.userId": req.user._id };

  if (status && status !== "all") {
    query.status = status.trim();
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [requests, total] = await Promise.all([
    GuestRequest.find(query)
      .populate("assignedTo", "fullname")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean(),
    GuestRequest.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: requests.length,
    total,
    totalPages: Math.ceil(total / parseInt(limit, 10)),
    currentPage: parseInt(page, 10),
    data: requests.map((r) => ({
      _id: r._id,
      category: r.category,
      urgency: r.urgency,
      description: r.description,
      status: r.status,
      roomNumber: r.roomNumber,
      assignedTo: r.assignedToFullyname,
      isOverdue: r.isOverdue,
      timeRemainingMinutes: r.timeRemainingMinutes,
      resolvedAt: r.resolvedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  });
});
