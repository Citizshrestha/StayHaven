import React, { useState } from "react";
import { X } from "lucide-react";
import { useOrderContext } from "../../../../context/useOrderContext";
import { toast } from "react-toastify";
import { useTheme } from "../../../../hooks/useTheme";

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
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button type="button"
                                onClick={() => setFormData({ ...formData, orderType: "dineIn" })}
                                style={{
                                    flex: "1 1 calc(33.333% - 6px)",
                                    minWidth: "90px",
                                    padding: "12px 8px",
                                    backgroundColor: formData.orderType === "dineIn" ? "#10B981" : colors.buttonInactive,
                                    color: formData.orderType === "dineIn" ? "white" : colors.buttonInactiveText,
                                    border: "none",
                                    borderRadius: "12px",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    transition: "all 0.2s",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "4px",
                                    whiteSpace: "nowrap"
                                }}>
                                <span style={{ fontSize: "20px" }}>🍽️</span>
                                <span>Dine In</span>
                            </button>
                            <button type="button"
                                onClick={() => setFormData({ ...formData, orderType: "roomService" })}
                                style={{
                                    flex: "1 1 calc(33.333% - 6px)",
                                    minWidth: "90px",
                                    padding: "12px 8px",
                                    backgroundColor: formData.orderType === "roomService" ? "#10B981" : colors.buttonInactive,
                                    color: formData.orderType === "roomService" ? "white" : colors.buttonInactiveText,
                                    border: "none",
                                    borderRadius: "12px",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    transition: "all 0.2s",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "4px",
                                    whiteSpace: "nowrap"
                                }}>
                                <span style={{ fontSize: "20px" }}>🛏️</span>
                                <span>Room</span>
                            </button>
                            <button type="button"
                                onClick={() => setFormData({ ...formData, orderType: "takeaway" })}
                                style={{
                                    flex: "1 1 calc(33.333% - 6px)",
                                    minWidth: "90px",
                                    padding: "12px 8px",
                                    backgroundColor: formData.orderType === "takeaway" ? "#10B981" : colors.buttonInactive,
                                    color: formData.orderType === "takeaway" ? "white" : colors.buttonInactiveText,
                                    border: "none",
                                    borderRadius: "12px",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    transition: "all 0.2s",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "4px",
                                    whiteSpace: "nowrap"
                                }}>
                                <span style={{ fontSize: "20px" }}>🥡</span>
                                <span>Takeaway</span>
                            </button>
                        </div>
                    </div>

                    {/* Location - Only show for dineIn and roomService */}
                    {formData.orderType !== "takeaway" && (
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
                        <div style={{ position: "relative" }}>
                            <span style={{
                                position: "absolute",
                                left: "14px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                fontSize: "18px"
                            }}>{formData.orderType === "dineIn" ? "🏪" : "🛏️"}</span>
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
                                    border: `1px solid ${colors.inputBorder}`,
                                    backgroundColor: colors.inputBg,
                                    color: colors.text,
                                    fontSize: "15px",
                                    outline: "none",
                                    boxSizing: "border-box"
                                }} />
                        </div>
                    </div>
                    )}

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
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
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
                                borderRadius: "16px",
                                padding: "16px",
                                marginBottom: "12px",
                                position: "relative"
                            }}>
                                {/* Item Number Badge */}
                                <div style={{
                                    position: "absolute",
                                    top: "12px",
                                    left: "12px",
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    backgroundColor: colors.itemBadgeBg,
                                    color: colors.itemBadgeText,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "14px",
                                    fontWeight: "700"
                                }}>
                                    {String.fromCharCode(9312 + index)}
                                </div>

                                {/* Item Name */}
                                <div style={{ marginBottom: "12px", paddingLeft: "36px" }}>
                                    <label style={{
                                        display: "block",
                                        fontSize: "10px",
                                        fontWeight: "700",
                                        color: colors.textSecondary,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                        marginBottom: "6px"
                                    }}>Item Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Chicken Momo"
                                        value={item.name}
                                        onChange={(e) => handleItemChange(index, "name", e.target.value)}
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: "8px",
                                            fontSize: "14px",
                                            fontWeight: "600",
                                            color: colors.text,
                                            backgroundColor: colors.inputBg,
                                            outline: "none",
                                            boxSizing: "border-box"
                                        }} />
                                </div>

                                {/* Special Instructions */}
                                <div style={{ marginBottom: "12px" }}>
                                    <label style={{
                                        display: "block",
                                        fontSize: "10px",
                                        fontWeight: "700",
                                        color: colors.textSecondary,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                        marginBottom: "6px"
                                    }}>Special Instructions (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Extra spicy, no onions"
                                        value={item.notes || ""}
                                        onChange={(e) => handleItemChange(index, "notes", e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: "8px",
                                            fontSize: "13px",
                                            color: colors.textTertiary,
                                            backgroundColor: colors.inputBg,
                                            outline: "none",
                                            boxSizing: "border-box"
                                        }} />
                                </div>

                                {/* Quantity and Price Row */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                                    {/* Quantity */}
                                    <div style={{ flex: 1 }}>
                                        <label style={{
                                            display: "block",
                                            fontSize: "10px",
                                            fontWeight: "700",
                                            color: colors.textSecondary,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px",
                                            marginBottom: "6px"
                                        }}>Quantity</label>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <button type="button"
                                                onClick={() => handleItemChange(index, "quantity", Math.max(1, item.quantity - 1))}
                                                style={{
                                                    width: "36px",
                                                    height: "36px",
                                                    borderRadius: "8px",
                                                    border: "none",
                                                    background: "#10B981",
                                                    color: "white",
                                                    cursor: "pointer",
                                                    fontSize: "18px",
                                                    fontWeight: "700",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center"
                                                }}>−</button>
                                            <span style={{ 
                                                fontSize: "16px", 
                                                fontWeight: "700", 
                                                minWidth: "30px", 
                                                textAlign: "center", 
                                                color: colors.text 
                                            }}>{item.quantity}</span>
                                            <button type="button"
                                                onClick={() => handleItemChange(index, "quantity", item.quantity + 1)}
                                                style={{
                                                    width: "36px",
                                                    height: "36px",
                                                    borderRadius: "8px",
                                                    border: "none",
                                                    background: "#10B981",
                                                    color: "white",
                                                    cursor: "pointer",
                                                    fontSize: "18px",
                                                    fontWeight: "700",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center"
                                                }}>+</button>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div style={{ flex: 1 }}>
                                        <label style={{
                                            display: "block",
                                            fontSize: "10px",
                                            fontWeight: "700",
                                            color: colors.textSecondary,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px",
                                            marginBottom: "6px"
                                        }}>Price (Rs.)</label>
                                        <div style={{ position: "relative" }}>
                                            <span style={{
                                                position: "absolute",
                                                left: "12px",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                fontSize: "14px",
                                                fontWeight: "700",
                                                color: colors.textSecondary
                                            }}>₹</span>
                                            <input
                                                type="number"
                                                value={item.price || 0}
                                                step="0.01"
                                                min="0"
                                                onChange={(e) => handleItemChange(index, "price", parseFloat(e.target.value) || 0)}
                                                style={{
                                                    width: "100%",
                                                    padding: "10px 12px 10px 28px",
                                                    border: `1px solid ${colors.border}`,
                                                    borderRadius: "8px",
                                                    fontSize: "14px",
                                                    fontWeight: "700",
                                                    color: colors.text,
                                                    backgroundColor: colors.inputBg,
                                                    outline: "none",
                                                    boxSizing: "border-box"
                                                }} />
                                        </div>
                                    </div>

                                    {/* Remove Button */}
                                    {formData.items.length > 1 && (
                                        <button type="button"
                                            onClick={() => removeItem(index)}
                                            style={{
                                                width: "36px",
                                                height: "36px",
                                                borderRadius: "8px",
                                                border: "none",
                                                background: colors.removeBtnBg,
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                alignSelf: "flex-end"
                                            }}>
                                            <X size={16} color="#DC2626" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={addItem}
                            style={{
                                width: "100%",
                                padding: "14px",
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
