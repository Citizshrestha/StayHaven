import React, { useState } from 'react';
import './RoomsManagement.css';

const RoomsManagement = () => {
  const [activeSection, setActiveSection] = useState('rooms');
  const [filterStatus, setFilterStatus] = useState('all');

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

  // Rooms data
  const roomsData = [
    { roomNumber: '101', roomType: 'Standard', status: 'available', cleanliness: 'Clean' },
    { roomNumber: '102', roomType: 'Deluxe', status: 'occupied', cleanliness: 'Dirty' },
    { roomNumber: '103', roomType: 'Suite', status: 'maintenance', cleanliness: 'Clean' },
    { roomNumber: '104', roomType: 'Standard', status: 'available', cleanliness: 'Clean' },
    { roomNumber: '105', roomType: 'Deluxe', status: 'occupied', cleanliness: 'Dirty' },
    { roomNumber: '106', roomType: 'Suite', status: 'available', cleanliness: 'Clean' },
    { roomNumber: '107', roomType: 'Standard', status: 'occupied', cleanliness: 'Dirty' },
    { roomNumber: '108', roomType: 'Deluxe', status: 'maintenance', cleanliness: 'Clean' },
    { roomNumber: '109', roomType: 'Suite', status: 'available', cleanliness: 'Clean' },
    { roomNumber: '110', roomType: 'Standard', status: 'occupied', cleanliness: 'Dirty' }
  ];

  // Filter rooms based on status
  const filteredRooms = filterStatus === 'all' 
    ? roomsData 
    : roomsData.filter(room => room.status === filterStatus);

  // Room statistics
  const roomStats = {
    available: roomsData.filter(room => room.status === 'available').length,
    occupied: roomsData.filter(room => room.status === 'occupied').length,
    maintenance: roomsData.filter(room => room.status === 'maintenance').length,
    total: roomsData.length
  };

  // Handle navigation click
  const handleNavigation = (sectionId) => {
    setActiveSection(sectionId);
    console.log(`Navigating to: ${sectionId}`);
  };

  // Handle room actions
  const handleRoomAction = (roomNumber, action) => {
    console.log(`${action} clicked for room ${roomNumber}`);
    // Add your room action logic here
  };

  // Render different content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <div className="page-content">Dashboard Page Content</div>;
      case 'rooms':
        return renderRoomsManagement();
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
        return renderRoomsManagement();
    }
  };

  const renderRoomsManagement = () => (
    <div className="rooms-content">
      <div className="content-header">
        <h1>Rooms Management</h1>
        <p className="subtitle">Manage all rooms, their status, and details.</p>
      </div>

      {/* Room Statistics */}
      <div className="room-stats">
        <div className="stat-card">
          <div className="stat-icon">🏨</div>
          <div className="stat-info">
            <h3>Total Rooms</h3>
            <div className="stat-number">{roomStats.total}</div>
          </div>
        </div>

        <div className="stat-card available">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>Available</h3>
            <div className="stat-number">{roomStats.available}</div>
          </div>
        </div>

        <div className="stat-card occupied">
          <div className="stat-icon">🛌</div>
          <div className="stat-info">
            <h3>Occupied</h3>
            <div className="stat-number">{roomStats.occupied}</div>
          </div>
        </div>

        <div className="stat-card maintenance">
          <div className="stat-icon">🔧</div>
          <div className="stat-info">
            <h3>Under Maintenance</h3>
            <div className="stat-number">{roomStats.maintenance}</div>
          </div>
        </div>
      </div>

      {/* Quick Status Overview */}
      <div className="status-overview">
        <div className="status-section">
          <h3>Available</h3>
          <div className="room-count">{roomStats.available} Rooms</div>
        </div>
        
        <div className="status-section">
          <h3>Occupied</h3>
          <div className="room-count">{roomStats.occupied} Rooms</div>
        </div>
        
        <div className="status-section">
          <h3>Under Maintenance</h3>
          <div className="room-count">{roomStats.maintenance} Rooms</div>
        </div>
      </div>

      {/* Rooms Table Section */}
      <div className="rooms-section">
        <div className="section-header">
          <h2>Room Details</h2>
          <div className="section-actions">
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                All Rooms
              </button>
              <button 
                className={`filter-btn ${filterStatus === 'available' ? 'active' : ''}`}
                onClick={() => setFilterStatus('available')}
              >
                Available
              </button>
              <button 
                className={`filter-btn ${filterStatus === 'occupied' ? 'active' : ''}`}
                onClick={() => setFilterStatus('occupied')}
              >
                Occupied
              </button>
              <button 
                className={`filter-btn ${filterStatus === 'maintenance' ? 'active' : ''}`}
                onClick={() => setFilterStatus('maintenance')}
              >
                Maintenance
              </button>
            </div>
            <div className="action-buttons">
              <button className="btn-secondary">Cancel</button>
              <button className="btn-primary">Add Room</button>
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="rooms-table">
            <thead>
              <tr>
                <th>Room Number</th>
                <th>Room Type</th>
                <th>Status</th>
                <th>Cleanliness</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room, index) => (
                <tr key={index}>
                  <td className="room-number">{room.roomNumber}</td>
                  <td className="room-type">{room.roomType}</td>
                  <td>
                    <span className={`status-badge ${room.status}`}>
                      {room.status === 'available' && 'Available'}
                      {room.status === 'occupied' && 'Occupied'}
                      {room.status === 'maintenance' && 'Under Maintenance'}
                    </span>
                  </td>
                  <td>
                    <span className={`cleanliness-badge ${room.cleanliness.toLowerCase()}`}>
                      {room.cleanliness}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-edit"
                        onClick={() => handleRoomAction(room.roomNumber, 'edit')}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn-view"
                        onClick={() => handleRoomAction(room.roomNumber, 'view')}
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View for smaller screens */}
        <div className="mobile-rooms-cards">
          {filteredRooms.map((room, index) => (
            <div key={index} className="room-card">
              <div className="room-card-header">
                <h4>Room {room.roomNumber}</h4>
                <span className={`status-badge ${room.status}`}>
                  {room.status === 'available' && 'Available'}
                  {room.status === 'occupied' && 'Occupied'}
                  {room.status === 'maintenance' && 'Maintenance'}
                </span>
              </div>
              <div className="room-card-details">
                <div className="detail-item">
                  <span className="label">Type:</span>
                  <span className="value">{room.roomType}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Cleanliness:</span>
                  <span className={`value cleanliness ${room.cleanliness.toLowerCase()}`}>
                    {room.cleanliness}
                  </span>
                </div>
              </div>
              <div className="room-card-actions">
                <button className="btn-edit">Edit</button>
                <button className="btn-view">View</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="rooms-management">
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

export default RoomsManagement;