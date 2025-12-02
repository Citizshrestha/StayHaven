import { useState, useEffect } from "react";
import { OrderContext } from "./OrderContextDef";

// Default orders data with multiple items support
const defaultOrders = [
  {
    id: "82301",
    status: "new",
    table: "Table 5",
    customerName: "Citiz Shrestha",
    time: "2m ago",
    placedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    // NEW: Items as array with individual details
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
    // Keep legacy string for backward compatibility
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
  // Load from localStorage or use defaults
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem("restaurant_orders");
    return saved ? JSON.parse(saved) : defaultOrders;
  });

  // Save to localStorage when orders change
  useEffect(() => {
    localStorage.setItem("restaurant_orders", JSON.stringify(orders));
  }, [orders]);

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "restaurant_orders" && e.newValue) {
        setOrders(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id === orderId) {
          const now = new Date();
          const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
          const historyEntry = {
            status: newStatus,
            timestamp: now.toLocaleTimeString('en-US', timeOptions),
            fullDate: now.toLocaleDateString(),
          };
          return {
            ...order,
            status: newStatus,
            statusHistory: [...(order.statusHistory || []), historyEntry],
            ...(newStatus === "preparing" && {
              startedPreparingAt: now.toISOString(),
              startedPreparingAtDisplay: now.toLocaleTimeString('en-US', timeOptions),
            }),
            ...(newStatus === "ready" && {
              readyAt: now.toISOString(),
              readyAtDisplay: now.toLocaleTimeString('en-US', timeOptions),
            }),
          };
        }
        return order;
      })
    );
  };

  const markServed = (orderId) => {
    const now = new Date();
    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: "completed",
              servedAt: now.toLocaleTimeString('en-US', timeOptions),
              completedAt: now.toLocaleTimeString('en-US', timeOptions),
            }
          : order
      )
    );
  };

  return (
    <OrderContext.Provider value={{ 
      orders, 
      updateOrderStatus, 
      markServed 
    }}>
      {children}
    </OrderContext.Provider>
  );
};