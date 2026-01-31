import React, { useState, useEffect, useCallback } from 'react';
import './SuperadminDashboard.css';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const SuperadminDashboard = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard',path: '/superadmindashboard', active: true },
    { id: 'users', label: 'User Management', icon: 'group', path: '/usermanagement' },
    { id: 'hotels', label: 'Hotel Management', icon: 'apartment' , path: '/hotelmanagement'},
    { id: 'bookings', label: 'Booking Management', icon: 'book_online' },
    { id: 'finance', label: 'Finance', icon: 'payments' },
    { id: 'reviews', label: 'Review Moderation', icon: 'rate_review' },
    { id: 'content', label: 'Content Management', icon: 'wysiwyg' },
    { id: 'config', label: 'System Configuration', icon: 'tune' },
  ];

  const bottomNavItems = [
    { id: 'analytics', label: 'Analytics', icon: 'analytics' },
    { id: 'logout', label: 'Logout', icon: 'logout' },
  ];

  const stats = [
    { label: 'Total Revenue', value: '$1,250,450', trend: '+2.5%', trendUp: true },
    { label: 'New Bookings Today', value: '152', trend: '+5.1%', trendUp: true },
    { label: 'Active Users', value: '12,345', trend: '-0.2%', trendUp: false },
    { label: 'Hotels Awaiting Approval', value: '8', trend: 'Pending', trendUp: null },
  ];

  const recentBookings = [
    { guest: 'John Doe', hotel: 'The Grand Hyatt', date: '2023-10-26', amount: '$450.00', status: 'Paid', statusType: 'success' },
    { guest: 'Jane Smith', hotel: 'Sunset Resort', date: '2023-10-25', amount: '$1200.50', status: 'Pending', statusType: 'warning' },
    { guest: 'Mike Johnson', hotel: 'Ocean View Inn', date: '2023-10-24', amount: '$320.00', status: 'Paid', statusType: 'success' },
    { guest: 'Sarah Wilson', hotel: 'City Center Hotel', date: '2023-10-23', amount: '$180.75', status: 'Cancelled', statusType: 'error' },
  ];

  const revenueData = [
    { type: 'Luxury', percentage: 75 },
    { type: 'Boutique', percentage: 55 },
    { type: 'Resort', percentage: 40 },
    { type: 'Budget', percentage: 25 },
  ];
  const navigate = useNavigate();

  const handleNavigation = (item) => {
    setActiveNav(item.id);
    if (item.path) {
      navigate(item.path);
    }
  };

  const handleLogout = useCallback(() => {
    // Clear any stored auth tokens
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.clear();
    toast.success('Logged out successfully');
    navigate('/login');
  }, [navigate]);

  // Handle dark mode toggle with localStorage persistence
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('superadmin-dark-mode', JSON.stringify(newMode));
      return newMode;
    });
  }, []);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('superadmin-dark-mode');
    if (savedMode !== null) {
      setDarkMode(JSON.parse(savedMode));
    }
  }, []);

  return (
    <div className={`superadmin-dashboard ${darkMode ? 'dark' : 'light'}`}>
      <div className="dashboard-layout">
        {/* SideNavBar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="logo-icon">
              <span className="material-symbols-outlined">holiday_village</span>
            </div>
            <div className="logo-text">
              <h1>StayHaven</h1>
              <p>Super Admin</p>
            </div>
          </div>
          
          <div className="sidebar-content">
            <div className="nav-section">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
                  onClick={() => handleNavigation(item)}
                >
                  <span className={`material-symbols-outlined ${activeNav === item.id ? 'fill' : ''}`}>
                    {item.icon}
                  </span>
                  <p>{item.label}</p>
                </button>
              ))}
            </div>
            
            <div className="nav-section bottom">
              {bottomNavItems.map((item) => (
                  <button
                    key={item.id}
                    className="nav-item"
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
        <main className="main-content">
          {/* TopNavBar */}
          <header className="top-header">
            <div className="header-left">
              <h2>Dashboard Overview</h2>
            </div>
            
            <div className="header-right">
              <div className="search-container">
                <span className="search-icon material-symbols-outlined">search</span>
                <input 
                  className="search-input"
                  placeholder="Search..." 
                  type="search"
                />
              </div>
              
              <button 
                className="icon-button"
                onClick={toggleDarkMode}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <span className="material-symbols-outlined">
                  {darkMode ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
              
              <button className="icon-button notification-button">
                <span className="material-symbols-outlined">notifications</span>
                <span className="notification-dot"></span>
              </button>
              
              <div 
                className="user-avatar"
                style={{
                  backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCZvaTAK0pLOwTlSZAtXxrKZFqJcKsMaAGUVG9YLsRPyvenQdBwFRf3_6kDT_FEDpAHCwizUawssQVHa4_2rFJ0ABxWFklBT9zE7xH8ZNsgWAHJp1s6VJNyLdI787vXlTtEalvyviaUgooZvh0mQ7rUHMKxcmJIwzwJfFpKmjn3qGX5sRbJwFwRYfbqvO4PpmHNK7-Sp_nYQhVHwKpZTN08lsdO1NTyx-FwuxGORNKJgV4q0ZCDCa8sYdXAIKW2d_oyCv49QyFiug")'
                }}
              ></div>
            </div>
          </header>

          {/* Page Content */}
          <div style={{padding: "24px 32px"}} className="bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-64px)]">
            {/* Stats Grid */}
            <div style={{gap: "24px", marginBottom: "32px"}} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <div 
                  key={index} 
                  style={{padding: "24px"}}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p style={{marginTop: "8px"}} className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <div style={{marginTop: "12px"}} className={`flex items-center text-sm font-semibold
                    ${stat.trendUp === true ? 'text-emerald-500' : stat.trendUp === false ? 'text-red-500' : 'text-amber-500'}`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {stat.trendUp === true ? 'trending_up' : 
                       stat.trendUp === false ? 'trending_down' : 'sync'}
                    </span>
                    <span>{stat.trend}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Grid */}
            <div style={{gap: "24px", marginBottom: "32px"}} className="grid grid-cols-1 lg:grid-cols-3">
              {/* Booking Trends Chart */}
              <div style={{padding: "24px"}} className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Booking Trends</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Last 30 Days</p>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-sm font-semibold">
                    <span className="material-symbols-outlined text-base">arrow_upward</span>
                    <span>+12.5%</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">1,482</span>
                  <span className="text-gray-500 dark:text-gray-400">Bookings</span>
                </div>
                <div className="h-40">
                  <svg className="w-full h-full" viewBox="-3 0 478 150" preserveAspectRatio="none">
                    <path 
                      d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V149H326.769H0V109Z" 
                      fill="url(#paint0_linear_chart)"
                    />
                    <path 
                      d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25" 
                      stroke="#14B8A6" 
                      strokeWidth="3" 
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="paint0_linear_chart" x1="236" x2="236" y1="1" y2="149">
                        <stop stopColor="#14B8A6" stopOpacity="0.3" />
                        <stop offset="1" stopColor="#14B8A6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Revenue by Hotel Type */}
              <div style={{padding: "24px"}} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div style={{marginBottom: "24px"}} className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue by Hotel Type</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Distribution breakdown</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">$320,890</span>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center gap-1 text-emerald-500 text-sm font-semibold">
                    <span className="material-symbols-outlined text-base">arrow_upward</span>
                    <span>+8.2%</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">vs last month</span>
                </div>
                <div className="space-y-5">
                  {revenueData.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{item.type}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{item.percentage}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Bookings Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div style={{padding: "20px 24px"}} className="border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Bookings</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Latest booking activities</p>
                </div>
                <button className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-semibold flex items-center gap-1 transition-colors">
                  View All
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th style={{padding: "16px 24px"}} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Guest</th>
                      <th style={{padding: "16px 24px"}} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hotel</th>
                      <th style={{padding: "16px 24px"}} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                      <th style={{padding: "16px 24px"}} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                      <th style={{padding: "16px 24px"}} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th style={{padding: "16px 24px"}} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {recentBookings.map((booking, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td style={{padding: "16px 24px"}}>
                          <span className="font-medium text-gray-900 dark:text-white">{booking.guest}</span>
                        </td>
                        <td style={{padding: "16px 24px"}} className="text-gray-600 dark:text-gray-400">{booking.hotel}</td>
                        <td style={{padding: "16px 24px"}} className="text-gray-600 dark:text-gray-400 hidden md:table-cell">{booking.date}</td>
                        <td style={{padding: "16px 24px"}} className="font-semibold text-gray-900 dark:text-white">{booking.amount}</td>
                        <td style={{padding: "16px 24px"}}>
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold
                            ${booking.statusType === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : ''}
                            ${booking.statusType === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : ''}
                            ${booking.statusType === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : ''}
                          `}>
                            {booking.status}
                          </span>
                        </td>
                        <td style={{padding: "16px 24px"}}>
                          <button style={{padding: "8px 16px"}} className="text-sm text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg font-semibold transition-colors">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Table Footer */}
              <div style={{padding: "16px 24px"}} className="border-t border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-700/30">
                <span className="text-sm text-gray-500 dark:text-gray-400">Showing 4 of 152 bookings</span>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">Previous</button>
                  <button className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors">Next</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperadminDashboard;