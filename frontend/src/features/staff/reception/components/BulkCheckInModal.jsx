import React, { useState, useEffect } from 'react';
import axiosClient from '../../../../axiosClient';
import {
  X,
  Users,
  CheckCircle,
  AlertTriangle,
  Search,
  CalendarCheck,
  Loader2,
  ArrowRight,
  Bed,
} from 'lucide-react';
import { useTheme } from '../../../../hooks/useTheme';

// ============================================
// BULK CHECK-IN MODAL
// ============================================
const BulkCheckInModal = ({ isOpen, onClose, hotelId = null }) => {
  const { isDark } = useTheme();
  const [bookings, setBookings] = useState([]);
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && hotelId) {
      fetchBookings();
    }
  }, [isOpen, hotelId]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axiosClient.get(
        `/api/reception/reservations?hotelId=${hotelId}&status=Confirmed&limit=100`
      );
      // Filter to only show today's arrivals
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayArrivals = (response.data?.data || []).filter((b) => {
        const checkIn = new Date(b.checkIn);
        return checkIn >= today && checkIn < tomorrow;
      });

      setBookings(todayArrivals);
    } catch (err) {
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const toggleBooking = (bookingId) => {
    setSelectedBookings((prev) =>
      prev.includes(bookingId)
        ? prev.filter((id) => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const selectAll = () => {
    const allIds = filteredBookings.map((b) => b._id);
    setSelectedBookings(allIds);
  };

  const deselectAll = () => {
    setSelectedBookings([]);
  };

  const handleBulkCheckIn = async () => {
    if (selectedBookings.length === 0) {
      setError('Please select at least one booking');
      return;
    }

    if (selectedBookings.length > 50) {
      setError('Maximum 50 bookings can be processed at once');
      return;
    }

    try {
      setProcessing(true);
      setError('');

      const response = await axiosClient.post('/api/reception/batch/checkin', {
        bookingIds: selectedBookings,
      });

      setSuccess(response.data?.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process check-ins');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedBookings([]);
    setError('');
    setSuccess(null);
    setSearchQuery('');
    onClose();
  };

  const filteredBookings = bookings.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const guestName = b.guest?.name?.toLowerCase() || '';
    const roomNum = String(b.room?.number || '');
    const bookingId = String(b.id || '').toLowerCase();
    return (
      guestName.includes(q) || roomNum.includes(q) || bookingId.includes(q)
    );
  });

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px',
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #1e293b 0%, #1a2332 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
          borderRadius: '20px',
          boxShadow: isDark
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px 20px',
            borderBottom: isDark
              ? '1px solid rgba(255,255,255,0.06)'
              : '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: isDark
                  ? 'linear-gradient(135deg, #10b98125, #10b98110)'
                  : 'linear-gradient(135deg, #10b98115, #10b98108)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <Users size={24} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                  margin: '0 0 4px 0',
                }}
              >
                Bulk Check-In
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: isDark ? '#64748b' : '#94a3b8',
                  margin: 0,
                }}
              >
                Check in multiple guests at once (max 50)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(0, 0, 0, 0.04)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isDark ? '#94a3b8' : '#64748b',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}
        >
          {/* Success State */}
          {success ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#d1fae5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle size={32} style={{ color: '#10b981' }} />
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: isDark ? '#f1f5f9' : '#0f172a',
                }}
              >
                Check-In Complete!
              </h3>
              <p style={{ fontSize: 14, color: isDark ? '#94a3b8' : '#64748b' }}>
                <strong>{success.success?.length || 0}</strong> guests checked in
                successfully
                {success.failed?.length > 0 && (
                  <>, <strong>{success.failed.length}</strong> failed</>
                )}
              </p>

              {success.failed?.length > 0 && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '12px 16px',
                    background: '#fef2f2',
                    borderRadius: '8px',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#dc2626',
                      marginBottom: '8px',
                    }}
                  >
                    Failed Check-ins:
                  </div>
                  {success.failed.map((f, i) => (
                    <div
                      key={i}
                      style={{ fontSize: '12px', color: '#b91c1c' }}
                    >
                      • {f.reason}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleClose}
                style={{
                  marginTop: '24px',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Error */}
              {error && (
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#fee2e2',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    color: '#dc2626',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}

              {/* Selection Info */}
              <div
                style={{
                  padding: '12px 16px',
                  background: isDark
                    ? 'rgba(16, 185, 129, 0.1)'
                    : 'rgba(16, 185, 129, 0.05)',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  border: isDark
                    ? '1px solid rgba(16, 185, 129, 0.2)'
                    : '1px solid rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarCheck size={18} style={{ color: '#10b981' }} />
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: isDark ? '#f1f5f9' : '#0f172a',
                    }}
                  >
                    {selectedBookings.length} selected
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={selectAll}
                    style={{
                      fontSize: '12px',
                      color: '#10b981',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Select All
                  </button>
                  <span style={{ color: isDark ? '#64748b' : '#94a3b8' }}>|</span>
                  <button
                    onClick={deselectAll}
                    style={{
                      fontSize: '12px',
                      color: isDark ? '#94a3b8' : '#64748b',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Search */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: isDark
                      ? 'rgba(15, 23, 42, 0.5)'
                      : '#f8fafc',
                    border: isDark
                      ? '1px solid rgba(255,255,255,0.08)'
                      : '1px solid #e2e8f0',
                  }}
                >
                  <Search
                    size={16}
                    style={{ color: isDark ? '#64748b' : '#94a3b8' }}
                  />
                  <input
                    type="text"
                    placeholder="Search by guest name or room number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      fontSize: '13px',
                      background: 'transparent',
                      color: isDark ? '#f1f5f9' : '#0f172a',
                    }}
                  />
                </div>
              </div>

              {/* Bookings List */}
              <div
                style={{
                  maxHeight: '360px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {loading ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: isDark ? '#94a3b8' : '#64748b',
                    }}
                  >
                    <Loader2
                      size={24}
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                    <p style={{ marginTop: '12px', fontSize: '14px' }}>
                      Loading bookings...
                    </p>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: isDark ? '#94a3b8' : '#64748b',
                      fontSize: '14px',
                    }}
                  >
                    {bookings.length === 0
                      ? 'No confirmed arrivals for today'
                      : 'No bookings match your search'}
                  </div>
                ) : (
                  filteredBookings.map((b) => {
                    const isSelected = selectedBookings.includes(b._id);
                    return (
                      <div
                        key={b._id}
                        onClick={() => toggleBooking(b._id)}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          background: isSelected
                            ? isDark
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(16, 185, 129, 0.08)'
                            : isDark
                            ? 'rgba(15, 23, 42, 0.4)'
                            : '#fff',
                          border: isSelected
                            ? '2px solid #10b981'
                            : isDark
                            ? '1px solid rgba(255,255,255,0.06)'
                            : '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: isSelected
                              ? '2px solid #10b981'
                              : isDark
                              ? '2px solid #475569'
                              : '2px solid #cbd5e1',
                            background: isSelected ? '#10b981' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && (
                            <CheckCircle size={14} style={{ color: 'white' }} />
                          )}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: isDark ? '#f1f5f9' : '#0f172a',
                              marginBottom: '4px',
                            }}
                          >
                            {b.guest?.name || 'Unknown Guest'}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: isDark ? '#64748b' : '#94a3b8',
                            }}
                          >
                            <Bed
                              size={12}
                              style={{
                                verticalAlign: 'middle',
                                marginRight: '4px',
                              }}
                            />
                            Room {b.room?.number || 'N/A'} • {b.room?.type} •{' '}
                            {b.id}
                          </div>
                        </div>

                        <ArrowRight
                          size={16}
                          style={{ color: isDark ? '#64748b' : '#94a3b8' }}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div
            style={{
              padding: '20px 28px',
              borderTop: isDark
                ? '1px solid rgba(255,255,255,0.06)'
                : '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                color: isDark ? '#64748b' : '#94a3b8',
              }}
            >
              {filteredBookings.length} arrivals today
            </span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleClose}
                style={{
                  padding: '12px 20px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  background: 'transparent',
                  color: isDark ? '#94a3b8' : '#64748b',
                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkCheckIn}
                disabled={processing || selectedBookings.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor:
                    processing || selectedBookings.length === 0
                      ? 'not-allowed'
                      : 'pointer',
                  border: 'none',
                  background:
                    processing || selectedBookings.length === 0
                      ? '#e2e8f0'
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color:
                    processing || selectedBookings.length === 0
                      ? '#94a3b8'
                      : 'white',
                }}
              >
                {processing ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Check In {selectedBookings.length > 0 && `(${selectedBookings.length})`}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkCheckInModal;
