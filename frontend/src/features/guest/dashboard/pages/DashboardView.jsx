import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  Phone,
  RefreshCw,
  ShoppingBag,
  UtensilsCrossed,
  BookOpen,
  AlertTriangle,
  Wrench,
} from 'lucide-react';
import { useSocket } from '../../../../core/context/SocketContext';
import {
  getDashboardOverview,
  getGuestInvoices,
  getGuestOrders,
  getGuestRequests,
} from '../guestDashboardApi';
import ExtendStayModal from '../../../../shared/components/ExtendStayModal';
import CancelOrderModal from '../../../../shared/components/CancelOrderModal';
import NoBookingsModal from '../../../../shared/components/NoBookingsModal';
import notificationSoundService from '../../../../services/notificationSoundService';
import styles from './DashboardView.module.css';

const formatMoney = (value = 0) => {
  const numeric = Number(value) || 0;
  const formatted = new Intl.NumberFormat('en-NP', {
    maximumFractionDigits: 0,
  }).format(numeric);
  return `Nrs ${formatted}`;
};

const formatDate = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const normalizeStatusLabel = (status) => {
  if (!status) return 'Updated';
  return status
    .toString()
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const statusStyles = {
  pending: { bg: '#fef3c7', color: '#d97706' },
  confirmed: { bg: '#dbeafe', color: '#2563eb' },
  preparing: { bg: '#fed7aa', color: '#ea580c' },
  ready: { bg: '#e0f2fe', color: '#0284c7' },
  delivered: { bg: '#d1fae5', color: '#059669' },
  cancelled: { bg: '#fee2e2', color: '#dc2626' },
  paid: { bg: '#d1fae5', color: '#059669' },
  open: { bg: '#fef3c7', color: '#d97706' },
  inprogress: { bg: '#dbeafe', color: '#2563eb' },
  resolved: { bg: '#d1fae5', color: '#059669' },
};

const DashboardView = () => {
  const navigate = useNavigate();
  const { subscribe, isConnected } = useSocket();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [billingExpanded, setBillingExpanded] = useState(true);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showNoBookingsModal, setShowNoBookingsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
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
    notificationSoundService.play('order');
    applyOrderRealtimeUpdate(payload);
    refreshDashboard();
  }, [applyOrderRealtimeUpdate, refreshDashboard]);

  const onRealtimeOrderStatus = useCallback((payload) => {
    const statusLabel = normalizeStatusLabel(payload?.status || 'updated');
    toast.info(`Order #${payload?.orderNumber || '--'} is now ${statusLabel}`);
    notificationSoundService.play('notification');
    applyOrderRealtimeUpdate(payload);
  }, [applyOrderRealtimeUpdate]);

  const onRealtimePayment = useCallback((payload) => {
    toast.success(`Payment confirmed • ${payload?.transactionId || 'success'}`);
    notificationSoundService.play('notification');
    refreshDashboard();
  }, [refreshDashboard]);

  const onRealtimeBillReceived = useCallback((payload) => {
    const orderNum = payload?.orderNumber || '--';
    toast.info(`📄 Bill received for Order #${orderNum}`, {
      autoClose: 5000,
    });
    notificationSoundService.play('notification');
    refreshDashboard();
  }, [refreshDashboard]);

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

  const overview = dashboardData.overview || {};
  const activeBooking = overview.activeBooking;
  const upcomingBookings = overview.upcomingBookings || [];
  const orders = dashboardData.orders;
  const invoices = dashboardData.invoices;

  const activeOrders = useMemo(
    () => orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).slice(0, 5),
    [orders]
  );

  const nightsLeft = activeBooking?.nightsLeft || 0;
  const isUrgent = nightsLeft <= 1;

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* SECTION 1 — HERO WELCOME CARD */}
        <section className={styles.heroCard}>
          <div className={styles.heroContent}>
            <div className={styles.heroTop}>
              <div>
                <p className={styles.heroGreeting}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},</p>
                <h1 className={styles.heroName}>{localStorage.getItem('username') || 'Guest'}</h1>
                <p className={styles.heroStayInfo}>
                  {activeBooking?.hotel?.name ? `${activeBooking.hotel.name} • ` : ''}Room {activeBooking?.room?.roomNumber || '--'} • {nightsLeft > 0 ? `Check-out in ${nightsLeft} day${nightsLeft > 1 ? 's' : ''}` : 'No active booking'}
                  {isUrgent && nightsLeft > 0 && (
                    <span className={styles.countdownPill}>
                      ⚠ {nightsLeft} day left
                    </span>
                  )}
                </p>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={refreshDashboard}
                disabled={refreshing}
                title={`Last updated ${Math.floor((now - Date.now()) / 60000) === 0 ? 'just now' : `${Math.floor((Date.now() - now) / 60000)} min ago`}`}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: refreshing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!refreshing) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                <RefreshCw
                  size={18}
                  color="white"
                  style={{
                    animation: refreshing ? 'spin 1s linear infinite' : 'none',
                  }}
                />
              </button>
            </div>

            <div className={styles.dateCardsRow}>
              <div className={styles.dateCard}>
                <p className={styles.dateLabel}>Check-in</p>
                <p className={styles.dateValue}>{formatDate(activeBooking?.checkIn)}</p>
              </div>
              <div className={styles.dateCard}>
                <p className={styles.dateLabel}>Check-out</p>
                <p className={styles.dateValue}>{formatDate(activeBooking?.checkOut)}</p>
              </div>
              <div className={styles.dateCard}>
                <p className={styles.dateLabel}>Nights</p>
                <p className={styles.dateValue}>{nightsLeft || 0}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowExtendModal(true)}
              className={`${styles.extendButton} ${isUrgent ? styles.urgent : ''}`}
            >
              Extend Stay
            </button>
          </div>
        </section>

        {/* SECTION 2 — STAT CARDS ROW */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard} onClick={() => navigate('/guest-dashboard/room-service')}>
            <div className={styles.statTop}>
              <span className={styles.statLabel}>Menu Orders</span>
              <div className={`${styles.statIcon} ${styles.teal}`}>
                <UtensilsCrossed size={16} />
              </div>
            </div>
            <p className={`${styles.statNumber} ${styles.teal}`}>{overview.pendingOrdersCount || 0}</p>
            <p className={styles.statSubtitle}>Pending</p>
            <span className={styles.statLink}>
              View All →
            </span>
          </div>

          <div className={styles.statCard} onClick={() => navigate('/guest-dashboard/bookings')}>
            <div className={styles.statTop}>
              <span className={styles.statLabel}>My Bookings</span>
              <div className={`${styles.statIcon} ${styles.purple}`}>
                <CalendarDays size={16} />
              </div>
            </div>
            <p className={`${styles.statNumber} ${styles.purple}`}>{upcomingBookings.length}</p>
            <p className={styles.statSubtitle}>Upcoming</p>
            <span className={styles.statLink}>
              Manage →
            </span>
          </div>

          <div className={styles.statCard} onClick={() => navigate('/guest-dashboard/bookings')}>
            <div className={styles.statTop}>
              <span className={styles.statLabel}>Total Stays</span>
              <div className={`${styles.statIcon} ${styles.blue}`}>
                <Clock size={16} />
              </div>
            </div>
            <p className={`${styles.statNumber} ${styles.blue}`}>{overview.pastBookingsCount || 0}</p>
            <p className={styles.statSubtitle}>Completed</p>
            <span className={styles.statLink}>
              History →
            </span>
          </div>
        </div>

        {/* SECTION 3 — QUICK ACTIONS */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
          <div className={styles.quickActionsGrid}>
            <div className={styles.actionCard} onClick={() => navigate('/guest-dashboard/room-service')}>
              <div className={`${styles.actionIcon} ${styles.teal}`}>
                <UtensilsCrossed size={24} />
              </div>
              <p className={styles.actionLabel}>Order Food</p>
            </div>

            <div className={styles.actionCard} onClick={() => navigate('/guest-dashboard/room-service')}>
              <div className={`${styles.actionIcon} ${styles.orange}`}>
                <BookOpen size={24} />
              </div>
              <p className={styles.actionLabel}>View Menu</p>
            </div>

            <div className={styles.actionCard} onClick={() => navigate('/guest-dashboard/billing')}>
              <div className={`${styles.actionIcon} ${styles.green}`}>
                <CreditCard size={24} />
              </div>
              <p className={styles.actionLabel}>Billing</p>
            </div>

            <div className={styles.actionCard} onClick={() => navigate('/guest-dashboard/bookings')}>
              <div className={`${styles.actionIcon} ${styles.purple}`}>
                <CalendarDays size={24} />
              </div>
              <p className={styles.actionLabel}>My Bookings</p>
            </div>
          </div>
        </section>

        {/* SECTION 4 — ACTIVE ORDERS */}
        <section className={`${styles.card} ${styles.section}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Active Orders</h2>
            <button
              type="button"
              className={styles.viewAllLink}
              onClick={() => navigate('/guest-dashboard/room-service')}
            >
              View All
            </button>
          </div>

          {activeOrders.length === 0 ? (
            <div className={styles.emptyState}>
              <ShoppingBag className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No active orders</p>
              <p className={styles.emptySubtitle}>Order food or request services below</p>
              <button
                type="button"
                className={styles.emptyButton}
                onClick={() => navigate('/guest-dashboard/room-service')}
              >
                Order Food
              </button>
            </div>
          ) : (
            <div className={styles.ordersList}>
              {activeOrders.map((order) => {
                const status = order.status?.toLowerCase();
                const statusStyle = statusStyles[status] || { bg: '#f1f5f9', color: '#64748b' };
                return (
                  <div key={order._id} className={styles.orderCard}>
                    <div className={styles.orderTop}>
                      <div className={styles.orderInfo}>
                        <p className={styles.orderTitle}>
                          Order #{order.orderNumber} • {formatMoney(order.totalPrice)}
                        </p>
                        <p className={styles.orderMeta}>
                          {order.orderType === 'roomService' ? 'Room Service' : order.orderType} • {order.items?.length || 0} items
                        </p>
                      </div>
                      <span
                        className={styles.statusBadge}
                        style={{ background: statusStyle.bg, color: statusStyle.color }}
                      >
                        {status}
                      </span>
                    </div>

                    <div className={styles.orderActions}>
                      <button
                        type="button"
                        className={`${styles.orderActionBtn} ${styles.primary}`}
                        onClick={() => navigate('/guest-dashboard/room-service')}
                      >
                        Track Order
                      </button>
                      {(status === 'pending' || status === 'confirmed') && (
                        <button
                          type="button"
                          className={`${styles.orderActionBtn} ${styles.danger}`}
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowCancelModal(true);
                          }}
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 5 — YOUR BILL */}
        <section className={`${styles.billCard} ${styles.section}`}>
          <div className={styles.billHeader} onClick={() => setBillingExpanded((prev) => !prev)}>
            <div className={styles.billHeaderLeft}>
              <h2 className={styles.billTitle}>Your Bill</h2>
              <p className={styles.billSubtitle}>Tap to {billingExpanded ? 'collapse' : 'expand'}</p>
            </div>
            <span className={`${styles.billChevron} ${billingExpanded ? styles.expanded : ''}`}>▾</span>
          </div>

          <p className={styles.billAmount}>{formatMoney(dashboardData.outstandingBalance)}</p>

          {billingExpanded && (
            <div className={styles.billItems}>
              {invoices.length === 0 ? (
                <p className={styles.billItem}>No invoice data available.</p>
              ) : (
                invoices.slice(0, 3).map((invoice) => (
                  <div key={invoice._id} className={styles.billItem}>
                    <span>{invoice.invoiceId || 'Invoice'}</span>
                    <span>{formatMoney(invoice.balance || invoice.paid || 0)}</span>
                  </div>
                ))
              )}
            </div>
          )}

          <div className={styles.billButtons}>
            <button
              type="button"
              className={`${styles.billButton} ${styles.outline}`}
              onClick={() => navigate('/guest-dashboard/billing')}
            >
              View Bill
            </button>
            <button
              type="button"
              className={`${styles.billButton} ${styles.primary}`}
              onClick={() => navigate('/guest-dashboard/billing')}
            >
              Pay Now
            </button>
          </div>
        </section>

        {/* SECTION 6 — UPCOMING RESERVATIONS */}
        <section className={`${styles.card} ${styles.section}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Upcoming Reservations</h2>
          </div>

          {upcomingBookings.length === 0 ? (
            <div className={styles.emptyState}>
              <CalendarDays className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No upcoming reservations</p>
            </div>
          ) : (
            <div className={styles.reservationsList}>
              {upcomingBookings.map((booking) => (
                <div key={booking._id} className={styles.reservationCard}>
                  <p className={styles.reservationName}>{booking.hotel?.name || 'Reservation'}</p>
                  <div className={styles.reservationDates}>
                    <span>{formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}</span>
                    <span className={styles.roomBadge}>Room {booking.room?.roomNumber || 'TBA'}</span>
                  </div>
                  <div className={styles.reservationActions}>
                    <button
                      type="button"
                      className={`${styles.reservationBtn} ${styles.primary}`}
                      onClick={() => navigate('/guest-dashboard/bookings')}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className={`${styles.reservationBtn} ${styles.secondary}`}
                      onClick={() => navigate('/guest-dashboard/bookings')}
                    >
                      Modify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 7 — NEED HELP */}
        <section className={`${styles.card} ${styles.section}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Need Help?</h2>
          </div>

          <div className={styles.helpList}>
            <div className={styles.helpItem}>
              <div className={`${styles.helpIcon} ${styles.teal}`}>
                <Phone size={16} />
              </div>
              <div className={styles.helpInfo}>
                <p className={styles.helpLabel}>Front Desk</p>
                <p className={styles.helpExt}>Ext 0</p>
              </div>
            </div>

            <div className={styles.helpItem}>
              <div className={`${styles.helpIcon} ${styles.orange}`}>
                <UtensilsCrossed size={16} />
              </div>
              <div className={styles.helpInfo}>
                <p className={styles.helpLabel}>Room Service</p>
                <p className={styles.helpExt}>Ext 5</p>
              </div>
            </div>

            <div className={styles.helpItem}>
              <div className={`${styles.helpIcon} ${styles.blue}`}>
                <Wrench size={16} />
              </div>
              <div className={styles.helpInfo}>
                <p className={styles.helpLabel}>Maintenance</p>
                <p className={styles.helpExt}>Ext 8</p>
              </div>
            </div>

            <div className={styles.helpItem}>
              <div className={`${styles.helpIcon} ${styles.red}`}>
                <AlertTriangle size={16} />
              </div>
              <div className={styles.helpInfo}>
                <p className={styles.helpLabel}>Emergency</p>
                <p className={styles.helpExt}>Ext 9</p>
              </div>
            </div>
          </div>

          <div className={styles.helpButtons}>
            <button
              type="button"
              className={`${styles.helpButton} ${styles.outline}`}
              onClick={() => navigate('/guest-dashboard/requests')}
            >
              Front Desk
            </button>
            <button
              type="button"
              className={`${styles.helpButton} ${styles.primary}`}
              onClick={() => navigate('/guest-dashboard/requests')}
            >
              Live Chat
            </button>
          </div>
        </section>
      </div>

      {/* Extend Stay Modal */}
      <ExtendStayModal
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        booking={activeBooking}
        onExtendSuccess={() => {
          toast.success('Stay extended successfully!');
          refreshDashboard();
        }}
      />

      {/* Cancel Order Modal */}
      <CancelOrderModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onCancelSuccess={() => {
          toast.success('Order cancelled successfully!');
          refreshDashboard();
        }}
      />

      {/* No Bookings Modal */}
      <NoBookingsModal
        isOpen={showNoBookingsModal}
        onClose={() => setShowNoBookingsModal(false)}
      />
    </div>
  );
};

export default DashboardView;
