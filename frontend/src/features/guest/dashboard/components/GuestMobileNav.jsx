/**
 * GuestMobileNav.jsx
 *
 * Bottom navigation bar for the guest dashboard on mobile screens.
 */

import React from "react";
import { LayoutDashboard, CalendarDays, UtensilsCrossed, Receipt, User, MessageSquare } from "lucide-react";

const navItems = [
  { key: "dashboard", label: "Home", icon: LayoutDashboard },
  { key: "bookings", label: "Bookings", icon: CalendarDays },
  { key: "room-service", label: "Service", icon: UtensilsCrossed },
  { key: "billing", label: "Billing", icon: Receipt },
  { key: "requests", label: "Requests", icon: MessageSquare },
  { key: "profile", label: "Profile", icon: User },
];

const GuestMobileNav = ({ activeView, onViewChange }) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50">
      <div className="flex justify-around items-center h-16 px-1">
        {navItems.map(({ key, label, icon: Icon }) => {
          const isActive = activeView === key;
          return (
            <button
              key={key}
              onClick={() => onViewChange(key)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${
                isActive
                  ? "text-teal-600 dark:text-teal-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default GuestMobileNav;
