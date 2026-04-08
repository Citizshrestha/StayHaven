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

    const menuItem = await MenuItem.findById(item.menuItem);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: `Menu item not found: ${item.menuItem}`,
      });
    }

    if (menuItem.hotel.toString() !== hotelId) {
      return res.status(400).json({
        success: false,
        message: `Menu item "${menuItem.name}" does not belong to this hotel`,
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
    emitToHotel(hotelId, "new-order", {
      order: order.toObject(),
      message: `New ${orderType === "roomService" ? "room service" : "dine-in"} order #${order.orderNumber}`,
    });
    emitToKitchen(hotelId, "new-order", { order: order.toObject() });
    if (orderType !== "roomService") {
      emitToWaiters(hotelId, "new-order", { order: order.toObject() });
    }
  } catch (socketError) {
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
// ──────────────────────────────────────────────────────────────────────
export const getUserInvoices = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get all bookings for this user
  const userBookings = await Booking.find({ user: userId }).select("_id bookingId").lean();
  const bookingIds = userBookings.map((b) => b._id);

  const { status, page = 1, limit = 20 } = req.query;
  const query = { booking: { $in: bookingIds } };
  if (status && status !== "all") {
    query.status = status.trim();
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [invoices, total] = await Promise.all([
    Invoice.find(query)
      .populate("hotel", "name")
      .populate("booking", "bookingId status")
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean(),
    Invoice.countDocuments(query),
  ]);

  // Total outstanding balance
  const outstandingBalance = invoices.reduce(
    (sum, inv) => sum + (inv.balance || 0),
    0
  );

  res.status(200).json({
    success: true,
    count: invoices.length,
    total,
    totalPages: Math.ceil(total / parseInt(limit, 10)),
    currentPage: parseInt(page, 10),
    outstandingBalance,
    data: invoices.map((inv) => ({
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
    })),
  });
});

// ──────────────────────────────────────────────────────────────────────
// POST /api/guest/portal/orders/:id/pay
// ──────────────────────────────────────────────────────────────────────
export const payOrder = asyncHandler(async (req, res) => {
  const { id: targetId } = req.params;
  const { amount, currency = "usd" } = req.body;

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

    paymentMetadata = {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber?.toString() || "",
      customerId: req.user._id.toString(),
      customerEmail: req.user.email || "",
      targetType: "order",
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
      customerEmail: req.user.email || "",
      targetType: "invoice",
    };
  }

  if (!paymentAmount || paymentAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Valid amount is required",
    });
  }

  if (!stripe) {
    // Dev mode: simulate payment
    return res.json({
      success: true,
      message: "Development mode: Simulated payment",
      data: {
        clientSecret: "simulated_secret_" + Date.now(),
        amount: paymentAmount,
        currency,
        targetId,
        targetType,
        simulated: true,
      },
    });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(paymentAmount * 100),
    currency,
    metadata: paymentMetadata,
    automatic_payment_methods: { enabled: true },
  });

  res.json({
    success: true,
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentAmount,
      currency,
      targetId,
      targetType,
    },
  });
});

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
