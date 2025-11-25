import React, { useState } from "react";
import Sidebar from "./Sidebar";
import DashboardContent from "./DashboardContent";

const KitchenDashboard = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [orders, setOrders] = useState([
    {
      id: "82301",
      status: "new",
      table: "Table 5",
      customerName: "Citiz Shrestha",
      time: "2m ago",
      placedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      items: "2× Club Sandwich, 1× Caesar Salad, 2× Iced Tea",
      image:
        "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&h=600&fit=crop&q=80",
    },
    {
      id: "82300",
      status: "preparing",
      table: "Room 204",
      customerName: "Marshal Chaudhary",
      time: "8m ago",
      placedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      startedPreparingAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      items: "1× Steak Frites, 1× Glass of Red Wine",
      image:
        "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&h=600&fit=crop&q=80",
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
      items: "1× Margarita Pizza, 2× Lemonade",
      image:
        "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=600&fit=crop&q=80",
    },
    {
      id: "82298",
      status: "new",
      table: "Table 3",
      customerName: "Rejina Gharti Magar",
      time: "1h ago",
      placedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      items: "1× Veggie Wrap, 1× Fresh Lime Juice",
      image:
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&q=80",
    },
    {
      id: "82297",
      status: "preparing",
      table: "Room 201",
      customerName: "Farhan Alam",
      time: "2h ago",
      placedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      startedPreparingAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      items: "1× Chicken Tikka Masala, 1× Garlic Naan",
      image:
        "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&h=600&fit=crop&q=80",
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
      items: "1× Chicken Quesadilla, 2× Fresh Fruit Salad",
      image:
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop&q=80",
    },
  ]);

  const handleUpdateOrderStatus = (orderId, newStatus) => {
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

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8F9FB", display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "32px", overflow: "auto" }}>
        <DashboardContent
          orders={orders}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onUpdateOrderStatus={handleUpdateOrderStatus}
        />
      </div>
    </div>
  );
};

export default KitchenDashboard;
