import React, { useState, useMemo } from "react";
import { Utensils, ClipboardList, Clock, Plus, X, Minus, CheckCircle, AlertCircle } from "lucide-react";
import { useOrderContext } from "../../context/useOrderContext";
import { useTheme } from "../../hooks/useTheme";  
import { toast } from "react-toastify";
import useClickOutside from "../../hooks/useClickOutSide";
import "./RightPanel.css";  


const RightPanel = ({ orders = [] }) => {
  const { addOrder, loading } = useOrderContext();
  const { isDark } = useTheme();  // ADD THIS
  const [showForm, setShowForm] = useState(false);
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

  // Calculate assigned areas dynamically from orders
  const assignedAreas = useMemo(() => {
    const areaMap = new Map();

    orders.forEach(order => {
      const areaName = order.table || 'Unknown';
      if (!areaMap.has(areaName)) {
        areaMap.set(areaName, { id: areaName, name: areaName, orderCount: 0 });
      }
      // Only count active orders (not delivered)
      if (order.status !== 'delivered') {
        areaMap.get(areaName).orderCount++;
      }
    });

    return Array.from(areaMap.values())
      .filter(area => area.orderCount > 0)
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5); // Show top 5 areas
  }, [orders]);

  // Generate notifications from orders
  const notifications = useMemo(() => {
    const notifs = [];

    orders.forEach(order => {
      // New order notifications
      if (order.status === 'new' || order.status === 'pending') {
        const placedTime = new Date(order.placedAt);
        const diffMins = Math.floor((new Date() - placedTime) / 60000);
        if (diffMins < 30) {
          notifs.push({
            id: `new-${order.id}`,
            type: "new_order",
            Icon: Utensils,
            iconBg: "#DBEAFE",
            iconColor: "#2563EB",
            message: `New order received for ${order.table}`,
            time: diffMins === 0 ? "Just now" : `${diffMins}m ago`,
            sortTime: placedTime,
          });
        }
      }

      // Ready for pickup notifications
      if (order.status === 'ready') {
        const readyTime = new Date(order.readyAt || order.placedAt);
        const diffMins = Math.floor((new Date() - readyTime) / 60000);
        notifs.push({
          id: `ready-${order.id}`,
          type: "order_ready",
          Icon: CheckCircle,
          iconBg: "#D1FAE5",
          iconColor: "#059669",
          message: `Order #${order.orderNumber || order.id?.slice?.(-5)?.toUpperCase()} ready for pickup`,
          time: diffMins === 0 ? "Just now" : `${diffMins}m ago`,
          sortTime: readyTime,
        });
      }

      // Delayed order notifications
      const placedTime = new Date(order.placedAt);
      const diffMins = Math.floor((new Date() - placedTime) / 60000);
      if (diffMins > 30 && order.status !== 'delivered' && order.status !== 'ready') {
        // Format time more reasonably
        let timeDisplay;
        if (diffMins < 60) {
          timeDisplay = `${diffMins}m waiting`;
        } else if (diffMins < 1440) { // Less than 24 hours
          const hours = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          timeDisplay = mins > 0 ? `${hours}h ${mins}m waiting` : `${hours}h waiting`;
        } else { // More than 24 hours - something is wrong
          const days = Math.floor(diffMins / 1440);
          timeDisplay = `${days}d waiting (check order)`;
        }
        
        notifs.push({
          id: `delay-${order.id}`,
          type: "kitchen_update",
          Icon: Clock,
          iconBg: "#FEF3C7",
          iconColor: "#D97706",
          message: `Order #${order.orderNumber || order.id?.slice?.(-5)?.toUpperCase()} delayed`,
          time: timeDisplay,
          sortTime: placedTime,
        });
      }
    });

    // Sort by time (newest first) and limit to 5
    return notifs
      .sort((a, b) => new Date(b.sortTime) - new Date(a.sortTime))
      .slice(0, 5);
  }, [orders]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
    try {
      await addOrder(formData);
      setShowForm(false);
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
            {notifications.map((notification) => {
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
            })}
          </div>
        </div>
      </div>

      {/* Order Form Modal - Keep the existing modal code but update classes similarly */}
      {showForm && (
        <div className="rp-modal-overlay">
          <div ref={formRef} className={`rp-modal ${isDark ? 'dark' : ''}`}>
            {/* Header */}
            <div style={{ marginBottom: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#111827", margin: 0, lineHeight: "1.2" }}>Create New Order</h2>
                <button onClick={() => setShowForm(false)} style={{
                  background: "#F3F4F6",
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
                  onMouseOver={(e) => e.currentTarget.style.background = "#E5E7EB"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#F3F4F6"}>
                  <X size={20} color="#6B7280" />
                </button>
              </div>
              <p style={{ fontSize: "14px", color: "#9CA3AF", margin: 0 }}>Add menu items and customer details</p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Order Type */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#6B7280",
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
                      backgroundColor: formData.orderType === "dineIn" ? "#10B981" : "#F3F4F6",
                      color: formData.orderType === "dineIn" ? "white" : "#6B7280",
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
                      backgroundColor: formData.orderType === "roomService" ? "#10B981" : "#F3F4F6",
                      color: formData.orderType === "roomService" ? "white" : "#6B7280",
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
                  color: "#6B7280",
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
                      border: "1px solid #E5E7EB",
                      fontSize: "15px",
                      outline: "none",
                      transition: "border 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#10B981"}
                    onBlur={(e) => e.target.style.borderColor = "#E5E7EB"} />
                </div>
              </div>

              {/* Customer Details */}
              <div style={{ backgroundColor: "#F9FAFB", borderRadius: "16px", padding: "20px", marginBottom: "24px" }}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#6B7280",
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
                      color: "#9CA3AF",
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
                        border: "1px solid #E5E7EB",
                        backgroundColor: "white",
                        fontSize: "15px",
                        outline: "none",
                        transition: "border 0.2s"
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#10B981"}
                      onBlur={(e) => e.target.style.borderColor = "#E5E7EB"} />
                  </div>
                </div>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#9CA3AF",
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
                      color: "#9CA3AF",
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
                        border: "1px solid #E5E7EB",
                        backgroundColor: "white",
                        fontSize: "15px",
                        outline: "none",
                        transition: "border 0.2s"
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#10B981"}
                      onBlur={(e) => e.target.style.borderColor = "#E5E7EB"} />
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <span style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>Order Items</span>
                  <span style={{
                    backgroundColor: "#D1FAE5",
                    color: "#059669",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "700"
                  }}>{formData.items.length} items</span>
                </div>
                {formData.items.map((item, index) => (
                  <div key={index} style={{
                    backgroundColor: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "16px",
                    padding: "16px",
                    marginBottom: "12px",
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
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
                        color: "#111827",
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
                        color: "#9CA3AF",
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
                            border: "1px solid #E5E7EB",
                            background: "white",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "18px",
                            color: "#6B7280",
                            transition: "all 0.2s"
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = "#F3F4F6"; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = "white"; }}>
                          −
                        </button>
                        <span style={{ fontSize: "16px", fontWeight: "600", minWidth: "20px", textAlign: "center" }}>{item.quantity}</span>
                        <button type="button"
                          onClick={() => handleItemChange(index, "quantity", item.quantity + 1)}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            border: "1px solid #E5E7EB",
                            background: "white",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "18px",
                            color: "#6B7280",
                            transition: "all 0.2s"
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = "#F3F4F6"; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = "white"; }}>
                          +
                        </button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", fontSize: "18px", fontWeight: "700", color: "#111827" }}>
                          <span>$</span>
                          <input
                            type="number"
                            value={item.price || 0}
                            step="0.01"
                            min="0"
                            onChange={(e) => handleItemChange(index, "price", parseFloat(e.target.value) || 0)}
                            style={{
                              width: "80px",
                              border: "none",
                              fontSize: "18px",
                              fontWeight: "700",
                              textAlign: "left",
                              outline: "none",
                              color: "#111827",
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
                              background: "#FEE2E2",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background 0.2s"
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = "#FECACA"; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = "#FEE2E2"; }}>
                            <X size={14} color="#DC2626" />
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
                    backgroundColor: "white",
                    color: "#2563EB",
                    border: "2px dashed #DBEAFE",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#F0F9FF"; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "white"; }}>
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
                    backgroundColor: "#F3F4F6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: "600",
                    transition: "background 0.2s"
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#E5E7EB"; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#F3F4F6"; }}>
                  Cancel
                </button>
                <button type="submit"
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: "14px 24px",
                    backgroundColor: loading ? "#9CA3AF" : "#10B981",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "15px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                    boxShadow: loading ? "none" : "0 2px 4px rgba(16, 185, 129, 0.2)"
                  }}
                  onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#059669"; }}
                  onMouseOut={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#10B981"; }}>
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
