import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './HoteladminDashboard.css';
import RestaurantManagement from './RestaurantManagement';

// Empty State Component
const EmptyState = ({ icon, title, description, actionLabel, onAction }) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon}</div>
    <h3 className="empty-state-title">{title}</h3>
    <p className="empty-state-description">{description}</p>
    {actionLabel && onAction && (
      <button className="btn-primary" onClick={onAction}>
        {actionLabel}
      </button>
    )}
  </div>
);

// Loading Spinner Component
const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p className="loading-message">{message}</p>
  </div>
);

const HoteladminDashboard = () => {
  const [activeSection, setActiveSection] = useState(() => {
    // Initialize from URL hash so direct links work
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
    return hash || 'dashboard';
  });
  
  // Dark mode state with localStorage persistence
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('hoteladmin-dark-mode');
    return saved ? JSON.parse(saved) : false;
  });

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('hoteladmin-dark-mode', JSON.stringify(newMode));
      return newMode;
    });
  };
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


  // Updated top selling items with proper names
  const topSellingItems = [
    'Fresh Item',
    'Poticon Item', 
    'Stanffard Item',
    'Vanituraaf Item',
    'Cithamer Item',
    'Wowbang Item',
    'Premium Item'
  ];
  
  // Recent bookings data for the new design
  const recentBookings = [
    { bookingId: '3007-26173330', guestName: 'Danaorae Sharnat', roomType: 'Deluxe Suite', status: 'Confirmed', lastUpdate: '19 minutes ago' },
    { bookingId: '3007-20100090', guestName: 'Both Vakery', roomType: 'Standard Room', status: 'Completed', lastUpdate: '10 hours ago' },
    { bookingId: '3007-17000000', guestName: 'Panny Ranala', roomType: 'Premium Suite', status: 'Pending', lastUpdate: '10 hours ago' },
    { bookingId: '3007-15234567', guestName: 'John Smith', roomType: 'Executive Room', status: 'Confirmed', lastUpdate: '1 day ago' },
    { bookingId: '3007-14987654', guestName: 'Sarah Johnson', roomType: 'Deluxe Suite', status: 'Cancelled', lastUpdate: '2 days ago' },
    { bookingId: '3007-13456789', guestName: 'Mike Wilson', roomType: 'Standard Room', status: 'Completed', lastUpdate: '3 days ago' },
    { bookingId: '3007-12345678', guestName: 'Emily Davis', roomType: 'Premium Suite', status: 'Pending', lastUpdate: '4 days ago' },
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

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showAddRoomModal) {
          setShowAddRoomModal(false);
        }
        if (showEditRoomModal) {
          setShowEditRoomModal(false);
          setEditingRoom(null);
        }
        if (invoiceModalOpen) {
          setInvoiceModalOpen(false);
          setActiveInvoice(null);
        }
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAddRoomModal, showEditRoomModal, invoiceModalOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showAddRoomModal || showEditRoomModal || invoiceModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddRoomModal, showEditRoomModal, invoiceModalOpen]);

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
        toast.error('Room number already exists! Please use a different room number.');
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
      toast.success('Room added successfully!');
    } else {
      toast.error('Please fill in all required fields');
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
      toast.success('Room updated successfully!');
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  // Handle delete room
  const handleDeleteRoom = (roomId) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      setRoomsData(roomsData.filter(room => room.id !== roomId));
      toast.success('Room deleted successfully!');
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
    <div style={{marginLeft: "20px", padding: "24px 32px 48px 32px"}} className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Dashboard Header */}
      <div style={{marginBottom: "32px"}} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div style={{gap: "16px"}} className="flex items-center">
          <button style={{padding: "10px"}} className="rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm border border-gray-200 dark:border-gray-700">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button style={{padding: "10px"}} className="rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm border border-gray-200 dark:border-gray-700 relative">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">3</span>
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
            H
          </div>
        </div>
      </div>

      {/* Stats Cards - 4 columns */}
      <div style={{gap: "24px", marginBottom: "32px"}} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Rooms */}
        <div 
          style={{padding: "24px"}}
          className="bg-white dark:bg-gray-800 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-gray-100 dark:border-gray-700 group"
          onClick={() => handleNavigation('rooms')}
          role="button"
          tabIndex={0}
        >
          <div style={{marginBottom: "16px"}} className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span style={{padding: "4px 10px"}} className="text-xs font-medium text-green-500 bg-green-50 dark:bg-green-900/30 rounded-full">+12%</span>
          </div>
          <div style={{marginBottom: "4px"}} className="text-3xl font-bold text-gray-900 dark:text-white">{roomStats.total}</div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Total Rooms</span>
        </div>

        {/* Active Orders */}
        <div 
          style={{padding: "24px"}}
          className="bg-white dark:bg-gray-800 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-gray-100 dark:border-gray-700 group"
          onClick={() => handleNavigation('orders')}
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <span className="text-xs font-medium text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full">Active</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{ordersData.filter(o => o.status !== 'Fulfilled').length}</div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Active Orders</span>
        </div>

        {/* Today's Revenue */}
        <div 
          style={{padding: "24px"}}
          className="bg-white dark:bg-gray-800 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-gray-100 dark:border-gray-700 group"
          onClick={() => handleNavigation('billing')}
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-green-500 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full">+8.2%</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{billingStats.totalRevenue}</div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Today's Revenue</span>
        </div>

        {/* Loyalty Points */}
        <div 
          style={{padding: "24px"}}
          className="bg-white dark:bg-gray-800 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-gray-100 dark:border-gray-700 group"
          onClick={() => handleNavigation('loyalty')}
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full">Premium</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">300</div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Loyalty Points</span>
        </div>
      </div>

      {/* Analytics Section - 3 columns */}
      <div style={{marginTop: "20px", gap: "24px", marginBottom: "32px"}} className="grid grid-cols-1 lg:grid-cols-3">
        {/* Sales Analytics */}
        <div style={{padding: "24px"}} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Sales Analytics</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Weekly overview</p>
            </div>
            <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">Rs. 12,50,000</span>
            <span className="text-sm text-emerald-500 font-semibold flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              +15%
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Compared to last week</p>
          {/* Line Chart */}
          <div className="h-32 mt-4">
            <svg viewBox="0 0 300 100" className="w-full h-full">
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,80 Q30,70 60,50 T120,40 T180,60 T240,30 T300,45"
                fill="none"
                stroke="rgb(99, 102, 241)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M0,80 Q30,70 60,50 T120,40 T180,60 T240,30 T300,45 L300,100 L0,100 Z"
                fill="url(#chartGradient)"
              />
            </svg>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>
          </div>
        </div>

        {/* Order Status */}
        <div style={{padding: "24px"}} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div style={{marginBottom: "24px"}} className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Order Status</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Current distribution</p>
            </div>
            <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
          <div style={{display: "flex", flexDirection: "column", gap: "20px"}}>
            {/* Pending */}
            <div>
              <div style={{marginBottom: "8px"}} className="flex items-center justify-between">
                <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">30%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{width: '30%'}}></div>
              </div>
            </div>
            
            {/* Completed */}
            <div>
              <div style={{marginBottom: "8px"}} className="flex items-center justify-between">
                <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">50%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{width: '50%'}}></div>
              </div>
            </div>
            
            {/* Canceled */}
            <div>
              <div style={{marginBottom: "8px"}} className="flex items-center justify-between">
                <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Canceled</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">20%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{width: '20%'}}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Selling Items */}
        <div style={{padding: "24px", display: "flex", flexDirection: "column"}} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div style={{marginBottom: "16px"}} className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Top Selling Items</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Best performers</p>
            </div>
          </div>
          <div style={{display: "flex", flexDirection: "column", gap: "12px", maxHeight: "220px", overflowY: "auto", paddingRight: "8px"}}>
            {topSellingItems.map((item, index) => (
              <div key={index} style={{padding: "12px", display: "flex", alignItems: "center", gap: "16px"}} className="rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                <span className="w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-xs font-bold shadow-sm">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item}</span>
                <span className="ml-auto text-xs text-gray-500">#{index + 1} selling</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div style={{marginTop: "20px", marginBottom: "24px"}} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div style={{padding: "24px"}} className="border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Bookings</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Latest booking activities</p>
          </div>
          <button className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1">
            View All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div style={{maxHeight: "350px", overflowY: "auto"}} className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th style={{padding: "16px 24px"}} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Booking ID</th>
                <th style={{padding: "16px 24px"}} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Guest Name</th>
                <th style={{padding: "16px 24px"}} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Room Type</th>
                <th style={{padding: "16px 24px"}} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th style={{padding: "16px 24px"}} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Update</th>
                <th style={{padding: "16px 24px"}}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentBookings.map((booking, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td style={{padding: "16px 24px"}}>
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{booking.bookingId}</span>
                  </td>
                  <td style={{padding: "16px 24px"}}>
                    <div style={{gap: "12px"}} className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {booking.guestName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{booking.guestName}</span>
                    </div>
                  </td>
                  <td style={{padding: "16px 24px"}} className="text-sm text-gray-600 dark:text-gray-400">{booking.roomType}</td>
                  <td style={{padding: "16px 24px"}}>
                    <span 
                      style={{padding: "6px 12px"}}
                      className={`rounded-lg text-xs font-semibold
                        ${booking.status === 'Confirmed' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' : ''}
                        ${booking.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : ''}
                        ${booking.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : ''}
                        ${booking.status === 'Cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : ''}
                      `}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td style={{padding: "16px 24px"}} className="text-sm text-gray-500 dark:text-gray-400">{booking.lastUpdate}</td>
                  <td style={{padding: "16px 24px"}}>
                    <button style={{padding: "8px"}} className="rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Table Footer */}
        <div style={{padding: "16px 24px"}} className="border-t border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-700/30">
          <span className="text-sm text-gray-500 dark:text-gray-400">Showing 7 of 24 bookings</span>
          <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
            <button style={{padding: "6px 12px"}} className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">Previous</button>
            <button style={{padding: "6px 12px"}} className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">Next</button>
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
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data-cell">
                    <EmptyState
                      icon="🛏️"
                      title={roomFilter === 'all' ? "No Rooms Found" : `No ${roomFilter.charAt(0).toUpperCase() + roomFilter.slice(1)} Rooms`}
                      description={roomFilter === 'all' 
                        ? "You haven't added any rooms yet. Add your first room to get started."
                        : `There are currently no ${roomFilter} rooms.`}
                      actionLabel={roomFilter === 'all' ? "Add First Room" : null}
                      onAction={roomFilter === 'all' ? () => setShowAddRoomModal(true) : null}
                    />
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => (
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
                          aria-label={`Edit room ${room.roomNumber}`}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn-view"
                          onClick={() => handleRoomAction(room.id, 'view')}
                          aria-label={`View room ${room.roomNumber} details`}
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

        {/* Mobile Cards View for smaller screens */}
        <div className="mobile-rooms-cards">
          {filteredRooms.length === 0 ? (
            <EmptyState
              icon="🛏️"
              title={roomFilter === 'all' ? "No Rooms Found" : `No ${roomFilter.charAt(0).toUpperCase() + roomFilter.slice(1)} Rooms`}
              description={roomFilter === 'all' 
                ? "You haven't added any rooms yet. Add your first room to get started."
                : `There are currently no ${roomFilter} rooms.`}
              actionLabel={roomFilter === 'all' ? "Add First Room" : null}
              onAction={roomFilter === 'all' ? () => setShowAddRoomModal(true) : null}
            />
          ) : (
            filteredRooms.map((room) => (
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
                    {room.amenities.join(', ') || 'None'}
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
            ))
          )}
        </div>
      </div>

      {/* Add Room Modal */}
      {showAddRoomModal && (
        <div 
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowAddRoomModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-room-title"
        >
          <div className="modal" role="document">
            <div className="modal-header">
              <h3 id="add-room-title">Add New Room</h3>
              <button 
                className="modal-close"
                onClick={() => setShowAddRoomModal(false)}
                aria-label="Close modal"
                type="button"
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label htmlFor="room-number">Room Number *</label>
                <input
                  id="room-number"
                  type="text"
                  value={newRoom.roomNumber}
                  onChange={(e) => handleNewRoomChange('roomNumber', e.target.value)}
                  placeholder="e.g., 101"
                  className="form-input"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="room-type">Room Type *</label>
                <select
                  id="room-type"
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
        <div 
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditRoomModal(false);
              setEditingRoom(null);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-room-title"
        >
          <div className="modal" role="document">
            <div className="modal-header">
              <h3 id="edit-room-title">Edit Room {editingRoom.roomNumber}</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowEditRoomModal(false);
                  setEditingRoom(null);
                }}
                aria-label="Close modal"
                type="button"
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label htmlFor="edit-room-number">Room Number *</label>
                <input
                  id="edit-room-number"
                  type="text"
                  value={editingRoom.roomNumber}
                  onChange={(e) => handleEditRoomChange('roomNumber', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-room-type">Room Type *</label>
                <select
                  id="edit-room-type"
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
    <div className={`hotel-dashboard ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="admin-info">
            <h2>Hotel Admin</h2>
            <p className="admin-role">Hotel Admin</p>
          </div>
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="theme-toggle-btn"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
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