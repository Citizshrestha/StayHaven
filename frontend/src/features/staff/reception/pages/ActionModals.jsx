import React, { useState, useEffect } from 'react';
import axiosClient from '../../../../axiosClient';
import { ModalErrorBoundary, withModalErrorBoundary } from '../components/ModalErrorBoundary';
import GuestCommunicationModal from '../components/GuestCommunicationModal';
import BulkCheckInModal from '../components/BulkCheckInModal';
import { toast } from 'react-toastify';
import {
  X,
  Calendar,
  User,
  Phone,
  Mail,
  CreditCard,
  Bed,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  DollarSign,
  FileText,
  Hash,
  Search
} from 'lucide-react';

// ============================================
// MODAL OVERLAY COMPONENT
// ============================================
const ModalOverlay = ({ isOpen, onClose, children, isDark }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>
      {children}
    </div>
  );
};

// ============================================
// SHARED COMPONENTS
// ============================================
const ModalContainer = ({ children, isDark, width = '560px' }) => (
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
      maxWidth: width,
      maxHeight: '90vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideUp 0.3s ease-out'
    }}
  >
    {children}
  </div>
);

// eslint-disable-next-line no-unused-vars
const ModalHeader = ({ icon: Icon, title, subtitle, onClose, isDark, accentColor = '#3b82f6' }) => (
  <div
    style={{
      padding: '24px 28px 20px',
      borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '16px'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: isDark
            ? `linear-gradient(135deg, ${accentColor}25, ${accentColor}10)`
            : `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accentColor,
          flexShrink: 0
        }}
      >
        <Icon size={24} strokeWidth={2} />
      </div>
      <div>
        <h2
          style={{
            fontSize: '20px',
            fontWeight: '700',
            color: isDark ? '#f1f5f9' : '#0f172a',
            margin: '0 0 4px 0',
            letterSpacing: '-0.02em'
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: '14px',
            color: isDark ? '#64748b' : '#94a3b8',
            margin: 0
          }}
        >
          {subtitle}
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
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isDark ? 'rgba(71, 85, 105, 0.8)' : 'rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.color = isDark ? '#f1f5f9' : '#0f172a';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.color = isDark ? '#94a3b8' : '#64748b';
      }}
    >
      <X size={18} />
    </button>
  </div>
);

const ModalBody = ({ children }) => (
  <div
    style={{
      padding: '24px 28px',
      overflowY: 'auto',
      flex: 1
    }}
  >
    {children}
  </div>
);

const ModalFooter = ({ children, isDark }) => (
  <div
    style={{
      padding: '20px 28px',
      borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '12px'
    }}
  >
    {children}
  </div>
);

const FormGroup = ({ label, children, isDark, required = false }) => (
  <div style={{ marginBottom: '20px' }}>
    <label
      style={{
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        color: isDark ? '#94a3b8' : '#475569',
        marginBottom: '8px',
        letterSpacing: '0.3px'
      }}
    >
      {label}
      {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
    </label>
    {children}
  </div>
);

const FormRow = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
    {children}
  </div>
);

const Input = ({ icon: Icon, isDark, ...props }) => (
  <div style={{ position: 'relative' }}>
    {Icon && (
      <Icon
        size={18}
        style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: isDark ? '#64748b' : '#94a3b8',
          pointerEvents: 'none'
        }}
      />
    )}
    <input
      {...props}
      style={{
        width: '100%',
        padding: Icon ? '12px 14px 12px 44px' : '12px 14px',
        border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '14px',
        color: isDark ? '#f1f5f9' : '#0f172a',
        background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
        transition: 'all 0.2s',
        outline: 'none',
        ...props.style
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#3b82f6';
        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = isDark ? '#334155' : '#e2e8f0';
        e.target.style.boxShadow = 'none';
      }}
    />
  </div>
);

const Select = ({ icon: Icon, isDark, options, disabled = false, ...props }) => (
  <div style={{ position: 'relative' }}>
    {Icon && (
      <Icon
        size={18}
        style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: isDark ? '#64748b' : '#94a3b8',
          pointerEvents: 'none'
        }}
      />
    )}
    <select
      {...props}
      disabled={disabled}
      style={{
        width: '100%',
        padding: Icon ? '12px 14px 12px 44px' : '12px 14px',
        border: disabled
          ? (isDark ? '1px solid #475569' : '1px solid #cbd5e1')
          : (isDark ? '1px solid #334155' : '1px solid #e2e8f0'),
        borderRadius: '10px',
        fontSize: '14px',
        color: disabled ? (isDark ? '#64748b' : '#94a3b8') : (isDark ? '#f1f5f9' : '#0f172a'),
        backgroundColor: disabled
          ? (isDark ? 'rgba(15, 23, 42, 0.3)' : 'rgba(248, 250, 252, 0.5)')
          : (isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff'),
        transition: 'all 0.2s',
        outline: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        appearance: 'none',
        opacity: disabled ? 0.6 : 1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='${isDark ? '%2394a3b8' : '%2364748b'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
        ...props.style
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

const PrimaryButton = ({ children, onClick, isDark, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '12px 24px',
      borderRadius: '10px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s',
      border: 'none',
      background: disabled
        ? (isDark ? '#334155' : '#e2e8f0')
        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: disabled ? (isDark ? '#64748b' : '#94a3b8') : 'white',
      boxShadow: disabled ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.25)',
      opacity: disabled ? 0.6 : 1
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.35)';
      }
    }}
    onMouseLeave={(e) => {
      if (!disabled) {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.25)';
      }
    }}
  >
    {children}
  </button>
);

const SecondaryButton = ({ children, onClick, isDark }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '12px 24px',
      borderRadius: '10px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      background: 'transparent',
      color: isDark ? '#94a3b8' : '#64748b',
      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = isDark ? '#334155' : '#f8fafc';
      e.currentTarget.style.borderColor = isDark ? '#475569' : '#cbd5e1';
      e.currentTarget.style.color = isDark ? '#f1f5f9' : '#0f172a';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.borderColor = isDark ? '#334155' : '#e2e8f0';
      e.currentTarget.style.color = isDark ? '#94a3b8' : '#64748b';
    }}
  >
    {children}
  </button>
);

const InfoCard = ({ label, value, isDark, icon: Icon, highlight = false }) => (
  <div
    style={{
      padding: '14px 16px',
      background: highlight
        ? (isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)')
        : (isDark ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc'),
      borderRadius: '10px',
      border: highlight
        ? (isDark ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(59, 130, 246, 0.15)')
        : (isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.04)')
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
      {Icon && <Icon size={14} style={{ color: isDark ? '#64748b' : '#94a3b8' }} />}
      <span style={{ fontSize: '12px', color: isDark ? '#64748b' : '#94a3b8', fontWeight: '500' }}>
        {label}
      </span>
    </div>
    <div style={{ fontSize: '16px', fontWeight: '600', color: isDark ? '#f1f5f9' : '#0f172a' }}>
      {value}
    </div>
  </div>
);

const WarningBanner = ({ message, isDark }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 16px',
      background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
      borderRadius: '10px',
      border: isDark ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid #fde68a',
      marginBottom: '20px'
    }}
  >
    <AlertTriangle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
    <span style={{ fontSize: '13px', color: isDark ? '#fbbf24' : '#b45309', fontWeight: '500' }}>
      {message}
    </span>
  </div>
);

const PriceSummary = ({ items, total, isDark }) => (
  <div
    style={{
      background: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
      borderRadius: '12px',
      padding: '16px',
      border: isDark ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(16, 185, 129, 0.12)'
    }}
  >
    {items.map((item, idx) => (
      <div
        key={idx}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: idx === items.length - 1 ? '12px' : '8px',
          paddingBottom: idx === items.length - 1 ? '12px' : '0',
          borderBottom: idx === items.length - 1 ? (isDark ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(16, 185, 129, 0.12)') : 'none'
        }}
      >
        <span style={{ fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b' }}>{item.label}</span>
        <span style={{ fontSize: '13px', color: isDark ? '#cbd5e1' : '#475569', fontWeight: '500' }}>{item.value}</span>
      </div>
    ))}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '15px', fontWeight: '600', color: isDark ? '#f1f5f9' : '#0f172a' }}>Total</span>
      <span style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>{total}</span>
    </div>
  </div>
);

// ============================================
// 1. NEW BOOKING MODAL
// ============================================
export const NewBookingModal = ({ isOpen, onClose, isDark, hotelId }) => {
  const [formData, setFormData] = useState({
    guestName: '',
    phone: '',
    email: '',
    checkIn: '',
    checkOut: '',
    roomId: '',
    guests: '1',
    specialRequests: ''
  });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const resetForm = () => {
    setFormData({ guestName: '', phone: '', email: '', checkIn: '', checkOut: '', roomId: '', guests: '1', specialRequests: '' });
    setRooms([]);
    setError('');
    setSuccessData(null);
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  React.useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Load available rooms when modal opens or dates change
  React.useEffect(() => {
    if (isOpen && formData.checkIn && formData.checkOut && hotelId) {
      // Validate dates first
      const checkInDate = new Date(formData.checkIn);
      const checkOutDate = new Date(formData.checkOut);

      checkInDate.setHours(0, 0, 0, 0);
      checkOutDate.setHours(0, 0, 0, 0);

      if (checkInDate >= checkOutDate) {
        setError('Check-out date must be after check-in date');
        setRooms([]);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (checkInDate < today) {
        setError('Check-in date cannot be in the past');
        setRooms([]);
        return;
      }

      loadAvailableRooms();
    } else if (isOpen && !hotelId) {
      setError('Hotel ID not set. Please ensure you are logged in properly.');
      setRooms([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, formData.checkIn, formData.checkOut, hotelId]);

  const loadAvailableRooms = async () => {
    try {
      setLoading(true);
      setError('');

      if (!hotelId) {
        setError('Hotel ID is required');
        setRooms([]);
        setLoading(false);
        return;
      }

      const response = await axiosClient.get(`/api/v1/bookings/available/rooms/${hotelId}`, {
        params: {
          checkIn: formData.checkIn,
          checkOut: formData.checkOut
        }
      });
      const availableRooms = response.data.rooms || [];
      setRooms(availableRooms);

      if (availableRooms.length === 0) {
        setError('No rooms available for selected dates. Try different dates.');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load available rooms';
      setError(`❌ ${errorMsg}`);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.guestName || !formData.phone || !formData.checkIn || !formData.checkOut || !formData.roomId) {
      setError('❌ Please fill in all required fields');
      return;
    }

    // Validate dates
    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);

    checkInDate.setHours(0, 0, 0, 0);
    checkOutDate.setHours(0, 0, 0, 0);

    if (checkInDate >= checkOutDate) {
      setError('❌ Check-out date must be after check-in date');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkInDate < today) {
      setError('❌ Check-in date cannot be in the past');
      return;
    }

    // Validate hotel ID
    if (!hotelId) {
      setError('❌ Hotel ID not set. Please login again.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await axiosClient.post('/api/v1/bookings/new', {
        guestName: formData.guestName,
        guestEmail: formData.email,
        guestPhone: formData.phone,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        roomId: formData.roomId,
        numGuests: parseInt(formData.guests),
        specialRequests: formData.specialRequests,
        hotelId: hotelId
      });

      const createdBooking = response?.data?.booking;
      const selectedRoom = rooms.find((r) => r._id === formData.roomId);

      setSuccessData({
        confirmationCode: response?.data?.confirmationCode || createdBooking?.confirmationCode || 'N/A',
        guestName: formData.guestName,
        roomLabel: selectedRoom ? `Room ${selectedRoom.roomNumber} - ${selectedRoom.type}` : 'Selected Room',
        checkIn: formData.checkIn,
        checkOut: formData.checkOut
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create booking';
      setError(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const roomOptions = rooms.map(room => ({
    value: room._id,
    label: `Room ${room.roomNumber} - ${room.type} ($${room.price}/night)`
  }));

  const guestOptions = [
    { value: '1', label: '1 Guest' },
    { value: '2', label: '2 Guests' },
    { value: '3', label: '3 Guests' },
    { value: '4', label: '4 Guests' }
  ];

  return (
    <ModalOverlay isOpen={isOpen} onClose={handleClose} isDark={isDark}>
      <ModalContainer isDark={isDark} width="600px">
        <ModalHeader
          icon={Calendar}
          title="New Booking"
          subtitle="Create a new reservation for your guest"
          onClose={handleClose}
          isDark={isDark}
          accentColor="#3b82f6"
        />
        <ModalBody>
          {successData ? (
            <div style={{ textAlign: 'center', padding: '18px 8px 8px' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(16,185,129,0.28), rgba(16,185,129,0.12))'
                    : 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  border: '1px solid rgba(16,185,129,0.35)'
                }}
              >
                <CheckCircle size={36} style={{ color: '#10b981' }} />
              </div>

              <h3 style={{ fontSize: '22px', fontWeight: '800', color: isDark ? '#ecfeff' : '#065f46', marginBottom: '8px' }}>
                Booking Confirmed 🎉
              </h3>
              <p style={{ fontSize: '14px', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '18px' }}>
                Reservation successfully created for <strong>{successData.guestName}</strong>
              </p>

              <div
                style={{
                  background: isDark ? 'rgba(16,185,129,0.08)' : '#f0fdf4',
                  border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '16px',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontSize: '12px', color: isDark ? '#a7f3d0' : '#047857', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.4px' }}>
                  CONFIRMATION CODE
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#10b981', letterSpacing: '1.4px', marginBottom: '12px' }}>
                  {successData.confirmationCode}
                </div>
                <div style={{ fontSize: '13px', color: isDark ? '#cbd5e1' : '#334155', marginBottom: '4px' }}>
                  <strong>Room:</strong> {successData.roomLabel}
                </div>
                <div style={{ fontSize: '13px', color: isDark ? '#cbd5e1' : '#334155' }}>
                  <strong>Stay:</strong> {new Date(successData.checkIn).toLocaleDateString()} - {new Date(successData.checkOut).toLocaleDateString()}
                </div>
              </div>
            </div>
          ) : (
            <>
          {error && (
            <div style={{
              padding: '12px 16px',
              background: '#fee2e2',
              borderRadius: '8px',
              marginBottom: '16px',
              color: '#dc2626',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          <FormGroup label="Guest Name" isDark={isDark} required>
            <Input
              icon={User}
              isDark={isDark}
              placeholder="Enter guest full name"
              value={formData.guestName}
              onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
              disabled={loading}
            />
          </FormGroup>

          <FormRow>
            <FormGroup label="Phone Number" isDark={isDark} required>
              <Input
                icon={Phone}
                isDark={isDark}
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={loading}
              />
            </FormGroup>
            <FormGroup label="Email Address" isDark={isDark}>
              <Input
                icon={Mail}
                isDark={isDark}
                placeholder="guest@email.com"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
              />
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup label="Check-in Date" isDark={isDark} required>
              <Input
                icon={Calendar}
                isDark={isDark}
                type="date"
                value={formData.checkIn}
                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                disabled={loading}
              />
            </FormGroup>
            <FormGroup label="Check-out Date" isDark={isDark} required>
              <Input
                icon={Calendar}
                isDark={isDark}
                type="date"
                value={formData.checkOut}
                onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                disabled={loading}
              />
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup label="Room" isDark={isDark} required>
              <Select
                icon={Bed}
                isDark={isDark}
                options={[{ value: '', label: 'Select room' }, ...roomOptions]}
                value={formData.roomId}
                onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                disabled={loading || !formData.checkIn || !formData.checkOut}
              />
            </FormGroup>
            <FormGroup label="Number of Guests" isDark={isDark}>
              <Select
                icon={Users}
                isDark={isDark}
                options={guestOptions}
                value={formData.guests}
                onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
                disabled={loading}
              />
            </FormGroup>
          </FormRow>

          <FormGroup label="Special Requests" isDark={isDark}>
            <textarea
              placeholder="Any special requests or notes..."
              value={formData.specialRequests}
              onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                color: isDark ? '#f1f5f9' : '#0f172a',
                background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                minHeight: '80px',
                fontFamily: 'inherit',
                outline: 'none'
              }}
            />
          </FormGroup>
            </>
          )}
        </ModalBody>
        {successData ? (
          <ModalFooter isDark={isDark}>
            <PrimaryButton onClick={handleClose} isDark={isDark}>
              <CheckCircle size={18} />
              Awesome, Done
            </PrimaryButton>
          </ModalFooter>
        ) : (
          <ModalFooter isDark={isDark}>
            <SecondaryButton onClick={handleClose} isDark={isDark} disabled={loading}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleSubmit} isDark={isDark} disabled={loading || !formData.roomId}>
              <CheckCircle size={18} />
              {loading ? 'Creating...' : 'Create Booking'}
            </PrimaryButton>
          </ModalFooter>
        )}
      </ModalContainer>
    </ModalOverlay>
  );
};

// ============================================
// 2. WALK-IN GUEST MODAL
// ============================================
export const WalkInGuestModal = ({ isOpen, onClose, isDark, hotelId }) => {
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    idType: 'passport',
    idNumber: '',
    roomId: '',
    checkOutDate: '',
    paymentMethod: 'card'
  });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null); // { confirmationCode, guestName, roomLabel }

  const resetForm = () => {
    setFormData({ guestName: '', guestEmail: '', guestPhone: '', idType: 'passport', idNumber: '', roomId: '', checkOutDate: '', paymentMethod: 'card' });
    setError('');
    setSuccessData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Load available rooms when modal opens
  React.useEffect(() => {
    if (isOpen && hotelId) {
      loadAvailableRooms();
    }
    if (!isOpen) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hotelId]);

  const loadAvailableRooms = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axiosClient.get('/api/v1/bookings/available/rooms/' + hotelId);
      setRooms(response.data.rooms || []);
    } catch {
      setError('Failed to load available rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.guestName || !formData.guestPhone || !formData.idNumber || !formData.roomId || !formData.checkOutDate) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await axiosClient.post('/api/v1/bookings/walk-in/check-in', {
        guestName: formData.guestName,
        guestEmail: formData.guestEmail,
        guestPhone: formData.guestPhone,
        idType: formData.idType,
        idNumber: formData.idNumber,
        roomId: formData.roomId,
        checkOutDate: formData.checkOutDate,
        paymentMethod: formData.paymentMethod,
        hotelId: hotelId
      });

      const booking = res.data?.booking;
      const roomLabel = availableRoomOptions.find(r => r.value === formData.roomId)?.label || 'Selected Room';
      setSuccessData({
        confirmationCode: booking?.confirmationCode || 'N/A',
        guestName: formData.guestName,
        roomLabel,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check in guest');
    } finally {
      setLoading(false);
    }
  };

  const availableRoomOptions = rooms.map(room => ({
    value: room._id,
    label: `Room ${room.roomNumber} - ${room.type} ($${room.price}/night)`
  }));

  const idTypes = [
    { value: 'passport', label: 'Passport' },
    { value: 'drivers_license', label: "Driver's License" },
    { value: 'national_id', label: 'National ID' }
  ];

  const paymentMethods = [
    { value: 'card', label: 'Credit/Debit Card' },
    { value: 'cash', label: 'Cash' },
    { value: 'company', label: 'Company Account' }
  ];

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <ModalOverlay isOpen={isOpen} onClose={handleClose} isDark={isDark}>
      <ModalContainer isDark={isDark} width="520px">
        <ModalHeader
          icon={User}
          title="Walk-In Guest"
          subtitle="Quick check-in for walk-in guests"
          onClose={handleClose}
          isDark={isDark}
          accentColor="#10b981"
        />
        <ModalBody>
          {/* ── Success state ── */}
          {successData ? (
            <div style={{ textAlign: 'center', padding: '24px 8px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={32} style={{ color: '#10b981' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #111)', marginBottom: 8 }}>
                Guest Checked In!
              </h3>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
                <strong>{successData.guestName}</strong> has been successfully checked in.
              </p>
              <div style={{ background: isDark ? 'rgba(16,185,129,0.1)' : '#f0fdf4', borderRadius: 10, padding: '12px 20px', marginBottom: 24, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Confirmation Code</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981', letterSpacing: 2 }}>{successData.confirmationCode}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{successData.roomLabel}</div>
              </div>
              <PrimaryButton onClick={handleClose} isDark={isDark} style={{ width: '100%' }}>
                Done
              </PrimaryButton>
            </div>
          ) : (
            <>
          {error && (
            <div style={{
              padding: '12px 16px',
              background: '#fee2e2',
              borderRadius: '8px',
              marginBottom: '16px',
              color: '#dc2626',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          {/* Today's Date Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
              borderRadius: '10px',
              marginBottom: '20px',
              border: isDark ? '1px solid rgba(59, 130, 246, 0.15)' : '1px solid rgba(59, 130, 246, 0.1)'
            }}
          >
            <Clock size={18} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: '13px', color: isDark ? '#93c5fd' : '#2563eb', fontWeight: '500' }}>
              Check-in Date: {today}
            </span>
          </div>

          <FormGroup label="Guest Name" isDark={isDark} required>
            <Input
              icon={User}
              isDark={isDark}
              placeholder="Enter guest full name"
              value={formData.guestName}
              onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
              disabled={loading}
            />
          </FormGroup>

          <FormGroup label="Guest Phone" isDark={isDark} required>
            <Input
              icon={Phone}
              isDark={isDark}
              placeholder="+1 (555) 000-0000"
              value={formData.guestPhone}
              onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
              disabled={loading}
            />
          </FormGroup>

          <FormGroup label="Email (Optional)" isDark={isDark}>
            <Input
              icon={Mail}
              isDark={isDark}
              placeholder="guest@email.com"
              type="email"
              value={formData.guestEmail}
              onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
              disabled={loading}
            />
          </FormGroup>

          <FormRow>
            <FormGroup label="ID Type" isDark={isDark} required>
              <Select
                icon={FileText}
                isDark={isDark}
                options={idTypes}
                value={formData.idType}
                onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                disabled={loading}
              />
            </FormGroup>
            <FormGroup label="ID Number" isDark={isDark} required>
              <Input
                icon={Hash}
                isDark={isDark}
                placeholder="Enter ID number"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                disabled={loading}
              />
            </FormGroup>
          </FormRow>

          <FormGroup label="Available Room" isDark={isDark} required>
            <Select
              icon={Bed}
              isDark={isDark}
              options={[{ value: '', label: 'Select room' }, ...availableRoomOptions]}
              value={formData.roomId}
              onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
              disabled={loading}
            />
          </FormGroup>

          <FormGroup label="Check-out Date" isDark={isDark} required>
            <Input
              icon={Calendar}
              isDark={isDark}
              type="date"
              min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              value={formData.checkOutDate}
              onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
              disabled={loading}
            />
          </FormGroup>

          <FormGroup label="Payment Method" isDark={isDark} required>
            <Select
              icon={CreditCard}
              isDark={isDark}
              options={paymentMethods}
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              disabled={loading}
            />
          </FormGroup>
            </> /* end else */
          )} {/* end successData ternary */}
        </ModalBody>
        {!successData && (
          <ModalFooter isDark={isDark}>
            <SecondaryButton onClick={handleClose} isDark={isDark} disabled={loading}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleSubmit} isDark={isDark} disabled={loading || !formData.roomId}>
              <CheckCircle size={18} />
              {loading ? 'Checking In...' : 'Check In Guest'}
            </PrimaryButton>
          </ModalFooter>
        )}
      </ModalContainer>
    </ModalOverlay>
  );
};

// ============================================
// 3. EXPRESS CHECK-OUT MODAL
// ============================================
export const ExpressCheckOutModal = ({ isOpen, onClose, isDark, activeBookingId, hotelId }) => {
  const [checkedInBookings, setCheckedInBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(activeBookingId || '');
  const [bookingData, setBookingData] = useState(null);
  const [settlePayment, setSettlePayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setCheckedInBookings([]);
      setSelectedBookingId('');
      setBookingData(null);
      setSettlePayment(false);
      setError('');
      setSearchQuery('');
    }
  }, [isOpen]);

  // If activeBookingId provided, use it directly
  React.useEffect(() => {
    if (isOpen && activeBookingId) {
      setSelectedBookingId(activeBookingId);
      loadBookingData(activeBookingId);
    }
  }, [isOpen, activeBookingId]);

  // Load checked-in bookings for selection when no activeBookingId
  React.useEffect(() => {
    if (isOpen && !activeBookingId && hotelId) {
      loadCheckedInBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeBookingId, hotelId]);

  const loadCheckedInBookings = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/api/v1/bookings/hotel/${hotelId}`, {
        params: { status: 'Checked-In', limit: 100 }
      });
      setCheckedInBookings(response.data.bookings || []);
    } catch {
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const loadBookingData = async (bookingId) => {
    try {
      setLoading(true);
      setError('');
      const response = await axiosClient.get(`/api/v1/bookings/${bookingId}`);
      setBookingData(response.data.booking);
    } catch {
      setError('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBooking = (bookingId) => {
    setSelectedBookingId(bookingId);
    loadBookingData(bookingId);
  };

  const handleCheckOut = async () => {
    const targetId = selectedBookingId || activeBookingId;
    if (!targetId) {
      setError('No booking selected');
      return;
    }
    try {
      setLoading(true);
      setError('');

      await axiosClient.post('/api/v1/bookings/check-out/express', {
        bookingId: targetId,
        settlePayment: settlePayment
      });

      toast.success('Guest checked out successfully!', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setBookingData(null);
      setSettlePayment(false);
      setSelectedBookingId('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check out guest');
    } finally {
      setLoading(false);
    }
  };

  // Booking selector screen when no booking is loaded yet
  if (!bookingData && isOpen) {
    const filteredBookings = checkedInBookings.filter(b => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const guestName = (b.user?.fullname || b.guestName || '').toLowerCase();
      const roomNum = String(b.room?.roomNumber || '');
      return guestName.includes(q) || roomNum.includes(q);
    });

    return (
      <ModalOverlay isOpen={isOpen} onClose={onClose} isDark={isDark}>
        <ModalContainer isDark={isDark} width="520px">
          <ModalHeader
            icon={CheckCircle}
            title="Express Check-Out"
            subtitle="Select a checked-in booking to process"
            onClose={onClose}
            isDark={isDark}
            accentColor="#f97316"
          />
          <ModalBody>
            {loading && !checkedInBookings.length ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: isDark ? '#94a3b8' : '#64748b' }}>
                Loading checked-in bookings...
              </div>
            ) : (
              <>
                {error && (
                  <div style={{ padding: '12px 16px', background: '#fee2e2', borderRadius: '8px', marginBottom: '16px', color: '#dc2626', fontSize: '13px' }}>
                    {error}
                  </div>
                )}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 14px', borderRadius: '10px',
                    background: isDark ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc',
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'
                  }}>
                    <Search size={16} style={{ color: isDark ? '#64748b' : '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Search by guest name or room number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        flex: 1, border: 'none', outline: 'none', fontSize: '13px',
                        background: 'transparent', color: isDark ? '#e2e8f0' : '#1e293b'
                      }}
                    />
                  </div>
                </div>
                <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredBookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: isDark ? '#94a3b8' : '#64748b', fontSize: '13px' }}>
                      {checkedInBookings.length === 0 ? 'No checked-in bookings found' : 'No bookings match your search'}
                    </div>
                  ) : (
                    filteredBookings.map(b => (
                      <div
                        key={b._id}
                        onClick={() => handleSelectBooking(b._id)}
                        style={{
                          padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                          background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#fff',
                          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.05)'; e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(15, 23, 42, 0.4)' : '#fff'; e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#f1f5f9' : '#0f172a', marginBottom: '4px' }}>
                              {b.user?.fullname || b.guestName || 'Guest'}
                            </div>
                            <div style={{ fontSize: '12px', color: isDark ? '#64748b' : '#94a3b8' }}>
                              Room {b.room?.roomNumber || 'N/A'} &middot; {b.room?.type || ''} &middot; {new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}
                            </div>
                          </div>
                          <ArrowRight size={16} style={{ color: isDark ? '#64748b' : '#94a3b8' }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </ModalBody>
        </ModalContainer>
      </ModalOverlay>
    );
  }

  const hasUnpaidBalance = bookingData?.paymentStatus !== 'paid';
  const room = bookingData?.room;
  const nights = Math.ceil((new Date(bookingData?.checkOut) - new Date(bookingData?.checkIn)) / (1000 * 60 * 60 * 24));

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose} isDark={isDark}>
      <ModalContainer isDark={isDark} width="480px">
        <ModalHeader
          icon={CheckCircle}
          title="Express Check-Out"
          subtitle="Complete guest departure process"
          onClose={onClose}
          isDark={isDark}
          accentColor="#f97316"
        />
        <ModalBody>
          {error && (
            <div style={{
              padding: '12px 16px',
              background: '#fee2e2',
              borderRadius: '8px',
              marginBottom: '16px',
              color: '#dc2626',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          {/* Guest Summary */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <InfoCard label="Guest Name" value={bookingData?.user?.fullname || 'Unknown'} isDark={isDark} icon={User} />
              <InfoCard label="Room Number" value={room?.roomNumber} isDark={isDark} icon={Bed} highlight />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <InfoCard
                label="Check-in"
                value={new Date(bookingData?.checkIn).toLocaleDateString()}
                isDark={isDark}
                icon={Calendar}
              />
              <InfoCard
                label="Check-out"
                value={new Date(bookingData?.checkOut).toLocaleDateString()}
                isDark={isDark}
                icon={Calendar}
              />
            </div>
          </div>

          <InfoCard
            label="Stay Duration"
            value={`${nights} night${nights !== 1 ? 's' : ''} - ${room?.type}`}
            isDark={isDark}
            icon={Clock}
          />

          {/* Payment Summary */}
          <div style={{ marginTop: '20px' }}>
            <div
              style={{
                background: isDark ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc',
                borderRadius: '12px',
                padding: '16px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b' }}>Total Bill</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#f1f5f9' : '#0f172a' }}>
                  ${bookingData?.totalAmount?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.06)'
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#f1f5f9' : '#0f172a' }}>
                  Payment Status
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: bookingData?.paymentStatus === 'paid' ? '#10b981' : '#f59e0b',
                    textTransform: 'capitalize'
                  }}
                >
                  {bookingData?.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Settle Payment Checkbox */}
          <div style={{ marginTop: '16px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '13px',
              color: isDark ? '#e2e8f0' : '#1e293b'
            }}>
              <input
                type="checkbox"
                checked={settlePayment}
                onChange={(e) => setSettlePayment(e.target.checked)}
                disabled={loading}
                style={{ cursor: 'pointer' }}
              />
              Mark payment as settled
            </label>
          </div>

          {/* Warning for unpaid balance */}
          {hasUnpaidBalance && !settlePayment && (
            <div style={{ marginTop: '16px' }}>
              <WarningBanner
                message={`Payment status: ${bookingData?.paymentStatus}. Please collect payment or mark as settled.`}
                isDark={isDark}
              />
            </div>
          )}
        </ModalBody>
        <ModalFooter isDark={isDark}>
          <SecondaryButton onClick={onClose} isDark={isDark} disabled={loading}>
            Cancel
          </SecondaryButton>
          <PrimaryButton onClick={handleCheckOut} isDark={isDark} disabled={loading}>
            <CheckCircle size={18} />
            {loading ? 'Processing...' : 'Confirm Check-Out'}
          </PrimaryButton>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};

// ============================================
// 4. ROOM CHANGE MODAL
// ============================================
export const RoomChangeModal = ({ isOpen, onClose, isDark, activeBookingId, hotelId }) => {
  const [bookingData, setBookingData] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [newRoomId, setNewRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkedInBookings, setCheckedInBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setBookingData(null);
      setAvailableRooms([]);
      setNewRoomId('');
      setError('');
      setCheckedInBookings([]);
      setSelectedBookingId('');
      setSearchQuery('');
    }
  }, [isOpen]);

  // If activeBookingId is provided, use it directly
  useEffect(() => {
    if (isOpen && activeBookingId) {
      setSelectedBookingId(activeBookingId);
      loadBookingData(activeBookingId);
      loadAvailableRooms(activeBookingId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeBookingId]);

  // If no activeBookingId, load checked-in bookings for selection
  useEffect(() => {
    if (isOpen && !activeBookingId && hotelId) {
      loadCheckedInBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeBookingId, hotelId]);

  const loadCheckedInBookings = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/api/bookings/hotel/${hotelId}?status=Checked-In&limit=100`);
      setCheckedInBookings(response.data.bookings || response.data || []);
    } catch {
      setError('Failed to load checked-in bookings');
    } finally {
      setLoading(false);
    }
  };

  const loadBookingData = async (bookingId) => {
    try {
      setLoading(true);
      setError('');
      const response = await axiosClient.get(`/api/v1/bookings/${bookingId}`);
      setBookingData(response.data.booking);
    } catch {
      setError('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableRooms = async (bookingId) => {
    try {
      const response = await axiosClient.get('/api/v1/bookings/available/rooms/' + hotelId, {
        params: {
          bookingId,
          checkIn: bookingData?.checkIn,
          checkOut: bookingData?.checkOut,
        },
      });
      setAvailableRooms(response.data.rooms || []);
    } catch { /* silently ignore */ }
  };

  const handleSelectBooking = (bookingId) => {
    setSelectedBookingId(bookingId);
    loadBookingData(bookingId);
    loadAvailableRooms(bookingId);
  };

  const handleRoomChange = async () => {
    const targetId = selectedBookingId || activeBookingId;
    if (!targetId) {
      setError('No booking selected');
      return;
    }
    if (!newRoomId) {
      setError('Please select a new room');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await axiosClient.post('/api/v1/bookings/room-change', {
        bookingId: targetId,
        newRoomId: newRoomId
      });

      toast.success('Room changed successfully!', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setNewRoomId('');
      setBookingData(null);
      setSelectedBookingId('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change room');
    } finally {
      setLoading(false);
    }
  };

  // Booking selector screen when no booking is loaded yet
  if (!bookingData && isOpen) {
    const filteredBookings = checkedInBookings.filter(b => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const guestName = (b.user?.fullname || b.guestName || '').toLowerCase();
      const roomNum = String(b.room?.roomNumber || '');
      return guestName.includes(q) || roomNum.includes(q);
    });

    return (
      <ModalOverlay isOpen={isOpen} onClose={onClose} isDark={isDark}>
        <ModalContainer isDark={isDark} width="520px">
          <ModalHeader
            icon={ArrowRight}
            title="Room Change"
            subtitle="Select a checked-in booking to change room"
            onClose={onClose}
            isDark={isDark}
            accentColor="#8b5cf6"
          />
          <ModalBody>
            {loading && !checkedInBookings.length ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: isDark ? '#94a3b8' : '#64748b' }}>
                Loading checked-in bookings...
              </div>
            ) : (
              <>
                {error && (
                  <div style={{ padding: '12px 16px', background: '#fee2e2', borderRadius: '8px', marginBottom: '16px', color: '#dc2626', fontSize: '13px' }}>
                    {error}
                  </div>
                )}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 14px', borderRadius: '10px',
                    background: isDark ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc',
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'
                  }}>
                    <Search size={16} style={{ color: isDark ? '#64748b' : '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Search by guest name or room number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        flex: 1, border: 'none', outline: 'none', fontSize: '13px',
                        background: 'transparent', color: isDark ? '#e2e8f0' : '#1e293b'
                      }}
                    />
                  </div>
                </div>
                <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredBookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: isDark ? '#94a3b8' : '#64748b', fontSize: '13px' }}>
                      {checkedInBookings.length === 0 ? 'No checked-in bookings found' : 'No bookings match your search'}
                    </div>
                  ) : (
                    filteredBookings.map(b => (
                      <div
                        key={b._id}
                        onClick={() => handleSelectBooking(b._id)}
                        style={{
                          padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                          background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#fff',
                          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.05)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(15, 23, 42, 0.4)' : '#fff'; e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#f1f5f9' : '#0f172a', marginBottom: '4px' }}>
                              {b.user?.fullname || b.guestName || 'Guest'}
                            </div>
                            <div style={{ fontSize: '12px', color: isDark ? '#64748b' : '#94a3b8' }}>
                              Room {b.room?.roomNumber || 'N/A'} &middot; {b.room?.type || ''} &middot; {new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}
                            </div>
                          </div>
                          <ArrowRight size={16} style={{ color: isDark ? '#64748b' : '#94a3b8' }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </ModalBody>
        </ModalContainer>
      </ModalOverlay>
    );
  }

  const currentRoom = bookingData?.room;
  const selectedNewRoom = availableRooms.find(r => r._id === newRoomId);
  const currentRate = currentRoom?.price || 0;
  const newRate = selectedNewRoom?.price || 0;
  const nights = Math.ceil((new Date(bookingData?.checkOut) - new Date(bookingData?.checkIn)) / (1000 * 60 * 60 * 24));
  const priceDiff = (newRate - currentRate) * nights;
  const isDowngrade = priceDiff < 0;

  const availableRoomOptions = availableRooms
    .filter(r => r._id !== currentRoom?._id) // Exclude current room
    .map(room => ({
      value: room._id,
      label: `Room ${room.roomNumber} - ${room.type} ($${room.price}/night)`,
      room: room
    }));

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose} isDark={isDark}>
      <ModalContainer isDark={isDark} width="520px">
        <ModalHeader
          icon={ArrowRight}
          title="Room Change"
          subtitle="Transfer guest to a different room"
          onClose={onClose}
          isDark={isDark}
          accentColor="#8b5cf6"
        />
        <ModalBody>
          {error && (
            <div style={{
              padding: '12px 16px',
              background: '#fee2e2',
              borderRadius: '8px',
              marginBottom: '16px',
              color: '#dc2626',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          {/* Current Booking Info */}
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: isDark ? '#64748b' : '#94a3b8',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Current Booking
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <InfoCard label="Guest Name" value={bookingData?.user?.fullname || 'Unknown'} isDark={isDark} icon={User} />
              <InfoCard label="Current Room" value={`Room ${currentRoom?.roomNumber}`} isDark={isDark} icon={Bed} highlight />
            </div>
            <div style={{ marginTop: '12px' }}>
              <InfoCard
                label="Room Type & Rate"
                value={`${currentRoom?.type} - $${currentRate}/night`}
                isDark={isDark}
                icon={DollarSign}
              />
            </div>
          </div>

          {/* New Room Selection */}
          <FormGroup label="New Room" isDark={isDark} required>
            <Select
              icon={Bed}
              isDark={isDark}
              options={[{ value: '', label: 'Select new room' }, ...availableRoomOptions]}
              value={newRoomId}
              onChange={(e) => setNewRoomId(e.target.value)}
              disabled={loading || availableRoomOptions.length === 0}
            />
          </FormGroup>

          {availableRoomOptions.length === 0 && (
            <WarningBanner
              message="No available rooms for the guest's stay period."
              isDark={isDark}
            />
          )}

          {/* Price Difference */}
          {newRoomId && (
            <div
              style={{
                padding: '14px 16px',
                background: priceDiff === 0
                  ? (isDark ? 'rgba(100, 116, 139, 0.1)' : '#f8fafc')
                  : isDowngrade
                    ? (isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)')
                    : (isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)'),
                borderRadius: '10px',
                border: priceDiff === 0
                  ? (isDark ? '1px solid rgba(100, 116, 139, 0.2)' : '1px solid #e2e8f0')
                  : isDowngrade
                    ? (isDark ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(16, 185, 129, 0.15)')
                    : (isDark ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(239, 68, 68, 0.15)'),
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b', fontWeight: '500' }}>
                  Price Difference ({nights} nights)
                </span>
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: priceDiff === 0
                      ? (isDark ? '#94a3b8' : '#64748b')
                      : isDowngrade
                        ? '#10b981'
                        : '#ef4444'
                  }}
                >
                  {priceDiff === 0 ? 'No change' : `${isDowngrade ? '-' : '+'}$${Math.abs(priceDiff).toFixed(2)}`}
                </span>
              </div>
            </div>
          )}

          {/* Warning for different room type */}
          {selectedNewRoom && selectedNewRoom.type !== currentRoom?.type && (
            <WarningBanner
              message={`This is a different room category (${selectedNewRoom.type}). Guest may notice differences in amenities and room size.`}
              isDark={isDark}
            />
          )}
        </ModalBody>
        <ModalFooter isDark={isDark}>
          <SecondaryButton onClick={onClose} isDark={isDark} disabled={loading}>
            Cancel
          </SecondaryButton>
          <PrimaryButton onClick={handleRoomChange} isDark={isDark} disabled={loading || !newRoomId}>
            <CheckCircle size={18} />
            {loading ? 'Changing...' : 'Confirm Room Change'}
          </PrimaryButton>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};

// Wrap exports with error boundary to prevent dashboard crashes
export const NewBookingModalWrapped = withModalErrorBoundary(NewBookingModal, { modalName: 'New Booking' });
export const WalkInGuestModalWrapped = withModalErrorBoundary(WalkInGuestModal, { modalName: 'Walk-In Guest' });
export const ExpressCheckOutModalWrapped = withModalErrorBoundary(ExpressCheckOutModal, { modalName: 'Express Check-Out' });
export const RoomChangeModalWrapped = withModalErrorBoundary(RoomChangeModal, { modalName: 'Room Change' });

// Export new modals with error boundaries
export const GuestCommunicationModalWrapped = withModalErrorBoundary(GuestCommunicationModal, { modalName: 'Guest Communication' });
export const BulkCheckInModalWrapped = withModalErrorBoundary(BulkCheckInModal, { modalName: 'Bulk Check-In' });

// Also export wrapped versions as default for backward compatibility
export default {
  NewBookingModal: NewBookingModalWrapped,
  WalkInGuestModal: WalkInGuestModalWrapped,
  ExpressCheckOutModal: ExpressCheckOutModalWrapped,
  RoomChangeModal: RoomChangeModalWrapped,
  GuestCommunicationModal: GuestCommunicationModalWrapped,
  BulkCheckInModal: BulkCheckInModalWrapped,
  // Also export error boundary for direct use
  ModalErrorBoundary
};
