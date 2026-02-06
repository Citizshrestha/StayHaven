import React, { useEffect, useState } from 'react';
import axiosClient from '../../axiosClient';
import './Mybooking.css';

export default function BookingHistory({ embedded = false }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const userId = localStorage.getItem('userId');
        if (userId) {
          const res = await axiosClient.get(`/api/user/${userId}/bookings`);
          setBookings(res?.data || []);
        } else {
          // Fallback demo
          const demo = JSON.parse(localStorage.getItem('guest_bookings') || '[]');
          setBookings(demo);
        }
      } catch (err) {
        console.error(err);
        const demo = JSON.parse(localStorage.getItem('guest_bookings') || '[]');
        setBookings(demo);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div className="mybooking-root">
      <div className="mybooking-header">
        <h2>Booking History</h2>
      </div>
      <div className="mybooking-content">
        {loading && <div>Loading…</div>}
        {!loading && bookings.length === 0 && <div>No previous bookings found.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map((b) => (
            <div key={b._id || b.id || Math.random()} style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{b.hotelName || b.propertyName || 'Hotel'}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>{new Date(b.date || b.checkIn || Date.now()).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>${b.total || b.price || '0.00'}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>{b.status || 'Completed'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
