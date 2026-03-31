import React, { useState, useEffect } from 'react';
import axiosClient from '../../../../axiosClient';
import { X, Mail, Send, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../../../hooks/useTheme';

// ============================================
// GUEST COMMUNICATION MODAL
// ============================================
const GuestCommunicationModal = ({ isOpen, onClose, bookingId = null, hotelId = null }) => {
  const { isDark } = useTheme();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(bookingId);
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Communication templates
  const defaultTemplates = [
    {
      key: 'checkin_welcome',
      label: 'Check-in Welcome',
      subject: 'Welcome to {{hotelName}}, {{guestName}}!',
      body: `Hi {{guestName}},\n\nWelcome to {{hotelName}}! Your check-in is confirmed.\n\nBooking: {{bookingId}}\nRoom: {{roomNumber}} ({{roomType}})\nCheck-in: {{checkInDate}}\nCheck-out: {{checkOutDate}}\n\nIf you need anything, reply to this email or contact front desk.\n\nWarm regards,\n{{hotelName}} Front Desk`,
    },
    {
      key: 'checkout_thankyou',
      label: 'Check-out Thank You',
      subject: 'Thank you for staying with us, {{guestName}}',
      body: `Hi {{guestName}},\n\nThank you for choosing {{hotelName}}. We hope you had a comfortable stay.\n\nBooking: {{bookingId}}\nRoom: {{roomNumber}}\nStay: {{checkInDate}} to {{checkOutDate}}\n\nWe would love to welcome you again soon.\n\nBest regards,\n{{hotelName}} Team`,
    },
    {
      key: 'payment_reminder',
      label: 'Payment Reminder',
      subject: 'Payment reminder for booking {{bookingId}}',
      body: `Hi {{guestName}},\n\nThis is a gentle reminder for pending payment on your booking.\n\nBooking: {{bookingId}}\nRoom: {{roomNumber}}\nTotal Amount: {{totalAmount}}\nStatus: {{paymentStatus}}\n\nPlease contact front desk for assistance.\n\nThank you,\n{{hotelName}} Billing Desk`,
    },
    {
      key: 'special_offers',
      label: 'Special Offers',
      subject: 'Exclusive offers for our valued guest {{guestName}}',
      body: `Hi {{guestName}},\n\nAs our valued guest, we have exclusive offers waiting for you on your next stay!\n\nContact us to learn about:\n- Room upgrades\n- Spa packages\n- Dining discounts\n\nWe look forward to welcoming you back.\n\n{{hotelName}} Team`,
    },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      fetchBookings();
    }
  }, [isOpen, hotelId]);

  const fetchTemplates = async () => {
    try {
      const response = await axiosClient.get('/api/reception/communications/templates');
      setTemplates(response.data?.data || defaultTemplates);
    } catch {
      setTemplates(defaultTemplates);
    }
  };

  const fetchBookings = async () => {
    if (!hotelId) return;
    try {
      setLoading(true);
      const response = await axiosClient.get(`/api/reception/reservations?hotelId=${hotelId}&limit=50`);
      setBookings(response.data?.data || []);
    } catch {
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setCustomSubject(template.subject);
    setCustomBody(template.body);
    setError('');
    setSuccess(false);
  };

  const renderTemplate = (text, variables) => {
    return String(text).replace(/{{\s*([\w]+)\s*}}/g, (_, token) => {
      return variables[token] || '';
    });
  };

  const handleSend = async () => {
    if (!selectedBooking) {
      setError('Please select a booking');
      return;
    }
    if (!customSubject.trim() || !customBody.trim()) {
      setError('Subject and message body are required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await axiosClient.post('/api/reception/communications/send', {
        bookingId: selectedBooking,
        templateKey: selectedTemplate?.key,
        customSubject,
        customBody,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send communication');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedTemplate(null);
    setCustomSubject('');
    setCustomBody('');
    setError('');
    setSuccess(false);
  };

  const getPreviewData = () => {
    const booking = bookings.find(b => b._id === selectedBooking);
    return {
      guestName: booking?.guest?.name || 'Guest Name',
      hotelName: 'StayHaven Hotel',
      bookingId: booking?.id || 'BK-0000',
      roomNumber: booking?.room?.number || '101',
      roomType: booking?.room?.type || 'Deluxe',
      checkInDate: booking?.checkIn ? new Date(booking.checkIn).toLocaleDateString() : '01/01/2024',
      checkOutDate: booking?.checkOut ? new Date(booking.checkOut).toLocaleDateString() : '01/05/2024',
      totalAmount: booking?.totalAmount ? `$${booking.totalAmount}` : '$0',
      paymentStatus: booking?.paymentStatus || 'pending',
    };
  };

  const previewData = getPreviewData();
  const previewSubject = renderTemplate(customSubject, previewData);
  const previewBody = renderTemplate(customBody, previewData);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
          maxWidth: '720px',
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
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
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
                  ? 'linear-gradient(135deg, #6366f125, #6366f110)'
                  : 'linear-gradient(135deg, #6366f115, #6366f108)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6366f1',
              }}
            >
              <Mail size={24} />
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: isDark ? '#f1f5f9' : '#0f172a',
                margin: '0 0 4px 0',
              }}>
                Guest Communication
              </h2>
              <p style={{
                fontSize: '14px',
                color: isDark ? '#64748b' : '#94a3b8',
                margin: 0,
              }}>
                Send emails to guests using templates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {/* Success State */}
          {success ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#d1fae5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <CheckCircle size={32} style={{ color: '#10b981' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                Email Sent Successfully!
              </h3>
              <p style={{ fontSize: 14, color: isDark ? '#94a3b8' : '#64748b' }}>
                The guest will receive the email shortly.
              </p>
            </div>
          ) : (
            <>
              {/* Error */}
              {error && (
                <div style={{
                  padding: '12px 16px',
                  background: '#fee2e2',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  color: '#dc2626',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}

              {/* Booking Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: isDark ? '#94a3b8' : '#475569',
                  marginBottom: '8px',
                }}>
                  Select Booking *
                </label>
                <select
                  value={selectedBooking || ''}
                  onChange={(e) => setSelectedBooking(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                  }}
                >
                  <option value="">Select a booking...</option>
                  {bookings.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.id} - {b.guest?.name} (Room {b.room?.number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: isDark ? '#94a3b8' : '#475569',
                  marginBottom: '8px',
                }}>
                  Choose Template
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {templates.map((template) => (
                    <button
                      key={template.key}
                      onClick={() => handleSelectTemplate(template)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: selectedTemplate?.key === template.key
                          ? '2px solid #6366f1'
                          : isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                        background: selectedTemplate?.key === template.key
                          ? isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)'
                          : isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                        color: isDark ? '#f1f5f9' : '#0f172a',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{template.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: isDark ? '#94a3b8' : '#475569',
                  marginBottom: '8px',
                }}>
                  Subject *
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Email subject..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                  }}
                />
              </div>

              {/* Body */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: isDark ? '#94a3b8' : '#475569',
                  marginBottom: '8px',
                }}>
                  Message Body *
                </label>
                <textarea
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  placeholder="Enter your message..."
                  rows={8}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
                <div style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  color: isDark ? '#64748b' : '#94a3b8',
                }}>
                  Available variables: {'{{guestName}}'}, {'{{hotelName}}'}, {'{{bookingId}}'}, {'{{roomNumber}}'}, {'{{roomType}}'}, {'{{checkInDate}}'}, {'{{checkOutDate}}'}, {'{{totalAmount}}'}, {'{{paymentStatus}}'}
                </div>
              </div>

              {/* Preview */}
              {selectedBooking && (
                <div style={{
                  padding: '16px',
                  background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                  borderRadius: '10px',
                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', marginBottom: '8px' }}>
                    <FileText size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    Preview
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#f1f5f9' : '#0f172a', marginBottom: '4px' }}>
                    {previewSubject}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: isDark ? '#94a3b8' : '#64748b',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {previewBody}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div style={{
            padding: '20px 28px',
            borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
          }}>
            <button
              onClick={handleReset}
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
              Reset
            </button>
            <button
              onClick={handleSend}
              disabled={loading || !selectedBooking}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading || !selectedBooking ? 'not-allowed' : 'pointer',
                border: 'none',
                background: loading || !selectedBooking ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: loading || !selectedBooking ? '#94a3b8' : 'white',
              }}
            >
              <Send size={18} />
              {loading ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestCommunicationModal;
