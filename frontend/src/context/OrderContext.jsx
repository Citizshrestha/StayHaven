import { useState, useEffect, useCallback } from "react";
import { OrderContext } from "./OrderContextDef";
import { getActiveProperty, getOrders, createOrder, updateOrder as updateOrderApi, updateOrderStatus as updateOrderStatusApi } from "../api/staff";

// sample order data 
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
      {
        id: "item-2",
        name: "Caesar Salad",
        quantity: 1,
        price: 9.99,
        notes: "Dressing on the side",
        image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&h=600&fit=crop&q=80",
      },
      {
        id: "item-3",
        name: "Iced Tea",
        quantity: 2,
        price: 3.99,
        notes: "",
        image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=600&fit=crop&q=80",
      },
    ],
    itemsText: "2× Club Sandwich, 1× Caesar Salad, 2× Iced Tea",
    image: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&h=600&fit=crop&q=80",
  },
  {
    id: "82300",
    status: "preparing",
    table: "Room 204",
    customerName: "Marshal Chaudhary",
    time: "8m ago",
    placedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    startedPreparingAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    items: [
      {
        id: "item-4",
        name: "Steak Frites",
        quantity: 1,
        price: 28.99,
        notes: "Medium rare",
        image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&h=600&fit=crop&q=80",
      },
      {
        id: "item-5",
        name: "Glass of Red Wine",
        quantity: 1,
        price: 12.99,
        notes: "Cabernet Sauvignon",
        image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=600&fit=crop&q=80",
      },
    ],
    itemsText: "1× Steak Frites, 1× Glass of Red Wine",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&h=600&fit=crop&q=80",
  },
  {
    id: "82299",
    status: "ready",
    table: "Table 12",
    customerName: "Rejina Gharti Magar",
    time: "15m ago",
    placedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    startedPreparingAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    readyAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    items: [
      {
        id: "item-6",
        name: "Margarita Pizza",
        quantity: 1,
        price: 16.99,
        notes: "Extra cheese",
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=600&fit=crop&q=80",
      },
      {
        id: "item-7",
        name: "Lemonade",
        quantity: 2,
        price: 4.99,
        notes: "Less sugar",
        image: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=800&h=600&fit=crop&q=80",
      },
    ],
    itemsText: "1× Margarita Pizza, 2× Lemonade",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=600&fit=crop&q=80",
  },
  {
    id: "82298",
    status: "new",
    table: "Table 3",
    customerName: "Suman Thapa",
    time: "1h ago",
    placedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: "item-8",
        name: "Veggie Wrap",
        quantity: 1,
        price: 10.99,
        notes: "Gluten-free wrap if available",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&q=80",
      },
      {
        id: "item-9",
        name: "Fresh Lime Juice",
        quantity: 1,
        price: 3.99,
        notes: "",
        image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&h=600&fit=crop&q=80",
      },
    ],
    itemsText: "1× Veggie Wrap, 1× Fresh Lime Juice",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&q=80",
  },
  {
    id: "82297",
    status: "preparing",
    table: "Room 201",
    customerName: "Farhan Alam",
    time: "2h ago",
    placedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    startedPreparingAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    items: [
      {
        id: "item-10",
        name: "Chicken Tikka Masala",
        quantity: 1,
        price: 18.99,
        notes: "Mild spice level",
        image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&h=600&fit=crop&q=80",
      },
      {
        id: "item-11",
        name: "Garlic Naan",
        quantity: 2,
        price: 4.99,
        notes: "Extra butter",
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&h=600&fit=crop&q=80",
      },
      {
        id: "item-12",
        name: "Mango Lassi",
        quantity: 1,
        price: 5.99,
        notes: "",
        image: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&h=600&fit=crop&q=80",
      },
    ],
    itemsText: "1× Chicken Tikka Masala, 2× Garlic Naan, 1× Mango Lassi",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&h=600&fit=crop&q=80",
  },
  {
    id: "82296",
    status: "ready",
    table: "Table 11",
    customerName: "Keshu Regmi",
    time: "3h ago",
    placedAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    startedPreparingAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    readyAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    items: [
      {
        id: "item-13",
        name: "Chicken Quesadilla",
        quantity: 1,
        price: 13.99,
        notes: "Extra sour cream",
        image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop&q=80",
      },
      {
        id: "item-14",
        name: "Fresh Fruit Salad",
        quantity: 2,
        price: 7.99,
        notes: "No melon please",
        image: "https://images.unsplash.com/photo-1564093497595-593b96d80180?w=800&h=600&fit=crop&q=80",
      },
    ],
    itemsText: "1× Chicken Quesadilla, 2× Fresh Fruit Salad",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop&q=80",
  },
];

export const OrderProvider = ({ children }) => {

  const [realOrders, setRealOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // dummy orders
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem("restaurant_orders");
    return saved ? JSON.parse(saved) : defaultOrders;
  });

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

      // fetch all order types and status
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
            : `Table ${order.tableNumber}`,
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
    // Also remove from dummy orders if it exists there
    setOrders(prevOrders =>
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
    const orderToUpdate = [...realOrders, ...orders].find(
      (order) => order.id === orderId || order._id === orderId
    );

    const now = new Date();
    const timeOptions = { hour: "numeric", minute: "2-digit", hour12: true };

    // If it's a real order, call the API
    if (orderToUpdate?.isReal) {
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
      // For dummy orders, update local state
      setOrders((prevOrders) =>
        prevOrders.map((order) => {
          if (order.id === orderId) {
            const historyEntry = {
              status: newStatus,
              timestamp: now.toLocaleTimeString("en-US", timeOptions),
              fullDate: now.toLocaleDateString(),
            };

            return {
              ...order,
              status: newStatus,
              statusHistory: [...(order.statusHistory || []), historyEntry],
              ...(newStatus === "preparing" && {
                startedPreparingAt: now.toISOString(),
                startedPreparingAtDisplay: now.toLocaleTimeString(
                  "en-US",
                  timeOptions
                ),
              }),
              ...(newStatus === "ready" && {
                readyAt: now.toISOString(),
                readyAtDisplay: now.toLocaleTimeString("en-US", timeOptions),
              }),
              ...(newStatus === "delivered" && {
                deliveredAt: now.toISOString(),
                completedAt: now.toLocaleTimeString("en-US", timeOptions), // Keep for backward compat with UI
                servedAt: now.toLocaleTimeString("en-US", timeOptions),
              }),
            };
          }
          return order;
        })
      );
    }
  };

  const markServed = async (orderId) => {
    // Just delegate to updateOrderStatus with "delivered" status
    // This handles both real (API) and dummy (local) orders correctly now
    await updateOrderStatus(orderId, "delivered");
  };

  // Update an order (for edit functionality)
  const updateOrder = async (updatedOrder) => {
    try {
      setLoading(true);
      const orderId = updatedOrder.id || updatedOrder._id;

      // Check if it's a real order (has isReal flag or came from backend)
      if (updatedOrder.isReal) {
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
      } else {
        // For dummy orders, update locally
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId
              ? {
                ...order,
                ...updatedOrder,
                itemsText:
                  updatedOrder.items
                    ?.map((i) => `${i.quantity}× ${i.name}`)
                    .join(", ") || order.itemsText,
              }
              : order
          )
        );
      }
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

  // combine: real orders first, then dummy orders, sorted by newest first
  const allOrders = [...realOrders, ...orders].sort((a, b) => {
    const dateA = new Date(a.placedAt || a.createdAt || 0);
    const dateB = new Date(b.placedAt || b.createdAt || 0);
    return dateB - dateA; // Newest first
  });

  // Save to localStorage when orders change AND dispatch custom event for same-tab updates
  useEffect(() => {
    localStorage.setItem("restaurant_orders", JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent("ordersUpdated", { detail: orders }));
  }, [orders]);

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

  // Listen for changes from other tabs (storage event) AND same tab (custom event)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "restaurant_orders" && e.newValue) {
        setOrders(JSON.parse(e.newValue));
      }
    };

    // For same-tab updates from other components
    const handleOrdersUpdated = (e) => {
      // Only update if the data is different (avoid infinite loops)
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

    // Also poll localStorage every 2 seconds as a fallback
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