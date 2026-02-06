import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './GuestDashboard.css';
import { getAllHotels, getHotelById } from '../../api/hotel';
import { getActiveProperty } from '../../api/staff';
import Mybooking from './Mybooking';
import Foodorder from './Foodorder';
import LoyaltyRewards from './LoyaltyRewards';
import Redeem from './Redeem';
import GuestNotification from './GuestNotification';
import UserProfile from './UserProfile';
import UserSettings from './UserSettings';
import BookingHistory from './BookingHistory';
import { useNotifications } from '../../context/useNotifications';
import GuestHomeContent from './GuestHomeContent';

export default function GuestDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('home'); // home | bookings | food | loyalty | redeem | notifications
  const [redeemReward, setRedeemReward] = useState(null);
  const [initialOrderItem, setInitialOrderItem] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [orderModal, setOrderModal] = useState(null);
  const [orderProgress, setOrderProgress] = useState(40);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [username, setUsername] = useState('Guest');
  const [profilePicture, setProfilePicture] = useState('');
  const { unreadCount } = useNotifications();

  // Runtime data
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loadingHotel, setLoadingHotel] = useState(false);

  const quickOrders = [
    { id: 1, name: 'Dal Bhat', price: 12, img: 'https://images.unsplash.com/photo-1604908177522-2c6d5b70b8c6?auto=format&fit=crop&w=800&q=60' },
    { id: 2, name: 'Momo', price: 8, img: 'https://images.unsplash.com/photo-1605451987060-ec0c2f5b9a78?auto=format&fit=crop&w=800&q=60' },
    { id: 3, name: 'Newari Set', price: 15, img: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=60' },
    { id: 4, name: 'Sel Roti', price: 6, img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=60' }
  ];

  useEffect(() => {
    // Simulate order progress updates for demo purposes
    const timer = setInterval(() => {
      setOrderProgress((p) => {
        if (p >= 95) return 95;
        return p + 1;
      });
    }, 1300);

    return () => clearInterval(timer);
  }, []);


  // Load hotel + rooms from API
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoadingHotel(true);
      try {
        const active = getActiveProperty();
        if (active && active._id) {
          const data = await getHotelById(active._id);
          if (!mounted) return;
          setHotel(data.hotel || null);
          setRooms((data.hotel && data.hotel.rooms) || []);
        } else {
          // fallback: load first public hotel
          const all = await getAllHotels({ page: 1, limit: 6 });
          if (!mounted) return;
          if (all?.hotels?.length) {
            const first = all.hotels[0];
            setHotel(first);
            // fetch full hotel to get rooms
            try {
              const full = await getHotelById(first._id);
              if (!mounted) return;
              setRooms((full.hotel && full.hotel.rooms) || []);
            } catch (err) {
              // ignore; rooms may be empty
              console.warn('Could not fetch hotel rooms', err);
            }
          }
        }
      } catch (err) {
        console.error('Error loading hotels/rooms', err);
      } finally {
        if (mounted) setLoadingHotel(false);
      }
    };

    init();
    return () => { mounted = false };
  }, []);

  function handleNavigate(path) {
    // Support internal section navigation when used inside the dashboard
    switch (path) {
      case '/guest-dashboard':
      case '/guest-dashboard#home':
      case 'home':
        return setActiveSection('home');
      case '/my-bookings':
      case '/guest/bookings':
      case 'bookings':
        return setActiveSection('bookings');
      case '/order-food':
      case '/guest/food-order':
      case 'food':
        return setActiveSection('food');
      case '/guest/loyalty':
      case '/loyalty':
      case 'loyalty':
        return setActiveSection('loyalty');
      case 'notifications':
      case '/guest/notifications':
        return setActiveSection('notifications');
      case '/profile':
      case 'profile':
        return setActiveSection('profile');
      case '/settings':
      case 'settings':
        return setActiveSection('settings');
      case 'history':
      case '/booking-history':
        return setActiveSection('history');
      default:
        // fallback to full navigation for unknown paths
        return navigate(path);
    }
  }

  function handleSelectRoom(room) {
    setSelectedRoom(room.id);
    // Navigate to booking or room details -- adjust path as your app expects
    navigate(`/booking`, { state: { room } });
  }

  function handleOpenOrder(item) {
    setInitialOrderItem(item);
    setOrderModal(item);
    setActiveSection('food');
  }

  useEffect(() => {
    const name = localStorage.getItem('username') || localStorage.getItem('staffUser') || 'Guest';
    const pic = localStorage.getItem('profilePicture') || '';
    setUsername(name);
    setProfilePicture(pic);
  }, []);

  function handleAddToCart(item) {
    // If user is not logged in, send them to login first
    const accessToken = localStorage.getItem('accessToken');
    setOrderModal(null);
    if (!accessToken) {
      // preserve item to show on return by using location state on login if desired
      navigate('/login');
      return;
    }

    // Send user to the order page with the selected quick-order item pre-filled.
    // Prefer internal dashboard section navigation when possible.
    setInitialOrderItem(item);
    setActiveSection('food');
    // Still navigate for full page flows when required
    // navigate('/order-food', { state: { item, hotelId: hotel?._id } });
  }

  return (
    <div className="guest-dashboard-root">
      {/* persistent toggle shown when sidebar is collapsed so brand/menu remain discoverable */}
      <button className="persistent-menu-toggle" aria-label="Open menu" style={{ display: sidebarCollapsed ? 'block' : 'none' }} onClick={() => setSidebarCollapsed(false)}>☰</button>
      <aside className={`guest-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-top">
          <button className="menu-toggle" aria-label="Toggle menu" onClick={() => setSidebarCollapsed((s) => !s)}>☰</button>
          <div className="brand">StayHaven</div>
        </div>

        <nav className="side-nav">
          <button className={`nav-btn ${activeSection === 'home' ? 'active' : ''}`} onClick={() => handleNavigate('home')}>Home</button>
          <button className={`nav-btn ${activeSection === 'bookings' ? 'active' : ''}`} onClick={() => handleNavigate('bookings')}>My Bookings</button>
          <button className={`nav-btn ${activeSection === 'food' ? 'active' : ''}`} onClick={() => handleNavigate('food')}>Order Food</button>
          <button className={`nav-btn ${activeSection === 'history' ? 'active' : ''}`} onClick={() => handleNavigate('history')}>Booking History</button>
          <button className={`nav-btn ${activeSection === 'loyalty' ? 'active' : ''}`} onClick={() => handleNavigate('loyalty')}>Loyalty Rewards</button>
        </nav>

        <div className="sidebar-bottom">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className={`nav-btn ${activeSection === 'profile' ? 'active' : ''}`} onClick={() => handleNavigate('profile')} aria-label="Profile">
              <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" fill="#234" />
                <path d="M3 20c0-3.866 3.134-7 7-7h4c3.866 0 7 3.134 7 7v1H3v-1z" fill="#234" />
              </svg>
              <span className="nav-text">Profile</span>
            </button>

            <button className="nav-btn" onClick={() => handleNavigate('/settings')}>
              <span className="nav-icon">⚙️</span>
              <span className="nav-text">Settings</span>
            </button>

            <button className="nav-btn" onClick={() => handleNavigate('notifications')}>
              <span className="nav-icon">🔔</span>
              <span className="nav-text">Notifications</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="guest-main">
        <header className="guest-header">
          <div>
            <h1>Namaste, {username}!</h1>
            <div className="points">You have <strong>1200 points</strong></div>
          </div>
          <div className="header-actions">
            {/* profile (avatar) on the left, then notifications, then settings */}
            <button className="icon-header" title="Profile" onClick={() => handleNavigate('/profile')}>
              <img src={profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}`} alt="avatar" style={{ width: 28, height: 28, borderRadius: 6 }} />
            </button>
            <button className="icon-header" title="Notifications" onClick={() => handleNavigate('notifications')} style={{ marginLeft: 8 }}>
              🔔
              {unreadCount > 0 && <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>
            <button className="icon-header" title="Settings" onClick={() => handleNavigate('/settings')} style={{ marginLeft: 8 }}>⚙️</button>
          </div>
        </header>

  <div className="embedded-root">
          {activeSection === 'home' && (
            <div className="embedded">
              <GuestHomeContent onNavigate={(s) => setActiveSection(s || 'bookings')} />
            </div>
          )}

          {activeSection === 'bookings' && (
            <div className="embedded">
              <Mybooking embedded onNavigate={(s) => setActiveSection(s)} />
            </div>
          )}

          {activeSection === 'food' && (
            <div className="embedded">
              <Foodorder embedded onNavigate={(s, opts) => {
                if (s === 'home') return setActiveSection('home');
                if (s === 'bookings') return setActiveSection('bookings');
                if (s === 'login') return navigate('/login', { state: opts || {} });
                return setActiveSection(s);
              }} initialItem={initialOrderItem} />
            </div>
          )}

          {activeSection === 'loyalty' && (
            <div className="embedded">
              <LoyaltyRewards embedded onNavigate={(s, opts) => {
                if (s === 'redeem') { setRedeemReward(opts.reward); setActiveSection('redeem'); return; }
                return setActiveSection(s);
              }} />
            </div>
          )}

          {activeSection === 'redeem' && (
            <div className="embedded">
              <Redeem embedded onNavigate={(s) => setActiveSection(s)} rewardProp={redeemReward} />
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="embedded">
              <GuestNotification embedded onNavigate={(s) => setActiveSection(s)} />
            </div>
          )}

          {activeSection === 'profile' && (
            <div className="embedded">
              <UserProfile embedded onNavigate={(s) => setActiveSection(s)} />
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="embedded">
              <UserSettings embedded onNavigate={(s) => setActiveSection(s)} />
            </div>
          )}

          {activeSection === 'history' && (
            <div className="embedded">
              <BookingHistory embedded />
            </div>
          )}
        </div>
      </main>

      {orderModal && (
        <div className="modal-backdrop" onClick={() => setOrderModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <img src={orderModal.img} alt={orderModal.name} />
              <div>
                <h4>{orderModal.name}</h4>
                <p>Price: ${orderModal.price}</p>
                <div className="modal-actions">
                  <button onClick={() => handleAddToCart(orderModal)} className="primary">Add to cart</button>
                  <button onClick={() => setOrderModal(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
