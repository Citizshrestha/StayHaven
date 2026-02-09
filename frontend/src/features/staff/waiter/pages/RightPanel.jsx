import React, { useState, useMemo } from "react";
import { Plus, X, Minus, CheckCircle, AlertCircle, Package, Phone, Bell, Sparkles } from "lucide-react";
import { useOrderContext } from "../../../../context/useOrderContext";
import { useNotifications, NOTIFICATION_TYPES } from "../../../../context/useNotifications";
import { useTheme } from "../../../../hooks/useTheme";
import { toast } from "react-toastify";
import useClickOutside from "../../../../hooks/useClickOutSide";
import "./RightPanel.css";


const RightPanel = ({ orders = [] }) => {
  const { addOrder, loading } = useOrderContext();
  const { isDark } = useTheme();
  const { notifications: contextNotifications } = useNotifications();
  const [showForm, setShowForm] = useState(false);
  const [locationError, setLocationError] = useState(""); // Validation error for duplicate room/table
  const [formData, setFormData] = useState({
    orderType: "dineIn",
    roomId: "",
    roomNumber: "",
    tableNumber: "",
    customerName: "",
    notes: "",
    priority: "normal",
    items: [{ name: "", quantity: 1, price: 0, notes: "" }]
  });

  const formRef = useClickOutside(() => setShowForm(false));

  // Theme-aware colors for the form modal
  const colors = {
    modalBg: isDark ? '#1E293B' : 'white',
    cardBg: isDark ? '#334155' : '#F9FAFB',
    text: isDark ? '#F8FAFC' : '#111827',
    textSecondary: isDark ? '#CBD5E1' : '#6B7280',
    textTertiary: isDark ? '#94A3B8' : '#9CA3AF',
    border: isDark ? '#475569' : '#E5E7EB',
    inputBg: isDark ? '#0F172A' : 'white',
    buttonInactive: isDark ? '#334155' : '#F3F4F6',
    buttonInactiveText: isDark ? '#CBD5E1' : '#6B7280',
    closeBtn: isDark ? '#475569' : '#F3F4F6',
    closeBtnHover: isDark ? '#64748B' : '#E5E7EB',
    itemBadgeBg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
    itemBadgeText: isDark ? '#34D399' : '#059669',
    itemCardBg: isDark ? '#0F172A' : 'white',
    dashedBorder: isDark ? '#475569' : '#DBEAFE',
    dashedText: isDark ? '#60A5FA' : '#2563EB',
    addBtnHover: isDark ? '#334155' : '#F0F9FF',
    removeBtnBg: isDark ? 'rgba(220, 38, 38, 0.2)' : '#FEE2E2',
    removeBtnHover: isDark ? 'rgba(220, 38, 38, 0.3)' : '#FECACA',
    cancelBtnBg: isDark ? '#475569' : '#F3F4F6',
    cancelBtnHover: isDark ? '#64748B' : '#E5E7EB',
    cancelBtnText: isDark ? '#E2E8F0' : '#374151',
    qtyBtnBg: isDark ? '#0F172A' : 'white',
    qtyBtnHover: isDark ? '#334155' : '#F3F4F6',
    errorBg: isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEF2F2',
    errorBorder: isDark ? 'rgba(220, 38, 38, 0.3)' : '#FECACA',
  };

  // Get all active locations (rooms/tables with incomplete orders)
  // Only allow reuse when order is completed (delivered) or cancelled
  const activeLocations = useMemo(() => {
    const activeTables = new Set();
    const activeRooms = new Set();

    orders.forEach(order => {
      // Only block if order is NOT completed (delivered) and NOT cancelled
      const isCompleted = order.status === 'delivered' || order.status === 'completed';
      const isCancelled = order.status === 'cancelled';

      if (!isCompleted && !isCancelled) {
        // Extract table number - handle formats like "Table 5", "table 5", or just "5"
        const tableMatch = order.table?.match(/table\s*(\d+)/i);
        if (tableMatch) {
          activeTables.add(tableMatch[1]); // Store just the number
        } else if (order.tableNumber) {
          // Handle direct tableNumber field
          activeTables.add(String(order.tableNumber).replace(/\D/g, '') || order.tableNumber);
        }

        // Extract room number - handle formats like "Room 302", "room 302", or just "302"
        const roomMatch = order.table?.match(/room\s*(\d+)/i);
        if (roomMatch) {
          activeRooms.add(roomMatch[1]); // Store just the number
        } else if (order.roomNumber) {
          // Handle direct roomNumber field
          activeRooms.add(String(order.roomNumber).replace(/\D/g, '') || order.roomNumber);
        }
      }
    });

    return { tables: activeTables, rooms: activeRooms };
  }, [orders]);

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

  // Get the top 5 latest notifications from context, sorted by createdAt (newest first)
  const notifications = useMemo(() => {
    // Helper function to get icon and colors for notification type (inline to avoid dependency issues)
    const getNotificationStyle = (type) => {
      switch (type) {
        case NOTIFICATION_TYPES.NEW_ORDER:
          return {
            Icon: Package,
            iconBg: isDark ? "rgba(37, 99, 235, 0.2)" : "#DBEAFE",
            iconColor: isDark ? "#60A5FA" : "#2563EB"
          };
        case NOTIFICATION_TYPES.ORDER_READY:
          return {
            Icon: CheckCircle,
            iconBg: isDark ? "rgba(5, 150, 105, 0.2)" : "#D1FAE5",
            iconColor: isDark ? "#34D399" : "#059669"
          };
        case NOTIFICATION_TYPES.ORDER_STATUS:
          return {
            Icon: Sparkles,
            iconBg: isDark ? "rgba(79, 70, 229, 0.2)" : "#E0E7FF",
            iconColor: isDark ? "#A5B4FC" : "#4F46E5"
          };
        case NOTIFICATION_TYPES.WAITER_CALL:
          return {
            Icon: Phone,
            iconBg: isDark ? "rgba(220, 38, 38, 0.2)" : "#FEE2E2",
            iconColor: isDark ? "#F87171" : "#DC2626"
          };
        default:
          return {
            Icon: Bell,
            iconBg: isDark ? "#334155" : "#F3F4F6",
            iconColor: isDark ? "#94A3B8" : "#6B7280"
          };
      }
    };

    return [...contextNotifications]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(notification => {
        const { Icon, iconBg, iconColor } = getNotificationStyle(notification.type);
        return {
          ...notification,
          Icon,
          iconBg,
          iconColor,
          time: getTimeAgo(notification.createdAt),
        };
      });
  }, [contextNotifications, isDark]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Clear error and validate when location field changes
    if (name === 'tableNumber' || name === 'roomNumber') {
      setLocationError(""); // Clear previous error

      // Check for duplicate location
      if (value.trim()) {
        // Extract just the number from input (in case user types "Table 5" or just "5")
        const numberValue = value.replace(/\D/g, '') || value.trim();

        if (name === 'tableNumber') {
          // Check against active tables
          if (activeLocations.tables.has(numberValue)) {
            setLocationError(`Table ${value} already has an active order. Please select a different table.`);
          }
        } else if (name === 'roomNumber') {
          // Check against active rooms
          if (activeLocations.rooms.has(numberValue)) {
            setLocationError(`Room ${value} already has an active order. Please select a different room.`);
          }
        }
      }
    }
  };

  // handle items change
  const handleItemChange = (idx, field, val) => {
    setFormData(prev => {
      const newItems = [...formData.items];
      newItems[idx] = { ...newItems[idx], [field]: val };
      return { ...prev, items: newItems };
    });
  }

  // add another item to the order
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { name: "", quantity: 1, price: 0, notes: "" }],
    }));
  };

  const removeItem = (idx) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== idx),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate location before submitting
    const locationValue = formData.orderType === 'dineIn' ? formData.tableNumber : formData.roomNumber;
    const locationType = formData.orderType === 'dineIn' ? 'Table' : 'Room';
    // Extract just the number for comparison
    const numberValue = locationValue.replace(/\D/g, '') || locationValue.trim();

    // Check against the appropriate set based on order type
    const isOccupied = formData.orderType === 'dineIn'
      ? activeLocations.tables.has(numberValue)
      : activeLocations.rooms.has(numberValue);

    if (isOccupied) {
      setLocationError(`${locationType} ${locationValue} already has an active order. Please select a different ${locationType.toLowerCase()}.`);
      return; // Don't submit if location is occupied
    }

    try {
      await addOrder(formData);
      setShowForm(false);
      setLocationError(""); // Clear error on success
      setFormData({
        orderType: "dineIn",
        roomId: "",
        roomNumber: "",
        tableNumber: "",
        customerName: "",
        notes: "",
        priority: "normal",
        items: [{ name: "", quantity: 1, price: 0, notes: "" }]
      });
      toast.success("Order added successfully");
    } catch (err) {
      toast.error("Failed to add order: " + err.message);
    }
  };

  return (
    <div className={`rp-container ${isDark ? 'dark' : ''}`}>
      {/* New Order Button */}
      <button onClick={() => setShowForm(true)} className="rp-new-order-btn">
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

      {/* Notifications Section */}
      <div className="rp-section">
        <h2 className="rp-section-title">Notifications</h2>
        <div className="rp-card">
          <div className="rp-notification-list">
            {notifications.length === 0 ? (
              <div className="rp-notification-empty" style={{
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
              notifications.map((notification) => {
                const { Icon, iconBg, iconColor } = notification;
                return (
                  <div key={notification.id} className="rp-notification-item">
                    <div
                      className="rp-notification-icon"
                      style={{ backgroundColor: iconBg }}
                    >
                      <Icon size={20} color={iconColor} />
                    </div>
                    <div className="rp-notification-content">
                      <p className="rp-notification-message">{notification.message}</p>
                      <p className="rp-notification-time">{notification.time}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Order Form Modal - Keep the existing modal code but update classes similarly */}
      {showForm && (
        <div className="rp-modal-overlay">
          <div ref={formRef} className={`rp-modal ${isDark ? 'dark' : ''}`} style={{ backgroundColor: colors.modalBg }}>
            {/* Header */}
            <div style={{ marginBottom: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                <h2 style={{ fontSize: "28px", fontWeight: "800", color: colors.text, margin: 0, lineHeight: "1.2" }}>Create New Order</h2>
                <button onClick={() => setShowForm(false)} style={{
                  background: colors.closeBtn,
                  border: "none",
                  cursor: "pointer",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s"
                }}
                  onMouseOver={(e) => e.currentTarget.style.background = colors.closeBtnHover}
                  onMouseOut={(e) => e.currentTarget.style.background = colors.closeBtn}>
                  <X size={20} color={colors.textSecondary} />
                </button>
              </div>
              <p style={{ fontSize: "14px", color: colors.textTertiary, margin: 0 }}>Add menu items and customer details</p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Order Type */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: "700",
                  color: colors.labelText,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "12px"
                }}>ORDER TYPE</label>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button type="button"
                    onClick={() => setFormData({ ...formData, orderType: "dineIn" })}
                    style={{
                      flex: 1,
                      padding: "14px 20px",
                      backgroundColor: formData.orderType === "dineIn" ? "#10B981" : colors.typeBtn,
                      color: formData.orderType === "dineIn" ? "white" : colors.typeBtnText,
                      border: "none",
                      borderRadius: "12px",
                      cursor: "pointer",
                      fontSize: "15px",
                      fontWeight: "600",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}>
                    🍽️ Dine In
                  </button>
                  <button type="button"
                    onClick={() => setFormData({ ...formData, orderType: "roomService" })}
                    style={{
                      flex: 1,
                      padding: "14px 20px",
                      backgroundColor: formData.orderType === "roomService" ? "#10B981" : colors.typeBtn,
                      color: formData.orderType === "roomService" ? "white" : colors.typeBtnText,
                      border: "none",
                      borderRadius: "12px",
                      cursor: "pointer",
                      fontSize: "15px",
                      fontWeight: "600",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}>
                    🛏️ Room Service
                  </button>
                </div>
              </div>

              {/* Location */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: "700",
                  color: colors.labelText,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "12px"
                }}>LOCATION</label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "18px"
                  }}>🏪</span>
                  <input
                    type="text"
                    name={formData.orderType === "dineIn" ? "tableNumber" : "roomNumber"}
                    value={formData.orderType === "dineIn" ? formData.tableNumber : formData.roomNumber}
                    onChange={handleInputChange}
                    placeholder={formData.orderType === "dineIn" ? "e.g., Table 5" : "e.g., Room 204"}
                    required
                    style={{
                      width: "100%",
                      padding: "14px 14px 14px 46px",
                      borderRadius: "12px",
                      border: locationError ? "1px solid #DC2626" : `1px solid ${colors.border}`,
                      backgroundColor: colors.inputBg,
                      color: colors.text,
                      fontSize: "15px",
                      outline: "none",
                      transition: "border 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = locationError ? "#DC2626" : "#10B981"}
                    onBlur={(e) => e.target.style.borderColor = locationError ? "#DC2626" : colors.border} />
                </div>
                {/* Location Error Message */}
                {locationError && (
                  <div style={{
                    marginTop: "8px",
                    padding: "10px 14px",
                    backgroundColor: isDark ? "#7F1D1D" : "#FEF2F2",
                    borderRadius: "8px",
                    border: isDark ? "1px solid #991B1B" : "1px solid #FECACA",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <AlertCircle size={18} color={isDark ? "#FCA5A5" : "#DC2626"} />
                    <span style={{
                      fontSize: "13px",
                      fontWeight: "500",
                      color: isDark ? "#FCA5A5" : "#DC2626"
                    }}>
                      {locationError}
                    </span>
                  </div>
                )}
              </div>
              {/* Customer Details */}
              <div style={{ backgroundColor: colors.cardBg, borderRadius: "16px", padding: "20px", marginBottom: "24px" }}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: colors.labelText,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "12px"
                  }}>CUSTOMER NAME</label>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: colors.textTertiary,
                      fontSize: "18px"
                    }}>👤</span>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      placeholder="Citiz Shrestha"
                      style={{
                        width: "100%",
                        padding: "14px 14px 14px 46px",
                        borderRadius: "12px",
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.inputBg,
                        color: colors.text,
                        fontSize: "15px",
                        outline: "none",
                        transition: "border 0.2s"
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#10B981"}
                      onBlur={(e) => e.target.style.borderColor = colors.border} />
                  </div>
                </div>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "12px"
                  }}>PHONE NUMBER <span style={{ fontWeight: "400" }}>(optional)</span></label>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: colors.textTertiary,
                      fontSize: "18px"
                    }}>📱</span>
                    <input
                      type="tel"
                      name="customerPhone"
                      value={formData.customerPhone || ""}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 000-0000"
                      style={{
                        width: "100%",
                        padding: "14px 14px 14px 46px",
                        borderRadius: "12px",
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.inputBg,
                        color: colors.text,
                        fontSize: "15px",
                        outline: "none",
                        transition: "border 0.2s"
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#10B981"}
                      onBlur={(e) => e.target.style.borderColor = colors.border} />
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <span style={{ fontSize: "16px", fontWeight: "700", color: colors.text }}>Order Items</span>
                  <span style={{
                    backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#D1FAE5",
                    color: "#10B981",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "700"
                  }}>{formData.items.length} items</span>
                </div>
                {formData.items.map((item, index) => (
                  <div key={index} style={{
                    backgroundColor: colors.itemCardBg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "16px",
                    padding: "16px",
                    marginBottom: "12px",
                    boxShadow: isDark ? "none" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                  }}>
                    <input
                      type="text"
                      placeholder="Club Sandwich"
                      value={item.name}
                      onChange={(e) => handleItemChange(index, "name", e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "0",
                        marginBottom: "6px",
                        border: "none",
                        fontSize: "16px",
                        fontWeight: "600",
                        color: colors.text,
                        backgroundColor: "transparent",
                        outline: "none"
                      }} />
                    <input
                      type="text"
                      placeholder="Extra mayo, no pickles"
                      value={item.notes || ""}
                      onChange={(e) => handleItemChange(index, "notes", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0",
                        marginBottom: "16px",
                        border: "none",
                        fontSize: "13px",
                        color: colors.textTertiary,
                        backgroundColor: "transparent",
                        outline: "none"
                      }} />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <button type="button"
                          onClick={() => handleItemChange(index, "quantity", Math.max(1, item.quantity - 1))}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            border: `1px solid ${colors.border}`,
                            background: colors.itemCardBg,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "18px",
                            color: colors.textSecondary,
                            transition: "all 0.2s"
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = colors.typeBtn; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = colors.itemCardBg; }}>
                          −
                        </button>
                        <span style={{ fontSize: "16px", fontWeight: "600", minWidth: "20px", textAlign: "center", color: colors.text }}>{item.quantity}</span>
                        <button type="button"
                          onClick={() => handleItemChange(index, "quantity", item.quantity + 1)}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            border: `1px solid ${colors.border}`,
                            background: colors.itemCardBg,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "18px",
                            color: colors.textSecondary,
                            transition: "all 0.2s"
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = colors.typeBtn; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = colors.itemCardBg; }}>
                          +
                        </button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", fontSize: "18px", fontWeight: "700", color: colors.text }}>
                          <span>Rs.</span>
                          <input
                            type="number"
                            value={item.price || 0}
                            step="0.01"
                            min="0"
                            onChange={(e) => handleItemChange(index, "price", parseFloat(e.target.value) || 0)}
                            style={{
                              width: "140px", // increased to allow at least 4 digits to be visible on desktop
                              border: "none",
                              fontSize: "18px",
                              fontWeight: "700",
                              textAlign: "left",
                              outline: "none",
                              color: colors.text,
                              backgroundColor: "transparent",
                              marginLeft: "4px"
                            }} />
                        </div>
                        {formData.items.length > 1 && (
                          <button type="button"
                            onClick={() => removeItem(index)}
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              border: "none",
                              background: isDark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background 0.2s"
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = isDark ? "rgba(239, 68, 68, 0.3)" : "#FECACA"; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = isDark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2"; }}>
                            <X size={14} color={isDark ? "#FCA5A5" : "#DC2626"} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addItem}
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: isDark ? "transparent" : "white",
                    color: isDark ? "#60A5FA" : "#2563EB",
                    border: isDark ? "2px dashed #3B82F6" : "2px dashed #DBEAFE",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = isDark ? "rgba(59, 130, 246, 0.1)" : "#F0F9FF"; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = isDark ? "transparent" : "white"; }}>
                  + Add Another Item
                </button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
                <button type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1,
                    padding: "14px",
                    backgroundColor: colors.cancelBtnBg,
                    color: colors.cancelBtnText,
                    border: "none",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: "600",
                    transition: "background 0.2s"
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = colors.closeBtnHover; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = colors.cancelBtnBg; }}>
                  Cancel
                </button>
                <button type="submit"
                  disabled={loading || locationError}
                  style={{
                    flex: 2,
                    padding: "14px 24px",
                    backgroundColor: (loading || locationError) ? "#9CA3AF" : "#10B981",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    cursor: (loading || locationError) ? "not-allowed" : "pointer",
                    fontSize: "15px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                    boxShadow: (loading || locationError) ? "none" : "0 2px 4px rgba(16, 185, 129, 0.2)"
                  }}
                  onMouseOver={(e) => { if (!loading && !locationError) e.currentTarget.style.backgroundColor = "#059669"; }}
                  onMouseOut={(e) => { if (!loading && !locationError) e.currentTarget.style.backgroundColor = "#10B981"; }}>
                  {loading ? "Creating..." : "Create Order →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RightPanel;