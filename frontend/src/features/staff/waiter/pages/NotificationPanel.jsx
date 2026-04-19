import { useState, useEffect } from "react";
import { Bell, Check, CheckCircle, X, Clock, ChefHat, AlertCircle, Utensils, Package, Phone, Sparkles } from "lucide-react";
import useRelativeTime from "../../../../hooks/useRelativeTime";

// Separate component to use hook for each notification's time
const NotificationTime = ({ date, color }) => {
    const relativeTime = useRelativeTime(date, true);
    return (
        <span style={{
            fontSize: '12px',
            color: color,
            fontWeight: '500',
        }}>
            {relativeTime || 'Just now'}
        </span>
    );
};

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

    // Status-based colors matching OrderCard exactly, theme-aware
    const STATUS_COLORS = {
        pending: {
            bg: isDarkMode ? "rgba(37, 99, 235, 0.2)" : "#DBEAFE",
            color: isDarkMode ? "#60A5FA" : "#2563EB",
            label: "New",
            gradient: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)"
        },
        new: {
            bg: isDarkMode ? "rgba(37, 99, 235, 0.2)" : "#DBEAFE",
            color: isDarkMode ? "#60A5FA" : "#2563EB",
            label: "New",
            gradient: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)"
        },
        confirmed: {
            bg: isDarkMode ? "rgba(79, 70, 229, 0.2)" : "#E0E7FF",
            color: isDarkMode ? "#A5B4FC" : "#4F46E5",
            label: "Confirmed",
            gradient: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)"
        },
        preparing: {
            bg: isDarkMode ? "rgba(217, 119, 6, 0.2)" : "#FEF3C7",
            color: isDarkMode ? "#FBBF24" : "#D97706",
            label: "Preparing",
            gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
        },
        ready: {
            bg: isDarkMode ? "rgba(5, 150, 105, 0.2)" : "#D1FAE5",
            color: isDarkMode ? "#34D399" : "#059669",
            label: "Ready",
            gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)"
        },
        delivered: {
            bg: isDarkMode ? "rgba(5, 150, 105, 0.15)" : "#D1FAE5",
            color: isDarkMode ? "#6EE7B7" : "#059669",
            label: "Delivered",
            gradient: "linear-gradient(135deg, #34D399 0%, #10B981 100%)"
        },
        cancelled: {
            bg: isDarkMode ? "rgba(220, 38, 38, 0.2)" : "#FEE2E2",
            color: isDarkMode ? "#F87171" : "#DC2626",
            label: "Cancelled",
            gradient: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
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
        marginBottom: '32px',
        padding: isMobile ? '20px' : '24px 32px',
        background: isDarkMode 
            ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
            : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
        borderRadius: '20px',
        boxShadow: isDarkMode 
            ? '0 4px 20px rgba(0, 0, 0, 0.3)'
            : '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: `1px solid ${colors.border}`,
    };

    const titleStyle = {
        fontSize: isMobile ? '24px' : '32px',
        fontWeight: '800',
        background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    };

    const subtitleStyle = {
        fontSize: '14px',
        color: colors.textSecondary,
        marginTop: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    };

    const badgeStyle = {
        background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        color: 'white',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '700',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
        animation: 'pulse 2s infinite',
    };

    const actionsStyle = {
        display: 'flex',
        gap: '12px',
    };

    const actionButtonStyle = {
        padding: '12px 20px',
        borderRadius: '12px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    };

    const notificationStyle = (isRead) => ({
        backgroundColor: colors.cardBg,
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
        border: isRead ? `1px solid ${colors.border}` : `2px solid ${colors.primary}`,
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isRead 
            ? '0 2px 8px rgba(0, 0, 0, 0.05)'
            : '0 8px 24px rgba(59, 130, 246, 0.15)',
        transform: 'translateY(0)',
        position: 'relative',
        overflow: 'hidden',
    });

    const iconContainerStyle = (bgColor, gradient) => ({
        width: '56px',
        height: '56px',
        borderRadius: '16px',
        background: gradient || bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        position: 'relative',
    });

    const listStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    };

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
                        <Bell size={isMobile ? 28 : 32} />
                        Notifications
                    </h1>
                    <div style={subtitleStyle}>
                        {unreadCount > 0 ? (
                            <>
                                <span style={badgeStyle}>{unreadCount} unread</span>
                                <span>•</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        backgroundColor: '#10B981',
                                        animation: 'pulse 2s infinite',
                                    }} />
                                    Live updates enabled
                                </span>
                            </>
                        ) : (
                            <span>All caught up! 🎉</span>
                        )}
                    </div>
                </div>
                <div style={actionsStyle}>
                    {unreadCount > 0 && (
                        <button
                            onClick={onMarkAllRead}
                            style={{
                                ...actionButtonStyle,
                                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                                color: 'white',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                            }}
                        >
                            <Check size={18} />
                            {!isMobile && 'Mark all read'}
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            style={{
                                ...actionButtonStyle,
                                backgroundColor: colors.bgTertiary,
                                color: colors.textSecondary,
                                padding: '12px',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.backgroundColor = isDarkMode ? '#475569' : '#E5E7EB';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.backgroundColor = colors.bgTertiary;
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
                        const { Icon, bgColor, color, label, gradient } = getNotificationStyle(notification);

                        return (
                            <div
                                key={notification.id}
                                style={{
                                    ...notificationStyle(notification.isRead),
                                    animation: index < 3 && !notification.isRead ? 'slideIn 0.4s ease-out' : 'none',
                                    cursor: notification.orderId ? 'pointer' : 'default',
                                }}
                                onClick={() => handleNotificationClick(notification)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = notification.isRead 
                                        ? '0 12px 32px rgba(0, 0, 0, 0.12)'
                                        : '0 16px 40px rgba(59, 130, 246, 0.25)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = notification.isRead 
                                        ? '0 2px 8px rgba(0, 0, 0, 0.05)'
                                        : '0 8px 24px rgba(59, 130, 246, 0.15)';
                                }}
                            >
                                {/* Gradient overlay for unread */}
                                {!notification.isRead && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '4px',
                                        background: 'linear-gradient(90deg, #3B82F6 0%, #8B5CF6 100%)',
                                        borderRadius: '16px 16px 0 0',
                                    }} />
                                )}
                                
                                <div style={iconContainerStyle(bgColor, gradient)}>
                                    <Icon size={26} color="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            background: gradient || bgColor,
                                            color: 'white',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                                        }}>
                                            {label}
                                        </span>
                                        <NotificationTime
                                            date={notification.createdAt || notification.time}
                                            color={colors.textTertiary}
                                        />
                                    </div>
                                    <p style={{
                                        fontSize: '16px',
                                        fontWeight: notification.isRead ? '500' : '700',
                                        color: colors.text,
                                        lineHeight: '1.6',
                                        margin: 0,
                                        wordBreak: 'break-word',
                                    }}>
                                        {notification.message}
                                    </p>
                                    {notification.orderNumber && (
                                        <p style={{
                                            fontSize: '14px',
                                            color: color,
                                            fontWeight: '600',
                                            marginTop: '8px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 10px',
                                            background: bgColor,
                                            borderRadius: '8px',
                                        }}>
                                            Order #{notification.orderNumber}
                                            {notification.orderId && (
                                                <span style={{
                                                    fontSize: '12px',
                                                    opacity: 0.8,
                                                }}>
                                                    → View
                                                </span>
                                            )}
                                        </p>
                                    )}
                                </div>
                                {!notification.isRead && (
                                    <div style={{
                                        width: '14px',
                                        height: '14px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                                        flexShrink: 0,
                                        marginTop: '4px',
                                        boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2)',
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
