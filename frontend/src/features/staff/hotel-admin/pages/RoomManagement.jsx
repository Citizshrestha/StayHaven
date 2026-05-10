import React, { useState, useEffect } from 'react';
import { useStaffAuth } from '../../../../core/context/StaffAuthContext';
import {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
} from '../services/roomApi';
import './RoomManagement.css';

const RoomsManagement = () => {
  const { activeProperty } = useStaffAuth();
  const [activeSection, setActiveSection] = useState('rooms');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [formData, setFormData] = useState({
    roomName: '',
    roomNumber: '',
    type: 'Standard',
    price: '',
    floor: 1,
    maxGuests: 2,
    description: '',
    amenities: [],
    bedType: 'Queen',
    status: 'available'
  });

  const hotelId = activeProperty?._id || activeProperty;

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'rooms', label: 'Rooms', icon: '🛏' },
    { id: 'restaurant', label: 'Restaurant', icon: '🍽' },
    { id: 'orders', label: 'Orders', icon: '📦' },
    { id: 'stock', label: 'Stock / Inventory', icon: '📋' },
    { id: 'staff', label: 'Staff Management', icon: '👥' },
    { id: 'billing', label: 'Billing & Payments', icon: '💰' },
    { id: 'loyalty', label: 'Loyalty Points', icon: '⭐' },
    { id: 'reports', label: 'Reports & Analytics', icon: '📈' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' }
  ];

  // Fetch rooms on component mount
  useEffect(() => {
    if (hotelId && activeSection === 'rooms') {
      fetchRooms();
    }
  }, [hotelId, activeSection]);

  const fetchRooms = async () => {
    if (!hotelId) {
      setError('No hotel selected');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getRooms({ hotelId });
      setRooms(response.data.rooms || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  // Filter rooms based on status and search query
  const filteredRooms = rooms.filter(room => {
    const matchesStatus = filterStatus === 'all' || room.status === filterStatus;
    const matchesSearch = searchQuery === '' ||
      room.roomNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.roomName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.type?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Room statistics
  const roomStats = {
    available: rooms.filter(room => room.status === 'available').length,
    occupied: rooms.filter(room => room.status === 'occupied').length,
    maintenance: rooms.filter(room => room.status === 'maintenance').length,
    total: rooms.length
  };

  // Handle navigation click
  const handleNavigation = (sectionId) => {
    setActiveSection(sectionId);
  };

  // Open create modal
  const handleAddRoom = () => {
    setModalMode('create');
    setSelectedRoom(null);
    setFormData({
      roomName: '',
      roomNumber: '',
      type: 'Standard',
      price: '',
      floor: 1,
      maxGuests: 2,
      description: '',
      amenities: [],
      bedType: 'Queen',
      status: 'available'
    });
    setShowModal(true);
  };

  // Open edit modal
  const handleEditRoom = (room) => {
    setModalMode('edit');
    setSelectedRoom(room);
    setFormData({
      roomName: room.roomName || '',
      roomNumber: room.roomNumber || '',
      type: room.type || 'Standard',
      price: room.price || '',
      floor: room.floor || 1,
      maxGuests: room.maxGuests || 2,
      description: room.description || '',
      amenities: room.amenities || [],
      bedType: room.bedType || 'Queen',
      status: room.status || 'available'
    });
    setShowModal(true);
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (modalMode === 'create') {
        await createRoom({ ...formData, hotelId });
      } else {
        await updateRoom(selectedRoom._id, formData);
      }
      setShowModal(false);
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${modalMode} room`);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete room
  const handleDeleteRoom = async (roomId, roomNumber) => {
    if (!window.confirm(`Are you sure you want to delete room ${roomNumber}?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await deleteRoom(roomId);
      fetchRooms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete room');
    } finally {
      setLoading(false);
    }
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

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* KPI Cards - 4 Column Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-content">
            <div className="kpi-icon total">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div className="kpi-info">
              <div className="kpi-label">Total Rooms</div>
              <div className="kpi-value">{roomStats.total}</div>
            </div>
          </div>
          <div className="kpi-badge trend">+12%</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-content">
            <div className="kpi-icon available">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="kpi-info">
              <div className="kpi-label">Available</div>
              <div className="kpi-value">{roomStats.available}</div>
            </div>
          </div>
          <div className="kpi-badge active">Active</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-content">
            <div className="kpi-icon occupied">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div className="kpi-info">
              <div className="kpi-label">Occupied</div>
              <div className="kpi-value">{roomStats.occupied}</div>
            </div>
          </div>
          <div className="kpi-badge in-use">In use</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-content">
            <div className="kpi-icon maintenance">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <div className="kpi-info">
              <div className="kpi-label">Under Maintenance</div>
              <div className="kpi-value">{roomStats.maintenance}</div>
            </div>
          </div>
          <div className="kpi-badge ongoing">Ongoing</div>
        </div>
      </div>

      {/* Room Details Table Section */}
      <div className="room-details-section">
        <div className="section-header-new">
          <h2 className="section-title">Room Details</h2>

          <div className="section-center">
            <input
              type="text"
              className="search-input"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="filter-pills">
              <button
                className={`filter-pill ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                All Rooms
              </button>
              <button
                className={`filter-pill ${filterStatus === 'available' ? 'active' : ''}`}
                onClick={() => setFilterStatus('available')}
              >
                Available
              </button>
              <button
                className={`filter-pill ${filterStatus === 'occupied' ? 'active' : ''}`}
                onClick={() => setFilterStatus('occupied')}
              >
                Occupied
              </button>
              <button
                className={`filter-pill ${filterStatus === 'maintenance' ? 'active' : ''}`}
                onClick={() => setFilterStatus('maintenance')}
              >
                Maintenance
              </button>
            </div>
          </div>

          <button className="btn-add-room" onClick={handleAddRoom}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Room
          </button>
        </div>

        <div className="table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>ROOM NUMBER</th>
                <th>ROOM TYPE</th>
                <th>STATUS</th>
                <th>CLEANLINESS</th>
                <th>PRICE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="loading-cell">Loading rooms...</td>
                </tr>
              ) : filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-cell">
                    {searchQuery ? 'No rooms match your search' : 'No rooms found'}
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room, index) => (
                  <tr key={room._id} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                    <td className="room-number-cell">{room.roomNumber}</td>
                    <td className="room-type-cell">{room.type}</td>
                    <td>
                      <span className={`status-pill ${room.status}`}>
                        {room.status === 'available' && 'AVAILABLE'}
                        {room.status === 'occupied' && 'OCCUPIED'}
                        {room.status === 'maintenance' && 'MAINTENANCE'}
                        {room.status === 'cleaning' && 'CLEANING'}
                        {room.status === 'reserved' && 'RESERVED'}
                      </span>
                    </td>
                    <td>
                      <span className={`cleanliness-pill ${room.cleanliness || 'clean'}`}>
                        {(room.cleanliness || 'clean') === 'clean' ? 'CLEAN' : 'DIRTY'}
                      </span>
                    </td>
                    <td className="price-cell">Rs. {room.price?.toLocaleString()}</td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="btn-action edit"
                          onClick={() => handleEditRoom(room)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-action view"
                          onClick={() => handleEditRoom(room)}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

      {/* Room Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Add New Room' : 'Edit Room'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Room Number *</label>
                  <input
                    type="text"
                    name="roomNumber"
                    value={formData.roomNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Room Name *</label>
                  <input
                    type="text"
                    name="roomName"
                    value={formData.roomName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Room Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Standard">Standard</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="Suite">Suite</option>
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price (NPR) *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Floor</label>
                  <input
                    type="number"
                    name="floor"
                    value={formData.floor}
                    onChange={handleInputChange}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Max Guests</label>
                  <input
                    type="number"
                    name="maxGuests"
                    value={formData.maxGuests}
                    onChange={handleInputChange}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Bed Type</label>
                  <select
                    name="bedType"
                    value={formData.bedType}
                    onChange={handleInputChange}
                  >
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                    <option value="Queen">Queen</option>
                    <option value="King">King</option>
                    <option value="Twin">Twin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="cleaning">Cleaning</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : modalMode === 'create' ? 'Create Room' : 'Update Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomsManagement;
