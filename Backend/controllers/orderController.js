import { Order } from "../models/order.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";

export const createOrder = asyncHandler(async (req, res) => {
  const {
    hotelId,
    roomId,
    roomNumber,
    tableNumber,
    orderType = "dineIn",
    items,
    notes,
    priority = "normal",
    customerId, // optional: registered user
    customerName,
    customerPhone,
  } = req.body;

  // basic hotel and items availability checks
  if (!hotelId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "hotelId and menu items are required",
    });
  }

  // order-type specific checks
  if (orderType === "roomService" && (!roomId || !roomNumber)) {
    return res.status(400).json({
      success: false,
      message: "Room Id and Room Number are required for room service orders",
    });
  }

  if (orderType === "dineIn" && !tableNumber) {
    return res.status(400).json({
      success: false,
      message: "Table Number is required for dine-in orders",
    });
  }

  // validate if hotel exists or not
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: "Hotel not found",
    });
  }

  // if roomService, validate room belongs to that hotel
  if (orderType === "roomService") {
    const room = await Room.findById(roomId);

    if (!room || room.hotel.toString() !== hotelId) {
      return res.status(404).json({
        success: false,
        message: "Room not found or does not belong to this hotel",
      });
    }
  }

  //validate items and calculate total price
  let totalPrice = 0;
  const validatedItems = [];

  for (const item of items) {
    if (!item.menuItem || !item.quantity) {
      return res.status(400).json({
        success: false,
        message: "Each item must have menuItem ID and quantity",
      });
    }
  }

  // VERIFY menuItem exists and get its details
  const menuItem = await MenuItem.findById(item.menuItem);
  if (!menuItem) {
    return res.status(404).json({
      success: false,
      message: `Menu item not found: ${item.menuItem}`,
    });
  }

  if (!menuItem.isAvailable) {
    return res.status(400).json({
      success: false,
      message: `${menuItem.name} is currently not available`,
    });
  }

  // Calculate item total and add to order total
  const itemTotal = menuItem.price * item.quantity;
  totalPrice += itemTotal;

  // Build validated item object
  validatedItems.push({
    menuItem: menuItem._id,
    name: menuItem.name,
    quantity: item.quantity,
    price: menuItem.price,
    notes: item.notes || "",
  });

  const order = new Order({
    hotel: hotelId,
    room: orderType === "roomService" ? roomId : undefined,
    roomNumber: orderType === "roomService" ? roomNumber : undefined,
    tableNumber: orderType === "dineIn" ? tableNumber : undefined,
    orderType,

    // Staff info (from authenticated user)
    orderBy: req.user._id,
    orderByName: req.user.fullname,

    // Customer info
    customerId: customerId || undefined,
    customerName: customerName || undefined,
    customerPhone: customerPhone || undefined,

    // Order details
    items: validatedItems,
    totalPrice,
    status: "pending",
    priority,
    notes: notes || "",
  });

  await order.save();

  return res.status(201).json({
    success: true,
    message: "Order created successfully",
    order,
  });
});

export const getOrder = asyncHandler(async (req, res) => {
  const { hotelId, status, orderType } = req.query;

  const filter = {};
  if (hotelId && status && orderType) {
    filter.hotel = hotelId;
    filter.status = status;
    filter.orderType = orderType;
  } else {
    return res.status(404).json({
      success: false,
      message: "HotelId, Status and OrderType are required",
    });
  }

  const orders = await Order.find(filter)
    .populate("orderBy", "fullname email")
    .populate("items.menuItem", "name price image")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: orders.length,
    orders,
  });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

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

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }
  order.status = status;

  if (status === "delivered") {
    order.deliveredAt = new Date();
  }

  await order.save();

  return res.status(200).json({
    success: true,
    message: `Order status updated to ${status}`,
    order,
  });
});


export const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId)
    .populate("hotel", "name")
    .populate("room", "roomNumber")
    .populate("orderBy", "fullname email")
    .populate("items.menuItem", "name price image category");

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  return res.status(200).json({
    success: true,
    order,
  });
});import { MenuItem } from "../models/menuItem.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ═══════════════════════════════════════════════════════════════════════════
// GET MENU ITEMS
// Called when: Waiter opens "New Order" modal
// Route: GET /api/staff/menu-items?hotelId=xxx
// ═══════════════════════════════════════════════════════════════════════════
export const getMenuItems = asyncHandler(async (req, res) => {
  const { hotelId, category, available } = req.query;

  // Hotel ID is required
  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

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

// ═══════════════════════════════════════════════════════════════════════════
// GET MENU CATEGORIES
// Called when: Filter dropdown in menu
// Route: GET /api/staff/menu-categories
// ═══════════════════════════════════════════════════════════════════════════
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