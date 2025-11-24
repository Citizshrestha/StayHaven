import {
  LayoutDashboard,
  UtensilsCrossed,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import { useState } from "react";

const Sidebar = () => {
  const [activeMenu, setActiveMenu] = useState("dashboard");

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "assignedTables", label: "Assigned Tables", icon: UtensilsCrossed },
    { id: "notifications", label: "Notifications", icon: Bell, badge: 3 },
  ];

  return (
    <div className="h-full w-full bg-white flex flex-col border-r border-gray-100">
      {/* User Profile */}
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=faces"
              alt="Profile"
              className="w-11 h-11 rounded-full object-cover"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#10B981] border-2 border-white rounded-full" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
              Alex Miller
            </h3>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Waiter
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 pt-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              className={`group relative w-full overflow-hidden rounded-lg px-4 py-2.5 text-left transition-all duration-200 ${
                isActive
                  ? "bg-emerald-50 text-emerald-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" strokeWidth={2} />
                <span className="text-[14px] font-medium">
                  {item.label}
                </span>
                {item.badge && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[11px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="px-4 pb-6 pt-3 border-t border-gray-100 space-y-1">
        <button className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-[14px] font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900">
          <Settings className="w-5 h-5" strokeWidth={2} />
          Settings
        </button>
        <button className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-[14px] font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-600">
          <LogOut className="w-5 h-5" strokeWidth={2} />
          Log Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
