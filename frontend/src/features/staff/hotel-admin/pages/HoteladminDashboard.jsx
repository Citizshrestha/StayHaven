import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useStaffAuth } from '../../../../core/context/StaffAuthContext';
import { useNotifications } from '../../../../core/context/useNotifications';
import ThemeToggle from '../../../../shared/ui/ThemeToggle';

import '../styles/hotel-admin-tokens.css';
import '../styles/shell.css';
import Sidebar from '../components/Sidebar';

import DashboardHome from './DashboardHome';
import BillingManagement from './BillingManagement';
import RestaurantManagement from './RestaurantManagement';
import TableManagement from './TableManagement';
import RoomQRManagement from './RoomQRManagement';
import OrderManagement from './OrderManagement';
import StaffManagement from './StaffManagement';
import StockManagement from './StockManagement';
import RoomsManagement from './RoomManagement';
import LoyaltyManagement from './LoyaltyManagement';
import ReportsAnalytics from './ReportsAnalytics';
import NotificationsManagement from './NotificationsManagement';

const SECTION_TITLES = {
  dashboard: 'Dashboard',
  rooms: 'Rooms',
  restaurant: 'Restaurant',
  tables: 'Table QR Codes',
  roomqr: 'Room QR Codes',
  orders: 'Orders',
  stock: 'Stock / Inventory',
  staff: 'Staff Management',
  billing: 'Billing & Payments',
  loyalty: 'Loyalty Points',
  reports: 'Reports & Analytics',
  notifications: 'Notifications',
};

const HoteladminDashboard = () => {
  const navigate = useNavigate();
  const { staffUser, logout } = useStaffAuth();
  const { unreadCount } = useNotifications();

  const [activeSection, setActiveSection] = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
    return SECTION_TITLES[hash] ? hash : 'dashboard';
  });

  // Live counts for sidebar badges (populated by data-backed child pages).
  const [roomCount, setRoomCount] = useState(0);
  const [activeOrders, setActiveOrders] = useState(0);

  // Responsive sidebar state
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigation = useCallback((sectionId) => {
    setActiveSection(sectionId);
    try {
      if (typeof window !== 'undefined') window.location.hash = `#${sectionId}`;
    } catch {
      /* hash update is best-effort */
    }
  }, []);

  // Sync with hash changes (back/forward, direct links)
  useEffect(() => {
    const onHashChange = () => {
      const newHash = window.location.hash.replace('#', '') || 'dashboard';
      setActiveSection(SECTION_TITLES[newHash] ? newHash : 'dashboard');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Close the mobile drawer whenever the section changes
  useEffect(() => {
    setMobileOpen(false);
  }, [activeSection]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      navigate('/staff/login', { replace: true });
    }
  }, [logout, navigate]);

  // Stable callback so DashboardHome doesn't re-fetch on every render.
  const onDashboardStats = useRef((stats) => {
    if (typeof stats?.totalRooms === 'number') setRoomCount(stats.totalRooms);
    if (typeof stats?.activeOrders === 'number') setActiveOrders(stats.activeOrders);
  }).current;

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardHome onNavigate={handleNavigation} onStats={onDashboardStats} />;
      case 'rooms':
        return <RoomsManagement embedded onCount={(n) => setRoomCount(n)} />;
      case 'restaurant':
        return <RestaurantManagement embedded />;
      case 'tables':
        return <TableManagement embedded />;
      case 'roomqr':
        return <RoomQRManagement embedded />;
      case 'orders':
        return <OrderManagement embedded onActiveCount={(n) => setActiveOrders(n)} />;
      case 'stock':
        return <StockManagement embedded />;
      case 'staff':
        return <StaffManagement embedded />;
      case 'billing':
        return <BillingManagement />;
      case 'loyalty':
        return <LoyaltyManagement embedded />;
      case 'reports':
        return <ReportsAnalytics embedded />;
      case 'notifications':
        return <NotificationsManagement embedded />;
      default:
        return <DashboardHome onNavigate={handleNavigation} onStats={onDashboardStats} />;
    }
  };

  return (
    <div className="hotelAdminShell">
      <div className="ha-shell">
        {/* Off-canvas backdrop (mobile) */}
        <div
          className="ha-shell__backdrop"
          data-open={mobileOpen ? 'true' : 'false'}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />

        {/* Sidebar */}
        <div
          className="ha-shell__sidebar"
          data-collapsed={railCollapsed ? 'true' : 'false'}
          data-open={mobileOpen ? 'true' : 'false'}
        >
          <Sidebar
            activeSection={activeSection}
            onNavigate={handleNavigation}
            onLogout={handleLogout}
            staffUser={staffUser}
            roomCount={roomCount}
            activeOrders={activeOrders}
            unreadCount={unreadCount}
            collapsed={railCollapsed}
            onToggleCollapse={() => setRailCollapsed((c) => !c)}
            onMobileClose={() => setMobileOpen(false)}
          />
        </div>

        {/* Main column */}
        <div className="ha-shell__main">
          {/* Mobile top bar */}
          <div className="ha-topbar">
            <button
              type="button"
              className="ha-icon-btn ha-icon-btn--bordered"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <span className="ha-topbar__title">{SECTION_TITLES[activeSection]}</span>
            <span className="ha-topbar__spacer" />
            <ThemeToggle />
          </div>

          <main className="ha-shell__content">{renderContent()}</main>
        </div>
      </div>
    </div>
  );
};

export default HoteladminDashboard;
