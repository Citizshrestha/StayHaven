import { useState, useEffect } from "react";
import { Bell, Check, CheckCircle, X, Clock, ChefHat, AlertCircle, Utensils, Package, Phone, Sparkles } from "lucide-react";

const NotificationPanel = ({
    notifications = [],
    onMarkRead,
    onMarkAllRead,
    onClose,
    onNotificationClick, // New: callback when clicking a notification to navigate
    isDarkMode = false, // New: dark mode support
}) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 640);
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

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

    // Status-based colors matching OrderCard exactly, theme-aware
    const STATUS_COLORS = {
        pending: { 
            bg: isDarkMode ? "rgba(37, 99, 235, 0.2)" : "#DBEAFE", 
            color: isDarkMode ? "#60A5FA" : "#2563EB", 
            label: "New" 
        },
        new: { 
            bg: isDarkMode ? "rgba(37, 99, 235, 0.2)" : "#DBEAFE", 
            color: isDarkMode ? "#60A5FA" : "#2563EB", 
            label: "New" 
        },
        confirmed: { 
            bg: isDarkMode ? "rgba(79, 70, 229, 0.2)" : "#E0E7FF", 
            color: isDarkMode ? "#A5B4FC" : "#4F46E5", 
            label: "Confirmed" 
        },
        preparing: { 
            bg: isDarkMode ? "rgba(217, 119, 6, 0.2)" : "#FEF3C7", 
            color: isDarkMode ? "#FBBF24" : "#D97706", 
            label: "Preparing" 
        },
        ready: { 
            bg: isDarkMode ? "rgba(5, 150, 105, 0.2)" : "#D1FAE5", 
            color: isDarkMode ? "#34D399" : "#059669", 
            label: "Ready" 
        },
        delivered: { 
            bg: isDarkMode ? "rgba(5, 150, 105, 0.15)" : "#D1FAE5", 
            color: isDarkMode ? "#6EE7B7" : "#059669", 
            label: "Delivered" 
        },
        cancelled: { 
            bg: isDarkMode ? "rgba(220, 38, 38, 0.2)" : "#FEE2E2", 
            color: isDarkMode ? "#F87171" : "#DC2626", 
            label: "Cancelled" 
        },
    };

    const getNotificationStyle = (notification) => {
        // If notification has a status, use that status's color
        if (notification.status && STATUS_COLORS[notification.status]) {
            const statusColor = STATUS_COLORS[notification.status];
            return {
                Icon: getIconForType(notification.type),
                bgColor: statusColor.bg,
                color: statusColor.color,
                label: statusColor.label,
            };
        }

        // Fallback to type-based styling
        return getNotificationIconByType(notification.type);
    };

    const getIconForType = (type) => {
        switch (type) {
            case "new_order": return Package;
            case "order_ready": return CheckCircle;
            case "status_update": return Sparkles;
            case "waiter_call": return Phone;
            default: return Bell;
        }
    };

    const getNotificationIconByType = (type) => {
        switch (type) {
            case "new_order":
                return { 
                    Icon: Package, 
                    bgColor: isDarkMode ? "rgba(37, 99, 235, 0.2)" : "#DBEAFE", 
                    color: isDarkMode ? "#60A5FA" : "#2563EB", 
                    label: "New Order" 
                };
            case "order_ready":
                return { 
                    Icon: CheckCircle, 
                    bgColor: isDarkMode ? "rgba(5, 150, 105, 0.2)" : "#D1FAE5", 
                    color: isDarkMode ? "#34D399" : "#059669", 
                    label: "Ready" 
                };
            case "status_update":
                return { 
                    Icon: Sparkles, 
                    bgColor: isDarkMode ? "rgba(79, 70, 229, 0.2)" : "#E0E7FF", 
                    color: isDarkMode ? "#A5B4FC" : "#4F46E5", 
                    label: "Updated" 
                };
            case "waiter_call":
                return { 
                    Icon: Phone, 
                    bgColor: isDarkMode ? "rgba(220, 38, 38, 0.2)" : "#FEE2E2", 
                    color: isDarkMode ? "#F87171" : "#DC2626", 
                    label: "Guest Call" 
                };
            case "delay":
                return { 
                    Icon: AlertCircle, 
                    bgColor: isDarkMode ? "rgba(220, 38, 38, 0.2)" : "#FEE2E2", 
                    color: isDarkMode ? "#F87171" : "#DC2626", 
                    label: "Alert" 
                };
            default:
                return { 
                    Icon: Bell, 
                    bgColor: isDarkMode ? "#334155" : "#F3F4F6", 
                    color: isDarkMode ? "#94A3B8" : "#6B7280", 
                    label: "Notification" 
                };
        }
    };

    const handleNotificationClick = (notification) => {
        // Mark as read
        if (onMarkRead) onMarkRead(notification.id);
        
        // Navigate to order if callback provided and notification has orderId
        if (onNotificationClick && notification.orderId) {
            onNotificationClick(notification);
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Theme colors
    const colors = {
        bg: isDarkMode ? '#0F172A' : '#F8F9FB',
        cardBg: isDarkMode ? '#1E293B' : 'white',
        text: isDarkMode ? '#F8FAFC' : '#111827',
        textSecondary: isDarkMode ? '#CBD5E1' : '#6B7280',
        textTertiary: isDarkMode ? '#94A3B8' : '#9CA3AF',
        border: isDarkMode ? '#334155' : '#E5E7EB',
        bgTertiary: isDarkMode ? '#334155' : '#F3F4F6',
        accentLight: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
        primary: '#3B82F6',
    };

    // Styles
    const containerStyle = {
        backgroundColor: colors.bg,
        minHeight: '100vh',
        padding: isMobile ? '16px' : '32px 48px',
        fontFamily: "'Nunito', sans-serif",
    };

    const headerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
    };

    const titleStyle = {
        fontSize: isMobile ? '28px' : '36px',
        fontWeight: '800',
        color: colors.text,
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    };

    const badgeStyle = {
        backgroundColor: '#3B82F6',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '700',
    };

    const actionsStyle = {
        display: 'flex',
        gap: '12px',
    };

    const actionButtonStyle = {
        padding: '10px 16px',
        borderRadius: '10px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s',
    };

    const listStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    };

    const notificationStyle = (isRead) => ({
        backgroundColor: isRead ? colors.cardBg : colors.accentLight,
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
        border: isRead ? `1px solid ${colors.border}` : `1px solid ${colors.primary}`,
        cursor: 'pointer',
        transition: 'all 0.2s',
    });

    const iconContainerStyle = (bgColor) => ({
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    });

    const emptyStateStyle = {
        textAlign: 'center',
        padding: '60px 20px',
        color: colors.textTertiary,
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <div>
                    <h1 style={titleStyle}>
                        <Bell size={32} />
                        Notifications
                        {unreadCount > 0 && <span style={badgeStyle}>{unreadCount} new</span>}
                    </h1>
                </div>
                <div style={actionsStyle}>
                    {unreadCount > 0 && (
                        <button
                            onClick={onMarkAllRead}
                            style={{
                                ...actionButtonStyle,
                                backgroundColor: colors.primary,
                                color: 'white',
                            }}
                        >
                            <Check size={16} />
                            Mark all read
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            style={{
                                ...actionButtonStyle,
                                backgroundColor: colors.bgTertiary,
                                color: colors.textSecondary,
                                padding: '10px',
                            }}
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            {notifications.length === 0 ? (
                <div style={emptyStateStyle}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: colors.textSecondary }}>
                        No notifications
                    </h3>
                    <p>You're all caught up! New notifications will appear here.</p>
                </div>
            ) : (
                <div style={listStyle}>
                    {notifications.map((notification, index) => {
                        const { Icon, bgColor, color, label } = getNotificationStyle(notification);

                        return (
                            <div
                                key={notification.id}
                                style={{
                                    ...notificationStyle(notification.isRead),
                                    animation: index < 3 && !notification.isRead ? 'slideIn 0.3s ease-out' : 'none',
                                    cursor: notification.orderId ? 'pointer' : 'default',
                                }}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div style={iconContainerStyle(bgColor)}>
                                    <Icon size={22} color={color} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            backgroundColor: bgColor,
                                            color: color,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}>
                                            {label}
                                        </span>
                                        <span style={{
                                            fontSize: '12px',
                                            color: colors.textTertiary,
                                            fontWeight: '500',
                                        }}>
                                            {getTimeAgo(notification.createdAt || notification.time)}
                                        </span>
                                    </div>
                                    <p style={{
                                        fontSize: '15px',
                                        fontWeight: notification.isRead ? '500' : '700',
                                        color: colors.text,
                                        lineHeight: '1.5',
                                        margin: 0,
                                        wordBreak: 'break-word',
                                    }}>
                                        {notification.message}
                                    </p>
                                    {notification.orderNumber && (
                                        <p style={{
                                            fontSize: '13px',
                                            color: notification.orderId ? color : colors.textTertiary,
                                            fontWeight: '600',
                                            marginTop: '4px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}>
                                            Order #{notification.orderNumber}
                                            {notification.orderId && (
                                                <span style={{ 
                                                    fontSize: '11px', 
                                                    opacity: 0.7,
                                                    marginLeft: '4px',
                                                }}>
                                                    → View
                                                </span>
                                            )}
                                        </p>
                                    )}
                                </div>
                                {!notification.isRead && (
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        backgroundColor: '#3B82F6',
                                        flexShrink: 0,
                                        marginTop: '4px',
                                        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.2)',
                                        animation: 'pulse 2s infinite',
                                    }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes pulse {
                    0%, 100% {
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
                    }
                    50% {
                        box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.1);
                    }
                }
            `}</style>
        </div>
    );
};

export default NotificationPanel;
