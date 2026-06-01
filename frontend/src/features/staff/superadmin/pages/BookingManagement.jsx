import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import SuperAdminLayout from './SuperAdminLayout';
import { getBookings } from '../../../../core/api/services/superadmin.service';
import './BookingManagement.css';

const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Confirmed', value: 'Confirmed' },
  { label: 'Checked-In', value: 'Checked-In' },
  { label: 'Checked-Out', value: 'Checked-Out' },
  { label: 'Cancelled', value: 'Cancelled' },
  { label: 'No-Show', value: 'No-Show' },
];

const paymentStatusOptions = [
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Partial', value: 'partial' },
  { label: 'Paid', value: 'paid' },
  { label: 'Refunded', value: 'refunded' },
];

const formatDate = (date) => (date
  ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '-');

const formatMoney = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount || 0));

const getGuestName = (booking) =>
  booking?.guestInfo?.name || booking?.user?.fullname || booking?.user?.username || 'Guest';

const getGuestContact = (booking) =>
  booking?.guestInfo?.email || booking?.user?.email || booking?.guestInfo?.phone || '';

const getHotelName = (booking) => booking?.hotel?.name || '—';

const getRoomLabel = (booking) => {
  const room = booking?.room;
  if (!room) return '—';
  if (room.roomNumber) return `Room ${room.roomNumber}`;
  return room.name || room.roomType || 'Room';
};

const getPaymentLabel = (status) =>
  paymentStatusOptions.find((item) => item.value === status)?.label || status || '-';

const BookingManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hotelFilter, setHotelFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, hotelFilter, dateFrom, dateTo, pageSize]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (hotelFilter.trim()) params.hotel = hotelFilter.trim();
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await getBookings(params);
      setBookings(response.data || response.bookings || []);
      setTotal(response.total ?? response.pagination?.total ?? 0);
      setTotalPages(response.totalPages ?? response.pagination?.totalPages ?? 1);
    } catch (error) {
      toast.error(error?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [page, pageSize, debouncedSearch, statusFilter, hotelFilter, dateFrom, dateTo]);

  const pageStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = total === 0 ? 0 : Math.min(page * pageSize, total);
  const visiblePages = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(totalPages, 5) }, (_, index) => start + index);
  }, [page, totalPages]);

  return (
    <SuperAdminLayout pageTitle="Booking Management">
      <div className="bm-container">
        <div className="bm-page-header">
          <div>
            <h1>Booking Management</h1>
            <p>Track, filter, and review all platform bookings in one place.</p>
          </div>
          <button className="bm-primary-btn" onClick={fetchBookings} disabled={loading}>
            <span className="material-symbols-outlined">refresh</span>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="bm-toolbar">
          <div className="bm-toolbar-left">
            <div className="bm-search-wrapper">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Search booking ID, guest name, email"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <input
              className="bm-input"
              placeholder="Filter by hotel ID"
              value={hotelFilter}
              onChange={(event) => setHotelFilter(event.target.value)}
            />
            <select className="bm-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className="bm-date-range">
              <input
                type="date"
                className="bm-input"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
              <span>to</span>
              <input
                type="date"
                className="bm-input"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
          </div>
          <div className="bm-toolbar-right">
            <span className="bm-total">{total.toLocaleString()} total bookings</span>
            <select className="bm-select" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        <div className="bm-table-card">
          <div className="bm-table-wrapper">
            <table className="bm-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Guest</th>
                  <th>Hotel</th>
                  <th>Room</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="bm-skeleton-row">
                      <td colSpan="10">
                        <div className="bm-skeleton-bar" />
                      </td>
                    </tr>
                  ))
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="bm-empty-cell">
                      <div className="bm-empty-state">
                        <span className="material-symbols-outlined">event_busy</span>
                        <h3>No bookings found</h3>
                        <p>Try adjusting your filters or refreshing the list.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking._id}>
                      <td>
                        <div className="bm-booking-id">
                          <span>{booking.bookingId || booking._id?.slice(-6)}</span>
                          <small>{booking.confirmationCode || '—'}</small>
                        </div>
                      </td>
                      <td>
                        <div className="bm-guest">
                          <div className="bm-guest-avatar">{getGuestName(booking).slice(0, 2).toUpperCase()}</div>
                          <div>
                            <strong>{getGuestName(booking)}</strong>
                            <small>{getGuestContact(booking)}</small>
                          </div>
                        </div>
                      </td>
                      <td>{getHotelName(booking)}</td>
                      <td>{getRoomLabel(booking)}</td>
                      <td>{formatDate(booking.checkIn)}</td>
                      <td>{formatDate(booking.checkOut)}</td>
                      <td>{formatMoney(booking.totalAmount, booking.currency)}</td>
                      <td>
                        <span className={`bm-status bm-status-${(booking.status || 'pending').toLowerCase()}`}>
                          {booking.status || 'Pending'}
                        </span>
                      </td>
                      <td>
                        <span className={`bm-status bm-payment bm-payment-${(booking.paymentStatus || 'unpaid').toLowerCase()}`}>
                          {getPaymentLabel(booking.paymentStatus)}
                        </span>
                      </td>
                      <td>{formatDate(booking.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bm-pagination">
            <div className="bm-pagination-info">
              Showing <strong>{pageStart}</strong>-<strong>{pageEnd}</strong> of <strong>{total.toLocaleString()}</strong>
            </div>
            <div className="bm-pagination-controls">
              <button className="bm-page-btn" onClick={() => setPage((value) => Math.max(value - 1, 1))} disabled={page === 1}>
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              {visiblePages.map((pageNumber) => (
                <button
                  key={pageNumber}
                  className={`bm-page-btn bm-number-page ${page === pageNumber ? 'active' : ''}`}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              <button className="bm-page-btn" onClick={() => setPage((value) => Math.min(value + 1, totalPages))} disabled={page >= totalPages}>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default BookingManagement;
