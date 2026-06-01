import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import SuperAdminLayout from './SuperAdminLayout';
import {
  approveAdminHotel,
  createAdminHotel,
  deleteHotel,
  getAdminHotelById,
  getAdminHotels,
  getAdminHotelStats,
  rejectAdminHotel,
  updateHotel,
} from '../../../../core/api/services/hotel.service';
import { getAdminUsers } from '../../../../core/api/services/user.service';
import './HotelManagement.css';

const DEFAULT_PAGE_SIZE = 10;
const currencyOptions = ['USD', 'NPR', 'EUR', 'GBP', 'INR'];
const amenityOptions = [
  { label: 'WiFi', icon: 'wifi' },
  { label: 'Pool', icon: 'pool' },
  { label: 'Gym', icon: 'fitness_center' },
  { label: 'Spa', icon: 'spa' },
  { label: 'Parking', icon: 'local_parking' },
  { label: 'Restaurant', icon: 'restaurant' },
  { label: 'Bar', icon: 'local_bar' },
  { label: 'Airport Shuttle', icon: 'airport_shuttle' },
];

const initialForm = {
  name: '',
  description: '',
  starRating: 4,
  location: { address: '', city: '', country: '' },
  mapEmbedUrl: '',
  images: [],
  owner: '',
  propertyManager: '',
  amenities: [],
  priceRange: { min: '', max: '' },
  currency: 'USD',
  contact: { email: '', phone: '' },
  category: 'Hotel',
};

const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Rejected', value: 'rejected' },
];

const activityOptions = [
  { label: 'All Activity', value: 'all' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

const statusStyles = {
  pending: { bg: '#FEF9C3', color: '#CA8A04', border: '#FDE68A' },
  approved: { bg: '#DCFCE7', color: '#16A34A', border: '#BBF7D0' },
  active: { bg: '#CCFBF1', color: '#00BFA6', border: '#99F6E4' },
  suspended: { bg: '#FEE2E2', color: '#DC2626', border: '#FECACA' },
  rejected: { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
};

const formatDate = (date) => date
  ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '-';

const formatMoney = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount || 0));

const getInitials = (value) => {
  const name = typeof value === 'string' ? value : value?.fullname || value?.name || value?.username || 'H';
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').toUpperCase().slice(0, 2) || 'H';
};

const getDisplayStatus = (hotel) => {
  if (hotel?.status === 'approved' && hotel?.isActive) return 'active';
  return hotel?.status || 'pending';
};

const buildHotelPayload = (formData, includeOwner = true) => {
  const payload = {
    name: formData.name.trim(),
    description: formData.description.trim(),
    category: formData.category,
    starRating: Number(formData.starRating),
    location: {
      address: formData.location.address.trim(),
      city: formData.location.city.trim(),
      country: formData.location.country.trim(),
    },
    images: formData.images,
    amenities: formData.amenities,
    priceRange: {
      min: Number(formData.priceRange.min),
      max: Number(formData.priceRange.max || formData.priceRange.min),
    },
    contact: {
      email: formData.contact.email.trim(),
      phone: formData.contact.phone.trim(),
    },
  };

  if (includeOwner && formData.owner) {
    payload.owner = formData.owner;
  }

  if (formData.propertyManager) {
    payload.propertyManager = formData.propertyManager;
  }

  return payload;
};

const CountUpValue = ({ value }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    const startedAt = performance.now();
    const duration = 700;
    let frame;

    const tick = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return current.toLocaleString();
};

const HotelManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [hotels, setHotels] = useState([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, active: 0, pending: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, activityFilter, pageSize]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await getAdminHotelStats();
      setStats(response.data || response.stats || {});
    } catch (error) {
      toast.error(error?.message || 'Failed to load hotel stats');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize, sort: '-createdAt' };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (activityFilter !== 'all') params.activity = activityFilter;

      const response = await getAdminHotels(params);
      const pagination = response.pagination || {};
      setHotels(response.data || response.hotels || []);
      setTotal(pagination.total ?? response.total ?? 0);
      setTotalPages(pagination.totalPages ?? response.totalPages ?? 1);
    } catch (error) {
      toast.error(error?.message || 'Failed to load hotels');
    } finally {
      setLoading(false);
    }
  };

  const invalidateHotels = async () => {
    await Promise.all([fetchHotels(), fetchStats()]);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchHotels();
  }, [page, pageSize, debouncedSearch, statusFilter, activityFilter]);

  const statCards = useMemo(() => [
    { label: 'Total Hotels', value: stats.total, icon: 'apartment', gradient: 'linear-gradient(135deg, #00BFA6, #00E5CC)', borderColor: '#00BFA6' },
    { label: 'Approved', value: stats.approved, icon: 'check_circle', gradient: 'linear-gradient(135deg, #22C55E, #16A34A)', borderColor: '#22C55E' },
    { label: 'Active', value: stats.active, icon: 'monitor_heart', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)', borderColor: '#3B82F6' },
    { label: 'Pending', value: stats.pending, icon: 'schedule', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', borderColor: '#F59E0B' },
  ], [stats]);

  const openModal = (type, hotel = null) => {
    setSelectedHotel(hotel);
    setModalType(type);
  };

  const closeModal = () => {
    setSelectedHotel(null);
    setModalType(null);
  };

  const handleApprove = async (hotel) => {
    const previousHotels = hotels;
    setApproveTarget(null);
    setHotels((items) => items.map((item) => item._id === hotel._id ? { ...item, status: 'approved', isActive: true } : item));
    try {
      await approveAdminHotel(hotel._id);
      toast.success(`${hotel.name} approved successfully`);
      await invalidateHotels();
    } catch (error) {
      setHotels(previousHotels);
      toast.error(error?.message || 'Failed to approve hotel');
    }
  };

  const handleDelete = async (hotel) => {
    try {
      await deleteHotel(hotel._id);
      toast.success('Hotel deleted successfully');
      closeModal();
      await invalidateHotels();
    } catch (error) {
      toast.error(error?.message || 'Failed to delete hotel');
    }
  };

  const pageStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = total === 0 ? 0 : Math.min(page * pageSize, total);
  const visiblePages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return start + index;
  });

  return (
    <SuperAdminLayout pageTitle="Hotel Management">
      <div className="hm-container">
        <div className="hm-page-header">
          <div className="hm-header-text">
            <p>Manage properties, approvals, owners, and hotel operations</p>
          </div>
          <button className="hm-add-btn" onClick={() => openModal('add')}>
            <span className="material-symbols-outlined">add_business</span>
            Add New Hotel
          </button>
        </div>

        <div className="hm-tabs">
          <button
            className={`hm-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Hotels
            <span className="hm-tab-badge">{stats.total || 0}</span>
          </button>
          <button
            className={`hm-tab ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending Approval
            <span className="hm-tab-badge hm-tab-badge-warning">{stats.pending || 0}</span>
          </button>
        </div>

        <div className="hm-stats-grid">
          {statCards.map((stat, index) => (
            <div key={stat.label} className="hm-stat-card" style={{ animationDelay: `${index * 0.05}s` }}>
              <div className="hm-stat-icon-wrapper" style={{ background: stat.gradient }}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
              <div className="hm-stat-info">
                <p className="hm-stat-label">{stat.label}</p>
                <h3 className="hm-stat-value">{statsLoading ? '-' : <CountUpValue value={stat.value} />}</h3>
              </div>
              <div className="hm-stat-border" style={{ backgroundColor: stat.borderColor }} />
            </div>
          ))}
        </div>

        <div className="hm-toolbar">
          <div className="hm-toolbar-left">
            <div className="hm-search-wrapper">
              <span className="material-symbols-outlined hm-search-icon">search</span>
              <input
                type="text"
                className="hm-search-input"
                placeholder="Search hotels by name, location..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <select className="hm-filter-select hm-status-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select className="hm-filter-select" value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}>
              {activityOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="hm-toolbar-right">
            <div className="hm-view-toggle">
              <button
                className={`hm-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <span className="material-symbols-outlined">grid_view</span>
              </button>
              <button
                className={`hm-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <span className="material-symbols-outlined">view_list</span>
              </button>
            </div>
            <span className="hm-total-count">{total.toLocaleString()} total properties</span>
            <button className="hm-add-btn hm-toolbar-add" onClick={() => openModal('add')}>
              <span className="material-symbols-outlined">add_business</span>
              Add New Hotel
            </button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <HotelCardsGrid
            hotels={hotels}
            loading={loading}
            onView={(hotel) => openModal('view', hotel)}
            onEdit={(hotel) => openModal('edit', hotel)}
            onDelete={(hotel) => openModal('delete', hotel)}
            onApprove={handleApprove}
            onReject={(hotel) => openModal('reject', hotel)}
            approveTarget={approveTarget}
            setApproveTarget={setApproveTarget}
          />
        ) : (
          <div className="hm-table-card">
          <div className="hm-table-wrapper">
            <table className="hm-table">
              <thead>
                <tr>
                  <th>Hotel</th>
                  <th>Location</th>
                  <th>Rating</th>
                  <th>Manager Assigned</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th className="hm-actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="hm-skeleton-row">
                      <td colSpan="7">
                        <div className="hm-skeleton-grid">
                          <span />
                          <span />
                          <span />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : hotels.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="hm-empty-cell">
                      <div className="hm-empty-state">
                        <div className="hm-empty-icon">
                          <span className="material-symbols-outlined">holiday_village</span>
                        </div>
                        <h3>No Hotels Found</h3>
                        <p>Add your first hotel to get started</p>
                        <button className="hm-add-btn" onClick={() => openModal('add')}>
                          <span className="material-symbols-outlined">add_business</span>
                          Add First Hotel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  hotels.map((hotel, index) => {
                    const manager = hotel.propertyManager || hotel.owner;
                    const displayStatus = getDisplayStatus(hotel);
                    const statusStyle = statusStyles[displayStatus] || statusStyles.rejected;

                    return (
                      <tr key={hotel._id} className="hm-table-row" style={{ animationDelay: `${index * 0.04}s` }}>
                        <td>
                          <div className="hm-hotel-cell">
                            <HotelThumb hotel={hotel} />
                            <div className="hm-hotel-info">
                              <div className="hm-hotel-name">{hotel.name}</div>
                              <div className="hm-hotel-location">{hotel.location?.address || hotel.location?.city || 'Location not set'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="hm-location">
                          <span className="material-symbols-outlined hm-location-icon">location_on</span>
                          {hotel.location?.city || '-'}, {hotel.location?.country || '-'}
                        </td>
                        <td className="hm-rating">
                          {hotel.reviewCount > 0 || hotel.rating > 0 ? (
                            <div className="hm-rating-display">
                              <span className="hm-gold-stars">{'★'.repeat(Math.max(1, Math.round(hotel.rating || hotel.starRating || 0)))}</span>
                              <span>{Number(hotel.rating || hotel.starRating || 0).toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="hm-no-rating">-</span>
                          )}
                        </td>
                        <td>
                          {manager ? (
                            <div className="hm-manager-cell">
                              <div className="hm-manager-avatar">{manager.profilePicture ? <img src={manager.profilePicture} alt={manager.fullname} /> : getInitials(manager)}</div>
                              <div className="hm-manager-info">
                                <div className="hm-manager-name">{manager.fullname || manager.username}</div>
                                <div className="hm-manager-username">@{manager.username || manager.email || 'owner'}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="hm-unassigned-pill">Unassigned</span>
                          )}
                        </td>
                        <td>
                          <span className="hm-status-badge" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, borderColor: statusStyle.border }}>
                            {displayStatus}
                          </span>
                        </td>
                        <td className="hm-date">{formatDate(hotel.createdAt)}</td>
                        <td className="hm-actions-cell">
                          <div className="hm-actions">
                            {hotel.status === 'pending' && (
                              <>
                                <div className="hm-popover-wrap">
                                  <button className="hm-action-btn hm-approve" onClick={() => setApproveTarget(approveTarget?._id === hotel._id ? null : hotel)} title="Approve">
                                    <span className="material-symbols-outlined">check_circle</span>
                                  </button>
                                  {approveTarget?._id === hotel._id && (
                                    <div className="hm-approve-popover">
                                      <strong>Approve {hotel.name}?</strong>
                                      <p>This will notify the owner.</p>
                                      <div>
                                        <button onClick={() => setApproveTarget(null)}>Cancel</button>
                                        <button onClick={() => handleApprove(hotel)}>Confirm</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <button className="hm-action-btn hm-reject" onClick={() => openModal('reject', hotel)} title="Reject">
                                  <span className="material-symbols-outlined">cancel</span>
                                </button>
                              </>
                            )}
                            <button className="hm-action-btn hm-view" onClick={() => openModal('view', hotel)} title="View">
                              <span className="material-symbols-outlined">visibility</span>
                            </button>
                            <button className="hm-action-btn hm-edit" onClick={() => openModal('edit', hotel)} title="Edit">
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button className="hm-action-btn hm-delete" onClick={() => openModal('delete', hotel)} title="Delete">
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

          <div className="hm-pagination">
            <div className="hm-pagination-info">
              Showing <strong>{pageStart}</strong>-<strong>{pageEnd}</strong> of <strong>{total.toLocaleString()}</strong> hotels
            </div>
            <div className="hm-pagination-controls">
              <select className="hm-page-size-select" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
              <div className="hm-pagination-buttons">
                <button className="hm-page-btn" onClick={() => setPage((value) => Math.max(value - 1, 1))} disabled={page === 1}>
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {visiblePages.map((pageNumber) => (
                  <button key={pageNumber} className={`hm-page-btn hm-number-page ${page === pageNumber ? 'active' : ''}`} onClick={() => setPage(pageNumber)}>
                    {pageNumber}
                  </button>
                ))}
                <button className="hm-page-btn" onClick={() => setPage((value) => Math.min(value + 1, totalPages))} disabled={page >= totalPages}>
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {viewMode === 'grid' && (
          <div className="hm-pagination">
            <div className="hm-pagination-info">
              Showing <strong>{pageStart}</strong>-<strong>{pageEnd}</strong> of <strong>{total.toLocaleString()}</strong> hotels
            </div>
            <div className="hm-pagination-controls">
              <select className="hm-page-size-select" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
              <div className="hm-pagination-buttons">
                <button className="hm-page-btn" onClick={() => setPage((value) => Math.max(value - 1, 1))} disabled={page === 1}>
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {visiblePages.map((pageNumber) => (
                  <button key={pageNumber} className={`hm-page-btn hm-number-page ${page === pageNumber ? 'active' : ''}`} onClick={() => setPage(pageNumber)}>
                    {pageNumber}
                  </button>
                ))}
                <button className="hm-page-btn" onClick={() => setPage((value) => Math.min(value + 1, totalPages))} disabled={page >= totalPages}>
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <HotelActionLayer
        modalType={modalType}
        selectedHotel={selectedHotel}
        onClose={closeModal}
        onSuccess={invalidateHotels}
        onDelete={handleDelete}
      />
    </SuperAdminLayout>
  );
};

const HotelThumb = ({ hotel }) => (
  <div className="hm-hotel-thumbnail">
    {hotel.images?.[0] ? <img src={hotel.images[0]} alt={hotel.name} /> : <span className="hm-thumbnail-fallback">{getInitials(hotel.name)}</span>}
  </div>
);

const HotelCardsGrid = ({ hotels, loading, onView, onEdit, onDelete, onApprove, onReject, approveTarget, setApproveTarget }) => {
  if (loading) {
    return (
      <div className="hm-cards-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="hm-hotel-card hm-card-skeleton">
            <div className="hm-card-image-skeleton" />
            <div className="hm-card-body">
              <div className="hm-skeleton-line" style={{ width: '70%', height: '20px' }} />
              <div className="hm-skeleton-line" style={{ width: '50%', height: '16px', marginTop: '8px' }} />
              <div className="hm-skeleton-line" style={{ width: '40%', height: '16px', marginTop: '12px' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className="hm-empty-state-card">
        <div className="hm-empty-icon">
          <span className="material-symbols-outlined">holiday_village</span>
        </div>
        <h3>No Hotels Found</h3>
        <p>Try adjusting your filters or add a new hotel</p>
      </div>
    );
  }

  return (
    <div className="hm-cards-grid">
      {hotels.map((hotel, index) => {
        const displayStatus = getDisplayStatus(hotel);
        const statusStyle = statusStyles[displayStatus] || statusStyles.rejected;
        const commission = hotel.commissionRate || 15;

        return (
          <div key={hotel._id} className="hm-hotel-card" style={{ animationDelay: `${index * 0.05}s` }}>
            {hotel.isFeatured && (
              <div className="hm-featured-badge">
                <span className="material-symbols-outlined">star</span>
                Featured
              </div>
            )}

            <div className="hm-card-image">
              {hotel.images?.[0] ? (
                <img src={hotel.images[0]} alt={hotel.name} />
              ) : (
                <div className="hm-card-image-fallback">{getInitials(hotel.name)}</div>
              )}
              <div className="hm-card-overlay">
                <button className="hm-card-menu-btn" onClick={(e) => { e.stopPropagation(); }}>
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>
            </div>

            <div className="hm-card-body">
              <div className="hm-card-header">
                <h3 className="hm-card-title">{hotel.name}</h3>
                <span className="hm-status-badge" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, borderColor: statusStyle.border }}>
                  {displayStatus}
                </span>
              </div>

              <div className="hm-card-location">
                <span className="material-symbols-outlined">location_on</span>
                {hotel.location?.city || 'Unknown'}, {hotel.location?.country || 'Unknown'}
              </div>

              <div className="hm-card-rating-category">
                <div className="hm-card-rating">
                  <span className="material-symbols-outlined hm-star-icon">star</span>
                  <span>{Number(hotel.rating || hotel.starRating || 0).toFixed(1)}</span>
                  {hotel.reviewCount > 0 && <span className="hm-review-count">({hotel.reviewCount} reviews)</span>}
                </div>
                <span className="hm-category-badge">{hotel.category || 'Hotel'}</span>
              </div>

              <div className="hm-card-stats">
                <div className="hm-card-stat">
                  <span className="material-symbols-outlined">trending_up</span>
                  <div>
                    <span className="hm-stat-label">Commission</span>
                    <span className="hm-stat-value">{commission}%</span>
                  </div>
                </div>
              </div>

              <div className="hm-card-actions">
                {hotel.status === 'pending' && (
                  <div className="hm-card-approval-actions">
                    <div className="hm-popover-wrap">
                      <button
                        className="hm-card-btn hm-approve-btn"
                        onClick={() => setApproveTarget(approveTarget?._id === hotel._id ? null : hotel)}
                      >
                        <span className="material-symbols-outlined">check_circle</span>
                        Approve
                      </button>
                      {approveTarget?._id === hotel._id && (
                        <div className="hm-approve-popover">
                          <strong>Approve {hotel.name}?</strong>
                          <p>This will notify the owner.</p>
                          <div>
                            <button onClick={() => setApproveTarget(null)}>Cancel</button>
                            <button onClick={() => onApprove(hotel)}>Confirm</button>
                          </div>
                        </div>
                      )}
                    </div>
                    <button className="hm-card-btn hm-reject-btn" onClick={() => onReject(hotel)}>
                      <span className="material-symbols-outlined">cancel</span>
                      Reject
                    </button>
                  </div>
                )}
                <div className="hm-card-main-actions">
                  <button className="hm-card-btn hm-view-details-btn" onClick={() => onView(hotel)}>
                    <span className="material-symbols-outlined">visibility</span>
                    View Details
                  </button>
                  <button className="hm-card-btn hm-manage-btn" onClick={() => onEdit(hotel)}>
                    <span className="material-symbols-outlined">edit</span>
                    Manage
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const HotelActionLayer = ({ modalType, selectedHotel, onClose, onSuccess, onDelete }) => {
  const [loading, setLoading] = useState(false);
  const [hotelDetails, setHotelDetails] = useState(null);
  const [owners, setOwners] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!modalType) return;
    setDeleteConfirmText('');
    setRejectReason('');
  }, [modalType]);

  useEffect(() => {
    if (modalType === 'add' || modalType === 'edit') {
      fetchOwners();
    }
  }, [modalType]);

  useEffect(() => {
    if (modalType === 'add') {
      setFormData(initialForm);
      setHotelDetails(null);
    }

    if ((modalType === 'view' || modalType === 'edit') && selectedHotel?._id) {
      fetchHotelDetails(selectedHotel._id);
    }
  }, [modalType, selectedHotel]);

  const fetchOwners = async () => {
    try {
      const response = await getAdminUsers({ role: 'owner', limit: 100 });
      setOwners(response.users || response.data || []);
    } catch (error) {
      toast.error(error?.message || 'Failed to load hotel owners');
    }
  };

  const fetchHotelDetails = async (hotelId) => {
    setLoading(true);
    try {
      const response = await getAdminHotelById(hotelId);
      const detail = response.data || {};
      const hotel = detail.hotel || selectedHotel;
      setHotelDetails(detail);
      setFormData({
        name: hotel.name || '',
        description: hotel.description || '',
        starRating: hotel.starRating || 4,
        location: {
          address: hotel.location?.address || '',
          city: hotel.location?.city || '',
          country: hotel.location?.country || '',
        },
        mapEmbedUrl: hotel.mapEmbedUrl || '',
        images: hotel.images || [],
        owner: hotel.owner?._id || hotel.owner || '',
        propertyManager: hotel.propertyManager?._id || hotel.propertyManager || '',
        amenities: hotel.amenities || [],
        priceRange: {
          min: hotel.priceRange?.min || '',
          max: hotel.priceRange?.max || '',
        },
        currency: hotel.currency || 'USD',
        contact: {
          email: hotel.contact?.email || '',
          phone: hotel.contact?.phone || '',
        },
        category: hotel.category || 'Hotel',
      });
    } catch (error) {
      toast.error(error?.message || 'Failed to load hotel details');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (path, value) => {
    setFormData((current) => {
      const next = { ...current };
      if (path.includes('.')) {
        const [parent, child] = path.split('.');
        next[parent] = { ...next[parent], [child]: value };
      } else {
        next[path] = value;
      }
      return next;
    });
  };

  const handleImageFiles = async (files) => {
    const readers = Array.from(files).map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    }));
    const images = await Promise.all(readers);
    setFormData((current) => ({ ...current, images: [...current.images, ...images] }));
  };

  const submitHotel = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = buildHotelPayload(formData, modalType === 'add');

      if (modalType === 'add') {
        await createAdminHotel(payload);
        toast.success('Hotel created successfully');
      } else {
        await updateHotel(selectedHotel._id, payload);
        toast.success('Hotel updated successfully');
      }
      onClose();
      await onSuccess();
    } catch (error) {
      toast.error(error?.message || `Failed to ${modalType === 'add' ? 'create' : 'update'} hotel`);
    } finally {
      setLoading(false);
    }
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) return;
    setLoading(true);
    try {
      await rejectAdminHotel(selectedHotel._id, rejectReason.trim());
      toast.warn(`${selectedHotel.name} rejected`);
      onClose();
      await onSuccess();
    } catch (error) {
      toast.error(error?.message || 'Failed to reject hotel');
    } finally {
      setLoading(false);
    }
  };

  if (!modalType) return null;

  if (modalType === 'view') {
    const hotel = hotelDetails?.hotel || selectedHotel;
    return createPortal(
      <div className="hm-layer-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
        <aside className="hm-view-drawer">
          <button className="hm-close-btn" onClick={onClose}><span className="material-symbols-outlined">close</span></button>
          {loading ? (
            <div className="hm-modal-loading"><div className="hm-spinner" />Loading hotel details...</div>
          ) : (
            <>
              <div className="hm-drawer-hero">
                {hotel.images?.[0] ? <img src={hotel.images[0]} alt={hotel.name} /> : <div className="hm-drawer-fallback">{getInitials(hotel.name)}</div>}
                <div className="hm-drawer-hero-copy">
                  <h2>{hotel.name}</h2>
                  <p>{hotel.location?.city || '-'}, {hotel.location?.country || '-'}</p>
                  <span>★ {Number(hotel.rating || hotel.starRating || 0).toFixed(1)}</span>
                </div>
              </div>
              <div className="hm-drawer-content">
                <InfoSection title="Details" icon="info">
                  <p>{hotel.description || 'No description provided.'}</p>
                  <div className="hm-detail-grid">
                    <span>Created <strong>{formatDate(hotel.createdAt)}</strong></span>
                    <span>Status <strong>{getDisplayStatus(hotel)}</strong></span>
                  </div>
                </InfoSection>
                <InfoSection title="Amenities" icon="widgets">
                  <div className="hm-amenity-grid compact">
                    {(hotel.amenities?.length ? hotel.amenities : ['No amenities listed']).map((amenity) => <span key={amenity}>{amenity}</span>)}
                  </div>
                </InfoSection>
                <InfoSection title="Manager" icon="badge">
                  <ManagerCard manager={hotel.propertyManager || hotel.owner} />
                </InfoSection>
                <InfoSection title="Contact Information" icon="contact_mail">
                  <div className="hm-detail-grid">
                    <span>Email <strong>{hotel.contact?.email || 'Not provided'}</strong></span>
                    <span>Phone <strong>{hotel.contact?.phone || 'Not provided'}</strong></span>
                  </div>
                </InfoSection>
              </div>
              <div className="hm-drawer-footer">
                <button className="hm-add-btn" onClick={() => fetchHotelDetails(hotel._id).then(() => {})}>Refresh</button>
              </div>
            </>
          )}
        </aside>
      </div>,
      document.body
    );
  }

  if (modalType === 'delete') {
    const canDelete = deleteConfirmText === selectedHotel?.name;
    return createPortal(
      <div className="hm-layer-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
        <div className="hm-modal hm-delete-modal">
          <div className="hm-danger-header">
            <span className="material-symbols-outlined">warning</span>
            <h2>Delete Hotel</h2>
          </div>
          <div className="hm-modal-body">
            <div className="hm-delete-pill"><HotelThumb hotel={selectedHotel} /><strong>{selectedHotel?.name}</strong></div>
            <p>This will permanently remove the hotel and cancel all associated bookings.</p>
            <label className="hm-field">
              <span>Type hotel name to confirm</span>
              <input value={deleteConfirmText} onChange={(event) => setDeleteConfirmText(event.target.value)} placeholder={selectedHotel?.name} />
            </label>
          </div>
          <div className="hm-modal-footer">
            <button className="hm-ghost-btn" onClick={onClose}>Cancel</button>
            <button className="hm-danger-btn" disabled={!canDelete || loading} onClick={() => onDelete(selectedHotel)}>
              {loading ? 'Deleting...' : 'Delete Hotel'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (modalType === 'reject') {
    return createPortal(
      <div className="hm-layer-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
        <div className="hm-modal hm-reject-modal">
          <div className="hm-modal-header">
            <span className="material-symbols-outlined">cancel</span>
            <h2>Reject Hotel</h2>
          </div>
          <div className="hm-modal-body">
            <p>Reject <strong>{selectedHotel?.name}</strong>? The reason will be sent to the owner by email.</p>
            <label className="hm-field">
              <span>Reason</span>
              <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Explain what the owner needs to fix..." rows="5" />
            </label>
          </div>
          <div className="hm-modal-footer">
            <button className="hm-ghost-btn" onClick={onClose}>Cancel</button>
            <button className="hm-danger-btn" disabled={!rejectReason.trim() || loading} onClick={submitReject}>
              {loading ? 'Rejecting...' : 'Reject Hotel'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="hm-layer-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <form className="hm-modal hm-hotel-form-modal" onSubmit={submitHotel}>
        <div className="hm-modal-header">
          <span className="material-symbols-outlined">add_business</span>
          <h2>{modalType === 'add' ? 'Add New Hotel' : 'Edit Hotel'}</h2>
        </div>
        {loading && modalType === 'edit' ? (
          <div className="hm-modal-loading"><div className="hm-spinner" />Loading hotel details...</div>
        ) : (
          <div className="hm-modal-body">
            <FormSection title="Basic Info">
              <label className="hm-field"><span>Hotel Name</span><input required value={formData.name} onChange={(event) => updateField('name', event.target.value)} /></label>
              <label className="hm-field"><span>Description</span><textarea required rows="4" value={formData.description} onChange={(event) => updateField('description', event.target.value)} /></label>
              <div className="hm-star-picker">
                <span>Star Rating</span>
                <div>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button type="button" key={star} className={star <= formData.starRating ? 'active' : ''} onClick={() => updateField('starRating', star)}>★</button>
                  ))}
                </div>
              </div>
            </FormSection>

            <FormSection title="Location">
              <label className="hm-field"><span>Address</span><input required value={formData.location.address} onChange={(event) => updateField('location.address', event.target.value)} /></label>
              <div className="hm-two-col">
                <label className="hm-field"><span>City</span><input required value={formData.location.city} onChange={(event) => updateField('location.city', event.target.value)} /></label>
                <label className="hm-field"><span>Country</span><input value={formData.location.country} onChange={(event) => updateField('location.country', event.target.value)} /></label>
              </div>
              <label className="hm-field"><span>Google Maps Embed URL</span><input value={formData.mapEmbedUrl} onChange={(event) => updateField('mapEmbedUrl', event.target.value)} /></label>
              <div className="hm-map-preview">{formData.mapEmbedUrl ? <iframe src={formData.mapEmbedUrl} title="Map preview" loading="lazy" /> : <span>Map preview</span>}</div>
            </FormSection>

            <FormSection title="Media">
              <label className="hm-upload-zone">
                <input type="file" multiple accept="image/*" onChange={(event) => handleImageFiles(event.target.files)} />
                <span className="material-symbols-outlined">cloud_upload</span>
                <strong>Drop images here or browse</strong>
                <small>Supports multiple hotel images</small>
              </label>
              <div className="hm-preview-strip">
                {formData.images.map((image, index) => <img src={image} alt={`Hotel preview ${index + 1}`} key={`${image}-${index}`} />)}
              </div>
            </FormSection>

            <FormSection title="Manager Assignment">
              <label className="hm-field">
                <span>Owner</span>
                <select required value={formData.owner} onChange={(event) => updateField('owner', event.target.value)}>
                  <option value="">Select owner</option>
                  {owners.map((owner) => <option key={owner._id} value={owner._id}>{owner.fullname || owner.username} @{owner.username}</option>)}
                </select>
              </label>
              <label className="hm-field">
                <span>Property Manager</span>
                <select value={formData.propertyManager} onChange={(event) => updateField('propertyManager', event.target.value)}>
                  <option value="">Use owner as manager</option>
                  {owners.map((owner) => <option key={owner._id} value={owner._id}>{owner.fullname || owner.username} @{owner.username}</option>)}
                </select>
              </label>
            </FormSection>

            <FormSection title="Amenities">
              <div className="hm-amenity-grid">
                {amenityOptions.map((amenity) => {
                  const checked = formData.amenities.includes(amenity.label);
                  return (
                    <label key={amenity.label} className={`hm-amenity-option ${checked ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...formData.amenities, amenity.label]
                            : formData.amenities.filter((item) => item !== amenity.label);
                          updateField('amenities', next);
                        }}
                      />
                      <span className="material-symbols-outlined">{amenity.icon}</span>
                      {amenity.label}
                    </label>
                  );
                })}
              </div>
            </FormSection>

            <FormSection title="Pricing">
              <div className="hm-three-col">
                <label className="hm-field"><span>Base price per night</span><input required type="number" min="1" value={formData.priceRange.min} onChange={(event) => updateField('priceRange.min', event.target.value)} /></label>
                <label className="hm-field"><span>Max price</span><input type="number" min="1" value={formData.priceRange.max} onChange={(event) => updateField('priceRange.max', event.target.value)} /></label>
                <label className="hm-field"><span>Currency</span><select value={formData.currency} onChange={(event) => updateField('currency', event.target.value)}>{currencyOptions.map((currency) => <option key={currency}>{currency}</option>)}</select></label>
              </div>
              <div className="hm-two-col">
                <label className="hm-field"><span>Contact Email</span><input required type="email" value={formData.contact.email} onChange={(event) => updateField('contact.email', event.target.value)} /></label>
                <label className="hm-field"><span>Contact Phone</span><input required value={formData.contact.phone} onChange={(event) => updateField('contact.phone', event.target.value)} /></label>
              </div>
            </FormSection>
          </div>
        )}
        <div className="hm-modal-footer">
          <button type="button" className="hm-ghost-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="hm-add-btn" disabled={loading}>
            {loading ? <span className="hm-inline-spinner" /> : <span className="material-symbols-outlined">check</span>}
            {modalType === 'add' ? 'Create Hotel' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

const FormSection = ({ title, children }) => (
  <section className="hm-form-section">
    <h3>{title}</h3>
    {children}
  </section>
);

const InfoSection = ({ title, icon, children }) => (
  <section className="hm-info-section">
    <h3><span className="material-symbols-outlined">{icon}</span>{title}</h3>
    {children}
  </section>
);

const ManagerCard = ({ manager }) => (
  <div className="hm-manager-card">
    <div className="hm-manager-avatar large">{manager?.profilePicture ? <img src={manager.profilePicture} alt={manager.fullname} /> : getInitials(manager)}</div>
    <div>
      <strong>{manager?.fullname || manager?.username || 'Unassigned'}</strong>
      <span>{manager?.email || 'No manager assigned'}</span>
    </div>
  </div>
);

export default HotelManagement;
