import { useState, useEffect, useMemo } from "react";
import {
  Bell,
  CheckCircle,
  Package,
  ChefHat,
  Phone,
  MessageCircle,
} from "lucide-react";
import useRelativeTime from "../../../../hooks/useRelativeTime";

// Separate component to use hook for each notification's time
const NotificationTime = ({ date, color }) => {
  const relativeTime = useRelativeTime(date, true);
  return (
    <span
      style={{
        fontSize: "13px",
        color,
        fontWeight: "400",
        whiteSpace: "nowrap",
      }}
    >
      {relativeTime || "Just now"}
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
  // kitchen: rendered inside KitchenDashboard's padded container
  // waiter: rendered inside WaiterDashboard which relies more on panel padding
  variant = "waiter",
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 640);
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const isKitchen = variant === "kitchen";

  // Color palette aligned with dashboard accents.
  const colors = useMemo(() => {
    const kitchenLight = {
      primary: "#10B981",
      primaryLight: "#059669",
      bg: "transparent",
      cardBg: "#FFFFFF",
      text: "#111827",
      textMuted: "#475569",
      textTertiary: "#64748B",
      border: "#E5E7EB",
      shadow: "0 1px 2px rgba(0,0,0,0.05)",
      unreadGlow: "0 0 0 3px rgba(16,185,129,0.10)",
    };

    const kitchenDark = {
      primary: "#34D399",
      primaryLight: "#10B981",
      bg: "transparent",
      cardBg: "#0F172A",
      text: "#F8FAFC",
      textMuted: "#CBD5E1",
      textTertiary: "#94A3B8",
      border: "#334155",
      shadow: "0 4px 6px -1px rgba(0,0,0,0.25)",
      unreadGlow: "0 0 0 3px rgba(52,211,153,0.14)",
    };

    const waiterLight = {
      primary: "#00BFA6",
      primaryLight: "#00E5CC",
      bg: "transparent",
      cardBg: "#FFFFFF",
      text: "#263238",
      textMuted: "#546E7A",
      textTertiary: "#94A3B8",
      border: "#E0E7EB",
      shadow: "0 2px 8px rgba(0,0,0,0.05)",
      unreadGlow: "0 0 0 3px rgba(0,191,166,0.10)",
    };

    const waiterDark = {
      primary: "#34D399",
      primaryLight: "#10B981",
      bg: "transparent",
      cardBg: "#0F172A",
      text: "#F8FAFC",
      textMuted: "#CBD5E1",
      textTertiary: "#94A3B8",
      border: "#334155",
      shadow: "0 2px 10px rgba(0,0,0,0.30)",
      unreadGlow: "0 0 0 3px rgba(52,211,153,0.14)",
    };

    if (isKitchen) return isDarkMode ? kitchenDark : kitchenLight;
    return isDarkMode ? waiterDark : waiterLight;
  }, [isDarkMode, isKitchen]);

  const STATUS_COLORS = useMemo(() => {
    // Status colors matching order-card palette.
    const ready = {
      bg: isDarkMode ? "rgba(5, 150, 105, 0.18)" : "#ECFDF5",
      text: isDarkMode ? "#6EE7B7" : "#059669",
      dot: isDarkMode ? "#34D399" : "#10B981",
      Icon: CheckCircle,
      label: "Ready",
    };

    const preparing = {
      bg: isDarkMode ? "rgba(217, 119, 6, 0.18)" : "#FEF3C7",
      text: isDarkMode ? "#FBBF24" : "#D97706",
      dot: isDarkMode ? "#F59E0B" : "#F59E0B",
      Icon: ChefHat,
      label: "Cooking",
    };

    const delivered = {
      bg: isDarkMode ? "rgba(5, 150, 105, 0.12)" : "#D1FAE5",
      text: isDarkMode ? "#6EE7B7" : "#059669",
      dot: isDarkMode ? "#10B981" : "#059669",
      Icon: Package,
      label: "Done",
    };

    return {
      ready,
      preparing,
      delivered,
      new: {
        bg: isDarkMode ? "rgba(124, 58, 237, 0.14)" : "#EDE9FE",
        text: isDarkMode ? "#A78BFA" : "#7C3AED",
        dot: isDarkMode ? "#8B5CF6" : "#7C3AED",
        Icon: Bell,
        label: "New",
      },
      pending: {
        bg: isDarkMode ? "rgba(124, 58, 237, 0.14)" : "#EDE9FE",
        text: isDarkMode ? "#A78BFA" : "#7C3AED",
        dot: isDarkMode ? "#8B5CF6" : "#7C3AED",
        Icon: Bell,
        label: "New",
      },
      confirmed: {
        bg: isDarkMode ? "rgba(124, 58, 237, 0.14)" : "#EDE9FE",
        text: isDarkMode ? "#A78BFA" : "#7C3AED",
        dot: isDarkMode ? "#8B5CF6" : "#7C3AED",
        Icon: Bell,
        label: "New",
      },
      waiter_call: {
        bg: isDarkMode ? "rgba(220, 38, 38, 0.14)" : "#FEE2E2",
        text: isDarkMode ? "#F87171" : "#DC2626",
        dot: isDarkMode ? "#EF4444" : "#DC2626",
        Icon: Phone,
        label: "Guest",
      },
      message: {
        bg: isDarkMode ? "rgba(124, 58, 237, 0.14)" : "#EDE9FE",
        text: isDarkMode ? "#A78BFA" : "#7C3AED",
        dot: isDarkMode ? "#8B5CF6" : "#7C3AED",
        Icon: MessageCircle,
        label: "Message",
      },
    };
  }, [isDarkMode]);

  const getNotificationStyle = (notification) => {
    const status = notification.status || notification.type;
    return STATUS_COLORS[status] || STATUS_COLORS.new;
  };

  const getLocation = (notification) => {
    const orderType = notification.type || notification.orderType;

    if (orderType === "takeaway") return "Takeaway";
    if (orderType === "roomService" || orderType === "room_service") {
      if (notification.room_number) return `Room ${notification.room_number}`;
      if (notification.room) return `Room ${notification.room}`;
      return "Room Service";
    }
    if (orderType === "dineIn" || orderType === "dine_in") {
      if (notification.table_number) return `Table ${notification.table_number}`;
      if (notification.table) return `Table ${notification.table}`;
      return "Dine In";
    }

    if (notification.table_number) return `Table ${notification.table_number}`;
    if (notification.table) return `Table ${notification.table}`;
    if (notification.room_number) return `Room ${notification.room_number}`;
    if (notification.room) return `Room ${notification.room}`;

    return "Location TBD";
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = useMemo(() => {
    if (activeTab === "unread") return notifications.filter((n) => !n.isRead);
    if (activeTab === "all") return notifications;
    return notifications.filter((n) => n.status === activeTab);
  }, [activeTab, notifications]);

  const filteredGrouped = useMemo(() => {
    // regroup after filtering
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = { today: [], yesterday: [], older: [] };

    filteredNotifications.forEach((notif) => {
      const notifDate = new Date(notif.createdAt || notif.time);
      const notifDay = new Date(
        notifDate.getFullYear(),
        notifDate.getMonth(),
        notifDate.getDate()
      );

      if (notifDay.getTime() === today.getTime()) groups.today.push(notif);
      else if (notifDay.getTime() === yesterday.getTime()) groups.yesterday.push(notif);
      else groups.older.push(notif);
    });

    return groups;
  }, [filteredNotifications]);

  const tabCounts = {
    all: notifications.length,
    unread: unreadCount,
    ready: notifications.filter((n) => n.status === "ready").length,
    preparing: notifications.filter((n) => n.status === "preparing").length,
    delivered: notifications.filter((n) => n.status === "delivered").length,
  };

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

  const outerPadding = isKitchen
    ? "0"
    : isMobile
      ? "16px"
      : "32px 48px";

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        minHeight: 0,
        padding: outerPadding,
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: isMobile ? "16px" : "24px",
          paddingBottom: isMobile ? "12px" : "20px",
          borderBottom: `1px solid ${colors.border}`,
          position: isKitchen ? "static" : "sticky",
          top: isMobile ? 0 : 0,
          zIndex: 10,
          background: "transparent",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: isMobile ? "1.35rem" : "1.75rem",
                fontWeight: "700",
                color: colors.text,
                margin: 0,
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span aria-hidden>🔔</span>
              <span>Notifications</span>
            </div>
            <p style={{ fontSize: "0.9rem", color: colors.textMuted, margin: 0 }}>
              {notifications.length} notifications • {unreadCount} unread
            </p>
          </div>

          {isMobile && onClose && (
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: `1px solid ${colors.border}`,
                color: colors.textMuted,
                borderRadius: "12px",
                padding: "10px 14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Back
            </button>
          )}

          {unreadCount > 0 && !isMobile && (
            <button
              onClick={onMarkAllRead}
              style={{
                padding: "10px 16px",
                borderRadius: "12px",
                border: `1.5px solid ${colors.primary}`,
                background: "transparent",
                color: colors.primary,
                fontSize: "0.9rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.primary;
                e.currentTarget.style.color = "#FFFFFF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = colors.primary;
              }}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "16px",
            flexWrap: "wrap",
          }}
        >
          {[
            { key: "all", label: "All", badge: tabCounts.all },
            { key: "unread", label: "Unread", badge: tabCounts.unread },
            {
              key: "ready",
              label: "Ready",
              badge: tabCounts.ready,
            },
            {
              key: "preparing",
              label: "Cooking",
              badge: tabCounts.preparing,
            },
            {
              key: "delivered",
              label: "Done",
              badge: tabCounts.delivered,
            },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: isMobile ? "8px 14px" : "8px 18px",
                  borderRadius: "9999px",
                  border: isActive ? "none" : `1px solid ${colors.border}`,
                  background: isActive
                    ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`
                    : colors.cardBg,
                  color: isActive ? "#FFFFFF" : colors.textMuted,
                  fontSize: "0.88rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: isActive ? `0 6px 18px rgba(0,0,0,0.08)` : "none",
                  transition: "all 0.2s ease",
                }}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span
                    style={{
                      background: isActive ? "rgba(255,255,255,0.25)" : "#EF4444",
                      color: isActive ? "#FFFFFF" : "#FFFFFF",
                      fontSize: "0.72rem",
                      fontWeight: "700",
                      padding: "2px 8px",
                      borderRadius: "9999px",
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {filteredNotifications.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? "64px 16px" : "96px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "56px", marginBottom: "16px", opacity: 0.9 }}>🔔</div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: "700", color: colors.text, margin: 0 }}>
            You're all caught up!
          </h3>
          <p style={{ fontSize: "0.95rem", color: colors.textMuted, margin: "8px 0 0" }}>
            No new notifications
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {filteredGrouped.today.length > 0 && (
            <Section
              title="TODAY"
              color={colors.textTertiary}
              border={colors.border}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "12px" : "16px" }}>
                {filteredGrouped.today.map((notification) => {
                  const style = getNotificationStyle(notification);
                  return (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      style={style}
                      colors={colors}
                      isDarkMode={isDarkMode}
                      onClick={() => handleNotificationClick(notification)}
                      onMarkRead={(e) => handleMarkAsRead(e, notification.id)}
                      getLocation={getLocation}
                    />
                  );
                })}
              </div>
            </Section>
          )}

          {filteredGrouped.yesterday.length > 0 && (
            <Section title="YESTERDAY" color={colors.textTertiary} border={colors.border}>
              <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "12px" : "16px" }}>
                {filteredGrouped.yesterday.map((notification) => {
                  const style = getNotificationStyle(notification);
                  return (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      style={style}
                      colors={colors}
                      isDarkMode={isDarkMode}
                      onClick={() => handleNotificationClick(notification)}
                      onMarkRead={(e) => handleMarkAsRead(e, notification.id)}
                      getLocation={getLocation}
                    />
                  );
                })}
              </div>
            </Section>
          )}

          {filteredGrouped.older.length > 0 && (
            <Section title="OLDER" color={colors.textTertiary} border={colors.border}>
              <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "12px" : "16px" }}>
                {filteredGrouped.older.map((notification) => {
                  const style = getNotificationStyle(notification);
                  return (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      style={style}
                      colors={colors}
                      isDarkMode={isDarkMode}
                      onClick={() => handleNotificationClick(notification)}
                      onMarkRead={(e) => handleMarkAsRead(e, notification.id)}
                      getLocation={getLocation}
                    />
                  );
                })}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
};

const Section = ({ title, color, border, children }) => {
  return (
    <div>
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: "700",
          letterSpacing: "0.12em",
          color,
          textTransform: "uppercase",
          padding: "14px 0 10px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <span>{title}</span>
        <span
          style={{
            content: "",
            flex: 1,
            height: "1px",
            background: border,
          }}
        />
      </div>
      {children}
    </div>
  );
};

// Notification Card Component
const NotificationCard = ({
  notification,
  style,
  colors,
  isDarkMode = false,
  onClick,
  onMarkRead,
  getLocation,
}) => {
  const IconComponent = style.Icon;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => {}}
      style={{
        background: notification.isRead
          ? colors.cardBg
          : isDarkMode
            ? "linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(17,24,39,1) 100%)"
            : "linear-gradient(135deg, #ECFDFB 0%, #FFFFFF 100%)",
        borderRadius: "24px",
        padding: "18px 20px",
        border: `1px solid ${colors.border}`,
        borderLeft: `4px solid ${style.dot}`,
        boxShadow: notification.isRead ? colors.shadow : `${colors.shadow}, ${colors.unreadGlow}`,
        display: "grid",
        gridTemplateColumns: "48px 1fr auto",
        gap: "14px",
        alignItems: "center",
        transition: "transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease",
        cursor: notification.orderId ? "pointer" : "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow =
          notification.isRead
            ? `${colors.shadow}`
            : `${colors.shadow}, 0 6px 20px rgba(0,191,166,0.12)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          notification.isRead ? `${colors.shadow}` : `${colors.shadow}, ${colors.unreadGlow}`;
      }}
    >
      {/* Icon Circle */}
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background: style.bg,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <IconComponent size={22} color={style.text} strokeWidth={2.5} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.98rem",
            fontWeight: "700",
            color: colors.text,
            marginBottom: notification.title ? "2px" : "4px",
            lineHeight: "1.35",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {notification.title || notification.message}
        </div>

        {notification.title && (
          <div
            style={{
              fontSize: "0.85rem",
              color: colors.textMuted,
              marginBottom: "4px",
              lineHeight: "1.4",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {notification.message}
          </div>
        )}

        {notification.type !== "message" && (
          <div
            style={{
              fontSize: "0.82rem",
              color: colors.textMuted,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span>📍 {getLocation(notification)}</span>
            <span
              style={{
                background: style.bg,
                color: style.text,
                padding: "3px 10px",
                borderRadius: "9999px",
                fontSize: "0.72rem",
                fontWeight: "700",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {style.label}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {!notification.isRead && (
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "9999px",
                background: style.dot,
                flexShrink: 0,
              }}
            />
          )}
          <NotificationTime
            date={notification.createdAt || notification.time}
            color={colors.textTertiary}
          />
        </div>

        {notification.orderId && (
          <button
            style={{
              background: colors.primary,
              border: "none",
              color: "#FFFFFF",
              fontSize: "0.9rem",
              fontWeight: "700",
              padding: "10px 16px",
              borderRadius: "9999px",
              cursor: "pointer",
              transition: "transform 0.12s ease, filter 0.2s ease",
            }}
            onClick={(e) => {
              // keep card click behavior consistent
              e.stopPropagation();
              onClick();
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = "brightness(0.95)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            View Order →
          </button>
        )}

        {!notification.isRead && (
          <button
            onClick={onMarkRead}
            style={{
              background: "transparent",
              border: `1px solid ${colors.border}`,
              color: colors.textTertiary,
              fontSize: "0.85rem",
              fontWeight: "700",
              padding: "6px 10px",
              borderRadius: "9999px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.primary;
              e.currentTarget.style.color = colors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.color = colors.textTertiary;
            }}
          >
            Mark read
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
