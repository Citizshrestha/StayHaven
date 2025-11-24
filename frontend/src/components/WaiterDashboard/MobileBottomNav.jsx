import React, { useState } from "react";
import { LayoutDashboard, UtensilsCrossed, Bell } from "lucide-react";

const MobileBottomNav = () => {
  // state for activeTab
  const [activeTab, setActiveTab] = useState("dashboard");
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "tables", label: "Tables", icon: UtensilsCrossed },
    { id: "alerts", label: "Alerts", icon: Bell, badge: 3 },
  ];
 
  const handleTabClick = (tabId) => {
    setActiveTab(tabId); // navigates to different page
  }
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex flex-col items-center py-2 px-4 ${
                isActive ? "text-emerald-500" : "text-gray-400"
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? "text-emerald-500" : "text-gray-400"}`} />
              
              {/* Notification Badge (if exists) */}
              {tab.badge && (
                <span className="absolute top-0 right-2 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                  {tab.badge}
                </span>
              )}
              
              <span className={`text-xs mt-1 ${isActive ? "text-emerald-500 font-medium" : "text-gray-600"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;
