import React, { useState } from 'react';
import SuperAdminLayout from './SuperAdminLayout';
import './SuperadminDashboard.css';

const SuperadminDashboard = () => {
  const [timeFilter, setTimeFilter] = useState('7d');
  
  // Real-time statistics derived from the design prompt
  const stats = [
    { 
      label: 'Total Revenue', 
      value: '$1,250,450', 
      trend: '+2.5%', 
      trendUp: true, 
      desc: 'vs. previous period',
      icon: 'payments',
      gradient: 'linear-gradient(135deg, #06B6D4 0%, #0D9488 100%)' // Teal gradient
    },
    { 
      label: 'Commission Earned', 
      value: '$187,567', 
      trend: '+5.1%', 
      trendUp: true, 
      desc: 'Average 15% rate',
      icon: 'percent',
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)' // Premium blue/purple
    },
    { 
      label: 'Active Users', 
      value: '12,345', 
      trend: '-0.2%', 
      trendUp: false, 
      desc: 'Guests & staff active',
      icon: 'group',
      gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' // Indigo
    },
    { 
      label: 'Pending Approvals', 
      value: '8 Hotels', 
      trend: '23 Reviews', 
      trendUp: null, 
      desc: 'Requires moderation',
      icon: 'pending_actions',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' // Warning Amber
    },
  ];

  const recentBookings = [
    { guest: 'John Doe', email: 'john@example.com', hotel: 'Hotel Annapurna', date: 'May 20, 2026', amount: '$450.00', commission: '$67.50', status: 'Paid', statusType: 'success' },
    { guest: 'Jane Smith', email: 'jane@example.com', hotel: 'Soaltee Crown Plaza', date: 'May 19, 2026', amount: '$1,200.50', commission: '$180.00', status: 'Pending', statusType: 'warning' },
    { guest: 'Mike Johnson', email: 'mike@example.com', hotel: 'Hyatt Regency', date: 'May 18, 2026', amount: '$320.00', commission: '$48.00', status: 'Paid', statusType: 'success' },
    { guest: 'Sarah Wilson', email: 'sarah@example.com', hotel: 'Hotel Annapurna', date: 'May 17, 2026', amount: '$180.75', commission: '$27.11', status: 'Cancelled', statusType: 'error' },
  ];

  const commissionBreakdown = [
    { type: 'Luxury Hotels', percentage: 75, rate: '15%' },
    { type: 'Boutique Hotels', percentage: 55, rate: '12%' },
    { type: 'Resort Hotels', percentage: 40, rate: '10%' },
    { type: 'Budget Hotels', percentage: 25, rate: '8%' },
  ];

  const pendingActions = [
    { text: '8 Hotels awaiting verification', type: 'hotel', count: 8, severity: 'warning' },
    { text: '23 Guest reviews pending moderation', type: 'review', count: 23, severity: 'info' },
    { text: '3 Hotel payouts due for processing', type: 'payout', count: 3, severity: 'danger' }
  ];

  const activityFeed = [
    { time: '10 min ago', action: 'New booking confirmed', detail: 'John Doe booked Deluxe Room at Hotel Annapurna', badge: 'Booking', status: 'success' },
    { time: '45 min ago', action: 'Hotel registered', detail: 'StayHaven Resort Pokhara submitted verification documents', badge: 'Hotel', status: 'warning' },
    { time: '2 hours ago', action: 'Payout processed', detail: '$4,520 paid to Soaltee Crown Plaza', badge: 'Payout', status: 'success' },
    { time: '4 hours ago', action: 'Negative review flagged', detail: 'Guest flagged review #1289 for inappropriate language', badge: 'Review', status: 'danger' }
  ];

  return (
    <SuperAdminLayout pageTitle="Dashboard Overview">
      <div className="sad-container">
        
        {/* Top Metrics Row */}
        <div className="sad-stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="sad-stat-card">
              <div className="sad-stat-icon-wrapper" style={{ background: stat.gradient }}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
              <div className="sad-stat-info">
                <p className="sad-stat-label">{stat.label}</p>
                <h3 className="sad-stat-value">{stat.value}</h3>
                <div className="sad-stat-footer">
                  <span className={`sad-stat-trend ${stat.trendUp === true ? 'positive' : stat.trendUp === false ? 'negative' : 'neutral'}`}>
                    <span className="material-symbols-outlined text-sm">
                      {stat.trendUp === true ? 'trending_up' : stat.trendUp === false ? 'trending_down' : 'sync'}
                    </span>
                    {stat.trend}
                  </span>
                  <span className="sad-stat-desc">{stat.desc}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts and Distribution Grid */}
        <div className="sad-charts-grid">
          
          {/* Sales Analytics Chart (Large Panel) */}
          <div className="sad-card sad-chart-panel">
            <div className="sad-card-header">
              <div>
                <h3 className="sad-card-title">Sales Analytics</h3>
                <p className="sad-card-subtitle">Platform revenue & booking trends</p>
              </div>
              <div className="sad-filters">
                {['24h', '7d', '30d', '90d'].map((f) => (
                  <button 
                    key={f}
                    className={`sad-filter-btn ${timeFilter === f ? 'active' : ''}`}
                    onClick={() => setTimeFilter(f)}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="sad-chart-stats">
              <div className="sad-c-stat">
                <span className="sad-c-value">$84,250</span>
                <span className="sad-c-label">Net Sales</span>
              </div>
              <div className="sad-c-stat">
                <span className="sad-c-value positive">+12.4%</span>
                <span className="sad-c-label">Growth Rate</span>
              </div>
              <div className="sad-c-stat">
                <span className="sad-c-value">$12,637</span>
                <span className="sad-c-label">Platform Fee</span>
              </div>
            </div>

            <div className="sad-svg-chart-container">
              <svg className="sad-svg-chart" viewBox="0 0 600 220" preserveAspectRatio="none">
                {/* Grid Lines */}
                <line x1="0" y1="40" x2="600" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                <line x1="0" y1="90" x2="600" y2="90" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                <line x1="0" y1="140" x2="600" y2="140" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                <line x1="0" y1="190" x2="600" y2="190" stroke="rgba(255,255,255,0.1)" />

                {/* Area Gradient Fill */}
                <path 
                  d="M0,160 Q80,140 160,80 T320,110 T480,50 T600,70 L600,190 L0,190 Z"
                  fill="url(#premium_chart_fill)"
                />
                
                {/* Line Path */}
                <path 
                  d="M0,160 Q80,140 160,80 T320,110 T480,50 T600,70"
                  fill="none"
                  stroke="url(#premium_chart_stroke)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {/* Dots / Points */}
                <circle cx="160" cy="80" r="6" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx="320" cy="110" r="6" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx="480" cy="50" r="6" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />

                <defs>
                  {/* Gradients */}
                  <linearGradient id="premium_chart_fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                  </linearGradient>
                  
                  <linearGradient id="premium_chart_stroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="50%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="sad-chart-labels">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="sad-card sad-breakdown-panel">
            <div className="sad-card-header">
              <div>
                <h3 className="sad-card-title">Commission Rates</h3>
                <p className="sad-card-subtitle">By Hotel Accommodation Type</p>
              </div>
            </div>

            <div className="sad-breakdown-content">
              {commissionBreakdown.map((item, index) => (
                <div key={index} className="sad-progress-item">
                  <div className="sad-progress-header">
                    <span className="sad-progress-label">{item.type}</span>
                    <span className="sad-progress-val font-mono">{item.rate} ({item.percentage}%)</span>
                  </div>
                  <div className="sad-progress-track">
                    <div 
                      className="sad-progress-bar"
                      style={{ 
                        width: `${item.percentage}%`,
                        background: index === 0 ? 'var(--sa-purple)' : index === 1 ? 'var(--sa-primary)' : index === 2 ? 'var(--sa-teal)' : 'var(--sa-success)'
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="sad-pending-box">
              <h4 className="sad-pending-title">Pending Actions</h4>
              <div className="sad-pending-list">
                {pendingActions.map((action, i) => (
                  <div key={i} className={`sad-pending-item ${action.severity}`}>
                    <span className="material-symbols-outlined">
                      {action.type === 'hotel' ? 'corporate_fare' : action.type === 'review' ? 'reviews' : 'account_balance_wallet'}
                    </span>
                    <p>{action.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Booking & Activity Grid */}
        <div className="sad-bottom-grid">
          
          {/* Recent Bookings Table */}
          <div className="sad-card sad-table-panel">
            <div className="sad-card-header">
              <div>
                <h3 className="sad-card-title">Recent Bookings</h3>
                <p className="sad-card-subtitle">Latest guest reservation actions</p>
              </div>
              <button className="sad-text-link">View All Bookings</button>
            </div>

            <div className="sad-table-wrapper">
              <table className="sad-table">
                <thead>
                  <tr>
                    <th>Guest</th>
                    <th>Hotel</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Commission</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b, i) => (
                    <tr key={i}>
                      <td>
                        <div className="sad-guest-cell">
                          <div className="sad-avatar-circle">{b.guest[0]}</div>
                          <div>
                            <p className="sad-guest-name">{b.guest}</p>
                            <p className="sad-guest-email">{b.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>{b.hotel}</td>
                      <td>{b.date}</td>
                      <td className="font-mono font-semibold">{b.amount}</td>
                      <td className="font-mono text-emerald-500">{b.commission}</td>
                      <td>
                        <span className={`sad-status-badge ${b.statusType}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real-time Activity Feed */}
          <div className="sad-card sad-activity-panel">
            <div className="sad-card-header">
              <div>
                <h3 className="sad-card-title">Platform Activity</h3>
                <p className="sad-card-subtitle">Real-time audit log notifications</p>
              </div>
            </div>
            
            <div className="sad-activity-list">
              {activityFeed.map((act, index) => (
                <div key={index} className="sad-activity-item">
                  <div className="sad-activity-badge-line">
                    <span className={`sad-activity-dot ${act.status}`}></span>
                    <span className="sad-activity-time">{act.time}</span>
                  </div>
                  <div className="sad-activity-body">
                    <h5 className="sad-activity-title">{act.action}</h5>
                    <p className="sad-activity-desc">{act.detail}</p>
                    <span className={`sad-activity-tag ${act.status}`}>{act.badge}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </SuperAdminLayout>
  );
};

export default SuperadminDashboard;