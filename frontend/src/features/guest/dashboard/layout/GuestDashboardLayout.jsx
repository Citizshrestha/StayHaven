/**
 * GuestDashboardLayout.jsx
 *
 * Layout shell for the authenticated guest dashboard: desktop sidebar,
 * mobile top bar + bottom tab bar, and the shared dashboard overview context.
 * The chrome renders immediately; pages show their own skeletons.
 *
 * Protected by ProtectedGuestRoute (requires guest role JWT).
 */

import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UtensilsCrossed, CalendarDays, Receipt, MessageSquare, MessagesSquare, User, LogOut, HelpCircle, Moon, Sun, Settings,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { logout } from '../../../../core/api/services/auth.service';
import { useTheme } from '../../../../core/hooks/useTheme';
import NoBookingsModal from '../../../../shared/components/NoBookingsModal';
import { cn } from '../../../../core/utils/cn';
import useGuestOverview, { GuestOverviewContext } from '../hooks/useGuestOverview';
import useChatUnread from '../hooks/useChatUnread';
import useGuestProfile, { GuestProfileContext } from '../hooks/useGuestProfile';
import useGuestNotifications from '../hooks/useGuestNotifications';
import useMediaQuery, { DESKTOP_QUERY } from '../hooks/useMediaQuery';
import GuestBottomNav from '../components/GuestBottomNav';
import NotificationBell from '../components/NotificationBell';
import Sheet from '../components/ui/Sheet';
import Avatar from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import '../styles/guest-tokens.css';

// Each section has its own accent so the nav reads at a glance (see guest-tokens.css).
const navItems = [
  { path: '/guest-dashboard', end: true, icon: LayoutDashboard, label: 'Dashboard', tone: 'g-tone-indigo' },
  { path: '/guest-dashboard/chat', icon: MessagesSquare, label: 'Chat', tone: 'g-tone-violet' },
  { path: '/guest-dashboard/room-service', icon: UtensilsCrossed, label: 'Room Service', tone: 'g-tone-orange' },
  { path: '/guest-dashboard/bookings', icon: CalendarDays, label: 'My Bookings', tone: 'g-tone-sky' },
  { path: '/guest-dashboard/billing', icon: Receipt, label: 'Billing', tone: 'g-tone-teal' },
  { path: '/guest-dashboard/requests', icon: MessageSquare, label: 'Requests', tone: 'g-tone-amber' },
  { path: '/guest-dashboard/profile', icon: User, label: 'Profile', tone: 'g-tone-rose' },
  { path: '/guest-dashboard/settings', icon: Settings, label: 'Settings', tone: 'bg-(--g-neutral-bg) text-(--g-neutral-text)' },
];

const AUTH_KEYS = ['accessToken', 'userId', 'email', 'username', 'role', 'guestToken'];

const rowClass = 'w-full flex items-center gap-3 px-4 min-h-[44px] rounded-(--g-radius-sm) g-body transition-colors duration-150 ease-out';

const Brand = () => (
  <span className="g-h2 font-bold text-(--g-text)">
    Stay<span className="text-(--g-primary-text)">Haven</span>
  </span>
);

const GuestDashboardLayout = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const overviewState = useGuestOverview();
  const chatUnread = useChatUnread();
  // Chat is an app-style, full-bleed screen: no page padding around it.
  const isFullBleed = useLocation().pathname.startsWith('/guest-dashboard/chat');
  const [noBookingsDismissed, setNoBookingsDismissed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileState = useGuestProfile();
  // One notifications state for the bell; only the visible bell renders its sheet.
  const notificationState = useGuestNotifications();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const { profile, loading: profileLoading } = profileState;
  const displayName = profile?.fullname || profile?.username || localStorage.getItem('username') || 'Guest';
  const displayEmail = profile?.email || localStorage.getItem('email') || '';
  const profilePicture = profile?.profilePicture || null;

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    } finally {
      // Clear all auth state regardless of API result
      AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
      setAccountOpen(false);
      navigate('/guest/login', { replace: true });
    }
  };

  const ThemeIcon = isDark ? Sun : Moon;

  return (
    <GuestOverviewContext.Provider value={overviewState}>
    <GuestProfileContext.Provider value={profileState}>
      <div className="guestPortal min-h-screen">
        <a
          href="#guest-main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:px-4 focus:py-2 focus:rounded-(--g-radius-sm) focus:bg-(--g-primary-fill) focus:text-(--g-on-primary)"
        >
          Skip to content
        </a>

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-(--g-surface) border-b border-(--g-border)">
          <Brand />
          <div className="flex items-center gap-1 -mr-1.5">
            {!isDesktop && <NotificationBell state={notificationState} />}
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              aria-label="Account menu"
              aria-haspopup="dialog"
              className="w-11 h-11 flex items-center justify-center rounded-full"
            >
              <Avatar src={profilePicture} name={displayName} size="sm" decorative />
            </button>
          </div>
        </header>

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-(--g-surface) border-r border-(--g-border) z-20 overflow-y-auto">
          <div className="px-6 pt-6 pb-5 flex items-start justify-between gap-2">
            <div>
              <Brand />
              <p className="g-small text-(--g-text-muted) mt-0.5">Guest Portal</p>
            </div>
            {isDesktop && <NotificationBell state={notificationState} className="-mr-3 -mt-2" />}
          </div>

          <nav aria-label="Guest portal" className="flex-1 px-3">
            <ul className="space-y-1">
              {navItems.map(({ path, end, icon: Icon, label, tone }) => (
                <li key={path}>
                  <NavLink
                    to={path}
                    end={end}
                    className={({ isActive }) => cn(
                      rowClass,
                      'px-2.5',
                      isActive
                        ? 'bg-(--g-surface-sunken) text-(--g-text) font-semibold shadow-[inset_3px_0_0_var(--g-text)]'
                        : 'text-(--g-text-muted) hover:bg-(--g-surface-sunken) hover:text-(--g-text)'
                    )}
                  >
                    <span className={cn('w-8 h-8 shrink-0 rounded-[9px] flex items-center justify-center', tone)} aria-hidden="true">
                      <Icon className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1">{label}</span>
                    {path === '/guest-dashboard/chat' && chatUnread > 0 && (
                      <span className="min-w-[22px] h-[22px] px-1.5 rounded-(--g-radius-pill) bg-(--g-danger-fill) text-white g-small font-bold guestNum flex items-center justify-center">
                        <span className="sr-only">Unread messages: </span>
                        {chatUnread > 99 ? '99+' : chatUnread}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-3 border-t border-(--g-border) space-y-1">
            {/* Signed-in guest */}
            <NavLink
              to="/guest-dashboard/profile"
              aria-label={`Your profile: ${displayName}`}
              className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-(--g-radius-sm) hover:bg-(--g-surface-sunken) transition-colors duration-150 ease-out"
            >
              {profileLoading && !profile ? (
                <>
                  <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                  <span className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </span>
                </>
              ) : (
                <>
                  <Avatar src={profilePicture} name={displayName} size="md" decorative />
                  <span className="min-w-0 flex-1">
                    <span className="block g-body-strong text-(--g-text) truncate">{displayName}</span>
                    {displayEmail && <span className="block g-small text-(--g-text-muted) truncate">{displayEmail}</span>}
                  </span>
                </>
              )}
            </NavLink>
            <button type="button" onClick={toggleTheme} className={cn(rowClass, 'text-(--g-text-muted) hover:bg-(--g-surface-sunken) hover:text-(--g-text)')}>
              <ThemeIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className={cn(rowClass, 'text-(--g-danger-text) hover:bg-(--g-danger-bg) disabled:opacity-50')}
            >
              <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="font-medium">Sign out</span>
            </button>
          </div>
        </aside>

        <main id="guest-main" tabIndex={-1} className="lg:ml-64 outline-none">
          <div
            className={isFullBleed
              ? 'w-full pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-0'
              : 'w-full px-4 sm:px-6 lg:px-8 pt-5 lg:pt-8 pb-[88px] lg:pb-8'}
          >
            <Outlet />
          </div>
        </main>

        <GuestBottomNav chatUnread={chatUnread} />

        {/* Mobile account sheet */}
        <Sheet open={accountOpen} onClose={() => setAccountOpen(false)} title={displayName} description={displayEmail || 'Guest account'}>
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-4 pb-3 mb-2 border-b border-(--g-border)">
              <Avatar src={profilePicture} name={displayName} size="lg" decorative />
              <div className="min-w-0">
                <p className="g-body-strong text-(--g-text) truncate">{displayName}</p>
                {displayEmail && <p className="g-small text-(--g-text-muted) truncate">{displayEmail}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setAccountOpen(false); navigate('/guest-dashboard/settings'); }}
              className={cn(rowClass, 'text-(--g-text) hover:bg-(--g-surface-sunken)')}
            >
              <Settings className="w-5 h-5 shrink-0 text-(--g-text-muted)" aria-hidden="true" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => { setAccountOpen(false); navigate('/guest-dashboard/requests'); }}
              className={cn(rowClass, 'text-(--g-text) hover:bg-(--g-surface-sunken)')}
            >
              <HelpCircle className="w-5 h-5 shrink-0 text-(--g-text-muted)" aria-hidden="true" />
              <span>Help &amp; Support</span>
            </button>
            <button type="button" onClick={toggleTheme} className={cn(rowClass, 'text-(--g-text) hover:bg-(--g-surface-sunken)')}>
              <ThemeIcon className="w-5 h-5 shrink-0 text-(--g-text-muted)" aria-hidden="true" />
              <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className={cn(rowClass, 'text-(--g-danger-text) hover:bg-(--g-danger-bg) disabled:opacity-50')}
            >
              <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="font-medium">Sign out</span>
            </button>
          </div>
        </Sheet>

        <NoBookingsModal
          isOpen={overviewState.hasNoBookings && !noBookingsDismissed}
          onClose={() => setNoBookingsDismissed(true)}
        />
      </div>
    </GuestProfileContext.Provider>
    </GuestOverviewContext.Provider>
  );
};

export default GuestDashboardLayout;
