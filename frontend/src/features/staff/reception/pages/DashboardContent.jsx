import React, { useState } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import { useStaffAuth } from '../../../../context/StaffAuthContext';
import {
  Search,
  Bell,
  Sun,
  Moon,
  ArrowUpRight,
  ArrowDownRight,
  CalendarCheck,
  LogOut as LogOutIcon,
  Bed,
  Plus,
  UserPlus,
  ArrowRightLeft,
  Eye,
  Wand2
} from 'lucide-react';
import {
  NewBookingModal,
  WalkInGuestModal,
  ExpressCheckOutModal,
  RoomChangeModal
} from './ActionModals';
import './DashboardContent.css';

// Temporary development hotel ID - replace with actual ID from your database
// To get your hotel ID, check MongoDB or create a hotel via API
const DEV_HOTEL_ID = '692aa947419c33f4e8c9aa73'; // Test Hotel

const DashboardContent = () => {
  const { isDark, toggleTheme } = useTheme();
  
  // Try to get staffUser, but don't crash if auth context is not available
  let staffUser = null;
  try {
    const auth = useStaffAuth();
    staffUser = auth?.staffUser;
  } catch (e) {
    // Auth context not available - running in dev mode without auth
    console.warn('StaffAuth not available - using dev mode');
  }
  
  const [showNotifications, setShowNotifications] = useState(false);

  // Get hotelId from activeProperty, staffUser's hotel, or fallback to dev ID
  const hotelId = localStorage.getItem('activeProperty') || staffUser?.hotel?._id || DEV_HOTEL_ID;
  const [activeBookingId, setActiveBookingId] = useState(null);

  // Show warning if hotelId is not set
  const [hotelWarning, setHotelWarning] = useState(!hotelId);

  // Modal states
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showRoomChangeModal, setShowRoomChangeModal] = useState(false);
  const [seedingInProgress, setSeedingInProgress] = useState(false);

  // Seed test data function
  const handleSeedTestData = async () => {
    if (!hotelId) {
      alert('❌ Error: Hotel ID not set.\n\nPlease make sure you are:\n1. Logged in as staff\n2. Have selected a property/hotel\n\nContact your admin if issues persist.');
      return;
    }

    if (!window.confirm('This will create 10 test rooms. Continue?')) {
      return;
    }

    try {
      setSeedingInProgress(true);
      const { seedRoomsForHotel } = await import('../../../../api/seedData');
      const result = await seedRoomsForHotel(hotelId);

      if (result.success) {
        alert(`✅ Successfully created ${result.roomCount} test rooms!\n\nYou can now create bookings.`);
        // Optionally reload the page to refresh data
      } else {
        alert(`⚠️ ${result.message || 'Failed to seed rooms'}`);
      }
    } catch (error) {
      const errorMsg = error.message || 'Failed to seed test data';
      alert(`❌ Error: ${errorMsg}`);
      console.error('Seed error:', error);
    } finally {
      setSeedingInProgress(false);
    }
  };

  // Sample data matching the screenshot
  const metrics = [
    {
      title: "TODAY'S CHECK-INS",
      value: '24',
      subtitle: '45',
      trend: '+2% vs yest',
      trendUp: true,
      icon: CalendarCheck,
      color: '#3b82f6'
    },
    {
      title: "TODAY'S CHECK-OUTS",
      value: '12',
      subtitle: '30',
      trend: null,
      icon: LogOutIcon,
      color: '#f97316'
    },
    {
      title: 'OCCUPANCY RATE',
      value: '85%',
      trend: '+2% vs yest',
      trendUp: true,
      showProgress: true,
      progress: 85,
      color: '#10b981'
    },
    {
      title: 'AVAILABLE ROOMS',
      value: '15',
      subtitle: 'Excluding maintenance',
      trend: '-3 vs yest',
      trendUp: false,
      icon: Bed,
      color: '#8b5cf6'
    }
  ];

  const roomStatus = [
    { label: 'Available', count: 101, color: '#10b981', percentage: 27 },
    { label: 'Occupied', count: 202, color: '#ef4444', percentage: 54 },
    { label: 'Cleaning', count: 45, color: '#f59e0b', percentage: 12 },
    { label: 'Maintenance', count: 20, color: '#6b7280', percentage: 5 }
  ];

  const todaysArrivals = [
    {
      id: 1,
      guest: 'John Doe',
      avatar: null,
      roomType: 'Deluxe Sea View',
      roomNumber: '405',
      checkInTime: '12:30 PM',
      status: 'Arriving',
      statusColor: '#3b82f6'
    },
    {
      id: 2,
      guest: 'Alice Cooper',
      avatar: null,
      roomType: 'Presidential Suite',
      roomNumber: '501',
      checkInTime: '02:00 PM',
      status: 'Pending',
      statusColor: '#f59e0b'
    }
  ];

  const guestRequests = [
    {
      id: 1,
      room: 'Room 202',
      request: 'Requesting 2 extra pillows and a duvet.',
      time: '1:07 AM',
      icon: Bed,
      actions: ['Assign', 'Ignore']
    },
    {
      id: 2,
      room: 'Room 505',
      request: 'Late checkout request (2:00 PM).',
      time: '1:05 AM',
      icon: LogOutIcon,
      actions: ['Approve', 'Deny']
    },
    {
      id: 3,
      room: 'Room 301',
      request: 'Wake-up call',
      time: '1:05 PM',
      icon: Bell,
      actions: null
    }
  ];

  return (
    <div className="rd-content" style={{ 
      background: isDark ? '#0f172a' : '#f8fafc', 
      minHeight: '100vh' 
    }}>
      {/* Top Header - Premium */}
      <header style={{
        background: isDark 
          ? 'linear-gradient(180deg, #1e293b 0%, #1e293b 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #fefefe 100%)',
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
        padding: '16px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <span style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Home</span>
            <span style={{ color: isDark ? '#475569' : '#cbd5e1' }}>/</span>
            <span style={{ 
              color: isDark ? '#f1f5f9' : '#0f172a', 
              fontWeight: '600' 
            }}>Dashboard</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Search */}
          <div style={{ position: 'relative', width: '320px' }}>
            <Search 
              size={18} 
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: isDark ? '#64748b' : '#94a3b8'
              }} 
            />
            <input
              type="text"
              placeholder="Search guests, rooms, reservations..."
              style={{
                width: '100%',
                padding: '10px 14px 10px 44px',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                color: isDark ? '#f1f5f9' : '#0f172a',
                background: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            />
          </div>

          {/* Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Date/Time */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '2px',
              marginRight: '8px'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: isDark ? '#f1f5f9' : '#0f172a'
              }}>10:42 AM</div>
              <div style={{
                fontSize: '12px',
                color: isDark ? '#64748b' : '#94a3b8'
              }}>Mon, Oct 28</div>
            </div>

            {/* Notification Button */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: isDark ? 'rgba(51, 65, 85, 0.5)' : 'transparent',
                border: isDark ? '1px solid #475569' : '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: isDark ? '#94a3b8' : '#64748b',
                transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              <Bell size={20} />
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 6px',
                borderRadius: '10px',
                minWidth: '18px',
                textAlign: 'center'
              }}>12</span>
            </button>

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: isDark ? 'rgba(51, 65, 85, 0.5)' : 'transparent',
                border: isDark ? '1px solid #475569' : '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: isDark ? '#94a3b8' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* User Avatar */}
            <div style={{ marginLeft: '4px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '600',
                fontSize: '15px',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
              }}>S</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <div className="rd-main" style={{ padding: '32px 40px', background: isDark ? '#0f172a' : '#f8fafc' }}>
        {/* Metrics Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '20px',
          marginBottom: '32px'
        }}>
          {metrics.map((metric, index) => {
            const cardAccentColor = metric.color;
            const isNegativeTrend = metric.trendUp === false;
            const hasProgress = metric.subtitle && !isNaN(parseInt(metric.subtitle));
            const progressValue = hasProgress ? (parseInt(metric.value) / parseInt(metric.subtitle)) * 100 : 0;
            
            return (
              <div 
                key={index} 
                className="rd-metric-card-premium"
                style={{
                  background: isDark 
                    ? 'linear-gradient(135deg, #1e293b 0%, #1a2332 100%)' 
                    : 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
                  borderRadius: '16px',
                  padding: '24px 28px',
                  boxShadow: isDark 
                    ? '0 1px 2px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.15)'
                    : '0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.06)',
                  position: 'relative',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = isDark
                    ? '0 4px 8px rgba(0, 0, 0, 0.25), 0 12px 32px rgba(0, 0, 0, 0.2)'
                    : '0 4px 8px rgba(0, 0, 0, 0.06), 0 12px 32px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isDark 
                    ? '0 1px 2px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.15)'
                    : '0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.06)';
                }}
              >
                {/* Top accent line */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: `linear-gradient(90deg, ${cardAccentColor}, ${cardAccentColor}80)`,
                  borderRadius: '16px 16px 0 0'
                }} />

                {/* Header with icon and title */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  justifyContent: 'space-between',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: isDark 
                      ? `linear-gradient(135deg, ${cardAccentColor}20, ${cardAccentColor}10)`
                      : `linear-gradient(135deg, ${cardAccentColor}12, ${cardAccentColor}06)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: cardAccentColor,
                    flexShrink: 0
                  }}>
                    {metric.icon ? <metric.icon size={20} strokeWidth={2} /> : <CalendarCheck size={20} strokeWidth={2} />}
                  </div>
                  
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: isDark ? '#64748b' : '#94a3b8',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    textAlign: 'right',
                    lineHeight: '1.4'
                  }}>
                    {metric.title}
                  </span>
                </div>

                {/* Value Section */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'baseline', 
                  gap: '6px',
                  marginBottom: hasProgress || metric.showProgress ? '16px' : '12px'
                }}>
                  <h2 style={{
                    fontSize: '42px',
                    fontWeight: '700',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    margin: '0',
                    lineHeight: '1',
                    letterSpacing: '-0.025em',
                    fontFeatureSettings: '"tnum"'
                  }}>
                    {metric.value}
                  </h2>
                  
                  {metric.subtitle && metric.title !== 'AVAILABLE ROOMS' && (
                    <span style={{
                      fontSize: '22px',
                      color: isDark ? '#475569' : '#cbd5e1',
                      fontWeight: '500',
                      letterSpacing: '-0.01em'
                    }}>
                      / {metric.subtitle}
                    </span>
                  )}
                </div>

                {/* Horizontal Progress Bar for ratio-based data */}
                {hasProgress && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{
                      height: '6px',
                      background: isDark ? '#334155' : '#e5e7eb',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${progressValue}%`,
                        background: `linear-gradient(90deg, ${cardAccentColor}, ${cardAccentColor}cc)`,
                        borderRadius: '3px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                )}

                {/* Occupancy Progress Bar */}
                {metric.showProgress && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{
                      height: '6px',
                      background: isDark ? '#334155' : '#e5e7eb',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${metric.progress}%`,
                        background: `linear-gradient(90deg, ${cardAccentColor}, ${cardAccentColor}cc)`,
                        borderRadius: '3px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                )}

                {/* Trend Indicator or Secondary Text */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {metric.trend && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: isNegativeTrend 
                        ? (isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)')
                        : (isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)'),
                      color: isNegativeTrend 
                        ? (isDark ? '#f87171' : '#dc2626')
                        : (isDark ? '#34d399' : '#059669')
                    }}>
                      {metric.trendUp ? (
                        <ArrowUpRight size={14} strokeWidth={2.5} />
                      ) : (
                        <ArrowDownRight size={14} strokeWidth={2.5} />
                      )}
                      <span>{metric.trend}</span>
                    </div>
                  )}

                  {metric.subtitle && metric.title === 'AVAILABLE ROOMS' && (
                    <span style={{
                      fontSize: '11px',
                      color: isDark ? '#64748b' : '#94a3b8',
                      fontWeight: '500'
                    }}>
                      {metric.subtitle}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions - Enhanced */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setShowNewBookingModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.25)';
              }}
            >
              <Plus size={18} strokeWidth={2.5} />
              New Booking
            </button>

            {/* Seed Test Data Button */}
            <button
              onClick={handleSeedTestData}
              disabled={seedingInProgress}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: seedingInProgress ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                background: isDark ? '#334155' : '#f1f5f9',
                color: isDark ? '#cbd5e1' : '#64748b',
                border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                opacity: seedingInProgress ? 0.6 : 1
              }}
              title="Generate 10 test rooms for booking"
            >
              <Wand2 size={14} />
              {seedingInProgress ? 'Seeding...' : 'Generate Test Data'}
            </button>
            
            {[
              { icon: UserPlus, label: 'Walk-In Guest', onClick: () => setShowWalkInModal(true) },
              { icon: LogOutIcon, label: 'Express Check-Out', onClick: () => setShowCheckOutModal(true) },
              { icon: ArrowRightLeft, label: 'Room Change', onClick: () => setShowRoomChangeModal(true) }
            ].map((action, idx) => (
              <button 
                key={idx}
                onClick={action.onClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: isDark ? 'transparent' : 'transparent',
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
                <action.icon size={18} strokeWidth={2} />
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Two Column Layout - Enhanced */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 380px', 
          gap: '24px', 
          alignItems: 'start' 
        }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Live Room Status - Enhanced */}
            <div style={{
              background: isDark ? '#1e293b' : '#ffffff',
              borderRadius: '16px',
              boxShadow: isDark 
                ? '0 1px 2px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.12)'
                : '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)'
            }}>
              <div style={{
                padding: '20px 24px',
                borderBottom: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                  margin: 0
                }}>Live Room Status Summary</h3>
                <span style={{
                  fontSize: '12px',
                  color: isDark ? '#64748b' : '#94a3b8',
                  fontWeight: '500'
                }}>368 Total</span>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {roomStatus.map((status, index) => (
                    <div key={index}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '3px',
                            background: status.color
                          }} />
                          <span style={{
                            fontSize: '14px',
                            color: isDark ? '#cbd5e1' : '#475569',
                            fontWeight: '500'
                          }}>{status.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            color: isDark ? '#f1f5f9' : '#0f172a'
                          }}>{status.count}</span>
                          <span style={{
                            fontSize: '12px',
                            color: isDark ? '#64748b' : '#94a3b8',
                            fontWeight: '500'
                          }}>{status.percentage}%</span>
                        </div>
                      </div>
                      <div style={{
                        height: '8px',
                        background: isDark ? '#334155' : '#f1f5f9',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${status.percentage}%`,
                          background: `linear-gradient(90deg, ${status.color}, ${status.color}bb)`,
                          borderRadius: '4px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Today's Arrivals - Enhanced */}
            <div style={{
              background: isDark ? '#1e293b' : '#ffffff',
              borderRadius: '16px',
              boxShadow: isDark 
                ? '0 1px 2px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.12)'
                : '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)'
            }}>
              <div style={{
                padding: '20px 24px',
                borderBottom: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                  margin: 0
                }}>Today's Arrivals</h3>
                <button style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#3b82f6',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s'
                }}>View All →</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: isDark ? '1px solid #334155' : '1px solid #f1f5f9' }}>
                      {['GUEST NAME', 'ROOM TYPE', 'ROOM #', 'CHECK-IN TIME', 'STATUS'].map((header) => (
                        <th key={header} style={{
                          padding: '14px 24px',
                          textAlign: 'left',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: isDark ? '#64748b' : '#94a3b8',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase'
                        }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {todaysArrivals.map((arrival, idx) => (
                      <tr 
                        key={arrival.id}
                        style={{
                          borderBottom: idx !== todaysArrivals.length - 1 
                            ? (isDark ? '1px solid #2d3748' : '1px solid #f8fafc')
                            : 'none',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = isDark ? '#334155' : '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: '600',
                              fontSize: '13px'
                            }}>
                              {arrival.guest.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span style={{
                              fontSize: '14px',
                              fontWeight: '500',
                              color: isDark ? '#f1f5f9' : '#0f172a'
                            }}>{arrival.guest}</span>
                          </div>
                        </td>
                        <td style={{
                          padding: '16px 24px',
                          fontSize: '14px',
                          color: isDark ? '#cbd5e1' : '#475569'
                        }}>{arrival.roomType}</td>
                        <td style={{
                          padding: '16px 24px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: isDark ? '#f1f5f9' : '#0f172a'
                        }}>{arrival.roomNumber}</td>
                        <td style={{
                          padding: '16px 24px',
                          fontSize: '14px',
                          color: isDark ? '#cbd5e1' : '#475569'
                        }}>{arrival.checkInTime}</td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '5px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: `${arrival.statusColor}15`,
                            color: arrival.statusColor
                          }}>
                            {arrival.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column - Guest Requests Enhanced */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
              background: isDark ? '#1e293b' : '#ffffff',
              borderRadius: '16px',
              boxShadow: isDark 
                ? '0 1px 2px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.12)'
                : '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)'
            }}>
              <div style={{
                padding: '20px 24px',
                borderBottom: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                  margin: 0
                }}>Guest Requests</h3>
                <span style={{
                  background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                  color: '#ef4444',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>3 New</span>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {guestRequests.map((request, idx) => {
                    const Icon = request.icon;
                    const isUrgent = idx === 0;
                    return (
                      <div 
                        key={request.id}
                        style={{
                          padding: '16px',
                          background: isDark 
                            ? (isUrgent ? 'rgba(59, 130, 246, 0.08)' : '#0f172a')
                            : (isUrgent ? 'rgba(59, 130, 246, 0.04)' : '#f8fafc'),
                          borderRadius: '12px',
                          border: isDark
                            ? (isUrgent ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent')
                            : (isUrgent ? '1px solid rgba(59, 130, 246, 0.15)' : '1px solid transparent'),
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: isDark ? '#334155' : '#e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isDark ? '#94a3b8' : '#64748b'
                            }}>
                              <Icon size={16} strokeWidth={2} />
                            </div>
                            <span style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: isDark ? '#f1f5f9' : '#0f172a'
                            }}>{request.room}</span>
                          </div>
                          <span style={{
                            fontSize: '11px',
                            color: isDark ? '#64748b' : '#94a3b8',
                            fontWeight: '500',
                            background: isDark ? '#334155' : '#f1f5f9',
                            padding: '3px 8px',
                            borderRadius: '4px'
                          }}>{request.time}</span>
                        </div>
                        <p style={{
                          fontSize: '13px',
                          color: isDark ? '#94a3b8' : '#64748b',
                          margin: '0 0 14px 0',
                          lineHeight: '1.5'
                        }}>{request.request}</p>
                        {request.actions && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button style={{
                              flex: 1,
                              padding: '8px 14px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              border: 'none',
                              background: '#3b82f6',
                              color: 'white'
                            }}>
                              {request.actions[0]}
                            </button>
                            <button style={{
                              flex: 1,
                              padding: '8px 14px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              background: 'transparent',
                              color: isDark ? '#94a3b8' : '#64748b',
                              border: isDark ? '1px solid #475569' : '1px solid #e2e8f0'
                            }}>
                              {request.actions[1]}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Modals */}
      <NewBookingModal
        isOpen={showNewBookingModal}
        onClose={() => setShowNewBookingModal(false)}
        isDark={isDark}
        hotelId={hotelId}
      />
      <WalkInGuestModal
        isOpen={showWalkInModal}
        onClose={() => setShowWalkInModal(false)}
        isDark={isDark}
        hotelId={hotelId}
      />
      <ExpressCheckOutModal
        isOpen={showCheckOutModal}
        onClose={() => setShowCheckOutModal(false)}
        isDark={isDark}
        activeBookingId={activeBookingId}
      />
      <RoomChangeModal
        isOpen={showRoomChangeModal}
        onClose={() => setShowRoomChangeModal(false)}
        isDark={isDark}
        activeBookingId={activeBookingId}
      />
    </div>
  );
};

export default DashboardContent;
