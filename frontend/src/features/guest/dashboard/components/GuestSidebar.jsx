/**
 * GuestSidebar.jsx
 *
 * Navigation sidebar for the guest dashboard.
 * Mirrors the reception/waiter sidebar pattern but with guest-specific nav items.
 */

import React from "react";
import {
  LayoutDashboard,
  CalendarDays,
  UtensilsCrossed,
  Receipt,
  User,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../../../core/api/services/auth.service";
import { toast } from "react-toastify";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "bookings", label: "My Bookings", icon: CalendarDays },
  { key: "room-service", label: "Menu", icon: UtensilsCrossed },
  { key: "billing", label: "Billing", icon: Receipt },
  { key: "requests", label: "Requests", icon: MessageSquare },
  { key: "profile", label: "Profile", icon: User },
];

const GuestSidebar = ({ activeView, onViewChange, collapsed, onToggleCollapse }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch {
      toast.error("Logout failed");
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('email');
      localStorage.removeItem('username');
      localStorage.removeItem('role');
      localStorage.removeItem('guestToken');
      navigate('/guest/login');
    }
  };

  return (
    <div
      className={`h-screen sticky top-0 flex flex-col border-r transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      } bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-200 dark:border-gray-800">
        <div className="w-9 h-9 rounded-lg bg-linear-to-br from-teal-500 to-teal-600 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
            Stay<span className="text-teal-500">Haven</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map(({ key, label, icon: Icon }) => {
          const isActive = activeView === key;
          return (
            <button
              key={key}
              onClick={() => onViewChange(key)}
              className={`flex items-center w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse + Logout */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-2 space-y-1">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
        >
          {collapsed ? (
            <ChevronRight size={20} />
          ) : (
            <>
              <ChevronLeft size={20} />
              <span>Collapse</span>
            </>
          )}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={20} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
};

export default GuestSidebar;
