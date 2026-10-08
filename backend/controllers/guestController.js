import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { HotelTable } from "../models/hotelTable.schema.js";
import { DiningSession } from "../models/diningSession.schema.js";
import {
  openTableSession,
  recalculateSession,
  markBillRequested,
  serializeForGuest,
  getSessionWithOrders,
} from "../services/diningSessionService.js";
import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { MenuItem } from "../models/menuItem.schema.js";
import { Order, Counter } from "../models/order.schema.js";
import { WaiterCall } from "../models/waitercall.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { priceMenuLines, sendPricingError } from "../services/orderPricing.js";
import { Booking } from "../models/booking.schema.js";
import { emitToHotelStaff, emitToGuestSession } from "../config/socket.js";
import { announceGuestOrder } from "../services/guestOrderAlerts.js";

// Anonymous QR guests order smaller batches than staff.
const QR_ORDER_LIMITS = { maxLines: 30, maxQuantity: 20 };

const TABLE_TOKEN = /^TBL-[A-Za-z0-9]{6,64}$/;
const optionalText = (value, max) => value == null || (typeof value === "string" && value.length <= max);

// A second tap (or a guest spamming the button) within this window returns
// the call that is already open instead of paging the waiters again.
const CALL_DEDUPE_WINDOW_MS = 60 * 1000;
// Serialises call creation per table + type inside this process, so two
// simultaneous taps can't both miss the "already open" lookup.
const callLocks = new Map();
const withCallLock = async (key, fn) => {
  const previous = callLocks.get(key) || Promise.resolve();
  const run = previous.catch(() => {}).then(fn);
  const tail = run.catch(() => {});
  callLocks.set(key, tail);
  try {
    return await run;
  } finally {
    if (callLocks.get(key) === tail) callLocks.delete(key);
  }
};

// Validates the shared body of call-waiter / request-bill and resolves the table.
const resolveCallTable = async (req, res) => {
  const { tableToken, hotelId, guestName, guestSessionId } = req.body || {};
  if (typeof tableToken !== "string" || !TABLE_TOKEN.test(tableToken) || !mongoose.isValidObjectId(hotelId)) {
    res.status(400).json({ success: false, message: "Table token and hotel ID are required" });
    return null;
  }
  if (!optionalText(guestName, 100) || !optionalText(guestSessionId, 100)) {
    res.status(400).json({ success: false, message: "Invalid guest details" });
    return null;
  }
  const table = await HotelTable.findOne({ uniqueToken: tableToken, hotel: hotelId, isActive: true, isQrActive: true });
  if (!table) {
    res.status(400).json({ success: false, message: "Invalid table" });
    return null;
  }
  return table;
};

// Returns the open call of this type raised at this table in the last minute, if any.
const findRecentOpenCall = (hotelId, tableNumber, requestType) => WaiterCall.findOne({
  hotel: hotelId,
  tableNumber,
  source: "guest_qr",
  requestType,
  status: "open",
  createdAt: { $gte: new Date(Date.now() - CALL_DEDUPE_WINDOW_MS) },
}).sort({ createdAt: -1 });

const hasCheckedInStay = async (roomId, hotelId) =>
  Boolean(await Booking.exists({ room: roomId, hotel: hotelId, status: "Checked-In" }));

// One delivery per staff socket (waiters sit in both the hotel and the waiter room).
const announceCall = (hotelId, call, message) => {
  try {
    emitToHotelStaff(hotelId, "new-waiter-call", { call: call.toObject(), message });
  } catch {
    // Socket emission failed — non-fatal, the call is already persisted
  }
};

// @desc    Validate table QR token and get table info
// @route   GET /api/guest/table/:token
// @access  Public
export const getTableByToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token || !token.startsWith('TBL-')) {
    return res.status(400).json({
      success: false,
      message: "Invalid table QR code",
    });
  }

  const table = await HotelTable.findOne({ 
    uniqueToken: token,
    isActive: true,
    isQrActive: true,
  }).populate('hotel', 'name location images contact');

  if (!table) {
    return res.status(404).json({
      success: false,
      message: "Table not found or QR code is inactive",
    });
  }

  // Get hotel details
  const hotel = await Hotel.findById(table.hotel._id);

  if (!hotel || hotel.status !== 'approved' || !hotel.isActive) {
    return res.status(404).json({
      success: false,
      message: "Restaurant is currently unavailable",
    });
  }

  res.status(200).json({
    success: true,
    message: "Table verified successfully",
    data: {
      table: {
        _id: table._id,
        tableNumber: table.tableNumber,
        tableName: table.tableName,
        capacity: table.capacity,
        location: table.location,
        status: table.status,
      },
      hotel: {
        _id: hotel._id,
        name: hotel.name,
        location: hotel.location,
        images: hotel.images,
        contact: hotel.contact,
      },
      orderType: 'dineIn',
    },
  });
});

// @desc    Validate room QR token and get room info
// @route   GET /api/guest/room/:token
// @access  Public
export const getRoomByToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token || !token.startsWith('RM-')) {
    return res.status(400).json({
      success: false,
      message: "Invalid room QR code",
    });
  }

  const room = await Room.findOne({ 
    uniqueToken: token,
    isQrActive: true,
  }).populate('hotel', 'name location images contact');

  if (!room) {
    return res.status(404).json({
      success: false,
      message: "Room not found or QR code is inactive",
    });
  }

  // Get hotel details
  const hotel = await Hotel.findById(room.hotel._id);

  if (!hotel || hotel.status !== 'approved' || !hotel.isActive) {
    return res.status(404).json({
      success: false,
      message: "Hotel is currently unavailable",
    });
  }

  res.status(200).json({
    success: true,
    message: "Room verified successfully",
    data: {
      room: {
        _id: room._id,
        roomNumber: room.roomNumber,
        roomName: room.roomName,
        type: room.type,
        status: room.status,
        // Lets the page explain up front that ordering opens at check-in.
        canOrder: await hasCheckedInStay(room._id, hotel._id),
      },
      hotel: {
        _id: hotel._id,
        name: hotel.name,
        location: hotel.location,
        images: hotel.images,
        contact: hotel.contact,
      },
      orderType: 'roomService',
    },
  });
});

// @desc    Get menu for guest (via QR scan)
// @route   GET /api/guest/menu/:hotelId
// @access  Public
export const getGuestMenu = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const { category } = req.query;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  // Verify hotel exists and is active
  const hotel = await Hotel.findById(hotelId);
  if (!hotel || hotel.status !== 'approved' || !hotel.isActive) {
    return res.status(404).json({
      success: false,
      message: "Restaurant/Hotel not found",
    });
  }

  // Build query for menu items — return ALL items so unavailable ones
  // can be shown as greyed-out/unorderable on the client
  const query = { hotel: hotelId };

  if (category) {
    query.category = category;
  }

  const menuItems = await MenuItem.find(query)
    .select('-__v -createdAt -updatedAt')
    .sort({ category: 1, displayOrder: 1, name: 1 });

  // Group by category
  const groupedByCategory = {};
  menuItems.forEach((item) => {
    if (!groupedByCategory[item.category]) {
      groupedByCategory[item.category] = [];
    }
    groupedByCategory[item.category].push(item);
  });

  // Get unique categories derived from available items so empty
  // unavailable-only categories do not pollute the tab list
  const categories = [...new Set(
    menuItems.filter(i => i.isAvailable).map(item => item.category)
  )];

  res.status(200).json({
    success: true,
    hotel: {
      _id: hotel._id,
      name: hotel.name,
    },
    count: menuItems.length,
    categories,
    menuItems,
    groupedByCategory,
  });
});

// @desc    Place order as guest (via QR scan)
// @route   POST /api/guest/order
// @access  Public
export const createGuestOrder = asyncHandler(async (req, res) => {
  const {
    hotelId,
    tableToken,    // For dine-in orders
    roomToken,     // For room service orders
    orderType,     // 'dineIn' or 'roomService'
    items,
    customerName,
    customerPhone,
    notes,
    // `priority` is intentionally NOT read from the body: an anonymous guest
    // must not be able to jump the kitchen queue.
    guestSessionId,  // Anonymous QR guest session ID for real-time tracking
    idempotencyKey,  // Client-generated key; a retried/duplicate tap must not create a second order
  } = req.body;

  const priority = 'normal';

  // Validate required fields
  if (!hotelId || !mongoose.isValidObjectId(hotelId) || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID and order items are required",
    });
  }
  if (items.length > QR_ORDER_LIMITS.maxLines) {
    return res.status(400).json({ success: false, message: `An order can contain at most ${QR_ORDER_LIMITS.maxLines} lines` });
  }

  if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.length > 100) {
    return res.status(400).json({
      success: false,
      message: "A valid idempotency key is required",
    });
  }

  // If this exact submission already succeeded, return the existing order
  // instead of re-validating/re-creating (double-tap / network retry safe).
  const existingOrder = await Order.findOne({ idempotencyKey, hotel: hotelId });
  if (existingOrder) {
    return res.status(200).json({
      success: true,
      message: "Order already placed",
      order: {
        _id: existingOrder._id,
        orderNumber: existingOrder.orderNumber,
        orderType: existingOrder.orderType,
        tableNumber: existingOrder.tableNumber,
        roomNumber: existingOrder.roomNumber,
        items: existingOrder.items,
        totalPrice: existingOrder.totalPrice,
        status: existingOrder.status,
        guestSessionId: existingOrder.guestSessionId,
        createdAt: existingOrder.createdAt,
      },
    });
  }

  if (typeof customerName !== 'string' || !customerName.trim()) {
    return res.status(400).json({
      success: false,
      message: "Customer name is required",
    });
  }
  if ((customerPhone != null && typeof customerPhone !== 'string') || (notes != null && typeof notes !== 'string')) {
    return res.status(400).json({ success: false, message: "Invalid customer details" });
  }

  // Bound free-text input lengths — sanitizeAll() strips dangerous content
  // but does not cap length, so an anonymous endpoint needs its own guard.
  if (customerName.length > 100) {
    return res.status(400).json({ success: false, message: "Customer name is too long" });
  }
  if (customerPhone && customerPhone.length > 20) {
    return res.status(400).json({ success: false, message: "Customer phone is too long" });
  }
  if (notes && notes.length > 500) {
    return res.status(400).json({ success: false, message: "Notes must be under 500 characters" });
  }
  if (guestSessionId && (typeof guestSessionId !== 'string' || guestSessionId.length > 100)) {
    return res.status(400).json({ success: false, message: "Invalid guest session" });
  }

  // Verify hotel
  const hotel = await Hotel.findById(hotelId);
  if (!hotel || hotel.status !== 'approved' || !hotel.isActive) {
    return res.status(404).json({
      success: false,
      message: "Restaurant/Hotel not found or unavailable",
    });
  }

  let tableNumber = null;
  let tableDoc = null;
  let roomNumber = null;
  let roomId = null;

  // Validate table/room based on order type
  if (orderType === 'dineIn') {
    if (!tableToken) {
      return res.status(400).json({
        success: false,
        message: "Table token is required for dine-in orders",
      });
    }

    const table = await HotelTable.findOne({
      uniqueToken: tableToken,
      hotel: hotelId,
      isActive: true,
      isQrActive: true,
    });

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid table or QR code is inactive",
      });
    }

    if (table.status === 'maintenance') {
      return res.status(409).json({
        success: false,
        message: "This table is not in service right now. Please ask a member of staff.",
      });
    }

    tableNumber = table.tableNumber;
    tableDoc = table;
  } else if (orderType === 'roomService') {
    if (!roomToken) {
      return res.status(400).json({
        success: false,
        message: "Room token is required for room service orders",
      });
    }

    const room = await Room.findOne({
      uniqueToken: roomToken,
      hotel: hotelId,
      isQrActive: true,
    });

    if (!room) {
      return res.status(400).json({
        success: false,
        message: "Invalid room or QR code is inactive",
      });
    }

    // Room service is billed to and delivered for the current stay only: a
    // vacant room, a guest who hasn't arrived yet or one who has checked out
    // can't order through the room QR.
    if (!(await hasCheckedInStay(room._id, hotelId))) {
      return res.status(409).json({
        success: false,
        code: "NO_ACTIVE_STAY",
        message: "Room service ordering is available once you have checked in. Please contact the front desk.",
      });
    }

    roomNumber = room.roomNumber;
    roomId = room._id;
  } else {
    return res.status(400).json({
      success: false,
      message: "Order type must be 'dineIn' or 'roomService'",
    });
  }

  // Validate and price every line from this hotel's menu (shared rules for
  // all order paths). Done before opening a tab so bad input never opens one.
  let validatedItems;
  let totalPrice;
  try {
    ({ items: validatedItems, totalPrice } = await priceMenuLines({ hotelId, items, ...QR_ORDER_LIMITS, customLines: 'deny' }));
  } catch (err) {
    return sendPricingError(res, err);
  }

  // Resolve the party's session id once so the tab, the order and the socket
  // room all agree on it.
  const resolvedGuestSessionId = guestSessionId || `GUEST-${randomUUID()}`;

  // Dine-in orders bill to the table's open tab (opened on the first order).
  let diningSession = null;
  if (tableDoc) {
    try {
      ({ session: diningSession } = await openTableSession({
        hotel,
        table: tableDoc,
        source: 'qr',
        guestSessionId: resolvedGuestSessionId,
        customerName: customerName.trim(),
        customerPhone: customerPhone?.trim() || undefined,
      }));
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.statusCode ? err.message : "Could not open the table. Please try again.",
      });
    }
  }

  // Generate order number
  let orderNumber;
  const counter = await Counter.findOneAndUpdate(
    { hotel: hotelId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  orderNumber = counter.seq;

  // Create the order
  const order = new Order({
    orderNumber,
    hotel: hotelId,
    room: roomId,
    roomNumber,
    tableNumber,
    table: tableDoc?._id,
    session: diningSession?._id,
    orderType,
    items: validatedItems,
    totalPrice,
    customerName: customerName.trim(),
    customerPhone: customerPhone?.trim() || undefined,
    notes,
    priority,
    status: 'pending',
    // Guest order specific fields
    isGuestOrder: true,
    orderBy: null,
    orderByName: 'Guest Order (QR)',
    // Use client-provided sessionId so the socket room already exists;
    // fall back to a cryptographically strong server-generated value (the
    // client's own fallback historically used Math.random(), which is not
    // suitable as an unguessable ownership token).
    guestSessionId: resolvedGuestSessionId,
    idempotencyKey,
  });

  try {
    await order.save();
  } catch (err) {
    // Unique index violation on idempotencyKey: a concurrent duplicate
    // request won the race and already created the order. Return it instead
    // of failing, so a double-tap/retry is transparent to the guest.
    if (err?.code === 11000 && err?.keyPattern?.idempotencyKey) {
      const winner = await Order.findOne({ idempotencyKey });
      if (winner) {
        return res.status(200).json({
          success: true,
          message: "Order already placed",
          order: {
            _id: winner._id,
            orderNumber: winner.orderNumber,
            orderType: winner.orderType,
            tableNumber: winner.tableNumber,
            roomNumber: winner.roomNumber,
            items: winner.items,
            totalPrice: winner.totalPrice,
            status: winner.status,
            guestSessionId: winner.guestSessionId,
            createdAt: winner.createdAt,
          },
        });
      }
    }
    throw err;
  }

  // Refresh the table tab's running bill (best-effort: the tab always
  // recomputes live on read, so a failure here can never mis-bill).
  if (order.session) {
    await recalculateSession(order.session).catch(() => {});
  }

  // Emit socket events to notify staff
  try {
    // Kitchen, waiters and reception: one real-time event per staff socket
    // (dine-in needs table service, room service needs delivery) plus a
    // persisted high-priority notification for waiters + receptionists.
    announceGuestOrder({ hotelId, order, extra: { tableNumber, roomNumber } }).catch(() => {});

    // Notify the anonymous QR guest's session room so their tracking
    // view activates immediately without polling
    if (order.guestSessionId) {
      emitToGuestSession(order.guestSessionId, 'order-status-update', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
      });
    }
  } catch (socketError) {
    // Socket errors must not fail the order creation
  }

  res.status(201).json({
    success: true,
    message: "Order placed successfully",
    order: {
      _id: order._id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      tableNumber: order.tableNumber,
      roomNumber: order.roomNumber,
      items: order.items,
      totalPrice: order.totalPrice,
      status: order.status,
      guestSessionId: order.guestSessionId,
      createdAt: order.createdAt,
    },
  });
});

// @desc    Get order status (for guests to track their order)
// @route   GET /api/guest/order/:orderId
// @access  Public (but requires order ID + the guest's own session ID)
// SECURITY: Anonymous guest orders can only be read by the guestSessionId that
// placed them — an order ID alone is not sufficient. Optional hotelId narrows
// the query further.
export const getGuestOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { hotelId, guestSessionId } = req.query;

  const query = { _id: orderId };
  if (hotelId) {
    query.hotel = hotelId;
  }

  const order = await Order.findOne(query)
    .select('orderNumber status items totalPrice orderType tableNumber roomNumber createdAt updatedAt hotel guestSessionId isGuestOrder');

  // This public endpoint only serves anonymous QR orders, and only to the
  // session that placed them. Staff/portal orders are never readable here —
  // an ObjectId alone must not be sufficient.
  if (!order || !order.isGuestOrder || !guestSessionId || order.guestSessionId !== guestSessionId) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// @desc    Call waiter (via QR scan)
// @route   POST /api/guest/call-waiter
// @access  Public
// Persists a WaiterCall (source: guest_qr) and emits 'new-waiter-call' — the
// exact event the staff WaiterCallsPanel already listens to — so anonymous QR
// guests reach the same real-time queue as room-based staff calls.
export const callWaiter = asyncHandler(async (req, res) => {
  const { hotelId, reason, guestName, guestSessionId } = req.body || {};
  if (!optionalText(reason, 300)) {
    return res.status(400).json({ success: false, message: "Reason must be under 300 characters" });
  }
  const table = await resolveCallTable(req, res);
  if (!table) return;

  const lockKey = `${hotelId}:${table.tableNumber}:assistance`;
  const { call, duplicate } = await withCallLock(lockKey, async () => {
    const existing = await findRecentOpenCall(hotelId, table.tableNumber, "assistance");
    if (existing) return { call: existing, duplicate: true };
    const created = await WaiterCall.create({
      hotel: hotelId,
      tableNumber: table.tableNumber,
      source: 'guest_qr',
      guestSessionId: guestSessionId || undefined,
      guestName: guestName?.trim() || undefined,
      requestType: 'assistance',
      priority: 'medium',
      description: reason?.trim() || 'Assistance requested',
      status: 'open',
    });
    return { call: created, duplicate: false };
  });

  if (!duplicate) announceCall(hotelId, call, `Assistance requested at Table ${table.tableNumber}`);

  res.status(duplicate ? 200 : 201).json({
    success: true,
    duplicate,
    message: duplicate ? "A waiter is already on the way" : "Waiter has been notified",
    tableNumber: table.tableNumber,
    callId: call._id,
  });
});

// @desc    Request bill (via QR scan)
// @route   POST /api/guest/request-bill
// @access  Public
// Persists a 'bill' WaiterCall and emits 'new-waiter-call' so the request lands
// in the same staff queue with the count of the table's active orders.
export const requestBill = asyncHandler(async (req, res) => {
  const { hotelId, guestName, guestSessionId } = req.body || {};
  const table = await resolveCallTable(req, res);
  if (!table) return;

  // The bill is the table's current open tab — not every historical order
  // that ever used this table number.
  const tab = await DiningSession.findOne({ table: table._id, isActive: true, type: 'dineIn' }).lean();
  if (!tab) {
    return res.status(409).json({
      success: false,
      message: "There is no open bill on this table yet.",
    });
  }

  const lockKey = `${hotelId}:${table.tableNumber}:bill`;
  const { call, duplicate } = await withCallLock(lockKey, async () => {
    const existing = await findRecentOpenCall(hotelId, table.tableNumber, "bill");
    if (existing) return { call: existing, duplicate: true };
    const { session: liveTab } = await getSessionWithOrders(tab._id, hotelId);
    await markBillRequested(tab._id);
    const { orderCount = 0, total = 0, balance = 0 } = liveTab.totals || {};
    const created = await WaiterCall.create({
      hotel: hotelId,
      tableNumber: table.tableNumber,
      source: 'guest_qr',
      guestSessionId: guestSessionId || undefined,
      guestName: guestName?.trim() || undefined,
      requestType: 'bill',
      priority: 'medium',
      description: `Bill requested — ${orderCount} order${orderCount === 1 ? '' : 's'}, total Rs ${total.toFixed(2)}${balance !== total ? `, due Rs ${balance.toFixed(2)}` : ''}`.slice(0, 500),
      status: 'open',
    });
    return { call: created, duplicate: false };
  });

  if (!duplicate) announceCall(hotelId, call, `Bill requested at Table ${table.tableNumber}`);

  res.status(duplicate ? 200 : 201).json({
    success: true,
    duplicate,
    message: duplicate ? "Your bill request is already with the waiter" : "Bill request has been sent to the waiter",
    tableNumber: table.tableNumber,
    callId: call._id,
  });
});

// @desc    The current party's running bill for a table (QR guests)
// @route   GET /api/guest/table/:token/tab?guestSessionId=
// @access  Public — but only devices that ordered on the open tab can read it,
//          so a stale photo of the QR code never exposes another party's bill.
export const getTableTab = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { guestSessionId } = req.query;

  if (!token || !token.startsWith('TBL-') || typeof guestSessionId !== 'string' || guestSessionId.length > 100) {
    return res.status(400).json({ success: false, message: "Invalid request" });
  }

  const table = await HotelTable.findOne({ uniqueToken: token, isActive: true, isQrActive: true }).select('_id hotel tableNumber');
  if (!table) {
    return res.status(404).json({ success: false, message: "Table not found" });
  }

  const open = await DiningSession.findOne({
    table: table._id,
    isActive: true,
    type: 'dineIn',
    guestSessionIds: guestSessionId,
  }).select('_id').lean();

  if (open) {
    const { session, orders } = await getSessionWithOrders(open._id, table.hotel);
    return res.json({ success: true, data: { active: true, tab: serializeForGuest(session, orders) } });
  }

  // Recently settled tab for this device → lets the page show "paid, thank you"
  // after a refresh instead of silently forgetting the meal.
  const recent = await DiningSession.findOne({
    table: table._id,
    type: 'dineIn',
    status: 'closed',
    guestSessionIds: guestSessionId,
    closedAt: { $gte: new Date(Date.now() - 3 * 60 * 60 * 1000) },
  })
    .sort({ closedAt: -1 })
    .select('status tableNumber closedAt receiptNumber totals')
    .lean();

  return res.json({
    success: true,
    data: {
      active: false,
      lastClosed: recent
        ? { receiptNumber: recent.receiptNumber, total: recent.totals?.total || 0, closedAt: recent.closedAt }
        : null,
    },
  });
});
