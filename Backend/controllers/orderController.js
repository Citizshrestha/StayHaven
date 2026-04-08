import { Order } from "../models/order.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { MenuItem } from "../models/menuItem.schema.js";
import { emitToHotel, emitToWaiters, emitToKitchen, emitToUser } from "../config/socket.js";

const getUserRole = (req) => req.user?.role?.name || req.user?.companyRole;

const getAssignedHotelIds = (req) => {
  const assigned = req.user?.assignedProperties || [];
  return assigned
    .map((p) => (typeof p === "object" ? p?._id?.toString() : p?.toString()))
    .filter(Boolean);
};

const assertHotelAccess = async (req, hotelId) => {
  const role = getUserRole(req);
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

  // validate hotel + property/company scope
  await assertHotelAccess(req, hotelId);

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

  // Emit real-time event for new order to ALL staff in hotel
  // (Chiefs/kitchen are already in the hotel room, no need for separate emission)
  emitToHotel(hotelId, "new-order", {
    order: {
      _id: order._id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      tableNumber: order.tableNumber,
      roomNumber: order.roomNumber,
      status: order.status,
      priority: order.priority,
      items: order.items,
      totalPrice: order.totalPrice,
      customerName: order.customerName,
      createdAt: order.createdAt,
    },
    creatorId: req.user._id.toString(), // Include creator ID to filter self-notifications
    message: `New order #${order.orderNumber} placed by ${order.orderByName}`,
  });

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

  await assertHotelAccess(req, order.hotel);
  order.status = status;

  if (status === "delivered") {
    order.deliveredAt = new Date();
  }

  await order.save();

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

  const location = order.orderType === 'roomService' 
    ? `Room ${order.roomNumber}` 
    : `Table ${order.tableNumber}`;

  // Cross-role notifications only (no broadcast to everyone):
  // When chief/kitchen updates status -> notify ONLY waiters (not chiefs)
  if (updaterRole === 'chief' || updaterRole === 'kitchen') {
    emitToWaiters(order.hotel.toString(), "order-status-updated", {
      ...eventData,
      message: `🍳 Kitchen: Order #${order.orderNumber} (${location}) is now "${status}"`,
    });
    
    // Special event for waiters when order is ready
    if (status === "ready") {
      emitToWaiters(order.hotel.toString(), "order-ready", {
        ...eventData,
        message: `Order #${order.orderNumber} is ready for pickup!`,
        customerName: order.customerName,
        items: order.items,
      });
    }
  }
  // When waiter updates status -> notify ONLY kitchen/chiefs (not waiters)
  else if (updaterRole === 'waiter') {
    emitToKitchen(order.hotel.toString(), "order-status-updated", {
      ...eventData,
      message: `🍽️ Waiter ${updaterName}: Order #${order.orderNumber} (${location}) marked as "${status}"`,
    });
  }
  // Fallback for other roles - broadcast to hotel
  else {
    emitToHotel(order.hotel.toString(), "order-status-updated", eventData);
  }

  // Always notify the guest who placed the order (if this is a guest order)
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

  await assertHotelAccess(req, order.hotel);

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

  // Emit real-time update to all staff in the hotel
  const updaterName = req.user?.fullname || "Staff";
  const location = order.orderType === "roomService"
    ? `Room ${order.room?.roomNumber || "N/A"}`
    : order.orderType === "dineIn"
    ? `Table ${order.table?.tableNumber || "N/A"}`
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
  emitToHotel(order.hotel.toString(), "order-updated", {
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

  await assertHotelAccess(req, order.hotel?._id || order.hotel);

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

  await assertHotelAccess(req, order.hotel);

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
 * Send Bill to Customer
 * 
 * Sends the order bill to the customer via email or SMS
 * 
 * @route POST /api/orders/:orderId/send-bill
 * @access Private (Staff)
 */
export const sendBillToCustomer = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { method, email, phone } = req.body;

  // Validate method
  if (!method || !['email', 'sms', 'whatsapp'].includes(method)) {
    return res.status(400).json({
      success: false,
      message: "Invalid send method. Use 'email', 'sms', or 'whatsapp'",
    });
  }

  // Find the order
  const order = await Order.findById(orderId).populate('hotel', 'name address phone');
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  await assertHotelAccess(req, order.hotel?._id || order.hotel);

  // Validate contact based on method
  if (method === 'email' && !email) {
    return res.status(400).json({
      success: false,
      message: "Email is required for email delivery",
    });
  }

  if ((method === 'sms' || method === 'whatsapp') && !phone) {
    return res.status(400).json({
      success: false,
      message: "Phone number is required for SMS/WhatsApp delivery",
    });
  }

  try {
    // Generate bill content
    const billData = {
      orderNumber: order.orderNumber,
      hotelName: order.hotel?.name || 'Hotel Restaurant',
      hotelAddress: order.hotel?.address || '',
      hotelPhone: order.hotel?.phone || '',
      location: order.tableNumber ? `Table ${order.tableNumber}` : `Room ${order.roomNumber}`,
      customerName: order.customerName || 'Guest',
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      })),
      subtotal: order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      tax: order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 0.10,
      serviceCharge: order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 0.05,
      total: order.totalPrice,
      date: order.createdAt,
    };

    // For now, log the bill sending (integrate with actual email/SMS service later)
    console.log(`📧 Sending bill via ${method}:`, {
      to: method === 'email' ? email : phone,
      orderNumber: order.orderNumber,
      total: order.totalPrice,
    });

    // Update order with bill sent info
    order.billSent = true;
    order.billSentAt = new Date();
    order.billSentTo = {
      email: method === 'email' ? email : undefined,
      phone: method !== 'email' ? phone : undefined,
      method,
    };
    await order.save();

    // TODO: Integrate with actual email/SMS service
    // For email: Use nodemailer (already configured in config/nodemailer.js)
    // For SMS: Integrate Twilio or similar service
    // For WhatsApp: Use WhatsApp Business API

    return res.status(200).json({
      success: true,
      message: `Bill sent successfully via ${method}`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        sentTo: method === 'email' ? email : phone,
        method,
        sentAt: order.billSentAt,
      },
    });
  } catch (error) {
    console.error('Send bill error:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to send bill. Please try again.",
    });
  }
});

// Order history endpoint removed
