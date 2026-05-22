import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import SuperAdminLayout from './SuperAdminLayout';
import { getAdminUsers, updateUserStatus } from '../../../../core/api/services/user.service';
import UserActionModals from '../components/UserActionModals';
import './UserManagement.css';

const PAGE_SIZE = 10;

const roleOptions = [
  { label: 'All Roles', value: 'all' },
  { label: 'Guest', value: 'guest' },
  { label: 'Owner', value: 'owner' },
  { label: 'Waiter', value: 'waiter' },
  { label: 'Kitchen', value: 'kitchen' },
  { label: 'Admin', value: 'admin' },
  { label: 'SuperAdmin', value: 'superadmin' },
];

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
];

// Role color mapping for avatars and badges
const roleColors = {
  superadmin: { bg: '#8B5CF6', badge: '#8B5CF6', border: '#8B5CF6' },
  admin: { bg: '#3B82F6', badge: '#3B82F6', border: '#3B82F6' },
  owner: { bg: '#3B82F6', badge: '#3B82F6', border: '#3B82F6' },
  manager: { bg: '#6366F1', badge: '#6366F1', border: '#6366F1' },
  guest: { bg: '#00BFA6', badge: '#00BFA6', border: '#00BFA6' },
  waiter: { bg: '#F59E0B', badge: '#F59E0B', border: '#F59E0B' },
  kitchen: { bg: '#EF4444', badge: '#EF4444', border: '#EF4444' },
  staff: { bg: '#6B7280', badge: '#6B7280', border: '#6B7280' },
};

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  // Modal state
  const [modalType, setModalType] = useState(null); // 'view' | 'edit' | 'delete' | null
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter, pageSize]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          limit: pageSize,
          sort: '-createdAt',
        };

        if (debouncedSearch) params.search = debouncedSearch;
        if (roleFilter !== 'all') params.role = roleFilter;
        if (statusFilter !== 'all') params.status = statusFilter;

        const response = await getAdminUsers(params);
        setUsers(response.users || []);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        toast.error(error?.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [page, debouncedSearch, roleFilter, statusFilter, pageSize]);

  const stats = useMemo(() => {
    const activeUsers = users.filter((user) => user.isActive).length;
    const suspendedUsers = users.filter((user) => !user.isActive).length;
    const now = Date.now();
    const newUsers = users.filter((user) => {
      if (!user.createdAt) return false;
      const createdAt = new Date(user.createdAt).getTime();
      const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    }).length;

    return [
      {
        label: 'Total Users',
        value: total.toLocaleString(),
        icon: 'group',
        gradient: 'linear-gradient(135deg, #06B6D4 0%, #0D9488 100%)',
        borderColor: '#06B6D4'
      },
      {
        label: 'Active Users',
        value: activeUsers.toLocaleString(),
        icon: 'check_circle',
        gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        borderColor: '#10B981'
      },
      {
        label: 'Suspended',
        value: suspendedUsers.toLocaleString(),
        icon: 'block',
        gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        borderColor: '#EF4444'
      },
      {
        label: 'New (30d)',
        value: newUsers.toLocaleString(),
        icon: 'person_add',
        gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
        borderColor: '#8B5CF6'
      },
    ];
  }, [users, total]);

  const handleToggleStatus = async (user) => {
    try {
      const nextStatus = !user.isActive;
      await updateUserStatus(user._id, nextStatus);
      setUsers((prev) =>
        prev.map((item) =>
          item._id === user._id ? { ...item, isActive: nextStatus } : item
        )
      );
      toast.success(`User ${nextStatus ? 'activated' : 'suspended'} successfully`);
    } catch (error) {
      toast.error(error?.message || 'Failed to update status');
    }
  };

  const handleOpenModal = (type, user) => {
    setModalType(type);
    setSelectedUser(user);
  };

  const handleCloseModal = () => {
    setModalType(null);
    setSelectedUser(null);
  };

  const handleModalSuccess = () => {
    // Refresh the user list after successful action
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          limit: pageSize,
          sort: '-createdAt',
        };

        if (debouncedSearch) params.search = debouncedSearch;
        if (roleFilter !== 'all') params.role = roleFilter;
        if (statusFilter !== 'all') params.status = statusFilter;

        const response = await getAdminUsers(params);
        setUsers(response.users || []);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        toast.error(error?.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  };

  const getInitials = (user) => {
    const name = user.fullname || user.username || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleColor = (roleName) => {
    return roleColors[roleName?.toLowerCase()] || roleColors.staff;
  };

  const pageStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <SuperAdminLayout pageTitle="User Management">
      <div className="um-container">

        {/* Premium Stats Grid */}
        <div className="um-stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="um-stat-card" style={{ animationDelay: `${index * 0.05}s` }}>
              <div className="um-stat-icon-wrapper" style={{ background: stat.gradient }}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
              <div className="um-stat-info">
                <p className="um-stat-label">{stat.label}</p>
                <h3 className="um-stat-value">{stat.value}</h3>
              </div>
              <div className="um-stat-border" style={{ backgroundColor: stat.borderColor }}></div>
            </div>
          ))}
        </div>

        {/* Premium Toolbar */}
        <div className="um-toolbar">
          <div className="um-toolbar-left">
            <div className="um-search-wrapper">
              <span className="material-symbols-outlined um-search-icon">search</span>
              <input
                type="text"
                className="um-search-input"
                placeholder="Search users by name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="um-filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="um-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button className="um-invite-btn">
            <span className="material-symbols-outlined">person_add</span>
            Invite User
          </button>
        </div>

        {/* Premium Data Table */}
        <div className="um-table-card">
          <div className="um-table-wrapper">
            <table className="um-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="um-actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="um-skeleton-row">
                      <td colSpan="7">
                        <div className="um-skeleton-shimmer"></div>
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  // Empty state
                  <tr>
                    <td colSpan="7" className="um-empty-cell">
                      <div className="um-empty-state">
                        <span className="material-symbols-outlined um-empty-icon">group_off</span>
                        <h3>No users found</h3>
                        <p>Try adjusting your search or filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => {
                    const roleName = user.role?.name || user.companyRole || 'guest';
                    const roleColor = getRoleColor(roleName);
                    const initials = getInitials(user);

                    return (
                      <tr key={user._id} className="um-table-row" style={{ animationDelay: `${index * 0.05}s` }}>
                        <td>
                          <div className="um-user-cell">
                            <div
                              className="um-avatar"
                              style={{ backgroundColor: roleColor.bg }}
                            >
                              {user.profilePicture ? (
                                <img src={user.profilePicture} alt={user.fullname || user.username} />
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>
                            <div className="um-user-info">
                              <div className="um-user-name">{user.fullname || user.username}</div>
                              <div className="um-user-username">@{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="um-email">{user.email}</td>
                        <td className="um-phone">{user.contact || '—'}</td>
                        <td>
                          <span
                            className="um-role-badge"
                            style={{
                              backgroundColor: `${roleColor.badge}15`,
                              color: roleColor.badge,
                              borderColor: `${roleColor.badge}30`
                            }}
                          >
                            {roleName}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`um-status-toggle ${user.isActive ? 'active' : 'inactive'}`}
                            onClick={() => handleToggleStatus(user)}
                            title={user.isActive ? 'Click to suspend' : 'Click to activate'}
                          >
                            <span className="um-toggle-slider"></span>
                          </button>
                        </td>
                        <td className="um-date">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }) : '—'}
                        </td>
                        <td className="um-actions-cell">
                          <div className="um-actions">
                            <button
                              className="um-action-btn um-view"
                              onClick={() => handleOpenModal('view', user)}
                              title="View details"
                            >
                              <span className="material-symbols-outlined">visibility</span>
                            </button>
                            <button
                              className="um-action-btn um-edit"
                              onClick={() => handleOpenModal('edit', user)}
                              title="Edit user"
                            >
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button
                              className="um-action-btn um-delete"
                              onClick={() => handleOpenModal('delete', user)}
                              title="Delete user"
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Premium Pagination */}
          <div className="um-pagination">
            <div className="um-pagination-info">
              Showing <strong>{pageStart}</strong>–<strong>{pageEnd}</strong> of <strong>{total.toLocaleString()}</strong> users
            </div>

            <div className="um-pagination-controls">
              <select
                className="um-page-size-select"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>

              <div className="um-pagination-buttons">
                <button
                  className="um-page-btn"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                  Previous
                </button>
                <button
                  className="um-page-btn"
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page >= totalPages}
                >
                  Next
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* User Action Modals Portal */}
      <UserActionModals
        modalType={modalType}
        selectedUser={selectedUser}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
      />
    </SuperAdminLayout>
  );
};

export default UserManagement;
