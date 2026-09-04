import React, { useState, useEffect, useCallback } from 'react';
import { Star, Search, Users, TrendingUp, Award, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { getGuestsList } from '../../../../core/api/services/reception.service';
import './LoyaltyManagement.css';

/* tier color map */
const TIER = {
  Bronze:   { bg: '#fef3c7', color: '#92400e', icon: '🥉' },
  Silver:   { bg: '#f1f5f9', color: '#475569', icon: '🥈' },
  Gold:     { bg: '#fef9c3', color: '#854d0e', icon: '🥇' },
  Platinum: { bg: '#ede9fe', color: '#6d28d9', icon: '💎' },
  Diamond:  { bg: '#dbeafe', color: '#1e40af', icon: '👑' },
};

const fmt = (n) => (n || 0).toLocaleString('en-IN');

const LoyaltyManagement = () => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');

  const fetchGuests = useCallback(async (isRefresh) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getGuestsList({ limit: 200 });
      setGuests(res.data || res.guests || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load guests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchGuests(false); }, [fetchGuests]);

  const byTier = guests.reduce((acc, g) => {
    const t = g.membershipTier || 'Bronze';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const filtered = guests.filter(g => {
    const matchTier = tierFilter === 'all' || g.membershipTier === tierFilter;
    const matchSearch = !search ||
      (g.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (g.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (g.guestId || '').toLowerCase().includes(search.toLowerCase());
    return matchTier && matchSearch;
  }).sort((a, b) => (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0));

  const totalPoints = guests.reduce((s, g) => s + (g.loyaltyPoints || 0), 0);
  const totalSpent = guests.reduce((s, g) => s + (g.totalSpent || 0), 0);
  const goldPlus = (byTier.Gold || 0) + (byTier.Platinum || 0) + (byTier.Diamond || 0);

  if (loading) {
    return (
      <div className="lm-loading">
        <div className="lm-spinner" />
        <span>Loading loyalty data…</span>
      </div>
    );
  }

  return (
    <div className="lm-root">
      {/* Header */}
      <div className="lm-header">
        <div className="lm-header-left">
          <div className="lm-header-icon"><Star size={22} /></div>
          <div>
            <h1>Loyalty Program</h1>
            <p>Guest membership tiers &amp; points overview</p>
          </div>
        </div>
        <button className="lm-btn" onClick={() => fetchGuests(true)} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'lm-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="lm-kpis">
        <div className="lm-kpi" style={{ '--c': '#6366f1' }}>
          <div className="lm-kpi-icon"><Users size={20} /></div>
          <div>
            <div className="lm-kpi-value">{fmt(guests.length)}</div>
            <div className="lm-kpi-label">Total Members</div>
          </div>
        </div>
        <div className="lm-kpi" style={{ '--c': '#f59e0b' }}>
          <div className="lm-kpi-icon"><Star size={20} /></div>
          <div>
            <div className="lm-kpi-value">{fmt(totalPoints)}</div>
            <div className="lm-kpi-label">Total Points Issued</div>
          </div>
        </div>
        <div className="lm-kpi" style={{ '--c': '#10b981' }}>
          <div className="lm-kpi-icon"><TrendingUp size={20} /></div>
          <div>
            <div className="lm-kpi-value">₹{fmt(totalSpent)}</div>
            <div className="lm-kpi-label">Total Guest Spending</div>
          </div>
        </div>
        <div className="lm-kpi" style={{ '--c': '#8b5cf6' }}>
          <div className="lm-kpi-icon"><Award size={20} /></div>
          <div>
            <div className="lm-kpi-value">{fmt(goldPlus)}</div>
            <div className="lm-kpi-label">Gold+ Members</div>
          </div>
        </div>
      </div>

      {/* Tier breakdown chips */}
      <div className="lm-chips">
        <button
          className={`lm-chip${tierFilter === 'all' ? ' lm-chip--active' : ''}`}
          style={tierFilter === 'all' ? { '--tc-bg': '#eef2ff', '--tc-color': '#4338ca' } : undefined}
          onClick={() => setTierFilter('all')}
        >
          All ({guests.length})
        </button>
        {Object.entries(TIER).map(([name, t]) => (
          <button
            key={name}
            className={`lm-chip${tierFilter === name ? ' lm-chip--active' : ''}`}
            style={tierFilter === name ? { '--tc-bg': t.bg, '--tc-color': t.color } : undefined}
            onClick={() => setTierFilter(name)}
          >
            {t.icon} {name} ({byTier[name] || 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="lm-search-wrap">
        <Search size={16} className="lm-search-ico" />
        <input
          className="lm-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or guest ID…"
        />
      </div>

      {/* Guest table */}
      {filtered.length === 0 ? (
        <div className="lm-empty">
          <Star size={40} strokeWidth={1.5} style={{ opacity: 0.3 }} />
          <h3>No guests found</h3>
          <p>Guests appear here once they have bookings in your hotel.</p>
        </div>
      ) : (
        <div className="lm-table-wrap">
          <table className="lm-table">
            <thead>
              <tr>
                {['Guest', 'Tier', 'Points', 'Total Stays', 'Total Spent', 'Status'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => {
                const t = TIER[g.membershipTier] || TIER.Bronze;
                const inHouse = g.status === 'In-House';
                return (
                  <tr key={g._id || g.guestId}>
                    <td>
                      <div className="lm-guest-name">{g.fullName}</div>
                      <div className="lm-guest-sub">{g.email || g.guestId}</div>
                    </td>
                    <td>
                      <span className="lm-tier-badge" style={{ '--tc-bg': t.bg, '--tc-color': t.color }}>
                        {t.icon} {g.membershipTier || 'Bronze'}
                      </span>
                    </td>
                    <td className="lm-points">{fmt(g.loyaltyPoints)}</td>
                    <td>{g.totalStays || 0}</td>
                    <td className="lm-points">₹{fmt(g.totalSpent)}</td>
                    <td>
                      <span className={`lm-status-badge ${inHouse ? 'lm-status-badge--in-house' : 'lm-status-badge--out'}`}>
                        {g.status || 'Checked-Out'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LoyaltyManagement;
