/**
 * GuestDashboard.jsx
 *
 * Main container for guest portal with:
 * - Desktop: Sidebar (240px) + Main content
 * - Mobile: Top header (56px) + Main content + Bottom tab bar (64px)
 */

import React, { useMemo, useReducer, useEffect, useCallback, useState } from "react";
import { useTheme } from "../../../../core/hooks/useTheme";
import { Bell, Menu, RefreshCw, X } from "lucide-react";
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

// Read initial view from URL params (for payment gateway redirects)
function getInitialView() {
  try {
    const fullUrl = window.location.href;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    let paymentStatus = params.get('payment_status');

    if (!paymentStatus && fullUrl.includes('payment_status=')) {
      const match = fullUrl.match(/[?&]payment_status=([^&?]+)/);
      if (match) paymentStatus = match[1];
    }

    if (paymentStatus) return 'billing';
    if (tab && ['dashboard', 'bookings', 'room-service', 'billing', 'profile', 'requests'].includes(tab)) {
      return tab;
    }
  } catch (e) { /* ignore */ }
  return 'dashboard';
}

const initialState = {
  activeView: getInitialView(),
  isMobile: false,
  lastRefresh: Date.now(),
};

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, activeView: action.payload };
    case "SET_MOBILE":
      return { ...state, isMobile: action.payload };
    case "SET_LAST_REFRESH":
      return { ...state, lastRefresh: action.payload };
    default:
      return state;
  }
};

const GuestDashboard = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isDark } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch({ type: "SET_LAST_REFRESH", payload: Date.now() });
    window.dispatchEvent(new CustomEvent("guest:refresh"));
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

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
      case "dashboard": return "Dashboard";
      case "room-service": return "Room Service";
      case "billing": return "Billing";
      case "profile": return "Profile";
      case "bookings": return "Bookings";
      case "requests": return "Requests";
      default: return "Guest Portal";
    }
  }, [state.activeView]);

  const lastUpdatedText = useMemo(() => {
    const diffMs = now - state.lastRefresh;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Last updated just now";
    if (diffMin === 1) return "Last updated 1 min ago";
    return `Last updated ${diffMin} min ago`;
  }, [now, state.lastRefresh]);

  const renderContent = () => {
    switch (state.activeView) {
      case "dashboard":
        return <DashboardView onNavigate={handleViewChange} />;
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
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f8fafc' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block">
        <Sidebar
          activeView={state.activeView}
          onViewChange={handleViewChange}
        />
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, minHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Mobile Header */}
        {state.isMobile && (
          <header
            style={{
              position: 'sticky',
              top: 0,
              height: '56px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              zIndex: 90,
            }}
            className="lg:hidden"
          >
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1.5px solid rgba(0, 0, 0, 0.1)',
                background: 'white',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              aria-label="Open menu"
            >
              <Menu size={18} color="#1e293b" />
            </button>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                Guest Portal
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("guest:openNotifications"))}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '1.5px solid rgba(0, 0, 0, 0.1)',
                  background: 'white',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
                aria-label="Notifications"
              >
                <Bell size={18} color="#1e293b" />
              </button>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                title={lastUpdatedText}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '1.5px solid rgba(0, 0, 0, 0.1)',
                  background: 'white',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: refreshing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                }}
                aria-label="Refresh"
              >
                <RefreshCw
                  size={16}
                  color="#1e293b"
                  style={{
                    animation: refreshing ? 'spin 1s linear infinite' : 'none',
                  }}
                />
              </button>
            </div>
          </header>
        )}

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      {state.isMobile && (
        <MobileBottomNav
          activeView={state.activeView}
          onViewChange={handleViewChange}
        />
      )}

      {/* Drawer Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setDrawerOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(2px)',
          zIndex: 1999,
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
        className="lg:hidden"
      />

      {/* Drawer */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: '280px',
          background: 'white',
          zIndex: 2000,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
        className="lg:hidden"
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            height: '64px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(0, 0, 0, 0.07)',
          }}
        >
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
            <span style={{ color: '#1e293b' }}>Stay</span>
            <span style={{ color: '#0ea5a0' }}>Haven</span>
          </h1>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1.5px solid rgba(0, 0, 0, 0.1)',
              background: 'white',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
            aria-label="Close menu"
          >
            <X size={18} color="#1e293b" />
          </button>
        </div>

        <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {[
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'room-service', label: 'Room Service' },
            { key: 'bookings', label: 'Bookings' },
            { key: 'billing', label: 'Billing' },
            { key: 'requests', label: 'Requests' },
            { key: 'profile', label: 'Profile' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleViewChange(key)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: '12px',
                border: 'none',
                background: state.activeView === key ? 'rgba(14, 165, 160, 0.08)' : 'transparent',
                color: state.activeView === key ? '#0ea5a0' : '#64748b',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '4px',
                transition: 'all 0.2s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          style={{
            padding: '12px',
            borderTop: '1px solid rgba(0, 0, 0, 0.07)',
          }}
        >
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'transparent',
              color: '#ef4444',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Global Styles */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GuestDashboard;
