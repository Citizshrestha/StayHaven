import React from "react";
import { LayoutDashboard, UtensilsCrossed, Bell, Phone } from "lucide-react";

/**
 * MobileBottomNav Component
 * 
 * Bottom navigation bar for mobile devices.
 * Receives state from parent (WaiterDashboard) via props.
 * 
 * @param {string} activeView - Currently active view from parent
 * @param {function} onViewChange - Callback to change view in parent
 * @param {number} notificationCount - Number of unread notifications
 * @param {number} waiterCallCount - Number of active waiter calls
 */
const MobileBottomNav = ({
  activeView = "dashboard",
  onViewChange,
  notificationCount = 0,
  waiterCallCount = 0,
}) => {
  // Tab definitions - IDs must match the switch cases in WaiterDashboard
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "assignedTables", label: "Tables", icon: UtensilsCrossed },
    { id: "waiterCalls", label: "Calls", icon: Phone, badge: waiterCallCount },
    { id: "notifications", label: "Alerts", icon: Bell, badge: notificationCount },
  ];

  const handleTabClick = (tabId) => {
    if (onViewChange) {
      onViewChange(tabId);
    }
  };

  return (
    <div 
      className="lg:hidden fixed bottom-0 left-0 right-0 px-2 py-2 z-40"
      style={{
        backgroundColor: 'var(--bg-primary)',      
        borderTop: '1px solid var(--border-color)'
      }}
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className="relative flex flex-col items-center py-2 px-2"
              style={{
                color: isActive ? 'var(--color-primary)' : 'var(--text-tertiary)',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Icon
                size={22}
                style={{
                  color: isActive ? 'var(--color-primary)' : 'var(--text-tertiary)'
                }}
              />

              {/* Notification Badge */}
              {tab.badge > 0 && (
                <span 
                  className="absolute flex items-center justify-center"
                  style={{
                    top: '0',
                    right: '4px',
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 4px',
                    backgroundColor: tab.id === 'waiterCalls' ? '#DC2626' : '#3B82F6',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: '700',
                    borderRadius: '9px',
                  }}
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}

              <span 
                className="mt-1"
                style={{
                  fontSize: '10px',
                  fontWeight: isActive ? '600' : '500',
                  color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)'
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

export default MobileBottomNav;
