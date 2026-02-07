import React, { useState } from 'react';
import './Hoteldashboard.css';

const Hoteldashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'rooms', label: 'Rooms', icon: '🛏️' },
    { id: 'restaurant', label: 'Restaurant', icon: '🍽️' },
    { id: 'orders', label: 'Orders', icon: '📦' },
    { id: 'stock', label: 'Stock / Inventory', icon: '📋' },
    { id: 'staff', label: 'Staff Management', icon: '👥' },
    { id: 'billing', label: 'Billing & Payments', icon: '💰' },
    { id: 'loyalty', label: 'Loyalty Points', icon: '⭐' },
    { id: 'reports', label: 'Reports & Analytics', icon: '📈' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' }
  ];

  // Recent bookings data
  const recentBookings = [
    { guestName: 'Liam Carter', roomNumber: '101', checkIn: '2024-07-20', checkOut: '2024-07-25', orderNumber: '12345', status: 'Confirmed' },
    { guestName: 'Olivia Bennett', roomNumber: '205', checkIn: '2024-07-21', checkOut: '2024-07-24', orderNumber: '67890', status: 'Completed' },
    { guestName: 'Ethan Harper', roomNumber: '310', checkIn: '2024-07-22', checkOut: '2024-07-26', orderNumber: '11223', status: 'Pending' },
    { guestName: 'Ava Foster', roomNumber: '112', checkIn: '2024-07-23', checkOut: '2024-07-27', orderNumber: '33445', status: 'Confirmed' },
    { guestName: 'Noah Parker', roomNumber: '215', checkIn: '2024-07-24', checkOut: '2024-07-28', orderNumber: '55667', status: 'Completed' }
  ];

  // Top selling items
  const topSellingItems = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5', 'Item 6', 'Item 7'];

  // Handle navigation click
  const handleNavigation = (sectionId) => {
    setActiveSection(sectionId);
    console.log(`Navigating to: ${sectionId}`);
  };

  // Render different content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'rooms':
        return <div className="page-content">Rooms Management</div>;
      case 'restaurant':
        return <div className="page-content">Restaurant Management</div>;
      case 'orders':
        return <div className="page-content">Orders Management</div>;
      case 'stock':
        return <div className="page-content">Stock / Inventory</div>;
      case 'staff':
        return <div className="page-content">Staff Management</div>;
      case 'billing':
        return <div className="page-content">Billing & Payments</div>;
      case 'loyalty':
        return <div className="page-content">Loyalty Points</div>;
      case 'reports':
        return <div className="page-content">Reports & Analytics</div>;
      case 'notifications':
        return <div className="page-content">Notifications</div>;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="welcome-text">Welcome back, Bhushal! Here's a snapshot of your hotel's operations.</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏨</div>
          <div className="stat-info">
            <h3>Total Rooms</h3>
            <div className="stat-number">250</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🍽️</div>
          <div className="stat-info">
            <h3>Active Restaurant Orders</h3>
            <div className="stat-number">15</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>Today's Revenue</h3>
            <div className="stat-number">$5,200</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <h3>Loyalty Points Redeemed</h3>
            <div className="stat-number">300</div>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="analytics-section">
        <h2>Analytics</h2>
        <div className="analytics-grid">
          <div className="analytics-card">
            <div className="analytics-header">
              <h3>Sales Analytics</h3>
              <div className="analytics-value">
                <div className="amount">$12,500</div>
                <div className="trend positive">Last 7 Days +15%</div>
              </div>
            </div>
            <div className="chart-placeholder">
              <div className="chart-bars">
                <div className="bar" style={{height: '60%'}}></div>
                <div className="bar" style={{height: '80%'}}></div>
                <div className="bar" style={{height: '45%'}}></div>
                <div className="bar" style={{height: '90%'}}></div>
                <div className="bar" style={{height: '70%'}}></div>
                <div className="bar" style={{height: '85%'}}></div>
                <div className="bar" style={{height: '95%'}}></div>
              </div>
              <div className="chart-labels">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </div>

          <div className="analytics-card">
            <div className="analytics-header">
              <h3>Order Status</h3>
              <div className="analytics-value">
                <div className="amount">150</div>
                <div className="trend positive">Today +5%</div>
              </div>
            </div>
            <div className="status-chart">
              <div className="status-bars">
                <div className="status-bar pending" style={{width: '30%'}}>
                  <span>Pending</span>
                </div>
                <div className="status-bar completed" style={{width: '50%'}}>
                  <span>Completed</span>
                </div>
                <div className="status-bar canceled" style={{width: '20%'}}>
                  <span>Canceled</span>
                </div>
              </div>
              <div className="status-legend">
                <div className="legend-item">
                  <span className="color-dot pending"></span>
                  <span>Pending</span>
                </div>
                <div className="legend-item">
                  <span className="color-dot completed"></span>
                  <span>Completed</span>
                </div>
                <div className="legend-item">
                  <span className="color-dot canceled"></span>
                  <span>Canceled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="bottom-section">
        <div className="top-selling">
          <div className="section-header">
            <h3>Top Selling Items</h3>
            <div className="section-stats">
              <span className="number">10</span>
              <span className="trend positive">This Month +10%</span>
            </div>
          </div>
          <div className="items-list">
            {topSellingItems.map((item, index) => (
              <div key={index} className="item">
                <span className="item-rank">{index + 1}</span>
                <span className="item-name">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="recent-bookings">
          <div className="section-header">
            <h3>Recent Bookings / Orders</h3>
          </div>
          <div className="table-container">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Guest Name</th>
                  <th>Room Number</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Order Number</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((booking, index) => (
                  <tr key={index}>
                    <td className="guest-name">{booking.guestName}</td>
                    <td className="room-number">{booking.roomNumber}</td>
                    <td className="check-in">{booking.checkIn}</td>
                    <td className="check-out">{booking.checkOut}</td>
                    <td className="order-number">{booking.orderNumber}</td>
                    <td>
                      <span className={`status-badge ${booking.status.toLowerCase()}`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="hotel-dashboard">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="admin-info">
            <h2>Hotel Admin</h2>
            <p className="admin-role">Hotel Admin</p>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => handleNavigation(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Hoteldashboard;
