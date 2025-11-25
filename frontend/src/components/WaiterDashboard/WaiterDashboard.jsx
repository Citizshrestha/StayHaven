import React, { useState } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import DashboardContent from "./DashboardContent";
import RightPanel from "./RightPanel";
import MobileBottomNav from "./MobileBottomNav";

const WaiterDashboard = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [orders, setOrders] = useState([
    {
      id: "82301",
      status: "new",
      table: "Table 5",
      customerName: "Citiz Shrestha",
      time: "2m ago",
      placedAt: new Date(Date.now() - 2 * 60 * 1000).toLocaleTimeString(),
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
      placedAt: new Date(Date.now() - 8 * 60 * 1000).toLocaleTimeString(),
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
      placedAt: new Date(Date.now() - 15 * 60 * 1000).toLocaleTimeString(),
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
      placedAt: new Date(Date.now() - 60 * 60 * 1000).toLocaleTimeString(),
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
      placedAt: new Date(Date.now() - 120 * 60 * 1000).toLocaleTimeString(),
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
      placedAt: new Date(Date.now() - 180 * 60 * 1000).toLocaleTimeString(),
      items: "1× Chicken Quesadilla, 2× Fresh Fruit Salad",
      image:
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop&q=80",
    },
  ]);

  const handleMarkServed = (orderId) => {
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
    <div className="min-h-screen bg-[#F8F9FB] text-gray-900 lg:flex lg:h-screen lg:overflow-hidden">
      {/* Sidebar - Hidden on mobile, visible flex item on desktop */}
      <aside className="hidden lg:block lg:w-[280px] lg:shrink-0 lg:h-full lg:bg-white lg:border-r lg:border-gray-100 lg:overflow-y-auto">
        <Sidebar />
      </aside>

      {/* Main Content Area - Flex grow to fill space */}
      <main className="flex-1 h-full overflow-y-auto relative w-full">
        {/* Mobile Header */}
        <header className="lg:hidden">
          <MobileHeader />
        </header>

        {/* Dashboard Content */}
        <DashboardContent
          orders={orders}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onMarkServed={handleMarkServed}
        />
      </main>

      {/* Right Panel - Hidden on mobile, visible flex item on desktop */}
      <aside className="hidden lg:block lg:w-[380px] lg:shrink-0 lg:h-full lg:bg-white lg:border-l lg:border-gray-100 lg:overflow-y-auto">
        <RightPanel />
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden">
        <MobileBottomNav />
      </nav>
    </div>
  );
};

export default WaiterDashboard;
