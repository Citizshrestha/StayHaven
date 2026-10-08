import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSocket } from '../../../core/context/SocketContext';
import {
  validateTableToken,
  getGuestMenu,
  createGuestOrder,
  callWaiter,
  requestBill,
  getTableTab,
} from '../../../core/api/services/guestQr.service';
import { getOrCreateGuestSessionId, generateIdempotencyKey } from './guestSession';
import { formatMoney } from '../dashboard/utils/format';
import '../dashboard/styles/guest-tokens.css';
import './GuestQR.css';

const Icons = {
  Table: '🍽️',
  Menu: '📋',
  Order: '🛒',
  Waiter: '👋',
  Bill: '🧾',
  Back: '←',
  Add: '+',
  Remove: '−',
  Error: '❌',
  Success: '✅',
  Arrow: '→',
  Location: '📍',
  Phone: '📱',
  User: '👤',
  Notes: '📝',
  Cart: '🛒',
  Food: '🍲',
};

const STATUS_STEPS = [
  { key: 'pending',   label: 'Order received',   icon: '📝' },
  { key: 'confirmed', label: 'Order confirmed',  icon: '✓' },
  { key: 'preparing', label: 'Being prepared',   icon: '👨‍🍳' },
  { key: 'ready',     label: 'Ready to serve',   icon: '🍽️' },
  { key: 'delivered', label: 'Served',           icon: '✅' },
];

// Cart persistence key scoped to the QR token so carts don't bleed across tables
const getCartKey = (token) => `guestCart_${token}`;

const readPersistedCart = (token) => {
  try {
    const raw = sessionStorage.getItem(getCartKey(token));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writePersistedCart = (token, cart) => {
  try {
    sessionStorage.setItem(getCartKey(token), JSON.stringify(cart));
  } catch {
    // sessionStorage unavailable (private mode / quota) — degrade silently,
    // the cart still works for the life of the page.
  }
};

const GuestTableView = () => {
  const { token } = useParams();
  const { socket, subscribe } = useSocket();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuError, setMenuError] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [hotelData, setHotelData] = useState(null);
  const [view, setView] = useState('home');
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState(() => readPersistedCart(token));
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', notes: '' });
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  // 'idle' | 'sent' — reflects that the request was persisted server-side, not
  // that a staff member has acknowledged it (the backend owns that state).
  const [waiterCallState, setWaiterCallState] = useState('idle');
  const [billRequestState, setBillRequestState] = useState('idle');
  // The party's running bill (server-computed). `tab` is null when this
  // device has no open bill; `lastClosed` is set right after staff settle it.
  const [tab, setTab] = useState(null);
  const [lastClosed, setLastClosed] = useState(null);

  // Stable session ID — created once, written to localStorage before SocketProvider
  // reads it (both run at mount, but getOrCreateGuestSessionId fires synchronously
  // in the useRef initializer so localStorage is populated before the socket effect).
  const guestSessionId = useRef(getOrCreateGuestSessionId()).current;

  // Idempotency key for the in-flight/retried checkout attempt. Stays stable
  // across retries of the SAME attempt (e.g. a timeout followed by the user
  // tapping "Place Order" again) so the server treats it as one submission;
  // cleared after a successful placement so the next order gets a fresh key.
  const pendingOrderKeyRef = useRef(null);

  // Validate table token on mount
  useEffect(() => {
    const validateTable = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await validateTableToken(token);
        if (response.success) {
          setTableData(response.data.table);
          setHotelData(response.data.hotel);
        } else {
          setError(response.message || 'Invalid QR code');
        }
      } catch (err) {
        setError(err?.response?.data?.message || err.message || 'Failed to validate QR code. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      validateTable();
    } else {
      setError('Invalid QR code');
      setLoading(false);
    }
  }, [token]);

  // Join guest session room as soon as the socket is available.
  // Re-runs whenever socket changes (e.g. after a reconnect).
  useEffect(() => {
    if (!socket || !guestSessionId) return;
    socket.emit('join-guest-session', guestSessionId);
  }, [socket, guestSessionId]);

  // Guests receive `order-status-update` (singular); staff rooms get
  // `order-status-updated`. Both are emitted by finalizeStatusUpdate.
  const handleOrderStatusUpdate = useCallback((data) => {
    setOrderPlaced(prev => {
      if (!prev || String(prev._id) !== String(data.orderId)) return prev;
      return { ...prev, status: data.status };
    });
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe('order-status-update', handleOrderStatusUpdate);
    return unsubscribe;
  }, [subscribe, handleOrderStatusUpdate]);

  // Running bill: loaded on open, after ordering, and on every live update.
  // Also restores order tracking after a page refresh.
  const loadTab = useCallback(async () => {
    if (!token || !guestSessionId) return;
    try {
      const res = await getTableTab(token, guestSessionId);
      if (!res?.success) return;
      if (res.data.active) {
        const nextTab = res.data.tab;
        setTab(nextTab);
        setLastClosed(null);
        setOrderPlaced(prev => {
          if (prev) {
            const fresh = nextTab.orders.find(o => String(o._id) === String(prev._id));
            return fresh ? { ...prev, status: fresh.status } : prev;
          }
          const latest = [...nextTab.orders].reverse().find(o => !['delivered', 'cancelled'].includes(o.status));
          return latest || null;
        });
      } else {
        setTab(prevTab => {
          // The open bill just went away → staff settled it.
          if (prevTab && res.data.lastClosed) toast.success('Your bill has been settled. Thank you!');
          return null;
        });
        setLastClosed(res.data.lastClosed || null);
      }
    } catch {
      // Non-fatal: ordering still works; the bill view shows a retry.
    }
  }, [token, guestSessionId]);

  useEffect(() => {
    if (tableData) loadTab();
  }, [tableData, loadTab]);

  useEffect(() => {
    const u1 = subscribe('table-tab-updated', loadTab);
    const u2 = subscribe('order-status-update', loadTab);
    return () => { u1?.(); u2?.(); };
  }, [subscribe, loadTab]);

  // Persist cart to sessionStorage on every change
  useEffect(() => {
    writePersistedCart(token, cart);
  }, [cart, token]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      setMenuError(null);
      const response = await getGuestMenu(hotelData._id);
      if (response.success) {
        setMenuItems(response.menuItems || []);
        setCategories(['All', ...(response.categories || [])]);
      }
    } catch (err) {
      setMenuError(err?.response?.data?.message || 'Failed to load the menu.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewMenu = () => {
    fetchMenu();
    setView('menu');
  };

  // Cart functions
  const addToCart = (item) => {
    if (!item.isAvailable) return;
    setCart(prev => {
      const existingItem = prev.find(i => i.menuItem === item._id);
      if (existingItem) {
        return prev.map(i =>
          i.menuItem === item._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        menuItem: item._id,
        name: item.name,
        price: item.price,
        quantity: 1
      }];
    });
    toast.success(`${item.name} added to cart`, { autoClose: 1500 });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const existingItem = prev.find(i => i.menuItem === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prev.map(i =>
          i.menuItem === itemId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prev.filter(i => i.menuItem !== itemId);
    });
  };

  const getItemQuantity = (itemId) => {
    const item = cart.find(i => i.menuItem === itemId);
    return item ? item.quantity : 0;
  };

  // Per-item special note (e.g. "no onions") — sent as items[].notes
  const setItemNote = (itemId, note) => {
    setCart(prev => prev.map(i =>
      i.menuItem === itemId ? { ...i, notes: note.slice(0, 200) } : i
    ));
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  // Category + free-text search. Unavailable items stay visible (clearly marked)
  // so guests understand why something they expected is missing.
  const filteredMenuItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return menuItems.filter(item => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      if (!matchesCategory) return false;
      if (!query) return true;
      return `${item.name} ${item.description || ''}`.toLowerCase().includes(query);
    });
  }, [menuItems, activeCategory, search]);

  // Count only AVAILABLE items per category for the tab badge
  const getCategoryCount = (category) => {
    const source = category === 'All'
      ? menuItems
      : menuItems.filter(i => i.category === category);
    return source.filter(i => i.isAvailable).length;
  };

  // Place order
  const handlePlaceOrder = async () => {
    if (!customerInfo.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    try {
      setActionLoading(true);

      // Reuse the key from a prior failed attempt so a retry after a
      // timeout/network error cannot create a duplicate order.
      if (!pendingOrderKeyRef.current) {
        pendingOrderKeyRef.current = generateIdempotencyKey();
      }

      const orderData = {
        hotelId: hotelData._id,
        tableToken: token,
        orderType: 'dineIn',
        customerName: customerInfo.name.trim(),
        customerPhone: customerInfo.phone.trim(),
        notes: customerInfo.notes.trim(),
        guestSessionId,
        idempotencyKey: pendingOrderKeyRef.current,
        items: cart.map(item => ({
          menuItem: item.menuItem,
          quantity: item.quantity,
          notes: item.notes || ''
        }))
      };

      const response = await createGuestOrder(orderData);
      if (response.success) {
        pendingOrderKeyRef.current = null;
        setOrderPlaced(response.order);
        loadTab();
        setCart([]);
        sessionStorage.removeItem(getCartKey(token));
        setView('tracking');
        toast.success('Order placed successfully!');
      }
    } catch (err) {
      const message = err?.response?.data?.message || err.message || 'Failed to place order';
      // A menu item became unavailable or the hotel/table context is stale —
      // the retry key would only reproduce the same failure, so drop it and
      // let the guest see the current menu state before trying again.
      if (err?.response?.status === 400 || err?.response?.status === 404) {
        pendingOrderKeyRef.current = null;
      }
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  // Call waiter
  const handleCallWaiter = async (reason = 'Assistance requested') => {
    try {
      setActionLoading(true);
      const response = await callWaiter({
        tableToken: token,
        hotelId: hotelData._id,
        reason,
        guestSessionId,
        guestName: customerInfo.name.trim() || undefined,
      });
      if (response.success) {
        setWaiterCallState('sent');
        if (response.duplicate) toast.info(response.message || 'A waiter is already on the way.');
        else toast.success('Waiter has been notified! They will be with you shortly.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to call waiter. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Request bill
  const handleRequestBill = async () => {
    try {
      setActionLoading(true);
      const response = await requestBill({
        tableToken: token,
        hotelId: hotelData._id,
        guestSessionId,
        guestName: customerInfo.name.trim() || undefined,
      });
      if (response.success) {
        setBillRequestState('sent');
        if (response.duplicate) toast.info(response.message || 'Your bill request is already with the waiter.');
        else toast.success('Bill request sent! A waiter will bring your bill shortly.');
        loadTab();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to request bill. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading && view === 'home') {
    return (
      <div className="guestPortal guest-container">
        <div className="guest-card">
          <div className="guest-loading">
            <div className="guest-loading-spinner" />
            <p className="guest-loading-text" role="status">Loading table information…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error && view === 'home') {
    return (
      <div className="guestPortal guest-container">
        <div className="guest-card">
          <div className="guest-error">
            <div className="guest-error-icon" aria-hidden="true">{Icons.Error}</div>
            <h2>We couldn’t open this table</h2>
            <p>{error}</p>
            <button
              type="button"
              className="guest-error-btn"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Home view ─────────────────────────────────────────────────────────────
  if (view === 'home') {
    return (
      <div className="guestPortal guest-container">
        <div className="guest-card">
          <div className="guest-header">
            <div className="guest-header-icon" aria-hidden="true">{Icons.Table}</div>
            <h1>{hotelData?.name || 'Restaurant'}</h1>
            <p>{hotelData?.location?.address || 'Welcome!'}</p>
          </div>

          <div className="guest-info">
            <div className="guest-info-icon" aria-hidden="true">{Icons.Location}</div>
            <div className="guest-info-details">
              <h3>{tableData?.tableName || `Table ${tableData?.tableNumber}`}</h3>
              <p>
                {tableData?.capacity ? `Capacity: ${tableData.capacity} guests • ` : ''}
                {tableData?.location || 'Indoor'}
              </p>
            </div>
          </div>

          <div className="guest-actions">
            <button type="button" className="guest-action-btn" onClick={handleViewMenu}>
              <div className="guest-action-icon primary" aria-hidden="true">{Icons.Menu}</div>
              <div className="guest-action-content">
                <h4>View menu</h4>
                <p>Browse dishes and order from your table</p>
              </div>
              <span className="guest-action-arrow" aria-hidden="true">{Icons.Arrow}</span>
            </button>

            <button
              type="button"
              className="guest-action-btn"
              onClick={() => handleCallWaiter()}
              disabled={actionLoading}
            >
              <div className="guest-action-icon warning" aria-hidden="true">{Icons.Waiter}</div>
              <div className="guest-action-content">
                <h4>Call waiter</h4>
                <p>
                  {waiterCallState === 'sent'
                    ? 'Request sent — a waiter is on the way'
                    : 'Request assistance at your table'}
                </p>
              </div>
              <span className="guest-action-arrow" aria-hidden="true">{Icons.Arrow}</span>
            </button>

            {tab && (
              <button type="button" className="guest-action-btn" onClick={() => setView('bill')}>
                <div className="guest-action-icon primary" aria-hidden="true">{Icons.Bill}</div>
                <div className="guest-action-content">
                  <h4>Your table bill · {formatMoney(tab.totals?.balance ?? 0)}</h4>
                  <p>
                    {tab.totals?.orderCount || 0} order{tab.totals?.orderCount === 1 ? '' : 's'} so far — see items, VAT and total
                  </p>
                </div>
                <span className="guest-action-arrow" aria-hidden="true">{Icons.Arrow}</span>
              </button>
            )}

            <button
              type="button"
              className="guest-action-btn"
              onClick={handleRequestBill}
              disabled={actionLoading || !tab}
              aria-describedby={!tab ? 'guest-bill-hint' : undefined}
            >
              <div className="guest-action-icon success" aria-hidden="true">{Icons.Bill}</div>
              <div className="guest-action-content">
                <h4>Request bill</h4>
                <p id="guest-bill-hint">
                  {!tab
                    ? 'Available once you have ordered'
                    : billRequestState === 'sent' || tab.billRequestedAt
                      ? 'Bill requested — a waiter will bring it over'
                      : 'Ready to pay? We’ll bring your bill'}
                </p>
              </div>
              <span className="guest-action-arrow" aria-hidden="true">{Icons.Arrow}</span>
            </button>

            {orderPlaced && (
              <button
                type="button"
                className="guest-action-btn"
                onClick={() => setView('tracking')}
              >
                <div className="guest-action-icon success" aria-hidden="true">{Icons.Order}</div>
                <div className="guest-action-content">
                  <h4>Track order #{orderPlaced.orderNumber}</h4>
                  <p>See live kitchen progress</p>
                </div>
                <span className="guest-action-arrow" aria-hidden="true">{Icons.Arrow}</span>
              </button>
            )}
          </div>

          {!tab && lastClosed && (
            <p className="guest-payment-note" role="status">
              <span aria-hidden="true">{Icons.Success}</span> Paid — receipt #{lastClosed.receiptNumber} ({formatMoney(lastClosed.total)}). Thank you!
            </p>
          )}

          <p className="guest-payment-note">
            Orders are added to your table bill — pay at the counter or with your waiter.
          </p>
        </div>
      </div>
    );
  }

  // ── Table bill view ───────────────────────────────────────────────────────
  if (view === 'bill') {
    const t = tab?.totals || {};
    return (
      <div className="guestPortal guest-checkout">
        <div className="guest-checkout-header">
          <button type="button" className="guest-back-btn" onClick={() => setView('home')} aria-label="Back">
            <span aria-hidden="true">{Icons.Back}</span>
          </button>
          <h2 className="guest-checkout-title">Table bill</h2>
        </div>

        {!tab ? (
          <div className="guest-empty-cart" role="status">
            <div className="guest-empty-cart-icon" aria-hidden="true">{lastClosed ? Icons.Success : Icons.Bill}</div>
            <p>
              {lastClosed
                ? `Your bill is settled — receipt #${lastClosed.receiptNumber}, ${formatMoney(lastClosed.total)}. Thank you!`
                : 'There is no open bill for this table on this phone yet.'}
            </p>
            <button type="button" className="guest-error-btn" onClick={() => setView('home')}>Back</button>
          </div>
        ) : (
          <>
            <div className="guest-order-items">
              {tab.orders.map(order => (
                <div key={order._id} className="guest-bill-order">
                  <p className="guest-summary-note">
                    Order #{order.orderNumber} · {STATUS_STEPS.find(s => s.key === order.status)?.label || (order.status === 'cancelled' ? 'Cancelled' : order.status)}
                  </p>
                  {order.items.map((item, idx) => (
                    <div className="guest-order-item" key={`${order._id}-${idx}`} style={order.status === 'cancelled' ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}>
                      <div className="guest-order-item-qty">{item.quantity}×</div>
                      <span className="guest-order-item-name">{item.name}</span>
                      <span className="guest-order-item-price">{formatMoney(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="guest-order-summary" aria-live="polite">
              <div className="guest-summary-row"><span>Subtotal</span><span>{formatMoney(t.subtotal)}</span></div>
              {t.discount > 0 && <div className="guest-summary-row"><span>Discount</span><span>− {formatMoney(t.discount)}</span></div>}
              {t.serviceCharge > 0 && (
                <div className="guest-summary-row"><span>Service charge ({tab.charges?.serviceChargeRate}%)</span><span>{formatMoney(t.serviceCharge)}</span></div>
              )}
              <div className="guest-summary-row"><span>VAT ({tab.charges?.taxRate ?? 0}%)</span><span>{formatMoney(t.tax)}</span></div>
              <div className="guest-summary-row total"><span>Total</span><span>{formatMoney(t.total)}</span></div>
              {t.paid > 0 && (
                <>
                  <div className="guest-summary-row"><span>Paid</span><span>{formatMoney(t.paid)}</span></div>
                  <div className="guest-summary-row total"><span>Balance due</span><span>{formatMoney(t.balance)}</span></div>
                </>
              )}
            </div>

            <button
              type="button"
              className="guest-place-order-btn"
              onClick={handleRequestBill}
              disabled={actionLoading}
            >
              {billRequestState === 'sent' || tab.billRequestedAt ? 'Bill requested — ask again' : `Request bill • ${formatMoney(t.balance)}`}
            </button>
            <p className="guest-payment-note">
              Pay by cash, card, eSewa or Khalti with your waiter or at the counter.
            </p>
          </>
        )}
      </div>
    );
  }

  // ── Menu view ─────────────────────────────────────────────────────────────
  if (view === 'menu') {
    return (
      <div className="guestPortal guest-menu-container">
        <div className="guest-menu-header">
          <div className="guest-menu-header-top">
            <button
              type="button"
              className="guest-back-btn"
              onClick={() => setView('home')}
              aria-label="Back to table home"
            >
              <span aria-hidden="true">{Icons.Back}</span>
            </button>
            <div className="guest-menu-title">
              <h2>Menu</h2>
              <p>{hotelData?.name}</p>
            </div>
          </div>

          <div className="guest-menu-search">
            <label className="guest-sr-only" htmlFor="guest-menu-search-input">
              Search the menu
            </label>
            <input
              id="guest-menu-search-input"
              type="search"
              className="guest-form-input"
              placeholder="Search dishes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category tabs — counts reflect available items only */}
          <div className="guest-category-tabs g-scroll-x">
            {categories.map(category => (
              <button
                type="button"
                key={category}
                className={`guest-category-tab ${activeCategory === category ? 'active' : ''}`}
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
                <span className="guest-category-count">({getCategoryCount(category)})</span>
              </button>
            ))}
          </div>
        </div>

        {menuError && (
          <div className="guest-inline-error" role="alert">
            <span>{menuError}</span>
            <button type="button" className="guest-inline-retry" onClick={fetchMenu}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="guest-loading">
            <div className="guest-loading-spinner" />
            <p className="guest-loading-text" role="status">Loading menu…</p>
          </div>
        ) : filteredMenuItems.length === 0 ? (
          <div className="guest-empty-cart">
            <div className="guest-empty-cart-icon" aria-hidden="true">{Icons.Menu}</div>
            <p>
              {search.trim()
                ? `No dishes match “${search.trim()}”.`
                : 'Nothing on the menu in this category yet.'}
            </p>
          </div>
        ) : (
          <div className="guest-menu-grid">
            {filteredMenuItems.map(item => {
              const quantity = getItemQuantity(item._id);
              const unavailable = !item.isAvailable;
              return (
                <div
                  key={item._id}
                  className={`guest-menu-item${unavailable ? ' unavailable' : ''}`}
                >
                  {unavailable && <span className="guest-sold-out-badge">Sold out</span>}

                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="guest-menu-item-image"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="guest-menu-item-image guest-menu-item-image--placeholder"
                      aria-hidden="true"
                    >
                      {Icons.Food}
                    </div>
                  )}

                  <div className="guest-menu-item-content">
                    <div className="guest-menu-item-header">
                      <h4 className="guest-menu-item-name">{item.name}</h4>
                      {item.isVeg !== undefined && (
                        <div
                          className={`guest-menu-item-veg ${item.isVeg ? 'veg' : 'non-veg'}`}
                          role="img"
                          aria-label={item.isVeg ? 'Vegetarian' : 'Non-vegetarian'}
                        />
                      )}
                    </div>
                    {item.description && (
                      <p className="guest-menu-item-desc">{item.description}</p>
                    )}
                    <div className="guest-menu-item-footer">
                      <span className="guest-menu-item-price">{formatMoney(item.price)}</span>
                      <div className="guest-menu-item-add">
                        {quantity === 0 ? (
                          <button
                            type="button"
                            className="guest-add-btn"
                            onClick={() => addToCart(item)}
                            disabled={unavailable}
                            aria-label={
                              unavailable
                                ? `${item.name} is sold out`
                                : `Add ${item.name} to cart`
                            }
                          >
                            Add
                          </button>
                        ) : (
                          <div className="guest-qty-control">
                            <button
                              type="button"
                              className="guest-qty-btn"
                              onClick={() => removeFromCart(item._id)}
                              aria-label={`Remove one ${item.name}`}
                            >
                              <span aria-hidden="true">{Icons.Remove}</span>
                            </button>
                            <span className="guest-qty-value" aria-live="polite">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              className="guest-qty-btn"
                              onClick={() => addToCart(item)}
                              disabled={unavailable}
                              aria-label={`Add one more ${item.name}`}
                            >
                              <span aria-hidden="true">{Icons.Add}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {cart.length > 0 && (
          <div className="guest-cart-footer">
            <div className="guest-cart-info">
              <p className="guest-cart-count">
                {cartCount} {cartCount === 1 ? 'item' : 'items'}
              </p>
              <p className="guest-cart-total">{formatMoney(cartTotal)}</p>
            </div>
            <button
              type="button"
              className="guest-cart-btn"
              onClick={() => setView('checkout')}
            >
              <span aria-hidden="true">{Icons.Cart}</span> Review order
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Checkout view ─────────────────────────────────────────────────────────
  if (view === 'checkout') {
    return (
      <div className="guestPortal guest-checkout">
        <div className="guest-checkout-header">
          <button
            type="button"
            className="guest-back-btn"
            onClick={() => setView('menu')}
            aria-label="Back to menu"
          >
            <span aria-hidden="true">{Icons.Back}</span>
          </button>
          <h2 className="guest-checkout-title">Your order</h2>
        </div>

        {cart.length === 0 ? (
          <div className="guest-empty-cart">
            <div className="guest-empty-cart-icon" aria-hidden="true">{Icons.Cart}</div>
            <p>Your cart is empty.</p>
            <button
              type="button"
              className="guest-error-btn"
              onClick={() => setView('menu')}
            >
              Browse the menu
            </button>
          </div>
        ) : (
          <>
            <div className="guest-order-items">
              {cart.map(item => (
                <div key={item.menuItem}>
                  <div className="guest-order-item">
                    <div className="guest-order-item-qty">{item.quantity}×</div>
                    <span className="guest-order-item-name">{item.name}</span>
                    <span className="guest-order-item-price">
                      {formatMoney(item.price * item.quantity)}
                    </span>
                  </div>
                  <label className="guest-sr-only" htmlFor={`note-${item.menuItem}`}>
                    Note for {item.name}
                  </label>
                  <input
                    id={`note-${item.menuItem}`}
                    type="text"
                    className="guest-form-input guest-item-note-input"
                    placeholder={`Note for ${item.name} (e.g. no onions)`}
                    maxLength={200}
                    value={item.notes || ''}
                    onChange={(e) => setItemNote(item.menuItem, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="guest-form">
              <div className="guest-form-group">
                <label className="guest-form-label" htmlFor="guest-name">
                  <span aria-hidden="true">{Icons.User}</span> Your name *
                </label>
                <input
                  id="guest-name"
                  type="text"
                  className="guest-form-input"
                  placeholder="Enter your name"
                  autoComplete="name"
                  required
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="guest-form-group">
                <label className="guest-form-label" htmlFor="guest-phone">
                  <span aria-hidden="true">{Icons.Phone}</span> Phone number (optional)
                </label>
                <input
                  id="guest-phone"
                  type="tel"
                  className="guest-form-input"
                  placeholder="Enter phone number"
                  autoComplete="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="guest-form-group">
                <label className="guest-form-label" htmlFor="guest-notes">
                  <span aria-hidden="true">{Icons.Notes}</span> Special instructions (optional)
                </label>
                <textarea
                  id="guest-notes"
                  className="guest-form-textarea"
                  placeholder="Any allergies or special requests?"
                  maxLength={500}
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="guest-order-summary">
              <div className="guest-summary-row">
                <span>Subtotal</span>
                <span>{formatMoney(cartTotal)}</span>
              </div>
              <p className="guest-summary-note">
                {tab
                  ? `VAT (${tab.charges?.taxRate ?? 13}%)${tab.charges?.serviceChargeRate ? ` and ${tab.charges.serviceChargeRate}% service charge` : ''} are added on your table bill.`
                  : 'VAT (and any service charge) is added on your table bill.'}
              </p>
            </div>

            <button
              type="button"
              className="guest-place-order-btn"
              onClick={handlePlaceOrder}
              disabled={actionLoading || cart.length === 0}
            >
              {actionLoading ? 'Placing order…' : `Place order • ${formatMoney(cartTotal)}`}
            </button>

            <p className="guest-payment-note">
              No payment needed now — this is added to your table bill.
            </p>
          </>
        )}
      </div>
    );
  }

  // ── Tracking view ─────────────────────────────────────────────────────────
  if (view === 'tracking' && orderPlaced) {
    const currentStatus = orderPlaced.status || 'pending';
    const isCancelled = currentStatus === 'cancelled';
    const currentStatusIndex = STATUS_STEPS.findIndex(s => s.key === currentStatus);
    const currentStep = STATUS_STEPS[currentStatusIndex];

    return (
      <div className="guestPortal guest-container">
        <div className="guest-card">
          <div className="guest-order-tracking">
            {/* Announces live status changes to screen readers */}
            <p className="guest-sr-only" role="status" aria-live="polite">
              {isCancelled
                ? `Order ${orderPlaced.orderNumber} was cancelled.`
                : `Order ${orderPlaced.orderNumber} status: ${currentStep?.label || currentStatus}.`}
            </p>

            {isCancelled ? (
              <>
                <div className="guest-cancelled-notice">
                  <h3>
                    <span aria-hidden="true">{Icons.Error}</span> Order cancelled
                  </h3>
                  <p>
                    Your order was cancelled. Please place a new order or call the waiter.
                  </p>
                </div>
                <button
                  type="button"
                  className="guest-place-order-btn"
                  onClick={() => {
                    setOrderPlaced(null);
                    setCart([]);
                    sessionStorage.removeItem(getCartKey(token));
                    setView('home');
                  }}
                >
                  Place a new order
                </button>
              </>
            ) : (
              <>
                <div className="guest-order-success-icon" aria-hidden="true">
                  {Icons.Success}
                </div>
                <h2>Order placed</h2>
                <p className="order-number">Order #{orderPlaced.orderNumber}</p>
                <p className="guest-tracking-subtitle">
                  {tableData?.tableName || `Table ${tableData?.tableNumber}`}
                </p>

                <ol className="guest-status-timeline">
                  {STATUS_STEPS.map((step, index) => {
                    const isCompleted = index < currentStatusIndex;
                    const isActive = index === currentStatusIndex;

                    return (
                      <li
                        key={step.key}
                        className={[
                          'guest-status-item',
                          isCompleted ? 'completed' : '',
                          isActive ? 'active' : '',
                          !isCompleted && !isActive ? 'pending' : ''
                        ].join(' ').trim()}
                      >
                        <div className="guest-status-dot" aria-hidden="true">
                          {step.icon}
                        </div>
                        <div className="guest-status-content">
                          <h4 className="guest-status-title">{step.label}</h4>
                          {isActive && <p className="guest-status-time">In progress…</p>}
                          {isCompleted && <p className="guest-status-time">Done</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>

                <button
                  type="button"
                  className="guest-action-btn guest-tracking-back-btn"
                  onClick={() => setView('home')}
                >
                  <div className="guest-action-icon primary" aria-hidden="true">
                    {Icons.Back}
                  </div>
                  <div className="guest-action-content">
                    <h4>Back to home</h4>
                    <p>Order more or call the waiter</p>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GuestTableView;
