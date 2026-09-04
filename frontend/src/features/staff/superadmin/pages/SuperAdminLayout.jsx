import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useStaffAuth } from '../../../../context/StaffAuthContext';
import './SuperAdminLayout.css';

const SuperAdminLayout = ({ children, pageTitle }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { staffUser, logout: staffLogout } = useStaffAuth();

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
        {/* Sidebar */}
        <aside className={`sa-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
          <div className="sa-sidebar-header">
            <div className="sa-logo-icon">
              <img src="/logo.png" alt="StayHaven Logo" className="sa-logo-image" />
            </div>
            <div className="sa-logo-text">
              <h1><span>Stay</span><strong>Haven</strong></h1>
              <p>Super Admin</p>
            </div>
          </div>

          <div className="sa-sidebar-content">
            <div className="sa-nav-section">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  className={`sa-nav-item ${activeNav === item.id ? 'active' : ''}`}
                  onClick={() => handleNavigation(item)}
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
                className="sa-mobile-menu-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <h2>{pageTitle}</h2>
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

              <button className="sa-icon-button" aria-label="Notifications">
                <span className="material-symbols-outlined">notifications</span>
                <span className="sa-notification-dot"></span>
              </button>

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
