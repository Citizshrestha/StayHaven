import { useState, useEffect, useMemo } from "react";
import { Bell, CheckCircle, Package, ChefHat, Phone } from "lucide-react";
import useRelativeTime from "../../../../hooks/useRelativeTime";

// Separate component to use hook for each notification's time
const NotificationTime = ({ date, color }) => {
    const relativeTime = useRelativeTime(date, true);
    return (
        <span style={{
            fontSize: '13px',
            color: color,
            fontWeight: '400',
            whiteSpace: 'nowrap',
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
    onNotificationClick,
    isDarkMode = false,
}) => {
    const [isMobile, setIsMobile] = useState(false);
    const [activeTab, setActiveTab] = useState("all");

    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 640);
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // Design system colors (teal theme)
    const colors = {
        primary: '#00BFA6',
        primaryLight: '#00E5CC',
        bg: '#F8FAFB',
        cardBg: '#FFFFFF',
        text: '#263238',
        textMuted: '#546E7A',
        textTertiary: '#94A3B8',
        border: '#E0E7EB',
        shadow: '0 2px 8px rgba(0,0,0,0.05)',
        shadowHover: '0 6px 20px rgba(0,191,166,0.12)',
        unreadGlow: '0 0 0 3px rgba(0,191,166,0.1)',
    };

    // Status colors matching design system with Lucide React icons
    const STATUS_COLORS = {
        ready: {
            bg: '#DCFCE7',
            text: '#16A34A',
            dot: '#22C55E',
            Icon: CheckCircle,
            label: 'READY'
        },
        preparing: {
            bg: '#FEF9C3',
            text: '#CA8A04',
            dot: '#EAB308',
            Icon: ChefHat,
            label: 'PREPARING'
        },
        delivered: {
            bg: '#CCFBF1',
            text: '#00BFA6',
            dot: '#00E5CC',
            Icon: Package,
            label: 'DELIVERED'
        },
        new: {
            bg: '#EDE9FE',
            text: '#7C3AED',
            dot: '#8B5CF6',
            Icon: Bell,
            label: 'NEW'
        },
        pending: {
            bg: '#EDE9FE',
            text: '#7C3AED',
            dot: '#8B5CF6',
            Icon: Bell,
            label: 'NEW'
        },
        confirmed: {
            bg: '#EDE9FE',
            text: '#7C3AED',
            dot: '#8B5CF6',
            Icon: Bell,
            label: 'NEW'
        },
        waiter_call: {
            bg: '#FEE2E2',
            text: '#DC2626',
            dot: '#EF4444',
            Icon: Phone,
            label: 'GUEST'
        },
    };

    const getNotificationStyle = (notification) => {
        const status = notification.status || notification.type;
        return STATUS_COLORS[status] || STATUS_COLORS.new;
    };

    // Fix table undefined bug - check order type FIRST
    const getLocation = (notification) => {
        // Check order type first to avoid showing "Table undefined" for takeaway
        const orderType = notification.type || notification.orderType;

        if (orderType === 'takeaway') return 'Takeaway';
        if (orderType === 'roomService' || orderType === 'room_service') {
            if (notification.room_number) return `Room ${notification.room_number}`;
            if (notification.room) return `Room ${notification.room}`;
            return 'Room Service';
        }
        if (orderType === 'dineIn' || orderType === 'dine_in') {
            if (notification.table_number) return `Table ${notification.table_number}`;
            if (notification.table) return `Table ${notification.table}`;
            return 'Dine In';
        }

        // Fallback checks if type is not specified
        if (notification.table_number) return `Table ${notification.table_number}`;
        if (notification.table) return `Table ${notification.table}`;
        if (notification.room_number) return `Room ${notification.room_number}`;
        if (notification.room) return `Room ${notification.room}`;

        return 'Location TBD';
    };

    // Time grouping logic
    const groupedNotifications = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const groups = {
            today: [],
            yesterday: [],
            older: []
        };

        notifications.forEach(notif => {
            const notifDate = new Date(notif.createdAt || notif.time);
            const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());

            if (notifDay.getTime() === today.getTime()) {
                groups.today.push(notif);
            } else if (notifDay.getTime() === yesterday.getTime()) {
                groups.yesterday.push(notif);
            } else {
                groups.older.push(notif);
            }
        });

        return groups;
    }, [notifications]);

    // Filter notifications based on active tab
    const filteredNotifications = useMemo(() => {
        let filtered = notifications;

        if (activeTab === "unread") {
            filtered = notifications.filter(n => !n.isRead);
        } else if (activeTab !== "all") {
            filtered = notifications.filter(n => n.status === activeTab);
        }

        return filtered;
    }, [notifications, activeTab]);

    // Regroup filtered notifications
    const filteredGrouped = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const groups = {
            today: [],
            yesterday: [],
            older: []
        };

        filteredNotifications.forEach(notif => {
            const notifDate = new Date(notif.createdAt || notif.time);
            const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());

            if (notifDay.getTime() === today.getTime()) {
                groups.today.push(notif);
            } else if (notifDay.getTime() === yesterday.getTime()) {
                groups.yesterday.push(notif);
            } else {
                groups.older.push(notif);
            }
        });

        return groups;
    }, [filteredNotifications]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleNotificationClick = (notification) => {
        if (onMarkRead) onMarkRead(notification.id);
        if (onNotificationClick && notification.orderId) {
            onNotificationClick(notification);
        }
    };

    const handleMarkAsRead = (e, notificationId) => {
        e.stopPropagation();
        if (onMarkRead) onMarkRead(notificationId);
    };

    // Tab counts
    const tabCounts = {
        all: notifications.length,
        unread: unreadCount,
        ready: notifications.filter(n => n.status === 'ready').length,
        preparing: notifications.filter(n => n.status === 'preparing').length,
        delivered: notifications.filter(n => n.status === 'delivered').length,
    };

    return (
        <div style={{
            backgroundColor: colors.bg,
            minHeight: '100vh',
            padding: isMobile ? '16px' : '32px 48px',
            fontFamily: "'Poppins', 'Nunito', sans-serif",
        }}>
            {/* Header Section - No card wrapper */}
            <div style={{
                marginBottom: '24px',
                paddingBottom: '20px',
                borderBottom: `1px solid ${colors.border}`,
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px',
                }}>
                    <div>
                        <h1 style={{
                            fontSize: isMobile ? '1.5rem' : '1.8rem',
                            fontWeight: '700',
                            color: colors.text,
                            margin: 0,
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                        }}>
                            🔔 Notifications
                        </h1>
                        <p style={{
                            fontSize: '0.9rem',
                            color: colors.textMuted,
                            margin: 0,
                        }}>
                            {notifications.length} notifications • {unreadCount} unread
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {unreadCount > 0 && (
                            <button
                                onClick={onMarkAllRead}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: `1.5px solid ${colors.primary}`,
                                    background: 'transparent',
                                    color: colors.primary,
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontFamily: "'Poppins', sans-serif",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = colors.primary;
                                    e.currentTarget.style.color = '#FFFFFF';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = colors.primary;
                                }}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '16px',
                    flexWrap: 'wrap',
                }}>
                    {[
                        { key: 'all', label: 'All' },
                        { key: 'unread', label: 'Unread', badge: tabCounts.unread },
                        { key: 'ready', label: 'Ready', badge: tabCounts.ready },
                        { key: 'preparing', label: 'Preparing', badge: tabCounts.preparing },
                        { key: 'delivered', label: 'Delivered', badge: tabCounts.delivered },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                padding: '8px 18px',
                                borderRadius: '20px',
                                border: activeTab === tab.key ? 'none' : `1.5px solid ${colors.border}`,
                                background: activeTab === tab.key
                                    ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`
                                    : colors.cardBg,
                                color: activeTab === tab.key ? '#FFFFFF' : colors.textMuted,
                                fontSize: '0.88rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontFamily: "'Poppins', sans-serif",
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: activeTab === tab.key ? '0 4px 12px rgba(0,191,166,0.25)' : 'none',
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== tab.key) {
                                    e.currentTarget.style.borderColor = colors.primary;
                                    e.currentTarget.style.color = colors.primary;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== tab.key) {
                                    e.currentTarget.style.borderColor = colors.border;
                                    e.currentTarget.style.color = colors.textMuted;
                                }
                            }}
                        >
                            {tab.label}
                            {tab.badge > 0 && (
                                <span style={{
                                    background: activeTab === tab.key ? 'rgba(255,255,255,0.3)' : '#EF4444',
                                    color: activeTab === tab.key ? '#FFFFFF' : 'white',
                                    fontSize: '0.7rem',
                                    fontWeight: '700',
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                }}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Notifications List with Time Grouping */}
            {filteredNotifications.length === 0 ? (
                // Empty State
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '80px 20px',
                    textAlign: 'center',
                }}>
                    <div style={{
                        fontSize: '80px',
                        marginBottom: '20px',
                        animation: 'pulse 2s infinite',
                    }}>
                        🔔
                    </div>
                    <h3 style={{
                        fontSize: '1.3rem',
                        fontWeight: '600',
                        color: colors.text,
                        margin: '0 0 8px 0',
                    }}>
                        You're all caught up!
                    </h3>
                    <p style={{
                        fontSize: '0.9rem',
                        color: colors.textMuted,
                        margin: 0,
                    }}>
                        No new notifications
                    </p>
                </div>
            ) : (
                <>
                    {/* TODAY */}
                    {filteredGrouped.today.length > 0 && (
                        <div style={{ marginBottom: '32px' }}>
                            <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                letterSpacing: '0.1em',
                                color: colors.textTertiary,
                                textTransform: 'uppercase',
                                padding: '16px 0 12px',
                                display: 'flex',
                                alignItems: 'center',
                            }}>
                                TODAY
                                <div style={{
                                    content: '',
                                    flex: 1,
                                    height: '1px',
                                    background: colors.border,
                                    marginLeft: '12px',
                                }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {filteredGrouped.today.map((notification, index) => {
                                    const style = getNotificationStyle(notification);
                                    return (
                                        <NotificationCard
                                            key={notification.id}
                                            notification={notification}
                                            style={style}
                                            colors={colors}
                                            index={index}
                                            onClick={() => handleNotificationClick(notification)}
                                            onMarkRead={(e) => handleMarkAsRead(e, notification.id)}
                                            getLocation={getLocation}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* YESTERDAY */}
                    {filteredGrouped.yesterday.length > 0 && (
                        <div style={{ marginBottom: '32px' }}>
                            <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                letterSpacing: '0.1em',
                                color: colors.textTertiary,
                                textTransform: 'uppercase',
                                padding: '16px 0 12px',
                                display: 'flex',
                                alignItems: 'center',
                            }}>
                                YESTERDAY
                                <div style={{
                                    content: '',
                                    flex: 1,
                                    height: '1px',
                                    background: colors.border,
                                    marginLeft: '12px',
                                }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {filteredGrouped.yesterday.map((notification, index) => {
                                    const style = getNotificationStyle(notification);
                                    return (
                                        <NotificationCard
                                            key={notification.id}
                                            notification={notification}
                                            style={style}
                                            colors={colors}
                                            index={index}
                                            onClick={() => handleNotificationClick(notification)}
                                            onMarkRead={(e) => handleMarkAsRead(e, notification.id)}
                                            getLocation={getLocation}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* OLDER */}
                    {filteredGrouped.older.length > 0 && (
                        <div style={{ marginBottom: '32px' }}>
                            <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                letterSpacing: '0.1em',
                                color: colors.textTertiary,
                                textTransform: 'uppercase',
                                padding: '16px 0 12px',
                                display: 'flex',
                                alignItems: 'center',
                            }}>
                                OLDER
                                <div style={{
                                    content: '',
                                    flex: 1,
                                    height: '1px',
                                    background: colors.border,
                                    marginLeft: '12px',
                                }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {filteredGrouped.older.map((notification, index) => {
                                    const style = getNotificationStyle(notification);
                                    return (
                                        <NotificationCard
                                            key={notification.id}
                                            notification={notification}
                                            style={style}
                                            colors={colors}
                                            index={index}
                                            onClick={() => handleNotificationClick(notification)}
                                            onMarkRead={(e) => handleMarkAsRead(e, notification.id)}
                                            getLocation={getLocation}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.3); }
                }
                .marking-read {
                    transition: opacity 0.3s ease, transform 0.3s ease;
                    opacity: 0.5;
                    transform: translateX(10px);
                }
            `}</style>
        </div>
    );
};

// Notification Card Component
const NotificationCard = ({ notification, style, colors, index, onClick, onMarkRead, getLocation }) => {
    const [isHovered, setIsHovered] = useState(false);
    const IconComponent = style.Icon;

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                background: notification.isRead
                    ? colors.cardBg
                    : 'linear-gradient(135deg, #F0FDFB 0%, #FFFFFF 100%)',
                borderRadius: '14px',
                padding: '18px 20px',
                border: `1px solid ${colors.border}`,
                borderLeft: `4px solid ${style.dot}`,
                boxShadow: notification.isRead
                    ? colors.shadow
                    : '0 2px 8px rgba(0,0,0,0.05), 0 0 0 3px rgba(0,191,166,0.08)',
                display: 'grid',
                gridTemplateColumns: '48px 1fr auto',
                gap: '14px',
                alignItems: 'center',
                transition: 'all 0.25s ease',
                cursor: notification.orderId ? 'pointer' : 'default',
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                animation: index < 3 ? `slideInUp 0.3s ease forwards ${index * 0.05}s` : 'none',
                opacity: index < 3 ? 0 : 1,
                position: 'relative',
                ...(isHovered && {
                    boxShadow: '0 6px 20px rgba(0,191,166,0.12)',
                    borderColor: 'rgba(0,191,166,0.3)',
                }),
            }}
        >
            {/* No pulsing dot — unread state is communicated via the left border + background */}

            {/* Icon Circle (Squircle) - Using Lucide React Icons */}
            <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: style.bg,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
            }}>
                <IconComponent size={22} color={style.text} strokeWidth={2.5} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: '4px',
                    lineHeight: '1.4',
                }}>
                    {notification.message}
                </div>
                <div style={{
                    fontSize: '0.82rem',
                    color: colors.textMuted,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                }}>
                    {/* Only show location for order-related notifications, not for messages */}
                    {notification.type !== 'message' && (
                        <>
                            <span>📍 {getLocation(notification)}</span>
                            <span>•</span>
                        </>
                    )}
                    <span style={{
                        background: style.bg,
                        color: style.text,
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                    }}>
                        {style.label}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '8px',
            }}>
                <NotificationTime
                    date={notification.createdAt || notification.time}
                    color={colors.textTertiary}
                />
                {notification.orderId && (
                    <button
                        style={{
                            background: 'transparent',
                            border: `1.5px solid ${colors.primary}`,
                            color: colors.primary,
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            padding: '7px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontFamily: "'Poppins', sans-serif",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.primary;
                            e.currentTarget.style.color = '#FFFFFF';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,191,166,0.25)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = colors.primary;
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        View Order →
                    </button>
                )}
                {!notification.isRead && (
                    <button
                        onClick={onMarkRead}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: colors.textTertiary,
                            fontSize: '0.8rem',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            transition: 'color 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = colors.primary;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = colors.textTertiary;
                        }}
                    >
                        ✓ Mark read
                    </button>
                )}
            </div>
        </div>
    );
};

export default NotificationPanel;
