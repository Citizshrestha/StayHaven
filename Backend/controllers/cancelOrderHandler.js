/**
 * Cancel Order Handler
 * 
 * Handles order cancellation requests from guests
 * with smart business logic based on order status
 */

import { Order } from "../models/order.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emitToHotel, emitToKitchen, emitToWaiters, emitToUser } from "../config/socket.js";
import * as Sentry from "@sentry/node";

/**
 * Business Rules for Order Cancellation:
 * 
 * CAN CANCEL:
 * - pending: Yes (not yet confirmed by staff)
 * - confirmed: Yes (confirmed but not started cooking)
 * 
 * CANNOT CANCEL:
 * - preparing: No (already being cooked)
 * - ready: No (food is ready)
 * - delivered: No (already delivered)
 * - cancelled: No (already cancelled)
 * 
 * SPECIAL CASES:
 * - If bill already sent: Cannot cancel (must contact staff)
 * - If payment made: Cannot cancel (must request refund)
 */

const CANCELLABLE_STATUSES = ['pending', 'confirmed'];
const NON_CANCELLABLE_STATUSES = ['preparing', 'ready', 'delivered', 'cancelled'];

/**
 * POST /api/guest/portal/orders/:id/cancel
 * Cancel an order (guest-initiated)
 */
export const cancelOrder = asyncHandler(async (req, res) => {
  const { id: orderId } = req.params;
  const { reason } = req.body;
  const userId = req.user._id;

  // Find order
  const order = await Order.findOne({
    _id: orderId,
    customerId: userId,
  }).populate("hotel", "name");

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found or access denied",
    });
  }

  // Check if already cancelled
  if (order.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      message: "Order is already cancelled",
    });
  }

  // Check if order can be cancelled based on status
  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    const statusMessages = {
      preparing: "Order is already being prepared in the kitchen. Please contact staff to cancel.",
      ready: "Order is ready for delivery. Please contact staff to cancel.",
      delivered: "Order has been delivered and cannot be cancelled. Please contact staff for assistance.",
    };

    return res.status(400).json({
      success: false,
      message: statusMessages[order.status] || "Order cannot be cancelled at this stage",
      canCancel: false,
      currentStatus: order.status,
      contactStaff: true,
    });
  }

  // Check if bill has been sent
  if (order.billSent) {
    return res.status(400).json({
      success: false,
      message: "Bill has been sent. Please contact staff to cancel this order.",
      canCancel: false,
      billSent: true,
      contactStaff: true,
    });
  }

  // Check if payment has been made
  if (order.paymentStatus === 'paid') {
    return res.status(400).json({
      success: false,
      message: "Order has been paid. Please contact staff for refund assistance.",
      canCancel: false,
      paymentStatus: 'paid',
      contactStaff: true,
    });
  }

  // Store original status for notification
  const originalStatus = order.status;

  // Cancel the order
  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancelledBy = userId;
  order.cancellationReason = reason || 'Cancelled by guest';

  await order.save();

  // Emit real-time notifications
  try {
    // Notify hotel staff
    emitToHotel(order.hotel._id.toString(), "order-cancelled", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      cancelledBy: 'guest',
      guestName: order.customerName,
      roomNumber: order.roomNumber,
      tableNumber: order.tableNumber,
      reason: order.cancellationReason,
      originalStatus,
      cancelledAt: order.cancelledAt,
    });

    // Notify kitchen
    emitToKitchen(order.hotel._id.toString(), "order-cancelled", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      reason: order.cancellationReason,
    });

    // Notify waiters
    emitToWaiters(order.hotel._id.toString(), "order-cancelled", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      roomNumber: order.roomNumber,
      tableNumber: order.tableNumber,
    });

    // Confirm to guest
    emitToUser(userId.toString(), "order-cancelled-confirmed", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      cancelledAt: order.cancelledAt,
    });
  } catch (socketError) {
    Sentry.captureException(socketError, {
      tags: { feature: "cancel-order-socket" },
    });
  }

  res.status(200).json({
    success: true,
    message: "Order cancelled successfully",
    data: {
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason,
        refundAmount: order.totalPrice, // For future refund processing
      },
    },
  });
});

/**
 * GET /api/guest/portal/orders/:id/can-cancel
 * Check if an order can be cancelled
 */
export const checkCancellable = asyncHandler(async (req, res) => {
  const { id: orderId } = req.params;
  const userId = req.user._id;

  // Find order
  const order = await Order.findOne({
    _id: orderId,
    customerId: userId,
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found or access denied",
    });
  }

  // Determine if order can be cancelled
  const canCancel = 
    CANCELLABLE_STATUSES.includes(order.status) &&
    !order.billSent &&
    order.paymentStatus !== 'paid';

  // Determine reason if cannot cancel
  let reason = null;
  let contactStaff = false;

  if (order.status === 'cancelled') {
    reason = "Order is already cancelled";
  } else if (NON_CANCELLABLE_STATUSES.includes(order.status)) {
    reason = `Order is ${order.status} and cannot be cancelled`;
    contactStaff = true;
  } else if (order.billSent) {
    reason = "Bill has been sent";
    contactStaff = true;
  } else if (order.paymentStatus === 'paid') {
    reason = "Order has been paid";
    contactStaff = true;
  }

  // Calculate time since order placed
  const orderAge = Date.now() - new Date(order.createdAt).getTime();
  const minutesSinceOrder = Math.floor(orderAge / 60000);

  res.status(200).json({
    success: true,
    data: {
      canCancel,
      reason,
      contactStaff,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        billSent: order.billSent,
        paymentStatus: order.paymentStatus,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt,
        minutesSinceOrder,
      },
    },
  });
});

/**
 * Helper function to check if order can be cancelled
 * Used internally by other controllers
 */
export const isOrderCancellable = (order) => {
  return (
    CANCELLABLE_STATUSES.includes(order.status) &&
    !order.billSent &&
    order.paymentStatus !== 'paid' &&
    order.status !== 'cancelled'
  );
};
