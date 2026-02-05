import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  validateRoomToken, 
  getGuestMenu, 
  createGuestOrder
} from '../../api/qrService';
import './GuestQR.css';

// Icons
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

const GuestRoomView = () => {
  const { token } = useParams();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [hotelData, setHotelData] = useState(null);
  const [view, setView] = useState('home'); // home, menu, checkout, tracking
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', notes: '' });
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [orders, setOrders] = useState([]);

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
        console.error('Room validation error:', err);
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

  // Fetch menu
  const fetchMenu = async () => {
    try {
      setLoading(true);
      const response = await getGuestMenu(hotelData._id);
      
      if (response.success) {
        setMenuItems(response.menuItems || []);
        setCategories(['All', ...(response.categories || [])]);
      }
    } catch (err) {
      console.error('Menu fetch error:', err);
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  // Handle menu navigation
  const handleViewMenu = () => {
    fetchMenu();
    setView('menu');
  };

  // Cart functions
  const addToCart = (item) => {
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

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  // Filter menu items by category
  const filteredMenuItems = activeCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

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
        roomToken: token,
        orderType: 'roomService',
        customerName: customerInfo.name.trim(),
        customerPhone: customerInfo.phone.trim(),
        notes: customerInfo.notes.trim(),
        items: cart.map(item => ({
          menuItem: item.menuItem,
          quantity: item.quantity,
          notes: ''
        }))
      };

      const response = await createGuestOrder(orderData);
      
      if (response.success) {
        setOrderPlaced(response.order);
        setOrders(prev => [response.order, ...prev]);
        setCart([]);
        setView('tracking');
        toast.success('Order placed successfully! It will be delivered to your room.');
      }
    } catch (err) {
      console.error('Order error:', err);
      toast.error(err.message || 'Failed to place order');
    } finally {
      setActionLoading(false);
    }
  };

  // Get room type display
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

  // Loading state
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

  // Error state
  if (error) {
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

  // Home view
  if (view === 'home') {
    return (
      <div className="guest-container room-service">
        <div className="guest-card">
          {/* Header */}
          <div className="guest-header" style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)' }}>
            <div className="guest-header-icon">{Icons.Room}</div>
            <h1>{hotelData?.name || 'Hotel'}</h1>
            <p>Room Service • 24/7 Available</p>
          </div>

          {/* Room Info */}
          <div className="guest-info">
            <div className="guest-info-icon" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
              {Icons.Room}
            </div>
            <div className="guest-info-details">
              <h3>Room {roomData?.roomNumber}</h3>
              <p>{getRoomTypeDisplay(roomData?.type)} • {roomData?.roomName}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="guest-actions">
            <button className="guest-action-btn" onClick={handleViewMenu}>
              <div className="guest-action-icon primary">{Icons.RoomService}</div>
              <div className="guest-action-content">
                <h4>Order Room Service</h4>
                <p>Food & beverages delivered to your room</p>
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
                <p>Tours, transport & special requests</p>
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

          {/* Room Amenities */}
          {roomData?.amenities && roomData.amenities.length > 0 && (
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>Room Amenities</p>
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

  // Menu view
  if (view === 'menu') {
    return (
      <div className="guest-menu-container">
        {/* Header */}
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

          {/* Category Tabs */}
          <div className="guest-category-tabs">
            {categories.map(category => (
              <button
                key={category}
                className={`guest-category-tab ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
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
              return (
                <div 
                  key={item._id} 
                  className={`guest-menu-item ${!item.isAvailable ? 'unavailable' : ''}`}
                >
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

  // Checkout view
  if (view === 'checkout') {
    return (
      <div className="guest-checkout">
        {/* Header */}
        <div className="guest-checkout-header">
          <button className="guest-back-btn" onClick={() => setView('menu')}>
            {Icons.Back}
          </button>
          <h2 className="guest-checkout-title">Room Service Order</h2>
        </div>

        {/* Delivery Info */}
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

        {/* Order Items */}
        <div className="guest-order-items">
          {cart.map(item => (
            <div key={item.menuItem} className="guest-order-item">
              <div className="guest-order-item-qty">{item.quantity}x</div>
              <span className="guest-order-item-name">{item.name}</span>
              <span className="guest-order-item-price">Rs. {item.price * item.quantity}</span>
            </div>
          ))}
        </div>

        {/* Customer Info Form */}
        <div className="guest-form">
          <div className="guest-form-group">
            <label className="guest-form-label">
              {Icons.User} Guest Name *
            </label>
            <input
              type="text"
              className="guest-form-input"
              placeholder="Enter your name"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="guest-form-group">
            <label className="guest-form-label">
              {Icons.Phone} Phone Number (optional)
            </label>
            <input
              type="tel"
              className="guest-form-input"
              placeholder="For delivery updates"
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div className="guest-form-group">
            <label className="guest-form-label">
              {Icons.Notes} Special Instructions (optional)
            </label>
            <textarea
              className="guest-form-textarea"
              placeholder="Any allergies or special requests?"
              value={customerInfo.notes}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>

        {/* Order Summary */}
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

        {/* Place Order Button */}
        <button 
          className="guest-place-order-btn"
          onClick={handlePlaceOrder}
          disabled={actionLoading || cart.length === 0}
          style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
        >
          {actionLoading ? 'Placing Order...' : `Order Room Service • Rs. ${getCartTotal()}`}
        </button>
      </div>
    );
  }

  // Order Tracking view
  if (view === 'tracking' && orderPlaced) {
    const statusSteps = [
      { key: 'pending', label: 'Order Received', icon: '📝' },
      { key: 'confirmed', label: 'Confirmed', icon: Icons.Check },
      { key: 'preparing', label: 'Being Prepared', icon: '👨‍🍳' },
      { key: 'ready', label: 'Out for Delivery', icon: '🚶' },
      { key: 'delivered', label: 'Delivered', icon: Icons.Success },
    ];

    const currentStatusIndex = statusSteps.findIndex(s => s.key === orderPlaced.status);

    return (
      <div className="guest-container room-service">
        <div className="guest-card">
          <div className="guest-order-tracking">
            <div className="guest-order-success-icon" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
              {Icons.Success}
            </div>
            <h2>Order Confirmed!</h2>
            <p className="order-number">Order #{orderPlaced.orderNumber}</p>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Delivering to Room {roomData?.roomNumber}
            </p>

            {/* Status Timeline */}
            <div className="guest-status-timeline">
              {statusSteps.map((step, index) => {
                const isCompleted = index < currentStatusIndex;
                const isActive = index === currentStatusIndex;
                const isPending = index > currentStatusIndex;

                return (
                  <div 
                    key={step.key}
                    className={`guest-status-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}`}
                  >
                    <div className="guest-status-dot">{step.icon}</div>
                    <div className="guest-status-content">
                      <h4 className="guest-status-title">{step.label}</h4>
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
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GuestRoomView;
