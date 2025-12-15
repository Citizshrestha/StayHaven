import React, { useState } from "react";
import { Utensils, ClipboardList, Clock, Plus, X, Minus } from "lucide-react";
import { useOrderContext } from "../../context/useOrderContext";
import { toast } from "react-toastify";


const RightPanel = () => {
  const { addOrder, loading } = useOrderContext();
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
  const assignedAreas = [
    { id: 1, name: "Table 5", orderCount: 2 },
    { id: 2, name: "Table 8A", orderCount: 1 },
    { id: 3, name: "Room 204", orderCount: 1 },
    { id: 4, name: "Table 12", orderCount: 1 },
  ];

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
    }))
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


  const notifications = [
    {
      id: 1,
      type: "new_order",
      Icon: Utensils, // Using icon component directly
      iconBg: "#DBEAFE", // Blue-100
      iconColor: "#2563EB", // Blue-600
      message: "New order received for Table 5",
      time: "2 minutes ago",
    },
    {
      id: 2,
      type: "order_ready",
      Icon: ClipboardList,
      iconBg: "#D1FAE5", // Green-100
      iconColor: "#059669", // Green-600
      message: "Order #82299 is ready for pickup",
      time: "5 minutes ago",
    },
    {
      id: 3,
      type: "kitchen_update",
      Icon: Clock,
      iconBg: "#FEF3C7", // Yellow-100
      iconColor: "#D97706", // Yellow-600
      message: "Kitchen update: Order #82300 delayed",
      time: "10 minutes ago",
    },
  ];

  // Inline Styles
  const containerStyle = {
    backgroundColor: "#F8F9FB", // Light gray background for panel
    height: "100%",
    overflowY: "auto",
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    gap: "32px",
    fontFamily: "'Nunito', sans-serif",
  };

  const sectionTitleStyle = {
    fontSize: "20px",
    fontWeight: "700",
    color: "#111827", // Gray-900
    marginBottom: "16px",
  };

  const cardContainerStyle = {
    backgroundColor: "white",
    borderRadius: "24px",
    padding: "24px",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  };

  const assignedListStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  };

  const assignedItemStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    backgroundColor: "#F9FAFB", // Gray-50
    borderRadius: "12px",
  };

  const assignedNameStyle = {
    fontWeight: "600",
    color: "#1F2937", // Gray-800
    fontSize: "15px",
  };

  const assignedCountStyle = {
    fontSize: "14px",
    color: "#9CA3AF", // Gray-400
    fontWeight: "500",
  };

  const notificationListStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  };

  const notificationItemStyle = {
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
  };

  const getIconContainerStyle = (bgColor) => ({
    flexShrink: 0,
    width: "48px",
    height: "48px",
    backgroundColor: bgColor,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const notificationContentStyle = {
    flex: 1,
  };

  const notificationMessageStyle = {
    fontSize: "14px",
    color: "#111827", // Gray-900
    fontWeight: "600",
    lineHeight: "1.4",
    marginBottom: "4px",
  };

  const notificationTimeStyle = {
    fontSize: "12px",
    color: "#6B7280", // Gray-500
    fontWeight: "500",
  };

  return (
    <div style={containerStyle}>
      {/* New Order Button */}
      <button
        onClick={() => setShowForm(true)}
        style={{
          width: "100%",
          padding: "16px",
          backgroundColor: "#10B981",
          color: "white",
          borderRadius: "12px",
          border: "none",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          marginBottom: "24px",
        }}
      >
        <Plus size={20} />
        New Order
      </button>
      {/* Assigned Areas Section */}
      <div>
        <h2 style={sectionTitleStyle}>Assigned Areas</h2>

        <div style={cardContainerStyle}>
          <div style={assignedListStyle}>
            {assignedAreas.map((area) => (
              <div key={area.id} style={assignedItemStyle}>
                <span style={assignedNameStyle}>{area.name}</span>
                <span style={assignedCountStyle}>
                  {area.orderCount} {area.orderCount === 1 ? "Order" : "Orders"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div>
        <h2 style={sectionTitleStyle}>Notifications</h2>

        <div style={cardContainerStyle}>
          <div style={notificationListStyle}>
            {notifications.map((notification) => {
              const { Icon, iconBg, iconColor } = notification;
              return (
                <div key={notification.id} style={notificationItemStyle}>
                  <div style={getIconContainerStyle(iconBg)}>
                    <Icon size={20} color={iconColor} />
                  </div>
                  <div style={notificationContentStyle}>
                    <p style={notificationMessageStyle}>
                      {notification.message}
                    </p>
                    <p style={notificationTimeStyle}>{notification.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Order Form Modal */}
      {showForm && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "24px",
            padding: "40px",
            width: "90%",
            maxWidth: "460px",
            maxHeight: "90vh",
            overflowY: "auto",
          }}>
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
                        <span style={{ fontSize: "18px", fontWeight: "700", color: "#111827" }}>
                          $ <input
                            type="number"
                            value={item.price || 0}
                            step="0.01"
                            min="0"
                            onChange={(e) => handleItemChange(index, "price", parseFloat(e.target.value) || 0)}
                            style={{
                              width: "70px",
                              border: "none",
                              fontSize: "18px",
                              fontWeight: "700",
                              textAlign: "right",
                              outline: "none",
                              color: "#111827"
                            }} />
                        </span>
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
