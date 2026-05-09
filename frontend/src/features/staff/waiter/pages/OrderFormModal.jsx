import React, { useState, useEffect, useCallback } from "react";
import { X, Minus, Plus, ShoppingBag, Search, ChefHat } from "lucide-react";
import { useOrderContext } from "../../../../context/useOrderContext";
import { getMenuItems, getActiveProperty } from "../../../../core/api/services/staff.service";
import { toast } from "react-toastify";
import { useTheme } from "../../../../hooks/useTheme";

const CATEGORIES = ["All", "Breakfast", "Lunch", "Dinner", "Snacks", "Drinks", "Dessert", "Appetizers"];

const OrderFormModal = ({ onClose }) => {
    const { addOrder, loading } = useOrderContext();
    const { isDark } = useTheme();

    const [menuItems, setMenuItems] = useState([]);
    const [menuLoading, setMenuLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedItems, setSelectedItems] = useState([]);

    const [formData, setFormData] = useState({
        orderType: "dineIn",
        roomNumber: "",
        tableNumber: "",
        customerName: "",
        notes: "",
        priority: "normal",
    });

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

    const fetchMenu = useCallback(async () => {
        try {
            setMenuLoading(true);
            const activeProperty = getActiveProperty();
            if (!activeProperty?._id) {
                toast.error("No active property found");
                return;
            }
            const res = await getMenuItems(activeProperty._id, '', 'all');
            if (res.success) {
                setMenuItems(res.menuItems || []);
            }
        } catch (err) {
            console.error("Failed to fetch menu:", err);
            toast.error("Failed to load menu items");
        } finally {
            setMenuLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMenu();
    }, [fetchMenu]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addMenuItem = (menuItem) => {
        setSelectedItems(prev => {
            const existing = prev.find(i => i.menuItemId === menuItem._id);
            if (existing) {
                return prev.map(i =>
                    i.menuItemId === menuItem._id
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                );
            }
            return [...prev, {
                menuItemId: menuItem._id,
                name: menuItem.name,
                price: menuItem.price,
                image: menuItem.image,
                quantity: 1,
                notes: "",
            }];
        });
    };

    const updateItemQuantity = (menuItemId, delta) => {
        setSelectedItems(prev =>
            prev.map(i =>
                i.menuItemId === menuItemId
                    ? { ...i, quantity: Math.max(1, i.quantity + delta) }
                    : i
            )
        );
    };

    const updateItemNotes = (menuItemId, notes) => {
        setSelectedItems(prev =>
            prev.map(i =>
                i.menuItemId === menuItemId ? { ...i, notes } : i
            )
        );
    };

    const removeSelectedItem = (menuItemId) => {
        setSelectedItems(prev => prev.filter(i => i.menuItemId !== menuItemId));
    };

    const totalPrice = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const filteredItems = menuItems.filter(item => {
        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedItems.length === 0) {
            toast.error("Please select at least one item");
            return;
        }

        const orderPayload = {
            ...formData,
            items: selectedItems.map(item => ({
                menuItem: item.menuItemId,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                notes: item.notes,
            })),
        };

        try {
            await addOrder(orderPayload);
            onClose();
            toast.success("Order created successfully");
        } catch (err) {
            toast.error("Failed to add order: " + (err.message || "Unknown error"));
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
                padding: "28px",
                width: "100%",
                maxWidth: "520px",
                maxHeight: "92vh",
                overflowY: "auto",
                boxShadow: isDark
                    ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                    : "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}>
                {/* Header */}
                <div style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                        <h2 style={{ fontSize: "22px", fontWeight: "800", color: colors.text, margin: 0, lineHeight: "1.2" }}>Create New Order</h2>
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
                    <p style={{ fontSize: "13px", color: colors.textTertiary, margin: 0 }}>Select menu items and add customer details</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Order Type */}
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{
                            display: "block",
                            fontSize: "11px",
                            fontWeight: "700",
                            color: colors.textSecondary,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "8px"
                        }}>ORDER TYPE</label>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {[
                                { key: "dineIn", icon: "🍽️", label: "Dine In" },
                                { key: "roomService", icon: "🛏️", label: "Room" },
                                { key: "takeaway", icon: "🥡", label: "Takeaway" },
                            ].map(type => (
                                <button key={type.key} type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, orderType: type.key }))}
                                    style={{
                                        flex: "1 1 calc(33.333% - 6px)",
                                        minWidth: "80px",
                                        padding: "10px 6px",
                                        backgroundColor: formData.orderType === type.key ? "#10B981" : colors.buttonInactive,
                                        color: formData.orderType === type.key ? "white" : colors.buttonInactiveText,
                                        border: "none",
                                        borderRadius: "12px",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        transition: "all 0.2s",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "4px",
                                    }}>
                                    <span style={{ fontSize: "18px" }}>{type.icon}</span>
                                    <span>{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Location */}
                    {formData.orderType !== "takeaway" && (
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{
                                display: "block",
                                fontSize: "11px",
                                fontWeight: "700",
                                color: colors.textSecondary,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                marginBottom: "8px"
                            }}>LOCATION</label>
                            <div style={{ position: "relative" }}>
                                <span style={{
                                    position: "absolute",
                                    left: "14px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    fontSize: "16px"
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
                                        padding: "12px 12px 12px 42px",
                                        borderRadius: "12px",
                                        border: `1px solid ${colors.inputBorder}`,
                                        backgroundColor: colors.inputBg,
                                        color: colors.text,
                                        fontSize: "14px",
                                        outline: "none",
                                        boxSizing: "border-box"
                                    }} />
                            </div>
                        </div>
                    )}

                    {/* Customer Name */}
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{
                            display: "block",
                            fontSize: "11px",
                            fontWeight: "700",
                            color: colors.textSecondary,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: "8px"
                        }}>CUSTOMER NAME</label>
                        <input
                            type="text"
                            name="customerName"
                            value={formData.customerName}
                            onChange={handleInputChange}
                            placeholder="Enter customer name"
                            style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: "12px",
                                border: `1px solid ${colors.inputBorder}`,
                                backgroundColor: colors.inputBg,
                                color: colors.text,
                                fontSize: "14px",
                                outline: "none",
                                boxSizing: "border-box"
                            }} />
                    </div>

                    {/* Menu Item Picker */}
                    <div style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <span style={{ fontSize: "14px", fontWeight: "700", color: colors.text, display: "flex", alignItems: "center", gap: "6px" }}>
                                <ChefHat size={18} />
                                Menu Items
                            </span>
                            {selectedItems.length > 0 && (
                                <span style={{
                                    backgroundColor: colors.itemBadgeBg,
                                    color: colors.itemBadgeText,
                                    padding: "4px 10px",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    fontWeight: "700"
                                }}>
                                    {selectedItems.reduce((s, i) => s + i.quantity, 0)} selected
                                </span>
                            )}
                        </div>

                        {/* Search */}
                        <div style={{ position: "relative", marginBottom: "8px" }}>
                            <Search size={16} color={colors.textTertiary} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                            <input
                                type="text"
                                placeholder="Search menu items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "10px 12px 10px 36px",
                                    borderRadius: "10px",
                                    border: `1px solid ${colors.inputBorder}`,
                                    backgroundColor: colors.inputBg,
                                    color: colors.text,
                                    fontSize: "13px",
                                    outline: "none",
                                    boxSizing: "border-box"
                                }}
                            />
                        </div>

                        {/* Category Tabs */}
                        <div style={{
                            display: "flex",
                            gap: "6px",
                            overflowX: "auto",
                            paddingBottom: "8px",
                            marginBottom: "8px",
                            scrollbarWidth: "none",
                        }}>
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    style={{
                                        padding: "6px 12px",
                                        borderRadius: "20px",
                                        border: "none",
                                        backgroundColor: selectedCategory === cat ? "#10B981" : colors.buttonInactive,
                                        color: selectedCategory === cat ? "white" : colors.buttonInactiveText,
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        whiteSpace: "nowrap",
                                        transition: "all 0.2s",
                                    }}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Menu Items Grid */}
                        {menuLoading ? (
                            <div style={{ textAlign: "center", padding: "24px", color: colors.textTertiary, fontSize: "13px" }}>
                                Loading menu...
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "24px", color: colors.textTertiary, fontSize: "13px" }}>
                                {searchQuery ? "No items match your search" : "No menu items available"}
                            </div>
                        ) : (
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, 1fr)",
                                gap: "8px",
                                maxHeight: "280px",
                                overflowY: "auto",
                                paddingRight: "4px",
                            }}>
                                {filteredItems.map(item => {
                                    const inCart = selectedItems.find(si => si.menuItemId === item._id);
                                    return (
                                        <button
                                            key={item._id}
                                            type="button"
                                            onClick={() => addMenuItem(item)}
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: "6px",
                                                padding: "8px",
                                                borderRadius: "12px",
                                                border: inCart ? "2px solid #10B981" : `1px solid ${colors.border}`,
                                                backgroundColor: inCart ? colors.itemBadgeBg : colors.inputBg,
                                                cursor: "pointer",
                                                transition: "all 0.2s",
                                                textAlign: "center",
                                                position: "relative",
                                            }}
                                        >
                                            <img
                                                src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"}
                                                alt={item.name}
                                                style={{
                                                    width: "100%",
                                                    height: "70px",
                                                    objectFit: "cover",
                                                    borderRadius: "8px",
                                                }}
                                                onError={(e) => {
                                                    e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";
                                                }}
                                            />
                                            <div style={{ fontSize: "11px", fontWeight: "600", color: colors.text, lineHeight: "1.3", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                                {item.name}
                                            </div>
                                            <div style={{ fontSize: "12px", fontWeight: "700", color: "#10B981" }}>
                                                ₹{item.price}
                                            </div>
                                            {inCart && (
                                                <div style={{
                                                    position: "absolute",
                                                    top: "4px",
                                                    right: "4px",
                                                    backgroundColor: "#10B981",
                                                    color: "white",
                                                    borderRadius: "50%",
                                                    width: "20px",
                                                    height: "20px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "11px",
                                                    fontWeight: "700",
                                                }}>
                                                    {inCart.quantity}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Selected Items / Cart */}
                    {selectedItems.length > 0 && (
                        <div style={{ marginBottom: "16px" }}>
                            <div style={{ fontSize: "14px", fontWeight: "700", color: colors.text, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <ShoppingBag size={18} />
                                Order Summary
                            </div>
                            <div style={{
                                backgroundColor: colors.cardBg,
                                borderRadius: "16px",
                                padding: "12px",
                                border: `1px solid ${colors.border}`,
                            }}>
                                {selectedItems.map((item, index) => (
                                    <div key={item.menuItemId} style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "10px",
                                        padding: "8px 0",
                                        borderBottom: index < selectedItems.length - 1 ? `1px solid ${colors.border}` : "none",
                                    }}>
                                        <img
                                            src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"}
                                            alt={item.name}
                                            style={{
                                                width: "48px",
                                                height: "48px",
                                                borderRadius: "8px",
                                                objectFit: "cover",
                                                flexShrink: 0,
                                            }}
                                            onError={(e) => {
                                                e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";
                                            }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, marginBottom: "2px" }}>
                                                {item.name}
                                            </div>
                                            <div style={{ fontSize: "12px", fontWeight: "700", color: "#10B981" }}>
                                                ₹{item.price} x {item.quantity} = ₹{item.price * item.quantity}
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Special instructions..."
                                                value={item.notes}
                                                onChange={(e) => updateItemNotes(item.menuItemId, e.target.value)}
                                                style={{
                                                    width: "100%",
                                                    marginTop: "4px",
                                                    padding: "4px 8px",
                                                    borderRadius: "6px",
                                                    border: `1px solid ${colors.border}`,
                                                    backgroundColor: colors.inputBg,
                                                    color: colors.text,
                                                    fontSize: "11px",
                                                    outline: "none",
                                                    boxSizing: "border-box",
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                            <button type="button"
                                                onClick={() => updateItemQuantity(item.menuItemId, 1)}
                                                style={{
                                                    width: "28px",
                                                    height: "28px",
                                                    borderRadius: "6px",
                                                    border: "none",
                                                    background: "#10B981",
                                                    color: "white",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}>
                                                <Plus size={14} />
                                            </button>
                                            <span style={{ fontSize: "13px", fontWeight: "700", color: colors.text }}>{item.quantity}</span>
                                            <button type="button"
                                                onClick={() => updateItemQuantity(item.menuItemId, -1)}
                                                style={{
                                                    width: "28px",
                                                    height: "28px",
                                                    borderRadius: "6px",
                                                    border: "none",
                                                    background: "#10B981",
                                                    color: "white",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}>
                                                <Minus size={14} />
                                            </button>
                                        </div>
                                        <button type="button"
                                            onClick={() => removeSelectedItem(item.menuItemId)}
                                            style={{
                                                width: "28px",
                                                height: "28px",
                                                borderRadius: "6px",
                                                border: "none",
                                                background: colors.removeBtnBg,
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}>
                                            <X size={14} color="#DC2626" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Total & Actions */}
                    {selectedItems.length > 0 && (
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "16px",
                            padding: "12px 16px",
                            backgroundColor: colors.cardBg,
                            borderRadius: "12px",
                            border: `1px solid ${colors.border}`,
                        }}>
                            <span style={{ fontSize: "14px", fontWeight: "700", color: colors.text }}>Total</span>
                            <span style={{ fontSize: "18px", fontWeight: "800", color: "#10B981" }}>₹{totalPrice}</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
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
                            disabled={loading || selectedItems.length === 0}
                            style={{
                                flex: 2,
                                padding: "14px",
                                backgroundColor: loading || selectedItems.length === 0 ? "#9CA3AF" : "#10B981",
                                color: "white",
                                border: "none",
                                borderRadius: "12px",
                                cursor: loading || selectedItems.length === 0 ? "not-allowed" : "pointer",
                                fontSize: "15px",
                                fontWeight: "700",
                            }}>
                            {loading ? "Creating..." : `Create Order ${selectedItems.length > 0 ? "→" : ""}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OrderFormModal;
