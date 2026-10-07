import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, Minus, Plus, ShoppingBag, Search, ChefHat } from "lucide-react";
import { useOrderContext } from "../../../../core/context/useOrderContext";
import { getMenuItems, getActiveProperty } from "../../../../core/api/services/staff.service";
import { getHotelTables, newIdempotencyKey } from "../../../../core/api/services/dining.service";

const rs = (n) => `Rs ${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const PHONE_PATTERN = /^[+\d][\d\s-]{5,19}$/;
import { toast } from "react-toastify";
import { useTheme } from "../../../../core/hooks/useTheme";
import "./OrderFormModal.css";

const MAX_QTY = 50; // same limit the server enforces per line

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
        tableId: "",
        customerName: "",
        customerPhone: "",
        notes: "",
        priority: "normal",
    });
    // Real tables for the hotel. `null` = still loading; [] = hotel has no
    // tables configured yet (falls back to a free-text table number).
    const [tables, setTables] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    // Stable across retries of the same submission so a double tap or a
    // network retry can never create the order twice.
    const submitKeyRef = useRef(newIdempotencyKey("ord"));
    // Synchronous guard: state updates are async, so a fast double tap could pass `submitting` twice.
    const submittingRef = useRef(false);
    const [submitError, setSubmitError] = useState("");
    const sheetRef = useRef(null);

    // Modal behaviour: lock background scroll, close on Esc, focus the dialog, restore on close.
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        const opener = document.activeElement;
        document.body.style.overflow = "hidden";
        sheetRef.current?.focus();
        const onKey = (e) => { if (e.key === "Escape" && !submittingRef.current) onClose(); };
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener("keydown", onKey);
            if (opener && typeof opener.focus === "function") opener.focus();
        };
    }, [onClose]);

    useEffect(() => {
        const property = getActiveProperty();
        if (!property?._id) { setTables([]); return; }
        getHotelTables(property._id)
            .then((res) => setTables((res.data || []).filter((t) => t.status !== "maintenance")))
            .catch(() => setTables([]));
    }, []);

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
        if (menuItem.isAvailable === false) {
            toast.error(`${menuItem.name} is sold out`);
            return;
        }
        setSelectedItems(prev => {
            const existing = prev.find(i => i.menuItemId === menuItem._id);
            if (existing) {
                return prev.map(i =>
                    i.menuItemId === menuItem._id
                        ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + 1) }
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
                    ? { ...i, quantity: Math.min(MAX_QTY, Math.max(1, i.quantity + delta)) }
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
        if (submitting || submittingRef.current) return;
        setSubmitError("");
        if (selectedItems.length === 0) {
            toast.error("Please select at least one item");
            return;
        }
        const useTablePicker = formData.orderType === "dineIn" && Array.isArray(tables) && tables.length > 0;
        if (useTablePicker && !formData.tableId) {
            toast.error("Choose a table");
            return;
        }
        if (formData.orderType === "takeaway") {
            if (!formData.customerName.trim()) {
                toast.error("Enter the customer's name so the order can be called out");
                return;
            }
            if (formData.customerPhone.trim() && !PHONE_PATTERN.test(formData.customerPhone.trim())) {
                toast.error("Enter a valid phone number");
                return;
            }
        }

        const { tableId, tableNumber, roomNumber, customerPhone, ...rest } = formData;
        const orderPayload = {
            ...rest,
            customerName: formData.customerName.trim(),
            customerPhone: formData.orderType === "takeaway" ? customerPhone.trim() || undefined : undefined,
            roomNumber: formData.orderType === "roomService" ? roomNumber : undefined,
            tableId: formData.orderType === "dineIn" && useTablePicker ? tableId : undefined,
            tableNumber: formData.orderType === "dineIn" && !useTablePicker ? tableNumber : undefined,
            idempotencyKey: submitKeyRef.current,
            // Menu lines only: the server prices every line from the menu.
            items: selectedItems.map(item => ({
                menuItem: item.menuItemId,
                quantity: item.quantity,
                notes: item.notes,
            })),
        };

        try {
            submittingRef.current = true;
            setSubmitting(true);
            await addOrder(orderPayload);
            onClose();
            toast.success(formData.orderType === "takeaway"
                ? "Takeaway order created — take payment from Bills"
                : "Order created successfully");
        } catch (err) {
            const message = err?.response?.data?.message || err.message || "Unknown error";
            // A validation failure won't succeed on retry; start a fresh submission.
            if (err?.response?.status >= 400 && err?.response?.status < 500) {
                submitKeyRef.current = newIdempotencyKey("ord");
            }
            // No response means the network dropped: keep the draft and the same key, so Retry is safe.
            setSubmitError(err?.response ? message : "No connection. Your order is saved on this screen. Tap Retry when you are back online.");
            toast.error("Failed to add order: " + message);
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    return (
        <div className="ofm-overlay">
            <div
                className="ofm-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ofm-title"
                tabIndex={-1}
                ref={sheetRef}
                style={{
                    backgroundColor: colors.bg,
                    "--ofm-bg": colors.bg,
                    "--ofm-border": colors.border,
                    boxShadow: isDark
                        ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                        : "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                }}>
                {/* Header */}
                <div className="ofm-head">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                        <h2 id="ofm-title" style={{ fontSize: "22px", fontWeight: "800", color: colors.text, margin: 0, lineHeight: "1.2" }}>Create New Order</h2>
                        <button type="button" onClick={onClose} aria-label="Close order form" style={{
                            background: colors.closeBtn,
                            border: "none",
                            cursor: "pointer",
                            width: "44px",
                            height: "44px",
                            flexShrink: 0,
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

                <form onSubmit={handleSubmit} className="ofm-form" noValidate={false}>
                    <div className="ofm-body">
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
                                }} aria-hidden="true">{formData.orderType === "dineIn" ? "🏪" : "🛏️"}</span>
                                {formData.orderType === "dineIn" && Array.isArray(tables) && tables.length > 0 ? (
                                    <select
                                        name="tableId"
                                        aria-label="Table"
                                        value={formData.tableId}
                                        onChange={handleInputChange}
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
                                            boxSizing: "border-box",
                                            minHeight: "44px",
                                        }}>
                                        <option value="">Choose a table</option>
                                        {tables.map((t) => (
                                            <option key={t._id} value={t._id}>
                                                Table {t.tableNumber}{t.status === "occupied" ? " · occupied (adds to the open bill)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        aria-label={formData.orderType === "dineIn" ? "Table number" : "Room number"}
                                        name={formData.orderType === "dineIn" ? "tableNumber" : "roomNumber"}
                                        value={formData.orderType === "dineIn" ? formData.tableNumber : formData.roomNumber}
                                        onChange={handleInputChange}
                                        placeholder={formData.orderType === "dineIn" ? (tables === null ? "Loading tables…" : "e.g., 5") : "e.g., Room 204"}
                                        // While the hotel's tables load, the field is locked so a typed number is not lost when it turns into the table list.
                                        disabled={formData.orderType === "dineIn" && tables === null}
                                        required={!(formData.orderType === "dineIn" && tables === null)}
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
                                )}
                            </div>
                        </div>
                    )}

                    {/* Takeaway: phone so the customer can be called when it's ready */}
                    {formData.orderType === "takeaway" && (
                        <div style={{ marginBottom: "16px" }}>
                            <label htmlFor="order-customer-phone" style={{
                                display: "block",
                                fontSize: "11px",
                                fontWeight: "700",
                                color: colors.textSecondary,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                marginBottom: "8px"
                            }}>CUSTOMER PHONE (OPTIONAL)</label>
                            <input
                                id="order-customer-phone"
                                type="tel"
                                inputMode="tel"
                                name="customerPhone"
                                value={formData.customerPhone}
                                onChange={handleInputChange}
                                placeholder="98XXXXXXXX"
                                maxLength={20}
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
                        }}>{formData.orderType === "takeaway" ? "CUSTOMER NAME (REQUIRED)" : "CUSTOMER NAME"}</label>
                        <input
                            type="text"
                            aria-label="Customer name"
                            required={formData.orderType === "takeaway"}
                            maxLength={100}
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

                        <div className="ofm-sticky-tools">
                        {/* Search */}
                        <div style={{ position: "relative", marginBottom: "8px" }}>
                            <Search size={16} color={colors.textTertiary} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                            <input
                                type="search"
                                aria-label="Search menu items"
                                enterKeyHint="search"
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
                            <div className="ofm-menu-grid" style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, 1fr)",
                                gap: "8px",
                            }}>
                                {filteredItems.map(item => {
                                    const inCart = selectedItems.find(si => si.menuItemId === item._id);
                                    return (
                                        <button
                                            key={item._id}
                                            type="button"
                                            onClick={() => addMenuItem(item)}
                                            disabled={item.isAvailable === false}
                                            aria-label={`${item.name}, ${rs(item.price)}${item.isAvailable === false ? ", sold out" : inCart ? ", " + inCart.quantity + " in order" : ""}`}
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
                                                {rs(item.price)}
                                            </div>
                                            {item.isAvailable === false && (
                                                <div style={{ fontSize: "11px", fontWeight: "700", color: "#B91C1C", backgroundColor: "#FEE2E2", borderRadius: "6px", padding: "2px 8px" }}>
                                                    Sold out
                                                </div>
                                            )}
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
                                        flexWrap: "wrap",
                                        alignItems: "flex-start",
                                        gap: "10px",
                                        padding: "10px 0",
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
                                        <div style={{ flex: "1 1 calc(100% - 64px)", minWidth: 0 }}>
                                            <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, marginBottom: "2px", overflowWrap: "anywhere" }}>
                                                {item.name}
                                            </div>
                                            <div style={{ fontSize: "12px", fontWeight: "700", color: "#10B981" }}>
                                                {rs(item.price)} x {item.quantity} = {rs(item.price * item.quantity)}
                                            </div>
                                            <input
                                                type="text"
                                                aria-label={`Notes for ${item.name}`}
                                                maxLength={200}
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
                                        <div className="ofm-stepper">
                                            <button type="button" className="ofm-step" aria-label={`Decrease ${item.name}`}
                                                onClick={() => updateItemQuantity(item.menuItemId, -1)}
                                                disabled={item.quantity <= 1}
                                                style={{ borderRadius: "8px", border: "none", background: "#10B981", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <Minus size={18} />
                                            </button>
                                            <span aria-live="polite" style={{ fontSize: "16px", fontWeight: "700", color: colors.text, minWidth: "28px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{item.quantity}</span>
                                            <button type="button" className="ofm-step" aria-label={`Increase ${item.name}`}
                                                onClick={() => updateItemQuantity(item.menuItemId, 1)}
                                                disabled={item.quantity >= MAX_QTY}
                                                style={{ borderRadius: "8px", border: "none", background: "#10B981", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                        <button type="button" className="ofm-step"
                                            aria-label={`Remove ${item.name}`}
                                            onClick={() => removeSelectedItem(item.menuItemId)}
                                            style={{
                                                width: "44px",
                                                height: "44px",
                                                borderRadius: "6px",
                                                border: "none",
                                                background: colors.removeBtnBg,
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}>
                                            <X size={18} color="#DC2626" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    </div>

                    <div className="ofm-foot">
                        {submitError && <div className="ofm-error" role="alert">{submitError}</div>}
                        {selectedItems.length > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                                <span style={{ fontSize: "14px", fontWeight: "700", color: colors.text }}>
                                    Total · {selectedItems.reduce((s, i) => s + i.quantity, 0)} item{selectedItems.reduce((s, i) => s + i.quantity, 0) === 1 ? "" : "s"}
                                </span>
                                <span style={{ fontSize: "20px", fontWeight: "800", color: "#059669", fontVariantNumeric: "tabular-nums" }}>
                                    {rs(totalPrice)} <span style={{ fontSize: "12px", fontWeight: 600, color: colors.textSecondary }}>+ VAT</span>
                                </span>
                            </div>
                        )}
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button type="button" onClick={onClose} disabled={submitting}
                                style={{ flex: 1, padding: "12px", backgroundColor: colors.cancelBtnBg, color: colors.cancelBtnText, border: "none", borderRadius: "12px", cursor: "pointer", fontSize: "16px", fontWeight: "600" }}>
                                Cancel
                            </button>
                            <button type="submit"
                                disabled={loading || submitting || selectedItems.length === 0}
                                style={{ flex: 2, padding: "12px", backgroundColor: "#059669", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontSize: "16px", fontWeight: "700" }}>
                                {loading || submitting ? "Creating..." : submitError ? "Retry" : "Create order"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OrderFormModal;
