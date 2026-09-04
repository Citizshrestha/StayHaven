import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { useStaffAuth } from '../../../../core/context/StaffAuthContext';
import { getOrders, updateOrderStatus, cancelOrder } from '../services/orderApi';
import './OrderManagement.css';

/* ─── Constants ─── */
const STATUS_FLOW = ['pending','confirmed','preparing','ready','delivered'];

const STATUS_META = {
  pending:   { label:'Pending',   color:'#f59e0b', bg:'rgba(245,158,11,.12)', icon:'🆕', next:'confirmed',  nextLabel:'Confirm' },
  confirmed: { label:'Confirmed', color:'#6366f1', bg:'rgba(99,102,241,.12)', icon:'✅', next:'preparing',  nextLabel:'Start Prep' },
  preparing: { label:'Preparing', color:'#3b82f6', bg:'rgba(59,130,246,.12)', icon:'👨‍🍳', next:'ready',     nextLabel:'Mark Ready' },
  ready:     { label:'Ready',     color:'#10b981', bg:'rgba(16,185,129,.12)', icon:'🟢', next:'delivered',  nextLabel:'Deliver' },
  delivered: { label:'Delivered', color:'#64748b', bg:'rgba(100,116,139,.12)', icon:'📦', next:null,        nextLabel:null },
  cancelled: { label:'Cancelled', color:'#ef4444', bg:'rgba(239,68,68,.12)', icon:'❌', next:null,         nextLabel:null },
};

const TYPE_META = {
  dineIn:      { label:'Dine In',      icon:'🍽️', color:'#6366f1' },
  roomService: { label:'Room Service', icon:'🛏️', color:'#10b981' },
  takeaway:    { label:'Takeaway',     icon:'🥡', color:'#f59e0b' },
};

const fmtTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
};
const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 1)  return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
  return d.toLocaleDateString();
};

/* ══════════════════════════════════════════════════════════════ */
const OrderManagement = () => {
  const { activeProperty } = useStaffAuth();
  const hotelId = activeProperty?._id || activeProperty;

  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [actionLoading, setAL]      = useState({});
  const [error, setError]           = useState(null);

  const [filterStatus, setFStatus]  = useState('all');
  const [filterType, setFType]      = useState('all');
  const [search, setSearch]         = useState('');
  const [viewMode, setViewMode]     = useState('cards'); // cards | table
  const [sortBy, setSortBy]         = useState('newest');

  const [showDetail, setShowDetail] = useState(false);
  const [selOrder, setSelOrder]     = useState(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelR]  = useState('');
  const [cancelId, setCancelId]     = useState(null);

  const intervalRef = useRef(null);
  const setAct = (k, v) => setAL(p => ({ ...p, [k]: v }));

  /* ─── Fetch ─── */
  const fetchOrders = useCallback(async () => {
    if (!hotelId) { setError('No active hotel selected'); return; }
    try {
      setLoading(true);
      setError(null);
      const res = await getOrders({ hotelId });
      if (res.data.success) {
        setOrders(res.data.orders || []);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load orders');
    } finally { setLoading(false); }
  }, [hotelId]);

  useEffect(() => {
    fetchOrders();
    intervalRef.current = setInterval(fetchOrders, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchOrders]);

  /* ─── Status Advance ─── */
  const handleAdvance = async (orderId, nextStatus) => {
    setAct(orderId, true);
    try {
      await updateOrderStatus(orderId, nextStatus);
      toast.success(`Order → ${STATUS_META[nextStatus]?.label}`);
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Status update failed');
    } finally { setAct(orderId, false); }
  };

  /* ─── Cancel ─── */
  const openCancel = (orderId, e) => {
    e.stopPropagation();
    setCancelId(orderId); setCancelR(''); setShowCancel(true);
  };
  const handleCancel = async () => {
    if (!cancelId) return;
    setAct(`c_${cancelId}`, true);
    try {
      await cancelOrder(cancelId, cancelReason);
      toast.success('Order cancelled');
      setShowCancel(false); setCancelId(null); fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Cancel failed');
    } finally { setAct(`c_${cancelId}`, false); }
  };

  /* ─── Derived ─── */
  const filtered = orders.filter(o => {
    const matchSt = filterStatus === 'all' || o.status === filterStatus;
    const matchTy = filterType  === 'all' || o.orderType === filterType;
    const matchS  = !search || String(o.orderNumber).includes(search) || (o.customerName||'').toLowerCase().includes(search.toLowerCase()) || (o.tableNumber||'').includes(search) || (o.roomNumber||'').includes(search);
    return matchSt && matchTy && matchS;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'total-desc') return (b.totalPrice||0) - (a.totalPrice||0);
    return 0;
  });

  const stats = {
    total:     orders.length,
    pending:   orders.filter(o=>o.status==='pending').length,
    confirmed: orders.filter(o=>o.status==='confirmed').length,
    preparing: orders.filter(o=>o.status==='preparing').length,
    ready:     orders.filter(o=>o.status==='ready').length,
    delivered: orders.filter(o=>o.status==='delivered').length,
    cancelled: orders.filter(o=>o.status==='cancelled').length,
    revenue:   orders.filter(o=>o.status==='delivered').reduce((s,o)=>s+(o.totalPrice||0),0),
  };

  const activeCount = stats.pending + stats.confirmed + stats.preparing + stats.ready;

  /* ══════════════════════════ RENDER ══════════════════════════ */
  return (
    <div className="om2-root">

      {/* ── Header ── */}
      <div className="om2-header">
        <div className="om2-header-left">
          <div className="om2-header-icon">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
          </div>
          <div>
            <h1>Order Management</h1>
            <p>Track and manage all orders in real time</p>
          </div>
          {activeCount > 0 && <span className="om2-live-badge">● LIVE · {activeCount} active</span>}
        </div>
        <div className="om2-header-actions">
          <div className="om2-view-toggle">
            <button className={`om2-vbtn${viewMode==='cards'?' om2-vbtn--active':''}`} onClick={()=>setViewMode('cards')}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </button>
            <button className={`om2-vbtn${viewMode==='table'?' om2-vbtn--active':''}`} onClick={()=>setViewMode('table')}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            </button>
          </div>
          <button className="om2-btn om2-btn--ghost" onClick={fetchOrders} disabled={loading}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="om2-stats">
        {[
          { label:'Total',     value:stats.total,     color:'#6366f1', icon:'📦' },
          { label:'Pending',   value:stats.pending,   color:'#f59e0b', icon:'🆕' },
          { label:'Preparing', value:stats.preparing, color:'#3b82f6', icon:'👨‍🍳' },
          { label:'Ready',     value:stats.ready,     color:'#10b981', icon:'🟢' },
          { label:'Delivered', value:stats.delivered, color:'#64748b', icon:'📦' },
          { label:'Cancelled', value:stats.cancelled, color:'#ef4444', icon:'❌' },
          { label:'Revenue',   value:`NPR ${stats.revenue.toLocaleString()}`, color:'#10b981', icon:'💰' },
        ].map(s=>(
          <div key={s.label} className="om2-stat" style={{'--c':s.color}}
            onClick={()=>setFStatus(s.label.toLowerCase() === 'total' ? 'all' : s.label.toLowerCase())}
          >
            <span className="om2-stat-ico">{s.icon}</span>
            <div className="om2-stat-val">{s.value}</div>
            <div className="om2-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="om2-error">
          <span>⚠️ {error}</span>
          <button onClick={()=>setError(null)}>✕</button>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="om2-filters">
        <div className="om2-search-wrap">
          <svg className="om2-search-ico" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>
          <input className="om2-search" placeholder="Search order #, customer, table…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="om2-status-tabs">
          {[['all','All'],['pending','Pending'],['confirmed','Confirmed'],['preparing','Preparing'],['ready','Ready'],['delivered','Delivered'],['cancelled','Cancelled']].map(([k,l])=>(
            <button key={k} className={`om2-stab${filterStatus===k?' om2-stab--active':''}`}
              style={filterStatus===k && STATUS_META[k] ? {background:STATUS_META[k].bg,color:STATUS_META[k].color,borderColor:STATUS_META[k].color+'44'} : {}}
              onClick={()=>setFStatus(k)}
            >
              {STATUS_META[k]?.icon} {l}
              {k!=='all' && orders.filter(o=>o.status===k).length > 0 && (
                <span className="om2-stab-count">{orders.filter(o=>o.status===k).length}</span>
              )}
            </button>
          ))}
        </div>
        <div className="om2-filter-right">
          <select className="om2-sel" value={filterType} onChange={e=>setFType(e.target.value)}>
            <option value="all">All Types</option>
            {Object.entries(TYPE_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="om2-sel" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="total-desc">Highest Total</option>
          </select>
        </div>
      </div>

      {/* ── Content ── */}
      {loading && !orders.length ? (
        <div className="om2-loading"><div className="om2-spinner"/><span>Loading orders…</span></div>
      ) : filtered.length === 0 ? (
        <div className="om2-empty">
          <span className="om2-empty-ico">📦</span>
          <h3>{orders.length === 0 ? 'No Orders Yet' : 'No Matching Orders'}</h3>
          <p>{orders.length === 0 ? 'Orders will appear here when guests place them' : 'Try adjusting your filters'}</p>
        </div>
      ) : viewMode === 'cards' ? (
        /* ── CARDS VIEW ── */
        <div className="om2-cards-grid">
          {filtered.map(order => {
            const sm = STATUS_META[order.status] || STATUS_META.pending;
            const tm = TYPE_META[order.orderType] || TYPE_META.dineIn;
            return (
              <div key={order._id} className="om2-card" onClick={()=>{setSelOrder(order);setShowDetail(true);}}>
                {/* Card Header */}
                <div className="om2-card-top">
                  <div className="om2-order-id">
                    <span className="om2-order-num">#{order.orderNumber || order._id?.slice(-6)}</span>
                    <span className="om2-order-time">{fmtDate(order.createdAt)}</span>
                  </div>
                  <span className="om2-status-chip" style={{color:sm.color,background:sm.bg}}>
                    {sm.icon} {sm.label}
                  </span>
                </div>

                {/* Type & Location */}
                <div className="om2-card-info">
                  <span className="om2-type-chip" style={{color:tm.color,background:tm.color+'15'}}>
                    {tm.icon} {tm.label}
                  </span>
                  {(order.tableNumber||order.roomNumber) && (
                    <span className="om2-loc-chip">
                      {order.tableNumber ? `Table ${order.tableNumber}` : `Room ${order.roomNumber}`}
                    </span>
                  )}
                  {order.priority === 'high' && <span className="om2-priority-chip">🔥 High Priority</span>}
                </div>

                {/* Customer */}
                {order.customerName && <div className="om2-customer">👤 {order.customerName}</div>}

                {/* Items */}
                <div className="om2-items">
                  {(order.items||[]).slice(0,3).map((item, i) => (
                    <div key={i} className="om2-item">
                      <span>{item.name}</span>
                      <span>×{item.quantity}</span>
                    </div>
                  ))}
                  {(order.items||[]).length > 3 && (
                    <div className="om2-item om2-item--more">+{(order.items||[]).length - 3} more</div>
                  )}
                </div>

                {/* Footer */}
                <div className="om2-card-footer" onClick={e=>e.stopPropagation()}>
                  <span className="om2-total">NPR {(order.totalPrice||0).toLocaleString()}</span>
                  <div className="om2-card-acts">
                    {sm.next && (
                      <button className="om2-btn om2-btn--advance" style={{background:sm.color,color:'white'}}
                        onClick={e=>{e.stopPropagation();handleAdvance(order._id,sm.next);}}
                        disabled={actionLoading[order._id]}
                      >
                        {actionLoading[order._id] ? '…' : `→ ${sm.nextLabel}`}
                      </button>
                    )}
                    {['pending','confirmed','preparing'].includes(order.status) && (
                      <button className="om2-btn om2-btn--cancel" onClick={e=>openCancel(order._id,e)} disabled={actionLoading[`c_${order._id}`]}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <div className="om2-table-wrap">
          <table className="om2-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Location</th>
                <th>Items</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const sm = STATUS_META[order.status] || STATUS_META.pending;
                const tm = TYPE_META[order.orderType] || TYPE_META.dineIn;
                return (
                  <tr key={order._id} className="om2-tr" onClick={()=>{setSelOrder(order);setShowDetail(true);}}>
                    <td><span className="om2-tbl-num">#{order.orderNumber || order._id?.slice(-6)}</span></td>
                    <td>{order.customerName || <span className="om2-muted">Guest</span>}</td>
                    <td><span className="om2-type-chip" style={{color:tm.color,background:tm.color+'15'}}>{tm.icon} {tm.label}</span></td>
                    <td>{order.tableNumber ? `Table ${order.tableNumber}` : order.roomNumber ? `Room ${order.roomNumber}` : '—'}</td>
                    <td>{(order.items||[]).length} items</td>
                    <td><span className="om2-status-chip" style={{color:sm.color,background:sm.bg}}>{sm.icon} {sm.label}</span></td>
                    <td>
                      <span className={`om2-pay-chip om2-pay-chip--${order.paymentStatus}`}>
                        {order.paymentStatus || 'pending'}
                      </span>
                    </td>
                    <td className="om2-tbl-total">NPR {(order.totalPrice||0).toLocaleString()}</td>
                    <td className="om2-muted">{fmtTime(order.createdAt)}</td>
                    <td onClick={e=>e.stopPropagation()}>
                      <div className="om2-tbl-acts">
                        {sm.next && (
                          <button className="om2-tbl-btn" style={{background:sm.color,color:'white'}}
                            onClick={()=>handleAdvance(order._id,sm.next)}
                            disabled={actionLoading[order._id]}
                          >
                            {actionLoading[order._id] ? '…' : sm.nextLabel}
                          </button>
                        )}
                        {['pending','confirmed','preparing'].includes(order.status) && (
                          <button className="om2-tbl-btn om2-tbl-btn--cancel" onClick={e=>openCancel(order._id,e)}>Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ ORDER DETAIL MODAL ══ */}
      {showDetail && selOrder && (
        <div className="om2-overlay" onClick={()=>setShowDetail(false)}>
          <div className="om2-detail-modal" onClick={e=>e.stopPropagation()}>
            <div className="om2-modal-hd">
              <div>
                <h2>Order #{selOrder.orderNumber || selOrder._id?.slice(-6)}</h2>
                <p>{fmtDate(selOrder.createdAt)} · {fmtTime(selOrder.createdAt)}</p>
              </div>
              <button className="om2-close" onClick={()=>setShowDetail(false)}>✕</button>
            </div>
            <div className="om2-detail-body">
              {/* Status */}
              <div className="om2-detail-status">
                {STATUS_FLOW.map((s, i) => {
                  const m = STATUS_META[s];
                  const done = STATUS_FLOW.indexOf(selOrder.status) >= i;
                  const curr = selOrder.status === s;
                  return (
                    <React.Fragment key={s}>
                      <div className={`om2-flow-step${done?' om2-flow-step--done':''}${curr?' om2-flow-step--curr':''}`}
                        style={curr ? {borderColor:m.color,color:m.color} : {}}>
                        <span>{m.icon}</span>
                        <span>{m.label}</span>
                      </div>
                      {i < STATUS_FLOW.length-1 && <div className={`om2-flow-line${done?' om2-flow-line--done':''}`}/>}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Info Grid */}
              <div className="om2-detail-grid">
                {[
                  ['Type', (TYPE_META[selOrder.orderType]?.label || selOrder.orderType)],
                  ['Location', selOrder.tableNumber ? `Table ${selOrder.tableNumber}` : selOrder.roomNumber ? `Room ${selOrder.roomNumber}` : '—'],
                  ['Customer', selOrder.customerName || 'Guest'],
                  ['Phone', selOrder.customerPhone || '—'],
                  ['Payment', selOrder.paymentStatus || 'pending'],
                  ['Method', selOrder.paymentMethod || '—'],
                  ['Priority', selOrder.priority || 'normal'],
                  ['Notes', selOrder.notes || '—'],
                ].map(([k,v])=>(
                  <div key={k} className="om2-detail-row">
                    <span className="om2-detail-key">{k}</span>
                    <span className="om2-detail-val">{v}</span>
                  </div>
                ))}
              </div>

              {/* Items */}
              <div className="om2-detail-items">
                <h3>Items</h3>
                {(selOrder.items||[]).map((item, i) => (
                  <div key={i} className="om2-detail-item">
                    <span className="om2-di-name">{item.name}</span>
                    <span className="om2-di-qty">×{item.quantity}</span>
                    <span className="om2-di-price">NPR {((item.price||0)*item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div className="om2-detail-total">
                  <span>Total</span>
                  <span>NPR {(selOrder.totalPrice||0).toLocaleString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="om2-detail-acts">
                {STATUS_META[selOrder.status]?.next && (
                  <button className="om2-btn om2-btn--primary"
                    onClick={()=>{handleAdvance(selOrder._id,STATUS_META[selOrder.status].next);setShowDetail(false);}}
                    disabled={actionLoading[selOrder._id]}
                  >
                    {STATUS_META[selOrder.status].nextLabel}
                  </button>
                )}
                {['pending','confirmed','preparing'].includes(selOrder.status) && (
                  <button className="om2-btn om2-btn--danger"
                    onClick={e=>{openCancel(selOrder._id,e);setShowDetail(false);}}
                  >Cancel Order</button>
                )}
                <button className="om2-btn om2-btn--ghost" onClick={()=>setShowDetail(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ CANCEL MODAL ══ */}
      {showCancel && (
        <div className="om2-overlay" onClick={()=>setShowCancel(false)}>
          <div className="om2-cancel-modal" onClick={e=>e.stopPropagation()}>
            <div className="om2-modal-hd">
              <h2>Cancel Order</h2>
              <button className="om2-close" onClick={()=>setShowCancel(false)}>✕</button>
            </div>
            <div style={{padding:'16px 24px'}}>
              <p style={{color:'#64748b',marginBottom:14}}>Please provide a reason for cancellation:</p>
              <div className="om2-cancel-reasons">
                {['Customer request','Item unavailable','Duplicate order','Kitchen issue','Other'].map(r=>(
                  <button key={r} className={`om2-reason-btn${cancelReason===r?' om2-reason-btn--sel':''}`} onClick={()=>setCancelR(r)}>{r}</button>
                ))}
              </div>
              <textarea className="om2-cancel-textarea" rows="3" placeholder="Additional notes (optional)" value={cancelReason} onChange={e=>setCancelR(e.target.value)}/>
            </div>
            <div className="om2-modal-ft">
              <button className="om2-btn om2-btn--ghost" onClick={()=>setShowCancel(false)}>Back</button>
              <button className="om2-btn om2-btn--danger" onClick={handleCancel} disabled={!cancelReason || actionLoading[`c_${cancelId}`]}>
                {actionLoading[`c_${cancelId}`] ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
