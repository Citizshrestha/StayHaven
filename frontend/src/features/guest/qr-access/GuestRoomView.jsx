import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSocket } from '../../../core/context/SocketContext';
import {
  validateRoomToken,
  getGuestMenu,
  createGuestOrder,
  createRoomRequest,
  getRoomRequests,
} from '../../../core/api/services/guestQr.service';
import { getOrCreateGuestSessionId, generateIdempotencyKey } from './guestSession';
import { formatMoney } from '../dashboard/utils/format';
import '../dashboard/styles/guest-tokens.css';
import './GuestQR.css';

const Icons = {
  Room: '🛏️',
  RoomService: '🍽️',
  Menu: '📋',
  Order: '🛒',
  Back: '←',
  Add: '+',
  Remove: '−',
  Error: '❌',
  Success: '✅',
  Arrow: '→',
  User: '👤',
  Phone: '📱',
  Notes: '📝',
  Cart: '🛒',
  Food: '🍲',
};

const STATUS_STEPS = [
  { key: 'pending',   label: 'Order received',    icon: '📝' },
  { key: 'confirmed', label: 'Order confirmed',   icon: '✓' },
  { key: 'preparing', label: 'Being prepared',    icon: '👨‍🍳' },
  { key: 'ready',     label: 'Ready for delivery', icon: '🍽️' },
  { key: 'delivered', label: 'Delivered to room', icon: '✅' },
];

// Room services the front desk / housekeeping handle (no charge).
const ROOM_SERVICES = [
  { kind: 'housekeeping', icon: '🧹', title: 'Clean my room', hint: 'Housekeeping visit' },
  { kind: 'amenities', icon: '🧴', title: 'Towels & toiletries', hint: 'Fresh towels, soap, water' },
  { kind: 'maintenance', icon: '🔧', title: 'Something needs fixing', hint: 'AC, lights, plumbing, TV' },
  { kind: 'checkout', icon: '🕐', title: 'Late checkout', hint: 'Ask to stay a little longer' },
  { kind: 'concierge', icon: '🛎️', title: 'Ask the front desk', hint: 'Taxi, wake-up call, anything else' },
];

const REQUEST_STATUS = {
  open: 'Sent — waiting for staff',
  assigned: 'On it — a staff member is assigned',
  resolved: 'Done',
  ignored: 'Closed by the front desk',
  denied: 'Declined by the front desk',
};

const getCartKey = (token) => `guestCart_room_${token}`;

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
    // sessionStorage unavailable (private mode / quota) — degrade silently.
  }
};

const ROOM_TYPE_LABELS = {
  single: 'Single Room',
  double: 'Double Room',
  suite: 'Suite',
  deluxe: 'Deluxe Room',
  villa: 'Villa',
};

const GuestRoomView = () => {
  const { token } = useParams();
  const { socket, subscribe } = useSocket();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuError, setMenuError] = useState(null);
  const [roomData, setRoomData] = useState(null);
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
  // Every order this guest session has placed, newest first. Kept in session
  // memory only — a later occupant scanning the same room QR gets a fresh
  // session and therefore never sees a previous guest's orders.
  const [orders, setOrders] = useState([]);
  // Service requests (housekeeping, maintenance, ...) raised from this phone.
  const [requests, setRequests] = useState([]);
  const [requestKind, setRequestKind] = useState(null);
  const [requestDetails, setRequestDetails] = useState('');
  const [requestUrgent, setRequestUrgent] = useState(false);
  const [requestError, setRequestError] = useState(null);

  const guestSessionId = useRef(getOrCreateGuestSessionId()).current;

  // Stays stable across retries of the same failed checkout attempt so a
  // timeout/retry cannot create a duplicate order; cleared after success.
  const pendingOrderKeyRef = useRef(null);

  // Join the guest session room as soon as socket is available (or reconnects)
  useEffect(() => {
    if (!socket || !guestSessionId) return;
    socket.emit('join-guest-session', guestSessionId);
  }, [socket, guestSessionId]);

  // Persist cart to sessionStorage on every change
  useEffect(() => {
    writePersistedCart(token, cart);
  }, [cart, token]);

  // Validate room token on mount
  useEffect(() => {
    const validateRoom = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await validateRoomToken(token);
        if (response.success) {
          setRoomData(response.data.room);
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
      validateRoom();
    } else {
      setError('Invalid QR code');
      setLoading(false);
    }
  }, [token]);

  // Guests receive `order-status-update` (singular); staff rooms get
  // `order-status-updated`. Updates every tracked order so switching between
  // several orders from one session always shows current state.
  const handleOrderStatusUpdate = useCallback((payload) => {
    const incomingId = String(payload.orderId ?? payload._id ?? '');
    if (!incomingId) return;

    setOrders(prev => prev.map(o =>
      String(o._id) === incomingId ? { ...o, status: payload.status } : o
    ));
    setOrderPlaced(prev =>
      prev && String(prev._id) === incomingId
        ? { ...prev, status: payload.status }
        : prev
    );
  }, []);

  useEffect(() => {
    const unsub = subscribe('order-status-update', handleOrderStatusUpdate);
    return () => unsub && unsub();
  }, [subscribe, handleOrderStatusUpdate]);

  // Service requests: restore this phone's recent ones, then follow live updates.
  useEffect(() => {
    if (!roomData || !token) return;
    getRoomRequests(token, guestSessionId)
      .then((res) => { if (res?.success) setRequests(res.data || []); })
      .catch(() => { /* non-fatal: the list just starts empty */ });
  }, [roomData, token, guestSessionId]);

  useEffect(() => {
    const unsub = subscribe('room-request-update', (update) => {
      setRequests((prev) => prev.map((r) => (String(r._id) === String(update._id) ? { ...r, ...update } : r)));
      if (update.status === 'assigned') toast.info(`${update.label}: a staff member is on it`);
      if (update.status === 'resolved') toast.success(`${update.label}: done`);
    });
    return () => unsub && unsub();
  }, [subscribe]);

  const openRequest = (kind) => {
    setRequestKind(kind);
    setRequestDetails('');
    setRequestUrgent(false);
    setRequestError(null);
    setView('request');
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (requestKind === 'maintenance' && requestDetails.trim().length < 3) {
      setRequestError('Tell us briefly what needs fixing');
      return;
    }
    try {
      setActionLoading(true);
      setRequestError(null);
      const res = await createRoomRequest({
        roomToken: token,
        hotelId: hotelData._id,
        kind: requestKind,
        details: requestDetails.trim() || undefined,
        urgent: requestUrgent,
        guestName: customerInfo.name.trim() || undefined,
        guestSessionId,
      });
      if (res.success) {
        setRequests((prev) => [res.data, ...prev.filter((r) => String(r._id) !== String(res.data._id))]);
        toast.success(res.duplicate ? 'We already have this request — staff are on it' : 'Request sent to the front desk');
        setView('home');
      }
    } catch (err) {
      setRequestError(err?.message || 'Could not send your request. Please call the front desk.');
    } finally {
      setActionLoading(false);
    }
  };

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

  const addToCart = (item) => {
    if (!item.isAvailable) return;
    setCart(prev => {
      const existing = prev.find(i => i.menuItem === item._id);
      if (existing) {
        return prev.map(i =>
          i.menuItem === item._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { menuItem: item._id, name: item.name, price: item.price, quantity: 1 }];
    });
    toast.success(`${item.name} added to cart`, { autoClose: 1500 });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItem === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.menuItem === itemId ? { ...i, quantity: i.quantity - 1 } : i);
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

  const cartTotal = cart.reduce((t, i) => t + i.price * i.quantity, 0);
  const cartCount = cart.reduce((t, i) => t + i.quantity, 0);

  const filteredMenuItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return menuItems.filter(item => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      if (!matchesCategory) return false;
      if (!query) return true;
      return `${item.name} ${item.description || ''}`.toLowerCase().includes(query);
    });
  }, [menuItems, activeCategory, search]);

  const getCategoryCount = (category) => {
    const source = category === 'All'
      ? menuItems
      : menuItems.filter(i => i.category === category);
    return source.filter(i => i.isAvailable).length;
  };

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
      setMenuError(null);

      if (!pendingOrderKeyRef.current) {
        pendingOrderKeyRef.current = generateIdempotencyKey();
      }

      const orderData = {
        hotelId: hotelData._id,
        roomToken: token,
        orderType: 'roomService',
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
        const placed = response.order;
        setOrderPlaced(placed);
        // Replace on idempotent replay so a retry never double-lists an order.
        setOrders(prev => [placed, ...prev.filter(o => String(o._id) !== String(placed._id))]);
        setCart([]);
        sessionStorage.removeItem(getCartKey(token));
        setView('tracking');
        toast.success('Order placed! It will be delivered to your room.');
      }
    } catch (err) {
      const message = err?.response?.data?.message || err.message || 'Failed to place order';
      if (err?.response?.status === 400 || err?.response?.status === 404) {
        pendingOrderKeyRef.current = null;
      }
      // Surfaced inline on the checkout screen, not as a full-page error —
      // the guest's cart and details must survive a failed submission.
      setMenuError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const roomTypeLabel = ROOM_TYPE_LABELS[roomData?.type] || roomData?.type || '';

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading && view === 'home') {
    return (
      <div className="guestPortal guest-container room-service">
        <div className="guest-card">
          <div className="guest-loading">
            <div className="guest-loading-spinner" />
            <p className="guest-loading-text" role="status">Loading room information…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Top-level error (token invalid / network down) ───────────────────────
  if (error && view === 'home') {
    return (
      <div className="guestPortal guest-container room-service">
        <div className="guest-card">
          <div className="guest-error">
            <div className="guest-error-icon" aria-hidden="true">{Icons.Error}</div>
            <h2>We couldn’t open this room</h2>
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
      <div className="guestPortal guest-container room-service">
        <div className="guest-card">
          <div className="guest-header">
            <div className="guest-header-icon" aria-hidden="true">{Icons.Room}</div>
            <h1>{hotelData?.name || 'Hotel'}</h1>
            <p>Room service • Available 24/7</p>
          </div>

          <div className="guest-info">
            <div className="guest-info-icon" aria-hidden="true">{Icons.Room}</div>
            <div className="guest-info-details">
              <h3>Room {roomData?.roomNumber}</h3>
              <p>{[roomTypeLabel, roomData?.roomName].filter(Boolean).join(' • ')}</p>
            </div>
          </div>

          <div className="guest-actions">
            <button type="button" className="guest-action-btn" onClick={handleViewMenu}>
              <div className="guest-action-icon primary" aria-hidden="true">{Icons.RoomService}</div>
              <div className="guest-action-content">
                <h4>Order room service</h4>
                <p>Food and drinks delivered to your room</p>
              </div>
              <span className="guest-action-arrow" aria-hidden="true">{Icons.Arrow}</span>
            </button>

            {orders.map(order => (
              <button
                type="button"
                key={order._id}
                className="guest-action-btn"
                onClick={() => {
                  setOrderPlaced(order);
                  setView('tracking');
                }}
              >
                <div className="guest-action-icon success" aria-hidden="true">{Icons.Order}</div>
                <div className="guest-action-content">
                  <h4>Track order #{order.orderNumber}</h4>
                  <p>
                    {order.status === 'cancelled'
                      ? 'Cancelled'
                      : `Status: ${STATUS_STEPS.find(s => s.key === order.status)?.label || order.status}`}
                  </p>
                </div>
                <span className="guest-action-arrow" aria-hidden="true">{Icons.Arrow}</span>
              </button>
            ))}
          </div>

          <section className="guest-services" aria-labelledby="room-services-title">
            <h2 id="room-services-title" className="guest-amenities-title">Room services · free of charge</h2>
            <div className="guest-actions">
              {ROOM_SERVICES.map((service) => (
                <button key={service.kind} type="button" className="guest-action-btn" onClick={() => openRequest(service.kind)}>
                  <div className="guest-action-icon warning" aria-hidden="true">{service.icon}</div>
                  <div className="guest-action-content">
                    <h4>{service.title}</h4>
                    <p>{service.hint}</p>
                  </div>
                  <span className="guest-action-arrow" aria-hidden="true">{Icons.Arrow}</span>
                </button>
              ))}
            </div>
          </section>

          {requests.length > 0 && (
            <section className="guest-services" aria-labelledby="room-requests-title">
              <h2 id="room-requests-title" className="guest-amenities-title">Your requests</h2>
              <ul className="guest-request-list" aria-live="polite">
                {requests.map((r) => (
                  <li key={r._id} className={`guest-request-item status-${r.status}`}>
                    <span className="guest-request-title">{r.label}</span>
                    <span className="guest-request-status">{REQUEST_STATUS[r.status] || r.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {roomData?.amenities?.length > 0 && (
            <div className="guest-amenities">
              <p className="guest-amenities-title">Room amenities</p>
              <ul className="guest-amenities-list">
                {roomData.amenities.map((amenity) => (
                  <li key={amenity} className="guest-amenity-chip">{amenity}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="guest-payment-note">
            Room service is charged to your room bill — settle it at checkout.
          </p>
        </div>
      </div>
    );
  }

  // ── Room service request view ─────────────────────────────────────────────
  if (view === 'request') {
    const service = ROOM_SERVICES.find((s) => s.kind === requestKind) || ROOM_SERVICES[0];
    const detailsRequired = service.kind === 'maintenance';
    return (
      <div className="guestPortal guest-checkout room-service">
        <div className="guest-checkout-header">
          <button type="button" className="guest-back-btn" onClick={() => setView('home')} aria-label="Back">
            <span aria-hidden="true">{Icons.Back}</span>
          </button>
          <h2 className="guest-checkout-title">{service.title}</h2>
        </div>

        <form className="guest-form" onSubmit={handleSubmitRequest} noValidate>
          <p className="guest-summary-note">
            Room {roomData?.roomNumber} · {service.hint}. The front desk sees this straight away.
          </p>
          <div className="guest-form-group">
            <label className="guest-form-label" htmlFor="request-details">
              {detailsRequired ? 'What needs fixing? *' : 'Anything we should know? (optional)'}
            </label>
            <textarea
              id="request-details"
              className="guest-form-textarea"
              maxLength={300}
              required={detailsRequired}
              aria-invalid={Boolean(requestError) || undefined}
              aria-describedby={requestError ? 'request-error' : undefined}
              placeholder={detailsRequired ? 'e.g. The AC is not cooling' : 'e.g. After 2 pm please'}
              value={requestDetails}
              onChange={(e) => setRequestDetails(e.target.value)}
            />
          </div>
          <div className="guest-form-group">
            <label className="guest-form-label" htmlFor="request-name">Your name (optional)</label>
            <input
              id="request-name"
              type="text"
              className="guest-form-input"
              autoComplete="name"
              maxLength={100}
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <label className="guest-checkbox">
            <input type="checkbox" checked={requestUrgent} onChange={(e) => setRequestUrgent(e.target.checked)} />
            This is urgent
          </label>
          {requestError && <p id="request-error" className="guest-form-error" role="alert">{requestError}</p>}
          <button type="submit" className="guest-place-order-btn" disabled={actionLoading}>
            {actionLoading ? 'Sending…' : 'Send request'}
          </button>
          <p className="guest-payment-note">For emergencies, call the front desk directly{hotelData?.contact?.phone ? ` on ${hotelData.contact.phone}` : ''}.</p>
        </form>
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
              aria-label="Back to room services"
            >
              <span aria-hidden="true">{Icons.Back}</span>
            </button>
            <div className="guest-menu-title">
              <h2>Room service menu</h2>
              <p>Room {roomData?.roomNumber}</p>
            </div>
          </div>

          <div className="guest-menu-search">
            <label className="guest-sr-only" htmlFor="guest-room-menu-search">
              Search the menu
            </label>
            <input
              id="guest-room-menu-search"
              type="search"
              className="guest-form-input"
              placeholder="Search dishes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

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
          <h2 className="guest-checkout-title">Room service order</h2>
        </div>

        <div className="guest-delivery-banner">
          <span className="guest-delivery-banner-icon" aria-hidden="true">{Icons.Room}</span>
          <div>
            <p className="guest-delivery-banner-title">
              Delivering to Room {roomData?.roomNumber}
            </p>
            <p className="guest-delivery-banner-note">Usually arrives in 20–30 minutes</p>
          </div>
        </div>

        {menuError && (
          <div className="guest-inline-error" role="alert">
            <span>{menuError}</span>
          </div>
        )}

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
                  <label className="guest-sr-only" htmlFor={`room-note-${item.menuItem}`}>
                    Note for {item.name}
                  </label>
                  <input
                    id={`room-note-${item.menuItem}`}
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
                <label className="guest-form-label" htmlFor="room-guest-name">
                  <span aria-hidden="true">{Icons.User}</span> Guest name *
                </label>
                <input
                  id="room-guest-name"
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
                <label className="guest-form-label" htmlFor="room-guest-phone">
                  <span aria-hidden="true">{Icons.Phone}</span> Phone number (optional)
                </label>
                <input
                  id="room-guest-phone"
                  type="tel"
                  className="guest-form-input"
                  placeholder="For delivery updates"
                  autoComplete="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="guest-form-group">
                <label className="guest-form-label" htmlFor="room-guest-notes">
                  <span aria-hidden="true">{Icons.Notes}</span> Special instructions (optional)
                </label>
                <textarea
                  id="room-guest-notes"
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
              <div className="guest-summary-row total">
                <span>Total</span>
                <span>{formatMoney(cartTotal)}</span>
              </div>
              <p className="guest-summary-note">
                Final pricing is confirmed by the hotel when your order is accepted.
              </p>
            </div>

            <button
              type="button"
              className="guest-place-order-btn"
              onClick={handlePlaceOrder}
              disabled={actionLoading || cart.length === 0}
            >
              {actionLoading ? 'Placing order…' : `Order room service • ${formatMoney(cartTotal)}`}
            </button>

            <p className="guest-payment-note">
              No payment needed now — this is charged to your room bill.
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
      <div className="guestPortal guest-container room-service">
        <div className="guest-card">
          <div className="guest-order-tracking">
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
                    Your order was cancelled. Please place a new order or contact reception.
                  </p>
                </div>
                <button
                  type="button"
                  className="guest-place-order-btn"
                  onClick={() => {
                    setOrderPlaced(null);
                    setView('home');
                  }}
                >
                  Back to room services
                </button>
              </>
            ) : (
              <>
                <div className="guest-order-success-icon" aria-hidden="true">
                  {Icons.Success}
                </div>
                <h2>Order confirmed</h2>
                <p className="order-number">Order #{orderPlaced.orderNumber}</p>
                <p className="guest-tracking-subtitle">
                  Delivering to Room {roomData?.roomNumber}
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
                    <h4>Back to room services</h4>
                    <p>Order more to your room</p>
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

export default GuestRoomView;
