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
  createStripePaymentIntent,
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
import { uploadToCloudinary } from "../middleware/upload.js";
import { emitToHotel, emitToUser } from "../config/socket.js";
import { announceGuestOrder } from "../services/guestOrderAlerts.js";
import { priceMenuLines, sendPricingError } from "../services/orderPricing.js";
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

// Query params can arrive as arrays/objects (`?status[]=a`), which crash
// `.trim()` — coerce to a plain string or undefined.
const queryString = (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

// Bounded pagination: `limit=0` would return every document and a negative
// page produces a negative skip that Mongo rejects with a 500.
const parsePaging = ({ page, limit }) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};

const MAX_ORDER_ITEMS = 50;
const MAX_ITEM_QUANTITY = 50;

// ──────────────────────────────────────────────────────────────────────
// GET /api/guest/portal/dashboard
// ──────────────────────────────────────────────────────────────────────
export const getDashboardOverview = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Fetch dashboard data in parallel
  const [activeBooking, pastBookingsCount, pendingOrdersCount, openRequestsCount, recentOrders, upcomingBookings] =
    await Promise.all([
      // Same selection + order as resolveActiveHotel, so the hero shows the
      // hotel whose menu/requests the guest is actually scoped to.
      Booking.findOne({ user: userId, status: { $in: ["Confirmed", "Checked-In"] } })
        .sort({ checkIn: 1 })
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

      // Stale bookings whose stay already ended are not "upcoming".
      Booking.find({ user: userId, status: { $in: ["Confirmed", "Checked-In", "Pending"] }, checkOut: { $gte: new Date() } })
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
  const status = queryString(req.query.status);
  const { page, limit, skip } = parsePaging(req.query);

  const query = { user: userId };
  if (status && status !== "all") {
    query.status = status;
  }

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate("hotel", "name location images")
      .populate("room", "roomNumber type")
      .sort({ checkIn: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: bookings.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: bookings,
  });
});

// ──────────────────────────────────────────────────────────────────────
// GET /api/guest/portal/menu
// ──────────────────────────────────────────────────────────────────────
export const getAuthenticatedMenu = asyncHandler(async (req, res) => {
  const hotelId = queryString(req.query.hotelId);
  const category = queryString(req.query.category);
  const search = queryString(req.query.search);

  if (hotelId && !mongoose.isValidObjectId(hotelId)) {
    return res.status(400).json({ success: false, message: "Invalid hotel ID" });
  }

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
  if (category) query.category = category;
  if (search) query.$text = { $search: search.slice(0, 100) };

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

  if (!hotelId || !mongoose.isValidObjectId(hotelId) || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID and at least one item are required",
    });
  }

  if (items.length > MAX_ORDER_ITEMS) {
    return res.status(400).json({
      success: false,
      message: `An order can contain at most ${MAX_ORDER_ITEMS} items`,
    });
  }

  // The portal only offers room service. Accepting dineIn/takeaway here let
  // any guest account push orders into the kitchen of a hotel they have no
  // booking at, because the active-booking check below only ran for
  // roomService.
  if (orderType !== "roomService") {
    return res.status(400).json({
      success: false,
      message: "Only room service orders can be placed from the guest portal",
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

  // Validate and price every line from this hotel's menu (shared rules for
  // all order paths — see services/orderPricing.js).
  let validatedItems;
  let totalPrice;
  try {
    ({ items: validatedItems, totalPrice } = await priceMenuLines({
      hotelId,
      items,
      maxLines: MAX_ORDER_ITEMS,
      maxQuantity: MAX_ITEM_QUANTITY,
      customLines: "deny",
    }));
  } catch (err) {
    return sendPricingError(res, err);
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
    notes: typeof notes === "string" ? notes.trim().slice(0, 500) : "",
    status: "pending",
    isGuestOrder: true,
    orderBy: req.user._id,
    orderByName: req.user.fullname,
  });

  await order.save();

  // Alert kitchen, waiters and reception: one real-time event per staff socket
  // plus a persisted high-priority notification for waiters + receptionists.
  // Fire-and-forget so a slow notification fan-out never delays the guest.
  announceGuestOrder({ hotelId: hotelId.toString(), order, senderId: req.user._id }).catch((err) => {
    Sentry.captureException(err, { tags: { feature: "guest-order-alert" } });
  });

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
  const status = queryString(req.query.status);
  const { page, limit, skip } = parsePaging(req.query);

  const query = { customerId: userId };
  if (status && status !== "all") {
    query.status = status;
  }

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate("hotel", "name bankTransferAccount")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
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

  const status = queryString(req.query.status);
  const { page, limit, skip } = parsePaging(req.query);
  const invoiceQuery = { booking: { $in: bookingIds } };
  if (status && status !== "all") {
    invoiceQuery.status = status;
  }

  // Fetch booking invoices. The outstanding balance is summed over every
  // invoice the guest has, not just the current page / status filter —
  // summing the page under-reported debt past 20 invoices and showed
  // Rs 0 outstanding whenever the "paid" filter was active.
  const [invoices, invoiceTotal, balanceAgg] = await Promise.all([
    Invoice.find(invoiceQuery)
      .populate("hotel", "name")
      .populate("booking", "bookingId status")
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Invoice.countDocuments(invoiceQuery),
    Invoice.aggregate([
      { $match: { booking: { $in: bookingIds } } },
      { $group: { _id: null, balance: { $sum: { $ifNull: ["$balance", 0] } } } },
    ]),
  ]);

  // Fetch unpaid orders with bills sent (food/service orders)
  const orderQuery = {
    customerId: userId,
    billSent: true,
    paymentStatus: { $ne: 'paid' },
  };
  
  // Billed orders are always "pending"; only list them when the filter allows it.
  // The outstanding balance still includes them regardless of the filter.
  const includeOrderRows = !status || status === "all" || status === "pending";
  const unpaidOrders = await Order.find(orderQuery)
    .populate("hotel", "name bankTransferAccount")
    .sort({ billSentAt: -1 })
    .lean();
  const listedOrders = includeOrderRows ? unpaidOrders : [];

  // Calculate outstanding balance from both invoices and unpaid orders
  const invoiceBalance = balanceAgg[0]?.balance || 0;
  const orderBalance = unpaidOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
  const outstandingBalance = invoiceBalance + orderBalance;

  // Transform unpaid orders to match invoice format for frontend
  const orderInvoices = listedOrders.map((order) => {
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
    total: invoiceTotal + listedOrders.length,
    totalPages: Math.ceil((invoiceTotal + listedOrders.length) / limit),
    currentPage: page,
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
  // NOTE: amount is intentionally NOT taken from the client — always derived
  // server-side from the order total / invoice balance. Card number/expiry/
  // CVV are never accepted here either — see processCardPayment below.
  const { paymentMethod = "bank" } = req.body;

  // Validate payment method
  const validMethods = ['card', 'bank']; // Wallet routes use the durable attempt service.
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

  let paymentAmount = order?.totalPrice;
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

    paymentAmount = invoice.balance;
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

  if (paymentMethod === 'bank') {
    const targetHotelId = order?.hotel || (await Invoice.findById(targetId).select('hotel').lean())?.hotel;
    const hotelAccount = await Hotel.findById(targetHotelId).select('bankTransferAccount').lean();
    const account = hotelAccount?.bankTransferAccount;
    if (!account?.enabled || !account.accountName || !account.bankName || !account.accountNumber) {
      return res.status(400).json({ success: false, message: 'Bank transfer is not configured for this hotel' });
    }
  }

  // Process payment based on method
  try {
    let paymentResult;

    if (paymentMethod === 'card') {
      // Card number/expiry/CVV are never collected here — the frontend
      // renders Stripe's own Elements iframe and only ever sends us the
      // resulting PaymentIntent id (verified in confirmOrderPayment below).
      paymentResult = await processCardPayment(paymentAmount, paymentMetadata);
    } else if (paymentMethod === 'bank') {
      // Validate bank transfer details
      const bankDetails = req.body.bankTransferDetails;
      if (!bankDetails || !bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.bankName || !bankDetails.transactionId) {
        return res.status(400).json({
          success: false,
          message: "Complete bank transfer details are required",
        });
      }
      paymentResult = await processBankTransferPayment(paymentAmount, bankDetails);
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
        // company is a required tenant reference on PaymentTransaction; a
        // dummy id here would silently misfile the row under a fake
        // company instead of the order's real one, corrupting every
        // company-scoped finance/report query that later reads it.
        if (!hotelDoc?.company) {
          return res.status(404).json({ success: false, message: "Hotel or company not found" });
        }
        const txn = await PaymentTransaction.create({
          hotel: order.hotel,
          company: hotelDoc.company,
          order: order._id,
          guest: null,
          type: "capture",
          amount: paymentAmount,
          currency: "NPR",
          // "bank-transfer" is the PaymentTransaction.method enum value (the
          // schema has no "bank"); order.paymentMethod below is a different
          // model with its own enum where "bank" IS correct -- don't unify these.
          method: "bank-transfer",
          reference: paymentResult.bankDetails.transactionId,
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
          currency: "NPR",
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
          currency: "NPR",
          // See the identical comment on the order branch above.
          method: "bank-transfer",
          reference: paymentResult.bankDetails.transactionId,
          status: "pending", // Pending verification
          processedBy: req.user._id,
          processedByName: req.user.fullname,
          notes: `Bank transfer from ${paymentResult.bankDetails.bankName} - Account: ${paymentResult.bankDetails.accountNumber} - Ref: ${paymentResult.bankDetails.transactionId}`,
        });

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
        if (!hotelDoc?.company) {
          return res.status(404).json({ success: false, message: "Hotel or company not found" });
        }
        const dummyBookingId = new mongoose.Types.ObjectId("000000000000000000000001");

        const txn = await PaymentTransaction.create({
          hotel: order.hotel,
          company: hotelDoc.company,
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
 * Process card payment via Stripe Payment Intents.
 * Returns a client_secret so the frontend can confirm payment using Stripe.js.
 */
async function processCardPayment(amount, metadata) {
  try {
    const result = await createStripePaymentIntent({
      amount,
      currency: "npr",
      metadata: {
        orderId: metadata.orderId || "",
        invoiceId: metadata.invoiceId || "",
        customerEmail: metadata.customerEmail || "",
        paymentMethod: "card",
      },
    });

    if (result.simulated) {
      // Dev fallback (no Stripe key configured) — auto-complete so the
      // flow is still testable end-to-end without real credentials.
      return {
        success: true,
        transactionId: `CARD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: "Card payment processed (dev mode)",
        method: "card",
      };
    }

    // Real Stripe: hand the clientSecret to the frontend, which renders
    // Stripe's own Elements iframe — card details never reach our server.
    return {
      success: true,
      requiresClientConfirmation: true,
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      transactionId: result.paymentIntentId,
      message: "Card payment intent created",
      method: "card",
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
async function processBankTransferPayment(amount, bankDetails) {
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
    const transactionRef = bankDetails.transactionId.trim().toUpperCase();

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
        transactionId: transactionRef,
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

  // Idempotency guard: a retried/duplicate confirm call for a PaymentIntent
  // we've already recorded must not double-credit the order/invoice.
  const existingTxn = await PaymentTransaction.findOne({ reference: paymentIntentId });
  if (existingTxn) {
    return res.json({
      success: true,
      message: "Payment already confirmed",
      alreadyProcessed: true,
      data: { transaction: existingTxn },
    });
  }

  if (order) {
    // Resolve hotel to get company for payment transaction
    const hotelDoc = await Hotel.findById(order.hotel).select("company");
    if (!hotelDoc) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }

    if (!hotelDoc.company) {
      return res.status(404).json({ success: false, message: "Hotel or company not found" });
    }
    // Record payment transaction (use dummy ObjectId for booking; order is not booking-linked)
    const dummyBookingId = new mongoose.Types.ObjectId("000000000000000000000001");
    const txn = await PaymentTransaction.create({
      hotel: order.hotel,
      company: hotelDoc.company,
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
export { verifyKhaltiCallback, verifyEsewaPaymentCallback } from './walletPaymentController.js';

export const getPaymentConfig = asyncHandler(async (req, res) => {
  return res.json({ success: true, data: getPaymentGatewayConfig() });
});
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("fullname username email profilePicture contact companyRole assignedProperties wishlist isGoogleUser createdAt")
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
        isGoogleUser: Boolean(user.isGoogleUser),
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
  // Non-string values used to crash `.trim()` / `.replace()` with a 500, and
  // profilePicture was stored verbatim (javascript: URLs, objects, megabytes).
  if (fullname !== undefined) {
    const name = typeof fullname === "string" ? fullname.trim() : "";
    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Full name must be between 2 and 100 characters",
      });
    }
    updateFields.fullname = name;
  }
  if (contact !== undefined && contact !== null) {
    if (typeof contact !== "string" && typeof contact !== "number") {
      return res.status(400).json({ success: false, message: "Invalid phone number" });
    }
    const cleanPhone = String(contact).replace(/\D/g, "");
    if (cleanPhone && !/^\d{10,15}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must contain 10 to 15 digits",
      });
    }
    updateFields.contact = cleanPhone;
  }
  if (profilePicture !== undefined) {
    if (profilePicture === null || profilePicture === "") {
      updateFields.profilePicture = "";
    } else {
      let valid = false;
      if (typeof profilePicture === "string" && profilePicture.length <= 2048) {
        try {
          valid = ["http:", "https:"].includes(new URL(profilePicture).protocol);
        } catch {
          valid = false;
        }
      }
      if (!valid) {
        return res.status(400).json({
          success: false,
          message: "Profile picture must be an http(s) URL",
        });
      }
      updateFields.profilePicture = profilePicture;
    }
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

// Cloudinary folder: StayHaven/guest/<guest_full_name>/img  (e.g. "Test Guest" -> test_guest)
const guestPictureFolder = (fullname, username) => {
  const safe = String(fullname || username || "unknown")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "unknown";
  return `StayHaven/guest/${safe}/img`;
};

// ──────────────────────────────────────────────────────────────────────
// POST /api/guest/portal/profile/picture   (multipart, field: profilePicture)
// ──────────────────────────────────────────────────────────────────────
export const uploadProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Please choose an image to upload" });
  }

  const user = await User.findById(req.user._id).select("fullname username");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  let result;
  try {
    result = await uploadToCloudinary(req.file.buffer, { folder: guestPictureFolder(user.fullname, user.username) });
  } catch (error) {
    Sentry.captureException(error);
    return res.status(502).json({ success: false, message: "Image upload failed. Please try again." });
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { profilePicture: result.secure_url } },
    { new: true }
  ).select("profilePicture");

  res.status(200).json({
    success: true,
    message: "Profile photo updated",
    data: { profilePicture: updatedUser.profilePicture },
  });
});

// ──────────────────────────────────────────────────────────────────────
// DELETE /api/guest/portal/profile/picture
// ──────────────────────────────────────────────────────────────────────
export const removeProfilePicture = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $set: { profilePicture: null } });
  res.status(200).json({
    success: true,
    message: "Profile photo removed",
    data: { profilePicture: null },
  });
});

// ──────────────────────────────────────────────────────────────────────
// PUT /api/guest/portal/profile/password
// Body: { currentPassword, newPassword }
// ──────────────────────────────────────────────────────────────────────
export const changeGuestPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Current and new passwords are required" });
  }
  // bcrypt only uses the first 72 bytes; reject anything longer outright.
  if (newPassword.length > 72) {
    return res.status(400).json({ success: false, message: "Password must be at most 72 characters" });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  // Google sign-ups get a random password they never saw; they sign in with Google.
  if (user.isGoogleUser) {
    return res.status(400).json({
      success: false,
      message: "Your account uses Google sign-in, so there is no password to change",
    });
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      field: "currentPassword",
      message: "Current password is incorrect",
    });
  }

  const { isValid, errors } = user.validatePassword(newPassword);
  if (!isValid) {
    return res.status(400).json({ success: false, field: "newPassword", message: errors[0], errors });
  }

  if (await user.matchPassword(newPassword)) {
    return res.status(400).json({
      success: false,
      field: "newPassword",
      message: "New password must be different from your current password",
    });
  }

  user.password = newPassword; // hashed by the pre-save hook
  await user.save();

  res.status(200).json({ success: true, message: "Password changed successfully" });
});

// ──────────────────────────────────────────────────────────────────────
// POST /api/guest/portal/request
// ──────────────────────────────────────────────────────────────────────
export const submitRequest = asyncHandler(async (req, res) => {
  // roomNumber from the body is deliberately ignored: trusting it (and a
  // body hotelId with no booking check) let any guest file requests into
  // another hotel's queue under an arbitrary room number.
  const { hotelId, description, category = "Other", urgency = "medium" } = req.body;

  if (hotelId !== undefined && hotelId !== null && hotelId !== "" && !mongoose.isValidObjectId(hotelId)) {
    return res.status(400).json({ success: false, message: "Invalid hotel ID" });
  }

  const targetHotelId = hotelId || (await resolveActiveHotel(req.user._id));

  if (!targetHotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required. Please specify or have an active booking.",
    });
  }

  const cleanDescription = typeof description === "string" ? description.trim() : "";
  if (cleanDescription.length < 5 || cleanDescription.length > 500) {
    return res.status(400).json({
      success: false,
      message: "Description must be between 5 and 500 characters",
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

  // Room context always comes from the guest's own active booking at this hotel.
  const activeBooking = await Booking.findOne({
    user: req.user._id,
    hotel: targetHotelId,
    status: { $in: ["Confirmed", "Checked-In"] },
  }).populate("room", "roomNumber _id");

  if (!activeBooking?.room?.roomNumber) {
    return res.status(400).json({
      success: false,
      message: "You need an active booking at this hotel to submit a request.",
    });
  }

  const resolvedRoomNumber = activeBooking.room.roomNumber;
  const resolvedBookingId = activeBooking._id;
  const resolvedRoomId = activeBooking.room._id;

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
    description: cleanDescription,
    category,
    urgency,
    status: "open",
  });

  // Emit real-time notification to hotel staff
  try {
    emitToHotel(targetHotelId, "new-guest-request", {
      request: request.toObject(),
      message: `New ${urgency} request from Room ${resolvedRoomNumber}: ${cleanDescription.substring(0, 50)}`,
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
  const status = queryString(req.query.status);
  const { page, limit, skip } = parsePaging(req.query);
  const query = { "guestInfo.userId": req.user._id };

  if (status && status !== "all") {
    query.status = status;
  }

  const [requests, total] = await Promise.all([
    GuestRequest.find(query)
      .populate("assignedTo", "fullname")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    GuestRequest.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: requests.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: requests.map((r) => ({
      _id: r._id,
      category: r.category,
      urgency: r.urgency,
      description: r.description,
      status: r.status,
      roomNumber: r.roomNumber,
      assignedTo: r.assignedTo?.fullname || null,
      isOverdue: r.isOverdue,
      timeRemainingMinutes: r.timeRemainingMinutes,
      resolvedAt: r.resolvedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  });
});
