import { HotelTable } from "../models/hotelTable.schema.js";
import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { MenuItem } from "../models/menuItem.schema.js";
import { Order, Counter } from "../models/order.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emitToHotel, emitToWaiters, emitToKitchen, emitToGuestSession } from "../config/socket.js";

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

  const menuItems = await MenuItem.find(query).sort({ category: 1, name: 1 });

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
    priority = 'normal',
    guestSessionId,  // Anonymous QR guest session ID for real-time tracking
  } = req.body;

  // Validate required fields
  if (!hotelId || !items || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID and order items are required",
    });
  }

  if (!customerName) {
    return res.status(400).json({
      success: false,
      message: "Customer name is required",
    });
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

    tableNumber = table.tableNumber;
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

    roomNumber = room.roomNumber;
    roomId = room._id;
  } else {
    return res.status(400).json({
      success: false,
      message: "Order type must be 'dineIn' or 'roomService'",
    });
  }

  // Validate items and calculate total
  let totalPrice = 0;
  const validatedItems = [];

  for (const item of items) {
    if (!item.menuItem || !item.quantity || item.quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Each item must have a valid menuItem ID and quantity",
      });
    }

    // SECURITY: Query with hotel filter to prevent cross-tenant access
    const menuItem = await MenuItem.findOne({
      _id: item.menuItem,
      hotel: hotelId,
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: `Menu item not found or not available at this restaurant`,
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
      notes: item.notes || '',
    });
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
    orderType,
    items: validatedItems,
    totalPrice,
    customerName,
    customerPhone,
    notes,
    priority,
    status: 'pending',
    // Guest order specific fields
    isGuestOrder: true,
    orderBy: null,
    orderByName: 'Guest Order (QR)',
    // Use client-provided sessionId so the socket room already exists;
    // fall back to a server-generated value for safety
    guestSessionId: guestSessionId || `GUEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  });

  // Note: The order schema requires orderBy, so we might need to handle this
  // For now, let's check if we can make it work

  await order.save();

  // Emit socket events to notify staff
  try {
    emitToHotel(hotelId, 'new-order', {
      order: order.toObject(),
      message: `New ${orderType === 'dineIn' ? 'table' : 'room service'} order #${orderNumber}`,
    });

    emitToKitchen(hotelId, 'new-order', {
      order: order.toObject(),
    });

    if (orderType === 'dineIn' && tableNumber) {
      emitToWaiters(hotelId, 'new-order', {
        order: order.toObject(),
        tableNumber,
      });
    }

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
// @access  Public (but requires order ID)
// Note: This is a public endpoint for order tracking. Security relies on order ID being hard to guess.
// Optional: Pass hotelId as query param for additional validation
export const getGuestOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { hotelId } = req.query; // Optional hotel validation

  // Build query - optionally scope by hotel for additional security
  const query = { _id: orderId };
  if (hotelId) {
    query.hotel = hotelId;
  }

  const order = await Order.findOne(query)
    .select('orderNumber status items totalPrice orderType tableNumber roomNumber createdAt updatedAt hotel');

  if (!order) {
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
export const callWaiter = asyncHandler(async (req, res) => {
  const { tableToken, hotelId, reason } = req.body;

  if (!tableToken || !hotelId) {
    return res.status(400).json({
      success: false,
      message: "Table token and hotel ID are required",
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
      message: "Invalid table",
    });
  }

  // Emit socket event to waiters
  try {
    emitToWaiters(hotelId, 'waiter-call', {
      tableNumber: table.tableNumber,
      tableName: table.tableName,
      reason: reason || 'Assistance requested',
      timestamp: new Date(),
    });

    emitToHotel(hotelId, 'waiter-call', {
      tableNumber: table.tableNumber,
      tableName: table.tableName,
      reason: reason || 'Assistance requested',
      timestamp: new Date(),
    });
  } catch {
    // Socket emission failed — non-fatal, response still sent
  }

  res.status(200).json({
    success: true,
    message: "Waiter has been notified",
    tableNumber: table.tableNumber,
  });
});

// @desc    Request bill (via QR scan)
// @route   POST /api/guest/request-bill
// @access  Public
export const requestBill = asyncHandler(async (req, res) => {
  const { tableToken, hotelId } = req.body;

  if (!tableToken || !hotelId) {
    return res.status(400).json({
      success: false,
      message: "Table token and hotel ID are required",
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
      message: "Invalid table",
    });
  }

  // Get pending/active orders for this table
  const activeOrders = await Order.find({
    hotel: hotelId,
    tableNumber: table.tableNumber,
    status: { $nin: ['cancelled', 'delivered'] },
  });

  // Emit socket event to waiters
  try {
    emitToWaiters(hotelId, 'bill-request', {
      tableNumber: table.tableNumber,
      tableName: table.tableName,
      activeOrders: activeOrders.length,
      timestamp: new Date(),
    });

    emitToHotel(hotelId, 'bill-request', {
      tableNumber: table.tableNumber,
      tableName: table.tableName,
      activeOrders: activeOrders.length,
      timestamp: new Date(),
    });
  } catch {
    // Socket emission failed — non-fatal, response still sent
  }

  res.status(200).json({
    success: true,
    message: "Bill request has been sent to the waiter",
    tableNumber: table.tableNumber,
  });
});
