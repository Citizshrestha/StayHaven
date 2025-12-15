import React, { useState } from "react";
import Sidebar from "./Sidebar";
import DashboardContent from "./DashboardContent";
import { useOrderContext } from "../../context/useOrderContext";

const KitchenDashboard = () => {
  const [activeFilter, setActiveFilter] = useState("all");
   const {orders, updateOrderStatus} = useOrderContext();

 
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8F9FB", display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "32px", overflow: "auto" }}>
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
