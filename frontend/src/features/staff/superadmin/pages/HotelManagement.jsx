import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import SuperAdminLayout from './SuperAdminLayout';
import AddHotel from './AddHotel';
import {
  createHotel,
  deleteHotel,
  getAdminHotels,
  updateHotel,
  updateHotelStatus,
} from '../../../../core/api/services/hotel.service';
import './HotelManagement.css';

const PAGE_SIZE = 8;

const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Suspended', value: 'suspended' },
];

const activeOptions = [
  { label: 'All Activity', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Disabled', value: 'inactive' },
];

const HotelManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [hotels, setHotels] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isAddHotelOpen, setIsAddHotelOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, activeFilter]);

  useEffect(() => {
    const fetchHotels = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          limit: PAGE_SIZE,
          sort: '-createdAt',
        };

        if (debouncedSearch) params.search = debouncedSearch;
        if (statusFilter !== 'all') params.status = statusFilter;
        if (activeFilter !== 'all') params.isActive = activeFilter;

        const response = await getAdminHotels(params);
        setHotels(response.hotels || []);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        toast.error(error?.message || 'Failed to load hotels');
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, [page, debouncedSearch, statusFilter, activeFilter]);

  const stats = useMemo(() => {
    const activeHotels = hotels.filter((hotel) => hotel.isActive).length;
    const pendingHotels = hotels.filter((hotel) => hotel.status === 'pending').length;
    const approvedHotels = hotels.filter((hotel) => hotel.status === 'approved').length;

    return [
      { label: 'Total Hotels', value: total.toLocaleString() },
      { label: 'Approved Hotels', value: approvedHotels.toLocaleString() },
      { label: 'Active Hotels', value: activeHotels.toLocaleString() },
      { label: 'Pending Approvals', value: pendingHotels.toLocaleString() },
    ];
  }, [hotels, total]);

  const handleSaveHotel = async (hotelData) => {
    try {
      if (editingHotel) {
        await updateHotel(editingHotel._id, hotelData);
        toast.success('Hotel updated successfully');
      } else {
        await createHotel(hotelData);
        toast.success('Hotel created successfully');
      }

      setIsAddHotelOpen(false);
      setEditingHotel(null);

      const response = await getAdminHotels({
        page,
        limit: PAGE_SIZE,
        sort: '-createdAt',
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(activeFilter !== 'all' ? { isActive: activeFilter } : {}),
      });
      setHotels(response.hotels || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      toast.error(error?.message || 'Failed to save hotel');
    }
  };

  const handleDeleteHotel = async (hotel) => {
    const confirmDelete = window.confirm(`Delete ${hotel.name}? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      await deleteHotel(hotel._id);
      setHotels((prev) => prev.filter((item) => item._id !== hotel._id));
      toast.success('Hotel deleted successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete hotel');
    }
  };

  const handleToggleActive = async (hotel) => {
    try {
      const nextActive = !hotel.isActive;
      await updateHotel(hotel._id, { isActive: nextActive });
      setHotels((prev) =>
        prev.map((item) =>
          item._id === hotel._id ? { ...item, isActive: nextActive } : item
        )
      );
      toast.success(`Hotel ${nextActive ? 'activated' : 'disabled'} successfully`);
    } catch (error) {
      toast.error(error?.message || 'Failed to update hotel status');
    }
  };

  const handleApproval = async (hotel, status) => {
    const reason = status === 'rejected'
      ? window.prompt('Provide a rejection reason (optional):')
      : undefined;

    try {
      const response = await updateHotelStatus(hotel._id, status, reason || undefined);
      const updated = response.hotel;
      setHotels((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      toast.success(`Hotel ${status} successfully`);
    } catch (error) {
      toast.error(error?.message || 'Failed to update approval status');
    }
  };

  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

  return (
    <SuperAdminLayout pageTitle="Hotel Management">
      {({ darkMode }) => (
        <div className={`hotel-management ${darkMode ? 'dark' : 'light'}`}>
          <div className="page-content">
            <div className="action-bar">
              <div className="mobile-search-container">
                <span className="search-icon material-symbols-outlined">search</span>
                <input
                  className="search-input mobile"
                  placeholder="Search hotels by name or city"
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button
                className="add-hotel-btn"
                onClick={() => setIsAddHotelOpen(true)}
              >
                <span className="material-symbols-outlined">add</span>
                <span>Add New Hotel</span>
              </button>
            </div>

            <div className="stats-grid">
              {stats.map((stat) => (
                <div key={stat.label} className="stat-card">
                  <p className="stat-label">{stat.label}</p>
                  <p className="stat-value">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="filters-section">
              <div className="filters-grid">
                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  className="filter-select"
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                >
                  {activeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="filter-summary">
                  {loading ? 'Loading hotels...' : `${total.toLocaleString()} total properties`}
                </div>
              </div>
            </div>

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
                    {hotels.length === 0 && !loading ? (
                      <tr>
                        <td colSpan="7" className="empty-state-cell">
                          <div className="empty-state">
                            <span className="empty-icon">🏨</span>
                            <h3>No Hotels Found</h3>
                            <p>{searchTerm ? `No hotels match "${searchTerm}"` : 'Add your first hotel to get started.'}</p>
                            {!searchTerm && (
                              <button
                                className="add-hotel-btn"
                                onClick={() => setIsAddHotelOpen(true)}
                              >
                                <span className="material-symbols-outlined">add</span>
                                <span>Add First Hotel</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      hotels.map((hotel) => {
                        const statusType = hotel.status === 'approved'
                          ? 'success'
                          : hotel.status === 'pending'
                            ? 'warning'
                            : 'error';
                        const statusLabel = hotel.status
                          ? `${hotel.status.charAt(0).toUpperCase()}${hotel.status.slice(1)}`
                          : 'Unknown';

                        return (
                          <tr key={hotel._id} className="table-row">
                            <td className="hotel-name-cell">
                              <div className="hotel-info">
                                <img
                                  className="hotel-image"
                                  src={hotel.images?.[0] || 'https://via.placeholder.com/40x40?text=Hotel'}
                                  alt={`${hotel.name} thumbnail`}
                                  onError={(e) => { e.target.src = 'https://via.placeholder.com/40x40?text=Hotel'; }}
                                />
                                <span className="hotel-name">{hotel.name}</span>
                              </div>
                            </td>
                            <td className="location-cell">{hotel.location?.city || '—'}</td>
                            <td className="rating-cell">
                              <div className="rating-display">
                                <span className="material-symbols-outlined fill">star</span>
                                <span className="rating-value">{hotel.rating?.toFixed(1) || '0.0'}</span>
                              </div>
                            </td>
                            <td className="manager-cell">
                              {hotel.propertyManager?.fullname || hotel.owner?.fullname || 'Unassigned'}
                            </td>
                            <td className="status-cell">
                              <span className={`status-badge ${statusType}`}>
                                {statusLabel}
                              </span>
                              <div className="status-subtext">
                                {hotel.isActive ? 'Active' : 'Disabled'}
                              </div>
                            </td>
                            <td className="date-cell">
                              {hotel.createdAt ? new Date(hotel.createdAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="actions-cell">
                              <div className="action-buttons">
                                {hotel.status === 'pending' && (
                                  <>
                                    <button
                                      className="action-btn approve"
                                      onClick={() => handleApproval(hotel, 'approved')}
                                      title="Approve Hotel"
                                    >
                                      <span className="material-symbols-outlined">task_alt</span>
                                    </button>
                                    <button
                                      className="action-btn reject"
                                      onClick={() => handleApproval(hotel, 'rejected')}
                                      title="Reject Hotel"
                                    >
                                      <span className="material-symbols-outlined">cancel</span>
                                    </button>
                                  </>
                                )}
                                <button
                                  className="action-btn"
                                  onClick={() => {
                                    setEditingHotel(hotel);
                                    setIsAddHotelOpen(true);
                                  }}
                                  title="Edit Hotel"
                                >
                                  <span className="material-symbols-outlined">edit</span>
                                </button>
                                <button
                                  className="action-btn"
                                  onClick={() => handleToggleActive(hotel)}
                                  title={hotel.isActive ? 'Disable Hotel' : 'Enable Hotel'}
                                >
                                  <span className="material-symbols-outlined">
                                    {hotel.isActive ? 'toggle_on' : 'toggle_off'}
                                  </span>
                                </button>
                                <button
                                  className="action-btn delete"
                                  onClick={() => handleDeleteHotel(hotel)}
                                  title="Delete Hotel"
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

              <div className="pagination">
                <span className="pagination-info">
                  Showing {pageStart}-{pageEnd} of {total.toLocaleString()} hotels
                </span>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <button
                    className="pagination-btn"
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page >= totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          <AddHotel
            isOpen={isAddHotelOpen}
            onClose={() => {
              setIsAddHotelOpen(false);
              setEditingHotel(null);
            }}
            onSave={handleSaveHotel}
            editHotel={editingHotel}
          />
        </div>
      )}
    </SuperAdminLayout>
  );
};

export default HotelManagement;