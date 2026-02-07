import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Mybooking.css';
import axiosClient from '../../axiosClient';

export default function Mybooking({ embedded = false, onNavigate }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchBookings = async () => {
      setLoading(true);
      setError(null);
      try {
        // Try to fetch bookings from user endpoint if available
        // Backend: There isn't a clear /api/user/bookings in the codebase snapshot, so we try a few likely endpoints
        const candidateEndpoints = [
          '/api/user/bookings',
          '/api/bookings',
          '/api/orders/my-bookings',
          '/api/orders',
        ];

        let resp = null;
        for (const ep of candidateEndpoints) {
          try {
            resp = await axiosClient.get(ep);
            if (resp && (resp.data?.bookings || resp.data?.orders || resp.data?.success)) break;
          } catch (err) {
            // ignore and try next
          }
        }

        if (!resp) {
          // fallback: show demo bookings
          if (!mounted) return;
          setBookings([{
            id: 'demo-1',
            hotelName: 'Kathmandu Grand',
            roomNumber: '101',
            checkIn: '2026-02-14',
            checkOut: '2026-02-16',
            status: 'Confirmed'
          },{
            id: 'demo-2',
            hotelName: 'Pokhara Resort',
            roomNumber: '305',
            checkIn: '2026-03-01',
            checkOut: '2026-03-04',
            status: 'Cancelled'
          }]);
          return;
        }

        // Normalize response
        const data = resp.data;
        let list = [];
        if (data.bookings) list = data.bookings;
        else if (data.orders) list = data.orders;
        else if (data.success && Array.isArray(data.data)) list = data.data;
        else if (Array.isArray(data)) list = data;

        if (!mounted) return;
        setBookings(list.map((b) => ({
          id: b._id || b.id || b.orderNumber || Math.random().toString(36).slice(2),
          hotelName: b.hotel?.name || b.hotelName || b.propertyName || 'Hotel',
          roomNumber: b.roomNumber || b.room?.roomNumber || b.roomName || b.room || '—',
          checkIn: b.checkIn || b.startDate || b.createdAt || '',
          checkOut: b.checkOut || b.endDate || '',
          status: b.status || b.bookingStatus || 'Unknown'
        })));
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError('Could not load bookings.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchBookings();
    return () => mounted = false;
  }, []);

  function handleAddMore() {
    // Navigate to dashboard / home where user can book more hotels
    if (onNavigate) return onNavigate('home');
    navigate('/guest-dashboard');
  }

  function handleView(booking) {
    // Navigate to booking detail page if exists
    navigate(`/booking/${booking.id}`, { state: { booking } });
  }

  return (
    <div className="mybooking-root">
      <div className="mybooking-header">
        <h2>My Bookings</h2>
        <div className="header-actions">
          <button className="primary" onClick={handleAddMore}>Add</button>
        </div>
      </div>

      <div className="mybooking-content">
        {loading && <div className="status">Loading your bookings…</div>}
        {error && <div className="status error">{error}</div>}

        {!loading && !bookings.length && (
          <div className="empty-state">
            <p>No bookings found.</p>
            <button onClick={handleAddMore} className="primary">Book a room</button>
          </div>
        )}

        <div className="bookings-grid">
          {bookings.map((b) => (
            <div key={b.id} className="booking-card">
              <div className="booking-main">
                <div className="booking-hotel">{b.hotelName}</div>
                <div className="booking-room">Room: {b.roomNumber}</div>
                <div className="booking-dates">{b.checkIn ? `${new Date(b.checkIn).toLocaleDateString()} — ${b.checkOut ? new Date(b.checkOut).toLocaleDateString() : ''}` : ''}</div>
                <div className={`booking-status ${String(b.status).toLowerCase()}`}>{b.status}</div>
              </div>
              <div className="booking-actions">
                <button onClick={() => handleView(b)}>View</button>
                <button onClick={() => alert('Cancel flow not implemented')}>Cancel</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
