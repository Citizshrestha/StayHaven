import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  CalendarDays, CalendarPlus, ChevronRight, CreditCard, MessageSquare, Receipt, RefreshCw, ShoppingBag, UtensilsCrossed, Hotel, CheckCircle2,
} from 'lucide-react';
import { useSocket } from '../../../../core/context/SocketContext';
import ExtendStayModal from '../../../../shared/components/ExtendStayModal';
import CancelOrderModal from '../../../../shared/components/CancelOrderModal';
import notificationSoundService from '../../../../core/services/notificationSoundService';
import { cn } from '../../../../core/utils/cn';
import { getGuestInvoices } from '../guestDashboardApi';
import { useGuestOverviewContext } from '../hooks/useGuestOverview';
import { useGuestProfileContext } from '../hooks/useGuestProfile';
import useMediaQuery, { DESKTOP_QUERY } from '../hooks/useMediaQuery';
import usePullToRefresh from '../hooks/usePullToRefresh';
import { errorMessage, formatDate, formatRelative, nightsBetween } from '../utils/format';
import Button from '../components/ui/Button';
import Money from '../components/ui/Money';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import PullIndicator from '../components/ui/PullIndicator';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';

const CARD = 'rounded-(--g-radius-lg) bg-(--g-surface) border border-(--g-border) shadow-(--g-shadow-sm) p-5 sm:p-6';
const ACTIVE_ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];
const CANCELLABLE_STATUSES = ['pending', 'confirmed'];
const ORDER_PROGRESS = { pending: 20, confirmed: 40, preparing: 60, ready: 80, delivered: 100 };
const MAX_ACTIVE_ORDERS = 3;

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

const statusLabel = (status) => String(status || 'updated').replace(/[-_]/g, ' ');

const orderTypeLabel = (type) => (type === 'roomService' ? 'Room service' : statusLabel(type || 'Order'));

const SectionHeader = ({ title, action }) => (
  <div className="flex items-center justify-between gap-3 mb-4">
    <h2 className="g-h2 text-(--g-text)">{title}</h2>
    {action}
  </div>
);

const LinkButton = ({ onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1 min-h-[44px] -my-2 px-2 -mr-2 rounded-(--g-radius-sm) g-small font-semibold text-(--g-primary-text) hover:bg-(--g-primary-tint)"
  >
    {children}
    <ChevronRight className="w-4 h-4" aria-hidden="true" />
  </button>
);

const DashboardSkeleton = () => (
  <div role="status" aria-live="polite" className="space-y-5">
    <span className="sr-only">Loading your dashboard…</span>
    <Skeleton className="h-56 w-full rounded-(--g-radius-lg)" />
    <div className="grid grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-(--g-radius-md)" />)}
    </div>
    <div className="grid gap-5 lg:grid-cols-12">
      <SkeletonCard lines={4} className="lg:col-span-8" />
      <SkeletonCard lines={3} className="lg:col-span-4" />
    </div>
  </div>
);

const DashboardView = () => {
  const navigate = useNavigate();
  const { subscribe, isConnected } = useSocket();
  const { overview, loading, error, refresh, lastRefreshedAt } = useGuestOverviewContext();
  const { profile } = useGuestProfileContext();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const [invoices, setInvoices] = useState({ items: [], outstanding: 0, loaded: false, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [extendOpen, setExtendOpen] = useState(false);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const invoiceRequest = useRef(0);

  const loadInvoices = useCallback(async () => {
    const requestId = ++invoiceRequest.current;
    try {
      const res = await getGuestInvoices({ limit: 20 });
      if (requestId !== invoiceRequest.current) return;
      const items = Array.isArray(res?.data) ? res.data : [];
      const fromItems = items.reduce((sum, inv) => sum + (Number(inv?.balance) || 0), 0);
      const outstanding = Number(res?.outstandingBalance);
      setInvoices({ items, outstanding: Number.isFinite(outstanding) ? outstanding : fromItems, loaded: true, error: null });
    } catch (err) {
      if (requestId === invoiceRequest.current) {
        setInvoices((prev) => ({ ...prev, loaded: true, error: errorMessage(err, 'We couldn’t load your bill.') }));
      }
    }
  }, []);

  useEffect(() => {
    loadInvoices();
    return () => { invoiceRequest.current += 1; };
  }, [loadInvoices]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), loadInvoices()]);
    } finally {
      setRefreshing(false);
      setNow(Date.now());
    }
  }, [refresh, loadInvoices]);

  const { pull, refreshing: pulling } = usePullToRefresh(refreshAll);

  // Realtime: every event re-reads the overview (one request) so counts,
  // active orders and the bill never drift from the server.
  useEffect(() => {
    if (!subscribe || !isConnected) return undefined;

    const onPlaced = (payload) => {
      const msg = `Order #${payload?.orderNumber ?? ''} placed`;
      toast.success(msg);
      setAnnouncement(msg);
      notificationSoundService.play('order');
      refresh();
    };
    const onStatus = (payload) => {
      const msg = `Order #${payload?.orderNumber ?? ''} is now ${statusLabel(payload?.status)}`;
      toast.info(msg);
      setAnnouncement(msg);
      notificationSoundService.play('notification');
      refresh();
    };
    const onPayment = () => {
      toast.success('Payment confirmed');
      setAnnouncement('Payment confirmed');
      notificationSoundService.play('notification');
      refresh();
      loadInvoices();
    };
    const onBill = (payload) => {
      const msg = `Bill received for order #${payload?.orderNumber ?? ''}`;
      toast.info(msg, { autoClose: 5000 });
      setAnnouncement(msg);
      notificationSoundService.play('notification');
      loadInvoices();
    };

    const unsubs = [
      subscribe('order-placed', onPlaced),
      subscribe('order-status-update', onStatus),
      subscribe('order-status-updated', onStatus),
      subscribe('payment-confirmed', onPayment),
      subscribe('bill-received', onBill),
    ];
    return () => unsubs.forEach((unsub) => unsub?.());
  }, [subscribe, isConnected, refresh, loadInvoices]);

  if (loading && !overview) return <DashboardSkeleton />;

  if (error && !overview) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="Dashboard unavailable"
        description={error}
        action={<Button icon={RefreshCw} loading={refreshing} onClick={refreshAll}>Try again</Button>}
      />
    );
  }

  const data = overview || {};
  const activeBooking = data.activeBooking || null;
  const upcoming = (data.upcomingBookings || []).filter((b) => String(b?._id) !== String(activeBooking?._id));
  const activeOrders = (data.recentOrders || []).filter((o) => ACTIVE_ORDER_STATUSES.includes(String(o?.status).toLowerCase()));
  const activeOrderCount = Math.max(Number(data.pendingOrdersCount) || 0, activeOrders.length);
  const dueInvoices = invoices.items.filter((inv) => (Number(inv?.balance) || 0) > 0);
  const username = profile?.fullname || localStorage.getItem('username') || 'Guest';
  const updatedLabel = lastRefreshedAt ? `Updated ${formatRelative(lastRefreshedAt, now)}` : 'Updating…';
  const busy = refreshing || pulling;

  const hero = (
    <section
      aria-labelledby="dash-hero-title"
      className="relative overflow-hidden rounded-(--g-radius-lg) [background:var(--g-gradient)] text-white p-5 sm:p-7 shadow-(--g-shadow-md)"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="g-small text-white/90">{greeting()},</p>
          <h1 id="dash-hero-title" className="g-display truncate">{username}</h1>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <button
            type="button"
            onClick={refreshAll}
            disabled={busy}
            aria-label="Refresh dashboard"
            className="w-11 h-11 rounded-full bg-white/20 border border-white/30 flex items-center justify-center hover:bg-white/30 disabled:opacity-70 transition-colors duration-150 ease-out"
          >
            <RefreshCw className={cn('w-5 h-5', busy && 'animate-spin')} aria-hidden="true" />
          </button>
          <span className="g-small text-white/90 mt-1 whitespace-nowrap" aria-live="polite">{updatedLabel}</span>
        </div>
      </div>

      {activeBooking ? (
        <>
          <p className="g-body text-white/95 mt-2">
            {[
              activeBooking.hotel?.name,
              activeBooking.room?.roomNumber && `Room ${activeBooking.room.roomNumber}`,
              `${activeBooking.nightsLeft || 0} night${activeBooking.nightsLeft === 1 ? '' : 's'} left`,
            ].filter(Boolean).join(' · ')}
          </p>
          <dl className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
            {[
              ['Check-in', formatDate(activeBooking.checkIn, { day: 'numeric', month: 'short' })],
              ['Check-out', formatDate(activeBooking.checkOut, { day: 'numeric', month: 'short' })],
              ['Nights', nightsBetween(activeBooking.checkIn, activeBooking.checkOut)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-(--g-radius-md) bg-white/15 border border-white/20 px-3 py-2.5 min-w-0">
                <dt className="g-label text-white/90">{label}</dt>
                <dd className="g-body-strong guestNum mt-1 truncate">{value}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={() => setExtendOpen(true)}
            className="mt-5 inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-(--g-radius-sm) bg-white text-(--g-on-hero-action) g-small font-semibold hover:bg-white/90 transition-colors duration-150 ease-out"
          >
            <CalendarPlus className="w-4 h-4" aria-hidden="true" />
            Extend Stay
          </button>
        </>
      ) : (
        <>
          <p className="g-h2 mt-3">No active stay</p>
          <p className="g-body text-white/90 mt-1">Book a room to unlock room service, billing and requests.</p>
          <button
            type="button"
            onClick={() => navigate('/hotels')}
            className="mt-5 inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-(--g-radius-sm) bg-white text-(--g-on-hero-action) g-small font-semibold hover:bg-white/90 transition-colors duration-150 ease-out"
          >
            <Hotel className="w-4 h-4" aria-hidden="true" />
            Browse hotels
          </button>
        </>
      )}
    </section>
  );

  const stats = (
    <div className="grid grid-cols-3 gap-3">
      <StatCard icon={UtensilsCrossed} tone="orange" label="Active orders" value={activeOrderCount} onClick={() => navigate('/guest-dashboard/room-service')} />
      <StatCard icon={CalendarDays} tone="sky" label="Upcoming stays" value={upcoming.length} onClick={() => navigate('/guest-dashboard/bookings?status=upcoming')} />
      <StatCard icon={MessageSquare} tone="amber" label="Open requests" value={Number(data.openRequestsCount) || 0} onClick={() => navigate('/guest-dashboard/requests?status=open')} />
    </div>
  );

  const bill = (
    <section aria-labelledby="dash-bill-title" className={CARD}>
      <SectionHeader title={<span id="dash-bill-title">Your bill</span>} />
      {!invoices.loaded ? (
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ) : invoices.error ? (
        <div>
          <p className="g-small text-(--g-danger-text)" role="alert">{invoices.error}</p>
          <Button variant="secondary" className="mt-3" icon={RefreshCw} onClick={loadInvoices}>Retry</Button>
        </div>
      ) : invoices.outstanding > 0 ? (
        <>
          <p className="g-label text-(--g-text-muted)">Outstanding</p>
          <Money amount={invoices.outstanding} size="lg" className="block text-(--g-text) mt-1" />
          {dueInvoices.length > 0 && (
            <ul className="mt-4 divide-y divide-(--g-border)">
              {dueInvoices.slice(0, 3).map((inv) => (
                <li key={inv._id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="g-small text-(--g-text-muted) truncate">{inv.invoiceId || 'Invoice'}</span>
                  <Money amount={inv.balance} size="sm" className="text-(--g-text)" />
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button variant="secondary" onClick={() => navigate('/guest-dashboard/billing')}>View Bill</Button>
            <Button icon={CreditCard} onClick={() => navigate('/guest-dashboard/billing?status=pending')}>Pay Now</Button>
          </div>
        </>
      ) : (
        <>
          <p className="flex items-center gap-2 g-body-strong text-(--g-success-text)">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            All settled
          </p>
          <p className="g-small text-(--g-text-muted) mt-1">You have no outstanding balance.</p>
          <Button variant="secondary" className="w-full mt-4" onClick={() => navigate('/guest-dashboard/billing')}>View Bill</Button>
        </>
      )}
    </section>
  );

  const orders = (
    <section aria-labelledby="dash-orders-title" className={CARD}>
      <SectionHeader
        title={<span id="dash-orders-title">Active orders</span>}
        action={activeOrderCount > MAX_ACTIVE_ORDERS && (
          <LinkButton onClick={() => navigate('/guest-dashboard/room-service')}>View all ({activeOrderCount})</LinkButton>
        )}
      />
      {activeOrders.length === 0 ? (
        <div className="text-center py-6">
          <ShoppingBag className="w-8 h-8 mx-auto text-(--g-text-muted)" aria-hidden="true" />
          <p className="g-body-strong text-(--g-text) mt-2">No active orders</p>
          <p className="g-small text-(--g-text-muted) mt-0.5">Hungry? Room service is a tap away.</p>
          {activeBooking && (
            <Button className="mt-4" icon={UtensilsCrossed} onClick={() => navigate('/guest-dashboard/room-service')}>Order Food</Button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {activeOrders.slice(0, MAX_ACTIVE_ORDERS).map((order) => {
            const status = String(order.status).toLowerCase();
            const progress = ORDER_PROGRESS[status] ?? 20;
            return (
              <li key={order._id} className="rounded-(--g-radius-md) border border-(--g-border) p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="g-body-strong text-(--g-text)">Order #{order.orderNumber ?? '—'}</p>
                    <p className="g-small text-(--g-text-muted) mt-0.5 capitalize">
                      {orderTypeLabel(order.orderType)} · <Money amount={order.totalPrice} />
                    </p>
                  </div>
                  <StatusBadge domain="order" status={order.status} />
                </div>
                <div
                  role="progressbar"
                  aria-label={`Order #${order.orderNumber ?? ''} progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  className="mt-3 h-1.5 rounded-full bg-(--g-surface-sunken) overflow-hidden"
                >
                  <div className="h-full rounded-full bg-(--g-primary) transition-[width] duration-150 ease-out" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="secondary" className="flex-1" onClick={() => navigate('/guest-dashboard/room-service')}>Track</Button>
                  {CANCELLABLE_STATUSES.includes(status) && (
                    <Button variant="dangerOutline" className="flex-1" onClick={() => setCancelOrder(order)}>Cancel</Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  const quickActions = (
    <section aria-labelledby="dash-actions-title" className={CARD}>
      <SectionHeader title={<span id="dash-actions-title">Quick actions</span>} />
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Order Food', icon: UtensilsCrossed, to: '/guest-dashboard/room-service', tone: 'g-tone-orange' },
          { label: 'Billing', icon: Receipt, to: '/guest-dashboard/billing', tone: 'g-tone-teal' },
          { label: 'My Bookings', icon: CalendarDays, to: '/guest-dashboard/bookings', tone: 'g-tone-sky' },
        ].map(({ label, icon: Icon, to, tone }) => (
          <button
            key={label}
            type="button"
            onClick={() => navigate(to)}
            className="g-lift flex flex-col items-center justify-center gap-2 min-h-[88px] p-3 rounded-(--g-radius-md) border border-(--g-border) bg-(--g-surface) hover:border-(--g-border-strong)"
          >
            <span className={cn('w-10 h-10 rounded-(--g-radius-sm) flex items-center justify-center', tone)}>
              <Icon className="w-5 h-5" aria-hidden="true" />
            </span>
            <span className="g-small font-semibold text-(--g-text) text-center">{label}</span>
          </button>
        ))}
      </div>
    </section>
  );

  const reservations = (
    <section aria-labelledby="dash-upcoming-title" className={CARD}>
      <SectionHeader
        title={<span id="dash-upcoming-title">Upcoming reservations</span>}
        action={upcoming.length > 0 && <LinkButton onClick={() => navigate('/guest-dashboard/bookings?status=upcoming')}>View all</LinkButton>}
      />
      {upcoming.length === 0 ? (
        <p className="g-small text-(--g-text-muted)">No upcoming reservations.</p>
      ) : (
        <ul className="divide-y divide-(--g-border)">
          {upcoming.map((booking) => (
            <li key={booking._id}>
              <button
                type="button"
                onClick={() => navigate('/guest-dashboard/bookings?status=upcoming')}
                className="w-full flex items-center justify-between gap-3 py-3 min-h-[44px] text-left"
              >
                <span className="min-w-0">
                  <span className="block g-body-strong text-(--g-text) truncate">{booking.hotel?.name || 'Reservation'}</span>
                  <span className="block g-small text-(--g-text-muted) guestNum">
                    {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                  </span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <StatusBadge domain="booking" status={booking.status} />
                  <ChevronRight className="w-4 h-4 text-(--g-text-muted)" aria-hidden="true" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const help = (
    <section aria-labelledby="dash-help-title" className={CARD}>
      <SectionHeader title={<span id="dash-help-title">Need help?</span>} />
      <p className="g-small text-(--g-text-muted)">
        Towels, housekeeping, maintenance or anything else — the front desk sees your request instantly.
      </p>
      <Button className="w-full mt-4" icon={MessageSquare} onClick={() => navigate('/guest-dashboard/requests')}>
        Submit a Request
      </Button>
    </section>
  );

  return (
    <div>
      <PullIndicator pull={pull} refreshing={pulling} />
      <p className="sr-only" aria-live="polite">{announcement}</p>

      {isDesktop ? (
        <div className="grid grid-cols-12 gap-6 items-start">
          <div className="col-span-8 space-y-6">
            {hero}
            {stats}
            {orders}
            {reservations}
          </div>
          <div className="col-span-4 space-y-6">
            {bill}
            {quickActions}
            {help}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {hero}
          {stats}
          {bill}
          {orders}
          {quickActions}
          {reservations}
          {help}
        </div>
      )}

      <ExtendStayModal
        isOpen={extendOpen}
        onClose={() => setExtendOpen(false)}
        booking={activeBooking}
        onExtendSuccess={refreshAll}
      />
      <CancelOrderModal
        isOpen={Boolean(cancelOrder)}
        onClose={() => setCancelOrder(null)}
        order={cancelOrder}
        onCancelSuccess={refreshAll}
      />
    </div>
  );
};

export default DashboardView;
