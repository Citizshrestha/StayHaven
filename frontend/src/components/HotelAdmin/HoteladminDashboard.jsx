import React, { useState, useEffect } from 'react';
import './HoteladminDashboard.css';
import RestaurantManagement from './RestaurantManagement';

const HoteladminDashboard = () => {
  const [activeSection, setActiveSection] = useState(() => {
    // Initialize from URL hash so direct links work
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
    return hash || 'dashboard';
  });
  const [orderSearch, setOrderSearch] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [staffRoleFilter, setStaffRoleFilter] = useState('all');
  const [staffStatusFilter, setStaffStatusFilter] = useState('all');
  // const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [roomFilter, setRoomFilter] = useState('all');
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  // State for rooms data
  const [roomsData, setRoomsData] = useState([
    { id: 1, roomNumber: '101', roomType: 'Standard', status: 'available', cleanliness: 'Clean', price: 'Rs. 15,000', amenities: ['WiFi', 'TV', 'AC'] },
    { id: 2, roomNumber: '102', roomType: 'Deluxe', status: 'occupied', cleanliness: 'Dirty', price: 'Rs. 25,000', amenities: ['WiFi', 'TV', 'AC', 'Mini Bar'] },
    { id: 3, roomNumber: '103', roomType: 'Suite', status: 'maintenance', cleanliness: 'Clean', price: 'Rs. 45,000', amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Jacuzzi'] },
    { id: 4, roomNumber: '104', roomType: 'Standard', status: 'available', cleanliness: 'Clean', price: 'Rs. 15,000', amenities: ['WiFi', 'TV', 'AC'] },
    { id: 5, roomNumber: '105', roomType: 'Deluxe', status: 'occupied', cleanliness: 'Dirty', price: 'Rs. 25,000', amenities: ['WiFi', 'TV', 'AC', 'Mini Bar'] },
    { id: 6, roomNumber: '106', roomType: 'Suite', status: 'available', cleanliness: 'Clean', price: 'Rs. 45,000', amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Jacuzzi'] },
    { id: 7, roomNumber: '107', roomType: 'Standard', status: 'occupied', cleanliness: 'Dirty', price: 'Rs. 15,000', amenities: ['WiFi', 'TV', 'AC'] },
    { id: 8, roomNumber: '108', roomType: 'Deluxe', status: 'maintenance', cleanliness: 'Clean', price: 'Rs. 25,000', amenities: ['WiFi', 'TV', 'AC', 'Mini Bar'] },
    { id: 9, roomNumber: '109', roomType: 'Suite', status: 'available', cleanliness: 'Clean', price: 'Rs. 45,000', amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Jacuzzi'] },
    { id: 10, roomNumber: '110', roomType: 'Standard', status: 'occupied', cleanliness: 'Dirty', price: 'Rs. 15,000', amenities: ['WiFi', 'TV', 'AC'] }
  ]);

  // State for new room form
  const [newRoom, setNewRoom] = useState({
    roomNumber: '',
    roomType: 'Standard',
    status: 'available',
    cleanliness: 'Clean',
    price: '',
    amenities: []
  });

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

  // Staff data
  const staffData = [
    { id: 1, name: 'Ethan Carter', role: 'Front Desk Receptionist', email: 'ethan.carter@example.com', phone: '+1 (555) 123-4567', status: 'Active', joinDate: '2023-01-15' },
    { id: 2, name: 'Olivia Bennett', role: 'Housekeeping Supervisor', email: 'olivia.bennett@example.com', phone: '+1 (555) 234-5678', status: 'Active', joinDate: '2022-08-20' },
    { id: 3, name: 'Noah Thompson', role: 'Chef', email: 'noah.thompson@example.com', phone: '+1 (555) 345-6789', status: 'Active', joinDate: '2023-03-10' },
    { id: 4, name: 'Ava Rodriguez', role: 'Concierge', email: 'ava.rodriguez@example.com', phone: '+1 (555) 456-7890', status: 'On Leave', joinDate: '2022-11-05' },
    { id: 5, name: 'Liam Walker', role: 'Maintenance Technician', email: 'liam.walker@example.com', phone: '+1 (555) 567-8901', status: 'Active', joinDate: '2023-02-28' },
  ];



  // Orders data
  const ordersData = [
    { id: '#12345', type: 'Room Service', guest: 'Ethan Harper', items: 'Club Sandwich, Fries', status: 'New', timestamp: '2024-07-26 10:00 AM' },
    { id: '#12346', type: 'Restaurant', guest: 'Olivia Bennett', items: 'Steak, Wine', status: 'Processing', timestamp: '2024-07-26 11:30 AM' },
    { id: '#12347', type: 'Guest Request', guest: 'Noah Carter', items: 'Extra Towels', status: 'Fulfilled', timestamp: '2024-07-26 12:45 PM' },
  ];

  // Available amenities options
  const amenitiesOptions = ['WiFi', 'TV', 'AC', 'Mini Bar', 'Jacuzzi', 'Sea View', 'Balcony', 'Kitchenette'];

  // Room statistics
  const roomStats = {
    available: roomsData.filter(room => room.status === 'available').length,
    occupied: roomsData.filter(room => room.status === 'occupied').length,
    maintenance: roomsData.filter(room => room.status === 'maintenance').length,
    total: roomsData.length
  };


  // Top selling items
  const topSellingItems = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5', 'Item 6', 'Item 7'];
  
  // Recent bookings (used by the dashboard recent bookings table)
  const recentBookings = [
    { guestName: 'Liam Carter', roomNumber: '101', checkIn: '2024-07-20', checkOut: '2024-07-25', orderNumber: '12345', status: 'Confirmed' },
    { guestName: 'Olivia Bennett', roomNumber: '205', checkIn: '2024-07-21', checkOut: '2024-07-24', orderNumber: '67890', status: 'Completed' },
    { guestName: 'Ethan Harper', roomNumber: '310', checkIn: '2024-07-22', checkOut: '2024-07-26', orderNumber: '11223', status: 'Pending' },
    { guestName: 'Ava Foster', roomNumber: '112', checkIn: '2024-07-23', checkOut: '2024-07-27', orderNumber: '33445', status: 'Confirmed' },
    { guestName: 'Noah Parker', roomNumber: '215', checkIn: '2024-07-24', checkOut: '2024-07-28', orderNumber: '55667', status: 'Completed' }
  ];

  // --- New State for Billing & Payments ---
  const [billingActiveTab, setBillingActiveTab] = useState('invoices');

  // Mock Data for Billing & Payments
  const billingStats = {
    totalRevenue: '$150,500',
    pendingPayments: '$5,200',
    successfulPayments: 95
  };

  const invoicesData = [
    { id: '#INV-001', guest: 'Ethan Harper', amount: 'Rs. 45,000', status: 'Paid', date: '2024-07-25', method: 'Card' },
    { id: '#INV-002', guest: 'Olivia Bennett', amount: 'Rs. 2,10,000', status: 'Pending', date: '2024-07-24', method: 'Bank Transfer' },
    { id: '#INV-003', guest: 'Noah Carter', amount: 'Rs. 15,000', status: 'Paid', date: '2024-07-23', method: 'Cash' },
    { id: '#INV-004', guest: 'Ava Foster', amount: 'Rs. 90,000', status: 'Paid', date: '2024-07-22', method: 'Card' },
    { id: '#INV-005', guest: 'Liam Walker', amount: 'Rs. 7,500', status: 'Pending', date: '2024-07-21', method: 'Cash' },
    { id: '#INV-006', guest: 'Mason Scott', amount: 'Rs. 1,50,000', status: 'Paid', date: '2024-07-20', method: 'Card' },
  ];

  // Invoice UI state
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState(new Set());

  const transactionsData = [
    { id: 'TRX-9876', type: 'Credit', amount: 'Rs. 45,000', status: 'Success', date: '2024-07-25', ref: 'INV-001' },
    { id: 'TRX-5432', type: 'Debit', amount: 'Rs. 5,000', status: 'Success', date: '2024-07-24', ref: 'RES-345' },
    { id: 'TRX-1098', type: 'Credit', amount: 'Rs. 15,000', status: 'Success', date: '2024-07-23', ref: 'INV-003' },
    { id: 'TRX-7654', type: 'Credit', amount: 'Rs. 90,000', status: 'Success', date: '2024-07-22', ref: 'INV-004' },
    { id: 'TRX-3210', type: 'Credit', amount: 'Rs. 1,00,000', status: 'Failed', date: '2024-07-21', ref: 'BOOK-567' },
  ];

  const paymentMethodsData = [
    { method: 'Credit Card (Visa)', count: 120, revenue: 'Rs. 65,00,000' },
    { method: 'Cash', count: 50, revenue: 'Rs. 15,00,000' },
    { method: 'Bank Transfer', count: 20, revenue: 'Rs. 30,00,000' },
    { method: 'Online Payment (PayPal)', count: 35, revenue: 'Rs. 20,50,000' },
  ];
  
  // Handle navigation click
  const handleNavigation = (sectionId) => {
    setActiveSection(sectionId);
    try {
      // update URL hash for deep-linking and back/forward support
      if (typeof window !== 'undefined') window.location.hash = `#${sectionId}`;
    } catch (e) {
      console.error('Failed to update URL hash:', e);
    }
    console.log(`Navigating to ${sectionId}`);
  };

  // Keep state in sync with hash changes (back button, direct links)
  useEffect(() => {
    const onHashChange = () => {
      const newHash = window.location.hash.replace('#', '') || 'dashboard';
      setActiveSection(newHash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Filter rooms based on status
  const filteredRooms = roomFilter === 'all' 
    ? roomsData 
    : roomsData.filter(room => room.status === roomFilter);

  // Handle room action
  const handleRoomAction = (roomId, action) => {
    if (action === 'edit') {
      const roomToEdit = roomsData.find(room => room.id === roomId);
      setEditingRoom(roomToEdit);
      setShowEditRoomModal(true);
    } else {
      console.log(`${action} clicked for room ${roomId}`);
    }
  };

  // Handle add new room
  const handleAddRoom = () => {
    if (newRoom.roomNumber && newRoom.price) {
      const roomExists = roomsData.some(room => room.roomNumber === newRoom.roomNumber);
      if (roomExists) {
        alert('Room number already exists! Please use a different room number.');
        return;
      }

      const newRoomWithId = {
        ...newRoom,
        id: roomsData.length + 1,
        price: newRoom.price.startsWith('Rs.') ? newRoom.price : `Rs. ${newRoom.price}`
      };
      
      setRoomsData([...roomsData, newRoomWithId]);
      setShowAddRoomModal(false);
      setNewRoom({
        roomNumber: '',
        roomType: 'Standard',
        status: 'available',
        cleanliness: 'Clean',
        price: '',
        amenities: []
      });
      alert('Room added successfully!');
    } else {
      alert('Please fill in all required fields');
    }
  };

  // Handle edit room
  const handleEditRoom = () => {
    if (editingRoom && editingRoom.roomNumber && editingRoom.price) {
      setRoomsData(roomsData.map(room => 
        room.id === editingRoom.id ? editingRoom : room
      ));
      setShowEditRoomModal(false);
      setEditingRoom(null);
      alert('Room updated successfully!');
    } else {
      alert('Please fill in all required fields');
    }
  };

  // Handle delete room
  const handleDeleteRoom = (roomId) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      setRoomsData(roomsData.filter(room => room.id !== roomId));
      alert('Room deleted successfully!');
    }
  };

  // Handle input change for new room
  const handleNewRoomChange = (field, value) => {
    setNewRoom(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle input change for editing room
  const handleEditRoomChange = (field, value) => {
    setEditingRoom(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Toggle amenity selection
  const toggleAmenity = (amenity) => {
    if (editingRoom) {
      const newAmenities = editingRoom.amenities.includes(amenity)
        ? editingRoom.amenities.filter(a => a !== amenity)
        : [...editingRoom.amenities, amenity];
      handleEditRoomChange('amenities', newAmenities);
    } else {
      const newAmenities = newRoom.amenities.includes(amenity)
        ? newRoom.amenities.filter(a => a !== amenity)
        : [...newRoom.amenities, amenity];
      handleNewRoomChange('amenities', newAmenities);
    }
  };

  // Render different content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'rooms':
        return renderRoomsManagement();
      case 'restaurant':
        return <RestaurantManagement embedded />;
      case 'orders':
        return renderOrdersManagement();
      case 'stock':
        return <div className="page-content">Stock / Inventory</div>;
      case 'staff':
        return renderStaffManagement();
      case 'billing':
        return renderBillingPayments();
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
        <div className="stat-card clickable" onClick={() => handleNavigation('rooms')} role="button" tabIndex={0}>
          <div className="stat-icon">🏨</div>
          <div className="stat-info">
            <h3>Total Rooms</h3>
            <div className="stat-number">250</div>
          </div>
        </div>

        <div className="stat-card clickable" onClick={() => handleNavigation('orders')} role="button" tabIndex={0}>
          <div className="stat-icon">🍽</div>
          <div className="stat-info">
            <h3>Active Restaurant Orders</h3>
            <div className="stat-number">15</div>
          </div>
        </div>

        <div className="stat-card clickable" onClick={() => handleNavigation('billing')} role="button" tabIndex={0}>
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>Today's Revenue</h3>
            <div className="stat-number">$5,200</div>
          </div>
        </div>

        <div className="stat-card clickable" onClick={() => handleNavigation('loyalty')} role="button" tabIndex={0}>
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
                <div className="amount">Rs. 12,50,000</div>
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

      {/* Rooms Table Section */}
      <div className="rooms-section">
        <div className="section-header">
          <h2>Room Details</h2>
          <div className="section-actions">
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${roomFilter === 'all' ? 'active' : ''}`}
                onClick={() => setRoomFilter('all')}
              >
                All Rooms
              </button>
              <button 
                className={`filter-btn ${roomFilter === 'available' ? 'active' : ''}`}
                onClick={() => setRoomFilter('available')}
              >
                Available
              </button>
              <button 
                className={`filter-btn ${roomFilter === 'occupied' ? 'active' : ''}`}
                onClick={() => setRoomFilter('occupied')}
              >
                Occupied
              </button>
              <button 
                className={`filter-btn ${roomFilter === 'maintenance' ? 'active' : ''}`}
                onClick={() => setRoomFilter('maintenance')}
              >
                Maintenance
              </button>
            </div>
            <div className="action-buttons">
              <button 
                className="btn-secondary"
                onClick={() => {
                  setRoomFilter('all');
                  // Reset any other filters if needed
                }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={() => setShowAddRoomModal(true)}
              >
                Add Room
              </button>
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
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room) => (
                <tr key={room.id}>
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
                  <td className="room-price">{room.price}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-edit"
                        onClick={() => handleRoomAction(room.id, 'edit')}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn-view"
                        onClick={() => handleRoomAction(room.id, 'view')}
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
          {filteredRooms.map((room) => (
            <div key={room.id} className="room-card">
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
                <div className="detail-item">
                  <span className="label">Price:</span>
                  <span className="value">{room.price}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Amenities:</span>
                  <span className="value amenities">
                    {room.amenities.join(', ')}
                  </span>
                </div>
              </div>
              <div className="room-card-actions">
                <button className="btn-edit" onClick={() => handleRoomAction(room.id, 'edit')}>
                  Edit
                </button>
                <button className="btn-view" onClick={() => handleRoomAction(room.id, 'view')}>
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Room Modal */}
      {showAddRoomModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Room</h3>
              <button 
                className="modal-close"
                onClick={() => setShowAddRoomModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Room Number *</label>
                <input
                  type="text"
                  value={newRoom.roomNumber}
                  onChange={(e) => handleNewRoomChange('roomNumber', e.target.value)}
                  placeholder="e.g., 101"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Room Type *</label>
                <select
                  value={newRoom.roomType}
                  onChange={(e) => handleNewRoomChange('roomType', e.target.value)}
                  className="form-input"
                >
                  <option value="Standard">Standard</option>
                  <option value="Deluxe">Deluxe</option>
                  <option value="Suite">Suite</option>
                  <option value="Executive">Executive</option>
                  <option value="Presidential">Presidential</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status *</label>
                <select
                  value={newRoom.status}
                  onChange={(e) => handleNewRoomChange('status', e.target.value)}
                  className="form-input"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Under Maintenance</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
              <div className="form-group">
                <label>Cleanliness *</label>
                <select
                  value={newRoom.cleanliness}
                  onChange={(e) => handleNewRoomChange('cleanliness', e.target.value)}
                  className="form-input"
                >
                  <option value="Clean">Clean</option>
                  <option value="Dirty">Dirty</option>
                  <option value="Cleaning in Progress">Cleaning in Progress</option>
                </select>
              </div>
              <div className="form-group">
                <label>Price per Night *</label>
                <input
                  type="text"
                  value={newRoom.price}
                  onChange={(e) => handleNewRoomChange('price', e.target.value)}
                  placeholder="e.g., 150 or $150"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Amenities</label>
                <div className="amenities-grid">
                  {amenitiesOptions.map((amenity) => (
                    <label key={amenity} className="amenity-checkbox">
                      <input
                        type="checkbox"
                        checked={newRoom.amenities.includes(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                      />
                      <span>{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowAddRoomModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleAddRoom}
              >
                Add Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {showEditRoomModal && editingRoom && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Room {editingRoom.roomNumber}</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowEditRoomModal(false);
                  setEditingRoom(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Room Number *</label>
                <input
                  type="text"
                  value={editingRoom.roomNumber}
                  onChange={(e) => handleEditRoomChange('roomNumber', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Room Type *</label>
                <select
                  value={editingRoom.roomType}
                  onChange={(e) => handleEditRoomChange('roomType', e.target.value)}
                  className="form-input"
                >
                  <option value="Standard">Standard</option>
                  <option value="Deluxe">Deluxe</option>
                  <option value="Suite">Suite</option>
                  <option value="Executive">Executive</option>
                  <option value="Presidential">Presidential</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status *</label>
                <select
                  value={editingRoom.status}
                  onChange={(e) => handleEditRoomChange('status', e.target.value)}
                  className="form-input"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Under Maintenance</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
              <div className="form-group">
                <label>Cleanliness *</label>
                <select
                  value={editingRoom.cleanliness}
                  onChange={(e) => handleEditRoomChange('cleanliness', e.target.value)}
                  className="form-input"
                >
                  <option value="Clean">Clean</option>
                  <option value="Dirty">Dirty</option>
                  <option value="Cleaning in Progress">Cleaning in Progress</option>
                </select>
              </div>
              <div className="form-group">
                <label>Price per Night *</label>
                <input
                  type="text"
                  value={editingRoom.price}
                  onChange={(e) => handleEditRoomChange('price', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Amenities</label>
                <div className="amenities-grid">
                  {amenitiesOptions.map((amenity) => (
                    <label key={amenity} className="amenity-checkbox">
                      <input
                        type="checkbox"
                        checked={editingRoom.amenities.includes(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                      />
                      <span>{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-danger"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this room?')) {
                    handleDeleteRoom(editingRoom.id);
                    setShowEditRoomModal(false);
                    setEditingRoom(null);
                  }
                }}
              >
                Delete Room
              </button>
              <div className="edit-modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setShowEditRoomModal(false);
                    setEditingRoom(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleEditRoom}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderOrdersManagement = () => (
    <div className="orders-content">
      <div className="content-header">
        <h1>Orders</h1>
        <p className="subtitle">Manage all types of orders within the hotel, including room service, restaurant, and guest requests.</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search orders..."
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            className="search-input"
          />
          <button className="search-btn">🔍</button>
        </div>
        
        <div className="filter-controls">
          <div className="filter-group">
            <label>Order Type:</label>
            <select 
              value={orderTypeFilter} 
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="Room Service">Room Service</option>
              <option value="Restaurant">Restaurant</option>
              <option value="Guest Request">Guest Request</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={orderStatusFilter} 
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="New">New</option>
              <option value="Processing">Processing</option>
              <option value="Fulfilled">Fulfilled</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>
          
          <button className="btn-primary">New Order</button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="orders-section">
        <div className="table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Type</th>
                <th>Guest</th>
                <th>Items</th>
                <th>Status</th>
                <th>Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ordersData.map((order, index) => (
                <tr key={index}>
                  <td className="order-id">{order.id}</td>
                  <td className="order-type">
                    <span className={`type-badge ${order.type.replace(' ', '-').toLowerCase()}`}>
                      {order.type}
                    </span>
                  </td>
                  <td className="guest-name">{order.guest}</td>
                  <td className="order-items">{order.items}</td>
                  <td>
                    <span className={`status-badge ${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="timestamp">{order.timestamp}</td>
                  <td>
                    <button className="btn-view">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderStaffManagement = () => (
    <div className="staff-content">
      <div className="content-header">
        <h1>Staff Management</h1>
        <p className="subtitle">Manage your hotel's staff members, including adding new employees, editing existing details, and assigning roles and permissions.</p>
      </div>

      {/* Staff Filter Bar */}
      <div className="search-filter-bar">
        <div className="filter-controls">
          <div className="filter-group">
            <label>Role:</label>
            <select 
              value={staffRoleFilter} 
              onChange={(e) => setStaffRoleFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Roles</option>
              <option value="Receptionist">Receptionist</option>
              <option value="Housekeeping">Housekeeping</option>
              <option value="Chef">Chef</option>
              <option value="Concierge">Concierge</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={staffStatusFilter} 
              onChange={(e) => setStaffStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          
          <button className="btn-primary">Add New Staff Member</button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="staff-section">
        <div className="table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Job Role</th>
                <th>Contact Information</th>
                <th>Employment Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffData.map((staff) => (
                <tr key={staff.id}>
                  <td className="staff-name">{staff.name}</td>
                  <td className="staff-role">{staff.role}</td>
                  <td className="staff-contact">
                    <div>{staff.email}</div>
                    <div className="phone">{staff.phone}</div>
                  </td>
                  <td>
                    <span className={`status-badge ${staff.status.toLowerCase().replace(' ', '-')}`}>
                      {staff.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-view">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

const renderBillingPayments = () => {

    const renderInvoicesTab = () => (
      <div className="tab-content">
        <div className="section-header">
          <h2>Invoice History</h2>
          <div className="section-actions">
            <input type="text" placeholder="Search invoices..." className="search-input" />
            <div style={{display: 'flex', gap: 8}}>
              <button className="btn-secondary" onClick={() => handleExport('all')}>Export All</button>
              <button className="btn-secondary" onClick={() => handleExport('selected')}>Export Selected</button>
            </div>
          </div>
        </div>
        <div className="table-container">
          <table className="data-table invoices-table">
            <thead>
              <tr>
                <th style={{width: '4%'}}><input type="checkbox" onChange={(e) => toggleSelectAll(e.target.checked)} checked={selectedInvoices.size === invoicesData.length} /></th>
                <th>Invoice ID</th>
                <th>Guest Name</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Method</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoicesData.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <input type="checkbox" checked={selectedInvoices.has(invoice.id)} onChange={() => toggleSelectInvoice(invoice.id)} />
                  </td>
                  <td className="id-cell">{invoice.id}</td>
                  <td className="guest-name">{invoice.guest}</td>
                  <td className="amount-cell">{invoice.amount}</td>
                  <td>
                    <span className={`status-badge ${invoice.status.toLowerCase()}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="date-cell">{invoice.date}</td>
                  <td>{invoice.method}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-view" onClick={() => openInvoiceModal(invoice)}>View</button>
                      <button className="btn-secondary" onClick={() => handleDownloadInvoice(invoice)}>Download</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );

    // Toggle select functions
    function toggleSelectInvoice(id) {
      setSelectedInvoices(prev => {
        const copy = new Set(prev);
        if (copy.has(id)) copy.delete(id); else copy.add(id);
        return copy;
      });
    }

    function toggleSelectAll(checked) {
      if (checked) {
        setSelectedInvoices(new Set(invoicesData.map(i => i.id)));
      } else {
        setSelectedInvoices(new Set());
      }
    }

    function openInvoiceModal(invoice) {
      setActiveInvoice(invoice);
      setInvoiceModalOpen(true);
    }

    function closeInvoiceModal() {
      setActiveInvoice(null);
      setInvoiceModalOpen(false);
    }

    function handleDownloadInvoice(invoice) {
      const html = buildInvoiceHTML([invoice]);
      openPrintableWindow(html);
    }

    function handleExport(mode) {
      let list = [];
      if (mode === 'all') list = invoicesData;
      else list = invoicesData.filter(inv => selectedInvoices.has(inv.id));
      if (!list.length) {
        alert('No invoices selected to export');
        return;
      }
      const html = buildInvoiceHTML(list, true);
      openPrintableWindow(html);
    }

    function buildInvoiceHTML(list, includeSummary = false) {
      const rows = list.map(inv => `
        <tr>
          <td>${inv.id}</td>
          <td>${inv.guest}</td>
          <td>${inv.amount}</td>
          <td>${inv.status}</td>
          <td>${inv.date}</td>
          <td>${inv.method}</td>
        </tr>
      `).join('');
      const summary = includeSummary ? `<p>Total: ${list.length} invoice(s)</p>` : '';
      return `
        <html>
          <head>
            <title>Invoices Export</title>
            <style>
              body {font-family: Arial, sans-serif; padding:20px}
              table {width:100%; border-collapse: collapse}
              th,td {padding:8px; border:1px solid #ddd; text-align:left}
              th {background:#f4f6f8}
            </style>
          </head>
          <body>
            <h2>Invoices Export</h2>
            ${summary}
            <table>
              <thead>
                <tr><th>Invoice ID</th><th>Guest</th><th>Amount</th><th>Status</th><th>Date</th><th>Method</th></tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </body>
        </html>
      `;
    }

    function openPrintableWindow(html) {
      const w = window.open('', '_blank');
      if (!w) {
        alert('Popup blocked. Please allow popups to download or print.');
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      // give it a moment to render then call print
      setTimeout(() => {
        try {
          w.focus();
          w.print();
        } catch (e) {
          console.warn('Print failed', e);
        }
      }, 500);
    }

    async function shareInvoice(invoice) {
      const html = buildInvoiceHTML([invoice]);
      const blob = new Blob([html], { type: 'text/html' });
      try {
        // Try to share as a file (supported on some mobile/modern browsers)
        if (navigator.canShare && navigator.canShare({ files: [] })) {
          const file = new File([blob], `${invoice.id}.html`, { type: 'text/html' });
          await navigator.share({ files: [file], title: `Invoice ${invoice.id}`, text: `Invoice ${invoice.id} for ${invoice.guest}` });
          return;
        }

        // Fallback to Web Share text
        if (navigator.share) {
          await navigator.share({ title: `Invoice ${invoice.id}`, text: `Invoice ${invoice.id} for ${invoice.guest}\nAmount: ${invoice.amount}` });
          return;
        }

        // Final fallback: open printable window so user can Save as PDF or manually share
        openPrintableWindow(html);
      } catch (err) {
        console.warn('Share failed, falling back to download', err);
        openPrintableWindow(html);
      }
    }

    const renderTransactionsTab = () => (
      <div className="tab-content">
        <div className="section-header">
          <h2>Transaction Log</h2>
          <div className="section-actions">
            <input type="text" placeholder="Search transactions..." className="search-input" />
            <button className="btn-secondary">Filter</button>
          </div>
        </div>
        <div className="table-container">
          <table className="data-table transactions-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {transactionsData.map((trx) => (
                <tr key={trx.id}>
                  <td className="id-cell">{trx.id}</td>
                  <td>{trx.type}</td>
                  <td className="amount-cell">{trx.amount}</td>
                  <td>
                    <span className={`status-badge ${trx.status.toLowerCase()}`}>
                      {trx.status}
                    </span>
                  </td>
                  <td className="date-cell">{trx.date}</td>
                  <td>{trx.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );

    const renderPaymentMethodsTab = () => (
      <div className="tab-content">
        <div className="section-header">
          <h2>Payment Method Overview</h2>
          <p className="subtitle">Breakdown of revenue by payment type.</p>
        </div>
        <div className="table-container">
          <table className="data-table methods-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Transactions Count</th>
                <th>Total Revenue</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paymentMethodsData.map((method) => (
                <tr key={method.method}>
                  <td>{method.method}</td>
                  <td>{method.count}</td>
                  <td className="amount-cell">{method.revenue}</td>
                  <td>
                    <button className="btn-view">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="payment-chart-placeholder mt-20">
            {/* Placeholder for a chart or visualization of payment distribution */}
            <h3>Payment Distribution Chart Placeholder</h3>
            <div className="chart-info">
              <p>A pie or bar chart would be placed here to visually show the percentage breakdown of revenue by method.</p>
            </div>
        </div>
      </div>
    );

    const renderTabContent = () => {
      switch (billingActiveTab) {
        case 'invoices':
          return renderInvoicesTab();
        case 'transactions':
          return renderTransactionsTab();
        case 'methods':
          return renderPaymentMethodsTab();
        default:
          return renderInvoicesTab();
      }
    };  
    return (
      <div className="billing-payments-content">
        <div className="content-header">
          <h1>Billing & Payments</h1>
          <p className="subtitle">Manage all financial transactions and payment records.</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card revenue">
            <div className="stat-icon">📈</div>
            <div className="stat-info">
              <h3>Total Revenue (YTD)</h3>
              <div className="stat-number">{billingStats.totalRevenue}</div>
            </div>
          </div>

          <div className="stat-card pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <h3>Pending Payments</h3>
              <div className="stat-number">{billingStats.pendingPayments}</div>
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <h3>Successful Payments Rate</h3>
              <div className="stat-number">{billingStats.successfulPayments}%</div>
            </div>
          </div>
        </div>
        
        {/* Tabbed Interface */}
        <div className="billing-tabs-container">
          <div className="billing-tabs">
            <button
              className={`tab-btn ${billingActiveTab === 'invoices' ? 'active' : ''}`}
              onClick={() => setBillingActiveTab('invoices')}
            >
              Invoices
            </button>
            <button
              className={`tab-btn ${billingActiveTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setBillingActiveTab('transactions')}
            >
              Transactions
            </button>
            <button
              className={`tab-btn ${billingActiveTab === 'methods' ? 'active' : ''}`}
              onClick={() => setBillingActiveTab('methods')}
            >
              Payment Methods
            </button>
          </div>
          <div className="tab-content-wrapper">
            {renderTabContent()}
          </div>
        </div>

        {/* Invoice Details Modal (print/download/share) */}
        {invoiceModalOpen && activeInvoice && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Payment Details - {activeInvoice.id}</h3>
                <button className="modal-close" onClick={() => closeInvoiceModal()}>×</button>
              </div>
              <div className="modal-content">
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                  <div>
                    <p><strong>Guest:</strong> {activeInvoice.guest}</p>
                    <p><strong>Amount:</strong> {activeInvoice.amount}</p>
                    <p><strong>Status:</strong> {activeInvoice.status}</p>
                  </div>
                  <div>
                    <p><strong>Date:</strong> {activeInvoice.date}</p>
                    <p><strong>Method:</strong> {activeInvoice.method}</p>
                    <p><strong>Invoice ID:</strong> {activeInvoice.id}</p>
                  </div>
                </div>
                <hr />
                <p>Additional payment breakdown and charges can appear here.</p>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => handleDownloadInvoice(activeInvoice)}>Download</button>
                <button className="btn-secondary" onClick={() => handleExport('selected')}>Export Selected</button>
                <button className="btn-primary" onClick={() => shareInvoice(activeInvoice)}>Share</button>
                <button className="btn-secondary" onClick={() => closeInvoiceModal()}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

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
              type="button"
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

export default HoteladminDashboard;