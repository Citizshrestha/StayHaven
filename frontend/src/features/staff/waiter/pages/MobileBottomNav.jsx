import React from "react";
import { LayoutDashboard, UtensilsCrossed, Bell, Phone, Receipt } from "lucide-react";
import { getStaffRole } from "../../../../core/api/services/staff.service";

/**
 * MobileBottomNav
 *
 * Thumb-reachable bottom navigation for phones (at most five items). Messages
 * live on the floating messenger button, so they are not a tab here.
 * State comes from WaiterDashboard via props.
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
  const role = getStaffRole();
  const isKitchen = role === "chief" || role === "kitchen";
  const tabs = [
    { id: "dashboard", label: "Orders", icon: LayoutDashboard },
    { id: "assignedTables", label: "Tables", icon: UtensilsCrossed },
    ...(isKitchen ? [] : [{ id: "bills", label: "Bills", icon: Receipt }]),
    { id: "waiterCalls", label: "Calls", icon: Phone, badge: waiterCallCount },
    { id: "notifications", label: "Alerts", icon: Bell, badge: notificationCount },
  ];

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{
        backgroundColor: "var(--bg-primary)",
        borderTop: "1px solid var(--border-color)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div role="tablist" aria-label="Waiter sections" className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          const label = tab.badge > 0 ? `${tab.label}, ${tab.badge} new` : tab.label;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
              onClick={() => onViewChange && onViewChange(tab.id)}
              className="relative flex flex-1 flex-col items-center justify-center"
              style={{
                minHeight: 56,
                minWidth: 44,
                padding: "6px 2px",
                color: isActive ? "var(--color-primary)" : "var(--text-secondary)",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <span className="relative" style={{ display: "flex" }}>
                <Icon size={22} aria-hidden="true" />
                {tab.badge > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute flex items-center justify-center"
                    style={{
                      top: -6,
                      right: -10,
                      minWidth: 18,
                      height: 18,
                      padding: "0 4px",
                      backgroundColor: tab.id === "waiterCalls" ? "#DC2626" : "#2563EB",
                      color: "white",
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 9,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </span>
              <span style={{ marginTop: 2, fontSize: 12, fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;
