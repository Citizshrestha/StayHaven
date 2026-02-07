import React from 'react';
import { useNavigate } from 'react-router-dom';
import './GuestNotification.css';
import { useNotifications } from '../../context/useNotifications';

export default function GuestNotification({ embedded = false, onNavigate }) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead, clearAll, removeNotification } = useNotifications();

  const handleItemClick = (n) => {
    // Mark as read when opening
    if (!n.isRead) markRead(n.id);

    // If notification has actionUrl, use it
    if (n.actionUrl) {
      // actionUrl may be absolute or relative
      if (n.actionUrl.startsWith('http')) {
        window.open(n.actionUrl, '_blank');
      } else {
        navigate(n.actionUrl);
      }
      return;
    }

    // If it references an order, try to navigate to booking/order
    if (n.orderId) {
      // Prefer booking route used in guest pages
      navigate(`/booking/${n.orderId}`, { state: { orderId: n.orderId } });
      return;
    }

    // Default: do nothing
  };

  return (
    <div className="guest-notifications-root">
      <aside className="guest-notif-side">
        <div className="brand">HotelsInNepal</div>
        <nav className="side-nav">
          <button className="nav-btn" onClick={() => onNavigate ? onNavigate('home') : navigate('/guest-dashboard')}>Home</button>
          <button className="nav-btn" onClick={() => onNavigate ? onNavigate('bookings') : navigate('/my-bookings')}>My Bookings</button>
          <button className="nav-btn" onClick={() => onNavigate ? onNavigate('food') : navigate('/order-food')}>Order Food</button>
          <button className="nav-btn" onClick={() => onNavigate ? onNavigate('loyalty') : navigate('/loyalty')}>Loyalty Rewards</button>
        </nav>
      </aside>

      <main className="guest-notif-main">
        <header className="notif-header">
          <h1>Notifications</h1>
          <div className="notif-actions">
            <div className="unread-count">Unread: <strong>{unreadCount}</strong></div>
            <button className="outline" onClick={markAllRead}>Mark all read</button>
            <button className="outline danger" onClick={clearAll}>Clear all</button>
          </div>
        </header>

        <section className="notif-list">
          {notifications.length === 0 && (
            <div className="empty">No notifications</div>
          )}

          {notifications.map((n) => (
            <article key={n.id} className={`notif-card ${n.isRead ? 'read' : 'unread'}`}>
              <div className="notif-left" onClick={() => handleItemClick(n)} role="button">
                <div className="notif-title">{n.title || n.message}</div>
                <div className="notif-message">{n.message}</div>
                <div className="notif-meta">
                  <span className="notif-time">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</span>
                  {n.priority && <span className={`badge priority-${n.priority}`}>{n.priority}</span>}
                </div>
              </div>

              <div className="notif-right">
                {!n.isRead && <button className="small" onClick={() => markRead(n.id)}>Mark read</button>}
                <button className="small muted" onClick={() => removeNotification(n.id)}>Remove</button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
