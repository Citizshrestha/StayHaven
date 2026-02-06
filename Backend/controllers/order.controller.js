import { create, find, findByIdAndUpdate } from '../models/order.schema';
import { create as _create } from '../models/notification.schema';

// Create new order
export async function createOrder(req, res) {
  try {
    const { roomNumber, items, totalPrice, orderBy } = req.body;

    const order = await create({ roomNumber, items, totalPrice, orderBy });

    // 🔔 Create notification for admin/staff
    await _create({
      recipient: null, // you can replace with admin user id if available
      sender: orderBy,
      type: 'Order',
      title: 'New Order Placed',
      message: `New order placed from Room ${roomNumber}`,
      data: { orderId: order._id, roomNumber },
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Get all orders
export async function getOrders(req, res) {
  try {
    const orders = await find().populate('orderBy', 'name email');
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Update order status
export async function updateOrderStatus(req, res) {
  try {
    const order = await findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    ).populate('orderBy', 'name email');

    // 🔔 Notify user when status updates
    await _create({
      recipient: order.orderBy?._id,
      sender: null, // system/admin
      type: 'OrderStatus',
      title: 'Order Status Updated',
      message: `Your order status is now: ${order.status}`,
      data: { orderId: order._id, roomNumber: order.roomNumber },
    });

    res.json({ success: true, data: order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
}
