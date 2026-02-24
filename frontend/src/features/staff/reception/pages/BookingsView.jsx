import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
  Users
} from 'lucide-react';
import './BookingsView.css';

// Sample booking data generator
const generateSampleBookings = () => {
  const guests = [
    { name: 'Sarah Jenkins', email: 'sarah.j@example.com', avatar: null },
    { name: 'Michael Foster', email: 'm.foster@tech.co', avatar: null },
    { name: 'Lindsay Walton', email: 'lindsay.w@example.com', avatar: null },
    { name: 'Courtney Wilson', email: 'courtney.w@example.com', avatar: null },
    { name: 'Tom Cook', email: 'tom.cook@example.com', avatar: null },
    { name: 'Whitney Francis', email: 'whitney.f@example.com', avatar: null },
    { name: 'Leonard Krasner', email: 'leonard.k@example.com', avatar: null },
    { name: 'Floyd Miles', email: 'floyd.m@example.com', avatar: null },
    { name: 'Emily Selman', email: 'emily.s@example.com', avatar: null },
    { name: 'Kristin Watson', email: 'kristin.w@example.com', avatar: null },
    { name: 'Emma Wilson', email: 'emma.w@example.com', avatar: null },
    { name: 'James Anderson', email: 'james.a@example.com', avatar: null },
    { name: 'Sophia Martinez', email: 'sophia.m@example.com', avatar: null },
    { name: 'Oliver Brown', email: 'oliver.b@example.com', avatar: null },
    { name: 'Isabella Garcia', email: 'isabella.g@example.com', avatar: null },
  ];

  const roomTypes = [
    { type: 'Deluxe King', rooms: ['304', '305', '306', '307', '308'] },
    { type: 'Presidential Suite', rooms: ['501', '502'] },
    { type: 'Standard Twin', rooms: ['102', '103', '104', '105', '106'] },
    { type: 'Standard Queen', rooms: ['201', '202', '203', '204', '205'] },
    { type: 'Executive Suite', rooms: ['401', '402', '403'] },
    { type: 'Ocean View', rooms: ['601', '602', '603', '604'] },
    { type: 'Garden View', rooms: ['701', '702', '703'] },
  ];

  const statuses = ['Confirmed', 'Checked In', 'Pending', 'Checked Out', 'Cancelled'];
  const statusWeights = [35, 25, 20, 15, 5];

  const getWeightedStatus = () => {
    const random = Math.random() * 100;
    let cumulative = 0;
    for (let i = 0; i < statuses.length; i++) {
      cumulative += statusWeights[i];
      if (random <= cumulative) return statuses[i];
    }
    return statuses[0];
  };

  const bookings = [];
  const baseDate = new Date('2023-10-01');

  for (let i = 0; i < 156; i++) {
    const guest = guests[Math.floor(Math.random() * guests.length)];
    const roomTypeData = roomTypes[Math.floor(Math.random() * roomTypes.length)];
    const room = roomTypeData.rooms[Math.floor(Math.random() * roomTypeData.rooms.length)];

    const checkInOffset = Math.floor(Math.random() * 60) - 10;
    const stayLength = Math.floor(Math.random() * 7) + 1;

    const checkIn = new Date(baseDate);
    checkIn.setDate(checkIn.getDate() + checkInOffset);

    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + stayLength);

    const bookingId = `#BK-${(5023 - i).toString().padStart(4, '0')}`;

    bookings.push({
      id: bookingId,
      numericId: 5023 - i,
      guest: {
        name: guest.name,
        email: guest.email,
        avatar: guest.avatar,
        initials: guest.name.split(' ').map(n => n[0]).join('')
      },
      room: {
        type: roomTypeData.type,
        number: room
      },
      checkIn: checkIn,
      checkOut: checkOut,
      status: getWeightedStatus(),
      nights: stayLength,
      createdAt: new Date(checkIn.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    });
  }

  return bookings.sort((a, b) => b.numericId - a.numericId);
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

  // Load bookings data
  useEffect(() => {
    const loadBookings = async () => {
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const data = generateSampleBookings();
        setBookings(data);
      } catch (error) {
        console.error('Error loading bookings:', error);
      } finally {
        setIsLoading(false);
      }
    };
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
          case 'today':
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            if (checkIn < today || checkIn >= tomorrow) return false;
            break;
          case 'this-week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            if (checkIn < weekStart || checkIn >= weekEnd) return false;
            break;
          case 'this-month':
            const demoMonthStart = new Date(2023, 9, 1);
            const demoMonthEnd = new Date(2023, 9, 31);
            if (checkIn < demoMonthStart || checkIn > demoMonthEnd) return false;
            break;
          case 'last-month':
            const lastMonthStart = new Date(2023, 8, 1);
            const lastMonthEnd = new Date(2023, 8, 30);
            if (checkIn < lastMonthStart || checkIn > lastMonthEnd) return false;
            break;
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
      {/* Filter Bar - Using Tailwind + CSS */}
      <div className="bv-filter-bar flex items-center gap-4 mb-6 flex-wrap">
        {/* Search Input */}
        <div className="bv-search-wrapper relative flex-shrink-0" style={{ flexBasis: '280px' }}>
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
        <div className="bv-grid-container grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {paginatedBookings.map((booking) => (
            <div key={booking.id} className="bv-grid-card p-5 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
              <div className="bv-grid-card-header flex items-center justify-between mb-4">
                <span className="bv-grid-id font-semibold">{booking.id}</span>
                <span className={`bv-status-badge inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${getStatusClass(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
              <div className="bv-grid-guest flex items-center gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                {booking.guest.avatar ? (
                  <img
                    src={booking.guest.avatar}
                    alt={booking.guest.name}
                    className="bv-guest-avatar w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="bv-guest-avatar-placeholder w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {booking.guest.initials}
                  </div>
                )}
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
            </div>
          ))}
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
                  className={`bv-page-btn flex items-center justify-center min-w-[36px] h-9 px-3 rounded-lg text-sm transition-all duration-200 ${currentPage === page ? 'active' : ''}`}
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
