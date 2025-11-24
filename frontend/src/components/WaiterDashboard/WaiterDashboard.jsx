import React, { useState } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import DashboardContent from "./DashboardContent";
import RightPanel from "./RightPanel";
import MobileBottomNav from "./MobileBottomNav";

const WaiterDashboard = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [orders, _setOrders] = useState([
    {
      id: "82301",
      status: "new",
      table: "Table 5",
      time: "2m ago",
      items: "2× Club Sandwich, 1× Caesar Salad, 2× Iced Tea",
      image:
        "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400",
    },
    {
      id: "82300",
      status: "preparing",
      table: "Room 204",
      time: "8m ago",
      items: "1× Steak Frites, 1× Glass of Red Wine",
      image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400",
    },
    {
      id: "82299",
      status: "ready",
      table: "Table 12",
      time: "15m ago",
      items: "1× Margarita Pizza, 2× Lemonade",
      image:
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
    },
  ]);
  const [_notifications, _setNotifications] = useState([
    {
      id: "1",
      message: "New order received from Table 5",
      time: "Just now",
    },
    {
      id: "2",
      message: "Order #82301 is ready to be served",
      time: "10m ago",
    },
  ]);

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-gray-900">
      {/* Sidebar - Hidden on mobile, fixed on desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-[260px] lg:z-30 lg:bg-white">
        <Sidebar />
      </aside>

      {/* Right Panel - Fixed on desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:right-0 lg:top-0 lg:h-screen lg:w-[360px] lg:z-30 lg:bg-white lg:border-l lg:border-gray-100">
        <RightPanel />
      </aside>

      {/* Main Content Area */}
      <main className="w-full min-h-screen lg:ml-[260px] lg:mr-[360px]">
        {/* Mobile Header */}
        <header className="lg:hidden">
          <MobileHeader />
        </header>

        {/* Dashboard Content */}
        <DashboardContent
          orders={orders}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden">
        <MobileBottomNav />
      </nav>
    </div>
  );
};

export default WaiterDashboard;
