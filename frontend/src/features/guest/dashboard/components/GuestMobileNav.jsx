/**
 * GuestMobileNav.jsx
 *
 * Bottom navigation bar for the guest dashboard on mobile screens.
 */

import React from "react";
import { LayoutDashboard, UtensilsCrossed, Receipt, User, Menu } from "lucide-react";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "room-service", label: "Services", icon: UtensilsCrossed },
  { key: "billing", label: "Bills", icon: Receipt },
  { key: "profile", label: "Profile", icon: User },
];

const GuestMobileNav = ({ activeView, onViewChange, onMore }) => {
  return (
    <nav className="lg:hidden sh-mobile-bottom-nav">
      <div className="flex items-center h-[65px] px-2">
        {navItems.map(({ key, label, icon: Icon }) => {
          const isActive = activeView === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onViewChange(key)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 rounded-xl transition-all ${
                isActive
                  ? "text-teal-600 dark:text-teal-400 bg-teal-500/10"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.4 : 1.9} className={isActive ? "-translate-y-0.5 transition-transform" : "transition-transform"} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onMore}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 rounded-xl transition-all text-slate-400 dark:text-slate-500 active:bg-slate-500/10"
        >
          <Menu size={22} strokeWidth={2.1} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
};

export default GuestMobileNav;
