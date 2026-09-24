import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Users, BedDouble, DollarSign, ClipboardList, Activity, RefreshCw } from 'lucide-react';
import { getReportsOverview, getBillingSummary, getRevenueSplit } from '../../../../core/api/services/reception.service';
import {
  PageHeader,
  Button,
  StatCard,
  StatCardSkeleton,
  Skeleton,
  ErrorState,
  Badge,
} from '../components/ui';
import '../styles/hotel-admin-tokens.css';

// Backend sends cosmetic <strong> markup for a different view; strip to plain text here.
const stripHtml = (str = '') => str.replace(/<[^>]*>/g, '');
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

const Bar = ({ label, value, max, color }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <span className="ha-body" style={{ color: 'var(--ha-text-muted)' }}>{label}</span>
      <b className="haNum" style={{ color: 'var(--ha-text)' }}>{rs(value)}</b>
    </div>
    <div style={{ height: 8, borderRadius: 999, background: 'var(--ha-surface-sunken)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${max ? (value / max) * 100 : 0}%`, background: color, borderRadius: 999, transition: 'width 300ms ease-out' }} />
    </div>
  </div>
);

const Card = ({ title, icon, children }) => (
  <div className="ha-card ha-card--pad">
    <h2 className="ha-h2" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
      {icon} {title}
    </h2>
    {children}
  </div>
);

export default function ReportsAnalytics() {
  const [data, setData] = useState(null);
  const [billing, setBilling] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    return Promise.all([getReportsOverview(), getBillingSummary(), getRevenueSplit()])
      .then(([r, b, v]) => {
        setData(r.data);
        setBilling(b.data);
        setRevenue(v.data);
      })
      .catch((e) => setError(e.response?.data?.message || e.message || 'Failed to load reports'));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

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
    <div className="ha-page">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Occupancy, revenue, and operational performance."
        actions={
          <Button variant="secondary" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} aria-hidden="true" /> Refresh
          </Button>
        }
      />

      {loading ? (
        <>
          <div className="ha-kpi-grid" style={{ marginBottom: 24 }}>
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          <div className="ha-card ha-card--pad">
            <Skeleton width="30%" height={18} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={120} />
          </div>
        </>
      ) : error ? (
        <ErrorState description={error} onRetry={handleRefresh} />
      ) : (
        <>
          {/* KPIs */}
          <div className="ha-kpi-grid" style={{ marginBottom: 24 }}>
            <StatCard icon={<BedDouble size={22} />} iconBg="var(--ha-info)" label="Occupancy" value={`${occ.current ?? 0}%`} trend={`${occ.rooms?.occupied ?? 0}/${(occ.rooms?.occupied ?? 0) + (occ.rooms?.available ?? 0)}`} trendTone="flat" />
            <StatCard icon={<DollarSign size={22} />} iconBg="var(--ha-success)" label="Total Revenue" value={rs(bill.totalRevenue)} trend={bill.totalInvoices ? `${bill.totalInvoices} inv` : null} trendTone="up" />
            <StatCard icon={<TrendingUp size={22} />} iconBg="var(--ha-warning)" label="Pending" value={rs(bill.pending)} trend={bill.overdue ? 'overdue' : 'clear'} trendTone={bill.overdue ? 'warn' : 'up'} />
            <StatCard icon={<Users size={22} />} iconBg="linear-gradient(135deg,#8b5cf6,#7c3aed)" label="Current Guests" value={guests.currentGuests ?? 0} trend={guests.vipGuests ? `${guests.vipGuests} VIP` : null} trendTone="flat" />
          </div>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', marginBottom: 16 }}>
            <Card title="Check-ins & Check-outs" icon={<ClipboardList size={18} aria-hidden="true" />}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div className="ha-field__label">Check-ins Today</div>
                  <div className="ha-kpi-value" style={{ fontSize: 24, lineHeight: '30px' }}>{ci.today ?? 0}</div>
                  <div className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>Done {ci.completed ?? 0} · Pending {ci.pending ?? 0}</div>
                  {ci.noShow > 0 && <Badge tone="danger">No-show: {ci.noShow}</Badge>}
                </div>
                <div>
                  <div className="ha-field__label">Check-outs Today</div>
                  <div className="ha-kpi-value" style={{ fontSize: 24, lineHeight: '30px' }}>{co.today ?? 0}</div>
                  <div className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>Done {co.completed ?? 0} · Pending {co.pending ?? 0}</div>
                  {co.lateCheckout > 0 && <Badge tone="warning">Late: {co.lateCheckout}</Badge>}
                </div>
              </div>
            </Card>

            <Card title="Housekeeping" icon={<Activity size={18} aria-hidden="true" />}>
              {[['Clean', hk.clean, 'success'], ['Dirty', hk.dirty, 'danger'], ['In Progress', hk.inProgress, 'warning'], ['Inspected', hk.inspected, 'info']].map(([l, v, tone]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <span className="ha-body" style={{ color: 'var(--ha-text-muted)' }}>{l}</span>
                  <Badge tone={tone}>{v ?? 0}</Badge>
                </div>
              ))}
            </Card>

            <Card title="Revenue Breakdown" icon={<DollarSign size={18} aria-hidden="true" />}>
              <Bar label="Rooms" value={rev.rooms ?? 0} max={maxRev} color="var(--ha-info)" />
              <Bar label="Food & Beverage" value={rev.food ?? 0} max={maxRev} color="var(--ha-success)" />
              <Bar label="Services" value={rev.services ?? 0} max={maxRev} color="var(--ha-warning)" />
              <div className="ha-money-large haNum" style={{ marginTop: 8, color: 'var(--ha-text)' }}>Total: {rs(rev.total)}</div>
            </Card>
          </div>

          {rooms.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Card title="Room Status by Type" icon={<BedDouble size={18} aria-hidden="true" />}>
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
                  {rooms.map((r) => {
                    const pct = r.total ? Math.round((r.occupied / r.total) * 100) : 0;
                    return (
                      <div key={r.type} className="ha-card" style={{ padding: 14 }}>
                        <div className="ha-body-strong" style={{ color: 'var(--ha-text)' }}>{r.type}</div>
                        <div className="ha-small haNum" style={{ color: 'var(--ha-text-subtle)', marginBottom: 8 }}>{r.occupied}/{r.total} occupied</div>
                        <div style={{ height: 6, borderRadius: 999, background: 'var(--ha-surface-sunken)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--ha-primary)', borderRadius: 999 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          <Card title="Recent Activity" icon={<Activity size={18} aria-hidden="true" />}>
            {activity.length === 0 ? (
              <p className="ha-body" style={{ color: 'var(--ha-text-subtle)' }}>No recent activity yet.</p>
            ) : (
              activity.slice(0, 10).map((a, i) => (
                <div key={a.id || i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: i < 9 ? '1px solid var(--ha-border)' : 'none' }}>
                  <span className="ha-body" style={{ color: 'var(--ha-text-muted)' }}>{stripHtml(a.description)}</span>
                  <span className="ha-small haNum" style={{ color: 'var(--ha-text-subtle)', whiteSpace: 'nowrap' }}>{a.time}</span>
                </div>
              ))
            )}
          </Card>
        </>
      )}
    </div>
  );
}
