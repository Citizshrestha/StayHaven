import React, { useState, useEffect } from 'react';
import SuperAdminLayout from './SuperAdminLayout';
import './SuperadminDashboard.css';
import {
  getDashboardMetrics,
  getRecentActivity,
  getPendingActions,
  getRecentBookingsForDashboard
} from '../../../../core/api/services/superadmin.service';
import { toast } from 'react-toastify';

// Format NPR currency
const formatNPR = (amount) => {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const SuperadminDashboard = () => {
  const [timeFilter, setTimeFilter] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [commissionBreakdown, setCommissionBreakdown] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [timeFilter]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all dashboard data
      const [metricsRes, bookingsRes, activityRes, pendingRes] = await Promise.all([
        getDashboardMetrics({ period: timeFilter }),
        getRecentBookingsForDashboard({ limit: 4 }),
        getRecentActivity({ limit: 6 }),
        getPendingActions()
      ]);

      // Process metrics
      if (metricsRes.success) {
        const metricsData = metricsRes.data;
        setStats([
          {
            label: 'Total Revenue',
            value: formatNPR(metricsData.revenue.value),
            trend: `${metricsData.revenue.change >= 0 ? '+' : ''}${metricsData.revenue.change}%`,
            trendUp: metricsData.revenue.change >= 0,
            desc: 'vs. previous period',
            icon: 'payments',
            gradient: 'linear-gradient(135deg, #06B6D4 0%, #0D9488 100%)'
          },
          {
            label: 'Commission Earned',
            value: formatNPR(metricsData.commission.value),
            trend: `${metricsData.commission.change >= 0 ? '+' : ''}${metricsData.commission.change}%`,
            trendUp: metricsData.commission.change >= 0,
            desc: `Average ${metricsData.commission.averageRate}% rate`,
            icon: 'percent',
            gradient: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)'
          },
          {
            label: 'Active Users',
            value: metricsData.activeUsers.value.toLocaleString(),
            trend: `${metricsData.activeUsers.change >= 0 ? '+' : ''}${metricsData.activeUsers.change}%`,
            trendUp: metricsData.activeUsers.change >= 0,
            desc: metricsData.activeUsers.description,
            icon: 'group',
            gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
          },
          {
            label: 'Pending Approvals',
            value: `${metricsData.pendingApprovals.hotels} Hotels`,
            trend: `${metricsData.pendingApprovals.reviews} Reviews`,
            trendUp: null,
            desc: metricsData.pendingApprovals.description,
            icon: 'pending_actions',
            gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
          },
        ]);
      }

      // Process bookings
      if (bookingsRes.success) {
        const formattedBookings = bookingsRes.data.map(booking => ({
          guest: booking.guest,
          email: booking.email,
          hotel: booking.hotel,
          date: formatDate(booking.date),
          amount: formatNPR(booking.amount),
          commission: formatNPR(booking.commission),
          status: booking.status,
          statusType: booking.statusType
        }));
        setRecentBookings(formattedBookings);
      }

      // Process activity
      if (activityRes.success) {
        setActivityFeed(activityRes.data);
      }

      // Process pending actions
      if (pendingRes.success) {
        setPendingActions(pendingRes.data);
      }

      // Static commission breakdown (can be fetched from API later)
      setCommissionBreakdown([
        { type: 'Luxury Hotels', percentage: 75, rate: '15%' },
        { type: 'Boutique Hotels', percentage: 55, rate: '12%' },
        { type: 'Resort Hotels', percentage: 40, rate: '10%' },
        { type: 'Budget Hotels', percentage: 25, rate: '8%' },
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SuperAdminLayout pageTitle="Dashboard Overview">
      <div className="sad-container">

        {/* Top Metrics Row */}
        <div className="sad-stats-grid">
          {loading ? (
            // Loading skeletons
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="sad-stat-card sad-skeleton">
                <div className="sad-skeleton-icon" />
                <div className="sad-stat-info">
                  <div className="sad-skeleton-line" style={{ width: '60%', height: '16px' }} />
                  <div className="sad-skeleton-line" style={{ width: '80%', height: '24px', marginTop: '8px' }} />
                  <div className="sad-skeleton-line" style={{ width: '70%', height: '14px', marginTop: '8px' }} />
                </div>
              </div>
            ))
          ) : (
            stats.map((stat, index) => (
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
            ))
          )}
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
                <span className="sad-c-value">{loading ? '-' : stats[0]?.value || 'NPR 0'}</span>
                <span className="sad-c-label">Net Sales</span>
              </div>
              <div className="sad-c-stat">
                <span className={`sad-c-value ${loading ? '' : stats[0]?.trendUp ? 'positive' : 'negative'}`}>
                  {loading ? '-' : stats[0]?.trend || '+0%'}
                </span>
                <span className="sad-c-label">Growth Rate</span>
              </div>
              <div className="sad-c-stat">
                <span className="sad-c-value">{loading ? '-' : stats[1]?.value || 'NPR 0'}</span>
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
                {loading ? (
                  <div className="sad-skeleton-line" style={{ width: '100%', height: '40px' }} />
                ) : (
                  pendingActions.map((action, i) => (
                    <div key={i} className={`sad-pending-item ${action.severity}`}>
                      <span className="material-symbols-outlined">
                        {action.type === 'hotel' ? 'corporate_fare' : action.type === 'review' ? 'reviews' : 'account_balance_wallet'}
                      </span>
                      <p>{action.text}</p>
                    </div>
                  ))
                )}
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
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan="6">
                          <div className="sad-skeleton-line" style={{ width: '100%', height: '40px' }} />
                        </td>
                      </tr>
                    ))
                  ) : recentBookings.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                        No recent bookings found
                      </td>
                    </tr>
                  ) : (
                    recentBookings.map((b, i) => (
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
                    ))
                  )}
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
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="sad-skeleton-line" style={{ width: '100%', height: '60px', marginBottom: '12px' }} />
                ))
              ) : activityFeed.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                  No recent activity
                </div>
              ) : (
                activityFeed.map((act, index) => (
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
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </SuperAdminLayout>
  );
};

export default SuperadminDashboard;