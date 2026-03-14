import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserManagement.css';

const UserManagement = () => {
  const [darkMode, _setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeNav, setActiveNav] = useState('user-management');

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/superadmindashboard' },
    { id: 'bookings', label: 'Bookings', icon: 'calendar_month', path: '/bookings' },
    { id: 'user-management', label: 'User Management', icon: 'group', path: '/usermanagement' },
    { id: 'settings', label: 'Settings', icon: 'settings', path: '/settings' },
  ];

  const bottomNavItems = [
    { id: 'support', label: 'Support', icon: 'support_agent', path: '/support' },
    { id: 'logout', label: 'Logout', icon: 'logout' },
  ];

  const stats = [
    { label: 'Total Users', value: '1,250', trend: '+1.5%', trendUp: true },
    { label: 'Active Users', value: '1,180', trend: '+2.1%', trendUp: true },
    { label: 'Suspended Users', value: '52', trend: '-0.5%', trendUp: false },
    { label: 'New Users (30d)', value: '18', trend: '+8.0%', trendUp: true },
  ];

  const users = [
    {
      id: 1,
      name: 'Alex Johnson',
      email: 'alex.j@example.com',
      phone: '(555) 123-4567',
      role: 'Admin',
      status: 'Active',
      createdAt: '2023-01-15',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9wQ4dR16M5dsNlwVXQ3XkdikBOuCSEiV3JKEh0roEUXDzcr-yOEwPa1puDR6OdjUsi5wlUBK5LssBlT8NSjByWMwHK055ofQsR_3n0bkir5g2V6E2WxVYOJsaPvVNm4W3gzcm_LdkWYtHFmE4B4UpYk-UR6PfC4sRfepmiitIr3C8RX1kAasYF_2glzJx9KfgHneg3QaAHaDjwukdRVnokycMXXAcyRV68d3U5sJuM7p6A-KdlA_HialKXP67tbtKDF3Vyg2y_Q',
      roleColor: 'blue',
      statusColor: 'green'
    },
    {
      id: 2,
      name: 'Maria Garcia',
      email: 'maria.g@example.com',
      phone: '(555) 987-6543',
      role: 'Manager',
      status: 'Active',
      createdAt: '2023-02-20',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGNZyuHPtn4eKXZiYK7KZ5Gt0nwzS-JIAsgRABM3GzZXyeGcSznFKgjrsqRrFlK8rG1SvZVdWhvI-KHOwbsjdKF2Ej91ak-97TL59hqCr_VfzJZ4zOB_sgBe2oG1ib2Zm3k9a3jmJ7nEdyKFtQIB1GGbeDAjicMoLbzFVAaT-L1TiHIzSxod6G5ohspLbN53Ej8i93V9hZQsBH6ExLQdwntPjpPkCyxwEixFZzCLZ1W51ZmXAqgBrd6Hgq2ignwa3wL4K09BNXSw',
      roleColor: 'purple',
      statusColor: 'green'
    },
    {
      id: 3,
      name: 'Chris Lee',
      email: 'chris.l@example.com',
      phone: '(555) 234-5678',
      role: 'User',
      status: 'Suspended',
      createdAt: '2023-03-10',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADPegGXI1FK4RMUhQAImsxO0XuE34eUkIIq_fZnVdCwpqMTT6pgshfWzsUm7KPhVo-NcjEgjcvzZxFVwyYp9QUMjFNZHAHzLbZXTDjYUOiCnplUr9QDdxInkwslRUF-12dwxyWMOP3wed1Sa5uSXvOukBjFRqZHXN6DYdl9uSFWdzH-LEGgaQd3MmhMHXmxOkeFB99szDVflbeIw3I2dtlDSAQO-slLu-DiUvbioS0LpAYFenAUlWjJ16zFIWuPiGjkU6yrHXokQ',
      roleColor: 'gray',
      statusColor: 'red'
    },
    {
      id: 4,
      name: 'Patricia Wilson',
      email: 'pat.w@example.com',
      phone: '(555) 345-6789',
      role: 'User',
      status: 'Pending',
      createdAt: '2023-04-05',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCzIt97zqX8CfhqN1mvwAg7ug_wgSeP6Uc9mG1DmTMHinKvxwNsyBIyQ8HFGj5wUIdDUIz5FcmWCnWmYHQYm72H2RuU2Up_0YvRudlRUfjkNWZnXLpg2NQb1qvsXOJxakFqeNRr17mj85mVZzfL5I8Cf0F_4NXnOq899Zq0DrWCbpLH4ZcjMNi1mmnnbq7RZEip5jMgJCoS4RNZy7IOF6i6P0j0ytl4wj6VjwvGcwouiwn3xntRPai7j1pYJYfF30OriAWpYoAbVA',
      roleColor: 'gray',
      statusColor: 'yellow'
    }
  ];

  const getStatusIcon = (status) => {
    return status === 'Suspended' ? 'toggle_on' : 'toggle_off';
  };

  const getStatusIconColor = (status) => {
    return status === 'Suspended' ? 'green' : '';
  };

  return (
    <div className={`user-management NPR {darkMode ? 'dark' : 'light'}`}>
      <div className="flex min-h-screen w-full">
        {/* SideNavBar */}
        <aside className="sidebar">
          <div className="sidebar-content">
            <div className="sidebar-header">
              <div 
                className="logo-image"
                style={{
                  backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDcoENhDYUoWhV-xqjj9glmiPHGV0nzuTRCaBlTKCud3qPoZI4N8Nq4YZKD-naqga1zX3AQhTbItXoNjVCWXqTHcxaNIQM-5gQRoHfwNQr37VIC8ZPtQx-xOOvz8ei8twvCGG4mxXqgNxGxhRXzbXJd3D40tNHnDXOofNC79CXmo-tss5zEHVEhOS_DU1N2UoVzDY1P6H2kbfx-OHqEWiF8x3qA29qOphcQ0GG1fdXVunY-K4zBqHIKcWPi154X001_d5RbVlWeaA")'
                }}
              ></div>
              <div className="user-info">
                <h1>Olivia Rhye</h1>
                <p>Super Admin</p>
              </div>
            </div>

            <nav className="main-nav">
              {navigationItems.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  activeNav={activeNav}
                  setActiveNav={setActiveNav}
                />
              ))}
            </nav>
          </div>

          <div className="bottom-nav">
            {bottomNavItems.map((item) => (
              <button
                key={item.id}
                className="nav-item"
                onClick={() => setActiveNav(item.id)}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <p>{item.label}</p>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <div className="container">
            {/* Page Heading */}
            <header className="page-header">
              <div className="header-text">
                <h1>User Management</h1>
                <p>Manage platform users and roles</p>
              </div>
              
              <div className="header-actions">
                <div className="search-container">
                  <div className="search-input-wrapper">
                    <div className="search-icon-container">
                      <span className="material-symbols-outlined">search</span>
                    </div>
                    <input
                      className="search-input"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      type="text"
                    />
                  </div>
                </div>
                
                <button className="add-user-btn">
                  <span>Add New User</span>
                </button>
              </div>
            </header>

            {/* Stats */}
            <section className="stats-section">
              <div className="stats-grid">
                {stats.map((stat, index) => (
                  <div key={index} className="stat-card">
                    <p className="stat-label">{stat.label}</p>
                    <p className="stat-value">{stat.value}</p>
                    <p className={`stat-trend NPR {stat.trendUp ? 'positive' : 'negative'}`}>
                      <span className="material-symbols-outlined">
                        {stat.trendUp ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                      {stat.trend}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* User Table Section */}
            <section className="table-section">
              {/* ToolBar */}
              <div className="table-toolbar">
                <div className="toolbar-filters">
                  <button className="filter-btn">
                    <span>Role: All</span>
                    <span className="material-symbols-outlined">expand_more</span>
                  </button>
                  <button className="filter-btn">
                    <span>Status: All</span>
                    <span className="material-symbols-outlined">expand_more</span>
                  </button>
                  <button className="filter-btn">
                    <span>Sort by: Date Created</span>
                    <span className="material-symbols-outlined">expand_more</span>
                  </button>
                </div>
                
                <button className="export-btn">
                  <span className="material-symbols-outlined">download</span>
                  <span>Export</span>
                </button>
              </div>

              {/* Table */}
              <div className="table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="user-cell">
                          <div className="user-info-cell">
                            <img 
                              className="user-avatar" 
                              src={user.avatar} 
                              alt={`NPR {user.name} avatar`}
                            />
                            <div>{user.name}</div>
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>{user.phone}</td>
                        <td>
                          <span className={`role-badge NPR {user.roleColor}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge NPR {user.statusColor}`}>
                            {user.status}
                          </span>
                        </td>
                        <td>{user.createdAt}</td>
                        <td className="actions-cell">
                          <div className="actions-buttons">
                            <button className="action-btn">
                              <span className="material-symbols-outlined">visibility</span>
                            </button>
                            <button className="action-btn">
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button className="action-btn">
                              <span 
                                className={`material-symbols-outlined NPR {getStatusIconColor(user.status)}`}
                              >
                                {getStatusIcon(user.status)}
                              </span>
                            </button>
                            <button className="action-btn">
                              <span className="material-symbols-outlined red">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <nav className="pagination">
                <span className="pagination-info">
                  Showing <span className="font-semibold">1-4</span> of <span className="font-semibold">100</span>
                </span>
                <ul className="pagination-buttons">
                  <li>
                    <button className="pagination-btn prev-next">
                      Previous
                    </button>
                  </li>
                  <li>
                    <button className="pagination-btn prev-next">
                      Next
                    </button>
                  </li>
                </ul>
              </nav> 
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserManagement;

// Small helper component placed at end of file to keep sidebar navigation behavior consistent
const NavButton = ({ item, activeNav, setActiveNav }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    setActiveNav(item.id);
    if (item.path) navigate(item.path);
  };

  return (
    <button
      className={`nav-item NPR {activeNav === item.id ? 'active' : ''}`}
      onClick={handleClick}
    >
      <span className="material-symbols-outlined">{item.icon}</span>
      <p>{item.label}</p>
    </button>
  );
};
