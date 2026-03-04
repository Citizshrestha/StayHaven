import React from "react";
import { LayoutDashboard, Bell, Settings, MessageCircle } from "lucide-react";

/**
 * KitchenMobileNav Component
 * 
 * Bottom navigation bar for mobile devices in Kitchen Dashboard.
 * Includes Settings for dark mode toggle access.
 * 
 * @param {string} activeView - Currently active view from parent
 * @param {function} onViewChange - Callback to change view in parent
 * @param {number} notificationCount - Number of unread notifications
 * @param {boolean} isDarkMode - Whether dark mode is active
 */
const KitchenMobileNav = ({
  activeView = "dashboard",
  onViewChange,
  notificationCount = 0,
  isDarkMode = false,
  onMessagingToggle,
  unreadMessageCount = 0,
}) => {
  // Tab definitions
  const tabs = [
    { id: "dashboard", label: "Orders", icon: LayoutDashboard },
    { id: "notifications", label: "Alerts", icon: Bell, badge: notificationCount },
    { id: "messages", label: "Messages", icon: MessageCircle, badge: unreadMessageCount, action: onMessagingToggle },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleTabClick = (tab) => {
    if (tab.action) {
      tab.action();
      return;
    }
    if (onViewChange) {
      onViewChange(tab.id);
    }
  };

  // Theme colors
  const colors = {
    bg: isDarkMode ? "#1E293B" : "white",
    border: isDarkMode ? "#334155" : "#E5E7EB",
    active: "#10B981",
    inactive: isDarkMode ? "#94A3B8" : "#6B7280",
    text: isDarkMode ? "#94A3B8" : "#6B7280",
    activeText: "#10B981",
  };

  return (
    <div 
      className="lg:hidden fixed bottom-0 left-0 right-0 px-2 py-2 z-40"
      style={{
        backgroundColor: colors.bg,
        borderTop: `1px solid ${colors.border}`,
      }}
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className="relative flex flex-col items-center py-2 px-4"
              style={{
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Icon
                size={22}
                style={{
                  color: isActive ? colors.active : colors.inactive,
                }}
              />

              {/* Notification Badge */}
              {tab.badge > 0 && (
                <span 
                  className="absolute flex items-center justify-center"
                  style={{
                    top: "0",
                    right: "12px",
                    minWidth: "18px",
                    height: "18px",
                    padding: "0 4px",
                    backgroundColor: "#3B82F6",
                    color: "white",
                    fontSize: "10px",
                    fontWeight: "700",
                    borderRadius: "9px",
                  }}
                >
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}

              <span 
                className="mt-1"
                style={{
                  fontSize: "10px",
                  fontWeight: isActive ? "600" : "500",
                  color: isActive ? colors.activeText : colors.text,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default KitchenMobileNav;
