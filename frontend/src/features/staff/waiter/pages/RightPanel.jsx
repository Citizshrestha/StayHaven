import React, { useState, useMemo } from "react";
import { Plus, X, Minus, CheckCircle, AlertCircle, Package, Phone, Bell, ChefHat } from "lucide-react";
import { useOrderContext } from "../../../../context/useOrderContext";
import { useNotifications, NOTIFICATION_TYPES } from "../../../../context/useNotifications";
import { useTheme } from "../../../../hooks/useTheme";
import { toast } from "react-toastify";
import useClickOutside from "../../../../hooks/useClickOutSide";
import OrderFormModal from "./OrderFormModal";
import "./RightPanel.css";


const RightPanel = ({ orders = [] }) => {
  const { addOrder, loading } = useOrderContext();
  const { isDark } = useTheme();
  const { notifications: contextNotifications } = useNotifications();
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Calculate assigned areas dynamically from orders - sorted by latest order
  const assignedAreas = useMemo(() => {
    const areaMap = new Map();

    orders.forEach(order => {
      const areaName = order.table || 'Unknown';
      if (!areaMap.has(areaName)) {
        areaMap.set(areaName, { id: areaName, name: areaName, orderCount: 0, latestOrderTime: null });
      }
      const area = areaMap.get(areaName);
      // Only count active orders (not delivered)
      if (order.status !== 'delivered') {
        area.orderCount++;
      }
      // Track the most recent order time for this area
      const orderTime = new Date(order.placedAt);
      if (!area.latestOrderTime || orderTime > area.latestOrderTime) {
        area.latestOrderTime = orderTime;
      }
    });

    return Array.from(areaMap.values())
      .filter(area => area.orderCount > 0)
      .sort((a, b) => new Date(b.latestOrderTime) - new Date(a.latestOrderTime)) // Sort by latest order time
      .slice(0, 5); // Show top 5 latest areas
  }, [orders]);

  // Helper function to get time ago string
  const getTimeAgo = (date) => {
    if (!date) return "Just now";
    const now = new Date();
    const notifDate = date instanceof Date ? date : new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Status-based icons and colors matching the teal design system (Lucide React icons)
  const STATUS_ICONS = {
    ready: { Icon: CheckCircle, color: '#16A34A', bg: '#DCFCE7' },
    preparing: { Icon: ChefHat, color: '#CA8A04', bg: '#FEF9C3' },
    delivered: { Icon: Package, color: '#00BFA6', bg: '#CCFBF1' },
    new: { Icon: Bell, color: '#7C3AED', bg: '#EDE9FE' },
    pending: { Icon: Bell, color: '#7C3AED', bg: '#EDE9FE' },
    confirmed: { Icon: Bell, color: '#7C3AED', bg: '#EDE9FE' },
    waiter_call: { Icon: Phone, color: '#DC2626', bg: '#FEE2E2' },
  };

  // Get the top 3 latest notifications from context (mini feed for sidebar)
  const notifications = useMemo(() => {
    return [...contextNotifications]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3)
      .map(notification => {
        const status = notification.status || notification.type;
        const statusStyle = STATUS_ICONS[status] || STATUS_ICONS.new;
        return {
          ...notification,
          IconComponent: statusStyle.Icon,
          iconColor: statusStyle.color,
          iconBg: statusStyle.bg,
          time: getTimeAgo(notification.createdAt),
        };
      });
  }, [contextNotifications]);

  return (
    <div className={`rp-container ${isDark ? 'dark' : ''}`}>
      {/* New Order Button */}
      <button onClick={() => setShowOrderModal(true)} className="rp-new-order-btn">
        <Plus size={20} />
        New Order
      </button>

      {/* Assigned Areas Section */}
      <div className="rp-section">
        <h2 className="rp-section-title">Assigned Areas</h2>
        <div className="rp-card">
          <div className="rp-assigned-list">
            {assignedAreas.map((area) => (
              <div key={area.id} className="rp-assigned-item">
                <span className="rp-assigned-name">{area.name}</span>
                <span className="rp-assigned-count">
                  {area.orderCount} {area.orderCount === 1 ? "Order" : "Orders"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications Section - Mini Feed (Last 3 Only) */}
      <div className="rp-section">
        <h2 className="rp-section-title" style={{
          fontSize: '0.9rem',
          fontWeight: '600',
          color: isDark ? '#F8FAFC' : '#263238',
          marginBottom: '12px',
          fontFamily: "'Poppins', sans-serif",
        }}>
          Notifications (last 3 only)
        </h2>
        <div className="rp-card" style={{
          background: isDark ? '#1E293B' : '#FFFFFF',
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${isDark ? '#334155' : '#E0E7EB'}`,
        }}>
          {notifications.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 16px',
              color: isDark ? '#94A3B8' : '#9CA3AF',
              textAlign: 'center',
            }}>
              <Bell size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '14px' }}>No notifications yet</p>
            </div>
          ) : (
            <>
              <div style={{
                borderBottom: `1px solid ${isDark ? '#334155' : '#E0E7EB'}`,
                paddingBottom: '12px',
                marginBottom: '12px',
              }}>
                {notifications.map((notification, index) => {
                  const IconComponent = notification.IconComponent;
                  return (
                    <div key={notification.id} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '8px 0',
                      borderBottom: index < notifications.length - 1 ? `1px solid ${isDark ? '#334155' : '#F0F0F0'}` : 'none',
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: notification.iconBg,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}>
                        <IconComponent size={16} color={notification.iconColor} strokeWidth={2.5} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0,
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          color: isDark ? '#F8FAFC' : '#263238',
                          lineHeight: '1.4',
                          marginBottom: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}>
                          {notification.message}
                        </p>
                        <p style={{
                          margin: 0,
                          fontSize: '0.75rem',
                          color: isDark ? '#94A3B8' : '#546E7A',
                        }}>
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // This would trigger navigation to full notifications view
                  // You can add navigation logic here
                }}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#00BFA6',
                  textDecoration: 'none',
                  padding: '8px',
                  borderRadius: '6px',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(0, 191, 166, 0.1)' : 'rgba(0, 191, 166, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                View all →
              </a>
            </>
          )}
        </div>
      </div>

      {/* Order Form Modal */}
      {showOrderModal && (
        <OrderFormModal onClose={() => setShowOrderModal(false)} />
      )}
    </div>
  );
};

export default RightPanel;
