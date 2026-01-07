import React, { useState } from "react";
import { X } from "lucide-react";
import { useOrderContext } from "../../context/useOrderContext";
import { toast } from "react-toastify";
import { useTheme } from "../../hooks/useTheme";

const OrderFormModal = ({ onClose }) => {
    const { addOrder, loading } = useOrderContext();
    const { isDark } = useTheme();
    
    // Theme-aware colors
    const colors = {
        bg: isDark ? '#1E293B' : 'white',
        cardBg: isDark ? '#334155' : '#F9FAFB',
        text: isDark ? '#F8FAFC' : '#111827',
        textSecondary: isDark ? '#CBD5E1' : '#6B7280',
        textTertiary: isDark ? '#94A3B8' : '#9CA3AF',
        border: isDark ? '#475569' : '#E5E7EB',
        inputBg: isDark ? '#0F172A' : 'white',
        inputBorder: isDark ? '#475569' : '#E5E7EB',
        buttonInactive: isDark ? '#334155' : '#F3F4F6',
        buttonInactiveText: isDark ? '#CBD5E1' : '#6B7280',
        closeBtn: isDark ? '#475569' : '#F3F4F6',
        closeBtnIcon: isDark ? '#CBD5E1' : '#6B7280',
        itemBadgeBg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
        itemBadgeText: isDark ? '#34D399' : '#059669',
        dashedBorder: isDark ? '#475569' : '#DBEAFE',
        dashedText: isDark ? '#60A5FA' : '#2563EB',
        removeBtnBg: isDark ? 'rgba(220, 38, 38, 0.2)' : '#FEE2E2',
        cancelBtnBg: isDark ? '#475569' : '#F3F4F6',
        cancelBtnText: isDark ? '#E2E8F0' : '#374151',
    };
    
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleItemChange = (idx, field, val) => {
        setFormData(prev => {
            const newItems = [...formData.items];
            newItems[idx] = { ...newItems[idx], [field]: val };
            return { ...prev, items: newItems };
        });
    };

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
            onClose();
            toast.success("Order added successfully");
        } catch (err) {
            toast.error("Failed to add order: " + err.message);
        }
    };

    return (
        <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px"
        }}>
            <div style={{
                backgroundColor: colors.bg,
                borderRadius: "24px",
                padding: "32px",
                width: "100%",
                maxWidth: "460px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: isDark 
                    ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" 
                    : "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}>
                {/* Header */}
                <div style={{ marginBottom: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                        <h2 style={{ fontSize: "24px", fontWeight: "800", color: colors.text, margin: 0, lineHeight: "1.2" }}>Create New Order</h2>
                        <button onClick={onClose} style={{
                            background: colors.closeBtn,
                            border: "none",
                            cursor: "pointer",
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}>
                            <X size={20} color={colors.closeBtnIcon} />
                        </button>
                    </div>
                    <p style={{ fontSize: "14px", color: colors.textTertiary, margin: 0 }}>Add menu items and customer details</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Order Type */}
                    <div style={{ marginBottom: "20px" }}>
                        <label style={{
                            display: "block",
                            fontSize: "11px",
                            fontWeight: "700",
                            color: colors.textSecondary,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "10px"
                        }}>ORDER TYPE</label>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button type="button"
                                onClick={() => setFormData({ ...formData, orderType: "dineIn" })}
                                style={{
                                    flex: 1,
                                    padding: "12px 16px",
                                    backgroundColor: formData.orderType === "dineIn" ? "#10B981" : colors.buttonInactive,
                                    color: formData.orderType === "dineIn" ? "white" : colors.buttonInactiveText,
                                    border: "none",
                                    borderRadius: "12px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                }}>
                                🍽️ Dine In
                            </button>
                            <button type="button"
                                onClick={() => setFormData({ ...formData, orderType: "roomService" })}
                                style={{
                                    flex: 1,
                                    padding: "12px 16px",
                                    backgroundColor: formData.orderType === "roomService" ? "#10B981" : colors.buttonInactive,
                                    color: formData.orderType === "roomService" ? "white" : colors.buttonInactiveText,
                                    border: "none",
                                    borderRadius: "12px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                }}>
                                🛏️ Room Service
                            </button>
                        </div>
                    </div>

                    {/* Location */}
                    <div style={{ marginBottom: "20px" }}>
                        <label style={{
                            display: "block",
                            fontSize: "11px",
                            fontWeight: "700",
                            color: colors.textSecondary,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "10px"
                        }}>LOCATION</label>
                        <input
                            type="text"
                            name={formData.orderType === "dineIn" ? "tableNumber" : "roomNumber"}
                            value={formData.orderType === "dineIn" ? formData.tableNumber : formData.roomNumber}
                            onChange={handleInputChange}
                            placeholder={formData.orderType === "dineIn" ? "e.g., Table 5" : "e.g., Room 204"}
                            required
                            style={{
                                width: "100%",
                                padding: "14px",
                                borderRadius: "12px",
                                border: `1px solid ${colors.inputBorder}`,
                                backgroundColor: colors.inputBg,
                                color: colors.text,
                                fontSize: "15px",
                                outline: "none",
                                boxSizing: "border-box"
                            }} />
                    </div>

                    {/* Customer Name */}
                    <div style={{ marginBottom: "20px" }}>
                        <label style={{
                            display: "block",
                            fontSize: "11px",
                            fontWeight: "700",
                            color: colors.textSecondary,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "10px"
                        }}>CUSTOMER NAME</label>
                        <input
                            type="text"
                            name="customerName"
                            value={formData.customerName}
                            onChange={handleInputChange}
                            placeholder="Enter customer name"
                            style={{
                                width: "100%",
                                padding: "14px",
                                borderRadius: "12px",
                                border: `1px solid ${colors.inputBorder}`,
                                backgroundColor: colors.inputBg,
                                color: colors.text,
                                fontSize: "15px",
                                outline: "none",
                                boxSizing: "border-box"
                            }} />
                    </div>

                    {/* Order Items */}
                    <div style={{ marginBottom: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                            <span style={{ fontSize: "14px", fontWeight: "700", color: colors.text }}>Order Items</span>
                            <span style={{
                                backgroundColor: colors.itemBadgeBg,
                                color: colors.itemBadgeText,
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "700"
                            }}>{formData.items.length} items</span>
                        </div>
                        {formData.items.map((item, index) => (
                            <div key={index} style={{
                                backgroundColor: colors.cardBg,
                                border: `1px solid ${colors.border}`,
                                borderRadius: "12px",
                                padding: "14px",
                                marginBottom: "10px",
                            }}>
                                <input
                                    type="text"
                                    placeholder="Item name"
                                    value={item.name}
                                    onChange={(e) => handleItemChange(index, "name", e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "0",
                                        marginBottom: "8px",
                                        border: "none",
                                        fontSize: "15px",
                                        fontWeight: "600",
                                        color: colors.text,
                                        outline: "none",
                                        background: "transparent"
                                    }} />
                                <input
                                    type="text"
                                    placeholder="Special notes (optional)"
                                    value={item.notes || ""}
                                    onChange={(e) => handleItemChange(index, "notes", e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "0",
                                        marginBottom: "12px",
                                        border: "none",
                                        fontSize: "13px",
                                        color: colors.textTertiary,
                                        outline: "none",
                                        background: "transparent"
                                    }} />
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <button type="button"
                                            onClick={() => handleItemChange(index, "quantity", Math.max(1, item.quantity - 1))}
                                            style={{
                                                width: "30px",
                                                height: "30px",
                                                borderRadius: "50%",
                                                border: `1px solid ${colors.border}`,
                                                background: colors.inputBg,
                                                color: colors.text,
                                                cursor: "pointer",
                                                fontSize: "16px",
                                            }}>−</button>
                                        <span style={{ fontSize: "15px", fontWeight: "600", minWidth: "20px", textAlign: "center", color: colors.text }}>{item.quantity}</span>
                                        <button type="button"
                                            onClick={() => handleItemChange(index, "quantity", item.quantity + 1)}
                                            style={{
                                                width: "30px",
                                                height: "30px",
                                                borderRadius: "50%",
                                                border: `1px solid ${colors.border}`,
                                                background: colors.inputBg,
                                                color: colors.text,
                                                cursor: "pointer",
                                                fontSize: "16px",
                                            }}>+</button>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ fontSize: "16px", fontWeight: "700", color: colors.text }}>Rs.</span>
                                        <input
                                            type="number"
                                            value={item.price || 0}
                                            step="0.01"
                                            min="0"
                                            onChange={(e) => handleItemChange(index, "price", parseFloat(e.target.value) || 0)}
                                            style={{
                                                width: "90px",
                                                border: "none",
                                                fontSize: "16px",
                                                fontWeight: "700",
                                                color: colors.text,
                                                outline: "none",
                                                background: "transparent",
                                                boxSizing: "border-box"
                                            }} />
                                        {formData.items.length > 1 && (
                                            <button type="button"
                                                onClick={() => removeItem(index)}
                                                style={{
                                                    width: "26px",
                                                    height: "26px",
                                                    borderRadius: "50%",
                                                    border: "none",
                                                    background: colors.removeBtnBg,
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}>
                                                <X size={12} color="#DC2626" />
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
                                backgroundColor: "transparent",
                                color: colors.dashedText,
                                border: `2px dashed ${colors.dashedBorder}`,
                                borderRadius: "12px",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "14px",
                            }}>
                            + Add Another Item
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                        <button type="button"
                            onClick={onClose}
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
                            }}>
                            Cancel
                        </button>
                        <button type="submit"
                            disabled={loading}
                            style={{
                                flex: 2,
                                padding: "14px",
                                backgroundColor: loading ? "#9CA3AF" : "#10B981",
                                color: "white",
                                border: "none",
                                borderRadius: "12px",
                                cursor: loading ? "not-allowed" : "pointer",
                                fontSize: "15px",
                                fontWeight: "700",
                            }}>
                            {loading ? "Creating..." : "Create Order →"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OrderFormModal;
