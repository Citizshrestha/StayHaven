import React, { useEffect, useState, useCallback } from 'react';
import {
  BedDouble,
  ShoppingBag,
  DollarSign,
  Users,
  ArrowUpRight,
  Activity,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Database } from 'lucide-react';
import {
  getReportsOverview,
  getBillingSummary,
} from '../../../../core/api/services/reception.service';
import { seedHotelAdminData } from '../../../../core/api/services/seed.service';
import {
  StatCard,
  StatCardSkeleton,
  Skeleton,
  ErrorState,
  EmptyState,
  Badge,
  Button,
} from '../components/ui';
import useHotelId from '../hooks/useHotelId';

const stripHtml = (str = '') => String(str).replace(/<[^>]*>/g, '');
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

/**
 * Hotel-admin dashboard home.
 *
 * Wired to the SAME real reception endpoints ReportsAnalytics uses
 * (getReportsOverview + getBillingSummary) rather than the previous
 * hardcoded arrays. Occupancy, revenue, guest activity and recent activity
 * are all live. The sales-trend spark line and top-selling items are the
 * only pieces without a real source yet, so they render an honest
 * "coming soon" state instead of invented numbers.  [NEEDS BACKEND]
 */
export default function DashboardHome({ onNavigate, onStats }) {
  const hotelId = useHotelId();
  const [overview, setOverview] = useState(null);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(() => {
    setError(null);
    return Promise.all([getReportsOverview(), getBillingSummary()])
      .then(([r, b]) => {
        setOverview(r.data);
        setBilling(b.data);
        // Bubble real counts up to the shell for sidebar badges.
        const roomsArr = r.data?.roomStatus || [];
        const totalRooms = roomsArr.reduce((sum, x) => sum + (x.total || 0), 0);
        onStats?.({ totalRooms });
      })
      .catch((e) =>
        setError(e.response?.data?.message || e.message || 'Failed to load dashboard')
      );
  }, [onStats]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Populate this property with real DB records (rooms, tables, menu, staff,
  // orders, bookings, invoices) when it's empty. Idempotent server-side —
  // only creates records for collections that have none.
  const handleSeed = async () => {
    if (!hotelId) {
      toast.error('No hotel selected — cannot seed data.');
      return;
    }
    setSeeding(true);
    try {
      const res = await seedHotelAdminData(hotelId);
      toast.success(res?.message || 'Sample data created in the database.');
      setLoading(true);
      await load().finally(() => setLoading(false));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to seed data.');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="ha-page">
        <div className="ha-page-header">
          <div className="ha-page-header__row">
            <div>
              <Skeleton width={180} height={28} style={{ marginBottom: 8 }} />
              <Skeleton width={280} height={16} />
            </div>
          </div>
        </div>
        <div className="ha-kpi-grid" style={{ marginBottom: 24 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="ha-card ha-card--pad">
          <Skeleton width="40%" height={18} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={120} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ha-page">
        <ErrorState
          title="Couldn't load the dashboard"
          description={error}
          onRetry={() => {
            setLoading(true);
            load().finally(() => setLoading(false));
          }}
        />
      </div>
    );
  }

  const occ = overview?.occupancy || {};
  const guests = overview?.guestActivity || {};
  const ci = overview?.checkIns || {};
  const co = overview?.checkOuts || {};
  const rooms = overview?.roomStatus || [];
  const activity = overview?.recentActivity || [];
  const bill = billing || {};

  const totalRooms = rooms.reduce((s, r) => s + (r.total || 0), 0);
  const occupiedRooms = rooms.reduce((s, r) => s + (r.occupied || 0), 0);

  return (
    <div className="ha-page">
      <div className="ha-page-header">
        <div className="ha-page-header__row">
          <div>
            <h1 className="ha-page-header__title">Dashboard</h1>
            <p className="ha-page-header__subtitle">
              Welcome back — here's what's happening across your property today.
            </p>
          </div>
          <div className="ha-page-header__actions">
            <Button variant="secondary" onClick={handleSeed} disabled={seeding || !hotelId}>
              <Database size={16} aria-hidden="true" /> {seeding ? 'Seeding…' : 'Seed sample data'}
            </Button>
          </div>
        </div>
      </div>

      {/* Empty-property helper — shown when this hotel has no rooms yet */}
      {totalRooms === 0 && (
        <div
          className="ha-card"
          role="note"
          style={{ padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <Database size={18} aria-hidden="true" style={{ color: 'var(--ha-primary)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="ha-body-strong" style={{ color: 'var(--ha-text)' }}>This property has no data yet</div>
            <div className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>
              Seed real sample records (rooms, tables, menu, staff, orders, invoices) into the database to get started.
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={handleSeed} disabled={seeding || !hotelId}>
            {seeding ? 'Seeding…' : 'Seed now'}
          </Button>
        </div>
      )}

      {/* KPI row — real data */}
      <div className="ha-kpi-grid" style={{ marginBottom: 24 }}>
        <StatCard
          icon={<BedDouble size={22} />}
          iconBg="linear-gradient(135deg,#6366f1,#4f46e5)"
          label="Occupancy"
          value={`${occ.current ?? 0}%`}
          trend={`${occupiedRooms}/${totalRooms || 0}`}
          trendTone="flat"
          onClick={() => onNavigate?.('rooms')}
        />
        <StatCard
          icon={<ShoppingBag size={22} />}
          iconBg="linear-gradient(135deg,#8b5cf6,#7c3aed)"
          label="Check-ins Today"
          value={ci.today ?? 0}
          trend={ci.pending ? `${ci.pending} pending` : 'On track'}
          trendTone={ci.pending ? 'warn' : 'up'}
          onClick={() => onNavigate?.('orders')}
        />
        <StatCard
          icon={<DollarSign size={22} />}
          iconBg="linear-gradient(135deg,#10b981,#059669)"
          label="Total Revenue"
          value={rs(bill.totalRevenue)}
          trend={bill.totalInvoices ? `${bill.totalInvoices} inv` : null}
          trendTone="up"
          onClick={() => onNavigate?.('billing')}
        />
        <StatCard
          icon={<Users size={22} />}
          iconBg="linear-gradient(135deg,#f59e0b,#f97316)"
          label="Current Guests"
          value={guests.currentGuests ?? 0}
          trend={guests.vipGuests ? `${guests.vipGuests} VIP` : null}
          trendTone="flat"
          onClick={() => onNavigate?.('loyalty')}
        />
      </div>

      {/* Two-column body */}
      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'minmax(0,1fr)',
          marginBottom: 16,
        }}
        className="ha-dashboard-body"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Check-in / check-out summary (real) */}
          <div className="ha-card ha-card--pad">
            <h2 className="ha-h2" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={18} aria-hidden="true" /> Front Desk Today
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 16 }}>
              <FrontDeskStat label="Check-ins" value={ci.today ?? 0} sub={`${ci.completed ?? 0} done · ${ci.pending ?? 0} pending`} />
              <FrontDeskStat label="Check-outs" value={co.today ?? 0} sub={`${co.completed ?? 0} done · ${co.pending ?? 0} pending`} />
              <FrontDeskStat label="Occupied Rooms" value={occupiedRooms} sub={`of ${totalRooms || 0} total`} />
            </div>
          </div>

          {/* Room status by type (real) */}
          <div className="ha-card ha-card--pad">
            <h2 className="ha-h2" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BedDouble size={18} aria-hidden="true" /> Rooms by Type
            </h2>
            {rooms.length === 0 ? (
              <EmptyState title="No room data" description="Room breakdown will appear here once rooms are configured." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {rooms.map((r) => {
                  const pct = r.total ? Math.round((r.occupied / r.total) * 100) : 0;
                  return (
                    <div key={r.type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span className="ha-body-strong">{r.type}</span>
                        <span className="ha-small haNum" style={{ color: 'var(--ha-text-subtle)' }}>
                          {r.occupied}/{r.total} · {pct}%
                        </span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: 'var(--ha-surface-sunken)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--ha-primary)', borderRadius: 999, transition: 'width 300ms ease-out' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Recent activity (real) */}
          <div className="ha-card ha-card--pad">
            <h2 className="ha-h2" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} aria-hidden="true" /> Recent Activity
            </h2>
            {activity.length === 0 ? (
              <EmptyState title="No recent activity" description="Property activity will show up here as it happens." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {activity.slice(0, 8).map((a, i) => (
                  <div
                    key={a.id || i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: i < 7 ? '1px solid var(--ha-border)' : 'none',
                    }}
                  >
                    <span className="ha-body" style={{ color: 'var(--ha-text-muted)' }}>{stripHtml(a.description)}</span>
                    <span className="ha-small haNum" style={{ color: 'var(--ha-text-subtle)', whiteSpace: 'nowrap' }}>{a.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sales trend — honest [NEEDS BACKEND] */}
          <div className="ha-card ha-card--pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 className="ha-h2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowUpRight size={18} aria-hidden="true" /> Sales Trend
              </h2>
              <Badge tone="neutral">Coming soon</Badge>
            </div>
            <EmptyState
              title="Live sales analytics coming soon"
              description="A weekly sales trend will appear here once a time-series metrics endpoint is available."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FrontDeskStat({ label, value, sub }) {
  return (
    <div>
      <div className="ha-kpi-value" style={{ fontSize: 24, lineHeight: '30px' }}>{value}</div>
      <div className="ha-body-strong" style={{ color: 'var(--ha-text)' }}>{label}</div>
      <div className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>{sub}</div>
    </div>
  );
}
