import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  DollarSign,
  Users,
  FileText,
  BarChart3,
  Star,
  Settings,
  Menu,
  X,
  Bell,
  Search,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import './SuperAdminLayout.css';

const SuperAdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [notificationCount] = useState(12);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const navItems = [
    { path: '/superadmin', icon: LayoutDashboard, label: 'Dashboard', badge: null },
    { path: '/superadmin/hotels', icon: Building2, label: 'Hotels', badge: 8 },
    { path: '/superadmin/bookings', icon: Calendar, label: 'Bookings', badge: null },
    { path: '/superadmin/revenue', icon: DollarSign, label: 'Revenue & Finance', badge: 3 },
    { path: '/superadmin/users', icon: Users, label: 'Users', badge: null },
    { path: '/superadmin/content', icon: FileText, label: 'Content Management', badge: null },
    { path: '/superadmin/analytics', icon: BarChart3, label: 'Analytics & Traffic', badge: null },
    { path: '/superadmin/reviews', icon: Star, label: 'Reviews', badge: 23 },
    { path: '/superadmin/settings', icon: Settings, label: 'System Settings', badge: null },
  ];

  const handleLogout = () => {
    // Implement logout logic
    navigate('/login');
  };

  return (
    <div className={`superadmin-layout ${darkMode ? 'dark' : 'light'}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon">
              <Building2 size={24} />
            </div>
            {!sidebarCollapsed && (
              <div className="logo-text">
                <h1 className="logo-title">
                  Stay<span className="logo-accent">Haven</span>
                </h1>
                <p className="logo-subtitle">Super Admin</p>
              </div>
            )}
          </div>
          <button
            className="sidebar-toggle desktop-only"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Menu size={20} />
          </button>
          <button
            className="mobile-close mobile-only"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`nav-item ${isActive ? 'active' : ''}`}
                title={sidebarCollapsed ? item.label : ''}
              >
                <div className="nav-item-content">
                  <item.icon size={20} className="nav-icon" />
                  {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
                </div>
                {item.badge && !sidebarCollapsed && (
                  <span className="nav-badge">{item.badge}</span>
                )}
                {item.badge && sidebarCollapsed && (
                  <span className="nav-badge-dot"></span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="footer-btn" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            {!sidebarCollapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button className="footer-btn logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-btn mobile-only"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="search-container">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search hotels, bookings, users..."
                className="search-input"
              />
              <kbd className="search-kbd">⌘K</kbd>
            </div>
          </div>

          <div className="topbar-right">
            <button className="topbar-btn notification-btn">
              <Bell size={20} />
              {notificationCount > 0 && (
                <span className="notification-badge">{notificationCount}</span>
              )}
            </button>

            <div className="profile-dropdown">
              <button
                className="profile-btn"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <div className="profile-avatar">
                  <span>SA</span>
                </div>
                <div className="profile-info desktop-only">
                  <span className="profile-name">Super Admin</span>
                  <span className="profile-role">Administrator</span>
                </div>
                <ChevronDown size={16} className="profile-chevron" />
              </button>

              {profileDropdownOpen && (
                <div className="profile-dropdown-menu">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">SA</div>
                    <div className="dropdown-info">
                      <p className="dropdown-name">Super Admin</p>
                      <p className="dropdown-email">admin@stayhaven.com</p>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item" onClick={() => navigate('/superadmin/profile')}>
                    <Users size={16} />
                    <span>My Profile</span>
                  </button>
                  <button className="dropdown-item" onClick={() => navigate('/superadmin/settings')}>
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
