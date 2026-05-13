import { useState, useEffect, useCallback, useMemo } from "react";
import { OrderContext } from "./OrderContextDef";
import { getActiveProperty, getOrders, createOrder, updateOrder as updateOrderApi, updateOrderStatus as updateOrderStatusApi } from "../api/staff";

const defaultOrders = [
  {
    id: "82301",
    status: "new",
    table: "Table 5",
    customerName: "Citiz Shrestha",
    time: "2m ago",
    placedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    items: [
      {
        id: "item-1",
        name: "Club Sandwich",
        quantity: 2,
        price: 12.99,
        notes: "Extra mayo, no pickles",
        image: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&h=600&fit=crop&q=80",
      },
    ],
    itemsText: "2× Club Sandwich, 1× Caesar Salad, 2× Iced Tea",
    image: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&h=600&fit=crop&q=80",
  },
];

export const OrderProvider = ({ children }) => {
  const [realOrders, setRealOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem("restaurant_orders");
    return saved ? JSON.parse(saved) : defaultOrders;
  });

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

      const [
        dineInPending, dineInPreparing, dineInReady, dineInDelivered,
        roomPending, roomPreparing, roomReady, roomDelivered,
        takeawayPending, takeawayPreparing, takeawayReady, takeawayDelivered,
      ] = await Promise.all([
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

      const transformedOrders = allOrders.map((order) => ({
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status === "pending" ? "new" : order.status,
        table: order.orderType === "roomService" ? `Room ${order.roomNumber}` : `Table ${order.tableNumber}`,
        customerName: order.customerName || order.orderByName,
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
      console.error("Failed to fetch orders:", err);
      if (!silent) {
        setError(err.message);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

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

  const removeOrder = (orderId) => {
    setRealOrders(prevOrders => prevOrders.filter(order => order.id !== orderId && order._id !== orderId));
    setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId && order._id !== orderId));
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
      const response = await createOrder({...orderData, hotelId: activeProperty._id});
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
    const orderToUpdate = [...realOrders, ...orders].find((order) => order.id === orderId || order._id === orderId);
    const now = new Date();
    const timeOptions = { hour: "numeric", minute: "2-digit", hour12: true };

    if (orderToUpdate?.isReal) {
      try {
        setLoading(true);
        const apiStatus = newStatus === "new" ? "pending" : newStatus;
        await updateOrderStatusApi(orderId, apiStatus);
        await fetchOrders({ silent: true });
      } catch (err) {
        console.error("Failed to update order status:", err);
        throw new Error(err?.response?.data?.message || err?.message || "Failed to update order status");
      } finally {
        setLoading(false);
      }
    } else {
      setOrders((prevOrders) =>
        prevOrders.map((order) => {
          if (order.id === orderId) {
            const historyEntry = { status: newStatus, timestamp: now.toLocaleTimeString("en-US", timeOptions), fullDate: now.toLocaleDateString() };
            return {
              ...order,
              status: newStatus,
              statusHistory: [...(order.statusHistory || []), historyEntry],
              ...(newStatus === "preparing" && { startedPreparingAt: now.toISOString(), startedPreparingAtDisplay: now.toLocaleTimeString("en-US", timeOptions) }),
              ...(newStatus === "ready" && { readyAt: now.toISOString(), readyAtDisplay: now.toLocaleTimeString("en-US", timeOptions) }),
              ...(newStatus === "delivered" && { deliveredAt: now.toISOString(), completedAt: now.toLocaleTimeString("en-US", timeOptions), servedAt: now.toLocaleTimeString("en-US", timeOptions) }),
            };
          }
          return order;
        })
      );
    }
  };

  const markServed = async (orderId) => {
    await updateOrderStatus(orderId, "delivered");
  };

  const updateOrder = async (updatedOrder) => {
    try {
      setLoading(true);
      const orderId = updatedOrder.id || updatedOrder._id;
      if (updatedOrder.isReal) {
        await updateOrderApi(orderId, {
          customerName: updatedOrder.customerName,
          customerPhone: updatedOrder.customerPhone,
          priority: updatedOrder.priority,
          notes: updatedOrder.notes,
          items: Array.isArray(updatedOrder.items) ? updatedOrder.items.map((item) => ({name: item.name, quantity: item.quantity, price: item.price, notes: item.notes})) : undefined,
        });
        await fetchOrders({ silent: true });
      } else {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId ? {...order, ...updatedOrder, itemsText: updatedOrder.items?.map((i) => `${i.quantity}× ${i.name}`).join(", ") || order.itemsText} : order
          )
        );
      }
    } catch (err) {
      console.error("Failed to update order:", err);
      throw new Error(err?.response?.data?.message || err?.message || "Failed to update order");
    } finally {
      setLoading(false);
    }
  };

  const allOrders = useMemo(() => {
    const combined = [...realOrders, ...orders];
    const uniqueOrders = combined.reduce((acc, order) => {
      const isDuplicate = acc.some(existing => existing.id === order.id || (existing.isReal && !order.isReal && existing.table === order.table));
      if (order.isReal || !isDuplicate) {
        if (order.isReal) {
          const dummyIndex = acc.findIndex(o => !o.isReal && o.id === order.id);
          if (dummyIndex >= 0) {
            acc[dummyIndex] = order;
            return acc;
          }
        }
        acc.push(order);
      }
      return acc;
    }, []);
    return uniqueOrders.sort((a, b) => {
      if (a.isReal && !b.isReal) return -1;
      if (!a.isReal && b.isReal) return 1;
      const dateA = new Date(a.placedAt || a.createdAt || 0);
      const dateB = new Date(b.placedAt || b.createdAt || 0);
      return dateB - dateA;
    });
  }, [realOrders, orders]);

  useEffect(() => {
    localStorage.setItem("restaurant_orders", JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent("ordersUpdated", { detail: orders }));
  }, [orders]);

  useEffect(() => {
    const fetchRealOrders = async () => {
      const staffToken = localStorage.getItem("staffAccessToken");
      if (staffToken) {
        await fetchOrders({ silent: true });
      }
    };
    fetchRealOrders();
    const intervalId = setInterval(fetchRealOrders, 5000);
    return () => clearInterval(intervalId);
  }, [fetchOrders]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "restaurant_orders" && e.newValue) {
        setOrders(JSON.parse(e.newValue));
      }
    };
    const handleOrdersUpdated = (e) => {
      const newOrders = e.detail;
      setOrders((current) => {
        if (JSON.stringify(current) !== JSON.stringify(newOrders)) {
          return newOrders;
        }
        return current;
      });
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("ordersUpdated", handleOrdersUpdated);
    const pollInterval = setInterval(() => {
      const saved = localStorage.getItem("restaurant_orders");
      if (saved) {
        const parsed = JSON.parse(saved);
        setOrders((current) => {
          if (JSON.stringify(current) !== JSON.stringify(parsed)) {
            return parsed;
          }
          return current;
        });
      }
    }, 2000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("ordersUpdated", handleOrdersUpdated);
      clearInterval(pollInterval);
    };
  }, []);

  return (
    <OrderContext.Provider value={{orders: allOrders, realOrders, loading, error, updateOrderStatus, markServed, addOrder, fetchOrders, removeOrder, updateOrder}}>
      {children}
    </OrderContext.Provider>
  );
};

export default OrderContext;
