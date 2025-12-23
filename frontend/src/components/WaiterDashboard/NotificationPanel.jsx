import { useState, useEffect } from "react";
import { Bell, Check, CheckCircle, Trash2, X, Clock, ChefHat, AlertCircle, Utensils } from "lucide-react";

const NotificationPanel = ({
    notifications = [],
    onMarkRead,
    onMarkAllRead,
    onClear,
    onClose
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
        const now = new Date();
        const diffMs = now - new Date(date);
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case "new_order":
                return { Icon: Utensils, bgColor: "#DBEAFE", color: "#2563EB" };
            case "order_ready":
                return { Icon: CheckCircle, bgColor: "#D1FAE5", color: "#059669" };
            case "kitchen_update":
                return { Icon: Clock, bgColor: "#FEF3C7", color: "#D97706" };
            case "delay":
                return { Icon: AlertCircle, bgColor: "#FEE2E2", color: "#DC2626" };
            default:
                return { Icon: Bell, bgColor: "#F3F4F6", color: "#6B7280" };
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Styles
    const containerStyle = {
        backgroundColor: 'var(--bg-secondary)',
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
        color: 'var(--text-primary)',
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
        backgroundColor: isRead ? 'var(--card-bg)' : 'var(--color-accent-light)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
        border: isRead ? '1px solid var(--border-color)' : '1px solid var(--color-primary)',
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
        color: 'var(--text-tertiary)',
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
                                backgroundColor: 'var(--color-primary)',
                                color: 'white',
                            }}
                        >
                            <Check size={16} />
                            Mark all read
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button
                            onClick={onClear}
                            style={{
                                ...actionButtonStyle,
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-secondary)',
                            }}
                        >
                            <Trash2 size={16} />
                            Clear all
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            style={{
                                ...actionButtonStyle,
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-secondary)',
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
                    <Bell size={48} color="var(--text-tertiary)" style={{ marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                        No notifications
                    </h3>
                    <p>You're all caught up! New notifications will appear here.</p>
                </div>
            ) : (
                <div style={listStyle}>
                    {notifications.map((notification) => {
                        const { Icon, bgColor, color } = getNotificationIcon(notification.type);

                        return (
                            <div
                                key={notification.id}
                                style={notificationStyle(notification.isRead)}
                                onClick={() => onMarkRead && onMarkRead(notification.id)}
                            >
                                <div style={iconContainerStyle(bgColor)}>
                                    <Icon size={22} color={color} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{
                                        fontSize: '15px',
                                        fontWeight: notification.isRead ? '500' : '700',
                                        color: 'var(--text-primary)',
                                        marginBottom: '4px',
                                        lineHeight: '1.4',
                                    }}>
                                        {notification.message}
                                    </p>
                                    <p style={{
                                        fontSize: '13px',
                                        color: 'var(--text-tertiary)',
                                        fontWeight: '500',
                                    }}>
                                        {getTimeAgo(notification.time)}
                                    </p>
                                </div>
                                {!notification.isRead && (
                                    <div style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        backgroundColor: '#3B82F6',
                                        flexShrink: 0,
                                        marginTop: '6px',
                                    }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NotificationPanel;
