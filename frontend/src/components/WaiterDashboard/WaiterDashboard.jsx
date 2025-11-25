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
 
   const handleUpdateOrderStatus = (orderId, newStatus) => {
      setOrders ((prevOrders) => 
        prevOrders.map((order) => 
          order.id === orderId ? {...order, status: newStatus} : order
        )
      );
   };

   const handleMarkServed = (orderId) => {
      setOrders ((prevOrders) => prevOrders.filter ((order) => order.id !== orderId));
   }

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
          onUpdateOrderStatus = {handleUpdateOrderStatus}
          onMarkServed = {handleMarkServed}
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
