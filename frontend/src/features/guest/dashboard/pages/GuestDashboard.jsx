/**
 * GuestDashboard.jsx
 *
 * Authenticated guest self-service portal.
 * Mirrors the staff dashboard pattern: sidebar + main content + mobile bottom nav.
 * Renders sub-views based on activeView state.
 */

import React, { useMemo, useReducer, useEffect, useCallback, useState } from "react";
import { useTheme } from "../../../../core/hooks/useTheme";
import { Bell, Menu, User as UserIcon, X } from "lucide-react";
import { logout } from "../../../../core/api/services/auth.service";
import { toast } from "react-toastify";

import Sidebar from "../components/GuestSidebar.jsx";
import MobileBottomNav from "../components/GuestMobileNav.jsx";
import DashboardView from "./DashboardView.jsx";
import BookingsView from "./BookingsView.jsx";
import RoomServiceView from "./RoomServiceView.jsx";
import BillingView from "./BillingView.jsx";
import ProfileView from "./ProfileView.jsx";
import RequestsView from "./RequestsView.jsx";
import "../styles/guestMobile.css";

// Read initial view from URL params (for payment gateway redirects)
function getInitialView() {
  try {
    const fullUrl = window.location.href;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    let paymentStatus = params.get('payment_status');
    
    // Fallback: eSewa creates a double-? URL, so payment_status might not parse
    if (!paymentStatus && fullUrl.includes('payment_status=')) {
      const match = fullUrl.match(/[?&]payment_status=([^&?]+)/);
      if (match) paymentStatus = match[1];
    }
    
    // If there's a payment callback, always go to billing
    if (paymentStatus) return 'billing';
    // If tab is explicitly requested
    if (tab && ['dashboard', 'bookings', 'room-service', 'billing', 'profile', 'requests'].includes(tab)) {
      return tab;
    }
  } catch (e) { /* ignore */ }
  return 'dashboard';
}

const initialState = {
  activeView: getInitialView(),
  sidebarCollapsed: false,
  isMobile: false,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, activeView: action.payload };
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case "SET_MOBILE":
      return { ...state, isMobile: action.payload };
    default:
      return state;
  }
};

const GuestDashboard = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isDark, toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [isDark]);

  useEffect(() => {
    document.body.classList.toggle("sh-no-scroll", drawerOpen);
    return () => document.body.classList.remove("sh-no-scroll");
  }, [drawerOpen]);

  useEffect(() => {
    const handleResize = () => dispatch({ type: "SET_MOBILE", payload: window.innerWidth <= 768 });
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleViewChange = useCallback((view) => {
    dispatch({ type: "SET_VIEW", payload: view });
    setDrawerOpen(false);
  }, []);

  const openNotifications = useCallback(() => {
    if (state.activeView !== "dashboard") {
      dispatch({ type: "SET_VIEW", payload: "dashboard" });
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("guest:openNotifications"));
      }, 0);
      return;
    }
    window.dispatchEvent(new CustomEvent("guest:openNotifications"));
  }, [state.activeView]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch {
      toast.error("Logout failed");
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("email");
      localStorage.removeItem("username");
      localStorage.removeItem("role");
      localStorage.removeItem("guestToken");
      window.location.href = "/guest/login";
    }
  }, []);

  const viewTitle = useMemo(() => {
    switch (state.activeView) {
      case "dashboard":
        return "Dashboard";
      case "room-service":
        return "Services";
      case "billing":
        return "Billing";
      case "profile":
        return "Profile";
      case "bookings":
        return "Bookings";
      case "requests":
        return "Requests";
      default:
        return "StayHaven";
    }
  }, [state.activeView]);

  const renderContent = () => {
    switch (state.activeView) {
      case "dashboard":
        return (
          <DashboardView
            onNavigate={handleViewChange}
          />
        );
      case "bookings":
        return <BookingsView />;
      case "room-service":
        return <RoomServiceView />;
      case "billing":
        return <BillingView />;
      case "profile":
        return <ProfileView />;
      case "requests":
        return <RequestsView />;
      default:
        return <DashboardView onNavigate={handleViewChange} />;
    }
  };

  return (
    <div className={`min-h-screen flex ${isDark ? "dark bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block">
        <Sidebar
          activeView={state.activeView}
          onViewChange={handleViewChange}
          collapsed={state.sidebarCollapsed}
          onToggleCollapse={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-x-hidden overflow-y-auto">
        {/* Mobile Header */}
        {state.isMobile && (
          <header className="lg:hidden sh-mobile-header">
            <div className="flex items-center justify-between gap-3 h-full">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid place-items-center"
                aria-label="Open menu"
              >
                <Menu size={20} className="text-slate-700 dark:text-slate-200" />
              </button>

              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-[15px] leading-5 text-slate-900 dark:text-white truncate">
                  Stay<span className="text-teal-500">Haven</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{viewTitle}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openNotifications}
                  className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid place-items-center relative"
                  aria-label="Notifications"
                >
                  <Bell size={18} className="text-slate-700 dark:text-slate-200" />
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange("profile")}
                  className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid place-items-center"
                  aria-label="Profile"
                >
                  <UserIcon size={18} className="text-slate-700 dark:text-slate-200" />
                </button>
              </div>
            </div>
          </header>
        )}

        {renderContent()}
      </main>

      {/* Mobile Bottom Nav */}
      {state.isMobile && (
        <MobileBottomNav
          activeView={state.activeView}
          onViewChange={handleViewChange}
          onMore={() => setDrawerOpen(true)}
        />
      )}

      {/* Drawer Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setDrawerOpen(false)}
        className={`lg:hidden fixed inset-0 bg-black/40 backdrop-blur-[2px] z-1999 transition-opacity ${
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-screen w-70 bg-white dark:bg-slate-900 z-2000 shadow-2xl transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <p className="font-extrabold text-base text-slate-900 dark:text-white">
            Stay<span className="text-teal-500">Haven</span>
          </p>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid place-items-center"
            aria-label="Close menu"
          >
            <X size={18} className="text-slate-700 dark:text-slate-200" />
          </button>
        </div>

        <div className="p-3 space-y-2">
          <button type="button" onClick={() => handleViewChange("bookings")} className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent">
            <p className="font-semibold text-sm">My Bookings</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Upcoming and past stays</p>
          </button>
          <button type="button" onClick={() => handleViewChange("requests")} className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent">
            <p className="font-semibold text-sm">Help & Requests</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Chat, maintenance, concierge</p>
          </button>
        </div>

        <div className="mt-2 border-t border-slate-200 dark:border-slate-800 p-3 space-y-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <span className="font-semibold text-sm">Theme</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{isDark ? "Dark" : "Light"}</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-4 py-3 rounded-xl text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
          >
            <p className="font-semibold text-sm">Sign Out</p>
          </button>
        </div>
      </aside>
    </div>
  );
};

export default GuestDashboard;
