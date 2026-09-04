/**
 * GuestDashboardLayout.jsx
 *
 * Layout shell for the authenticated guest dashboard.
 * Provides a sidebar navigation with links to all sub-views,
 * and renders child routes via <Outlet />.
 *
 * Protected by ProtectedGuestRoute (requires guest role JWT).
 */

import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  CalendarDays,
  FileText,
  MessageSquare,
  User,
  LogOut,
  HelpCircle,
  Languages,
  Moon,
  Sun,
  Loader2,
  Menu,
  X,
} from 'lucide-react';
import { logout } from '../../../../core/api/services/auth.service';
import { toast } from 'react-toastify';
import { useTheme } from '../../../../core/hooks/useTheme';
import axiosClient from '../../../../core/api/client';
import NoBookingsModal from '../../../../shared/components/NoBookingsModal';

const navItems = [
  { path: '/guest-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/guest-dashboard/room-service', icon: UtensilsCrossed, label: 'Room Service' },
  { path: '/guest-dashboard/bookings', icon: CalendarDays, label: 'My Bookings' },
  { path: '/guest-dashboard/billing', icon: FileText, label: 'Billing' },
  { path: '/guest-dashboard/requests', icon: MessageSquare, label: 'Requests' },
  { path: '/guest-dashboard/profile', icon: User, label: 'Profile' },
];

const GuestDashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [checkingBookings, setCheckingBookings] = useState(true);
  const [showNoBookingsModal, setShowNoBookingsModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close the mobile drawer whenever the route changes (e.g. after tapping a nav item)
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  // Check if user has bookings on mount
  useEffect(() => {
    const checkBookings = async () => {
      try {
        const response = await axiosClient.get('/api/v1/guest/portal/dashboard');
        const overview = response.data?.data;

        const hasNoBookings =
          !overview?.activeBooking &&
          (!overview?.upcomingBookings || overview.upcomingBookings.length === 0) &&
          (overview?.pastBookingsCount === 0 || !overview?.pastBookingsCount);

        if (hasNoBookings) {
          setShowNoBookingsModal(true);
        }
      } catch (error) {
        console.error('Error checking bookings:', error);
      } finally {
        setCheckingBookings(false);
      }
    };

    checkBookings();
  }, []);

  const handleNoBookingsModalClose = () => {
    setShowNoBookingsModal(false);
    navigate('/');
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    } finally {
      // Clear all auth state regardless of API result
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('email');
      localStorage.removeItem('username');
      localStorage.removeItem('role');
      localStorage.removeItem('guestToken');
      navigate('/guest/login');
    }
  };

  // Show loading while checking bookings
  if (checkingBookings) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  // Shared nav content — rendered in both the fixed desktop sidebar and the
  // mobile slide-in drawer so the two never drift out of sync.
  const sidebarContent = (
    <>
      <div className="p-6 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Stay<span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">Haven</span>
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Guest Portal</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          className="lg:hidden p-2 -mr-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all text-sm ${
                isActive
                  ? 'font-semibold text-teal-700 dark:text-teal-300 border-l-4 border-teal-500 bg-gradient-to-r from-teal-50 to-transparent dark:from-teal-900/30 dark:to-transparent'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-teal-600 dark:text-teal-300' : 'text-gray-400 dark:text-gray-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-3 shrink-0 border-t border-gray-200 dark:border-gray-800 space-y-1.5">
        <button
          onClick={() => navigate('/guest-dashboard/requests')}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm"
        >
          <HelpCircle className="w-5 h-5 text-sky-500" />
          <span>Help & Support</span>
        </button>

        <button
          type="button"
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm"
        >
          <Languages className="w-5 h-5 text-violet-500" />
          <span>Language: EN</span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm"
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-amber-500" />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>
      <div className="p-3 shrink-0 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-sm"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile top bar — hamburger + brand, shown below lg only */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="p-2 -ml-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold">
          Stay<span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">Haven</span>
        </h2>
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 -mr-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      {/* Desktop sidebar — hidden on mobile, fixed on lg+ */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-900 shadow-lg z-20 overflow-y-auto border-r border-gray-200 dark:border-gray-800">
        {sidebarContent}
      </aside>

      {/* Mobile drawer — backdrop + slide-in panel, only mounted below lg */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          mobileNavOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!mobileNavOpen}
      >
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setMobileNavOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-y-auto transition-transform duration-300 ease-out ${
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </aside>
      </div>

      {/* Main Content */}
      <main className="lg:ml-64">
        <Outlet />
      </main>

      {/* No Bookings Modal */}
      <NoBookingsModal
        isOpen={showNoBookingsModal}
        onClose={handleNoBookingsModalClose}
      />
    </div>
  );
};

export default GuestDashboardLayout;
