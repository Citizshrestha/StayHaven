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
      if (!SECTION_TITLES[newHash]) {
        // Unknown section: show the dashboard and fix the URL too
        window.history.replaceState(null, '', '#dashboard');
        setActiveSection('dashboard');
        return;
      }
      setActiveSection(newHash);
    };
    // An invalid hash on first load is corrected the same way
    const initial = window.location.hash.replace('#', '');
    if (initial && !SECTION_TITLES[initial]) window.history.replaceState(null, '', '#dashboard');
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
  // setState setters are stable: passing them directly avoids an inline
  // callback that made Rooms/Orders re-fetch on every parent render.
  const onRoomCount = setRoomCount;
  const onActiveCount = setActiveOrders;

  // Mobile drawer: Esc closes, focus moves into the drawer and back to the
  // hamburger, and the main column is inert while it is open.
  const hamburgerRef = useRef(null);
  const drawerRef = useRef(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (mobileOpen) {
      wasOpen.current = true;
      const first = drawerRef.current?.querySelector('button, a[href]');
      first?.focus();
      const onKey = (e) => {
        if (e.key === 'Escape') { setMobileOpen(false); return; }
        if (e.key !== 'Tab' || !drawerRef.current) return;
        const nodes = Array.from(drawerRef.current.querySelectorAll('button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])'))
          .filter((n) => n.offsetParent !== null);
        if (!nodes.length) return;
        const firstNode = nodes[0];
        const lastNode = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === firstNode) { e.preventDefault(); lastNode.focus(); }
        else if (!e.shiftKey && document.activeElement === lastNode) { e.preventDefault(); firstNode.focus(); }
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      hamburgerRef.current?.focus();
    }
    return undefined;
  }, [mobileOpen]);

  // Hide the off-canvas drawer from keyboard/AT while it is closed on phones.
  const [isPhone, setIsPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsPhone(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const drawerHidden = isPhone && !mobileOpen;

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardHome onNavigate={handleNavigation} onStats={onDashboardStats} />;
      case 'rooms':
        return <RoomsManagement embedded onCount={onRoomCount} />;
      case 'restaurant':
        return <RestaurantManagement embedded onNavigate={handleNavigation} />;
      case 'tables':
        return <TableManagement embedded />;
      case 'roomqr':
        return <RoomQRManagement embedded />;
      case 'orders':
        return <OrderManagement embedded onActiveCount={onActiveCount} />;
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
          ref={drawerRef}
          id="ha-nav-drawer"
          className="ha-shell__sidebar"
          data-collapsed={railCollapsed ? 'true' : 'false'}
          data-open={mobileOpen ? 'true' : 'false'}
          inert={drawerHidden ? true : undefined}
          aria-hidden={drawerHidden ? 'true' : undefined}
          {...(isPhone && mobileOpen ? { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Navigation' } : {})}
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
        <div className="ha-shell__main" inert={isPhone && mobileOpen ? true : undefined}>
          {/* Mobile top bar */}
          <div className="ha-topbar">
            <button
              ref={hamburgerRef}
              type="button"
              className="ha-icon-btn ha-icon-btn--bordered"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="ha-nav-drawer"
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
