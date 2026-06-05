import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { getUserById, updateUser, resetUserPassword } from '../../../../core/api/services/user.service';
import './UserActionModals.css';

// Role color mapping
const roleColors = {
  superadmin: '#8B5CF6',
  admin: '#3B82F6',
  owner: '#3B82F6',
  manager: '#6366F1',
  guest: '#00BFA6',
  waiter: '#F59E0B',
  kitchen: '#EF4444',
  staff: '#6B7280',
};

const UserActionModals = ({ modalType, selectedUser, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (modalType === 'view' || modalType === 'edit') {
      fetchUserDetails();
    }
  }, [modalType, selectedUser]);

  const fetchUserDetails = async () => {
    if (!selectedUser?._id) return;

    setLoading(true);
    try {
      const response = await getUserById(selectedUser._id);
      setUserData(response.data);

      if (modalType === 'edit') {
        setFormData({
          fullname: response.data.user.fullname || '',
          email: response.data.user.email || '',
          contact: response.data.user.contact || '',
          companyRole: response.data.user.companyRole || response.data.user.role?.name || 'guest',
          isActive: response.data.user.isActive,
        });
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to load user details');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (user) => {
    const name = user?.fullname || user?.username || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleColor = (roleName) => {
    return roleColors[roleName?.toLowerCase()] || roleColors.staff;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullname?.trim()) {
      newErrors.fullname = 'Name is required';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await updateUser(selectedUser._id, formData);
      toast.success('User updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error?.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!window.confirm('Send password reset email to this user?')) return;

    setLoading(true);
    try {
      await resetUserPassword(selectedUser._id);
      toast.success('Password reset email sent successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!modalType || !selectedUser) return null;

  const user = userData?.user || selectedUser;
  const stats = userData?.stats || { totalBookings: 0, totalSpent: 0 };
  const roleName = user.role?.name || user.companyRole || 'guest';
  const roleColor = getRoleColor(roleName);

  // VIEW DRAWER
  if (modalType === 'view') {
    return createPortal(
      <div className="uam-backdrop" onClick={handleBackdropClick}>
        <div className="uam-drawer">
          <div className="uam-drawer-header">
            <h2>User Profile</h2>
            <button className="uam-close-btn" onClick={onClose}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {loading ? (
            <div className="uam-loading">
              <div className="uam-spinner"></div>
              <p>Loading user details...</p>
            </div>
          ) : (
            <div className="uam-drawer-content">
              {/* Premium Profile Header */}
              <div className="uam-view-profile-header">
                <div
                  className="uam-view-avatar-large"
                  style={{ backgroundColor: roleColor }}
                >
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt={user.fullname} />
                  ) : (
                    <span>{getInitials(user)}</span>
                  )}
                </div>
                <div className="uam-view-profile-info">
                  <h3>{user.fullname || user.username}</h3>
                  <p className="uam-view-username">@{user.username}</p>
                  <div className="uam-view-badges">
                    <span
                      className="uam-view-role-badge"
                      style={{
                        backgroundColor: `${roleColor}15`,
                        color: roleColor,
                        borderColor: `${roleColor}30`
                      }}
                    >
                      <span className="material-symbols-outlined">badge</span>
                      {roleName}
                    </span>
                    <span className={`uam-view-status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      <span className="material-symbols-outlined">
                        {user.isActive ? 'check_circle' : 'cancel'}
                      </span>
                      {user.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="uam-view-section">
                <h4 className="uam-view-section-title">
                  <span className="material-symbols-outlined">contact_mail</span>
                  Contact Information
                </h4>
                <div className="uam-view-info-cards">
                  <div className="uam-view-info-card">
                    <div className="uam-view-info-icon" style={{ backgroundColor: `${roleColor}15` }}>
                      <span className="material-symbols-outlined" style={{ color: roleColor }}>email</span>
                    </div>
                    <div className="uam-view-info-text">
                      <span className="uam-view-info-label">Email Address</span>
                      <span className="uam-view-info-value">{user.email}</span>
                    </div>
                  </div>

                  <div className="uam-view-info-card">
                    <div className="uam-view-info-icon" style={{ backgroundColor: `${roleColor}15` }}>
                      <span className="material-symbols-outlined" style={{ color: roleColor }}>phone</span>
                    </div>
                    <div className="uam-view-info-text">
                      <span className="uam-view-info-label">Phone Number</span>
                      <span className="uam-view-info-value">{user.contact || 'Not provided'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Information Section */}
              <div className="uam-view-section">
                <h4 className="uam-view-section-title">
                  <span className="material-symbols-outlined">account_circle</span>
                  Account Information
                </h4>
                <div className="uam-view-info-cards">
                  <div className="uam-view-info-card">
                    <div className="uam-view-info-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                      <span className="material-symbols-outlined" style={{ color: '#3B82F6' }}>calendar_today</span>
                    </div>
                    <div className="uam-view-info-text">
                      <span className="uam-view-info-label">Member Since</span>
                      <span className="uam-view-info-value">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        }) : 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="uam-view-info-card">
                    <div className="uam-view-info-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                      <span className="material-symbols-outlined" style={{ color: '#10B981' }}>schedule</span>
                    </div>
                    <div className="uam-view-info-text">
                      <span className="uam-view-info-label">Last Login</span>
                      <span className="uam-view-info-value">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Never logged in'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Stats Section */}
              <div className="uam-view-section">
                <h4 className="uam-view-section-title">
                  <span className="material-symbols-outlined">analytics</span>
                  Activity Statistics
                </h4>
                <div className="uam-view-stats-cards">
                  <div className="uam-view-stat-card-premium">
                    <div className="uam-view-stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}>
                      <span className="material-symbols-outlined">book_online</span>
                    </div>
                    <div className="uam-view-stat-content">
                      <p className="uam-view-stat-value">{stats.totalBookings}</p>
                      <p className="uam-view-stat-label">Total Bookings</p>
                    </div>
                  </div>

                  <div className="uam-view-stat-card-premium">
                    <div className="uam-view-stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                      <span className="material-symbols-outlined">payments</span>
                    </div>
                    <div className="uam-view-stat-content">
                      <p className="uam-view-stat-value">${stats.totalSpent.toFixed(2)}</p>
                      <p className="uam-view-stat-label">Total Spent</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  // EDIT MODAL
  if (modalType === 'edit') {
    return createPortal(
      <div className="uam-backdrop" onClick={handleBackdropClick}>
        <div className="uam-modal uam-edit-modal">
          <div className="uam-modal-header">
            <h2>Edit User</h2>
            <button className="uam-close-btn" onClick={onClose}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {loading && !formData.fullname ? (
            <div className="uam-loading">
              <div className="uam-spinner"></div>
              <p>Loading user details...</p>
            </div>
          ) : (
            <form onSubmit={handleEditSubmit} className="uam-edit-form">
              {/* Avatar Display */}
              <div className="uam-edit-avatar-section">
                <div
                  className="uam-edit-avatar"
                  style={{ backgroundColor: roleColor }}
                >
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt={user.fullname} />
                  ) : (
                    <span>{getInitials(user)}</span>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="uam-form-group">
                <label htmlFor="fullname">Full Name</label>
                <input
                  id="fullname"
                  type="text"
                  className={`uam-input ${errors.fullname ? 'error' : ''}`}
                  value={formData.fullname || ''}
                  onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                  placeholder="Enter full name"
                />
                {errors.fullname && <span className="uam-error">{errors.fullname}</span>}
              </div>

              <div className="uam-form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className={`uam-input ${errors.email ? 'error' : ''}`}
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email"
                />
                {errors.email && <span className="uam-error">{errors.email}</span>}
              </div>

              <div className="uam-form-group">
                <label htmlFor="contact">Phone</label>
                <input
                  id="contact"
                  type="text"
                  className="uam-input"
                  value={formData.contact || ''}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="uam-form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  className="uam-select"
                  value={formData.companyRole || ''}
                  onChange={(e) => setFormData({ ...formData, companyRole: e.target.value })}
                >
                  <option value="guest">Guest</option>
                  <option value="owner">Owner</option>
                  <option value="waiter">Waiter</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">SuperAdmin</option>
                </select>
              </div>

              <div className="uam-form-group">
                <label className="uam-toggle-label">
                  <span>Account Status</span>
                  <button
                    type="button"
                    className={`uam-toggle ${formData.isActive ? 'active' : 'inactive'}`}
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  >
                    <span className="uam-toggle-slider"></span>
                  </button>
                  <span className="uam-toggle-text">
                    {formData.isActive ? 'Active' : 'Suspended'}
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="uam-form-actions">
                <button
                  type="submit"
                  className="uam-btn uam-btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="uam-btn-spinner"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>

                <button
                  type="button"
                  className="uam-btn uam-btn-secondary"
                  onClick={handleResetPassword}
                  disabled={loading}
                >
                  <span className="material-symbols-outlined">lock_reset</span>
                  Reset Password
                </button>
              </div>
            </form>
          )}
        </div>
      </div>,
      document.body
    );
  }

  return null;
};

export default UserActionModals;
