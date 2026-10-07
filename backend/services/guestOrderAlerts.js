/**
 * guestOrderAlerts.js
 *
 * One place that announces a new guest food order to hotel staff, used by both
 * ordering paths (logged-in guest portal + anonymous QR room/table ordering).
 *
 * Two channels, on purpose:
 *  1. Real-time "new-order" socket event → delivered ONCE to every staff socket
 *     of the hotel (dashboards refresh, sound plays).
 *  2. Persisted in-app notification (type "new_order", priority high) for every
 *     active waiter + receptionist of the hotel. This is what makes the alert
 *     survive a refresh, a closed tab, or a staff member who was offline — it
 *     shows up in their notification bell on next load. Its socket echo goes to
 *     the personal user-<id> room, which is also a fallback for staff whose
 *     socket never joined the hotel room.
 *
 * The frontend dedupes (1) and (2) by orderId so staff get a single alert.
 * Everything here is best-effort and never throws — an alert must not fail
 * or slow down the guest's order.
 */

import { User } from "../models/user.schema.js";
import { Role } from "../models/role.schema.js";
import { emitToHotelStaff } from "../config/socket.js";
import { createNotificationInternal } from "../controllers/notificationController.js";

const ALERT_ROLES = ["waiter", "receptionist"];

const describeOrder = (order) => {
  const itemCount = (order.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const where =
    order.orderType === "dineIn"
      ? (order.tableNumber ? `Table ${order.tableNumber}` : "Dine-in")
      : (order.roomNumber ? `Room ${order.roomNumber}` : "Room service");
  const kind = order.orderType === "dineIn" ? "table" : "room service";
  return {
    where,
    title: `New ${kind} order #${order.orderNumber}`.slice(0, 100),
    message: `${where} · ${itemCount} item${itemCount === 1 ? "" : "s"} · Rs ${Number(order.totalPrice || 0).toLocaleString("en-IN")}`.slice(0, 500),
  };
};

const findAlertRecipients = async (hotelId) => {
  // Staff role can live on companyRole or on the Role document — match either.
  const roles = await Role.find({ name: { $in: ALERT_ROLES } }).select("_id").lean();
  return User.find({
    assignedProperties: hotelId,
    isActive: true,
    $or: [
      { companyRole: { $in: ALERT_ROLES } },
      { role: { $in: roles.map((r) => r._id) } },
    ],
  })
    .select("_id")
    .lean();
};

/**
 * @param {object}  args
 * @param {string}  args.hotelId
 * @param {object}  args.order     saved Order document
 * @param {string} [args.senderId] guest user id (omitted for anonymous QR guests)
 * @param {object} [args.extra]    extra fields merged into the socket payload
 */
export const announceGuestOrder = async ({ hotelId, order, senderId = null, extra = {} }) => {
  if (!hotelId || !order) return;
  const { title, message, where } = describeOrder(order);

  // 1. Real-time, once per staff socket
  try {
    emitToHotelStaff(hotelId, "new-order", {
      order: typeof order.toObject === "function" ? order.toObject() : order,
      message: title,
      location: where,
      source: "guest",
      ...extra,
    });
  } catch (err) {
    console.error("[announceGuestOrder] socket emit failed:", err.message);
  }

  // 2. Persisted notifications for waiters + receptionists
  try {
    const recipients = await findAlertRecipients(hotelId);
    await Promise.all(
      recipients.map((r) =>
        createNotificationInternal({
          userId: r._id,
          senderId,
          type: "new_order",
          title,
          message,
          priority: "high",
          payload: {
            orderId: String(order._id),
            orderNumber: order.orderNumber,
            orderType: order.orderType,
            roomNumber: order.roomNumber || null,
            tableNumber: order.tableNumber || null,
            source: "guest",
          },
        })
      )
    );
  } catch (err) {
    console.error("[announceGuestOrder] notification fan-out failed:", err.message);
  }
};

/**
 * A guest cancelled their own order. Staff screens only listen for
 * "order-status-updated" (the old "order-cancelled" event had no listeners),
 * so broadcast that — once per staff socket — and persist a high-priority
 * notification for the kitchen, waiters and reception so a cook stops cooking.
 */
export const announceGuestCancellation = async ({ order, senderId = null, reason = "" }) => {
  const hotelId = (order?.hotel?._id || order?.hotel)?.toString();
  if (!hotelId) return;
  const { where } = describeOrder(order);
  const message = `❌ Guest cancelled Order #${order.orderNumber} (${where})${reason ? ` — ${reason}` : ""}`.slice(0, 500);

  try {
    const eventData = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: "cancelled",
      orderType: order.orderType,
      tableNumber: order.tableNumber,
      roomNumber: order.roomNumber,
      updatedAt: new Date(),
      updatedBy: order.customerName || "Guest",
      updaterId: senderId ? String(senderId) : undefined,
      updaterRole: "guest",
      reason,
    };
    emitToHotelStaff(hotelId, "order-status-updated", { ...eventData, message });
    emitToHotelStaff(hotelId, "order-cancelled", { ...eventData, cancelledBy: "guest", message });
  } catch (err) {
    console.error("[announceGuestCancellation] socket emit failed:", err.message);
  }

  try {
    const roleNames = ["waiter", "chief", "kitchen", "receptionist", "manager"];
    const roles = await Role.find({ name: { $in: roleNames } }).select("_id").lean();
    const recipients = await User.find({
      assignedProperties: hotelId,
      isActive: true,
      $or: [{ companyRole: { $in: roleNames } }, { role: { $in: roles.map((r) => r._id) } }],
    }).select("_id").lean();

    await Promise.all(
      recipients.map((r) =>
        createNotificationInternal({
          userId: r._id,
          senderId,
          type: "order_status",
          title: `Order #${order.orderNumber} cancelled`.slice(0, 100),
          message,
          priority: "high",
          payload: {
            orderId: String(order._id),
            orderNumber: order.orderNumber,
            status: "cancelled",
            orderType: order.orderType,
            roomNumber: order.roomNumber || null,
            tableNumber: order.tableNumber || null,
            source: "guest",
          },
        })
      )
    );
  } catch (err) {
    console.error("[announceGuestCancellation] notification fan-out failed:", err.message);
  }
};

export default announceGuestOrder;
