import { Order } from "../models/order.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Room } from "../models/room.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { MenuItem } from "../models/menuItem.schema.js";
import { User } from "../models/user.schema.js";
import { emitToHotel, emitToWaiters, emitToKitchen, emitToUser, emitToGuestSession } from "../config/socket.js";
import { sendEmail, sendSMS, sendWhatsApp, generateBillEmailHTML, generateBillTextMessage } from "../services/notificationService.js";
import { createNotificationInternal } from "./notificationController.js";

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
  }

  // Find order with hotel scope - prevents cross-hotel access
  const order = await Order.findOne({ _id: orderId, ...hotelFilter });
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found or access denied",
    });
  }
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

  const location = order.orderType === 'takeaway'
    ? 'Takeaway'
    : order.orderType === 'roomService'
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
    const hotelStaff = await User.find({
      assignedProperties: order.hotel,
      _id: { $ne: req.user._id }, // Exclude the person who made the update
      companyRole: { $in: ['waiter', 'chief', 'kitchen', 'receptionist', 'manager'] }
    }).select('_id companyRole');

    // Filter recipients based on updater role (cross-role notifications)
    let recipients = hotelStaff;
    if (updaterRole === 'chief' || updaterRole === 'kitchen') {
      // Kitchen updated -> notify only waiters
      recipients = hotelStaff.filter(staff => staff.companyRole === 'waiter');
    } else if (updaterRole === 'waiter') {
      // Waiter updated -> notify only kitchen/chiefs
      recipients = hotelStaff.filter(staff => ['chief', 'kitchen'].includes(staff.companyRole));
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
});

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
  const validMethods = ['cash', 'card', 'upi', 'online', 'room-charge'];
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
  }

  // Find order with hotel scope - prevents cross-hotel access
  const order = await Order.findOne({ _id: orderId, ...hotelFilter }).populate('hotel', 'name');
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found or access denied",
    });
  }

  // Check if already paid
  if (order.paymentStatus === 'paid') {
    return res.status(400).json({
      success: false,
      message: "Order is already marked as paid",
    });
  }

  // Update payment details
  order.paymentStatus = 'paid';
  order.paymentMethod = paymentMethod;
  order.paidAt = new Date();
  order.paidAmount = paidAmount || order.totalPrice;
  order.paymentReference = paymentReference || `PAY-${Date.now()}`;
  if (notes) order.notes = notes;

  // If order is not yet delivered, mark as delivered
  if (order.status !== 'delivered') {
    order.status = 'delivered';
    order.deliveredAt = new Date();
  }

  await order.save();

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
      location: order.tableNumber ? `Table ${order.tableNumber}` : `Room ${order.roomNumber}`,
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
          message: `Your bill for Order #${order.orderNumber} is ready. Total: Rs. ${order.totalPrice}`,
        });
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
