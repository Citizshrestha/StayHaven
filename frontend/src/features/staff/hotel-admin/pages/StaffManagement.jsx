import React, { useState, useEffect } from 'react';
import { useStaffAuth } from '../../../../core/context/StaffAuthContext';
import { getStaffList, inviteStaff, updateStaffStatus } from '../services/staffApi';
import './StaffManagement.css';

const StaffManagement = ({ embedded = false }) => {
  const { activeProperty, staffUser } = useStaffAuth();
  const [activeSection, setActiveSection] = useState('staff');
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [inviteFormData, setInviteFormData] = useState({
    fullname: '',
    email: '',
    role: 'waiter',
    propertyId: ''
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

  const departments = [
    'all',
    'Front Office',
    'Housekeeping',
    'Food & Beverage',
    'Guest Services',
    'Maintenance',
    'Security'
  ];

  const roles = [
    { value: 'waiter', label: 'Waiter' },
    { value: 'chief', label: 'Chef' },
    { value: 'receptionist', label: 'Receptionist' }
  ];

  // Fetch staff on component mount
  useEffect(() => {
    if (activeSection === 'staff') {
      fetchStaff();
    }
  }, [activeSection, searchTerm, departmentFilter]);

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (departmentFilter !== 'all') params.department = departmentFilter;

      const response = await getStaffList(params);
      setStaff(response.data.staff || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch staff');
    } finally {
      setLoading(false);
    }
  };

  // Handle navigation click
  const handleNavigation = (sectionId) => {
    setActiveSection(sectionId);
  };

  // Handle invite staff
  const handleInviteStaff = () => {
    setInviteFormData({
      fullname: '',
      email: '',
      role: 'waiter',
      propertyId: hotelId
    });
    setShowInviteModal(true);
  };

  const handleInviteInputChange = (e) => {
    const { name, value } = e.target;
    setInviteFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await inviteStaff({ ...inviteFormData, propertyId: hotelId });
      setShowInviteModal(false);
      fetchStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to invite staff');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (staffId, currentStatus) => {
    setLoading(true);
    setError(null);
    try {
      await updateStaffStatus(staffId, !currentStatus);
      fetchStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update staff status');
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
        return <div className="page-content">Restaurant Management</div>;
      case 'orders':
        return <div className="page-content">Orders Management</div>;
      case 'stock':
        return <div className="page-content">Stock / Inventory</div>;
      case 'staff':
        return renderStaffManagement();
      case 'billing':
        return <div className="page-content">Billing & Payments</div>;
      case 'loyalty':
        return <div className="page-content">Loyalty Points</div>;
      case 'reports':
        return <div className="page-content">Reports & Analytics</div>;
      case 'notifications':
        return <div className="page-content">Notifications</div>;
      default:
        return renderStaffManagement();
    }
  };

  const renderStaffManagement = () => (
    <div className="staff-content">
      <div className="content-header">
        <h1>Staff Management</h1>
        <p className="subtitle">Manage your hotel staff members and invitations.</p>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="staff-controls">
        <div className="search-filter-group">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="department-filter"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'All Departments' : dept}
              </option>
            ))}
          </select>
        </div>
        <div className="action-buttons">
          <button className="btn-secondary" onClick={fetchStaff}>Refresh</button>
          <button className="btn-primary" onClick={handleInviteStaff}>Invite Staff</button>
        </div>
      </div>

      {loading && <div className="loading-spinner">Loading staff...</div>}

      {/* Staff Table */}
      <div className="staff-section">
        <div className="table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 && !loading ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    No staff members found. Invite your first staff member to get started.
                  </td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr key={member._id}>
                    <td>
                      <div className="staff-name">
                        <div className="staff-avatar">{member.initials}</div>
                        <span>{member.name}</span>
                      </div>
                    </td>
                    <td>{member.email}</td>
                    <td>
                      <span className="role-badge">{member.role}</span>
                    </td>
                    <td>{member.department}</td>
                    <td>
                      <span className={`status-badge ${member.status?.toLowerCase()}`}>
                        {member.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className={`btn-toggle ${member.isActive ? 'active' : 'inactive'}`}
                          onClick={() => handleToggleStatus(member._id, member.isActive)}
                          title={member.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {member.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="mobile-staff-cards">
          {staff.map((member) => (
            <div key={member._id} className="staff-card">
              <div className="staff-card-header">
                <div className="staff-name">
                  <div className="staff-avatar">{member.initials}</div>
                  <div>
                    <h4>{member.name}</h4>
                    <p className="email">{member.email}</p>
                  </div>
                </div>
                <span className={`status-badge ${member.status?.toLowerCase()}`}>
                  {member.status}
                </span>
              </div>
              <div className="staff-card-details">
                <div className="detail-item">
                  <span className="label">Role:</span>
                  <span className="role-badge">{member.role}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Department:</span>
                  <span className="value">{member.department}</span>
                </div>
              </div>
              <div className="staff-card-actions">
                <button
                  className={`btn-toggle ${member.isActive ? 'active' : 'inactive'}`}
                  onClick={() => handleToggleStatus(member._id, member.isActive)}
                >
                  {member.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (embedded) return renderStaffManagement();

  return (
    <div className="staff-management">
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

      {/* Invite Staff Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invite Staff Member</h2>
              <button className="modal-close" onClick={() => setShowInviteModal(false)}>✕</button>
            </div>
            <form onSubmit={handleInviteSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="fullname"
                    value={inviteFormData.fullname}
                    onChange={handleInviteInputChange}
                    required
                    placeholder="Enter full name"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={inviteFormData.email}
                    onChange={handleInviteInputChange}
                    required
                    placeholder="Enter email address"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Role *</label>
                  <select
                    name="role"
                    value={inviteFormData.role}
                    onChange={handleInviteInputChange}
                    required
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-info">
                  <p>An invitation email will be sent to the staff member with instructions to complete their registration.</p>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
