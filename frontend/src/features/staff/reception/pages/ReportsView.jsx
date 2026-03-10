import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import {
  Calendar,
  Download,
  ChevronDown,
  FileText,
  Users,
  Bed,
  LogIn,
  LogOut,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Loader2,
  Filter,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import './ReportsView.css';
import * as receptionApi from '../../../../core/api/services/reception.service';

const ReportsView = () => {
  const { isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('today');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [selectedReport, setSelectedReport] = useState('overview');
  const [reportData, setReportData] = useState({
    occupancy: { current: 0, previous: 0, trend: 'up', rooms: { occupied: 0, available: 0, maintenance: 0, reserved: 0 } },
    checkIns: { today: 0, completed: 0, pending: 0, noShow: 0 },
    checkOuts: { today: 0, completed: 0, pending: 0, lateCheckout: 0 },
    housekeeping: { clean: 0, dirty: 0, inProgress: 0, inspected: 0 },
    guestActivity: { currentGuests: 0, vipGuests: 0, newArrivals: 0, departures: 0 },
    roomStatus: [],
    recentActivity: []
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await receptionApi.getReportsOverview({ period: dateRange });
        if (res?.success && res.data) {
          const d = res.data;
          setReportData({
            occupancy: d.occupancy || reportData.occupancy,
            checkIns: d.checkIns || reportData.checkIns,
            checkOuts: d.checkOuts || reportData.checkOuts,
            housekeeping: d.housekeeping || reportData.housekeeping,
            guestActivity: d.guestActivity || reportData.guestActivity,
            roomStatus: d.roomStatus || [],
            recentActivity: (d.recentActivity || []).map((a, i) => ({
              id: a.id || i + 1,
              type: a.type || 'check-in',
              guest: a.guest || '',
              room: a.room || '',
              status: a.status || '',
              time: a.time || a.timeAgo || '',
              description: a.description || ''
            }))
          });
        }
      } catch {
        /* silently ignore */
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [dateRange]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.rv-date-dropdown')) {
        setShowDateDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getDateLabel = () => {
    const labels = {
      today: 'Today',
      yesterday: 'Yesterday',
      week: 'This Week',
      month: 'This Month',
      custom: 'Custom Range'
    };
    return labels[dateRange] || 'Today';
  };

  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getTrendIcon = (trend) => {
    return trend === 'up'
      ? <ArrowUpRight className="rv-trend-icon up" size={16} />
      : <ArrowDownRight className="rv-trend-icon down" size={16} />;
  };

  const getActivityIcon = (type) => {
    const icons = {
      'check-in': <LogIn size={16} />,
      'check-out': <LogOut size={16} />,
      'housekeeping': <Sparkles size={16} />,
      'maintenance': <AlertCircle size={16} />
    };
    return icons[type] || <FileText size={16} />;
  };

  const getActivityColor = (type) => {
    const colors = {
      'check-in': 'green',
      'check-out': 'blue',
      'housekeeping': 'purple',
      'maintenance': 'orange'
    };
    return colors[type] || 'gray';
  };

  const reportTabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={18} /> },
    { id: 'occupancy', label: 'Occupancy', icon: <Bed size={18} /> },
    { id: 'operations', label: 'Operations', icon: <Clock size={18} /> },
    { id: 'housekeeping', label: 'Housekeeping', icon: <Sparkles size={18} /> }
  ];

  return (
    <div className={`reports-view ${isDark ? 'dark' : ''}`}>
      {/* Header */}
      <div className="rv-header flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="rv-header-left">
          <h1 className="text-2xl font-bold mb-1">Daily Operations Report</h1>
          <p className="rv-date text-sm text-slate-500">{formatDate()}</p>
        </div>
        <div className="rv-header-right flex items-center gap-3">
          <div className="rv-date-dropdown relative">
            <button
              className="rv-date-btn flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-medium transition-all duration-200"
              onClick={(e) => {
                e.stopPropagation();
                setShowDateDropdown(!showDateDropdown);
              }}
            >
              <Calendar size={18} />
              <span>{getDateLabel()}</span>
              <ChevronDown size={16} />
            </button>
            {showDateDropdown && (
              <div className="rv-dropdown-menu absolute top-full right-0 mt-2 min-w-[180px] rounded-xl shadow-lg z-50">
                {[
                  { value: 'today', label: 'Today' },
                  { value: 'yesterday', label: 'Yesterday' },
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' }
                ].map(option => (
                  <button
                    key={option.value}
                    className={`rv-dropdown-item w-full text-left px-4 py-2.5 text-sm transition-colors duration-200 ${dateRange === option.value ? 'active' : ''}`}
                    onClick={() => { setDateRange(option.value); setShowDateDropdown(false); }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="rv-export-btn flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-medium transition-all duration-200">
            <Download size={18} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="rv-tabs flex gap-2 mb-6 flex-wrap">
        {reportTabs.map(tab => (
          <button
            key={tab.id}
            className={`rv-tab flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${selectedReport === tab.id ? 'active' : ''}`}
            onClick={() => setSelectedReport(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="rv-loading flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="rv-loading-spinner animate-spin text-indigo-600" size={32} />
          <p className="text-sm text-slate-500">Generating report...</p>
        </div>
      )}

      {/* Overview Report */}
      {!isLoading && selectedReport === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="rv-metrics-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rv-metric-card occupancy p-5 rounded-xl">
              <div className="rv-metric-header flex items-center gap-2 mb-3">
                <Bed size={20} className="text-indigo-600" />
                <span className="text-sm font-medium">Occupancy Rate</span>
              </div>
              <div className="rv-metric-value flex items-center gap-2 mb-3">
                <span className="value text-3xl font-bold">{reportData.occupancy.current}%</span>
                <span className={`trend flex items-center text-sm font-medium ${reportData.occupancy.trend}`}>
                  {getTrendIcon(reportData.occupancy.trend)}
                  {Math.abs(reportData.occupancy.current - reportData.occupancy.previous)}%
                </span>
              </div>
              <div className="rv-metric-bar h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div className="rv-bar-fill h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${reportData.occupancy.current}%` }}></div>
              </div>
            </div>

            <div className="rv-metric-card check-ins p-5 rounded-xl">
              <div className="rv-metric-header flex items-center gap-2 mb-3">
                <LogIn size={20} className="text-green-600" />
                <span className="text-sm font-medium">Today's Check-ins</span>
              </div>
              <div className="rv-metric-value flex items-center gap-2 mb-3">
                <span className="value text-3xl font-bold">{reportData.checkIns.completed}/{reportData.checkIns.today}</span>
              </div>
              <div className="rv-metric-stats flex flex-wrap gap-3">
                <span className="stat completed flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle size={14} />
                  {reportData.checkIns.completed} Completed
                </span>
                <span className="stat pending flex items-center gap-1 text-xs text-amber-600">
                  <Clock size={14} />
                  {reportData.checkIns.pending} Pending
                </span>
              </div>
            </div>

            <div className="rv-metric-card check-outs p-5 rounded-xl">
              <div className="rv-metric-header flex items-center gap-2 mb-3">
                <LogOut size={20} className="text-blue-600" />
                <span className="text-sm font-medium">Today's Check-outs</span>
              </div>
              <div className="rv-metric-value flex items-center gap-2 mb-3">
                <span className="value text-3xl font-bold">{reportData.checkOuts.completed}/{reportData.checkOuts.today}</span>
              </div>
              <div className="rv-metric-stats flex flex-wrap gap-3">
                <span className="stat completed flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle size={14} />
                  {reportData.checkOuts.completed} Completed
                </span>
                <span className="stat pending flex items-center gap-1 text-xs text-amber-600">
                  <Clock size={14} />
                  {reportData.checkOuts.pending} Pending
                </span>
              </div>
            </div>

            <div className="rv-metric-card guests p-5 rounded-xl">
              <div className="rv-metric-header flex items-center gap-2 mb-3">
                <Users size={20} className="text-purple-600" />
                <span className="text-sm font-medium">Current Guests</span>
              </div>
              <div className="rv-metric-value flex items-center gap-2 mb-3">
                <span className="value text-3xl font-bold">{reportData.guestActivity.currentGuests}</span>
              </div>
              <div className="rv-metric-stats flex flex-wrap gap-3">
                <span className="stat vip text-xs font-medium text-amber-600">
                  {reportData.guestActivity.vipGuests} VIP
                </span>
                <span className="stat new text-xs font-medium text-green-600">
                  +{reportData.guestActivity.newArrivals} New
                </span>
              </div>
            </div>
          </div>

          <div className="rv-content-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Room Status Chart */}
            <div className="rv-card rounded-xl p-5">
              <div className="rv-card-header flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Room Status Distribution</h3>
                <PieChart size={18} className="text-slate-400" />
              </div>
              <div className="rv-room-distribution flex items-center gap-6">
                <div className="rv-donut-chart w-32 h-32 shrink-0">
                  <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="12" className="rv-donut-bg" />
                    <circle
                      cx="50" cy="50" r="40"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="12"
                      strokeDasharray={`${reportData.occupancy.rooms.occupied * 2.51} 251`}
                      strokeDashoffset="0"
                      transform="rotate(-90 50 50)"
                    />
                    <circle
                      cx="50" cy="50" r="40"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="12"
                      strokeDasharray={`${reportData.occupancy.rooms.reserved * 2.51} 251`}
                      strokeDashoffset={`-${reportData.occupancy.rooms.occupied * 2.51}`}
                      transform="rotate(-90 50 50)"
                    />
                    <circle
                      cx="50" cy="50" r="40"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="12"
                      strokeDasharray={`${reportData.occupancy.rooms.maintenance * 2.51} 251`}
                      strokeDashoffset={`-${(reportData.occupancy.rooms.occupied + reportData.occupancy.rooms.reserved) * 2.51}`}
                      transform="rotate(-90 50 50)"
                    />
                    <text x="50" y="46" textAnchor="middle" className="rv-donut-value text-lg font-bold" fill="currentColor">
                      {reportData.occupancy.rooms.occupied + reportData.occupancy.rooms.available + reportData.occupancy.rooms.maintenance}
                    </text>
                    <text x="50" y="58" textAnchor="middle" className="rv-donut-label text-xs" fill="currentColor">
                      Rooms
                    </text>
                  </svg>
                </div>
                <div className="rv-distribution-legend flex flex-col gap-2 flex-1">
                  <div className="rv-legend-item flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="dot occupied w-3 h-3 rounded-full bg-green-500"></span><span className="label text-sm">Occupied</span></span>
                    <span className="value text-sm font-semibold">{reportData.occupancy.rooms.occupied}</span>
                  </div>
                  <div className="rv-legend-item flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="dot available w-3 h-3 rounded-full bg-slate-300"></span><span className="label text-sm">Available</span></span>
                    <span className="value text-sm font-semibold">{reportData.occupancy.rooms.available}</span>
                  </div>
                  <div className="rv-legend-item flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="dot reserved w-3 h-3 rounded-full bg-blue-500"></span><span className="label text-sm">Reserved</span></span>
                    <span className="value text-sm font-semibold">{reportData.occupancy.rooms.reserved}</span>
                  </div>
                  <div className="rv-legend-item flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="dot maintenance w-3 h-3 rounded-full bg-amber-500"></span><span className="label text-sm">Maintenance</span></span>
                    <span className="value text-sm font-semibold">{reportData.occupancy.rooms.maintenance}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Room Type Breakdown */}
            <div className="rv-card rounded-xl p-5">
              <div className="rv-card-header flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Occupancy by Room Type</h3>
                <BarChart3 size={18} className="text-slate-400" />
              </div>
              <div className="rv-room-types flex flex-col gap-4">
                {reportData.roomStatus.map((room, idx) => (
                  <div key={idx} className="rv-room-type-item flex items-center gap-3">
                    <div className="rv-room-type-info flex justify-between w-24">
                      <span className="name text-sm font-medium">{room.type}</span>
                      <span className="count text-xs text-slate-500">{room.occupied}/{room.total}</span>
                    </div>
                    <div className="rv-room-type-bar flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="rv-type-bar-fill h-full rounded-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${(room.occupied / room.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="rv-room-type-percent text-sm font-semibold w-12 text-right">
                      {Math.round((room.occupied / room.total) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rv-card activity-card rounded-xl p-5">
              <div className="rv-card-header flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Recent Activity</h3>
                <Clock size={18} className="text-slate-400" />
              </div>
              <div className="rv-activity-list flex flex-col gap-3">
                {reportData.recentActivity.map(activity => (
                  <div key={activity.id} className="rv-activity-item flex items-center gap-3">
                    <div className={`rv-activity-icon ${getActivityColor(activity.type)} w-9 h-9 rounded-lg flex items-center justify-center`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="rv-activity-content flex-1 flex items-center justify-between">
                      <span className="rv-activity-text text-sm">
                        {activity.guest && activity.type === 'check-in' && `${activity.guest} checked into Room ${activity.room}`}
                        {activity.guest && activity.type === 'check-out' && `${activity.guest} checked out of Room ${activity.room}`}
                        {activity.guest && activity.type === 'housekeeping' && `Room ${activity.room} - ${activity.status}`}
                        {activity.guest && activity.type === 'maintenance' && `Room ${activity.room} - Maintenance ${activity.status}`}
                        {!activity.guest && activity.description && (
                          <span dangerouslySetInnerHTML={{ __html: activity.description }} />
                        )}
                        {!activity.guest && !activity.description && `${activity.type} activity`}
                      </span>
                      <span className="rv-activity-time text-xs text-slate-500">{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Housekeeping Summary */}
            <div className="rv-card rounded-xl p-5">
              <div className="rv-card-header flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Housekeeping Status</h3>
                <Sparkles size={18} className="text-slate-400" />
              </div>
              <div className="rv-housekeeping-summary grid grid-cols-2 gap-4">
                <div className="rv-hk-stat clean p-4 rounded-xl text-center">
                  <span className="value text-2xl font-bold block text-green-600">{reportData.housekeeping.clean}</span>
                  <span className="label text-xs text-slate-500">Clean</span>
                </div>
                <div className="rv-hk-stat dirty p-4 rounded-xl text-center">
                  <span className="value text-2xl font-bold block text-red-600">{reportData.housekeeping.dirty}</span>
                  <span className="label text-xs text-slate-500">Dirty</span>
                </div>
                <div className="rv-hk-stat in-progress p-4 rounded-xl text-center">
                  <span className="value text-2xl font-bold block text-amber-600">{reportData.housekeeping.inProgress}</span>
                  <span className="label text-xs text-slate-500">In Progress</span>
                </div>
                <div className="rv-hk-stat inspected p-4 rounded-xl text-center">
                  <span className="value text-2xl font-bold block text-indigo-600">{reportData.housekeeping.inspected}</span>
                  <span className="label text-xs text-slate-500">Inspected</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Occupancy Report */}
      {!isLoading && selectedReport === 'occupancy' && (
        <div className="rv-detail-report rounded-xl p-6">
          <div className="rv-detail-header flex items-center gap-3 mb-6">
            <Bed size={24} className="text-indigo-600" />
            <h2 className="text-xl font-bold">Occupancy Report</h2>
          </div>
          <div className="rv-detail-content">
            <div className="rv-big-stat text-center mb-8 p-6 rounded-xl">
              <span className="label text-sm text-slate-500 block mb-2">Current Occupancy</span>
              <span className="value text-5xl font-bold block mb-2">{reportData.occupancy.current}%</span>
              <span className={`change flex items-center justify-center gap-1 text-sm font-medium ${reportData.occupancy.trend}`}>
                {getTrendIcon(reportData.occupancy.trend)}
                {Math.abs(reportData.occupancy.current - reportData.occupancy.previous)}% vs yesterday
              </span>
            </div>
            <div className="rv-stat-grid grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rv-stat-box p-4 rounded-xl text-center">
                <span className="label text-xs text-slate-500 block mb-1">Occupied Rooms</span>
                <span className="value text-2xl font-bold">{reportData.occupancy.rooms.occupied}</span>
              </div>
              <div className="rv-stat-box p-4 rounded-xl text-center">
                <span className="label text-xs text-slate-500 block mb-1">Available Rooms</span>
                <span className="value text-2xl font-bold">{reportData.occupancy.rooms.available}</span>
              </div>
              <div className="rv-stat-box p-4 rounded-xl text-center">
                <span className="label text-xs text-slate-500 block mb-1">Reserved Today</span>
                <span className="value text-2xl font-bold">{reportData.occupancy.rooms.reserved}</span>
              </div>
              <div className="rv-stat-box p-4 rounded-xl text-center">
                <span className="label text-xs text-slate-500 block mb-1">Under Maintenance</span>
                <span className="value text-2xl font-bold">{reportData.occupancy.rooms.maintenance}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operations Report */}
      {!isLoading && selectedReport === 'operations' && (
        <div className="rv-detail-report rounded-xl p-6">
          <div className="rv-detail-header flex items-center gap-3 mb-6">
            <Clock size={24} className="text-blue-600" />
            <h2 className="text-xl font-bold">Operations Report</h2>
          </div>
          <div className="rv-operations-grid grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rv-ops-section p-5 rounded-xl">
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4"><LogIn size={18} className="text-green-600" /> Check-ins</h3>
              <div className="rv-ops-stats grid grid-cols-2 gap-3">
                <div className="rv-ops-stat p-3 rounded-lg text-center">
                  <span className="value text-xl font-bold block">{reportData.checkIns.today}</span>
                  <span className="label text-xs text-slate-500">Total Expected</span>
                </div>
                <div className="rv-ops-stat success p-3 rounded-lg text-center">
                  <span className="value text-xl font-bold block text-green-600">{reportData.checkIns.completed}</span>
                  <span className="label text-xs text-slate-500">Completed</span>
                </div>
                <div className="rv-ops-stat warning p-3 rounded-lg text-center">
                  <span className="value text-xl font-bold block text-amber-600">{reportData.checkIns.pending}</span>
                  <span className="label text-xs text-slate-500">Pending</span>
                </div>
                <div className="rv-ops-stat danger p-3 rounded-lg text-center">
                  <span className="value text-xl font-bold block text-red-600">{reportData.checkIns.noShow}</span>
                  <span className="label text-xs text-slate-500">No Show</span>
                </div>
              </div>
            </div>
            <div className="rv-ops-section p-5 rounded-xl">
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4"><LogOut size={18} className="text-blue-600" /> Check-outs</h3>
              <div className="rv-ops-stats grid grid-cols-2 gap-3">
                <div className="rv-ops-stat p-3 rounded-lg text-center">
                  <span className="value text-xl font-bold block">{reportData.checkOuts.today}</span>
                  <span className="label text-xs text-slate-500">Total Expected</span>
                </div>
                <div className="rv-ops-stat success p-3 rounded-lg text-center">
                  <span className="value text-xl font-bold block text-green-600">{reportData.checkOuts.completed}</span>
                  <span className="label text-xs text-slate-500">Completed</span>
                </div>
                <div className="rv-ops-stat warning p-3 rounded-lg text-center">
                  <span className="value text-xl font-bold block text-amber-600">{reportData.checkOuts.pending}</span>
                  <span className="label text-xs text-slate-500">Pending</span>
                </div>
                <div className="rv-ops-stat info p-3 rounded-lg text-center">
                  <span className="value text-xl font-bold block text-blue-600">{reportData.checkOuts.lateCheckout}</span>
                  <span className="label text-xs text-slate-500">Late Checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Housekeeping Report */}
      {!isLoading && selectedReport === 'housekeeping' && (
        <div className="rv-detail-report rounded-xl p-6">
          <div className="rv-detail-header flex items-center gap-3 mb-6">
            <Sparkles size={24} className="text-purple-600" />
            <h2 className="text-xl font-bold">Housekeeping Report</h2>
          </div>
          <div className="rv-hk-detail">
            <div className="rv-hk-progress mb-6 p-5 rounded-xl">
              <div className="rv-hk-progress-header flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Cleaning Progress</span>
                <span className="text-sm font-semibold text-indigo-600">{Math.round((reportData.housekeeping.clean / 100) * 100)}% Complete</span>
              </div>
              <div className="rv-hk-progress-bar h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="rv-hk-progress-fill h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${(reportData.housekeeping.clean / 100) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="rv-hk-grid grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rv-hk-card clean flex flex-col items-center gap-2 p-5 rounded-xl text-center">
                <CheckCircle size={24} className="text-green-600" />
                <span className="value text-2xl font-bold">{reportData.housekeeping.clean}</span>
                <span className="label text-xs text-slate-500">Clean Rooms</span>
              </div>
              <div className="rv-hk-card dirty flex flex-col items-center gap-2 p-5 rounded-xl text-center">
                <XCircle size={24} className="text-red-600" />
                <span className="value text-2xl font-bold">{reportData.housekeeping.dirty}</span>
                <span className="label text-xs text-slate-500">Dirty Rooms</span>
              </div>
              <div className="rv-hk-card in-progress flex flex-col items-center gap-2 p-5 rounded-xl text-center">
                <Clock size={24} className="text-amber-600" />
                <span className="value text-2xl font-bold">{reportData.housekeeping.inProgress}</span>
                <span className="label text-xs text-slate-500">In Progress</span>
              </div>
              <div className="rv-hk-card inspected flex flex-col items-center gap-2 p-5 rounded-xl text-center">
                <Sparkles size={24} className="text-indigo-600" />
                <span className="value text-2xl font-bold">{reportData.housekeeping.inspected}</span>
                <span className="label text-xs text-slate-500">Inspected</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsView;
