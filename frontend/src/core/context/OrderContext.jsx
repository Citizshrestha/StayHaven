import { useState, useEffect, useCallback, useMemo } from "react";
import { OrderContext } from "./OrderContextDef";
import { getActiveProperty, getOrders, createOrder, updateOrder as updateOrderApi, updateOrderStatus as updateOrderStatusApi } from "../api/services/staff.service";

export const OrderProvider = ({ children }) => {

  const [realOrders, setRealOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // fetch orders from backend
  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const activeProperty = getActiveProperty();
      if (!activeProperty?._id) {
        setError("No active property found");
        return;
      }

      // fetch all order types and status — use allSettled so a transient 401
      // on one request doesn't abort all 12 parallel fetches
      const results = await Promise.allSettled([
        getOrders(activeProperty._id, "pending", "dineIn"),
        getOrders(activeProperty._id, "preparing", "dineIn"),
        getOrders(activeProperty._id, "ready", "dineIn"),
        getOrders(activeProperty._id, "delivered", "dineIn"),
        getOrders(activeProperty._id, "pending", "roomService"),
        getOrders(activeProperty._id, "preparing", "roomService"),
        getOrders(activeProperty._id, "ready", "roomService"),
        getOrders(activeProperty._id, "delivered", "roomService"),
        getOrders(activeProperty._id, "pending", "takeaway"),
        getOrders(activeProperty._id, "preparing", "takeaway"),
        getOrders(activeProperty._id, "ready", "takeaway"),
        getOrders(activeProperty._id, "delivered", "takeaway"),
      ]);

      const [
        dineInPending,
        dineInPreparing,
        dineInReady,
        dineInDelivered,
        roomPending,
        roomPreparing,
        roomReady,
        roomDelivered,
        takeawayPending,
        takeawayPreparing,
        takeawayReady,
        takeawayDelivered,
      ] = results.map(r => r.status === "fulfilled" ? r.value : { orders: [] });


      // merge all orders
      const allOrders = [
        ...(dineInPending.orders || []),
        ...(dineInPreparing.orders || []),
        ...(dineInReady.orders || []),
        ...(dineInDelivered.orders || []),
        ...(roomPending.orders || []),
        ...(roomPreparing.orders || []),
        ...(roomReady.orders || []),
        ...(roomDelivered.orders || []),
        ...(takeawayPending.orders || []),
        ...(takeawayPreparing.orders || []),
        ...(takeawayReady.orders || []),
        ...(takeawayDelivered.orders || []),
      ];

      // transform backendOrders to match frontend format
      const transformedOrders = allOrders.map((order) => ({
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
        time: getTimeAgo(order.createdAt),
        placedAt: order.createdAt,
        updatedAt: order.updatedAt,
        deliveredAt: order.deliveredAt,
        totalPrice: order.totalPrice,
        priority: order.priority,
        orderType: order.orderType,
        items: order.items.map((item) => ({
          id: item._id || item.menuItem,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes || "",
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop",
        })),
        itemsText: order.items.map((i) => `${i.quantity}× ${i.name}`).join(", "),
        image: order.items[0]?.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop",
        isReal: true,
      }));

      setRealOrders(transformedOrders);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch orders:", err);
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
    return `${diffHours / 24}d ago`;

  };

  const addOrder = async (orderData) => {
    try {
      setLoading(true);
      setError(null);

      const activeProperty = getActiveProperty();
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
        console.error("Failed to update order status:", err);
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
      console.error("Failed to update order:", err);
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

  // fetch real orders when component mounts (only if logged in) AND poll every 5 seconds
  useEffect(() => {
    const fetchRealOrders = async () => {
      const staffToken = localStorage.getItem("staffAccessToken");
      if (staffToken) {
        await fetchOrders({ silent: true });
      }
    };

    fetchRealOrders();

    // Poll for updates every 5 seconds
    const intervalId = setInterval(fetchRealOrders, 5000);

    return () => clearInterval(intervalId);
  }, [fetchOrders]);

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