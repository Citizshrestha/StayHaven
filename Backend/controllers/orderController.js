import { Order } from "../models/order.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { MenuItem } from "../models/menuItem.schema.js";

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

  // DEBUG: Log received data
  console.log(
    "Create Order - Received data:",
    JSON.stringify(req.body, null, 2)
  );

  // basic hotel and items availability checks
  if (!hotelId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "hotelId and menu items are required",
    });
  }

  // order-type specific checks
  if (orderType === "roomService" && !roomNumber) {
    return res.status(400).json({
      success: false,
      message: "Room Number is required for room service orders",
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

  // if roomService and roomId provided, validate room belongs to that hotel
  let validatedRoomId = null;
  if (orderType === "roomService" && roomId) {
    const room = await Room.findById(roomId);
    if (room && room.hotel.toString() === hotelId) {
      validatedRoomId = room._id;
    }
    // If room not found or doesn't match, we still allow the order with just roomNumber
  }

  //validate items and calculate total price
  let totalPrice = 0;
  const validatedItems = [];

  for (const item of items) {
    // Support two modes:
    // 1. menuItem ID provided - lookup from database
    // 2. Custom item - name and price provided directly

    if (!item.quantity || item.quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Each item must have a valid quantity (minimum 1)",
      });
    }

    // Mode 1: MenuItem ID provided - validate from database
    if (item.menuItem) {
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
    }
    // Mode 2: Custom item - name and price provided directly
    else if (item.name && item.price !== undefined) {
      const itemPrice = parseFloat(item.price) || 0;
      const itemTotal = itemPrice * item.quantity;
      totalPrice += itemTotal;

      validatedItems.push({
        // No menuItem field - omit it entirely for custom items
        name: item.name,
        quantity: item.quantity,
        price: itemPrice,
        notes: item.notes || "",
      });
    }
    // Invalid item - neither menuItem ID nor custom name/price
    else {
      return res.status(400).json({
        success: false,
        message:
          "Each item must have either a menuItem ID, or a name and price",
      });
    }
  }

  const order = new Order({
    hotel: hotelId,
    room: orderType === "roomService" ? validatedRoomId : undefined,
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

export const getOrders = asyncHandler(async (req, res) => {
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

export const updateOrderStatus = asyncHandler(async (req, res) => {
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

// Update order details (items, customer info, priority, notes)
export const updateOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { customerName, customerPhone, priority, notes, items } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
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

  // Update customer info
  if (customerName !== undefined) order.customerName = customerName;
  if (customerPhone !== undefined) order.customerPhone = customerPhone;
  if (notes !== undefined) order.notes = notes;
  if (priority && ["normal", "high"].includes(priority)) {
    order.priority = priority;
  }

  // Update items if provided
  if (items && Array.isArray(items) && items.length > 0) {
    let totalPrice = 0;
    const validatedItems = [];

    for (const item of items) {
      if (!item.name || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Each item must have a name and valid quantity (minimum 1)",
        });
      }

      const itemPrice = parseFloat(item.price) || 0;
      totalPrice += itemPrice * item.quantity;

      validatedItems.push({
        name: item.name,
        quantity: item.quantity,
        price: itemPrice,
        notes: item.notes || "",
      });
    }

    order.items = validatedItems;
    order.totalPrice = totalPrice;
  }

  await order.save();

  return res.status(200).json({
    success: true,
    message: "Order updated successfully",
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

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
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
