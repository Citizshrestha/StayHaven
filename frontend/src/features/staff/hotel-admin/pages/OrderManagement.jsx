import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  ShoppingBag,
  RefreshCw,
  LayoutGrid,
  List,
  UtensilsCrossed,
  BedDouble,
  ShoppingBasket,
  User,
  MapPin,
  Flame,
  X,
} from 'lucide-react';
import { getOrders, updateOrderStatus, cancelOrder } from '../services/orderApi';
import useHotelId from '../hooks/useHotelId';
import {
  PageHeader,
  Button,
  IconButton,
  Badge,
  StatCard,
  StatCardSkeleton,
  SearchInput,
  Select,
  FilterTabs,
  Segmented,
  EmptyState,
  ErrorState,
  Modal,
  Textarea,
} from '../components/ui';
import '../styles/hotel-admin-tokens.css';

/* ─── Status model (shared Badge tones + workflow next-step) ─── */
const STATUS_META = {
  pending:   { label: 'Pending',   tone: 'warning', next: 'confirmed', nextLabel: 'Confirm' },
  confirmed: { label: 'Confirmed', tone: 'info',    next: 'preparing', nextLabel: 'Start Prep' },
  preparing: { label: 'Preparing', tone: 'warning', next: 'ready',     nextLabel: 'Mark Ready' },
  ready:     { label: 'Ready',     tone: 'success', next: 'delivered', nextLabel: 'Deliver' },
  delivered: { label: 'Delivered', tone: 'neutral', next: null,        nextLabel: null },
  cancelled: { label: 'Cancelled', tone: 'danger',  next: null,        nextLabel: null },
};
const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];

const TYPE_META = {
  dineIn:      { label: 'Dine In',      Icon: UtensilsCrossed },
  roomService: { label: 'Room Service', Icon: BedDouble },
  takeaway:    { label: 'Takeaway',     Icon: ShoppingBasket },
};

const CANCEL_REASONS = ['Customer request', 'Item unavailable', 'Duplicate order', 'Kitchen issue', 'Other'];

const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—');
const fmtAgo = (d) => {
  if (!d) return '—';
  const diff = Math.floor((Date.now() - new Date(d)) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return new Date(d).toLocaleDateString();
};
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

const OrderManagement = ({ onActiveCount }) => {
  const hotelId = useHotelId();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState(null);

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [sortBy, setSortBy] = useState('newest');

  const [selOrder, setSelOrder] = useState(null);
  const [cancelId, setCancelId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const intervalRef = useRef(null);
  const setAct = (k, v) => setActionLoading((p) => ({ ...p, [k]: v }));

  const fetchOrders = useCallback(async () => {
    if (!hotelId) {
      setError('No active hotel selected');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const res = await getOrders({ hotelId });
      if (res.data.success) setOrders(res.data.orders || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    fetchOrders();
    intervalRef.current = setInterval(fetchOrders, 30000); // 30s operational auto-poll
    return () => clearInterval(intervalRef.current);
  }, [fetchOrders]);

  const stats = useMemo(() => {
    const by = (s) => orders.filter((o) => o.status === s).length;
    return {
      total: orders.length,
      pending: by('pending'),
      confirmed: by('confirmed'),
      preparing: by('preparing'),
      ready: by('ready'),
      delivered: by('delivered'),
      cancelled: by('cancelled'),
      revenue: orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + (o.totalPrice || 0), 0),
    };
  }, [orders]);

  const activeCount = stats.pending + stats.confirmed + stats.preparing + stats.ready;

  // Bubble active count to the shell for the sidebar badge.
  useEffect(() => {
    onActiveCount?.(activeCount);
  }, [activeCount, onActiveCount]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .filter((o) => {
        const matchSt = filterStatus === 'all' || o.status === filterStatus;
        const matchTy = filterType === 'all' || o.orderType === filterType;
        const matchS =
          !q ||
          String(o.orderNumber || '').includes(q) ||
          (o.customerName || '').toLowerCase().includes(q) ||
          String(o.tableNumber || '').includes(q) ||
          String(o.roomNumber || '').includes(q);
        return matchSt && matchTy && matchS;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'total-desc') return (b.totalPrice || 0) - (a.totalPrice || 0);
        return 0;
      });
  }, [orders, filterStatus, filterType, search, sortBy]);

  const handleAdvance = async (orderId, nextStatus) => {
    setAct(orderId, true);
    try {
      await updateOrderStatus(orderId, nextStatus);
      toast.success(`Order → ${STATUS_META[nextStatus]?.label}`);
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Status update failed');
    } finally {
      setAct(orderId, false);
    }
  };

  const openCancel = (orderId) => {
    setCancelId(orderId);
    setCancelReason('');
    setCancelError('');
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setCancelError('A cancellation reason is required.');
      return;
    }
    setAct(`c_${cancelId}`, true);
    try {
      await cancelOrder(cancelId, cancelReason);
      toast.success('Order cancelled');
      setCancelId(null);
      setSelOrder(null);
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Cancel failed');
    } finally {
      setAct(`c_${cancelId}`, false);
    }
  };

  const statusFilters = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'pending', label: 'Pending', count: stats.pending },
    { value: 'confirmed', label: 'Confirmed', count: stats.confirmed },
    { value: 'preparing', label: 'Preparing', count: stats.preparing },
    { value: 'ready', label: 'Ready', count: stats.ready },
    { value: 'delivered', label: 'Delivered', count: stats.delivered },
    { value: 'cancelled', label: 'Cancelled', count: stats.cancelled },
  ];

  const renderActions = (order) => {
    const sm = STATUS_META[order.status] || STATUS_META.pending;
    return (
      <>
        {sm.next && (
          <Button size="sm" variant="primary" onClick={() => handleAdvance(order._id, sm.next)} disabled={actionLoading[order._id]}>
            {actionLoading[order._id] ? '…' : sm.nextLabel}
          </Button>
        )}
        {['pending', 'confirmed', 'preparing'].includes(order.status) && (
          <Button size="sm" variant="danger" onClick={() => openCancel(order._id)}>Cancel</Button>
        )}
      </>
    );
  };

  return (
    <div className="ha-page">
      <PageHeader
        title="Orders"
        subtitle="Track and manage all orders in real time."
        actions={
          <>
            {activeCount > 0 && (
              <span className="ha-live" title="List auto-refreshes every 30 seconds">
                <span className="ha-live__dot" aria-hidden="true" /> Live · {activeCount} active
              </span>
            )}
            <Segmented
              options={[
                { value: 'cards', label: 'Cards', icon: <LayoutGrid size={15} aria-hidden="true" /> },
                { value: 'table', label: 'Table', icon: <List size={15} aria-hidden="true" /> },
              ]}
              value={viewMode}
              onChange={setViewMode}
              ariaLabel="Order view"
            />
            <Button variant="secondary" onClick={fetchOrders}>
              <RefreshCw size={16} aria-hidden="true" /> Refresh
            </Button>
          </>
        }
        toolbar={
          <>
            <div className="ha-toolbar__group">
              <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order #, customer, table…" ariaLabel="Search orders" />
              <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} aria-label="Filter by order type">
                <option value="all">All Types</option>
                {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort orders">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="total-desc">Highest Total</option>
              </Select>
            </div>
            <FilterTabs options={statusFilters} value={filterStatus} onChange={setFilterStatus} ariaLabel="Filter orders by status" />
          </>
        }
      />

      {/* KPI row */}
      <div className="ha-kpi-grid" style={{ marginBottom: 24, gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
        {loading && orders.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={<ShoppingBag size={22} />} iconBg="linear-gradient(135deg,#6366f1,#4f46e5)" label="Total Orders" value={stats.total} />
            <StatCard icon={<Flame size={22} />} iconBg="var(--ha-warning)" label="Active" value={activeCount} />
            <StatCard icon={<ShoppingBasket size={22} />} iconBg="var(--ha-info)" label="Delivered" value={stats.delivered} />
            <StatCard icon={<ShoppingBag size={22} />} iconBg="var(--ha-success)" label="Revenue" value={rs(stats.revenue)} />
          </>
        )}
      </div>

      {error ? (
        <ErrorState description={error} onRetry={fetchOrders} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={26} />}
          title={orders.length === 0 ? 'No orders yet' : 'No matching orders'}
          description={orders.length === 0 ? 'Orders appear here when guests place them.' : 'Try adjusting your filters.'}
        />
      ) : viewMode === 'cards' ? (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
          {filtered.map((order) => {
            const sm = STATUS_META[order.status] || STATUS_META.pending;
            const tm = TYPE_META[order.orderType] || TYPE_META.dineIn;
            const TIcon = tm.Icon;
            return (
              <div key={order._id} className="ha-card ha-card--pad" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }} onClick={() => setSelOrder(order)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="ha-body-strong haNum" style={{ color: 'var(--ha-text)' }}>#{order.orderNumber || order._id?.slice(-6)}</div>
                    <div className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>{fmtAgo(order.createdAt)}</div>
                  </div>
                  <Badge tone={sm.tone}>{sm.label}</Badge>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="ha-small" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ha-text-muted)' }}>
                    <TIcon size={14} aria-hidden="true" /> {tm.label}
                  </span>
                  {(order.tableNumber || order.roomNumber) && (
                    <span className="ha-small" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ha-text-muted)' }}>
                      <MapPin size={14} aria-hidden="true" /> {order.tableNumber ? `Table ${order.tableNumber}` : `Room ${order.roomNumber}`}
                    </span>
                  )}
                  {order.priority === 'high' && <Badge tone="danger">High priority</Badge>}
                </div>
                {order.customerName && (
                  <div className="ha-small" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ha-text-muted)' }}>
                    <User size={14} aria-hidden="true" /> {order.customerName}
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--ha-border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(order.items || []).slice(0, 3).map((item, i) => (
                    <div key={i} className="ha-small" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ha-text-muted)' }}>
                      <span>{item.name}</span>
                      <span className="haNum">×{item.quantity}</span>
                    </div>
                  ))}
                  {(order.items || []).length > 3 && <div className="ha-small" style={{ color: 'var(--ha-text-subtle)' }}>+{(order.items || []).length - 3} more</div>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
                  <span className="ha-money haNum" style={{ color: 'var(--ha-text)' }}>{rs(order.totalPrice)}</span>
                  <div className="ha-table__row-actions">{renderActions(order)}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ha-table-wrap">
          <div className="ha-table-scroll">
            <table className="ha-table" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  {['Order #', 'Customer', 'Type', 'Location', 'Items', 'Status', 'Total', 'Time', 'Actions'].map((h) => (
                    <th key={h} scope="col">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const sm = STATUS_META[order.status] || STATUS_META.pending;
                  const tm = TYPE_META[order.orderType] || TYPE_META.dineIn;
                  return (
                    <tr key={order._id} style={{ cursor: 'pointer' }} onClick={() => setSelOrder(order)}>
                      <td><span className="ha-body-strong haNum">#{order.orderNumber || order._id?.slice(-6)}</span></td>
                      <td>{order.customerName || <span style={{ color: 'var(--ha-text-subtle)' }}>Guest</span>}</td>
                      <td>{tm.label}</td>
                      <td>{order.tableNumber ? `Table ${order.tableNumber}` : order.roomNumber ? `Room ${order.roomNumber}` : '—'}</td>
                      <td className="haNum">{(order.items || []).length}</td>
                      <td><Badge tone={sm.tone}>{sm.label}</Badge></td>
                      <td className="ha-money haNum">{rs(order.totalPrice)}</td>
                      <td className="haNum" style={{ color: 'var(--ha-text-subtle)' }}>{fmtTime(order.createdAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="ha-table__row-actions">{renderActions(order)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order detail modal */}
      <Modal
        isOpen={!!selOrder}
        onClose={() => setSelOrder(null)}
        title={selOrder ? `Order #${selOrder.orderNumber || selOrder._id?.slice(-6)}` : ''}
        size="lg"
        footer={
          selOrder && (
            <>
              {STATUS_META[selOrder.status]?.next && (
                <Button variant="primary" onClick={() => { handleAdvance(selOrder._id, STATUS_META[selOrder.status].next); setSelOrder(null); }}>
                  {STATUS_META[selOrder.status].nextLabel}
                </Button>
              )}
              {['pending', 'confirmed', 'preparing'].includes(selOrder.status) && (
                <Button variant="danger" onClick={() => openCancel(selOrder._id)}>Cancel Order</Button>
              )}
              <Button variant="secondary" onClick={() => setSelOrder(null)}>Close</Button>
            </>
          )
        }
      >
        {selOrder && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {STATUS_FLOW.map((s, i) => {
                const done = STATUS_FLOW.indexOf(selOrder.status) >= i;
                return (
                  <span
                    key={s}
                    className="ha-small"
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: done ? 'var(--ha-primary-soft)' : 'var(--ha-surface-sunken)',
                      color: done ? 'var(--ha-primary)' : 'var(--ha-text-subtle)',
                      fontWeight: selOrder.status === s ? 700 : 500,
                    }}
                  >
                    {STATUS_META[s].label}
                  </span>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 16 }}>
              {[
                ['Type', TYPE_META[selOrder.orderType]?.label || selOrder.orderType],
                ['Location', selOrder.tableNumber ? `Table ${selOrder.tableNumber}` : selOrder.roomNumber ? `Room ${selOrder.roomNumber}` : '—'],
                ['Customer', selOrder.customerName || 'Guest'],
                ['Phone', selOrder.customerPhone || '—'],
                ['Payment', selOrder.paymentStatus || 'pending'],
                ['Method', selOrder.paymentMethod || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="ha-field__label">{k}</div>
                  <div className="ha-body-strong" style={{ color: 'var(--ha-text)' }}>{v}</div>
                </div>
              ))}
            </div>
            <h3 className="ha-h3" style={{ marginBottom: 8 }}>Items</h3>
            {(selOrder.items || []).map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--ha-border)' }}>
                <span>{item.name}</span>
                <span className="haNum" style={{ color: 'var(--ha-text-subtle)' }}>×{item.quantity}</span>
                <span className="ha-money haNum">{rs((item.price || 0) * item.quantity)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontWeight: 700 }}>
              <span>Total</span>
              <span className="ha-money-large haNum">{rs(selOrder.totalPrice)}</span>
            </div>
          </>
        )}
      </Modal>

      {/* Cancel modal with required-reason validation */}
      <Modal
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        title="Cancel Order"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelId(null)}>Back</Button>
            <Button variant="danger" onClick={handleCancel} disabled={actionLoading[`c_${cancelId}`]}>
              {actionLoading[`c_${cancelId}`] ? 'Cancelling…' : 'Confirm Cancel'}
            </Button>
          </>
        }
      >
        <p className="ha-body" style={{ color: 'var(--ha-text-subtle)', marginBottom: 12 }}>Select or enter a reason for cancellation:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {CANCEL_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              className={`ha-filter-chip ${cancelReason === r ? 'ha-filter-chip--active' : ''}`}
              onClick={() => { setCancelReason(r); setCancelError(''); }}
            >
              {r}
            </button>
          ))}
        </div>
        <Textarea
          label="Reason"
          required
          rows="3"
          placeholder="Reason for cancellation…"
          value={cancelReason}
          onChange={(e) => { setCancelReason(e.target.value); setCancelError(''); }}
          error={cancelError}
        />
      </Modal>
    </div>
  );
};

export default OrderManagement;
