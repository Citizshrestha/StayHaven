import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HotelManagement.css';

const HotelManagement = () => {
  const [darkMode, _setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeNav, setActiveNav] = useState('hotel-management');

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/' },
    { id: 'user-management', label: 'User Management', icon: 'group', path: '/usermanagement' },
    { id: 'hotel-management', label: 'Hotel Management', icon: 'apartment', path: '/hotelmanagement', active: true },
    { id: 'booking-management', label: 'Booking Management', icon: 'book_online', path: '/bookingmanagement' },
    { id: 'finance', label: 'Finance', icon: 'payments', path: '/finance' },
    { id: 'review-moderation', label: 'Review Moderation', icon: 'rate_review', path: '/reviewmoderation' },
    { id: 'content-management', label: 'Content Management', icon: 'wysiwyg', path: '/contentmanagement' },
    { id: 'system-config', label: 'System Configuration', icon: 'tune', path: '/systemconfig' },
  ];

  const bottomNavItems = [
    { id: 'analytics', label: 'Analytics', icon: 'analytics' },
    { id: 'logout', label: 'Logout', icon: 'logout' },
  ];

  const stats = [
    { label: 'Total Hotels', value: '1,250' },
    { label: 'Active Hotels', value: '1,180' },
    { label: 'Pending Approvals', value: '15' },
    { label: 'Rooms Managed', value: '48,230' },
  ];

  const hotels = [
    {
      id: 1,
      name: 'The Grand Hyatt',
      location: 'New York, USA',
      rating: 4.8,
      manager: 'John Doe',
      status: 'Active',
      statusType: 'success',
      createdAt: '2023-10-26',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJFJej1_xfiFpWCUbeWKRsXq9NEdc0F3t9tKKBxicunUhqTXA3mvBSb9tMbgiYjW3pqxaDA2M_gn3iah8XHflf0cpR_q1bmk8IP0VOWgte0D1p6MK49SLEOw27ZvGd8bFDtBpyUqs76E46y4N_LFxHmzevhB5fqAfboEjkpz6R8ZKB5TDtEguRLl5GiZ_CZcY7nrOQ8Oz5-8_jG6Jwhk3bBJ4qfo6Wc7RNdZvGRyA4v7Jwjo0rkg1J0dROoaTNsb96lNYAcLLD2Q',
      toggleIcon: 'toggle_off'
    },
    {
      id: 2,
      name: 'Sunset Resort',
      location: 'Malibu, USA',
      rating: 4.9,
      manager: 'Jane Smith',
      status: 'Pending',
      statusType: 'warning',
      createdAt: '2023-10-25',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrKBrejU9lhWq4XMd6DbPtyLTrQVOzmjC5YA-urgdIKEhuCc0dlW-apLDn3o_p8PJ7OvgVdt9RJTZ9L5kGQa8hPC_OmKaIvn56ucAahr47sIGxndcKBxUkYCdpRSz18LRzrxQn0U3AJZZlOnEBzJxZvhA-ebuo2urIvrr9BT5eGvD_Bz6LQpYx5qAapBF4Zy47YsFcggYm_MQ3IcsXDA9pRWm-i2wNETvOCO61F9Ntj13k67ANawiZ1415FYkP3sqIjEx-eFHYPA',
      toggleIcon: 'toggle_off'
    },
    {
      id: 3,
      name: 'Ocean View Inn',
      location: 'Miami, USA',
      rating: 4.5,
      manager: 'Mike Johnson',
      status: 'Active',
      statusType: 'success',
      createdAt: '2023-10-24',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOdhSzHCL-pn7deGNC5JFpk6TKFWmgd1OSzuHQivA_JS2MCh0vN6wyz2qw3c8-7v4ChmTabSO0PyeR3609F_P8polbYpLzeF3r_sPcsBy02FhG2COlq8jWhsvLrYBQWk38cx8Ak6ctOfCIiQsJJ2JPY5i7TLpuCnS3oaM1kZEO4u2CK0jgO828xo0bc3BKjGhfJ220TEiXY5IMALCoJVOZjXvkTFk3OmgArbR-QrCZooVSH-VcLknkQ2GZpb05oRVDEyRzvc_Muw',
      toggleIcon: 'toggle_off'
    },
    {
      id: 4,
      name: 'City Center Hotel',
      location: 'London, UK',
      rating: 4.2,
      manager: 'Sarah Wilson',
      status: 'Disabled',
      statusType: 'error',
      createdAt: '2023-10-23',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtR_tLVYScDAG7Kpb72wjiAq5X9CU86bTy9HFuHxc63bRc8hrkufq9Gla41mSBKf3ERdVefSSCYyEbqgEYCrXa-Eu5zGwT7E22ehDDsoB-2VenG6clXUVY_iE4DqnNndQGahWQ4k1jJSO57qtJvVeAWSu4SPVeX2IQozHAgd3vszNlZY2Ht7x5S5d6UTwXQKWnQPaJcnv8ie67E9Va09HQ3yinVx2CHDZgXpbRt_H9MeJKVp93O_HLm0yrbmtGej-eK7T48HQPfg',
      toggleIcon: 'toggle_on'
    }
  ];

  const filterOptions = [
    { label: 'Status', options: ['Active', 'Pending', 'Disabled'] },
    { label: 'Rating', options: ['5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star'] },
    { label: 'City', options: ['New York', 'London', 'Paris'] },
    { label: 'Sort By', options: ['A–Z', 'Rating', 'Latest'] }
  ];

  return (
    <div className={`hotel-management ${darkMode ? 'dark' : 'light'}`}>
      <div className="layout-container">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
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
                <NavButton
                  key={item.id}
                  item={item}
                  activeNav={activeNav}
                  setActiveNav={setActiveNav}
                />
              ))}
            </div>

            <div className="nav-section bottom">
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
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {/* Header */}
          <header className="main-header">
            <div className="header-left">
              <button 
                className="mobile-menu-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <h2>Hotels</h2>
            </div>

            <div className="header-right">
              <div className="search-container desktop-search">
                <span className="search-icon material-symbols-outlined">search</span>
                <input
                  className="search-input"
                  placeholder="Search hotels..."
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button className="icon-button">
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
          <div className="page-content">
            {/* Search and Add Button */}
            <div className="action-bar">
              <div className="mobile-search-container">
                <span className="search-icon material-symbols-outlined">search</span>
                <input
                  className="search-input mobile"
                  placeholder="Search hotels..."
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button className="add-hotel-btn">
                <span className="material-symbols-outlined">add</span>
                <span>Add New Hotel</span>
              </button>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
              {stats.map((stat, index) => (
                <div key={index} className="stat-card">
                  <p className="stat-label">{stat.label}</p>
                  <p className="stat-value">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="filters-section">
              <div className="filters-grid">
                {filterOptions.map((filter, index) => (
                  <select key={index} className="filter-select">
                    <option>{filter.label}</option>
                    {filter.options.map((option, optIndex) => (
                      <option key={optIndex}>{option}</option>
                    ))}
                  </select>
                ))}
              </div>
            </div>

            {/* Hotels Table */}
            <div className="table-card">
              <div className="table-container">
                <table className="hotels-table">
                  <thead>
                    <tr>
                      <th>Hotel Name</th>
                      <th>Location</th>
                      <th>Rating</th>
                      <th>Manager Assigned</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th className="actions-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotels.map((hotel) => (
                      <tr key={hotel.id} className="table-row">
                        <td className="hotel-name-cell">
                          <div className="hotel-info">
                            <img 
                              className="hotel-image" 
                              src={hotel.image} 
                              alt={`${hotel.name} thumbnail`}
                            />
                            <span className="hotel-name">{hotel.name}</span>
                          </div>
                        </td>
                        <td className="location-cell">{hotel.location}</td>
                        <td className="rating-cell">
                          <div className="rating-display">
                            <span className="material-symbols-outlined fill">star</span>
                            <span className="rating-value">{hotel.rating}</span>
                          </div>
                        </td>
                        <td className="manager-cell">{hotel.manager}</td>
                        <td className="status-cell">
                          <span className={`status-badge ${hotel.statusType}`}>
                            {hotel.status}
                          </span>
                        </td>
                        <td className="date-cell">{hotel.createdAt}</td>
                        <td className="actions-cell">
                          <div className="action-buttons">
                            <button className="action-btn">
                              <span className="material-symbols-outlined">visibility</span>
                            </button>
                            <button className="action-btn">
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button className="action-btn">
                              <span className="material-symbols-outlined">{hotel.toggleIcon}</span>
                            </button>
                            <button className="action-btn delete">
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="pagination">
                <span className="pagination-info">
                  Showing 1-10 of 1250 hotels
                </span>
                <div className="pagination-controls">
                  <button className="pagination-btn">Previous</button>
                  <button className="pagination-btn">1</button>
                  <button className="pagination-btn active">2</button>
                  <button className="pagination-btn">3</button>
                  <button className="pagination-btn">Next</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HotelManagement;

// Reuse NavButton helper for sidebar navigation
const NavButton = ({ item, activeNav, setActiveNav }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    setActiveNav(item.id);
    if (item.path) navigate(item.path);
  };

  return (
    <button
      className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
      onClick={handleClick}
    >
      <span className={`material-symbols-outlined ${activeNav === item.id ? 'fill' : ''}`}>
        {item.icon}
      </span>
      <p>{item.label}</p>
    </button>
  );
};