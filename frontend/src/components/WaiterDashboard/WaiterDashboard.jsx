import React, { useState } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import DashboardContent from "./DashboardContent";
import RightPanel from "./RightPanel";
import MobileBottomNav from "./MobileBottomNav";
import OrderFormModal from "./OrderFormModal";
import { useOrderContext } from "../../context/useOrderContext";
import { Plus } from "lucide-react";

const WaiterDashboard = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const { orders, markServed, removeOrder } = useOrderContext();
  const [showOrderForm, setShowOrderForm] = useState(false);


  return (
    <div className="min-h-screen bg-[#F8F9FB] text-gray-900 lg:flex lg:h-screen lg:overflow-hidden">
      {/* Sidebar - Hidden on mobile, visible flex item on desktop */}
      <aside className="hidden lg:block lg:w-[280px] lg:shrink-0 lg:h-screen lg:bg-white lg:border-r lg:border-gray-100 lg:overflow-y-auto">
        <Sidebar />
      </aside>

      {/* Main Content Area - Flex grow to fill space */}
      <main className="flex-1 lg:h-screen overflow-y-auto relative w-full">
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
          onDeleteOrder={removeOrder}
        />
      </main>

      {/* Right Panel - Hidden on mobile, visible flex item on desktop */}
      <aside className="hidden lg:block lg:w-[380px] lg:shrink-0 lg:h-screen lg:bg-white lg:border-l lg:border-gray-100 lg:overflow-y-auto">
        <RightPanel />
      </aside>

      {/* Mobile Floating Action Button - Only visible on mobile */}
      <button
        onClick={() => setShowOrderForm(true)}
        className="lg:hidden fixed z-50 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-600 active:scale-95 transition-all"
        style={{
          bottom: "80px",
          right: "16px",
          boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)"
        }}
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* Order Form Modal */}
      {showOrderForm && (
        <OrderFormModal onClose={() => setShowOrderForm(false)} />
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden">
        <MobileBottomNav />
      </nav>
    </div>
  );
};

export default WaiterDashboard;

