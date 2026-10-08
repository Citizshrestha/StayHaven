import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useStaffAuth } from '../../../../core/context/StaffAuthContext';
import { useNotifications } from '../../../../core/context/useNotifications';
import './SuperAdminLayout.css';

const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// Maps the backend notification.type enum onto Material Symbols names.
const NOTIF_ICONS = {
  system: 'settings_alert',
  message: 'forum',
  account: 'person',
  hotel_approved: 'apartment',
  hotel_rejected: 'apartment',
  hotel_suspended: 'apartment',
  review_received: 'rate_review',
  payment_received: 'payments',
  payment_failed: 'credit_card_off',
  booking_confirmed: 'event_available',
  booking_cancelled: 'event_busy',
};

const SuperAdminLayout = ({ children, pageTitle }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const sidebarRef = useRef(null);
  const menuButtonRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { staffUser, logout: staffLogout } = useStaffAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/superadmindashboard' },
    { id: 'users', label: 'User Management', icon: 'group', path: '/usermanagement' },
    { id: 'hotels', label: 'Hotel Management', icon: 'apartment', path: '/hotelmanagement' },
    { id: 'finance', label: 'Finance', icon: 'payments', path: '/finance' },
    { id: 'reviews', label: 'Review Moderation', icon: 'rate_review', path: '/reviews' },
    { id: 'content', label: 'Content Management', icon: 'wysiwyg', path: '/contentmanagement' },
    { id: 'config', label: 'System Configuration', icon: 'tune', path: '/system-config' },
  ];

  const bottomNavItems = [
    // Points at the dashboard, which already has the Sales Analytics /
    // revenue-trend section — there's no separate Analytics page, and this
    // button previously had no `path` at all, so it silently did nothing.
    { id: 'analytics', label: 'Analytics', icon: 'analytics', path: '/superadmindashboard' },
    { id: 'logout', label: 'Logout', icon: 'logout' },
  ];

  const getActiveNav = () => {
    const path = location.pathname;
    const allItems = [...navigationItems, ...bottomNavItems];
    const match = allItems.find(i => i.path && path === i.path);
    return match ? match.id : 'dashboard';
  };

  const handleNavigation = (item) => {
    if (item.path) {
      navigate(item.path);
      setSidebarOpen(false);
    }
  };

  const handleLogout = useCallback(() => {
    staffLogout();
    toast.success('Logged out successfully');
    navigate('/login');
  }, [staffLogout, navigate]);

  const handleNotificationClick = useCallback((notification) => {
    if (!notification.isRead) markRead(notification.id);
    setNotifOpen(false);
    // actionUrl is set by the backend (e.g. "/hotelmanagement" for a hotel
    // awaiting verification); socket-only notifications may not carry one.
    const target = notification.actionUrl || notification.payload?.actionUrl;
    if (target) navigate(target);
  }, [markRead, navigate]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('superadmin-dark-mode', JSON.stringify(newMode));
      return newMode;
    });
  }, []);

  useEffect(() => {
    const savedMode = localStorage.getItem('superadmin-dark-mode');
    if (savedMode !== null) {
      setDarkMode(JSON.parse(savedMode));
    } else {
      localStorage.setItem('superadmin-dark-mode', JSON.stringify(false));
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Phone/tablet drawer: Esc and backdrop close it, Tab stays inside, the
  // page behind doesn't scroll, and focus returns to the menu button.
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const drawer = sidebarRef.current;
    const opener = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusables = () => Array.from(drawer?.querySelectorAll('button:not([disabled]), a[href]') || []);
    focusables()[0]?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { setSidebarOpen(false); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [sidebarOpen]);

  // A drawer left open while rotating/resizing to desktop must not lock scroll.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e) => { if (e.matches) setSidebarOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Esc closes the notification panel too.
  useEffect(() => {
    if (!notifOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setNotifOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [notifOpen]);

  // Close the notification panel on any click outside it.
  useEffect(() => {
    if (!notifOpen) return;
    const handleOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [notifOpen]);

  const activeNav = getActiveNav();

  const defaultAvatar = "https://lh3.googleusercontent.com/aida-public/AB6AXuCZvaTAK0pLOwTlSZAtXxrKZFqJcKsMaAGUVG9YLsRPyvenQdBwFRf3_6kDT_FEDpAHCwizUawssQVHa4_2rFJ0ABxWFklBT9zE7xH8ZNsgWAHJp1s6VJNyLdI787vXlTtEalvyviaUgooZvh0mQ7rUHMKxcmJIwzwJfFpKmjn3qGX5sRbJwFwRYfbqvO4PpmHNK7-Sp_nYQhVHwKpZTN08lsdO1NTyx-FwuxGORNKJgV4q0ZCDCa8sYdXAIKW2d_oyCv49QyFiug";
  const userAvatar = staffUser?.profilePicture
    ? `${staffUser.profilePicture}${staffUser.profilePicture.includes('?') ? '&' : '?'}v=${staffUser.avatarUpdatedAt || 0}`
    : defaultAvatar;
  const userFullName = staffUser?.fullname || "StayHaven Super Admin";
  const userEmail = staffUser?.email || "superadmin@stayhaven.com";

  return (
    <div className={`sa-layout ${darkMode ? 'dark' : 'light'}`}>
      <div className="sa-layout-wrapper">
        {sidebarOpen && (
          <div className="sa-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
        )}
        {/* Sidebar */}
        <aside
          id="sa-sidebar"
          ref={sidebarRef}
          className={`sa-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}
          aria-label="Super admin navigation"
          {...(sidebarOpen ? { role: 'dialog', 'aria-modal': 'true' } : {})}
        >
          <div className="sa-sidebar-header">
            <div className="sa-logo-icon">
              <img src="/logo.png" alt="StayHaven Logo" className="sa-logo-image" />
            </div>
            <div className="sa-logo-text">
              <h1><span>Stay</span><strong>Haven</strong></h1>
              <p>Super Admin</p>
            </div>
            <button
              type="button"
              className="sa-sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
            >
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </div>

          <div className="sa-sidebar-content">
            <div className="sa-nav-section">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  className={`sa-nav-item ${activeNav === item.id ? 'active' : ''}`}
                  onClick={() => handleNavigation(item)}
                  aria-current={activeNav === item.id ? 'page' : undefined}
                >
                  <span className={`material-symbols-outlined ${activeNav === item.id ? 'fill' : ''}`}>
                    {item.icon}
                  </span>
                  <p>{item.label}</p>
                </button>
              ))}
            </div>

            <div className="sa-nav-section bottom">
              {/* Profile card inside sidebar */}
              <div className="sa-sidebar-profile">
                <div
                  key={userAvatar}
                  className="sa-profile-avatar"
                  style={{ backgroundImage: `url(${userAvatar})` }}
                  role="img"
                  aria-label={userFullName}
                />
                <div className="sa-profile-info">
                  <p className="sa-profile-name">{userFullName}</p>
                  <p className="sa-profile-email">{userEmail}</p>
                </div>
              </div>
              
              {bottomNavItems.map((item) => (
                <button
                  key={item.id}
                  className={`sa-nav-item ${activeNav === item.id ? 'active' : ''}`}
                  onClick={() => {
                    if (item.id === 'logout') return handleLogout();
                    handleNavigation(item);
                  }}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <p>{item.label}</p>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="sa-main-content">
          {/* Top Header */}
          <header className="sa-top-header">
            <div className="sa-header-left">
              <button
                ref={menuButtonRef}
                type="button"
                className="sa-mobile-menu-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Open navigation"
                aria-expanded={sidebarOpen}
                aria-controls="sa-sidebar"
              >
                <span className="material-symbols-outlined" aria-hidden="true">menu</span>
              </button>
              <h2 title={pageTitle}>{pageTitle}</h2>
            </div>

            <div className="sa-header-right">
              <div className="sa-search-container">
                <span className="sa-search-icon material-symbols-outlined">search</span>
                <input
                  className="sa-search-input"
                  placeholder="Search..."
                  type="search"
                />
              </div>

              <button
                className="sa-icon-button"
                onClick={toggleDarkMode}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <span className="material-symbols-outlined">
                  {darkMode ? 'light_mode' : 'dark_mode'}
                </span>
              </button>

              <div className="sa-notif-wrapper" ref={notifRef}>
                <button
                  className="sa-icon-button"
                  onClick={() => setNotifOpen(prev => !prev)}
                  aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
                  aria-expanded={notifOpen}
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {unreadCount > 0 && (
                    <span className="sa-notification-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>

                {notifOpen && (
                  <div className="sa-notif-panel" role="dialog" aria-label="Notifications">
                    <div className="sa-notif-panel-header">
                      <h3>Notifications</h3>
                      {unreadCount > 0 && (
                        <button className="sa-notif-mark-all" onClick={markAllRead}>
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="sa-notif-list">
                      {notifications.length === 0 ? (
                        <div className="sa-notif-empty">
                          <span className="material-symbols-outlined">notifications_off</span>
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.slice(0, 20).map((n) => (
                          <button
                            key={n.id}
                            className={`sa-notif-item ${n.isRead ? '' : 'unread'}`}
                            onClick={() => handleNotificationClick(n)}
                          >
                            <span className={`sa-notif-icon ${n.priority || 'medium'}`}>
                              <span className="material-symbols-outlined">
                                {NOTIF_ICONS[n.type] || 'notifications'}
                              </span>
                            </span>
                            <span className="sa-notif-body">
                              {n.title && <span className="sa-notif-title">{n.title}</span>}
                              <span className="sa-notif-message">{n.message}</span>
                              <span className="sa-notif-time">{timeAgo(n.createdAt)}</span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div
                key={userAvatar}
                className="sa-user-avatar"
                style={{ backgroundImage: `url(${userAvatar})` }}
                role="img"
                aria-label={userFullName}
              />
            </div>
          </header>

          <div className="sa-page-content">
            {typeof children === 'function' ? children({ darkMode }) : children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
