import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSocket } from '../../../core/context/SocketContext';
import { 
  validateRoomToken, 
  getGuestMenu, 
  createGuestOrder
} from '../../../api/qrService';
import './GuestQR.css';

const Icons = {
  Room: '🛏️',
  RoomService: '🍽️',
  Menu: '📋',
  Order: '🛒',
  Housekeeping: '🧹',
  Concierge: '🛎️',
  Back: '←',
  Add: '+',
  Remove: '−',
  Check: '✓',
  Loading: '⏳',
  Error: '❌',
  Success: '✅',
  Arrow: '→',
  User: '👤',
  Phone: '📱',
  Notes: '📝',
  Cart: '🛒',
  Wifi: '📶',
  TV: '📺',
  AC: '❄️',
};

const STATUS_STEPS = [
  { key: 'pending',   label: 'Order Received',      icon: '📝' },
  { key: 'confirmed', label: 'Order Confirmed',      icon: '✓'  },
  { key: 'preparing', label: 'Being Prepared 🍳',   icon: '👨‍🍳' },
  { key: 'ready',     label: 'Ready for Pickup ✓',  icon: '🍽️' },
  { key: 'delivered', label: 'Delivered 🎉',         icon: '✅' },
];

const getOrCreateGuestSessionId = () => {
  let sessionId = localStorage.getItem('guestSessionId');
  if (!sessionId) {
    sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `GUEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('guestSessionId', sessionId);
  }
  return sessionId;
};

const getCartKey = (token) => `guestCart_room_${token}`;
const readPersistedCart = (token) => {
  try {
    const raw = sessionStorage.getItem(getCartKey(token));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};
const writePersistedCart = (token, cart) => {
  try { sessionStorage.setItem(getCartKey(token), JSON.stringify(cart)); } catch {}
};

const GuestRoomView = () => {
  const { token } = useParams();
  const { socket, subscribe } = useSocket();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [hotelData, setHotelData] = useState(null);
  const [view, setView] = useState('home');
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState(() => readPersistedCart(token));
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', notes: '' });
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [placedOrderId, setPlacedOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [orders, setOrders] = useState([]);

  const guestSessionId = useRef(getOrCreateGuestSessionId()).current;

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
        setError(err.message || 'Failed to validate QR code. Please try again.');
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

  // Socket subscription — fires when backend emits order-status-update.
  // Re-subscribes whenever subscribe (socket) changes to avoid stale closures.
  const handleOrderStatusUpdate = useCallback((payload) => {
    setPlacedOrderId(currentId => {
      if (!currentId) return currentId;
      if (String(payload.orderId) === String(currentId) || String(payload._id) === String(currentId)) {
        setOrderStatus(payload.status);
        setOrderPlaced(prev => prev ? { ...prev, status: payload.status } : prev);
      }
      return currentId;
    });
  }, []);

  useEffect(() => {
    const unsub = subscribe('order-status-update', handleOrderStatusUpdate);
    return () => unsub && unsub();
  }, [subscribe, handleOrderStatusUpdate]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const response = await getGuestMenu(hotelData._id);
      if (response.success) {
        setMenuItems(response.menuItems || []);
        setCategories(['All', ...(response.categories || [])]);
      }
    } catch {
      setError('Failed to load menu');
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

  const getCartTotal = () => cart.reduce((t, i) => t + i.price * i.quantity, 0);
  const getCartCount = () => cart.reduce((t, i) => t + i.quantity, 0);

  const filteredMenuItems = activeCategory === 'All'
    ? menuItems
    : menuItems.filter(item => item.category === activeCategory);

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
    try {
      setActionLoading(true);
      const orderData = {
        hotelId: hotelData._id,
        roomToken: token,
        orderType: 'roomService',
        customerName: customerInfo.name.trim(),
        customerPhone: customerInfo.phone.trim(),
        notes: customerInfo.notes.trim(),
        guestSessionId,
        items: cart.map(item => ({
          menuItem: item.menuItem,
          quantity: item.quantity,
          notes: item.notes || ''
        }))
      };
      const response = await createGuestOrder(orderData);
      if (response.success) {
        const placed = response.order;
        setOrderPlaced(placed);
        setPlacedOrderId(placed._id);
        setOrderStatus(placed.status || 'pending');
        setOrders(prev => [placed, ...prev]);
        setCart([]);
        sessionStorage.removeItem(getCartKey(token));
        setView('tracking');
        toast.success('Order placed successfully! It will be delivered to your room.');
      }
    } catch (err) {
      setError(err.message || 'Failed to place order');
      toast.error(err.message || 'Failed to place order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetOrder = () => {
    setOrderPlaced(null);
    setPlacedOrderId(null);
    setOrderStatus(null);
    setCart([]);
    sessionStorage.removeItem(getCartKey(token));
    setView('home');
  };

  const getRoomTypeDisplay = (type) => {
    const types = {
      single: 'Single Room',
      double: 'Double Room',
      suite: 'Suite',
      deluxe: 'Deluxe Room',
      villa: 'Villa'
    };
    return types[type] || type;
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading && view === 'home') {
    return (
      <div className="guest-container room-service">
        <div className="guest-card">
          <div className="guest-loading">
            <div className="guest-loading-spinner"></div>
            <p className="guest-loading-text">Loading room information...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Top-level error (token invalid / network down) ───────────────────────
  if (error && view === 'home') {
    return (
      <div className="guest-container room-service">
        <div className="guest-card">
          <div className="guest-error">
            <div className="guest-error-icon">{Icons.Error}</div>
            <h2>Oops!</h2>
            <p>{error}</p>
            <button
              className="guest-error-btn"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Home view ─────────────────────────────────────────────────────────────
  if (view === 'home') {
    return (
      <div className="guest-container room-service">
        <div className="guest-card">
          <div className="guest-header" style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)' }}>
            <div className="guest-header-icon">{Icons.Room}</div>
            <h1>{hotelData?.name || 'Hotel'}</h1>
            <p>Room Service • 24/7 Available</p>
          </div>

          <div className="guest-info">
            <div
              className="guest-info-icon"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
            >
              {Icons.Room}
            </div>
            <div className="guest-info-details">
              <h3>Room {roomData?.roomNumber}</h3>
              <p>{getRoomTypeDisplay(roomData?.type)} • {roomData?.roomName}</p>
            </div>
          </div>

          <div className="guest-actions">
            <button className="guest-action-btn" onClick={handleViewMenu}>
              <div className="guest-action-icon primary">{Icons.RoomService}</div>
              <div className="guest-action-content">
                <h4>Order Room Service</h4>
                <p>Food &amp; beverages delivered to your room</p>
              </div>
              <span className="guest-action-arrow">{Icons.Arrow}</span>
            </button>

            <button
              className="guest-action-btn"
              onClick={() => toast.info('Housekeeping request feature coming soon!')}
            >
              <div className="guest-action-icon warning">{Icons.Housekeeping}</div>
              <div className="guest-action-content">
                <h4>Housekeeping</h4>
                <p>Request room cleaning or supplies</p>
              </div>
              <span className="guest-action-arrow">{Icons.Arrow}</span>
            </button>

            <button
              className="guest-action-btn"
              onClick={() => toast.info('Concierge feature coming soon!')}
            >
              <div className="guest-action-icon success">{Icons.Concierge}</div>
              <div className="guest-action-content">
                <h4>Concierge</h4>
                <p>Tours, transport &amp; special requests</p>
              </div>
              <span className="guest-action-arrow">{Icons.Arrow}</span>
            </button>

            {orders.length > 0 && (
              <button
                className="guest-action-btn"
                onClick={() => {
                  setOrderPlaced(orders[0]);
                  setView('tracking');
                }}
              >
                <div className="guest-action-icon success">{Icons.Order}</div>
                <div className="guest-action-content">
                  <h4>Track Order #{orders[0].orderNumber}</h4>
                  <p>View your order status</p>
                </div>
                <span className="guest-action-arrow">{Icons.Arrow}</span>
              </button>
            )}
          </div>

          {roomData?.amenities && roomData.amenities.length > 0 && (
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>
                Room Amenities
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {roomData.amenities.map((amenity, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 10px',
                      background: '#f1f5f9',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      color: '#475569'
                    }}
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Menu view ─────────────────────────────────────────────────────────────
  if (view === 'menu') {
    return (
      <div className="guest-menu-container">
        <div className="guest-menu-header">
          <div className="guest-menu-header-top">
            <button className="guest-back-btn" onClick={() => setView('home')}>
              {Icons.Back}
            </button>
            <div className="guest-menu-title">
              <h2>Room Service Menu</h2>
              <p>Room {roomData?.roomNumber}</p>
            </div>
          </div>

          <div className="guest-category-tabs">
            {categories.map(category => (
              <button
                key={category}
                className={`guest-category-tab ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
                {' '}
                <span style={{
                  fontSize: '0.75em',
                  opacity: 0.8,
                  marginLeft: 2
                }}>
                  ({getCategoryCount(category)})
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px 16px',
            margin: '12px',
            color: '#dc2626',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="guest-loading">
            <div className="guest-loading-spinner"></div>
            <p className="guest-loading-text">Loading menu...</p>
          </div>
        ) : (
          <div className="guest-menu-grid">
            {filteredMenuItems.map(item => {
              const quantity = getItemQuantity(item._id);
              const unavailable = !item.isAvailable;
              return (
                <div
                  key={item._id}
                  className="guest-menu-item"
                  style={unavailable ? {
                    opacity: 0.5,
                    filter: 'grayscale(40%)',
                    position: 'relative'
                  } : { position: 'relative' }}
                >
                  {unavailable && (
                    <span style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: '#ef4444',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      zIndex: 2
                    }}>
                      SOLD OUT
                    </span>
                  )}
                  <img
                    src={item.image || 'https://via.placeholder.com/90x90?text=Food'}
                    alt={item.name}
                    className="guest-menu-item-image"
                  />
                  <div className="guest-menu-item-content">
                    <div className="guest-menu-item-header">
                      <h4 className="guest-menu-item-name">{item.name}</h4>
                      {item.isVeg !== undefined && (
                        <div className={`guest-menu-item-veg ${item.isVeg ? 'veg' : 'non-veg'}`}></div>
                      )}
                    </div>
                    {item.description && (
                      <p className="guest-menu-item-desc">{item.description}</p>
                    )}
                    <div className="guest-menu-item-footer">
                      <span className="guest-menu-item-price">Rs. {item.price}</span>
                      <div className="guest-menu-item-add">
                        {quantity === 0 ? (
                          <button
                            className="guest-add-btn"
                            onClick={() => addToCart(item)}
                            disabled={unavailable}
                            style={unavailable ? {
                              cursor: 'not-allowed',
                              background: '#e2e8f0'
                            } : {}}
                          >
                            ADD
                          </button>
                        ) : (
                          <div className="guest-qty-control">
                            <button
                              className="guest-qty-btn"
                              onClick={() => removeFromCart(item._id)}
                            >
                              {Icons.Remove}
                            </button>
                            <span className="guest-qty-value">{quantity}</span>
                            <button
                              className="guest-qty-btn"
                              onClick={() => addToCart(item)}
                              disabled={unavailable}
                            >
                              {Icons.Add}
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
              <p className="guest-cart-count">{getCartCount()} items</p>
              <p className="guest-cart-total">Rs. {getCartTotal()}</p>
            </div>
            <button
              className="guest-cart-btn"
              onClick={() => setView('checkout')}
            >
              {Icons.Cart} View Cart
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Checkout view ─────────────────────────────────────────────────────────
  if (view === 'checkout') {
    return (
      <div className="guest-checkout">
        <div className="guest-checkout-header">
          <button className="guest-back-btn" onClick={() => setView('menu')}>
            {Icons.Back}
          </button>
          <h2 className="guest-checkout-title">Room Service Order</h2>
        </div>

        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>{Icons.Room}</span>
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: '#065f46' }}>
              Delivering to Room {roomData?.roomNumber}
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#047857' }}>
              Estimated delivery: 20-30 mins
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: '#dc2626',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        <div className="guest-order-items">
          {cart.map(item => (
            <div key={item.menuItem}>
              <div className="guest-order-item">
                <div className="guest-order-item-qty">{item.quantity}x</div>
                <span className="guest-order-item-name">{item.name}</span>
                <span className="guest-order-item-price">Rs. {item.price * item.quantity}</span>
              </div>
              <input
                type="text"
                className="guest-form-input"
                style={{ margin: '4px 0 10px', fontSize: '0.85rem', padding: '8px 12px' }}
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
            <label className="guest-form-label">{Icons.User} Guest Name *</label>
            <input
              type="text"
              className="guest-form-input"
              placeholder="Enter your name"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="guest-form-group">
            <label className="guest-form-label">{Icons.Phone} Phone Number (optional)</label>
            <input
              type="tel"
              className="guest-form-input"
              placeholder="For delivery updates"
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div className="guest-form-group">
            <label className="guest-form-label">{Icons.Notes} Special Instructions (optional)</label>
            <textarea
              className="guest-form-textarea"
              placeholder="Any allergies or special requests?"
              value={customerInfo.notes}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="guest-order-summary">
          <div className="guest-summary-row">
            <span>Subtotal</span>
            <span>Rs. {getCartTotal()}</span>
          </div>
          <div className="guest-summary-row">
            <span>Room Service Fee</span>
            <span>Rs. 0</span>
          </div>
          <div className="guest-summary-row total">
            <span>Total</span>
            <span>Rs. {getCartTotal()}</span>
          </div>
        </div>

        <button
          className="guest-place-order-btn"
          onClick={handlePlaceOrder}
          disabled={actionLoading || cart.length === 0}
          style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
        >
          {actionLoading ? 'Placing Order...' : `Order Room Service • Nrs ${getCartTotal()}`}
        </button>
      </div>
    );
  }

  // ── Tracking view ─────────────────────────────────────────────────────────
  if (view === 'tracking' && orderPlaced) {
    const currentStatus = orderStatus || orderPlaced.status || 'pending';
    const isCancelled = currentStatus === 'cancelled';
    const currentStatusIndex = STATUS_STEPS.findIndex(s => s.key === currentStatus);

    return (
      <div className="guest-container room-service">
        <div className="guest-card">
          <div className="guest-order-tracking">

            {isCancelled ? (
              <>
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '24px',
                  textAlign: 'center'
                }}>
                  <p style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    color: '#dc2626'
                  }}>
                    {Icons.Error} Order Cancelled
                  </p>
                  <p style={{ margin: '6px 0 0', color: '#ef4444', fontSize: '0.88rem' }}>
                    Your order has been cancelled. Please place a new order or contact reception.
                  </p>
                </div>
                <button
                  className="guest-place-order-btn"
                  onClick={handleResetOrder}
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
                >
                  Place New Order
                </button>
              </>
            ) : (
              <>
                <div
                  className="guest-order-success-icon"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
                >
                  {Icons.Success}
                </div>
                <h2>Order Confirmed!</h2>
                <p className="order-number">Order #{orderPlaced.orderNumber}</p>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  Delivering to Room {roomData?.roomNumber}
                </p>

                {/* Stepper */}
                <div className="guest-status-timeline">
                  {STATUS_STEPS.map((step, index) => {
                    const isCompleted = index < currentStatusIndex;
                    const isActive = index === currentStatusIndex;

                    return (
                      <div
                        key={step.key}
                        className={[
                          'guest-status-item',
                          isCompleted ? 'completed' : '',
                          isActive ? 'active' : '',
                          !isCompleted && !isActive ? 'pending' : ''
                        ].join(' ').trim()}
                      >
                        <div
                          className="guest-status-dot"
                          style={isActive ? {
                            boxShadow: '0 0 0 4px rgba(16,185,129,0.25)',
                            animation: 'guestPulse 1.5s ease-in-out infinite'
                          } : {}}
                        >
                          {step.icon}
                        </div>
                        <div className="guest-status-content">
                          <h4 className="guest-status-title"
                            style={!isCompleted && !isActive ? { color: '#94a3b8' } : {}}
                          >
                            {step.label}
                          </h4>
                          {isActive && (
                            <p className="guest-status-time">In progress...</p>
                          )}
                          {isCompleted && (
                            <p className="guest-status-time">Completed</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  className="guest-action-btn"
                  onClick={() => setView('home')}
                  style={{ marginTop: '24px' }}
                >
                  <div className="guest-action-icon primary">{Icons.Back}</div>
                  <div className="guest-action-content">
                    <h4>Back to Room Services</h4>
                    <p>Order more or request services</p>
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
