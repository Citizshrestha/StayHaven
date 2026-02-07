import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Foodorder.css';
import axiosClient from '../../axiosClient';
import { getActiveProperty } from '../../api/staff';

const DEMO_MENU = [
  { _id: 'm1', name: 'Dal Bhat', price: 12, description: 'Traditional Nepali meal', img: 'https://images.unsplash.com/photo-1604908177522-2c6d5b70b8c6?auto=format&fit=crop&w=800&q=60' },
  { _id: 'm2', name: 'Momo', price: 8, description: 'Steamed dumplings', img: 'https://images.unsplash.com/photo-1605451987060-ec0c2f5b9a78?auto=format&fit=crop&w=800&q=60' },
  { _id: 'm3', name: 'Newari Set', price: 15, description: 'Newari traditional set', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=60' },
  { _id: 'm4', name: 'Sel Roti', price: 6, description: 'Festive sweet bread', img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=60' }
];

export default function Foodorder({ embedded = false, onNavigate, initialItem = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(false);
  const [protectedMenu, setProtectedMenu] = useState(false);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [hotelId, setHotelId] = useState(null);

  // Use hotelId from location state if provided, else use activeProperty
  useEffect(() => {
    const fromState = location.state?.hotelId || location.state?.hotel?._id || null;
    if (fromState) {
      setHotelId(fromState);
      return;
    }
    const active = getActiveProperty();
    if (active && active._id) setHotelId(active._id);
  }, [location]);

  useEffect(() => {
    const loadCart = () => {
      if (!hotelId) return;
      try {
        const raw = localStorage.getItem('guest_cart');
        if (!raw) return setCart([]);
        const parsed = JSON.parse(raw);
        const byHotel = parsed[hotelId] || [];
        setCart(byHotel);
      } catch (err) {
        console.warn('Failed to load cart', err);
        setCart([]);
      }
    };
    loadCart();
  }, [hotelId]);

  useEffect(() => {
    let mounted = true;
    const fetchMenu = async () => {
      setLoading(true);
      setError(null);
      setProtectedMenu(false);
      try {
        if (!hotelId) {
          // nothing to fetch
          setMenu(DEMO_MENU);
          return;
        }

        // Try staff menu endpoint (protected). If the app is configured to allow guest menu,
        // it will return items; otherwise we'll catch 401/403 and fall back to demo menu.
        const resp = await axiosClient.get('/api/staff/menu-items', { params: { hotelId, available: 'all' } });
        if (!mounted) return;
        if (resp?.data?.menuItems) {
          setMenu(resp.data.menuItems.map(mi => ({
            _id: mi._id,
            name: mi.name,
            price: mi.price || mi.basePrice || 0,
            description: mi.description || mi.details || '',
            img: mi.images?.[0] || mi.image || DEMO_MENU[0].img,
            isAvailable: mi.isAvailable !== false
          })));
        } else {
          setMenu(DEMO_MENU);
        }
      } catch (err) {
        console.warn('Menu fetch failed', err?.response?.status);
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          // Protected menu
          setProtectedMenu(true);
        }
        setMenu(DEMO_MENU);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchMenu();
    return () => { mounted = false };
  }, [hotelId]);

  const saveCart = (newCart) => {
    setCart(newCart);
    try {
      const raw = localStorage.getItem('guest_cart');
      const parsed = raw ? JSON.parse(raw) : {};
      parsed[hotelId || 'global'] = newCart;
      localStorage.setItem('guest_cart', JSON.stringify(parsed));
      // Inform UI about cart update
      window.dispatchEvent(new Event('localCartUpdated'));
    } catch (err) {
      console.warn('Failed to save cart', err);
    }
  };

  const handleAdd = (item) => {
    const existing = cart.find(c => c._id === item._id);
    let updated;
    if (existing) {
      updated = cart.map(c => c._id === item._id ? { ...c, qty: c.qty + 1 } : c);
    } else {
      updated = [...cart, { ...item, qty: 1 }];
    }
    saveCart(updated);
  };

  const handleRemove = (itemId) => {
    const updated = cart.filter(c => c._id !== itemId);
    saveCart(updated);
  };

  const handleChangeQty = (itemId, qty) => {
    if (qty <= 0) return handleRemove(itemId);
    const updated = cart.map(c => c._id === itemId ? { ...c, qty } : c);
    saveCart(updated);
  };

  const handleCheckout = () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      // Save intended path and redirect to login
      if (onNavigate) return onNavigate('login', { from: '/order-food' });
      navigate('/login', { state: { from: '/order-food' } });
      return;
    }

    // For now persist cart and navigate to a checkout route (you can implement server-side order creation there)
    navigate('/order-food/checkout', { state: { hotelId, cart } });
  };

  const handleBackToDashboard = () => {
    if (onNavigate) return onNavigate('home');
    navigate('/guest-dashboard');
  };

  const total = cart.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0);

  return (
    <div className="foodorder-root">
      <header className="foodorder-header">
        <div>
          <h2>Order Food</h2>
          <div className="subtitle">{hotelId ? `Hotel: ${hotelId}` : 'Select a hotel to see menu'}</div>
        </div>
        <div className="header-actions">
          <button onClick={handleBackToDashboard} className="outline">Back</button>
          <button onClick={() => navigate('/my-bookings')} className="outline">My Bookings</button>
        </div>
      </header>

      <div className="foodorder-body">
        <aside className="menu-panel">
          <div className="menu-controls">
            <div className="menu-title">Menu</div>
            {protectedMenu && <div className="protected-note">This menu is protected — staff-only menu shown as demo. Log in for full access.</div>}
          </div>

          {loading && <div className="status">Loading menu…</div>}
          {error && <div className="status error">{error}</div>}

          <div className="menu-grid">
            {menu.map(item => (
              <div key={item._id} className={`menu-item ${item.isAvailable ? '' : 'unavailable'}`}>
                <img src={item.img} alt={item.name} />
                <div className="menu-meta">
                  <div className="menu-name">{item.name}</div>
                  <div className="menu-desc">{item.description}</div>
                  <div className="menu-bottom">
                    <div className="menu-price">${item.price}</div>
                    <div className="menu-cta">
                      <button disabled={!item.isAvailable} onClick={() => handleAdd(item)}>Add</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="cart-panel">
          <h3>Your Cart</h3>
          {!cart.length && <div className="empty">Cart is empty</div>}
          <div className="cart-list">
            {cart.map(ci => (
              <div key={ci._id} className="cart-item">
                <div className="cart-left">
                  <img src={ci.img} alt={ci.name} />
                </div>
                <div className="cart-mid">
                  <div className="cart-name">{ci.name}</div>
                  <div className="cart-price">${ci.price}</div>
                </div>
                <div className="cart-right">
                  <div className="qty-control">
                    <button onClick={() => handleChangeQty(ci._id, (ci.qty || 1) - 1)}>-</button>
                    <input value={ci.qty || 1} onChange={(e) => handleChangeQty(ci._id, parseInt(e.target.value || '0'))} />
                    <button onClick={() => handleChangeQty(ci._id, (ci.qty || 1) + 1)}>+</button>
                  </div>
                  <button className="remove" onClick={() => handleRemove(ci._id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-footer">
            <div className="total">Total: <strong>${total.toFixed(2)}</strong></div>
            <div className="actions">
              <button className="outline" onClick={() => { setCart([]); saveCart([]); }}>Clear</button>
              <button className="primary" disabled={!cart.length} onClick={handleCheckout}>Checkout</button>
            </div>
          </div>
        </main>
      </div>

    </div>
  );
}
