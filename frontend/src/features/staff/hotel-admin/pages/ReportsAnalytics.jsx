import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, BedDouble, DollarSign, ClipboardList, Activity, RefreshCw } from 'lucide-react';
import { getReportsOverview, getBillingSummary, getRevenueSplit } from '../../../../core/api/services/reception.service';
import './ReportsAnalytics.css';

// backend sends cosmetic <strong> markup meant for a different view's dangerouslySetInnerHTML;
// here we just want plain text, so strip tags rather than render raw HTML.
const stripHtml = (str = '') => str.replace(/<[^>]*>/g, '');

const KPI = ({ icon, color, label, value, sub }) => (
  <div className="ra-kpi" style={{ '--c': color }}>
    <div className="ra-kpi-icon">{icon}</div>
    <div>
      <div className="ra-kpi-value">{value}</div>
      <div className="ra-kpi-label">{label}</div>
      {sub && <div className="ra-kpi-sub">{sub}</div>}
    </div>
  </div>
);

const Bar = ({ label, value, max, color }) => (
  <div className="ra-bar">
    <div className="ra-bar-head"><span>{label}</span><b>{value}</b></div>
    <div className="ra-bar-track">
      <div className="ra-bar-fill" style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color }} />
    </div>
  </div>
);

export default function ReportsAnalytics() {
  const [data, setData] = useState(null);
  const [billing, setBilling] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    return Promise.all([getReportsOverview(), getBillingSummary(), getRevenueSplit()])
      .then(([r, b, v]) => { setData(r.data); setBilling(b.data); setRevenue(v.data); })
      .catch(e => setError(e.response?.data?.message || e.message || 'Failed to load reports'));
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  if (loading) {
    return (
      <div className="ra-loading">
        <div className="ra-spinner" />
        <span>Loading reports…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="ra-error">
        <span>Error: {error}</span>
        <button className="ra-btn" onClick={handleRefresh}><RefreshCw size={14} /> Retry</button>
      </div>
    );
  }

  const occ = data?.occupancy || {};
  const ci = data?.checkIns || {};
  const co = data?.checkOuts || {};
  const hk = data?.housekeeping || {};
  const guests = data?.guestActivity || {};
  const rooms = data?.roomStatus || [];
  const activity = data?.recentActivity || [];
  const rev = revenue || {};
  const bill = billing || {};
  const maxRev = Math.max(rev.rooms || 0, rev.food || 0, rev.services || 0, 1);

  return (
    <div className="ra-root">
      {/* Header */}
      <div className="ra-header">
        <div className="ra-header-left">
          <div className="ra-header-icon"><BarChart3 size={22} /></div>
          <div>
            <h1>Reports &amp; Analytics</h1>
            <p>Occupancy, revenue &amp; operational performance</p>
          </div>
        </div>
        <button className="ra-btn" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'ra-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="ra-kpis">
        <KPI icon={<BedDouble size={20} />} color="#3b82f6" label="Occupancy" value={`${occ.current ?? 0}%`} sub={`${occ.rooms?.occupied ?? 0} / ${(occ.rooms?.occupied ?? 0) + (occ.rooms?.available ?? 0)} rooms`} />
        <KPI icon={<DollarSign size={20} />} color="#10b981" label="Total Revenue" value={`Rs ${(bill.totalRevenue ?? 0).toLocaleString()}`} sub={`${bill.totalInvoices ?? 0} invoices`} />
        <KPI icon={<TrendingUp size={20} />} color="#f59e0b" label="Pending" value={`Rs ${(bill.pending ?? 0).toLocaleString()}`} sub={bill.overdue ? `Rs ${bill.overdue} overdue` : 'No overdue'} />
        <KPI icon={<Users size={20} />} color="#8b5cf6" label="Current Guests" value={guests.currentGuests ?? 0} sub={`${guests.vipGuests ?? 0} VIP`} />
      </div>

      <div className="ra-grid">
        {/* Check-in / Check-out */}
        <div className="ra-card">
          <div className="ra-card-title"><ClipboardList size={16} /> Check-ins &amp; Check-outs</div>
          <div className="ra-minigrid">
            <div>
              <div className="ra-mini-label">Check-ins Today</div>
              <div className="ra-mini-value">{ci.today ?? 0}</div>
              <div className="ra-mini-sub">Completed {ci.completed ?? 0} · Pending {ci.pending ?? 0}</div>
              {ci.noShow > 0 && <span className="ra-pill" style={{ background: '#fef2f2', color: '#ef4444' }}>No-show: {ci.noShow}</span>}
            </div>
            <div>
              <div className="ra-mini-label">Check-outs Today</div>
              <div className="ra-mini-value">{co.today ?? 0}</div>
              <div className="ra-mini-sub">Completed {co.completed ?? 0} · Pending {co.pending ?? 0}</div>
              {co.lateCheckout > 0 && <span className="ra-pill" style={{ background: '#fffbeb', color: '#f59e0b' }}>Late: {co.lateCheckout}</span>}
            </div>
          </div>
        </div>

        {/* Housekeeping */}
        <div className="ra-card">
          <div className="ra-card-title"><Activity size={16} /> Housekeeping</div>
          {[['Clean', hk.clean, '#10b981'], ['Dirty', hk.dirty, '#ef4444'], ['In Progress', hk.inProgress, '#f59e0b'], ['Inspected', hk.inspected, '#3b82f6']].map(([l, v, c]) => (
            <div key={l} className="ra-row">
              <span>{l}</span>
              <span className="ra-pill" style={{ background: c + '20', color: c }}>{v ?? 0}</span>
            </div>
          ))}
        </div>

        {/* Revenue Split */}
        <div className="ra-card">
          <div className="ra-card-title"><DollarSign size={16} /> Revenue Breakdown</div>
          <Bar label="Rooms" value={rev.rooms ?? 0} max={maxRev} color="#3b82f6" />
          <Bar label="Food & Beverage" value={rev.food ?? 0} max={maxRev} color="#10b981" />
          <Bar label="Services" value={rev.services ?? 0} max={maxRev} color="#f59e0b" />
          <div className="ra-bar-total">Total: Rs {(rev.total ?? 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Room Status by Type */}
      {rooms.length > 0 && (
        <div className="ra-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="ra-card">
            <div className="ra-card-title"><BedDouble size={16} /> Room Status by Type</div>
            <div className="ra-rooms">
              {rooms.map(r => (
                <div key={r.type} className="ra-room-tile">
                  <div className="ra-room-type">{r.type}</div>
                  <div className="ra-room-occ">{r.occupied}/{r.total} occupied</div>
                  <div className="ra-room-bar">
                    <div className="ra-room-bar-fill" style={{ width: `${r.total ? (r.occupied / r.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="ra-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="ra-card">
          <div className="ra-card-title"><Activity size={16} /> Recent Activity</div>
          {activity.length === 0 ? (
            <div className="ra-empty-inline">No recent activity yet.</div>
          ) : (
            activity.slice(0, 10).map((a, i) => (
              <div key={a.id || i} className="ra-activity-row">
                <span className="ra-activity-desc">{stripHtml(a.description)}</span>
                <span className="ra-activity-time">{a.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
