import React, { useState, useEffect } from 'react';
import { useStaffAuth } from '../../../../core/context/StaffAuthContext';
import { getTables, createTable, updateTable, deleteTable, updateTableStatus } from '../services/tableApi';
import { getMenuItems, getMenuCategories } from '../services/menuApi';
import './RestaurantManagement.css';

const RestaurantManagement = ({ embedded = false }) => {
  const { activeProperty } = useStaffAuth();
  const [activeSection, setActiveSection] = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
    return hash || 'restaurant';
  });
  const [activeRestaurantTab, setActiveRestaurantTab] = useState('tables');
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableModalMode, setTableModalMode] = useState('create');
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableFormData, setTableFormData] = useState({
    tableNumber: '',
    tableName: '',
    capacity: 4,
    location: 'indoor',
    description: '',
    minSpend: 0,
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

  // Fetch tables when component mounts or tab changes
  useEffect(() => {
    if (hotelId && activeSection === 'restaurant' && activeRestaurantTab === 'tables') {
      fetchTables();
    }
  }, [hotelId, activeSection, activeRestaurantTab]);

  // Fetch menu items when menu tab is active
  useEffect(() => {
    if (hotelId && activeSection === 'restaurant' && activeRestaurantTab === 'menu') {
      fetchMenuItems();
      fetchMenuCategories();
    }
  }, [hotelId, activeSection, activeRestaurantTab]);

  const fetchTables = async () => {
    if (!hotelId) {
      setError('No hotel selected');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getTables({ hotelId });
      setTables(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    if (!hotelId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await getMenuItems({ hotelId, available: 'all' });
      setMenuItems(response.data.menuItems || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch menu items');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuCategories = async () => {
    try {
      const response = await getMenuCategories();
      setMenuCategories(response.data.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  // Handle navigation click
  const handleNavigation = (sectionId) => {
    setActiveSection(sectionId);
    try {
      if (typeof window !== 'undefined') window.location.hash = `#${sectionId}`;
    } catch {
      // no-op
    }
  };

  // Listen for hash changes
  useEffect(() => {
    const onHashChange = () => {
      const newHash = window.location.hash.replace('#', '') || 'restaurant';
      setActiveSection(newHash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Handle restaurant tab click
  const handleRestaurantTabClick = (tab) => {
    setActiveRestaurantTab(tab);
  };

  // Table CRUD operations
  const handleAddTable = () => {
    setTableModalMode('create');
    setSelectedTable(null);
    setTableFormData({
      tableNumber: '',
      tableName: '',
      capacity: 4,
      location: 'indoor',
      description: '',
      minSpend: 0,
      status: 'available'
    });
    setShowTableModal(true);
  };

  const handleEditTable = (table) => {
    setTableModalMode('edit');
    setSelectedTable(table);
    setTableFormData({
      tableNumber: table.tableNumber || '',
      tableName: table.tableName || '',
      capacity: table.capacity || 4,
      location: table.location || 'indoor',
      description: table.description || '',
      minSpend: table.minSpend || 0,
      status: table.status || 'available'
    });
    setShowTableModal(true);
  };

  const handleTableInputChange = (e) => {
    const { name, value } = e.target;
    setTableFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTableSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (tableModalMode === 'create') {
        await createTable({ ...tableFormData, hotelId });
      } else {
        await updateTable(selectedTable._id, tableFormData);
      }
      setShowTableModal(false);
      fetchTables();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${tableModalMode} table`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (tableId, tableNumber) => {
    if (!window.confirm(`Are you sure you want to delete table ${tableNumber}?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await deleteTable(tableId);
      fetchTables();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete table');
    } finally {
      setLoading(false);
    }
  };

  const handleTableStatusChange = async (tableId, newStatus) => {
    setLoading(true);
    setError(null);
    try {
      await updateTableStatus(tableId, newStatus);
      fetchTables();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update table status');
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
        return <div className="page-content">Rooms Management</div>;
      case 'restaurant':
        return renderRestaurantManagement();
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
        return renderRestaurantManagement();
    }
  };

  const renderRestaurantManagement = () => (
    <div className="restaurant-content">
      <div className="content-header">
        <h1>Restaurant Management</h1>
        <p className="subtitle">Manage your restaurant tables and menu.</p>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Restaurant Tabs */}
      <div className="restaurant-tabs">
        <button
          className={`restaurant-tab ${activeRestaurantTab === 'tables' ? 'active' : ''}`}
          onClick={() => handleRestaurantTabClick('tables')}
        >
          Table Management
        </button>
        <button
          className={`restaurant-tab ${activeRestaurantTab === 'menu' ? 'active' : ''}`}
          onClick={() => handleRestaurantTabClick('menu')}
        >
          Menu Items
        </button>
        <button
          className={`restaurant-tab ${activeRestaurantTab === 'kitchen' ? 'active' : ''}`}
          onClick={() => handleRestaurantTabClick('kitchen')}
        >
          Kitchen View
        </button>
      </div>

      {/* Restaurant Content based on active tab */}
      <div className="restaurant-tab-content">
        {activeRestaurantTab === 'tables' && renderTablesManagement()}
        {activeRestaurantTab === 'menu' && renderMenuView()}
        {activeRestaurantTab === 'kitchen' && renderKitchenView()}
      </div>
    </div>
  );

  const renderTablesManagement = () => (
    <div className="tables-section">
      <div className="section-header">
        <h2>Table Layout</h2>
        <div className="section-actions">
          <button className="btn-secondary" onClick={fetchTables}>Refresh</button>
          <button className="btn-primary" onClick={handleAddTable}>Add Table</button>
        </div>
      </div>

      {loading && <div className="loading-spinner">Loading tables...</div>}

      <div className="table-layout">
        {tables.length === 0 && !loading ? (
          <div className="empty-state">No tables found. Add your first table to get started.</div>
        ) : (
          tables.map((table) => (
            <div key={table._id} className={`table-card ${table.status}`}>
              <div className="table-header">
                <h4>Table {table.tableNumber}</h4>
                <span className={`status-badge ${table.status}`}>
                  {table.status === 'available' && 'Available'}
                  {table.status === 'occupied' && 'Occupied'}
                  {table.status === 'reserved' && 'Reserved'}
                  {table.status === 'maintenance' && 'Maintenance'}
                </span>
              </div>
              <div className="table-details">
                <div className="detail-item">
                  <span className="label">Name:</span>
                  <span className="value">{table.tableName}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Capacity:</span>
                  <span className="value">{table.capacity} guests</span>
                </div>
                <div className="detail-item">
                  <span className="label">Location:</span>
                  <span className="value">{table.location}</span>
                </div>
              </div>
              <div className="table-actions">
                <button
                  className="btn-edit"
                  onClick={() => handleEditTable(table)}
                >
                  Edit
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteTable(table._id, table.tableNumber)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderMenuView = () => (
    <div className="menu-section">
      <div className="section-header">
        <h2>Menu Items</h2>
        <div className="section-actions">
          <button className="btn-secondary" onClick={fetchMenuItems}>Refresh</button>
          <button className="btn-primary">Add Menu Item</button>
        </div>
      </div>

      {loading && <div className="loading-spinner">Loading menu items...</div>}

      <div className="menu-content">
        {menuItems.length === 0 && !loading ? (
          <div className="empty-state">No menu items found. Add your first menu item to get started.</div>
        ) : (
          <div className="menu-grid">
            {menuItems.map((item) => (
              <div key={item._id} className="menu-item-card">
                <div className="menu-item-header">
                  <h4>{item.name}</h4>
                  <span className={`availability-badge ${item.isAvailable ? 'available' : 'unavailable'}`}>
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="menu-item-details">
                  <p className="category">{item.category}</p>
                  <p className="price">NPR {item.price}</p>
                  {item.description && <p className="description">{item.description}</p>}
                </div>
                <div className="menu-item-actions">
                  <button className="btn-edit">Edit</button>
                  <button className="btn-delete">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderKitchenView = () => (
    <div className="kitchen-section">
      <div className="section-header">
        <h2>Kitchen Order View</h2>
        <div className="section-actions">
          <button className="btn-secondary">Refresh</button>
          <button className="btn-primary">Print Orders</button>
        </div>
      </div>
      <div className="kitchen-content">
        <p>Kitchen orders will appear here. This feature will be implemented in Order Management.</p>
      </div>
    </div>
  );

  if (embedded) return renderRestaurantManagement();

  return (
    <div className="restaurant-management">
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

      {/* Table Modal */}
      {showTableModal && (
        <div className="modal-overlay" onClick={() => setShowTableModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{tableModalMode === 'create' ? 'Add New Table' : 'Edit Table'}</h2>
              <button className="modal-close" onClick={() => setShowTableModal(false)}>✕</button>
            </div>
            <form onSubmit={handleTableSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Table Number *</label>
                  <input
                    type="text"
                    name="tableNumber"
                    value={tableFormData.tableNumber}
                    onChange={handleTableInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Table Name *</label>
                  <input
                    type="text"
                    name="tableName"
                    value={tableFormData.tableName}
                    onChange={handleTableInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Capacity *</label>
                  <input
                    type="number"
                    name="capacity"
                    value={tableFormData.capacity}
                    onChange={handleTableInputChange}
                    required
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <select
                    name="location"
                    value={tableFormData.location}
                    onChange={handleTableInputChange}
                  >
                    <option value="indoor">Indoor</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="terrace">Terrace</option>
                    <option value="garden">Garden</option>
                    <option value="poolside">Poolside</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={tableFormData.status}
                    onChange={handleTableInputChange}
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Minimum Spend (NPR)</label>
                  <input
                    type="number"
                    name="minSpend"
                    value={tableFormData.minSpend}
                    onChange={handleTableInputChange}
                    min="0"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={tableFormData.description}
                    onChange={handleTableInputChange}
                    rows="3"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowTableModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : tableModalMode === 'create' ? 'Create Table' : 'Update Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantManagement;
