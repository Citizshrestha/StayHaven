import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import {
  Search,
  ChevronDown,
  LogIn,
  LogOut,
  Clock,
  User,
  Phone,
  Mail,
  CreditCard,
  Key,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Loader2,
  X,
  Printer,
  FileText
} from 'lucide-react';
import './CheckInOutView.css';

// Sample data generator
const generateCheckInOutData = () => {
  const guests = [
    { name: 'Sarah Jenkins', email: 'sarah.j@example.com', phone: '+1 (555) 123-4567' },
    { name: 'Michael Foster', email: 'm.foster@tech.co', phone: '+1 (555) 234-5678' },
    { name: 'Lindsay Walton', email: 'lindsay.w@example.com', phone: '+1 (555) 345-6789' },
    { name: 'Courtney Wilson', email: 'courtney.w@example.com', phone: '+1 (555) 456-7890' },
    { name: 'Tom Cook', email: 'tom.cook@example.com', phone: '+1 (555) 567-8901' },
    { name: 'Emma Davis', email: 'emma.d@example.com', phone: '+1 (555) 678-9012' },
    { name: 'James Brown', email: 'james.b@example.com', phone: '+1 (555) 789-0123' },
    { name: 'Olivia Martinez', email: 'olivia.m@example.com', phone: '+1 (555) 890-1234' },
  ];

  const roomTypes = ['Deluxe King', 'Presidential Suite', 'Standard Twin', 'Standard Queen', 'Executive Suite', 'Ocean View'];

  const arrivals = [];
  const departures = [];

  // Generate today's arrivals
  for (let i = 0; i < 12; i++) {
    const guest = guests[Math.floor(Math.random() * guests.length)];
    const roomType = roomTypes[Math.floor(Math.random() * roomTypes.length)];
    const hour = 10 + Math.floor(Math.random() * 10);
    const minute = Math.floor(Math.random() * 60);
    const statuses = ['expected', 'arrived', 'checked-in'];
    const status = statuses[Math.floor(Math.random() * 3)];

    arrivals.push({
      id: `ARR-${1000 + i}`,
      bookingId: `#BK-${5050 + i}`,
      guest: {
        ...guest,
        initials: guest.name.split(' ').map(n => n[0]).join('')
      },
      room: {
        type: roomType,
        number: (300 + Math.floor(Math.random() * 100)).toString()
      },
      expectedTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      nights: Math.floor(Math.random() * 5) + 1,
      status: status,
      specialRequests: Math.random() > 0.7 ? 'Early check-in requested' : null,
      paymentStatus: Math.random() > 0.3 ? 'paid' : 'pending'
    });
  }

  // Generate today's departures
  for (let i = 0; i < 8; i++) {
    const guest = guests[Math.floor(Math.random() * guests.length)];
    const roomType = roomTypes[Math.floor(Math.random() * roomTypes.length)];
    const hour = 8 + Math.floor(Math.random() * 4);
    const minute = Math.floor(Math.random() * 60);
    const statuses = ['in-room', 'checking-out', 'checked-out'];
    const status = statuses[Math.floor(Math.random() * 3)];

    departures.push({
      id: `DEP-${2000 + i}`,
      bookingId: `#BK-${4950 + i}`,
      guest: {
        ...guest,
        initials: guest.name.split(' ').map(n => n[0]).join('')
      },
      room: {
        type: roomType,
        number: (200 + Math.floor(Math.random() * 100)).toString()
      },
      checkOutTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      stayDuration: Math.floor(Math.random() * 7) + 1,
      status: status,
      balance: status === 'checked-out' ? 0 : Math.floor(Math.random() * 500),
      minibarCharges: Math.floor(Math.random() * 100)
    });
  }

  return { arrivals, departures };
};

const CheckInOutView = () => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('arrivals');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({ arrivals: [], departures: [] });
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setData(generateCheckInOutData());
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.cio-filter-dropdown')) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const currentData = activeTab === 'arrivals' ? data.arrivals : data.departures;

  const filteredData = useMemo(() => {
    return currentData.filter(item => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches =
          item.guest.name.toLowerCase().includes(query) ||
          item.bookingId.toLowerCase().includes(query) ||
          item.room.number.includes(query);
        if (!matches) return false;
      }

      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [currentData, searchQuery, statusFilter]);

  const getStatusOptions = () => {
    if (activeTab === 'arrivals') {
      return [
        { value: 'all', label: 'All Status' },
        { value: 'expected', label: 'Expected' },
        { value: 'arrived', label: 'Arrived' },
        { value: 'checked-in', label: 'Checked In' }
      ];
    }
    return [
      { value: 'all', label: 'All Status' },
      { value: 'in-room', label: 'In Room' },
      { value: 'checking-out', label: 'Checking Out' },
      { value: 'checked-out', label: 'Checked Out' }
    ];
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'expected': { class: 'cio-status-expected', icon: Clock, label: 'Expected' },
      'arrived': { class: 'cio-status-arrived', icon: LogIn, label: 'Arrived' },
      'checked-in': { class: 'cio-status-checked-in', icon: CheckCircle, label: 'Checked In' },
      'in-room': { class: 'cio-status-in-room', icon: Key, label: 'In Room' },
      'checking-out': { class: 'cio-status-checking-out', icon: Clock, label: 'Checking Out' },
      'checked-out': { class: 'cio-status-checked-out', icon: LogOut, label: 'Checked Out' }
    };

    const config = statusConfig[status] || { class: 'cio-status-default', icon: AlertCircle, label: status };
    const Icon = config.icon;

    return (
      <span className={`cio-status-badge ${config.class}`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  const handleAction = (item, type) => {
    setSelectedGuest(item);
    setActionType(type);
    setShowModal(true);
  };

  const processAction = async () => {
    setProcessingAction(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update the data
    setData(prev => {
      if (activeTab === 'arrivals') {
        return {
          ...prev,
          arrivals: prev.arrivals.map(a =>
            a.id === selectedGuest.id ? { ...a, status: 'checked-in' } : a
          )
        };
      } else {
        return {
          ...prev,
          departures: prev.departures.map(d =>
            d.id === selectedGuest.id ? { ...d, status: 'checked-out', balance: 0 } : d
          )
        };
      }
    });

    setProcessingAction(false);
    setShowModal(false);
    setSelectedGuest(null);
  };

  const stats = useMemo(() => {
    if (activeTab === 'arrivals') {
      return {
        total: data.arrivals.length,
        expected: data.arrivals.filter(a => a.status === 'expected').length,
        arrived: data.arrivals.filter(a => a.status === 'arrived').length,
        checkedIn: data.arrivals.filter(a => a.status === 'checked-in').length
      };
    }
    return {
      total: data.departures.length,
      inRoom: data.departures.filter(d => d.status === 'in-room').length,
      checkingOut: data.departures.filter(d => d.status === 'checking-out').length,
      checkedOut: data.departures.filter(d => d.status === 'checked-out').length
    };
  }, [data, activeTab]);

  return (
    <div className={`checkinout-view ${isDark ? 'dark' : ''}`}>
      {/* Stats Cards */}
      <div className="cio-stats-grid grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {activeTab === 'arrivals' ? (
          <>
            <div className="cio-stat-card flex items-center gap-4 p-4 rounded-xl transition-all duration-200">
              <div className="cio-stat-icon arrivals flex items-center justify-center w-12 h-12 rounded-xl">
                <LogIn size={24} />
              </div>
              <div className="cio-stat-content flex flex-col">
                <span className="cio-stat-value text-2xl font-bold">{stats.total}</span>
                <span className="cio-stat-label text-sm text-slate-500">Total Arrivals</span>
              </div>
            </div>
            <div className="cio-stat-card flex items-center gap-4 p-4 rounded-xl transition-all duration-200">
              <div className="cio-stat-icon expected flex items-center justify-center w-12 h-12 rounded-xl">
                <Clock size={24} />
              </div>
              <div className="cio-stat-content flex flex-col">
                <span className="cio-stat-value text-2xl font-bold">{stats.expected}</span>
                <span className="cio-stat-label text-sm text-slate-500">Expected</span>
              </div>
            </div>
            <div className="cio-stat-card flex items-center gap-4 p-4 rounded-xl transition-all duration-200">
              <div className="cio-stat-icon arrived flex items-center justify-center w-12 h-12 rounded-xl">
                <User size={24} />
              </div>
              <div className="cio-stat-content flex flex-col">
                <span className="cio-stat-value text-2xl font-bold">{stats.arrived}</span>
                <span className="cio-stat-label text-sm text-slate-500">Arrived</span>
              </div>
            </div>
            <div className="cio-stat-card">
              <div className="cio-stat-icon completed">
                <CheckCircle size={24} />
              </div>
              <div className="cio-stat-content">
                <span className="cio-stat-value">{stats.checkedIn}</span>
                <span className="cio-stat-label">Checked In</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="cio-stat-card">
              <div className="cio-stat-icon departures">
                <LogOut size={24} />
              </div>
              <div className="cio-stat-content">
                <span className="cio-stat-value">{stats.total}</span>
                <span className="cio-stat-label">Total Departures</span>
              </div>
            </div>
            <div className="cio-stat-card">
              <div className="cio-stat-icon in-room">
                <Key size={24} />
              </div>
              <div className="cio-stat-content">
                <span className="cio-stat-value">{stats.inRoom}</span>
                <span className="cio-stat-label">In Room</span>
              </div>
            </div>
            <div className="cio-stat-card">
              <div className="cio-stat-icon checking-out">
                <Clock size={24} />
              </div>
              <div className="cio-stat-content">
                <span className="cio-stat-value">{stats.checkingOut}</span>
                <span className="cio-stat-label">Checking Out</span>
              </div>
            </div>
            <div className="cio-stat-card">
              <div className="cio-stat-icon completed">
                <CheckCircle size={24} />
              </div>
              <div className="cio-stat-content">
                <span className="cio-stat-value">{stats.checkedOut}</span>
                <span className="cio-stat-label">Checked Out</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="cio-tabs flex gap-2 mb-6">
        <button
          className={`cio-tab flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'arrivals' ? 'active' : ''}`}
          onClick={() => { setActiveTab('arrivals'); setStatusFilter('all'); }}
        >
          <LogIn size={18} />
          Today's Arrivals
          <span className="cio-tab-count px-2 py-0.5 rounded-full text-xs font-semibold">{data.arrivals.length}</span>
        </button>
        <button
          className={`cio-tab flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'departures' ? 'active' : ''}`}
          onClick={() => { setActiveTab('departures'); setStatusFilter('all'); }}
        >
          <LogOut size={18} />
          Today's Departures
          <span className="cio-tab-count px-2 py-0.5 rounded-full text-xs font-semibold">{data.departures.length}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="cio-filter-bar flex items-center gap-4 mb-6 flex-wrap">
        <div className="cio-search-wrapper relative flex-1 min-w-[280px]">
          <Search className="cio-search-icon absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
          <input
            type="text"
            className="cio-search-input w-full py-3 pl-11 pr-4 rounded-xl text-sm transition-all duration-200"
            placeholder="Search by name, booking ID, room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="cio-filter-dropdown relative">
          <button
            className="cio-filter-btn flex items-center gap-2 px-4 py-3 rounded-xl text-sm cursor-pointer transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setShowStatusDropdown(!showStatusDropdown);
            }}
          >
            <span>{getStatusOptions().find(o => o.value === statusFilter)?.label}</span>
            <ChevronDown size={16} className="text-slate-500" />
          </button>
          {showStatusDropdown && (
            <div className="cio-dropdown-menu absolute top-full left-0 mt-2 min-w-[180px] rounded-xl shadow-lg z-50 overflow-hidden">
              {getStatusOptions().map(option => (
                <button
                  key={option.value}
                  className={`cio-dropdown-item block w-full px-4 py-3 text-left text-sm transition-all duration-150 ${statusFilter === option.value ? 'active' : ''}`}
                  onClick={() => { setStatusFilter(option.value); setShowStatusDropdown(false); }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="cio-loading flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="cio-loading-spinner text-blue-500" size={32} />
          <p className="text-sm text-slate-500 m-0">Loading {activeTab}...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredData.length === 0 && (
        <div className="cio-empty-state flex flex-col items-center justify-center py-20 text-center">
          {activeTab === 'arrivals' ? <LogIn size={48} className="mb-5 opacity-50 text-slate-400" /> : <LogOut size={48} className="mb-5 opacity-50 text-slate-400" />}
          <h3 className="text-lg font-semibold mb-2">No {activeTab} found</h3>
          <p className="text-sm text-slate-500 max-w-md">There are no {activeTab} matching your criteria.</p>
        </div>
      )}

      {/* Cards Grid */}
      {!isLoading && filteredData.length > 0 && (
        <div className="cio-cards-grid grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {filteredData.map(item => (
            <div key={item.id} className="cio-card rounded-xl p-5 transition-all duration-200 hover:shadow-lg">
              <div className="cio-card-header flex items-center gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div className="cio-guest-avatar w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {item.guest.initials}
                </div>
                <div className="cio-guest-info flex flex-col flex-1">
                  <span className="cio-guest-name font-semibold">{item.guest.name}</span>
                  <span className="cio-booking-id text-sm text-slate-500">{item.bookingId}</span>
                </div>
                {getStatusBadge(item.status)}
              </div>

              <div className="cio-card-body flex flex-col gap-3 mb-4">
                <div className="cio-info-row flex justify-between items-center">
                  <span className="cio-info-label text-sm text-slate-500">Room</span>
                  <span className="cio-info-value text-sm font-medium">{item.room.type} - {item.room.number}</span>
                </div>
                <div className="cio-info-row flex justify-between items-center">
                  <span className="cio-info-label text-sm text-slate-500">
                    {activeTab === 'arrivals' ? 'Expected Time' : 'Check-out Time'}
                  </span>
                  <span className="cio-info-value text-sm font-medium">
                    {activeTab === 'arrivals' ? item.expectedTime : item.checkOutTime}
                  </span>
                </div>
                <div className="cio-info-row flex justify-between items-center">
                  <span className="cio-info-label text-sm text-slate-500">
                    {activeTab === 'arrivals' ? 'Duration' : 'Stay Duration'}
                  </span>
                  <span className="cio-info-value text-sm font-medium">
                    {activeTab === 'arrivals' ? item.nights : item.stayDuration} nights
                  </span>
                </div>
                {activeTab === 'departures' && item.balance > 0 && (
                  <div className="cio-info-row cio-balance-warning">
                    <span className="cio-info-label">Outstanding Balance</span>
                    <span className="cio-info-value cio-balance">Rs {item.balance.toLocaleString()}</span>
                  </div>
                )}
                {item.specialRequests && (
                  <div className="cio-special-request">
                    <AlertCircle size={14} />
                    {item.specialRequests}
                  </div>
                )}
              </div>

              <div className="cio-card-footer flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="cio-contact-icons flex gap-2">
                  <a
                    href={`tel:${item.guest.phone.replace(/[^+\d]/g, '')}`}
                    className="cio-contact-btn w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                    title={`Call ${item.guest.phone}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone size={16} />
                  </a>
                  <a
                    href={`mailto:${item.guest.email}`}
                    className="cio-contact-btn w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                    title={`Email ${item.guest.email}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Mail size={16} />
                  </a>
                </div>
                {activeTab === 'arrivals' && item.status !== 'checked-in' && (
                  <button
                    className="cio-action-btn cio-checkin-btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    onClick={() => handleAction(item, 'checkin')}
                  >
                    <LogIn size={16} />
                    Check In
                  </button>
                )}
                {activeTab === 'departures' && item.status !== 'checked-out' && (
                  <button
                    className="cio-action-btn cio-checkout-btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                    onClick={() => handleAction(item, 'checkout')}
                  >
                    <LogOut size={16} />
                    Check Out
                  </button>
                )}
                {((activeTab === 'arrivals' && item.status === 'checked-in') ||
                  (activeTab === 'departures' && item.status === 'checked-out')) && (
                    <span className="cio-completed-badge flex items-center gap-1.5 text-sm font-medium text-green-600">
                      <CheckCircle size={16} />
                      Completed
                    </span>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Check-In/Check-Out Modal */}
      {showModal && selectedGuest && (
        <div className="cio-modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !processingAction && setShowModal(false)}>
          <div className="cio-modal w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button
              className="cio-modal-close absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
              onClick={() => !processingAction && setShowModal(false)}
              disabled={processingAction}
            >
              <X size={20} />
            </button>

            <div className="cio-modal-header text-center mb-6">
              <div className={`cio-modal-icon ${actionType} w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center`}>
                {actionType === 'checkin' ? <LogIn size={28} /> : <LogOut size={28} />}
              </div>
              <h2 className="text-xl font-bold mb-1">{actionType === 'checkin' ? 'Guest Check-In' : 'Guest Check-Out'}</h2>
              <p className="text-sm text-slate-500">{selectedGuest.bookingId}</p>
            </div>

            <div className="cio-modal-body mb-6">
              <div className="cio-modal-guest flex items-center gap-4 p-4 rounded-xl mb-5">
                <div className="cio-modal-avatar w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold">
                  {selectedGuest.guest.initials}
                </div>
                <div className="cio-modal-guest-info flex flex-col">
                  <span className="cio-modal-guest-name font-semibold">{selectedGuest.guest.name}</span>
                  <span className="cio-modal-guest-email text-sm text-slate-500">{selectedGuest.guest.email}</span>
                </div>
              </div>

              <div className="cio-modal-details flex flex-col gap-3">
                <div className="cio-modal-detail flex items-center gap-3 p-3 rounded-lg">
                  <Key size={18} className="text-slate-500 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="label text-xs text-slate-500">Room</span>
                    <span className="value text-sm font-medium">{selectedGuest.room.type} - Room {selectedGuest.room.number}</span>
                  </div>
                </div>
                <div className="cio-modal-detail flex items-center gap-3 p-3 rounded-lg">
                  <Calendar size={18} className="text-slate-500 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="label text-xs text-slate-500">Duration</span>
                    <span className="value text-sm font-medium">
                      {activeTab === 'arrivals' ? selectedGuest.nights : selectedGuest.stayDuration} nights
                    </span>
                  </div>
                </div>
                {actionType === 'checkout' && (
                  <>
                    <div className="cio-modal-detail flex items-center gap-3 p-3 rounded-lg">
                      <CreditCard size={18} className="text-slate-500 flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="label text-xs text-slate-500">Outstanding Balance</span>
                        <span className={`value text-sm font-medium ${selectedGuest.balance > 0 ? 'warning text-amber-600' : 'success text-green-600'}`}>
                          {selectedGuest.balance > 0 ? `Rs ${selectedGuest.balance.toLocaleString()}` : 'Settled'}
                        </span>
                      </div>
                    </div>
                    {selectedGuest.minibarCharges > 0 && (
                      <div className="cio-modal-detail flex items-center gap-3 p-3 rounded-lg">
                        <FileText size={18} className="text-slate-500 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="label text-xs text-slate-500">Minibar Charges</span>
                          <span className="value text-sm font-medium">Rs {selectedGuest.minibarCharges.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {actionType === 'checkin' && (
                <div className="cio-checkin-checklist mt-5 p-4 rounded-xl">
                  <h4 className="text-sm font-semibold mb-3">Check-In Checklist</h4>
                  <label className="cio-checkbox flex items-center gap-3 py-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                    <span className="text-sm">ID Verification Complete</span>
                  </label>
                  <label className="cio-checkbox flex items-center gap-3 py-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                    <span className="text-sm">Payment Confirmed</span>
                  </label>
                  <label className="cio-checkbox flex items-center gap-3 py-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded" />
                    <span className="text-sm">Room Key Issued</span>
                  </label>
                  <label className="cio-checkbox flex items-center gap-3 py-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded" />
                    <span className="text-sm">Welcome Package Provided</span>
                  </label>
                </div>
              )}
            </div>

            <div className="cio-modal-footer flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                className="cio-modal-btn secondary px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                onClick={() => setShowModal(false)}
                disabled={processingAction}
              >
                Cancel
              </button>
              {actionType === 'checkout' && (
                <button className="cio-modal-btn outline flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200" disabled={processingAction}>
                  <Printer size={16} />
                  Print Invoice
                </button>
              )}
              <button
                className={`cio-modal-btn primary ${actionType} flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200`}
                onClick={processAction}
                disabled={processingAction}
              >
                {processingAction ? (
                  <>
                    <Loader2 className="cio-btn-spinner animate-spin" size={16} />
                    Processing...
                  </>
                ) : (
                  <>
                    {actionType === 'checkin' ? <LogIn size={16} /> : <LogOut size={16} />}
                    Confirm {actionType === 'checkin' ? 'Check-In' : 'Check-Out'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckInOutView;
