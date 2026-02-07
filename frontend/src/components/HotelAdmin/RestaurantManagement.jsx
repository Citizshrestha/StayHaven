import React, { useState, useEffect } from 'react';
import './RestaurantManagement.css';

const RestaurantManagement = ({ embedded = false }) => {
  const [activeSection, setActiveSection] = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
    return hash || 'restaurant';
  });
  const [activeRestaurantTab, setActiveRestaurantTab] = useState('tables');

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

  // Tables data (stateful)
  const _initialTables = [
    { id: 1, status: 'available', order: null },
    { id: 2, status: 'occupied', order: '#123' },
    { id: 3, status: 'reserved', order: null },
    { id: 4, status: 'available', order: null },
    { id: 5, status: 'occupied', order: '#124' },
    { id: 6, status: 'available', order: null },
    { id: 7, status: 'reserved', order: null },
    { id: 8, status: 'occupied', order: '#125' },
    { id: 9, status: 'available', order: null },
  ];
  const [tablesData, setTablesData] = useState(_initialTables);

  // Simple add/edit/view/assign handlers (prompt-based UI)
  const handleAddTablePrompt = () => {
    const order = window.prompt('Optional: enter initial order number for the new table (leave empty for none)');
    const nextId = tablesData.length ? Math.max(...tablesData.map(t => t.id)) + 1 : 1;
    const newTable = { id: nextId, status: order ? 'occupied' : 'available', order: order || null };
    setTablesData(prev => [...prev, newTable]);
  };

  const handleEditTablePrompt = (tableId) => {
    const t = tablesData.find(x => x.id === tableId);
    if (!t) return;
    const status = window.prompt('Set status (available / occupied / reserved)', t.status) || t.status;
    const order = window.prompt('Order number (empty to clear)', t.order || '') || null;
    setTablesData(prev => prev.map(x => x.id === tableId ? { ...x, status, order: order || null } : x));
  };

  const handleAssignTable = (tableId) => {
    const order = window.prompt('Enter order number to assign to table:');
    if (!order) return;
    setTablesData(prev => prev.map(x => x.id === tableId ? { ...x, status: 'occupied', order } : x));
  };

  const handleViewTable = (tableId) => {
    const t = tablesData.find(x => x.id === tableId);
    if (!t) return;
    alert(`Table ${t.id}\nStatus: ${t.status}\nOrder: ${t.order || '—'}`);
  };

  const handleDeleteTable = (tableId) => {
    if (!window.confirm('Delete this table?')) return;
    setTablesData(prev => prev.filter(x => x.id !== tableId));
  };

  // Takeaway orders data
  const takeawayOrders = [
    { orderNumber: '78901', guestName: 'Emma Johnson', orderTime: '12:30 PM', status: 'Pending' },
    { orderNumber: '23456', guestName: 'Lucas Williams', orderTime: '11:45 PM', status: 'Cooking' },
    { orderNumber: '89902', guestName: 'Chloe Brown', orderTime: '2:00 PM', status: 'Ready' },
    { orderNumber: '34567', guestName: 'Owen Davis', orderTime: '2:45 PM', status: 'Pickup' },
    { orderNumber: '90123', guestName: 'Lily Wilson', orderTime: '3:30 PM', status: 'Pending' },
  ];

  // Handle navigation click - keep navigation via URL hash so parent/other pages stay in sync
  const handleNavigation = (sectionId) => {
    setActiveSection(sectionId);
    try {
      if (typeof window !== 'undefined') window.location.hash = `#${sectionId}`;
    } catch (e) {}
    console.log(`Navigating to: ${sectionId}`);
  };

  // Listen for hash changes so clicking back/forward or external links update this view
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
    console.log(`Restaurant tab: ${tab}`);
  };

  // Handle table action
  const handleTableAction = (tableId, action) => {
    if (action === 'edit') return handleEditTablePrompt(tableId);
    if (action === 'assign') return handleAssignTable(tableId);
    if (action === 'view') return handleViewTable(tableId);
    if (action === 'delete') return handleDeleteTable(tableId);
    console.log(`${action} clicked for table ${tableId}`);
  };

  // Handle order action
  const handleOrderAction = (orderNumber, action) => {
    console.log(`${action} clicked for order ${orderNumber}`);
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
        <h1>Restaurant (Tables & Takeaway) Management</h1>
        <p className="subtitle">Manage your restaurant tables, takeaway orders, and menu.</p>
      </div>

      {/* Restaurant Tabs */}
      <div className="restaurant-tabs">
        <button 
          className={`restaurant-tab ${activeRestaurantTab === 'tables' ? 'active' : ''}`}
          onClick={() => handleRestaurantTabClick('tables')}
        >
          Table Management
        </button>
        <button 
          className={`restaurant-tab ${activeRestaurantTab === 'takeaway' ? 'active' : ''}`}
          onClick={() => handleRestaurantTabClick('takeaway')}
        >
          Takeaway Orders
        </button>
        <button 
          className={`restaurant-tab ${activeRestaurantTab === 'menu' ? 'active' : ''}`}
          onClick={() => handleRestaurantTabClick('menu')}
        >
          View Menu
        </button>
        <button 
          className={`restaurant-tab ${activeRestaurantTab === 'kitchen' ? 'active' : ''}`}
          onClick={() => handleRestaurantTabClick('kitchen')}
        >
          Kitchen Order View
        </button>
      </div>

      {/* Restaurant Content based on active tab */}
      <div className="restaurant-tab-content">
        {activeRestaurantTab === 'tables' && renderTablesManagement()}
        {activeRestaurantTab === 'takeaway' && renderTakeawayOrders()}
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
          <button className="btn-secondary" onClick={() => { /* simple refresh placeholder */ window.location.reload(); }}>Refresh</button>
          <button className="btn-primary" onClick={handleAddTablePrompt}>Add Table</button>
        </div>
      </div>

      <div className="table-layout">
        {tablesData.map((table) => (
          <div key={table.id} className={`table-card ${table.status}`}>
            <div className="table-header">
              <h4>Table {table.id}</h4>
              <span className={`status-badge ${table.status}`}>
                {table.status === 'available' && 'Available'}
                {table.status === 'occupied' && 'Occupied'}
                {table.status === 'reserved' && 'Reserved'}
              </span>
            </div>
            <div className="table-details">
              {table.status === 'occupied' && (
                <div className="order-info">
                  <span className="label">Order:</span>
                  <span className="value">{table.order}</span>
                </div>
              )}
              {table.status === 'reserved' && (
                <div className="reservation-info">
                  <span className="label">Reserved</span>
                </div>
              )}
              {table.status === 'available' && (
                <div className="availability-info">
                  <span className="label">Ready for Service</span>
                </div>
              )}
            </div>
            <div className="table-actions">
              <button 
                className="btn-edit"
                onClick={() => handleTableAction(table.id, 'edit')}
              >
                Edit
              </button>
              {table.status === 'available' && (
                <button 
                  className="btn-primary"
                  onClick={() => handleTableAction(table.id, 'assign')}
                >
                  Assign
                </button>
              )}
              {table.status === 'occupied' && (
                <button 
                  className="btn-view"
                  onClick={() => handleTableAction(table.id, 'view')}
                >
                  View Order
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTakeawayOrders = () => (
    <div className="takeaway-section">
      <div className="section-header">
        <h2>Takeaway Orders</h2>
        <div className="section-actions">
          <button className="btn-secondary">Refresh</button>
          <button className="btn-primary">New Order</button>
        </div>
      </div>

      <div className="table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Guest Name</th>
              <th>Order Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {takeawayOrders.map((order) => (
              <tr key={order.orderNumber}>
                <td className="order-number">{order.orderNumber}</td>
                <td className="guest-name">{order.guestName}</td>
                <td className="order-time">{order.orderTime}</td>
                <td>
                  <span className={`status-badge ${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-edit"
                      onClick={() => handleOrderAction(order.orderNumber, 'edit')}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn-view"
                      onClick={() => handleOrderAction(order.orderNumber, 'view')}
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
      <div className="mobile-orders-cards">
        {takeawayOrders.map((order) => (
          <div key={order.orderNumber} className="order-card">
            <div className="order-card-header">
              <h4>Order #{order.orderNumber}</h4>
              <span className={`status-badge ${order.status.toLowerCase()}`}>
                {order.status}
              </span>
            </div>
            <div className="order-card-details">
              <div className="detail-item">
                <span className="label">Guest:</span>
                <span className="value">{order.guestName}</span>
              </div>
              <div className="detail-item">
                <span className="label">Time:</span>
                <span className="value">{order.orderTime}</span>
              </div>
            </div>
            <div className="order-card-actions">
              <button className="btn-edit">Edit</button>
              <button className="btn-view">View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMenuView = () => (
    <div className="menu-section">
      <div className="section-header">
        <h2>Restaurant Menu</h2>
        <div className="section-actions">
          <button className="btn-secondary">Export</button>
          <button className="btn-primary">Add Item</button>
        </div>
      </div>
      <div className="menu-content">
        <p>Menu content will appear here. Add, edit, or remove menu items.</p>
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
        <p>Kitchen orders will appear here. View and manage current kitchen orders.</p>
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
    </div>
  );
};

export default RestaurantManagement;
