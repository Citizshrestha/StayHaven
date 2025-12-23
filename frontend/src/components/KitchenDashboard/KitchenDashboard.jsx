import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import DashboardContent from "./DashboardContent";
import { useOrderContext } from "../../context/useOrderContext";

const KitchenDashboard = () => {
  const [activeFilter, setActiveFilter] = useState("all");
   const {orders, updateOrderStatus} = useOrderContext();

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

 
  return (
    <div style={{ height: "100vh", backgroundColor: "#F8F9FB", display: "flex", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "32px", overflowY: "auto", minHeight: 0 }}>
        <DashboardContent
          orders={orders}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onUpdateOrderStatus={updateOrderStatus}
        />
      </div>
    </div>
  );
};

export default KitchenDashboard;
