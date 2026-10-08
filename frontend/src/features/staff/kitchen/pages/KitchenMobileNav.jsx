import React from "react";
import { LayoutDashboard, Bell, Settings, MessageCircle } from "lucide-react";

/**
 * KitchenMobileNav
 *
 * Bottom navigation for phones and portrait tablets. 64px tall, 44px+ targets,
 * safe-area padding. The dashboard exposes its height as --bottom-nav-height
 * so the content pane and the floating widgets clear it.
 */
const KitchenMobileNav = ({
  activeView = "dashboard",
  onViewChange,
  notificationCount = 0,
  onMessagingToggle,
  unreadMessageCount = 0,
}) => {
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
    onViewChange?.(tab.id);
  };

  return (
    <div className="kd-bottomnav lg:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab)}
            className={`kd-bottomnav__tab ${isActive ? "is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            aria-label={tab.badge > 0 ? `${tab.label}, ${tab.badge} unread` : tab.label}
          >
            <Icon size={24} aria-hidden="true" />
            {tab.badge > 0 && (
              <span className="kd-bottomnav__badge" aria-hidden="true">{tab.badge > 99 ? "99+" : tab.badge}</span>
            )}
            <span className="kd-bottomnav__label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default KitchenMobileNav;
