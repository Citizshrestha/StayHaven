import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  Clock3,
  Coffee,
  ConciergeBell,
  CreditCard,
  Loader2,
  Phone,
  ReceiptText,
  Sparkles,
  UtensilsCrossed,
  Waves,
} from 'lucide-react';
import { useSocket } from '../../../../core/context/SocketContext';
import { useTheme } from '../../../../core/hooks/useTheme';
import {
  getDashboardOverview,
  getGuestInvoices,
  getGuestOrders,
  getGuestRequests,
} from '../guestDashboardApi';

const LIGHT_BRAND = {
  primary: '#00BFA6',
  primaryDark: '#00A896',
  background: '#F8FAFB',
  card: '#FFFFFF',
  textPrimary: '#263238',
  textSecondary: '#546E7A',
  border: '#E0E7EB',
};

const DARK_BRAND = {
  primary: '#2DD4BF',
  primaryDark: '#14B8A6',
  background: '#020617',
  card: '#0F172A',
  textPrimary: '#E2E8F0',
  textSecondary: '#94A3B8',
  border: '#1E293B',
};


const formatMoney = (value = 0) => {
  const numeric = Number(value) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(numeric);
};

const formatDate = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatRelativeTime = (value) => {
  if (!value) return 'just now';
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return 'just now';

  const now = Date.now();
  const diffMs = now - target;
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) < 1) return 'just now';
  if (Math.abs(diffMinutes) < 60) return rtf.format(-diffMinutes, 'minute');

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(-diffHours, 'hour');

  const diffDays = Math.round(diffHours / 24);
  return rtf.format(-diffDays, 'day');
};

const normalizeStatusLabel = (status) => {
  if (!status) return 'Updated';
  return status
    .toString()
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const statusStyles = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  preparing: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  ready: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  open: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  inprogress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const formatUpdatedTimeAgo = (dateValue, nowValue) => {
  if (!dateValue) return 'Updated recently';
  const target = new Date(dateValue).getTime();
  if (Number.isNaN(target)) return 'Updated recently';

  const diffMs = nowValue - target;
  if (Math.abs(diffMs) < 15000) return 'Updated just now';

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) < 60) {
    return `Updated ${rtf.format(-diffMinutes, 'minute')}`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return `Updated ${rtf.format(-diffHours, 'hour')}`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return `Updated ${rtf.format(-diffDays, 'day')}`;
  }

  return `Updated ${new Date(target).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`;
};

const getOrderProgress = (status) => {
  if (status === 'pending') return 25;
  if (status === 'confirmed') return 40;
  if (status === 'preparing') return 70;
  if (status === 'ready') return 90;
  if (status === 'delivered') return 100;
  return 0;
};

const DashboardView = () => {
  const navigate = useNavigate();
  const { subscribe, isConnected } = useSocket();
  const { isDark } = useTheme();
  const BRAND = isDark ? DARK_BRAND : LIGHT_BRAND;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showNotifications, setShowNotifications] = useState(false);
  const [realtimeNotifications, setRealtimeNotifications] = useState([]);
  const [billingExpanded, setBillingExpanded] = useState(true);
  const notificationsPanelRef = useRef(null);
  const [dashboardData, setDashboardData] = useState({
    overview: null,
    orders: [],
    invoices: [],
    requests: [],
    outstandingBalance: 0,
  });

  const loadDashboard = useCallback(async (isSoft = false) => {
    try {
      if (isSoft) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [overviewRes, ordersRes, invoicesRes, requestsRes] = await Promise.all([
        getDashboardOverview(),
        getGuestOrders({ limit: 8 }),
        getGuestInvoices({ limit: 5 }),
        getGuestRequests({ limit: 5 }),
      ]);

      const invoices = invoicesRes?.data || [];
      const outstandingFromInvoices = invoices.reduce((sum, invoice) => sum + (Number(invoice?.balance) || 0), 0);

      setDashboardData({
        overview: overviewRes?.data || null,
        orders: ordersRes?.data || [],
        invoices,
        requests: requestsRes?.data || [],
        outstandingBalance: Number(invoicesRes?.outstandingBalance) || outstandingFromInvoices,
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load guest dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshDashboard = useCallback(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  const pushRealtimeNotification = useCallback((notification) => {
    setRealtimeNotifications((prev) => {
      const next = [notification, ...prev].slice(0, 10);
      return next;
    });
  }, []);

  const applyOrderRealtimeUpdate = useCallback((payload) => {
    if (!payload?.orderId && !payload?.orderNumber) {
      return;
    }

    setDashboardData((prev) => {
      const existingOrders = prev.orders || [];
      const index = existingOrders.findIndex((order) => {
        if (payload.orderId && order?._id?.toString() === payload.orderId?.toString()) return true;
        if (payload.orderNumber && Number(order?.orderNumber) === Number(payload.orderNumber)) return true;
        return false;
      });

      let nextOrders = [...existingOrders];

      if (index >= 0) {
        const target = nextOrders[index];
        nextOrders[index] = {
          ...target,
          status: payload.status || target.status,
          updatedAt: payload.updatedAt || new Date().toISOString(),
          totalPrice: payload.totalPrice ?? target.totalPrice,
          items: payload.items || target.items,
        };
      } else {
        nextOrders = [
          {
            _id: payload.orderId || `realtime-${payload.orderNumber || Date.now()}`,
            orderNumber: payload.orderNumber,
            status: payload.status || 'pending',
            totalPrice: payload.totalPrice || 0,
            items: payload.items || [],
            orderType: payload.orderType || 'roomService',
            roomNumber: payload.roomNumber,
            tableNumber: payload.tableNumber,
            createdAt: payload.updatedAt || new Date().toISOString(),
            updatedAt: payload.updatedAt || new Date().toISOString(),
          },
          ...nextOrders,
        ];
      }

      return {
        ...prev,
        orders: nextOrders,
      };
    });
  }, []);

  const onRealtimeOrderPlaced = useCallback((payload) => {
    toast.success(`Order #${payload?.orderNumber || '--'} placed successfully`);
    pushRealtimeNotification({
      id: `rt-order-placed-${payload?.orderId || payload?._id || payload?.orderNumber || Date.now()}`,
      title: `Order #${payload?.orderNumber || '--'} has been placed`,
      subtitle: 'We sent it to the kitchen.',
      time: payload?.createdAt || new Date().toISOString(),
      category: 'order',
      unread: true,
    });
    applyOrderRealtimeUpdate(payload);
    refreshDashboard();
  }, [applyOrderRealtimeUpdate, pushRealtimeNotification, refreshDashboard]);

  const onRealtimeOrderStatus = useCallback((payload) => {
    const statusLabel = normalizeStatusLabel(payload?.status || 'updated');
    toast.info(`Order #${payload?.orderNumber || '--'} is now ${statusLabel}`);
    pushRealtimeNotification({
      id: `rt-order-status-${payload?.orderId || payload?.orderNumber || Date.now()}-${payload?.updatedAt || Date.now()}`,
      title: `Order #${payload?.orderNumber || '--'} is ${statusLabel}`,
      subtitle: payload?.updatedBy ? `Updated by ${payload.updatedBy}` : 'Status changed in real time',
      time: payload?.updatedAt || new Date().toISOString(),
      category: 'status',
      unread: true,
    });
    applyOrderRealtimeUpdate(payload);
  }, [applyOrderRealtimeUpdate, pushRealtimeNotification]);

  const onRealtimePayment = useCallback((payload) => {
    toast.success(`Payment confirmed • ${payload?.transactionId || 'success'}`);
    pushRealtimeNotification({
      id: `rt-payment-${payload?.transactionId || Date.now()}`,
      title: 'Payment confirmed',
      subtitle: payload?.amount ? `${formatMoney(payload.amount)} received` : 'Your payment was successful',
      time: new Date().toISOString(),
      category: 'payment',
      unread: true,
    });
    refreshDashboard();
  }, [pushRealtimeNotification, refreshDashboard]);

  const onRealtimeBillReceived = useCallback((payload) => {
    const orderNum = payload?.orderNumber || '--';
    const total = payload?.billData?.total || 0;
    toast.info(`📄 Bill received for Order #${orderNum}`, {
      autoClose: 5000,
    });
    pushRealtimeNotification({
      id: `rt-bill-${payload?.orderId || Date.now()}`,
      title: `Bill Ready - Order #${orderNum}`,
      subtitle: `Total: Rs. ${total.toLocaleString()} • Please make payment`,
      time: new Date().toISOString(),
      category: 'billing',
      unread: true,
    });
    refreshDashboard();
  }, [pushRealtimeNotification, refreshDashboard]);

  useEffect(() => {
    if (!subscribe || !isConnected) return;
    const unsubPlaced = subscribe('order-placed', onRealtimeOrderPlaced);
    const unsubStatus = subscribe('order-status-update', onRealtimeOrderStatus);
    const unsubStatusLegacy = subscribe('order-status-updated', onRealtimeOrderStatus);
    const unsubPayment = subscribe('payment-confirmed', onRealtimePayment);
    const unsubBill = subscribe('bill-received', onRealtimeBillReceived);
    return () => {
      unsubPlaced();
      unsubStatus();
      unsubStatusLegacy();
      unsubPayment();
      unsubBill();
    };
  }, [subscribe, isConnected, onRealtimeOrderPlaced, onRealtimeOrderStatus, onRealtimePayment, onRealtimeBillReceived]);

  useEffect(() => {
    if (!showNotifications) return;

    const handleOutsideClick = (event) => {
      if (notificationsPanelRef.current && !notificationsPanelRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [showNotifications]);

  const overview = dashboardData.overview || {};
  const activeBooking = overview.activeBooking;
  const upcomingBookings = overview.upcomingBookings || [];
  const orders = dashboardData.orders;
  const invoices = dashboardData.invoices;
  const requests = dashboardData.requests;

  const activeOrders = useMemo(
    () => orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).slice(0, 5),
    [orders]
  );

  const notifications = useMemo(() => {
    const liveNotifications = realtimeNotifications.map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      time: item.time,
      unread: item.unread,
      category: item.category,
      source: 'live',
    }));

    const orderNotifications = orders.slice(0, 3).map((order) => ({
      id: `order-${order._id}`,
      title: `Order #${order.orderNumber} is ${normalizeStatusLabel(order.status)}`,
      subtitle: `${order.items?.length || 0} item${(order.items?.length || 0) === 1 ? '' : 's'} • ${formatMoney(order.totalPrice)}`,
      time: order.updatedAt || order.createdAt,
      unread: ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status),
      category: 'order',
      source: 'snapshot',
    }));

    const requestNotifications = requests.slice(0, 2).map((request) => ({
      id: `request-${request._id}`,
      title: `${request.category} request is ${normalizeStatusLabel(request.status)}`,
      subtitle: request.description || 'Guest request update',
      time: request.updatedAt || request.createdAt,
      unread: request.status !== 'resolved',
      category: 'request',
      source: 'snapshot',
    }));

    const merged = [...liveNotifications, ...orderNotifications, ...requestNotifications]
      .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
      .reduce((acc, item) => {
        if (!acc.some((existing) => existing.id === item.id)) {
          acc.push(item);
        }
        return acc;
      }, []);

    return merged.slice(0, 8);
  }, [orders, realtimeNotifications, requests]);

  const unreadNotifications = notifications.filter((item) => item.unread).length;

  const stayCountdownText = activeBooking?.nightsLeft
    ? `Check-out in ${activeBooking.nightsLeft} day${activeBooking.nightsLeft > 1 ? 's' : ''}`
    : 'No active booking';

  const quickActions = [
    { label: 'Order Food', icon: UtensilsCrossed, onClick: () => navigate('/guest-dashboard/room-service') },
    { label: 'View Menu', icon: Coffee, onClick: () => navigate('/guest-dashboard/room-service') },
    { label: 'Billing', icon: CreditCard, onClick: () => navigate('/guest-dashboard/billing') },
    { label: 'My Bookings', icon: CalendarDays, onClick: () => navigate('/guest-dashboard/bookings') },
  ];

  const serviceTiles = [
    { label: 'Menu', icon: UtensilsCrossed, action: () => navigate('/guest-dashboard/room-service') },
    { label: 'Housekeeping', icon: Sparkles, action: () => navigate('/guest-dashboard/requests') },
    { label: 'Valet Parking', icon: ConciergeBell, action: () => navigate('/guest-dashboard/requests') },
    { label: 'Spa Booking', icon: Waves, action: () => navigate('/guest-dashboard/bookings') },
    { label: 'Pool & Gym', icon: Coffee, action: () => navigate('/guest-dashboard/bookings') },
    { label: 'Concierge', icon: Phone, action: () => navigate('/guest-dashboard/requests') },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BRAND.background }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: BRAND.primary }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: BRAND.background }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-8 space-y-6">
        <section
          className="rounded-2xl p-5 md:p-7 text-white shadow-lg relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #00BFA6, #00E5CC)',
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold drop-shadow-sm">
                Welcome back, {activeBooking?.hotel?.name || 'Guest'} 👋
              </h1>
              <p className="text-sm md:text-base text-white/90 mt-1">
                Enjoy your stay • Room {activeBooking?.room?.roomNumber || '--'} • {stayCountdownText}
              </p>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((prev) => !prev)}
                className="h-11 w-11 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center hover:bg-white/30 transition"
              >
                <Bell size={19} />
              </button>
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full px-1 text-[11px] bg-rose-500 text-white flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}

              {showNotifications && (
                <div
                  ref={notificationsPanelRef}
                  className={`absolute right-0 top-14 w-92 max-h-112 overflow-hidden rounded-2xl shadow-2xl z-30 border backdrop-blur-sm ${isDark ? 'bg-slate-900/95 text-slate-200 border-slate-700' : 'bg-white/95 text-slate-700 border-slate-200'}`}
                >
                  <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-linear-to-r from-teal-50 to-cyan-50'}`}>
                    <div>
                      <p className="font-semibold text-sm">Notifications</p>
                      <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {unreadNotifications} unread • live updates enabled
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRealtimeNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
                      }}
                      className="text-xs text-teal-600 font-medium"
                    >
                      Mark all
                    </button>
                  </div>
                  <div className="max-h-88 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className={`px-4 py-8 text-sm text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No notifications yet.</p>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          className={`px-4 py-3 border-b transition flex items-start gap-3 ${isDark ? 'border-slate-800 hover:bg-slate-800/60' : 'border-slate-100 hover:bg-slate-50'}`}
                        >
                          <div className="pt-0.5">
                            {item.unread ? <span className="w-2.5 h-2.5 rounded-full bg-teal-500 block shadow" /> : <span className="w-2.5 h-2.5 rounded-full bg-slate-300/40 block" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm leading-5 ${item.unread ? 'font-semibold' : 'font-medium'}`}>{item.title}</p>
                              <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                                {item.category || 'update'}
                              </span>
                            </div>

                            {item.subtitle && (
                              <p className={`text-xs mt-0.5 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {item.subtitle}
                              </p>
                            )}

                            <p className={`text-[11px] mt-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              {formatRelativeTime(item.time)} • {formatDateTime(item.time)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <GlassInfo title="Check-in" value={formatDate(activeBooking?.checkIn)} />
            <GlassInfo title="Check-out" value={formatDate(activeBooking?.checkOut)} />
            <GlassInfo title="Nights" value={String(activeBooking?.nightsLeft || 0)} />
            <button
              type="button"
              onClick={() => navigate('/guest-dashboard/bookings')}
              className="rounded-xl bg-white text-teal-700 font-semibold text-sm h-21 hover:bg-teal-50 transition border border-white/50"
            >
              Extend Stay
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <StatsCard
              icon={UtensilsCrossed}
              title="Menu Orders"
              value={overview.pendingOrdersCount || 0}
              subtitle="Pending"
              tone="text-teal-600"
              cta="View All"
              brand={BRAND}
              onClick={() => navigate('/guest-dashboard/room-service')}
            />
          </div>
          <div>
            <StatsCard
              icon={CalendarDays}
              title="My Bookings"
              value={upcomingBookings.length}
              subtitle="Upcoming"
              tone="text-blue-600"
              cta="Manage"
              brand={BRAND}
              onClick={() => navigate('/guest-dashboard/bookings')}
            />
          </div>
          <div>
            <StatsCard
              icon={Clock3}
              title="Total Stays"
              value={overview.pastBookingsCount || 0}
              subtitle="Completed"
              tone="text-violet-600"
              cta="History"
              brand={BRAND}
              onClick={() => navigate('/guest-dashboard/bookings')}
            />
          </div>
        </section>

        <SectionCard title="Quick Actions" brand={BRAND}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {quickActions.map((action) => (
              <QuickActionCard
                key={action.label}
                label={action.label}
                icon={action.icon}
                brand={BRAND}
                onClick={action.onClick}
              />
            ))}
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-5">
          <div className="xl:col-span-2 space-y-4">
            <SectionCard title="Hotel Services" brand={BRAND}>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {serviceTiles.map((tile) => (
                  <button
                    key={tile.label}
                    type="button"
                    onClick={tile.action}
                    className="rounded-xl border p-4 text-left transition-all hover:-translate-y-1 hover:shadow-lg"
                    style={{ borderColor: BRAND.border, background: BRAND.card }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-teal-50 text-teal-600">
                      <tile.icon size={18} />
                    </div>
                    <p className="font-semibold text-sm" style={{ color: BRAND.textPrimary }}>{tile.label}</p>
                    <span className="text-xs text-teal-600 font-medium inline-flex items-center gap-1 mt-1">
                      Open <ChevronRight size={14} />
                    </span>
                  </button>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Active Orders"
              brand={BRAND}
              rightAction={
                <button
                  type="button"
                  className="text-sm text-teal-600 font-medium hover:underline"
                  onClick={() => navigate('/guest-dashboard/room-service')}
                >
                  View All
                </button>
              }
            >
              {activeOrders.length === 0 ? (
                <EmptyState text="No active orders right now." brand={BRAND} />
              ) : (
                <div className="space-y-3">
                  {activeOrders.map((order) => {
                    const status = order.status?.toLowerCase();
                    const progress = getOrderProgress(status);
                    const updatedAgoText = formatUpdatedTimeAgo(order.updatedAt || order.createdAt, now);
                    return (
                      <div
                        key={order._id}
                        className="rounded-xl border p-4"
                        style={{ borderColor: BRAND.border, background: BRAND.card }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-sm" style={{ color: BRAND.textPrimary }}>
                              Order #{order.orderNumber} • {formatMoney(order.totalPrice)}
                            </p>
                            <p className="text-xs mt-1" style={{ color: BRAND.textSecondary }}>
                              {order.orderType === 'roomService' ? 'Room Service' : order.orderType} • {order.items?.length || 0} items
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusStyles[status] || 'bg-slate-100 text-slate-600'}`}>
                            {status}
                          </span>
                        </div>

                        {(status === 'preparing' || status === 'confirmed' || status === 'pending') && (
                          <div className="mt-3">
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#00BFA6,#00E5CC)' }}
                              />
                            </div>
                            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{updatedAgoText}</p>
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-4 text-xs">
                          <button
                            type="button"
                            className="text-teal-600 font-semibold hover:underline"
                            onClick={() => navigate('/guest-dashboard/room-service')}
                          >
                            Track Order
                          </button>
                          {status !== 'delivered' && status !== 'cancelled' && (
                            <span className="text-rose-600 font-semibold">Cancel (soon)</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-4">
            <SectionCard title="Your Schedule" brand={BRAND}>
              {upcomingBookings.length === 0 ? (
                <EmptyState text="No upcoming reservations." brand={BRAND} />
              ) : (
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <div key={booking._id} className="rounded-xl border p-3" style={{ borderColor: BRAND.border }}>
                      <p className="text-sm font-semibold" style={{ color: BRAND.textPrimary }}>
                        {booking.hotel?.name || 'Reservation'}
                      </p>
                      <p className="text-xs mt-1" style={{ color: BRAND.textSecondary }}>
                        {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} • Room {booking.room?.roomNumber || '--'}
                      </p>
                      <div className="flex gap-3 mt-2 text-xs text-teal-600 font-medium">
                        <button type="button" onClick={() => navigate('/guest-dashboard/bookings')} className="hover:underline">View</button>
                        <button type="button" onClick={() => navigate('/guest-dashboard/bookings')} className="hover:underline">Modify</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Need Help?" brand={BRAND}>
              <div className="space-y-2 text-sm" style={{ color: BRAND.textSecondary }}>
                <p>📞 Front Desk: Ext 0</p>
                <p>🍽️ Room Service: Ext 5</p>
                <p>🔧 Maintenance: Ext 8</p>
                <p>🚨 Emergency: Ext 9</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  type="button"
                  className="h-10 rounded-lg border text-sm font-semibold"
                  style={{ borderColor: BRAND.border, color: BRAND.primaryDark }}
                  onClick={() => navigate('/guest-dashboard/requests')}
                >
                  Live Chat
                </button>
                <button
                  type="button"
                  className="h-10 rounded-lg text-sm font-semibold text-white"
                  style={{ background: BRAND.primary }}
                  onClick={() => navigate('/guest-dashboard/requests')}
                >
                  Call Now
                </button>
              </div>
            </SectionCard>

            <SectionCard
              title="Your Bill"
              brand={BRAND}
              rightAction={
                <button
                  type="button"
                  className="text-sm text-teal-600 font-medium"
                  onClick={() => setBillingExpanded((prev) => !prev)}
                >
                  {billingExpanded ? 'Hide' : 'Show'}
                </button>
              }
            >
              <p className="text-2xl font-bold mb-3" style={{ color: BRAND.textPrimary }}>
                {formatMoney(dashboardData.outstandingBalance)}
              </p>
              {billingExpanded && (
                <div className="space-y-2 text-sm">
                  {invoices.length === 0 ? (
                    <EmptyState text="No invoice data available." compact brand={BRAND} />
                  ) : (
                    invoices.slice(0, 3).map((invoice) => (
                      <div key={invoice._id} className="flex items-center justify-between" style={{ color: BRAND.textSecondary }}>
                        <span>{invoice.invoiceId || 'Invoice'}</span>
                        <span>{formatMoney(invoice.balance || invoice.paid || 0)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  type="button"
                  className="h-10 rounded-lg border text-sm font-semibold"
                  style={{ borderColor: BRAND.border, color: BRAND.primaryDark }}
                  onClick={() => navigate('/guest-dashboard/billing')}
                >
                  Detailed Bill
                </button>
                <button
                  type="button"
                  className="h-10 rounded-lg text-sm font-semibold text-white"
                  style={{ background: BRAND.primary }}
                  onClick={() => navigate('/guest-dashboard/billing')}
                >
                  Pay Now
                </button>
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={refreshDashboard}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold disabled:opacity-60"
            style={{ borderColor: BRAND.border, color: BRAND.primaryDark, background: BRAND.card }}
          >
            {refreshing ? <Loader2 size={16} className="animate-spin" /> : <ReceiptText size={16} />}
            Refresh dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

const GlassInfo = ({ title, value }) => (
  <div className="h-21 rounded-xl bg-white/15 border border-white/35 backdrop-blur-sm px-3 py-2.5">
    <p className="text-xs text-white/80">{title}</p>
    <p className="text-lg font-semibold mt-2">{value}</p>
  </div>
);

const SectionCard = ({ title, rightAction, children, brand }) => (
  <div
    className="rounded-2xl p-4 md:p-5 border shadow-sm"
    style={{
      background: brand.card,
      borderColor: brand.border,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}
  >
    <div className="flex items-center justify-between gap-2 mb-4">
      <h2 className="text-lg font-semibold" style={{ color: brand.textPrimary }}>{title}</h2>
      {rightAction || null}
    </div>
    {children}
  </div>
);

const StatsCard = ({ icon: Icon, title, value, subtitle, tone, cta, onClick, brand }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-left rounded-2xl border p-5 transition-all hover:-translate-y-1"
    style={{
      background: brand.card,
      borderColor: brand.border,
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    }}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold" style={{ color: brand.textPrimary }}>{title}</p>
        <p className="text-4xl font-bold mt-2" style={{ color: brand.primary }}>{value}</p>
        <p className="text-sm mt-1" style={{ color: brand.textSecondary }}>{subtitle}</p>
      </div>
      <div className={`w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center ${tone}`}>
        {React.createElement(Icon, { size: 22 })}
      </div>
    </div>
    <span className="text-xs text-teal-600 font-semibold inline-flex items-center gap-1 mt-4">
      {cta} <ChevronRight size={14} />
    </span>
  </button>
);

const QuickActionCard = ({ label, icon: Icon, onClick, brand }) => (
  <button
    type="button"
    onClick={onClick}
    className="h-30 md:h-35 rounded-2xl border p-3 md:p-4 flex flex-col items-center justify-center gap-3 transition-all group hover:-translate-y-1 hover:shadow-xl"
    style={{
      borderColor: brand.border,
      background: brand.card,
    }}
  >
    <div className="w-14 h-14 rounded-full bg-linear-to-br from-teal-500 to-cyan-400 text-white flex items-center justify-center group-hover:rotate-6 group-hover:scale-110 transition-all duration-300">
      {React.createElement(Icon, { size: 24 })}
    </div>
    <p className="text-sm font-semibold text-center" style={{ color: brand.textPrimary }}>{label}</p>
  </button>
);

const EmptyState = ({ text, compact = false, brand }) => (
  <div className={`rounded-xl border border-dashed flex items-center gap-2 ${compact ? 'p-3' : 'p-4'}`} style={{ borderColor: brand.border }}>
    <CircleAlert size={16} className="text-slate-400" />
    <p className="text-sm" style={{ color: brand.textSecondary }}>{text}</p>
  </div>
);

export default DashboardView;
