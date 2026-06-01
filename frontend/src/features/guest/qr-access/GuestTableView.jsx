import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSocket } from '../../../core/context/SocketContext';
import { 
  validateTableToken, 
  getGuestMenu, 
  createGuestOrder,
  callWaiter,
  requestBill 
} from '../../../api/qrService';
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
  Check: '✓',
  Loading: '⏳',
  Error: '❌',
  Success: '✅',
  Arrow: '→',
  Location: '📍',
  Phone: '📱',
  User: '👤',
  Notes: '📝',
  Cart: '🛒',
};

// Generate a stable session ID for anonymous QR guests.
// Stored in localStorage so it survives soft navigation within the same tab.
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
    // sessionStorage unavailable — silent degradation
  }
};

const GuestTableView = () => {
  const { token } = useParams();
  const { socket, subscribe } = useSocket();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [hotelData, setHotelData] = useState(null);
  const [view, setView] = useState('home');
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState(() => readPersistedCart(token));
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', notes: '' });
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Stable session ID — created once, written to localStorage before SocketProvider
  // reads it (both run at mount, but getOrCreateGuestSessionId fires synchronously
  // in useState initializer so localStorage is populated before the socket effect).
  const guestSessionId = useRef(getOrCreateGuestSessionId()).current;

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
        setError(err.message || 'Failed to validate QR code. Please try again.');
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
  // Re-runs whenever socket changes (e.g. after initial connect).
  useEffect(() => {
    if (!socket || !guestSessionId) return;
    socket.emit('join-guest-session', guestSessionId);
  }, [socket, guestSessionId]);

  // Subscribe to real-time order status updates from the backend.
  // Re-subscribes whenever socket changes so we never miss the connection window.
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

  // Persist cart to sessionStorage on every change
  useEffect(() => {
    writePersistedCart(token, cart);
  }, [cart, token]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const response = await getGuestMenu(hotelData._id);
      if (response.success) {
        setMenuItems(response.menuItems || []);
        setCategories(['All', ...(response.categories || [])]);
      }
    } catch {
      toast.error('Failed to load menu');
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
          i.menuItem === item._id 
            ? { ...i, quantity: i.quantity + 1 }
            : i
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
          i.menuItem === itemId 
            ? { ...i, quantity: i.quantity - 1 }
            : i
        );
      }
      return prev.filter(i => i.menuItem !== itemId);
    });
  };

  const getItemQuantity = (itemId) => {
    const item = cart.find(i => i.menuItem === itemId);
    return item ? item.quantity : 0;
  };

  const getCartTotal = () => cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const getCartCount = () => cart.reduce((total, item) => total + item.quantity, 0);

  // Filter menu items by category (all items, available + unavailable)
  const filteredMenuItems = activeCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

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

    try {
      setActionLoading(true);
      const orderData = {
        hotelId: hotelData._id,
        tableToken: token,
        orderType: 'dineIn',
        customerName: customerInfo.name.trim(),
        customerPhone: customerInfo.phone.trim(),
        notes: customerInfo.notes.trim(),
        guestSessionId,
        items: cart.map(item => ({
          menuItem: item.menuItem,
          quantity: item.quantity,
          notes: ''
        }))
      };

      const response = await createGuestOrder(orderData);
      if (response.success) {
        setOrderPlaced(response.order);
        setCart([]);
        sessionStorage.removeItem(getCartKey(token));
        setView('tracking');
        toast.success('Order placed successfully!');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to place order');
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
        reason
      });
      if (response.success) {
        toast.success('Waiter has been notified! They will be with you shortly.');
      }
    } catch {
      toast.error('Failed to call waiter. Please try again.');
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
        hotelId: hotelData._id
      });
      if (response.success) {
        toast.success('Bill request sent! A waiter will bring your bill shortly.');
      }
    } catch {
      toast.error('Failed to request bill. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading && view === 'home') {
    return (
      <div className="guest-container">
        <div className="guest-card">
          <div className="guest-loading">
            <div className="guest-loading-spinner"></div>
            <p className="guest-loading-text">Loading table information...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error && view === 'home') {
    return (
      <div className="guest-container">
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
      <div className="guest-container">
        <div className="guest-card">
          <div className="guest-header">
            <div className="guest-header-icon">{Icons.Table}</div>
            <h1>{hotelData?.name || 'Restaurant'}</h1>
            <p>{hotelData?.location?.address || 'Welcome!'}</p>
          </div>

          <div className="guest-info">
            <div className="guest-info-icon">{Icons.Location}</div>
            <div className="guest-info-details">
              <h3>{tableData?.tableName || `Table ${tableData?.tableNumber}`}</h3>
              <p>Capacity: {tableData?.capacity} guests • {tableData?.location || 'Indoor'}</p>
            </div>
          </div>

          <div className="guest-actions">
            <button className="guest-action-btn" onClick={handleViewMenu}>
              <div className="guest-action-icon primary">{Icons.Menu}</div>
              <div className="guest-action-content">
                <h4>View Menu</h4>
                <p>Browse our delicious offerings</p>
              </div>
              <span className="guest-action-arrow">{Icons.Arrow}</span>
            </button>

            <button 
              className="guest-action-btn" 
              onClick={() => handleCallWaiter()}
              disabled={actionLoading}
            >
              <div className="guest-action-icon warning">{Icons.Waiter}</div>
              <div className="guest-action-content">
                <h4>Call Waiter</h4>
                <p>Request assistance at your table</p>
              </div>
              <span className="guest-action-arrow">{Icons.Arrow}</span>
            </button>

            <button 
              className="guest-action-btn" 
              onClick={handleRequestBill}
              disabled={actionLoading}
            >
              <div className="guest-action-icon success">{Icons.Bill}</div>
              <div className="guest-action-content">
                <h4>Request Bill</h4>
                <p>Ready to pay? We'll bring your bill</p>
              </div>
              <span className="guest-action-arrow">{Icons.Arrow}</span>
            </button>

            {orderPlaced && (
              <button 
                className="guest-action-btn" 
                onClick={() => setView('tracking')}
              >
                <div className="guest-action-icon success">{Icons.Order}</div>
                <div className="guest-action-content">
                  <h4>Track Order #{orderPlaced.orderNumber}</h4>
                  <p>View your order status</p>
                </div>
                <span className="guest-action-arrow">{Icons.Arrow}</span>
              </button>
            )}
          </div>
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
              <h2>Menu</h2>
              <p>{hotelData?.name}</p>
            </div>
          </div>

          {/* Category Tabs — counts reflect available items only */}
          <div className="guest-category-tabs">
            {categories.map(category => (
              <button
                key={category}
                className={`guest-category-tab ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
                {' '}
                <span style={{ fontSize: '0.75em', opacity: 0.8, marginLeft: 2 }}>
                  ({getCategoryCount(category)})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items */}
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
                  {/* SOLD OUT badge — shown only for unavailable items */}
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

        {/* Cart Footer */}
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
          <h2 className="guest-checkout-title">Your Order</h2>
        </div>

        <div className="guest-order-items">
          {cart.map(item => (
            <div key={item.menuItem} className="guest-order-item">
              <div className="guest-order-item-qty">{item.quantity}x</div>
              <span className="guest-order-item-name">{item.name}</span>
              <span className="guest-order-item-price">Rs. {item.price * item.quantity}</span>
            </div>
          ))}
        </div>

        <div className="guest-form">
          <div className="guest-form-group">
            <label className="guest-form-label">{Icons.User} Your Name *</label>
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
              placeholder="Enter phone number"
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
          <div className="guest-summary-row total">
            <span>Total</span>
            <span>Rs. {getCartTotal()}</span>
          </div>
        </div>

        <button 
          className="guest-place-order-btn"
          onClick={handlePlaceOrder}
          disabled={actionLoading || cart.length === 0}
        >
          {actionLoading ? 'Placing Order...' : `Place Order • Nrs ${getCartTotal()}`}
        </button>
      </div>
    );
  }

  // ── Tracking view ─────────────────────────────────────────────────────────
  if (view === 'tracking' && orderPlaced) {
    const STATUS_STEPS = [
      { key: 'pending',   label: 'Order Received',    icon: '📝' },
      { key: 'confirmed', label: 'Order Confirmed',   icon: Icons.Check },
      { key: 'preparing', label: 'Being Prepared 🍳', icon: '👨‍🍳' },
      { key: 'ready',     label: 'Ready for Pickup ✓',icon: '🍽️' },
      { key: 'delivered', label: 'Delivered 🎉',       icon: Icons.Success },
    ];

    const currentStatus = orderPlaced.status || 'pending';
    const isCancelled = currentStatus === 'cancelled';
    const currentStatusIndex = STATUS_STEPS.findIndex(s => s.key === currentStatus);

    return (
      <div className="guest-container">
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
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: '#dc2626' }}>
                    {Icons.Error} Order Cancelled
                  </p>
                  <p style={{ margin: '6px 0 0', color: '#ef4444', fontSize: '0.88rem' }}>
                    Your order was cancelled. Please place a new order or call the waiter.
                  </p>
                </div>
                <button
                  className="guest-place-order-btn"
                  onClick={() => {
                    setOrderPlaced(null);
                    setCart([]);
                    sessionStorage.removeItem(getCartKey(token));
                    setView('home');
                  }}
                >
                  Place New Order
                </button>
              </>
            ) : (
              <>
                <div className="guest-order-success-icon">{Icons.Success}</div>
                <h2>Order Placed!</h2>
                <p className="order-number">Order #{orderPlaced.orderNumber}</p>

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
                          <h4
                            className="guest-status-title"
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
                    <h4>Back to Home</h4>
                    <p>Order more or call waiter</p>
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
