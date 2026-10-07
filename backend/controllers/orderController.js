import mongoose from "mongoose";
import { Order } from "../models/order.schema.js";
import { HotelTable } from "../models/hotelTable.schema.js";
import { DiningSession } from "../models/diningSession.schema.js";
import {
  openTableSession,
  createTakeawaySession,
  recalculateSession,
  getSessionWithOrders,
} from "../services/diningSessionService.js";
import { computeTotals } from "../services/diningBilling.js";
import { priceMenuLines, sendPricingError, DEFAULT_MAX_LINES } from "../services/orderPricing.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { MenuItem } from "../models/menuItem.schema.js";
import { User } from "../models/user.schema.js";
import { Role } from "../models/role.schema.js";
import { emitToHotel, emitToHotelStaff, emitToWaiters, emitToUser, emitToGuestSession } from "../config/socket.js";
import { sendEmail, sendSMS, sendWhatsApp, generateBillEmailHTML, generateBillTextMessage } from "../services/notificationService.js";
import { createNotificationInternal } from "./notificationController.js";
import { logAudit } from "../middleware/auditLogger.js";

const getUserRole = (req) => req.user?.role?.name || req.user?.companyRole;

const getAssignedHotelIds = (req) => {
  const assigned = req.user?.assignedProperties || [];
  return assigned
    .map((p) => (typeof p === "object" ? p?._id?.toString() : p?.toString()))
    .filter(Boolean);
};

const assertHotelAccess = async (req, hotelId) => {
  const role = getUserRole(req);

  // Superadmins should NOT have access to hotel-specific financial data
  // They can manage hotels (approve/reject) but cannot view bookings, revenue, etc.
  if (role === "admin" || role === "superadmin") {
    throw Object.assign(new Error("Superadmins cannot access hotel-specific operational data"), { status: 403 });
  }

  const assignedHotelIds = getAssignedHotelIds(req);
  const userCompany = req.user?.company?._id?.toString?.() || req.user?.company?.toString?.() || req.user?.company;

  const hotel = await Hotel.findById(hotelId).select("company");
  if (!hotel) {
    throw Object.assign(new Error("Hotel not found"), { status: 404 });
  }

  if (role === "receptionist" && assignedHotelIds.length > 0 && !assignedHotelIds.includes(hotelId.toString())) {
    throw Object.assign(new Error("Not authorized for this hotel"), { status: 403 });
  }

  if (role !== "owner" && userCompany && hotel.company?.toString() !== userCompany.toString()) {
    throw Object.assign(new Error("Not authorized for this hotel company"), { status: 403 });
  }

  return hotel;
};

const ORDER_TYPES = ["dineIn", "takeaway", "roomService"];

// Order milestones a registered guest gets a saved notification for.
const GUEST_NOTIFY_STATUSES = {
  confirmed: { title: "confirmed", message: "The kitchen has accepted your order." },
  ready: { title: "is on its way", message: "Your order is ready and being brought to you." },
  delivered: { title: "delivered", message: "Enjoy your meal! It has been added to your bill." },
  cancelled: { title: "cancelled", message: "Your order was cancelled. Contact the front desk if this is unexpected." },
};
const CUSTOM_ITEM_ROLES = ["manager", "owner"];
const PHONE_PATTERN = /^[+\d][\d\s-]{5,19}$/;

const orderSummary = (order) => ({
  _id: order._id,
  orderNumber: order.orderNumber,
  orderType: order.orderType,
  tableNumber: order.tableNumber,
  roomNumber: order.roomNumber,
  session: order.session,
  status: order.status,
  items: order.items,
  totalPrice: order.totalPrice,
  customerName: order.customerName,
  createdAt: order.createdAt,
});

export const createOrder = asyncHandler(async (req, res) => {
  const {
    hotelId,
    roomId,
    roomNumber,
    tableId,
    tableNumber,
    orderType = "dineIn",
    items,
    notes,
    priority = "normal",
    customerId, // optional: registered user
    customerName,
    customerPhone,
    idempotencyKey,
  } = req.body;

  // basic hotel and items availability checks
  if (!hotelId || !mongoose.isValidObjectId(hotelId) || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "hotelId and menu items are required",
    });
  }
  if (items.length > DEFAULT_MAX_LINES) {
    return res.status(400).json({ success: false, message: `An order can contain at most ${DEFAULT_MAX_LINES} lines` });
  }
  if (!ORDER_TYPES.includes(orderType)) {
    return res.status(400).json({ success: false, message: `Order type must be one of: ${ORDER_TYPES.join(", ")}` });
  }
  if (!["normal", "high"].includes(priority)) {
    return res.status(400).json({ success: false, message: "Priority must be normal or high" });
  }
  if (idempotencyKey !== undefined && (typeof idempotencyKey !== "string" || idempotencyKey.length < 8 || idempotencyKey.length > 100)) {
    return res.status(400).json({ success: false, message: "Invalid idempotency key" });
  }
  if ((customerName != null && typeof customerName !== "string") || (customerPhone != null && typeof customerPhone !== "string") || (notes != null && typeof notes !== "string")) {
    return res.status(400).json({ success: false, message: "Invalid customer details" });
  }
  const cleanName = customerName?.trim() || "";
  const cleanPhone = customerPhone?.trim() || "";
  if (cleanName.length > 100) {
    return res.status(400).json({ success: false, message: "Customer name is too long" });
  }
  if (cleanPhone && !PHONE_PATTERN.test(cleanPhone)) {
    return res.status(400).json({ success: false, message: "Enter a valid phone number" });
  }
  if (notes && notes.length > 500) {
    return res.status(400).json({ success: false, message: "Notes must be under 500 characters" });
  }

  // order-type specific checks
  if (orderType === "roomService" && !roomNumber) {
    return res.status(400).json({
      success: false,
      message: "Room Number is required for room service orders",
    });
  }

  if (orderType === "dineIn" && !tableNumber && !tableId) {
    return res.status(400).json({
      success: false,
      message: "Choose a table for dine-in orders",
    });
  }

  if (orderType === "takeaway" && !cleanName) {
    return res.status(400).json({
      success: false,
      message: "Customer name is required for takeaway orders so the order can be called out",
    });
  }

  // validate hotel + property/company scope
  await assertHotelAccess(req, hotelId);

  // Double-tap / network-retry safety: the same key returns the same order.
  if (idempotencyKey) {
    const existing = await Order.findOne({ idempotencyKey, hotel: hotelId });
    if (existing) {
      return res.status(200).json({ success: true, message: "Order already created", order: existing });
    }
  }

  const hotelDoc = await Hotel.findById(hotelId).select("company restaurantBilling");

  // Dine-in orders must target a real table so they land on that table's
  // tab. Hotels that have not set up tables yet keep the legacy free-text
  // table number (billed per order) until they do.
  let tableDoc = null;
  let resolvedTableNumber = tableNumber ? String(tableNumber).trim().replace(/^table\s+/i, "") : undefined;
  if (orderType === "dineIn") {
    if (tableId && !mongoose.isValidObjectId(tableId)) {
      return res.status(400).json({ success: false, message: "Invalid table" });
    }
    tableDoc = await HotelTable.findOne({
      hotel: hotelId,
      isActive: true,
      ...(tableId ? { _id: tableId } : { tableNumber: resolvedTableNumber }),
    });
    if (!tableDoc && (tableId || await HotelTable.exists({ hotel: hotelId }))) {
      return res.status(400).json({
        success: false,
        message: `Table ${resolvedTableNumber || ""} was not found. Choose a table from the list.`.replace("  ", " "),
      });
    }
    if (tableDoc) {
      if (tableDoc.status === "maintenance") {
        return res.status(409).json({ success: false, message: `Table ${tableDoc.tableNumber} is not in service` });
      }
      resolvedTableNumber = tableDoc.tableNumber;
    }
  }

  // if roomService and roomId provided, validate room belongs to that hotel
  let validatedRoomId = null;
  if (orderType === "roomService" && roomId) {
    const room = await Room.findById(roomId);
    if (room && room.hotel.toString() === hotelId) {
      validatedRoomId = room._id;
    }
    // If room not found or doesn't match, we still allow the order with just roomNumber
  }

  // Validate and price every line (shared rules for all order paths — see
  // services/orderPricing.js). Open-priced custom lines are a pricing
  // override, so only supervisors may create them.
  let validatedItems;
  let totalPrice;
  try {
    ({ items: validatedItems, totalPrice } = await priceMenuLines({
      hotelId,
      items,
      customLines: CUSTOM_ITEM_ROLES.includes(getUserRole(req)) ? "allow" : "forbid",
    }));
  } catch (err) {
    return sendPricingError(res, err);
  }

  // Dine-in (with a real table) joins that table's open tab; takeaway gets
  // its own tab so both are settled through the same bill + payment flow.
  let diningSession = null;
  if (tableDoc) {
    ({ session: diningSession } = await openTableSession({
      hotel: hotelDoc,
      table: tableDoc,
      source: "staff",
      user: req.user,
      customerName: cleanName || undefined,
      customerPhone: cleanPhone || undefined,
    }));
  } else if (orderType === "takeaway") {
    diningSession = await createTakeawaySession({
      hotel: hotelDoc,
      user: req.user,
      customerName: cleanName,
      customerPhone: cleanPhone || undefined,
    });
  }

  const order = new Order({
    hotel: hotelId,
    room: orderType === "roomService" ? validatedRoomId : undefined,
    roomNumber: orderType === "roomService" ? roomNumber : undefined,
    tableNumber: orderType === "dineIn" ? resolvedTableNumber : undefined,
    table: tableDoc?._id,
    session: diningSession?._id,
    orderType,

    // Staff info (from authenticated user)
    orderBy: req.user._id,
    orderByName: req.user.fullname,

    // Customer info
    customerId: customerId && mongoose.isValidObjectId(customerId) ? customerId : undefined,
    customerName: cleanName || undefined,
    customerPhone: cleanPhone || undefined,

    // Order details
    items: validatedItems,
    totalPrice,
    status: "pending",
    priority,
    notes: notes || "",
    idempotencyKey: idempotencyKey || undefined,
  });

  try {
    await order.save();
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.idempotencyKey) {
      const winner = await Order.findOne({ idempotencyKey, hotel: hotelId });
      if (winner) return res.status(200).json({ success: true, message: "Order already created", order: winner });
    }
    // A takeaway tab created for an order that failed to save is empty; drop it.
    if (diningSession && orderType === "takeaway") {
      await DiningSession.deleteOne({ _id: diningSession._id, "payments.0": { $exists: false } }).catch(() => {});
    }
    throw err;
  }

  if (order.session) {
    await recalculateSession(order.session).catch(() => {});
  }

  // Emit real-time event for new order to ALL staff in hotel
  // (Chiefs/kitchen are already in the hotel room, no need for separate emission)
  emitToHotelStaff(hotelId, "new-order", {
    order: { ...orderSummary(order), priority: order.priority },
    creatorId: req.user._id.toString(), // Include creator ID to filter self-notifications
    message: `New order #${order.orderNumber} placed by ${order.orderByName}`,
  });

  // Create persistent notifications in database for all staff in this hotel
  try {
    // Get all staff users for this hotel (excluding the creator)
    const hotelStaff = await User.find({
      assignedProperties: hotelId,
      _id: { $ne: req.user._id }, // Exclude the order creator
      companyRole: { $in: ['waiter', 'chief', 'kitchen', 'receptionist', 'manager'] }
    }).select('_id');

    // Format location for notification message
    const location = order.orderType === 'roomService' 
      ? `Room ${order.roomNumber}`
      : order.orderType === 'dineIn'
      ? `Table ${order.tableNumber}`
      : 'Takeaway';

    // Create notification for each staff member
    const notificationPromises = hotelStaff.map(staff => 
      createNotificationInternal({
        userId: staff._id,
        senderId: req.user._id,
        type: 'order_status',
        title: `New Order #${order.orderNumber}`,
        message: `New order #${order.orderNumber} for ${location}`,
        priority: order.priority === 'high' ? 'high' : 'medium',
        actionUrl: `/staff/orders/${order._id}`,
        payload: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          tableNumber: order.tableNumber,
          roomNumber: order.roomNumber,
        }
      })
    );

    await Promise.all(notificationPromises);
  } catch {
    // Notification creation failed — non-fatal, order already persisted
  }

  return res.status(201).json({
    success: true,
    message: "Order created successfully",
    order,
  });
});

export const getOrders = asyncHandler(async (req, res) => {
  const { hotelId, status, orderType, page = 1, limit = 100, search } = req.query;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "hotelId is required",
    });
  }

  await assertHotelAccess(req, hotelId);

  const parsedPage = parseInt(page, 10);
  const parsedLimit = Math.min(parseInt(limit, 10), 200);
  const skip = (parsedPage - 1) * parsedLimit;

  const filter = { hotel: hotelId };
  if (status && status !== "all") filter.status = status;
  if (orderType && orderType !== "all") filter.orderType = orderType;
  if (search) {
    filter.$or = [
      { customerName: { $regex: search, $options: "i" } },
      { roomNumber: { $regex: search, $options: "i" } },
      { tableNumber: { $regex: search, $options: "i" } },
      { orderByName: { $regex: search, $options: "i" } },
    ];
    const n = Number(search);
    if (!Number.isNaN(n)) {
      filter.$or.push({ orderNumber: n });
    }
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("orderBy", "fullname email")
      .populate("items.menuItem", "name price image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit),
    Order.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    count: orders.length,
    total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages: Math.ceil(total / parsedLimit),
    orders,
  });
});

// Forward-only status progression. 'cancelled' is reachable from any
// non-terminal status; no status may move backward once advanced.
const ORDER_STATUS_SEQUENCE = ["pending", "confirmed", "preparing", "ready", "delivered"];
const TERMINAL_STATUSES = ["delivered", "cancelled"];

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, cancelReason } = req.body;

  const validStatuses = [
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "delivered",
    "cancelled",
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    });
  }

  if (status === "cancelled" && (!cancelReason || !cancelReason.trim())) {
    return res.status(400).json({
      success: false,
      message: "A cancellation reason is required",
    });
  }

  // Build hotel filter for multi-tenancy
  const role = getUserRole(req);
  const assignedHotelIds = getAssignedHotelIds(req);
  const userCompany = req.user?.company?._id?.toString?.() || req.user?.company?.toString?.() || req.user?.company;

  let hotelFilter = {};
  if (role === 'receptionist' && assignedHotelIds.length > 0) {
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  } else if (userCompany) {
    const userHotels = await Hotel.find({ company: userCompany }).select('_id');
    hotelFilter = { hotel: { $in: userHotels.map(h => h._id) } };
  } else {
    // No company context: fall back to assigned properties. Never unscoped —
    // an empty filter here used to expose every hotel's orders.
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  }

  // Find order with hotel scope - prevents cross-hotel access
  const existing = await Order.findOne({ _id: orderId, ...hotelFilter }).select('status session items');
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Order not found or access denied",
    });
  }

  // Cancelling an order on a part-paid tab must not push the bill below what
  // was already collected (that needs a refund, not a silent negative balance).
  if (status === "cancelled" && existing.session && !TERMINAL_STATUSES.includes(existing.status)) {
    const { session: tab, orders: tabOrders } = await getSessionWithOrders(existing.session);
    if (tab.status !== "open") {
      return res.status(409).json({ success: false, message: `This order's bill is already ${tab.status}` });
    }
    if (tab.payments.length > 0) {
      const after = computeTotals({
        orders: tabOrders.filter((o) => String(o._id) !== String(existing._id)),
        charges: tab.charges,
        discount: tab.discount,
        payments: tab.payments,
        refunds: tab.refunds,
      });
      if (after.balance < 0) {
        return res.status(409).json({
          success: false,
          message: `Rs ${Math.abs(after.balance).toFixed(2)} has already been paid towards this order. Refund the customer before cancelling it.`,
        });
      }
    }
  }

  // Enforce forward-only transitions. Terminal statuses (delivered/cancelled)
  // cannot be changed at all; non-terminal statuses cannot move backward.
  if (TERMINAL_STATUSES.includes(existing.status)) {
    return res.status(400).json({
      success: false,
      message: `Order is already ${existing.status} and cannot be changed`,
    });
  }
  if (status !== "cancelled") {
    const currentIndex = ORDER_STATUS_SEQUENCE.indexOf(existing.status);
    const nextIndex = ORDER_STATUS_SEQUENCE.indexOf(status);
    if (nextIndex < currentIndex) {
      return res.status(400).json({
        success: false,
        message: `Cannot move order status backward from '${existing.status}' to '${status}'`,
      });
    }
  }

  const previousStatus = existing.status;
  const update = { status };
  if (status === "delivered") {
    update.deliveredAt = new Date();
  }
  if (status === "cancelled") {
    update.cancelledAt = new Date();
    update.cancelledBy = req.user?._id;
    update.cancellationReason = cancelReason.trim();
  }

  // Atomic transition: the filter re-checks the pre-condition (status is
  // still non-terminal and still the status we read) at write time, closing
  // the read-then-write race where two concurrent requests could both pass
  // the checks above against stale in-memory state before either commits.
  const order = await Order.findOneAndUpdate(
    { _id: orderId, ...hotelFilter, status: previousStatus },
    { $set: update },
    { new: true }
  );

  if (!order) {
    return res.status(409).json({
      success: false,
      message: "Order status was changed by someone else. Please refresh and try again.",
    });
  }

  // Audit trail: who moved which order from what status to what (fires
  // async, never blocks the response — logAudit swallows its own errors)
  logAudit(
    req.user?._id,
    status === "cancelled" ? "order_cancelled" : "order_status_updated",
    "order",
    order._id,
    { status: previousStatus },
    { status, ...(status === "cancelled" ? { reason: cancelReason.trim() } : {}) },
    req
  );

  return finalizeStatusUpdate(req, res, order, status);
});

// POST /api/v1/staff/orders/:orderId/cancel
// Thin wrapper around updateOrderStatus so cancellation goes through the same
// hotel-scoping, forward-only transition guard, and event emission — this is
// the endpoint the hotel-admin OrderManagement UI's cancel dialog calls.
export const cancelOrder = asyncHandler(async (req, res) => {
  req.body = { ...req.body, status: "cancelled", cancelReason: req.body.reason };
  return updateOrderStatus(req, res);
});

// Emits real-time events after a status change and sends the HTTP response.
// Extracted from updateOrderStatus so cancelOrder can delegate to it cleanly.
const finalizeStatusUpdate = async (req, res, order, status) => {
  // Keep the party's tab in step: cancelling removes the order from the bill
  // and "ready"/"served" changes whether the tab can be closed.
  if (order.session) {
    await recalculateSession(order.session).catch(() => {});
  }

  // Get the role of the user making this update
  const updaterRole = getUserRole(req) || 'staff';
  const updaterName = req.user?.fullname || 'Staff';

  // Emit real-time event for order status update
  // Different events based on status change
  const eventData = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    tableNumber: order.tableNumber,
    roomNumber: order.roomNumber,
    orderType: order.orderType,
    updatedAt: new Date(),
    updatedBy: updaterName,
    updaterId: req.user?._id?.toString(), // For frontend to filter self-notifications
    updaterRole: updaterRole,
  };

  const location = order.orderType === 'takeaway'
    ? 'Takeaway'
    : order.orderType === 'roomService'
      ? `Room ${order.roomNumber}`
      : `Table ${order.tableNumber}`;

  // One broadcast to every staff socket of the hotel (kitchen, waiters,
  // reception, managers) — delivered ONCE per socket. The previous code emitted
  // to hotel-<id> and then again to the waiters/kitchen rooms, so waiters and
  // cooks (who sit in both rooms) got every update 2x.
  const isKitchenUpdate = updaterRole === 'chief' || updaterRole === 'kitchen';
  const statusMessage = isKitchenUpdate
    ? `🍳 Kitchen: Order #${order.orderNumber} (${location}) is now "${status}"`
    : updaterRole === 'waiter'
      ? `🍽️ Waiter ${updaterName}: Order #${order.orderNumber} (${location}) marked as "${status}"`
      : `📝 ${updaterName}: Order #${order.orderNumber} (${location}) → "${status}"`;

  emitToHotelStaff(order.hotel.toString(), "order-status-updated", { ...eventData, message: statusMessage });

  // Pickup alert for waiters. Waiters sit in exactly one waiters room, so a
  // single emit reaches each once; the frontend merges it with the broadcast.
  if (status === "ready") {
    emitToWaiters(order.hotel.toString(), "order-ready", {
      ...eventData,
      message: `Order #${order.orderNumber} (${location}) is ready for pickup!`,
      customerName: order.customerName,
      items: order.items,
    });
  }

  // Registered guest: a saved notification for the milestones they care about
  // (their portal bell survives a refresh), plus the live tracking event below.
  if (order.customerId && GUEST_NOTIFY_STATUSES[status]) {
    createNotificationInternal({
      userId: order.customerId,
      senderId: req.user?._id,
      type: status === "delivered" ? "order_delivered" : "order_status",
      title: `Order #${order.orderNumber} ${GUEST_NOTIFY_STATUSES[status].title}`.slice(0, 100),
      message: GUEST_NOTIFY_STATUSES[status].message,
      priority: status === "cancelled" ? "high" : "medium",
      actionUrl: "/guest-dashboard/room-service",
      payload: { orderId: order._id.toString(), orderNumber: order.orderNumber, status },
    }).catch(() => {});
  }

  // Notify registered guest who placed the order
  if (order.customerId) {
    emitToUser(order.customerId.toString(), "order-status-update", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalPrice: order.totalPrice,
      items: order.items,
      updatedAt: new Date(),
    });
  }

  // Notify anonymous QR guest via their session room
  if (order.guestSessionId) {
    emitToGuestSession(order.guestSessionId, "order-status-update", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      updatedAt: new Date(),
    });
  }

  // Create persistent notifications in database for status updates
  try {
    // Get all staff users for this hotel (excluding the updater)
    // A staff member's role may live on companyRole OR on the Role document;
    // matching only companyRole silently skipped cooks/waiters set up via Role.
    const STATUS_ALERT_ROLES = ['waiter', 'chief', 'kitchen', 'receptionist', 'manager'];
    const staffRoles = await Role.find({ name: { $in: STATUS_ALERT_ROLES } }).select('_id').lean();
    const hotelStaff = (await User.find({
      assignedProperties: order.hotel,
      _id: { $ne: req.user._id }, // Exclude the person who made the update
      isActive: { $ne: false },
      $or: [
        { companyRole: { $in: STATUS_ALERT_ROLES } },
        { role: { $in: staffRoles.map((r) => r._id) } },
      ],
    }).select('_id companyRole role').populate('role', 'name').lean())
      .map((s) => ({ _id: s._id, companyRole: s.companyRole || s.role?.name }));

    // Cross-role notifications: the opposite operational role (kitchen<->waiter)
    // always gets notified, PLUS receptionist/manager always stay informed
    // regardless of who made the change (mirrors the broadcast above).
    let recipients;
    if (updaterRole === 'chief' || updaterRole === 'kitchen') {
      recipients = hotelStaff.filter(staff => ['waiter', 'receptionist', 'manager'].includes(staff.companyRole));
    } else if (updaterRole === 'waiter') {
      recipients = hotelStaff.filter(staff => ['chief', 'kitchen', 'receptionist', 'manager'].includes(staff.companyRole));
    } else {
      recipients = hotelStaff;
    }

    if (recipients.length > 0) {
      const statusEmoji = {
        preparing: '🍳',
        ready: '✅',
        delivered: '🎉',
        cancelled: '❌',
        confirmed: '👍',
        pending: '⏳',
      };
      const emoji = statusEmoji[status] || '📝';

      // Create notification for each recipient
      const notificationPromises = recipients.map(staff => 
        createNotificationInternal({
          userId: staff._id,
          senderId: req.user._id,
          type: status === 'delivered' ? 'order_delivered' : 'order_status',
          title: `Order #${order.orderNumber} ${status}`,
          message: `${emoji} Order #${order.orderNumber} (${location}) → ${status.toUpperCase()}`,
          priority: status === 'ready' ? 'high' : 'medium',
          actionUrl: `/staff/orders/${order._id}`,
          payload: {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            status: order.status,
            orderType: order.orderType,
            tableNumber: order.tableNumber,
            roomNumber: order.roomNumber,
          }
        })
      );

      await Promise.all(notificationPromises);
    }
  } catch {
    // Notification creation failed — non-fatal, status update already saved
  }

  return res.status(200).json({
    success: true,
    message: `Order status updated to ${status}`,
    order,
  });
};

// Update order details (items, customer info, priority, notes)
export const updateOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { customerName, customerPhone, priority, notes, items } = req.body;

  // Build hotel filter for multi-tenancy
  const role = getUserRole(req);
  const assignedHotelIds = getAssignedHotelIds(req);
  const userCompany = req.user?.company?._id?.toString?.() || req.user?.company?.toString?.() || req.user?.company;

  let hotelFilter = {};
  if (role === 'receptionist' && assignedHotelIds.length > 0) {
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  } else if (userCompany) {
    const userHotels = await Hotel.find({ company: userCompany }).select('_id');
    hotelFilter = { hotel: { $in: userHotels.map(h => h._id) } };
  } else {
    // No company context: fall back to assigned properties. Never unscoped —
    // an empty filter here used to expose every hotel's orders.
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  }

  // Find order with hotel scope - prevents cross-hotel access
  const order = await Order.findOne({ _id: orderId, ...hotelFilter });
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found or access denied",
    });
  }

  // Only allow editing pending or confirmed orders
  const editableStatuses = ["pending", "confirmed"];
  if (!editableStatuses.includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot edit order with status "${order.status}". Only pending or confirmed orders can be edited.`,
    });
  }

  // A settled order is part of an issued receipt and must not change.
  if (order.paymentStatus === "paid") {
    return res.status(409).json({ success: false, message: "This order has been paid and can no longer be edited" });
  }
  if (order.session) {
    const tab = await DiningSession.findById(order.session).select("status payments").lean();
    if (tab && tab.status !== "open") {
      return res.status(409).json({ success: false, message: `This order's bill is already ${tab.status}` });
    }
    // Part-payments were taken against the current bill; changing lines now
    // could push the bill below what was already collected.
    if (tab?.payments?.length && Array.isArray(items) && items.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Payments have already been taken on this bill. Add a new order instead of editing this one.",
      });
    }
  }
  if ((customerName != null && typeof customerName !== "string") ||
      (customerPhone != null && typeof customerPhone !== "string") ||
      (notes != null && typeof notes !== "string")) {
    return res.status(400).json({ success: false, message: "Invalid customer details" });
  }
  if ((customerName && customerName.length > 100) || (customerPhone && customerPhone.length > 20) || (notes && notes.length > 500)) {
    return res.status(400).json({ success: false, message: "Customer details are too long" });
  }

  // Update customer info
  if (customerName !== undefined) order.customerName = customerName?.trim();
  if (customerPhone !== undefined) order.customerPhone = customerPhone?.trim();
  if (notes !== undefined) order.notes = notes;
  if (priority && ["normal", "high"].includes(priority)) {
    order.priority = priority;
  }

  // Update items if provided. Prices are ALWAYS re-derived server-side:
  //  - a line that references a menu item is priced from the menu
  //  - a line that matches an existing line by id keeps its original price
  //  - anything else is an open-priced custom line (managers/owners only)
  if (items && Array.isArray(items) && items.length > 0) {
    if (items.length > 50) {
      return res.status(400).json({ success: false, message: "An order can contain at most 50 lines" });
    }
    let totalPrice = 0;
    const validatedItems = [];
    const existingLines = new Map(order.items.map((line) => [String(line._id), line]));
    const existingByMenu = new Map(
      order.items.filter((line) => line.menuItem).map((line) => [String(line.menuItem), line])
    );

    for (const item of items) {
      if (!item || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
        return res.status(400).json({
          success: false,
          message: "Each item must have a whole-number quantity between 1 and 50",
        });
      }
      if (item.notes != null && (typeof item.notes !== "string" || item.notes.length > 200)) {
        return res.status(400).json({ success: false, message: "Item notes must be text under 200 characters" });
      }

      let line = null;
      const menuRef = item.menuItem || existingLines.get(String(item.id || item._id))?.menuItem;
      if (menuRef && mongoose.isValidObjectId(menuRef)) {
        const menuItem = await MenuItem.findOne({ _id: menuRef, hotel: order.hotel });
        if (!menuItem) {
          return res.status(404).json({ success: false, message: "Menu item not found" });
        }
        const previous = existingByMenu.get(String(menuItem._id));
        // Adding a now-unavailable dish is refused; keeping one already ordered is fine.
        if (!menuItem.isAvailable && !previous) {
          return res.status(400).json({ success: false, message: `${menuItem.name} is currently not available` });
        }
        line = { menuItem: menuItem._id, name: menuItem.name, price: previous ? previous.price : menuItem.price };
      } else if (existingLines.has(String(item.id || item._id))) {
        const prev = existingLines.get(String(item.id || item._id));
        line = { name: prev.name, price: prev.price };
      } else {
        if (!CUSTOM_ITEM_ROLES.includes(getUserRole(req))) {
          return res.status(403).json({ success: false, message: "Only a manager can add an item that is not on the menu" });
        }
        const price = Number(item.price);
        if (typeof item.name !== "string" || !item.name.trim() || item.name.length > 100 ||
            !Number.isFinite(price) || price < 0 || price > 1000000) {
          return res.status(400).json({ success: false, message: "Custom items need a name and a valid price" });
        }
        line = { name: item.name.trim(), price };
      }

      totalPrice += line.price * item.quantity;
      validatedItems.push({ ...line, quantity: item.quantity, notes: item.notes || "" });
    }

    order.items = validatedItems;
    order.totalPrice = Math.round(totalPrice * 100) / 100;
  }

  await order.save();

  if (order.session) {
    await recalculateSession(order.session).catch(() => {});
  }

  // Emit real-time update to all staff in the hotel
  const updaterName = req.user?.fullname || "Staff";
  const location = order.orderType === "roomService"
    ? `Room ${order.roomNumber || "N/A"}`
    : order.orderType === "dineIn"
    ? `Table ${order.tableNumber || "N/A"}`
    : "Takeaway";

  const eventData = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    orderType: order.orderType,
    location,
    totalPrice: order.totalPrice,
    items: order.items,
    customerName: order.customerName,
    priority: order.priority,
    updatedBy: updaterName,
    updatedAt: new Date(),
  };

  // Notify all staff in the hotel about the order update
  emitToHotelStaff(order.hotel.toString(), "order-updated", {
    ...eventData,
    message: `📝 ${updaterName} updated Order #${order.orderNumber} (${location})`,
  });

  return res.status(200).json({
    success: true,
    message: "Order updated successfully",
    order,
  });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  // Build hotel filter for multi-tenancy
  const role = getUserRole(req);
  const assignedHotelIds = getAssignedHotelIds(req);
  const userCompany = req.user?.company?._id?.toString?.() || req.user?.company?.toString?.() || req.user?.company;

  let hotelFilter = {};
  if (role === 'receptionist' && assignedHotelIds.length > 0) {
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  } else if (userCompany) {
    const userHotels = await Hotel.find({ company: userCompany }).select('_id');
    hotelFilter = { hotel: { $in: userHotels.map(h => h._id) } };
  } else {
    // No company context: fall back to assigned properties. Never unscoped —
    // an empty filter here used to expose every hotel's orders.
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  }

  // Find order with hotel scope - prevents cross-hotel access
  const order = await Order.findOne({ _id: orderId, ...hotelFilter })
    .populate("hotel", "name")
    .populate("room", "roomNumber")
    .populate("orderBy", "fullname email")
    .populate("items.menuItem", "name price image category");

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found or access denied",
    });
  }

  return res.status(200).json({
    success: true,
    order,
  });
});

export const getMenuItems = asyncHandler(async (req, res) => {
  const { hotelId, category, available } = req.query;

  // Hotel ID is required
  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  // CRITICAL: Validate hotel access - was missing before!
  await assertHotelAccess(req, hotelId);

  // Build filter
  const filter = {
    hotel: hotelId,
  };

  // Optionally filter by category
  if (category) {
    filter.category = category;
  }

  // Optionally filter by availability (default: only available items)
  if (available === "all") {
    // Show all items
  } else {
    filter.isAvailable = true; // Default: only available
  }

  // Fetch menu items
  const menuItems = await MenuItem.find(filter).sort({ category: 1, name: 1 });

  // Group by category for easier frontend display
  const groupedByCategory = {};
  menuItems.forEach((item) => {
    if (!groupedByCategory[item.category]) {
      groupedByCategory[item.category] = [];
    }
    groupedByCategory[item.category].push(item);
  });

  return res.status(200).json({
    success: true,
    count: menuItems.length,
    menuItems,
    groupedByCategory, // Bonus: items grouped by category
  });
});

export const getMenuCategories = asyncHandler(async (req, res) => {
  // Get unique categories from MenuItem schema enum
  const categories = [
    "Breakfast",
    "Lunch",
    "Dinner",
    "Snacks",
    "Drinks",
    "Dessert",
    "Appetizers",
  ];

  return res.status(200).json({
    success: true,
    categories,
  });
});

export const deleteOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  // Build hotel filter for multi-tenancy
  const role = getUserRole(req);
  const assignedHotelIds = getAssignedHotelIds(req);
  const userCompany = req.user?.company?._id?.toString?.() || req.user?.company?.toString?.() || req.user?.company;

  let hotelFilter = {};
  if (role === 'receptionist' && assignedHotelIds.length > 0) {
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  } else if (userCompany) {
    const userHotels = await Hotel.find({ company: userCompany }).select('_id');
    hotelFilter = { hotel: { $in: userHotels.map(h => h._id) } };
  } else {
    // No company context: fall back to assigned properties. Never unscoped —
    // an empty filter here used to expose every hotel's orders.
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  }

  // Find order with hotel scope - prevents cross-hotel access
  const order = await Order.findOne({ _id: orderId, ...hotelFilter });
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found or access denied",
    });
  }

  // allowing deletion only of pending, cancelled, and new orders
  const deletableStatus = ["pending", "cancelled", "new"];
  if (!deletableStatus.includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete order with status "${order.status}". Only pending, new, or cancelled orders can be deleted.`,
    });
  }

  await Order.findByIdAndDelete(orderId);
  return res.status(200).json({
    success: true,
    message: "Order deleted successfully",
  });
});

/**
 * Confirm Payment for Order
 * 
 * Marks order as paid and updates payment details
 * 
 * @route POST /api/staff/orders/:orderId/confirm-payment
 * @access Private (Staff)
 */
export const confirmPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { paymentMethod, paidAmount, paymentReference, notes } = req.body;

  // Validate payment method
  const validMethods = ['cash', 'card', 'upi', 'online', 'room-charge', 'esewa', 'khalti', 'bank'];
  if (!paymentMethod || !validMethods.includes(paymentMethod)) {
    return res.status(400).json({
      success: false,
      message: `Invalid payment method. Use: ${validMethods.join(', ')}`,
    });
  }

  // Build hotel filter for multi-tenancy
  const role = getUserRole(req);
  const assignedHotelIds = getAssignedHotelIds(req);
  const userCompany = req.user?.company?._id?.toString?.() || req.user?.company?.toString?.() || req.user?.company;

  let hotelFilter = {};
  if (role === 'receptionist' && assignedHotelIds.length > 0) {
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  } else if (userCompany) {
    const userHotels = await Hotel.find({ company: userCompany }).select('_id');
    hotelFilter = { hotel: { $in: userHotels.map(h => h._id) } };
  } else {
    // No company context: fall back to assigned properties. Never unscoped —
    // an empty filter here used to expose every hotel's orders.
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  }

  // Find order with hotel scope - prevents cross-hotel access
  const order = await Order.findOne({ _id: orderId, ...hotelFilter }).populate('hotel', 'name');
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found or access denied",
    });
  }

  // Table and takeaway orders are settled on their tab (one bill, VAT,
  // split payments, receipt). Paying a single order here would bypass all of
  // that and leave the tab showing money still due.
  if (order.session) {
    return res.status(409).json({
      success: false,
      message: "This order is on a table/takeaway bill. Take payment from the Bills screen.",
      sessionId: order.session,
    });
  }

  if (order.status === 'cancelled') {
    return res.status(409).json({ success: false, message: "A cancelled order cannot be paid" });
  }

  // Check if already paid
  if (order.paymentStatus === 'paid') {
    return res.status(400).json({
      success: false,
      message: "Order is already marked as paid",
    });
  }

  // The amount is never trusted from the client: it must cover the order.
  if (paidAmount !== undefined && paidAmount !== null) {
    const amount = Number(paidAmount);
    if (!Number.isFinite(amount) || amount < order.totalPrice) {
      return res.status(400).json({
        success: false,
        message: `Paid amount must be at least the order total (Rs ${order.totalPrice})`,
      });
    }
  }
  if (paymentReference != null && (typeof paymentReference !== 'string' || paymentReference.length > 100)) {
    return res.status(400).json({ success: false, message: "Invalid payment reference" });
  }

  const now = new Date();
  const set = {
    paymentStatus: 'paid',
    paymentMethod,
    paidAt: now,
    paidAmount: order.totalPrice,
    paymentReference: paymentReference?.trim() || `PAY-${now.getTime()}`,
  };
  if (typeof notes === 'string' && notes.trim()) set.notes = notes.trim().slice(0, 500);
  // Paying hands the order over; only move it forward, never out of 'cancelled'.
  if (order.status !== 'delivered') {
    set.status = 'delivered';
    set.deliveredAt = now;
  }

  // Atomic claim: two staff confirming at once cannot both succeed.
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: 'paid' }, status: { $ne: 'cancelled' } },
    { $set: set },
    { new: true }
  );
  if (!claimed) {
    return res.status(409).json({ success: false, message: "This order was just paid or cancelled by someone else" });
  }
  Object.assign(order, set);

  logAudit(req.user?._id, "order_payment_confirmed", "order", order._id, null, {
    method: paymentMethod, amount: order.paidAmount, reference: order.paymentReference,
  }, req);

  // Emit real-time event for payment confirmation
  const eventData = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    paymentStatus: 'paid',
    paymentMethod,
    paidAmount: order.paidAmount,
    paidAt: order.paidAt,
    status: order.status,
  };

  // Notify all staff in the hotel
  emitToHotel(order.hotel._id.toString(), "payment-confirmed", {
    ...eventData,
    message: `💰 Payment confirmed for Order #${order.orderNumber}`,
  });

  // Notify the guest if this is a guest order
  if (order.customerId) {
    emitToUser(order.customerId.toString(), "payment-confirmed", eventData);
    createNotificationInternal({
      userId: order.customerId,
      senderId: req.user?._id,
      type: "payment_received",
      title: `Payment received for Order #${order.orderNumber}`.slice(0, 100),
      message: `Thank you — Rs ${Number(order.paidAmount || 0).toFixed(2)} was recorded.`,
      actionUrl: "/guest-dashboard/billing",
      payload: { orderId: order._id.toString(), orderNumber: order.orderNumber },
    }).catch(() => {});
  }

  return res.status(200).json({
    success: true,
    message: "Payment confirmed successfully",
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paidAmount: order.paidAmount,
      paidAt: order.paidAt,
    },
  });
});

/**
 * Send Bill to Customer
 * 
 * Sends the order bill to the customer via email or SMS
 * Guest will make payment after receiving the bill
 * 
 * @route POST /api/staff/orders/:orderId/send-bill
 * @access Private (Staff)
 */
export const sendBillToCustomer = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { method, email, phone } = req.body;

  // Validate method
  if (!method || !['email', 'app'].includes(method)) {
    return res.status(400).json({
      success: false,
      message: "Invalid send method. Use 'email' or 'app'",
    });
  }

  // Build hotel filter for multi-tenancy
  const role = getUserRole(req);
  const assignedHotelIds = getAssignedHotelIds(req);
  const userCompany = req.user?.company?._id?.toString?.() || req.user?.company?.toString?.() || req.user?.company;

  let hotelFilter = {};
  if (role === 'receptionist' && assignedHotelIds.length > 0) {
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  } else if (userCompany) {
    const userHotels = await Hotel.find({ company: userCompany }).select('_id');
    hotelFilter = { hotel: { $in: userHotels.map(h => h._id) } };
  } else {
    // No company context: fall back to assigned properties. Never unscoped —
    // an empty filter here used to expose every hotel's orders.
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  }

  // Find order with hotel scope - prevents cross-hotel access
  const order = await Order.findOne({ _id: orderId, ...hotelFilter }).populate('hotel', 'name location contact');
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found or access denied",
    });
  }

  // Validate contact based on method
  if (method === 'email' && !email) {
    return res.status(400).json({
      success: false,
      message: "Email is required for email delivery",
    });
  }

  // For 'app' method, we need the customer ID to send notification
  if (method === 'app' && !order.customerId) {
    return res.status(400).json({
      success: false,
      message: "Cannot send app notification. Guest is not registered in the system.",
    });
  }

  try {
    // Generate bill data
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.13; // 13% VAT in Nepal
    const serviceCharge = 0; // Can be configured
    const grandTotal = subtotal + tax + serviceCharge;
    
    const billData = {
      orderNumber: order.orderNumber,
      hotelName: order.hotel?.name || 'Hotel Restaurant',
      hotelAddress: order.hotel?.location?.address || '',
      hotelPhone: order.hotel?.contact?.phone || '',
      location: order.orderType === 'takeaway'
        ? 'Takeaway'
        : order.tableNumber ? `Table ${order.tableNumber}` : `Room ${order.roomNumber || '—'}`,
      customerName: order.customerName || 'Guest',
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      })),
      subtotal,
      tax,
      serviceCharge,
      total: grandTotal,
      date: order.createdAt,
    };

    // Handle different delivery methods
    if (method === 'app') {
      // Send in-app notification to guest dashboard

      // Emit to guest's dashboard immediately
      if (order.customerId) {
        emitToUser(order.customerId.toString(), "bill-received", {
          orderId: order._id,
          orderNumber: order.orderNumber,
          billSent: true,
          billSentAt: new Date(),
          method: 'app',
          billData,
          message: `Your bill for Order #${order.orderNumber} is ready. Total: Rs. ${grandTotal.toFixed(2)}`,
        });
        createNotificationInternal({
          userId: order.customerId,
          senderId: req.user?._id,
          type: "bill_received",
          title: `Bill for Order #${order.orderNumber}`.slice(0, 100),
          message: `Your bill is ready. Total Rs ${grandTotal.toFixed(2)}.`,
          actionUrl: "/guest-dashboard/billing",
          payload: { orderId: order._id.toString(), orderNumber: order.orderNumber },
        }).catch(() => {});
      }
    } else if (method === 'email') {
      // Send email with HTML bill
      const emailHTML = generateBillEmailHTML(billData);
      const emailText = generateBillTextMessage(billData);

      await sendEmail({
        to: email,
        subject: `Bill for Order #${order.orderNumber} - ${order.hotel?.name || 'Hotel'}`,
        html: emailHTML,
        text: emailText,
      });
    }

    // Update order with bill sent info
    order.billSent = true;
    order.billSentAt = new Date();
    order.billSentTo = {
      email: method === 'email' ? email : undefined,
      method,
    };
    order.billSentStatus = 'sent'; // Assume success for now
    await order.save();

    // Emit real-time event for bill sent
    const eventData = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      billSent: true,
      billSentAt: order.billSentAt,
      billSentTo: method === 'email' ? email : 'Guest Dashboard',
      method,
    };

    // Notify all staff in the hotel
    const methodLabel = method === 'app' ? 'app notification' : method;
    emitToHotel(order.hotel._id.toString(), "bill-sent", {
      ...eventData,
      message: `📄 Bill sent for Order #${order.orderNumber} via ${methodLabel}. Guest will make payment.`,
    });

    return res.status(200).json({
      success: true,
      message: `Bill sent successfully via ${methodLabel}. Guest will make payment.`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        sentTo: method === 'email' ? email : 'Guest Dashboard',
        method,
        sentAt: order.billSentAt,
        billData, // Return bill data for preview
      },
    });
  } catch (error) {
    // Try to update bill sent status to failed (if order exists)
    try {
      if (order) {
        order.billSentStatus = 'failed';
        order.billSentRetries = (order.billSentRetries || 0) + 1;
        await order.save();
      }
    } catch {
      // Secondary save failure — non-fatal
    }
    
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send bill. Please try again.",
      error: process.env.NODE_ENV === 'development' ? error.stack : error.message,
    });
  }
});

/**
 * Retry Sending Bill
 * 
 * Retry sending bill if previous attempt failed
 * 
 * @route POST /api/staff/orders/:orderId/retry-bill
 * @access Private (Staff)
 */
export const retryBillSending = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  // Build hotel filter for multi-tenancy
  const role = getUserRole(req);
  const assignedHotelIds = getAssignedHotelIds(req);
  const userCompany = req.user?.company?._id?.toString?.() || req.user?.company?.toString?.() || req.user?.company;

  let hotelFilter = {};
  if (role === 'receptionist' && assignedHotelIds.length > 0) {
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  } else if (userCompany) {
    const userHotels = await Hotel.find({ company: userCompany }).select('_id');
    hotelFilter = { hotel: { $in: userHotels.map(h => h._id) } };
  } else {
    // No company context: fall back to assigned properties. Never unscoped —
    // an empty filter here used to expose every hotel's orders.
    hotelFilter = { hotel: { $in: assignedHotelIds } };
  }

  // Find order with hotel scope - prevents cross-hotel access
  const order = await Order.findOne({ _id: orderId, ...hotelFilter }).populate('hotel', 'name');
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found or access denied",
    });
  }

  // Check if bill sending failed
  if (order.billSentStatus !== 'failed') {
    return res.status(400).json({
      success: false,
      message: "Bill sending did not fail. No retry needed.",
      currentStatus: order.billSentStatus,
    });
  }

  // Check retry limit
  if (order.billSentRetries >= 3) {
    return res.status(400).json({
      success: false,
      message: "Maximum retry attempts reached. Please contact support.",
    });
  }

  // Retry sending with same details
  const { email, phone, method } = order.billSentTo || {};
  
  // Call sendBillToCustomer logic again
  req.body = { method, email, phone };
  return sendBillToCustomer(req, res);
});

// Order history endpoint removed
