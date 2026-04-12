/**
 * GuestDashboard.jsx
 *
 * Authenticated guest self-service portal.
 * Mirrors the staff dashboard pattern: sidebar + main content + mobile bottom nav.
 * Renders sub-views based on activeView state.
 */

import React, { useReducer, useEffect, useCallback } from "react";
import { useTheme } from "../../../../core/hooks/useTheme";

import Sidebar from "../components/GuestSidebar.jsx";
import MobileBottomNav from "../components/GuestMobileNav.jsx";
import DashboardView from "./DashboardView.jsx";
import BookingsView from "./BookingsView.jsx";
import RoomServiceView from "./RoomServiceView.jsx";
import BillingView from "./BillingView.jsx";
import ProfileView from "./ProfileView.jsx";
import RequestsView from "./RequestsView.jsx";

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
  const { isDark } = useTheme();

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [isDark]);

  useEffect(() => {
    const handleResize = () => dispatch({ type: "SET_MOBILE", payload: window.innerWidth <= 768 });
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleViewChange = useCallback((view) => {
    dispatch({ type: "SET_VIEW", payload: view });
  }, []);

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
        {renderContent()}
      </main>

      {/* Mobile Bottom Nav */}
      {state.isMobile && (
        <MobileBottomNav
          activeView={state.activeView}
          onViewChange={handleViewChange}
        />
      )}
    </div>
  );
};

export default GuestDashboard;
