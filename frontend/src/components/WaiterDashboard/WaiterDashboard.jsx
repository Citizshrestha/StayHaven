import React, { useState } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import DashboardContent from "./DashboardContent";
import RightPanel from "./RightPanel";
import MobileBottomNav from "./MobileBottomNav";
import { useOrderContext } from "../../context/useOrderContext";

const WaiterDashboard = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const { orders, markServed } = useOrderContext();


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
          onMarkServed={markServed}
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
