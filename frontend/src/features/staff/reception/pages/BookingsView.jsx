import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
  Users,
  Eye,
  X,
  CheckSquare,
  Square
} from 'lucide-react';
import { toast } from 'react-toastify';
import * as receptionApi from '../../../../core/api/services/reception.service';
import './BookingsView.css';

const getInitials = (fullName, fallback = 'U') => {
  const name = String(fullName || fallback).trim();
  return name
    .split(' ')
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((n) => n[0]?.toUpperCase())
    .filter(Boolean)
    .join('');
};

const normalizeAvatarUrl = (raw) => {
  const v = raw ? String(raw).trim() : '';
  if (!v) return null;

  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  if (v.startsWith('//')) return `https:${v}`;

  const base = import.meta.env.VITE_API_BASE_URL ? String(import.meta.env.VITE_API_BASE_URL).trim() : '';
  if (!base) return v; // best-effort fallback

  const baseNoTrailingSlash = base.replace(/\/+$/, '');
  if (v.startsWith('/')) return `${baseNoTrailingSlash}${v}`;
  return `${baseNoTrailingSlash}/${v}`;
};

const GuestAvatar = ({ avatar, name, initials }) => {
  const [failed, setFailed] = useState(false);

  const showAvatar = !!avatar && !failed;
  const safeName = name || 'Guest';
  const safeInitials = initials || getInitials(name, 'U');

  if (showAvatar) {
    return (
      <img
        src={avatar}
        alt={safeName}
        className="bv-guest-avatar w-10 h-10 rounded-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="bv-guest-avatar-placeholder w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0">
      {safeInitials}
    </div>
  );
};

const BookingsView = () => {
  const { isDark } = useTheme();

  // State management
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('this-month');
  const [roomFilter, setRoomFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Dropdown states
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [selectedBookingIds, setSelectedBookingIds] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [showBulkStatusDropdown, setShowBulkStatusDropdown] = useState(false);

  const loadBookings = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await receptionApi.getReservations({ limit: 200 });
      if (res?.success && res.data) {
        const mapped = res.data.map((b) => {
          const guestName =
            b.guest?.name ||
            b.guest?.fullName ||
            b.guest?.full_name ||
            b.guestInfo?.name ||
            b.guest?.guestName ||
            'Unknown';

          const avatarRaw =
            b.guest?.avatar ||
            b.guest?.avatarUrl ||
            b.guest?.profilePicture ||
            null;

          return {
            id: b.id || b.bookingId || b._id,
            numericId: parseInt(String(b.id || b.bookingId || '').replace('#BK-', '')) || 0,
            guest: {
              name: guestName,
              email: b.guest?.email || b.guestInfo?.email || '',
              avatar: normalizeAvatarUrl(avatarRaw),
              initials: getInitials(guestName, 'U'),
            },
            room: {
              type: b.room?.type || b.room?.roomName || '',
              number: b.room?.number || b.room?.roomNumber || '',
            },
            checkIn: new Date(b.checkIn),
            checkOut: new Date(b.checkOut),
            status: b.status === 'Checked-In' ? 'Checked In' : b.status === 'Checked-Out' ? 'Checked Out' : b.status,
            nights: b.nights || b.durationNights || 1,
            createdAt: new Date(b.createdAt || b.checkIn),
          };
        });
        setBookings(mapped.sort((a, b) => b.numericId - a.numericId));
      } else {
        setLoadError('Unable to load reservations. Please try again.');
      }
    } catch {
      setLoadError('Unable to load reservations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load bookings data from API
  useEffect(() => {
    loadBookings();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.bv-filter-dropdown')) {
        setShowStatusDropdown(false);
        setShowDateDropdown(false);
        setShowRoomDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Get unique room types for filter
  const roomTypes = useMemo(() => {
    const types = [...new Set(bookings.map(b => b.room.type))];
    return types.sort();
  }, [bookings]);

  // Filter bookings based on all criteria
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          booking.id.toLowerCase().includes(query) ||
          booking.guest.name.toLowerCase().includes(query) ||
          booking.guest.email.toLowerCase().includes(query) ||
          booking.room.type.toLowerCase().includes(query) ||
          booking.room.number.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      if (statusFilter !== 'all') {
        if (booking.status.toLowerCase().replace(' ', '-') !== statusFilter) {
          return false;
        }
      }

      if (dateFilter !== 'all') {
        const now = new Date();
        const checkIn = new Date(booking.checkIn);

        switch (dateFilter) {
          case 'today': {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            if (checkIn < today || checkIn >= tomorrow) return false;
            break;
          }
          case 'this-week': {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            if (checkIn < weekStart || checkIn >= weekEnd) return false;
            break;
          }
          case 'this-month': {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            if (checkIn < monthStart || checkIn > monthEnd) return false;
            break;
          }
          case 'last-month': {
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            if (checkIn < lastMonthStart || checkIn > lastMonthEnd) return false;
            break;
          }
          default:
            break;
        }
      }

      if (roomFilter !== 'all') {
        if (booking.room.type !== roomFilter) return false;
      }

      return true;
    });
  }, [bookings, searchQuery, statusFilter, dateFilter, roomFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBookings, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter, roomFilter]);

  const formatDate = (date) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bv-status-confirmed';
      case 'checked in': return 'bv-status-checked-in';
      case 'pending': return 'bv-status-pending';
      case 'checked out': return 'bv-status-checked-out';
      case 'cancelled': return 'bv-status-cancelled';
      default: return 'bv-status-default';
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages;
  };

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const toggleSelectBooking = (bookingId) => {
    setSelectedBookingIds(prev =>
      prev.includes(bookingId) ? prev.filter(id => id !== bookingId) : [...prev, bookingId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedBookingIds.length === paginatedBookings.length) {
      setSelectedBookingIds([]);
    } else {
      setSelectedBookingIds(paginatedBookings.map(b => b.id));
    }
  };

  const clearSelection = () => setSelectedBookingIds([]);

  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedBookingIds.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to update ${selectedBookingIds.length} booking(s) to ${newStatus}?`
    );

    if (!confirmed) return;

    setBulkProcessing(true);
    try {
      const res = await receptionApi.bulkUpdateBookingStatus({
        bookingIds: selectedBookingIds,
        newStatus,
        reason: `Bulk status update to ${newStatus}`
      });

      if (res?.success) {
        const successIds = new Set((res.data?.success || []).map(s => s.bookingId));
        setBookings(prev => prev.map(b =>
          successIds.has(b.id) ? { ...b, status: newStatus } : b
        ));

        const successCount = res.data?.success?.length || 0;
        const failedCount = res.data?.failed?.length || 0;

        toast.success(`Bulk update completed: ${successCount} successful, ${failedCount} failed`, {
          position: 'top-right',
          autoClose: 4000,
          theme: isDark ? 'dark' : 'light',
        });

        setSelectedBookingIds([]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk update failed. Please try again.', {
        position: 'top-right',
        autoClose: 4000,
        theme: isDark ? 'dark' : 'light',
      });
    } finally {
      setBulkProcessing(false);
      setShowBulkStatusDropdown(false);
    }
  };

  const getStatusDisplayName = () => {
    if (statusFilter === 'all') return 'All Status';
    return statusFilter.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getDateDisplayName = () => {
    switch (dateFilter) {
      case 'all': return 'All Time';
      case 'today': return 'Today';
      case 'this-week': return 'This Week';
      case 'this-month': return 'This Month';
      case 'last-month': return 'Last Month';
      default: return 'This Month';
    }
  };

  const getRoomDisplayName = () => {
    if (roomFilter === 'all') return 'All Rooms';
    return roomFilter;
  };

  return (
    <div className={`bookings-view ${isDark ? 'dark' : ''}`}>
      {!!loadError && (
        <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{loadError}</span>
          <button
            onClick={loadBookings}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#991b1b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Bar - Using Tailwind + CSS */}
      <div className="bv-filter-bar flex items-center gap-4 mb-6 flex-wrap">
        {/* Search Input */}
        <div className="bv-search-wrapper relative shrink-0" style={{ flexBasis: '280px' }}>
          <Search className="bv-search-icon absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
          <input
            type="text"
            className="bv-search-input w-full py-3 pl-11 pr-4 rounded-xl text-sm transition-all duration-200"
            placeholder="Search by name, ID, room..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        {/* Status Filter */}
        <div className="bv-filter-dropdown relative">
          <button
            className="bv-filter-btn flex items-center gap-2 px-4 py-3 rounded-xl text-sm cursor-pointer transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setShowStatusDropdown(!showStatusDropdown);
              setShowDateDropdown(false);
              setShowRoomDropdown(false);
            }}
          >
            <span>{getStatusDisplayName()}</span>
            <ChevronDown size={16} className="text-slate-500" />
          </button>
          {showStatusDropdown && (
            <div className="bv-dropdown-menu absolute top-full left-0 mt-2 min-w-[180px] rounded-xl shadow-lg z-50 overflow-hidden">
              {['all', 'confirmed', 'checked-in', 'pending', 'checked-out', 'cancelled'].map(status => (
                <button
                  key={status}
                  className={`bv-dropdown-item block w-full px-4 py-3 text-left text-sm transition-all duration-150 ${statusFilter === status ? 'active' : ''}`}
                  onClick={() => { setStatusFilter(status); setShowStatusDropdown(false); }}
                >
                  {status === 'all' ? 'All Status' : status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Filter */}
        <div className="bv-filter-dropdown relative">
          <button
            className="bv-filter-btn flex items-center gap-2 px-4 py-3 rounded-xl text-sm cursor-pointer transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setShowDateDropdown(!showDateDropdown);
              setShowStatusDropdown(false);
              setShowRoomDropdown(false);
            }}
          >
            <span>{getDateDisplayName()}</span>
            <ChevronDown size={16} className="text-slate-500" />
          </button>
          {showDateDropdown && (
            <div className="bv-dropdown-menu absolute top-full left-0 mt-2 min-w-[180px] rounded-xl shadow-lg z-50 overflow-hidden">
              {[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'this-week', label: 'This Week' },
                { value: 'this-month', label: 'This Month' },
                { value: 'last-month', label: 'Last Month' }
              ].map(option => (
                <button
                  key={option.value}
                  className={`bv-dropdown-item block w-full px-4 py-3 text-left text-sm transition-all duration-150 ${dateFilter === option.value ? 'active' : ''}`}
                  onClick={() => { setDateFilter(option.value); setShowDateDropdown(false); }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Room Filter */}
        <div className="bv-filter-dropdown relative">
          <button
            className="bv-filter-btn flex items-center gap-2 px-4 py-3 rounded-xl text-sm cursor-pointer transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setShowRoomDropdown(!showRoomDropdown);
              setShowStatusDropdown(false);
              setShowDateDropdown(false);
            }}
          >
            <span>{getRoomDisplayName()}</span>
            <ChevronDown size={16} className="text-slate-500" />
          </button>
          {showRoomDropdown && (
            <div className="bv-dropdown-menu bv-dropdown-scrollable absolute top-full left-0 mt-2 min-w-[180px] rounded-xl shadow-lg z-50 overflow-hidden max-h-72 overflow-y-auto">
              <button
                className={`bv-dropdown-item block w-full px-4 py-3 text-left text-sm transition-all duration-150 ${roomFilter === 'all' ? 'active' : ''}`}
                onClick={() => { setRoomFilter('all'); setShowRoomDropdown(false); }}
              >
                All Rooms
              </button>
              {roomTypes.map(type => (
                <button
                  key={type}
                  className={`bv-dropdown-item block w-full px-4 py-3 text-left text-sm transition-all duration-150 ${roomFilter === type ? 'active' : ''}`}
                  onClick={() => { setRoomFilter(type); setShowRoomDropdown(false); }}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      {selectedBookingIds.length > 0 && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: 'var(--bg-surface, #f8fafc)', border: '1px solid var(--border-primary, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
              {selectedBookingIds.length} selected
            </span>
            <button
              onClick={clearSelection}
              style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1px solid var(--border-primary, #e2e8f0)', background: 'transparent', color: 'var(--text-secondary, #64748b)', cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowBulkStatusDropdown(!showBulkStatusDropdown);
              }}
              disabled={bulkProcessing}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: bulkProcessing ? 'not-allowed' : 'pointer', opacity: bulkProcessing ? 0.6 : 1 }}
            >
              {bulkProcessing ? <Loader2 size={14} className="animate-spin" /> : null}
              {bulkProcessing ? 'Processing...' : 'Update Status'}
              {!bulkProcessing && <ChevronDown size={14} />}
            </button>
            {showBulkStatusDropdown && !bulkProcessing && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, minWidth: 160, background: 'var(--bg-card, #fff)', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid var(--border-primary, #e2e8f0)', overflow: 'hidden', zIndex: 100 }}>
                {['Confirmed', 'Pending', 'Cancelled', 'No-Show'].map(status => (
                  <button
                    key={status}
                    onClick={() => handleBulkStatusUpdate(status)}
                    style={{ display: 'block', width: '100%', padding: '10px 14px', fontSize: 13, fontWeight: 500, textAlign: 'left', border: 'none', background: 'transparent', color: 'var(--text-primary, #1e293b)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-surface, #f8fafc)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bv-loading flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="bv-loading-spinner text-blue-500" size={32} />
          <p className="text-sm text-slate-500 m-0">Loading bookings...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredBookings.length === 0 && (
        <div className="bv-empty-state flex flex-col items-center justify-center py-20 text-center">
          <Calendar size={48} className="mb-5 opacity-50 text-slate-400" />
          <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
          <p className="text-sm text-slate-500 max-w-md mb-5">
            {searchQuery || statusFilter !== 'all' || roomFilter !== 'all'
              ? 'Try adjusting your search or filters to find what you\'re looking for.'
              : 'There are no bookings to display at this time.'}
          </p>
          {(searchQuery || statusFilter !== 'all' || roomFilter !== 'all') && (
            <button
              className="bv-clear-filters-btn px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setDateFilter('this-month');
                setRoomFilter('all');
              }}
            >
              Clear all filters
            </button>
          )}
        </div>
      )}



      {/* Grid View */}
      {!isLoading && filteredBookings.length > 0 && (
        <>
          {/* Select All Row */}
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={toggleSelectAll}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid var(--border-primary, #e2e8f0)', background: 'var(--bg-surface, #f8fafc)', color: 'var(--text-primary, #1e293b)', cursor: 'pointer' }}
            >
              {selectedBookingIds.length === paginatedBookings.length ? <CheckSquare size={16} /> : <Square size={16} />}
              {selectedBookingIds.length === paginatedBookings.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="bv-grid-container grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {paginatedBookings.map((booking) => (
              <div key={booking.id} className="bv-grid-card p-5 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5" style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
                  <input
                    type="checkbox"
                    checked={selectedBookingIds.includes(booking.id)}
                    onChange={() => toggleSelectBooking(booking.id)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="bv-grid-card-header flex items-center justify-between mb-4" style={{ paddingLeft: 28 }}>
                  <span className="bv-grid-id font-semibold">{booking.id}</span>
                  <span className={`bv-status-badge inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${getStatusClass(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
              <div className="bv-grid-guest flex items-center gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <GuestAvatar
                  avatar={booking.guest.avatar}
                  name={booking.guest.name}
                  initials={booking.guest.initials}
                />
                <div className="bv-guest-details flex flex-col gap-0.5">
                  <span className="bv-guest-name font-medium">{booking.guest.name}</span>
                  <span className="bv-guest-email text-sm text-slate-500">{booking.guest.email}</span>
                </div>
              </div>
              <div className="bv-grid-room flex flex-col gap-1 mb-4">
                <span className="bv-room-type font-medium">{booking.room.type}</span>
                <span className="bv-room-number text-sm text-slate-500">Room {booking.room.number}</span>
              </div>
              <div className="bv-grid-dates flex gap-6">
                <div className="bv-grid-date-item flex flex-col gap-1">
                  <span className="bv-date-label text-xs font-semibold uppercase tracking-wider text-slate-500">Check In</span>
                  <span className="bv-date-value text-sm font-medium">{formatDate(booking.checkIn)}</span>
                </div>
                <div className="bv-grid-date-item flex flex-col gap-1">
                  <span className="bv-date-label text-xs font-semibold uppercase tracking-wider text-slate-500">Check Out</span>
                  <span className="bv-date-value text-sm font-medium">{formatDate(booking.checkOut)}</span>
                </div>
              </div>
              <div className="bv-grid-actions" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-primary, #e2e8f0)', display: 'flex', gap: 8 }}>
                <button
                  className="bv-action-btn"
                  onClick={() => setSelectedBooking(booking)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid var(--border-primary, #e2e8f0)', background: 'var(--bg-surface, #f8fafc)', color: 'var(--text-primary, #334155)', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <Eye size={14} /> View
                </button>
              </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="bv-modal-overlay" onClick={() => setSelectedBooking(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
          <div className="bv-modal-content" onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card, #fff)', borderRadius: 16, maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border-primary, #e2e8f0)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary, #1e293b)' }}>Booking Details</h3>
              <button onClick={() => setSelectedBooking(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} style={{ color: 'var(--text-secondary, #64748b)' }} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>{selectedBooking.id}</span>
                <span className={`bv-status-badge inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${getStatusClass(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-tertiary, #94a3b8)' }}>Guest</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>{selectedBooking.guest.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>{selectedBooking.guest.email}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-tertiary, #94a3b8)' }}>Room</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>{selectedBooking.room.type}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>Room {selectedBooking.room.number}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-tertiary, #94a3b8)' }}>Check In</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary, #1e293b)' }}>{formatDate(selectedBooking.checkIn)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-tertiary, #94a3b8)' }}>Check Out</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary, #1e293b)' }}>{formatDate(selectedBooking.checkOut)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-tertiary, #94a3b8)' }}>Duration</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary, #1e293b)' }}>{selectedBooking.nights} night{selectedBooking.nights !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-tertiary, #94a3b8)' }}>Booked On</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary, #1e293b)' }}>{formatDate(selectedBooking.createdAt)}</span>
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-primary, #e2e8f0)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedBooking(null)}
                style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && filteredBookings.length > 0 && (
        <div className="bv-pagination flex items-center justify-between mt-6 pt-4 flex-wrap gap-4">
          <div className="bv-pagination-info text-sm text-slate-500">
            Showing <span className="bv-pagination-highlight font-semibold text-blue-500">
              {((currentPage - 1) * itemsPerPage) + 1}
            </span> to <span className="bv-pagination-highlight font-semibold text-blue-500">
              {Math.min(currentPage * itemsPerPage, filteredBookings.length)}
            </span> of <span className="bv-pagination-highlight font-semibold text-blue-500">
              {filteredBookings.length}
            </span> results
          </div>

          <div className="bv-pagination-controls flex items-center gap-1.5">
            <button
              className="bv-page-btn bv-page-nav flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={18} />
            </button>

            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="bv-page-ellipsis px-2 text-slate-500 text-sm">...</span>
              ) : (
                <button
                  key={page}
                  className={`bv-page-btn flex items-center justify-center min-w-9 h-9 px-3 rounded-lg text-sm transition-all duration-200 ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              )
            ))}

            <button
              className="bv-page-btn bv-page-nav flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsView;
