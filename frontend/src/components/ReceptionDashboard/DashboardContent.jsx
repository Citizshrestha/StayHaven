import React, { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
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
  Eye
} from 'lucide-react';
import './DashboardContent.css';

const DashboardContent = () => {
  const { isDark, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);

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
    <div className="rd-content">
      {/* Top Header */}
      <header className="rd-header">
        <div className="rd-header-left">
          <div className="rd-breadcrumb">
            <span className="rd-breadcrumb-item">Home</span>
            <span className="rd-breadcrumb-separator">/</span>
            <span className="rd-breadcrumb-item active">Dashboard</span>
          </div>
        </div>
        
        <div className="rd-header-right">
          <div className="rd-search-wrapper">
            <Search size={18} className="rd-search-icon" />
            <input 
              type="text" 
              placeholder="Search guests, rooms, reservations..." 
              className="rd-search-input"
            />
          </div>
          
          <div className="rd-header-actions">
            <div className="rd-date-time">
              <div className="rd-time">10:42 AM</div>
              <div className="rd-date">Mon, Oct 28</div>
            </div>
            
            <button 
              className="rd-icon-btn rd-notification-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell size={20} />
              <span className="rd-notification-badge">12</span>
            </button>
            
            <button className="rd-icon-btn" onClick={toggleTheme}>
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <div className="rd-user-avatar">
              <div className="rd-avatar-circle">S</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <div className="rd-main">
        {/* Metrics Row */}
        <div className="rd-metrics-grid">
          {metrics.map((metric, index) => (
            <div key={index} className="rd-metric-card">
              <div className="rd-metric-header">
                <span className="rd-metric-title">{metric.title}</span>
                {metric.icon && !metric.showProgress && (
                  <div className="rd-metric-icon" style={{ color: metric.color }}>
                    <metric.icon size={20} />
                  </div>
                )}
              </div>
              
              <div className="rd-metric-content">
                <div className="rd-metric-value-row">
                  <h2 className="rd-metric-value">{metric.value}</h2>
                  {metric.subtitle && (
                    <span className="rd-metric-subtitle">/ {metric.subtitle}</span>
                  )}
                </div>
                
                {metric.showProgress && (
                  <div className="rd-progress-ring">
                    <svg width="60" height="60" viewBox="0 0 60 60">
                      <circle
                        cx="30"
                        cy="30"
                        r="24"
                        fill="none"
                        stroke={isDark ? '#334155' : '#e5e7eb'}
                        strokeWidth="6"
                      />
                      <circle
                        cx="30"
                        cy="30"
                        r="24"
                        fill="none"
                        stroke={metric.color}
                        strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * 24}`}
                        strokeDashoffset={`${2 * Math.PI * 24 * (1 - metric.progress / 100)}`}
                        strokeLinecap="round"
                        transform="rotate(-90 30 30)"
                      />
                    </svg>
                  </div>
                )}
                
                {metric.trend && (
                  <div className={`rd-metric-trend ${metric.trendUp ? 'up' : 'down'}`}>
                    {metric.trendUp ? (
                      <ArrowUpRight size={14} />
                    ) : (
                      <ArrowDownRight size={14} />
                    )}
                    <span>{metric.trend}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="rd-section">
          <div className="rd-quick-actions">
            <button className="rd-action-btn rd-action-btn-primary">
              <Plus size={18} />
              New Booking
            </button>
            <button className="rd-action-btn rd-action-btn-outline">
              <UserPlus size={18} />
              Walk-In Guest
            </button>
            <button className="rd-action-btn rd-action-btn-outline">
              <LogOutIcon size={18} />
              Express Check-Out
            </button>
            <button className="rd-action-btn rd-action-btn-outline">
              <ArrowRightLeft size={18} />
              Room Change
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="rd-two-column">
          {/* Left Column */}
          <div className="rd-left-column">
            {/* Live Room Status */}
            <div className="rd-card">
              <div className="rd-card-header">
                <h3 className="rd-card-title">Live Room Status Summary</h3>
              </div>
              <div className="rd-card-body">
                <div className="rd-room-status-list">
                  {roomStatus.map((status, index) => (
                    <div key={index} className="rd-room-status-item">
                      <div className="rd-room-status-info">
                        <span className="rd-room-status-label">{status.label}</span>
                        <span className="rd-room-status-count">{status.count}</span>
                      </div>
                      <div className="rd-room-status-bar">
                        <div 
                          className="rd-room-status-progress"
                          style={{ 
                            width: `${status.percentage}%`,
                            backgroundColor: status.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Today's Arrivals */}
            <div className="rd-card">
              <div className="rd-card-header">
                <h3 className="rd-card-title">Today's Arrivals</h3>
                <button className="rd-view-all-btn">View All</button>
              </div>
              <div className="rd-card-body rd-no-padding">
                <div className="rd-table-wrapper">
                  <table className="rd-table">
                    <thead>
                      <tr>
                        <th>GUEST NAME</th>
                        <th>ROOM TYPE</th>
                        <th>ROOM #</th>
                        <th>CHECK-IN TIME</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todaysArrivals.map((arrival) => (
                        <tr key={arrival.id}>
                          <td>
                            <div className="rd-guest-cell">
                              <div className="rd-guest-avatar">
                                {arrival.avatar ? (
                                  <img src={arrival.avatar} alt={arrival.guest} />
                                ) : (
                                  <div className="rd-avatar-placeholder">
                                    {arrival.guest.split(' ').map(n => n[0]).join('')}
                                  </div>
                                )}
                              </div>
                              <span>{arrival.guest}</span>
                            </div>
                          </td>
                          <td>{arrival.roomType}</td>
                          <td>{arrival.roomNumber}</td>
                          <td>{arrival.checkInTime}</td>
                          <td>
                            <span 
                              className="rd-status-badge"
                              style={{ 
                                backgroundColor: `${arrival.statusColor}15`,
                                color: arrival.statusColor
                              }}
                            >
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
          </div>

          {/* Right Column - Guest Requests */}
          <div className="rd-right-column">
            <div className="rd-card">
              <div className="rd-card-header">
                <h3 className="rd-card-title">Guest Requests</h3>
                <span className="rd-badge-new">3 New</span>
              </div>
              <div className="rd-card-body">
                <div className="rd-requests-list">
                  {guestRequests.map((request) => {
                    const Icon = request.icon;
                    return (
                      <div key={request.id} className="rd-request-item">
                        <div className="rd-request-header">
                          <div className="rd-request-title-row">
                            <Bed size={16} className="rd-request-icon" />
                            <span className="rd-request-room">{request.room}</span>
                          </div>
                          <span className="rd-request-time">{request.time}</span>
                        </div>
                        <p className="rd-request-text">{request.request}</p>
                        {request.actions && (
                          <div className="rd-request-actions">
                            <button className="rd-request-btn rd-request-btn-primary">
                              {request.actions[0]}
                            </button>
                            <button className="rd-request-btn rd-request-btn-secondary">
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
    </div>
  );
};

export default DashboardContent;
