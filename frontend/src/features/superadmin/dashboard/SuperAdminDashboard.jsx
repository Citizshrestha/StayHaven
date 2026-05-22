import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  ArrowUpRight,
  Sparkles,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import './SuperAdminDashboard.css';

const SuperAdminDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mock data - replace with real API calls
  const metrics = {
    revenue: { value: 1250450, change: 2.5, trend: 'up' },
    bookings: { value: 152, change: 5.1, trend: 'up' },
    users: { value: 12345, change: -0.2, trend: 'down' },
    hotels: { value: 47, change: 3, trend: 'up' },
  };

  const recentActivity = [
    { type: 'booking', hotel: 'Hotel Annapurna', amount: 12500, time: '2 min ago' },
    { type: 'approval', hotel: 'Soaltee Crown Plaza', time: '15 min ago' },
    { type: 'payout', hotel: 'Hyatt Regency', amount: 45000, time: '1 hour ago' },
    { type: 'review', hotel: 'Dwarika\'s Hotel', rating: 5, time: '2 hours ago' },
  ];

  const topHotels = [
    { name: 'Hotel Annapurna', revenue: 245000, bookings: 89, growth: 12.5 },
    { name: 'Soaltee Crown Plaza', revenue: 198000, bookings: 67, growth: 8.3 },
    { name: 'Hyatt Regency', revenue: 176000, bookings: 54, growth: 15.2 },
    { name: 'Dwarika\'s Hotel', revenue: 165000, bookings: 48, growth: 6.7 },
  ];

  const pendingActions = [
    { type: 'hotel', count: 8, label: 'Hotels Awaiting Approval' },
    { type: 'review', count: 23, label: 'Reviews Pending Moderation' },
    { type: 'payout', count: 3, label: 'Payouts Due This Week' },
  ];

  return (
    <div className={`superadmin-dashboard ${mounted ? 'mounted' : ''}`}>
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="dashboard-title">
              Platform Overview
              <span className="title-accent"></span>
            </h1>
            <p className="dashboard-subtitle">
              Real-time insights across your hotel network
            </p>
          </div>
          <div className="header-right">
            <div className="time-range-selector">
              {['24h', '7d', '30d', '90d'].map((range) => (
                <button
                  key={range}
                  className={`range-btn ${timeRange === range ? 'active' : ''}`}
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Metrics Grid */}
      <div className="metrics-grid">
        <MetricCard
          icon={<DollarSign />}
          label="Total Revenue"
          value={`$${metrics.revenue.value.toLocaleString()}`}
          change={metrics.revenue.change}
          trend={metrics.revenue.trend}
          delay={0}
        />
        <MetricCard
          icon={<Calendar />}
          label="New Bookings Today"
          value={metrics.bookings.value}
          change={metrics.bookings.change}
          trend={metrics.bookings.trend}
          delay={100}
        />
        <MetricCard
          icon={<Users />}
          label="Active Users"
          value={metrics.users.value.toLocaleString()}
          change={metrics.users.change}
          trend={metrics.users.trend}
          delay={200}
        />
        <MetricCard
          icon={<Building2 />}
          label="Featured Hotels"
          value={metrics.hotels.value}
          change={metrics.hotels.change}
          trend={metrics.hotels.trend}
          delay={300}
        />
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Revenue Chart Section */}
        <section className="chart-section">
          <div className="section-header">
            <h2 className="section-title">Revenue Analytics</h2>
            <button className="view-details-btn">
              View Details <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="chart-container">
            <RevenueChart />
          </div>
        </section>

        {/* Top Hotels */}
        <section className="top-hotels-section">
          <div className="section-header">
            <h2 className="section-title">Top Performing Hotels</h2>
            <Sparkles size={18} className="sparkle-icon" />
          </div>
          <div className="hotels-list">
            {topHotels.map((hotel, index) => (
              <div key={hotel.name} className="hotel-item" style={{ animationDelay: `${400 + index * 100}ms` }}>
                <div className="hotel-rank">{index + 1}</div>
                <div className="hotel-info">
                  <h3 className="hotel-name">{hotel.name}</h3>
                  <div className="hotel-stats">
                    <span className="stat">${hotel.revenue.toLocaleString()}</span>
                    <span className="stat-divider">•</span>
                    <span className="stat">{hotel.bookings} bookings</span>
                  </div>
                </div>
                <div className="hotel-growth">
                  <TrendingUp size={14} />
                  {hotel.growth}%
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="activity-section">
          <div className="section-header">
            <h2 className="section-title">Recent Activity</h2>
            <div className="live-indicator">
              <span className="live-dot"></span>
              Live
            </div>
          </div>
          <div className="activity-feed">
            {recentActivity.map((activity, index) => (
              <ActivityItem key={index} activity={activity} delay={600 + index * 100} />
            ))}
          </div>
        </section>

        {/* Pending Actions */}
        <section className="pending-section">
          <div className="section-header">
            <h2 className="section-title">Pending Actions</h2>
            <AlertCircle size={18} className="alert-icon" />
          </div>
          <div className="pending-list">
            {pendingActions.map((action, index) => (
              <div key={action.type} className="pending-item" style={{ animationDelay: `${800 + index * 100}ms` }}>
                <div className="pending-count">{action.count}</div>
                <div className="pending-label">{action.label}</div>
                <button className="pending-action-btn">
                  Review <ArrowUpRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ icon, label, value, change, trend, delay }) => {
  return (
    <div className="metric-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-content">
        <p className="metric-label">{label}</p>
        <h3 className="metric-value">{value}</h3>
        <div className={`metric-change ${trend}`}>
          {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <div className="metric-glow"></div>
    </div>
  );
};

// Activity Item Component
const ActivityItem = ({ activity, delay }) => {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'booking':
        return <Calendar size={16} />;
      case 'approval':
        return <CheckCircle2 size={16} />;
      case 'payout':
        return <DollarSign size={16} />;
      case 'review':
        return <Eye size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getActivityText = () => {
    switch (activity.type) {
      case 'booking':
        return `New booking at ${activity.hotel}`;
      case 'approval':
        return `${activity.hotel} approved`;
      case 'payout':
        return `Payout processed for ${activity.hotel}`;
      case 'review':
        return `New ${activity.rating}★ review for ${activity.hotel}`;
      default:
        return 'Activity';
    }
  };

  return (
    <div className="activity-item" style={{ animationDelay: `${delay}ms` }}>
      <div className={`activity-icon ${activity.type}`}>{getActivityIcon()}</div>
      <div className="activity-content">
        <p className="activity-text">{getActivityText()}</p>
        {activity.amount && (
          <span className="activity-amount">${activity.amount.toLocaleString()}</span>
        )}
      </div>
      <span className="activity-time">{activity.time}</span>
    </div>
  );
};

// Revenue Chart Component (simplified visualization)
const RevenueChart = () => {
  const data = [45, 52, 48, 65, 58, 72, 68, 78, 75, 85, 82, 90, 88, 95];

  return (
    <div className="revenue-chart">
      <div className="chart-stats">
        <div className="chart-stat">
          <span className="stat-label">This Week</span>
          <span className="stat-value">Rs. 12,50,000</span>
          <span className="stat-change up">
            <TrendingUp size={14} /> +15%
          </span>
        </div>
        <div className="chart-stat">
          <span className="stat-label">Avg. Daily</span>
          <span className="stat-value">Rs. 1,78,571</span>
        </div>
      </div>
      <div className="chart-bars">
        {data.map((value, index) => (
          <div
            key={index}
            className="chart-bar"
            style={{
              height: `${value}%`,
              animationDelay: `${1000 + index * 50}ms`,
            }}
          >
            <div className="bar-fill"></div>
          </div>
        ))}
      </div>
      <div className="chart-labels">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <span key={day} className="chart-label">
            {day}
          </span>
        ))}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
