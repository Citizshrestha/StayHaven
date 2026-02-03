import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  validateTableToken, 
  getGuestMenu, 
  createGuestOrder,
  callWaiter,
  requestBill 
} from '../../api/qrService';
import './GuestQR.css';

// Icons (using Unicode for simplicity - can replace with lucide-react)
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

const GuestTableView = () => {
  const { token } = useParams();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [hotelData, setHotelData] = useState(null);
  const [view, setView] = useState('home'); // home, menu, checkout, tracking
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', notes: '' });
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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
        console.error('Table validation error:', err);
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

  // Fetch menu when viewing menu
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
        tableToken: token,
        orderType: 'dineIn',
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
        setCart([]);
        setView('tracking');
        toast.success('Order placed successfully!');
      }
    } catch (err) {
      console.error('Order error:', err);
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
    } catch (err) {
      console.error('Call waiter error:', err);
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
    } catch (err) {
      console.error('Request bill error:', err);
      toast.error('Failed to request bill. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Loading state
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

  // Error state
  if (error) {
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

  // Home view
  if (view === 'home') {
    return (
      <div className="guest-container">
        <div className="guest-card">
          {/* Header */}
          <div className="guest-header">
            <div className="guest-header-icon">{Icons.Table}</div>
            <h1>{hotelData?.name || 'Restaurant'}</h1>
            <p>{hotelData?.location?.address || 'Welcome!'}</p>
          </div>

          {/* Table Info */}
          <div className="guest-info">
            <div className="guest-info-icon">{Icons.Location}</div>
            <div className="guest-info-details">
              <h3>{tableData?.tableName || `Table ${tableData?.tableNumber}`}</h3>
              <p>Capacity: {tableData?.capacity} guests • {tableData?.location || 'Indoor'}</p>
            </div>
          </div>

          {/* Actions */}
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
              <h2>Menu</h2>
              <p>{hotelData?.name}</p>
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
          <h2 className="guest-checkout-title">Your Order</h2>
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
              {Icons.User} Your Name *
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
              placeholder="Enter phone number"
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
        >
          {actionLoading ? 'Placing Order...' : `Place Order • Rs. ${getCartTotal()}`}
        </button>
      </div>
    );
  }

  // Order Tracking view
  if (view === 'tracking' && orderPlaced) {
    const statusSteps = [
      { key: 'pending', label: 'Order Placed', icon: Icons.Check },
      { key: 'confirmed', label: 'Confirmed', icon: Icons.Check },
      { key: 'preparing', label: 'Preparing', icon: '👨‍🍳' },
      { key: 'ready', label: 'Ready to Serve', icon: '🍽️' },
      { key: 'delivered', label: 'Served', icon: Icons.Success },
    ];

    const currentStatusIndex = statusSteps.findIndex(s => s.key === orderPlaced.status);

    return (
      <div className="guest-container">
        <div className="guest-card">
          <div className="guest-order-tracking">
            <div className="guest-order-success-icon">{Icons.Success}</div>
            <h2>Order Placed!</h2>
            <p className="order-number">Order #{orderPlaced.orderNumber}</p>

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
                <h4>Back to Home</h4>
                <p>Order more or call waiter</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GuestTableView;
