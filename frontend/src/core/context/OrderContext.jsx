import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { OrderContext } from "./OrderContextDef";
import { getActiveProperty, getOrders, createOrder, updateOrder as updateOrderApi, updateOrderStatus as updateOrderStatusApi, getStaffProfile } from "../api/services/staff.service";

// Login only snapshots activeProperty into sessionStorage once, at sign-in
// time. If a staff member's property assignment is granted/changed after
// that (or the cached session predates the assignment), the snapshot goes
// stale and every order fetch fails silently forever, even though the
// account is fully provisioned server-side. This re-derives the active
// property from the authoritative /staff/me profile and re-caches it,
// self-healing without forcing a logout/login.
const ACTIVE_ORDER_STATUSES = "pending,confirmed,preparing,ready";

const resolveActiveProperty = async () => {
  const cached = getActiveProperty();
  if (cached?._id) return cached;

  try {
    const profile = await getStaffProfile();
    const property = profile?.user?.assignedProperties?.[0];
    if (property?._id) {
      sessionStorage.setItem("activeProperty", JSON.stringify(property));
      return property;
    }
  } catch {
    // Profile lookup failed (e.g. logged out) — surfaced by the caller
    // via the "No active property found" error below.
  }
  return null;
};

export const OrderProvider = ({ children }) => {
  const location = useLocation();
  const [realOrders, setRealOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if we're on a staff route that needs order data
  const isStaffRoute = useMemo(() => {
    const staffRoutes = [
      '/waiter-dashboard',
      '/kitchen-dashboard',
      '/reception-dashboard',
      '/hoteladmin-dashboard',
      '/restaurantmanagement',
    ];
    return staffRoutes.some(route => location.pathname.startsWith(route));
  }, [location.pathname]);

  // fetch orders from backend
  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const activeProperty = await resolveActiveProperty();
      if (!activeProperty?._id) {
        setError("No active property found");
        return;
      }
      setError(null);

      // Two fetches: every still-active ticket, plus the newest 100 orders of
      // any status (history). With one capped "all" list, a ticket that had
      // been preparing for hours dropped off once 100 newer orders existed
      // (REQ-kitchen-3). Real-time updates are delivered via sockets; this
      // fetch is just the initial load + slow safety-net poll.
      const [activeResponse, recentResponse] = await Promise.all([
        getOrders({ hotelId: activeProperty._id, status: ACTIVE_ORDER_STATUSES, limit: 200 }),
        getOrders(activeProperty._id, "all", "all"),
      ]);
      const byId = new Map();
      for (const order of [...(activeResponse?.orders || []), ...(recentResponse?.orders || [])]) {
        byId.set(String(order._id), order);
      }
      const allOrders = [...byId.values()];

      // transform backendOrders to match frontend format
      const transformedOrders = allOrders.map((order) => ({
        _id: order._id, // Preserve MongoDB _id
        id: order._id,
        orderNumber: order.orderNumber, // Human-readable order number
        status: order.status === "pending" ? "new" : order.status,
        table:
          order.orderType === "roomService"
            ? `Room ${order.roomNumber}`
            : order.orderType === "takeaway"
            ? "Takeaway"
            : `Table ${order.tableNumber}`,
        customerName: order.customerName || "Walk-in Guest",
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        roomNumber: order.roomNumber,
        tableNumber: order.tableNumber,
        time: getTimeAgo(order.createdAt),
        placedAt: order.createdAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        deliveredAt: order.deliveredAt,
        // Read-only fields the kitchen ticket renders (REQ-kitchen-2/4).
        notes: order.notes,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason,
        startedPreparingAt: order.startedPreparingAt,
        readyAt: order.readyAt,
        totalPrice: order.totalPrice,
        priority: order.priority,
        orderType: order.orderType,
        paymentStatus: order.paymentStatus,
        billSent: order.billSent,
        billSentAt: order.billSentAt,
        billSentTo: order.billSentTo,
        paidAt: order.paidAt,
        items: order.items.map((item) => ({
          id: item._id || item.menuItem,
          menuItemId: item.menuItem?._id || item.menuItem || undefined,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes || "",
          image: item.menuItem?.image || item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop",
        })),
        itemsText: order.items.map((i) => `${i.quantity}× ${i.name}`).join(", "),
        image: order.items[0]?.menuItem?.image || order.items[0]?.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop",
        isReal: true,
      }));

      setRealOrders(transformedOrders);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  const removeOrder = (orderId) => {
    // Remove from real orders (fetched from backend)
    setRealOrders(prevOrders =>
      prevOrders.filter(order => order.id !== orderId && order._id !== orderId)
    );
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffHours < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;

  };

  const addOrder = async (orderData) => {
    try {
      setLoading(true);
      setError(null);

      const activeProperty = await resolveActiveProperty();
      if (!activeProperty?._id) {
        setError("No active property found");
        return;
      }

      const response = await createOrder({
        ...orderData,
        hotelId: activeProperty._id,
      });

      if (response.success) {
        await fetchOrders({ silent: true });
        return response;
      } else {
        throw new Error(response.message || "Failed to create order");
      }
    } catch (err) {
      setError(err.message || "Failed to create order");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {

    // Find the order to check if it's a real order
    const orderToUpdate = realOrders.find(
      (order) => order.id === orderId || order._id === orderId
    );

    // All orders should be real orders from backend
    if (orderToUpdate) {
      try {
        setLoading(true);
        const apiStatus = newStatus === "new" ? "pending" : newStatus;
        await updateOrderStatusApi(orderId, apiStatus);
        // Refresh orders from backend to sync across all dashboards
        await fetchOrders({ silent: true });
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to update order status";
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    } else {
      throw new Error("Order not found");
    }
  };

  const markServed = async (orderId) => {
    // Delegate to updateOrderStatus with "delivered" status
    await updateOrderStatus(orderId, "delivered");
  };

  // Update an order (for edit functionality)
  const updateOrder = async (updatedOrder) => {
    try {
      setLoading(true);
      const orderId = updatedOrder.id || updatedOrder._id;

      // Call API to update on backend
      await updateOrderApi(orderId, {
        customerName: updatedOrder.customerName,
        customerPhone: updatedOrder.customerPhone,
        priority: updatedOrder.priority,
        notes: updatedOrder.notes,
        items: Array.isArray(updatedOrder.items)
          ? updatedOrder.items.map((item) => ({
            // The server re-prices from the menu (menuItem) or keeps the
            // existing line's price (id); `price` only matters for custom
            // lines a manager adds.
            id: item.id || item._id,
            menuItem: item.menuItemId || item.menuItem?._id || (typeof item.menuItem === "string" ? item.menuItem : undefined),
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes,
          }))
          : undefined,
      });

      // Refresh orders from backend
      await fetchOrders({ silent: true });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update order";
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Use only real orders from database
  const allOrders = useMemo(() => {
    // Sort by newest first
    return realOrders.sort((a, b) => {
      const dateA = new Date(a.placedAt || a.createdAt || 0);
      const dateB = new Date(b.placedAt || b.createdAt || 0);
      return dateB - dateA;
    });
  }, [realOrders]);

  // Fetch real orders on mount (only if logged in AND on a staff route).
  // Real-time updates arrive via sockets, so this interval is just a slow
  // safety-net resync (30s) rather than the primary update channel (P2-4).
  useEffect(() => {
    // Only fetch orders if we're on a staff route
    if (!isStaffRoute) {
      return;
    }

    const fetchRealOrders = async () => {
      const staffToken = sessionStorage.getItem("staffAccessToken");
      if (staffToken) {
        await fetchOrders({ silent: true });
      }
    };

    fetchRealOrders();

    // Safety-net resync every 30 seconds (sockets handle live updates)
    const intervalId = setInterval(fetchRealOrders, 30000);

    return () => clearInterval(intervalId);
  }, [fetchOrders, isStaffRoute]);

  return (
    <OrderContext.Provider value={{
      orders: allOrders,
      realOrders,
      loading,
      error,
      updateOrderStatus,
      markServed,
      addOrder,
      fetchOrders,
      removeOrder,
      updateOrder,
    }}>
      {children}
    </OrderContext.Provider>
  );
};