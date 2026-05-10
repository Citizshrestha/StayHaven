import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../../hooks/useTheme';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  Crown,
  Eye,
  MessageSquare,
  Loader2,
  X,
  CreditCard,
  Clock,
  Award,
  Gift,
  UserX,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Ban
} from 'lucide-react';
import { toast } from 'react-toastify';
import './GuestsView.css';
import * as receptionApi from '../../../../core/api/services/reception.service';

const DUMMY_UNSPLASH_AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', // Man with glasses
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', // Woman with curly hair
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80', // Man in suit
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', // Woman with straight hair
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80', // Man in casual
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80', // Woman blonde
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', // Man beard
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', // Woman brunette
  'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?auto=format&fit=crop&w=200&q=80', // Man young
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80'  // Woman professional
];

const getGuestAvatarUrl = (guest) => {
  if (guest.avatarUrl) return guest.avatarUrl;

  // Use guest ID or email to get consistent image assignment
  const identifier = guest._id || guest.email || guest.fullName;
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % DUMMY_UNSPLASH_AVATARS.length;
  return DUMMY_UNSPLASH_AVATARS[index];
};

const GuestAvatar = ({ guest, className = '', modal = false }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarUrl = getGuestAvatarUrl(guest);

  return (
    <div className={className}>
      {!imageFailed ? (
        <img
          src={avatarUrl}
          alt={guest.fullName}
          className={`gv-avatar-image ${modal ? 'gv-avatar-image-modal' : 'gv-avatar-image-table'}`}
          onError={() => setImageFailed(true)}
          loading="lazy"
        />
      ) : (
        guest.initials
      )}
      {guest.vipStatus && (
        <span className={modal ? 'gv-vip-crown absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center bg-amber-400' : 'gv-vip-badge absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center bg-amber-400'}>
          <Crown size={modal ? 16 : 10} className="text-white" />
        </span>
      )}
    </div>
  );
};

const GuestsView = ({ onMessageGuest }) => {
  const { isDark } = useTheme();
  const [guests, setGuests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showTierDropdown, setShowTierDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [blacklistModal, setBlacklistModal] = useState({ open: false, guest: null });
  const [blacklistReason, setBlacklistReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [loadError, setLoadError] = useState('');

  const loadGuests = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await receptionApi.getGuestsList({ limit: 200 });
      if (res?.success && res.data) {
        const mapped = res.data.map(g => ({
          id: g.guestId || g._id,
          _id: g._id,
          firstName: g.fullName?.split(' ')[0] || '',
          lastName: g.fullName?.split(' ').slice(1).join(' ') || '',
          fullName: g.fullName || '',
          initials: (g.fullName || 'U').split(' ').map(n => n[0]).join(''),
          email: g.email || '',
          phone: g.phone || '',
          country: g.country || '',
          membershipTier: g.membershipTier || 'Bronze',
          loyaltyPoints: g.loyaltyPoints || 0,
          totalStays: g.totalStays || 0,
          totalSpent: g.totalSpent || 0,
          avatarUrl: g.avatarUrl || null,
          lastVisit: g.lastVisit || g.updatedAt || new Date().toISOString(),
          isCurrentGuest: g.status === 'In-House',
          isActive: g.isActive !== false,
          blacklisted: g.blacklisted || false,
          blacklistReason: g.blacklistReason || '',
          currentRoom: g.currentRoom || null,
          checkInDate: g.checkInDate || null,
          checkOutDate: g.checkOutDate || null,
          preferences: g.preferences || {
            roomType: 'Standard', bedType: 'Queen', smoking: false, floor: 'Low', specialRequests: null
          },
          vipStatus: g.vipStatus || false,
        }));
        setGuests(mapped.sort((a, b) => {
          if (a.isCurrentGuest && !b.isCurrentGuest) return -1;
          if (!a.isCurrentGuest && b.isCurrentGuest) return 1;
          return 0;
        }));
      } else {
        setLoadError('Unable to load guests. Please try again.');
      }
    } catch {
      setLoadError('Unable to load guests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGuests();
  }, []);

  const reloadGuests = async () => {
    try {
      const res = await receptionApi.getGuestsList({ limit: 200 });
      if (res?.success && res.data) {
        const mapped = res.data.map(g => ({
          id: g.guestId || g._id,
          _id: g._id,
          firstName: g.fullName?.split(' ')[0] || '',
          lastName: g.fullName?.split(' ').slice(1).join(' ') || '',
          fullName: g.fullName || '',
          initials: (g.fullName || 'U').split(' ').map(n => n[0]).join(''),
          email: g.email || '',
          phone: g.phone || '',
          country: g.country || '',
          membershipTier: g.membershipTier || 'Bronze',
          loyaltyPoints: g.loyaltyPoints || 0,
          totalStays: g.totalStays || 0,
          totalSpent: g.totalSpent || 0,
          avatarUrl: g.avatarUrl || null,
          lastVisit: g.lastVisit || g.updatedAt || new Date().toISOString(),
          isCurrentGuest: g.status === 'In-House',
          isActive: g.isActive !== false,
          blacklisted: g.blacklisted || false,
          blacklistReason: g.blacklistReason || '',
          currentRoom: g.currentRoom || null,
          checkInDate: g.checkInDate || null,
          checkOutDate: g.checkOutDate || null,
          preferences: g.preferences || {
            roomType: 'Standard', bedType: 'Queen', smoking: false, floor: 'Low', specialRequests: null
          },
          vipStatus: g.vipStatus || false,
        }));
        setGuests(mapped.sort((a, b) => {
          if (a.isCurrentGuest && !b.isCurrentGuest) return -1;
          if (!a.isCurrentGuest && b.isCurrentGuest) return 1;
          return 0;
        }));
      }
    } catch {
      /* silently ignore */
    }
  };

  const handleToggleActive = async (guest) => {
    const newStatus = !(guest.isActive !== false);
    setActionLoading(guest._id + '-status');
    try {
      await receptionApi.updateGuestStatus(guest._id, newStatus);
      await reloadGuests();
    } catch (err) {
      toast.error('Failed to update guest status: ' + (err.response?.data?.message || err.message), {
        position: 'top-right',
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: isDark ? 'dark' : 'light',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenBlacklistModal = (guest) => {
    setBlacklistReason(guest.blacklistReason || '');
    setBlacklistModal({ open: true, guest });
  };

  const handleToggleBlacklist = async () => {
    const guest = blacklistModal.guest;
    if (!guest) return;
    const newBlacklisted = !guest.blacklisted;
    setActionLoading(guest._id + '-blacklist');
    try {
      await receptionApi.flagGuestBlacklist(guest._id, newBlacklisted, blacklistReason);
      setBlacklistModal({ open: false, guest: null });
      setBlacklistReason('');
      await reloadGuests();
    } catch (err) {
      toast.error('Failed to update blacklist: ' + (err.response?.data?.message || err.message), {
        position: 'top-right',
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: isDark ? 'dark' : 'light',
      });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.gv-filter-dropdown')) {
        setShowStatusDropdown(false);
        setShowTierDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const filteredGuests = useMemo(() => {
    return guests.filter(guest => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!guest.fullName.toLowerCase().includes(query) &&
          !guest.email.toLowerCase().includes(query) &&
          !guest.phone.includes(query) &&
          !guest.id.toLowerCase().includes(query)) {
          return false;
        }
      }

      if (statusFilter === 'current' && !guest.isCurrentGuest) return false;
      if (statusFilter === 'past' && guest.isCurrentGuest) return false;
      if (statusFilter === 'vip' && !guest.vipStatus) return false;

      if (tierFilter !== 'all' && guest.membershipTier.toLowerCase() !== tierFilter) return false;

      return true;
    });
  }, [guests, searchQuery, statusFilter, tierFilter]);

  const stats = useMemo(() => ({
    total: guests.length,
    current: guests.filter(g => g.isCurrentGuest).length,
    vip: guests.filter(g => g.vipStatus).length,
    newThisMonth: Math.floor(guests.length * 0.15)
  }), [guests]);

  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);
  const paginatedGuests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGuests.slice(start, start + itemsPerPage);
  }, [filteredGuests, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, tierFilter]);

  const getTierColor = (tier) => {
    const colors = {
      'Bronze': { bg: '#fef3c7', color: '#92400e', dark: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' } },
      'Silver': { bg: '#f1f5f9', color: '#475569', dark: { bg: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8' } },
      'Gold': { bg: '#fef3c7', color: '#b45309', dark: { bg: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' } },
      'Platinum': { bg: '#e0e7ff', color: '#4338ca', dark: { bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' } },
      'Diamond': { bg: '#f0fdf4', color: '#166534', dark: { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' } }
    };
    return colors[tier] || colors['Bronze'];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    return `Rs ${amount.toLocaleString()}`;
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={`guests-view ${isDark ? 'dark' : ''}`}>
      {/* Error Banner */}
      {!!loadError && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{loadError}</span>
          <button
            onClick={loadGuests}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#991b1b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="gv-stats-grid grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="gv-stat-card flex items-center gap-4 p-4 rounded-xl transition-all duration-200">
          <div className="gv-stat-icon total w-12 h-12 rounded-xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div className="gv-stat-content flex flex-col">
            <span className="gv-stat-value text-2xl font-bold">{stats.total}</span>
            <span className="gv-stat-label text-xs text-slate-500">Total Guests</span>
          </div>
        </div>
        <div className="gv-stat-card flex items-center gap-4 p-4 rounded-xl transition-all duration-200">
          <div className="gv-stat-icon current w-12 h-12 rounded-xl flex items-center justify-center">
            <User size={24} />
          </div>
          <div className="gv-stat-content flex flex-col">
            <span className="gv-stat-value text-2xl font-bold">{stats.current}</span>
            <span className="gv-stat-label text-xs text-slate-500">Currently Staying</span>
          </div>
        </div>
        <div className="gv-stat-card flex items-center gap-4 p-4 rounded-xl transition-all duration-200">
          <div className="gv-stat-icon vip w-12 h-12 rounded-xl flex items-center justify-center">
            <Crown size={24} />
          </div>
          <div className="gv-stat-content flex flex-col">
            <span className="gv-stat-value text-2xl font-bold">{stats.vip}</span>
            <span className="gv-stat-label text-xs text-slate-500">VIP Guests</span>
          </div>
        </div>
        <div className="gv-stat-card flex items-center gap-4 p-4 rounded-xl transition-all duration-200">
          <div className="gv-stat-icon new w-12 h-12 rounded-xl flex items-center justify-center">
            <Star size={24} />
          </div>
          <div className="gv-stat-content flex flex-col">
            <span className="gv-stat-value text-2xl font-bold">{stats.newThisMonth}</span>
            <span className="gv-stat-label text-xs text-slate-500">New This Month</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="gv-filter-bar flex items-center gap-4 mb-6 flex-wrap">
        <div className="gv-search-wrapper relative flex-1 min-w-[280px]">
          <Search className="gv-search-icon" size={18} />
          <input
            type="text"
            className="gv-search-input w-full h-11 pl-11 pr-4 rounded-xl text-sm"
            placeholder="Search by name, email, phone, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="gv-filter-dropdown relative">
          <button
            className="gv-filter-btn flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-medium transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setShowStatusDropdown(!showStatusDropdown);
              setShowTierDropdown(false);
            }}
          >
            <span>
              {statusFilter === 'all' ? 'All Guests' :
                statusFilter === 'current' ? 'Current Guests' :
                  statusFilter === 'past' ? 'Past Guests' : 'VIP Guests'}
            </span>
            <ChevronDown size={16} />
          </button>
          {showStatusDropdown && (
            <div className="gv-dropdown-menu absolute top-full left-0 mt-2 min-w-[180px] rounded-xl shadow-lg z-50">
              {[
                { value: 'all', label: 'All Guests' },
                { value: 'current', label: 'Current Guests' },
                { value: 'past', label: 'Past Guests' },
                { value: 'vip', label: 'VIP Guests' }
              ].map(option => (
                <button
                  key={option.value}
                  className={`gv-dropdown-item w-full text-left px-4 py-2.5 text-sm transition-colors duration-200 ${statusFilter === option.value ? 'active' : ''}`}
                  onClick={() => { setStatusFilter(option.value); setShowStatusDropdown(false); }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="gv-filter-dropdown relative">
          <button
            className="gv-filter-btn flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-medium transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setShowTierDropdown(!showTierDropdown);
              setShowStatusDropdown(false);
            }}
          >
            <span>{tierFilter === 'all' ? 'All Tiers' : tierFilter.charAt(0).toUpperCase() + tierFilter.slice(1)}</span>
            <ChevronDown size={16} />
          </button>
          {showTierDropdown && (
            <div className="gv-dropdown-menu absolute top-full left-0 mt-2 min-w-[180px] rounded-xl shadow-lg z-50">
              {[
                { value: 'all', label: 'All Tiers' },
                { value: 'diamond', label: 'Diamond' },
                { value: 'platinum', label: 'Platinum' },
                { value: 'gold', label: 'Gold' },
                { value: 'silver', label: 'Silver' },
                { value: 'bronze', label: 'Bronze' }
              ].map(option => (
                <button
                  key={option.value}
                  className={`gv-dropdown-item w-full text-left px-4 py-2.5 text-sm transition-colors duration-200 ${tierFilter === option.value ? 'active' : ''}`}
                  onClick={() => { setTierFilter(option.value); setShowTierDropdown(false); }}
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
        <div className="gv-loading flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="gv-loading-spinner animate-spin text-indigo-600" size={32} />
          <p className="text-sm text-slate-500">Loading guests...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredGuests.length === 0 && (
        <div className="gv-empty-state flex flex-col items-center justify-center py-20 text-center">
          <Users size={48} className="mb-5 opacity-50 text-slate-400" />
          <h3 className="text-lg font-semibold mb-2">No guests found</h3>
          <p className="text-sm text-slate-500 max-w-md">Try adjusting your search or filters.</p>
        </div>
      )}

      {/* Guests Table */}
      {!isLoading && filteredGuests.length > 0 && (
        <div className="gv-table-container rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <table className="gv-table w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 font-semibold">Guest</th>
                <th className="text-left p-4 font-semibold">Contact</th>
                <th className="text-left p-4 font-semibold">Membership</th>
                <th className="text-left p-4 font-semibold">Stays</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedGuests.map(guest => {
                const tierColor = getTierColor(guest.membershipTier);

                return (
                  <tr key={guest.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                    <td className="p-4">
                      <div className="gv-guest-cell flex items-center gap-3">
                        <GuestAvatar
                          guest={guest}
                          className={`gv-guest-avatar relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${guest.vipStatus ? 'vip' : ''}`}
                        />
                        <div className="gv-guest-info flex flex-col">
                          <span className="gv-guest-name font-medium">{guest.fullName}</span>
                          <span className="gv-guest-id text-xs text-slate-500">{guest.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="gv-contact-cell flex flex-col">
                        <span className="gv-email text-sm">{guest.email}</span>
                        <span className="gv-phone text-xs text-slate-500">{guest.phone}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="gv-membership-cell flex flex-col gap-1">
                        <span
                          className="gv-tier-badge px-2.5 py-1 rounded-lg text-xs font-medium w-fit"
                          style={{
                            background: isDark ? tierColor.dark.bg : tierColor.bg,
                            color: isDark ? tierColor.dark.color : tierColor.color
                          }}
                        >
                          {guest.membershipTier}
                        </span>
                        <span className="gv-points text-xs text-slate-500">{guest.loyaltyPoints.toLocaleString()} pts</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="gv-stays-cell flex flex-col">
                        <span className="gv-total-stays text-sm font-medium">{guest.totalStays} stays</span>
                        <span className="gv-total-spent text-xs text-slate-500">{formatCurrency(guest.totalSpent)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {guest.isCurrentGuest ? (
                        <div className="gv-status-current flex flex-col gap-1">
                          <span className="gv-status-badge current px-2.5 py-1 rounded-lg text-xs font-medium w-fit bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">In-House</span>
                          <span className="gv-current-room text-xs text-slate-500">Room {guest.currentRoom}</span>
                        </div>
                      ) : (
                        <div className="gv-status-past flex flex-col gap-1">
                          <span className="gv-status-badge past px-2.5 py-1 rounded-lg text-xs font-medium w-fit bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Past Guest</span>
                          <span className="gv-last-visit text-xs text-slate-500">Last: {formatDate(guest.lastVisit)}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="gv-actions flex items-center gap-2">
                        <button
                          className="gv-action-btn view w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                          onClick={() => setSelectedGuest(guest)}
                          title="View Profile"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="gv-action-btn message w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                          title="Send Message"
                          onClick={() => onMessageGuest && onMessageGuest({ _id: guest._id, fullname: guest.fullName, companyRole: 'guest', email: guest.email, profilePicture: guest.avatarUrl })}
                        >
                          <MessageSquare size={16} />
                        </button>
                        <button
                          className={`gv-action-btn w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${guest.isActive !== false ? 'deactivate' : 'activate'}`}
                          onClick={() => handleToggleActive(guest)}
                          title={guest.isActive !== false ? 'Mark Inactive' : 'Reactivate Guest'}
                          disabled={actionLoading === guest._id + '-status'}
                        >
                          {guest.isActive !== false ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          className={`gv-action-btn w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${guest.blacklisted ? 'blacklisted' : 'flag'}`}
                          onClick={() => handleOpenBlacklistModal(guest)}
                          title={guest.blacklisted ? 'Remove from Blacklist' : 'Flag / Blacklist'}
                          disabled={actionLoading === guest._id + '-blacklist'}
                        >
                          {guest.blacklisted ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && filteredGuests.length > 0 && (
        <div className="gv-pagination flex items-center justify-between mt-6 flex-wrap gap-4">
          <div className="gv-pagination-info text-sm text-slate-500">
            Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredGuests.length)}</span> of{' '}
            <span className="font-medium">{filteredGuests.length}</span> guests
          </div>
          <div className="gv-pagination-controls flex items-center gap-1">
            <button
              className="gv-page-btn w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={18} />
            </button>
            {getPageNumbers().map((page, idx) => (
              page === '...' ? (
                <span key={`ellipsis-${idx}`} className="gv-page-ellipsis px-2 text-slate-400">...</span>
              ) : (
                <button
                  key={page}
                  className={`gv-page-btn w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 text-sm font-medium ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              )
            ))}
            <button
              className="gv-page-btn w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Guest Detail Modal */}
      {selectedGuest && (
        <div className="gv-modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedGuest(null)}>
          <div className="gv-modal w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button className="gv-modal-close absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200" onClick={() => setSelectedGuest(null)}>
              <X size={20} />
            </button>

            <div className="gv-modal-header text-center mb-6">
              <GuestAvatar
                guest={selectedGuest}
                modal
                className={`gv-modal-avatar relative w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-xl font-bold ${selectedGuest.vipStatus ? 'vip' : ''}`}
              />
              <h2 className="text-xl font-bold mb-2">{selectedGuest.fullName}</h2>
              <span
                className="gv-modal-tier px-3 py-1 rounded-lg text-sm font-medium inline-block"
                style={{
                  background: isDark ? getTierColor(selectedGuest.membershipTier).dark.bg : getTierColor(selectedGuest.membershipTier).bg,
                  color: isDark ? getTierColor(selectedGuest.membershipTier).dark.color : getTierColor(selectedGuest.membershipTier).color
                }}
              >
                {selectedGuest.membershipTier} Member
              </span>
            </div>

            <div className="gv-modal-body">
              <div className="gv-modal-section mb-6">
                <h3 className="text-sm font-semibold mb-3">Contact Information</h3>
                <div className="gv-modal-info-grid flex flex-col gap-2">
                  <div className="gv-info-item flex items-center gap-3 p-3 rounded-lg">
                    <Mail size={16} className="text-slate-500 shrink-0" />
                    <span className="text-sm">{selectedGuest.email}</span>
                  </div>
                  <div className="gv-info-item flex items-center gap-3 p-3 rounded-lg">
                    <Phone size={16} className="text-slate-500 shrink-0" />
                    <span className="text-sm">{selectedGuest.phone}</span>
                  </div>
                  <div className="gv-info-item flex items-center gap-3 p-3 rounded-lg">
                    <MapPin size={16} className="text-slate-500 shrink-0" />
                    <span className="text-sm">{selectedGuest.country}</span>
                  </div>
                </div>
              </div>

              {selectedGuest.isCurrentGuest && (
                <div className="gv-modal-section mb-6">
                  <h3 className="text-sm font-semibold mb-3">Current Stay</h3>
                  <div className="gv-current-stay-card grid grid-cols-3 gap-3 p-4 rounded-xl">
                    <div className="gv-stay-detail flex flex-col text-center">
                      <span className="label text-xs text-slate-500">Room</span>
                      <span className="value text-sm font-semibold">{selectedGuest.currentRoom}</span>
                    </div>
                    <div className="gv-stay-detail flex flex-col text-center">
                      <span className="label text-xs text-slate-500">Check-in</span>
                      <span className="value text-sm font-semibold">{formatDate(selectedGuest.checkInDate)}</span>
                    </div>
                    <div className="gv-stay-detail flex flex-col text-center">
                      <span className="label text-xs text-slate-500">Check-out</span>
                      <span className="value text-sm font-semibold">{formatDate(selectedGuest.checkOutDate)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="gv-modal-section mb-6">
                <h3 className="text-sm font-semibold mb-3">Loyalty & Spending</h3>
                <div className="gv-loyalty-stats grid grid-cols-3 gap-3">
                  <div className="gv-loyalty-stat flex flex-col items-center gap-2 p-4 rounded-xl text-center">
                    <Award size={20} className="text-indigo-600" />
                    <div className="flex flex-col">
                      <span className="value text-lg font-bold">{selectedGuest.loyaltyPoints.toLocaleString()}</span>
                      <span className="label text-xs text-slate-500">Points</span>
                    </div>
                  </div>
                  <div className="gv-loyalty-stat flex flex-col items-center gap-2 p-4 rounded-xl text-center">
                    <Calendar size={20} className="text-green-600" />
                    <div className="flex flex-col">
                      <span className="value text-lg font-bold">{selectedGuest.totalStays}</span>
                      <span className="label text-xs text-slate-500">Total Stays</span>
                    </div>
                  </div>
                  <div className="gv-loyalty-stat flex flex-col items-center gap-2 p-4 rounded-xl text-center">
                    <CreditCard size={20} className="text-amber-600" />
                    <div className="flex flex-col">
                      <span className="value text-lg font-bold">{formatCurrency(selectedGuest.totalSpent)}</span>
                      <span className="label text-xs text-slate-500">Total Spent</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gv-modal-section mb-6">
                <h3 className="text-sm font-semibold mb-3">Preferences</h3>
                <div className="gv-preferences-grid grid grid-cols-2 gap-2">
                  <div className="gv-preference flex flex-col p-3 rounded-lg">
                    <span className="label text-xs text-slate-500">Preferred Room</span>
                    <span className="value text-sm font-medium">{selectedGuest.preferences.roomType}</span>
                  </div>
                  <div className="gv-preference flex flex-col p-3 rounded-lg">
                    <span className="label text-xs text-slate-500">Bed Type</span>
                    <span className="value text-sm font-medium">{selectedGuest.preferences.bedType}</span>
                  </div>
                  <div className="gv-preference flex flex-col p-3 rounded-lg">
                    <span className="label text-xs text-slate-500">Floor Preference</span>
                    <span className="value text-sm font-medium">{selectedGuest.preferences.floor} Floor</span>
                  </div>
                  <div className="gv-preference flex flex-col p-3 rounded-lg">
                    <span className="label text-xs text-slate-500">Smoking</span>
                    <span className="value text-sm font-medium">{selectedGuest.preferences.smoking ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                {selectedGuest.preferences.specialRequests && (
                  <div className="gv-special-requests flex items-start gap-3 mt-3 p-4 rounded-xl">
                    <Gift size={16} className="text-slate-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{selectedGuest.preferences.specialRequests}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Guest status badges in modal */}
            {selectedGuest && (selectedGuest.isActive === false || selectedGuest.blacklisted) && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', padding: '12px', borderRadius: '12px', background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', border: '1px solid', borderColor: isDark ? 'rgba(239,68,68,0.2)' : '#fecaca' }}>
                {selectedGuest.isActive === false && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2', color: isDark ? '#fca5a5' : '#dc2626' }}>
                    <UserX size={12} /> Inactive
                  </span>
                )}
                {selectedGuest.blacklisted && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: isDark ? 'rgba(220,38,38,0.2)' : '#fee2e2', color: isDark ? '#f87171' : '#b91c1c' }}>
                    <Ban size={12} /> Blacklisted{selectedGuest.blacklistReason ? `: ${selectedGuest.blacklistReason}` : ''}
                  </span>
                )}
              </div>
            )}

            <div className="gv-modal-footer flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button className="gv-modal-btn secondary px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200" onClick={() => setSelectedGuest(null)}>
                Close
              </button>
              <button
                className="gv-modal-btn primary flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                onClick={() => {
                  setSelectedGuest(null);
                  onMessageGuest && onMessageGuest({ _id: selectedGuest._id, fullname: selectedGuest.fullName, companyRole: 'guest', email: selectedGuest.email, profilePicture: selectedGuest.avatarUrl });
                }}
              >
                <MessageSquare size={16} />
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist Reason Modal */}
      {blacklistModal.open && blacklistModal.guest && (
        <div className="gv-modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setBlacklistModal({ open: false, guest: null })}>
          <div className="gv-modal w-full max-w-md rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <button className="gv-modal-close absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200" onClick={() => setBlacklistModal({ open: false, guest: null })}>
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', background: blacklistModal.guest.blacklisted ? (isDark ? 'rgba(34,197,94,0.15)' : '#f0fdf4') : (isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2') }}>
                {blacklistModal.guest.blacklisted ? <ShieldCheck size={28} style={{ color: '#10b981' }} /> : <ShieldAlert size={28} style={{ color: '#ef4444' }} />}
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                {blacklistModal.guest.blacklisted ? 'Remove from Blacklist' : 'Flag Guest on Blacklist'}
              </h2>
              <p style={{ fontSize: '14px', opacity: 0.7 }}>
                {blacklistModal.guest.blacklisted
                  ? `Remove ${blacklistModal.guest.fullName} from the blacklist?`
                  : `Flag ${blacklistModal.guest.fullName} on the blacklist? This preserves all records.`
                }
              </p>
            </div>

            {!blacklistModal.guest.blacklisted && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Reason (required)</label>
                <textarea
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  placeholder="Describe the reason for blacklisting this guest..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', fontSize: '14px', resize: 'vertical', color: 'inherit', fontFamily: 'inherit' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="gv-modal-btn secondary px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                onClick={() => setBlacklistModal({ open: false, guest: null })}
              >
                Cancel
              </button>
              <button
                onClick={handleToggleBlacklist}
                disabled={!blacklistModal.guest.blacklisted && !blacklistReason.trim()}
                style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: !blacklistModal.guest.blacklisted && !blacklistReason.trim() ? 'not-allowed' : 'pointer', opacity: !blacklistModal.guest.blacklisted && !blacklistReason.trim() ? 0.5 : 1, background: blacklistModal.guest.blacklisted ? '#10b981' : '#ef4444', color: '#fff' }}
              >
                {blacklistModal.guest.blacklisted ? 'Remove from Blacklist' : 'Confirm Blacklist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestsView;
